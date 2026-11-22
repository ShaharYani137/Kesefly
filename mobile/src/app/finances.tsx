/**
 * Savings and investments editor: the money numbers first typed in onboarding (cash savings,
 * current investments, high-interest debt, monthly income, expenses and planned investing),
 * on one page. Opened from the Home "Savings + investments" card and the Plan tab.
 * Changes apply on Save; Cancel (or Back) leaves the profile as it was.
 */
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';

import { formatMoney } from '@/engine/format';
import { fill, useApp } from '@/state/app-store';
import { Button, Card, NumberField, Screen, SectionHeader, Txt } from '@/ui/components';

export default function FinancesScreen() {
  const { s, lang, profile, updateProfile } = useApp();
  const [d, setD] = useState({
    cashSavings: profile.cashSavings,
    investments: profile.investments,
    highInterestDebt: profile.highInterestDebt,
    monthlyIncome: profile.monthlyIncome,
    monthlyExpenses: profile.monthlyExpenses,
    monthlyInvest: profile.monthlyInvest,
  });
  const set = (p: Partial<typeof d>) => setD((x) => ({ ...x, ...p }));
  const sym = profile.currency === 'ILS' ? '₪' : '$';
  const money = (v: number) => formatMoney(v, profile.currency, lang);
  const free = d.monthlyIncome - d.monthlyExpenses;

  const save = () => {
    updateProfile(d);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <Screen title={s.finances.title} subtitle={s.finances.subtitle} onBack={() => router.back()}>
      <Card tone="accent">
        <Txt variant="footnote" color="onAccentSoft">
          {s.home.netWorth}
        </Txt>
        <Txt variant="title" color="onAccentSoft" style={{ writingDirection: 'ltr' }}>
          {money(d.cashSavings + d.investments)}
        </Txt>
      </Card>

      <SectionHeader>{s.finances.balances}</SectionHeader>
      <Card style={{ gap: 16 }}>
        <NumberField label={s.fields.cashSavings} prefix={sym} value={d.cashSavings} onChange={(cashSavings) => set({ cashSavings })} />
        <NumberField label={s.fields.investments} prefix={sym} value={d.investments} onChange={(investments) => set({ investments })} hint={s.finances.investmentsHint} />
        <NumberField
          label={s.fields.highInterestDebt}
          prefix={sym}
          value={d.highInterestDebt}
          onChange={(highInterestDebt) => set({ highInterestDebt })}
          hint={s.fields.highInterestDebtHint}
        />
      </Card>

      <SectionHeader>{s.finances.monthly}</SectionHeader>
      <Card style={{ gap: 16 }}>
        <NumberField label={s.fields.monthlyIncome} prefix={sym} value={d.monthlyIncome} onChange={(monthlyIncome) => set({ monthlyIncome })} />
        <NumberField label={s.fields.monthlyExpenses} prefix={sym} value={d.monthlyExpenses} onChange={(monthlyExpenses) => set({ monthlyExpenses })} />
        <NumberField
          label={s.fields.monthlyInvest}
          prefix={sym}
          value={d.monthlyInvest}
          onChange={(monthlyInvest) => set({ monthlyInvest })}
          hint={fill(s.fields.monthlyInvestHint, { free: money(free) })}
        />
      </Card>

      <Button label={s.common.save} onPress={save} />
      <Button kind="plain" label={s.settings.cancel} onPress={() => router.back()} />
    </Screen>
  );
}
