/**
 * Stocks: market overview strip, the user's portfolio (תיק השקעות) as a hero card with live
 * value, today's change, value chart and allocation donut (all in the user's currency via the
 * live USD/ILS rate), holdings, and a watchlist with sparklines. Rows open the stock page.
 * Free data: Yahoo Finance, no key. Recommend only: prices carry a "not a signal" note.
 */
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatPrice, formatSigned, MARKET_TILES, type Quote } from '@/engine/stocks';
import { fill, useApp } from '@/state/app-store';
import { usePortfolio } from '@/state/portfolio';
import { Donut, Sparkline } from '@/ui/charts';
import { HScroll } from '@/ui/hscroll';
import { AddHolding, Field } from '@/ui/holding-form';
import {
  Appear,
  Button,
  Card,
  ChangeBadge,
  CountUp,
  Disclaimer,
  Icon,
  IconButton,
  Row,
  SectionHeader,
  Segmented,
  SymbolBadge,
  Txt,
} from '@/ui/components';
import { enterFade, Springs } from '@/ui/motion';
import { StockChart } from '@/ui/stock-chart';
import { Fonts, Metrics, useTokens } from '@/ui/theme';

const layoutSpring = LinearTransition.springify().damping(Springs.spatialDefault.damping).stiffness(Springs.spatialDefault.stiffness);

export default function StocksScreen() {
  const { s, lang, isRTL, watchlist, addSymbol, holdings, addHolding } = useApp();
  const { colors } = useTokens();
  const [symDraft, setSymDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [sort, setSort] = useState<'mine' | 'movers'>('mine');
  const extra = useMemo(() => [...watchlist, ...MARKET_TILES], [watchlist]);
  const pf = usePortfolio(extra);

  const add = () => {
    if (!symDraft) return;
    addSymbol(symDraft);
    setSymDraft('');
    Haptics.selectionAsync().catch(() => {});
  };

  const list = useMemo(() => {
    if (sort === 'mine') return watchlist;
    return [...watchlist].sort((a, b) => Math.abs(pf.quotes[b]?.changePct ?? 0) - Math.abs(pf.quotes[a]?.changePct ?? 0));
  }, [sort, watchlist, pf.quotes]);

  const open = (sym: string) => router.push({ pathname: '/stock/[symbol]', params: { symbol: sym } });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background, direction: isRTL ? 'rtl' : 'ltr' }}>
      <ScrollView
        contentContainerStyle={{ paddingVertical: Metrics.margin, paddingBottom: Metrics.margin * 3, gap: Metrics.gap }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={pf.loading} onRefresh={pf.refresh} tintColor={colors.accent} colors={[colors.accent]} />}>
        <Row style={{ alignItems: 'flex-start', marginTop: 8, paddingHorizontal: Metrics.margin }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="largeTitle" accessibilityRole="header">
              {s.stocks.title}
            </Txt>
            <Txt variant="subhead" color="textSecondary">
              {s.stocks.subtitle}
            </Txt>
          </View>
          <IconButton sf="bell.badge" md="notifications" label={s.events.title} onPress={() => router.push('/events')} />
          <IconButton sf="arrow.clockwise" md="refresh" label={s.stocks.refresh} onPress={pf.refresh} />
        </Row>

        {pf.failed ? (
          <View style={{ paddingHorizontal: Metrics.margin }}>
            <Card>
              <Txt variant="subhead" color="danger">
                {s.stocks.error}
              </Txt>
            </Card>
          </View>
        ) : null}

        {/* ---------- Market strip ---------- */}
        <MarketStrip quotes={pf.quotes} onOpen={open} />

        <View style={{ paddingHorizontal: Metrics.margin, gap: Metrics.gap }}>
          {/* ---------- Portfolio ---------- */}
          <SectionHeader>{s.stocks.portfolio}</SectionHeader>
          <Appear index={0}>
            {holdings.length ? (
              <PortfolioHero pf={pf} />
            ) : (
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
            )}
          </Appear>

          {pf.rows.length ? (
            <Card style={{ gap: 0, paddingVertical: 4 }}>
              {pf.rows.map((r, i) => (
                <Animated.View key={r.symbol} layout={layoutSpring} style={{ borderTopWidth: i ? 0.5 : 0, borderColor: colors.separator }}>
                  <Pressable accessibilityRole="button" onPress={() => open(r.symbol)} style={{ paddingVertical: 10, gap: 8 }}>
                    <Row>
                      <SymbolBadge symbol={r.symbol} />
                      <View style={{ flex: 1 }}>
                        <Txt variant="headline" style={{ writingDirection: 'ltr' }}>
                          {r.symbol}
                        </Txt>
                        <Txt variant="footnote" color="textSecondary">
                          {fill(s.stocks.holdingLine, { shares: r.shares, price: formatPrice(r.avgCost, r.quote?.currency ?? 'USD', lang) })}
                        </Txt>
                      </View>
                      <IconButton sf="pencil" md="edit" label={`${s.holding.edit} ${r.symbol}`} onPress={() => router.push({ pathname: '/holding/[symbol]', params: { symbol: r.symbol } })} />
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        {r.quote ? (
                          <>
                            <Txt variant="headline" style={{ writingDirection: 'ltr' }}>
                              {formatPrice(r.value, pf.cur, lang)}
                            </Txt>
                            <ChangeBadge pct={r.value - r.cost} text={formatSigned(r.cost ? r.value / r.cost - 1 : 0, 'USD', lang, true)} />
                          </>
                        ) : (
                          <ActivityIndicator color={colors.accent} />
                        )}
                      </View>
                    </Row>
                    {/* Weight bar: share of the portfolio. Bars stay LTR (M3 layout.md). */}
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.fill, overflow: 'hidden', direction: 'ltr' }}>
                      <View style={{ width: `${Math.round(r.weight * 100)}%`, height: 4, borderRadius: 2, backgroundColor: colors.accent }} />
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
            </Card>
          ) : null}

          {adding ? (
            <Animated.View entering={enterFade()}>
              <AddHolding
                onCancel={() => setAdding(false)}
                onSave={(h) => {
                  addHolding(h);
                  setAdding(false);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                }}
              />
            </Animated.View>
          ) : (
            <Button kind="tonal" label={s.stocks.addHolding} onPress={() => setAdding(true)} />
          )}

          {/* ---------- Watchlist ---------- */}
          <SectionHeader>{s.stocks.watchlist}</SectionHeader>
          <Segmented<'mine' | 'movers'>
            value={sort}
            onChange={setSort}
            options={[
              { value: 'mine', label: s.stock.sortDefault },
              { value: 'movers', label: s.stock.sortMovers },
            ]}
          />
          <Appear index={1}>
            <Card style={{ gap: 0, paddingVertical: 4 }}>
              {list.map((sym, i) => {
                const q = pf.quotes[sym];
                return (
                  <Animated.View key={sym} layout={layoutSpring} style={{ borderTopWidth: i ? 0.5 : 0, borderColor: colors.separator }}>
                    <Pressable accessibilityRole="button" onPress={() => open(sym)} style={{ minHeight: 64, justifyContent: 'center', paddingVertical: 8 }}>
                      <Row>
                        <SymbolBadge symbol={sym} size={36} />
                        <View style={{ flex: 1 }}>
                          <Txt variant="headline" style={{ writingDirection: 'ltr' }}>
                            {sym}
                          </Txt>
                          <Txt variant="footnote" color="textSecondary" numberOfLines={1}>
                            {s.stocks.names[sym] ?? q?.name ?? ''}
                          </Txt>
                        </View>
                        <Sparkline symbol={sym} />
                        <View style={{ alignItems: 'flex-end', gap: 2, minWidth: 84 }}>
                          {q ? (
                            <>
                              <Txt variant="subhead" style={{ writingDirection: 'ltr', fontFamily: Fonts.semibold }}>
                                {formatPrice(q.price, q.currency, lang)}
                              </Txt>
                              <ChangeBadge pct={q.changePct} text={formatSigned(q.changePct, q.currency, lang, true)} />
                            </>
                          ) : pf.loading ? (
                            <ActivityIndicator color={colors.accent} />
                          ) : (
                            <Txt color="textSecondary">—</Txt>
                          )}
                        </View>
                      </Row>
                    </Pressable>
                  </Animated.View>
                );
              })}
              <Row style={{ paddingVertical: 8, borderTopWidth: watchlist.length ? 0.5 : 0, borderColor: colors.separator }}>
                <Field
                  value={symDraft}
                  onChange={(t) => setSymDraft(t.toUpperCase().replace(/[^A-Z0-9.^=-]/g, '').slice(0, 12))}
                  placeholder={s.stocks.addPlaceholder}
                  onSubmit={add}
                  caps
                />
                <IconButton sf="plus" md="add" tone="tonal" label={s.stocks.add} onPress={add} />
              </Row>
            </Card>
          </Appear>
          {pf.updated ? (
            <Txt variant="footnote" color="textSecondary">
              {fill(s.stocks.updated, {
                time: pf.updated.toLocaleTimeString(lang === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Horizontal index / FX / commodity tiles. In Hebrew the list starts at the right (inverted). */
function MarketStrip({ quotes, onOpen }: { quotes: Record<string, Quote>; onOpen: (s: string) => void }) {
  const { s, lang, isRTL } = useApp();
  const { colors } = useTokens();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ paddingHorizontal: Metrics.margin }}>
        <SectionHeader>{s.market.title}</SectionHeader>
      </View>
      <HScroll gap={10} padding={Metrics.margin} contentStyle={{ paddingTop: 8 }}>
        {MARKET_TILES.map((item) => {
          const q = quotes[item];
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              onPress={() => onOpen(item)}
              style={{ width: 148, backgroundColor: colors.card, borderRadius: Metrics.cardRadius, padding: 12, gap: 6, direction: isRTL ? 'rtl' : 'ltr' }}>
              <Txt variant="footnote" color="textSecondary" numberOfLines={1}>
                {s.market.tiles[item]}
              </Txt>
              <Txt variant="headline" style={{ writingDirection: 'ltr' }} numberOfLines={1}>
                {q ? (item === 'ILS=X' ? q.price.toFixed(3) : formatPrice(q.price, q.currency, lang)) : '—'}
              </Txt>
              <Row style={{ justifyContent: 'space-between', gap: 6 }}>
                {q ? <ChangeBadge pct={q.changePct} text={formatSigned(q.changePct, 'USD', lang, true)} /> : <View />}
                <Sparkline symbol={item} width={52} height={22} />
              </Row>
            </Pressable>
          );
        })}
      </HScroll>
    </View>
  );
}

function PortfolioHero({ pf }: { pf: ReturnType<typeof usePortfolio> }) {
  const { s, lang } = useApp();
  const { colors } = useTokens();
  const gain = pf.total - pf.cost;
  const money = (v: number) => formatPrice(v, pf.cur, lang);
  const onHero = colors.onHero;
  const muted = 'rgba(255,255,255,0.72)';
  const up = '#7EE2A8';
  const down = '#FF8A80';
  return (
    <View style={{ backgroundColor: colors.hero, borderRadius: Metrics.cardRadius + 8, padding: 18, gap: 14, overflow: 'hidden' }}>
      {/* Soft gold glow in the corner: brand decoration only. */}
      <View style={{ position: 'absolute', top: -60, end: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(245,197,66,0.12)' }} />
      <View style={{ gap: 2 }}>
        <Txt variant="footnote" style={{ color: muted }}>
          {s.stocks.totalValue}
        </Txt>
        <CountUp value={pf.total} format={money} style={{ color: onHero, fontFamily: Fonts.bold, fontSize: 34, lineHeight: 41, writingDirection: 'ltr', textAlign: 'left' }} />
        <Row style={{ gap: 14 }}>
          <Txt variant="subhead" style={{ color: pf.day >= 0 ? up : down, writingDirection: 'ltr' }}>
            {`${s.stock.dayChange} ${formatSigned(pf.day, pf.cur, lang)}`}
          </Txt>
          <Txt variant="subhead" style={{ color: gain >= 0 ? up : down, writingDirection: 'ltr' }}>
            {`${s.stock.totalGain} ${formatSigned(gain, pf.cur, lang)} (${formatSigned(pf.cost ? gain / pf.cost : 0, pf.cur, lang, true)})`}
          </Txt>
        </Row>
      </View>
      {pf.rows.some((r) => r.quote) ? (
        <StockChart symbol={`portfolio:${pf.rows.map((r) => `${r.symbol}x${r.shares}`).join(',')}`} currency={pf.cur} load={pf.history} ranges={['1W', '1M', '6M', '1Y']} initial="1M" height={130} tone="hero" />
      ) : null}
      <View style={{ height: 0.5, backgroundColor: 'rgba(255,255,255,0.2)' }} />
      <Txt variant="footnote" style={{ color: muted }}>
        {s.stock.allocation}
      </Txt>
      <Donut slices={pf.rows.map((r) => ({ label: r.symbol, value: r.value }))} textColor={onHero} mutedColor={muted} surface="rgba(255,255,255,0.08)" />
      {pf.rate ? (
        <Txt variant="caption" style={{ color: muted }}>
          {fill(s.stock.convertedNote, { cur: pf.cur, rate: pf.rate.toFixed(3) })}
        </Txt>
      ) : null}
    </View>
  );
}
