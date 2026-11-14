/**
 * Stock page: big live price, interactive chart (1D to 5Y), key stats with a 52-week range
 * bar, performance chips, a plain-language "Kesefly insight" (trend, range position,
 * volatility), the user's own position, related news with impact tags, and actions
 * (watchlist, portfolio, ask the helper). Information only, never a buy or sell signal.
 */
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ago, getSymbolNews, type MarketEvent } from '@/engine/news';
import { formatPrice, formatSigned, getHistory, getQuote, type HistoryPoint, type Quote, seriesStats, StockError } from '@/engine/stocks';
import { fill, useApp } from '@/state/app-store';
import { usePortfolio } from '@/state/portfolio';
import { Appear, Button, Card, ChangeBadge, CountUp, Icon, IconButton, Pill, Row, Screen, SectionHeader, SymbolBadge, Txt } from '@/ui/components';
import { AddHolding } from '@/ui/holding-form';
import { enterFade } from '@/ui/motion';
import { StockChart } from '@/ui/stock-chart';
import { Fonts, Metrics, useTokens } from '@/ui/theme';

const PERF: { key: '1W' | '1M' | '6M' | '1Y'; days: number }[] = [
  { key: '1W', days: 5 },
  { key: '1M', days: 21 },
  { key: '6M', days: 126 },
  { key: '1Y', days: 250 },
];

export default function StockPage() {
  const { symbol: raw } = useLocalSearchParams<{ symbol: string }>();
  const symbol = decodeURIComponent(raw ?? '').toUpperCase();
  const { s, lang, watchlist, addSymbol, removeSymbol, addHolding, removeHolding } = useApp();
  const { colors } = useTokens();
  const pf = usePortfolio();
  const [q, setQ] = useState<Quote | null>(null);
  const [err, setErr] = useState<StockError['code'] | null>(null);
  const [year, setYear] = useState<HistoryPoint[] | null>(null);
  const [news, setNews] = useState<MarketEvent[] | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let alive = true;
    getQuote(symbol, true)
      .then((x) => alive && setQ(x))
      .catch((e) => alive && setErr(e instanceof StockError ? e.code : 'network'));
    getHistory(symbol, '1Y')
      .then((x) => alive && setYear(x))
      .catch(() => alive && setYear([]));
    getSymbolNews(symbol, 6, lang).then((x) => alive && setNews(x));
    return () => {
      alive = false;
    };
  }, [symbol, lang]);

  const watching = watchlist.includes(symbol);
  const pos = pf.rows.find((r) => r.symbol === symbol);
  const stats = year && year.length > 2 ? seriesStats(year) : null;
  const rangePos = q && q.yearHigh > q.yearLow ? (q.price - q.yearLow) / (q.yearHigh - q.yearLow) : 0.5;
  const name = s.stocks.names[symbol] ?? s.market.tiles[symbol as keyof typeof s.market.tiles] ?? q?.name ?? '';

  const toggleWatch = () => {
    Haptics.selectionAsync().catch(() => {});
    if (watching) removeSymbol(symbol);
    else addSymbol(symbol);
  };

  return (
    <Screen
      onBack={() => router.back()}
      trailing={null}>
      {/* ---------- Header ---------- */}
      <Row style={{ alignItems: 'center' }}>
        <SymbolBadge symbol={symbol} size={52} />
        <View style={{ flex: 1 }}>
          <Txt variant="title" style={{ writingDirection: 'ltr' }} accessibilityRole="header">
            {symbol}
          </Txt>
          <Txt variant="subhead" color="textSecondary" numberOfLines={1}>
            {name}
          </Txt>
        </View>
        <IconButton sf={watching ? 'star.fill' : 'star'} md={watching ? 'star' : 'star_outline'} label={watching ? s.stock.inWatch : s.stock.addWatch} onPress={toggleWatch} tone={watching ? 'tonal' : 'plain'} />
      </Row>

      {q ? (
        <Appear index={0}>
          <View style={{ gap: 6 }}>
            <CountUp
              value={q.price}
              format={(v) => formatPrice(v, q.currency, lang)}
              style={{ color: colors.text, fontFamily: Fonts.bold, fontSize: 40, lineHeight: 48, writingDirection: 'ltr', textAlign: 'left' }}
            />
            <Row style={{ gap: 8 }}>
              <ChangeBadge pct={q.changePct} text={formatSigned(q.changePct, q.currency, lang, true)} />
              <Txt variant="subhead" style={{ color: q.change >= 0 ? colors.positive : colors.danger, writingDirection: 'ltr' }}>
                {formatSigned(q.change, q.currency, lang)}
              </Txt>
              <Txt variant="footnote" color="textSecondary" style={{ flex: 1 }}>
                {new Date(q.time).toLocaleString(lang === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Txt>
            </Row>
          </View>
        </Appear>
      ) : err ? (
        <Card>
          <Txt color="danger">{err === 'notFound' ? fill(s.stocks.notFound, { symbol }) : s.stocks.error}</Txt>
        </Card>
      ) : (
        <ActivityIndicator color={colors.accent} />
      )}

      {q ? (
        <>
          <Card>
            <StockChart symbol={symbol} currency={q.currency} initial="1M" height={190} />
          </Card>

          {/* ---------- Performance chips ---------- */}
          {year && year.length > 5 ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PERF.map((p) => {
                const i = Math.max(0, year.length - 1 - p.days);
                const ch = year[year.length - 1].close / year[i].close - 1;
                return (
                  <View key={p.key} style={{ flex: 1, backgroundColor: colors.card, borderRadius: Metrics.cardRadius, padding: 10, alignItems: 'center', gap: 2 }}>
                    <Txt variant="caption" color="textSecondary">
                      {p.key}
                    </Txt>
                    <Txt variant="subhead" style={{ color: ch >= 0 ? colors.positive : colors.danger, writingDirection: 'ltr', fontFamily: Fonts.semibold }}>
                      {formatSigned(ch, 'USD', lang, true)}
                    </Txt>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* ---------- Insight ---------- */}
          {stats ? (
            <Card tone="accent">
              <Row>
                <Icon sf="sparkles" md="auto_awesome" color={colors.onAccentSoft} />
                <Txt variant="headline" color="onAccentSoft" style={{ flex: 1 }}>
                  {s.stock.insight}
                </Txt>
              </Row>
              <Txt variant="subhead" color="onAccentSoft">
                {`• ${stats.aboveAvg50 ? s.stock.trendUp : s.stock.trendDown}\n• ${fill(rangePos > 0.8 ? s.stock.nearHigh : rangePos < 0.2 ? s.stock.nearLow : s.stock.midRange, { pos: Math.round(rangePos * 100) })}\n• ${fill(s.stock.vol, {
                  vol: `${Math.round(stats.volatility * 100)}%`,
                  label: stats.volatility < 0.2 ? s.assistant.volLow : stats.volatility < 0.4 ? s.assistant.volMid : s.assistant.volHigh,
                  dd: formatSigned(stats.maxDrawdown, 'USD', lang, true),
                })}`}
              </Txt>
              <Txt variant="footnote" color="onAccentSoft">
                {s.stock.notSignal}
              </Txt>
            </Card>
          ) : null}

          {/* ---------- Key stats ---------- */}
          <SectionHeader>{s.stock.stats}</SectionHeader>
          <Card>
            <Stat label={s.stock.open} value={formatPrice(q.open, q.currency, lang)} />
            <Stat label={s.stock.prevClose} value={formatPrice(q.prevClose, q.currency, lang)} />
            <Stat label={s.stock.dayRange} value={`${formatPrice(q.low, q.currency, lang)} – ${formatPrice(q.high, q.currency, lang)}`} />
            {q.volume ? <Stat label={s.stock.volume} value={new Intl.NumberFormat(lang === 'he' ? 'he-IL' : 'en-US', { notation: 'standard' }).format(q.volume)} /> : null}
            {q.exchange ? <Stat label={s.stock.exchange} value={q.exchange} /> : null}
            <View style={{ gap: 6, paddingTop: 4 }}>
              <Txt variant="subhead" color="textSecondary">
                {s.stock.yearRange}
              </Txt>
              {/* Range bar: low at left, high at right, marker = today. Stays LTR like other charts. */}
              <View style={{ direction: 'ltr', gap: 4 }}>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.fill }}>
                  <View style={{ position: 'absolute', left: `${Math.min(97, Math.max(0, rangePos * 100))}%`, top: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.card }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Txt variant="caption" color="textSecondary" style={{ writingDirection: 'ltr', textAlign: 'left' }}>
                    {formatPrice(q.yearLow, q.currency, lang)}
                  </Txt>
                  <Txt variant="caption" color="textSecondary" style={{ writingDirection: 'ltr', textAlign: 'right' }}>
                    {formatPrice(q.yearHigh, q.currency, lang)}
                  </Txt>
                </View>
              </View>
            </View>
          </Card>

          {/* ---------- Position ---------- */}
          {pos ? (
            <>
              <SectionHeader>{s.stock.yourPosition}</SectionHeader>
              <Card>
                <Stat label={s.stock.shares} value={String(pos.shares)} />
                <Stat label={s.stock.avgCost} value={formatPrice(pos.avgCost, q.currency, lang)} />
                <Stat label={s.stock.marketValue} value={formatPrice(pos.value, pf.cur, lang)} />
                <Stat
                  label={s.stock.totalGain}
                  value={`${formatSigned(pos.value - pos.cost, pf.cur, lang)} (${formatSigned(pos.cost ? pos.value / pos.cost - 1 : 0, 'USD', lang, true)})`}
                  color={pos.value >= pos.cost ? colors.positive : colors.danger}
                />
                <Stat label={s.stock.weight} value={`${Math.round(pos.weight * 100)}%`} />
                <Button kind="tonal" label={s.holding.edit} onPress={() => router.push({ pathname: '/holding/[symbol]', params: { symbol } })} />
                <Button kind="destructive" label={s.stock.removeHolding} onPress={() => pos.ids.forEach(removeHolding)} />
              </Card>
            </>
          ) : null}

          {adding ? (
            <Animated.View entering={enterFade()}>
              <AddHolding
                symbol={symbol}
                onCancel={() => setAdding(false)}
                onSave={(h) => {
                  addHolding(h);
                  setAdding(false);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                }}
              />
            </Animated.View>
          ) : (
            <Button kind="tonal" label={s.stock.addHolding} onPress={() => setAdding(true)} />
          )}
          <Button kind="plain" label={fill(s.stock.ask, { symbol })} onPress={() => router.push({ pathname: '/helper', params: { q: symbol } })} />
        </>
      ) : null}

      {/* ---------- News ---------- */}
      <SectionHeader>{s.stock.news}</SectionHeader>
      {news === null ? (
        <ActivityIndicator color={colors.accent} />
      ) : news.length ? (
        <Card style={{ gap: 0, paddingVertical: 4 }}>
          {news.map((n, i) => (
            <Pressable
              key={n.id}
              accessibilityRole="link"
              onPress={() => WebBrowser.openBrowserAsync(n.link).catch(() => {})}
              style={{ paddingVertical: 10, gap: 4, borderTopWidth: i ? 0.5 : 0, borderColor: colors.separator }}>
              <Row style={{ gap: 6 }}>
                <Pill label={s.events.cat[n.category]} bg={colors.accentSoft} fg={colors.onAccentSoft} />
                <Txt variant="caption" color="textSecondary" style={{ flex: 1 }}>
                  {`${n.source} · ${ago(n.time, lang)}${n.original ? ` · ${s.events.translated}` : ''}`}
                </Txt>
              </Row>
              {/* Headlines are in the source's language: set direction from the text itself. */}
              <Txt variant="subhead" style={{ writingDirection: n.lang === 'he' ? 'rtl' : 'ltr', textAlign: 'left' }}>
                {n.title}
              </Txt>
            </Pressable>
          ))}
        </Card>
      ) : (
        <Txt variant="subhead" color="textSecondary">
          {s.stock.noNews}
        </Txt>
      )}
      <Txt variant="footnote" color="textSecondary">
        {s.stocks.priceNote}
      </Txt>
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', minHeight: 28 }}>
      <Txt variant="subhead" color="textSecondary" style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt variant="subhead" style={{ writingDirection: 'ltr', fontFamily: Fonts.medium, ...(color ? { color } : {}) }}>
        {value}
      </Txt>
    </Row>
  );
}
