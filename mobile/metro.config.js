// Metro config: Expo defaults, plus web-only stand-ins for native modules (see web-shims/README.md).
// iOS and Android builds are unchanged: the swap happens only when bundling for `web`.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const shim = (file) => path.join(__dirname, 'web-shims', file);
const WEB_SHIMS = {
  'expo-secure-store': shim('secure-store.js'),
  'expo-notifications': shim('notifications.js'),
  'expo-background-task': shim('background-task.js'),
  'expo-task-manager': shim('task-manager.js'),
  'expo-local-authentication': shim('local-authentication.js'),
  '@bacons/apple-targets': shim('apple-targets.js'),
  'react-native-android-widget': shim('android-widget.js'),
};

const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_SHIMS[moduleName]) {
    return { type: 'sourceFile', filePath: WEB_SHIMS[moduleName] };
  }
  return upstream ? upstream(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
