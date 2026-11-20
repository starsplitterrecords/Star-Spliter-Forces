// Editorial novelty: does the library produce different stories, or the same joke in different hats?
// Used by content:stress. Four checks:
//  1. comic shapes   — is one structure (proposal, escalation, …) carrying too much of a playthrough?
//  2. dominance      — does one character present too much of the story?
//  3. tradeoffs      — do choices keep trading the same gauges in the same direction, do some choices
//                      dominate others, and is pleasing a character always good (or always bad)?
//  4. counterfactual — branch a game at a decision, take the other choice, play both on with the
//                      same luck and measure how different the movements become. Inert choices are flagged.
import { LIBRARY } from '../../src/story/library';
import { CARD_BY_ID, CHAR_BY_ID, centralBelief, choose, currentCard, followers, loadStory, newStory, serializeStory } from '../../src/story/engine';
import { pickChoice, playFor, playUntilDecision, type Policy } from '../../src/story/autoplay';
import { Rng } from '../../src/engine/rng';
import type { CardDef, ChoiceDef, Gauge, StoryState } from '../../src/story/types';

const G: Gauge[] = ['enthusiasm', 'unity', 'attention', 'resources'];
const ABBR: Record<Gauge, string> = { enthusiasm: 'E', unity: 'U', attention: 'A', resources: 'R' };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const median = (a: number[]) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);

// ---------------------------------------------------------------- 1 + 2: per-playthrough sequences

export interface SequenceReport {
  shapeShare: Record<string, number>;
  topShapeShare: number;
  worstShapeWindow: number; // max share of a single shape in any 15-decision window
  shapeRepeats: number; // same shape twice in a row
  speakerShare: Record<string, number>;
  topSpeaker: string;
  topSpeakerShare: number;
  worstSpeakerWindow: number; // max share of one named speaker in any 20-decision window
}

export function sequenceReport(s: StoryState): SequenceReport {
  const shapes = s.history.map((h) => CARD_BY_ID.get(h.cardId)?.shape ?? 'untagged');
  const speakers = s.history.map((h) => h.speaker).filter((x) => CHAR_BY_ID.has(x));
  const share = (xs: string[]) => {
    const m: Record<string, number> = {};
    for (const x of xs) m[x] = (m[x] ?? 0) + 1 / Math.max(1, xs.length);
    return m;
  };
  const windowMax = (xs: string[], w: number) => {
    let best = 0;
    for (let i = 0; i + w <= xs.length; i++) {
      const c: Record<string, number> = {};
      for (const x of xs.slice(i, i + w)) c[x] = (c[x] ?? 0) + 1;
      best = Math.max(best, Math.max(...Object.values(c)) / w);
    }
    return best;
  };
  const ss = share(shapes);
  const sp = share(speakers);
  const top = Object.entries(sp).sort((a, b) => b[1] - a[1])[0] ?? ['none', 0];
  return {
    shapeShare: ss,
    topShapeShare: Math.max(0, ...Object.values(ss)),
    worstShapeWindow: windowMax(shapes, 15),
    shapeRepeats: shapes.filter((x, i) => i > 0 && x === shapes[i - 1] && x !== 'crisis').length,
    speakerShare: sp,
    topSpeaker: top[0],
    topSpeakerShare: top[1],
    worstSpeakerWindow: windowMax(speakers, 20),
  };
}

// ---------------------------------------------------------------- 3: tradeoffs (static, over the library)

const sig = (c: ChoiceDef) =>
  G.filter((g) => (c.effects.gauges?.[g] ?? 0) !== 0)
    .map((g) => `${ABBR[g]}${(c.effects.gauges![g] ?? 0) > 0 ? '+' : '−'}`)
    .join(' ') || '(none)';

function dominates(a: ChoiceDef, b: ChoiceDef): boolean {
  // a is at least as good on every gauge (assuming the middle is not threatened), better on one,
  // and costs nobody anything that b doesn't
  const ga = a.effects.gauges ?? {};
  const gb = b.effects.gauges ?? {};
  let strictly = false;
  for (const g of G) {
    if ((ga[g] ?? 0) < (gb[g] ?? 0)) return false;
    if ((ga[g] ?? 0) > (gb[g] ?? 0)) strictly = true;
  }
  const costs = (c: ChoiceDef) =>
    (c.effects.serves ?? []).filter((x) => x.startsWith('-')).length + Object.values(c.effects.loyalty ?? {}).filter((v) => v < 0).length + ((c.effects.speakerLoyalty ?? 0) < 0 ? 1 : 0) + ((c.effects.otherLoyalty ?? 0) < 0 ? 1 : 0) + ((c.effects.starterLoyalty ?? 0) < 0 ? 1 : 0) + (c.effects.recall === 'deepen' ? 1 : 0) + (c.effects.modifiers?.some((m) => m.mult < 1) ? 1 : 0) + ((c.effects.followers ?? 0) < 0 ? 1 : 0);
  const extras = (c: ChoiceDef) => (c.effects.followUps?.length ?? 0) + (c.effects.custom?.length ?? 0) + (c.effects.flags?.length ?? 0) + (c.effects.stance ? 1 : 0);
  return strictly && costs(a) <= costs(b) && extras(b) === 0;
}

export function tradeoffReport(cards: CardDef[] = LIBRARY.cards) {
  const pairs: Record<string, number> = {};
  const dominated: string[] = [];
  const free: string[] = [];
  for (const c of cards) {
    if (c.type === 'crisis') continue;
    const [a, b] = [sig(c.choices[0]), sig(c.choices[1])].sort();
    const key = `${a}  vs  ${b}`;
    pairs[key] = (pairs[key] ?? 0) + 1;
    if (dominates(c.choices[0], c.choices[1]) || dominates(c.choices[1], c.choices[0])) dominated.push(c.id);
    if (c.choices.every((ch) => Object.values(ch.effects.gauges ?? {}).every((v) => (v ?? 0) >= 0))) free.push(c.id);
  }
  const n = cards.filter((c) => c.type !== 'crisis').length;
  const topPairs = Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // six buttons? for each character: when you serve their agenda, what happens to the gauges?
  const agendaButtons: Record<string, { n: number; consistency: number; netGood: number; dominant: string }> = {};
  for (const ch of LIBRARY.characters) {
    const vecs = cards.flatMap((c) => c.choices.filter((x) => x.effects.serves?.includes(ch.agenda)).map((x) => x.effects.gauges ?? {}));
    if (!vecs.length) continue;
    let cons = 0;
    let weight = 0;
    const dirs: string[] = [];
    for (const g of G) {
      const vs = vecs.map((v) => v[g] ?? 0).filter((v) => v !== 0);
      if (!vs.length) continue;
      const up = vs.filter((v) => v > 0).length / vs.length;
      cons += Math.max(up, 1 - up) * vs.length;
      weight += vs.length;
      if (vs.length >= vecs.length * 0.4) dirs.push(`${ABBR[g]}${up >= 0.5 ? '+' : '−'}${Math.round(Math.max(up, 1 - up) * 100)}%`);
    }
    const netGood = vecs.filter((v) => Object.values(v).reduce((a, b) => a + (b ?? 0), 0) > 0).length / vecs.length;
    agendaButtons[ch.id] = { n: vecs.length, consistency: weight ? cons / weight : 0, netGood, dominant: dirs.join(' ') };
  }
  return { n, topPairs, distinctPairs: Object.keys(pairs).length, dominated, free, agendaButtons };
}

// ---------------------------------------------------------------- 4: counterfactual branches

/** How different two movements have become, 0 (identical) to 1 (unrecognisable). */
export function storyDistance(a: StoryState, b: StoryState): { total: number; parts: Record<string, number> } {
  const jac = (x: Set<string>, y: Set<string>) => {
    const u = new Set([...x, ...y]);
    if (!u.size) return 0;
    let i = 0;
    for (const k of x) if (y.has(k)) i++;
    return 1 - i / u.size;
  };
  const flags = jac(new Set(Object.keys(a.flags)), new Set(Object.keys(b.flags)));
  const cust = (s: StoryState) => new Set(Object.entries(s.customs).filter(([, c]) => c.status !== 'none').map(([k, c]) => `${k}:${c.status}:${c.stance ?? ''}`));
  const customs = jac(cust(a), cust(b));
  const ids = Object.keys(a.chars);
  // relationships: a big swing with one person matters as much as small swings with everyone
  const people = Math.min(1, ids.reduce((acc, id) => acc + Math.min(1, Math.abs(a.chars[id].loyalty - b.chars[id].loyalty) / 40) + (a.chars[id].status !== b.chars[id].status ? 1 : 0), 0) / 2);
  const after = (s: StoryState, from: number) => new Set(s.history.filter((h) => h.day >= from).map((h) => h.cardId));
  const from = Math.min(a.history.at(-1)?.day ?? 0, b.history.at(-1)?.day ?? 0) - 25;
  const story = jac(after(a, from), after(b, from));
  const identity = (a.movementName !== b.movementName ? 0.5 : 0) + (centralBelief(a)?.id !== centralBelief(b)?.id ? 0.5 : 0);
  const fa = followers(a);
  const fb = followers(b);
  const size = Math.min(1, Math.abs(Math.log((fa + 10) / (fb + 10))));
  const ended = a.ended?.title !== b.ended?.title ? 1 : 0;
  const parts = { flags, customs, people, story, identity, size, ended };
  const total = Math.min(1, flags * 0.2 + customs * 0.2 + people * 0.2 + story * 0.15 + identity * 0.1 + size * 0.05 + ended * 0.1 + (ended ? 0.3 : 0));
  return { total, parts };
}

export interface Branch {
  card: string;
  decision: number;
  distance: number;
  parts: Record<string, number>;
}

export function counterfactuals(seeds: number[], at: number[], horizonDays: number, policies: Policy[], hometowns: number[]): Branch[] {
  const out: Branch[] = [];
  seeds.forEach((seed, i) => {
    const policy = policies[i % policies.length];
    const base = newStory('Jeff', hometowns[i % hometowns.length], seed, 0);
    const rng = new Rng(seed * 7 + 1);
    for (const k of at) {
      if (!playUntilDecision(base, k, policy, rng)) break;
      const inst = currentCard(base)!;
      const card = CARD_BY_ID.get(inst.cardId)!;
      if (card.type === 'crisis') continue;
      const snap = serializeStory(base);
      const pick = pickChoice(base, policy, new Rng(seed + k));
      const branches = ([pick, (1 - pick) as 0 | 1] as const).map((choice) => {
        const s = loadStory(snap);
        const cur = currentCard(s)!;
        choose(s, cur.uid, choice, card.choices[choice].input ? 'The Lentil Fellowship' : undefined);
        playFor(s, horizonDays, policy, new Rng(seed * 13 + k)); // the same luck for both futures
        return s;
      });
      const d = storyDistance(branches[0], branches[1]);
      out.push({ card: card.id, decision: k, distance: d.total, parts: d.parts });
    }
  });
  return out;
}

export function printNovelty(seqs: SequenceReport[], branches: Branch[]) {
  console.log('\n=== EDITORIAL NOVELTY ===');
  // 1 shapes
  const shapeTotals: Record<string, number> = {};
  for (const r of seqs) for (const [k, v] of Object.entries(r.shapeShare)) shapeTotals[k] = (shapeTotals[k] ?? 0) + v / seqs.length;
  console.log(`comic shapes (mean share of a playthrough): ${Object.entries(shapeTotals).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v)}`).join(', ')}`);
  console.log(`  top shape per run: median ${pct(median(seqs.map((r) => r.topShapeShare)))}; worst 15-decision window: median ${pct(median(seqs.map((r) => r.worstShapeWindow)))}, max ${pct(Math.max(...seqs.map((r) => r.worstShapeWindow)))}`);
  console.log(`  same shape twice in a row: median ${median(seqs.map((r) => r.shapeRepeats))} per run`);
  const shapeFlags = Object.entries(shapeTotals).filter(([, v]) => v > 0.22).map(([k]) => k);
  if (shapeFlags.length) console.log(`  ⚠ over-used structure (>22% of a playthrough): ${shapeFlags.join(', ')}`);
  // 2 dominance
  const tops: Record<string, number> = {};
  for (const r of seqs) tops[r.topSpeaker] = (tops[r.topSpeaker] ?? 0) + 1;
  console.log(`character dominance: most frequent speaker per run ${JSON.stringify(tops)}; their share median ${pct(median(seqs.map((r) => r.topSpeakerShare)))}, max ${pct(Math.max(...seqs.map((r) => r.topSpeakerShare)))}`);
  console.log(`  worst 20-decision window held by one character: median ${pct(median(seqs.map((r) => r.worstSpeakerWindow)))}, max ${pct(Math.max(...seqs.map((r) => r.worstSpeakerWindow)))}`);
  const dom = seqs.filter((r) => r.topSpeakerShare > 0.35).length;
  if (dom) console.log(`  ⚠ ${dom} run(s) where one character presented more than 35% of named-character cards`);
  // 3 tradeoffs
  const t = tradeoffReport();
  console.log(`tradeoffs: ${t.distinctPairs} distinct gauge trades across ${t.n} cards; most common:`);
  for (const [k, v] of t.topPairs) console.log(`  ${pct(v / t.n).padStart(4)}  ${k}`);
  console.log(`  dominated choices (one option is simply better): ${t.dominated.length ? t.dominated.join(', ') : 'none'}`);
  console.log(`  no-cost cards (neither option lowers a gauge): ${t.free.length ? t.free.join(', ') : 'none'}`);
  console.log('  agenda predictability (serving this character’s agenda moves gauges the same way how often?):');
  for (const [id, a] of Object.entries(t.agendaButtons)) {
    const flag = a.consistency > 0.85 ? '  ⚠ predictable' : '';
    console.log(`    ${id.padEnd(8)} ${String(a.n).padStart(3)} choices · direction consistency ${pct(a.consistency)} · net-positive ${pct(a.netGood)} · ${a.dominant}${flag}`);
  }
  // 4 counterfactuals
  if (branches.length) {
    const ds = branches.map((b) => b.distance);
    console.log(`counterfactual branches: ${branches.length}; story distance after the other choice: median ${ds.length ? median(ds).toFixed(2) : 'n/a'}, max ${Math.max(...ds).toFixed(2)}`);
    const parts: Record<string, number> = {};
    for (const b of branches) for (const [k, v] of Object.entries(b.parts)) parts[k] = (parts[k] ?? 0) + v / branches.length;
    console.log(`  where branches differ (mean): ${Object.entries(parts).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ')}`);
    const inert = branches.filter((b) => b.distance < 0.06);
    console.log(`  inert choices (both options led to effectively the same story): ${inert.length}/${branches.length} ${inert.length ? `— ${[...new Set(inert.map((b) => b.card))].join(', ')}` : ''}`);
    const best = [...branches].sort((a, b) => b.distance - a.distance).slice(0, 5);
    console.log(`  most consequential: ${best.map((b) => `${b.card} (${b.distance.toFixed(2)})`).join(', ')}`);
  }
}
