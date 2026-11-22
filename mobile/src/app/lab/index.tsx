/**
 * Day-Trading Lab hub: both markets' session state, the practice account, open practice trades
 * (live P&L, close or cancel), and the ways in: Scanner, Journal, Lab settings, lessons.
 * Practice only: no real orders.
 */
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';

import { getQuotes, type Quote } from '@/engine/stocks';
import { openOrders, type PaperOrder } from '@/lab/paper';
import { nextSession, phaseOf, sessionFor, type Zone } from '@/lab/sessions';
import { fill, useApp } from '@/state/app-store';
import { useLab } from '@/state/lab-store';
import { Appear, Button, Card, Row, Screen, SectionHeader, Txt } from '@/ui/components';
import { GateGuard, LabFine, MarketFlag, PracticeChip, useLabFormat } from '@/ui/lab-ui';
import { LineItem, ToolRow } from '@/ui/money-ui';
import { showDialog } from '@/ui/dialog';
import { useTokens } from '@/ui/theme';

export default function LabHub() {
  return (
    <GateGuard>
      <Hub />
    </GateGuard>
  );
}

function SessionCard({ zone, now }: { zone: Zone; now: number }) {
  const { s, lang } = useApp();
  const f = useLabFormat();
  const { colors } = useTokens();
  const today = sessionFor(zone, now);
  const phase = phaseOf(today, now);
  const next = nextSession(zone, now);
  const shown = today && now < today.closeMs ? today : next;
  const open = phase === 'entries';
  return (
    <Card style={{ flex: 1, gap: 4 }}>
      <Row style={{ gap: 8 }}>
        <MarketFlag zone={zone} />
        <Txt variant="footnote" color="textSecondary" style={{ flex: 1 }}>
          {s.lab.markets[zone]}
        </Txt>
      </Row>
      <Txt variant="headline" style={{ color: open ? colors.positive : colors.text }}>
        {s.lab.phase[phase]}
      </Txt>
      {shown ? (
        <Txt variant="caption" color="textSecondary">
          {today && now < today.closeMs
            ? fill(s.lab.sessionLine, { or: f.clock(zone, shown.orEndMs), until: f.clock(zone, shown.entriesUntilMs), flat: f.clock(zone, shown.flatByMs) })
            : fill(s.lab.nextOpen, { day: new Date(shown.openMs).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { weekday: 'short' }), time: f.clock(zone, shown.openMs) })}
        </Txt>
      ) : null}
      {shown?.early ? (
        <Txt variant="caption" color="warning">
          {s.lab.earlyClose}
        </Txt>
      ) : null}
    </Card>
  );
}

function TradeRow({ o, q }: { o: PaperOrder; q?: Quote }) {
  const { s } = useApp();
  const lab = useLab();
  const f = useLabFormat();
  const live = q?.price ?? null;
  const pnl = o.fill && live != null ? o.qty * (live - o.fill.price) : null;
  const close = () => {
    const title = o.status === 'pending' ? s.lab.hub.cancel : s.lab.hub.close;
    showDialog(title, `${o.symbol} · ${o.qty}`, [
      { text: s.lab.ticket.cancel, style: 'cancel' },
      { text: title, style: 'destructive', onPress: () => lab.closeOrder(o.id, live) },
    ]);
  };
  return (
    <Card>
      <Row>
        <MarketFlag zone={o.currency === 'ILS' ? 'TLV' : 'NY'} />
        <Txt variant="headline" style={{ flex: 1 }}>{`${o.symbol} · ${o.qty}`}</Txt>
        <PracticeChip />
      </Row>
      <Txt variant="subhead" color="textSecondary">
        {o.status === 'pending' ? fill(s.lab.hub.pending, { price: f.money(o.limit ?? o.planEntry, o.currency) }) : `${s.lab.hub.open} ${f.money(o.fill?.price ?? 0, o.currency)}`}
      </Txt>
      <LineItem label={s.lab.plan.stop} value={f.money(o.stop, o.currency)} color="danger" />
      <LineItem label={s.lab.plan.target} value={f.money(o.target, o.currency)} color="positive" />
      <LineItem label={s.lab.plan.flatBy} value={f.time(o.currency === 'ILS' ? 'TLV' : 'NY', o.flatByMs)} />
      {pnl != null ? <LineItem label={fill(s.lab.hub.pnl, { v: '' }).trim()} value={f.signed(pnl, o.currency)} color={pnl >= 0 ? 'positive' : 'danger'} strong /> : null}
      <Button kind="destructive" label={o.status === 'pending' ? s.lab.hub.cancel : s.lab.hub.close} onPress={close} />
    </Card>
  );
}

function Hub() {
  const { s } = useApp();
  const lab = useLab();
  const f = useLabFormat();
  const [now, setNow] = useState(() => Date.now());
  const open = useMemo(() => openOrders(lab.account), [lab.account]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const symKey = open.map((o) => o.symbol).join(',');
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!symKey) return;
    getQuotes(symKey.split(','), true).then(setQuotes).catch(() => {});
  }, [symKey, now]);

  const reset = () =>
    showDialog(s.lab.hub.resetTitle, s.lab.hub.resetBody, [
      { text: s.lab.ticket.cancel, style: 'cancel' },
      { text: s.lab.hub.reset, style: 'destructive', onPress: lab.resetAccount },
    ]);

  return (
    <Screen title={s.lab.title} subtitle={s.lab.subtitle} onBack={() => router.back()}>
      <Appear>
        <Row style={{ alignItems: 'stretch' }}>
          <SessionCard zone="NY" now={now} />
          <SessionCard zone="TLV" now={now} />
        </Row>
      </Appear>
      <Appear index={1}>
        <Card style={{ gap: 0, paddingVertical: 4 }}>
          <ToolRow first sf="scope" md="radar" title={s.lab.hub.scan} hint={s.lab.scanner.subtitle} onPress={() => router.push('/lab/scanner')} />
          <ToolRow sf="book.closed" md="menu_book" title={s.lab.hub.journal} hint={s.lab.journal.subtitle} onPress={() => router.push('/lab/journal')} />
          <ToolRow sf="graduationcap" md="school" title={s.lab.hub.learn} hint={s.lab.track} onPress={() => router.push('/learn')} />
          <ToolRow sf="slider.horizontal.3" md="tune" title={s.lab.hub.settings} hint={s.lab.settings.limitsUSD} onPress={() => router.push('/lab/settings')} />
        </Card>
      </Appear>
      <SectionHeader>{s.lab.hub.account}</SectionHeader>
      <Appear index={2}>
        <Card>
          <Row style={{ gap: 8 }}>
            <MarketFlag zone="NY" />
            <View style={{ flex: 1 }}>
              <LineItem label={`${s.lab.hub.cash} · ${s.lab.markets.NY}`} value={f.money(lab.account.cash.USD, 'USD')} strong />
            </View>
          </Row>
          <Row style={{ gap: 8 }}>
            <MarketFlag zone="TLV" />
            <View style={{ flex: 1 }}>
              <LineItem label={`${s.lab.hub.cash} · ${s.lab.markets.TLV}`} value={f.money(lab.account.cash.ILS, 'ILS')} strong />
            </View>
          </Row>
          <Button kind="plain" label={s.lab.hub.reset} onPress={reset} />
        </Card>
      </Appear>
      <SectionHeader>{s.lab.hub.openTrades}</SectionHeader>
      {open.length ? (
        open.map((o) => <TradeRow key={o.id} o={o} q={quotes[o.symbol]} />)
      ) : (
        <Card>
          <Txt variant="subhead" color="textSecondary">
            {s.lab.hub.noOpen}
          </Txt>
          <Button label={s.lab.hub.scan} onPress={() => router.push('/lab/scanner')} />
        </Card>
      )}
      <Txt variant="footnote" color="textSecondary">
        {Platform.OS === 'ios' ? s.lab.hub.alertsNote : s.lab.hub.alertsNoteAndroid}
      </Txt>
      <LabFine />
    </Screen>
  );
}
