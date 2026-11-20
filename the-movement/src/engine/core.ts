// Shared state helpers used by every engine subsystem.
import { BALANCE } from './config';
import { CITIES, CITIES_BY_COUNTRY, city, distanceKm, neighbors } from './geo';
import type { Rng } from './rng';
import type { Boost, CityDyn, GameEvent, GameState } from './types';
import { getMods } from './upgrades';

export const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export function nid(state: GameState, prefix: string): string {
  return `${prefix}${state.nextId++}`;
}

export function newCityDyn(): CityDyn {
  return {
    followers: 0, awareness: 0, resistance: 0.05, enthusiasm: 1, infrastructure: 0, others: {}, frac: 0,
    discovered: false, milestones: 0, controlled: false, history: [], events: [], activeGained: 0, passiveGained: 0,
  };
}

export function ensureCity(state: GameState, id: number): CityDyn {
  let d = state.cities[id];
  if (!d) {
    d = newCityDyn();
    const c = city(id);
    // larger cities start a bit more skeptical
    d.resistance = Math.min(0.35, 0.03 + Math.log10(Math.max(1, c.pop / 20000)) * 0.04);
    state.cities[id] = d;
    state.touched.push(id);
  }
  return d;
}

export function othersTotal(d: CityDyn): number {
  let s = 0;
  for (const k in d.others) s += d.others[k];
  return s;
}

export function conversion(state: GameState, id: number): number {
  const d = state.cities[id];
  if (!d) return 0;
  return d.followers / city(id).pop;
}

export function addEvent(state: GameState, e: Omit<GameEvent, 'id' | 'time' | 'realTime' | 'effectsSummary' | 'refs'> & Partial<Pick<GameEvent, 'effectsSummary' | 'refs'>>): GameEvent {
  const ev: GameEvent = {
    id: nid(state, 'e'),
    time: state.time,
    realTime: state.lastRealTime,
    effectsSummary: [],
    refs: {},
    ...e,
  };
  state.events.push(ev);
  if (ev.cityId != null && state.cities[ev.cityId]) {
    const ce = state.cities[ev.cityId].events;
    ce.push(ev.id);
    if (ce.length > 12) ce.shift();
  }
  // keep history bounded, never dropping important or pending events
  if (state.events.length > 700) {
    const pending = new Set(state.pendingDecisions);
    state.events = state.events.filter((x, i) => i > state.events.length - 500 || x.important || pending.has(x.id));
  }
  state.recentHeadlines.push(ev.headline);
  if (state.recentHeadlines.length > 60) state.recentHeadlines.shift();
  return ev;
}

export function chronicle(state: GameState, key: string, title: string, text: string): boolean {
  if (state.chronicle.some((c) => c.key === key)) return false;
  state.chronicle.push({ time: state.time, realTime: state.lastRealTime, key, title, text });
  return true;
}

export function milestone(state: GameState, key: string): boolean {
  if (state.milestones[key] != null) return false;
  state.milestones[key] = state.time;
  return true;
}

export function boostMult(state: GameState, kind: Boost['kind'], cc?: string): number {
  let m = 1;
  for (const b of state.boosts) if (b.kind === kind && (!b.scope || b.scope === cc)) m *= b.mult;
  return m;
}

export function assignedZealots(state: GameState): number {
  let s = 0;
  for (const id in state.campaigns) {
    const c = state.campaigns[id];
    if (c.status === 'active') s += c.zealots;
  }
  return s;
}

export function availableZealots(state: GameState): number {
  return Math.max(0, state.zealots.total - assignedZealots(state));
}

export function addZealots(state: GameState, n: number) {
  if (n > 0) {
    state.zealots.total += n;
    state.zealots.lifetime += n;
  } else if (n < 0) {
    // only idle zealots can leave; never strand an assignment
    state.zealots.total -= Math.min(-n, availableZealots(state));
  }
}

export function activeCampaigns(state: GameState) {
  return Object.values(state.campaigns).filter((c) => c.status === 'active');
}

export function campaignSlots(state: GameState): number {
  const base = state.totals.citiesEver85 >= 2 ? BALANCE.slotsAfterFirstCities : BALANCE.slotsBase;
  return base + getMods(state).slots + (state.flags.extraSlot ? 1 : 0);
}

export function outpostCapacity(state: GameState): number {
  return getMods(state).outpostCap;
}

export function discoverCity(state: GameState, id: number): boolean {
  const d = ensureCity(state, id);
  if (d.discovered) return false;
  d.discovered = true;
  d.discoveredAt = state.time;
  state.discovered.push(id);
  return true;
}

/** Weighted, de-duplicated selection of new candidate cities near `fromId`. */
export function revealCandidates(state: GameState, fromId: number, rng: Rng, n = BALANCE.candidatesPerReveal + getMods(state).candidates): number[] {
  const from = city(fromId);
  const mods = getMods(state);
  const out: number[] = [];
  const taken = (id: number) => state.cities[id]?.discovered || out.includes(id);
  const pool = neighbors(fromId)
    .map((x) => x.id)
    .concat(nearbyByCountry(from.cc, fromId, 30));
  const unique = [...new Set(pool)].filter((id) => !taken(id));
  const phaseCap = [0, 150_000, 600_000, 3_000_000, 12_000_000, 1e9, 1e9, 1e9][state.phase] ?? 1e9;
  for (let i = 0; i < n; i++) {
    const distantChance = 0.08 + mods.distant + (state.phase >= 4 ? 0.1 : 0);
    let pickId: number | undefined;
    if (rng.chance(distantChance) || unique.length === 0) {
      // surprising distant opportunity, weighted by hub score
      for (let tries = 0; tries < 30 && pickId == null; tries++) {
        const c = CITIES[Math.floor(rng.next() * Math.min(CITIES.length, 600 + state.phase * 900))];
        if (!taken(c.id) && c.pop <= phaseCap * 2) pickId = c.id;
      }
    }
    if (pickId == null) {
      const cand = unique.filter((id) => !taken(id));
      const sel = rng.weighted(cand, (id) => {
        const c = city(id);
        const d = distanceKm(from, c);
        const popW = c.pop <= phaseCap ? Math.pow(c.pop, 0.35) : Math.pow(phaseCap, 0.35) * 0.25;
        return (popW * (1 + c.hub / 50)) / (1 + d / 150);
      });
      pickId = sel;
    }
    if (pickId != null && !taken(pickId)) out.push(pickId);
  }
  for (const id of out) discoverCity(state, id);
  if (out.length) state.candidates = out;
  return out;
}

const countryCache = new Map<string, number[]>();
function nearbyByCountry(cc: string, fromId: number, k: number): number[] {
  const key = `${cc}:${fromId}`;
  const hit = countryCache.get(key);
  if (hit) return hit;
  const from = city(fromId);
  const list = (CITIES_BY_COUNTRY[cc] ?? [])
    .filter((c) => c.id !== fromId)
    .map((c) => ({ id: c.id, d: distanceKm(from, c) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k)
    .map((x) => x.id);
  countryCache.set(key, list);
  return list;
}

export function nearestCities(lat: number, lon: number, k: number, filter: (pop: number) => boolean): number[] {
  return CITIES.filter((c) => filter(c.pop))
    .map((c) => ({ id: c.id, d: distanceKm({ lat, lon }, c) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k)
    .map((x) => x.id);
}

// Per-state derived cache (not serialized): country conversion shares.
const shareCache = new WeakMap<GameState, Record<string, number>>();
export function setCountryShares(state: GameState, m: Record<string, number>) {
  shareCache.set(state, m);
}
export function getCountryShares(state: GameState): Record<string, number> {
  return shareCache.get(state) ?? {};
}
