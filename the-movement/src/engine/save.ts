// Serialization, versioned migration and corruption recovery.
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from './config';
import { CITY_BY_ID } from './geo';
import { buildProfile } from './ideology';
import type { GameState } from './types';

export function serializeGame(state: GameState): string {
  return JSON.stringify({ format: 'the-movement-save', schemaVersion: SCHEMA_VERSION, savedAt: Date.now(), state });
}

type Migration = (s: Record<string, any>) => Record<string, any>;

/** Migrations from older schema versions. Each takes the state at version n and returns n+1. */
export const MIGRATIONS: Record<number, Migration> = {
  // v1 -> v2: added founder control, committees and hinterland fractions
  1: (s) => ({ ...s, control: s.control ?? 70, committees: s.committees ?? [], hinterFrac: s.hinterFrac ?? {}, schemaVersion: 2 }),
  // v2 -> v3: added tutorial 'seen', settings.offlineCapHours, boosts
  2: (s) => ({
    ...s,
    tutorial: { seen: [], ...(s.tutorial ?? { step: 0, done: false, skipped: false }) },
    settings: { ...DEFAULT_SETTINGS, ...(s.settings ?? {}) },
    boosts: s.boosts ?? [],
    schemaVersion: 3,
  }),
};

export function migrate(raw: Record<string, any>): GameState {
  let s = raw;
  let v = typeof s.schemaVersion === 'number' ? s.schemaVersion : 1;
  if (v > SCHEMA_VERSION) throw new Error(`Save is from a newer version (${v}).`);
  while (v < SCHEMA_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`No migration from schema ${v}`);
    s = m(s);
    v = s.schemaVersion;
  }
  return s as GameState;
}

/** Repairs invariant violations rather than rejecting a slightly damaged save. */
export function repairState(s: GameState): string[] {
  const fixes: string[] = [];
  if (!Array.isArray(s.touched)) s.touched = Object.keys(s.cities).map(Number);
  const seen = new Set<number>();
  s.touched = s.touched.filter((id) => {
    if (seen.has(id) || !s.cities[id] || !CITY_BY_ID.has(id)) return false;
    seen.add(id);
    return true;
  });
  for (const id of Object.keys(s.cities).map(Number)) if (!seen.has(id)) { s.touched.push(id); seen.add(id); }
  for (const id of s.touched) {
    const d = s.cities[id];
    const pop = CITY_BY_ID.get(id)!.pop;
    if (!Number.isFinite(d.followers) || d.followers < 0) { d.followers = 0; fixes.push(`followers reset in ${id}`); }
    let others = 0;
    for (const k in d.others) {
      if (!Number.isFinite(d.others[k]) || d.others[k] < 0) d.others[k] = 0;
      others += d.others[k];
    }
    if (d.followers + others > pop) { d.followers = Math.max(0, pop - others); fixes.push(`followers capped in ${id}`); }
    d.awareness = Math.max(0, Math.min(1, d.awareness || 0));
    d.resistance = Math.max(0, Math.min(0.95, d.resistance || 0));
    d.history ??= [];
    d.events ??= [];
  }
  s.discovered = [...new Set(s.discovered.filter((id) => s.cities[id]))];
  // zealots can't be over-assigned
  let assigned = 0;
  for (const c of Object.values(s.campaigns)) if (c.status === 'active') assigned += c.zealots;
  if (assigned > s.zealots.total) {
    fixes.push('zealot over-assignment repaired');
    s.zealots.total = assigned;
  }
  // campaign <-> city links
  for (const c of Object.values(s.campaigns)) {
    if (c.status !== 'active') continue;
    const d = s.cities[c.cityId];
    if (!d) c.status = 'cancelled';
    else d.campaignId = c.id;
  }
  if (!s.movement.profile) s.movement.profile = buildProfile(s.movement.doctrines, s.movement.temperament, s.movement.headquarters.type, s.movement.meetingName);
  for (const k of ['cohesion', 'drift', 'bureaucracy', 'control', 'enthusiasm'] as const) {
    if (!Number.isFinite(s[k])) { s[k] = 50; fixes.push(`${k} reset`); }
  }
  s.upgrades = [...s.upgrades];
  return fixes;
}

export function loadGame(json: string): { state: GameState; fixes: string[] } {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Save file is not valid JSON.');
  }
  const raw = parsed?.format === 'the-movement-save' ? parsed.state : parsed;
  if (!raw || typeof raw !== 'object' || !raw.movement || !raw.cities) throw new Error('This does not appear to be a save file for THE MOVEMENT.');
  const state = migrate(raw);
  const fixes = repairState(state);
  return { state, fixes };
}
