// Persistence for THE MOVEMENT v2 (own IndexedDB database; memory fallback).
import { createStore, del, get, set } from 'idb-keyval';
import { loadStory, serializeStory } from '@/story/engine';
import type { StoryState } from '@/story/types';

let store: ReturnType<typeof createStore> | null = null;
const memory = new Map<string, string>();
function db() {
  try {
    if (typeof indexedDB === 'undefined') return null;
    store ??= createStore('the-movement-story', 'saves');
    return store;
  } catch {
    return null;
  }
}
export async function saveStory(s: StoryState) {
  const json = serializeStory(s);
  memory.set('current', json);
  const d = db();
  if (d) await set('current', json, d).catch(() => undefined);
}
export async function loadSavedStory(): Promise<StoryState | null> {
  const d = db();
  let json = memory.get('current');
  if (d) json = (await get<string>('current', d).catch(() => undefined)) ?? json;
  if (!json) return null;
  try {
    return loadStory(json);
  } catch {
    return null;
  }
}
export async function clearStory() {
  memory.delete('current');
  const d = db();
  if (d) await del('current', d).catch(() => undefined);
}
