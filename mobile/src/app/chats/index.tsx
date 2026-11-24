/**
 * Chats: the list of the user's 1:1 and group chats, newest first, with unread counts.
 * First visit: pick a @username (ProfileSetup). Updates live (Realtime) and every 30 s.
 * Device-only accounts see why chat needs a cloud account.
 * Notifications not allowed: a card explains why message alerts help and asks the OS only
 * when the user taps "Turn on alerts", or offers "Turn on in Settings" when the OS will not
 * ask again (notify-permission.ts). "Not now" hides the card on this phone.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { chatAvailable, type Conversation, getMyProfile, listConversations, myUserId, type Profile } from '@/chat/api';
import { subscribeMessages } from '@/chat/realtime';
import { fill, useApp } from '@/state/app-store';
import { useAuth } from '@/state/auth';
import { updateChatBadge } from '@/state/chat-alerts';
import { askOsPermission, openAppSettings, useNotifyPermission } from '@/state/notify-permission';
import { permissionStep } from '@/state/notify-rules';
import { Button, Card, Icon, IconButton, Row, Screen, Txt } from '@/ui/components';
import { ChatAvatar, chatTime, isVerified, ProfileSetup, useChatError, VerifiedBadge } from '@/ui/chat-ui';
import { Metrics, useTokens } from '@/ui/theme';

const POLL_MS = 30_000;
const ALERTS_CARD_HIDDEN_KEY = 'investapp/chat/alerts-card-hidden/v1';

export default function ChatsScreen() {
  const { s, lang } = useApp();
  const { account } = useAuth();
  const { colors } = useTokens();
  const errorText = useChatError();
  const cloud = chatAvailable() && account?.mode === 'cloud';
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [chats, setChats] = useState<Conversation[] | null>(null);
  const [me, setMe] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    if (!cloud) return;
    Promise.all([getMyProfile(), listConversations(), myUserId()])
      .then(([p, list, id]) => {
        setProfile(p);
        setChats(list);
        updateChatBadge(list).catch(() => {});
        setMe(id);
        setError('');
      })
      .catch((e) => {
        setError(errorText(e));
        setProfile((p) => (p === undefined ? null : p));
      });
  }, [cloud, errorText]);

  // Reload when the screen comes back into view (after a chat or a new chat).
  useFocusEffect(refresh);

  useEffect(() => {
    if (!cloud) return;
    const unsubscribe = subscribeMessages(() => refresh());
    const id = setInterval(refresh, POLL_MS);
    return () => {
      unsubscribe();
      clearInterval(id);
    };
  }, [cloud, refresh]);

  const ready = cloud && profile && !editing;

  // Message alerts card: shown only when notifications are not allowed and the user has not
  // tapped "Not now". The OS prompt appears only after the user taps "Turn on alerts".
  const perm = useNotifyPermission();
  const [cardHidden, setCardHidden] = useState(true);
  useEffect(() => {
    AsyncStorage.getItem(ALERTS_CARD_HIDDEN_KEY)
      .then((v) => setCardHidden(v === '1'))
      .catch(() => setCardHidden(false));
  }, []);
  const hideCard = () => {
    setCardHidden(true);
    AsyncStorage.setItem(ALERTS_CARD_HIDDEN_KEY, '1').catch(() => {});
  };
  const permStep = perm ? permissionStep(perm) : 'granted';

  return (
    <Screen
      title={s.chat.title}
      subtitle={s.chat.subtitle}
      onBack={() => router.back()}
      trailing={
        ready ? (
          <Row style={{ gap: 0 }}>
            <IconButton sf="person.crop.circle" md="account_circle" label={s.chat.profile} onPress={() => setEditing(true)} />
            <IconButton sf="square.and.pencil" md="edit_square" tone="tonal" label={s.chat.newChat} onPress={() => router.push('/chats/new')} />
          </Row>
        ) : undefined
      }>
      {!cloud ? (
        <Card>
          <Icon sf="icloud.slash" md="cloud_off" size={32} color={colors.textSecondary} />
          <Txt>{s.chat.needsCloud}</Txt>
        </Card>
      ) : profile === undefined && !error ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      ) : !profile || editing ? (
        <>
          {error ? (
            <Txt variant="subhead" color="danger">
              {error}
            </Txt>
          ) : null}
          <ProfileSetup
            current={profile ?? null}
            onSaved={(p) => {
              setProfile(p);
              setEditing(false);
              refresh();
            }}
          />
        </>
      ) : (
        <>
          {error ? (
            <Txt variant="subhead" color="danger">
              {error}
            </Txt>
          ) : null}
          {permStep !== 'granted' && !cardHidden ? (
            <AlertsCard
              blocked={permStep === 'settings'}
              onAllow={() => {
                askOsPermission().catch(() => false);
              }}
              onSettings={openAppSettings}
              onHide={hideCard}
            />
          ) : null}
          {chats && chats.length === 0 ? (
            <Card>
              <Txt color="textSecondary">{s.chat.empty}</Txt>
            </Card>
          ) : null}
          {chats && chats.length > 0 ? (
            <Card style={{ paddingVertical: 4, gap: 0 }}>
              {chats.map((c, i) => {
                const title = c.is_group ? (c.title ?? s.chat.group) : c.peer_name || (c.peer_username ? `@${c.peer_username}` : '?');
                const preview = c.last_body ? (c.last_sender === me ? `${s.chat.you}: ${c.last_body}` : c.last_body) : c.is_group ? fill(s.chat.members, { n: c.member_count }) : '';
                return (
                  <Pressable
                    key={c.id}
                    accessibilityRole="button"
                    accessibilityLabel={c.unread ? `${title}, ${c.unread}` : title}
                    onPress={() => router.push({ pathname: '/chats/[id]', params: { id: c.id, title } })}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      minHeight: Metrics.minTarget + 20,
                      paddingVertical: 8,
                      borderTopWidth: i ? 0.5 : 0,
                      borderColor: colors.separator,
                      opacity: pressed ? 0.6 : 1,
                    })}>
                    <ChatAvatar name={title} group={c.is_group} />
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Row style={{ gap: 8 }}>
                        <Row style={{ flex: 1, minWidth: 0, gap: 4 }}>
                          <Txt variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>
                            {title}
                          </Txt>
                          {!c.is_group && isVerified(c.peer_username) ? <VerifiedBadge /> : null}
                        </Row>
                        <Txt variant="caption" style={{ color: c.unread ? colors.accent : colors.textSecondary }}>
                          {chatTime(c.last_at, lang, s.chat)}
                        </Txt>
                      </Row>
                      <Row style={{ gap: 8 }}>
                        <Txt variant="subhead" color="textSecondary" numberOfLines={1} style={{ flex: 1 }}>
                          {preview}
                        </Txt>
                        {c.unread ? (
                          <View style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                            <Txt variant="caption" style={{ color: colors.onAccent }}>
                              {c.unread > 99 ? '99+' : c.unread}
                            </Txt>
                          </View>
                        ) : null}
                      </Row>
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          ) : null}
          <Txt variant="caption" color="textSecondary">
            {s.chat.disclaimer}
          </Txt>
        </>
      )}
    </Screen>
  );
}

/**
 * Message alerts are off. Reuses the app's Card (accent tone) and Button.
 * M3 references: components/containment.md (cards), components/buttons.md (filled button for
 * the high-emphasis action, text button for the low-emphasis one; in cards, align buttons to
 * keep emphasis on the content). The Row mirrors in Hebrew because Screen sets the layout
 * direction, so the buttons sit at the trailing edge in both languages.
 * Icon at the default 24 (M3 foundations.md: 24dp icon grid).
 * DESIGN DECISION (not in M3): buttons at the trailing edge, 8dp apart.
 */
function AlertsCard({ blocked, onAllow, onSettings, onHide }: { blocked: boolean; onAllow: () => void; onSettings: () => void; onHide: () => void }) {
  const { s } = useApp();
  const { colors } = useTokens();
  const t = s.notifPerm;
  return (
    <Card tone="accent">
      <Row style={{ gap: 8 }}>
        <Icon sf="bell.slash" md="notifications_off" color={colors.accent} />
        <Txt variant="headline" style={{ flex: 1 }}>
          {t.cardTitle}
        </Txt>
      </Row>
      <Txt variant="subhead">{`${t.why.chat} ${blocked ? t.blockedBody : t.next}`}</Txt>
      <Row style={{ gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Button kind="plain" label={t.notNow} onPress={onHide} />
        <Button label={blocked ? t.openSettings : t.allow} onPress={blocked ? onSettings : onAllow} />
      </Row>
    </Card>
  );
}
