/**
 * "Ask Kesefly": offline helper chat. Answers come from `engine/helper.ts` (rule-based,
 * uses the user's own numbers). Stock symbols trigger a live Finnhub quote when a key is set.
 */
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { answer } from '@/engine/helper';
import { formatPrice, formatSigned, getQuote, StockError } from '@/engine/stocks';
import { fill, useApp } from '@/state/app-store';
import { Chip, HelperAvatar, IconButton, Row, Txt } from '@/ui/components';
import { Metrics, useTokens } from '@/ui/theme';

type Msg = { id: number; from: 'user' | 'helper'; text: string };

let nextId = 1;

export default function HelperScreen() {
  const app = useApp();
  const { s, lang, isRTL, profile, finnhubKey, watchlist } = app;
  const { colors, type, isIOS } = useTokens();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [msgs, setMsgs] = useState<Msg[]>(() => [{ id: nextId++, from: 'helper', text: s.helper.welcome }]);
  const [draft, setDraft] = useState('');
  const list = useRef<FlatList<Msg>>(null);
  const lastQ = useRef<string | undefined>(undefined);

  const push = (m: Omit<Msg, 'id'>) => {
    const id = nextId++;
    setMsgs((prev) => [...prev, { ...m, id }]);
    return id;
  };
  const replace = (id: number, text: string) => setMsgs((prev) => prev.map((m) => (m.id === id ? { ...m, text } : m)));

  const ask = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t) return;
      push({ from: 'user', text: t });
      const reply = answer(t, { s, profile, lang, watchlist });
      if ('text' in reply) {
        push({ from: 'helper', text: reply.text });
        return;
      }
      const a = s.helper.answers;
      if (!finnhubKey) {
        push({ from: 'helper', text: a.quoteNoKey });
        return;
      }
      const id = push({ from: 'helper', text: s.stocks.loading });
      try {
        const qt = await getQuote(reply.quote, finnhubKey);
        replace(
          id,
          fill(a.quote, {
            symbol: qt.symbol,
            price: formatPrice(qt.price, lang),
            change: formatSigned(qt.change, lang),
            pct: formatSigned(qt.changePct, lang, true),
            low: formatPrice(qt.low, lang),
            high: formatPrice(qt.high, lang),
          }),
        );
      } catch (e) {
        replace(id, e instanceof StockError && e.code === 'noKey' ? a.quoteNoKey : fill(a.quoteFail, { symbol: reply.quote }));
      }
    },
    [s, profile, lang, watchlist, finnhubKey],
  );

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

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background, direction: isRTL ? 'rtl' : 'ltr' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Row style={{ paddingHorizontal: Metrics.margin, paddingVertical: 8 }}>
          <HelperAvatar size={40} />
          <View style={{ flex: 1 }}>
            <Txt variant="title3" accessibilityRole="header">
              {s.helper.title}
            </Txt>
            <Txt variant="footnote" color="textSecondary">
              {s.helper.subtitle}
            </Txt>
          </View>
          <IconButton sf="square.and.pencil" md="edit_square" label={s.helper.clear} onPress={clear} />
        </Row>

        <FlatList
          ref={list}
          data={msgs}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: Metrics.margin, gap: 12 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <Bubble msg={item} />}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: Metrics.margin, gap: 8, paddingBottom: 8 }}>
          {s.helper.suggestions.map((sug) => (
            <Chip key={sug} label={sug} onPress={() => ask(sug)} />
          ))}
        </ScrollView>

        <Row style={{ paddingHorizontal: Metrics.margin, paddingBottom: 8, gap: 8 }}>
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
            style={[
              type.body,
              {
                flex: 1,
                minHeight: Metrics.minTarget,
                maxHeight: 120,
                borderRadius: 24,
                backgroundColor: isIOS ? colors.card : colors.fill,
                paddingHorizontal: 16,
                paddingVertical: 10,
                color: colors.text,
                textAlign: isRTL ? 'right' : 'left',
                writingDirection: isRTL ? 'rtl' : 'ltr',
              },
            ]}
          />
          {/* Send icon mirrors in RTL (M3 layout.md). */}
          <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
            <IconButton sf="arrow.up" md="send" tone="filled" label={s.helper.send} onPress={send} />
          </View>
        </Row>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const { colors } = useTokens();
  const mine = msg.from === 'user';
  return (
    <Row style={{ alignItems: 'flex-end', justifyContent: mine ? 'flex-end' : 'flex-start', gap: 8 }}>
      {mine ? null : <HelperAvatar size={28} />}
      <View
        style={{
          maxWidth: '80%',
          backgroundColor: mine ? colors.accent : colors.card,
          borderRadius: 20,
          borderBottomEndRadius: mine ? 6 : 20,
          borderBottomStartRadius: mine ? 20 : 6,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}>
        <Txt variant="body" color={mine ? 'onAccent' : 'text'}>
          {msg.text}
        </Txt>
      </View>
    </Row>
  );
}
