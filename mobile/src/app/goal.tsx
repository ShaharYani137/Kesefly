/**
 * Goal editor: name (or a quick pick), target amount, years, and planned monthly investing.
 * The chance to reach the goal and the monthly amount needed update live from the draft,
 * using the same forecast as the Plan tab. Save writes the profile; Remove clears the goal.
 */
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { formatMoney, formatPercent } from '@/engine/format';
import { forecast } from '@/engine/projection';
import { fill, useApp } from '@/state/app-store';
import { Button, Card, Chip, NumberField, ProgressBar, Screen, SectionHeader, Stepper, TextField, Txt } from '@/ui/components';

export default function GoalScreen() {
  const { s, lang, profile, updateProfile } = useApp();
  const [name, setName] = useState(profile.goalName);
  const [amount, setAmount] = useState(profile.goalAmount);
  const [years, setYears] = useState(profile.goalYears || 10);
  const [monthly, setMonthly] = useState(profile.monthlyInvest);
  const money = (v: number) => formatMoney(v, profile.currency, lang);

  const draft = useMemo(() => ({ ...profile, goalName: name, goalAmount: amount, goalYears: years, monthlyInvest: monthly }), [profile, name, amount, years, monthly]);
  const f = useMemo(() => forecast(draft), [draft]);

  const save = () => {
    updateProfile({ goalName: name.trim(), goalAmount: amount, goalYears: years, monthlyInvest: monthly });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  const remove = () => {
    updateProfile({ goalName: '', goalAmount: 0 });
    router.back();
  };

  return (
    <Screen title={s.goal.title} subtitle={s.goal.subtitle} onBack={() => router.back()}>
      <SectionHeader>{s.goal.presets}</SectionHeader>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {s.goal.presetNames.map((p) => (
          <Chip key={p} label={(name === p ? '✓ ' : '') + p} onPress={() => setName(p)} />
        ))}
      </View>

      <Card style={{ gap: 16 }}>
        <TextField label={s.fields.goalName} value={name} onChange={setName} placeholder={s.fields.goalNamePlaceholder} />
        <NumberField label={s.fields.goalAmount} value={amount} onChange={setAmount} prefix={profile.currency === 'ILS' ? '₪' : '$'} />
        <Stepper
          label={s.fields.goalYears}
          display={fill(s.common.years, { n: years })}
          onMinus={() => setYears(Math.max(1, years - 1))}
          onPlus={() => setYears(Math.min(50, years + 1))}
        />
        <NumberField label={s.fields.monthlyInvest} value={monthly} onChange={setMonthly} prefix={profile.currency === 'ILS' ? '₪' : '$'} />
      </Card>

      {amount > 0 ? (
        <Card tone="accent">
          <Txt variant="headline" color="onAccentSoft">
            {fill(s.goal.preview, { p: formatPercent(f.goalChance, lang) })}
          </Txt>
          <ProgressBar value={f.goalChance} />
          <Txt variant="subhead" color="onAccentSoft">
            {fill(s.goal.needed, { v: money(f.monthlyNeeded) })}
          </Txt>
        </Card>
      ) : null}

      <Button label={s.goal.save} onPress={save} disabled={amount <= 0} />
      {profile.goalAmount > 0 ? <Button kind="destructive" label={s.goal.remove} onPress={remove} /> : null}
    </Screen>
  );
}
