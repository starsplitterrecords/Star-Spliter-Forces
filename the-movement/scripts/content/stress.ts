// npm run content:stress -- [runs=24] [days=240]
// Plays the vertical slice many times with different leadership styles and reports on
// coverage, repetition, divergence between playthroughs, character fates and pacing.
import { LIBRARY } from '../../src/story/library';
import { followers, newStory, centralBelief, currentCard, advanceDays } from '../../src/story/engine';
import { playFor, type Policy } from '../../src/story/autoplay';
import { Rng } from '../../src/engine/rng';
import { CITIES } from '../../src/engine/geo';
import { counterfactuals, printNovelty, sequenceReport, type SequenceReport } from './novelty';

const runs = Number(process.argv[2] ?? 24);
const days = Number(process.argv[3] ?? 240);
const policies: Policy[] = ['pleaser', 'random', 'order', 'expansion', 'stubborn'];
const towns = ['Hartford', 'Leeds', 'Lyon', 'Osaka', 'Curitiba', 'Adelaide', 'Pune', 'Nairobi'];
const seen: Record<string, number> = {};
const endings: Record<string, number> = {};
const names: Record<string, number> = {};
const beliefs: Record<string, number> = {};
const fates: Record<string, Record<string, number>> = {};
const decisionsToGrassroots: number[] = [];
const followersAt: number[] = [];
let backToBack = 0;
const emptyDays: number[] = [];
const starvedDays: number[] = [];
let totalDecisions = 0;
const customsSets = new Set<string>();
const seqs: SequenceReport[] = [];
const chains = { delivered: 0, expired: 0, cancelled: 0 };
const memoryStats = { written: 0, witnessed: 0, withOther: 0, recalled: 0 };
const emergent = { started: 0, endorsed: 0, tolerated: 0, reformed: 0, condemned: 0, underground: 0, none: 0 };

for (let i = 0; i < runs; i++) {
  const policy = policies[i % policies.length];
  const hometown = CITIES.find((c) => c.name === towns[i % towns.length])!.id;
  const s = newStory('Jeff', hometown, 1000 + i, 0);
  const rng = new Rng(77 + i);
  let lastCard = '';
  let grassAt = -1;
  const track = { emptyDays: 0, starvedDays: 0 };
  for (let d = 0; d < days && !s.ended; d += 5) {
    playFor(s, 5, policy, rng, 0.3, track);
    if (grassAt < 0 && s.era !== 'founding') {
      grassAt = s.decisions;
      decisionsToGrassroots.push(s.decisions);
    }
  }
  for (const h of s.history) {
    seen[h.cardId] = (seen[h.cardId] ?? 0) + 1;
    if (h.cardId === lastCard) backToBack++;
    lastCard = h.cardId;
  }
  totalDecisions += s.decisions;
  emptyDays.push(track.emptyDays);
  starvedDays.push(track.starvedDays);
  const end = s.ended?.title ?? `alive (${s.era})`;
  endings[end] = (endings[end] ?? 0) + 1;
  names[s.movementName ?? '(unnamed)'] = (names[s.movementName ?? '(unnamed)'] ?? 0) + 1;
  const b = centralBelief(s)?.phrase ?? '(none)';
  beliefs[b] = (beliefs[b] ?? 0) + 1;
  customsSets.add(Object.entries(s.customs).filter(([, c]) => c.status !== 'none' && c.status !== 'abandoned').map(([k]) => k).sort().join(','));
  for (const [id, c] of Object.entries(s.chars)) {
    const fate = !c.present && c.status === 'absent' ? 'never joined' : c.status !== 'active' ? c.status : c.loyalty >= 50 ? 'devoted' : c.loyalty <= -40 ? 'disgruntled' : 'present';
    (fates[id] ??= {})[fate] = (fates[id][fate] ?? 0) + 1;
  }
  followersAt.push(followers(s));
  seqs.push(sequenceReport(s));
  for (const k of ['delivered', 'expired', 'cancelled'] as const) chains[k] += s.chains[k];
  memoryStats.written += s.nextMemoryId - 1;
  memoryStats.witnessed += s.memory.filter((m) => m.setting !== 'private').length;
  memoryStats.withOther += s.memory.filter((m) => m.other).length;
  memoryStats.recalled += s.memory.filter((m) => m.recalled > 0).length;
  for (const c of Object.values(s.customs)) {
    if (c.origin !== 'members') continue;
    emergent.started++;
    emergent[c.stance ?? 'none']++;
    if (c.underground) emergent.underground++;
  }
  console.log(JSON.stringify({ run: i, policy, era: s.era, day: Math.round(s.day), decisions: s.decisions, followers: followers(s), name: s.movementName, belief: b, ended: s.ended?.title ?? null, emptyDays: Math.round(track.emptyDays), inbox: s.inbox.length, current: currentCard(s)?.cardId ?? null }));
}

// idle compounding check: same decisions, then 30 days idle vs. 30 days of active play
const idle = newStory('Jeff', CITIES.find((c) => c.name === 'Leeds')!.id, 5, 0);
playFor(idle, 60, 'pleaser', new Rng(5));
const f0 = followers(idle);
advanceDays(idle, 14);
const idleGain = followers(idle) - f0;

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}
const never = LIBRARY.cards.filter((c) => !seen[c.id]).map((c) => c.id);
console.log('\n=== STRESS REPORT ===');
console.log(`runs ${runs} × ${days} days · decisions/run ${(totalDecisions / runs).toFixed(0)}`);
console.log(`coverage: ${LIBRARY.cards.length - never.length}/${LIBRARY.cards.length} cards seen; never seen: ${never.join(', ') || 'none'}`);
console.log(`back-to-back repeats: ${backToBack}`);
console.log(`starved days per run (nothing left to draw — the stall bug): median ${starvedDays.sort((a, b) => a - b)[Math.floor(starvedDays.length / 2)].toFixed(0)}, max ${Math.max(...starvedDays).toFixed(0)} of ${days} (includes time after the written story ends)`);
console.log(`quiet days per run (nobody at the door, incl. normal gaps between arrivals): median ${emptyDays.sort((a, b) => a - b)[Math.floor(emptyDays.length / 2)].toFixed(0)}, max ${Math.max(...emptyDays).toFixed(0)} of ${days}`);
console.log(`decisions to grassroots era: median ${decisionsToGrassroots.sort((a, b) => a - b)[Math.floor(decisionsToGrassroots.length / 2)] ?? 'n/a'} (spec target 15–25 founding decisions)`);
console.log(`final followers: min ${Math.min(...followersAt)}, median ${followersAt.sort((a, b) => a - b)[Math.floor(followersAt.length / 2)]}, max ${Math.max(...followersAt)}`);
console.log(`idle 14 days after 60 active days: +${idleGain} followers (from ${f0})`);
console.log('outcomes:', endings);
console.log('movement names:', names);
console.log('central beliefs:', beliefs);
console.log(`distinct sets of customs across runs: ${customsSets.size}/${runs}`);
console.log('character fates:', JSON.stringify(fates));
console.log(`story chains: ${chains.delivered} delivered, ${chains.expired} expired (moment passed), ${chains.cancelled} cancelled (situation gone)`);
console.log(`character memory per run: ${(memoryStats.written / runs).toFixed(0)} memories written, ${pct(memoryStats.witnessed / Math.max(1, memoryStats.written))} witnessed, ${pct(memoryStats.withOther / Math.max(1, memoryStats.written))} name a rival; ${(memoryStats.recalled / runs).toFixed(1)} called back`);
console.log(`members’ customs per run: ${(emergent.started / runs).toFixed(1)} started; stances ${JSON.stringify(Object.fromEntries(Object.entries(emergent).filter(([k]) => k !== 'started').map(([k, v]) => [k, +(v / runs).toFixed(1)])))}`);
console.log('most frequent cards:', Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}×${v}`).join(', '));

const branchRuns = Math.min(runs, Number(process.env.BRANCH_RUNS ?? 10));
const branches = counterfactuals(
  Array.from({ length: branchRuns }, (_, i) => 500 + i),
  [6, 14, 25, 40, 60, 85, 115],
  Number(process.env.BRANCH_DAYS ?? 25),
  policies,
  towns.map((t) => CITIES.find((c) => c.name === t)!.id),
);
printNovelty(seqs, branches);
