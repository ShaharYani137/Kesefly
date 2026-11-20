/**
 * Lab exit plan: pick the stop rule and the target (1R, 1.5R, 2R) before the entry. Shows the
 * stop, target, risk a share, reward to risk and flat-by time, or the reason a plan is refused.
 * Then the Time Machine or the practice ticket.
 */
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { getCandles } from '@/lab/candles';
import { buildPlan, type Plan, PlanError, type StopRule } from '@/lab/exit';
import { sessionBars } from '@/lab/bars';
import { sessionFor, zoneOf } from '@/lab/sessions';
import { useApp } from '@/state/app-store';
import { useLab } from '@/state/lab-store';
import { Appear, Button, Card, Screen, SectionHeader, Segmented, Txt } from '@/ui/components';
import { GateGuard, LabFine, PracticeChip, useLabFormat } from '@/ui/lab-ui';
import { LineItem } from '@/ui/money-ui';
import type { SlotBar } from '@/lab/bars';

type TargetKey = '1' | '1.5' | '2';
type PickRule = Exclude<StopRule, 'price'>;

export default function PlanPage() {
  return (
    <GateGuard>
      <PlanScreen />
    </GateGuard>
  );
}

function PlanScreen() {
  const { s } = useApp();
  const lab = useLab();
  const f = useLabFormat();
  const d = lab.draft;
  const zone = d ? zoneOf(d.symbol) : 'NY';
  const [rule, setRule] = useState<PickRule>(d?.orHigh != null ? 'or_mid' : 'pct');
  const [tkey, setTkey] = useState<TargetKey>('2');
  const [bars, setBars] = useState<SlotBar[]>([]);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!d || rule !== 'atr') return;
    getCandles(d.symbol, '5m', '1d')
      .then((c) => setBars(sessionBars(c, now)?.closed ?? []))
      .catch(() => setBars([]));
  }, [d, rule, now]);

  const result = useMemo((): { plan: Plan } | { error: string } | null => {
    if (!d) return null;
    try {
      const session = sessionFor(zone, d.entryTime ?? now);
      const plan = buildPlan({
        symbol: d.symbol,
        entry: d.entry,
        setup: d.setup,
        stopRule: rule,
        target: { kind: 'r', r: Number(tkey) },
        orHigh: d.orHigh,
        orLow: d.orLow,
        bars,
        entryTime: d.entryTime,
        entryBar: d.entryBar,
        session,
      });
      return { plan };
    } catch (e) {
      return { error: e instanceof PlanError ? s.lab.plan.errors[e.code] : String(e) };
    }
  }, [d, zone, rule, tkey, bars, s, now]);

  const plan = result && 'plan' in result ? result.plan : null;
  const go = (path: '/lab/timemachine' | '/lab/ticket') => {
    if (!plan) return;
    lab.setDraftPlan(plan);
    router.push(path);
  };

  if (!d) return <Screen title={s.lab.plan.title} onBack={() => router.back()}>{null}</Screen>;
  const cur = zone === 'TLV' ? 'ILS' : 'USD';
  const rules: PickRule[] = d.orHigh != null ? ['or_mid', 'or_low', 'pct', 'atr'] : ['pct', 'atr'];

  return (
    <Screen title={`${s.lab.plan.title} · ${d.symbol}`} subtitle={s.lab.plan.subtitle} onBack={() => router.back()} trailing={<PracticeChip />}>
      <Card>
        <LineItem label={s.lab.plan.entry} value={`${f.money(d.entry, cur)}${d.entryTime ? ` · ${f.time(zone, d.entryTime)}` : ''}`} strong />
      </Card>
      <SectionHeader>{s.lab.plan.stopRule}</SectionHeader>
      <Segmented value={rule} onChange={setRule} options={rules.map((r) => ({ value: r, label: s.lab.plan.stopRules[r] }))} />
      <SectionHeader>{s.lab.plan.target}</SectionHeader>
      <Segmented value={tkey} onChange={setTkey} options={(['1', '1.5', '2'] as TargetKey[]).map((k) => ({ value: k, label: `${k}R` }))} />
      <Appear>
        {plan ? (
          <Card>
            <LineItem label={s.lab.plan.stop} value={f.money(plan.stop, cur)} color="danger" strong />
            <LineItem label={s.lab.plan.target} value={f.money(plan.target, cur)} color="positive" strong />
            <LineItem label={s.lab.plan.risk} value={f.money(plan.riskPerShare, cur)} />
            <LineItem label={s.lab.plan.rr} value={plan.rewardRisk.toFixed(2)} />
            <LineItem label={s.lab.plan.flatBy} value={f.time(zone, plan.flatByMs)} />
            <Txt variant="footnote" color="textSecondary">
              {s.lab.plan.note}
            </Txt>
          </Card>
        ) : (
          <Card>
            <Txt color="danger">{result && 'error' in result ? result.error : ''}</Txt>
          </Card>
        )}
      </Appear>
      <Button label={s.lab.plan.timeMachine} kind="tonal" onPress={() => go('/lab/timemachine')} disabled={!plan || plan.entryBar == null} />
      <Button label={s.lab.plan.ticket} onPress={() => go('/lab/ticket')} disabled={!plan} />
      <LabFine />
    </Screen>
  );
}
