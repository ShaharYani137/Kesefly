/** Portfolio form pieces shared by the Stocks tab and the stock page. */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { formatPrice, getQuote, isTicker, type Quote } from '@/engine/stocks';
import { searchSymbols, type SymbolMatch } from '@/engine/search';
import { fill, type Holding, useApp } from '@/state/app-store';
import { guessCurrency } from '@/state/portfolio';
import { Button, Card, Row, SymbolBadge, Txt } from '@/ui/components';
import { cleanNum } from '@/ui/num-input';
import { Metrics, useTokens } from '@/ui/theme';

const HEBREW = /[֐-׿]/;

/** Today as YYYY-MM-DD in local time: default date for new records. */
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** Empty (no date) or a real YYYY-MM-DD date. */
export const validDate = (t: string) => !t || (/^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(t)));
/** Digits only, dashes added as you type (20250314 becomes 2025-03-14), so the number pad works. */
export const cleanDate = (t: string) => {
  const d = t.replace(/\D/g, '').slice(0, 8);
  return d.length > 6 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}` : d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d;
};
export { cleanNum };

/** Live quote for a symbol, fetched 400 ms after it stops changing. Null until it arrives or when not found. */
export function useQuote(symbol: string): Quote | null {
  const [got, setGot] = useState<{ symbol: string; quote: Quote | null }>({ symbol: '', quote: null });
  useEffect(() => {
    if (!symbol) return;
    let alive = true;
    const t = setTimeout(() => {
      getQuote(symbol)
        .then((quote) => alive && setGot({ symbol, quote }))
        .catch(() => alive && setGot({ symbol, quote: null }));
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [symbol]);
  return got.symbol === symbol ? got.quote : null;
}

/**
 * Warns when a typed price is far from today's price: more than 3x off. Between 30x and 300x
 * above a shekel price it is most likely agorot. Shown under the field; does not block Save.
 * The 3x / agorot bands are a design decision.
 */
export function PriceCheck({ price, quote }: { price: number; quote: Quote | null }) {
  const { s, lang } = useApp();
  if (!quote || !(price > 0) || !(quote.price > 0)) return null;
  const ratio = price / quote.price;
  if (ratio <= 3 && ratio >= 1 / 3) return null;
  const now = formatPrice(quote.price, quote.currency, lang);
  const text =
    quote.currency === 'ILS' && ratio >= 30 && ratio <= 300
      ? fill(s.ledger.agorotWarn, { price: now })
      : fill(s.ledger.farWarn, { price: now, cur: quote.currency });
  return (
    <Txt variant="footnote" color="danger">
      {text}
    </Txt>
  );
}

/**
 * Inline form: stock (search by ticker, company name in English or Hebrew, or TASE security
 * number), number of shares, buy price per share.
 */
export function AddHolding({ onSave, onCancel, symbol: initial = '' }: { onSave: (h: Omit<Holding, 'id'>) => void; onCancel: () => void; symbol?: string }) {
  const { s, lang } = useApp();
  const { colors } = useTokens();
  const [query, setQuery] = useState(initial);
  const [picked, setPicked] = useState<SymbolMatch | null>(initial ? { symbol: initial, name: '', exchange: '' } : null);
  // Results tagged with their query, so stale results never show for a newer query.
  const [results, setResults] = useState<{ q: string; list: SymbolMatch[] }>({ q: '', list: [] });
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(today);
  const [fee, setFee] = useState('');

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
  const valid = symbol.length > 0 && n > 0 && p > 0 && validDate(date);
  const quote = useQuote(symbol);
  const cur = quote?.currency ?? (symbol ? guessCurrency(symbol) : '');
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
        <Field value={shares} onChange={(t) => setShares(cleanNum(t))} placeholder={s.stocks.shares} numeric />
        <Field value={price} onChange={(t) => setPrice(cleanNum(t))} placeholder={cur ? `${s.stocks.buyPrice} (${cur})` : s.stocks.buyPrice} numeric />
      </Row>
      <Row>
        <Field value={date} onChange={(t) => setDate(cleanDate(t))} placeholder={s.ledger.date} numeric="digits" />
        <Field value={fee} onChange={(t) => setFee(cleanNum(t))} placeholder={cur ? `${s.ledger.fee} (${cur})` : s.ledger.fee} numeric />
      </Row>
      <Txt variant="footnote" color="textSecondary">
        {quote
          ? `${fill(s.ledger.inCurrency, { cur: quote.currency })} · ${fill(s.ledger.priceNow, { price: formatPrice(quote.price, quote.currency, lang) })}`
          : s.stocks.buyPriceHint}
      </Txt>
      <PriceCheck price={p} quote={quote} />
      {!validDate(date) ? (
        <Txt variant="footnote" color="danger">
          {s.ledger.badDate}
        </Txt>
      ) : null}
      <Row>
        <View style={{ flex: 1 }}>
          <Button kind="tonal" label={s.settings.cancel} onPress={onCancel} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={s.common.save} disabled={!valid} onPress={() => onSave({ symbol, shares: n, buyPrice: p, ...(date ? { date } : {}), ...(Number(fee) > 0 ? { fee: Number(fee) } : {}) })} />
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
  /** true: decimal pad. 'digits': number pad, for dates (cleanDate adds the dashes). */
  numeric?: boolean | 'digits';
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
      keyboardType={numeric === 'digits' ? 'number-pad' : numeric ? 'decimal-pad' : 'default'}
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
