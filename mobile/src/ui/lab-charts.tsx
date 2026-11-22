/**
 * Day-Trading Lab charts (react-native-svg):
 * - CandleChart: today's 5-minute candles with horizontal level lines (opening range, entry,
 *   stop, target).
 * - FanChart: Time Machine percentile bands (5-95 and 25-75) and the median, with stop and
 *   target lines.
 * - OddsBar: target first / neither / stop first as one stacked bar.
 * Time runs left to right in Hebrew too (same decision as the other charts: charts keep LTR).
 * Colors: positive / danger tokens for up and down, accent for the median; no new values.
 */
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { Candle } from '@/lab/candles';
import { useApp } from '@/state/app-store';
import { IconButton, Txt } from '@/ui/components';
import { Fonts, useTokens } from '@/ui/theme';

export type Level = { price: number; color: string; label: string; dashed?: boolean };

const PAD_R = 56; // room for level labels on the right edge

/** DESIGN DECISIONS: zoom range 1x-8x, at least 8 candles on screen, 1.5x per button tap. */
const ZOOM_MIN = 1;
const ZOOM_MAX = 8;
const MIN_VISIBLE = 8;
const ZOOM_STEP = 1.5;

/**
 * Resizable candles: pinch to zoom in and out, drag sideways to move through the day, or use the
 * + / - buttons (also for accessibility). Zoomed in, the newest candle stays in view until the
 * user drags back. A vertical drag still scrolls the page.
 */
export function CandleChart({ bars, levels = [], height = 200 }: { bars: Candle[]; levels?: Level[]; height?: number }) {
  const { colors } = useTokens();
  const { s } = useApp();
  const [w, setW] = useState(0);
  const [zoom, setZoom] = useState(1);
  /** Candles hidden on the right (0 = newest candle at the right edge). */
  const [back, setBack] = useState(0);
  const pinchStart = useRef(1);
  const dragRest = useRef(0);

  // DESIGN DECISION: room for a full session of 5-minute bars (78) so the chart fills as the day goes.
  const slots = Math.max(bars.length, 78);
  const visible = Math.max(MIN_VISIBLE, Math.round(slots / zoom));
  const maxBack = Math.max(0, bars.length - visible);
  const backC = Math.min(back, maxBack);
  const shown = useMemo(() => {
    const endIdx = bars.length - backC;
    return bars.slice(Math.max(0, endIdx - visible), endIdx);
  }, [bars, backC, visible]);

  const geo = useMemo(() => {
    if (!shown.length || w === 0) return null;
    const prices = [...shown.flatMap((b) => [b.h, b.l]), ...levels.map((l) => l.price)];
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = max - min || 1;
    const cw = (w - PAD_R) / visible;
    const y = (p: number) => 6 + (1 - (p - min) / span) * (height - 12);
    return { cw, y };
  }, [shown, levels, w, height, visible]);

  const setZoomClamped = (z: number) => setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)));
  const pinch = usePinchGesture({
    runOnJS: true,
    onActivate: () => {
      pinchStart.current = zoom;
    },
    onUpdate: (e) => setZoomClamped(pinchStart.current * e.scale),
  });
  const pan = usePanGesture({
    runOnJS: true,
    activeOffsetX: [-10, 10],
    failOffsetY: [-15, 15],
    onActivate: () => {
      dragRest.current = 0;
    },
    onUpdate: (e) => {
      if (!geo) return;
      // Dragging right shows older candles. Time runs left to right in both languages.
      dragRest.current += e.changeX / geo.cw;
      const step = Math.trunc(dragRest.current);
      if (step) {
        dragRest.current -= step;
        setBack((b) => Math.min(maxBack, Math.max(0, Math.min(b, maxBack) + step)));
      }
    },
  });
  const gesture = useSimultaneousGestures(pinch, pan);

  return (
    <View style={{ gap: 6 }}>
      <GestureDetector gesture={gesture}>
        <View style={{ direction: 'ltr', height }} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityHint={s.lab.setup.zoomHint}>
          {geo ? (
            <Svg width={w} height={height}>
              {levels.map((l) => (
                <Line key={l.label + l.price} x1={0} x2={w - PAD_R + 4} y1={geo.y(l.price)} y2={geo.y(l.price)} stroke={l.color} strokeWidth={1} strokeDasharray={l.dashed ? '4 4' : undefined} />
              ))}
              {levels.map((l) => (
                <SvgText key={`t${l.label}${l.price}`} x={w - PAD_R + 8} y={geo.y(l.price) + 4} fontSize={10} fill={l.color} fontFamily={Fonts.medium}>
                  {l.label}
                </SvgText>
              ))}
              {shown.map((b, i) => {
                const up = b.c >= b.o;
                const c = up ? colors.positive : colors.danger;
                const x = i * geo.cw + geo.cw / 2;
                const top = geo.y(Math.max(b.o, b.c));
                const bot = geo.y(Math.min(b.o, b.c));
                return (
                  <G key={b.t}>
                    <Line x1={x} x2={x} y1={geo.y(b.h)} y2={geo.y(b.l)} stroke={c} strokeWidth={zoom > 3 ? 1.5 : 1} />
                    <Rect x={x - Math.max(1, geo.cw * 0.35)} y={top} width={Math.max(2, geo.cw * 0.7)} height={Math.max(1, bot - top)} fill={c} />
                  </G>
                );
              })}
            </Svg>
          ) : null}
        </View>
      </GestureDetector>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, direction: 'ltr' }}>
        <Txt variant="caption" color="textSecondary" style={{ flex: 1 }}>
          {s.lab.setup.zoomHint}
        </Txt>
        {zoom > 1 || backC > 0 ? (
          <IconButton
            sf="arrow.uturn.backward"
            md="restart_alt"
            label={s.lab.setup.zoomReset}
            onPress={() => {
              setZoom(1);
              setBack(0);
            }}
          />
        ) : null}
        <IconButton sf="minus.magnifyingglass" md="zoom_out" label={s.lab.setup.zoomOut} onPress={() => setZoomClamped(zoom / ZOOM_STEP)} />
        <IconButton sf="plus.magnifyingglass" md="zoom_in" label={s.lab.setup.zoomIn} onPress={() => setZoomClamped(zoom * ZOOM_STEP)} />
      </View>
    </View>
  );
}

export function FanChart({ bands, stop, target, entry, height = 180 }: { bands: number[][]; stop: number; target: number; entry: number; height?: number }) {
  const { colors } = useTokens();
  const [w, setW] = useState(0);
  const geo = useMemo(() => {
    if (!bands.length || w === 0) return null;
    const all = [...bands.flat(), stop, target];
    const min = Math.min(...all);
    const max = Math.max(...all);
    const span = max - min || 1;
    const plotW = w - PAD_R;
    const x = (i: number) => (i / Math.max(1, bands.length - 1)) * plotW;
    const y = (p: number) => 6 + (1 - (p - min) / span) * (height - 12);
    const area = (lo: number, hi: number) =>
      `M${bands.map((b, i) => `${x(i)},${y(b[hi])}`).join(' L')} L${bands
        .map((b, i) => [i, b] as const)
        .reverse()
        .map(([i, b]) => `${x(i)},${y(b[lo])}`)
        .join(' L')} Z`;
    const mid = `M${bands.map((b, i) => `${x(i)},${y(b[2])}`).join(' L')}`;
    return { y, outer: area(0, 4), inner: area(1, 3), mid };
  }, [bands, stop, target, w, height]);
  return (
    <View style={{ direction: 'ltr', height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {geo ? (
        <Svg width={w} height={height}>
          <Path d={geo.outer} fill={colors.accent} opacity={0.14} />
          <Path d={geo.inner} fill={colors.accent} opacity={0.24} />
          <Path d={geo.mid} stroke={colors.accent} strokeWidth={2} fill="none" />
          {[
            { p: target, c: colors.positive, t: 'T' },
            { p: entry, c: colors.textSecondary, t: 'E' },
            { p: stop, c: colors.danger, t: 'S' },
          ].map((l) => (
            <G key={l.t}>
              <Line x1={0} x2={w - PAD_R + 4} y1={geo.y(l.p)} y2={geo.y(l.p)} stroke={l.c} strokeWidth={1} strokeDasharray="4 4" />
              <SvgText x={w - PAD_R + 8} y={geo.y(l.p) + 4} fontSize={10} fill={l.c} fontFamily={Fonts.medium}>
                {`${l.t} ${l.p.toFixed(2)}`}
              </SvgText>
            </G>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

export function OddsBar({ target, neither, stop, labels }: { target: number; neither: number; stop: number; labels: [string, string, string] }) {
  const { colors } = useTokens();
  const parts = [
    { v: target, c: colors.positive, l: labels[0] },
    { v: neither, c: colors.fill, l: labels[1] },
    { v: stop, c: colors.danger, l: labels[2] },
  ];
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', direction: 'ltr' }}>
        {parts.map((p) => (
          <View key={p.l} style={{ flex: Math.max(p.v, 0.001), backgroundColor: p.c }} />
        ))}
      </View>
      {parts.map((p) => (
        <View key={p.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.c }} />
          <Txt variant="subhead" style={{ flex: 1 }}>
            {p.l}
          </Txt>
          <Txt variant="headline" style={{ fontVariant: ['tabular-nums'] }}>{`${(p.v * 100).toFixed(1)}%`}</Txt>
        </View>
      ))}
    </View>
  );
}
