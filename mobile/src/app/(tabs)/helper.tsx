/**
 * "Ask Kesefly": helper chat. Answers come from `engine/assistant.ts`: on-phone reasoning over
 * the user's own numbers, live data (prices, history, news, FX, market hours) and the web
 * (Wikipedia) for general questions. It learns from use (`engine/brain.ts`): favorite stocks and
 * topics become personal suggestion chips, and thumbs up / down steer future answers.
 *
 * Thinking: while it works, the bubble shows a pulsing, orbiting avatar, a shimmer bar and the
 * steps it is taking ("Getting live prices…", "Reading the latest news…"), for at least
 * THINK_MS. The answer then types itself in (TYPE_MS per character, capped).
 *
 * Keyboard: Android runs edge-to-edge, so the window does not resize for the keyboard and
 * KeyboardAvoidingView had no effect there. `useKeyboardInset` pads the screen by the exact
 * overlap instead (both platforms), and the suggestion chips hide while typing.
 */
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Pressable, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type Action, ask as assistantAsk, type Memory, type ThinkStep, thinkingSteps } from '@/engine/assistant';
import { type AnswerSource, favorites, feedback, getBrain, loadBrain } from '@/engine/brain';
import { fill, useApp } from '@/state/app-store';
import { Chip, HelperAvatar, Icon, IconButton, Row, Txt } from '@/ui/components';
import { HScroll } from '@/ui/hscroll';
import { useKeyboardInset } from '@/ui/keyboard';
import { enterBubble } from '@/ui/motion';
import { Metrics, useTokens } from '@/ui/theme';

type Msg = {
  id: number;
  from: 'user' | 'helper';
  text: string;
  question?: string;
  thinking?: ThinkStep[];
  actions?: Action[];
  source?: AnswerSource;
  rated?: boolean;
  /** Related next questions for this answer (shown under the latest one). */
  followUps?: string[];
};

/** DESIGN DECISIONS: minimum thinking time, time per status step, typewriter speed. */
const THINK_MS = 1800;
const STEP_MS = 650;
const TYPE_MS = 14;
const TYPE_MAX_MS = 2200;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let nextId = 1;

export default function HelperScreen() {
  const { s, lang, isRTL, profile, watchlist, holdings, academy } = useApp();
  const memory = useRef<Memory>({});
  const { ref: kbRef, inset: kbInset, open: kbOpen } = useKeyboardInset();
  const { colors, type, isIOS } = useTokens();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [msgs, setMsgs] = useState<Msg[]>(() => [{ id: nextId++, from: 'helper', text: s.helper.welcome }]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [usual, setUsual] = useState<{ tickers: string[]; learned: number }>({ tickers: [], learned: 0 });
  const list = useRef<FlatList<Msg>>(null);
  // True while the user is reading older messages (scrolled up): auto-scroll then leaves the
  // screen alone, so touching and scrolling feel free. Back near the bottom, it follows again.
  const reading = useRef(false);
  const follow = (animated: boolean) => {
    if (!reading.current) list.current?.scrollToEnd({ animated });
  };
  const lastQ = useRef<string | undefined>(undefined);

  useEffect(() => {
    loadBrain().then((b) => setUsual({ tickers: favorites(3).tickers, learned: b.questions }));
  }, []);

  // Keep the newest message in view when the keyboard opens.
  useEffect(() => {
    if (kbOpen) setTimeout(() => follow(true), 60);
  }, [kbOpen, kbInset]);

  const push = (m: Omit<Msg, 'id'>) => {
    const id = nextId++;
    setMsgs((prev) => [...prev, { ...m, id }]);
    return id;
  };
  const patch = (id: number, p: Partial<Msg>) => setMsgs((prev) => prev.map((m) => (m.id === id ? { ...m, ...p } : m)));

  const ask = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || busy) return;
      setBusy(true);
      reading.current = false;
      push({ from: 'user', text: t });
      Haptics.selectionAsync().catch(() => {});
      const id = push({ from: 'helper', text: '', thinking: thinkingSteps(t, watchlist) });
      const [reply] = await Promise.all([
        assistantAsk(t, { s, lang, profile, watchlist, holdings, academy, memory: memory.current }),
        wait(THINK_MS),
      ]);
      // Typewriter reveal.
      const full = reply.text;
      const step = Math.max(1, Math.ceil(full.length / (TYPE_MAX_MS / TYPE_MS)));
      for (let n = step; n < full.length; n += step) {
        patch(id, { text: full.slice(0, n), thinking: undefined });
        // Follow the text as it grows, so the whole answer stays in view while it types.
        requestAnimationFrame(() => follow(false));
        await wait(TYPE_MS);
      }
      patch(id, {
        text: full,
        thinking: undefined,
        actions: reply.actions,
        source: reply.source,
        question: t,
        followUps: reply.followUps,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      // Once more after the action and follow-up chips appear under the answer.
      setTimeout(() => follow(true), 120);
      setTimeout(() => follow(true), 450);
      setUsual({ tickers: favorites(3).tickers, learned: getBrain().questions });
      setBusy(false);
    },
    [s, profile, lang, watchlist, holdings, academy, busy],
  );

  const rate = (m: Msg, good: boolean) => {
    if (!m.question || !m.source) return;
    feedback(m.question, m.source, good);
    patch(m.id, { rated: true });
    Haptics.selectionAsync().catch(() => {});
  };

  // Question handed over from Home ("Ask me about this").
  useEffect(() => {
    if (q && q !== lastQ.current) {
      lastQ.current = q;
      ask(q);
    }
  }, [q, ask]);

  const send = () => {
    ask(draft);
    setDraft('');
  };

  const clear = () => setMsgs([{ id: nextId++, from: 'helper', text: s.helper.welcome }]);

  // Personal chips first (stocks the user asks about most), then the standard suggestions.
  const chips = useMemo(() => [...usual.tickers, ...s.helper.suggestions], [usual.tickers, s.helper.suggestions]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background, direction: isRTL ? 'rtl' : 'ltr' }}>
      <View ref={kbRef} style={{ flex: 1, paddingBottom: kbInset }}>
        <Row style={{ paddingHorizontal: Metrics.margin, paddingVertical: 8 }}>
          <HelperAvatar size={40} />
          <View style={{ flex: 1 }}>
            <Txt variant="title3" accessibilityRole="header">
              {s.helper.title}
            </Txt>
            <Txt variant="footnote" color="textSecondary">
              {usual.learned > 0 ? fill(s.assistant.learned, { n: usual.learned }) : s.helper.subtitle}
            </Txt>
          </View>
          <IconButton sf="square.and.pencil" md="edit_square" label={s.helper.clear} onPress={clear} />
        </Row>

        <FlatList
          ref={list}
          data={msgs}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: Metrics.margin, paddingBottom: Metrics.margin * 2, gap: 12 }}
          onContentSizeChange={() => follow(true)}
          onLayout={() => follow(false)}
          keyboardShouldPersistTaps="handled"
          // Touching the conversation frees the screen: dragging closes the keyboard, a tap on
          // empty space closes it too, and scrolling up pauses auto-scroll.
          keyboardDismissMode="on-drag"
          onTouchStart={() => Keyboard.dismiss()}
          onScrollBeginDrag={() => {
            reading.current = true;
          }}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            if (contentSize.height - (contentOffset.y + layoutMeasurement.height) < 80) reading.current = false;
          }}
          scrollEventThrottle={100}
          renderItem={({ item, index }) => <Bubble msg={item} onRate={rate} last={index === msgs.length - 1} onAsk={ask} />}
        />

        {/* Composer: quick commands + one rounded input bar with the send button inside.
            Chips stay visible while typing, so commands are one tap away with the keyboard open. */}
        <View
          style={{
            borderTopWidth: 0.5,
            borderColor: colors.separator,
            backgroundColor: colors.background,
            paddingTop: 8,
            gap: 8,
            paddingBottom: kbOpen ? 6 : 10,
          }}>
          <HScroll padding={Metrics.margin}>
            {chips.map((sug, i) => (
              <Chip
                key={sug}
                label={sug}
                sf={i < usual.tickers.length ? 'star.fill' : undefined}
                md={i < usual.tickers.length ? 'star' : undefined}
                onPress={() => ask(sug)}
              />
            ))}
          </HScroll>

          <View
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
              accessibilityLabel={s.helper.placeholder}
              value={draft}
              onChangeText={setDraft}
              placeholder={s.helper.placeholder}
              placeholderTextColor={colors.textSecondary}
              onSubmitEditing={send}
              returnKeyType="send"
              submitBehavior="submit"
              multiline
              numberOfLines={1}
              style={[
                type.body,
                {
                  flex: 1,
                  maxHeight: 120,
                  paddingVertical: 10,
                  color: colors.text,
                  textAlign: isRTL ? 'right' : 'left',
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                },
              ]}
            />
            {/* Send icon mirrors in RTL (M3 layout.md). Dimmed when there is nothing to send. */}
            <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }], opacity: busy || !draft.trim() ? 0.4 : 1 }}>
              <IconButton sf="arrow.up" md="send" tone="filled" label={s.helper.send} onPress={send} />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Bubble({
  msg,
  onRate,
  last,
  onAsk,
}: {
  msg: Msg;
  onRate: (m: Msg, good: boolean) => void;
  last: boolean;
  onAsk: (q: string) => void;
}) {
  const { s } = useApp();
  const { colors } = useTokens();
  const mine = msg.from === 'user';
  const done = !mine && !msg.thinking && msg.source;
  return (
    <>
      <Animated.View
        entering={enterBubble()}
        style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: mine ? 'flex-end' : 'flex-start', gap: 8 }}>
        {mine ? null : msg.thinking ? <ThinkingAvatar /> : <HelperAvatar size={28} />}
        <View
          style={{
            maxWidth: '82%',
            backgroundColor: mine ? colors.accent : colors.card,
            borderRadius: 20,
            borderBottomEndRadius: mine ? 6 : 20,
            borderBottomStartRadius: mine ? 20 : 6,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}>
          {msg.thinking ? (
            <Thinking steps={msg.thinking} />
          ) : (
            <Txt variant="body" color={mine ? 'onAccent' : 'text'}>
              {msg.text}
            </Txt>
          )}
          {msg.actions?.length && !msg.thinking ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {msg.actions.map((a) => (
                <Chip
                  key={a.href}
                  label={a.label}
                  sf="arrow.up.right"
                  md="open_in_new"
                  onPress={() =>
                    a.href.startsWith('http') ? WebBrowser.openBrowserAsync(a.href).catch(() => {}) : router.push(a.href as never)
                  }
                />
              ))}
            </View>
          ) : null}
          {done ? (
            msg.rated ? (
              <Animated.View entering={FadeIn.duration(250)}>
                <Txt variant="caption" color="textSecondary" style={{ marginTop: 6 }}>
                  {s.assistant.feedbackThanks}
                </Txt>
              </Animated.View>
            ) : (
              <Row style={{ gap: 4, marginTop: 4 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={s.assistant.helpful}
                  onPress={() => onRate(msg, true)}
                  hitSlop={8}
                  style={{ padding: 6 }}>
                  <Icon sf="hand.thumbsup" md="thumb_up" size={18} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={s.assistant.notHelpful}
                  onPress={() => onRate(msg, false)}
                  hitSlop={8}
                  style={{ padding: 6 }}>
                  <Icon sf="hand.thumbsdown" md="thumb_down" size={18} color={colors.textSecondary} />
                </Pressable>
              </Row>
            )
          ) : null}
        </View>
      </Animated.View>
      {last && done && msg.followUps?.length ? (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, paddingStart: 36 }}>
          {msg.followUps.map((f) => (
            <Chip key={f} label={f} sf="arrow.turn.down.right" md="subdirectory_arrow_right" onPress={() => onAsk(f)} />
          ))}
        </Animated.View>
      ) : null}
    </>
  );
}

/** Avatar that pulses and has a small gold dot orbiting it while the helper thinks. */
function ThinkingAvatar() {
  const pulse = useSharedValue(0);
  const orbit = useSharedValue(0);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }), -1, true));
    orbit.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false));
  }, [pulse, orbit]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.25 + pulse.value * 0.35, transform: [{ scale: 1 + pulse.value * 0.25 }] }));
  const dot = useAnimatedStyle(() => {
    const a = orbit.value * Math.PI * 2;
    return { transform: [{ translateX: Math.cos(a) * 19 }, { translateY: Math.sin(a) * 19 }] };
  });
  return (
    <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[{ position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: '#F5C542' }, ring]}
      />
      <HelperAvatar size={28} />
      <Animated.View style={[{ position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#F5C542' }, dot]} />
    </View>
  );
}

/** Status line that walks through the steps, bouncing dots, and a shimmer bar. */
function Thinking({ steps }: { steps: ThinkStep[] }) {
  const { s } = useApp();
  const { colors } = useTokens();
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), STEP_MS);
    return () => clearInterval(id);
  }, [steps.length]);
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.set(withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, false));
  }, [shimmer]);
  const bar = useAnimatedStyle(() => ({ transform: [{ translateX: -60 + shimmer.value * 220 }] }));
  return (
    <View style={{ gap: 8, minWidth: 190 }}>
      <Row style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[0, 1, 2].map((k) => (
            <Dot key={k} delay={k * 140} />
          ))}
        </View>
        {/* Plain text swap: layout "entering" animations do not run reliably inside a FlatList row
            on Android and left this text transparent. */}
        <Txt variant="subhead" color="textSecondary" style={{ flexShrink: 1 }}>
          {s.assistant.thinking[steps[i]]}
        </Txt>
      </Row>
      {/* Shimmer runs left-to-right like a progress bar (M3 layout.md: progress stays LTR). */}
      <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.fill, overflow: 'hidden', direction: 'ltr' }}>
        <Animated.View style={[{ width: 60, height: 4, borderRadius: 2, backgroundColor: colors.accent }, bar]} />
      </View>
      {/* Step progress: one segment per step. */}
      <View style={{ flexDirection: 'row', gap: 3, direction: 'ltr' }}>
        {steps.map((st, k) => (
          <View
            key={`${st}${k}`}
            style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: k <= i ? colors.accent : colors.fill }}
          />
        ))}
      </View>
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const { colors } = useTokens();
  const y = useSharedValue(0);
  useEffect(() => {
    y.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(withTiming(-5, { duration: 260 }), withTiming(0, { duration: 260 }), withTiming(0, { duration: 200 })),
          -1,
        ),
      ),
    );
  }, [y, delay]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: 0.5 + (-y.value / 5) * 0.5 }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent }, style]} />;
}
