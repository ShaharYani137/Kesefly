/**
 * Pension and savings: Israeli pension fund, study fund (Keren Hishtalmut), provident fund,
 * and US 401(k) / IRA. Balances and fees typed from the yearly statement; each account gets a
 * fee check against a good reference rate, the fee cost until retirement, a projection, and
 * (study fund) the tax-free withdrawal date. Recommend only.
 */
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { formatMoney } from '@/engine/format';
import { DEPOSIT_FEE_KINDS, feeCheck, ISRAELI, liquidDate, type SavingsAccount, type SavingsKind, US_KINDS } from '@/engine/savings';
import { convert, getUsdIls } from '@/engine/stocks';
import type { Currency } from '@/engine/types';
import { fill, newId, useApp } from '@/state/app-store';
import { Appear, Button, Card, Chip, Disclaimer, Pill, Row, Screen, SectionHeader, Segmented, Stepper, Txt } from '@/ui/components';
import { cleanDate, cleanNum, Field, validDate } from '@/ui/holding-form';
import { useTokens } from '@/ui/theme';

const pct = (f: number) => `${Number((f * 100).toFixed(2))}%`;

export default function SavingsScreen() {
  const { s, lang, profile, savings, saveSavings, removeSavings, prefs, setPrefs } = useApp();
  const [rate, setRate] = useState<number | null>(null);
  const [editing, setEditing] = useState<SavingsAccount | 'new' | null>(null);
  const cur = profile.currency;
  const years = prefs.retireYears;

  useEffect(() => {
    getUsdIls().then(setRate);
  }, []);

  const total = savings.reduce((a, x) => a + convert(x.balance, x.currency, cur, rate), 0);
  const monthly = savings.reduce((a, x) => a + convert(x.monthly, x.currency, cur, rate), 0);
  const kinds = profile.country === 'US' ? [...US_KINDS, ...ISRAELI] : [...ISRAELI, ...US_KINDS];

  return (
    <Screen title={s.savings.title} subtitle={s.savings.subtitle} onBack={() => router.back()}>
      <Appear index={0}>
        <Card tone="accent">
          <Txt variant="footnote" color="onAccentSoft">
            {s.savings.total}
          </Txt>
          <Txt variant="title" color="onAccentSoft" style={{ writingDirection: 'ltr' }}>
            {formatMoney(total, cur, lang)}
          </Txt>
          {monthly ? (
            <Txt variant="subhead" color="onAccentSoft">
              {fill(s.savings.monthly, { v: formatMoney(monthly, cur, lang) })}
            </Txt>
          ) : null}
        </Card>
      </Appear>

      <Card>
        <Stepper
          label={s.savings.retire}
          display={fill(s.common.years, { n: years })}
          onMinus={() => setPrefs({ retireYears: Math.max(1, years - 1) })}
          onPlus={() => setPrefs({ retireYears: Math.min(50, years + 1) })}
        />
      </Card>

      {savings.length ? <SectionHeader>{s.savings.title}</SectionHeader> : null}
      {savings.map((a, i) =>
        editing !== 'new' && editing?.id === a.id ? (
          <AccountForm key={a.id} initial={a} kinds={kinds} onCancel={() => setEditing(null)} onSave={(x) => (saveSavings(x), setEditing(null))} onDelete={() => (removeSavings(a.id), setEditing(null))} />
        ) : (
          <Appear key={a.id} index={i + 1}>
            <AccountCard a={a} years={years} onEdit={() => setEditing(a)} />
          </Appear>
        ),
      )}
      {!savings.length && editing !== 'new' ? (
        <Card>
          <Txt variant="subhead" color="textSecondary">
            {s.savings.empty}
          </Txt>
        </Card>
      ) : null}

      {editing === 'new' ? (
        <AccountForm
          kinds={kinds}
          initial={{ id: newId(), kind: kinds[0], provider: '', balance: 0, monthly: 0, feeDeposit: 0, feeBalance: 0, currency: kinds[0] === 'k401' || kinds[0] === 'ira' ? 'USD' : 'ILS' }}
          onCancel={() => setEditing(null)}
          onSave={(x) => {
            saveSavings(x);
            setEditing(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }}
        />
      ) : editing === null ? (
        <Button kind="tonal" label={s.savings.add} onPress={() => setEditing('new')} />
      ) : null}

      <Card>
        <Txt variant="subhead" color="textSecondary">
          {profile.country === 'US' ? s.savings.tipUS : s.savings.tipIL}
        </Txt>
        <Txt variant="footnote" color="textSecondary">
          {s.savings.referenceNote}
        </Txt>
      </Card>
      <Disclaimer />
    </Screen>
  );
}

function AccountCard({ a, years: y, onEdit }: { a: SavingsAccount; years: number; onEdit: () => void }) {
  const { s, lang } = useApp();
  const { colors } = useTokens();
  const c = feeCheck(a, y);
  const money = (v: number) => formatMoney(v, a.currency, lang);
  const us = US_KINDS.includes(a.kind);
  const depFee = DEPOSIT_FEE_KINDS.includes(a.kind);
  const liquid = liquidDate(a);
  const today = new Date().toISOString().slice(0, 10);
  const badge = { good: { bg: colors.positive, label: s.savings.good }, high: { bg: colors.warning, label: s.savings.high }, max: { bg: colors.danger, label: s.savings.max } }[c.level];
  return (
    <Card>
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="headline">{s.savings.kinds[a.kind]}</Txt>
          {a.provider ? (
            <Txt variant="footnote" color="textSecondary">
              {a.provider}
            </Txt>
          ) : null}
        </View>
        <Button kind="plain" label={s.savings.edit} onPress={onEdit} />
      </Row>
      <Txt variant="title3" style={{ writingDirection: 'ltr' }}>
        {money(a.balance)}
      </Txt>
      <Txt variant="footnote" color="textSecondary">
        {us ? fill(s.savings.feesUS, { bal: pct(a.feeBalance) }) : depFee ? fill(s.savings.fees, { dep: pct(a.feeDeposit || 0), bal: pct(a.feeBalance) }) : fill(s.savings.feesBal, { bal: pct(a.feeBalance) })}
      </Txt>
      <Pill label={badge.label} bg={badge.bg} fg={colors.background} />
      {c.level !== 'good' ? (
        <>
          <Txt variant="subhead">
            {depFee ? fill(s.savings.goodRate, { dep: pct(c.good.deposit), bal: pct(c.good.balance) }) : fill(s.savings.goodRateBal, { bal: pct(c.good.balance) })}
          </Txt>
          {c.extraCost >= 1 ? (
            <Txt variant="subhead" color="warning">
              {fill(s.savings.extraCost, { v: money(c.extraCost) })}
            </Txt>
          ) : null}
        </>
      ) : null}
      <Txt variant="footnote" color="textSecondary">
        {fill(s.savings.projected, { years: y, v: formatMoney(c.projected, a.currency, lang, true) })}
      </Txt>
      {liquid ? (
        <Txt variant="footnote" color="positive">
          {liquid <= today ? s.savings.liquidNow : fill(s.savings.liquid, { date: liquid })}
        </Txt>
      ) : null}
    </Card>
  );
}

function AccountForm({
  initial,
  kinds,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: SavingsAccount;
  kinds: SavingsKind[];
  onSave: (a: SavingsAccount) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const { s } = useApp();
  const [kind, setKind] = useState(initial.kind);
  const [provider, setProvider] = useState(initial.provider);
  const [currency, setCurrency] = useState<Currency>(initial.currency);
  const num = (v: number) => (v ? String(Number(v.toFixed(4))) : '');
  const [balance, setBalance] = useState(num(initial.balance));
  const [monthly, setMonthly] = useState(num(initial.monthly));
  const [feeDep, setFeeDep] = useState(num((initial.feeDeposit || 0) * 100));
  const [feeBal, setFeeBal] = useState(num(initial.feeBalance * 100));
  const [opened, setOpened] = useState(initial.opened ?? '');
  const us = US_KINDS.includes(kind);
  const depFee = DEPOSIT_FEE_KINDS.includes(kind);
  const ok = Number(balance) > 0 && validDate(opened);

  const label = (t: string) => (
    <Txt variant="subhead" color="textSecondary">
      {t}
    </Txt>
  );
  const save = () =>
    onSave({
      id: initial.id,
      kind,
      provider: provider.trim(),
      balance: Number(balance) || 0,
      monthly: Number(monthly) || 0,
      feeDeposit: depFee ? (Number(feeDep) || 0) / 100 : 0,
      feeBalance: (Number(feeBal) || 0) / 100,
      currency,
      opened: kind === 'hishtalmut' && opened ? opened : undefined,
    });

  return (
    <Card style={{ gap: 12 }}>
      {label(s.savings.kind)}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {kinds.map((k) => (
          <Chip
            key={k}
            label={(k === kind ? '✓ ' : '') + s.savings.kinds[k]}
            onPress={() => {
              setKind(k);
              setCurrency(US_KINDS.includes(k) ? 'USD' : 'ILS');
            }}
          />
        ))}
      </View>
      {label(s.savings.provider)}
      <Row>
        <Field value={provider} onChange={setProvider} placeholder={s.savings.providerPlaceholder} />
      </Row>
      <Segmented<Currency>
        value={currency}
        onChange={setCurrency}
        options={[
          { value: 'ILS', label: '₪ ILS' },
          { value: 'USD', label: '$ USD' },
        ]}
      />
      {label(s.savings.balance)}
      <Row>
        <Field value={balance} onChange={(t) => setBalance(cleanNum(t))} placeholder="0" numeric />
      </Row>
      {label(s.savings.deposit)}
      <Row>
        <Field value={monthly} onChange={(t) => setMonthly(cleanNum(t))} placeholder="0" numeric />
      </Row>
      {depFee ? (
        <>
          {label(s.savings.feeDeposit)}
          <Row>
            <Field value={feeDep} onChange={(t) => setFeeDep(cleanNum(t))} placeholder="1.5" numeric />
          </Row>
        </>
      ) : null}
      {label(us ? s.savings.expenseRatio : s.savings.feeBalance)}
      <Row>
        <Field value={feeBal} onChange={(t) => setFeeBal(cleanNum(t))} placeholder={us ? '0.1' : '0.25'} numeric />
      </Row>
      {kind === 'hishtalmut' ? (
        <>
          {label(s.savings.opened)}
          <Row>
            <Field value={opened} onChange={(t) => setOpened(cleanDate(t))} placeholder="2021-05-01" numeric />
          </Row>
        </>
      ) : null}
      {!ok && balance ? (
        <Txt variant="footnote" color="danger">
          {validDate(opened) ? s.savings.invalid : s.ledger.badDate}
        </Txt>
      ) : null}
      <Button label={s.savings.save} onPress={save} disabled={!ok} />
      <Button kind="plain" label={s.savings.cancel} onPress={onCancel} />
      {onDelete ? <Button kind="destructive" label={s.savings.delete} onPress={onDelete} /> : null}
    </Card>
  );
}
