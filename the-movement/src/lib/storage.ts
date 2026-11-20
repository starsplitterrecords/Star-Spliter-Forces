// IndexedDB persistence (via idb-keyval) with three save slots, backups and corruption recovery.
import { createStore, del, get, set } from 'idb-keyval';
import { loadGame, serializeGame } from '@/engine/save';
import type { GameState, LegacyRecord, Settings } from '@/engine/types';

export const SLOT_COUNT = 3;

export interface SlotMeta {
  slot: number;
  ideologyName: string;
  founderTitle: string;
  followers: number;
  phase: number;
  savedAt: number;
  victory: boolean;
  primary: string;
}

let store: ReturnType<typeof createStore> | null = null;
function db() {
  if (typeof indexedDB === 'undefined') return null;
  if (!store) store = createStore('the-movement', 'saves');
  return store;
}

const memory = new Map<string, unknown>();
async function g<T>(key: string): Promise<T | undefined> {
  const s = db();
  if (!s) return memory.get(key) as T | undefined;
  try {
    return await get<T>(key, s);
  } catch {
    return memory.get(key) as T | undefined;
  }
}
async function p(key: string, v: unknown) {
  const s = db();
  memory.set(key, v);
  if (!s) return;
  await set(key, v, s);
}
async function d(key: string) {
  memory.delete(key);
  const s = db();
  if (s) await del(key, s);
}

export function metaOf(state: GameState): SlotMeta {
  return {
    slot: state.slot,
    ideologyName: state.movement.ideologyName,
    founderTitle: state.movement.founderTitle,
    followers: state.totals.followers,
    phase: state.phase,
    savedAt: Date.now(),
    victory: state.victory.achieved,
    primary: state.movement.banner.primary,
  };
}

export async function saveSlot(state: GameState): Promise<void> {
  const json = serializeGame(state);
  const prev = await g<string>(`slot:${state.slot}`);
  if (prev) await p(`slot:${state.slot}:backup`, prev);
  await p(`slot:${state.slot}`, json);
  await p(`meta:${state.slot}`, metaOf(state));
  await p('lastSlot', state.slot);
}

export async function loadSlot(slot: number): Promise<{ state: GameState; fixes: string[]; recovered: boolean } | null> {
  const json = await g<string>(`slot:${slot}`);
  if (!json) return null;
  try {
    const r = loadGame(json);
    return { ...r, recovered: false };
  } catch (e) {
    // corruption recovery: fall back to the previous save
    const backup = await g<string>(`slot:${slot}:backup`);
    if (backup) {
      const r = loadGame(backup);
      return { ...r, recovered: true };
    }
    throw e;
  }
}

export async function listSlots(): Promise<(SlotMeta | null)[]> {
  const out: (SlotMeta | null)[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) out.push((await g<SlotMeta>(`meta:${i}`)) ?? null);
  return out;
}

export async function deleteSlot(slot: number) {
  await d(`slot:${slot}`);
  await d(`slot:${slot}:backup`);
  await d(`meta:${slot}`);
}

export async function lastSlot(): Promise<number | null> {
  return (await g<number>('lastSlot')) ?? null;
}

export async function loadLegacy(): Promise<LegacyRecord[]> {
  return (await g<LegacyRecord[]>('legacy')) ?? [];
}

export async function addLegacy(r: LegacyRecord) {
  const list = await loadLegacy();
  if (!list.some((x) => x.completedAt === r.completedAt && x.ideologyName === r.ideologyName)) list.push(r);
  await p('legacy', list.slice(-10));
}

export async function loadGlobalSettings(): Promise<Partial<Settings> | undefined> {
  return g<Partial<Settings>>('settings');
}
export async function saveGlobalSettings(s: Settings) {
  await p('settings', s);
}

export function downloadText(filename: string, text: string, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
