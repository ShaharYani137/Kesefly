import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useApp } from '@/state/app-store';
import { Card, Row, Screen, Txt } from '@/ui/components';
import { Metrics, useTokens } from '@/ui/theme';

export default function LearnScreen() {
  const { s } = useApp();
  const { colors } = useTokens();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Screen title={s.learn.title} subtitle={s.learn.subtitle}>
      {s.learn.lessons.map((lesson, i) => {
        const expanded = open === i;
        return (
          <Card key={lesson.title}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setOpen(expanded ? null : i)}
              style={{ minHeight: Metrics.minTarget, justifyContent: 'center' }}>
              <Row>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: colors.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ color: colors.onAccentSoft, fontWeight: '700' }}>{i + 1}</Text>
                </View>
                <Txt variant="headline" style={{ flex: 1 }}>
                  {lesson.title}
                </Txt>
                <Text style={{ color: colors.textSecondary, fontSize: 17 }}>{expanded ? '−' : '+'}</Text>
              </Row>
            </Pressable>
            {expanded ? (
              <Txt variant="body" color="textSecondary">
                {lesson.body}
              </Txt>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
