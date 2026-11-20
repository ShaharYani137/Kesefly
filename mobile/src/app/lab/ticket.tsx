/**
 * Lab practice ticket: size from the user's limits (shows which limit decided), the risk check
 * (PASS or BLOCK with every reason), then a practice order the user confirms. Placing it sets
 * three alerts (stop, target, flat by close). Practice money only: nothing goes to a broker.
 */
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {} from 'react-native';

import { getQuote } from '@/engine/stocks';
import { checkRisk } from '@/lab/risk';
import { sessionFor } from '@/lab/sessions';
import { sizeTrade } from '@/lab/sizing';
import { fill, useApp } from '@/state/app-store';
import { useLab } from '@/state/lab-store';
import { Appear, Button, Card, Icon, Row, Screen, SectionHeader, Segmented, Txt } from '@/ui/components';
import { GateGuard, LabFine, PracticeChip, useLabFormat } from '@/ui/lab-ui';
import { LineItem } from '@/ui/money-ui';
import { showDialog } from '@/ui/dialog';
import { useTokens } from '@/ui/theme';

export default function TicketPage() {
  return (
    <GateGuard>
      <Ticket />
    </GateGuard>
  );
}

function Ticket() {
  const { s } = useApp();
  const lab = useLab();
  const f = useLabFormat();
  const { colors } = useTokens();
  const plan = lab.draft?.plan ?? null;
  const [live, setLive] = useState<number | null>(null);
  const [type, setType] = useState<'market' | 'limit'>('market');
  const [now, setNow] = useState(() => Date.now());
  const t = s.lab.ticket;

  useEffect(() => {
    if (!plan) return;
    const load = () => {
      setNow(Date.now());
      getQuote(plan.symbol, true)
        .then((q) => setLive(q.price))
        .catch(() => setLive(null));
    };
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [plan]);

  const calc = useMemo(() => {
    if (!plan) return null;
    try {
      const sizing = sizeTrade(plan, lab.limits, { cash: lab.account.cash[plan.currency], price: type === 'market' ? live : null, limit: type === 'limit' ? plan.entry : null });
      const session = sessionFor(plan.zone, now);
      const risk = checkRisk(plan, sizing, lab.limits, lab.account, session, now);
      return { sizing, session, risk };
    } catch {
      return null;
    }
  }, [plan, lab.limits, lab.account, live, type, now]);

  if (!plan) return <Screen title={t.title} onBack={() => router.back()}>{null}</Screen>;
  const cur = plan.currency;
  const L = lab.limits[cur];

  const place = () => {
    if (!calc || !calc.session) return;
    if (type === 'market' && live == null) {
      showDialog(t.title, t.noPrice);
      return;
    }
    const { sizing, session } = calc;
    showDialog(
      t.confirmTitle,
      fill(t.confirmBody, { qty: sizing.qty, sym: plan.symbol, stop: f.money(sizing.stop, cur), target: f.money(sizing.target, cur), flat: f.time(plan.zone, plan.flatByMs), loss: f.money(sizing.maxLoss, cur) }),
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.confirm,
          onPress: () => {
            lab.placePractice(plan, sizing, session, type === 'market' ? live : null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            showDialog(t.title, t.placed);
            router.dismissTo('/lab');
          },
        },
      ],
    );
  };

  const reasonText = (code: string, values: Record<string, number | string> = {}) => {
    const v: Record<string, string | number> = {};
    for (const [k, x] of Object.entries(values)) v[k] = typeof x === 'number' && ['stop', 'entry', 'target', 'loss', 'cap', 'used', 'cost', 'min', 'max', 'cash', 'left', 'buffer', 'value'].includes(k) && !(code === 'reward-risk' && k === 'min') && !(code === 'trades') ? f.money(x, cur) : x;
    return fill(t.reasons[code as keyof typeof t.reasons], v);
  };

  return (
    <Screen title={`${t.title} · ${plan.symbol}`} subtitle={t.subtitle} onBack={() => router.back()} trailing={<PracticeChip />}>
      <Segmented value={type} onChange={setType} options={[{ value: 'market', label: t.orderType.market }, { value: 'limit', label: t.orderType.limit }]} />
      {calc ? (
        <>
          <Appear>
            <Card>
              <Txt variant="title">{fill(t.shares, { n: calc.sizing.qty })}</Txt>
              <LineItem label={s.lab.plan.entry} value={f.money(calc.sizing.entry, cur)} />
              <LineItem label={t.cost} value={f.money(calc.sizing.cost, cur)} />
              <LineItem label={t.maxLoss} value={f.money(calc.sizing.maxLoss, cur)} color="danger" strong />
              <LineItem label={s.lab.plan.stop} value={f.money(calc.sizing.stop, cur)} />
              <LineItem label={s.lab.plan.target} value={f.money(calc.sizing.target, cur)} />
              {calc.sizing.refusal ? (
                <Txt color="danger" variant="subhead">
                  {fill(t.refusal[calc.sizing.refusal.code], { limit: calc.sizing.refusal.limit ? t.limits[calc.sizing.refusal.limit] : '' })}
                </Txt>
              ) : null}
            </Card>
          </Appear>
          <SectionHeader>{t.limitsTitle}</SectionHeader>
          <Card>
            {calc.sizing.limits.map((l) => (
              <LineItem key={l.name} label={`${t.limits[l.name]} · ${f.money(l.amount, cur)}`} value={`${fill(t.sharesOf, { n: l.shares })}${l.binds ? ` · ${t.decides}` : ''}`} strong={l.binds} />
            ))}
          </Card>
          <SectionHeader>{t.riskTitle}</SectionHeader>
          <Appear index={1}>
            <Card tone={calc.risk.verdict === 'PASS' ? 'accent' : 'default'}>
              <Row>
                <Icon sf={calc.risk.verdict === 'PASS' ? 'checkmark.seal.fill' : 'xmark.octagon.fill'} md={calc.risk.verdict === 'PASS' ? 'verified' : 'block'} color={calc.risk.verdict === 'PASS' ? colors.positive : colors.danger} />
                <Txt variant="title3" style={{ color: calc.risk.verdict === 'PASS' ? colors.positive : colors.danger }}>
                  {calc.risk.verdict === 'PASS' ? t.pass : t.block}
                </Txt>
              </Row>
              {calc.risk.reasons.map((r) => (
                <Txt key={r.code} variant="subhead">
                  {`• ${reasonText(r.code, r.values)}`}
                </Txt>
              ))}
              <Txt variant="footnote" color="textSecondary">
                {fill(t.todayLine, { n: calc.risk.info.tradesToday, cap: lab.limits.maxTradesPerDay, loss: f.money(calc.risk.info.lossAtRiskToday, cur) })}
                {` · ${s.lab.settings.maxDaily} ${f.money(L.maxDailyLoss, cur)}`}
              </Txt>
            </Card>
          </Appear>
          <Button label={t.place} onPress={place} disabled={calc.risk.verdict !== 'PASS' || !!calc.sizing.refusal} />
        </>
      ) : (
        <Card>
          <Txt color="danger">{s.lab.plan.errors['target-below-entry']}</Txt>
        </Card>
      )}
      <LabFine />
    </Screen>
  );
}
