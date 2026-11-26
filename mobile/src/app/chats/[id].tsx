/**
 * One chat (1:1 or group), like a messaging app: newest message at the bottom, own messages on
 * the trailing side (left in Hebrew, mirrored), the sender's name above others' messages in
 * groups, and day headers.
 *
 * New messages arrive live (Realtime) with a 15 s catch-up poll as a safety net. Sending shows
 * the message at once; a failed send stays in the list and can be tapped to try again.
 *
 * The id must be a uuid; anything else, or a chat the server does not return (missing, or the
 * user is not a member), shows "Chat not found" and loads nothing. The `title` param is only a
 * placeholder until the server's title or the other member's name arrives.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { type ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getConversation, leaveConversation, listMembers, listMessages, markRead, MAX_BODY, type Member, type Message, myUserId, sendMessage } from '@/chat/api';
import { isChatId } from '@/chat/ids';
import { subscribeMessages } from '@/chat/realtime';
import { fill, useApp } from '@/state/app-store';
import { BackButton, IconButton, Row, Txt } from '@/ui/components';
import { ChatAvatar, chatDay, isVerified, useChatError, VerifiedBadge } from '@/ui/chat-ui';
import { showDialog } from '@/ui/dialog';
import { useKeyboardInset } from '@/ui/keyboard';
import { Metrics, useTokens } from '@/ui/theme';

const POLL_MS = 15_000;

type Pending = { key: string; body: string; status: 'sending' | 'failed'; created_at: string };
type Item = { kind: 'msg'; m: Message } | { kind: 'pending'; p: Pending };

export default function ChatRoomScreen() {
  const { id, title: titleParam } = useLocalSearchParams<{ id: string; title?: string }>();
  const valid = isChatId(id);
  const { s, lang, isRTL } = useApp();
  const { colors, type, isIOS } = useTokens();
  const errorText = useChatError();
  const { ref: kbRef, inset: kbInset, open: kbOpen } = useKeyboardInset();
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  const [me, setMe] = useState('');
  const [messages, setMessages] = useState<Message[]>([]); // newest first
  const [pending, setPending] = useState<Pending[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  /** 1:1 chat with a verified account: badge after the name in the header. */
  const [peerVerified, setPeerVerified] = useState(false);
  const [title, setTitle] = useState(valid && typeof titleParam === 'string' ? titleParam : '');
  const [loading, setLoading] = useState(valid);
  /** The server returned no such chat for this user. */
  const [missing, setMissing] = useState(false);
  const notFound = !valid || missing;
  const [older, setOlder] = useState(true);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  /** Merge new messages in, newest first, without duplicates (live + poll can both deliver). */
  const merge = useCallback((incoming: Message[]) => {
    setMessages((cur) => {
      const seen = new Set(cur.map((m) => m.id));
      const add = incoming.filter((m) => !seen.has(m.id));
      return add.length ? [...add, ...cur].sort((a, b) => b.id - a.id) : cur;
    });
  }, []);

  // First load: who am I, the chat, its members, the latest messages.
  useEffect(() => {
    if (!isChatId(id)) return;
    let live = true;
    Promise.all([myUserId(), getConversation(id), listMembers(id), listMessages(id)])
      .then(([uid, conv, mem, msgs]) => {
        if (!live) return;
        if (!conv) {
          setMissing(true);
          setTitle('');
          return;
        }
        setMe(uid);
        setIsGroup(conv.is_group);
        // The server's title wins over the `title` param.
        if (conv.is_group && conv.title) setTitle(conv.title);
        if (!conv.is_group) {
          const peer = mem.find((m) => m.user_id !== uid)?.profile;
          if (peer) {
            setTitle(peer.display_name || `@${peer.username}`);
            setPeerVerified(isVerified(peer.username));
          }
        }
        setMembers(mem);
        setMessages(msgs);
        setOlder(msgs.length >= 50);
        markRead(id).catch(() => {});
      })
      .catch((e) => live && setError(errorText(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [id, errorText]);

  const newest = messages[0]?.id;
  const newestRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    newestRef.current = newest;
  }, [newest]);

  // Live messages + catch-up poll.
  useEffect(() => {
    if (!isChatId(id) || missing) return;
    const unsubscribe = subscribeMessages((m) => {
      merge([m]);
      markRead(id).catch(() => {});
    }, id);
    const poll = setInterval(() => {
      listMessages(id, newestRef.current ? { after: newestRef.current } : {})
        .then((r) => {
          if (r.length) {
            merge(r);
            markRead(id).catch(() => {});
          }
        })
        .catch(() => {});
    }, POLL_MS);
    return () => {
      unsubscribe();
      clearInterval(poll);
    };
  }, [id, merge, missing]);

  const loadOlder = () => {
    const last = messages[messages.length - 1];
    if (!older || !last) return;
    setOlder(false);
    listMessages(id, { before: last.id })
      .then((r) => {
        setMessages((cur) => [...cur, ...r.filter((m) => !cur.some((c) => c.id === m.id))]);
        setOlder(r.length >= 50);
      })
      .catch(() => setOlder(true));
  };

  const deliver = (p: Pending) => {
    setPending((cur) => cur.map((x) => (x.key === p.key ? { ...x, status: 'sending' } : x)));
    sendMessage(id, p.body)
      .then((m) => {
        merge([m]);
        setPending((cur) => cur.filter((x) => x.key !== p.key));
      })
      .catch(() => setPending((cur) => cur.map((x) => (x.key === p.key ? { ...x, status: 'failed' } : x))));
  };

  const send = () => {
    const body = draft.trim().slice(0, MAX_BODY);
    if (!body) return;
    const p: Pending = { key: `p${Date.now()}`, body, status: 'sending', created_at: new Date().toISOString() };
    setPending((cur) => [p, ...cur]);
    setDraft('');
    deliver(p);
  };

  const leave = () =>
    showDialog(s.chat.leave, s.chat.leaveConfirm, [
      { text: s.chat.cancel, style: 'cancel' },
      {
        text: s.chat.leave,
        style: 'destructive',
        onPress: () => {
          leaveConversation(id)
            .then(() => router.back())
            .catch((e) => setError(errorText(e)));
        },
      },
    ]);

  const names = useMemo(() => new Map(members.map((m) => [m.user_id, m.profile ? m.profile.display_name || `@${m.profile.username}` : '?'])), [members]);
  const verifiedIds = useMemo(() => new Set(members.filter((m) => isVerified(m.profile?.username)).map((m) => m.user_id)), [members]);
  const items: Item[] = useMemo(() => [...pending.map((p) => ({ kind: 'pending' as const, p })), ...messages.map((m) => ({ kind: 'msg' as const, m }))], [pending, messages]);
  const time = (iso: string) => new Date(iso).toLocaleTimeString(lang === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  const dayOf = (it: Item) => new Date(it.kind === 'msg' ? it.m.created_at : it.p.created_at).toDateString();

  const renderItem = ({ item, index }: { item: Item; index: number }) => {
    const mine = item.kind === 'pending' || item.m.sender_id === me;
    const body = item.kind === 'msg' ? item.m.body : item.p.body;
    const at = item.kind === 'msg' ? item.m.created_at : item.p.created_at;
    // The list is inverted: index + 1 is the message shown above this one.
    const above = items[index + 1];
    const newDay = !above || dayOf(above) !== dayOf(item);
    const sameSenderAbove = above && !newDay && above.kind === 'msg' && item.kind === 'msg' && above.m.sender_id === item.m.sender_id;
    const failed = item.kind === 'pending' && item.p.status === 'failed';
    return (
      <View style={{ gap: 4, marginTop: sameSenderAbove ? 2 : 8 }}>
        {newDay ? (
          <View style={{ alignSelf: 'center', backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginVertical: 8 }}>
            <Txt variant="caption" color="textSecondary">
              {chatDay(at, lang, s.chat)}
            </Txt>
          </View>
        ) : null}
        <Pressable
          disabled={!failed}
          accessibilityRole={failed ? 'button' : undefined}
          accessibilityHint={failed ? s.chat.failed : undefined}
          onPress={() => item.kind === 'pending' && deliver(item.p)}
          style={{
            alignSelf: mine ? 'flex-end' : 'flex-start',
            maxWidth: '82%',
            backgroundColor: mine ? colors.accent : colors.card,
            borderRadius: 18,
            paddingHorizontal: 14,
            paddingVertical: 8,
            opacity: item.kind === 'pending' && !failed ? 0.7 : 1,
          }}>
          {isGroup && !mine && !sameSenderAbove && item.kind === 'msg' ? (
            <Row style={{ gap: 4, marginBottom: 2 }}>
              <Txt variant="caption" style={{ color: colors.accent, flexShrink: 1 }}>
                {names.get(item.m.sender_id) ?? '?'}
              </Txt>
              {verifiedIds.has(item.m.sender_id) ? <VerifiedBadge size={12} /> : null}
            </Row>
          ) : null}
          <Txt selectable style={{ color: mine ? colors.onAccent : colors.text }}>
            {body}
          </Txt>
          <Txt variant="caption" style={{ color: mine ? colors.onAccent : colors.textSecondary, opacity: 0.75, alignSelf: 'flex-end', marginTop: 2 }}>
            {item.kind === 'pending' ? (failed ? s.chat.failed : s.chat.sending) : time(at)}
          </Txt>
        </Pressable>
      </View>
    );
  };

  if (notFound) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background, direction: isRTL ? 'rtl' : 'ltr' }}>
        <Row style={{ paddingHorizontal: 4, paddingVertical: 6, gap: 8, borderBottomWidth: 0.5, borderColor: colors.separator }}>
          <BackButton onPress={() => router.back()} />
        </Row>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Metrics.margin, gap: 8 }}>
          <Txt variant="headline" accessibilityRole="header" style={{ textAlign: 'center' }}>
            {s.chat.notFound}
          </Txt>
          <Txt variant="subhead" color="textSecondary" style={{ textAlign: 'center' }}>
            {s.chat.notFoundBody}
          </Txt>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background, direction: isRTL ? 'rtl' : 'ltr' }}>
      <View ref={kbRef} style={{ flex: 1, paddingBottom: kbInset }}>
        <Row style={{ paddingHorizontal: 4, paddingVertical: 6, gap: 8, borderBottomWidth: 0.5, borderColor: colors.separator }}>
          <BackButton onPress={() => router.back()} />
          <ChatAvatar name={title} group={isGroup} size={36} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Row style={{ gap: 4 }}>
              <Txt variant="headline" numberOfLines={1} accessibilityRole="header" style={{ flexShrink: 1 }}>
                {title}
              </Txt>
              {!isGroup && peerVerified ? <VerifiedBadge /> : null}
            </Row>
            {isGroup ? (
              <Txt variant="caption" color="textSecondary" numberOfLines={1}>
                {fill(s.chat.members, { n: members.length })}
              </Txt>
            ) : null}
          </View>
          <IconButton sf="rectangle.portrait.and.arrow.right" md="logout" label={s.chat.leave} onPress={leave} />
        </Row>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            inverted
            data={items}
            keyExtractor={(it) => (it.kind === 'msg' ? `m${it.m.id}` : it.p.key)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: Metrics.margin, paddingVertical: 12 }}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.3}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onTouchStart={() => kbOpen && Keyboard.dismiss()}
            // Inverted: the footer shows at the top, above the oldest message.
            ListFooterComponent={
              <Txt variant="caption" color="textSecondary" style={{ textAlign: 'center', paddingVertical: 12 }}>
                {s.chat.disclaimer}
              </Txt>
            }
          />
        )}

        {error ? (
          <Txt variant="subhead" color="danger" style={{ paddingHorizontal: Metrics.margin, paddingBottom: 4 }}>
            {error}
          </Txt>
        ) : null}

        <View style={{ borderTopWidth: 0.5, borderColor: colors.separator, paddingTop: 8, paddingBottom: kbOpen ? 6 : 10 }}>
          <Pressable
            accessible={false}
            onPress={() => input.current?.focus()}
            style={{
              marginHorizontal: Metrics.margin,
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 4,
              minHeight: 52,
              borderRadius: 26,
              backgroundColor: isIOS ? colors.card : colors.fill,
              paddingStart: 16,
              paddingEnd: 4,
              paddingVertical: 4,
            }}>
            <TextInput
              ref={input}
              accessibilityLabel={s.chat.placeholder}
              value={draft}
              onChangeText={setDraft}
              placeholder={s.chat.placeholder}
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={MAX_BODY}
              style={[type.body, { flex: 1, maxHeight: 140, paddingVertical: 10, color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
            />
            {/* The send arrow points the reading direction: mirrored in Hebrew. */}
            <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }], opacity: draft.trim() ? 1 : 0.4 }}>
              <IconButton sf="arrow.up" md="send" tone="filled" label={s.chat.send} onPress={send} />
            </View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
