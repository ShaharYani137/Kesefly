/**
 * Portfolio editor for one symbol. Each purchase (lot) can be changed (shares, buy price) or
 * deleted, and new purchases can be added. Changes apply on Save; Remove deletes every lot.
 */
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { formatPrice } from '@/engine/stocks';
import { fill, useApp } from '@/state/app-store';
import { alertDir } from '@/ui/bidi';
import { Button, Card, IconButton, Row, Screen, Txt } from '@/ui/components';
import { Field } from '@/ui/holding-form';

type Draft = { id: string | null; shares: string; price: string };

export default function HoldingEditor() {
  const { symbol: raw } = useLocalSearchParams<{ symbol: string }>();
  const symbol = decodeURIComponent(raw ?? '').toUpperCase();
  const { s, lang, isRTL, holdings, addHolding, updateHolding, removeHolding } = useApp();
  const lots = holdings.filter((h) => h.symbol === symbol);
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    lots.length ? lots.map((h) => ({ id: h.id, shares: String(h.shares), price: String(h.buyPrice) })) : [{ id: null, shares: '', price: '' }],
  );
  const currency = symbol.endsWith('.TA') ? 'ILS' : 'USD';

  const set = (i: number, patch: Partial<Draft>) => setDrafts((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const clean = (t: string) => t.replace(/[^\d.]/g, '');

  const valid = drafts.length > 0 && drafts.every((d) => Number(d.shares) > 0 && Number(d.price) > 0);
  const totalShares = drafts.reduce((a, d) => a + (Number(d.shares) || 0), 0);
  const avg = totalShares ? drafts.reduce((a, d) => a + (Number(d.shares) || 0) * (Number(d.price) || 0), 0) / totalShares : 0;

  const save = () => {
    if (!valid) {
      alertDir(isRTL, fill(s.holding.title, { symbol }), s.holding.invalid);
      return;
    }
    const kept = new Set(drafts.map((d) => d.id).filter(Boolean));
    for (const h of lots) if (!kept.has(h.id)) removeHolding(h.id);
    for (const d of drafts) {
      const shares = Number(d.shares);
      const buyPrice = Number(d.price);
      if (d.id) updateHolding(d.id, { shares, buyPrice });
      else addHolding({ symbol, shares, buyPrice });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  const removeAll = () => {
    for (const h of lots) removeHolding(h.id);
    router.back();
  };

  return (
    <Screen title={fill(s.holding.title, { symbol })} subtitle={s.holding.subtitle} onBack={() => router.back()}>
      {drafts.map((d, i) => (
        <Card key={d.id ?? `new-${i}`}>
          <Row>
            <Txt variant="headline" style={{ flex: 1 }}>
              {fill(s.holding.lot, { n: i + 1 })}
            </Txt>
            {drafts.length > 1 ? (
              <IconButton sf="trash" md="delete" label={s.holding.deleteLot} onPress={() => setDrafts((x) => x.filter((_, j) => j !== i))} />
            ) : null}
          </Row>
          <View style={{ gap: 6 }}>
            <Txt variant="subhead" color="textSecondary">
              {s.holding.shares}
            </Txt>
            <Row>
              <Field value={d.shares} onChange={(t) => set(i, { shares: clean(t) })} placeholder={s.holding.shares} numeric />
            </Row>
            <Txt variant="subhead" color="textSecondary">
              {s.holding.price}
            </Txt>
            <Row>
              <Field value={d.price} onChange={(t) => set(i, { price: clean(t) })} placeholder={s.holding.price} numeric />
            </Row>
          </View>
        </Card>
      ))}

      <Button kind="tonal" label={s.holding.addLot} onPress={() => setDrafts((x) => [...x, { id: null, shares: '', price: '' }])} />

      {totalShares > 0 ? (
        <Txt variant="subhead" color="textSecondary">
          {fill(s.holding.total, { shares: totalShares, price: formatPrice(avg, currency, lang) })}
        </Txt>
      ) : null}

      <Button label={s.holding.save} onPress={save} disabled={!valid} />
      {lots.length ? <Button kind="destructive" label={fill(s.holding.removeAll, { symbol })} onPress={removeAll} /> : null}
    </Screen>
  );
}
