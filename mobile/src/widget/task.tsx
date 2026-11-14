// Opt out of the React Compiler: widgets are rendered outside React (no hooks available),
// so compiled memo hooks (useMemoCache) crash the widget render.
'use no memo';

/**
 * Widget task handler (headless JS). Android calls it when the widget is added, resized,
 * updated (about every 30 minutes, updatePeriodMillis in app.json) or tapped.
 * `refreshWidget()` lets the app push fresh numbers right away (e.g. after editing holdings).
 */
import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';

import { widgetData } from './data';
import { KeseflyWidget } from './KeseflyWidget';

export const WIDGET_NAME = 'Kesefly';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const data = await widgetData();
      props.renderWidget(<KeseflyWidget data={data} />);
      break;
    }
    default:
      break;
  }
}

/** Re-renders every placed Kesefly widget with live data. No-op when none is on the home screen. */
export async function refreshWidget() {
  const data = await widgetData();
  await requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: () => <KeseflyWidget data={data} />,
    widgetNotFound: () => {},
  });
}
