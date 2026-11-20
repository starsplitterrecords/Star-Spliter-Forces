// Automated balancing: runs many games with different seeds/doctrines/modes and reports
// time to key milestones. Usage: npm run balance -- [games=6] [hours=4]
import { autoplayTurn } from '../src/engine/autoplay';
import { createMovement } from '../src/engine/ideology';
import { CITIES } from '../src/engine/geo';
import { Rng } from '../src/engine/rng';
import { advanceSimulation, newGame } from '../src/engine/sim';
import { fmt, duration } from '../src/engine/text';
import { victoryProgress } from '../src/engine/victory';
import type { GameMode } from '../src/engine/types';
import { springismInput } from '../tests/fixtures';

const games = Number(process.argv[2] ?? 6);
const hours = Number(process.argv[3] ?? 4);
const ALT_CUSTOMS = [
  [{ category: 'clothing' as const, text: 'Wear oversized hats.' }, { category: 'music' as const, text: 'Polka.' }],
  [{ category: 'hobby' as const, text: 'Practice competitive napping.' }, { category: 'food' as const, text: 'Consume soup on Tuesdays.' }],
  [{ category: 'hygiene' as const, text: 'Brush teeth only once a week.' }, { category: 'housing' as const, text: 'Underground dwellings.' }],
];
const HQS = ['Hartford', 'Lyon', 'Osaka', 'Curitiba', 'Nairobi', 'Adelaide', 'Pune'];
const modes: GameMode[] = ['casual', 'standard', 'chaos'];

const results: Record<string, unknown>[] = [];
for (let g = 0; g < games; g++) {
  const rng = new Rng(1000 + g);
  const input = springismInput(1000 + g, modes[g % 3]);
  const hq = CITIES.find((c) => c.name === HQS[g % HQS.length]) ?? CITIES[500];
  input.headquarters.cityId = hq.id;
  if (g % 2) {
    input.ideologyName = ['Hat', 'Nap', 'Tooth'][g % 3];
    input.customs = ALT_CUSTOMS[g % 3];
    input.temperament = { emotion: rng.int(0, 100), social: rng.int(0, 100), conflict: rng.int(0, 100), activity: rng.int(0, 100) };
  }
  const s = newGame(createMovement(input), { seed: 1000 + g, now: 0 });
  const t0 = Date.now();
  const marks: Record<string, number> = {};
  const mark = (k: string, cond: boolean) => {
    if (cond && marks[k] == null) marks[k] = s.time;
  };
  const end = hours * 3600;
  let stuck = 0;
  while (s.time < end) {
    autoplayTurn(s, rng);
    advanceSimulation(s, 5, { stepSize: s.time < 1800 ? 1 : 2.5 });
    mark('first85', s.totals.citiesEver85 >= 1);
    mark('firstZealot', s.zealots.lifetime >= 1);
    mark('firstOutpost', Object.keys(s.outposts).length >= 1);
    mark('opposition', s.milestones.firstOpposition != null);
    mark('tenCities', s.totals.citiesEver85 >= 10);
    mark('phase4', s.phase >= 4);
    mark('phase5', s.phase >= 5);
    mark('phase6', s.phase >= 6);
    mark('phase7', s.phase >= 7);
    mark('firstSplinter', (s.counters.splinters ?? 0) > 0);
    mark('victory', s.victory.achieved);
    if (s.totals.followers === 0 && s.time > 300) stuck++;
    if (s.victory.achieved) break;
  }
  const vp = victoryProgress(s);
  results.push({
    game: g, mode: s.movement.gameMode, ideology: s.movement.ideologyName, hq: hq.name,
    ...Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, duration(v)])),
    followers: fmt(s.totals.followers), world: `${(vp.conversion * 100).toFixed(2)}%`, phase: s.phase, cohesion: Math.round(s.cohesion), drift: Math.round(s.drift),
    factions: Object.keys(s.factions).length, ending: s.victory.ending ?? '-', events: s.counters.events ?? 0, stuck, cpu: `${((Date.now() - t0) / 1000).toFixed(1)}s`,
  });
  console.log(JSON.stringify(results[results.length - 1]));
}
