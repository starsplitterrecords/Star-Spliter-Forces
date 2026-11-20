// Geographic aggregation: city -> admin region -> country -> UN subregion -> continent -> world.
// Country denominators include hinterland population; admin-region denominators cover modeled
// cities only (the hinterland is not attributable to a specific admin region).
import { CITIES, COUNTRIES, COUNTRY_BY_CODE, WORLD_POPULATION, city } from './geo';
import { liveFactions } from './factions';
import type { GameState } from './types';

export type StatLevel = 'city' | 'admin' | 'country' | 'region' | 'continent' | 'world' | 'faction';

export interface StatRow {
  key: string;
  name: string;
  parent?: string;
  followers: number;
  population: number;
  conversion: number;
  growth: number; // followers per minute (recent)
  resistance: number; // 0..100 avg
  zealots: number;
  outposts: number;
  outpostLevels: number;
  cities: number;
}

const ADMIN_POP: Record<string, number> = {};
for (const c of CITIES) ADMIN_POP[`${c.cc}|${c.admin}`] = (ADMIN_POP[`${c.cc}|${c.admin}`] ?? 0) + c.pop;

function growthOf(state: GameState, id: number): number {
  const h = state.cities[id]?.history;
  if (!h || h.length < 2) return 0;
  const n = Math.min(12, h.length - 1);
  return ((h[h.length - 1] - h[h.length - 1 - n]) / (n * 5)) * 60;
}

export function calculateRegionalStatistics(state: GameState, level: StatLevel): StatRow[] {
  if (level === 'faction') {
    return liveFactions(state).map((f) => ({
      key: f.id, name: f.name, parent: f.kind, followers: f.followerCount, population: WORLD_POPULATION, conversion: f.followerCount / WORLD_POPULATION,
      growth: 0, resistance: 0, zealots: 0, outposts: 0, outpostLevels: 0, cities: f.locations.length,
    }));
  }
  const rows = new Map<string, StatRow>();
  const zealotsBy = new Map<number, number>();
  for (const c of Object.values(state.campaigns)) if (c.status === 'active') zealotsBy.set(c.cityId, (zealotsBy.get(c.cityId) ?? 0) + c.zealots + (c.founder ? 1 : 0));
  const resAcc = new Map<string, { s: number; n: number }>();
  const keyOf = (cc: string, admin: string, id: number): { key: string; name: string; parent?: string } => {
    const co = COUNTRY_BY_CODE[cc];
    switch (level) {
      case 'city':
        return { key: String(id), name: city(id).name, parent: `${admin}, ${co?.name ?? cc}` };
      case 'admin':
        return { key: `${cc}|${admin}`, name: admin, parent: co?.name ?? cc };
      case 'country':
        return { key: cc, name: co?.name ?? cc, parent: co?.region };
      case 'region':
        return { key: co?.region ?? 'Other', name: co?.region ?? 'Other', parent: co?.continent };
      case 'continent':
        return { key: co?.continent ?? 'Other', name: co?.continent ?? 'Other' };
      default:
        return { key: 'world', name: 'World' };
    }
  };
  const ensure = (k: { key: string; name: string; parent?: string }, pop: number) => {
    let r = rows.get(k.key);
    if (!r) {
      r = { key: k.key, name: k.name, parent: k.parent, followers: 0, population: pop, conversion: 0, growth: 0, resistance: 0, zealots: 0, outposts: 0, outpostLevels: 0, cities: 0 };
      rows.set(k.key, r);
    }
    return r;
  };
  // seed populations
  if (level === 'city') {
    for (const id of state.discovered) ensure(keyOf(city(id).cc, city(id).admin, id), city(id).pop);
  } else if (level === 'admin') {
    for (const id of state.touched) {
      const c = city(id);
      ensure(keyOf(c.cc, c.admin, id), ADMIN_POP[`${c.cc}|${c.admin}`]);
    }
  } else {
    for (const co of COUNTRIES) {
      const k = keyOf(co.code, '', 0);
      const r = ensure(k, 0);
      r.population += co.population;
    }
  }
  for (const id of state.touched) {
    const c = city(id);
    const d = state.cities[id];
    if (level === 'city' && !d.discovered) continue;
    const k = keyOf(c.cc, c.admin, id);
    const r = rows.get(k.key) ?? ensure(k, level === 'admin' ? ADMIN_POP[`${c.cc}|${c.admin}`] : c.pop);
    r.followers += d.followers;
    r.growth += growthOf(state, id);
    r.zealots += zealotsBy.get(id) ?? 0;
    if (d.outpostId) {
      r.outposts++;
      r.outpostLevels += state.outposts[d.outpostId]?.level ?? 0;
    }
    if (d.controlled) r.cities++;
    if (d.followers > 0 || d.awareness > 0) {
      const ra = resAcc.get(k.key) ?? { s: 0, n: 0 };
      ra.s += d.resistance;
      ra.n++;
      resAcc.set(k.key, ra);
    }
  }
  if (level !== 'city' && level !== 'admin') {
    for (const cc in state.hinterland) {
      const k = keyOf(cc, '', 0);
      const r = rows.get(k.key);
      if (r) r.followers += state.hinterland[cc];
    }
  }
  for (const r of rows.values()) {
    r.conversion = r.population > 0 ? Math.min(1, r.followers / r.population) : 0;
    const ra = resAcc.get(r.key);
    r.resistance = ra ? (ra.s / ra.n) * 100 : 0;
  }
  return [...rows.values()];
}

export function statsToCSV(rows: StatRow[], level: StatLevel): string {
  const head = ['level', 'name', 'parent', 'followers', 'population', 'converted_pct', 'growth_per_min', 'avg_resistance', 'zealots', 'outposts', 'cities_controlled'];
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [head.join(',')];
  for (const r of rows)
    lines.push([level, r.name, r.parent ?? '', Math.round(r.followers), r.population, (r.conversion * 100).toFixed(4), r.growth.toFixed(1), r.resistance.toFixed(1), r.zealots, r.outposts, r.cities].map(esc).join(','));
  return lines.join('\n');
}
