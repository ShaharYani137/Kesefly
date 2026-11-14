/**
 * Small charts: Sparkline (trend in a row or tile) and Donut (portfolio allocation).
 *
 * Follows the dataviz skill: thin 2px lines, 2px surface gaps between donut segments,
 * categorical hues in fixed order (never cycled), identity never by color alone (the donut
 * always has a legend with symbol and percent). Allocation palette = the dataviz reference
 * categorical palette, dark steps, validated on the hero surface #0B3B35
 * (validate_palette.js: all checks pass, 6 slots). Slots beyond 6 fold into "Other".
 */
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { getHistory, type HistoryPoint, type RangeKey } from '@/engine/stocks';
import { useApp } from '@/state/app-store';
import { Txt } from '@/ui/components';
import { useTokens } from '@/ui/theme';

export const ALLOCATION_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9'];

/** Sparkline from history, loaded lazily. Green when up over the range, red when down. */
export function Sparkline({ symbol, range = '1M', width = 72, height = 28 }: { symbol: string; range?: RangeKey; width?: number; height?: number }) {
  const { colors } = useTokens();
  const [pts, setPts] = useState<HistoryPoint[] | null>(null);
  useEffect(() => {
    let alive = true;
    getHistory(symbol, range)
      .then((p) => alive && setPts(p))
      .catch(() => alive && setPts([]));
    return () => {
      alive = false;
    };
  }, [symbol, range]);
  const d = useMemo(() => {
    if (!pts || pts.length < 2) return null;
    const c = pts.map((p) => p.close);
    const min = Math.min(...c);
    const span = Math.max(...c) - min || 1;
    const path = c.map((v, i) => `${i ? 'L' : 'M'}${((i / (c.length - 1)) * width).toFixed(1)},${(2 + (1 - (v - min) / span) * (height - 4)).toFixed(1)}`).join(' ');
    return { path, up: c[c.length - 1] >= c[0] };
  }, [pts, width, height]);
  return (
    <View style={{ width, height, direction: 'ltr' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {d ? (
        <Svg width={width} height={height}>
          <Path d={d.path} stroke={d.up ? colors.positive : colors.danger} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      ) : null}
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type Slice = { label: string; value: number };

/** Donut with a legend. Segments grow in on first show. Values must be in one currency. */
export function Donut({ slices, size = 128, textColor, mutedColor, surface }: { slices: Slice[]; size?: number; textColor: string; mutedColor: string; surface: string }) {
  const { isRTL } = useApp();
  const grow = useSharedValue(0);
  useEffect(() => {
    grow.set(withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
  }, [grow]);

  const data = useMemo(() => {
    const sorted = [...slices].filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5).reduce((a, s) => a + s.value, 0);
    const list = rest > 0 ? [...top, { label: isRTL ? 'אחר' : 'Other', value: rest }] : sorted.slice(0, 6);
    const total = list.reduce((a, s) => a + s.value, 0) || 1;
    // Start of each segment = sum of the shares before it.
    return list.map((s, i) => ({
      ...s,
      share: s.value / total,
      start: list.slice(0, i).reduce((a, x) => a + x.value / total, 0),
      color: ALLOCATION_COLORS[i],
    }));
  }, [slices, isRTL]);

  const stroke = 16;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const gap = data.length > 1 ? 2 : 0; // 2px surface gap between segments

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <View style={{ direction: 'ltr' }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={surface} strokeWidth={stroke} fill="none" />
          {data.map((s) => {
            const len = Math.max(0, s.share * circ - gap);
            return <Segment key={s.label} cx={size / 2} r={r} stroke={stroke} color={s.color} len={len} circ={circ} start={s.start * circ} grow={grow} />;
          })}
        </Svg>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        {data.map((s) => (
          <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color }} />
            <Txt variant="footnote" style={{ flex: 1, color: textColor, writingDirection: 'ltr' }} numberOfLines={1}>
              {s.label}
            </Txt>
            <Txt variant="footnote" style={{ color: mutedColor, writingDirection: 'ltr' }}>
              {`${Math.round(s.share * 100)}%`}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

function Segment({
  cx,
  r,
  stroke,
  color,
  len,
  circ,
  start,
  grow,
}: {
  cx: number;
  r: number;
  stroke: number;
  color: string;
  len: number;
  circ: number;
  start: number;
  grow: ReturnType<typeof useSharedValue<number>>;
}) {
  const props = useAnimatedProps(() => ({ strokeDasharray: [len * grow.value, circ] as unknown as string }));
  return <AnimatedCircle cx={cx} cy={cx} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDashoffset={-start} animatedProps={props} />;
}
