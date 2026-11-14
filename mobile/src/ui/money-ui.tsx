/**
 * Small pieces shared by the money tools (Tax view, Savings, Import, Compare).
 */
import { Pressable, View } from 'react-native';

import { useApp } from '@/state/app-store';

import { type AndroidSymbol, Icon, Row, type SFSymbol, Txt } from './components';
import { Metrics, useTokens } from './theme';

type ColorKey = 'text' | 'textSecondary' | 'positive' | 'danger' | 'warning' | 'accent';

/** Label on the start side, value on the end side. Values are numbers, so they stay LTR. */
export function LineItem({ label, value, color = 'text', strong }: { label: string; value: string; color?: ColorKey; strong?: boolean }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Txt variant="subhead" color="textSecondary" style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt variant={strong ? 'headline' : 'subhead'} color={color} style={{ writingDirection: 'ltr' }}>
        {value}
      </Txt>
    </Row>
  );
}

/**
 * Navigation row: icon, title, one-line hint, chevron. List-row height meets both platform
 * minimum targets (HIG 44pt, M3 48dp); 56 matches an M3 two-line list item.
 */
export function ToolRow({ sf, md, title, hint, onPress, first }: { sf: SFSymbol; md: AndroidSymbol; title: string; hint: string; onPress: () => void; first?: boolean }) {
  const { colors } = useTokens();
  const { isRTL } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={hint}
      onPress={onPress}
      android_ripple={{ color: colors.fill }}
      style={({ pressed }) => ({ minHeight: Math.max(56, Metrics.minTarget), justifyContent: 'center', paddingVertical: 8, borderTopWidth: first ? 0 : 0.5, borderColor: colors.separator, opacity: pressed ? 0.7 : 1 })}>
      <Row>
        <Icon sf={sf} md={md} color={colors.accent} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="headline">{title}</Txt>
          <Txt variant="footnote" color="textSecondary">
            {hint}
          </Txt>
        </View>
        <Icon sf={isRTL ? 'chevron.left' : 'chevron.right'} md={isRTL ? 'chevron_left' : 'chevron_right'} size={18} color={colors.textSecondary} />
      </Row>
    </Pressable>
  );
}
