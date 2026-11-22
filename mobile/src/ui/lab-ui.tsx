/**
 * Shared pieces of the Day-Trading Lab screens: the fine print on every screen, money in the
 * trade's currency, exchange-local times, and the gate redirect.
 */
import { Redirect, router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { formatPrice } from '@/engine/stocks';
import { openOrders } from '@/lab/paper';
import { hhmm, type Zone } from '@/lab/sessions';
import { fill, useApp } from '@/state/app-store';
import { useLab } from '@/state/lab-store';
import { Card, Icon, Row, Txt } from '@/ui/components';
import { Flag } from '@/ui/flags';
import { useTokens } from '@/ui/theme';

/** "Practice" chip + the fine print. Every Lab screen ends with it. */
export function LabFine() {
  const { s } = useApp();
  const { colors } = useTokens();
  return (
    <Card style={{ backgroundColor: colors.fill }}>
      <Row style={{ alignItems: 'flex-start', gap: 8 }}>
        <Icon sf="info.circle" md="info" size={18} color={colors.textSecondary} />
        <Txt variant="footnote" color="textSecondary" style={{ flex: 1 }}>
          {s.lab.fine}
        </Txt>
      </Row>
    </Card>
  );
}

export function PracticeChip() {
  const { s } = useApp();
  const { colors } = useTokens();
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Txt variant="caption" style={{ color: colors.onAccentSoft }}>
        {s.lab.practice}
      </Txt>
    </View>
  );
}

export function useLabFormat() {
  const { lang, s } = useApp();
  return {
    money: (v: number, currency: string) => formatPrice(v, currency, lang),
    signed: (v: number, currency: string) => `${v >= 0 ? '+' : '−'}${formatPrice(Math.abs(v), currency, lang)}`,
    pct: (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`,
    /** "10:15 New York". */
    time: (zone: Zone, t: number) => `${hhmm(zone, t)} ${s.lab.markets[zone]}`,
    clock: (zone: Zone, t: number) => hhmm(zone, t),
  };
}

/** Flag of the market a symbol or zone trades in: USA for New York, Israel for Tel Aviv. */
export function MarketFlag({ zone, width = 22 }: { zone: Zone; width?: number }) {
  return <Flag country={zone === 'TLV' ? 'IL' : 'US'} width={width} />;
}

/** Sends the user to the risk gate until they have passed it. */
export function GateGuard({ children }: { children: ReactNode }) {
  const lab = useLab();
  if (!lab.hydrated) return null;
  if (!lab.accepted) return <Redirect href="/lab/gate" />;
  return <>{children}</>;
}

/** Home card while a practice trade is open (nothing otherwise). */
export function LabHomeCard() {
  const { s } = useApp();
  const lab = useLab();
  const f = useLabFormat();
  const { colors } = useTokens();
  const open = openOrders(lab.account);
  if (!open.length) return null;
  const o = open[0];
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/lab')}>
      <Card tone="accent">
        <Row>
          <Icon sf="flask" md="science" color={colors.accent} />
          <Txt variant="headline" style={{ flex: 1 }}>
            {open.length > 1 ? fill(s.lab.hub.homeCardMore, { n: open.length }) : s.lab.hub.homeCard}
          </Txt>
          <PracticeChip />
        </Row>
        <Txt variant="subhead">{`${o.symbol} · ${o.qty} · ${s.lab.plan.stop} ${f.money(o.stop, o.currency)} · ${s.lab.plan.target} ${f.money(o.target, o.currency)}`}</Txt>
      </Card>
    </Pressable>
  );
}
