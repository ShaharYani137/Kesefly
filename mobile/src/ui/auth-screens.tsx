/**
 * Authentication screens, shown by the root layout instead of / on top of the app:
 *   - AuthScreen: brand hero, sign in / create account (email + password), forgot password.
 *   - PinSetup: create a 4-digit PIN (twice), then offer fingerprint / Face ID.
 *   - LockScreen: PIN keypad + biometric unlock, over the app.
 * Keypad digits are laid out like a phone keypad in both languages (keypads do not mirror),
 * and the PIN dots fill left-to-right.
 */
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fill, useApp } from '@/state/app-store';
import { AuthFailure, CLOUD, useAuth } from '@/state/auth';
import { bidi } from '@/ui/bidi';
import { Button, Icon, Segmented, Txt } from '@/ui/components';
import { useKeyboardInset } from '@/ui/keyboard';
import { enterFade, enterItem } from '@/ui/motion';
import { Fonts, Metrics, useTokens } from '@/ui/theme';

const BG = '#062A26';
const GOLD = '#F5C542';
const PIN_LEN = 4;

/* ---------- Sign in / sign up ---------- */

export function AuthScreen() {
  const { s, isRTL, lang, setLang } = useApp();
  const auth = useAuth();
  const { colors, type } = useTokens();
  const [mode, setMode] = useState<'in' | 'up'>('up');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const { ref: kbRef, inset: kbInset } = useKeyboardInset();

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'up') await auth.signUp(name || email.split('@')[0], email, password);
      else await auth.signIn(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      const code = e instanceof AuthFailure ? e.code : 'network';
      setMsg({ text: s.auth.errors[code] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
    setBusy(false);
  };

  const forgot = async () => {
    try {
      await auth.resetPassword(email);
      setMsg({ text: s.auth.resetSent, ok: true });
    } catch (e) {
      setMsg({ text: s.auth.errors[e instanceof AuthFailure ? e.code : 'network'] });
    }
  };

  const field = (value: string, onChange: (t: string) => void, label: string, opts: Partial<React.ComponentProps<typeof TextInput>> = {}) => (
    <View style={{ gap: 6 }}>
      <Txt variant="subhead" color="textSecondary">
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={colors.textSecondary}
        autoCorrect={false}
        {...opts}
        style={[
          type.body,
          {
            minHeight: Metrics.fieldHeight,
            borderRadius: 14,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.separator,
            paddingHorizontal: 16,
            color: colors.text,
            // Email and password are Latin: type them left-to-right in both languages.
            textAlign: opts.keyboardType === 'email-address' || opts.secureTextEntry !== undefined ? 'left' : isRTL ? 'right' : 'left',
            writingDirection: opts.keyboardType === 'email-address' || opts.secureTextEntry !== undefined ? 'ltr' : isRTL ? 'rtl' : 'ltr',
          },
        ]}
      />
    </View>
  );

  return (
    <View ref={kbRef} style={{ flex: 1, backgroundColor: colors.background, direction: isRTL ? 'rtl' : 'ltr', paddingBottom: kbInset }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
          {/* Brand hero */}
          <View style={{ backgroundColor: BG, paddingTop: 72, paddingBottom: 40, paddingHorizontal: 24, alignItems: 'center', gap: 10, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' }}>
            <View style={[styles.glow, { top: -80, end: -60 }]} />
            <View style={[styles.glow, { bottom: -90, start: -70, opacity: 0.6 }]} />
            <Animated.View entering={enterItem(0)}>
              <Image source={require('@/assets/images/splash-icon.png')} style={{ width: 96, height: 96 }} contentFit="contain" />
            </Animated.View>
            <Text style={{ color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 30, textAlign: 'center' }}>{bidi(s.auth.welcome, isRTL)}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: Fonts.regular, fontSize: 15, lineHeight: 21, textAlign: 'center', maxWidth: 320 }}>{bidi(s.auth.tagline, isRTL)}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              {(['he', 'en'] as const).map((l) => (
                <Pressable key={l} accessibilityRole="button" onPress={() => setLang(l)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: lang === l ? GOLD : 'rgba(255,255,255,0.12)' }}>
                  <Text style={{ color: lang === l ? BG : '#FFFFFF', fontFamily: Fonts.medium }}>{l === 'he' ? 'עברית' : 'English'}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Animated.View entering={enterItem(1)} style={{ padding: 20, gap: 14 }}>
            <Segmented<'in' | 'up'>
              value={mode}
              onChange={(m) => {
                setMode(m);
                setMsg(null);
              }}
              options={[
                { value: 'up', label: s.auth.signUp },
                { value: 'in', label: s.auth.signIn },
              ]}
            />
            {mode === 'up' ? field(name, setName, s.auth.name, { autoCapitalize: 'words', textContentType: 'name' }) : null}
            {field(email, setEmail, s.auth.email, { keyboardType: 'email-address', autoCapitalize: 'none', textContentType: 'emailAddress', autoComplete: 'email' })}
            <View>
              {field(password, setPassword, s.auth.password, {
                secureTextEntry: !show,
                autoCapitalize: 'none',
                textContentType: mode === 'up' ? 'newPassword' : 'password',
                onSubmitEditing: submit,
              })}
              <Pressable accessibilityRole="button" onPress={() => setShow(!show)} style={{ position: 'absolute', end: 8, bottom: 6, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}>
                <Txt variant="subhead" color="accent">
                  {show ? s.auth.hide : s.auth.show}
                </Txt>
              </Pressable>
            </View>
            {mode === 'up' ? (
              <Txt variant="footnote" color="textSecondary">
                {s.auth.passwordHint}
              </Txt>
            ) : null}
            {msg ? (
              <Animated.View entering={enterFade()}>
                <Txt variant="subhead" color={msg.ok ? 'positive' : 'danger'}>
                  {msg.text}
                </Txt>
              </Animated.View>
            ) : null}
            {busy ? <ActivityIndicator color={colors.accent} /> : <Button label={mode === 'up' ? s.auth.signUp : s.auth.signIn} onPress={submit} disabled={!email || !password} />}
            {mode === 'in' && CLOUD ? <Button kind="plain" label={s.auth.forgot} onPress={forgot} /> : null}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Icon sf="lock.shield" md="shield_lock" size={18} color={colors.textSecondary} />
              <Txt variant="footnote" color="textSecondary" style={{ flex: 1 }}>
                {CLOUD ? s.auth.cloudNote : s.auth.deviceNote}
              </Txt>
            </View>
          </Animated.View>
        </ScrollView>
    </View>
  );
}

/* ---------- PIN pad ---------- */

function PinPad({ onDigit, onDelete, extra, disabled }: { onDigit: (d: string) => void; onDelete: () => void; extra?: React.ReactNode; disabled?: boolean }) {
  const { s } = useApp();
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const key = (label: React.ReactNode, onPress: () => void, a11y: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => ({
        width: 76,
        height: 76,
        borderRadius: 38,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
        opacity: disabled ? 0.4 : 1,
      })}>
      {label}
    </Pressable>
  );
  return (
    // Phone keypads keep the same layout in RTL.
    <View style={{ direction: 'ltr', gap: 16, alignItems: 'center' }}>
      {[0, 1, 2].map((r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 22 }}>
          {keys.slice(r * 3, r * 3 + 3).map((d) => key(<Text style={styles.key}>{d}</Text>, () => onDigit(d), d))}
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 22 }}>
        <View style={{ width: 76, height: 76, alignItems: 'center', justifyContent: 'center' }}>{extra}</View>
        {key(<Text style={styles.key}>0</Text>, () => onDigit('0'), '0')}
        {key(<Icon sf="delete.left" md="backspace" color="#FFFFFF" />, onDelete, s.lock.delete)}
      </View>
    </View>
  );
}

function Dots({ n, shake }: { n: number; shake: number }) {
  const x = useSharedValue(0);
  useEffect(() => {
    if (shake) x.set(withSequence(withTiming(-12, { duration: 50 }), withTiming(12, { duration: 50 }), withTiming(-8, { duration: 50 }), withTiming(0, { duration: 50 })));
  }, [shake, x]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View style={[{ flexDirection: 'row', gap: 18, direction: 'ltr' }, st]}>
      {Array.from({ length: PIN_LEN }, (_, i) => (
        <View key={i} style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: GOLD, backgroundColor: i < n ? GOLD : 'transparent' }} />
      ))}
    </Animated.View>
  );
}

function PinShell({ title, body, children }: { title: string; body?: string; children: React.ReactNode }) {
  const { isRTL } = useApp();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: BG, zIndex: 50, direction: isRTL ? 'rtl' : 'ltr' }]}>
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: 24 }}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Image source={require('@/assets/images/splash-icon.png')} style={{ width: 64, height: 64 }} contentFit="contain" />
          <Text style={{ color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 24, textAlign: 'center' }}>{bidi(title, isRTL)}</Text>
          {body ? <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: Fonts.regular, fontSize: 15, textAlign: 'center', lineHeight: 21 }}>{bidi(body, isRTL)}</Text> : null}
        </View>
        {children}
      </SafeAreaView>
    </View>
  );
}

/* ---------- PIN setup + biometric offer ---------- */

export function PinSetup() {
  const { s, isRTL } = useApp();
  const auth = useAuth();
  const [first, setFirst] = useState<string | null>(null);
  const [pin, setPinDraft] = useState('');
  const [err, setErr] = useState('');
  const [shake, setShake] = useState(0);
  const [askBio, setAskBio] = useState(false);
  const [finalPin, setFinalPin] = useState('');

  const onDigit = (d: string) => {
    const next = (pin + d).slice(0, PIN_LEN);
    setPinDraft(next);
    setErr('');
    if (next.length < PIN_LEN) return;
    setTimeout(async () => {
      if (!first) {
        setFirst(next);
        setPinDraft('');
        return;
      }
      if (next !== first) {
        setErr(s.auth.pinMismatch);
        setShake((x) => x + 1);
        setFirst(null);
        setPinDraft('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        return;
      }
      if (auth.biometricType) {
        setFinalPin(next);
        setAskBio(true);
      } else await auth.setPin(next);
    }, 120);
  };

  if (askBio) {
    return (
      <PinShell title={s.auth.bioTitle} body={auth.biometricType === 'face' ? s.auth.bioBodyFace : s.auth.bioBodyFinger}>
        <Icon sf={auth.biometricType === 'face' ? 'faceid' : 'touchid'} md={auth.biometricType === 'face' ? 'face' : 'fingerprint'} size={72} color={GOLD} />
        <View style={{ alignSelf: 'stretch', gap: 8 }}>
          <Button
            label={s.auth.bioOn}
            onPress={async () => {
              await auth.setBiometric(true, bidi(s.auth.bioPrompt, isRTL));
              await auth.setPin(finalPin);
            }}
          />
          <Pressable accessibilityRole="button" onPress={() => auth.setPin(finalPin)} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontFamily: Fonts.medium, fontSize: 16 }}>{bidi(s.auth.bioSkip, isRTL)}</Text>
          </Pressable>
        </View>
      </PinShell>
    );
  }

  return (
    <PinShell title={first ? s.auth.pinConfirm : s.auth.pinTitle} body={err || s.auth.pinBody}>
      <Dots n={pin.length} shake={shake} />
      <PinPad onDigit={onDigit} onDelete={() => setPinDraft(pin.slice(0, -1))} />
    </PinShell>
  );
}

/* ---------- Lock ---------- */

export function LockScreen() {
  const { s, isRTL } = useApp();
  const auth = useAuth();
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [shake, setShake] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const waiting = auth.waitUntil > now;

  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [waiting]);

  // Offer biometrics right away when it is on.
  useEffect(() => {
    if (auth.biometric) auth.unlockWithBiometric(bidi(s.auth.bioPrompt, isRTL)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per lock
  }, []);

  const onDigit = (d: string) => {
    const next = (pin + d).slice(0, PIN_LEN);
    setPin(next);
    setErr('');
    if (next.length < PIN_LEN) return;
    setTimeout(async () => {
      const ok = await auth.unlockWithPin(next);
      if (!ok) {
        setErr(s.lock.wrong);
        setShake((x) => x + 1);
        setPin('');
        setNow(Date.now());
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
    }, 120);
  };

  const title = auth.account?.name ? fill(s.lock.hello, { name: auth.account.name }) : s.lock.title;
  const body = waiting ? fill(s.lock.wait, { s: Math.ceil((auth.waitUntil - now) / 1000) }) : err || s.lock.enterPin;

  return (
    <PinShell title={title} body={body}>
      <Dots n={pin.length} shake={shake} />
      <PinPad
        disabled={waiting}
        onDigit={onDigit}
        onDelete={() => setPin(pin.slice(0, -1))}
        extra={
          auth.biometric ? (
            <Pressable accessibilityRole="button" accessibilityLabel={s.lock.useBio} onPress={() => auth.unlockWithBiometric(bidi(s.auth.bioPrompt, isRTL))} style={{ width: 76, height: 76, alignItems: 'center', justifyContent: 'center' }}>
              <Icon sf={auth.biometricType === 'face' ? 'faceid' : 'touchid'} md={auth.biometricType === 'face' ? 'face' : 'fingerprint'} size={34} color={GOLD} />
            </Pressable>
          ) : null
        }
      />
      <Pressable accessibilityRole="button" onPress={auth.signOut} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.medium, fontSize: 15 }}>{bidi(s.lock.signOut, isRTL)}</Text>
      </Pressable>
    </PinShell>
  );
}

const styles = StyleSheet.create({
  key: { color: '#FFFFFF', fontFamily: Fonts.medium, fontSize: 30 },
  glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(245,197,66,0.12)' },
});
