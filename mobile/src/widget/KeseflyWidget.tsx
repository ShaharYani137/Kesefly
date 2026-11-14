// Opt out of the React Compiler: widgets are rendered outside React (no hooks available),
// so compiled memo hooks (useMemoCache) crash the widget render.
'use no memo';

/**
 * Kesefly Android home-screen widget (react-native-android-widget). 4x2 cells by default,
 * resizable. Dark brand card: portfolio value with today's change and total gain, and live
 * clocks for Wall Street and Tel Aviv with open/closed status. Tapping opens the app.
 * Widgets render native Android views, so only the library's widget primitives are used here.
 */
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetData } from './data';

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

export function KeseflyWidget({ data }: { data: WidgetData }) {
  const rtl = data.lang === 'he';
  // Widgets lay out left-to-right only (no row-reverse); in Hebrew each row's children are
  // listed in reverse so the row reads right-to-left.
  const row = 'row' as const;
  const order = <T,>(items: T[]) => (rtl ? [...items].reverse() : items);
  const align = rtl ? ('flex-end' as const) : ('flex-start' as const);
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: BG, borderRadius: 24, padding: 14, flexDirection: 'column', justifyContent: 'space-between' }}>
      <FlexWidget style={{ width: 'match_parent', flexDirection: row, justifyContent: 'space-between', alignItems: 'center' }}>
        {order([
          <TextWidget key="t" text={data.title} style={{ fontSize: 13, color: GOLD, fontWeight: '700' }} />,
          <TextWidget key="u" text={data.updated} style={{ fontSize: 11, color: MUTED }} />,
        ])}
      </FlexWidget>

      {data.value ? (
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'column', alignItems: align }}>
          <TextWidget text={data.value} style={{ fontSize: 26, color: '#FFFFFF', fontWeight: '700' }} />
          <FlexWidget style={{ flexDirection: row, alignItems: 'center' }}>
            {order([
              <TextWidget key="d" text={data.day} style={{ fontSize: 12, color: data.dayUp ? UP : DOWN }} />,
              <TextWidget key="s" text="   " style={{ fontSize: 12 }} />,
              <TextWidget key="g" text={data.gain} style={{ fontSize: 12, color: data.gainUp ? UP : DOWN }} />,
            ])}
          </FlexWidget>
        </FlexWidget>
      ) : (
        <TextWidget text={data.empty} style={{ fontSize: 13, color: '#FFFFFF' }} />
      )}

      <FlexWidget style={{ width: 'match_parent', flexDirection: row, justifyContent: 'space-between' }}>
        {order(data.clocks).map((c) => (
          <FlexWidget
            key={c.label}
            style={{ backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'column', alignItems: align, width: 'wrap_content' }}>
            <FlexWidget style={{ flexDirection: row, alignItems: 'center' }}>
              {order([
                <TextWidget key="l" text={c.label} style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '600' }} />,
                <TextWidget key="s" text=" " style={{ fontSize: 12 }} />,
                <SvgWidget key="f" svg={c.flag === 'US' ? US_FLAG : IL_FLAG} style={{ width: 18, height: 12 }} />,
                <TextWidget key="t" text={`  ${c.time}  `} style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '700' }} />,
              ])}
            </FlexWidget>
            <TextWidget text={c.status} style={{ fontSize: 10, color: c.open ? UP : MUTED }} />
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}
