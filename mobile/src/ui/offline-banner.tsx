/** Thin banner at the top when the phone has no Wi-Fi or mobile data (expo-network). */
import { useNetworkState } from 'expo-network';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/state/app-store';
import { Icon, Txt } from '@/ui/components';
import { enterFade } from '@/ui/motion';
import { useTokens } from '@/ui/theme';

export function OfflineBanner() {
  const net = useNetworkState();
  const { s, isRTL } = useApp();
  const { colors } = useTokens();
  const insets = useSafeAreaInsets();
  // isInternetReachable can be null while unknown: only warn on a definite "no".
  const offline = net.isConnected === false || net.isInternetReachable === false;
  if (!offline) return null;
  return (
    <Animated.View entering={enterFade()} pointerEvents="none" style={{ position: 'absolute', top: insets.top + 4, start: 12, end: 12, zIndex: 40 }}>
      <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.danger, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, direction: isRTL ? 'rtl' : 'ltr' }}>
        <Icon sf="wifi.slash" md="wifi_off" size={18} color={colors.background} />
        <Txt variant="footnote" style={{ flex: 1, color: colors.background }}>
          {s.offline}
        </Txt>
      </View>
    </Animated.View>
  );
}
