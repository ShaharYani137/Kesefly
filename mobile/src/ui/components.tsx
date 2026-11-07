import { type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextProps,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/state/app-store';
import { Metrics, type TypeRole, useTokens } from '@/ui/theme';

/* ---------- Text ---------- */

type TxtProps = TextProps & {
  variant?: TypeRole;
  color?: 'text' | 'textSecondary' | 'accent' | 'positive' | 'warning' | 'danger' | 'onAccent' | 'onAccentSoft';
  center?: boolean;
};

export function Txt({ variant = 'body', color = 'text', center, style, ...rest }: TxtProps) {
  const { colors, type } = useTokens();
  const { isRTL } = useApp();
  return (
    <Text
      {...rest}
      style={[
        type[variant],
        { color: colors[color], textAlign: center ? 'center' : isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
        style,
      ]}
    />
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
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background, direction: isRTL ? 'rtl' : 'ltr' }}>
      {onBack ? (
        <View style={{ flexDirection: 'row', paddingHorizontal: 4, paddingTop: 4 }}>
          <BackButton onPress={onBack} />
        </View>
      ) : null}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: Metrics.margin, paddingBottom: Metrics.margin * 3, gap: Metrics.gap }}
        keyboardShouldPersistTaps="handled">
        {title ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: onBack ? 0 : 8 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="largeTitle" accessibilityRole="header">
                {title}
              </Txt>
              {subtitle ? <Txt color="textSecondary" variant="subhead">{subtitle}</Txt> : null}
            </View>
            {trailing}
          </View>
        ) : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style, tone = 'default' }: { children: ReactNode; style?: ViewStyle; tone?: 'default' | 'accent' }) {
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
    <Txt variant={isIOS ? 'footnote' : 'caption'} color={isIOS ? 'textSecondary' : 'accent'} style={{ marginBottom: -8, marginHorizontal: 4, textTransform: isIOS ? 'uppercase' : 'none' }}>
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

export function Button({ label, onPress, kind = 'filled', disabled }: ButtonProps) {
  const { colors } = useTokens();
  const bg = kind === 'filled' ? colors.accent : kind === 'tonal' ? colors.accentSoft : 'transparent';
  const fg =
    kind === 'filled' ? colors.onAccent : kind === 'tonal' ? colors.onAccentSoft : kind === 'destructive' ? colors.danger : colors.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: colors.fill, borderless: false }}
      style={({ pressed }) => ({
        minHeight: kind === 'plain' || kind === 'destructive' ? Metrics.minTarget : Metrics.buttonHeight,
        borderRadius: 999,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        overflow: 'hidden',
      })}>
      <Text style={{ color: fg, fontSize: 17, fontWeight: '600' }}>{label}</Text>
    </Pressable>
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
          style={[type.body, { flex: 1, color: colors.text, paddingVertical: 10, textAlign: isRTL ? 'right' : 'left' }]}
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

export function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (s: string) => void; placeholder?: string }) {
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
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors, isIOS } = useTokens();
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
                fontWeight: selected ? '600' : '500',
                color: selected && !isIOS ? colors.onAccentSoft : colors.text,
              }}>
              {!isIOS && selected ? '✓ ' : ''}
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** − value + control. Each button meets the platform minimum target. */
export function Stepper({ label, display, onMinus, onPlus }: { label: string; display: string; onMinus: () => void; onPlus: () => void }) {
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
      <Text style={{ color: colors.onAccentSoft, fontSize: 22, fontWeight: '600' }}>{sign}</Text>
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
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      // M3 layout.md: linear progress stays left-to-right in Hebrew.
      style={{ height: 8, borderRadius: 999, backgroundColor: colors.fill, overflow: 'hidden', direction: 'ltr' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 999, backgroundColor: colors.positive }} />
    </View>
  );
}

/** Suggestion / assist chip (M3 chips; iOS uses the same capsule shape as a bordered button). */
export function Chip({ label, onPress, sf, md }: { label: string; onPress: () => void; sf?: SFSymbol; md?: AndroidSymbol }) {
  const { colors, isIOS } = useTokens();
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
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>{label}</Text>
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
