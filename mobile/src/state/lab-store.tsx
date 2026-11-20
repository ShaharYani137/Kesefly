/**
 * Day-Trading Lab state: the risk-gate acknowledgement, practice limits, the practice (paper)
 * account and journal, alert rules, the draft plan being worked on, and alert switches.
 * Persisted on-device only (AsyncStorage, its own key, so the main app state is untouched).
 * Also read by the widgets (widget/data.ts, widget/ios.ts) for an open practice trade.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { type AlertRule, rulesFromPlan } from '@/lab/alerts';
import type { Plan } from '@/lab/exit';
import { DEFAULT_LIMITS, type LabLimits, withDefaults } from '@/lab/limits';
import { applyUpdate, closeNow, makeOrder, newAccount, type PaperAccount, type PaperOrder, placeOrder } from '@/lab/paper';
import type { LabSession } from '@/lab/sessions';
import type { Sizing } from '@/lab/sizing';
import type { TimeMachineResult } from '@/lab/timemachine';
import type { UniverseId } from '@/lab/universes';

import { newId } from './app-store';
import { LAB_KEY } from './lab-key';

export { LAB_KEY };

/** What the setup screen hands to the plan screen. */
export type Draft = {
  symbol: string;
  setup: 'orb' | 'level';
  entry: number;
  orHigh: number | null;
  orLow: number | null;
  entryTime: number | null;
  entryBar: number | null;
  plan: Plan | null;
};

type LabPersisted = {
  accepted: boolean;
  acceptedAt: number | null;
  limits: LabLimits;
  account: PaperAccount;
  alerts: AlertRule[];
  /** Price rules that already rang (rule id, or id|date for % moves). */
  rung: Record<string, number>;
  draft: Draft | null;
  universe: UniverseId;
  timeAlerts: boolean;
  priceAlerts: boolean;
  bell: { NY: boolean; TLV: boolean };
};

type LabState = LabPersisted & {
  hydrated: boolean;
  /** Last Time Machine run for the draft plan (memory only). */
  tm: { planKey: string; result: TimeMachineResult } | null;
  accept: () => void;
  setLimits: (l: LabLimits) => void;
  resetLimits: () => void;
  resetAccount: () => void;
  setDraft: (d: Draft | null) => void;
  setDraftPlan: (p: Plan | null) => void;
  setTm: (tm: LabState['tm']) => void;
  placePractice: (plan: Plan, sizing: Sizing, session: LabSession, livePrice: number | null) => PaperOrder;
  /** Replace orders after the monitor advanced them (cash follows). */
  applyOrders: (pairs: [PaperOrder, PaperOrder][]) => void;
  closeOrder: (id: string, price: number | null) => void;
  setRung: (rung: Record<string, number>) => void;
  setSwitches: (patch: Partial<Pick<LabPersisted, 'timeAlerts' | 'priceAlerts' | 'bell' | 'universe'>>) => void;
};

const fresh = (): LabPersisted => ({
  accepted: false,
  acceptedAt: null,
  limits: DEFAULT_LIMITS,
  account: newAccount(DEFAULT_LIMITS),
  alerts: [],
  rung: {},
  draft: null,
  universe: 'mine',
  timeAlerts: true,
  priceAlerts: true,
  bell: { NY: false, TLV: false },
});

const Ctx = createContext<LabState | null>(null);

export const planKey = (p: Plan) => `${p.symbol}|${p.date}|${p.entry}|${p.stop}|${p.target}|${p.entryBar}`;

export function LabProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<LabPersisted>(fresh);
  const [tm, setTm] = useState<LabState['tm']>(null);

  useEffect(() => {
    AsyncStorage.getItem(LAB_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<LabPersisted>;
        const limits = withDefaults(saved.limits);
        setState({
          ...fresh(),
          ...saved,
          limits,
          account: saved.account?.orders ? saved.account : newAccount(limits),
          alerts: Array.isArray(saved.alerts) ? saved.alerts : [],
          rung: saved.rung ?? {},
          bell: { NY: false, TLV: false, ...saved.bell },
        });
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(LAB_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, hydrated]);

  const accept = useCallback(() => setState((p) => ({ ...p, accepted: true, acceptedAt: Date.now() })), []);
  const setLimits = useCallback((limits: LabLimits) => setState((p) => ({ ...p, limits })), []);
  const resetLimits = useCallback(() => setState((p) => ({ ...p, limits: DEFAULT_LIMITS })), []);
  const resetAccount = useCallback(() => setState((p) => ({ ...p, account: newAccount(p.limits), alerts: [], rung: {} })), []);
  const setDraft = useCallback((draft: Draft | null) => setState((p) => ({ ...p, draft })), []);
  const setDraftPlan = useCallback((plan: Plan | null) => setState((p) => (p.draft ? { ...p, draft: { ...p.draft, plan } } : p)), []);
  const setRung = useCallback((rung: Record<string, number>) => setState((p) => ({ ...p, rung })), []);
  const setSwitches = useCallback<LabState['setSwitches']>((patch) => setState((p) => ({ ...p, ...patch })), []);

  const placePractice = useCallback((plan: Plan, sizing: Sizing, session: LabSession, livePrice: number | null) => {
    const order = makeOrder(newId(), plan, sizing, session.entriesUntilMs, Date.now(), livePrice);
    setState((p) => ({
      ...p,
      account: placeOrder(p.account, order),
      // Stop, target and flat-by alerts for this plan's day (replacing older ones for the same symbol and day).
      alerts: [...p.alerts.filter((r) => !(r.symbol === plan.symbol && r.date === plan.date)), ...rulesFromPlan(plan)],
    }));
    return order;
  }, []);

  const applyOrders = useCallback((pairs: [PaperOrder, PaperOrder][]) => {
    if (!pairs.length) return;
    setState((p) => {
      let account = p.account;
      for (const [, after] of pairs) {
        const before = account.orders.find((o) => o.id === after.id);
        if (before) account = applyUpdate(account, before, after);
      }
      return { ...p, account };
    });
  }, []);

  const closeOrder = useCallback((id: string, price: number | null) => {
    setState((p) => {
      const before = p.account.orders.find((o) => o.id === id);
      if (!before) return p;
      return { ...p, account: applyUpdate(p.account, before, closeNow(before, price, Date.now())) };
    });
  }, []);

  const value = useMemo<LabState>(
    () => ({ ...state, hydrated, tm, setTm, accept, setLimits, resetLimits, resetAccount, setDraft, setDraftPlan, placePractice, applyOrders, closeOrder, setRung, setSwitches }),
    [state, hydrated, tm, accept, setLimits, resetLimits, resetAccount, setDraft, setDraftPlan, placePractice, applyOrders, closeOrder, setRung, setSwitches],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLab(): LabState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLab outside LabProvider');
  return v;
}
