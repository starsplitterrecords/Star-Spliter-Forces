// npm run content:weekly -- [runs=10] [weeks=120]
// Plays the weekly dispatch game with automated leaders and reports pacing, territory and content use.
import { LIBRARY } from '../../src/story/library';
import { CARD_BY_ID, followers, newStory } from '../../src/story/engine';
import { isOurs, variantTerritory } from '../../src/story/campaign';
import { playWeeks, type Policy } from '../../src/story/autoplay';
import { Rng } from '../../src/engine/rng';
import { CITIES } from '../../src/engine/geo';

const runs = Number(process.argv[2] ?? 10);
const weeks = Number(process.argv[3] ?? 120);
const policies: Policy[] = ['pleaser', 'random', 'order', 'expansion'];
const towns = ['Leeds', 'Hartford', 'Lyon', 'Osaka', 'Curitiba', 'Adelaide', 'Pune', 'Nairobi'];
const med = (a: number[]) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : NaN);
const eraWeeks: Record<string, number[]> = {};
const perWeek: number[] = [];
const roadShare: number[] = [];
const roadMax: number[] = [];
const variants: number[] = [];
const won: number[] = [];
const lost: number[] = [];
const ours: number[] = [];
const endings: Record<string, number> = {};
const seen = new Set<string>();

for (let i = 0; i < runs; i++) {
  const s = newStory('Jeff', CITIES.find((c) => c.name === towns[i % towns.length])!.id, 700 + i, 0, { weekly: true });
  const rng = new Rng(70 + i);
  let w = 0;
  let decisions = 0;
  let wins = 0;
  let losses = 0;
  const roads: Record<string, number> = {};
  for (; w < weeks && !s.ended; w++) {
    const d0 = s.decisions;
    playWeeks(s, 1, policies[i % policies.length], rng);
    decisions += s.decisions - d0;
    for (const l of s.lastWeek?.lines ?? []) {
      if (l.icon === '🏳️' && l.text.includes('is yours')) wins++;
      if (l.icon === '⚑') losses++;
    }
  }
  for (const h of s.history) {
    seen.add(h.cardId);
    if (h.cardId.startsWith('road.')) roads[h.cardId] = (roads[h.cardId] ?? 0) + 1;
  }
  for (const c of s.chronicle) {
    const m = /The (\w+(?: \w+)?) era began/.exec(c.text);
    if (m) (eraWeeks[m[1]] ??= []).push(Math.floor(c.day / 7) + 1);
  }
  perWeek.push(decisions / Math.max(1, w));
  roadShare.push(Object.values(roads).reduce((a, b) => a + b, 0) / Math.max(1, s.history.length));
  roadMax.push(Math.max(0, ...Object.values(roads)));
  variants.push(variantTerritory(s).size);
  won.push(wins);
  lost.push(losses);
  ours.push(s.region.filter((id) => isOurs(s, id) && s.cities[id].followers > 0).length);
  const end = s.ended?.title ?? `alive (${s.era}, week ${s.week})`;
  endings[end] = (endings[end] ?? 0) + 1;
  console.log(JSON.stringify({ run: i, policy: policies[i % policies.length], week: s.week, era: s.era, followers: followers(s), towns: ours.at(-1), ended: s.ended?.title ?? null }));
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const written = LIBRARY.cards.filter((c) => !c.shelved && !c.id.startsWith('crisis.') && !c.followUpOnly);
console.log('\n=== WEEKLY REPORT ===');
console.log(`era start week (median): ${Object.entries(eraWeeks).map(([e, a]) => `${e} ${med(a)}`).join(', ')}`);
console.log(`decisions per week: median ${med(perWeek).toFixed(1)}`);
console.log(`road incidents: ${pct(med(roadShare))} of decisions; most-repeated road card per run: median ${med(roadMax)}`);
console.log(`territory per run: ${med(ours)} towns held at the end; ${med(won)} won from rivals, ${med(lost)} lost to them; ${med(variants)} local versions of the belief`);
console.log(`cards seen across runs: ${written.filter((c) => seen.has(c.id)).length}/${written.length} drawable cards`);
console.log('outcomes:', endings);
void CARD_BY_ID;
