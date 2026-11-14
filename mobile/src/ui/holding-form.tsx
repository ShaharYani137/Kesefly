/** Portfolio form pieces shared by the Stocks tab and the stock page. */
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { type Holding, useApp } from '@/state/app-store';
import { Button, Card, Row, Txt } from '@/ui/components';
import { Metrics, useTokens } from '@/ui/theme';

/** Inline form: symbol, number of shares, buy price per share. */
export function AddHolding({ onSave, onCancel, symbol: initial = '' }: { onSave: (h: Omit<Holding, 'id'>) => void; onCancel: () => void; symbol?: string }) {
  const { s } = useApp();
  const [symbol, setSymbol] = useState(initial);
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const n = Number(shares);
  const p = Number(price);
  const valid = symbol.length > 0 && n > 0 && p > 0;
  return (
    <Card>
      <Txt variant="headline">{s.stocks.addHolding}</Txt>
      <Field value={symbol} onChange={(t) => setSymbol(t.toUpperCase().replace(/[^A-Z0-9.^=-]/g, '').slice(0, 12))} placeholder={s.stocks.symbolPlaceholder} caps />
      <Row>
        <Field value={shares} onChange={(t) => setShares(t.replace(/[^\d.]/g, ''))} placeholder={s.stocks.shares} numeric />
        <Field value={price} onChange={(t) => setPrice(t.replace(/[^\d.]/g, ''))} placeholder={s.stocks.buyPrice} numeric />
      </Row>
      <Txt variant="footnote" color="textSecondary">
        {s.stocks.buyPriceHint}
      </Txt>
      <Row>
        <View style={{ flex: 1 }}>
          <Button kind="tonal" label={s.settings.cancel} onPress={onCancel} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={s.common.save} disabled={!valid} onPress={() => onSave({ symbol, shares: n, buyPrice: p })} />
        </View>
      </Row>
    </Card>
  );
}

export function Field({
  value,
  onChange,
  placeholder,
  onSubmit,
  caps,
  numeric,
}: {
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  onSubmit?: () => void;
  caps?: boolean;
  numeric?: boolean;
}) {
  const { colors, type, isIOS } = useTokens();
  const { isRTL } = useApp();
  return (
    <TextInput
      accessibilityLabel={placeholder}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      autoCapitalize={caps ? 'characters' : 'none'}
      autoCorrect={false}
      keyboardType={numeric ? 'decimal-pad' : 'default'}
      onSubmitEditing={onSubmit}
      style={[
        type.body,
        {
          flex: 1,
          minHeight: Metrics.fieldHeight,
          borderRadius: Metrics.fieldRadius,
          backgroundColor: isIOS ? colors.background : 'transparent',
          borderWidth: isIOS ? 0 : 1,
          borderColor: colors.separator,
          paddingHorizontal: 16,
          color: colors.text,
          // Tickers and numbers are Latin: type them left-to-right; placeholders follow the language.
          textAlign: value ? 'left' : isRTL ? 'right' : 'left',
          writingDirection: value ? 'ltr' : isRTL ? 'rtl' : 'ltr',
        },
      ]}
    />
  );
}
