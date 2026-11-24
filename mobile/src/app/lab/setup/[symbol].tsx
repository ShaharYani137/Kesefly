/**
 * Lab setup page for one symbol: today's 5-minute candles with the opening range, the entry
 * timer's status (refreshed every 30 s while open), news for the symbol with a "moving 3% or
 * more" flag, and the way on to the exit plan. It says "setup found", never "buy".
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';

import { getEvents, type MarketEvent, safeHttpUrl } from '@/engine/news';
import { type Chart, getCandles } from '@/lab/candles';
import { evaluateEntry, type EntryResult } from '@/lab/entry';
import { zoneOf } from '@/lab/sessions';
import { fill, useApp } from '@/state/app-store';
import { useLab } from '@/state/lab-store';
import { Appear, Button, Card, Pill, Row, Screen, SectionHeader, Txt } from '@/ui/components';
import { CandleChart, type Level } from '@/ui/lab-charts';
import { GateGuard, LabFine, MarketFlag, PracticeChip, useLabFormat } from '@/ui/lab-ui';
import { useTokens } from '@/ui/theme';

const REFRESH_MS = 30_000;
const MOVING = 0.03;

/** Opens a news link only if it is http(s); feed links are untrusted. */
function openNews(link: string) {
  const url = safeHttpUrl(link);
  if (url) Linking.openURL(url).catch(() => {});
}

export default function SetupPage() {
  return (
    <GateGuard>
      <Setup />
    </GateGuard>
  );
}

function Setup() {
  const { symbol: raw } = useLocalSearchParams<{ symbol: string }>();
  const symbol = String(raw ?? '').toUpperCase();
  const zone = zoneOf(symbol);
  const { s, lang } = useApp();
  const lab = useLab();
  const f = useLabFormat();
  const { colors } = useTokens();
  const [chart, setChart] = useState<Chart | null>(null);
  const [entry, setEntry] = useState<EntryResult | null>(null);
  const [error, setError] = useState(false);
  const [news, setNews] = useState<MarketEvent[] | null>(null);
  const [at, setAt] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const c = await getCandles(symbol, '5m', '1d', true);
        if (!alive) return;
        const now = Date.now();
        setChart(c);
        setEntry(evaluateEntry(c, now));
        setAt(now);
        setError(false);
      } catch {
        if (alive) setError(true);
      }
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [symbol]);
  useEffect(() => {
    getEvents({ symbols: [symbol], lang })
      .then((ev) => setNews(ev.filter((e) => e.affects.includes(symbol)).slice(0, 5)))
      .catch(() => setNews([]));
  }, [symbol, lang]);

  const move = chart?.price != null && chart.prevClose ? chart.price / chart.prevClose - 1 : null;
  const cur = chart?.currency ?? (zone === 'TLV' ? 'ILS' : 'USD');
  const ses = entry?.session;

  const statusText = () => {
    if (!entry) return '';
    const t = s.lab.setup.status;
    if (entry.phase === 'closed') return t.closed;
    if (entry.phase === 'pre-open') return fill(t['pre-open'], { time: ses ? f.time(zone, ses.orEndMs) : '' });
    if (entry.phase === 'forming') return fill(t.forming, { time: ses ? f.time(zone, ses.orEndMs) : '' });
    if (entry.status === 'triggered' && entry.trigger) return fill(t.triggered, { time: f.time(zone, entry.trigger.time), price: f.money(entry.trigger.price, cur), level: f.money(entry.level ?? 0, cur) });
    if (entry.status === 'expired') return fill(t.expired, { time: ses ? f.time(zone, ses.entriesUntilMs) : '' });
    if (entry.status === 'no-data' || !entry.last) return t['no-data'];
    if (entry.hold === 'thin-volume') return t.thin;
    if (entry.hold === 'too-early') return t.early;
    const gap = (entry.level ?? 0) - entry.last.close;
    return fill(t.waiting, { close: f.money(entry.last.close, cur), gap: f.money(Math.abs(gap), cur), dir: gap >= 0 ? t.under : t.over, level: f.money(entry.level ?? 0, cur) });
  };

  const levels: Level[] = [];
  if (entry?.openingRange) {
    levels.push({ price: entry.openingRange.high, color: colors.accent, label: `H ${entry.openingRange.high.toFixed(2)}`, dashed: true });
    levels.push({ price: entry.openingRange.low, color: colors.textSecondary, label: `L ${entry.openingRange.low.toFixed(2)}`, dashed: true });
  }

  const planIt = () => {
    if (!entry) return;
    const t = entry.trigger;
    const last = entry.bars[entry.bars.length - 1];
    lab.setDraft({
      symbol,
      setup: t ? 'orb' : 'level',
      entry: t ? t.price : (chart?.price ?? last?.c ?? 0),
      orHigh: entry.openingRange?.high ?? null,
      orLow: entry.openingRange?.low ?? null,
      entryTime: t ? t.time : (last?.end ?? null),
      entryBar: t ? t.slot : (last?.slot ?? null),
      plan: null,
    });
    router.push('/lab/plan');
  };

  return (
    <Screen title={symbol} subtitle={chart?.name} onBack={() => router.back()} trailing={
        <Row style={{ gap: 8 }}>
          <MarketFlag zone={zone} width={27} />
          <PracticeChip />
        </Row>
      }>
      <Appear>
        <Card>
          <Row>
            <Txt variant="title" style={{ flex: 1 }}>
              {chart?.price != null ? f.money(chart.price, cur) : '—'}
            </Txt>
            {move != null && Math.abs(move) >= MOVING ? <Pill label={fill(s.lab.setup.moving, { pct: `${move > 0 ? '+' : ''}${(move * 100).toFixed(1)}%` })} bg={colors.warning} fg={colors.background} /> : null}
          </Row>
          <Txt variant="footnote" color="textSecondary">
            {s.lab.setup.chart}
            {entry?.openingRange ? ` · ${fill(s.lab.setup.range, { low: f.money(entry.openingRange.low, cur), high: f.money(entry.openingRange.high, cur) })}` : ''}
          </Txt>
          {chart ? <CandleChart bars={entry?.bars.length ? entry.bars : chart.bars} levels={levels} /> : error ? null : <ActivityIndicator color={colors.accent} />}
          {error ? (
            <Txt color="danger" variant="subhead">
              {s.lab.setup.error}
            </Txt>
          ) : null}
        </Card>
      </Appear>
      <Appear index={1}>
        <Card tone={entry?.status === 'triggered' ? 'accent' : 'default'}>
          <Txt variant="headline">{statusText()}</Txt>
          {at ? (
            <Txt variant="caption" color="textSecondary">
              {fill(s.lab.setup.refresh, { time: f.time(zone, at) })}
            </Txt>
          ) : null}
          <Button label={entry?.status === 'triggered' ? s.lab.setup.plan : s.lab.setup.planLevel} onPress={planIt} disabled={!entry || entry.phase === 'closed' || !entry.bars.length} kind={entry?.status === 'triggered' ? 'filled' : 'tonal'} />
        </Card>
      </Appear>
      <SectionHeader>{s.lab.setup.news}</SectionHeader>
      <Card style={{ gap: 0, paddingVertical: 4 }}>
        {news == null ? (
          <ActivityIndicator color={colors.accent} />
        ) : news.length ? (
          news.map((n, i) => (
            <Pressable key={n.id} accessibilityRole="link" onPress={() => openNews(n.link)} style={{ paddingVertical: 10, borderTopWidth: i ? 0.5 : 0, borderColor: colors.separator, gap: 2 }}>
              <Txt variant="subhead">{n.title}</Txt>
              <Txt variant="caption" color="textSecondary">
                {n.source}
              </Txt>
            </Pressable>
          ))
        ) : (
          <View style={{ paddingVertical: 10 }}>
            <Txt variant="subhead" color="textSecondary">
              {s.lab.setup.noNews}
            </Txt>
          </View>
        )}
      </Card>
      <LabFine />
    </Screen>
  );
}
