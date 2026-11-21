// Weekly dispatch: the turn structure of THE MOVEMENT.
// Each week (the meeting day is the turn) you send your people to real towns. Where they go, the
// movement grows in their image: Priya's towns do it with soup, Gary's lying down, Dez's loudly with
// promises. Problems turn up where your people are, pinned to the map. Rivals hold real towns.
import { city, distanceKm } from '../engine/geo';
import { Rng } from '../engine/rng';
import { LIBRARY } from './library';
import {
  CARD_BY_ID, CHAR_BY_ID, advanceDays, centralBelief, charName, drawRandomCard, eligibleCards, enqueue, followers,
  requirementsMet, revealNext, rngOf,
} from './engine';
import { recordMemory } from './memory';
import { delegate, growAssemblies, lvl, needsYou, weeklyIncome } from './idle';
import type { CardDef, CardInstance, StoryState, WeekReport } from './types';

export const BRANCH = 25; // members that make a town one of ours on the map
const ORG = 'org:';

export interface Unit {
  id: string;
  label: string;
  emoji: string;
  charId?: string;
}

/** Everyone you can send somewhere this week. */
export function units(s: StoryState): Unit[] {
  const out: Unit[] = [];
  for (const [id, c] of Object.entries(s.chars)) {
    if (!c.present || c.status !== 'active') continue;
    const def = CHAR_BY_ID.get(id)!;
    out.push({ id, label: def.short, emoji: def.emoji, charId: id });
  }
  for (let i = 1; i <= s.organizersFree; i++) out.push({ id: `${ORG}${i}`, label: `Organizer ${i}`, emoji: '🧑‍🤝‍🧑' });
  return out;
}

/** Towns you can send people to: anywhere the movement has heard of. */
export function reachable(s: StoryState): number[] {
  return s.region.filter((id) => s.cities[id].known);
}

export function whereIs(s: StoryState, unit: string): number {
  const id = s.assign[unit];
  return id != null && s.cities[id]?.known ? id : s.hometown;
}

export function assignUnit(s: StoryState, unit: string, cityId: number, byHand = true) {
  if (!s.cities[cityId]?.known) return false;
  if (byHand) s.manual[unit] = true;
  if (cityId === s.hometown) delete s.assign[unit];
  else s.assign[unit] = cityId;
  return true;
}

export function isOurs(s: StoryState, id: number): boolean {
  const c = s.cities[id];
  return !c.rival && (id === s.hometown || c.milestone || c.followers >= BRANCH);
}

// ------------------------------------------------------------------ the rota

export const hasScheduler = (s: StoryState) => !!s.chars.bev?.present && s.chars.bev.status === 'active';

/** Who wants to go where this week. Without a scheduler, everyone follows their own nature. */
export function planWeek(s: StoryState, rng?: Rng) {
  const r = rng ?? rngOf(s);
  const known = reachable(s).filter((id) => id !== s.hometown && !s.cities[id].rival);
  const members = known.filter((id) => s.cities[id].followers > 0).sort((a, b) => s.cities[b].followers - s.cities[a].followers);
  const open = known.filter((id) => s.cities[id].followers === 0).sort((a, b) => distanceKm(city(s.hometown), city(a)) - distanceKm(city(s.hometown), city(b)));
  const taken = new Set<number>();
  const pick = (list: number[], spread = true) => {
    const free = spread ? list.filter((id) => !taken.has(id)) : list;
    const id = free[0] ?? list[0];
    if (id != null) taken.add(id);
    return id ?? s.hometown;
  };
  const scheduler = hasScheduler(s);
  const focus = scheduler ? s.focus ?? 'grow' : undefined;
  for (const u of units(s)) {
    if (s.manual[u.id]) continue;
    const id = u.charId;
    const c = id ? s.chars[id] : undefined;
    const def = id ? CHAR_BY_ID.get(id)! : undefined;
    let to = s.hometown;
    // people who need to go home, go home
    const homesick = def && ((def.travel < 0 && (s.away[u.id] ?? 0) >= 2) || (c && c.loyalty <= -25) || s.flags[`${id}_go_home`] != null);
    if (homesick || id === 'bev' || id === 'constance') to = s.hometown;
    else if (focus === 'rest') to = s.hometown;
    else if (focus === 'spread') to = id === 'gary' ? pick(members.slice(-3)) : pick(open.length ? open : members);
    else if (focus === 'grow') to = id === 'dez' || id === 'ophelia' ? pick(open.length && s.gauges.resources >= 12 ? open : members) : pick(members.length ? [...members].reverse() : open);
    else {
      // everyone does what they do
      switch (id) {
        case 'gary': to = r.chance(0.6) ? s.hometown : pick(members.slice(-2), false); break; // somewhere quiet, nearby
        case 'dez':
        case 'ophelia': to = open.length && s.gauges.resources >= 12 ? pick(open) : pick(members); break; // somewhere nobody has been
        case 'priya': to = pick(members); break; // wherever people are, there should be soup
        case 'martin': to = r.chance(0.4) ? s.hometown : pick(members); break; // the biggest party going
        case 'juniper':
        case 'rolf': to = pick([...known].sort((a, b) => city(b).pop - city(a).pop)); break; // bright lights, big towns
        case 'agnes': to = pick(members.filter((x) => s.cities[x].variant).concat(members)); break; // somewhere doing it wrong
        default: to = r.chance(0.5) ? pick(open.length ? open : members) : pick(members.length ? members : open);
      }
    }
    if (to == null || !s.cities[to]?.known) to = s.hometown;
    assignUnit(s, u.id, to, false);
  }
  s.planned = s.week;
  if (!rng) s.rng = r.state;
}

/** Problems on the map, by town. */
export function pins(s: StoryState): Map<number, CardInstance[]> {
  const m = new Map<number, CardInstance[]>();
  for (const i of s.inbox) {
    const id = i.city ?? s.hometown;
    m.set(id, [...(m.get(id) ?? []), i]);
  }
  return m;
}

// ------------------------------------------------------------------ local customs

const GENERIC_TWISTS = ['twice', 'in total silence', 'backwards', 'competitively', 'at dawn', 'in matching hats', 'outdoors, in all weathers', 'on the bus', 'very slowly', 'with a small bell'];

function nearestOthers(s: StoryState, id: number, n: number): number[] {
  const here = city(id);
  return s.region
    .filter((x) => x !== id && s.cities[x].known)
    .sort((a, b) => distanceKm(here, city(a)) - distanceKm(here, city(b)))
    .slice(0, n);
}

/** Every distinct local version of the central belief and the towns that hold it. */
export function variantTerritory(s: StoryState): Map<string, number[]> {
  const m = new Map<string, number[]>();
  for (const id of s.region) {
    const c = s.cities[id];
    if (c.variant && c.followers > 0) m.set(c.variant, [...(m.get(c.variant) ?? []), id]);
  }
  return m;
}

// ------------------------------------------------------------------ rivals

const RIVALS = {
  knitters: { name: 'the Knitting Circle', color: '#9b59b6' },
  north: { name: 'the Northern Fellowship', color: '#3d8fd8', leader: 'tobias' },
  original: { name: 'the Original Movement', color: '#c0392b', leader: 'agnes' },
  ophelia: { name: 'Ophelia’s Independent Branches', color: '#16a085', leader: 'ophelia' },
} as const;
type RivalId = keyof typeof RIVALS;

export function claim(s: StoryState, rival: RivalId, towns: number[]) {
  const def = RIVALS[rival];
  const r = (s.rivals[rival] ??= { id: rival, name: def.name, color: def.color, leader: 'leader' in def ? def.leader : undefined, towns: [], since: s.week });
  s.flags[`${rival}_rival_active`] = s.day;
  for (const id of towns) {
    if (rival === 'north') s.cities[id].bloc = 'north';
    s.cities[id].rival = rival;
    s.cities[id].known = true;
    s.cities[id].contest = 0;
    if (!r.towns.includes(id)) r.towns.push(id);
  }
}

function release(s: StoryState, id: number) {
  const r = s.rivals[s.cities[id].rival ?? ''];
  if (r) r.towns = r.towns.filter((x) => x !== id);
  delete s.cities[id].rival;
  s.cities[id].contest = 0;
}

/** The rivals arrive with the eras and the player's history, and they hold real towns. */
function spawnRivals(s: StoryState, out: WeekReport) {
  const busy = new Set(Object.values(s.assign));
  const free = (ids: number[]) => ids.filter((id) => id !== s.hometown && !s.cities[id].rival && !isOurs(s, id) && !busy.has(id) && s.cities[id].followers < 20);
  if ((s.flags.agnes_rival != null || s.flags.agnes_faction != null) && !s.rivals.original) {
    const towns = free(nearestOthers(s, s.hometown, 8)).slice(0, 2);
    if (towns.length) {
      claim(s, 'original', towns);
      out.lines.push({ icon: '🖋', text: `Agnes’s Original Movement has opened in ${towns.map((t) => city(t).name).join(' and ')}, with minutes.` });
    }
  }
  if ((s.flags.ophelia_rival != null || s.flags.ophelia_split != null) && !s.rivals.ophelia && s.chars.ophelia?.status === 'rival') {
    const towns = free(s.region.filter((id) => s.cities[id].known)).slice(-3);
    if (towns.length) {
      claim(s, 'ophelia', towns);
      out.lines.push({ icon: '🌱', text: `Ophelia’s Independent Branches have taken ${towns.map((t) => city(t).name).join(', ')}.` });
    }
  }
}

function rivalsMove(s: StoryState, rng: Rng, present: Set<number>, out: WeekReport) {
  // the North joins when Tobias does
  if (s.rivals.north && s.chars.tobias?.present) {
    for (const id of [...s.rivals.north.towns]) {
      release(s, id);
      s.cities[id].variant = CHAR_BY_ID.get('tobias')!.flavour;
      s.cities[id].variantBy = 'tobias';
    }
    delete s.rivals.north;
    delete s.flags.north_rival_active;
    s.flags.north_joined = s.day;
    out.lines.push({ icon: '🧭', text: 'The Northern Fellowship is now part of the movement. The North still does everything the northern way.' });
  }
  for (const r of Object.values(s.rivals)) {
    // your people in a rival town win it over, slowly
    for (const id of [...r.towns]) {
      const c = s.cities[id];
      if (present.has(id)) c.contest = (c.contest ?? 0) + 1;
      if ((c.contest ?? 0) >= 3 || c.followers / city(id).pop >= 0.05) {
        release(s, id);
        out.lines.push({ icon: '🏳️', text: `${city(id).name} is yours. ${cap(r.name)} ${r.id === 'knitters' ? 'left, taking the good chairs' : 'withdrew, with dignity and most of the biscuits'}.` });
        s.flags[`won_from_${r.id}`] = s.day;
      }
    }
    // and rivals push into towns you are not looking after
    const limit = 3 + ['founding', 'grassroots', 'regional', 'national', 'international', 'world'].indexOf(s.era) * 2;
    if (r.towns.length && r.towns.length < limit && rng.chance(0.22)) {
      const target = r.towns
        .flatMap((t) => nearestOthers(s, t, 3))
        .find((id) => id !== s.hometown && !s.cities[id].rival && !isOurs(s, id) && !present.has(id));
      if (target != null) {
        claim(s, r.id as RivalId, [target]);
        out.lines.push({ icon: '⚑', text: `${cap(r.name)} took ${city(target).name} while nobody was looking.` });
        s.flags[`lost_to_${r.id}`] = s.day;
      }
    }
    if (!r.towns.length) {
      delete s.rivals[r.id];
      delete s.flags[`${r.id}_rival_active`];
      out.lines.push({ icon: '🏳️', text: `${cap(r.name)} has no towns left.` });
    }
  }
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// ------------------------------------------------------------------ the week

/** End the week: your people do their work, the map changes, and new problems turn up where they are. */
export function endWeek(s: StoryState): WeekReport {
  // routine problems go to an administrator: the ones left from last week, or all of them once Agnes keeps
  // records or the weeks are running on their own
  const handled: WeekReport = { week: s.week, lines: [], joined: 0, lost: 0 };
  delegate(s, handled, lvl(s, 'records') > 0 || !!s.auto);
  if (s.flags.bev_rest != null) {
    s.focus = 'rest';
    delete s.flags.bev_rest;
    planWeek(s);
  }
  if (s.planned !== s.week) planWeek(s);
  const rng = rngOf(s);
  const out: WeekReport = { week: s.week, lines: [...handled.lines], joined: 0, lost: 0, gains: {} };
  const scheduler = hasScheduler(s);
  const resting = scheduler && s.focus === 'rest';
  if (resting) {
    s.gauges.attention = Math.max(4, s.gauges.attention - 8);
    s.gauges.unity = Math.min(96, s.gauges.unity + 3);
    out.lines.push({ icon: '🛋️', text: 'Bev gave everyone the week off. Nobody was in the papers. Several people were in the tub.' });
  }
  // opening a new town costs the petrol money
  for (const u of units(s)) {
    const at = whereIs(s, u.id);
    if ((u.charId === 'dez' || u.charId === 'ophelia') && at !== s.hometown && s.cities[at].followers === 0) {
      s.gauges.resources = Math.max(0, s.gauges.resources - 3);
      out.lines.push({ icon: u.emoji, text: `${u.label} spent the gas money getting to ${city(at).name}, where nobody has heard of ${s.movementName ?? 'us'}. Yet.` });
    }
  }

  // 1. problems nobody answered for a whole week get worse
  // (story moments and emergencies wait for you instead)
  const stale = s.inbox.filter((i) => (i.week ?? s.week) < s.week && !needsYou(CARD_BY_ID.get(i.cardId), i));
  for (const i of stale) {
    s.inbox = s.inbox.filter((x) => x !== i);
    const where = city(i.city ?? s.hometown).name;
    if (s.chars[i.speaker]?.present) {
      s.chars[i.speaker].loyalty = Math.max(-100, s.chars[i.speaker].loyalty - 5);
      recordMemory(s, { who: i.speaker, kind: 'ignored', topic: CARD_BY_ID.get(i.cardId)?.topic ?? i.cardId, cardId: i.cardId, choice: 0, quote: '(no answer)', setting: 'private', weight: 1 });
      out.lines.push({ icon: '🕳️', text: `${charName(s, i.speaker)} waited all week in ${where} for an answer, and has stopped waiting.` });
    } else {
      out.lines.push({ icon: '🕳️', text: `Nobody answered the problem in ${where}. It sorted itself out, badly.` });
    }
    const c = s.cities[i.city ?? s.hometown];
    if (c) c.reputation = Math.max(-1, c.reputation - 0.05);
  }

  // 2. your people go where you sent them
  const present = new Set<number>();
  for (const id of s.region) s.cities[id].organizers = 0;
  for (const u of units(s)) {
    const at = whereIs(s, u.id);
    const weight = u.charId ? 1 + CHAR_BY_ID.get(u.charId)!.competence / 100 : 1;
    if (at !== s.hometown || u.charId) s.cities[at].organizers += at === s.hometown ? weight * 0.4 : weight;
    if (at !== s.hometown) present.add(at);
  }
  const before = Object.fromEntries(s.region.map((id) => [id, s.cities[id].followers]));
  const rivalBefore = new Set(s.region.filter((id) => s.cities[id].rival));

  // 3. a week passes
  advanceDays(s, 7);
  for (const id of s.region) s.cities[id].organizers = 0;

  // rivals blunt your growth in their towns, unless your people are there
  for (const id of rivalBefore) {
    const c = s.cities[id];
    const gain = c.followers - before[id];
    if (gain > 0 && !present.has(id)) c.followers -= Math.floor(gain * 0.6);
  }
  for (const id of s.region) {
    const d = s.cities[id].followers - (before[id] ?? 0);
    if (d > 0) {
      out.joined += d;
      out.gains![id] = d;
    } else out.lost -= d;
  }
  // who has been away, and who came home
  for (const u of units(s)) {
    const at = whereIs(s, u.id);
    if (at === s.hometown) {
      if ((s.away[u.id] ?? 0) >= 2 && u.charId) out.lines.push({ icon: '🏠', text: `${u.label} is home, and very pleased about it.` });
      s.away[u.id] = 0;
    } else s.away[u.id] = (s.away[u.id] ?? 0) + 1;
    if (u.charId) delete s.flags[`${u.charId}_go_home`];
  }

  // 4. what each person did
  const belief = centralBelief(s);
  const byTown = new Map<number, string[]>();
  for (const u of units(s)) {
    const at = whereIs(s, u.id);
    if (at !== s.hometown) byTown.set(at, [...(byTown.get(at) ?? []), u.charId ? CHAR_BY_ID.get(u.charId)!.short : 'an organizer']);
  }
  for (const [at, who] of byTown) {
    const gained = Math.max(0, s.cities[at].followers - (before[at] ?? 0));
    const names = who.length > 1 ? `${who.slice(0, -1).join(', ')} and ${who[who.length - 1]}` : who[0];
    const icon = units(s).find((u) => u.charId && whereIs(s, u.id) === at)?.emoji ?? '🧑‍🤝‍🧑';
    out.lines.push({ icon, text: `${cap(names)} spent the week in ${city(at).name}: ${gained ? `+${gained.toLocaleString('en-US')} members` : 'nobody new, but a lot of conversations'}${s.cities[at].rival ? `, on ${s.rivals[s.cities[at].rival!]?.name ?? 'rival'} turf` : ''}.` });
  }
  const changed = new Set<number>();
  for (const u of units(s)) {
    if (!u.charId) continue;
    const at = whereIs(s, u.id);
    if (at === s.hometown) continue;
    const def = CHAR_BY_ID.get(u.charId)!;
    // how they feel about being away
    const c = s.chars[u.charId];
    c.loyalty = Math.max(-100, Math.min(100, c.loyalty + def.travel));
    if (def.travel < 0 && (s.away[u.id] ?? 0) >= 1) out.lines.push({ icon: '🏠', text: `${def.short} misses home, and will be going back next week.` });
    // the movement in that town starts to look like them
    const redundant = belief && [belief.noun, belief.root].some((w) => w && def.flavour.toLowerCase().includes(w.toLowerCase()));
    if (belief && !redundant && !changed.has(at) && s.cities[at].followers > 0 && s.cities[at].variantBy !== u.charId && rng.chance(0.45)) {
      changed.add(at);
      s.cities[at].variant = def.flavour;
      s.cities[at].variantBy = u.charId;
      out.lines.push({ icon: '✨', text: `In ${city(at).name}, ${belief.phrase} is now done ${def.flavour}.` });
    }
  }
  // customs drift on their own, and spread to the next town along
  if (belief) {
    for (const id of s.region) {
      const c = s.cities[id];
      if (id === s.hometown || c.followers < 40) continue;
      if (!c.variant && rng.chance(0.05)) {
        c.variant = rng.pick(GENERIC_TWISTS);
        c.variantBy = undefined;
        out.lines.push({ icon: '✨', text: `Nobody knows why, but in ${city(id).name} they now do ${belief.phrase} ${c.variant}.` });
      } else if (c.variant && rng.chance(0.12)) {
        const next = nearestOthers(s, id, 3).find(
          (x) => x !== s.hometown && s.cities[x].followers > 0 && s.cities[x].variant !== c.variant && !s.cities[x].rival && (!s.cities[x].variant || c.followers > s.cities[x].followers * 2),
        );
        if (next != null && !present.has(next)) {
          s.cities[next].variant = c.variant;
          s.cities[next].variantBy = c.variantBy;
          if (rng.chance(0.5)) out.lines.push({ icon: '↪', text: `${city(next).name} has picked up ${city(id).name}’s habit of doing ${belief.phrase} ${c.variant}.` });
        }
      }
    }
  }

  // the assemblies get on with it, and the dues come in
  growAssemblies(s, rng, out);
  const income = weeklyIncome(s, followers(s));
  s.money = (s.money ?? 0) + income;
  out.income = income;

  // 5. territory
  spawnRivals(s, out);
  rivalsMove(s, rng, present, out);
  for (const id of present) if (!s.cities[id].known) s.cities[id].known = true;
  if (present.size && rng.chance(0.5)) revealNext(s, 1, true);

  // 6. next week's problems turn up where your people are
  s.week++;
  s.manual = {};
  if (resting) s.focus = 'grow'; // a week off is a week off
  planWeek(s, rng);
  const newOnes: CardInstance[] = [];
  const road = units(s).filter((u) => u.charId && whereIs(s, u.id) !== s.hometown);
  let roadCount = 0;
  for (const u of rng.shuffle([...road])) {
    if (roadCount >= 2 || resting) break;
    if (!rng.chance(s.era === 'founding' ? 0.2 : 0.35)) continue;
    const inst = drawRoad(s, rng, u.charId!, whereIs(s, u.id));
    if (inst) {
      newOnes.push(inst);
      roadCount++;
    }
  }
  const clash = territoryCard(s, rng);
  if (clash) newOnes.push(clash);
  const general = 3 - (roadCount >= 2 ? 1 : 0);
  for (let k = 0; k < general && s.inbox.length < 8; k++) {
    const inst = drawRandomCard(s, rng);
    if (inst) newOnes.push(inst);
  }
  // follow-ups delivered during the week, and anything else new, get pinned too
  pinAll(s);
  s.lastWeek = out;
  s.rng = rng.state;
  return out;
}

/** Put every unplaced problem on the map: where it happens, or wherever the person raising it is this week. */
export function pinAll(s: StoryState) {
  for (const i of s.inbox) {
    if (i.week == null) i.week = s.week;
    if (i.city != null) continue;
    const placeKey = Object.keys(i.ctx).find((k) => (k === 'city' || k.endsWith('City')) && s.cities[Number(i.ctx[k])]);
    if (placeKey) i.city = Number(i.ctx[placeKey]);
    else if (s.chars[i.speaker]?.present) i.city = whereIs(s, i.speaker);
    else i.city = s.hometown;
  }
}

/** A problem caused by one of your people, in the town where you sent them. */
function drawRoad(s: StoryState, rng: Rng, charId: string, at: number): CardInstance | null {
  const pool = LIBRARY.cards.filter((c) => c.road && (c.speaker === charId || c.speaker === 'dispatched') && roadEligible(s, c));
  for (let tries = 0; tries < 4 && pool.length; tries++) {
    const card = rng.weighted(pool, (c) => (c.weight ?? 1) * (c.speaker === charId ? 2 : 1))!;
    const inst = enqueue(s, card.id, rng, { city: String(at) }, charId);
    if (inst) {
      inst.city = at;
      inst.week = s.week;
      return inst;
    }
    pool.splice(pool.indexOf(card), 1);
  }
  return null;
}

function roadEligible(s: StoryState, c: CardDef): boolean {
  if (s.inbox.some((i) => i.cardId === c.id)) return false;
  if (c.once && s.lastSeen[c.id] != null) return false;
  if (s.lastSeen[c.id] != null && s.day - s.lastSeen[c.id] < (c.cooldown ?? 30)) return false;
  return requirementsMet(s, c.requires);
}

/** When two local versions of the belief each hold ground, they quarrel. */
function territoryCard(s: StoryState, rng: Rng): CardInstance | null {
  const belief = centralBelief(s);
  if (!belief) return null;
  const t = [...variantTerritory(s).entries()].filter(([, towns]) => towns.length >= 2);
  if (t.length < 2 || !rng.chance(0.5)) return null;
  const [[va, ta], [vb, tb]] = rng.shuffle(t).slice(0, 2);
  const card = CARD_BY_ID.get('terr.variant_clash');
  if (!card || !roadEligible(s, card)) return null;
  const inst = enqueue(s, 'terr.variant_clash', rng, { aCity: String(ta[0]), bCity: String(tb[0]), variantA: va, variantB: vb, city: String(ta[0]) });
  if (inst) {
    inst.city = ta[0];
    inst.week = s.week;
  }
  return inst;
}

/** Make one local version official everywhere (used by the clash card). */
export function makeOfficial(s: StoryState, variant: string) {
  for (const id of s.region) if (s.cities[id].followers > 0) s.cities[id].variant = variant;
  s.cities[s.hometown].variant = variant;
}

export function eligibleThisWeek(s: StoryState): number {
  return eligibleCards(s).length;
}

export { followers };
