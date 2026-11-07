import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, View } from 'react-native';

import type { Currency, Lang } from '@/engine/types';
import { fill, useApp } from '@/state/app-store';
import { Button, Card, Disclaimer, Screen, SectionHeader, Segmented, Txt } from '@/ui/components';

export default function SettingsScreen() {
  const { s, lang, setLang, profile, updateProfile, reset } = useApp();

  const confirmReset = () =>
    Alert.alert(s.settings.resetConfirmTitle, s.settings.resetConfirmBody, [
      { text: s.settings.cancel, style: 'cancel' },
      { text: s.settings.delete, style: 'destructive', onPress: reset },
    ]);

  return (
    <Screen title={s.settings.title} onBack={() => router.back()}>
      <SectionHeader>{s.settings.language}</SectionHeader>
      <Card>
        <Segmented<Lang>
          value={lang}
          onChange={setLang}
          options={[
            { value: 'en', label: 'English' },
            { value: 'he', label: 'עברית' },
          ]}
        />
      </Card>

      <SectionHeader>{s.settings.currency}</SectionHeader>
      <Card>
        <Segmented<Currency>
          value={profile.currency}
          onChange={(currency) => updateProfile({ currency })}
          options={[
            { value: 'USD', label: 'USD $' },
            { value: 'ILS', label: 'ILS ₪' },
          ]}
        />
      </Card>

      <View style={{ gap: 4 }}>
        <Button kind="tonal" label={s.settings.editProfile} onPress={() => router.push('/onboarding?edit=1')} />
        <Button kind="destructive" label={s.settings.reset} onPress={confirmReset} />
      </View>

      <SectionHeader>{s.settings.about}</SectionHeader>
      <Card>
        <Txt variant="subhead">{s.settings.privacy}</Txt>
        <Disclaimer />
        <Txt variant="footnote" color="textSecondary">
          {fill(s.settings.version, { v: Constants.expoConfig?.version ?? '1.0.0' })}
        </Txt>
      </Card>
    </Screen>
  );
}
