/**
 * Themed alert dialog, replacing the system Alert (which ignores the app's font, colors and
 * Hebrew right-to-left layout). Same call shape as Alert.alert:
 *
 *   showDialog(title, message?, buttons?)   // buttons: { text, style?, onPress? }[]
 *
 * <DialogHost /> is mounted once in the root layout; dialogs queue, one at a time.
 *
 * iOS (Apple HIG alerts.md): centered title and message, up to 3 buttons; two buttons side by
 * side with Cancel on the leading side and the action on the trailing side, three or more
 * stacked with Cancel at the bottom; destructive buttons in red.
 * Android (M3 Expressive): basic dialog on the "surface container high" role (color.md),
 * Extra large corners 28dp (tokens.md), headline title (typography.md: dialog heading), text
 * buttons aligned to the trailing edge.
 * DESIGN DECISIONS (sizes not in the references): iOS width 270pt and corner 14pt (the system
 * alert's look); Android max width 360dp, 24dp padding; scrim 40% black; Rubik Bold titles
 * (theme.ts); the iOS surface uses the card color. The Kesefly app icon (48, rounded) sits
 * centered above the title on both platforms; on Android the title then centers too (M3 dialog
 * with a hero icon).
 */
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { type AlertButton, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { useApp } from '@/state/app-store';
import { bidi } from '@/ui/bidi';
import { AppIconBadge, Txt } from '@/ui/components';
import { Fonts, useTokens } from '@/ui/theme';

type Dialog = { id: number; title: string; message?: string; buttons: AlertButton[] };

let seq = 0;
let queue: Dialog[] = [];
const listeners = new Set<(q: Dialog[]) => void>();
const emit = () => listeners.forEach((l) => l(queue));

/** Alert.alert replacement: themed, RTL-aware. Without buttons it shows a single OK. */
export function showDialog(title: string, message?: string, buttons?: AlertButton[]) {
  queue = [...queue, { id: ++seq, title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] }];
  emit();
}

function close(id: number) {
  queue = queue.filter((d) => d.id !== id);
  emit();
}

export function DialogHost() {
  const [q, setQ] = useState<Dialog[]>(queue);
  useEffect(() => {
    listeners.add(setQ);
    return () => {
      listeners.delete(setQ);
    };
  }, []);
  const d = q[0];
  if (!d) return null;
  return <DialogView key={d.id} d={d} />;
}

function DialogView({ d }: { d: Dialog }) {
  const { colors, isIOS, dark } = useTokens();
  const { isRTL, s } = useApp();
  const cancel = d.buttons.find((b) => b.style === 'cancel');
  const press = (b: AlertButton) => {
    Haptics.selectionAsync().catch(() => {});
    close(d.id);
    // After the dialog is gone, like the system alert.
    setTimeout(() => b.onPress?.(), 0);
  };
  const dismiss = () => {
    if (cancel) press(cancel);
  };
  const label = (b: AlertButton) => bidi(b.text === 'OK' ? s.common.ok : (b.text ?? ''), isRTL);
  const color = (b: AlertButton) => (b.style === 'destructive' ? colors.danger : colors.accent);

  // iOS: two buttons in a row (cancel leading), otherwise a stack (cancel last).
  const ordered = isIOS
    ? d.buttons.length === 2
      ? [...d.buttons.filter((b) => b.style === 'cancel'), ...d.buttons.filter((b) => b.style !== 'cancel')]
      : [...d.buttons.filter((b) => b.style !== 'cancel'), ...d.buttons.filter((b) => b.style === 'cancel')]
    : d.buttons;
  const row = isIOS && ordered.length === 2;
  // Android "surface container high": the card color lifted a little in dark mode.
  const surface = isIOS ? colors.card : dark ? '#2B2930' : '#ECE6F0';

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <Animated.View entering={FadeIn.duration(150)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Pressable accessibilityLabel={cancel?.text} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} onPress={dismiss} />
        <Animated.View
          entering={ZoomIn.duration(180)}
          accessibilityRole="alert"
          style={{
            width: isIOS ? 270 : '100%',
            maxWidth: isIOS ? 270 : 360,
            maxHeight: '80%',
            backgroundColor: surface,
            borderRadius: isIOS ? 14 : 28,
            overflow: 'hidden',
            direction: isRTL ? 'rtl' : 'ltr',
          }}>
          <ScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: isIOS ? 16 : 24, paddingTop: isIOS ? 20 : 24, paddingBottom: isIOS ? 16 : 16, gap: isIOS ? 4 : 16 }}>
            {/* Txt handles Hebrew the same way as every screen: direction marks per paragraph and
                start-aligned text (RN swaps left/right inside an RTL layout). */}
            <View style={{ alignSelf: 'center', marginBottom: isIOS ? 8 : 0 }}>
              <AppIconBadge size={52} />
            </View>
            <Txt center style={{ color: colors.text, fontFamily: Fonts.bold, fontSize: isIOS ? 17 : 24, lineHeight: isIOS ? 22 : 32 }}>
              {d.title}
            </Txt>
            {d.message ? (
              <Txt center={isIOS} style={{ color: isIOS ? colors.text : colors.textSecondary, fontFamily: Fonts.regular, fontSize: isIOS ? 13 : 14, lineHeight: isIOS ? 18 : 20 }}>
                {d.message}
              </Txt>
            ) : null}
          </ScrollView>
          {isIOS ? (
            <View style={{ flexDirection: row ? 'row' : 'column', borderTopWidth: 0.5, borderColor: colors.separator }}>
              {ordered.map((b, i) => (
                <Pressable
                  key={`${b.text}${i}`}
                  accessibilityRole="button"
                  onPress={() => press(b)}
                  style={({ pressed }) => ({
                    flex: row ? 1 : undefined,
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: pressed ? colors.fill : 'transparent',
                    borderStartWidth: row && i > 0 ? 0.5 : 0,
                    borderTopWidth: !row && i > 0 ? 0.5 : 0,
                    borderColor: colors.separator,
                  })}>
                  <Text style={{ color: color(b), fontSize: 17, fontFamily: b.style === 'cancel' ? Fonts.regular : Fonts.semibold }}>{label(b)}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 24, paddingBottom: 24 }}>
              {ordered.map((b, i) => (
                <Pressable
                  key={`${b.text}${i}`}
                  accessibilityRole="button"
                  onPress={() => press(b)}
                  android_ripple={{ color: colors.fill }}
                  style={{ minHeight: 48, paddingHorizontal: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <Text style={{ color: color(b), fontSize: 14, fontFamily: Fonts.medium, letterSpacing: 0.1 }}>{label(b)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
