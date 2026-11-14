/** Portfolio form pieces shared by the Stocks tab and the stock page. */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { isTicker } from '@/engine/stocks';
import { searchSymbols, type SymbolMatch } from '@/engine/search';
import { type Holding, useApp } from '@/state/app-store';
import { Button, Card, Row, SymbolBadge, Txt } from '@/ui/components';
import { Metrics, useTokens } from '@/ui/theme';

const HEBREW = /[֐-׿]/;

/**
 * Inline form: stock (search by ticker, company name in English or Hebrew, or TASE security
 * number), number of shares, buy price per share.
 */
export function AddHolding({ onSave, onCancel, symbol: initial = '' }: { onSave: (h: Omit<Holding, 'id'>) => void; onCancel: () => void; symbol?: string }) {
  const { s } = useApp();
  const { colors } = useTokens();
  const [query, setQuery] = useState(initial);
  const [picked, setPicked] = useState<SymbolMatch | null>(initial ? { symbol: initial, name: '', exchange: '' } : null);
  // Results tagged with their query, so stale results never show for a newer query.
  const [results, setResults] = useState<{ q: string; list: SymbolMatch[] }>({ q: '', list: [] });
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');

  // Search 350 ms after typing stops; a newer query cancels the older request.
  useEffect(() => {
    const q = query.trim();
    if (picked || q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchSymbols(q, ctrl.signal).then((list) => {
        if (!ctrl.signal.aborted) setResults({ q, list });
      });
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, picked]);

  // A typed ticker (e.g. AAPL) is valid without picking from the list.
  const typed = query.trim().toUpperCase();
  const symbol = picked?.symbol ?? (isTicker(typed) ? typed : '');
  const n = Number(shares);
  const p = Number(price);
  const valid = symbol.length > 0 && n > 0 && p > 0;
  const showList = !picked && query.trim().length >= 2;
  const busy = results.q !== query.trim();
  const matches = busy ? [] : results.list;
  return (
    <Card>
      <Txt variant="headline">{s.stocks.addHolding}</Txt>
      <Field
        value={query}
        onChange={(t) => {
          setQuery(t.slice(0, 40));
          setPicked(null);
        }}
        placeholder={s.stocks.searchPlaceholder}
      />
      {picked?.name ? (
        <Txt variant="footnote" color="textSecondary">
          {`${picked.symbol} · ${picked.name}${picked.taseId ? ` · ${picked.taseId}` : ''}`}
        </Txt>
      ) : null}
      {showList ? (
        <View style={{ borderRadius: Metrics.fieldRadius, borderWidth: 1, borderColor: colors.separator, overflow: 'hidden' }}>
          {busy ? (
            <View style={{ minHeight: 48, justifyContent: 'center' }}>
              <ActivityIndicator color={colors.textSecondary} />
            </View>
          ) : matches.length ? (
            matches.map((m, i) => (
              <Pressable
                key={m.symbol}
                accessibilityRole="button"
                accessibilityLabel={`${m.symbol} ${m.name}`}
                onPress={() => {
                  setPicked(m);
                  setQuery(m.symbol);
                }}
                style={({ pressed }) => ({
                  minHeight: 56,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: colors.separator,
                  opacity: pressed ? 0.6 : 1,
                })}>
                <SymbolBadge symbol={m.symbol} size={36} />
                <View style={{ flex: 1 }}>
                  <Txt variant="body" numberOfLines={1}>
                    {m.name}
                  </Txt>
                  <Txt variant="footnote" color="textSecondary" numberOfLines={1}>
                    {[m.symbol, m.exchange, m.taseId].filter(Boolean).join(' · ')}
                  </Txt>
                </View>
              </Pressable>
            ))
          ) : (
            <Txt variant="footnote" color="textSecondary" style={{ padding: 12 }}>
              {isTicker(typed) ? s.stocks.searchPick : s.stocks.searchNoMatch}
            </Txt>
          )}
        </View>
      ) : null}
      <Row>
        <Field value={shares} onChange={(t) => setShares(t.replace(/[^\d.]/g, ''))} placeholder={s.stocks.shares} numeric />
        <Field value={price} onChange={(t) => setPrice(t.replace(/[^\d.]/g, ''))} placeholder={s.stocks.buyPrice} numeric />
      </Row>
      <Txt variant="footnote" color="textSecondary">
        {s.stocks.buyPriceHint}
      </Txt>
      <Row>
        <View style={{ flex: 1 }}>
          <Button kind="tonal" label={s.settings.cancel} onPress={onCancel} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={s.common.save} disabled={!valid} onPress={() => onSave({ symbol, shares: n, buyPrice: p })} />
        </View>
      </Row>
    </Card>
  );
}

export function Field({
  value,
  onChange,
  placeholder,
  onSubmit,
  caps,
  numeric,
}: {
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  onSubmit?: () => void;
  caps?: boolean;
  numeric?: boolean;
}) {
  const { colors, type, isIOS } = useTokens();
  const { isRTL } = useApp();
  return (
    <TextInput
      accessibilityLabel={placeholder}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      autoCapitalize={caps ? 'characters' : 'none'}
      autoCorrect={false}
      keyboardType={numeric ? 'decimal-pad' : 'default'}
      onSubmitEditing={onSubmit}
      style={[
        type.body,
        {
          flex: 1,
          minHeight: Metrics.fieldHeight,
          borderRadius: Metrics.fieldRadius,
          backgroundColor: isIOS ? colors.background : 'transparent',
          borderWidth: isIOS ? 0 : 1,
          borderColor: colors.separator,
          paddingHorizontal: 16,
          color: colors.text,
          // Tickers and numbers are Latin: type them left-to-right; Hebrew text and placeholders follow the language.
          textAlign: value && !HEBREW.test(value) ? 'left' : isRTL || HEBREW.test(value) ? 'right' : 'left',
          writingDirection: value && !HEBREW.test(value) ? 'ltr' : isRTL || HEBREW.test(value) ? 'rtl' : 'ltr',
        },
      ]}
    />
  );
}
