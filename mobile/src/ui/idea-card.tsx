import { View } from 'react-native';

import { formatMoney } from '@/engine/format';
import type { Idea } from '@/engine/recommendations';
import { fill, useApp } from '@/state/app-store';
import { Card, Row, Txt } from '@/ui/components';
import { useTokens } from '@/ui/theme';

/** Idea vars that hold money amounts; everything else is shown as-is. */
const MONEY_VARS = new Set(['gap', 'invest', 'free', 'debt', 'target', 'missing', 'extra', 'needed']);

type IdeaKey = Exclude<keyof ReturnType<typeof useApp>['s']['ideas'], 'title' | 'subtitle'>;

export function useIdeaText(idea: Idea) {
  const { s, profile, lang } = useApp();
  const copy = s.ideas[idea.key as IdeaKey];
  const vars: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(idea.vars ?? {})) {
    vars[k] = MONEY_VARS.has(k) && typeof v === 'number' ? formatMoney(v, profile.currency, lang) : v;
  }
  return { title: fill(copy.title, vars), body: fill(copy.body, vars) };
}

export function IdeaCard({ idea }: { idea: Idea }) {
  const { colors } = useTokens();
  const { title, body } = useIdeaText(idea);
  const dot = idea.kind === 'warning' ? colors.danger : idea.kind === 'action' ? colors.accent : colors.positive;
  return (
    <Card>
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot, marginTop: 6 }} />
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="headline">{title}</Txt>
          <Txt variant="subhead" color="textSecondary">
            {body}
          </Txt>
        </View>
      </Row>
    </Card>
  );
}
