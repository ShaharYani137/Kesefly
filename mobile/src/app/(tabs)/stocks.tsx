/**
 * Stocks: watchlist with live Finnhub quotes. Recommend only: prices are shown with a
 * "not a buy or sell signal" note, and the screen teaches diversification first.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatPrice, formatSigned, getQuote, type Quote, StockError } from '@/engine/stocks';
import { fill, useApp } from '@/state/app-store';
import { Button, Card, Disclaimer, Icon, IconButton, Row, SectionHeader, Txt } from '@/ui/components';
import { Metrics, useTokens } from '@/ui/theme';

type Entry = { quote?: Quote; error?: StockError['code'] };

export default function StocksScreen() {
  const { s, lang, isRTL, finnhubKey, setFinnhubKey, watchlist, addSymbol, removeSymbol } = useApp();
  const { colors, type, isIOS } = useTokens();
  const [data, setData] = useState<Record<string, Entry>>({});
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [keyDraft, setKeyDraft] = useState('');
  const [symDraft, setSymDraft] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const fetchAll = useCallback(
    async (force: boolean) =>
      Object.fromEntries(
        await Promise.all(
          watchlist.map(async (sym): Promise<[string, Entry]> => {
            try {
              return [sym, { quote: await getQuote(sym, finnhubKey, force) }];
            } catch (e) {
              return [sym, { error: e instanceof StockError ? e.code : 'network' }];
            }
          }),
        ),
      ) as Record<string, Entry>,
    [finnhubKey, watchlist],
  );

  // Load on open and whenever the key or watchlist changes (quotes are cached for 60 s).
  useEffect(() => {
    if (!finnhubKey) return;
    let alive = true;
    fetchAll(false).then((r) => {
      if (!alive) return;
      setData(r);
      setUpdated(new Date());
    });
    return () => {
      alive = false;
    };
  }, [fetchAll, finnhubKey]);

  const refresh = () => {
    if (!finnhubKey) return;
    setLoading(true);
    fetchAll(true)
      .then((r) => {
        setData(r);
        setUpdated(new Date());
      })
      .finally(() => setLoading(false));
  };

  const badKey = Object.values(data).some((e) => e.error === 'badKey');
  const field = {
    minHeight: Metrics.fieldHeight,
    borderRadius: Metrics.fieldRadius,
    backgroundColor: isIOS ? colors.background : 'transparent',
    borderWidth: isIOS ? 0 : 1,
    borderColor: colors.separator,
    paddingHorizontal: 16,
    color: colors.text,
    textAlign: (isRTL ? 'right' : 'left') as 'right' | 'left',
  };

  const add = () => {
    addSymbol(symDraft);
    setSymDraft('');
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background, direction: isRTL ? 'rtl' : 'ltr' }}>
      <ScrollView
        contentContainerStyle={{ padding: Metrics.margin, paddingBottom: Metrics.margin * 3, gap: Metrics.gap }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.accent} colors={[colors.accent]} />}>
        <Row style={{ alignItems: 'flex-start', marginTop: 8 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="largeTitle" accessibilityRole="header">
              {s.stocks.title}
            </Txt>
            <Txt variant="subhead" color="textSecondary">
              {s.stocks.subtitle}
            </Txt>
          </View>
          {finnhubKey ? <IconButton sf="arrow.clockwise" md="refresh" label={s.stocks.refresh} onPress={refresh} /> : null}
        </Row>

        {!finnhubKey || badKey ? (
          <Card tone="accent">
            <Row>
              <Icon sf="key.fill" md="key" color={colors.onAccentSoft} />
              <Txt variant="headline" color="onAccentSoft" style={{ flex: 1 }}>
                {s.stocks.keyTitle}
              </Txt>
            </Row>
            <Txt variant="subhead" color="onAccentSoft">
              {badKey ? s.stocks.error : s.stocks.keyBody}
            </Txt>
            <Button kind="plain" label={s.stocks.keyOpen} onPress={() => Linking.openURL('https://finnhub.io/register')} />
            <TextInput
              accessibilityLabel={s.stocks.keyPlaceholder}
              value={keyDraft}
              onChangeText={setKeyDraft}
              placeholder={s.stocks.keyPlaceholder}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              style={[type.body, field, { backgroundColor: colors.card }]}
            />
            <Button
              label={s.stocks.keySave}
              disabled={keyDraft.trim().length < 10}
              onPress={() => {
                setFinnhubKey(keyDraft);
                setKeyDraft('');
              }}
            />
            <Txt variant="footnote" color="onAccentSoft">
              {s.stocks.keyStored}
            </Txt>
          </Card>
        ) : null}

        <SectionHeader>{s.stocks.watchlist}</SectionHeader>
        <Card style={{ gap: 0, paddingVertical: 4 }}>
          {watchlist.map((sym, i) => {
            const e = data[sym];
            const q = e?.quote;
            const up = (q?.change ?? 0) >= 0;
            const expanded = open === sym;
            return (
              <View key={sym} style={{ borderTopWidth: i > 0 ? 0.5 : 0, borderColor: colors.separator }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  onPress={() => setOpen(expanded ? null : sym)}
                  style={{ minHeight: 60, justifyContent: 'center', paddingVertical: 8 }}>
                  <Row>
                    <View style={{ flex: 1 }}>
                      <Txt variant="headline">{sym}</Txt>
                      <Txt variant="footnote" color="textSecondary" numberOfLines={1}>
                        {s.stocks.names[sym] ?? ''}
                      </Txt>
                    </View>
                    {q ? (
                      <View style={{ alignItems: 'flex-end' }}>
                        <Txt variant="headline">{formatPrice(q.price, lang)}</Txt>
                        <View
                          style={{
                            backgroundColor: up ? colors.positive : colors.danger,
                            borderRadius: 6,
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                          }}>
                          <Txt variant="caption" color="onAccent" style={{ color: '#FFFFFF' }}>
                            {formatSigned(q.changePct, lang, true)}
                          </Txt>
                        </View>
                      </View>
                    ) : finnhubKey && !e ? (
                      <ActivityIndicator color={colors.accent} />
                    ) : e?.error === 'notFound' ? (
                      <Txt variant="footnote" color="textSecondary">
                        —
                      </Txt>
                    ) : null}
                  </Row>
                </Pressable>
                {expanded ? (
                  <View style={{ paddingBottom: 12, gap: 6 }}>
                    {q ? (
                      <>
                        <Detail label={s.stocks.open} value={formatPrice(q.open, lang)} />
                        <Detail label={s.stocks.prevClose} value={formatPrice(q.prevClose, lang)} />
                        <Detail label={s.stocks.dayRange} value={`${formatPrice(q.low, lang)} – ${formatPrice(q.high, lang)}`} />
                      </>
                    ) : e?.error === 'notFound' ? (
                      <Txt variant="footnote" color="textSecondary">
                        {fill(s.stocks.notFound, { symbol: sym })}
                      </Txt>
                    ) : null}
                    <Button kind="destructive" label={fill(s.stocks.remove, { symbol: sym })} onPress={() => removeSymbol(sym)} />
                  </View>
                ) : null}
              </View>
            );
          })}
          <Row style={{ paddingVertical: 8, borderTopWidth: watchlist.length ? 0.5 : 0, borderColor: colors.separator }}>
            <TextInput
              accessibilityLabel={s.stocks.addPlaceholder}
              value={symDraft}
              onChangeText={(t) => setSymDraft(t.toUpperCase().replace(/[^A-Z.]/g, '').slice(0, 7))}
              placeholder={s.stocks.addPlaceholder}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              onSubmitEditing={add}
              style={[type.body, field, { flex: 1 }]}
            />
            <IconButton sf="plus" md="add" tone="tonal" label={s.stocks.add} onPress={add} />
          </Row>
        </Card>
        {updated && finnhubKey ? (
          <Txt variant="footnote" color="textSecondary">
            {fill(s.stocks.updated, {
              time: updated.toLocaleTimeString(lang === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
            })}
            {'  ·  '}
            {s.stocks.priceNote}
          </Txt>
        ) : null}
        <Txt variant="footnote" color="textSecondary">
          {s.stocks.israelNote}
        </Txt>

        <Card>
          <Row>
            <Icon sf="lightbulb.fill" md="lightbulb" color={colors.warning} />
            <Txt variant="headline" style={{ flex: 1 }}>
              {s.stocks.learnTitle}
            </Txt>
          </Row>
          <Txt variant="subhead" color="textSecondary">
            {s.stocks.learnBody}
          </Txt>
        </Card>

        {finnhubKey ? <Button kind="destructive" label={s.stocks.keyRemove} onPress={() => setFinnhubKey('')} /> : null}
        <Disclaimer />
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Txt variant="subhead" color="textSecondary" style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt variant="subhead">{value}</Txt>
    </Row>
  );
}
