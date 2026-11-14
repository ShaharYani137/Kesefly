/**
 * Learn: Kesefly Academy. A progress hero (knowledge score, level, XP, streak), a placement
 * test entry, and the personal learning path by level. Lessons picked for the user's own
 * situation carry a "For you" tag; lessons the test showed they know are marked.
 */
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { buildPath, type PathItem } from '@/engine/academy';
import { ACADEMY, PATH } from '@/i18n/academy';
import { fill, useApp } from '@/state/app-store';
import { Appear, Button, Card, Icon, Pill, Row, Screen, SectionHeader, Txt } from '@/ui/components';
import { Fonts, Metrics, useTokens } from '@/ui/theme';

export default function LearnScreen() {
  const { s, lang, academy, profile, holdings } = useApp();
  const { colors } = useTokens();
  const path = useMemo(() => buildPath(academy, profile, holdings), [academy, profile, holdings]);
  const A = ACADEMY[lang];
  const next = path.next ? A.lessons[path.next.id] : null;

  return (
    <Screen title={s.academy.title} subtitle={s.academy.subtitle}>
      {/* ---------- Progress hero ---------- */}
      <Appear index={0}>
        <View style={{ backgroundColor: colors.hero, borderRadius: Metrics.cardRadius + 8, padding: 18, gap: 14 }}>
          <Row style={{ gap: 16 }}>
            <Ring value={path.knowledge / 100} size={92} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="footnote" style={{ color: 'rgba(255,255,255,0.72)' }}>
                {s.academy.knowledge}
              </Txt>
              <Txt variant="title3" style={{ color: '#FFFFFF' }}>
                {`${fill(s.academy.level, { n: path.level })} · ${A.levels[path.level]}`}
              </Txt>
              <Txt variant="footnote" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {`${fill(s.academy.lessonsDone, { done: path.doneCount, total: path.total })} · ${fill(s.academy.xp, { n: academy.xp })}`}
              </Txt>
              {academy.streak > 0 ? (
                <Txt variant="footnote" style={{ color: '#F5C542', fontFamily: Fonts.semibold }}>
                  {`🔥 ${fill(s.academy.streak, { n: academy.streak })}`}
                </Txt>
              ) : null}
            </View>
          </Row>
          {next && path.next ? (
            <Button label={`${s.academy.continue}: ${next.title}`} onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: path.next!.id } })} />
          ) : null}
        </View>
      </Appear>

      {/* ---------- Placement ---------- */}
      <Appear index={1}>
        <Card>
          <Row>
            <Icon sf="checklist" md="quiz" color={colors.accent} />
            <Txt variant="headline" style={{ flex: 1 }}>
              {academy.placement ? fill(s.academy.resultTitle, { level: A.levels[academy.placement.start] }) : s.academy.startTest}
            </Txt>
          </Row>
          <Txt variant="subhead" color="textSecondary">
            {academy.placement
              ? fill(s.academy.resultBody, { correct: academy.placement.correct, total: academy.placement.total, start: academy.placement.start })
              : s.academy.startTestBody}
          </Txt>
          <Button kind={academy.placement ? 'plain' : 'filled'} label={academy.placement ? s.academy.retake : s.academy.startTest} onPress={() => router.push('/assessment')} />
        </Card>
      </Appear>

      {/* ---------- Path ---------- */}
      {PATH.map((lvl, li) => {
        const items = path.items.filter((i) => i.level === lvl.id);
        const done = items.filter((i) => i.status === 'done').length;
        return (
          <View key={lvl.id} style={{ gap: Metrics.gap }}>
            <SectionHeader>{`${fill(s.academy.level, { n: lvl.id })} · ${A.levels[lvl.id]} · ${done}/${items.length}`}</SectionHeader>
            <Appear index={2 + li}>
              <Card style={{ gap: 0, paddingVertical: 4 }}>
                {items.map((it, i) => (
                  <LessonRow key={it.id} item={it} first={i === 0} last={i === items.length - 1} />
                ))}
              </Card>
            </Appear>
          </View>
        );
      })}
    </Screen>
  );
}

function LessonRow({ item, first, last }: { item: PathItem; first: boolean; last: boolean }) {
  const { s, lang } = useApp();
  const { colors } = useTokens();
  const lesson = ACADEMY[lang].lessons[item.id];
  const isNext = item.status === 'next';
  const done = item.status === 'done';
  const nodeBg = done ? colors.positive : isNext ? colors.accent : item.status === 'tested' ? colors.accentSoft : colors.fill;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: item.id } })}
      style={{ flexDirection: 'row', gap: 12, minHeight: 64 }}>
      {/* Path rail with a node per lesson. */}
      <View style={{ width: 28, alignItems: 'center' }}>
        <View style={{ width: 2, flex: 1, backgroundColor: first ? 'transparent' : colors.separator }} />
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: nodeBg, alignItems: 'center', justifyContent: 'center' }}>
          {done ? (
            <Icon sf="checkmark" md="check" size={16} color={colors.background} />
          ) : (
            <Icon sf={isNext ? 'play.fill' : 'book'} md={isNext ? 'play_arrow' : 'menu_book'} size={16} color={isNext ? colors.onAccent : colors.textSecondary} />
          )}
        </View>
        <View style={{ width: 2, flex: 1, backgroundColor: last ? 'transparent' : colors.separator }} />
      </View>
      <View style={{ flex: 1, justifyContent: 'center', gap: 4, paddingVertical: 10 }}>
        <Txt variant="headline" color={item.status === 'open' ? 'text' : done ? 'textSecondary' : 'text'}>
          {lesson.title}
        </Txt>
        <Row style={{ gap: 6, flexWrap: 'wrap' }}>
          <Txt variant="caption" color="textSecondary">
            {fill(s.academy.minutes, { n: lesson.minutes })}
          </Txt>
          {item.forYou && !done ? <Pill label={s.academy.forYou} bg={colors.warning} fg={colors.background} /> : null}
          {isNext ? <Pill label={s.academy.next} bg={colors.accent} fg={colors.onAccent} /> : null}
          {item.status === 'tested' ? <Pill label={s.academy.tested} bg={colors.accentSoft} fg={colors.onAccentSoft} /> : null}
          {done && item.score !== undefined ? (
            <Txt variant="caption" color="positive">{`${s.academy.done} · ${Math.round(item.score * 100)}%`}</Txt>
          ) : null}
        </Row>
      </View>
    </Pressable>
  );
}

/** Knowledge ring (0-1) with the score in the middle. Starts at 12 o'clock and runs clockwise. */
function Ring({ value, size }: { value: number; size: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, direction: 'ltr' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#F5C542" strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * Math.max(0.001, value)} ${c}`} />
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Txt style={{ color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 26, lineHeight: 30, writingDirection: 'ltr' }}>{String(Math.round(value * 100))}</Txt>
      </View>
    </View>
  );
}
