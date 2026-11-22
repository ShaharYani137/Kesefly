/**
 * Settings > AI chat: the user's own API key from any AI company. The company is detected from
 * the key (or picked by hand; "Other" takes any OpenAI-compatible address), then the key is
 * checked against the company's API before it is saved (encrypted, SecureStore). The model list
 * comes from the company. Claude-only extras: thinking effort, web search, saved memories.
 * Also: sharing of Kesefly numbers (off by default), memory notes, saved chats.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Switch, TextInput, View } from 'react-native';

import { guessProviders, listModels, PROVIDERS, type ProviderId } from '@/engine/ai-providers';
import { AI_MODELS, type AiEffort, type AiModel, checkKey } from '@/engine/claude';
import { fill, useApp } from '@/state/app-store';
import { useAi } from '@/state/ai-store';
import { Button, Card, Row, Screen, SectionHeader, Segmented, Txt } from '@/ui/components';
import { showDialog } from '@/ui/dialog';
import { Metrics, useTokens } from '@/ui/theme';

const PICK: (ProviderId | 'auto')[] = ['auto', 'openai', 'gemini', 'anthropic', 'xai', 'mistral', 'deepseek', 'groq', 'openrouter', 'custom'];
const providerName = (id: ProviderId, other: string) => (id === 'custom' ? other : PROVIDERS[id].name);

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTokens();
  return (
    <>
      <Row>
        <Txt variant="body" style={{ flex: 1 }}>
          {label}
        </Txt>
        <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.fill }} thumbColor="#FFFFFF" />
      </Row>
      {hint ? (
        <Txt variant="footnote" color="textSecondary">
          {hint}
        </Txt>
      ) : null}
    </>
  );
}

/** Selectable pill (selected = accent). */
function Pick({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { colors } = useTokens();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={{ minHeight: 36, borderRadius: 999, borderWidth: 1, borderColor: on ? colors.accent : colors.separator, backgroundColor: on ? colors.accentSoft : colors.card, paddingHorizontal: 12, justifyContent: 'center' }}>
      <Txt variant="subhead" style={{ color: on ? colors.onAccentSoft : colors.text }}>
        {label}
      </Txt>
    </Pressable>
  );
}

export default function AiSettings() {
  const { s, isRTL } = useApp();
  const ai = useAi();
  const { colors, type, isIOS } = useTokens();
  const t = s.ai;
  const [key, setKey] = useState('');
  const [pick, setPick] = useState<ProviderId | 'auto'>('auto');
  const [url, setUrl] = useState(ai.customUrl);
  const [check, setCheck] = useState<'idle' | 'checking' | 'ok' | 'bad' | 'network'>('idle');
  const [memory, setMemory] = useState<string | null>(null);
  const [typedModel, setTypedModel] = useState('');
  const other = t.other;

  const field = {
    minHeight: Metrics.fieldHeight,
    borderRadius: Metrics.fieldRadius,
    backgroundColor: isIOS ? colors.background : colors.fill,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  };

  const save = async () => {
    const k = key.trim();
    if (!k) return;
    setCheck('checking');
    const candidates: ProviderId[] = pick === 'auto' ? guessProviders(k) : [pick];
    let last: 'bad' | 'network' = 'bad';
    for (const id of candidates) {
      if (id === 'anthropic') {
        const r = await checkKey(k);
        if (r === 'ok') {
          await ai.saveKey(k);
          ai.setPrefs({ provider: 'anthropic', models: [], model: AI_MODELS.includes(ai.model as AiModel) ? ai.model : 'claude-opus-5-5' });
          setCheck('ok');
          setKey('');
          return;
        }
        last = r;
        continue;
      }
      const base = id === 'custom' ? url.trim() : PROVIDERS[id].baseUrl;
      if (!/^https:\/\//.test(base)) {
        last = 'network';
        continue;
      }
      const r = await listModels(base, k, PROVIDERS[id].prefer);
      if (r.status === 'ok') {
        await ai.saveKey(k);
        ai.setPrefs({ provider: id, customUrl: id === 'custom' ? base : ai.customUrl, models: r.models, model: r.models[0] ?? '' });
        setCheck('ok');
        setKey('');
        return;
      }
      last = r.status;
    }
    setCheck(last);
  };

  const remove = () =>
    showDialog(t.keyRemoveTitle, t.keyRemoveBody, [
      { text: t.cancel, style: 'cancel' },
      { text: t.keyRemove, style: 'destructive', onPress: () => ai.removeKey().then(() => setCheck('idle')) },
    ]);

  const clearChats = () =>
    showDialog(t.chatsClearTitle, t.chatsClearBody, [
      { text: t.cancel, style: 'cancel' },
      { text: t.delete, style: 'destructive', onPress: ai.clearChats },
    ]);

  const memoryText = memory ?? ai.memory;
  const claude = ai.provider === 'anthropic';
  const keysFor = pick === 'auto' || pick === 'custom' ? null : PROVIDERS[pick];

  return (
    <Screen title={t.title} subtitle={t.subtitle} onBack={() => router.back()}>
      <SectionHeader>{t.keyTitle}</SectionHeader>
      <Card>
        <Txt variant="subhead" color={ai.hasKey ? 'positive' : 'textSecondary'}>
          {ai.hasKey ? fill(t.keySaved, { provider: providerName(ai.provider, other), masked: ai.masked ?? '' }) : t.keyNone}
        </Txt>
        <TextInput
          accessibilityLabel={t.keyLabel}
          value={key}
          onChangeText={(v) => {
            setKey(v);
            setCheck('idle');
          }}
          placeholder={t.keyPlaceholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          style={[type.body, field, { writingDirection: 'ltr', textAlign: 'left' }]}
        />
        <Txt variant="footnote" color="textSecondary">
          {t.provider}
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PICK.map((id) => (
            <Pick key={id} label={id === 'auto' ? t.auto : providerName(id, other)} on={pick === id} onPress={() => setPick(id)} />
          ))}
        </View>
        {pick === 'custom' ? (
          <TextInput
            accessibilityLabel={t.customUrl}
            value={url}
            onChangeText={setUrl}
            placeholder={t.customUrl}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[type.body, field, { writingDirection: 'ltr', textAlign: 'left' }]}
          />
        ) : null}
        {check === 'checking' ? (
          <Row>
            <ActivityIndicator color={colors.accent} />
            <Txt variant="subhead">{t.keyChecking}</Txt>
          </Row>
        ) : check !== 'idle' ? (
          <Txt variant="subhead" color={check === 'ok' ? 'positive' : 'danger'}>
            {check === 'ok' ? fill(t.detected, { provider: providerName(ai.provider, other) }) : check === 'bad' ? t.keyBad : t.keyNet}
          </Txt>
        ) : null}
        <Button label={t.keyCheck} onPress={save} disabled={!key.trim() || check === 'checking' || (pick === 'custom' && !url.trim())} />
        {keysFor ? <Button kind="plain" label={fill(t.keyGet, { provider: keysFor.name })} onPress={() => Linking.openURL(keysFor.keysUrl).catch(() => {})} /> : null}
        {ai.hasKey ? <Button kind="destructive" label={t.keyRemove} onPress={remove} /> : null}
        <Txt variant="footnote" color="textSecondary">
          {t.keyPrivacy}
        </Txt>
      </Card>

      <Card>
        <Toggle label={t.enabled} value={ai.enabled} onChange={(v) => ai.setPrefs({ enabled: v })} />
      </Card>

      {ai.hasKey ? (
        <>
          <SectionHeader>{t.model}</SectionHeader>
          {claude ? (
            <>
              <Segmented<string> value={ai.model} onChange={(v) => ai.setPrefs({ model: v })} options={AI_MODELS.map((m) => ({ value: m, label: t.models[m] }))} />
              <Txt variant="footnote" color="textSecondary">
                {t.modelHint[ai.model as AiModel] ?? ''}
              </Txt>
            </>
          ) : ai.models.length ? (
            <Card>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, direction: 'ltr' }}>
                {ai.models.map((m) => (
                  <Pick key={m} label={m} on={ai.model === m} onPress={() => ai.setPrefs({ model: m })} />
                ))}
              </View>
            </Card>
          ) : (
            <Card>
              <Txt variant="footnote" color="textSecondary">
                {t.modelNone}
              </Txt>
              <TextInput
                accessibilityLabel={t.modelPlaceholder}
                value={typedModel || ai.model}
                onChangeText={setTypedModel}
                onBlur={() => typedModel.trim() && ai.setPrefs({ model: typedModel.trim() })}
                placeholder={t.modelPlaceholder}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                style={[type.body, field, { writingDirection: 'ltr', textAlign: 'left' }]}
              />
            </Card>
          )}

          {claude ? (
            <>
              <SectionHeader>{t.effort}</SectionHeader>
              <Segmented<AiEffort> value={ai.effort} onChange={(v) => ai.setPrefs({ effort: v })} options={(['low', 'medium', 'high'] as AiEffort[]).map((e) => ({ value: e, label: t.efforts[e] }))} />
              <Txt variant="footnote" color="textSecondary">
                {t.effortHint}
              </Txt>
            </>
          ) : null}
        </>
      ) : null}

      <SectionHeader>{t.contextTitle}</SectionHeader>
      <Card>
        {claude ? (
          <>
            <Toggle label={t.webSearch} value={ai.webSearch} onChange={(v) => ai.setPrefs({ webSearch: v })} />
            <Toggle label={t.autoMemory} hint={t.autoMemoryHint} value={ai.autoMemory} onChange={(v) => ai.setPrefs({ autoMemory: v })} />
          </>
        ) : (
          <Txt variant="footnote" color="textSecondary">
            {t.claudeOnly}
          </Txt>
        )}
        <Toggle label={t.shareData} hint={t.shareDataHint} value={ai.shareData} onChange={(v) => ai.setPrefs({ shareData: v })} />
      </Card>

      <SectionHeader>{t.memory}</SectionHeader>
      <Card>
        <TextInput
          accessibilityLabel={t.memory}
          value={memoryText}
          onChangeText={setMemory}
          onBlur={() => {
            if (memory != null) ai.setPrefs({ memory: memory.slice(0, 4000) });
            setMemory(null);
          }}
          placeholder={t.memoryPlaceholder}
          placeholderTextColor={colors.textSecondary}
          multiline
          style={[type.body, field, { minHeight: 120, textAlignVertical: 'top', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
        />
        {ai.memory ? <Button kind="plain" label={t.memoryClear} onPress={() => ai.setPrefs({ memory: '' })} /> : null}
      </Card>

      <SectionHeader>{t.chatsTitle}</SectionHeader>
      <Card>
        <Txt variant="subhead">{fill(t.chatsCount, { n: ai.chats.length })}</Txt>
        {ai.chats.length ? <Button kind="destructive" label={t.chatsClear} onPress={clearChats} /> : null}
      </Card>
      <Txt variant="footnote" color="textSecondary">
        {t.costNote}
      </Txt>
    </Screen>
  );
}

