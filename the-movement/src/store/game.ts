'use client';
// Reactive UI store (zustand). The engine mutates GameState in place; the store bumps a
// version counter so subscribed components re-render at a bounded rate.
import { create } from 'zustand';
import { DEFAULT_SETTINGS } from '@/engine/config';
import type { GameEvent, GameState, Settings } from '@/engine/types';
import { saveSlot } from '@/lib/storage';

export type Screen = 'menu' | 'wizard' | 'game';
export type PanelId =
  | 'campaigns'
  | 'outposts'
  | 'upgrades'
  | 'doctrine'
  | 'news'
  | 'factions'
  | 'stats'
  | 'charts'
  | 'achievements'
  | 'chronicle'
  | 'settings'
  | 'saves'
  | 'help'
  | 'victory'
  | 'debug';
export type Overlay = 'followers' | 'conversion' | 'campaigns' | 'passive' | 'resistance' | 'zealots' | 'outposts' | 'rivals' | 'stability';

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'good' | 'warn' | 'event';
  eventId?: string;
}

interface Store {
  screen: Screen;
  game: GameState | null;
  version: number;
  paused: boolean;
  panel: PanelId | null;
  selectedCity: number | null;
  eventModal: string | null;
  palette: boolean;
  toasts: Toast[];
  overlay: Overlay;
  globalSettings: Settings;
  dispatchFx: { cityId: number; fromId: number; at: number }[];
  lastSaved: number;
  announce: string;
  setScreen: (s: Screen) => void;
  setGame: (g: GameState | null) => void;
  bump: () => void;
  setPanel: (p: PanelId | null) => void;
  togglePanel: (p: PanelId) => void;
  selectCity: (id: number | null) => void;
  openEvent: (id: string | null) => void;
  setPalette: (v: boolean) => void;
  setPaused: (v: boolean) => void;
  setOverlay: (o: Overlay) => void;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  setGlobalSettings: (s: Partial<Settings>) => void;
  addDispatchFx: (cityId: number, fromId: number) => void;
  save: () => Promise<void>;
  setAnnounce: (s: string) => void;
  /** Run an engine action against the live state, then re-render and optionally save. */
  act: <T>(fn: (g: GameState) => T, opts?: { save?: boolean }) => T | undefined;
}

let toastId = 1;

export const useStore = create<Store>((set, get) => ({
  screen: 'menu',
  game: null,
  version: 0,
  paused: false,
  panel: null,
  selectedCity: null,
  eventModal: null,
  palette: false,
  toasts: [],
  overlay: 'followers',
  globalSettings: { ...DEFAULT_SETTINGS },
  dispatchFx: [],
  lastSaved: 0,
  announce: '',
  setScreen: (screen) => set({ screen }),
  setGame: (game) => set({ game, version: get().version + 1, selectedCity: null, panel: null, eventModal: null }),
  bump: () => set({ version: get().version + 1 }),
  setPanel: (panel) => set({ panel }),
  togglePanel: (p) => set({ panel: get().panel === p ? null : p }),
  selectCity: (selectedCity) => set(selectedCity != null && get().panel !== 'victory' ? { selectedCity, panel: null } : { selectedCity }),
  openEvent: (eventModal) => set({ eventModal }),
  setPalette: (palette) => set({ palette }),
  setPaused: (paused) => set({ paused }),
  setOverlay: (overlay) => set({ overlay }),
  toast: (t) => {
    const id = toastId++;
    set({ toasts: [...get().toasts.slice(-4), { ...t, id }] });
    setTimeout(() => get().dismissToast(id), t.kind === 'event' ? 7000 : 4500);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
  setGlobalSettings: (s) => {
    const next = { ...get().globalSettings, ...s };
    set({ globalSettings: next });
    const g = get().game;
    if (g) g.settings = { ...g.settings, ...s };
  },
  addDispatchFx: (cityId, fromId) => set({ dispatchFx: [...get().dispatchFx.filter((f) => Date.now() - f.at < 3000), { cityId, fromId, at: Date.now() }] }),
  save: async () => {
    const g = get().game;
    if (!g) return;
    g.lastRealTime = Date.now();
    await saveSlot(g);
    set({ lastSaved: Date.now() });
  },
  setAnnounce: (announce) => set({ announce }),
  act: (fn, opts) => {
    const g = get().game;
    if (!g) return undefined;
    const r = fn(g);
    set({ version: get().version + 1 });
    if (opts?.save) void get().save();
    return r;
  },
}));

export function eventById(g: GameState, id: string | null): GameEvent | undefined {
  if (!id) return undefined;
  return g.events.find((e) => e.id === id);
}
