// npm run content:stress -- [runs=24] [days=240]
// Plays the vertical slice many times with different leadership styles and reports on
// coverage, repetition, divergence between playthroughs, character fates and pacing.
import { LIBRARY } from '../../src/story/library';
import { followers, newStory, centralBelief, currentCard, advanceDays } from '../../src/story/engine';
import { playFor, type Policy } from '../../src/story/autoplay';
import { Rng } from '../../src/engine/rng';
import { CITIES } from '../../src/engine/geo';

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
let totalDecisions = 0;
const customsSets = new Set<string>();

for (let i = 0; i < runs; i++) {
  const policy = policies[i % policies.length];
  const hometown = CITIES.find((c) => c.name === towns[i % towns.length])!.id;
  const s = newStory('Jeff', hometown, 1000 + i, 0);
  const rng = new Rng(77 + i);
  let lastCard = '';
  let grassAt = -1;
  for (let d = 0; d < days && !s.ended; d += 5) {
    playFor(s, 5, policy, rng);
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
  console.log(JSON.stringify({ run: i, policy, era: s.era, day: Math.round(s.day), decisions: s.decisions, followers: followers(s), name: s.movementName, belief: b, ended: s.ended?.title ?? null, inbox: s.inbox.length, current: currentCard(s)?.cardId ?? null }));
}

// idle compounding check: same decisions, then 30 days idle vs. 30 days of active play
const idle = newStory('Jeff', CITIES.find((c) => c.name === 'Leeds')!.id, 5, 0);
playFor(idle, 60, 'pleaser', new Rng(5));
const f0 = followers(idle);
advanceDays(idle, 14);
const idleGain = followers(idle) - f0;

const never = LIBRARY.cards.filter((c) => !seen[c.id]).map((c) => c.id);
console.log('\n=== STRESS REPORT ===');
console.log(`runs ${runs} × ${days} days · decisions/run ${(totalDecisions / runs).toFixed(0)}`);
console.log(`coverage: ${LIBRARY.cards.length - never.length}/${LIBRARY.cards.length} cards seen; never seen: ${never.join(', ') || 'none'}`);
console.log(`back-to-back repeats: ${backToBack}`);
console.log(`decisions to grassroots era: median ${decisionsToGrassroots.sort((a, b) => a - b)[Math.floor(decisionsToGrassroots.length / 2)] ?? 'n/a'} (spec target 15–25 founding decisions)`);
console.log(`final followers: min ${Math.min(...followersAt)}, median ${followersAt.sort((a, b) => a - b)[Math.floor(followersAt.length / 2)]}, max ${Math.max(...followersAt)}`);
console.log(`idle 14 days after 60 active days: +${idleGain} followers (from ${f0})`);
console.log('outcomes:', endings);
console.log('movement names:', names);
console.log('central beliefs:', beliefs);
console.log(`distinct sets of customs across runs: ${customsSets.size}/${runs}`);
console.log('character fates:', JSON.stringify(fates));
console.log('most frequent cards:', Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}×${v}`).join(', '));
