import { router } from 'expo-router';
import { useMemo } from 'react';

import { recommendations } from '@/engine/recommendations';
import { useApp } from '@/state/app-store';
import { Appear, Disclaimer, Screen } from '@/ui/components';
import { IdeaCard } from '@/ui/idea-card';

export default function IdeasScreen() {
  const { s, profile } = useApp();
  const ideas = useMemo(() => recommendations(profile), [profile]);
  return (
    <Screen title={s.ideas.title} subtitle={s.ideas.subtitle} onBack={() => router.back()}>
      {ideas.map((i, n) => (
        <Appear key={i.key} index={n}>
          <IdeaCard idea={i} />
        </Appear>
      ))}
      <Disclaimer />
    </Screen>
  );
}
