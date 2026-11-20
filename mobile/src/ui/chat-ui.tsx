/**
 * Shared pieces of user chat: avatar, chat-profile setup (username), time labels and error text.
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';

import { ChatError, type Profile, saveProfile, USERNAME_RE } from '@/chat/api';
import { useApp } from '@/state/app-store';
import { useAuth } from '@/state/auth';
import { Button, Card, Icon, Txt } from '@/ui/components';
import { Metrics, useTokens } from '@/ui/theme';

/** Error text for any chat failure. */
export function useChatError() {
  const { s } = useApp();
  return useCallback((e: unknown) => s.chat.errors[e instanceof ChatError ? e.code : 'network'], [s]);
}

/** Round avatar: first letter of the name on a tinted circle, or a group icon. */
export function ChatAvatar({ name, group, size = 44 }: { name: string; group?: boolean; size?: number }) {
  const { colors } = useTokens();
  const letter = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
      {group ? (
        <Icon sf="person.3.fill" md="groups" size={size * 0.5} color={colors.onAccentSoft} />
      ) : (
        <Txt variant="headline" style={{ color: colors.onAccentSoft, fontSize: size * 0.42, lineHeight: size * 0.5 }}>
          {letter}
        </Txt>
      )}
    </View>
  );
}

/** "14:05" today, "Yesterday", or a short date. */
export function chatTime(iso: string, lang: 'en' | 'he', labels: { yesterday: string }): string {
  const d = new Date(iso);
  const now = new Date();
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return labels.yesterday;
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

/** Day header inside a chat: Today, Yesterday, or the full date. */
export function chatDay(iso: string, lang: 'en' | 'he', labels: { today: string; yesterday: string }): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return labels.today;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return labels.yesterday;
  return d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Pick or change the @username and display name other users see. */
export function ProfileSetup({ current, onSaved }: { current: Profile | null; onSaved: (p: Profile) => void }) {
  const { s } = useApp();
  const auth = useAuth();
  const { colors, type, isIOS } = useTokens();
  const errorText = useChatError();
  const [username, setUsername] = useState(current?.username ?? '');
  const [name, setName] = useState(current?.display_name ?? auth.account?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = USERNAME_RE.test(username);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      onSaved(await saveProfile(username, name));
    } catch (e) {
      setError(errorText(e));
    }
    setBusy(false);
  };

  const field = (value: string, onChange: (t: string) => void, label: string, ltr: boolean, prefix?: string) => (
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
          backgroundColor: isIOS ? colors.background : 'transparent',
          borderWidth: isIOS ? 0 : 1,
          borderColor: colors.separator,
          paddingHorizontal: 16,
          direction: ltr ? 'ltr' : undefined,
        }}>
        {prefix ? <Txt color="textSecondary">{prefix}</Txt> : null}
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={colors.textSecondary}
          style={[type.body, { flex: 1, color: colors.text, textAlign: ltr ? 'left' : undefined, writingDirection: ltr ? 'ltr' : undefined }]}
        />
      </View>
    </View>
  );

  return (
    <Card>
      <Txt variant="headline">{s.chat.setupTitle}</Txt>
      <Txt color="textSecondary">{s.chat.setupBody}</Txt>
      {/* Usernames are Latin: typed left-to-right in both languages. */}
      {field(username, (t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)), s.chat.username, true, '@')}
      <Txt variant="footnote" color="textSecondary">
        {s.chat.usernameHint}
      </Txt>
      {field(name, (t) => setName(t.slice(0, 40)), s.chat.displayName, false)}
      {error ? (
        <Txt variant="subhead" color="danger">
          {error}
        </Txt>
      ) : null}
      {busy ? <ActivityIndicator color={colors.accent} /> : <Button label={s.chat.save} onPress={save} disabled={!valid} />}
    </Card>
  );
}
