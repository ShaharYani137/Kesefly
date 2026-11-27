/**
 * Compare to an index: the user's portfolio against the same cash flows put into an index on
 * the same days (engine/benchmark.ts), with the money-weighted yearly return of both.
 * Needs dated purchases and sales. Recommend only: past results, not a forecast.
 */
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { BENCHMARKS, type BenchmarkResult, type BenchmarkSymbol, convertAt, type Flow, fxFrom, replayIndex, xirr } from '@/engine/benchmark';
import { formatPrice, formatSigned, getHistorySince } from '@/engine/stocks';
import { fill, useApp } from '@/state/app-store';
import { guessCurrency, usePortfolio } from '@/state/portfolio';
import { Appear, Button, Card, Chip, Disclaimer, Screen, Txt } from '@/ui/components';
import { LineItem } from '@/ui/money-ui';
import { useTokens } from '@/ui/theme';

const DAY = 86400_000;

export default function CompareScreen() {
  const { s, lang, holdings, sales, dividends } = useApp();
  const { colors } = useTokens();
  const pf = usePortfolio();
  const [bench, setBench] = useState<BenchmarkSymbol>(holdings.some((h) => !h.symbol.endsWith('.TA')) ? '^GSPC' : '^TA125.TA');
  const [attempt, setAttempt] = useState(0);
  // Result of the last finished request, tagged with its benchmark + attempt. Until the tag
  // matches the current one the screen shows loading (no setState inside the effect body).
  const reqKey = `${bench}|${attempt}`;
  const [result, setResult] = useState<{ key: string } & ({ status: 'error' } | { status: 'done'; idx: BenchmarkResult; yourIrr: number | null })>();
  const state = result?.key === reqKey ? result : { status: 'loading' as const };
  const money = (v: number) => formatPrice(v, pf.cur, lang);
  const pctSigned = (v: number) => formatSigned(v, 'USD', lang, true);

  const undated = holdings.filter((h) => !h.date).length + sales.filter((x) => !x.date).length;
  const first = useMemo(() => {
    const dates = holdings.map((h) => h.date).filter((d): d is string => !!d);
    return dates.length ? Math.min(...dates.map((d) => Date.parse(d))) : null;
  }, [holdings]);
  // Every symbol needs a price before the totals mean anything.
  // (No FX rate needed: fxFrom falls back to today's rate, and same-currency flows need none.)
  const loaded = pf.updated !== null && !pf.loading;
  const missing = loaded && pf.rows.some((r) => !r.quote);
  const ready = loaded && !missing;

  const curOf = useCallback((sym: string) => pf.quotes[sym]?.currency ?? guessCurrency(sym), [pf.quotes]);

  useEffect(() => {
    if (undated || first === null || !ready) return;
    let alive = true;
    const meta = BENCHMARKS.find((b) => b.symbol === bench)!;
    const key = `${bench}|${attempt}`;
    Promise.all([getHistorySince(bench, first), getHistorySince('ILS=X', first).catch(() => null)])
      .then(([idx, fxSeries]) => {
        if (!alive) return;
        const fx = fxFrom(fxSeries, pf.rate);
        // Cash flows in the user's currency, each at its own day's USD/ILS rate.
        const at = (d: string) => Date.parse(d) + DAY / 2;
        const flows: Flow[] = [
          ...holdings.map((h) => ({ t: at(h.date!), amount: -convertAt(h.shares * h.buyPrice + (h.fee ?? 0), curOf(h.symbol), pf.cur, fx(at(h.date!))) })),
          ...sales.map((x) => ({ t: at(x.date!), amount: convertAt(x.shares * x.price - (x.fee ?? 0), curOf(x.symbol), pf.cur, fx(at(x.date!))) })),
          ...dividends
            .filter((d) => d.date)
            .map((d) => ({ t: at(d.date!), amount: convertAt(d.amount - (d.tax ?? 0), curOf(d.symbol), pf.cur, fx(at(d.date!))) })),
        ];
        const now = Date.now();
        const replay = replayIndex(flows, idx, meta.currency, pf.cur, fx, now);
        // NaN = a USD/ILS conversion with no rate at all: show the error and retry, not a fake comparison.
        if (!Number.isFinite(replay.value) || !Number.isFinite(pf.total)) throw new Error('no fx rate');
        setResult({ key, status: 'done', idx: replay, yourIrr: xirr([...flows, { t: now, amount: pf.total }]) });
      })
      .catch(() => alive && setResult({ key, status: 'error' }));
    return () => {
      alive = false;
    };
    // Reruns on quote refreshes too (pf.total); index history is cached, so that costs no download.
  }, [bench, first, undated, ready, holdings, sales, dividends, pf.cur, pf.total, pf.rate, curOf, attempt]);

  const name = s.compare.benchmarks[bench];
  const body = () => {
    if (!holdings.length)
      return (
        <Card>
          <Txt variant="subhead" color="textSecondary">
            {s.compare.noHoldings}
          </Txt>
        </Card>
      );
    // Holdings without dates (or no dated purchase at all): say how many need a date.
    if (undated || first === null)
      return (
        <Card>
          <Txt variant="subhead" color="warning">
            {fill(s.compare.needDates, { n: undated || holdings.length })}
          </Txt>
        </Card>
      );
    if (missing || state.status === 'error')
      return (
        <Card>
          <Txt variant="subhead" color="danger">
            {s.compare.error}
          </Txt>
          <Button
            kind="tonal"
            label={s.compare.retry}
            onPress={() => {
              if (missing) pf.refresh();
              else setAttempt((a) => a + 1);
            }}
          />
        </Card>
      );
    if (state.status !== 'done')
      return (
        <Card style={{ alignItems: 'center' }}>
          <ActivityIndicator color={colors.accent} />
          <Txt variant="footnote" color="textSecondary">
            {s.compare.loading}
          </Txt>
        </Card>
      );
    const { idx, yourIrr } = state;
    const diff = pf.total - idx.value;
    const max = Math.max(pf.total, idx.value, 1);
    const near = Math.abs(diff) < Math.max(1, 0.005 * Math.abs(idx.value));
    const bar = (v: number, color: string) => (
      // Bars grow from the start edge and stay LTR (M3 layout.md: no mirroring for data).
      <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.fill, overflow: 'hidden', direction: 'ltr' }}>
        <View style={{ width: `${Math.max(2, (Math.max(0, v) / max) * 100)}%`, height: 10, borderRadius: 5, backgroundColor: color }} />
      </View>
    );
    return (
      <>
        <Appear index={0}>
          <Card style={{ gap: 12 }}>
            <Txt variant="title3" color={near ? 'text' : diff > 0 ? 'positive' : 'danger'}>
              {near ? s.compare.even : fill(diff > 0 ? s.compare.ahead : s.compare.behind, { v: money(Math.abs(diff)) })}
            </Txt>
            <View style={{ gap: 6 }}>
              <LineItem label={s.compare.yours} value={money(pf.total)} strong />
              {bar(pf.total, colors.accent)}
              <Txt variant="footnote" color="textSecondary">
                {yourIrr === null ? s.compare.yearlyNone : fill(s.compare.yearly, { p: pctSigned(yourIrr) })}
              </Txt>
            </View>
            <View style={{ gap: 6 }}>
              <LineItem label={fill(s.compare.index, { name })} value={money(idx.value)} strong />
              {bar(idx.value, colors.textSecondary)}
              <Txt variant="footnote" color="textSecondary">
                {idx.irr === null ? s.compare.yearlyNone : fill(s.compare.yearly, { p: pctSigned(idx.irr) })}
              </Txt>
            </View>
          </Card>
        </Appear>
        <Appear index={1}>
          <Card>
            <Txt variant="subhead" color="textSecondary">
              {fill(s.compare.since, { date: new Date(idx.from).toISOString().slice(0, 10) })}
            </Txt>
            <Txt variant="subhead" color="textSecondary">
              {fill(s.compare.netIn, { v: money(idx.netInvested) })}
            </Txt>
            <Txt variant="subhead" color="textSecondary">
              {fill(s.compare.indexMove, { name, p: pctSigned(idx.indexChange) })}
            </Txt>
          </Card>
        </Appear>
      </>
    );
  };

  return (
    <Screen title={s.compare.title} subtitle={s.compare.subtitle} onBack={() => router.back()}>
      {/* Chips that wrap: four index names do not fit one segmented row on a phone. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {BENCHMARKS.map((b) => (
          <Chip key={b.symbol} label={(b.symbol === bench ? '✓ ' : '') + s.compare.benchmarks[b.symbol]} onPress={() => setBench(b.symbol)} />
        ))}
      </View>
      {body()}
      <Card>
        <Txt variant="headline">{s.compare.howTitle}</Txt>
        <Txt variant="footnote" color="textSecondary">
          {s.compare.how}
        </Txt>
      </Card>
      <Disclaimer />
    </Screen>
  );
}
