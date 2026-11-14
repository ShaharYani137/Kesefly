/**
 * Records editor for one symbol: purchases (lots), sales and dividends, each with an optional
 * date and fee (dividends: tax withheld). Live summary shows shares held, average cost,
 * realized profit and dividends (engine/positions.ts, average-cost method). Prices are checked
 * against today's price to catch a wrong currency or agorot. Changes apply on Save.
 */
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';

import { position } from '@/engine/positions';
import { formatPrice, formatSigned } from '@/engine/stocks';
import { fill, newId, useApp } from '@/state/app-store';
import { guessCurrency } from '@/state/portfolio';
import { alertDir } from '@/ui/bidi';
import { Button, Card, IconButton, Row, Screen, SectionHeader, Txt } from '@/ui/components';
import { cleanDate, cleanNum, Field, PriceCheck, today, useQuote, validDate } from '@/ui/holding-form';

type LotDraft = { id: string; shares: string; price: string; date: string; fee: string };
type SaleDraft = LotDraft;
type DivDraft = { id: string; amount: string; tax: string; date: string };

const str = (v?: number) => (v ? String(v) : '');
const optNum = (t: string) => (Number(t) > 0 ? Number(t) : undefined);

export default function HoldingEditor() {
  const { symbol: raw } = useLocalSearchParams<{ symbol: string }>();
  const symbol = decodeURIComponent(raw ?? '').toUpperCase();
  const { s, lang, isRTL, holdings, sales, dividends, saveSymbolRecords, removeSymbolRecords } = useApp();
  const quote = useQuote(symbol);
  const currency = quote?.currency ?? guessCurrency(symbol);
  const money = (v: number) => formatPrice(v, currency, lang);

  const myLots = holdings.filter((h) => h.symbol === symbol);
  const mySales = sales.filter((x) => x.symbol === symbol);
  const myDivs = dividends.filter((x) => x.symbol === symbol);
  const hasAny = myLots.length + mySales.length + myDivs.length > 0;

  const [lots, setLots] = useState<LotDraft[]>(() =>
    myLots.length
      ? myLots.map((h) => ({ id: h.id, shares: String(h.shares), price: String(h.buyPrice), date: h.date ?? '', fee: str(h.fee) }))
      : [{ id: newId(), shares: '', price: '', date: today(), fee: '' }],
  );
  const [sells, setSells] = useState<SaleDraft[]>(() =>
    mySales.map((x) => ({ id: x.id, shares: String(x.shares), price: String(x.price), date: x.date ?? '', fee: str(x.fee) })),
  );
  const [divs, setDivs] = useState<DivDraft[]>(() => myDivs.map((x) => ({ id: x.id, amount: String(x.amount), tax: str(x.tax), date: x.date ?? '' })));

  const patch = <T extends { id: string }>(set: (f: (x: T[]) => T[]) => void, id: string, p: Partial<T>) =>
    set((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const lotsIn = lots.map((d) => ({ shares: Number(d.shares) || 0, buyPrice: Number(d.price) || 0, date: d.date || undefined, fee: optNum(d.fee) }));
  const salesIn = sells.map((d) => ({ shares: Number(d.shares) || 0, price: Number(d.price) || 0, date: d.date || undefined, fee: optNum(d.fee) }));
  const divsIn = divs.map((d) => ({ amount: Number(d.amount) || 0, tax: optNum(d.tax), date: d.date || undefined }));
  const pos = position(lotsIn, salesIn, divsIn);
  const bought = lotsIn.reduce((a, l) => a + l.shares, 0);
  const oversold = pos.sold > bought + 1e-9;

  const problem = (() => {
    if (!lots.length || lots.some((d) => !(Number(d.shares) > 0 && Number(d.price) > 0))) return s.holding.invalid;
    if (sells.some((d) => !(Number(d.shares) > 0 && Number(d.price) > 0))) return s.ledger.invalidSale;
    if (divs.some((d) => !(Number(d.amount) > 0))) return s.ledger.invalidDividend;
    if ([...lots, ...sells, ...divs].some((d) => !validDate(d.date))) return s.ledger.badDate;
    if (oversold) return s.ledger.oversell;
    return null;
  })();

  const save = () => {
    if (problem) {
      alertDir(isRTL, fill(s.holding.title, { symbol }), problem);
      return;
    }
    saveSymbolRecords(symbol, {
      lots: lots.map((d) => ({ id: d.id, shares: Number(d.shares), buyPrice: Number(d.price), ...(d.date ? { date: d.date } : {}), ...(optNum(d.fee) ? { fee: optNum(d.fee) } : {}) })),
      sales: sells.map((d) => ({ id: d.id, shares: Number(d.shares), price: Number(d.price), ...(d.date ? { date: d.date } : {}), ...(optNum(d.fee) ? { fee: optNum(d.fee) } : {}) })),
      dividends: divs.map((d) => ({ id: d.id, amount: Number(d.amount), ...(optNum(d.tax) ? { tax: optNum(d.tax) } : {}), ...(d.date ? { date: d.date } : {}) })),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  const removeAll = () => {
    removeSymbolRecords(symbol);
    router.back();
  };

  return (
    <Screen title={fill(s.holding.title, { symbol })} subtitle={s.holding.subtitle} onBack={() => router.back()}>
      <Txt variant="footnote" color="textSecondary">
        {quote ? `${fill(s.ledger.inCurrency, { cur: currency })} · ${fill(s.ledger.priceNow, { price: money(quote.price) })}` : fill(s.ledger.inCurrency, { cur: currency })}
      </Txt>

      {/* ---------- Purchases ---------- */}
      <SectionHeader>{s.ledger.purchases}</SectionHeader>
      {lots.map((d, i) => (
        <RecordCard
          key={d.id}
          title={fill(s.holding.lot, { n: i + 1 })}
          deleteLabel={s.holding.deleteLot}
          onDelete={lots.length > 1 ? () => setLots((x) => x.filter((y) => y.id !== d.id)) : undefined}>
          <Labeled label={s.holding.shares}>
            <Field value={d.shares} onChange={(t) => patch(setLots, d.id, { shares: cleanNum(t) })} placeholder={s.holding.shares} numeric />
          </Labeled>
          <Labeled label={`${s.holding.price} (${currency})`}>
            <Field value={d.price} onChange={(t) => patch(setLots, d.id, { price: cleanNum(t) })} placeholder={s.holding.price} numeric />
          </Labeled>
          <PriceCheck price={Number(d.price)} quote={quote} />
          <DateFee date={d.date} fee={d.fee} cur={currency} onDate={(t) => patch(setLots, d.id, { date: t })} onFee={(t) => patch(setLots, d.id, { fee: t })} />
        </RecordCard>
      ))}
      <Button kind="tonal" label={s.holding.addLot} onPress={() => setLots((x) => [...x, { id: newId(), shares: '', price: '', date: today(), fee: '' }])} />

      {/* ---------- Sales ---------- */}
      <SectionHeader>{s.ledger.sales}</SectionHeader>
      {sells.map((d, i) => (
        <RecordCard key={d.id} title={fill(s.ledger.sale, { n: i + 1 })} deleteLabel={s.ledger.deleteSale} onDelete={() => setSells((x) => x.filter((y) => y.id !== d.id))}>
          <Labeled label={s.holding.shares}>
            <Field value={d.shares} onChange={(t) => patch(setSells, d.id, { shares: cleanNum(t) })} placeholder={s.holding.shares} numeric />
          </Labeled>
          <Labeled label={`${s.ledger.salePrice} (${currency})`}>
            <Field value={d.price} onChange={(t) => patch(setSells, d.id, { price: cleanNum(t) })} placeholder={s.ledger.salePrice} numeric />
          </Labeled>
          <PriceCheck price={Number(d.price)} quote={quote} />
          <DateFee date={d.date} fee={d.fee} cur={currency} onDate={(t) => patch(setSells, d.id, { date: t })} onFee={(t) => patch(setSells, d.id, { fee: t })} />
        </RecordCard>
      ))}
      <Button kind="tonal" label={s.ledger.addSale} onPress={() => setSells((x) => [...x, { id: newId(), shares: '', price: '', date: today(), fee: '' }])} />

      {/* ---------- Dividends ---------- */}
      <SectionHeader>{s.ledger.dividends}</SectionHeader>
      {divs.map((d, i) => (
        <RecordCard key={d.id} title={fill(s.ledger.dividend, { n: i + 1 })} deleteLabel={s.ledger.deleteDividend} onDelete={() => setDivs((x) => x.filter((y) => y.id !== d.id))}>
          <Labeled label={`${s.ledger.amount} (${currency})`}>
            <Field value={d.amount} onChange={(t) => patch(setDivs, d.id, { amount: cleanNum(t) })} placeholder={s.ledger.amount} numeric />
          </Labeled>
          <Row>
            <Field value={d.tax} onChange={(t) => patch(setDivs, d.id, { tax: cleanNum(t) })} placeholder={`${s.ledger.tax} (${currency})`} numeric />
            <Field value={d.date} onChange={(t) => patch(setDivs, d.id, { date: cleanDate(t) })} placeholder={s.ledger.date} numeric />
          </Row>
        </RecordCard>
      ))}
      <Button kind="tonal" label={s.ledger.addDividend} onPress={() => setDivs((x) => [...x, { id: newId(), amount: '', tax: '', date: today() }])} />

      {/* ---------- Summary ---------- */}
      <Card>
        <Line label={s.ledger.held} value={pos.shares ? fill(s.holding.total, { shares: pos.shares, price: money(pos.avgCost) }) : '0'} />
        {sells.length ? <Line label={s.ledger.realized} value={formatSigned(pos.realized, currency, lang)} tone={pos.realized} /> : null}
        {divs.length ? <Line label={s.ledger.dividendsNet} value={formatSigned(pos.dividends, currency, lang)} tone={pos.dividends} /> : null}
        {pos.fees ? <Line label={s.ledger.feesPaid} value={money(pos.fees)} /> : null}
      </Card>
      {problem ? (
        <Txt variant="footnote" color="danger">
          {problem}
        </Txt>
      ) : null}

      <Button label={s.holding.save} onPress={save} disabled={!!problem} />
      {hasAny ? <Button kind="destructive" label={fill(s.holding.removeAll, { symbol })} onPress={removeAll} /> : null}
    </Screen>
  );
}

function RecordCard({ title, deleteLabel, onDelete, children }: { title: string; deleteLabel: string; onDelete?: () => void; children: ReactNode }) {
  return (
    <Card>
      <Row>
        <Txt variant="headline" style={{ flex: 1 }}>
          {title}
        </Txt>
        {onDelete ? <IconButton sf="trash" md="delete" label={deleteLabel} onPress={onDelete} /> : null}
      </Row>
      <View style={{ gap: 6 }}>{children}</View>
    </Card>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <Txt variant="subhead" color="textSecondary">
        {label}
      </Txt>
      <Row>{children}</Row>
    </>
  );
}

function DateFee({ date, fee, cur, onDate, onFee }: { date: string; fee: string; cur: string; onDate: (t: string) => void; onFee: (t: string) => void }) {
  const { s } = useApp();
  return (
    <>
      <Row>
        <Field value={date} onChange={(t) => onDate(cleanDate(t))} placeholder={s.ledger.date} numeric />
        <Field value={fee} onChange={(t) => onFee(cleanNum(t))} placeholder={`${s.ledger.fee} (${cur})`} numeric />
      </Row>
      {!validDate(date) ? (
        <Txt variant="footnote" color="danger">
          {s.ledger.badDate}
        </Txt>
      ) : null}
    </>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: number }) {
  return (
    <Row>
      <Txt variant="subhead" color="textSecondary" style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt variant="subhead" color={tone === undefined ? 'text' : tone >= 0 ? 'positive' : 'danger'} style={{ writingDirection: 'ltr' }}>
        {value}
      </Txt>
    </Row>
  );
}
