/**
 * New chat: find users by @username or name. "Person" opens (or creates) the 1:1 chat at once;
 * "Group" lets the user pick several people and a group name.
 */
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { createGroup, type Profile, searchUsers, startDirect } from '@/chat/api';
import { fill, useApp } from '@/state/app-store';
import { Button, Card, Chip, Icon, Screen, Segmented, TextField, Txt } from '@/ui/components';
import { ChatAvatar, useChatError } from '@/ui/chat-ui';
import { Metrics, useTokens } from '@/ui/theme';

const SEARCH_DELAY_MS = 300;

export default function NewChatScreen() {
  const { s } = useApp();
  const { colors } = useTokens();
  const errorText = useChatError();
  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[] | null>(null);
  const [picked, setPicked] = useState<Profile[]>([]);
  const [groupName, setGroupName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Search after a short pause in typing; a late answer for an old query is dropped.
  useEffect(() => {
    let live = true;
    const id = setTimeout(() => {
      if (query.trim().replace(/^@/, '').length < 2) {
        if (live) setResults(null);
        return;
      }
      searchUsers(query)
        .then((r) => live && setResults(r))
        .catch((e) => live && setError(errorText(e)));
    }, SEARCH_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [query, errorText]);

  const openDirect = async (p: Profile) => {
    setBusy(true);
    setError('');
    try {
      const id = await startDirect(p.id);
      router.replace({ pathname: '/chats/[id]', params: { id, title: p.display_name || `@${p.username}` } });
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  const toggle = (p: Profile) => {
    Haptics.selectionAsync().catch(() => {});
    setPicked((cur) => (cur.some((x) => x.id === p.id) ? cur.filter((x) => x.id !== p.id) : [...cur, p]));
  };

  const makeGroup = async () => {
    setBusy(true);
    setError('');
    try {
      const id = await createGroup(groupName, picked.map((p) => p.id));
      router.replace({ pathname: '/chats/[id]', params: { id, title: groupName.trim() } });
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <Screen title={s.chat.newChat} onBack={() => router.back()}>
      <Segmented<'direct' | 'group'>
        value={mode}
        onChange={setMode}
        options={[
          { value: 'direct', label: s.chat.direct },
          { value: 'group', label: s.chat.groupTab },
        ]}
      />
      {mode === 'group' ? (
        <>
          <TextField label={s.chat.groupName} value={groupName} onChange={(t) => setGroupName(t.slice(0, 60))} placeholder={s.chat.groupNameHint} />
          {picked.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {picked.map((p) => (
                <Chip key={p.id} label={`${p.display_name || p.username} ×`} onPress={() => toggle(p)} />
              ))}
            </View>
          ) : null}
        </>
      ) : null}
      <TextField label={s.chat.search} value={query} onChange={setQuery} placeholder="@" />
      {error ? (
        <Txt variant="subhead" color="danger">
          {error}
        </Txt>
      ) : null}
      {results === null ? (
        <Txt variant="footnote" color="textSecondary">
          {s.chat.searchHint}
        </Txt>
      ) : results.length === 0 ? (
        <Txt color="textSecondary">{s.chat.noResults}</Txt>
      ) : (
        <Card style={{ paddingVertical: 4, gap: 0 }}>
          {results.map((p, i) => {
            const on = picked.some((x) => x.id === p.id);
            return (
              <Pressable
                key={p.id}
                accessibilityRole={mode === 'group' ? 'checkbox' : 'button'}
                accessibilityState={mode === 'group' ? { checked: on } : undefined}
                disabled={busy}
                onPress={() => (mode === 'group' ? toggle(p) : openDirect(p))}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: Metrics.minTarget + 8,
                  paddingVertical: 6,
                  borderTopWidth: i ? 0.5 : 0,
                  borderColor: colors.separator,
                  opacity: pressed ? 0.6 : 1,
                })}>
                <ChatAvatar name={p.display_name || p.username} size={40} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt variant="headline" numberOfLines={1}>
                    {p.display_name || p.username}
                  </Txt>
                  {/* @username is Latin: keep it left-to-right in Hebrew too. */}
                  <Txt variant="subhead" color="textSecondary" numberOfLines={1} style={{ writingDirection: 'ltr' }}>
                    @{p.username}
                  </Txt>
                </View>
                {mode === 'group' ? (
                  <Icon sf={on ? 'checkmark.circle.fill' : 'circle'} md={on ? 'check_circle' : 'radio_button_unchecked'} color={on ? colors.accent : colors.textSecondary} />
                ) : null}
              </Pressable>
            );
          })}
        </Card>
      )}
      {mode === 'group' ? (
        <>
          <Txt variant="footnote" color="textSecondary">
            {fill(s.chat.selected, { n: picked.length })}
          </Txt>
          {busy ? <ActivityIndicator color={colors.accent} /> : <Button label={s.chat.create} onPress={makeGroup} disabled={!groupName.trim() || picked.length === 0} />}
        </>
      ) : busy ? (
        <ActivityIndicator color={colors.accent} />
      ) : null}
    </Screen>
  );
}
