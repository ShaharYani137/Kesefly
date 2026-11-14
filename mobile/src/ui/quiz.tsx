/** One multiple-choice question: options, check, feedback with explanation. Shared by lessons and the placement test. */
import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { Question } from '@/i18n/academy';
import { useApp } from '@/state/app-store';
import { Icon, Row, Txt } from '@/ui/components';
import { enterFade, enterPop } from '@/ui/motion';
import { Metrics, useTokens } from '@/ui/theme';

export function QuestionView({
  q,
  picked,
  onPick,
  revealed,
  showExplain = true,
}: {
  q: Question;
  picked: number | null;
  onPick: (i: number) => void;
  revealed: boolean;
  showExplain?: boolean;
}) {
  const { s } = useApp();
  const { colors } = useTokens();
  const right = picked === q.answer;
  return (
    <View style={{ gap: 10 }}>
      <Txt variant="title3">{q.q}</Txt>
      {q.options.map((o, i) => {
        const isPicked = picked === i;
        const isAnswer = revealed && i === q.answer;
        const isWrong = revealed && isPicked && !right;
        const border = isAnswer ? colors.positive : isWrong ? colors.danger : isPicked ? colors.accent : colors.separator;
        return (
          <Pressable
            key={o}
            accessibilityRole="radio"
            accessibilityState={{ selected: isPicked, disabled: revealed }}
            disabled={revealed}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onPick(i);
            }}
            style={{
              minHeight: Metrics.minTarget + 8,
              borderRadius: 14,
              borderWidth: isPicked || isAnswer ? 2 : 1,
              borderColor: border,
              backgroundColor: isPicked && !revealed ? colors.accentSoft : colors.card,
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}>
            <Txt variant="body" style={{ flex: 1 }}>
              {o}
            </Txt>
            {isAnswer ? (
              <Animated.View entering={enterPop()}>
                <Icon sf="checkmark.circle.fill" md="check_circle" color={colors.positive} />
              </Animated.View>
            ) : isWrong ? (
              <Icon sf="xmark.circle.fill" md="cancel" color={colors.danger} />
            ) : null}
          </Pressable>
        );
      })}
      {revealed && showExplain ? (
        <Animated.View entering={enterFade()} style={{ gap: 4 }}>
          <Row>
            <Txt variant="headline" color={right ? 'positive' : 'danger'}>
              {right ? s.academy.correct : s.academy.wrong}
            </Txt>
          </Row>
          <Txt variant="subhead" color="textSecondary">
            {q.explain}
          </Txt>
        </Animated.View>
      ) : null}
    </View>
  );
}
