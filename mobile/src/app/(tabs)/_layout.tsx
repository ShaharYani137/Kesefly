import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { useApp } from '@/state/app-store';
import { Fonts, useTokens } from '@/ui/theme';

/**
 * Native tab bar: UITabBar on iOS (SF Symbols), Material navigation bar on Android (Material Symbols).
 * 5 destinations, the M3 maximum (m3-expressive references/components/navigation.md).
 *
 * RTL: native layout stays LTR (expo-localization supportsRTL=false), so for Hebrew the
 * destinations are listed in reverse. Home then sits on the right, where Hebrew reading starts.
 * `key={lang}` remounts the bar so the new order applies at once.
 */
const TABS = [
  { name: 'index', label: 'home', sf: 'house.fill', md: 'home' },
  { name: 'helper', label: 'helper', sf: 'sparkles', md: 'psychology' },
  {
    name: 'plan',
    label: 'plan',
    sf: 'chart.line.uptrend.xyaxis',
    md: 'trending_up',
  },
  {
    name: 'stocks',
    label: 'stocks',
    sf: 'chart.bar.xaxis',
    md: 'candlestick_chart',
  },
  { name: 'learn', label: 'learn', sf: 'book.fill', md: 'school' },
] as const;

/** Open on Home even when the Hebrew order puts it last in the list. */
export const unstable_settings = { initialRouteName: 'index' };

export default function TabsLayout() {
  const { onboarded, s, lang, isRTL } = useApp();
  const { colors, isIOS } = useTokens();
  if (!onboarded) return <Redirect href="/onboarding" />;

  const tabs = isRTL ? [...TABS].reverse() : TABS;
  return (
    <NativeTabs
      key={lang}
      tintColor={colors.accent}
      backgroundColor={isIOS ? undefined : colors.card}
      indicatorColor={isIOS ? undefined : colors.accentSoft}
      // M3 navigation bar: every destination keeps its label, not only the selected one.
      labelVisibilityMode="labeled"
      labelStyle={{ fontFamily: Fonts.medium }}>
      {tabs.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Label>{s.tabs[t.label]}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={t.sf} md={t.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
