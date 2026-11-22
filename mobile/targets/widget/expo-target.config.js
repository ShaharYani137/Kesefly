/**
 * Kesefly iOS widget target (WidgetKit + SwiftUI), linked into the Xcode project by
 * @bacons/apple-targets on `npx expo prebuild -p ios` / EAS Build.
 * Shares the app's App Group so it can read the data the app writes (src/widget/ios.ts).
 * Design decision: iOS 17 minimum (containerBackground and lock-screen families without
 * fallbacks); older iPhones simply do not offer the widget.
 */
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'KeseflyWidget',
  displayName: 'Kesefly',
  bundleIdentifier: '.widget',
  deploymentTarget: '17.0',
  frameworks: ['SwiftUI', 'WidgetKit'],
  colors: {
    $accent: '#0F7B6C',
    $widgetBackground: '#062A26',
  },
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
