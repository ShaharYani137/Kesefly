import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { formatMoney, formatPercent } from '@/engine/format';
import { checkup } from '@/engine/health';
import { forecast } from '@/engine/projection';
import { recommendations } from '@/engine/recommendations';
import { fill, useApp } from '@/state/app-store';
import {
  Appear,
  Button,
  Card,
  Chip,
  Disclaimer,
  HelperAvatar,
  Icon,
  IconButton,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  Txt,
} from '@/ui/components';
import { IdeaCard, useIdeaText } from '@/ui/idea-card';
import { enterPop } from '@/ui/motion';
import { Metrics, useTokens } from '@/ui/theme';

function greeting(s: ReturnType<typeof useApp>['s']): string {
  const h = new Date().getHours();
  return h < 12 ? s.home.morning : h < 18 ? s.home.afternoon : s.home.evening;
}

export default function HomeScreen() {
  const { s, profile: p, lang } = useApp();
  const { colors } = useTokens();
  const money = (v: number) => formatMoney(v, p.currency, lang);
  const f = useMemo(() => forecast(p), [p]);
  const ideas = useMemo(() => recommendations(p), [p]);
  const checks = useMemo(() => checkup(p), [p]);
  const done = checks.filter((c) => c.ok).length;
  const top = useIdeaText(ideas[0]);

  const free = p.monthlyIncome - p.monthlyExpenses;
  const rate = p.monthlyIncome > 0 ? free / p.monthlyIncome : 0;
  const progress = p.goalAmount > 0 ? p.investments / p.goalAmount : 0;

  return (
    <Screen
      title={greeting(s)}
      subtitle={s.home.subtitle}
      trailing={<IconButton sf="gearshape" md="settings" label={s.home.settings} onPress={() => router.push('/settings')} />}>
      {/* Helper card: the single most important next step, said by the assistant. */}
      <Appear index={0}>
        <Card tone="accent">
          <Row style={{ alignItems: 'flex-start' }}>
            <HelperAvatar />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="footnote" color="onAccentSoft">
                {s.home.helperSays}
              </Txt>
              <Txt variant="headline" color="onAccentSoft">
                {top.title}
              </Txt>
              <Txt variant="subhead" color="onAccentSoft">
                {top.body}
              </Txt>
            </View>
          </Row>
          <View style={{ alignSelf: 'flex-start' }}>
            <Button
              kind="filled"
              label={s.home.askAbout}
              onPress={() =>
                router.navigate({
                  pathname: '/helper',
                  params: { q: top.title },
                })
              }
            />
          </View>
        </Card>
      </Appear>

      <Appear index={1}>
        <Row style={{ alignItems: 'stretch' }}>
          <Card style={{ flex: 1 }}>
            <Txt variant="footnote" color="textSecondary">
              {s.home.freeCash}
            </Txt>
            <Txt variant="title3" color={free < 0 ? 'danger' : 'text'}>
              {money(free)}
            </Txt>
          </Card>
          <Card style={{ flex: 1 }}>
            <Txt variant="footnote" color="textSecondary">
              {s.home.savingsRate}
            </Txt>
            <Txt variant="title3">{formatPercent(rate, lang)}</Txt>
          </Card>
        </Row>
      </Appear>

      <Appear index={2}>
        <Card>
          <Txt variant="footnote" color="textSecondary">
            {s.home.netWorth}
          </Txt>
          <Txt variant="title">{money(p.cashSavings + p.investments)}</Txt>
        </Card>
      </Appear>

      {p.goalAmount > 0 ? (
        <Appear index={3}>
          <Pressable accessibilityRole="button" onPress={() => router.navigate('/plan')}>
            <Card>
              <Txt variant="footnote" color="textSecondary">
                {s.home.goalProgress}
              </Txt>
              <Txt variant="headline">{p.goalName || s.fields.goalName}</Txt>
              <Txt variant="subhead" color="textSecondary">
                {money(p.investments)} / {money(p.goalAmount)}
              </Txt>
              <ProgressBar value={progress} />
              <Txt variant="subhead" color={f.goalChance >= 0.5 ? 'positive' : 'warning'}>
                {fill(s.home.chance, { p: formatPercent(f.goalChance, lang) })}
              </Txt>
            </Card>
          </Pressable>
        </Appear>
      ) : null}

      <SectionHeader>{s.home.checkupTitle}</SectionHeader>
      <Appear index={4}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="headline" style={{ flex: 1 }}>
              {fill(s.home.checkupScore, { n: done, total: checks.length })}
            </Txt>
          </Row>
          <ProgressBar value={done / checks.length} />
          <View style={{ gap: 4, marginTop: 4 }}>
            {checks.map((c, i) => (
              <Row key={c.key} style={{ minHeight: Metrics.minTarget - 8 }}>
                <Animated.View entering={enterPop(i)}>
                  <Icon
                    sf={c.ok ? 'checkmark.circle.fill' : 'circle'}
                    md={c.ok ? 'check_circle' : 'radio_button_unchecked'}
                    size={22}
                    color={c.ok ? colors.positive : colors.textSecondary}
                  />
                </Animated.View>
                <Txt variant="body" color={c.ok ? 'text' : 'textSecondary'} style={{ flex: 1 }}>
                  {s.home.checks[c.key]}
                </Txt>
              </Row>
            ))}
          </View>
        </Card>
      </Appear>

      <SectionHeader>{s.home.quick}</SectionHeader>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label={s.home.quickHelper} sf="sparkles" md="psychology" onPress={() => router.navigate('/helper')} />
        <Chip label={s.home.quickStocks} sf="chart.bar.xaxis" md="candlestick_chart" onPress={() => router.navigate('/stocks')} />
        <Chip label={s.home.quickPlan} sf="chart.line.uptrend.xyaxis" md="trending_up" onPress={() => router.navigate('/plan')} />
      </View>

      <SectionHeader>{s.home.topIdeas}</SectionHeader>
      {ideas.slice(1, 3).map((i, n) => (
        <Appear key={i.key} index={5 + n}>
          <IdeaCard idea={i} />
        </Appear>
      ))}
      <View>
        <Button kind="plain" label={s.home.seeAll} onPress={() => router.push('/ideas')} />
      </View>
      <Disclaimer />
    </Screen>
  );
}
