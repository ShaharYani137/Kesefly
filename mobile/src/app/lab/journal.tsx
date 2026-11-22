/**
 * Lab journal: closed practice trades with profit and R multiple, plus win rate, average R and
 * practice P&L per currency. Expired and canceled orders are listed without results.
 */
import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { journal, journalStats } from '@/lab/paper';
import { fill, useApp } from '@/state/app-store';
import { useLab } from '@/state/lab-store';
import { Appear, Card, Row, Screen, SectionHeader, Txt } from '@/ui/components';
import { GateGuard, LabFine, MarketFlag, PracticeChip, useLabFormat } from '@/ui/lab-ui';
import { LineItem } from '@/ui/money-ui';
import { useTokens } from '@/ui/theme';

export default function JournalPage() {
  return (
    <GateGuard>
      <Journal />
    </GateGuard>
  );
}

function Journal() {
  const { s } = useApp();
  const lab = useLab();
  const f = useLabFormat();
  const { colors } = useTokens();
  const rows = useMemo(() => journal(lab.account), [lab.account]);
  const stats = useMemo(() => journalStats(rows), [rows]);
  const other = lab.account.orders.filter((o) => o.status === 'expired' || o.status === 'canceled');
  const j = s.lab.journal;
  return (
    <Screen title={j.title} subtitle={j.subtitle} onBack={() => router.back()} trailing={<PracticeChip />}>
      <Appear>
        <Card>
          <LineItem label={j.trades} value={String(stats.trades)} strong />
          <LineItem label={j.winRate} value={stats.winRate == null ? '—' : f.pct(stats.winRate, 0)} />
          <LineItem label={j.avgR} value={stats.avgR == null ? '—' : `${stats.avgR.toFixed(2)}R`} />
          <LineItem label={`${j.pnl} · ${s.lab.markets.NY}`} value={f.signed(stats.pnl.USD, 'USD')} color={stats.pnl.USD >= 0 ? 'positive' : 'danger'} />
          <LineItem label={`${j.pnl} · ${s.lab.markets.TLV}`} value={f.signed(stats.pnl.ILS, 'ILS')} color={stats.pnl.ILS >= 0 ? 'positive' : 'danger'} />
        </Card>
      </Appear>
      {rows.length ? (
        <Card style={{ gap: 0, paddingVertical: 4 }}>
          {rows.map((r, i) => (
            <View key={r.order.id} style={{ paddingVertical: 10, gap: 2, borderTopWidth: i ? 0.5 : 0, borderColor: colors.separator }}>
              <Row>
                <MarketFlag zone={r.order.currency === 'ILS' ? 'TLV' : 'NY'} width={18} />
                <Txt variant="headline" style={{ flex: 1 }}>{`${r.order.symbol} · ${r.order.date}`}</Txt>
                <Txt variant="headline" style={{ color: r.pnl >= 0 ? colors.positive : colors.danger }}>{`${r.R > 0 ? '+' : ''}${r.R.toFixed(2)}R`}</Txt>
              </Row>
              <Txt variant="footnote" color="textSecondary">
                {`${j.reason[r.order.exit!.reason]} · ${fill(j.line, { qty: r.order.qty, entry: f.money(r.order.fill!.price, r.order.currency), exit: f.money(r.order.exit!.price, r.order.currency), mins: r.minutes })} · ${f.signed(r.pnl, r.order.currency)}`}
              </Txt>
            </View>
          ))}
        </Card>
      ) : (
        <Card>
          <Txt color="textSecondary">{j.empty}</Txt>
        </Card>
      )}
      {other.length ? (
        <>
          <SectionHeader>{`${j.expired} / ${j.canceled}`}</SectionHeader>
          <Card>
            {other.map((o) => (
              <LineItem key={o.id} label={`${o.symbol} · ${o.date}`} value={o.status === 'expired' ? j.expired : j.canceled} />
            ))}
          </Card>
        </>
      ) : null}
      <LabFine />
    </Screen>
  );
}
