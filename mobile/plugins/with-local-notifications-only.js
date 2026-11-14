/**
 * iOS: drop the push-notification entitlement (`aps-environment`).
 *
 * The expo-notifications config plugin adds `aps-environment` so the app can receive remote
 * pushes. Kesefly only schedules LOCAL notifications (weekly tips, event and price alerts),
 * which need no entitlement. A free Apple ID (used to sideload the app with Sideloadly) cannot
 * sign an app that asks for `aps-environment`, so the install would fail.
 *
 * Runs as a "finalized" mod, after every other plugin has written the entitlements file, so
 * the order of plugins in app.json does not matter.
 *
 * Remove this plugin from app.json if the app ever starts using remote push (Expo push tokens).
 * That also needs a paid Apple Developer account.
 */
const fs = require('fs');
const plist = require('@expo/plist').default;
const { IOSConfig, withFinalizedMod } = require('expo/config-plugins');

module.exports = function withLocalNotificationsOnly(config) {
  return withFinalizedMod(config, [
    'ios',
    async (cfg) => {
      const file = IOSConfig.Entitlements.getEntitlementsPath(cfg.modRequest.projectRoot);
      if (file && fs.existsSync(file)) {
        const data = plist.parse(fs.readFileSync(file, 'utf8'));
        if ('aps-environment' in data) {
          delete data['aps-environment'];
          fs.writeFileSync(file, plist.build(data));
        }
      }
      return cfg;
    },
  ]);
};
