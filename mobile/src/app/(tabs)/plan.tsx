import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { formatMoney, formatPercent } from '@/engine/format';
import { forecast, RISK_ASSUMPTIONS } from '@/engine/projection';
import type { Risk } from '@/engine/types';
import { fill, useApp } from '@/state/app-store';
import { Appear, Button, Card, Disclaimer, Row, Screen, SectionHeader, Segmented, Stepper, Txt } from '@/ui/components';
import { ForecastChart } from '@/ui/forecast-chart';

/** Monthly-investing step for the what-if stepper, per currency. */
const INVEST_STEP = { USD: 50, ILS: 200 } as const;

export default function PlanScreen() {
  const { s, profile: p, lang, updateProfile } = useApp();
  const money = (v: number) => formatMoney(v, p.currency, lang);
  const f = useMemo(() => forecast(p), [p]);
  const a = RISK_ASSUMPTIONS[p.risk];
  const step = INVEST_STEP[p.currency];

  return (
    <Screen
      title={s.plan.title}
      subtitle={fill(s.plan.subtitle, {
        goal: p.goalName || money(p.goalAmount),
        years: p.goalYears,
      })}>
      <Button kind="tonal" label={p.goalAmount > 0 ? s.goal.edit : s.goal.set} onPress={() => router.push('/goal')} />

      <Appear index={0}>
        <Card>
          <ForecastChart points={f.points} goal={p.goalAmount} />
          <Txt variant="footnote" color="textSecondary">
            {s.plan.rangeNote}
          </Txt>
        </Card>
      </Appear>

      <Appear index={1}>
        <Row style={{ alignItems: 'stretch' }}>
          {[
            { label: s.plan.badCase, v: f.final.low },
            { label: s.plan.likely, v: f.final.mid },
            { label: s.plan.goodCase, v: f.final.high },
          ].map((c) => (
            <Card key={c.label} style={{ flex: 1 }}>
              <Txt variant="caption" color="textSecondary">
                {c.label}
              </Txt>
              <Txt variant="headline" adjustsFontSizeToFit numberOfLines={1}>
                {formatMoney(c.v, p.currency, lang, true)}
              </Txt>
            </Card>
          ))}
        </Row>
      </Appear>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="subhead" color="textSecondary" style={{ flex: 1 }}>
            {s.plan.deposited}
          </Txt>
          <Txt variant="headline">{money(f.totalDeposited)}</Txt>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="subhead" color="textSecondary" style={{ flex: 1 }}>
            {s.plan.needed}
          </Txt>
          <Txt variant="headline">{money(f.monthlyNeeded)}</Txt>
        </Row>
        <Txt variant="subhead" color={f.goalChance >= 0.5 ? 'positive' : 'warning'}>
          {fill(s.home.chance, { p: formatPercent(f.goalChance, lang) })}
        </Txt>
      </Card>

      <SectionHeader>{s.plan.adjust}</SectionHeader>
      <Card style={{ gap: 16 }}>
        <Stepper
          label={s.fields.monthlyInvest}
          display={`${money(p.monthlyInvest)}${s.common.perMonth}`}
          onMinus={() =>
            updateProfile({
              monthlyInvest: Math.max(0, p.monthlyInvest - step),
            })
          }
          onPlus={() => updateProfile({ monthlyInvest: p.monthlyInvest + step })}
        />
        <Stepper
          label={s.fields.goalYears}
          display={fill(s.common.years, { n: p.goalYears })}
          onMinus={() => updateProfile({ goalYears: Math.max(1, p.goalYears - 1) })}
          onPlus={() => updateProfile({ goalYears: Math.min(50, p.goalYears + 1) })}
        />
        <View style={{ gap: 8 }}>
          <Segmented<Risk>
            value={p.risk}
            onChange={(risk) => updateProfile({ risk })}
            options={(['conservative', 'balanced', 'growth'] as const).map((r) => ({ value: r, label: s.risk[r] }))}
          />
        </View>
      </Card>

      <Card>
        <Txt variant="headline">{s.plan.assumptions}</Txt>
        <Txt variant="subhead" color="textSecondary">
          {fill(s.plan.assumptionsBody, {
            mean: formatPercent(a.mean, lang),
            vol: formatPercent(a.vol, lang),
          })}
        </Txt>
      </Card>
      <Disclaimer />
    </Screen>
  );
}
