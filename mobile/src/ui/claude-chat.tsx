/**
 * Kesefly AI chat with the user's own API key from any AI company: Claude through the official
 * SDK (engine/claude.ts), every other company through its OpenAI-compatible API
 * (engine/ai-providers.ts). Shown on the Helper tab
 * when a key is saved and the switch is on; the offline helper stays one tap away.
 *
 * - The reply streams in as Claude writes it; Stop aborts the request.
 * - Each chat is saved with its full context and continues where it left off; New chat and a
 *   list of saved chats in the header.
 * - Memory notes (Settings > AI chat) go into every chat; Claude may add to them (save_memory).
 * - The user's Kesefly numbers are sent only when they switched "Share my numbers" on.
 * Keyboard and tab-bar handling copy the offline helper (see helper.tsx).
 */
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { type ComponentRef, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Pressable, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type ChatMsg, PROVIDERS, ProviderError, streamChat } from '@/engine/ai-providers';
import { type AiModel, type BetaMessageParam, errorKind, runTurn, systemPrompt, visibleText } from '@/engine/claude';
import { netHoldings } from '@/engine/positions';
import { journal, journalStats } from '@/lab/paper';
import { fill, useApp } from '@/state/app-store';
import { type Chat, newChatId, useAi } from '@/state/ai-store';
import { useLab } from '@/state/lab-store';
import { Button, Card, HelperAvatar, IconButton, Row, Txt } from '@/ui/components';
import { useKeyboardInset } from '@/ui/keyboard';
import { showDialog } from '@/ui/dialog';
import { Metrics, useTokens } from '@/ui/theme';

/** DESIGN DECISION: non-Claude providers get the latest 40 messages (no server-side compaction there). */
const GENERIC_HISTORY = 40;

type Line = { key: string; from: 'user' | 'ai' | 'note'; text: string };

/** Turns saved messages into chat lines (tool results and empty blocks are skipped). */
function lines(messages: BetaMessageParam[]): Line[] {
  const out: Line[] = [];
  messages.forEach((m, i) => {
    const t = visibleText(m).trim();
    if (!t) return;
    const prev = out[out.length - 1];
    const from = m.role === 'user' ? 'user' : 'ai';
    // A tool round splits one answer over several assistant messages: join them.
    if (prev && prev.from === 'ai' && from === 'ai') prev.text += `\n\n${t}`;
    else out.push({ key: String(i), from, text: t });
  });
  return out;
}

/** "**bold**" to bold runs; everything else plain. */
function Rich({ text, color }: { text: string; color: 'text' | 'onAccent' }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Txt variant="body" color={color} selectable>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Txt key={i} variant="headline" color={color}>
            {p.slice(2, -2)}
          </Txt>
        ) : (
          p.replace(/^#{1,6}\s+/gm, '')
        ),
      )}
    </Txt>
  );
}

export function ClaudeChat({ onOffline }: { onOffline: () => void }) {
  const app = useApp();
  const { s, lang, isRTL } = app;
  const ai = useAi();
  const lab = useLab();
  const { colors, type, isIOS } = useTokens();
  const { ref: kbRef, inset: kbInset, open: kbOpen } = useKeyboardInset();
  const list = useRef<FlatList<Line>>(null);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const abort = useRef<AbortController | null>(null);
  // True while the user scrolled up to read: the chat then stops following the reply, so the
  // screen scrolls freely while the AI types. Back near the bottom, it follows again.
  const reading = useRef(false);
  /** Finger on the list: never move it then. */
  const dragging = useRef(false);
  const follow = (animated: boolean) => {
    if (!reading.current && !dragging.current) list.current?.scrollToEnd({ animated });
  };
  /** At rest after a drag or fling: follow again only when the user is back at the bottom. */
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    reading.current = contentSize.height - (contentOffset.y + layoutMeasurement.height) > 80;
  };
  // Streamed text is drawn at most every 80 ms (DESIGN DECISION), not once per word, so the list
  // is not re-rendered dozens of times a second while the user scrolls.
  const pending = useRef<{ user: string; text: string } | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showLive = (user: string, text: string) => {
    pending.current = { user, text };
    if (flushTimer.current) return;
    flushTimer.current = setTimeout(() => {
      flushTimer.current = null;
      if (pending.current) setLive(pending.current);
      requestAnimationFrame(() => follow(false));
    }, 80);
  };
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'thinking' | 'searching' | 'writing' | null>(null);
  const [live, setLive] = useState<{ user: string; text: string } | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showChats, setShowChats] = useState(false);

  const chat = ai.chats.find((c) => c.id === ai.currentId) ?? null;
  const claude = ai.provider === 'anthropic';
  const providerLabel = ai.provider === 'custom' ? s.ai.other : PROVIDERS[ai.provider].name;
  const modelLabel = claude ? (s.ai.models[ai.model as AiModel] ?? ai.model) : ai.model;
  const shown = useMemo(() => {
    const base: Line[] = [{ key: 'welcome', from: 'ai', text: fill(s.ai.welcome, { provider: providerLabel }) }, ...lines(chat?.messages ?? [])];
    if (live) base.push({ key: 'live-u', from: 'user', text: live.user }, { key: 'live-a', from: 'ai', text: live.text || (status === 'searching' ? s.ai.searching : s.ai.thinking) });
    notes.forEach((n, i) => base.push({ key: `note${i}`, from: 'note', text: fill(s.ai.saved, { note: n }) }));
    return base;
  }, [chat, live, status, notes, s, providerLabel]);

  const dataSummary = () => {
    if (!ai.shareData) return null;
    const p = app.profile;
    const h = netHoldings(app.holdings, app.sales);
    const j = journalStats(journal(lab.account));
    return [
      `Country ${p.country}, currency ${p.currency}, risk ${p.risk}.`,
      `Monthly income ${p.monthlyIncome}, expenses ${p.monthlyExpenses}, plans to invest ${p.monthlyInvest} a month.`,
      `Cash savings ${p.cashSavings}, investments ${p.investments}, high-interest debt ${p.highInterestDebt}.`,
      p.goalName ? `Goal: ${p.goalName}, ${p.goalAmount} in ${p.goalYears} years.` : '',
      h.length ? `Holdings: ${h.map((x) => `${x.symbol} ${x.shares} shares at ${x.buyPrice}`).join('; ')}.` : 'No holdings recorded.',
      app.savings.length ? `Long-term savings: ${app.savings.map((a) => `${a.kind} ${a.balance} (+${a.monthly}/month)`).join('; ')}.` : '',
      j.trades ? `Day-trading lab practice: ${j.trades} closed trades, win rate ${Math.round((j.winRate ?? 0) * 100)}%, average ${j.avgR}R.` : '',
    ]
      .filter(Boolean)
      .join('\n');
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    const key = await ai.readKey();
    if (!key) {
      setError(s.ai.errors.noKey);
      return;
    }
    setDraft('');
    setError(null);
    setNotes([]);
    reading.current = false;
    setBusy(true);
    setLive({ user: text, text: '' });
    Haptics.selectionAsync().catch(() => {});
    const ctl = new AbortController();
    abort.current = ctl;
    const id = chat?.id ?? newChatId();
    const history = chat?.messages ?? [];
    const saved: string[] = [];
    try {
      const d = new Date();
      const system = systemPrompt({ lang, today: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, memory: ai.memory, data: dataSummary(), autoMemory: claude && ai.autoMemory });
      if (!claude) {
        // Any other company: OpenAI-compatible Chat Completions, plain text history.
        const past: ChatMsg[] = history
          .map((m) => ({ role: m.role, content: visibleText(m).trim() }) as ChatMsg)
          .filter((m) => m.content)
          .slice(-GENERIC_HISTORY);
        const out = await streamChat(
          [{ role: 'system', content: system }, ...past, { role: 'user', content: text }],
          { baseUrl: ai.provider === 'custom' ? ai.customUrl : PROVIDERS[ai.provider].baseUrl, apiKey: key, model: ai.model, signal: ctl.signal },
          (t) => {
            setStatus('writing');
            showLive(text, t);
          },
        );
        const reply = out.aborted ? `${out.text}\n${s.ai.stopped}`.trim() : out.text;
        ai.saveChat({ id, title: chat?.title ?? text.slice(0, 60), messages: [...history, { role: 'user', content: text }, { role: 'assistant', content: reply || '…' }], updatedAt: Date.now() });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        return;
      }
      const res = await runTurn(
        history,
        text,
        {
          apiKey: key,
          model: ai.model as AiModel,
          effort: ai.effort,
          webSearch: ai.webSearch,
          autoMemory: ai.autoMemory,
          system,
          signal: ctl.signal,
        },
        {
          onText: (t) => {
            showLive(text, t);
          },
          onStatus: setStatus,
          onMemory: (n) => {
            saved.push(n);
            ai.addMemory(n);
            setNotes((x) => [...x, n]);
          },
        },
      );
      let messages = res.messages;
      if (res.stop === 'aborted') {
        // Keep what arrived, marked as stopped, so the chat stays consistent.
        messages = [...history, { role: 'user', content: text }, { role: 'assistant', content: `${res.text}\n${s.ai.stopped}`.trim() }];
      }
      if (res.stop === 'refusal') setError(s.ai.errors.refusal);
      const c: Chat = { id, title: chat?.title ?? text.slice(0, 60), messages, updatedAt: Date.now() };
      ai.saveChat(c);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (e) {
      const k = e instanceof ProviderError ? e.kind : errorKind(e);
      setError(k === 'other' ? fill(s.ai.errors.other, { msg: e instanceof Error ? e.message.slice(0, 160) : String(e) }) : s.ai.errors[k]);
      setDraft(text);
    } finally {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = null;
      pending.current = null;
      setLive(null);
      setStatus(null);
      setBusy(false);
      abort.current = null;
      setTimeout(() => follow(true), 100);
    }
  };

  const newChat = () => {
    if (busy) return;
    ai.openChat(null);
    setNotes([]);
    setError(null);
    setShowChats(false);
  };

  const removeChat = (c: Chat) =>
    showDialog(s.ai.deleteChat, c.title, [
      { text: s.ai.cancel, style: 'cancel' },
      { text: s.ai.delete, style: 'destructive', onPress: () => ai.deleteChat(c.id) },
    ]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background, direction: isRTL ? 'rtl' : 'ltr' }}>
      <View ref={kbRef} style={{ flex: 1, paddingBottom: kbInset }}>
        {/* Header: the title column takes the room left by three icons and stays on one line each
            (a long model name ends with "…"); the offline switch lives in the chats panel. */}
        <Row style={{ paddingHorizontal: Metrics.margin, paddingVertical: 8, gap: 4 }}>
          <HelperAvatar size={40} />
          <View style={{ flex: 1, minWidth: 0, marginStart: 8 }}>
            <Txt variant="title3" accessibilityRole="header" numberOfLines={1}>
              {s.ai.chatTitle}
            </Txt>
            <Txt variant="footnote" color="textSecondary" numberOfLines={1} ellipsizeMode="tail">
              {claude ? `Claude ${modelLabel}` : modelLabel}
            </Txt>
          </View>
          <IconButton sf="clock.arrow.circlepath" md="history" label={s.ai.history} onPress={() => setShowChats((v) => !v)} />
          <IconButton sf="square.and.pencil" md="edit_square" label={s.ai.newChat} onPress={newChat} />
          <IconButton sf="gearshape" md="settings" label={s.ai.title} onPress={() => router.push('/ai-settings')} />
        </Row>

        {showChats ? (
          <Card style={{ marginHorizontal: Metrics.margin, gap: 0, paddingVertical: 4, maxHeight: 340 }}>
            {ai.chats.length ? (
              <FlatList
                data={ai.chats}
                keyExtractor={(c) => c.id}
                renderItem={({ item, index }) => (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      ai.openChat(item.id);
                      setShowChats(false);
                      setNotes([]);
                    }}
                    onLongPress={() => removeChat(item)}
                    style={{ minHeight: Metrics.minTarget, justifyContent: 'center', borderTopWidth: index ? 0.5 : 0, borderColor: colors.separator, paddingVertical: 8 }}>
                    <Txt variant="body" numberOfLines={1} style={{ color: item.id === ai.currentId ? colors.accent : colors.text }}>
                      {item.title || s.ai.untitled}
                    </Txt>
                    <Txt variant="caption" color="textSecondary">
                      {new Date(item.updatedAt).toLocaleString(lang === 'he' ? 'he-IL' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </Txt>
                  </Pressable>
                )}
              />
            ) : (
              <Txt color="textSecondary" style={{ paddingVertical: 10 }}>
                {s.ai.noChats}
              </Txt>
            )}
            <Button kind="plain" label={s.ai.offline} onPress={onOffline} />
          </Card>
        ) : null}

        <FlatList
          ref={list}
          data={shown}
          keyExtractor={(m) => m.key}
          contentContainerStyle={{ padding: Metrics.margin, paddingBottom: Metrics.margin * 2, gap: 12 }}
          onContentSizeChange={() => follow(true)}
          onScrollBeginDrag={() => {
            dragging.current = true;
            reading.current = true;
          }}
          onScrollEndDrag={(e) => {
            dragging.current = false;
            settle(e);
          }}
          onMomentumScrollEnd={settle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onTouchStart={() => Keyboard.dismiss()}
          renderItem={({ item }) =>
            item.from === 'note' ? (
              <Txt variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
                {item.text}
              </Txt>
            ) : (
              <View
                style={{
                  alignSelf: item.from === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  backgroundColor: item.from === 'user' ? colors.accent : colors.card,
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}>
                <Rich text={item.text} color={item.from === 'user' ? 'onAccent' : 'text'} />
              </View>
            )
          }
          ListFooterComponent={
            <View style={{ gap: 6, paddingTop: 4 }}>
              {error ? (
                <Txt variant="subhead" color="danger">
                  {error}
                </Txt>
              ) : null}
              <Txt variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
                {s.ai.disclaimer}
              </Txt>
            </View>
          }
        />

        <View style={{ borderTopWidth: 0.5, borderColor: colors.separator, backgroundColor: colors.background, paddingTop: 8, paddingBottom: kbOpen ? 6 : 10 }}>
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
              borderWidth: 1,
              borderColor: draft ? colors.accent : 'transparent',
              paddingStart: 16,
              paddingEnd: 4,
              paddingVertical: 4,
            }}>
            <TextInput
              ref={input}
              accessibilityLabel={s.ai.placeholder}
              value={draft}
              onChangeText={setDraft}
              placeholder={s.ai.placeholder}
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={1}
              style={[type.body, { flex: 1, maxHeight: 140, paddingVertical: 10, color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
            />
            {busy ? (
              <IconButton sf="stop.fill" md="stop" tone="filled" label={s.ai.stop} onPress={() => abort.current?.abort()} />
            ) : (
              <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }], opacity: draft.trim() ? 1 : 0.4 }}>
                <IconButton sf="arrow.up" md="send" tone="filled" label={s.ai.send} onPress={send} />
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
