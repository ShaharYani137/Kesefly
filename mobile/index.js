// App entry: Expo Router, plus the Android home-screen widget's headless task handler.
import 'expo-router/entry';

import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './src/widget/task';

registerWidgetTaskHandler(widgetTaskHandler);
