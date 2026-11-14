import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Share, Switch, View } from 'react-native';

import type { Currency, Lang } from '@/engine/types';
import type { Prefs } from '@/state/app-store';
import { fill, useApp } from '@/state/app-store';
import { useAuth } from '@/state/auth';
import { previewSound, sendTestEventAlert } from '@/state/event-alerts';
import { type NotifType, SOUND_IDS, type SoundId } from '@/state/sounds';
import { cancelTips, requestPermission, scheduleWeeklyTips, sendTestTip } from '@/state/notifications';
import { alertDir, bidi } from '@/ui/bidi';
import { Button, Card, Chip, Disclaimer, Row, Screen, SectionHeader, Segmented, Txt } from '@/ui/components';
import { useTokens } from '@/ui/theme';

export default function SettingsScreen() {
  const { s, lang, isRTL, setLang, profile, updateProfile, reset, notify, setNotify, eventAlerts, setEventAlerts, holdings, watchlist, prefs, setPrefs, academy, resetAcademy } = useApp();
  const auth = useAuth();
  const { colors } = useTokens();

  const toggleEvents = async (on: boolean) => {
    if (on && !(await requestPermission())) {
      alertDir(isRTL, s.events.settingsLabel, s.settings.notifyDenied);
      return;
    }
    setEventAlerts(on);
  };

  const toggleBio = async (on: boolean) => {
    const ok = await auth.setBiometric(on, bidi(s.auth.bioPrompt, isRTL));
    if (!ok && on) alertDir(isRTL, s.settings2.biometric, s.settings2.biometricUnavailable);
  };

  const confirmSignOut = () =>
    alertDir(isRTL, s.settings2.signOut, s.settings2.signOutConfirm, [
      { text: s.settings.cancel, style: 'cancel' },
      { text: s.settings2.signOut, style: 'destructive', onPress: auth.signOut },
    ]);

  const toggleNotify = async (on: boolean) => {
    if (!on) {
      setNotify(false);
      await cancelTips();
      return;
    }
    if (!(await requestPermission())) {
      alertDir(isRTL, s.settings.notifications, s.settings.notifyDenied);
      return;
    }
    setNotify(true);
    await scheduleWeeklyTips(profile, s, lang, prefs.sounds.tips);
  };

  const exportData = () =>
    Share.share({
      title: s.settings3.exportTitle,
      message: JSON.stringify({ exportedAt: new Date().toISOString(), profile, holdings, watchlist, academy, prefs }, null, 2),
    }).catch(() => {});

  const confirmResetLearning = () =>
    alertDir(isRTL, s.settings3.resetLearning, s.settings3.resetLearningConfirm, [
      { text: s.settings.cancel, style: 'cancel' },
      { text: s.settings.delete, style: 'destructive', onPress: resetAcademy },
    ]);

  const confirmReset = () =>
    alertDir(isRTL, s.settings.resetConfirmTitle, s.settings.resetConfirmBody, [
      { text: s.settings.cancel, style: 'cancel' },
      { text: s.settings.delete, style: 'destructive', onPress: reset },
    ]);

  return (
    <Screen title={s.settings.title} onBack={() => router.back()}>
      <SectionHeader>{s.settings2.account}</SectionHeader>
      <Card>
        <Txt variant="headline">{auth.account?.name ?? ''}</Txt>
        <Txt variant="subhead" color="textSecondary" style={{ writingDirection: 'ltr' }}>
          {auth.account?.email ?? ''}
        </Txt>
        <Txt variant="footnote" color="textSecondary">
          {auth.account?.mode === 'cloud' ? s.settings2.cloudAccount : s.settings2.deviceAccount}
        </Txt>
      </Card>

      <SectionHeader>{s.settings2.security}</SectionHeader>
      <Card>
        <Row>
          <Txt variant="body" style={{ flex: 1 }}>
            {s.settings2.biometric}
          </Txt>
          <Switch
            accessibilityLabel={s.settings2.biometric}
            value={auth.biometric}
            onValueChange={toggleBio}
            disabled={!auth.biometricType}
            trackColor={{ true: colors.accent, false: colors.fill }}
            thumbColor="#FFFFFF"
          />
        </Row>
        {!auth.biometricType ? (
          <Txt variant="footnote" color="textSecondary">
            {s.settings2.biometricUnavailable}
          </Txt>
        ) : null}
        <Txt variant="subhead" color="textSecondary">
          {s.settings3.autoLock}
        </Txt>
        <Segmented<string>
          value={String(prefs.autoLock)}
          onChange={(v) => setPrefs({ autoLock: Number(v) as Prefs['autoLock'] })}
          options={[
            { value: '0', label: s.settings3.autoLockOpts.now },
            { value: '60', label: s.settings3.autoLockOpts.m1 },
            { value: '300', label: s.settings3.autoLockOpts.m5 },
            { value: '-1', label: s.settings3.autoLockOpts.start },
          ]}
        />
        <Button kind="plain" label={s.settings3.changePin} onPress={auth.changePin} />
        <Button kind="plain" label={s.settings2.lockNow} onPress={auth.lock} />
      </Card>

      <SectionHeader>{s.settings3.appearance}</SectionHeader>
      <Card>
        <Segmented<Prefs['theme']>
          value={prefs.theme}
          onChange={(theme) => setPrefs({ theme })}
          options={(['system', 'light', 'dark'] as const).map((v) => ({ value: v, label: s.settings3.theme[v] }))}
        />
      </Card>

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
        {notify ? <Button kind="plain" label={s.settings.notifyTest} onPress={() => sendTestTip(profile, s, lang, prefs.sounds.tips)} /> : null}
      </Card>
      <Card>
        <Row>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="headline">{s.events.settingsLabel}</Txt>
            <Txt variant="footnote" color="textSecondary">
              {s.events.settingsBody}
            </Txt>
          </View>
          <Switch
            accessibilityLabel={s.events.settingsLabel}
            value={eventAlerts}
            onValueChange={toggleEvents}
            trackColor={{ true: colors.accent, false: colors.fill }}
            thumbColor="#FFFFFF"
          />
        </Row>
        {eventAlerts ? (
          <Button
            kind="plain"
            label={s.events.test}
            onPress={() => sendTestEventAlert(lang, [...new Set([...holdings.map((h) => h.symbol), ...watchlist])], prefs.sounds).catch(() => {})}
          />
        ) : null}
      </Card>

      {eventAlerts ? (
        <>
          <SectionHeader>{s.settings3.alerts}</SectionHeader>
          <Card style={{ gap: 12 }}>
            <Txt variant="subhead" color="textSecondary">
              {s.settings3.scope}
            </Txt>
            <Segmented<Prefs['alertScope']>
              value={prefs.alertScope}
              onChange={(alertScope) => setPrefs({ alertScope })}
              options={(['mine', 'important', 'all'] as const).map((v) => ({ value: v, label: s.settings3.scopeOpts[v] }))}
            />
            <Txt variant="footnote" color="textSecondary">
              {s.settings3.scopeHint}
            </Txt>
            <Txt variant="subhead" color="textSecondary">
              {s.settings3.move}
            </Txt>
            <Segmented<string>
              value={String(prefs.moveThreshold)}
              onChange={(v) => setPrefs({ moveThreshold: Number(v) as Prefs['moveThreshold'] })}
              options={['2', '3', '5'].map((v) => ({ value: v, label: `±${v}%` }))}
            />
            <Row>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="body">{s.settings3.quiet}</Txt>
                <Txt variant="footnote" color="textSecondary">
                  {s.settings3.quietHint}
                </Txt>
              </View>
              <Switch
                accessibilityLabel={s.settings3.quiet}
                value={prefs.quietHours}
                onValueChange={(quietHours) => setPrefs({ quietHours })}
                trackColor={{ true: colors.accent, false: colors.fill }}
                thumbColor="#FFFFFF"
              />
            </Row>
          </Card>
        </>
      ) : null}

      <SectionHeader>{s.settings3.sounds}</SectionHeader>
      <Card style={{ gap: 12 }}>
        <Txt variant="footnote" color="textSecondary">
          {s.settings3.soundsHint}
        </Txt>
        {(['tips', 'events', 'moves'] as NotifType[]).map((type) => (
          <View key={type} style={{ gap: 6 }}>
            <Txt variant="headline">{s.settings3.soundTypes[type]}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {SOUND_IDS.map((id: SoundId) => (
                <Chip
                  key={id}
                  label={(prefs.sounds[type] === id ? '✓ ' : '') + s.settings3.soundNames[id]}
                  onPress={() => {
                    setPrefs({ sounds: { ...prefs.sounds, [type]: id } });
                    previewSound(type, id, lang).catch(() => {});
                  }}
                />
              ))}
            </View>
          </View>
        ))}
      </Card>

      <SectionHeader>{s.settings3.data}</SectionHeader>
      <Card style={{ gap: 0 }}>
        <Button kind="plain" label={s.settings3.export} onPress={exportData} />
        <Button kind="plain" label={s.settings3.resetLearning} onPress={confirmResetLearning} />
      </Card>

      <View style={{ gap: 4 }}>
        <Button kind="tonal" label={s.settings.editProfile} onPress={() => router.push('/onboarding?edit=1')} />
        <Button kind="destructive" label={s.settings.reset} onPress={confirmReset} />
        <Button kind="destructive" label={s.settings2.signOut} onPress={confirmSignOut} />
      </View>

      <SectionHeader>{s.settings.about}</SectionHeader>
      <Card>
        <Txt variant="subhead">{s.settings.privacy}</Txt>
        <Txt variant="footnote" color="textSecondary">
          {s.settings3.sources}
        </Txt>
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
