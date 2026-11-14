/**
 * One Academy lesson: short sections, a key takeaway, then a 2-question check. Finishing
 * records the score, adds XP and updates the streak, then shows a completion card.
 */
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { XP_LESSON, XP_PER_CORRECT } from '@/engine/academy';
import { ACADEMY, type LessonId } from '@/i18n/academy';
import { fill, useApp } from '@/state/app-store';
import { Appear, Button, Card, Icon, Row, Screen, Txt } from '@/ui/components';
import { enterPop } from '@/ui/motion';
import { QuestionView } from '@/ui/quiz';
import { useTokens } from '@/ui/theme';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: LessonId }>();
  const { s, lang, academy, finishLesson } = useApp();
  const { colors } = useTokens();
  const lesson = ACADEMY[lang].lessons[id as LessonId];
  const [step, setStep] = useState<'read' | number | 'done'>('read');
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [earned, setEarned] = useState(0);

  if (!lesson) return <Screen onBack={() => router.back()}>{null}</Screen>;

  const qIndex = typeof step === 'number' ? step : 0;
  const q = lesson.quiz[qIndex];

  const check = () => {
    setRevealed(true);
    const ok = picked === q.answer;
    if (ok) setCorrect((c) => c + 1);
    Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
  };

  const next = () => {
    if (qIndex + 1 < lesson.quiz.length) {
      setStep(qIndex + 1);
      setPicked(null);
      setRevealed(false);
      return;
    }
    const first = !academy.done[id as LessonId];
    setEarned((first ? XP_LESSON : 0) + correct * XP_PER_CORRECT);
    finishLesson(id as LessonId, correct, lesson.quiz.length);
    setStep('done');
  };

  return (
    <Screen title={lesson.title} subtitle={fill(s.academy.minutes, { n: lesson.minutes })} onBack={() => router.back()}>
      {step === 'read' ? (
        <>
          {lesson.sections.map((p, i) => (
            <Appear key={p} index={i}>
              <Txt variant="body" style={{ lineHeight: 26 }}>
                {p}
              </Txt>
            </Appear>
          ))}
          <Appear index={lesson.sections.length}>
            <Card tone="accent">
              <Row>
                <Icon sf="key.fill" md="key" color={colors.onAccentSoft} />
                <Txt variant="footnote" color="onAccentSoft">
                  {s.academy.takeaway}
                </Txt>
              </Row>
              <Txt variant="headline" color="onAccentSoft">
                {lesson.takeaway}
              </Txt>
            </Card>
          </Appear>
          <Button label={s.academy.check} onPress={() => setStep(0)} />
        </>
      ) : step === 'done' ? (
        <Animated.View entering={enterPop()}>
          <View style={{ backgroundColor: colors.hero, borderRadius: 20, padding: 24, gap: 10, alignItems: 'center' }}>
            <Icon sf="checkmark.seal.fill" md="verified" size={56} color="#F5C542" />
            <Txt variant="title" center style={{ color: '#FFFFFF' }}>
              {s.academy.complete}
            </Txt>
            <Txt variant="headline" center style={{ color: '#F5C542', writingDirection: 'ltr' }}>
              {fill(s.academy.earned, { xp: earned })}
            </Txt>
            <Txt variant="subhead" center style={{ color: 'rgba(255,255,255,0.8)', writingDirection: 'ltr' }}>
              {`${correct}/${lesson.quiz.length}`}
            </Txt>
            <View style={{ alignSelf: 'stretch' }}>
              <Button label={s.academy.back} onPress={() => router.back()} />
            </View>
          </View>
        </Animated.View>
      ) : (
        <>
          <Txt variant="footnote" color="textSecondary">
            {fill(s.academy.question, { n: qIndex + 1, total: lesson.quiz.length })}
          </Txt>
          <QuestionView key={qIndex} q={q} picked={picked} onPick={setPicked} revealed={revealed} />
          {revealed ? (
            <Button label={qIndex + 1 < lesson.quiz.length ? s.academy.nextQ : s.academy.finish} onPress={next} />
          ) : (
            <Button label={s.academy.submit} disabled={picked === null} onPress={check} />
          )}
        </>
      )}
    </Screen>
  );
}
