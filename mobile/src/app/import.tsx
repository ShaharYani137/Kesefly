/**
 * Import from broker: paste a CSV export, preview what Kesefly understood (purchases, sales,
 * dividends, unreadable lines, duplicates), then add it all in one step. Parsing is on-device
 * (engine/csv-import.ts); nothing is uploaded.
 */
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { type ImportResult, type ImportRow, parseImport } from '@/engine/csv-import';
import { formatPrice } from '@/engine/stocks';
import { fill, useApp } from '@/state/app-store';
import { guessCurrency } from '@/state/portfolio';
import { Button, Card, Pill, Row, Screen, SectionHeader, Segmented, Txt } from '@/ui/components';
import { Fonts, Metrics, useTokens } from '@/ui/theme';

// 604611 = Bank Leumi's TASE security number (becomes LUMI.TA).
const EXAMPLE = `Date,Action,Symbol,Quantity,Price,Fee,Amount,Tax,Currency
2025-01-15,Buy,AAPL,10,190.50,1,,,USD
2025-03-02,Buy,604611,20,45.12,5,,,ILS
2025-06-20,Sell,AAPL,4,205.10,1,,,USD
2025-08-14,Dividend,AAPL,,,,2.60,0.65,USD`;
const PREVIEW = 30;

const key = (r: { symbol: string; date?: string; shares?: number; price?: number; amount?: number }) =>
  [r.symbol, r.date ?? '', r.shares ?? '', r.price !== undefined ? r.price.toFixed(4) : '', r.amount !== undefined ? r.amount.toFixed(2) : ''].join('|');

export default function ImportScreen() {
  const { s, lang, holdings, sales, dividends, importRecords } = useApp();
  const { colors, type, isIOS } = useTokens();
  const [text, setText] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [agorot, setAgorot] = useState<'ils' | 'ila'>('ils');
  const [showExample, setShowExample] = useState(false);

  // Records already saved, to skip rows imported before.
  const existing = useMemo(
    () =>
      new Set([
        ...holdings.map((h) => 'buy|' + key({ symbol: h.symbol, date: h.date, shares: h.shares, price: h.buyPrice })),
        ...sales.map((x) => 'sell|' + key({ symbol: x.symbol, date: x.date, shares: x.shares, price: x.price })),
        ...dividends.map((d) => 'dividend|' + key({ symbol: d.symbol, date: d.date, amount: d.amount })),
      ]),
    [holdings, sales, dividends],
  );

  const rows = useMemo(() => {
    if (!result) return [];
    const k = agorot === 'ila' ? 0.01 : 1;
    return result.rows.map((r) => (r.kind !== 'dividend' && r.symbol.endsWith('.TA') ? { ...r, price: r.price * k, fee: r.fee * k } : r));
  }, [result, agorot]);
  const rowKey = (r: ImportRow) => `${r.kind}|${r.kind === 'dividend' ? key({ symbol: r.symbol, date: r.date, amount: r.amount }) : key({ symbol: r.symbol, date: r.date, shares: r.shares, price: r.price })}`;
  const fresh = rows.filter((r) => !existing.has(rowKey(r)));
  const count = (k: ImportRow['kind']) => rows.filter((r) => r.kind === k).length;
  const hasTA = rows.some((r) => r.kind !== 'dividend' && r.symbol.endsWith('.TA'));

  const read = () => {
    setResult(parseImport(text));
    setAgorot('ils');
  };

  const doImport = () => {
    if (!fresh.length) {
      Alert.alert(s.importer.title, s.importer.nothing);
      return;
    }
    const opt = (v: number) => (v ? v : undefined);
    importRecords({
      lots: fresh.filter((r) => r.kind === 'buy').map((r) => ({ symbol: r.symbol, shares: r.shares, buyPrice: r.price, date: r.date, fee: opt(r.fee) })),
      sales: fresh.filter((r) => r.kind === 'sell').map((r) => ({ symbol: r.symbol, shares: r.shares, price: r.price, date: r.date, fee: opt(r.fee) })),
      dividends: fresh.filter((r) => r.kind === 'dividend').map((r) => ({ symbol: r.symbol, amount: r.amount, tax: opt(r.tax), date: r.date })),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert(s.importer.title, fill(s.importer.done, { n: fresh.length }), [{ text: s.common.done, onPress: () => router.back() }]);
  };

  const kindLabel = { buy: s.importer.buy, sell: s.importer.sell, dividend: s.importer.dividend };
  const kindColor = { buy: colors.positive, sell: colors.danger, dividend: colors.accent };

  return (
    <Screen title={s.importer.title} subtitle={s.importer.subtitle} onBack={() => router.back()}>
      <Card>
        <Txt variant="headline">{s.importer.howTitle}</Txt>
        <Txt variant="subhead" color="textSecondary">
          {s.importer.how}
        </Txt>
        <Button kind="plain" label={s.importer.example} onPress={() => setShowExample((v) => !v)} />
        {showExample ? (
          <View style={{ gap: 6 }}>
            <Txt variant="footnote" color="textSecondary">
              {s.importer.exampleTitle}
            </Txt>
            <Txt variant="caption" style={{ fontFamily: Fonts.regular, writingDirection: 'ltr', textAlign: 'left' }} selectable>
              {EXAMPLE}
            </Txt>
          </View>
        ) : null}
      </Card>

      {/* CSV is Latin and comma-separated: the box stays left-to-right in Hebrew too. */}
      <TextInput
        accessibilityLabel={s.importer.paste}
        value={text}
        onChangeText={(t) => {
          setText(t);
          setResult(null);
        }}
        placeholder={s.importer.paste}
        placeholderTextColor={colors.textSecondary}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        textAlignVertical="top"
        style={[
          type.footnote,
          {
            minHeight: 160,
            maxHeight: 280,
            borderRadius: Metrics.fieldRadius,
            backgroundColor: isIOS ? colors.card : 'transparent',
            borderWidth: isIOS ? 0 : 1,
            borderColor: colors.separator,
            padding: 12,
            color: colors.text,
            textAlign: 'left',
            writingDirection: 'ltr',
          },
        ]}
      />
      <Row>
        <View style={{ flex: 1 }}>
          <Button label={s.importer.read} onPress={read} disabled={!text.trim()} />
        </View>
        {text ? (
          <Button
            kind="plain"
            label={s.importer.clear}
            onPress={() => {
              setText('');
              setResult(null);
            }}
          />
        ) : null}
      </Row>

      {result ? (
        result.format === 'unknown' ? (
          <Card>
            <Txt variant="subhead" color="danger">
              {s.importer.unknown}
            </Txt>
          </Card>
        ) : (
          <>
            <Card>
              <Txt variant="footnote" color="textSecondary">
                {result.format === 'ibkr' ? s.importer.formatIbkr : s.importer.formatTable}
              </Txt>
              <Txt variant="headline">{fill(s.importer.found, { buys: count('buy'), sells: count('sell'), divs: count('dividend') })}</Txt>
              {rows.length - fresh.length ? (
                <Txt variant="subhead" color="textSecondary">
                  {fill(s.importer.duplicates, { n: rows.length - fresh.length })}
                </Txt>
              ) : null}
              {result.issues.length ? (
                <View style={{ gap: 2 }}>
                  <Txt variant="subhead" color="warning">
                    {fill(s.importer.issues, { n: result.issues.length })}
                  </Txt>
                  {result.issues.slice(0, 5).map((i) => (
                    <Txt key={i.line} variant="footnote" color="textSecondary">
                      {fill(s.importer.issueLine, { line: i.line, reason: s.importer.reasons[i.reason] })}
                    </Txt>
                  ))}
                </View>
              ) : null}
            </Card>

            {hasTA ? (
              <View style={{ gap: 6 }}>
                <Txt variant="subhead" color="textSecondary">
                  {s.importer.agorot}
                </Txt>
                <Segmented<'ils' | 'ila'>
                  value={agorot}
                  onChange={setAgorot}
                  options={[
                    { value: 'ils', label: s.importer.shekels },
                    { value: 'ila', label: s.importer.agorotOpt },
                  ]}
                />
              </View>
            ) : null}

            {rows.length ? (
              <>
                <SectionHeader>{s.importer.preview}</SectionHeader>
                <Card style={{ gap: 0, paddingVertical: 4 }}>
                  {rows.slice(0, PREVIEW).map((r, i) => {
                    const cur = guessCurrency(r.symbol);
                    const dup = existing.has(rowKey(r));
                    return (
                      <Row key={`${r.line}-${i}`} style={{ paddingVertical: 8, borderTopWidth: i ? 0.5 : 0, borderColor: colors.separator, opacity: dup ? 0.45 : 1 }}>
                        <View style={{ width: 76 }}>
                          <Pill label={kindLabel[r.kind]} bg={kindColor[r.kind]} fg={colors.background} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Txt variant="subhead" style={{ writingDirection: 'ltr', fontFamily: Fonts.semibold }}>
                            {r.symbol}
                          </Txt>
                          <Txt variant="caption" color="textSecondary">
                            {r.date ?? s.importer.noDate}
                          </Txt>
                        </View>
                        <Txt variant="subhead" style={{ writingDirection: 'ltr' }}>
                          {r.kind === 'dividend' ? formatPrice(r.amount, cur, lang) : `${r.shares} × ${formatPrice(r.price, cur, lang)}`}
                        </Txt>
                      </Row>
                    );
                  })}
                  {rows.length > PREVIEW ? (
                    <Txt variant="footnote" color="textSecondary" style={{ paddingVertical: 8 }}>
                      {fill(s.importer.more, { n: rows.length - PREVIEW })}
                    </Txt>
                  ) : null}
                </Card>
                <Button label={fill(s.importer.importBtn, { n: fresh.length })} onPress={doImport} disabled={!fresh.length} />
              </>
            ) : null}
          </>
        )
      ) : null}

      <Txt variant="footnote" color="textSecondary">
        {s.importer.privacy}
      </Txt>
    </Screen>
  );
}
