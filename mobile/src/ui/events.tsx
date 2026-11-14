/** Live market events: data hook (auto-refresh every minute) and the event card. */
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ago, getEvents, type MarketEvent } from '@/engine/news';
import { fill, useApp } from '@/state/app-store';
import { Card, Pill, Row, Txt } from '@/ui/components';
import { Metrics, useTokens } from '@/ui/theme';

const REFRESH_MS = 60_000;

export function useEvents() {
  const { holdings, watchlist, lang } = useApp();
  const symbols = useMemo(() => [...new Set([...holdings.map((h) => h.symbol), ...watchlist])], [holdings, watchlist]);
  const [events, setEvents] = useState<MarketEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const apply = useCallback((list: MarketEvent[] | null) => {
    setEvents((e) => list ?? e ?? []);
    setNow(Date.now());
    setLoading(false);
  }, []);
  const fetchList = useCallback((force: boolean) => getEvents({ symbols, lang, force }).catch(() => null), [symbols, lang]);
  useEffect(() => {
    let alive = true;
    fetchList(false).then((l) => alive && apply(l));
    const id = setInterval(() => fetchList(true).then((l) => alive && apply(l)), REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [fetchList, apply]);
  const refresh = () => {
    setLoading(true);
    fetchList(true).then(apply);
  };
  return { events, loading, now, refresh };
}

export function EventCard({ e, now, expanded, onToggle, compact }: { e: MarketEvent; now: number; expanded?: boolean; onToggle?: () => void; compact?: boolean }) {
  const { s, lang } = useApp();
  const { colors } = useTokens();
  const impactBg = e.impact === 'high' ? colors.danger : e.impact === 'medium' ? colors.warning : colors.fill;
  const impactFg = e.impact === 'low' ? colors.textSecondary : colors.background;
  return (
    <Card style={{ gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggle} style={{ gap: 8 }}>
        <Row style={{ gap: 6, flexWrap: 'wrap' }}>
          <Pill label={s.events.cat[e.category]} bg={colors.accentSoft} fg={colors.onAccentSoft} />
          <Pill label={s.events.impact[e.impact]} bg={impactBg} fg={impactFg} />
          {e.direction ? <Txt variant="caption" style={{ color: e.direction === 'up' ? colors.positive : colors.danger }}>{e.direction === 'up' ? `▲ ${s.events.up}` : `▼ ${s.events.down}`}</Txt> : null}
        </Row>
        <Txt variant={compact ? 'subhead' : 'headline'} numberOfLines={compact ? 3 : undefined} style={{ writingDirection: e.lang === 'he' ? 'rtl' : 'ltr', textAlign: 'left' }}>
          {e.title}
        </Txt>
        <Row style={{ gap: 8 }}>
          <Txt variant="caption" color="textSecondary" style={{ flex: 1 }}>
            {`${e.source} · ${ago(e.time, lang, now)}${e.original ? ` · ${s.events.translated}` : ''}`}
          </Txt>
          {e.affects.length ? (
            <Txt variant="caption" color="accent">
              {fill(s.events.affects, { list: e.affects.slice(0, 3).join(', ') })}
            </Txt>
          ) : null}
        </Row>
      </Pressable>
      {expanded ? (
        <View style={{ gap: 8, borderTopWidth: 0.5, borderColor: colors.separator, paddingTop: 8 }}>
          <Txt variant="footnote" color="accent">
            {s.events.whyTitle}
          </Txt>
          <Txt variant="subhead" color="textSecondary">
            {s.events.why[e.category]}
          </Txt>
          <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(e.link).catch(() => {})} style={{ minHeight: Metrics.minTarget, justifyContent: 'center' }}>
            <Txt variant="headline" color="accent">
              {s.events.read}
            </Txt>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}
