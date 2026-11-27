/**
 * Tax view: this tax year's realized result and estimated tax, tax if each holding (or all)
 * were sold today, losses that would lower this year's tax, dividend tax still due, and a
 * W-8BEN check. Israel and US rules (engine/tax.ts). Recommend only: estimates, no filing.
 */
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { convert, formatPrice, formatSigned } from '@/engine/stocks';
import { taxReport } from '@/engine/tax';
import type { Country } from '@/engine/types';
import { fill, useApp } from '@/state/app-store';
import { guessCurrency, usePortfolio } from '@/state/portfolio';
import { Appear, Card, Disclaimer, Pill, Row, Screen, SectionHeader, Segmented, Stepper, SymbolBadge, Txt } from '@/ui/components';
import { LineItem } from '@/ui/money-ui';
import { useTokens } from '@/ui/theme';

/** US federal income tax brackets (2025-2026), for the short-term rate picker. */
const US_BRACKETS = [0.1, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];
const US_LONG = ['0', '0.15', '0.2'] as const;

export default function TaxScreen() {
  const { s, lang, profile, updateProfile, holdings, sales, dividends, prefs, setPrefs } = useApp();
  const { colors } = useTokens();
  const pf = usePortfolio();
  const year = new Date().getFullYear();
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const money = (v: number) => formatPrice(v, pf.cur, lang);
  const signed = (v: number) => formatSigned(v, pf.cur, lang);

  const report = useMemo(() => {
    const conv = (v: number, sym: string) => convert(v, pf.quotes[sym]?.currency ?? guessCurrency(sym), pf.cur, pf.rate);
    const prices = Object.fromEntries(Object.entries(pf.quotes).map(([k, q]) => [k, q.price]));
    return taxReport({
      lots: holdings,
      sales,
      dividends,
      prices,
      conv,
      rules: { country: profile.country, usShort: prefs.taxShort, usLong: prefs.taxLong },
      year,
    });
  }, [holdings, sales, dividends, pf.quotes, pf.cur, pf.rate, profile.country, prefs.taxShort, prefs.taxLong, year]);

  const us = profile.country === 'US';
  const r = report.realized;
  const bracket = Math.max(0, US_BRACKETS.indexOf(prefs.taxShort));
  const termLabel = (p: (typeof report.open)[number]) =>
    p.split.short && p.split.long ? s.tax.mixed : p.split.short ? s.tax.shortTerm : s.tax.longTerm;

  return (
    <Screen title={s.tax.title} subtitle={s.tax.subtitle} onBack={() => router.back()}>
      <SectionHeader>{s.tax.residence}</SectionHeader>
      <Segmented<Country>
        value={profile.country}
        onChange={(country) => updateProfile({ country })}
        options={(['IL', 'US'] as const).map((c) => ({ value: c, label: s.tax.countries[c] }))}
      />

      {us ? (
        <Card style={{ gap: 14 }}>
          <Txt variant="headline">{s.tax.ratesTitle}</Txt>
          <Stepper
            label={s.tax.shortRate}
            display={pct(prefs.taxShort)}
            onMinus={() => setPrefs({ taxShort: US_BRACKETS[Math.max(0, bracket - 1)] })}
            onPlus={() => setPrefs({ taxShort: US_BRACKETS[Math.min(US_BRACKETS.length - 1, bracket + 1)] })}
          />
          <View style={{ gap: 6 }}>
            <Txt variant="subhead" color="textSecondary">
              {s.tax.longRate}
            </Txt>
            <Segmented<(typeof US_LONG)[number]>
              value={String(prefs.taxLong) as (typeof US_LONG)[number]}
              onChange={(v) => setPrefs({ taxLong: Number(v) })}
              options={US_LONG.map((v) => ({ value: v, label: pct(Number(v)) }))}
            />
          </View>
          <Txt variant="footnote" color="textSecondary">
            {s.tax.ratesHint}
          </Txt>
        </Card>
      ) : (
        <Card tone="accent">
          <Txt variant="subhead" color="onAccentSoft">
            {s.tax.ilRule}
          </Txt>
        </Card>
      )}

      {/* ---------- This year ---------- */}
      <Appear index={0}>
        <Card>
          <Txt variant="headline">{fill(s.tax.yearTitle, { year })}</Txt>
          {r.count ? (
            <>
              <LineItem label={s.tax.gains} value={signed(r.gains)} color="positive" />
              <LineItem label={s.tax.losses} value={signed(r.losses)} color="danger" />
              <LineItem label={s.tax.net} value={signed(r.net)} />
              {us ? (
                <Txt variant="footnote" color="textSecondary">
                  {fill(s.tax.shortLong, { short: signed(r.split.short), long: signed(r.split.long) })}
                </Txt>
              ) : null}
              <View style={{ height: 0.5, backgroundColor: colors.separator }} />
              <LineItem label={s.tax.taxDue} value={money(r.tax)} strong />
            </>
          ) : (
            <Txt variant="subhead" color="textSecondary">
              {s.tax.noSales}
            </Txt>
          )}
        </Card>
      </Appear>

      {/* ---------- Sell everything today ---------- */}
      <Appear index={1}>
        <Card>
          <Txt variant="headline">{s.tax.sellAllTitle}</Txt>
          {pf.loading && !Object.keys(pf.quotes).length ? (
            <ActivityIndicator color={colors.accent} />
          ) : !Number.isFinite(report.taxIfSoldAll) ? (
            // NaN = a USD/ILS conversion with no rate at all: say so, never "no tax".
            <Txt variant="subhead" color="textSecondary">
              {s.stock.rateMissing}
            </Txt>
          ) : (
            <Txt variant="subhead" color={report.taxIfSoldAll > 0 ? 'text' : 'positive'}>
              {report.taxIfSoldAll > 0 ? fill(s.tax.sellAll, { v: money(report.taxIfSoldAll) }) : s.tax.sellAllNone}
            </Txt>
          )}
        </Card>
      </Appear>

      {/* ---------- Losses that offset ---------- */}
      {report.offsets.length ? (
        <Card tone="accent">
          <Txt variant="headline" color="onAccentSoft">
            {s.tax.offsetsTitle}
          </Txt>
          {report.offsets.map((o) => (
            <Txt key={o.symbol} variant="subhead" color="onAccentSoft">
              {fill(s.tax.offset, { symbol: o.symbol, loss: signed(o.loss), v: money(o.saves) })}
            </Txt>
          ))}
          <Txt variant="footnote" color="onAccentSoft">
            {us ? s.tax.offsetUS : s.tax.offsetIL}
          </Txt>
        </Card>
      ) : null}

      {/* ---------- Per holding ---------- */}
      {report.open.length ? (
        <>
          <SectionHeader>{s.tax.perHolding}</SectionHeader>
          <Card style={{ gap: 0, paddingVertical: 4 }}>
            {report.open.map((p, i) => (
              <View key={p.symbol} style={{ paddingVertical: 10, gap: 6, borderTopWidth: i ? 0.5 : 0, borderColor: colors.separator }}>
                <Row>
                  <SymbolBadge symbol={p.symbol} size={36} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="headline" style={{ writingDirection: 'ltr' }}>
                      {p.symbol}
                    </Txt>
                    <Txt variant="footnote" color={!Number.isFinite(p.gain) ? 'textSecondary' : p.gain >= 0 ? 'positive' : 'danger'}>
                      {fill(s.tax.gain, { v: signed(p.gain) })}
                    </Txt>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Txt variant="subhead">{!Number.isFinite(p.taxIfSold) ? '—' : p.taxIfSold > 0.5 ? fill(s.tax.taxIfSold, { v: money(p.taxIfSold) }) : s.tax.noTax}</Txt>
                    {us ? <Pill label={termLabel(p)} bg={colors.fill} fg={colors.text} /> : null}
                  </View>
                </Row>
                {p.longSoon ? (
                  <Txt variant="footnote" color="warning">
                    {fill(s.tax.longSoon, { date: p.longSoon.date, days: p.longSoon.days, v: money(p.longSoon.saves) })}
                  </Txt>
                ) : null}
              </View>
            ))}
          </Card>
        </>
      ) : null}
      {pf.rows.some((row) => !row.quote) && !pf.loading ? (
        <Txt variant="footnote" color="textSecondary">
          {s.tax.noPrice}
        </Txt>
      ) : null}

      {/* ---------- Dividends ---------- */}
      <Card>
        <Txt variant="headline">{fill(s.tax.dividendsTitle, { year })}</Txt>
        {/* NaN gross (no USD/ILS rate) counts as "has dividends", so the lines show "—". */}
        {report.dividends.gross || Number.isNaN(report.dividends.gross) ? (
          <>
            <LineItem label={s.tax.divGross} value={money(report.dividends.gross)} />
            <LineItem label={s.tax.divWithheld} value={money(report.dividends.withheld)} />
            <LineItem label={s.tax.divDue} value={money(report.dividends.due)} strong />
          </>
        ) : (
          <Txt variant="subhead" color="textSecondary">
            {s.tax.divNone}
          </Txt>
        )}
        {report.dividends.w8ben.length ? (
          <Txt variant="subhead" color="warning">
            {fill(s.tax.w8ben, { symbols: report.dividends.w8ben.join(', ') })}
          </Txt>
        ) : null}
      </Card>

      {/* ---------- Method ---------- */}
      <Card>
        <Txt variant="headline">{s.tax.notesTitle}</Txt>
        <Txt variant="footnote" color="textSecondary">
          {us ? s.tax.noteUS : s.tax.noteIL}
        </Txt>
        {report.undatedSales ? (
          <Txt variant="footnote" color="warning">
            {fill(s.tax.undated, { n: report.undatedSales })}
          </Txt>
        ) : null}
      </Card>
      <Disclaimer />
    </Screen>
  );
}
