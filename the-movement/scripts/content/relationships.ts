// npm run content:relationships -- [runs=40] [days=300]
// Do departures and conflicts feel like consequences of the player's history, or of collateral damage?
// For each character: where their loyalty losses come from (things they asked for vs. agendas they
// happen to share), whether they were warned and offered a reconciliation before leaving, and which
// cards cost them most.
import { CARD_BY_ID, CHAR_BY_ID, callMeeting, choose, currentCard, newStory } from '../../src/story/engine';
import { pickChoice, type Policy } from '../../src/story/autoplay';
import { Rng } from '../../src/engine/rng';
import { CITIES } from '../../src/engine/geo';
import type { StoryState } from '../../src/story/types';

const runs = Number(process.argv[2] ?? 40);
const days = Number(process.argv[3] ?? 300);
const policies: Policy[] = ['pleaser', 'random', 'order', 'expansion', 'stubborn'];
const towns = ['Hartford', 'Leeds', 'Lyon', 'Osaka', 'Curitiba', 'Adelaide', 'Pune', 'Nairobi'];

interface Stat {
  joined: number;
  left: number;
  direct: number; // loyalty lost on cards where they spoke or were named
  collateral: number; // lost only because a choice opposed their agenda in someone else's matter
  gained: number;
  warnedFirst: number; // departures preceded by being visibly unhappy
  offeredRepair: number; // departures where they brought you a grievance first (a chance to reconcile)
  exitScenes: number; // departures that happened on screen, as a scene
  decisionsUnhappy: number[]; // decisions between becoming unhappy and leaving
  costs: Record<string, number>;
  leftBy: Record<string, number>;
}
const stats: Record<string, Stat> = {};
const st = (id: string) => (stats[id] ??= { joined: 0, left: 0, direct: 0, collateral: 0, gained: 0, warnedFirst: 0, offeredRepair: 0, exitScenes: 0, decisionsUnhappy: [], costs: {}, leftBy: {} });
const policyOf: Record<string, Record<Policy, number>> = {};

for (let i = 0; i < runs; i++) {
  const policy = policies[i % policies.length];
  const s: StoryState = newStory('Jeff', CITIES.find((c) => c.name === towns[i % towns.length])!.id, 3000 + i, 0);
  const rng = new Rng(900 + i);
  const unhappyAt: Record<string, number> = {};
  const grievanceShown: Record<string, boolean> = {};
  let guard = 0;
  while (s.day < days && !s.ended && guard++ < 40000) {
    const inst = currentCard(s);
    if (!inst) {
      callMeeting(s);
      continue;
    }
    const card = CARD_BY_ID.get(inst.cardId)!;
    const before = Object.fromEntries(Object.entries(s.chars).map(([id, c]) => [id, { l: c.loyalty, p: c.present }]));
    const c = pickChoice(s, policy, rng);
    const e = card.choices[c].effects;
    if (CHAR_BY_ID.has(inst.speaker) && (card.speaker === 'unhappy' || card.recall || card.id.startsWith('people.'))) grievanceShown[inst.speaker] = true;
    choose(s, inst.uid, c, card.choices[c].input ? 'The Lentil Fellowship' : undefined);
    for (const [id, ch] of Object.entries(s.chars)) {
      const d = ch.loyalty - before[id].l;
      if (d < 0) {
        const named = inst.speaker === id || e.loyalty?.[id] != null || (e.otherLoyalty && inst.ctx.mOtherId === id) || (e.starterLoyalty && inst.ctx.emergentById === id) || card.recall?.who === id;
        if (named) st(id).direct -= d;
        else st(id).collateral -= d;
        st(id).costs[card.id] = (st(id).costs[card.id] ?? 0) - d;
      } else st(id).gained += d;
      if (ch.loyalty <= -40 && unhappyAt[id] == null) unhappyAt[id] = s.decisions;
      if (before[id].p && !ch.present && ch.status !== 'retired') {
        st(id).left++;
        st(id).leftBy[ch.status] = (st(id).leftBy[ch.status] ?? 0) + 1;
        (policyOf[id] ??= {} as Record<Policy, number>)[policy] = (policyOf[id][policy] ?? 0) + 1;
        if (unhappyAt[id] != null) {
          st(id).warnedFirst++;
          st(id).decisionsUnhappy.push(s.decisions - unhappyAt[id]);
        }
        if (grievanceShown[id]) st(id).offeredRepair++;
        if (card.id.startsWith('people.')) st(id).exitScenes++;
      }
    }
  }
  for (const [id, ch] of Object.entries(s.chars)) if (ch.status !== 'absent' || ch.joinedDay != null) st(id).joined++;
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');
console.log(`=== RELATIONSHIPS (${runs} runs × ${days} days) ===`);
for (const [id, x] of Object.entries(stats)) {
  if (!x.joined) continue;
  const lost = x.direct + x.collateral;
  const top = Object.entries(x.costs).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${Math.round(v / runs)}`).join(', ');
  const med = x.decisionsUnhappy.length ? [...x.decisionsUnhappy].sort((a, b) => a - b)[Math.floor(x.decisionsUnhappy.length / 2)] : '—';
  console.log(`\n${CHAR_BY_ID.get(id)!.name} (${CHAR_BY_ID.get(id)!.agenda})`);
  console.log(`  left ${x.left}/${x.joined} runs ${JSON.stringify(x.leftBy)} · by play style ${JSON.stringify(policyOf[id] ?? {})}`);
  console.log(`  loyalty lost per run ${Math.round(lost / runs)} (gained ${Math.round(x.gained / runs)}): ${pct(x.collateral, lost)} collateral (their agenda opposed in someone else's matter), ${pct(x.direct, lost)} direct`);
  if (x.left) console.log(`  of departures: ${pct(x.warnedFirst, x.left)} visibly unhappy first (median ${med} decisions of warning), ${pct(x.offeredRepair, x.left)} brought a grievance first, ${pct(x.exitScenes, x.left)} left in an exit scene`);
  console.log(`  costliest cards (loyalty per run): ${top}`);
}
