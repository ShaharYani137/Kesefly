/**
 * First-run guided tour: 8 swipeable cards that explain the app's areas, shown ONCE (flag in
 * AsyncStorage, `investapp/tour/v1`), after the profile setup and only while the app is
 * unlocked. Skip or the last button closes it for good.
 *
 * Cards follow the text direction: in Hebrew the first card is on the right and "Next" moves
 * left. DESIGN DECISIONS: full-screen sheet on the background color, a 96pt icon tile per card,
 * dots for progress; sizes from Metrics (theme.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fill, useApp } from '@/state/app-store';
import { AppIconBadge, Button, Icon, type AndroidSymbol, type SFSymbol, Txt } from '@/ui/components';
import { Metrics, useTokens } from '@/ui/theme';

const SEEN_KEY = 'investapp/tour/v1';

const ICONS: Record<string, { sf: SFSymbol; md: AndroidSymbol } | null> = {
  welcome: null,
  home: { sf: 'house.fill', md: 'home' },
  plan: { sf: 'chart.line.uptrend.xyaxis', md: 'trending_up' },
  stocks: { sf: 'chart.bar.xaxis', md: 'candlestick_chart' },
  lab: { sf: 'flask', md: 'science' },
  helper: { sf: 'sparkles', md: 'psychology' },
  learn: { sf: 'book.fill', md: 'school' },
  privacy: { sf: 'lock.shield', md: 'shield_lock' },
};

/** `ready`: onboarded and unlocked. */
export function AppTour({ ready }: { ready: boolean }) {
  const { s, isRTL } = useApp();
  const { colors } = useTokens();
  const { width } = useWindowDimensions();
  const [show, setShow] = useState(false);
  const [page, setPage] = useState(0);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const slides = s.tour.slides;
  const n = slides.length;
  const last = page === n - 1;
  // The pager itself runs left to right; Hebrew shows the cards mirrored and starts at the right
  // end, so the first card is on the right and "Next" moves left (RTL reading order).
  const shown = isRTL ? [...slides].reverse() : slides;
  const xOf = (p: number) => (isRTL ? n - 1 - p : p) * width;
  const pageOf = (x: number) => {
    const i = Math.round(x / width);
    return isRTL ? n - 1 - i : i;
  };

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.getItem(SEEN_KEY)
      .then((v) => {
        if (!v) setShow(true);
      })
      .catch(() => {});
  }, [ready]);

  const finish = () => {
    setShow(false);
    AsyncStorage.setItem(SEEN_KEY, String(Date.now())).catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };
  const go = (p: number) => {
    setPage(p);
    scroller.current?.scrollTo({ x: xOf(p), animated: true });
    Haptics.selectionAsync().catch(() => {});
  };

  if (!show) return null;
  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={finish}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, direction: isRTL ? 'rtl' : 'ltr' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Metrics.margin, minHeight: Metrics.minTarget }}>
          <Txt variant="footnote" color="textSecondary">
            {fill(s.tour.step, { n: page + 1, total: slides.length })}
          </Txt>
          {!last ? <Button kind="plain" label={s.tour.skip} onPress={finish} /> : null}
        </View>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(pageOf(e.nativeEvent.contentOffset.x))}
          onLayout={() => scroller.current?.scrollTo({ x: xOf(page), animated: false })}
          style={{ flex: 1, direction: 'ltr' }}>
          {shown.map((sl) => {
            const icon = ICONS[sl.key];
            return (
              <View key={sl.key} style={{ width, flex: 1, direction: isRTL ? 'rtl' : 'ltr', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Metrics.margin * 2, gap: Metrics.gap }}>
                {icon ? (
                  <View style={{ width: 96, height: 96, borderRadius: 27, backgroundColor: '#0F7B6C', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon sf={icon.sf} md={icon.md} size={48} color="#FFFFFF" />
                  </View>
                ) : (
                  <AppIconBadge size={96} />
                )}
                <Txt variant="title" center accessibilityRole="header">
                  {sl.title}
                </Txt>
                <Txt variant="body" color="textSecondary" center>
                  {sl.body}
                </Txt>
              </View>
            );
          })}
        </ScrollView>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: Metrics.gap }}>
          {slides.map((sl, i) => (
            <View key={sl.key} style={{ width: i === page ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i === page ? colors.accent : colors.separator }} />
          ))}
        </View>
        <View style={{ paddingHorizontal: Metrics.margin, paddingBottom: Metrics.margin }}>
          <Button label={last ? s.tour.done : s.tour.next} onPress={() => (last ? finish() : go(page + 1))} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
