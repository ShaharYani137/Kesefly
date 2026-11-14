// Opt out of the React Compiler: widgets are rendered outside React (no hooks available),
// so compiled memo hooks (useMemoCache) crash the widget render.
'use no memo';

/**
 * Kesefly Android home-screen widget (react-native-android-widget). 4x2 cells by default,
 * resizable. Dark brand card: portfolio value with today's change and total gain, a movers
 * column (holdings with the biggest moves today, row count follows the widget height), the
 * USD/ILS rate, and live clocks for Wall Street and Tel Aviv with open/closed status. The
 * clock tiles share the full width. Tapping opens the app.
 * Widgets render native Android views, so only the library's widget primitives are used here.
 */
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import type { MoverLine, WidgetData } from './data';

const BG = '#062A26';
const CARD = '#0B3B35';
const GOLD = '#F5C542';
const UP = '#7EE2A8';
const DOWN = '#FF8A80';
const MUTED = '#B8CCC7';

const US_FLAG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/>' +
  [0, 2, 4, 6, 8, 10, 12].map((i) => `<rect y="${(i * 20) / 13}" width="30" height="${20 / 13}" fill="#B22234"/>`).join('') +
  '<rect width="12.6" height="10.77" fill="#3C3B6E"/></svg>';
const IL_FLAG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/>' +
  '<rect y="2" width="30" height="3" fill="#0038B8"/><rect y="15" width="30" height="3" fill="#0038B8"/>' +
  '<path d="M15,6 L18.46,12 L11.54,12 Z M15,14 L11.54,8 L18.46,8 Z" fill="none" stroke="#0038B8" stroke-width="0.9"/></svg>';

/**
 * Sparkline SVG drawn at the exact widget size (dp), so the stroke is not scaled: price line,
 * soft fill under it, dashed baseline at the previous close. Time runs left to right in both
 * languages (charts are not mirrored in RTL).
 */
function sparkSvg(points: number[], base: number, w: number, h: number, up: boolean) {
  const color = up ? UP : DOWN;
  const pad = 2;
  const x = (i: number) => (points.length > 1 ? (i / (points.length - 1)) * w : 0);
  const y = (v: number) => pad + (1 - v) * (h - pad * 2);
  const line = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const by = y(base).toFixed(1);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<path d="${line} L${w},${h} L0,${h} Z" fill="${color}" fill-opacity="0.15"/>` +
    `<line x1="0" y1="${by}" x2="${w}" y2="${by}" stroke="${MUTED}" stroke-opacity="0.5" stroke-width="1" stroke-dasharray="3,3"/>` +
    `<path d="${line}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>` +
    '</svg>'
  );
}

/**
 * Rows of the movers list that fit the widget height (dp). Fixed parts take about 110 dp
 * (padding, header, clock tiles, gaps); each mover row is about 18 dp. Design decision.
 */
function moverRows(height: number) {
  if (!height) return 3;
  return Math.max(2, Math.min(6, Math.floor((height - 110) / 18)));
}

export function KeseflyWidget({ data, size }: { data: WidgetData; size?: { width: number; height: number } }) {
  const rtl = data.lang === 'he';
  // Widgets lay out left-to-right only (no row-reverse); in Hebrew each row's children are
  // listed in reverse so the row reads right-to-left.
  const row = 'row' as const;
  const order = <T,>(items: T[]) => (rtl ? [...items].reverse() : items);
  const align = rtl ? ('flex-end' as const) : ('flex-start' as const);
  const width = size?.width ?? 0;
  const height = size?.height ?? 0;
  // Narrow widget (under about 3 cells): no room for the movers column beside the value.
  const showMovers = data.movers.length > 0 && (!width || width >= 230);
  const movers = data.movers.slice(0, moverRows(height));
  // Taller widget: larger value text fills the extra height. Design decision.
  const valueSize = height >= 220 ? 32 : 26;

  const valueBlock = data.value ? (
    <FlexWidget key="v" style={{ flex: 1, height: 'match_parent', flexDirection: 'column', justifyContent: 'center', alignItems: align }}>
      <TextWidget text={data.value} maxLines={1} style={{ adjustsFontSizeToFit: true, fontSize: valueSize, color: '#FFFFFF', fontWeight: '700' }} />
      <TextWidget text={data.day} maxLines={1} style={{ fontSize: 12, color: data.dayUp ? UP : DOWN }} />
      <TextWidget text={data.gain} maxLines={1} style={{ fontSize: 12, color: data.gainUp ? UP : DOWN }} />
    </FlexWidget>
  ) : (
    <FlexWidget key="v" style={{ flex: 1, height: 'match_parent', flexDirection: 'column', justifyContent: 'center', alignItems: align }}>
      <TextWidget text={data.empty} maxLines={3} style={{ fontSize: 13, color: '#FFFFFF' }} />
    </FlexWidget>
  );

  // Movers card size in dp: half the content row (minus gap and card padding). Fallbacks fit 4x2.
  const cardW = width ? Math.floor((width - 28 - 10) / 2) - 20 : 120;
  const midH = height ? height - 28 - 18 - 46 - 16 : 70;
  const charted = movers.filter((m) => m.spark);
  // Few holdings: each gets a block with price and today's sparkline instead of a single row.
  const rich = movers.length <= 2 && charted.length === movers.length;
  const one = movers.length === 1;
  // Text lines in a block: symbol + % (16 dp), price (14 dp, single holding only).
  const sparkH = Math.max(14, Math.floor((midH - 12) / Math.max(1, movers.length)) - (one ? 34 : 20));

  const moverHead = (m: MoverLine) => (
    <FlexWidget style={{ width: 'match_parent', flexDirection: row, justifyContent: 'space-between', alignItems: 'center' }}>
      {order([
        <TextWidget key="s" text={m.symbol} maxLines={1} style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '600' }} />,
        ...(!rich && width >= 300 ? [<TextWidget key="p" text={m.price} maxLines={1} style={{ fontSize: 11, color: MUTED }} />] : []),
        <TextWidget key="c" text={m.pct} maxLines={1} style={{ fontSize: 12, color: m.up ? UP : DOWN, fontWeight: '700' }} />,
      ])}
    </FlexWidget>
  );

  const moversBlock = (
    <FlexWidget
      key="m"
      style={{ flex: 1, height: 'match_parent', backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'column', justifyContent: 'space-around' }}>
      {movers.map((m) =>
        rich ? (
          <FlexWidget key={m.symbol} style={{ width: 'match_parent', flexDirection: 'column', alignItems: align }}>
            {moverHead(m)}
            {one ? <TextWidget text={m.price} maxLines={1} style={{ fontSize: 11, color: MUTED }} /> : null}
            <SvgWidget svg={sparkSvg(m.spark ?? [], m.base ?? 0.5, cardW, sparkH, m.up)} style={{ width: cardW, height: sparkH, marginTop: 2 }} />
          </FlexWidget>
        ) : (
          <FlexWidget key={m.symbol} style={{ width: 'match_parent' }}>
            {moverHead(m)}
          </FlexWidget>
        ),
      )}
    </FlexWidget>
  );

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: BG, borderRadius: 24, padding: 14, flexDirection: 'column', flexGap: 8 }}>
      <FlexWidget style={{ width: 'match_parent', flexDirection: row, justifyContent: 'space-between', alignItems: 'center' }}>
        {order([
          <TextWidget key="t" text={data.title} maxLines={1} style={{ fontSize: 13, color: GOLD, fontWeight: '700' }} />,
          <TextWidget
            key="u"
            text={data.rate ? `${data.rate} · ${data.updated}` : data.updated}
            maxLines={1}
            style={{ fontSize: 11, color: MUTED, textAlign: rtl ? 'left' : 'right' }}
          />,
        ])}
      </FlexWidget>

      <FlexWidget style={{ width: 'match_parent', flex: 1, flexDirection: row, alignItems: 'center', flexGap: 10 }}>
        {order(showMovers ? [valueBlock, moversBlock] : [valueBlock])}
      </FlexWidget>

      <FlexWidget style={{ width: 'match_parent', flexDirection: row, flexGap: 8 }}>
        {order(data.clocks).map((c) => (
          <FlexWidget
            key={c.label}
            style={{ flex: 1, backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'column', alignItems: align }}>
            <FlexWidget style={{ width: 'match_parent', flexDirection: row, justifyContent: 'space-between', alignItems: 'center' }}>
              {order([
                <FlexWidget key="n" style={{ flexDirection: row, alignItems: 'center' }}>
                  {order([
                    <TextWidget key="l" text={c.label} maxLines={1} style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '600' }} />,
                    <TextWidget key="s" text=" " style={{ fontSize: 12 }} />,
                    <SvgWidget key="f" svg={c.flag === 'US' ? US_FLAG : IL_FLAG} style={{ width: 18, height: 12 }} />,
                  ])}
                </FlexWidget>,
                <TextWidget key="t" text={c.time} style={{ fontSize: 14, color: '#FFFFFF', fontWeight: '700' }} />,
              ])}
            </FlexWidget>
            <TextWidget text={c.status} maxLines={1} style={{ fontSize: 10, color: c.open ? UP : MUTED }} />
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}
