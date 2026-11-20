// Builds the bundled, compact world dataset used by the game.
// Source: GeoNames (CC-BY 4.0) via the `geonamescache` Python package data files
// (cities15000.json, countries.json, us_states.json), `world-countries` (ODbL) for
// UN subregions, and `world-atlas` (Natural Earth, public domain) for the map.
// Usage: node scripts/build-data.mjs <path-to-geonamescache/data>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const dir = process.argv[2];
if (!dir) { console.error('usage: build-data.mjs <geonamescache data dir>'); process.exit(1); }
const cities = Object.values(JSON.parse(fs.readFileSync(path.join(dir, 'cities15000.json'), 'utf8')));
const countries = JSON.parse(fs.readFileSync(path.join(dir, 'countries.json'), 'utf8'));
const usStates = JSON.parse(fs.readFileSync(path.join(dir, 'us_states.json'), 'utf8'));
const wc = require('world-countries');
const topo = require('world-atlas/countries-110m.json');
const mapIds = new Set(topo.objects.countries.geometries.map((g) => String(g.id)));

const CONT = { AF: 'Africa', AS: 'Asia', EU: 'Europe', NA: 'North America', SA: 'South America', OC: 'Oceania', AN: 'Antarctica' };
const ADMIN = {
  CA: { '01': 'Alberta', '02': 'British Columbia', '03': 'Manitoba', '04': 'New Brunswick', '05': 'Newfoundland and Labrador', '07': 'Nova Scotia', '08': 'Ontario', '09': 'Prince Edward Island', '10': 'Quebec', '11': 'Saskatchewan', '12': 'Yukon', '13': 'Northwest Territories', '14': 'Nunavut' },
  AU: { '01': 'Australian Capital Territory', '02': 'New South Wales', '03': 'Northern Territory', '04': 'Queensland', '05': 'South Australia', '06': 'Tasmania', '07': 'Victoria', '08': 'Western Australia' },
  GB: { ENG: 'England', SCT: 'Scotland', WLS: 'Wales', NIR: 'Northern Ireland' },
};
for (const s of Object.values(usStates)) (ADMIN.US ??= {})[s.code] = s.name;

// 1. candidate selection: all >= 75k, plus a deterministic sample of smaller towns.
let pick = cities.filter((c) => c.population >= 75000 || (c.population >= 15000 && c.geonameid % 6 === 0));
// ensure every country has at least 4 cities
const byCC = {};
for (const c of cities) (byCC[c.countrycode] ??= []).push(c);
const chosen = new Set(pick.map((c) => c.geonameid));
for (const list of Object.values(byCC)) {
  list.sort((a, b) => b.population - a.population);
  for (const c of list.slice(0, 4)) if (!chosen.has(c.geonameid)) { chosen.add(c.geonameid); pick.push(c); }
}
// 2. de-duplicate boroughs / districts that sit on top of a larger city (avoid double counting)
pick.sort((a, b) => b.population - a.population);
const kept = [];
const grid = new Map();
const key = (la, lo) => `${Math.floor(la)}:${Math.floor(lo)}`;
const dist = (a, b) => {
  const R = 6371, toR = Math.PI / 180;
  const dLa = (b.latitude - a.latitude) * toR, dLo = (b.longitude - a.longitude) * toR;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.latitude * toR) * Math.cos(b.latitude * toR) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
let dropped = 0;
for (const c of pick) {
  let bad = false;
  for (let i = -1; i <= 1 && !bad; i++) for (let j = -1; j <= 1 && !bad; j++) {
    for (const o of grid.get(key(c.latitude + i, c.longitude + j)) ?? []) {
      const R = 3 + 6 * Math.sqrt(o.population / 1e6);
      if (o.countrycode === c.countrycode && dist(o, c) < R) { bad = true; break; }
    }
  }
  if (bad) { dropped++; continue; }
  kept.push(c);
  const k = key(c.latitude, c.longitude);
  if (!grid.has(k)) grid.set(k, []);
  grid.get(k).push(c);
}
// 3. admin1 names
const groupLargest = {};
for (const c of kept) { const g = `${c.countrycode}.${c.admin1code}`; if (!groupLargest[g]) groupLargest[g] = c.name; }
const adminName = (c) => ADMIN[c.countrycode]?.[c.admin1code] ?? `${groupLargest[`${c.countrycode}.${c.admin1code}`]} Region`;

// 4. countries
const wcBy = Object.fromEntries(wc.map((w) => [w.cca2, w]));
const outCountries = [];
const cityPopBy = {};
for (const c of kept) cityPopBy[c.countrycode] = (cityPopBy[c.countrycode] ?? 0) + c.population;
const scale = {};
for (const [cc, co] of Object.entries(countries)) {
  if (!co.population || !cityPopBy[cc]) continue;
  const w = wcBy[cc];
  const cap = co.population * 0.92;
  scale[cc] = cityPopBy[cc] > cap ? cap / cityPopBy[cc] : 1;
  const modeled = Math.round(cityPopBy[cc] * scale[cc]);
  outCountries.push({
    code: cc, name: w?.name?.common ?? co.name, continent: CONT[co.continentcode] ?? 'Other',
    region: w?.subregion || w?.region || CONT[co.continentcode] || 'Other',
    population: co.population, hinterland: 0, // computed below from the final rounded city populations
    mapId: mapIds.has(String(co.isonumeric).padStart(3, '0')) ? String(co.isonumeric).padStart(3, '0') : null,
  });
}
const validCC = new Set(outCountries.map((c) => c.code));
// 5. compact cities: [id, name, admin, cc, lat, lon, pop, hubScore]
const outCities = kept.filter((c) => validCC.has(c.countrycode)).map((c) => {
  const pop = Math.max(1000, Math.round(c.population * scale[c.countrycode]));
  // connectivity: proxy from population tier + capital-ness via being largest in its country
  const isLargest = byCC[c.countrycode][0].geonameid === c.geonameid;
  const hub = Math.min(100, Math.round(10 * Math.log10(pop) - 30 + (isLargest ? 25 : 0)));
  return [c.geonameid, c.name, adminName(c), c.countrycode, +c.latitude.toFixed(3), +c.longitude.toFixed(3), pop, Math.max(5, hub)];
});
outCities.sort((a, b) => b[6] - a[6]);
// hinterland = country population not living in a modeled city (never negative, never double-counted)
const finalBy = {};
for (const c of outCities) finalBy[c[3]] = (finalBy[c[3]] ?? 0) + c[6];
for (const co of outCountries) {
  if (finalBy[co.code] > co.population) co.population = finalBy[co.code];
  co.hinterland = co.population - (finalBy[co.code] ?? 0);
}
const meta = { source: 'GeoNames cities15000 + countryInfo (CC-BY 4.0) via geonamescache 3.0.2; world-countries (ODbL); Natural Earth via world-atlas (public domain)', snapshotYear: 2018, generated: new Date().toISOString().slice(0, 10), cityCount: outCities.length, droppedOverlaps: dropped };
fs.writeFileSync('src/data/cities.json', JSON.stringify({ meta, fields: ['id', 'name', 'admin', 'cc', 'lat', 'lon', 'pop', 'hub'], cities: outCities }));
fs.writeFileSync('src/data/countries.json', JSON.stringify(outCountries));
console.log(meta, 'countries', outCountries.length, 'world', outCountries.reduce((s, c) => s + c.population, 0));
