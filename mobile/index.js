// App entry: Expo Router, plus the Android home-screen widget's headless task handler.
import 'expo-router/entry';

import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './src/widget/task';

// The widget exists only on Android. On iOS the library is a no-op, so skip registering it.
if (Platform.OS === 'android') registerWidgetTaskHandler(widgetTaskHandler);
