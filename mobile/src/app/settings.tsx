import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Switch, View } from 'react-native';

import type { Currency, Lang } from '@/engine/types';
import { fill, useApp } from '@/state/app-store';
import { cancelTips, requestPermission, scheduleWeeklyTips, sendTestTip } from '@/state/notifications';
import { Button, Card, Disclaimer, Row, Screen, SectionHeader, Segmented, Txt } from '@/ui/components';
import { useTokens } from '@/ui/theme';

export default function SettingsScreen() {
  const { s, lang, setLang, profile, updateProfile, reset, notify, setNotify } = useApp();
  const { colors } = useTokens();

  const toggleNotify = async (on: boolean) => {
    if (!on) {
      setNotify(false);
      await cancelTips();
      return;
    }
    if (!(await requestPermission())) {
      Alert.alert(s.settings.notifications, s.settings.notifyDenied);
      return;
    }
    setNotify(true);
    await scheduleWeeklyTips(profile, s, lang);
  };

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

      <SectionHeader>{s.settings.notifications}</SectionHeader>
      <Card>
        <Row>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="headline">{s.settings.notifyLabel}</Txt>
            <Txt variant="footnote" color="textSecondary">
              {s.settings.notifyBody}
            </Txt>
          </View>
          <Switch
            accessibilityLabel={s.settings.notifyLabel}
            value={notify}
            onValueChange={toggleNotify}
            trackColor={{ true: colors.accent, false: colors.fill }}
            thumbColor="#FFFFFF"
          />
        </Row>
        {notify ? <Button kind="plain" label={s.settings.notifyTest} onPress={() => sendTestTip(profile, s, lang)} /> : null}
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
          {fill(s.settings.version, {
            v: Constants.expoConfig?.version ?? '1.0.0',
          })}
        </Txt>
      </Card>
    </Screen>
  );
}
