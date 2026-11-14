/**
 * Animated splash. Starts pixel-identical to the native splash (same midnight teal, same 160dp glyph,
 * see app.json `expo-splash-screen`), so there is no flash when the native one hides. Then:
 *   1. the K monogram spins once (Y-axis flip) and pops with a fast spatial spring,
 *   2. a soft glow breathes behind it and two rings ripple outward,
 *   3. gold sparkles burst from the coin and fade,
 *   4. the name and tagline rise in, and a thin loading line fills,
 *   5. the layer zooms slightly and fades out (effects spring, no overshoot).
 * About 1.9 s in total. Springs come from ui/motion.ts (M3 Expressive tokens).
 *
 * HIG (launching.md) asks iOS launch screens to stay plain and text-free. The native launch
 * screen follows that; this intro runs after launch, at the user's request.
 */
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useApp } from '@/state/app-store';
import { bidi } from '@/ui/bidi';
import { Springs } from '@/ui/motion';
import { Fonts } from '@/ui/theme';

export const SPLASH_BG = '#062A26';
const GOLD = '#F5C542';
const GLYPH = 160;
const SPARKS = 10;
const TOTAL_MS = 1900;

export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const { s, isRTL } = useApp();
  const spin = useSharedValue(0);
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const glow = useSharedValue(0);
  const ring = useSharedValue(0);
  const burst = useSharedValue(0);
  const text = useSharedValue(0);
  const bar = useSharedValue(0);
  const layer = useSharedValue(1);

  useEffect(() => {
    spin.set(withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    scale.set(withSequence(withTiming(0.9, { duration: 140 }), withSpring(1.12, Springs.spatialFast)));
    lift.set(withDelay(500, withSpring(-40, Springs.spatialDefault)));
    glow.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true));
    ring.set(withDelay(250, withRepeat(withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }), -1, false)));
    burst.set(withDelay(420, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })));
    text.set(withDelay(650, withSpring(1, Springs.effectsDefault)));
    bar.set(withDelay(650, withTiming(1, { duration: TOTAL_MS - 950, easing: Easing.inOut(Easing.cubic) })));
    layer.set(
      withDelay(
        TOTAL_MS - 300,
        withSpring(0, Springs.effectsSlow, (finished) => {
          if (finished) runOnJS(onDone)();
        }),
      ),
    );
  }, [spin, scale, lift, glow, ring, burst, text, bar, layer, onDone]);

  const layerStyle = useAnimatedStyle(() => ({
    opacity: layer.value,
    transform: [{ scale: interpolate(layer.value, [0, 1], [1.08, 1]) }],
  }));
  const coinStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { perspective: 800 }, { rotateY: `${spin.value * 360}deg` }, { scale: scale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + glow.value * 0.22,
    transform: [{ translateY: lift.value }, { scale: 1.1 + glow.value * 0.25 }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: text.value,
    transform: [{ translateY: (1 - text.value) * 18 + lift.value }],
  }));
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.layer, layerStyle]}>
      <Animated.View style={[styles.glow, glowStyle]} />
      <Ring progress={ring} lift={lift} offset={0} />
      <Ring progress={ring} lift={lift} offset={0.5} />
      {Array.from({ length: SPARKS }, (_, i) => (
        <Spark key={i} index={i} progress={burst} lift={lift} />
      ))}
      <Animated.View style={coinStyle}>
        <Image source={require('@/assets/images/splash-icon.png')} style={{ width: GLYPH, height: GLYPH }} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[styles.textBox, textStyle]}>
        <Text style={styles.name}>{s.appName}</Text>
        <Text style={styles.tagline}>{bidi(s.splashTagline, isRTL)}</Text>
        {/* Loading line fills from the reading start edge. */}
        <View style={[styles.track, { direction: isRTL ? 'rtl' : 'ltr' }]}>
          <Animated.View style={[styles.fill, barStyle]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/** A ring that grows out of the coin and fades. `offset` staggers two rings half a cycle apart. */
function Ring({ progress, lift, offset }: { progress: SharedValue<number>; lift: SharedValue<number>; offset: number }) {
  const style = useAnimatedStyle(() => {
    const t = (progress.value + offset) % 1;
    return {
      opacity: progress.value === 0 ? 0 : (1 - t) * 0.5,
      transform: [{ translateY: lift.value }, { scale: 0.8 + t * 1.2 }],
    };
  });
  return <Animated.View style={[styles.ring, style]} />;
}

/** A gold dot flying outward from the coin on a fixed angle, shrinking as it fades. */
function Spark({ index, progress, lift }: { index: number; progress: SharedValue<number>; lift: SharedValue<number> }) {
  const angle = (index / SPARKS) * Math.PI * 2;
  const dist = 120 + (index % 3) * 30;
  const size = 6 + (index % 3) * 3;
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: t === 0 ? 0 : 1 - t,
      transform: [
        { translateX: Math.cos(angle) * dist * t },
        { translateY: Math.sin(angle) * dist * t + lift.value },
        { scale: 1 - t * 0.6 },
      ],
    };
  });
  return <Animated.View style={[styles.spark, { width: size, height: size, borderRadius: size / 2 }, style]} />;
}

const styles = StyleSheet.create({
  layer: { backgroundColor: SPLASH_BG, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  glow: { position: 'absolute', width: GLYPH * 1.6, height: GLYPH * 1.6, borderRadius: GLYPH, backgroundColor: GOLD },
  ring: { position: 'absolute', width: GLYPH * 1.2, height: GLYPH * 1.2, borderRadius: GLYPH, borderWidth: 2, borderColor: GOLD },
  spark: { position: 'absolute', backgroundColor: GOLD },
  textBox: { position: 'absolute', top: '60%', alignItems: 'center', gap: 6, width: 220 },
  name: { color: '#FFFFFF', fontSize: 36, fontFamily: Fonts.bold, letterSpacing: 0.5 },
  tagline: { color: GOLD, fontSize: 16, fontFamily: Fonts.medium },
  track: { marginTop: 14, width: 120, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, backgroundColor: GOLD },
});
