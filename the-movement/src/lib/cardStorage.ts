// Persistence for the Card Edition (its own IndexedDB database; falls back to memory).
import { createStore, del, get, set } from 'idb-keyval';
import { loadCards, serializeCards } from '@/cards/engine';
import type { CardGame } from '@/cards/types';

let store: ReturnType<typeof createStore> | null = null;
const memory = new Map<string, string>();
function db() {
  try {
    if (typeof indexedDB === 'undefined') return null;
    store ??= createStore('the-movement-cards', 'games');
    return store;
  } catch {
    return null;
  }
}

export async function saveCardGame(g: CardGame) {
  const json = serializeCards(g);
  memory.set('current', json);
  const s = db();
  if (s) await set('current', json, s).catch(() => undefined);
}

export async function loadCardGame(): Promise<CardGame | null> {
  const s = db();
  let json: string | undefined = memory.get('current');
  if (s) json = (await get<string>('current', s).catch(() => undefined)) ?? json;
  if (!json) return null;
  try {
    return loadCards(json);
  } catch {
    return null;
  }
}

export async function clearCardGame() {
  memory.delete('current');
  const s = db();
  if (s) await del('current', s).catch(() => undefined);
}
