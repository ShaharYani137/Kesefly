/**
 * Lab risk gate: a short lesson ("most day traders lose money"), a 3-question quiz and an
 * acknowledgement. The Lab opens only after all three answers are right and the box is ticked.
 */
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { fill, useApp } from '@/state/app-store';
import { useLab } from '@/state/lab-store';
import { Appear, Button, Card, Icon, Row, Screen, Txt } from '@/ui/components';
import { LabFine } from '@/ui/lab-ui';
import { QuestionView } from '@/ui/quiz';
import { Metrics, useTokens } from '@/ui/theme';

export default function LabGate() {
  const { s } = useApp();
  const lab = useLab();
  const { colors } = useTokens();
  const g = s.lab.gate;
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [ack, setAck] = useState(false);
  const q = g.questions[step];
  const quizDone = step >= g.questions.length;
  const right = picked === q?.answer;

  const check = () => {
    setRevealed(true);
    Haptics.notificationAsync(right ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
  };
  const next = () => {
    if (!right) {
      setPicked(null);
      setRevealed(false);
      return;
    }
    setStep((n) => n + 1);
    setPicked(null);
    setRevealed(false);
  };
  const open = () => {
    lab.accept();
    router.replace('/lab');
  };

  return (
    <Screen title={g.title} onBack={() => router.back()}>
      <Appear>
        <Card tone="accent">
          <Row style={{ alignItems: 'flex-start' }}>
            <Icon sf="exclamationmark.triangle.fill" md="warning" color={colors.warning} />
            <Txt variant="headline" style={{ flex: 1 }}>
              {g.lead}
            </Txt>
          </Row>
          {g.body.map((p) => (
            <Txt key={p} variant="body">
              {p}
            </Txt>
          ))}
        </Card>
      </Appear>
      {!quizDone && q ? (
        <Appear index={1}>
          <Card style={{ gap: Metrics.gap }}>
            <Txt variant="footnote" color="textSecondary">
              {fill(g.quizTitle, { n: step + 1 })}
            </Txt>
            <QuestionView q={q} picked={picked} onPick={setPicked} revealed={revealed} />
            {revealed && !right ? (
              <Txt variant="subhead" color="danger">
                {g.tryAgain}
              </Txt>
            ) : null}
            {revealed ? <Button label={g.next} onPress={next} /> : <Button label={g.check} onPress={check} disabled={picked == null} />}
          </Card>
        </Appear>
      ) : (
        <Appear index={1}>
          <Card style={{ gap: Metrics.gap }}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: ack }} onPress={() => setAck((a) => !a)} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: Metrics.minTarget }}>
              <Icon sf={ack ? 'checkmark.square.fill' : 'square'} md={ack ? 'check_box' : 'check_box_outline_blank'} color={ack ? colors.accent : colors.textSecondary} />
              <Txt variant="body" style={{ flex: 1 }}>
                {g.ack}
              </Txt>
            </Pressable>
            <Button label={g.open} onPress={open} disabled={!ack} />
          </Card>
        </Appear>
      )}
      <LabFine />
    </Screen>
  );
}
