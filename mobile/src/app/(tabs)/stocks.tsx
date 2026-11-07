/**
 * Stocks: the user's portfolio (תיק השקעות) and a watchlist, with free live quotes
 * (Yahoo Finance, no key) and price charts. US and Tel Aviv (.TA) symbols.
 * Recommend only: prices carry a "not a buy or sell signal" note, and the screen teaches
 * diversification first.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatPrice, formatSigned, getQuote, type Quote, StockError } from '@/engine/stocks';
import { fill, type Holding, useApp } from '@/state/app-store';
import { Appear, Button, Card, Disclaimer, Icon, IconButton, Row, SectionHeader, Txt } from '@/ui/components';
import { enterFade, Springs } from '@/ui/motion';
import { StockChart } from '@/ui/stock-chart';
import { Metrics, useTokens } from '@/ui/theme';

type Entry = { quote?: Quote; error?: StockError['code'] };

const layoutSpring = LinearTransition.springify().damping(Springs.spatialDefault.damping).stiffness(Springs.spatialDefault.stiffness);

export default function StocksScreen() {
  const { s, lang, isRTL, watchlist, addSymbol, removeSymbol, holdings, addHolding, removeHolding } = useApp();
  const { colors } = useTokens();
  const [data, setData] = useState<Record<string, Entry>>({});
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [symDraft, setSymDraft] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Quote every symbol shown on the screen once: watchlist + portfolio.
  const symbols = useMemo(() => [...new Set([...holdings.map((h) => h.symbol), ...watchlist])], [holdings, watchlist]);

  const fetchAll = useCallback(
    async (force: boolean) =>
      Object.fromEntries(
        await Promise.all(
          symbols.map(async (sym): Promise<[string, Entry]> => {
            try {
              return [sym, { quote: await getQuote(sym, force) }];
            } catch (e) {
              return [sym, { error: e instanceof StockError ? e.code : 'network' }];
            }
          }),
        ),
      ) as Record<string, Entry>,
    [symbols],
  );

  // Load on open and whenever the symbol list changes (quotes are cached for 60 s).
  useEffect(() => {
    let alive = true;
    fetchAll(false).then((r) => {
      if (!alive) return;
      setData(r);
      setUpdated(new Date());
    });
    return () => {
      alive = false;
    };
  }, [fetchAll]);

  const refresh = () => {
    setLoading(true);
    fetchAll(true)
      .then((r) => {
        setData(r);
        setUpdated(new Date());
      })
      .finally(() => setLoading(false));
  };

  const add = () => {
    addSymbol(symDraft);
    setSymDraft('');
  };

  const allFailed =
    symbols.length > 0 && symbols.every((sym) => data[sym]?.error === 'network' || data[sym]?.error === 'rateLimit');

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
          <IconButton sf="arrow.clockwise" md="refresh" label={s.stocks.refresh} onPress={refresh} />
        </Row>

        {allFailed ? (
          <Card>
            <Txt variant="subhead" color="danger">
              {s.stocks.error}
            </Txt>
          </Card>
        ) : null}

        {/* ---------- Portfolio ---------- */}
        <SectionHeader>{s.stocks.portfolio}</SectionHeader>
        <Appear index={0}>
          <Portfolio holdings={holdings} data={data} onRemove={removeHolding} />
        </Appear>
        {adding ? (
          <Animated.View entering={enterFade()}>
            <AddHolding
              onCancel={() => setAdding(false)}
              onSave={(h) => {
                addHolding(h);
                setAdding(false);
              }}
            />
          </Animated.View>
        ) : (
          <Button kind="tonal" label={s.stocks.addHolding} onPress={() => setAdding(true)} />
        )}

        {/* ---------- Watchlist ---------- */}
        <SectionHeader>{s.stocks.watchlist}</SectionHeader>
        <Appear index={1}>
          <Card style={{ gap: 0, paddingVertical: 4 }}>
            {watchlist.map((sym, i) => {
              const e = data[sym];
              const q = e?.quote;
              const expanded = open === sym;
              return (
                <Animated.View
                  key={sym}
                  layout={layoutSpring}
                  style={{ borderTopWidth: i > 0 ? 0.5 : 0, borderColor: colors.separator }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    onPress={() => setOpen(expanded ? null : sym)}
                    style={{ minHeight: 60, justifyContent: 'center', paddingVertical: 8 }}>
                    <Row>
                      <View style={{ flex: 1 }}>
                        {/* Symbols are Latin: keep them LTR inside Hebrew rows. */}
                        <Txt variant="headline" style={{ writingDirection: 'ltr' }}>
                          {sym}
                        </Txt>
                        <Txt variant="footnote" color="textSecondary" numberOfLines={1}>
                          {s.stocks.names[sym] ?? q?.name ?? ''}
                        </Txt>
                      </View>
                      {q ? <PriceTag q={q} /> : !e ? <ActivityIndicator color={colors.accent} /> : <Txt color="textSecondary">—</Txt>}
                    </Row>
                  </Pressable>
                  {expanded ? (
                    <Animated.View entering={enterFade()} style={{ paddingBottom: 12, gap: 10 }}>
                      {q ? (
                        <>
                          <StockChart symbol={sym} currency={q.currency} />
                          <Detail label={s.stocks.open} value={formatPrice(q.open, q.currency, lang)} />
                          <Detail label={s.stocks.prevClose} value={formatPrice(q.prevClose, q.currency, lang)} />
                          <Detail
                            label={s.stocks.dayRange}
                            value={`${formatPrice(q.low, q.currency, lang)} – ${formatPrice(q.high, q.currency, lang)}`}
                          />
                        </>
                      ) : e?.error === 'notFound' ? (
                        <Txt variant="footnote" color="textSecondary">
                          {fill(s.stocks.notFound, { symbol: sym })}
                        </Txt>
                      ) : null}
                      <Button kind="destructive" label={fill(s.stocks.remove, { symbol: sym })} onPress={() => removeSymbol(sym)} />
                    </Animated.View>
                  ) : null}
                </Animated.View>
              );
            })}
            <Row style={{ paddingVertical: 8, borderTopWidth: watchlist.length ? 0.5 : 0, borderColor: colors.separator }}>
              <Field
                value={symDraft}
                onChange={(t) => setSymDraft(t.toUpperCase().replace(/[^A-Z0-9.^]/g, '').slice(0, 12))}
                placeholder={s.stocks.addPlaceholder}
                onSubmit={add}
                caps
              />
              <IconButton sf="plus" md="add" tone="tonal" label={s.stocks.add} onPress={add} />
            </Row>
          </Card>
        </Appear>
        {updated ? (
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

        <Disclaimer />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Price + colored daily change badge. */
function PriceTag({ q }: { q: Quote }) {
  const { lang } = useApp();
  const { colors } = useTokens();
  const up = q.change >= 0;
  return (
    <View style={{ alignItems: 'flex-end', gap: 2 }}>
      <Txt variant="headline" style={{ writingDirection: 'ltr' }}>
        {formatPrice(q.price, q.currency, lang)}
      </Txt>
      <View style={{ backgroundColor: up ? colors.positive : colors.danger, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
        <Txt variant="caption" style={{ color: '#FFFFFF', writingDirection: 'ltr' }}>
          {formatSigned(q.changePct, q.currency, lang, true)}
        </Txt>
      </View>
    </View>
  );
}

/**
 * Portfolio card: total value and gain/loss per currency (USD and ILS holdings are not summed
 * together, since the app has no live exchange rate), then one row per holding.
 */
function Portfolio({ holdings, data, onRemove }: { holdings: Holding[]; data: Record<string, Entry>; onRemove: (id: string) => void }) {
  const { s, lang } = useApp();
  const { colors } = useTokens();

  if (!holdings.length) {
    return (
      <Card>
        <Row>
          <Icon sf="briefcase.fill" md="work" color={colors.accent} />
          <Txt variant="headline" style={{ flex: 1 }}>
            {s.stocks.portfolioEmptyTitle}
          </Txt>
        </Row>
        <Txt variant="subhead" color="textSecondary">
          {s.stocks.portfolioEmptyBody}
        </Txt>
      </Card>
    );
  }

  const totals = new Map<string, { value: number; cost: number }>();
  for (const h of holdings) {
    const q = data[h.symbol]?.quote;
    if (!q) continue;
    const t = totals.get(q.currency) ?? { value: 0, cost: 0 };
    t.value += q.price * h.shares;
    t.cost += h.buyPrice * h.shares;
    totals.set(q.currency, t);
  }

  return (
    <Card tone="accent">
      {[...totals.entries()].map(([cur, t]) => {
        const gain = t.value - t.cost;
        const pct = t.cost ? gain / t.cost : 0;
        return (
          <View key={cur} style={{ gap: 2 }}>
            <Txt variant="footnote" color="onAccentSoft">
              {s.stocks.totalValue}
            </Txt>
            <Row style={{ alignItems: 'baseline' }}>
              <Txt variant="title" color="onAccentSoft" style={{ writingDirection: 'ltr' }}>
                {formatPrice(t.value, cur, lang)}
              </Txt>
              <Txt variant="subhead" style={{ color: gain >= 0 ? colors.positive : colors.danger, writingDirection: 'ltr' }}>
                {formatSigned(gain, cur, lang)} ({formatSigned(pct, cur, lang, true)})
              </Txt>
            </Row>
          </View>
        );
      })}
      {holdings.map((h) => {
        const q = data[h.symbol]?.quote;
        const cur = q?.currency ?? 'USD';
        const value = q ? q.price * h.shares : null;
        const gain = value !== null ? value - h.buyPrice * h.shares : null;
        return (
          <Animated.View key={h.id} layout={layoutSpring}>
            <Row style={{ minHeight: Metrics.minTarget, borderTopWidth: 0.5, borderColor: colors.separator, paddingTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Txt variant="headline" color="onAccentSoft" style={{ writingDirection: 'ltr' }}>
                  {h.symbol}
                </Txt>
                <Txt variant="footnote" color="onAccentSoft">
                  {fill(s.stocks.holdingLine, { shares: h.shares, price: formatPrice(h.buyPrice, cur, lang) })}
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {value !== null && gain !== null ? (
                  <>
                    <Txt variant="headline" color="onAccentSoft" style={{ writingDirection: 'ltr' }}>
                      {formatPrice(value, cur, lang)}
                    </Txt>
                    <Txt variant="footnote" style={{ color: gain >= 0 ? colors.positive : colors.danger, writingDirection: 'ltr' }}>
                      {formatSigned(gain, cur, lang)}
                    </Txt>
                  </>
                ) : (
                  <ActivityIndicator color={colors.accent} />
                )}
              </View>
              <IconButton sf="trash" md="delete" label={fill(s.stocks.remove, { symbol: h.symbol })} onPress={() => onRemove(h.id)} />
            </Row>
          </Animated.View>
        );
      })}
    </Card>
  );
}

/** Inline form: symbol, number of shares, buy price per share. */
function AddHolding({ onSave, onCancel }: { onSave: (h: Omit<Holding, 'id'>) => void; onCancel: () => void }) {
  const { s } = useApp();
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const n = Number(shares);
  const p = Number(price);
  const valid = symbol.length > 0 && n > 0 && p > 0;
  return (
    <Card>
      <Txt variant="headline">{s.stocks.addHolding}</Txt>
      <Field
        value={symbol}
        onChange={(t) => setSymbol(t.toUpperCase().replace(/[^A-Z0-9.^]/g, '').slice(0, 12))}
        placeholder={s.stocks.symbolPlaceholder}
        caps
      />
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

function Field({
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
          textAlign: isRTL ? 'right' : 'left',
        },
      ]}
    />
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Txt variant="subhead" color="textSecondary" style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt variant="subhead" style={{ writingDirection: 'ltr' }}>
        {value}
      </Txt>
    </Row>
  );
}
