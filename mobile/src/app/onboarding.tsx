import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMoney } from '@/engine/format';
import { type Country, type Currency, type Lang, type Profile, type Risk } from '@/engine/types';
import { fill, useApp } from '@/state/app-store';
import { Button, Card, Disclaimer, NumberField, Row, Segmented, TextField, Txt } from '@/ui/components';
import { Metrics, useTokens } from '@/ui/theme';

const STEPS = 6;
const SYMBOL: Record<Currency, string> = { USD: '$', ILS: '₪' };

export default function Onboarding() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editing = edit === '1';
  const { s, lang, setLang, profile, saveProfile, isRTL } = useApp();
  const { colors } = useTokens();
  const [step, setStep] = useState(editing ? 1 : 0);
  const [d, setD] = useState<Profile>(profile);
  const set = (patch: Partial<Profile>) => setD((prev) => ({ ...prev, ...patch }));
  const sym = SYMBOL[d.currency];
  const free = d.monthlyIncome - d.monthlyExpenses;

  const finish = () => {
    saveProfile({ ...d, goalYears: Math.max(1, Math.round(d.goalYears || 1)) });
    if (editing) router.back();
    else router.replace('/');
  };

  const back = () => {
    if (step <= (editing ? 1 : 0)) router.back();
    else setStep(step - 1);
  };

  const canNext = step === 2 ? d.monthlyIncome > 0 : step === 4 ? d.goalAmount > 0 && d.goalYears > 0 : true;

  let body: React.ReactNode;
  switch (step) {
    case 0:
      body = (
        <View style={{ gap: 24, paddingTop: 48 }}>
          <Segmented<Lang>
            value={lang}
            onChange={setLang}
            options={[
              { value: 'en', label: 'English' },
              { value: 'he', label: 'עברית' },
            ]}
          />
          <Txt variant="largeTitle">{s.onboarding.welcomeTitle}</Txt>
          <Txt variant="body" color="textSecondary">
            {s.onboarding.welcomeBody}
          </Txt>
          <Disclaimer />
        </View>
      );
      break;
    case 1:
      body = (
        <>
          <Txt variant="title">{s.onboarding.whereTitle}</Txt>
          <Txt variant="subhead" color="textSecondary">
            {s.onboarding.country}
          </Txt>
          <Segmented<Country>
            value={d.country}
            onChange={(country) => set({ country, currency: country === 'IL' ? 'ILS' : 'USD' })}
            options={[
              { value: 'US', label: s.country.US },
              { value: 'IL', label: s.country.IL },
            ]}
          />
          <Txt variant="subhead" color="textSecondary">
            {s.onboarding.currency}
          </Txt>
          <Segmented<Currency>
            value={d.currency}
            onChange={(currency) => set({ currency })}
            options={[
              { value: 'USD', label: 'USD $' },
              { value: 'ILS', label: 'ILS ₪' },
            ]}
          />
        </>
      );
      break;
    case 2:
      body = (
        <>
          <Txt variant="title">{s.onboarding.incomeTitle}</Txt>
          <Txt variant="subhead" color="textSecondary">
            {s.onboarding.incomeHint}
          </Txt>
          <NumberField
            label={s.fields.monthlyIncome}
            prefix={sym}
            value={d.monthlyIncome}
            onChange={(monthlyIncome) => set({ monthlyIncome })}
          />
          <NumberField
            label={s.fields.monthlyExpenses}
            prefix={sym}
            value={d.monthlyExpenses}
            onChange={(monthlyExpenses) => set({ monthlyExpenses })}
          />
          <NumberField
            label={s.fields.monthlyInvest}
            prefix={sym}
            value={d.monthlyInvest}
            onChange={(monthlyInvest) => set({ monthlyInvest })}
            hint={fill(s.fields.monthlyInvestHint, {
              free: formatMoney(free, d.currency, lang),
            })}
          />
        </>
      );
      break;
    case 3:
      body = (
        <>
          <Txt variant="title">{s.onboarding.savingsTitle}</Txt>
          <NumberField
            label={s.fields.cashSavings}
            prefix={sym}
            value={d.cashSavings}
            onChange={(cashSavings) => set({ cashSavings })}
          />
          <NumberField
            label={s.fields.investments}
            prefix={sym}
            value={d.investments}
            onChange={(investments) => set({ investments })}
          />
          <NumberField
            label={s.fields.highInterestDebt}
            prefix={sym}
            value={d.highInterestDebt}
            onChange={(highInterestDebt) => set({ highInterestDebt })}
            hint={s.fields.highInterestDebtHint}
          />
        </>
      );
      break;
    case 4:
      body = (
        <>
          <Txt variant="title">{s.onboarding.goalTitle}</Txt>
          <TextField
            label={s.fields.goalName}
            value={d.goalName}
            onChange={(goalName) => set({ goalName })}
            placeholder={s.fields.goalNamePlaceholder}
          />
          <NumberField
            label={s.fields.goalAmount}
            prefix={sym}
            value={d.goalAmount}
            onChange={(goalAmount) => set({ goalAmount })}
          />
          <NumberField
            label={s.fields.goalYears}
            value={d.goalYears}
            onChange={(goalYears) => set({ goalYears: Math.min(50, goalYears) })}
          />
        </>
      );
      break;
    default:
      body = (
        <>
          <Txt variant="title">{s.onboarding.riskTitle}</Txt>
          <Txt variant="subhead" color="textSecondary">
            {s.onboarding.riskHint}
          </Txt>
          {(['conservative', 'balanced', 'growth'] as Risk[]).map((r) => {
            const selected = d.risk === r;
            return (
              <Pressable key={r} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => set({ risk: r })}>
                <Card
                  tone={selected ? 'accent' : 'default'}
                  style={{
                    borderWidth: 2,
                    borderColor: selected ? colors.accent : 'transparent',
                    minHeight: Metrics.minTarget,
                  }}>
                  <Txt variant="headline">{s.risk[r]}</Txt>
                  <Txt variant="subhead" color="textSecondary">
                    {s.risk[`${r}Body` as const]}
                  </Txt>
                </Card>
              </Pressable>
            );
          })}
        </>
      );
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
        direction: isRTL ? 'rtl' : 'ltr',
      }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step > 0 ? (
          <View style={{ paddingHorizontal: Metrics.margin, paddingTop: 8 }}>
            <Txt variant="footnote" color="textSecondary">
              {fill(s.onboarding.step, { n: step, total: STEPS - 1 })}
            </Txt>
          </View>
        ) : null}
        <ScrollView contentContainerStyle={{ padding: Metrics.margin, gap: 16 }} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
        <Row style={{ padding: Metrics.margin }}>
          {step > (editing ? 1 : 0) || editing ? (
            <View style={{ flex: 1 }}>
              <Button kind="tonal" label={s.common.back} onPress={back} />
            </View>
          ) : null}
          <View style={{ flex: 2 }}>
            <Button
              label={
                step === 0
                  ? s.onboarding.start
                  : step === STEPS - 1
                    ? editing
                      ? s.common.save
                      : s.onboarding.finish
                    : s.common.next
              }
              disabled={!canNext}
              onPress={() => (step === STEPS - 1 ? finish() : setStep(step + 1))}
            />
          </View>
        </Row>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
