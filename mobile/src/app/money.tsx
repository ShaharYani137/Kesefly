/**
 * Savings and investments editor: cash savings, current investments and planned monthly
 * investing, without going through the whole onboarding again. The total and the goal chance
 * update live from the draft, using the same forecast as the Plan tab. Save writes the profile.
 */
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { formatMoney, formatPercent } from '@/engine/format';
import { forecast } from '@/engine/projection';
import { fill, useApp } from '@/state/app-store';
import { Button, Card, NumberField, ProgressBar, Screen, Txt } from '@/ui/components';

export default function MoneyScreen() {
  const { s, lang, profile, updateProfile } = useApp();
  const [cash, setCash] = useState(profile.cashSavings);
  const [invested, setInvested] = useState(profile.investments);
  const [monthly, setMonthly] = useState(profile.monthlyInvest);
  const money = (v: number) => formatMoney(v, profile.currency, lang);
  const prefix = profile.currency === 'ILS' ? '₪' : '$';
  const free = Math.max(0, profile.monthlyIncome - profile.monthlyExpenses);

  const draft = useMemo(
    () => ({ ...profile, cashSavings: cash, investments: invested, monthlyInvest: monthly }),
    [profile, cash, invested, monthly],
  );
  const f = useMemo(() => forecast(draft), [draft]);
  const changed = cash !== profile.cashSavings || invested !== profile.investments || monthly !== profile.monthlyInvest;

  const save = () => {
    updateProfile({ cashSavings: cash, investments: invested, monthlyInvest: monthly });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <Screen title={s.money.title} subtitle={s.money.subtitle} onBack={() => router.back()}>
      <Card style={{ gap: 16 }}>
        <NumberField label={s.fields.cashSavings} value={cash} onChange={setCash} prefix={prefix} hint={s.money.cashHint} />
        <NumberField label={s.fields.investments} value={invested} onChange={setInvested} prefix={prefix} hint={s.money.investHint} />
        <NumberField
          label={s.fields.monthlyInvest}
          value={monthly}
          onChange={setMonthly}
          prefix={prefix}
          hint={fill(s.fields.monthlyInvestHint, { free: money(free) })}
        />
      </Card>

      <Card tone="accent">
        <Txt variant="footnote" color="onAccentSoft">
          {s.money.total}
        </Txt>
        <Txt variant="title" color="onAccentSoft">
          {money(cash + invested)}
        </Txt>
        {profile.goalAmount > 0 ? (
          <>
            <ProgressBar value={f.goalChance} />
            <Txt variant="subhead" color="onAccentSoft">
              {fill(s.goal.preview, { p: formatPercent(f.goalChance, lang) })}
            </Txt>
          </>
        ) : null}
      </Card>

      <Button label={s.money.save} onPress={save} disabled={!changed} />
    </Screen>
  );
}
