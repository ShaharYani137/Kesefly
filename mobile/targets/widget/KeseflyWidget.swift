//
// Kesefly iOS widget (WidgetKit + SwiftUI).
//
// Reads what the app writes into the shared App Group (src/widget/ios.ts): positions, labels
// in the app language, market phase changes and a formatted snapshot. On each timeline reload
// it fetches fresh prices from Yahoo Finance (the same free endpoint as the app) and
// recomputes portfolio value, today's change, total gain and top movers. With no network it
// shows the app's last numbers. Recommend only: no trading, read-only data.
//
// Sizes: small (value), medium (value + movers + clocks), large (everything), and lock screen
// rectangular / inline. Hebrew lays out right-to-left.
//
// No shared data (free Apple ID through Sideloadly grants no App Group, so the app cannot pass
// its holdings): the widget shows live markets instead: S&P 500, Nasdaq, TA-125, USD/ILS and
// Wall Street / Tel Aviv clocks, in the phone's language. The App Group name is resolved at
// run time (AppGroupResolver.swift), because sideloading tools rename it.
//
// Layout values follow the Apple HIG widget guidance (apple-human-interface-guidelines
// references/widgets.md: 16 pt margins via the default content margins, SF system text styles).
// Brand colors are design decisions (same as the Android widget).
//

import SwiftUI
import WidgetKit

// MARK: - Shared data

let dataKey = "kesefly.widget"

struct Units: Codable { let d: String; let h: String; let m: String }

struct Labels: Codable {
  let title: String
  let empty: String
  let updated: String
  let day: String
  let gain: String
  let closesIn: String
  let opensIn: String
  let units: Units
}

struct Segment: Codable { let t: Double; let phase: String; let open: Bool }

struct Market: Codable {
  let label: String
  let flag: String
  let tz: String
  let segments: [Segment]
}

struct Position: Codable {
  let symbol: String
  let currency: String
  let shares: Double
  let cost: Double
  let extra: Double
  let invested: Double
  let price: Double
  let change: Double
  let fund: Bool
}

struct SnapMover: Codable { let symbol: String; let price: String; let pct: String; let up: Bool }

struct Snapshot: Codable {
  let value: String?
  let day: String
  let dayUp: Bool
  let gain: String
  let gainUp: Bool
  let movers: [SnapMover]
  let rate: String?
  let updated: String
}

struct Payload: Codable {
  let v: Int
  let lang: String
  let currency: String
  let at: Double
  let rate: Double?
  let positions: [Position]
  let labels: Labels
  let markets: [Market]
  let snapshot: Snapshot
}

func loadPayload() -> Payload? {
  guard let group = AppGroupResolver.resolve(),
        let raw = UserDefaults(suiteName: group)?.string(forKey: dataKey),
        let data = raw.data(using: .utf8) else { return nil }
  return try? JSONDecoder().decode(Payload.self, from: data)
}

// MARK: - Prices (Yahoo Finance chart endpoint)

struct LiveQuote { let price: Double; let change: Double; let currency: String }

func fetchQuote(_ symbol: String) async -> LiveQuote? {
  let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: ".-"))
  guard let enc = symbol.addingPercentEncoding(withAllowedCharacters: allowed),
        let url = URL(string: "https://query1.finance.yahoo.com/v8/finance/chart/\(enc)?range=1d&interval=1d") else { return nil }
  var req = URLRequest(url: url)
  req.timeoutInterval = 8
  req.setValue("Mozilla/5.0", forHTTPHeaderField: "User-Agent")
  req.setValue("application/json", forHTTPHeaderField: "Accept")
  guard let (data, _) = try? await URLSession.shared.data(for: req),
        let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
        let chart = root["chart"] as? [String: Any],
        let results = chart["result"] as? [[String: Any]],
        let meta = results.first?["meta"] as? [String: Any],
        let rawPrice = meta["regularMarketPrice"] as? Double else { return nil }
  let cur = (meta["currency"] as? String) ?? "USD"
  // Tel Aviv prices come in agorot (ILA): 100 agorot = 1 shekel.
  let k = cur == "ILA" ? 0.01 : 1.0
  let prev = ((meta["chartPreviousClose"] as? Double) ?? (meta["previousClose"] as? Double) ?? rawPrice) * k
  let price = rawPrice * k
  return LiveQuote(price: price, change: price - prev, currency: cur == "ILA" ? "ILS" : cur)
}

/// Fresh quotes for every symbol (funds excluded: no Yahoo price) plus USD/ILS, in parallel.
func fetchAll(_ symbols: [String]) async -> ([String: LiveQuote], Double?) {
  var out: [String: LiveQuote] = [:]
  var rate: Double?
  await withTaskGroup(of: (String, LiveQuote?).self) { group in
    for s in symbols + ["ILS=X"] {
      group.addTask { (s, await fetchQuote(s)) }
    }
    for await (s, q) in group {
      guard let q = q else { continue }
      if s == "ILS=X" { rate = q.price } else { out[s] = q }
    }
  }
  return (out, rate)
}

// MARK: - Numbers

struct Mover: Identifiable {
  let symbol: String
  let price: String
  let pct: String
  let up: Bool
  var id: String { symbol }
}

struct Clock: Identifiable {
  let label: String
  let flag: String
  let time: String
  let status: String
  let open: Bool
  var id: String { label }
}

struct Numbers {
  let value: String?
  let day: String
  let dayUp: Bool
  let gain: String
  let gainUp: Bool
  let movers: [Mover]
  let rate: String?
  let updated: String
}

func locale(_ lang: String) -> Locale { Locale(identifier: lang == "he" ? "he_IL" : "en_US") }

func money(_ v: Double, _ cur: String, _ lang: String) -> String {
  let f = NumberFormatter()
  f.numberStyle = .currency
  f.currencyCode = cur
  f.locale = locale(lang)
  f.minimumFractionDigits = 2
  f.maximumFractionDigits = 2
  return f.string(from: NSNumber(value: v)) ?? String(format: "%.2f %@", v, cur)
}

func signedMoney(_ v: Double, _ cur: String, _ lang: String) -> String {
  let s = money(abs(v), cur, lang)
  return v > 0.004 ? "+\(s)" : v < -0.004 ? "-\(s)" : s
}

func signedPct(_ f: Double) -> String { String(format: "%+.2f%%", f * 100) }

func hhmm(_ date: Date, _ tz: TimeZone = .current) -> String {
  let f = DateFormatter()
  f.locale = Locale(identifier: "en_US_POSIX")
  f.timeZone = tz
  f.dateFormat = "HH:mm"
  return f.string(from: date)
}

/// Recomputes the portfolio from positions and live quotes (same math as the app).
func compute(_ p: Payload, live: [String: LiveQuote], liveRate: Double?, fetchedAt: Date) -> Numbers {
  let cur = p.currency
  let rate = liveRate ?? p.rate
  func conv(_ v: Double, _ from: String) -> Double {
    guard from != cur, let r = rate, r > 0 else { return v }
    if from == "USD" && cur == "ILS" { return v * r }
    if from == "ILS" && cur == "USD" { return v / r }
    return v
  }
  var total = 0.0, day = 0.0, gain = 0.0, invested = 0.0
  var movers: [(Double, Mover)] = []
  for pos in p.positions {
    let q = pos.fund ? nil : live[pos.symbol]
    let price = q?.price ?? pos.price
    let change = q?.change ?? pos.change
    let qc = q?.currency ?? pos.currency
    guard price > 0 else { continue }
    total += conv(price * pos.shares, qc)
    day += conv(change * pos.shares, qc)
    // Cost and extra are in the stock's currency, same as the price.
    gain += conv(price * pos.shares - pos.cost + pos.extra, qc)
    invested += conv(pos.invested, qc)
    if pos.shares > 0 {
      let prev = price - change
      let pct = prev > 0 ? change / prev : 0
      movers.append((abs(pct), Mover(symbol: pos.symbol, price: money(price, qc, p.lang), pct: signedPct(pct), up: pct >= 0)))
    }
  }
  let held = p.positions.contains { $0.shares > 0 }
  return Numbers(
    value: held && total > 0 ? money(total, cur, p.lang) : nil,
    day: "\(p.labels.day) \(signedMoney(day, cur, p.lang))",
    dayUp: day >= 0,
    gain: "\(p.labels.gain) \(signedPct(invested > 0 ? gain / invested : 0))",
    gainUp: gain >= 0,
    movers: movers.sorted { $0.0 > $1.0 }.prefix(6).map { $0.1 },
    rate: rate.map { String(format: "USD/ILS %.3f", $0) },
    updated: p.labels.updated.replacingOccurrences(of: "{time}", with: hhmm(fetchedAt))
  )
}

func snapshotNumbers(_ p: Payload) -> Numbers {
  let s = p.snapshot
  return Numbers(value: s.value, day: s.day, dayUp: s.dayUp, gain: s.gain, gainUp: s.gainUp,
                 movers: s.movers.map { Mover(symbol: $0.symbol, price: $0.price, pct: $0.pct, up: $0.up) },
                 rate: s.rate, updated: s.updated)
}

func duration(_ minutes: Int, _ u: Units) -> String {
  let d = minutes / 1440, h = (minutes % 1440) / 60, m = minutes % 60
  if d > 0 { return "\(d)\(u.d) \(h)\(u.h)" }
  if h > 0 { return "\(h)\(u.h) \(m)\(u.m)" }
  return "\(m)\(u.m)"
}

/// Market clocks at a given moment, from the phase changes the app precomputed.
func clocks(_ p: Payload, at date: Date) -> [Clock] {
  let ms = date.timeIntervalSince1970 * 1000
  return p.markets.map { m in
    let tz = TimeZone(identifier: m.tz) ?? .current
    let current = m.segments.last { $0.t <= ms } ?? m.segments.first
    let next = m.segments.first { $0.t > ms }
    var status = current?.phase ?? ""
    if let n = next, let c = current {
      let mins = max(0, Int((n.t - ms) / 60000))
      let tmpl = c.open ? p.labels.closesIn : p.labels.opensIn
      status += " · " + tmpl.replacingOccurrences(of: "{t}", with: duration(mins, p.labels.units))
    }
    return Clock(label: m.label, flag: m.flag, time: hhmm(date, tz), status: status, open: current?.open ?? false)
  }
}

// MARK: - Timeline

struct Entry: TimelineEntry {
  let date: Date
  let payload: Payload?
  let numbers: Numbers?
  /// Markets-only mode (no shared data): live index rows.
  var markets: [IndexRow]? = nil
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> Entry { Entry(date: Date(), payload: nil, numbers: nil) }

  func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
    let p = loadPayload()
    completion(Entry(date: Date(), payload: p, numbers: p.map(snapshotNumbers)))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
    Task {
      let now = Date()
      guard let p = loadPayload() else {
        let rows = await fetchIndexes()
        let entries = (0..<4).map { i in Entry(date: now.addingTimeInterval(Double(i) * 900), payload: nil, numbers: nil, markets: rows) }
        completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(1800))))
        return
      }
      let symbols = p.positions.filter { !$0.fund }.map { $0.symbol }
      let (live, rate) = await fetchAll(symbols)
      // Nothing fetched (offline): keep the app's last formatted numbers.
      let numbers = live.isEmpty && !symbols.isEmpty ? snapshotNumbers(p) : compute(p, live: live, liveRate: rate, fetchedAt: now)
      // Same numbers, clocks move: one entry every 15 minutes for an hour; WidgetKit reloads after 30.
      let entries = (0..<4).map { i in Entry(date: now.addingTimeInterval(Double(i) * 900), payload: p, numbers: numbers) }
      completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(1800))))
    }
  }
}

// MARK: - Views

let bg = Color(red: 6 / 255, green: 42 / 255, blue: 38 / 255)
let card = Color(red: 11 / 255, green: 59 / 255, blue: 53 / 255)
let gold = Color(red: 245 / 255, green: 197 / 255, blue: 66 / 255)
let upColor = Color(red: 126 / 255, green: 226 / 255, blue: 168 / 255)
let downColor = Color(red: 1, green: 138 / 255, blue: 128 / 255)
let muted = Color(red: 184 / 255, green: 204 / 255, blue: 199 / 255)

struct ValueBlock: View {
  let p: Payload
  let n: Numbers
  let big: Bool
  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      if let v = n.value {
        Text(v)
          .font(.system(size: big ? 30 : 24, weight: .bold))
          .foregroundColor(.white)
          .minimumScaleFactor(0.5)
          .lineLimit(1)
        Text(n.day).font(.caption).foregroundColor(n.dayUp ? upColor : downColor).lineLimit(1).minimumScaleFactor(0.7)
        Text(n.gain).font(.caption).foregroundColor(n.gainUp ? upColor : downColor).lineLimit(1).minimumScaleFactor(0.7)
      } else {
        Text(p.labels.empty).font(.footnote).foregroundColor(.white).lineLimit(4)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

struct Header: View {
  let p: Payload
  let n: Numbers
  let showRate: Bool
  var body: some View {
    HStack {
      Text(p.labels.title).font(.caption.weight(.bold)).foregroundColor(gold).lineLimit(1)
      Spacer(minLength: 4)
      Text(showRate ? [n.rate, n.updated].compactMap { $0 }.joined(separator: " · ") : n.updated)
        .font(.caption2).foregroundColor(muted).lineLimit(1).minimumScaleFactor(0.7)
    }
  }
}

struct MoversList: View {
  let movers: [Mover]
  let showPrice: Bool
  var body: some View {
    VStack(alignment: .leading, spacing: 3) {
      ForEach(movers) { m in
        HStack(spacing: 6) {
          Text(m.symbol).font(.caption.weight(.semibold)).foregroundColor(.white).lineLimit(1)
          Spacer(minLength: 2)
          if showPrice { Text(m.price).font(.caption2).foregroundColor(muted).lineLimit(1) }
          Text(m.pct).font(.caption.weight(.bold)).foregroundColor(m.up ? upColor : downColor).lineLimit(1)
        }
        .environment(\.layoutDirection, .leftToRight)
      }
    }
    .padding(8)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .background(card)
    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
  }
}

struct ClockRow: View {
  let clocks: [Clock]
  var body: some View {
    HStack(spacing: 8) {
      ForEach(clocks) { c in
        VStack(alignment: .leading, spacing: 1) {
          HStack(spacing: 4) {
            Text("\(c.label) \(c.flag)").font(.caption2.weight(.semibold)).foregroundColor(.white).lineLimit(1)
            Spacer(minLength: 2)
            Text(c.time).font(.caption.weight(.bold)).foregroundColor(.white)
          }
          Text(c.status).font(.system(size: 10)).foregroundColor(c.open ? upColor : muted).lineLimit(1).minimumScaleFactor(0.7)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(card)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
      }
    }
  }
}

struct KeseflyWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: Entry

  var body: some View {
    content
      .environment(\.layoutDirection, (entry.payload?.lang ?? (phoneHebrew ? "he" : "en")) == "he" ? .rightToLeft : .leftToRight)
      .containerBackground(for: .widget) { bg }
      .widgetURL(URL(string: "kesefly://"))
  }

  @ViewBuilder var content: some View {
    if let p = entry.payload, let n = entry.numbers {
      switch family {
      case .accessoryInline:
        Text(n.value.map { "\(p.labels.title.components(separatedBy: " · ").first ?? "Kesefly") \($0)" } ?? p.labels.title)
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 1) {
          Text(p.labels.title).font(.caption2.weight(.bold)).lineLimit(1)
          Text(n.value ?? "—").font(.headline).lineLimit(1).minimumScaleFactor(0.6)
          Text(n.day).font(.caption2).lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      case .systemSmall:
        VStack(alignment: .leading, spacing: 6) {
          Text(p.labels.title).font(.caption2.weight(.bold)).foregroundColor(gold).lineLimit(1)
          Spacer(minLength: 0)
          ValueBlock(p: p, n: n, big: false)
          Text(n.updated).font(.system(size: 10)).foregroundColor(muted).lineLimit(1)
        }
      case .systemLarge, .systemExtraLarge:
        VStack(alignment: .leading, spacing: 10) {
          Header(p: p, n: n, showRate: true)
          ValueBlock(p: p, n: n, big: true)
          if !n.movers.isEmpty { MoversList(movers: Array(n.movers.prefix(6)), showPrice: true) }
          Spacer(minLength: 0)
          ClockRow(clocks: clocks(p, at: entry.date))
        }
      default:
        VStack(alignment: .leading, spacing: 8) {
          Header(p: p, n: n, showRate: false)
          HStack(spacing: 10) {
            ValueBlock(p: p, n: n, big: false)
            if !n.movers.isEmpty { MoversList(movers: Array(n.movers.prefix(3)), showPrice: false) }
          }
          ClockRow(clocks: clocks(p, at: entry.date))
        }
      }
    } else {
      MarketsView(rows: entry.markets ?? [], date: entry.date)
    }
  }
}

// MARK: - Markets only (no shared data)

/// Phone language decides the labels when the app could not share its own.
let phoneHebrew = Locale.preferredLanguages.first?.hasPrefix("he") ?? false

struct IndexRow: Identifiable {
  let name: String
  let value: String
  let pct: String
  let up: Bool
  var id: String { name }
}

/// S&P 500, Nasdaq, TA-125 and USD/ILS straight from Yahoo. Rows that fail are left out.
func fetchIndexes() async -> [IndexRow] {
  let list: [(String, String, String, Int)] = [
    ("^GSPC", "S&P 500", "S&P 500", 2),
    ("^IXIC", "Nasdaq", "נאסד״ק", 2),
    ("^TA125.TA", "TA-125", "ת״א 125", 2),
    ("ILS=X", "USD/ILS", "דולר/שקל", 3),
  ]
  var quotes: [String: LiveQuote] = [:]
  await withTaskGroup(of: (String, LiveQuote?).self) { group in
    for item in list {
      let s = item.0
      group.addTask { (s, await fetchQuote(s)) }
    }
    for await (s, q) in group {
      if let q = q { quotes[s] = q }
    }
  }
  var rows: [IndexRow] = []
  for (sym, en, he, digits) in list {
    guard let q = quotes[sym], q.price > 0 else { continue }
    let f = NumberFormatter()
    f.numberStyle = .decimal
    f.locale = Locale(identifier: "en_US")
    f.minimumFractionDigits = digits
    f.maximumFractionDigits = digits
    // Index points as Yahoo gives them (TA-125 comes as "ILS", not agorot, so no scaling).
    let value = q.price
    let change = q.change
    let prev = value - change
    let pct = prev > 0 ? change / prev : 0
    rows.append(IndexRow(name: phoneHebrew ? he : en, value: f.string(from: NSNumber(value: value)) ?? "\(value)", pct: signedPct(pct), up: pct >= 0))
  }
  return rows
}

/// Regular session in local exchange minutes for a weekday (1 = Sunday ... 7 = Saturday).
/// Same hours as src/engine/clock.ts. Holidays are not known here (design decision: only the
/// app knows them; without shared data the widget shows weekday hours).
func sessionMinutes(_ ny: Bool, weekday: Int) -> (Int, Int)? {
  if weekday == 1 || weekday == 7 { return nil }
  if ny { return (9 * 60 + 30, 16 * 60) }
  return weekday == 6 ? (9 * 60 + 59, 13 * 60 + 50) : (9 * 60 + 59, 17 * 60 + 25)
}

/// Wall Street and Tel Aviv clocks computed on the phone (markets-only mode).
func localClocks(at date: Date) -> [Clock] {
  let he = phoneHebrew
  let units = he ? Units(d: "י׳", h: "ש׳", m: "ד׳") : Units(d: "d", h: "h", m: "m")
  let markets: [(Bool, String, String, String)] = [
    (true, he ? "וול סטריט" : "Wall Street", "🇺🇸", "America/New_York"),
    (false, he ? "תל אביב" : "Tel Aviv", "🇮🇱", "Asia/Jerusalem"),
  ]
  var out: [Clock] = []
  for (ny, label, flag, tzId) in markets {
    let tz = TimeZone(identifier: tzId) ?? .current
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = tz
    let now = cal.component(.hour, from: date) * 60 + cal.component(.minute, from: date)
    let today = sessionMinutes(ny, weekday: cal.component(.weekday, from: date))
    var open = false
    var minutes = 0
    if let s = today, now >= s.0, now < s.1 {
      open = true
      minutes = s.1 - now
    } else if let s = today, now < s.0 {
      minutes = s.0 - now
    } else {
      // Rest of today, then whole closed days, then the next session's opening minute.
      minutes = 24 * 60 - now
      for d in 1...7 {
        let day = cal.date(byAdding: .day, value: d, to: date) ?? date
        if let s = sessionMinutes(ny, weekday: cal.component(.weekday, from: day)) {
          minutes += s.0
          break
        }
        minutes += 24 * 60
      }
    }
    let phase = open ? (he ? "פתוח" : "Open") : (he ? "סגור" : "Closed")
    let tmpl = open ? (he ? "נסגר בעוד {t}" : "Closes in {t}") : (he ? "נפתח בעוד {t}" : "Opens in {t}")
    let status = phase + " · " + tmpl.replacingOccurrences(of: "{t}", with: duration(minutes, units))
    out.append(Clock(label: label, flag: flag, time: hhmm(date, tz), status: status, open: open))
  }
  return out
}

struct IndexList: View {
  let rows: [IndexRow]
  var showValue = true
  var body: some View {
    VStack(alignment: .leading, spacing: 3) {
      ForEach(rows) { r in
        HStack(spacing: 6) {
          Text(r.name).font(.caption.weight(.semibold)).foregroundColor(.white).lineLimit(1)
          Spacer(minLength: 2)
          if showValue { Text(r.value).font(.caption2).foregroundColor(muted).lineLimit(1) }
          Text(r.pct).font(.caption.weight(.bold)).foregroundColor(r.up ? upColor : downColor).lineLimit(1)
        }
        .environment(\.layoutDirection, .leftToRight)
      }
    }
    .padding(8)
    .frame(maxWidth: .infinity, alignment: .topLeading)
    .background(card)
    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
  }
}

/// Markets-only widget: live indexes and USD/ILS, plus the market clocks.
struct MarketsView: View {
  @Environment(\.widgetFamily) var family
  let rows: [IndexRow]
  let date: Date
  var title: String { phoneHebrew ? "כספלי · שווקים" : "Kesefly · Markets" }
  var updated: String { (phoneHebrew ? "עודכן " : "Updated ") + hhmm(date) }
  var offline: String { phoneHebrew ? "אין חיבור לרשת" : "No connection" }

  var body: some View {
    switch family {
    case .accessoryInline:
      Text(rows.first.map { "\($0.name) \($0.pct)" } ?? title)
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 1) {
        ForEach(Array(rows.prefix(3))) { r in
          Text("\(r.name) \(r.pct)").font(.caption2).lineLimit(1).minimumScaleFactor(0.7)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    case .systemSmall:
      VStack(alignment: .leading, spacing: 6) {
        Text(title).font(.caption2.weight(.bold)).foregroundColor(gold).lineLimit(1)
        if rows.isEmpty {
          Text(offline).font(.footnote).foregroundColor(.white)
        } else {
          ForEach(Array(rows.prefix(4))) { r in
            HStack(spacing: 4) {
              Text(r.name).font(.caption2.weight(.semibold)).foregroundColor(.white).lineLimit(1)
              Spacer(minLength: 2)
              Text(r.pct).font(.caption2.weight(.bold)).foregroundColor(r.up ? upColor : downColor).lineLimit(1)
            }
            .environment(\.layoutDirection, .leftToRight)
          }
        }
        Spacer(minLength: 0)
        Text(updated).font(.system(size: 10)).foregroundColor(muted).lineLimit(1)
      }
    default:
      VStack(alignment: .leading, spacing: 8) {
        HStack {
          Text(title).font(.caption.weight(.bold)).foregroundColor(gold).lineLimit(1)
          Spacer(minLength: 4)
          Text(updated).font(.caption2).foregroundColor(muted).lineLimit(1)
        }
        if rows.isEmpty {
          Text(offline).font(.footnote).foregroundColor(.white)
        } else {
          if family == .systemMedium {
            // Two columns of two rows, so all four fit above the clocks.
            HStack(spacing: 8) {
              IndexList(rows: Array(rows.prefix(2)), showValue: false)
              IndexList(rows: Array(rows.dropFirst(2).prefix(2)), showValue: false)
            }
          } else {
            IndexList(rows: rows)
          }
        }
        Spacer(minLength: 0)
        ClockRow(clocks: localClocks(at: date))
      }
    }
  }
}

// MARK: - Widget

struct KeseflyWidget: Widget {
  let kind = "KeseflyWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      KeseflyWidgetView(entry: entry)
    }
    .configurationDisplayName("Kesefly")
    .description("Portfolio value, top movers and market clocks. Live markets when the portfolio is not shared.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryInline])
  }
}

@main
struct KeseflyWidgets: WidgetBundle {
  var body: some Widget { KeseflyWidget() }
}
