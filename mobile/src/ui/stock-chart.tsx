/**
 * Stock price chart: line + soft area fill, colored by the change over the selected range
 * (green up, red down). The line draws itself in when data arrives. Drag a finger across the
 * chart to read the price on a given day.
 *
 * Time runs left-to-right in Hebrew too (M3 layout.md: charts keep LTR; same decision as the
 * forecast chart). Built with react-native-svg.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';

import { formatPrice, formatSigned, getHistory, type HistoryPoint, RANGES, type RangeKey } from '@/engine/stocks';
import { useApp } from '@/state/app-store';
import { Segmented, Txt } from '@/ui/components';
import { useTokens } from '@/ui/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const DEFAULT_H = 150;
/** Upper bound on path length, used for the draw-in dash animation. */
const DASH = 3000;

/**
 * `load` replaces the Yahoo history fetch (the portfolio chart passes its own series).
 * `ranges` limits the range buttons. `tone` = 'hero' draws on the dark brand surface.
 */
export function StockChart({
  symbol,
  currency,
  load,
  ranges = Object.keys(RANGES) as RangeKey[],
  initial = '6M',
  height: H = DEFAULT_H,
  tone = 'default',
}: {
  symbol: string;
  currency: string;
  load?: (r: RangeKey) => Promise<HistoryPoint[]>;
  ranges?: RangeKey[];
  initial?: RangeKey;
  height?: number;
  tone?: 'default' | 'hero';
}) {
  const { lang } = useApp();
  const { colors } = useTokens();
  const [range, setRange] = useState<RangeKey>(initial);
  const [result, setResult] = useState<{ key: string; points?: HistoryPoint[]; failed?: boolean } | null>(null);
  const [width, setWidth] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const draw = useSharedValue(0);

  const key = `${symbol}|${range}`;
  useEffect(() => {
    let alive = true;
    (load ? load(range) : getHistory(symbol, range))
      .then((points) => alive && setResult({ key, points }))
      .catch(() => alive && setResult({ key, failed: true }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` identity may change every render; key covers it
  }, [symbol, range, key]);

  const points = result?.key === key ? result.points : undefined;
  const failed = result?.key === key && result.failed;

  useEffect(() => {
    if (!points) return;
    draw.set(0);
    draw.set(withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [points, draw]);

  const geo = useMemo(() => {
    if (!points || width === 0) return null;
    const closes = points.map((p) => p.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;
    const x = (i: number) => (i / (points.length - 1)) * width;
    const y = (v: number) => 6 + (1 - (v - min) / span) * (H - 12);
    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.close).toFixed(1)}`).join(' ');
    const area = `${line} L${width},${H} L0,${H} Z`;
    const up = closes[closes.length - 1] >= closes[0];
    return { line, area, up, x, y };
  }, [points, width, H]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: DASH * (1 - draw.value) }));

  const color = geo?.up === false ? (tone === 'hero' ? '#FF8A80' : colors.danger) : tone === 'hero' ? '#7EE2A8' : colors.positive;
  const ink = tone === 'hero' ? '#FFFFFF' : colors.text;
  const muted = tone === 'hero' ? 'rgba(255,255,255,0.7)' : colors.textSecondary;
  const first = points?.[0]?.close ?? 0;
  const shown = points && scrub !== null ? points[scrub] : points?.[points.length - 1];
  const change = shown && first ? (shown.close - first) / first : 0;

  const onTouch = (px: number) => {
    if (!points || width === 0) return;
    const i = Math.round((Math.max(0, Math.min(width, px)) / width) * (points.length - 1));
    setScrub(i);
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, direction: 'ltr' }}>
        {shown ? (
          <>
            <Txt variant="headline" style={{ writingDirection: 'ltr', color: ink }}>
              {formatPrice(shown.close, currency, lang)}
            </Txt>
            <Txt variant="footnote" style={{ color, writingDirection: 'ltr' }}>
              {formatSigned(change, currency, lang, true)}
            </Txt>
            <Txt variant="footnote" style={{ flex: 1, textAlign: 'right', color: muted }}>
              {range === '1D' || range === '1W'
                ? new Date(shown.t).toLocaleString(lang === 'he' ? 'he-IL' : 'en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
                : new Date(shown.t).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: range === '1M' || range === '6M' ? undefined : 'numeric',
                  })}
            </Txt>
          </>
        ) : null}
      </View>
      <View
        style={{ height: H, direction: 'ltr' }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => onTouch(e.nativeEvent.locationX)}
        onResponderMove={(e) => onTouch(e.nativeEvent.locationX)}
        onResponderRelease={() => setScrub(null)}
        onResponderTerminate={() => setScrub(null)}
        accessible
        accessibilityLabel={shown ? `${symbol} ${formatPrice(shown.close, currency, lang)}` : symbol}>
        {geo ? (
          <Svg width={width} height={H}>
            <Defs>
              <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.28} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={geo.area} fill="url(#fill)" />
            <AnimatedPath
              d={geo.line}
              stroke={color}
              strokeWidth={2.2}
              fill="none"
              strokeLinejoin="round"
              strokeDasharray={DASH}
              animatedProps={animatedProps}
            />
            {scrub !== null && points ? (
              <Line x1={geo.x(scrub)} x2={geo.x(scrub)} y1={0} y2={H} stroke={muted} strokeWidth={1} strokeDasharray="4 4" />
            ) : null}
            {scrub !== null && points ? (
              <Circle cx={geo.x(scrub)} cy={geo.y(points[scrub].close)} r={5} fill={color} stroke={tone === 'hero' ? '#0B3B35' : colors.card} strokeWidth={2} />
            ) : null}
          </Svg>
        ) : failed ? null : (
          <ActivityIndicator style={{ marginTop: H / 2 - 10 }} color={tone === 'hero' ? '#FFFFFF' : colors.accent} />
        )}
      </View>
      <Segmented<RangeKey>
        tone={tone}
        value={range}
        onChange={(r) => {
          setScrub(null);
          setRange(r);
        }}
        options={ranges.map((r) => ({ value: r, label: r }))}
      />
    </View>
  );
}
