/**
 * Range chart: one column per year. Bar spans bad case to good case, marker shows the
 * likely case, dashed line shows the goal. Built from Views (no chart dependency).
 * Design decision: chart time axis stays left-to-right in Hebrew too, like numbers.
 */
import { Text, View } from 'react-native';

import type { ForecastPoint } from '@/engine/projection';
import { formatMoney } from '@/engine/format';
import { fill, useApp } from '@/state/app-store';
import { useTokens } from '@/ui/theme';

const HEIGHT = 180;

export function ForecastChart({ points, goal }: { points: ForecastPoint[]; goal: number }) {
  const { colors } = useTokens();
  const { profile, lang, s } = useApp();
  const max = Math.max(goal, ...points.map((p) => p.high)) * 1.08 || 1;
  const y = (v: number) => (v / max) * HEIGHT;
  const money = (v: number) => formatMoney(v, profile.currency, lang, true);

  const summary = points
    .map((p) => `${fill(s.common.year, { n: p.year })}: ${money(p.low)} – ${money(p.high)}`)
    .join('. ');

  return (
    <View accessible accessibilityLabel={summary} style={{ direction: 'ltr' }}>
      <View style={{ height: HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        {goal > 0 ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: y(goal),
              borderTopWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: colors.warning,
            }}>
            <Text style={{ position: 'absolute', right: 0, top: -18, fontSize: 11, fontWeight: '600', color: colors.warning }}>
              {s.plan.goalLine} {money(goal)}
            </Text>
          </View>
        ) : null}
        {points.map((p) => (
          <View key={p.year} style={{ flex: 1, height: HEIGHT }}>
            <View
              style={{
                position: 'absolute',
                left: '15%',
                right: '15%',
                bottom: y(p.low),
                height: Math.max(4, y(p.high) - y(p.low)),
                borderRadius: 6,
                backgroundColor: colors.range,
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: '5%',
                right: '5%',
                bottom: y(p.mid) - 1.5,
                height: 3,
                borderRadius: 2,
                backgroundColor: colors.positive,
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        {points.map((p) => (
          <Text key={p.year} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: colors.textSecondary }}>
            {p.year}
          </Text>
        ))}
      </View>
    </View>
  );
}
