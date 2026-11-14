import { Children, type ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, type TextProps, TextInput, View, type ViewStyle } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/state/app-store';
import { bidi, ltr } from '@/ui/bidi';
import { enterItem, Springs } from '@/ui/motion';
import { Fonts, Metrics, type TypeRole, useTokens } from '@/ui/theme';

/* ---------- Text ---------- */

type TxtProps = TextProps & {
  variant?: TypeRole;
  color?: 'text' | 'textSecondary' | 'accent' | 'positive' | 'warning' | 'danger' | 'onAccent' | 'onAccentSoft';
  center?: boolean;
};

/**
 * Android ignores `writingDirection` and picks each paragraph's direction from its first strong
 * character, falling back to the SYSTEM language. So every paragraph of every string child gets a
 * direction mark (see ui/bidi.ts): RLM in Hebrew, LRM for text styled LTR (tickers, prices,
 * English headlines). This keeps Hebrew right-to-left on phones set to English, including
 * multi-line chat answers whose lines start with "•", digits or Latin.
 */
export function Txt({ variant = 'body', color = 'text', center, style, children, ...rest }: TxtProps) {
  const { colors, type } = useTokens();
  const { isRTL } = useApp();
  const forcedLtr = StyleSheet.flatten(style)?.writingDirection === 'ltr';
  const mark = (c: ReactNode) => {
    if (typeof c !== 'string' && typeof c !== 'number') return c;
    if (forcedLtr) return ltr(String(c));
    return isRTL ? bidi(String(c), true) : c;
  };
  const content = isRTL || forcedLtr ? Children.map(children, mark) : children;
  return (
    <Text
      {...rest}
      style={[
        type[variant],
        {
          color: colors[color],
          // RN Android swaps textAlign left/right inside an RTL layout ('left' = start). So 'left'
          // puts Hebrew on the right. LTR-styled text gets its own LTR layout below (no swap), so
          // it uses the absolute side of the UI's start: right in Hebrew, left in English.
          textAlign: center ? 'center' : forcedLtr && isRTL ? 'right' : 'left',
          writingDirection: isRTL ? 'rtl' : 'ltr',
        },
        style,
        // RN Android maps textAlign left/right through the LAYOUT direction: in an RTL screen
        // 'left' becomes "opposite", which right-aligns an English paragraph. LTR text gets an
        // LTR layout direction so 'left' really means left.
        forcedLtr ? { direction: 'ltr' as const } : null,
      ]}>
      {content}
    </Text>
  );
}

/* ---------- Layout ---------- */

type SymbolNames = Extract<SymbolViewProps['name'], { android?: unknown }>;
export type SFSymbol = NonNullable<SymbolNames['ios']>;
export type AndroidSymbol = NonNullable<SymbolNames['android']>;

/** SF Symbol on iOS, Material Symbol on Android. */
export function Icon({ sf, md, size = 24, color }: { sf: SFSymbol; md: AndroidSymbol; size?: number; color?: string }) {
  const { colors } = useTokens();
  return (
    <SymbolView
      name={{ ios: sf, android: md }}
      size={size}
      tintColor={color ?? colors.text}
      fallback={<View style={{ width: size, height: size }} />}
    />
  );
}

/** Round icon-only button. Meets the platform minimum target. */
export function IconButton({
  sf,
  md,
  label,
  onPress,
  tone = 'plain',
}: {
  sf: SFSymbol;
  md: AndroidSymbol;
  label: string;
  onPress: () => void;
  tone?: 'plain' | 'tonal' | 'filled';
}) {
  const { colors } = useTokens();
  const bg = tone === 'filled' ? colors.accent : tone === 'tonal' ? colors.accentSoft : 'transparent';
  const fg = tone === 'filled' ? colors.onAccent : tone === 'tonal' ? colors.onAccentSoft : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      android_ripple={{ color: colors.fill, borderless: true }}
      style={({ pressed }) => ({
        width: Metrics.minTarget,
        height: Metrics.minTarget,
        borderRadius: 999,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}>
      <Icon sf={sf} md={md} color={fg} size={24} />
    </Pressable>
  );
}

/** Back button. The arrow mirrors in RTL (M3 layout.md: directional icons are mirrored). */
export function BackButton({ onPress }: { onPress: () => void }) {
  const { s, isRTL } = useApp();
  return (
    <IconButton
      label={s.common.back}
      sf={isRTL ? 'chevron.right' : 'chevron.left'}
      md={isRTL ? 'arrow_forward' : 'arrow_back'}
      onPress={onPress}
    />
  );
}

/** Scrollable page with large title. Sets layout direction for RTL. */
export function Screen({
  title,
  subtitle,
  children,
  onBack,
  trailing,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  trailing?: ReactNode;
}) {
  const { colors } = useTokens();
  const { isRTL } = useApp();
  return (
    <SafeAreaView
      edges={['top']}
      style={{
        flex: 1,
        backgroundColor: colors.background,
        direction: isRTL ? 'rtl' : 'ltr',
      }}>
      {onBack ? (
        <View style={{ flexDirection: 'row', paddingHorizontal: 4, paddingTop: 4 }}>
          <BackButton onPress={onBack} />
        </View>
      ) : null}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: Metrics.margin,
          paddingBottom: Metrics.margin * 3,
          gap: Metrics.gap,
        }}
        keyboardShouldPersistTaps="handled">
        {title ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 8,
              marginTop: onBack ? 0 : 8,
            }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="largeTitle" accessibilityRole="header">
                {title}
              </Txt>
              {subtitle ? (
                <Txt color="textSecondary" variant="subhead">
                  {subtitle}
                </Txt>
              ) : null}
            </View>
            {trailing}
          </View>
        ) : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Entrance animation wrapper: content rises into place, staggered by `index` (see ui/motion.ts). */
export function Appear({ index = 0, children, style }: { index?: number; children: ReactNode; style?: ViewStyle }) {
  return (
    <Animated.View entering={enterItem(index)} style={style}>
      {children}
    </Animated.View>
  );
}

export function Card({
  children,
  style,
  tone = 'default',
}: {
  children: ReactNode;
  style?: ViewStyle;
  tone?: 'default' | 'accent';
}) {
  const { colors } = useTokens();
  return (
    <View
      style={[
        {
          backgroundColor: tone === 'accent' ? colors.accentSoft : colors.card,
          borderRadius: Metrics.cardRadius,
          padding: Metrics.cardPadding,
          gap: 8,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>{children}</View>;
}

export function SectionHeader({ children }: { children: string }) {
  const { isIOS } = useTokens();
  return (
    <Txt
      variant={isIOS ? 'footnote' : 'caption'}
      color={isIOS ? 'textSecondary' : 'accent'}
      style={{
        marginBottom: -8,
        marginHorizontal: 4,
        textTransform: isIOS ? 'uppercase' : 'none',
      }}>
      {children}
    </Txt>
  );
}

/* ---------- Controls ---------- */

type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: 'filled' | 'tonal' | 'plain' | 'destructive';
  disabled?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Press feedback: shrink slightly with the fast spatial spring (M3 Expressive buttons). */
function usePressScale() {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return {
    style,
    onPressIn: () => {
      scale.set(withSpring(0.95, Springs.spatialFast));
    },
    onPressOut: () => {
      scale.set(withSpring(1, Springs.spatialFast));
    },
  };
}

export function Button({ label, onPress, kind = 'filled', disabled }: ButtonProps) {
  const { colors } = useTokens();
  const { isRTL } = useApp();
  const press = usePressScale();
  const bg = kind === 'filled' ? colors.accent : kind === 'tonal' ? colors.accentSoft : 'transparent';
  const fg =
    kind === 'filled'
      ? colors.onAccent
      : kind === 'tonal'
        ? colors.onAccentSoft
        : kind === 'destructive'
          ? colors.danger
          : colors.accent;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      android_ripple={{ color: colors.fill, borderless: false }}
      style={[
        {
          minHeight: kind === 'plain' || kind === 'destructive' ? Metrics.minTarget : Metrics.buttonHeight,
          borderRadius: 999,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          opacity: disabled ? 0.4 : 1,
          overflow: 'hidden',
        },
        press.style,
      ]}>
      <Text numberOfLines={2} style={{ color: fg, fontSize: 17, fontFamily: Fonts.semibold, textAlign: 'center' }}>
        {bidi(label, isRTL)}
      </Text>
    </AnimatedPressable>
  );
}

/** Numeric money / count input with label and optional hint. */
export function NumberField({
  label,
  value,
  onChange,
  hint,
  prefix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
  prefix?: string;
}) {
  const { colors, type, isIOS } = useTokens();
  const { isRTL } = useApp();
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="subhead" color="textSecondary">
        {label}
      </Txt>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: Metrics.fieldHeight,
          borderRadius: Metrics.fieldRadius,
          backgroundColor: isIOS ? colors.card : 'transparent',
          borderWidth: isIOS ? 0 : 1,
          borderColor: colors.separator,
          paddingHorizontal: 16,
          gap: 6,
        }}>
        {prefix ? <Text style={[type.body, { color: colors.textSecondary }]}>{prefix}</Text> : null}
        <TextInput
          accessibilityLabel={label}
          keyboardType="decimal-pad"
          inputMode="decimal"
          value={value ? String(value) : ''}
          placeholder="0"
          placeholderTextColor={colors.textSecondary}
          onChangeText={(t) => {
            const n = Number(t.replace(/[^\d.]/g, ''));
            onChange(Number.isFinite(n) ? n : 0);
          }}
          style={[
            type.body,
            {
              flex: 1,
              color: colors.text,
              paddingVertical: 10,
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
        />
      </View>
      {hint ? (
        <Txt variant="footnote" color="textSecondary">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  const { colors, type, isIOS } = useTokens();
  const { isRTL } = useApp();
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="subhead" color="textSecondary">
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        style={[
          type.body,
          {
            minHeight: Metrics.fieldHeight,
            borderRadius: Metrics.fieldRadius,
            backgroundColor: isIOS ? colors.card : 'transparent',
            borderWidth: isIOS ? 0 : 1,
            borderColor: colors.separator,
            paddingHorizontal: 16,
            color: colors.text,
            textAlign: isRTL ? 'right' : 'left',
          },
        ]}
      />
    </View>
  );
}

/** iOS segmented control look on iOS; M3 segmented button look on Android. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  tone = 'default',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  /** 'hero' = on the dark brand surface. */
  tone?: 'default' | 'hero';
}) {
  const base = useTokens();
  const { isIOS } = base;
  const { isRTL } = useApp();
  const colors =
    tone === 'hero'
      ? { ...base.colors, fill: 'rgba(255,255,255,0.12)', card: 'rgba(255,255,255,0.22)', separator: 'rgba(255,255,255,0.25)', text: '#FFFFFF', accentSoft: 'rgba(255,255,255,0.22)', onAccentSoft: '#FFFFFF' }
      : base.colors;
  return (
    <View
      accessibilityRole="radiogroup"
      style={{
        flexDirection: 'row',
        borderRadius: isIOS ? 9 : 999,
        backgroundColor: isIOS ? colors.fill : 'transparent',
        borderWidth: isIOS ? 0 : 1,
        borderColor: colors.separator,
        padding: isIOS ? 2 : 0,
        overflow: 'hidden',
      }}>
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              minHeight: isIOS ? 32 : 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: isIOS ? 7 : 0,
              backgroundColor: selected ? (isIOS ? colors.card : colors.accentSoft) : 'transparent',
              borderStartWidth: !isIOS && i > 0 ? 1 : 0,
              borderColor: colors.separator,
              paddingHorizontal: 8,
            }}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: isIOS ? 13 : 14,
                fontFamily: selected ? Fonts.semibold : Fonts.medium,
                color: selected && !isIOS ? colors.onAccentSoft : colors.text,
              }}>
              {bidi(`${!isIOS && selected ? '✓ ' : ''}${o.label}`, isRTL)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** − value + control. Each button meets the platform minimum target. */
export function Stepper({
  label,
  display,
  onMinus,
  onPlus,
}: {
  label: string;
  display: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  const { colors } = useTokens();
  const btn = (sign: string, onPress: () => void, a11y: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={({ pressed }) => ({
        width: Metrics.minTarget,
        height: Metrics.minTarget,
        borderRadius: 999,
        backgroundColor: colors.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}>
      <Text style={{ color: colors.onAccentSoft, fontSize: 22, fontFamily: Fonts.semibold }}>{sign}</Text>
    </Pressable>
  );
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <Txt variant="subhead" color="textSecondary">
          {label}
        </Txt>
        <Txt variant="headline">{display}</Txt>
      </View>
      {btn('−', onMinus, `${label} −`)}
      {btn('+', onPlus, `${label} +`)}
    </Row>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const { colors } = useTokens();
  const pct = Math.max(0, Math.min(1, value));
  // Fills from 0 on first show and glides to new values (default spatial spring).
  const w = useSharedValue(0);
  useEffect(() => {
    w.set(withSpring(pct, Springs.spatialSlow));
  }, [pct, w]);
  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, w.value)) * 100}%`,
  }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      // M3 layout.md: linear progress stays left-to-right in Hebrew.
      style={{
        height: 8,
        borderRadius: 999,
        backgroundColor: colors.fill,
        overflow: 'hidden',
        direction: 'ltr',
      }}>
      <Animated.View
        style={[
          {
            height: '100%',
            borderRadius: 999,
            backgroundColor: colors.positive,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}

/** Suggestion / assist chip (M3 chips; iOS uses the same capsule shape as a bordered button). */
export function Chip({ label, onPress, sf, md }: { label: string; onPress: () => void; sf?: SFSymbol; md?: AndroidSymbol }) {
  const { colors, isIOS } = useTokens();
  const { isRTL } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{ color: colors.fill }}
      style={({ pressed }) => ({
        minHeight: isIOS ? 36 : 32,
        borderRadius: isIOS ? 999 : 8,
        borderWidth: 1,
        borderColor: colors.separator,
        backgroundColor: colors.card,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        opacity: pressed ? 0.7 : 1,
        overflow: 'hidden',
      })}>
      {sf && md ? <Icon sf={sf} md={md} size={18} color={colors.accent} /> : null}
      <Text style={{ color: colors.text, fontSize: 14, fontFamily: Fonts.medium }}>{bidi(label, isRTL)}</Text>
    </Pressable>
  );
}

/** Kesefly helper avatar: a round badge with the assistant symbol. */
export function HelperAvatar({ size = 36 }: { size?: number }) {
  const { colors } = useTokens();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon sf="sparkles" md="psychology" size={size * 0.6} color={colors.onAccent} />
    </View>
  );
}

export function Disclaimer() {
  const { s } = useApp();
  return (
    <Txt variant="footnote" color="textSecondary">
      {s.disclaimer}
    </Txt>
  );
}

export const styles = StyleSheet.create({
  flex1: { flex: 1 },
});

/* ---------- Brand v2 bits ---------- */

/** Number that counts up to its value (ease-out, 700 ms) when it first shows or changes. */
export function CountUp({ value, format, style }: { value: number; format: (v: number) => string; style?: TxtProps['style'] }) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);
  useEffect(() => {
    const start = from.current;
    const t0 = Date.now();
    let raf = 0;
    const tick = () => {
      const k = Math.min(1, (Date.now() - t0) / 700);
      const e = 1 - (1 - k) ** 3;
      setShown(start + (value - start) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <Text accessibilityLabel={format(value)} style={style}>
      {format(shown)}
    </Text>
  );
}

const BADGE_COLORS = ['#0F7B6C', '#3B5BA9', '#8A4FB8', '#B5542C', '#2E7D4F', '#9A6B00', '#A23B62', '#3A6F8F'];

/** Round badge with a symbol's initials, color picked from the symbol (stable). */
export function SymbolBadge({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const clean = symbol.replace(/^\^/, '').replace(/[.=-].*$/, '');
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: BADGE_COLORS[h % BADGE_COLORS.length],
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: size * 0.32 }}>{clean.slice(0, clean.length > 4 ? 3 : 4)}</Text>
    </View>
  );
}

/** Pulsing red dot for live content. */
export function LiveDot({ color = '#E53935' }: { color?: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withRepeat(withTiming(1, { duration: 1200 }), -1, false));
  }, [p]);
  const ring = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ scale: 1 + p.value * 1.6 }] }));
  return (
    <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: color }, ring]} />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

/** Small colored label (impact, category, change). */
export function Pill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  const { isRTL } = useApp();
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 }}>{bidi(label, isRTL)}</Text>
    </View>
  );
}

/** Change badge: green / red pill with signed percent. Latin digits stay LTR. */
export function ChangeBadge({ pct, text }: { pct: number; text: string }) {
  const { colors } = useTokens();
  return (
    <View style={{ backgroundColor: pct >= 0 ? colors.positive : colors.danger, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
      {/* Text in the page background color: dark on the light dark-mode greens, light on the deep light-mode greens. */}
      <Text style={{ color: colors.background, fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16, writingDirection: 'ltr' }}>{text}</Text>
    </View>
  );
}
