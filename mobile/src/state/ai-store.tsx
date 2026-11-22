/**
 * AI chat state: the user's API key from any AI company (SecureStore, encrypted, never in AsyncStorage),
 * chat settings, memory notes and saved chats (AsyncStorage, this phone only).
 * Saved chats keep Claude's full content blocks so a chat continues with its whole context.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { canSave, generation, onAccountSwitch } from './account-vault';

import type { ProviderId } from '@/engine/ai-providers';
import type { AiEffort, BetaMessageParam } from '@/engine/claude';

import { newId } from './app-store';

const KEY_SLOT = 'kesefly.ai.apiKey';
const STORE = 'investapp/ai/v1';
/** DESIGN DECISION: keep the 30 most recent chats. */
const MAX_CHATS = 30;

export type Chat = { id: string; title: string; messages: BetaMessageParam[]; updatedAt: number };

type Saved = {
  enabled: boolean;
  /** Company the saved key belongs to. */
  provider: ProviderId;
  /** API address for 'custom' (OpenAI-compatible). */
  customUrl: string;
  /** Chat models the provider listed for the key (not used for Anthropic). */
  models: string[];
  /** Model id: a Claude id for Anthropic, else one of `models` or typed by the user. */
  model: string;
  effort: AiEffort;
  webSearch: boolean;
  shareData: boolean;
  autoMemory: boolean;
  memory: string;
  chats: Chat[];
  currentId: string | null;
};

const DEFAULTS: Saved = { enabled: true, provider: 'anthropic', customUrl: '', models: [], model: 'claude-opus-5-5', effort: 'medium', webSearch: true, shareData: false, autoMemory: true, memory: '', chats: [], currentId: null };

type AiState = Saved & {
  hydrated: boolean;
  /** Key exists (the value itself is read only when sending). */
  hasKey: boolean;
  masked: string | null;
  /** Claude chat is usable: key saved and switched on. */
  ready: boolean;
  saveKey: (key: string) => Promise<void>;
  removeKey: () => Promise<void>;
  readKey: () => Promise<string | null>;
  setPrefs: (p: Partial<Omit<Saved, 'chats' | 'currentId'>>) => void;
  addMemory: (note: string) => void;
  saveChat: (c: Chat) => void;
  openChat: (id: string | null) => void;
  deleteChat: (id: string) => void;
  clearChats: () => void;
};

const Ctx = createContext<AiState | null>(null);

const mask = (k: string) => (k.length > 12 ? `${k.slice(0, 7)}…${k.slice(-4)}` : '••••');

export function AiProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<Saved>(DEFAULTS);
  const [masked, setMasked] = useState<string | null>(null);
  /** Account-vault generation the state was loaded in (see state/account-vault.ts). */
  const loadedAt = useRef(-1);

  const load = useCallback((fromScratch: boolean) => {
    const at = generation();
    Promise.all([AsyncStorage.getItem(STORE), SecureStore.getItemAsync(KEY_SLOT)])
      .then(([raw, key]) => {
        // After an account switch, start from defaults.
        if (fromScratch) setState(DEFAULTS);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<Saved>;
          setState({ ...DEFAULTS, ...saved, chats: Array.isArray(saved.chats) ? saved.chats : [] });
        }
        setMasked(key ? mask(key) : null);
      })
      .catch(() => {})
      .finally(() => {
        loadedAt.current = at;
        setHydrated(true);
      });
  }, []);

  useEffect(() => {
    load(false);
    return onAccountSwitch(() => load(true));
  }, [load]);

  useEffect(() => {
    if (hydrated && canSave(loadedAt.current)) AsyncStorage.setItem(STORE, JSON.stringify(state)).catch(() => {});
  }, [state, hydrated]);

  const saveKey = useCallback(async (key: string) => {
    const k = key.trim();
    await SecureStore.setItemAsync(KEY_SLOT, k);
    setMasked(mask(k));
  }, []);
  const removeKey = useCallback(async () => {
    await SecureStore.deleteItemAsync(KEY_SLOT);
    setMasked(null);
  }, []);
  const readKey = useCallback(() => SecureStore.getItemAsync(KEY_SLOT), []);
  const setPrefs = useCallback<AiState['setPrefs']>((p) => setState((s) => ({ ...s, ...p })), []);
  const addMemory = useCallback(
    (note: string) => setState((s) => (s.memory.includes(note) ? s : { ...s, memory: s.memory.trim() ? `${s.memory.trim()}\n- ${note}` : `- ${note}` })),
    [],
  );
  const saveChat = useCallback(
    (c: Chat) =>
      setState((s) => ({
        ...s,
        currentId: c.id,
        chats: [c, ...s.chats.filter((x) => x.id !== c.id)].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CHATS),
      })),
    [],
  );
  const openChat = useCallback((id: string | null) => setState((s) => ({ ...s, currentId: id })), []);
  const deleteChat = useCallback((id: string) => setState((s) => ({ ...s, chats: s.chats.filter((c) => c.id !== id), currentId: s.currentId === id ? null : s.currentId })), []);
  const clearChats = useCallback(() => setState((s) => ({ ...s, chats: [], currentId: null })), []);

  const value = useMemo<AiState>(
    () => ({ ...state, hydrated, hasKey: masked != null, masked, ready: masked != null && state.enabled, saveKey, removeKey, readKey, setPrefs, addMemory, saveChat, openChat, deleteChat, clearChats }),
    [state, hydrated, masked, saveKey, removeKey, readKey, setPrefs, addMemory, saveChat, openChat, deleteChat, clearChats],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAi(): AiState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAi outside AiProvider');
  return v;
}

export const newChatId = newId;
