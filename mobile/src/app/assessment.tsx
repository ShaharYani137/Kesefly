/**
 * Placement test: 12 questions (3 per level), one per screen with a progress bar. No
 * feedback during the test so it measures what the user knows; the result sets the start
 * level and marks known levels on the learning path.
 */
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { type Placement, scorePlacement } from '@/engine/academy';
import { ACADEMY } from '@/i18n/academy';
import { fill, useApp } from '@/state/app-store';
import { Button, Icon, ProgressBar, Screen, Txt } from '@/ui/components';
import { enterItem, enterPop } from '@/ui/motion';
import { QuestionView } from '@/ui/quiz';
import { useTokens } from '@/ui/theme';

export default function AssessmentScreen() {
  const { s, lang, savePlacement } = useApp();
  const { colors } = useTokens();
  const qs = ACADEMY[lang].placement;
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<Placement | null>(null);

  const next = () => {
    if (picked === null) return;
    const all = [...answers, picked];
    setAnswers(all);
    setPicked(null);
    if (i + 1 < qs.length) {
      setI(i + 1);
      return;
    }
    const r = scorePlacement(qs, all);
    savePlacement(r);
    setResult(r);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  return (
    <Screen title={s.academy.testTitle} onBack={() => router.back()}>
      {result ? (
        <Animated.View entering={enterPop()}>
          <View style={{ backgroundColor: colors.hero, borderRadius: 20, padding: 24, gap: 12, alignItems: 'center' }}>
            <Icon sf="graduationcap.fill" md="school" size={56} color="#F5C542" />
            <Txt variant="title" center style={{ color: '#FFFFFF' }}>
              {fill(s.academy.resultTitle, { level: ACADEMY[lang].levels[result.start] })}
            </Txt>
            <Txt variant="subhead" center style={{ color: 'rgba(255,255,255,0.85)' }}>
              {fill(s.academy.resultBody, { correct: result.correct, total: result.total, start: result.start })}
            </Txt>
            <View style={{ alignSelf: 'stretch' }}>
              <Button label={s.academy.seePath} onPress={() => router.back()} />
            </View>
          </View>
        </Animated.View>
      ) : (
        <>
          <ProgressBar value={i / qs.length} />
          <Txt variant="footnote" color="textSecondary">
            {fill(s.academy.question, { n: i + 1, total: qs.length })}
          </Txt>
          <Animated.View key={i} entering={enterItem(0)}>
            <QuestionView q={qs[i]} picked={picked} onPick={setPicked} revealed={false} showExplain={false} />
          </Animated.View>
          <Button label={i + 1 < qs.length ? s.academy.nextQ : s.academy.finish} disabled={picked === null} onPress={next} />
        </>
      )}
    </Screen>
  );
}
