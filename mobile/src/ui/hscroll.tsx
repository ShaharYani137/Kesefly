/**
 * Horizontal scroll row that starts with its first item at the reading start in both directions.
 *
 * Android's horizontal ScrollView does not follow the `direction: 'rtl'` style reliably (it laid
 * items left-to-right and opened scrolled to the end, so Hebrew users saw the LAST items first).
 * Here the row is always laid out LTR; in Hebrew the items are reversed and the view opens
 * scrolled to its right end, so item 1 sits at the right edge and the rest continue leftward.
 */
import { Children, type ComponentRef, type ReactNode, useRef } from 'react';
import { ScrollView, type ViewStyle } from 'react-native';

import { useApp } from '@/state/app-store';

export function HScroll({ children, gap = 8, padding = 16, style, contentStyle }: { children: ReactNode; gap?: number; padding?: number; style?: ViewStyle; contentStyle?: ViewStyle }) {
  const { isRTL } = useApp();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const items = Children.toArray(children);
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={[{ flexGrow: 0, direction: 'ltr' }, style]}
      contentContainerStyle={[{ paddingHorizontal: padding, gap, direction: 'ltr' }, contentStyle]}
      onContentSizeChange={() => {
        if (isRTL) ref.current?.scrollToEnd({ animated: false });
      }}>
      {isRTL ? items.reverse() : items}
    </ScrollView>
  );
}
