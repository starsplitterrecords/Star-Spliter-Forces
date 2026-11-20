// Card Edition engine: pure, seeded and serializable. The UI only calls drawCard/choose/nextLeader.
import { FIRST_NAMES, LAST_NAMES } from '../content/presets';
import { CITIES, CITY_BY_ID, COUNTRY_BY_CODE, WORLD_POPULATION, city, countryName, distanceKm } from '../engine/geo';
import { Rng } from '../engine/rng';
import { fill } from '../engine/text';
import type { CardGame, Ctx, Delta, DrawnCard, Leader, MeterKey, Meters, Outcome } from './types';
import { METERS } from './types';

export const CARD_SAVE_VERSION = 1;

export const TUNING = {
  baseGrowth: 0.05, // per month at Reach 50
  victoryShare: 0.95,
  defaultCooldown: 30,
  tenureMin: 70,
  tenureSpread: 40,
  successorMeterPull: 0.35, // successors inherit 35% of the predecessor's deviation from 50
};

// ------------------------------------------------------------ card definitions

export interface ChoiceDef {
  label: string | ((g: CardGame, ctx: Ctx) => string);
  delta: Delta | ((g: CardGame, ctx: Ctx) => Delta);
  apply?: (g: CardGame, ctx: Ctx, rng: Rng) => void;
  then?: { id: string; in: number; chance?: number };
  log?: string | ((g: CardGame, ctx: Ctx) => string);
  news?: string | ((g: CardGame, ctx: Ctx) => string);
}

export interface CardDef {
  id: string;
  who: string | ((g: CardGame, ctx: Ctx) => string);
  when?: (g: CardGame) => boolean;
  weight?: number | ((g: CardGame) => number);
  cooldown?: number;
  once?: boolean;
  /** Pick the specifics (doctrine, city, options) at draw time; null = not drawable now. */
  prepare?: (g: CardGame, rng: Rng) => Ctx | null;
  text: string | ((g: CardGame, ctx: Ctx) => string);
  left: ChoiceDef;
  right: ChoiceDef;
}

let DECK: CardDef[] = [];
let DECK_BY_ID: Record<string, CardDef> = {};
export function registerDeck(cards: CardDef[]) {
  DECK = cards;
  DECK_BY_ID = Object.fromEntries(cards.map((c) => [c.id, c]));
}
export function deck() {
  return DECK;
}

// ------------------------------------------------------------ text

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const tc = (s: string) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());

export function textCtx(g: CardGame, ctx: Ctx): Record<string, string> {
  const mv = g.movement;
  const out: Record<string, string> = {
    F: mv.plural,
    f: mv.singular,
    Ism: mv.ideologyName,
    Adj: mv.adjective,
    Title: g.leader.title,
    leader: g.leader.name,
    Meeting: mv.meeting,
    meeting: mv.meeting.toLowerCase(),
    MeetingS: mv.meetingSingular,
    meetingS: mv.meetingSingular.toLowerCase(),
    outpost: mv.outpost.toLowerCase(),
    Outpost: mv.outpost,
    animal: mv.animal.toLowerCase(),
    Animal: mv.animal,
    hq: mv.hqType.toLowerCase(),
    hqCity: city(g.hqCityId).name,
  };
  const dId = ctx.doctrine as string | undefined;
  const d = dId ? mv.doctrines.find((x) => x.id === dId) : mv.doctrines[0];
  if (d) {
    const m = d.motif;
    Object.assign(out, {
      noun: m.noun, Noun: tc(m.noun), plural: m.plural, Plural: tc(m.plural), verb: m.verb, heresy: m.heresy, Heresy: cap(m.heresy),
      purism: m.purism, Purism: cap(m.purism), radical: m.radical, industry: m.industry, Industry: tc(m.industry), shortage: m.shortage,
      Shortage: tc(m.shortage), measure: m.measure, Measure: tc(m.measure), committee: m.committee, day: m.dayName ?? `International ${tc(m.noun)} Day`,
      original: d.originalText, doctrine: d.currentText, showcase: m.showcase,
    });
  }
  if (ctx.city != null) {
    const c = CITY_BY_ID.get(Number(ctx.city));
    if (c) {
      out.city = c.name;
      out.country = countryName(c.cc);
    }
  }
  for (const [k, v] of Object.entries(ctx)) if (!(k in out)) out[k] = String(v);
  return out;
}

export function render(g: CardGame, s: string | ((g: CardGame, ctx: Ctx) => string), ctx: Ctx): string {
  const raw = typeof s === 'function' ? s(g, ctx) : s;
  return fill(raw, textCtx(g, ctx));
}

// ------------------------------------------------------------ world

const orderCache = new Map<number, { ids: number[]; cum: number[] }>();
export function cityOrder(hqId: number) {
  let o = orderCache.get(hqId);
  if (!o) {
    const hq = city(hqId);
    const sorted = [...CITIES].sort((a, b) => distanceKm(hq, a) - distanceKm(hq, b));
    const cum: number[] = [];
    let s = 0;
    for (const c of sorted) {
      s += c.pop;
      cum.push(s);
    }
    o = { ids: sorted.map((c) => c.id), cum };
    orderCache.set(hqId, o);
  }
  return o;
}

export function worldShare(g: CardGame) {
  return g.converted / WORLD_POPULATION;
}

/** Number of cities (in order of distance from HQ) the movement now holds. */
function updateCities(g: CardGame) {
  const o = cityOrder(g.hqCityId);
  const target = g.converted * 0.5;
  let n = g.cityCount;
  while (n < o.ids.length && o.cum[n] <= target) n++;
  for (let i = g.cityCount; i < n; i++) {
    const cc = city(o.ids[i]).cc;
    if (!g.countries.includes(cc)) {
      g.countries.push(cc);
      if (g.countries.length > 1 && g.countries.length <= 40) {
        g.chronicle.push({ turn: g.turn, text: `The movement crossed into ${countryName(cc)}, beginning in ${city(o.ids[i]).name}.` });
        // at most one pending announcement, and not more often than every few months
        if (!g.queue.some((q) => q.defId === 'new-country') && g.turn - (g.lastSeen['new-country'] ?? -99) >= 6) g.queue.push({ defId: 'new-country', at: g.turn + 1, ctx: { city: o.ids[i] } });
      }
    }
  }
  if (n > g.cityCount && g.cityCount < 1 && n >= 1) g.chronicle.push({ turn: g.turn, text: `${city(o.ids[0]).name} became the first city to hear the message in earnest.` });
  g.cityCount = n;
}

export function convertedCities(g: CardGame): number[] {
  return cityOrder(g.hqCityId).ids.slice(0, g.cityCount);
}

export function frontierCity(g: CardGame, offset = 0): number {
  const o = cityOrder(g.hqCityId);
  return o.ids[Math.min(o.ids.length - 1, g.cityCount + offset)];
}

function grow(g: CardGame) {
  if (!g.movement.founded) {
    g.converted += Math.round(g.meters.reach / 25);
    return;
  }
  const share = worldShare(g);
  const reachF = Math.pow(Math.max(0.05, g.meters.reach / 50), 1.4);
  const fervF = 0.7 + g.meters.fervor / 170;
  const standF = 0.75 + (g.meters.standing / 100) * (0.3 + share);
  const hostile = g.factions.filter((f) => f.hostile).length;
  const r = TUNING.baseGrowth * reachF * fervF * standF * Math.max(0.6, 1 - hostile * 0.05);
  const add = r * g.converted * (1 - share) + 3 + g.meters.reach / 8;
  g.converted = Math.min(WORLD_POPULATION, Math.round(g.converted + add));
  updateCities(g);
}

// ------------------------------------------------------------ lifecycle

const clamp = (v: number) => Math.max(0, Math.min(100, v));

function rngOf(g: CardGame) {
  return new Rng(g.rng);
}

export function leaderTitle(titleWord: string, name: string) {
  return titleWord === 'The Magnificent' ? `${name.split(' ')[0]} the Magnificent` : `${titleWord} ${name.charAt(0).toUpperCase()}`;
}

export function newCardGame(founderName: string, seed: number, now = Date.now()): CardGame {
  const rng = new Rng(seed);
  // headquarters: a mid-sized city somewhere in the world
  const pool = CITIES.filter((c) => c.pop > 120_000 && c.pop < 2_500_000);
  const hq = pool[rng.int(0, pool.length - 1)];
  const name = founderName.trim() || 'Founder';
  const g: CardGame = {
    version: CARD_SAVE_VERSION,
    seed,
    rng: 0,
    turn: 0,
    meters: { reach: 50, fervor: 50, coffers: 50, standing: 50 },
    leader: { name, title: name, startTurn: 0 },
    leaders: [],
    founderName: name,
    movement: {
      root: '',
      ideologyName: 'your idea',
      singular: 'believer',
      plural: 'believers',
      adjective: 'enlightened',
      titleWord: 'Master',
      meeting: 'Meetings',
      meetingSingular: 'Meeting',
      outpost: 'Branch Offices',
      hqType: 'kitchen table',
      animal: 'nobody in particular',
      banner: { primary: '#6b3fa0', secondary: '#d4a72c', accent: '#f4eedf', symbol: 'animal', shape: 'shield', pattern: 'stripe' },
      doctrines: [],
      founded: false,
    },
    flags: { tenure: TUNING.tenureMin + rng.int(0, TUNING.tenureSpread) },
    lastSeen: {},
    queue: ['found-idea', 'found-title', 'found-hq', 'found-first', 'found-meeting', 'found-animal', 'found-banner'].map((defId, i) => ({ defId, at: i })),
    converted: 1,
    hqCityId: hq.id,
    cityCount: 0,
    countries: [hq.cc],
    factions: [],
    chronicle: [],
    news: [],
    current: null,
    over: null,
    createdAt: now,
  };
  g.rng = rng.state;
  drawCard(g);
  return g;
}

function weightOf(c: CardDef, g: CardGame) {
  return typeof c.weight === 'function' ? c.weight(g) : (c.weight ?? 1);
}

function materialize(g: CardGame, def: CardDef, ctx: Ctx): DrawnCard {
  const side = (ch: ChoiceDef) => ({
    label: render(g, ch.label, ctx),
    delta: typeof ch.delta === 'function' ? ch.delta(g, ctx) : ch.delta,
  });
  return {
    defId: def.id,
    who: typeof def.who === 'function' ? def.who(g, ctx) : def.who,
    text: render(g, def.text, ctx),
    left: side(def.left),
    right: side(def.right),
    ctx,
  };
}

export function drawCard(g: CardGame): DrawnCard | null {
  if (g.over) return null;
  const rng = rngOf(g);
  let drawn: DrawnCard | null = null;
  // queued follow-ups first
  const dueIdx = g.queue.findIndex((q) => q.at <= g.turn && DECK_BY_ID[q.defId]);
  if (dueIdx >= 0) {
    const q = g.queue.splice(dueIdx, 1)[0];
    const def = DECK_BY_ID[q.defId];
    const ctx = { ...(def.prepare?.(g, rng) ?? {}), ...(q.ctx ?? {}) };
    drawn = materialize(g, def, ctx);
  }
  if (!drawn && g.flags.tenure != null && g.turn - g.leader.startTurn >= g.flags.tenure && DECK_BY_ID['retire']) {
    g.flags.tenure = g.turn - g.leader.startTurn + 18;
    drawn = materialize(g, DECK_BY_ID['retire'], {});
  }
  for (let attempt = 0; !drawn && attempt < 8; attempt++) {
    const lastWho = g.current?.who;
    const eligible = DECK.filter((c) => {
      if (c.id.startsWith('found-') || c.id === 'retire') return false;
      if (c.once && g.lastSeen[c.id] != null) return false;
      const cd = c.cooldown ?? TUNING.defaultCooldown;
      if (g.lastSeen[c.id] != null && g.turn - g.lastSeen[c.id] < cd) return false;
      return !c.when || c.when(g);
    });
    const def = rng.weighted(eligible, (c) => weightOf(c, g) * ((typeof c.who === 'string' ? c.who : '') === lastWho ? 0.2 : 1));
    if (!def) break;
    const ctx = def.prepare ? def.prepare(g, rng) : {};
    if (ctx === null) {
      g.lastSeen[def.id] = g.turn; // not drawable now; rest it briefly
      continue;
    }
    drawn = materialize(g, def, ctx);
  }
  if (!drawn) {
    // everything is resting: take the longest-rested drawable card, ignoring cooldowns
    const fallback = DECK.filter((c) => !c.id.startsWith('found-') && c.id !== 'retire' && !(c.once && g.lastSeen[c.id] != null) && (!c.when || c.when(g)))
      .sort((a, b) => (g.lastSeen[a.id] ?? -1) - (g.lastSeen[b.id] ?? -1));
    for (const def of fallback) {
      const ctx = def.prepare ? def.prepare(g, rng) : {};
      if (ctx) {
        drawn = materialize(g, def, ctx);
        break;
      }
    }
  }
  g.rng = rng.state;
  g.current = drawn;
  if (drawn) g.lastSeen[drawn.defId] = g.turn;
  return drawn;
}

export interface ChoiceResult {
  delta: Delta;
  ended: Outcome | null;
  log?: string;
}

export function choose(g: CardGame, side: 'left' | 'right'): ChoiceResult | null {
  const card = g.current;
  if (!card || g.over) return null;
  const def = DECK_BY_ID[card.defId];
  if (!def) return null;
  const ch = def[side];
  const rng = rngOf(g);
  const delta = card[side].delta;
  for (const k of METERS) if (delta[k]) g.meters[k] = clamp(g.meters[k] + delta[k]!);
  ch.apply?.(g, card.ctx, rng);
  let log: string | undefined;
  if (ch.log) {
    log = render(g, ch.log, card.ctx);
    g.chronicle.push({ turn: g.turn, text: log });
  }
  if (ch.news) {
    g.news.push({ turn: g.turn, headline: render(g, ch.news, card.ctx) });
    if (g.news.length > 120) g.news.shift();
  }
  if (ch.then && (ch.then.chance == null || rng.chance(ch.then.chance))) g.queue.push({ defId: ch.then.id, at: g.turn + ch.then.in, ctx: card.ctx });
  g.turn += 1;
  grow(g);
  g.rng = rng.state;
  let ended = checkEnd(g, delta);
  if (!ended && worldShare(g) >= TUNING.victoryShare && g.victoryAt == null) ended = victory(g);
  if (ended) {
    g.over = ended;
    g.current = null;
  } else drawCard(g);
  return { delta, ended, log };
}

// ------------------------------------------------------------ endings

export interface EndingDef {
  id: string;
  meter?: MeterKey;
  high?: boolean;
  title: string;
  text: string;
  loss: number;
}

let ENDINGS: EndingDef[] = [];
export function registerEndings(e: EndingDef[]) {
  ENDINGS = e;
}

function checkEnd(g: CardGame, delta: Delta): Outcome | null {
  if (g.flags.forceEnd) {
    const id = String(Object.keys(g.flags).find((k) => k.startsWith('end:'))?.slice(4) ?? 'retired');
    delete g.flags.forceEnd;
    for (const k of Object.keys(g.flags)) if (k.startsWith('end:')) delete g.flags[k];
    return leaderEnding(g, ENDINGS.find((e) => e.id === id)!);
  }
  // the meter that moved furthest past the edge decides the ending
  let hit: { k: MeterKey; high: boolean } | null = null;
  for (const k of METERS) {
    if (g.meters[k] <= 0 || g.meters[k] >= 100) {
      if (!hit || Math.abs(delta[k] ?? 0) > Math.abs(delta[hit.k] ?? 0)) hit = { k, high: g.meters[k] >= 100 };
    }
  }
  if (!hit) return null;
  const e = ENDINGS.find((x) => x.meter === hit!.k && x.high === hit!.high)!;
  return leaderEnding(g, e);
}

function leaderEnding(g: CardGame, e: EndingDef): Outcome {
  const lost = Math.round(g.converted * e.loss);
  g.converted = Math.max(1, g.converted - lost);
  g.leader.endTurn = g.turn;
  g.leader.ending = e.id;
  g.leader.endingTitle = e.title;
  const text = render(g, e.text, { doctrine: g.movement.doctrines[0]?.id ?? '', months: g.turn - g.leader.startTurn, years: Math.max(1, Math.round((g.turn - g.leader.startTurn) / 12)) });
  g.chronicle.push({ turn: g.turn, text: `${g.leader.title}'s leadership ended: ${e.title}.` });
  return { kind: 'leader', id: e.id, title: e.title, text, lostFollowers: lost };
}

function victory(g: CardGame): Outcome {
  g.victoryAt = g.turn;
  const changed = g.movement.doctrines.filter((d) => d.currentText !== d.originalText).length;
  const hostile = g.factions.filter((f) => f.hostile).length;
  const n = g.leaders.length + 1;
  const balance = 50 - METERS.reduce((a, k) => a + Math.abs(g.meters[k] - 50), 0) / 4; // 0..50
  const scores: [string, string, number][] = [
    ['schism', 'The Great Schism', hostile * 3],
    ['drift', 'The Founder Would Not Recognize It', changed * 1.4],
    ['dynasty', 'The Long Succession', (n - 1) * 1.2],
    ['committee', 'The Eternal Committee', (g.flags.committees ?? 0) * 1.2],
    ['founder', 'The Founder’s Triumph', n === 1 ? 9 : 0],
    ['utopia', 'The Accidental Utopia', 2 + balance / 8],
  ];
  const [id, title] = scores.sort((a, b) => b[2] - a[2])[0];
  const docs = g.movement.doctrines.slice(0, 3).map((d) => `“${d.originalText}”`).join(', ');
  const text = [
    `${Math.round(worldShare(g) * 100)}% of humanity now belongs to ${g.movement.ideologyName}.`,
    `It began ${Math.round(g.turn / 12)} years ago at a ${g.movement.hqType.toLowerCase()} in ${city(g.hqCityId).name}, when ${g.founderName} decided ${docs || 'something'}.`,
    `${n} leader${n === 1 ? '' : 's'} ${n === 1 ? 'has' : 'have'} led the ${g.movement.plural} since then. ${g.leaders.map((l) => `${l.title} (${l.endingTitle})`).slice(0, 6).join('; ')}${g.leaders.length ? '.' : ''}`,
    changed ? `The doctrine has been amended ${changed} time${changed === 1 ? '' : 's'}; the current text of the first one reads “${g.movement.doctrines[0].currentText}”.` : 'Remarkably, the doctrine reads exactly as it did on the first day.',
    hostile ? `${hostile} breakaway movement${hostile === 1 ? '' : 's'} still claim${hostile === 1 ? 's' : ''} to be the true ${g.movement.plural}.` : '',
    `${title}. Muahahaha.`,
  ].filter(Boolean);
  g.chronicle.push({ turn: g.turn, text: `World domination: ${title}.` });
  return { kind: 'victory', id, title, text: text.join('\n\n'), lostFollowers: 0 };
}

/** After a leader falls, the movement continues under a successor. */
export function nextLeader(g: CardGame): void {
  if (!g.over) return;
  const rng = rngOf(g);
  if (g.over.kind === 'victory') {
    g.over = null; // sandbox: keep going
    drawCard(g);
    return;
  }
  g.leaders.push(g.leader);
  const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
  g.leader = { name, title: leaderTitle(g.movement.titleWord, name), startTurn: g.turn };
  for (const k of METERS) g.meters[k] = Math.round(50 + (g.meters[k] - 50) * TUNING.successorMeterPull);
  for (const k of METERS) g.meters[k] = Math.max(25, Math.min(75, g.meters[k]));
  g.flags.tenure = TUNING.tenureMin + rng.int(0, TUNING.tenureSpread);
  g.over = null;
  g.rng = rng.state;
  g.queue.unshift({ defId: 'succession', at: g.turn });
  drawCard(g);
}

// ------------------------------------------------------------ persistence

export function serializeCards(g: CardGame): string {
  return JSON.stringify({ format: 'the-movement-cards', version: CARD_SAVE_VERSION, game: g });
}

export function loadCards(json: string): CardGame {
  const p = JSON.parse(json);
  const g = (p?.format === 'the-movement-cards' ? p.game : p) as CardGame;
  if (!g || typeof g !== 'object' || !g.meters || !g.movement || !g.leader) throw new Error('Not a Card Edition save.');
  for (const k of METERS) g.meters[k] = clamp(Number(g.meters[k]) || 50);
  g.converted = Math.max(1, Math.min(WORLD_POPULATION, Number(g.converted) || 1));
  g.queue ??= [];
  g.factions ??= [];
  g.news ??= [];
  return g;
}

export { COUNTRY_BY_CODE, WORLD_POPULATION };
export type { Meters, Leader };
