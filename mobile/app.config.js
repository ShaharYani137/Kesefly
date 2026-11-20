/**
 * Build-time switch on top of app.json.
 *
 * KESEFLY_IOS_WIDGET=0 builds the iPhone app WITHOUT the home-screen widget: no WidgetKit
 * target and no App Group entitlement. A free Apple ID (Sideloadly) cannot sign App Groups,
 * so this is the build file for iPhone users without a paid Apple Developer account.
 * Any other value (or unset) keeps the widget.
 *
 * The app reads `extra.iosWidget` (src/widget/ios.ts) and skips writing widget data when false.
 */
module.exports = ({ config }) => {
  const widget = process.env.KESEFLY_IOS_WIDGET !== '0';
  if (widget) return { ...config, extra: { ...config.extra, iosWidget: true } };

  const entitlements = { ...(config.ios?.entitlements ?? {}) };
  delete entitlements['com.apple.security.application-groups'];
  return {
    ...config,
    ios: { ...config.ios, entitlements },
    plugins: (config.plugins ?? []).filter((p) => (Array.isArray(p) ? p[0] : p) !== '@bacons/apple-targets'),
    extra: { ...config.extra, iosWidget: false },
  };
};
