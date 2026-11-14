/**
 * Home widgets:
 *   - TimeCard: the phone's time and date (Gregorian + Hebrew calendar) and live clocks for
 *     Wall Street (New York) and Tel Aviv with open / closed status and a countdown.
 *   - LiveFeed: "Minute by minute" — the latest market events, refreshed every minute.
 *   - LearnCard: Kesefly Academy progress and the next lesson.
 *   - PortfolioCard, MarketGlance, TopMovers: live portfolio, main markets, biggest watchlist moves.
 */
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { buildPath } from '@/engine/academy';
import { formatDuration, formatHebrewDate, hebrewFromGregorian, marketStatus, type MarketStatus } from '@/engine/clock';
import { ago } from '@/engine/news';
import { formatPrice, formatSigned, type Quote } from '@/engine/stocks';
import { ACADEMY } from '@/i18n/academy';
import { fill, useApp } from '@/state/app-store';
import { usePortfolio } from '@/state/portfolio';
import { Sparkline } from '@/ui/charts';
import { Button, Card, ChangeBadge, CountUp, LiveDot, Pill, ProgressBar, Row, SymbolBadge, Txt } from '@/ui/components';
import { useEvents } from '@/ui/events';
import { Flag } from '@/ui/flags';
import { Fonts, Metrics, useTokens } from '@/ui/theme';

function useNow(ms: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

const two = (n: number) => String(n).padStart(2, '0');

export function TimeCard() {
  const { s, lang } = useApp();
  const { colors } = useTokens();
  const now = useNow(1000);
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const greg = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const heb = formatHebrewDate(hebrewFromGregorian(now.getFullYear(), now.getMonth() + 1, now.getDate()), lang);
  // Market status changes by the minute: recompute once per minute, not every second.
  const minute = Math.floor(now.getTime() / 60_000);
  const ny = useMemo(() => marketStatus('NY', minute * 60_000), [minute]);
  const tlv = useMemo(() => marketStatus('TLV', minute * 60_000), [minute]);
  const muted = 'rgba(255,255,255,0.72)';

  return (
    <View style={{ backgroundColor: colors.hero, borderRadius: Metrics.cardRadius + 8, padding: 18, gap: 14, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', bottom: -70, start: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(245,197,66,0.10)' }} />
      <View style={{ gap: 2 }}>
        <Txt variant="footnote" style={{ color: muted }}>
          {s.clock.phone}
        </Txt>
        {/* Digits read left-to-right in both languages. */}
        <Txt style={{ color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 40, lineHeight: 48, writingDirection: 'ltr', fontVariant: ['tabular-nums'] }} accessibilityRole="timer">
          {`${two(now.getHours())}:${two(now.getMinutes())}:${two(now.getSeconds())}`}
        </Txt>
        <Txt variant="subhead" style={{ color: '#FFFFFF' }}>
          {greg}
        </Txt>
        <Row style={{ gap: 6 }}>
          <Txt variant="footnote" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {`${s.clock.hebrew}:`}
          </Txt>
          <Txt variant="footnote" style={{ color: '#F5C542', fontFamily: Fonts.semibold, flexShrink: 1 }}>
            {heb}
          </Txt>
        </Row>
      </View>
      <View style={{ height: 0.5, backgroundColor: 'rgba(255,255,255,0.2)' }} />
      <MarketClock label={s.clock.wallStreet} flag="US" city="New York" st={ny} />
      <MarketClock label={s.clock.telAviv} flag="IL" city="Tel Aviv" st={tlv} />
    </View>
  );
}

function MarketClock({ label, flag, city, st }: { label: string; flag: 'US' | 'IL'; city: string; st: MarketStatus }) {
  const { s, lang } = useApp();
  const open = st.phase === 'open';
  const extended = st.phase === 'pre' || st.phase === 'after';
  const dot = open ? '#7EE2A8' : extended ? '#F5C542' : '#FF8A80';
  return (
    <Row style={{ gap: 10 }}>
      <View style={{ width: 10, alignItems: 'center' }}>{open ? <LiveDot color={dot} /> : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />}</View>
      <View style={{ flex: 1 }}>
        <Row style={{ gap: 6 }}>
          <Txt variant="headline" style={{ color: '#FFFFFF', flexShrink: 1 }}>
            {label}
          </Txt>
          {/* Country flag (SVG rectangle) after the exchange name, in reading order. */}
          <Flag country={flag} />
        </Row>
        <Txt variant="caption" style={{ color: 'rgba(255,255,255,0.72)' }}>
          {`${s.clock.phase[st.phase]} · ${fill(open ? s.clock.closesIn : s.clock.opensIn, { t: formatDuration(st.minutesToChange, lang) })}`}
        </Txt>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Txt style={{ color: '#FFFFFF', fontFamily: Fonts.semibold, fontSize: 20, lineHeight: 25, writingDirection: 'ltr', fontVariant: ['tabular-nums'] }}>
          {`${two(st.time.hour)}:${two(st.time.minute)}`}
        </Txt>
        <Txt variant="caption" style={{ color: 'rgba(255,255,255,0.6)', writingDirection: 'ltr' }}>
          {`${city} · UTC${st.time.offset >= 0 ? '+' : ''}${st.time.offset}`}
        </Txt>
      </View>
    </Row>
  );
}

/** "דקה אחר דקה": latest events as a timeline. */
export function LiveFeed() {
  const { s, lang } = useApp();
  const { colors } = useTokens();
  const { events, now } = useEvents();
  const latest = (events ?? []).slice(0, 6);
  return (
    <Card style={{ gap: 10 }}>
      <Row style={{ gap: 8 }}>
        <LiveDot />
        <Txt variant="title3" style={{ flex: 1 }} accessibilityRole="header">
          {s.events.live}
        </Txt>
        <Pill label={s.events.liveBadge} bg={colors.danger} fg={colors.background} />
      </Row>
      {events === null ? (
        <ActivityIndicator color={colors.accent} />
      ) : latest.length === 0 ? (
        <Txt variant="subhead" color="textSecondary">
          {s.events.empty}
        </Txt>
      ) : (
        latest.map((e, i) => (
          <Pressable key={e.id} accessibilityRole="button" onPress={() => router.push('/events')} style={{ flexDirection: 'row', gap: 10 }}>
            {/* Timeline rail */}
            <View style={{ alignItems: 'center', width: 12 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 4, backgroundColor: e.impact === 'high' ? colors.danger : e.impact === 'medium' ? colors.warning : colors.separator }} />
              {i < latest.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: colors.separator, marginTop: 2 }} /> : null}
            </View>
            <View style={{ flex: 1, gap: 2, paddingBottom: 8 }}>
              <Txt variant="caption" color="textSecondary">
                {`${ago(e.time, lang, now)} · ${s.events.cat[e.category]}${e.affects.length ? ` · ${e.affects.slice(0, 2).join(', ')}` : ''}${e.original ? ` · ${s.events.translated}` : ''}`}
              </Txt>
              <Txt variant="subhead" numberOfLines={2} style={{ writingDirection: e.lang === 'he' ? 'rtl' : 'ltr', textAlign: 'left' }}>
                {e.title}
              </Txt>
            </View>
          </Pressable>
        ))
      )}
      <Button kind="plain" label={s.events.seeAll} onPress={() => router.push('/events')} />
    </Card>
  );
}

export function LearnCard() {
  const { s, lang, academy, profile, holdings } = useApp();
  const { colors } = useTokens();
  const path = useMemo(() => buildPath(academy, profile, holdings), [academy, profile, holdings]);
  const next = path.next ? ACADEMY[lang].lessons[path.next.id] : null;
  return (
    <Card>
      <Row>
        <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 4, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Txt variant="headline" style={{ writingDirection: 'ltr' }}>
            {String(path.knowledge)}
          </Txt>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="headline">{s.academy.title}</Txt>
          <Txt variant="footnote" color="textSecondary">
            {`${fill(s.academy.level, { n: path.level })} · ${fill(s.academy.lessonsDone, { done: path.doneCount, total: path.total })} · ${fill(s.academy.xp, { n: academy.xp })}`}
          </Txt>
        </View>
      </Row>
      <ProgressBar value={path.doneCount / path.total} />
      {!academy.placement ? (
        <Button label={s.academy.startTest} onPress={() => router.push('/assessment')} />
      ) : next && path.next ? (
        <Button label={`${s.academy.continue}: ${next.title}`} onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: path.next!.id } })} />
      ) : null}
    </Card>
  );
}

/* ---------- Portfolio, market glance, movers ---------- */

const GLANCE = ['^GSPC', '^IXIC', '^TA125.TA', 'ILS=X'] as const;

/**
 * Home portfolio card: live value in the user's currency, today's change, total gain, and the
 * three largest holdings with weight bars. Empty state invites the first holding.
 */
export function PortfolioCard({ pf }: { pf: ReturnType<typeof usePortfolio> }) {
  const { s, lang, holdings } = useApp();
  const { colors } = useTokens();
  const gain = pf.total - pf.cost;
  const money = (v: number) => formatPrice(v, pf.cur, lang);
  const muted = 'rgba(255,255,255,0.72)';
  if (!holdings.length) {
    return (
      <Card>
        <Txt variant="headline">{s.home2.portfolioTitle}</Txt>
        <Txt variant="subhead" color="textSecondary">
          {s.stocks.portfolioEmptyBody}
        </Txt>
        <Button kind="tonal" label={s.stocks.addHolding} onPress={() => router.navigate('/stocks')} />
      </Card>
    );
  }
  return (
    <Pressable accessibilityRole="button" onPress={() => router.navigate('/stocks')}>
      <View style={{ backgroundColor: colors.hero, borderRadius: Metrics.cardRadius + 8, padding: 18, gap: 12, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: -50, end: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(245,197,66,0.12)' }} />
        <Row>
          <Txt variant="footnote" style={{ color: muted, flex: 1 }}>
            {s.home2.portfolioTitle}
          </Txt>
          <Txt variant="caption" style={{ color: muted }}>
            {s.home2.open}
          </Txt>
        </Row>
        <CountUp value={pf.total} format={money} style={{ color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 32, lineHeight: 38, writingDirection: 'ltr', textAlign: 'left' }} />
        <Row style={{ gap: 14, flexWrap: 'wrap' }}>
          <Txt variant="subhead" style={{ color: pf.day >= 0 ? '#7EE2A8' : '#FF8A80', writingDirection: 'ltr' }}>
            {`${s.stock.dayChange} ${formatSigned(pf.day, pf.cur, lang)}`}
          </Txt>
          <Txt variant="subhead" style={{ color: gain >= 0 ? '#7EE2A8' : '#FF8A80', writingDirection: 'ltr' }}>
            {`${s.stock.totalGain} ${formatSigned(pf.cost ? gain / pf.cost : 0, pf.cur, lang, true)}`}
          </Txt>
        </Row>
        {pf.rows.slice(0, 3).map((r) => (
          <View key={r.symbol} style={{ gap: 4 }}>
            <Row>
              <Txt variant="subhead" style={{ color: '#FFFFFF', flex: 1, writingDirection: 'ltr' }}>
                {r.symbol}
              </Txt>
              <Txt variant="subhead" style={{ color: '#FFFFFF', writingDirection: 'ltr' }}>
                {`${Math.round(r.weight * 100)}%`}
              </Txt>
            </Row>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', direction: 'ltr' }}>
              <View style={{ width: `${Math.round(r.weight * 100)}%`, height: 4, borderRadius: 2, backgroundColor: '#F5C542' }} />
            </View>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

/** 2x2 market tiles: S&P 500, Nasdaq, TA-125, USD/ILS. Tap opens the stock page. */
export function MarketGlance({ quotes }: { quotes: Record<string, Quote> }) {
  const { s, lang } = useApp();
  const { colors } = useTokens();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {GLANCE.map((sym) => {
        const q = quotes[sym];
        return (
          <Pressable
            key={sym}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/stock/[symbol]', params: { symbol: sym } })}
            style={{ width: '48%', flexGrow: 1, backgroundColor: colors.card, borderRadius: Metrics.cardRadius, padding: 12, gap: 4 }}>
            <Txt variant="footnote" color="textSecondary" numberOfLines={1}>
              {s.market.tiles[sym]}
            </Txt>
            <Txt variant="headline" style={{ writingDirection: 'ltr' }} numberOfLines={1}>
              {q ? (sym === 'ILS=X' ? q.price.toFixed(3) : formatPrice(q.price, q.currency, lang)) : '—'}
            </Txt>
            <Row style={{ justifyContent: 'space-between' }}>
              {q ? <ChangeBadge pct={q.changePct} text={formatSigned(q.changePct, 'USD', lang, true)} /> : <View />}
              <Sparkline symbol={sym} width={56} height={22} />
            </Row>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The 3 watchlist stocks moving most today. */
export function TopMovers({ quotes }: { quotes: Record<string, Quote> }) {
  const { s, lang, watchlist } = useApp();
  const { colors } = useTokens();
  const movers = watchlist
    .map((sym) => quotes[sym])
    .filter((q): q is Quote => !!q)
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 3);
  if (!movers.length) return null;
  return (
    <Card style={{ gap: 0, paddingVertical: 4 }}>
      {movers.map((q, i) => (
        <Pressable
          key={q.symbol}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/stock/[symbol]', params: { symbol: q.symbol } })}
          style={{ minHeight: 56, justifyContent: 'center', borderTopWidth: i ? 0.5 : 0, borderColor: colors.separator }}>
          <Row>
            <SymbolBadge symbol={q.symbol} size={34} />
            <View style={{ flex: 1 }}>
              <Txt variant="headline" style={{ writingDirection: 'ltr' }}>
                {q.symbol}
              </Txt>
              <Txt variant="footnote" color="textSecondary" numberOfLines={1}>
                {s.stocks.names[q.symbol] ?? q.name}
              </Txt>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Txt variant="subhead" style={{ writingDirection: 'ltr', fontFamily: Fonts.semibold }}>
                {formatPrice(q.price, q.currency, lang)}
              </Txt>
              <ChangeBadge pct={q.changePct} text={formatSigned(q.changePct, q.currency, lang, true)} />
            </View>
          </Row>
        </Pressable>
      ))}
    </Card>
  );
}
