// Static geography: the bundled city/country dataset plus spatial lookups.
// Derived structures are cached in module scope; nothing here is saved.
import citiesRaw from '../data/cities.json';
import countriesRaw from '../data/countries.json';
import type { CityStatic, CountryStatic } from './types';

type RawCity = [number, string, string, string, number, number, number, number];

export const DATASET_META = (citiesRaw as { meta: Record<string, unknown> }).meta as {
  source: string;
  snapshotYear: number;
  cityCount: number;
};

export const CITIES: CityStatic[] = (citiesRaw as unknown as { cities: RawCity[] }).cities.map((c, idx) => ({
  id: c[0],
  name: c[1],
  admin: c[2],
  cc: c[3],
  lat: c[4],
  lon: c[5],
  pop: c[6],
  hub: c[7],
  idx,
}));

export const COUNTRIES: CountryStatic[] = countriesRaw as CountryStatic[];
export const COUNTRY_BY_CODE: Record<string, CountryStatic> = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));
export const CITY_BY_ID = new Map<number, CityStatic>(CITIES.map((c) => [c.id, c]));
export const CITIES_BY_COUNTRY: Record<string, CityStatic[]> = {};
for (const c of CITIES) (CITIES_BY_COUNTRY[c.cc] ??= []).push(c);

export const WORLD_POPULATION = COUNTRIES.reduce((s, c) => s + c.population, 0);
export const MODELED_CITY_POPULATION = CITIES.reduce((s, c) => s + c.pop, 0);

export function city(id: number): CityStatic {
  const c = CITY_BY_ID.get(id);
  if (!c) throw new Error(`Unknown city ${id}`);
  return c;
}

export function countryName(cc: string): string {
  return COUNTRY_BY_CODE[cc]?.name ?? cc;
}

const TO_RAD = Math.PI / 180;
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLa = (b.lat - a.lat) * TO_RAD;
  const dLo = (b.lon - a.lon) * TO_RAD;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * TO_RAD) * Math.cos(b.lat * TO_RAD) * Math.sin(dLo / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

// 2-degree spatial grid
const GRID = 2;
const grid = new Map<string, CityStatic[]>();
const gkey = (lat: number, lon: number) => `${Math.floor(lat / GRID)}:${Math.floor(lon / GRID)}`;
for (const c of CITIES) {
  const k = gkey(c.lat, c.lon);
  let arr = grid.get(k);
  if (!arr) grid.set(k, (arr = []));
  arr.push(c);
}

export function citiesNear(lat: number, lon: number, radiusKm: number): CityStatic[] {
  const out: CityStatic[] = [];
  const dLat = Math.ceil(radiusKm / 111 / GRID) + 1;
  const cosLat = Math.max(0.15, Math.cos(lat * TO_RAD));
  const dLon = Math.min(180 / GRID, Math.ceil(radiusKm / (111 * cosLat) / GRID) + 1);
  const gLat = Math.floor(lat / GRID);
  const gLon = Math.floor(lon / GRID);
  const lonCells = 360 / GRID;
  for (let i = -dLat; i <= dLat; i++) {
    for (let j = -dLon; j <= dLon; j++) {
      let lj = gLon + j;
      // wrap longitude
      const minIdx = Math.floor(-180 / GRID);
      if (lj < minIdx) lj += lonCells;
      if (lj >= minIdx + lonCells) lj -= lonCells;
      const arr = grid.get(`${gLat + i}:${lj}`);
      if (!arr) continue;
      for (const c of arr) if (distanceKm({ lat, lon }, c) <= radiusKm) out.push(c);
    }
  }
  return out;
}

const neighborCache = new Map<number, { id: number; d: number; w: number }[]>();
/** Up to 10 nearest cities within 900 km (weighted by distance), plus same-country hubs. */
export function neighbors(id: number): { id: number; d: number; w: number }[] {
  const cached = neighborCache.get(id);
  if (cached) return cached;
  const c = city(id);
  let near = citiesNear(c.lat, c.lon, 450);
  if (near.length < 6) near = citiesNear(c.lat, c.lon, 900);
  const list = near
    .filter((o) => o.id !== id)
    .map((o) => ({ id: o.id, d: distanceKm(c, o), pop: o.pop }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 10)
    .map((o) => ({ id: o.id, d: o.d, w: 1 / (1 + o.d / 120) }));
  neighborCache.set(id, list);
  return list;
}

export function populationTier(pop: number): { tier: number; label: string } {
  if (pop >= 10_000_000) return { tier: 7, label: 'Megacity' };
  if (pop >= 3_000_000) return { tier: 6, label: 'Metropolis' };
  if (pop >= 1_000_000) return { tier: 5, label: 'Major city' };
  if (pop >= 300_000) return { tier: 4, label: 'Mid-sized city' };
  if (pop >= 100_000) return { tier: 3, label: 'Small city' };
  if (pop >= 40_000) return { tier: 2, label: 'Town' };
  return { tier: 1, label: 'Small town' };
}
