// Splinter groups, independent rival movements and New Game+ precedents.
import { FIRST_NAMES, LAST_NAMES, RIVAL_COLORS, RIVAL_SEEDS } from '../content/presets';
import { MOTIFS } from '../content/motifs';
import { BALANCE, MODES } from './config';
import { addEvent, clamp, ensureCity, nid, othersTotal } from './core';
import { CITIES, city, countryName, distanceKm, neighbors } from './geo';
import type { Rng } from './rng';
import { fill, makeCtx } from './text';
import type { Doctrine, Faction, FactionRelation, GameState } from './types';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const titleCase = (s: string) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());

export function fictionalPerson(rng: Rng): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}

export function splinterName(state: GameState, d: Doctrine, style: Faction['style'], rng: Rng, hqCityId: number): { name: string; members: string; diff: string } {
  const mv = state.movement;
  const m = d.motif;
  const F = mv.pluralFollowers;
  const N = titleCase(m.noun);
  switch (style) {
    case 'orthodox': {
      const name = rng.pick([`Orthodox ${F}`, `The Traditional ${F}`, `${F} of the Original Text`, `The ${N} Purists`]);
      return { name, members: name.replace(/^The /, ''), diff: `${cap(m.purism)}.` };
    }
    case 'progressive': {
      const name = rng.pick([`Progressive ${F}`, `Reformed ${F}`, `The New ${mv.adjective} Fellowship`, `${F} for ${titleCase(m.heresy)}`]);
      return { name, members: name.replace(/^The /, ''), diff: `${cap(m.heresy)} should qualify.` };
    }
    case 'radical': {
      const name = rng.pick([`The Fundamental ${N} Society`, `The Inner ${N} Collective`, `The ${N}less Reformers`, `The Society of the Invisible ${N}`]);
      return { name, members: name.replace(/^The /, ''), diff: `${cap(m.radical)}.` };
    }
    default: {
      const c = city(hqCityId);
      const name = rng.pick([`The ${c.admin.replace(/ Region$/, '')} ${F}`, `${c.name} Autonomous ${F}`, `${countryName(c.cc)} ${mv.adjective} Conference`]);
      return { name, members: name.replace(/^The /, ''), diff: `Local chapters should decide matters of ${m.measure}.` };
    }
  }
}

export function createSplinter(
  state: GameState,
  rng: Rng,
  opts: { doctrineId?: string; style?: Faction['style']; cityId?: number; size?: number; originEventId?: string } = {},
): Faction | null {
  const mv = state.movement;
  const controlled = state.touched.filter((id) => state.cities[id].followers > 2000);
  if (!controlled.length) return null;
  const d = mv.doctrines.find((x) => x.id === opts.doctrineId) ?? rng.weighted(mv.doctrines, (x) => 10 + x.attributes.ambiguity)!;
  const style = opts.style ?? rng.pick(['orthodox', 'progressive', 'radical', 'regional'] as const);
  const hq = opts.cityId ?? rng.weighted(controlled, (id) => Math.sqrt(state.cities[id].followers) * (id === mv.headquarters.cityId ? 0.2 : 1))!;
  const hqC = city(hq);
  const locs = [hq, ...controlled.filter((id) => id !== hq && distanceKm(hqC, city(id)) < 900).slice(0, 7)];
  const names = splinterName(state, d, style, rng, hq);
  if (Object.values(state.factions).some((f) => f.name === names.name && f.relationship !== 'dissolved' && f.relationship !== 'merged')) {
    names.name = `${names.name} (${hqC.name} Chapter)`;
  }
  const f: Faction = {
    id: nid(state, 'f'),
    kind: 'splinter',
    name: names.name,
    members: names.members,
    founder: fictionalPerson(rng),
    doctrineDifferences: [names.diff],
    doctrineId: d.id,
    customs: [],
    color: rng.pick(RIVAL_COLORS),
    hqCityId: hq,
    locations: locs,
    followerCount: 0,
    growthRate: 1,
    relationship: 'rival',
    disagreement: rng.int(45, 75),
    cohesion: rng.int(55, 85),
    createdAt: state.time,
    history: [],
    originEventId: opts.originEventId,
    style,
  };
  const size = (opts.size ?? rng.range(0.03, 0.08)) * MODES[mv.gameMode].consequence;
  let moved = 0;
  for (const id of locs) {
    const cd = state.cities[id];
    const n = Math.floor(cd.followers * size * (id === hq ? 1.8 : 1));
    cd.followers -= n;
    cd.others[f.id] = (cd.others[f.id] ?? 0) + n;
    moved += n;
  }
  f.followerCount = moved;
  state.totals.defections += moved;
  state.factions[f.id] = f;
  state.counters.splinters = (state.counters.splinters ?? 0) + 1;
  return f;
}

export function createRival(state: GameState, rng: Rng): Faction | null {
  const used = new Set(Object.values(state.factions).map((f) => f.name));
  const seeds = RIVAL_SEEDS.filter((s) => !used.has(`${s.root}ism`));
  if (!seeds.length) return null;
  const seed = rng.pick(seeds);
  const playerKeys = new Set(state.movement.doctrines.map((d) => d.motif.key));
  const otherMotifs = MOTIFS.filter((m) => !playerKeys.has(m.key));
  const customs = [seed.custom, ...rng.shuffle([...otherMotifs]).slice(0, 2).map((m) => `${cap(m.verb)}.`)];
  // headquarters: a sizeable city with little existing movement presence
  const hq = (() => {
    for (let i = 0; i < 60; i++) {
      const c = CITIES[rng.int(0, Math.min(CITIES.length - 1, 1500))];
      if ((state.cities[c.id]?.followers ?? 0) / c.pop < 0.2) return c.id;
    }
    return CITIES[rng.int(0, 200)].id;
  })();
  const locs = [hq, ...neighbors(hq).slice(0, 3).map((n) => n.id)];
  const f: Faction = {
    id: nid(state, 'f'),
    kind: 'rival',
    name: `${seed.root}ism`,
    members: `${seed.root}ists`,
    founder: `${rng.pick(['Grand Overseer', 'High Facilitator', 'Lord Chancellor', 'Prime Instigator', 'Chief Herald'])} ${fictionalPerson(rng)}`,
    doctrineDifferences: [seed.custom],
    customs,
    color: rng.pick(RIVAL_COLORS),
    hqCityId: hq,
    locations: locs,
    followerCount: 0,
    growthRate: rng.range(0.8, 1.4) * MODES[state.movement.gameMode].rivalAggression,
    relationship: 'rival',
    disagreement: rng.int(50, 90),
    cohesion: rng.int(50, 90),
    createdAt: state.time,
    history: [],
  };
  let n = 0;
  for (const id of locs) {
    const cd = ensureCity(state, id);
    const c = city(id);
    const free = c.pop - cd.followers - othersTotal(cd);
    const add = Math.floor(Math.max(0, free) * rng.range(0.02, 0.06));
    cd.others[f.id] = add;
    n += add;
  }
  f.followerCount = n;
  state.factions[f.id] = f;
  state.counters.rivals = (state.counters.rivals ?? 0) + 1;
  return f;
}

export function createPrecedent(state: GameState, rng: Rng): Faction | null {
  const legacy = state.legacy?.[state.legacy.length - 1];
  if (!legacy) return null;
  const hq = CITIES[rng.int(0, 400)].id;
  const f: Faction = {
    id: nid(state, 'f'),
    kind: 'precedent',
    name: `The Ancient Order of ${legacy.ideologyName}`,
    members: `Ancient ${legacy.pluralFollowers}`,
    founder: `the legendary ${legacy.founderTitle}`,
    doctrineDifferences: legacy.doctrines.slice(0, 2),
    customs: legacy.doctrines.slice(0, 3),
    color: '#8a7f6a',
    hqCityId: hq,
    locations: [hq],
    followerCount: 0,
    growthRate: 0.5,
    relationship: 'neutral',
    disagreement: 30,
    cohesion: 90,
    createdAt: state.time,
    history: [],
  };
  const cd = ensureCity(state, hq);
  const add = Math.floor(city(hq).pop * 0.01);
  cd.others[f.id] = add;
  f.followerCount = add;
  state.factions[f.id] = f;
  return f;
}

export function liveFactions(state: GameState): Faction[] {
  return Object.values(state.factions).filter((f) => f.relationship !== 'dissolved' && f.relationship !== 'merged');
}

/** Return a faction's followers to the main movement (merge) or to the unconverted pool. */
export function releaseFaction(state: GameState, f: Faction, toMovement: boolean, share = 1) {
  let moved = 0;
  for (const id of f.locations) {
    const cd = state.cities[id];
    if (!cd) continue;
    const n = Math.floor((cd.others[f.id] ?? 0) * share);
    if (!n) continue;
    cd.others[f.id] -= n;
    if (toMovement) cd.followers += n;
    if (cd.others[f.id] <= 0) delete cd.others[f.id];
    moved += n;
  }
  return moved;
}

/** Stochastic rounding keeps populations as whole people without starving small flows. */
export function stoch(x: number, rng: Rng): number {
  const f = Math.floor(x);
  return f + (rng.next() < x - f ? 1 : 0);
}

/** Per-tick faction dynamics: defection, growth, competition, spread. */
export function factionTick(state: GameState, dt: number, rng: Rng) {
  const mode = MODES[state.movement.gameMode];
  for (const f of liveFactions(state)) {
    let total = 0;
    const hostile = f.relationship === 'rival' || f.relationship === 'hostile';
    for (const id of f.locations) {
      const cd = state.cities[id];
      if (!cd) continue;
      const c = city(id);
      let mine = cd.others[f.id] ?? 0;
      const free = Math.max(0, c.pop - cd.followers - othersTotal(cd));
      // growth from unconverted
      const g = BALANCE.rivalGrowthRate * f.growthRate * (f.kind === 'rival' ? 1 : 0.5) * (0.5 + f.cohesion / 100);
      let add = stoch(free * (1 - Math.exp(-g * dt * (f.kind === 'rival' ? 1 : 0.6))), rng);
      // defection of main followers into splinters / poaching by hostile rivals
      // defections stop once a faction holds a large local share (it has absorbed the willing)
      const shareCap = f.kind === 'splinter' ? 0.3 : 0.45;
      if (hostile && cd.followers > 0 && mine < shareCap * (cd.followers + mine)) {
        const pull =
          f.kind === 'splinter'
            ? 0.0001 * (f.disagreement / 50) * Math.max(0.1, 1.25 - state.cohesion / 100) * Math.sqrt(mode.splinterChance)
            : 0.00006 * f.growthRate * Math.max(0.2, 1.2 - state.enthusiasm / 100);
        const defect = Math.min(cd.followers, stoch(cd.followers * (1 - Math.exp(-pull * dt)), rng));
        cd.followers -= defect;
        add += defect;
        state.totals.defections += defect;
      }
      mine += add;
      cd.others[f.id] = mine;
      total += mine;
    }
    // fractional followers are fine internally; display rounds
    f.followerCount = total;
    // relationships evolve
    if (f.kind === 'splinter') {
      const target = 30 + state.drift * 0.4 - state.cohesion * 0.2;
      f.disagreement = clamp(f.disagreement + (target - f.disagreement) * 0.002 * dt);
    }
  }
}

/** Periodic structural changes: spread, dissolution, implosion. */
export function factionStructural(state: GameState, rng: Rng) {
  for (const f of liveFactions(state)) {
    // spread to a neighbor city
    const spreadChance = f.kind === 'rival' ? 0.35 * f.growthRate : f.relationship === 'rival' || f.relationship === 'hostile' ? 0.2 : 0.08;
    if (f.locations.length < 120 && rng.chance(spreadChance)) {
      const from = rng.pick(f.locations);
      const n = rng.pick(neighbors(from));
      if (n && !f.locations.includes(n.id)) {
        ensureCity(state, n.id);
        f.locations.push(n.id);
        state.cities[n.id].others[f.id] = state.cities[n.id].others[f.id] ?? 0;
      }
    }
    if (f.kind === 'rival') {
      f.cohesion = clamp(f.cohesion + rng.range(-2.5, 2));
    }
    // dissolution of tiny factions after a while
    if (state.time - f.createdAt > 600 && f.followerCount < 50) {
      releaseFaction(state, f, f.kind === 'splinter', 1);
      f.relationship = 'dissolved';
      addEvent(state, {
        defId: 'faction-dissolved', category: 'Rival movement activity', important: false,
        headline: `${f.name} Quietly Dissolves; Remaining Member Keeps the Banner`,
        body: `${f.name}, founded by ${f.founder}, has ceased operations. A final statement insisted that it had "made its point."`,
        refs: { factionId: f.id },
      });
    }
  }
}

export type FactionResponse = 'ignore' | 'negotiate' | 'alliance' | 'adopt' | 'clarify' | 'unity' | 'compete' | 'autonomy' | 'reunify';

export const FACTION_RESPONSES: { id: FactionResponse; label: string; desc: string; cost?: number; fundsCost?: number }[] = [
  { id: 'ignore', label: 'Ignore them', desc: 'Free. They may feel ignored (+disagreement).' },
  { id: 'negotiate', label: 'Negotiate', desc: 'Open talks. −disagreement. Costs 10 influence.', cost: 10 },
  { id: 'alliance', label: 'Form an alliance', desc: 'Their followers count toward your world total. +drift, −founder control.' },
  { id: 'adopt', label: 'Adopt part of their doctrine', desc: 'Large reconciliation, +drift. May anger the other wing.' },
  { id: 'clarify', label: 'Issue an official clarification', desc: '+cohesion. Clarifications have been known to cause further clarifications.' },
  { id: 'unity', label: 'Sponsor a unity convention', desc: 'Win back a share of members. Costs 30 influence.', cost: 30 },
  { id: 'compete', label: 'Compete publicly', desc: 'Conversion boost in their territory; raises disagreement and resistance.' },
  { id: 'autonomy', label: 'Grant regional autonomy', desc: 'They become an autonomous chapter (aligned). +drift, −control.' },
  { id: 'reunify', label: 'Attempt reunification', desc: 'Risky. Success merges them back. Costs 40 influence.', cost: 40 },
];

export function respondToFaction(state: GameState, fid: string, response: FactionResponse, rng: Rng): { ok: boolean; outcome: string } {
  const f = state.factions[fid];
  if (!f || f.relationship === 'dissolved' || f.relationship === 'merged') return { ok: false, outcome: 'That faction no longer exists.' };
  const def = FACTION_RESPONSES.find((r) => r.id === response)!;
  if (def.cost && state.influence < def.cost) return { ok: false, outcome: `Requires ${def.cost} influence.` };
  if (def.cost) state.influence -= def.cost;
  const mv = state.movement;
  const d = mv.doctrines.find((x) => x.id === f.doctrineId) ?? mv.doctrines[0];
  const ctx = makeCtx(state, { doctrine: d, faction: f });
  let outcome = '';
  const setRel = (r: FactionRelation) => (f.relationship = r);
  switch (response) {
    case 'ignore':
      f.disagreement = clamp(f.disagreement + 5);
      outcome = `${f.name} notes that it has been ignored and has released a 40-page statement about being ignored.`;
      break;
    case 'negotiate':
      setRel('negotiating');
      f.disagreement = clamp(f.disagreement - 15);
      outcome = `Talks open with ${f.founder}. Both sides agree that the snacks are acceptable. Disagreement eases.`;
      break;
    case 'alliance':
      if (f.disagreement > 60 && f.relationship !== 'negotiating') {
        f.disagreement = clamp(f.disagreement + 8);
        outcome = `${f.name} rejects the alliance as "premature" and "suspiciously friendly". Try negotiating first.`;
        break;
      }
      setRel('allied');
      state.drift = clamp(state.drift + 4);
      state.control = clamp(state.control - 5);
      outcome = `An alliance is signed. ${f.members} will march alongside ${mv.pluralFollowers}, slightly out of step.`;
      break;
    case 'adopt': {
      f.disagreement = clamp(f.disagreement - 40);
      state.cohesion = clamp(state.cohesion + 6);
      state.drift = clamp(state.drift + 8);
      const amended = `${d.currentText.replace(/\.$/, '')} (as broadened: ${f.doctrineDifferences[0].replace(/\.$/, '').toLowerCase()})`;
      d.currentText = amended;
      d.modificationHistory.push({ time: state.time, text: amended, reason: `Adopted from ${f.name}` });
      setRel('negotiating');
      outcome = `The official doctrine now acknowledges that ${f.doctrineDifferences[0].replace(/\.$/, '').toLowerCase()}.`;
      if (f.style === 'orthodox' || f.style === 'progressive') {
        if (rng.chance(0.45)) {
          const nf = createSplinter(state, rng, { doctrineId: d.id, style: f.style === 'orthodox' ? 'progressive' : 'orthodox', size: 0.03 });
          if (nf) outcome += ` Unfortunately, this has offended another wing, which now calls itself ${nf.name}.`;
        }
      }
      break;
    }
    case 'clarify': {
      state.cohesion = clamp(state.cohesion + 5);
      const good = rng.chance(0.55);
      f.disagreement = clamp(f.disagreement + (good ? -20 : 15));
      outcome = good
        ? `${mv.founderTitle} clarifies: “${fill('The official position on {plural} remains unchanged.', ctx)}” This is widely accepted.`
        : `${mv.founderTitle} clarifies the position. Confusion increases.`;
      if (rng.chance(0.35)) {
        const nf = createSplinter(state, rng, { doctrineId: d.id, style: 'radical', size: 0.02 });
        if (nf) outcome += ` The clarification has itself been interpreted, giving rise to ${nf.name}.`;
      }
      break;
    }
    case 'unity': {
      const share = rng.range(0.3, 0.6) * (1 - f.disagreement / 200);
      const moved = releaseFaction(state, f, true, share);
      state.cohesion = clamp(state.cohesion + 8);
      state.bureaucracy = clamp(state.bureaucracy + 3);
      f.disagreement = clamp(f.disagreement - 10);
      outcome = `The Unity ${mv.meetingSingular} is a success. ${Math.round(moved).toLocaleString()} members return, many carrying commemorative lanyards.`;
      break;
    }
    case 'compete':
      setRel('hostile');
      f.disagreement = clamp(f.disagreement + 15);
      state.boosts.push({ id: nid(state, 'b'), kind: 'conversion', mult: 1.25, until: state.time + 300, scope: city(f.hqCityId).cc, label: `Rivalry with ${f.name}` });
      for (const id of f.locations) if (state.cities[id]) state.cities[id].resistance = Math.min(0.95, state.cities[id].resistance + 0.04);
      outcome = `A public competition with ${f.name} begins. Recruitment surges in ${countryName(city(f.hqCityId).cc)}; so do tempers.`;
      break;
    case 'autonomy':
      setRel('autonomous');
      f.disagreement = 10;
      state.drift = clamp(state.drift + 10);
      state.control = clamp(state.control - 10);
      state.cohesion = clamp(state.cohesion + 5);
      outcome = `${f.name} becomes an autonomous chapter. They are technically still with you. Technically.`;
      break;
    case 'reunify': {
      const p = Math.min(0.9, 0.3 + (100 - f.disagreement) / 160 + state.cohesion / 300);
      if (rng.chance(p)) {
        const moved = releaseFaction(state, f, true, 1);
        setRel('merged');
        state.cohesion = clamp(state.cohesion + 10);
        outcome = `Reunification! ${Math.round(moved).toLocaleString()} ${f.members} rejoin ${mv.ideologyName}. Historians will describe this as inevitable.`;
      } else {
        setRel('hostile');
        f.disagreement = clamp(f.disagreement + 20);
        state.cohesion = clamp(state.cohesion - 5);
        outcome = `Reunification talks collapse over the seating chart. ${f.name} is now openly hostile.`;
      }
      break;
    }
  }
  const ev = addEvent(state, {
    defId: `faction-${response}`, category: 'Splinter formation', important: true,
    headline: `${mv.founderTitle} Responds to ${f.name}: ${def.label}`,
    body: outcome,
    cityId: f.hqCityId,
    refs: { factionId: f.id },
  });
  f.history.push(ev.id);
  if (response === 'reunify' || response === 'alliance' || response === 'autonomy') state.counters[`faction_${response}`] = (state.counters[`faction_${response}`] ?? 0) + 1;
  return { ok: true, outcome };
}
