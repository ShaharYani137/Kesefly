/**
 * Lab Time Machine: 10,000 replays of the rest of the session from the stock's own last 60
 * days, run in small chunks so the phone never freezes (progress shown). Odds, price range,
 * fan chart, verdict, and the same rule on past days. A simulation is not a prediction.
 */
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { getCandles } from '@/lab/candles';
import { runTimeMachineAsync, TMError, type TimeMachineResult } from '@/lab/timemachine';
import { fill, useApp } from '@/state/app-store';
import { planKey, useLab } from '@/state/lab-store';
import { Appear, Button, Card, ProgressBar, Row, Screen, SectionHeader, Txt } from '@/ui/components';
import { FanChart, OddsBar } from '@/ui/lab-charts';
import { GateGuard, LabFine, PracticeChip, useLabFormat } from '@/ui/lab-ui';
import { useTokens } from '@/ui/theme';

export default function TimeMachinePage() {
  return (
    <GateGuard>
      <TM />
    </GateGuard>
  );
}

function TM() {
  const { s } = useApp();
  const lab = useLab();
  const f = useLabFormat();
  const { colors } = useTokens();
  const plan = lab.draft?.plan ?? null;
  const key = plan ? planKey(plan) : '';
  const cached = lab.tm?.planKey === key ? lab.tm.result : null;
  const [res, setRes] = useState<TimeMachineResult | null>(cached);
  const [p, setP] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const alive = useRef(true);
  const setTm = lab.setTm;

  useEffect(() => {
    alive.current = true;
    if (!plan || cached) return;
    (async () => {
      try {
        const chart = await getCandles(plan.symbol, '5m', '60d');
        const r = await runTimeMachineAsync(chart, plan, Date.now(), {}, (x) => alive.current && setP(x));
        if (!alive.current) return;
        setRes(r);
        setTm({ planKey: key, result: r });
      } catch (e) {
        if (!alive.current) return;
        const t = s.lab.tm.errors;
        setError(e instanceof TMError ? fill(t[e.code], (e.detail as Record<string, number>) ?? {}) : t.network);
      }
    })();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rerun on plan key or retry only
  }, [key, run]);

  if (!plan) return <Screen title={s.lab.tm.title} onBack={() => router.back()}>{null}</Screen>;
  const zone = plan.zone;
  const cur = plan.currency;
  const t = s.lab.tm;

  return (
    <Screen title={t.title} subtitle={fill(t.subtitle, { sym: plan.symbol })} onBack={() => router.back()} trailing={<PracticeChip />}>
      {error ? (
        <Card>
          <Txt color="danger">{error}</Txt>
          <Button kind="tonal" label={t.retry} onPress={() => {
              setError(null);
              setP(0);
              setRun((n) => n + 1);
            }} />
        </Card>
      ) : !res ? (
        <Card>
          <Row>
            <ActivityIndicator color={colors.accent} />
            <Txt variant="subhead">{fill(t.running, { p: `${Math.round(p * 100)}%` })}</Txt>
          </Row>
          <ProgressBar value={p} />
        </Card>
      ) : (
        <>
          <Appear>
            <Card tone="accent">
              <Txt variant="title3">{t.verdict[res.verdict.code]}</Txt>
              {res.verdict.code !== 'none' && res.verdict.code !== 'coin' && res.verdict.share != null && res.verdict.breakEven != null ? (
                <Txt variant="subhead">{fill(t.breakEven, { r: res.verdict.r, even: f.pct(res.verdict.breakEven, 0), share: f.pct(res.verdict.share, 0) })}</Txt>
              ) : null}
              {res.verdict.manyNeither ? <Txt variant="subhead">{fill(t.manyNeither, { p: f.pct(res.mc.pNeither) })}</Txt> : null}
              {res.verdict.avgRAgainst ? <Txt variant="subhead">{fill(t.avgAgainst, { r: res.mc.avgR.toFixed(3) })}</Txt> : null}
            </Card>
          </Appear>
          <Appear index={1}>
            <Card>
              <OddsBar target={res.mc.pTarget} neither={res.mc.pNeither} stop={res.mc.pStop} labels={[t.targetFirst, fill(t.neither, { time: f.clock(zone, res.mc.untilMs) }), t.stopFirst]} />
              <Txt variant="subhead">{fill(t.range, { time: f.clock(zone, res.mc.untilMs), mid: f.money(res.mc.medianClose, cur), lo: f.money(res.mc.p5Close, cur), hi: f.money(res.mc.p95Close, cur) })}</Txt>
              <Txt variant="footnote" color="textSecondary">{`${t.green} ${f.pct(res.mc.pGreen)} · ${fill(t.avgR, { r: res.mc.avgR.toFixed(3) })}`}</Txt>
            </Card>
          </Appear>
          <SectionHeader>{t.fan}</SectionHeader>
          <Card>
            <FanChart bands={res.mc.bands} entry={plan.entry} stop={plan.stop} target={plan.target} />
            <Txt variant="caption" color="textSecondary">
              {fill(t.pool, { n: res.mc.poolSessions, from: res.mc.poolFrom, to: res.mc.poolTo })}
            </Txt>
          </Card>
          <SectionHeader>{t.history}</SectionHeader>
          <Card>
            <Txt variant="subhead">
              {res.history.rule
                ? fill(t.historyLine, { n: res.history.triggered, days: res.history.sessions, t: res.history.target, s: res.history.stop, c: res.history.close, r: (res.history.avgR ?? 0).toFixed(3) })
                : t.historyNone}
            </Txt>
          </Card>
          <Txt variant="footnote" color="textSecondary">
            {t.notPrediction}
          </Txt>
          <Button label={s.lab.plan.ticket} onPress={() => router.push('/lab/ticket')} />
        </>
      )}
      <LabFine />
    </Screen>
  );
}
