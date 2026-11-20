/**
 * Lab scanner: runs the setup rules on a list (my watchlist + holdings, S&P 100, Nasdaq-100,
 * TA-35). "Breakouts today" finds opening-range breakouts on today's 5-minute bars (closes
 * first, then real highs and lows for the 15 most traded candidates). "Daily setups" runs
 * the five daily rules on 3 months of closes. A scan lists charts that match a rule, not
 * stocks to buy.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { getCandles, getSpark } from '@/lab/candles';
import { orbCandidate, orbHit, type ScanHit, scanDaily } from '@/lab/scanner';
import { ISRAELI_LISTS, universe, UNIVERSES } from '@/lab/universes';
import { fill, useApp } from '@/state/app-store';
import { useLab } from '@/state/lab-store';
import { Appear, Button, Card, Icon, Row, Screen, SectionHeader, Segmented, SymbolBadge, Txt } from '@/ui/components';
import { GateGuard, LabFine, MarketFlag, useLabFormat } from '@/ui/lab-ui';
import { Metrics, useTokens } from '@/ui/theme';
import { zoneOf } from '@/lab/sessions';

const CONFIRM_MAX = 15;
/** Clock read at scan time (outside render). */
const clock = () => Date.now();

export default function Scanner() {
  return (
    <GateGuard>
      <ScannerScreen />
    </GateGuard>
  );
}

function ScannerScreen() {
  const { s, watchlist, holdings } = useApp();
  const lab = useLab();
  const f = useLabFormat();
  const { colors } = useTokens();
  const [mode, setMode] = useState<'orb' | 'daily'>('orb');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [hits, setHits] = useState<ScanHit[] | null>(null);
  const [error, setError] = useState(false);
  const uni = lab.universe;
  const symbols = universe(uni, [...watchlist, ...holdings.map((h) => h.symbol)]);

  const run = async () => {
    setError(false);
    setHits(null);
    setProgress({ done: 0, total: symbols.length });
    try {
      const now = clock();
      if (mode === 'daily') {
        const charts = await getSpark(symbols, '1d', '3mo', (done, total) => setProgress({ done, total }));
        if (!Object.keys(charts).length) throw new Error('empty');
        setHits(scanDaily(charts, symbols, now));
      } else {
        const spark = await getSpark(symbols, '5m', '1d', (done, total) => setProgress({ done, total }));
        if (!Object.keys(spark).length) throw new Error('empty');
        // Stage 1 on closes, most money traded first; stage 2 on real bars.
        const cands = Object.values(spark)
          .filter((c) => orbCandidate(c, now))
          .sort((a, b) => (b.price ?? 0) * (b.volume ?? 0) - (a.price ?? 0) * (a.volume ?? 0))
          .slice(0, CONFIRM_MAX);
        const out: ScanHit[] = [];
        for (const c of cands) {
          const full = await getCandles(c.symbol, '5m', '1d').catch(() => null);
          const hit = full && orbHit(full, now);
          if (hit) out.push({ symbol: c.symbol, setups: ['orb'], price: hit.price, date: '', rsi: null, volume: c.volume, currency: full!.currency, orb: hit });
        }
        setHits(out);
      }
    } catch {
      setError(true);
    } finally {
      setProgress(null);
    }
  };

  return (
    <Screen title={s.lab.scanner.title} subtitle={s.lab.scanner.subtitle} onBack={() => router.back()}>
      <SectionHeader>{`${s.lab.scanner.lists} · ${fill(s.lab.scanner.count, { n: symbols.length })}`}</SectionHeader>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {UNIVERSES.map((v) => {
          const on = uni === v;
          return (
            <Pressable
              key={v}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => {
                lab.setSwitches({ universe: v });
                setHits(null);
              }}
              style={{ minHeight: 36, borderRadius: 999, borderWidth: 1, borderColor: on ? colors.accent : colors.separator, backgroundColor: on ? colors.accentSoft : colors.card, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {ISRAELI_LISTS.includes(v) ? <MarketFlag zone="TLV" width={16} /> : v !== 'mine' ? <MarketFlag zone="NY" width={16} /> : null}
              <Txt variant="subhead" style={{ color: on ? colors.onAccentSoft : colors.text }}>
                {s.lab.scanner.universe[v]}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <Segmented
        value={mode}
        onChange={(v: 'orb' | 'daily') => {
          setMode(v);
          setHits(null);
        }}
        options={[
          { value: 'orb', label: s.lab.scanner.mode.orb },
          { value: 'daily', label: s.lab.scanner.mode.daily },
        ]}
      />
      {!symbols.length ? (
        <Card>
          <Txt color="textSecondary">{s.lab.scanner.emptyMine}</Txt>
        </Card>
      ) : progress ? (
        <Card>
          <Row>
            <ActivityIndicator color={colors.accent} />
            <Txt variant="subhead">{fill(s.lab.scanner.scanning, progress)}</Txt>
          </Row>
        </Card>
      ) : (
        <Button label={s.lab.scanner.run} onPress={run} />
      )}
      {error ? (
        <Txt color="danger" variant="subhead">
          {s.lab.scanner.error}
        </Txt>
      ) : null}
      {hits ? (
        hits.length ? (
          <>
            <Txt variant="footnote" color="textSecondary">
              {fill(s.lab.scanner.found, { n: hits.length })}
            </Txt>
            <Card style={{ gap: 0, paddingVertical: 4 }}>
              {hits.map((h, i) => (
                <Appear key={h.symbol} index={Math.min(i, 8)}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/lab/setup/[symbol]', params: { symbol: h.symbol } })}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, borderTopWidth: i ? 0.5 : 0, borderColor: colors.separator, paddingVertical: 8 }}>
                    <SymbolBadge symbol={h.symbol} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Row style={{ gap: 6 }}>
                        <MarketFlag zone={zoneOf(h.symbol)} width={18} />
                        <Txt variant="headline">{h.symbol}</Txt>
                      </Row>
                      <Txt variant="footnote" color="textSecondary">
                        {h.setups.map((k) => s.lab.scanner.setups[k]).join(' · ')}
                        {h.orb ? ` · ${fill(s.lab.scanner.at, { time: f.time(zoneOf(h.symbol), h.orb.at) })}` : ''}
                        {h.rsi != null ? ` · ${fill(s.lab.scanner.rsi, { v: h.rsi })}` : ''}
                      </Txt>
                    </View>
                    <Txt variant="subhead">{f.money(h.price, h.currency)}</Txt>
                    <Icon sf="chevron.forward" md="chevron_right" size={18} color={colors.textSecondary} />
                  </Pressable>
                </Appear>
              ))}
            </Card>
          </>
        ) : (
          <Card>
            <Txt color="textSecondary">{mode === 'orb' ? s.lab.scanner.noneOrb : s.lab.scanner.none}</Txt>
          </Card>
        )
      ) : null}
      <View style={{ height: Metrics.gap }} />
      <LabFine />
    </Screen>
  );
}
