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
// Layout values follow the Apple HIG widget guidance (apple-human-interface-guidelines
// references/widgets.md: 16 pt margins via the default content margins, SF system text styles).
// Brand colors are design decisions (same as the Android widget).
//
// Privacy (P-018): money values (portfolio value, today's change, total gain, mover prices) are
// marked .privacySensitive(), so iOS can redact them while the iPhone is locked (Lock Screen,
// StandBy). Titles, symbols and market clocks stay visible.
//

import SwiftUI
import WidgetKit

// MARK: - Shared data

let appGroup = "group.com.kesefly.app"
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

/// Open Day-trading lab practice trade, one formatted line (src/widget/data.ts).
struct LabLine: Codable { let line: String; let up: Bool? }

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
  /// Missing in payloads written before the Lab existed.
  let lab: LabLine?
}

/// Market segments in the payload cover 3 days. Older data shows the "Open Kesefly to update"
/// fallback instead of wrong clocks.
let maxAgeMs: Double = 3 * 86_400_000

func loadPayload() -> Payload? {
  guard let raw = UserDefaults(suiteName: appGroup)?.string(forKey: dataKey),
        let data = raw.data(using: .utf8),
        let p = try? JSONDecoder().decode(Payload.self, from: data) else { return nil }
  return Date().timeIntervalSince1970 * 1000 - p.at > maxAgeMs ? nil : p
}

/// Fallback text when there is no (fresh) data. The app has not written labels yet, so the
/// language comes from the phone.
func openAppText() -> (title: String, body: String) {
  let he = Locale.preferredLanguages.first?.hasPrefix("he") ?? false
  return he ? ("כספלי", "פתחו את כספלי כדי לעדכן") : ("Kesefly", "Open Kesefly to update")
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
        completion(Timeline(entries: [Entry(date: now, payload: nil, numbers: nil)], policy: .after(now.addingTimeInterval(1800))))
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
          .privacySensitive()
        Text(n.day).font(.caption).foregroundColor(n.dayUp ? upColor : downColor).lineLimit(1).minimumScaleFactor(0.7).privacySensitive()
        Text(n.gain).font(.caption).foregroundColor(n.gainUp ? upColor : downColor).lineLimit(1).minimumScaleFactor(0.7).privacySensitive()
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
          if showPrice { Text(m.price).font(.caption2).foregroundColor(muted).lineLimit(1).privacySensitive() }
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

struct LabRow: View {
  let lab: LabLine
  var body: some View {
    Text(lab.line)
      .font(.caption2.weight(.semibold))
      .foregroundColor(lab.up == nil ? gold : (lab.up! ? upColor : downColor))
      .lineLimit(1)
      .minimumScaleFactor(0.7)
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
      .environment(\.layoutDirection, (entry.payload?.lang ?? (Locale.preferredLanguages.first?.hasPrefix("he") == true ? "he" : "en")) == "he" ? .rightToLeft : .leftToRight)
      .containerBackground(for: .widget) { bg }
      .widgetURL(URL(string: "kesefly://"))
  }

  @ViewBuilder var content: some View {
    if let p = entry.payload, let n = entry.numbers {
      switch family {
      case .accessoryInline:
        Text(n.value.map { "\(p.labels.title.components(separatedBy: " · ").first ?? "Kesefly") \($0)" } ?? p.labels.title)
          .privacySensitive()
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 1) {
          Text(p.labels.title).font(.caption2.weight(.bold)).lineLimit(1)
          Text(n.value ?? "—").font(.headline).lineLimit(1).minimumScaleFactor(0.6).privacySensitive()
          Text(n.day).font(.caption2).lineLimit(1).minimumScaleFactor(0.7).privacySensitive()
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
          if let lab = p.lab { LabRow(lab: lab) }
          ValueBlock(p: p, n: n, big: true)
          if !n.movers.isEmpty { MoversList(movers: Array(n.movers.prefix(6)), showPrice: true) }
          Spacer(minLength: 0)
          ClockRow(clocks: clocks(p, at: entry.date))
        }
      default:
        VStack(alignment: .leading, spacing: 8) {
          Header(p: p, n: n, showRate: false)
          if let lab = p.lab { LabRow(lab: lab) }
          HStack(spacing: 10) {
            ValueBlock(p: p, n: n, big: false)
            if !n.movers.isEmpty { MoversList(movers: Array(n.movers.prefix(3)), showPrice: false) }
          }
          ClockRow(clocks: clocks(p, at: entry.date))
        }
      }
    } else {
      let t = openAppText()
      switch family {
      case .accessoryInline:
        Text(t.body)
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 1) {
          Text(t.title).font(.caption2.weight(.bold)).lineLimit(1)
          Text(t.body).font(.caption2).lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      default:
        VStack(alignment: .leading, spacing: 6) {
          Text(t.title).font(.caption.weight(.bold)).foregroundColor(gold)
          Text(t.body).font(.footnote).foregroundColor(.white)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
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
    .description("Portfolio value, top movers and market clocks.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryInline])
  }
}

@main
struct KeseflyWidgets: WidgetBundle {
  var body: some Widget { KeseflyWidget() }
}
