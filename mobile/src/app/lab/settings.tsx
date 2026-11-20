/**
 * Lab settings: practice limits for New York (dollars) and Tel Aviv (shekels), trades a day,
 * minimum reward to risk, alert switches, and the credit to the day-trader-skill pack.
 */
import { router } from 'expo-router';
import { Switch } from 'react-native';

import type { MoneyLimits } from '@/lab/limits';
import { useApp } from '@/state/app-store';
import { useLab } from '@/state/lab-store';
import { Button, Card, NumberField, Row, Screen, SectionHeader, Stepper, Txt } from '@/ui/components';
import { GateGuard, LabFine, MarketFlag } from '@/ui/lab-ui';
import { useTokens } from '@/ui/theme';

export default function LabSettingsPage() {
  return (
    <GateGuard>
      <LabSettings />
    </GateGuard>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTokens();
  return (
    <Row>
      <Txt variant="body" style={{ flex: 1 }}>
        {label}
      </Txt>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.fill }} thumbColor="#FFFFFF" />
    </Row>
  );
}

function LabSettings() {
  const { s } = useApp();
  const lab = useLab();
  const t = s.lab.settings;
  const L = lab.limits;
  const setMoney = (cur: 'USD' | 'ILS', patch: Partial<MoneyLimits>) => lab.setLimits({ ...L, [cur]: { ...L[cur], ...patch } });
  const money = (cur: 'USD' | 'ILS') => (
    <Card>
      <MarketFlag zone={cur === 'ILS' ? 'TLV' : 'NY'} width={27} />
      <NumberField label={t.budget} value={L[cur].budget} onChange={(n) => setMoney(cur, { budget: Math.max(0, n) })} prefix={cur === 'ILS' ? '₪' : '$'} />
      <NumberField label={t.maxLoss} value={L[cur].maxLossPerTrade} onChange={(n) => setMoney(cur, { maxLossPerTrade: Math.max(0, n) })} prefix={cur === 'ILS' ? '₪' : '$'} />
      <NumberField label={t.maxDaily} value={L[cur].maxDailyLoss} onChange={(n) => setMoney(cur, { maxDailyLoss: Math.max(0, n) })} prefix={cur === 'ILS' ? '₪' : '$'} />
      <NumberField label={t.maxOrder} value={L[cur].maxOrder} onChange={(n) => setMoney(cur, { maxOrder: Math.max(0, n) })} prefix={cur === 'ILS' ? '₪' : '$'} />
    </Card>
  );
  return (
    <Screen title={t.title} onBack={() => router.back()}>
      <SectionHeader>{t.limitsUSD}</SectionHeader>
      {money('USD')}
      <SectionHeader>{t.limitsILS}</SectionHeader>
      {money('ILS')}
      <Card>
        <Stepper label={t.trades} display={String(L.maxTradesPerDay)} onMinus={() => lab.setLimits({ ...L, maxTradesPerDay: Math.max(1, L.maxTradesPerDay - 1) })} onPlus={() => lab.setLimits({ ...L, maxTradesPerDay: Math.min(10, L.maxTradesPerDay + 1) })} />
        <Stepper label={t.minRR} display={L.minRewardRisk.toFixed(1)} onMinus={() => lab.setLimits({ ...L, minRewardRisk: Math.max(0.5, Math.round((L.minRewardRisk - 0.5) * 10) / 10) })} onPlus={() => lab.setLimits({ ...L, minRewardRisk: Math.min(5, Math.round((L.minRewardRisk + 0.5) * 10) / 10) })} />
        <Button kind="plain" label={t.defaults} onPress={lab.resetLimits} />
      </Card>
      <SectionHeader>{t.alerts}</SectionHeader>
      <Card>
        <Toggle label={t.timeAlerts} value={lab.timeAlerts} onChange={(v) => lab.setSwitches({ timeAlerts: v })} />
        <Toggle label={t.priceAlerts} value={lab.priceAlerts} onChange={(v) => lab.setSwitches({ priceAlerts: v })} />
        <Toggle label={t.bellNY} value={lab.bell.NY} onChange={(v) => lab.setSwitches({ bell: { ...lab.bell, NY: v } })} />
        <Toggle label={t.bellTLV} value={lab.bell.TLV} onChange={(v) => lab.setSwitches({ bell: { ...lab.bell, TLV: v } })} />
      </Card>
      <Txt variant="footnote" color="textSecondary">
        {t.credit}
      </Txt>
      <LabFine />
    </Screen>
  );
}
