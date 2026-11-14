/**
 * Market events: world and economy news ranked for the user's stocks. Filters (all, my stocks,
 * economy, Israel, world), impact and tone tags, the symbols each story touches, and a
 * "why it matters" explainer per category. Auto-refreshes every minute; pull to refresh.
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { EventCategory } from '@/engine/news';
import { useApp } from '@/state/app-store';
import { BackButton, Card, Chip, LiveDot, Row, Txt } from '@/ui/components';
import { EventCard, useEvents } from '@/ui/events';
import { enterItem, Springs } from '@/ui/motion';
import { Metrics, useTokens } from '@/ui/theme';

type Filter = 'all' | 'mine' | 'economy' | 'israel' | 'world';
const ECONOMY: EventCategory[] = ['rates', 'inflation', 'jobs', 'growth', 'currency', 'energy'];
const WORLD: EventCategory[] = ['geopolitics', 'trade', 'energy'];

export default function EventsScreen() {
  const { s, isRTL } = useApp();
  const { colors } = useTokens();
  const { events, loading, now, refresh } = useEvents();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);

  const shown = useMemo(() => {
    const all = events ?? [];
    switch (filter) {
      case 'mine':
        return all.filter((e) => e.affects.length > 0);
      case 'economy':
        return all.filter((e) => ECONOMY.includes(e.category));
      case 'israel':
        return all.filter((e) => e.category === 'israel' || e.lang === 'he' || e.affects.some((a) => a.endsWith('.TA')));
      case 'world':
        return all.filter((e) => WORLD.includes(e.category));
      default:
        return all;
    }
  }, [events, filter]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background, direction: isRTL ? 'rtl' : 'ltr' }}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 4, paddingTop: 4 }}>
        <BackButton onPress={() => router.back()} />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: Metrics.margin, paddingBottom: Metrics.margin * 3, gap: Metrics.gap }}
        refreshControl={<RefreshControl refreshing={loading && events !== null} onRefresh={refresh} tintColor={colors.accent} colors={[colors.accent]} />}>
        <View style={{ gap: 4 }}>
          <Row style={{ gap: 8 }}>
            <Txt variant="largeTitle" accessibilityRole="header" style={{ flexShrink: 1 }}>
              {s.events.live}
            </Txt>
            <LiveDot />
          </Row>
          <Txt variant="subhead" color="textSecondary">
            {s.events.subtitle}
          </Txt>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(Object.keys(s.events.filters) as Filter[]).map((f) => (
            <Chip key={f} label={(filter === f ? '✓ ' : '') + s.events.filters[f]} onPress={() => setFilter(f)} />
          ))}
        </View>

        {events === null ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : shown.length === 0 ? (
          <Card>
            <Txt color="textSecondary">{s.events.empty}</Txt>
          </Card>
        ) : (
          shown.slice(0, 60).map((e, i) => (
            <Animated.View key={e.id} entering={i < 10 ? enterItem(i) : undefined} layout={LinearTransition.springify().damping(Springs.spatialDefault.damping).stiffness(Springs.spatialDefault.stiffness)}>
              <EventCard e={e} now={now} expanded={open === e.id} onToggle={() => setOpen(open === e.id ? null : e.id)} />
            </Animated.View>
          ))
        )}
        <Txt variant="footnote" color="textSecondary">
          {s.disclaimer}
        </Txt>
      </ScrollView>
    </SafeAreaView>
  );
}
