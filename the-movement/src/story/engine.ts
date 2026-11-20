// THE MOVEMENT v2 story engine: deterministic, offline, data-driven.
// People (characters + member groups + general population) are the simulation;
// authored cards are selected from the content library according to that state.
import { FIRST_NAMES, LAST_NAMES } from '../content/presets';
import { CITIES, city, distanceKm } from '../engine/geo';
import { moderate } from '../engine/ideology';
import { Rng } from '../engine/rng';
import { LIBRARY } from './library';
import { agoText, findMemories, meetingNumber, recordMemory, salience, whereText, witnessed } from './memory';
import {
  AGENDAS,
  type AwayReport,
  type CardDef,
  type CardInstance,
  type CharState,
  type ChoiceOutcome,
  type Cmp,
  type CustomStatus,
  type Effects,
  type Era,
  type MemoryKind,
  type RecallQuery,
  type ScheduledCard,
  type Setting,
  type Stance,
  ERAS,
  GAUGES,
  type Gauge,
  type Group,
  GROUPS,
  type Requires,
  type Stat,
  STATUS_ORDER,
  type StoryState,
} from './types';

export const STORY_VERSION = 1;

export const TIME = {
  realSecondsPerDay: 120, // while the game is open, one game day passes every two minutes
  offlineCapDays: 14, // bounded offline progress (about 28 hours away)
  inboxMax: 5,
  cardsPerDay: { founding: 2.4, grassroots: 1.5, regional: 1.1, national: 1, international: 1, world: 1 } as Record<Era, number>,
  crisisWindowDays: 14,
  crisisWindowDecisions: 15,
  regionRadiusKm: 260,
  regionalFollowers: 1500, // the grassroots closing card unlocks here (or two towns at 85%)
  nationalFollowers: 20000, // the regional closing card unlocks here (or four towns at 85%)
  regionalRadiusKm: 650,
  regionalMaxCities: 110,
  regionMaxCities: 40,
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const CARD_BY_ID = new Map(LIBRARY.cards.map((c) => [c.id, c]));
export const CHAR_BY_ID = new Map(LIBRARY.characters.map((c) => [c.id, c]));
export const CUSTOM_BY_ID = new Map(LIBRARY.customs.map((c) => [c.id, c]));
const STATUS_WEIGHT: Record<CustomStatus, number> = { none: 0, abandoned: 0, proposed: 0.15, practice: 0.5, tradition: 1, sacred: 1.4 };
export const GROUP_LABEL: Record<Group, string> = {
  founders: 'Founding members', casuals: 'Casual followers', enthusiasts: 'Enthusiastic recruits', organizers: 'Committed organizers',
  traditionalists: 'Traditionalists', reformers: 'Reformers', opportunists: 'Opportunists',
};

// ------------------------------------------------------------------ small helpers

export function compare(value: number, expr: Cmp): boolean {
  const m = /^(>=|<=|>|<|=)?\s*(-?[\d.]+)$/.exec(expr.trim());
  if (!m) return false;
  const n = Number(m[2]);
  switch (m[1]) {
    case '>=': return value >= n;
    case '<=': return value <= n;
    case '>': return value > n;
    case '<': return value < n;
    default: return value === n;
  }
}

export function statusAtLeast(s: CustomStatus, expr: Cmp): boolean {
  const e = expr.trim();
  if (e.endsWith('+')) return STATUS_ORDER.indexOf(s) >= STATUS_ORDER.indexOf(e.slice(0, -1) as CustomStatus);
  if (e.endsWith('-')) return STATUS_ORDER.indexOf(s) <= STATUS_ORDER.indexOf(e.slice(0, -1) as CustomStatus);
  return s === e;
}

export function followers(s: StoryState): number {
  let n = 0;
  for (const id of s.region) n += s.cities[id]?.followers ?? 0;
  return n;
}

export function groupShare(s: StoryState, g: Group): number {
  const total = GROUPS.reduce((a, k) => a + s.groups[k], 0);
  return total > 0 ? s.groups[g] / total : 0;
}

export function customStatus(s: StoryState, id: string): CustomStatus {
  return s.customs[id]?.status ?? 'none';
}

function mod(s: StoryState, stat: Stat): number {
  let m = 1;
  for (const x of s.modifiers) if (x.stat === stat) m *= x.mult;
  return m;
}

function rngOf(s: StoryState) {
  return new Rng(s.rng);
}

// ------------------------------------------------------------------ identity derived from decisions

export function adoptedPractices(s: StoryState) {
  return Object.entries(s.customs)
    .filter(([id, c]) => id.startsWith('practice.') && STATUS_WEIGHT[c.status] >= 0.5)
    .sort((a, b) => b[1].prominence - a[1].prominence)
    .map(([id]) => id);
}

/** The movement's central belief is whatever practice its members have made most prominent. */
export function centralBelief(s: StoryState) {
  const id = adoptedPractices(s)[0];
  return id ? CUSTOM_BY_ID.get(id) : undefined;
}

export function membersNoun(s: StoryState): { one: string; many: string } {
  const n = s.movementName;
  if (n && /ism$/i.test(n)) {
    const root = n.replace(/ism$/i, '');
    return { one: `${root}ist`, many: `${root}ists` };
  }
  return { one: 'member', many: 'members' };
}

export function address(s: StoryState): string {
  return s.founderTitle ?? s.founder.name;
}

export function meetingWord(s: StoryState): { one: string; many: string } {
  const name = s.customs.gathering_name?.values.name;
  if (name && STATUS_WEIGHT[s.customs.gathering_name.status] > 0) {
    const one = name.replace(/s$/i, '');
    return { one, many: /s$/i.test(name) ? name : `${name}s` };
  }
  return { one: 'meeting', many: 'meetings' };
}

export function hqName(s: StoryState): string {
  if (s.flags.hq_hall) return 'the community hall';
  if (s.flags.hq_warehouse) return 'the old warehouse';
  return 'Gary’s garage';
}

// ------------------------------------------------------------------ text

export function charName(s: StoryState, id: string, full = false): string {
  const c = CHAR_BY_ID.get(id);
  if (!c) return id;
  return full ? c.name : c.short;
}

export function render(s: StoryState, text: string, ctx: Record<string, string> = {}, speaker?: string): string {
  const belief = centralBelief(s);
  const mem = membersNoun(s);
  const meet = meetingWord(s);
  const base: Record<string, string> = {
    title: address(s),
    founder: s.founder.name,
    initial: s.founder.initial,
    movement: s.movementName ?? 'the group',
    Movement: s.movementName ?? 'The group',
    members: mem.many,
    member: mem.one,
    Members: mem.many.charAt(0).toUpperCase() + mem.many.slice(1),
    meeting: meet.one,
    meetings: meet.many,
    day: s.customs.weekly_meeting?.values.day ?? 'Tuesday',
    hq: hqName(s),
    hometown: city(s.hometown).name,
    count: Math.round(followers(s)).toLocaleString('en-US'),
    belief: belief?.phrase ?? 'whatever it is we are doing',
    beliefNoun: belief?.noun ?? 'the thing',
    item: s.customs.attire?.values.item ?? 'badges',
    towns: String(s.region.filter((id) => s.cities[id].followers > 0).length),
    meetingNo: String(meetingNumber(s.day) + 1),
  };
  if (speaker && CHAR_BY_ID.has(speaker)) base.speaker = charName(s, speaker);
  for (const [k, v] of Object.entries(ctx)) {
    base[`ctx.${k}`] = v;
    if (k === 'city' || k.endsWith('City')) base[k] = city(Number(v)).name;
    else if (k.startsWith('tradition') || k === 'emergent') base[k] = renderCustomLabel(s, v).replace(/^\w/, (c) => c.toLowerCase());
    else if (k.startsWith('practice')) {
      const p = CUSTOM_BY_ID.get(v);
      base[k] = p?.phrase ?? v;
      base[`${k}Noun`] = p?.noun ?? v;
    } else base[k] = v;
  }
  const out = text.replace(/\{([\w.]+)\}/g, (whole, key: string, offset: number) => {
    const v = value(whole, key);
    // a phrase substituted at the start of a sentence starts with a capital
    return /(^|[.!?]\s+)$/.test(text.slice(0, offset)) ? v.replace(/^[a-z]/, (ch) => ch.toUpperCase()) : v;
  });
  return out;
  function value(whole: string, key: string): string {
    if (key in base) return base[key];
    if (key.startsWith('c.')) return charName(s, key.slice(2));
    if (key.startsWith('C.')) return charName(s, key.slice(2), true);
    if (key.startsWith('role.')) return s.chars[key.slice(5)]?.role ?? '';
    if (key.startsWith('custom.')) {
      const [, id, field] = key.split('.');
      return s.customs[id]?.values[field] ?? whole;
    }
    return whole;
  }
}

export const RECALL_TOKENS = ['mQuote', 'mAgo', 'mWhen', 'mWhere', 'mOther', 'mWho', 'mTopic', 'mDay'];
export const RENDER_TOKENS = ['meetingNo', 'pastText', 'pastDay', 'pastWho', 'towns', 'title', 'founder', 'initial', 'movement', 'Movement', 'members', 'member', 'Members', 'meeting', 'meetings', 'day', 'hq', 'hometown', 'count', 'belief', 'beliefNoun', 'item', 'speaker'];

// ------------------------------------------------------------------ binders (fill card context at draw time)

const ATTIRE = ['matching hats', 'green socks', 'small badges', 'capes', 'identical scarves', 'monocles', 'orange shoelaces', 'name tags written in calligraphy'];

type Binder = (s: StoryState, rng: Rng, arg?: string) => string | null;
// practices that have their own authored introduction cards are not offered generically
const DEDICATED_PRACTICES = new Set(
  LIBRARY.cards.flatMap((c) => c.choices.flatMap((ch) => (ch.effects.custom ?? []).map((x) => x.id))).filter((id) => id.startsWith('practice.')),
);
export const BINDERS: Record<string, Binder> = {
  nextCity: (s) => {
    const known = s.region.find((id) => id !== s.hometown && s.cities[id].known && !s.cities[id].milestone && s.cities[id].organizers === 0);
    const unknown = s.region.find((id) => !s.cities[id].known);
    const id = known ?? unknown;
    return id != null ? String(id) : null;
  },
  bigCity: (s) => {
    const id = [...s.region].filter((x) => x !== s.hometown).sort((a, b) => city(b).pop - city(a).pop)[0];
    return id != null ? String(id) : null;
  },
  activeCity: (s, rng) => {
    const list = s.region.filter((id) => id !== s.hometown && s.cities[id].followers > 0);
    return list.length ? String(rng.pick(list)) : null;
  },
  attire1: (s, rng) => rng.pick(ATTIRE.filter((x) => x !== s.customs.attire?.values.item)),
  attire2: (s, rng) => rng.pick(ATTIRE.filter((x) => x !== s.customs.attire?.values.item)),
  newPractice: (s, rng) => {
    if (adoptedPractices(s).length >= 5) return null; // enough identity; let the existing customs evolve
    const free = LIBRARY.customs.filter((c) => c.category === 'practice' && !DEDICATED_PRACTICES.has(c.id) && customStatus(s, c.id) === 'none');
    return free.length ? rng.pick(free).id : null;
  },
  practice1: (s) => adoptedPractices(s)[0] ?? null,
  practice2: (s) => adoptedPractices(s)[1] ?? null,
  suggestedName: (s, rng) => {
    const b = centralBelief(s);
    const day = s.customs.weekly_meeting?.values.day;
    const opts = b?.root ? [`${b.root}ism`, `The ${b.root} Collective`, `The ${b.root} Fellowship`] : [day ? `The ${day} Society` : 'The Garage Society', 'The Folding Chair Fellowship'];
    return rng.pick(opts);
  },
  anonName: (_s, rng) => `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
  symbolThing: (_s, rng) => rng.pick(['capybara', 'lamp', 'heron', 'very confident pear', 'spoon with a face', 'sun, or possibly an egg']),
  pastDecision: (s, rng) => {
    const idx = s.history
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => s.decisions - s.history.length + 0 >= 0 && !h.cardId.startsWith('crisis.') && h.speaker !== 'anon' && s.chars[h.speaker]?.present && s.day - h.day > 8)
      .map(({ i }) => i);
    return idx.length ? String(rng.pick(idx)) : null;
  },
  tradition: (s, rng) => {
    const list = Object.entries(s.customs).filter(([, c]) => STATUS_WEIGHT[c.status] >= 0.5).map(([id]) => id);
    return list.length ? rng.pick(list) : null;
  },
  rivalName: (_s, rng) => rng.pick(['the Thursday Knitting Circle', 'the Hometown Chess & Grievance Club', 'the Society for Ordinary Evenings']),
  // emergent:<stance>[:starter] — a custom the members started, with the founder's current stance
  // ('none' = not yet addressed, 'underground' = condemned but still practised). ':starter' needs a present starter.
  emergent: (s, rng, arg = 'none') => {
    const [stance, need] = arg.split(':');
    const list = Object.entries(s.customs).filter(([id, c]) => {
      if (c.origin !== 'members' || !CUSTOM_BY_ID.has(id)) return false;
      if (stance === 'underground') { if (!c.underground) return false; }
      else if ((c.stance ?? 'none') !== stance || c.status === 'abandoned') return false;
      if (need === 'starter' && !(c.startedBy && s.chars[c.startedBy]?.present && s.chars[c.startedBy].status === 'active')) return false;
      if (need === 'grown' && c.prominence < 3) return false;
      return true;
    });
    return list.length ? rng.weighted(list, ([, c]) => 1 + c.prominence)![0] : null;
  },
};

export function binderFor(name: string): ((s: StoryState, rng: Rng) => string | null) | null {
  const i = name.indexOf(':');
  const fn = BINDERS[i < 0 ? name : name.slice(0, i)];
  if (!fn) return null;
  return (st, rng) => fn(st, rng, i < 0 ? undefined : name.slice(i + 1));
}

// ------------------------------------------------------------------ requirements

export function requirementsMet(s: StoryState, r: Requires | undefined): boolean {
  if (!r) return true;
  if (r.era && !r.era.includes(s.era)) return false;
  if (r.flags && !r.flags.every((f) => s.flags[f] != null)) return false;
  if (r.notFlags && r.notFlags.some((f) => s.flags[f] != null)) return false;
  if (r.anyFlags && !r.anyFlags.some((f) => s.flags[f] != null)) return false;
  if (r.customs) for (const [id, e] of Object.entries(r.customs)) if (!statusAtLeast(customStatus(s, id), e)) return false;
  if (r.chars) {
    for (const [id, c] of Object.entries(r.chars)) {
      const st = s.chars[id];
      if (!st) return false;
      if (c.present != null && st.present !== c.present) return false;
      if (c.loyalty && !compare(st.loyalty, c.loyalty)) return false;
      if (c.influence && !compare(st.influence, c.influence)) return false;
      if (c.role && !st.role.toLowerCase().includes(c.role.toLowerCase())) return false;
      if (c.status && st.status !== c.status) return false;
    }
  }
  if (r.gauges) for (const [g, e] of Object.entries(r.gauges)) if (!compare(s.gauges[g as Gauge], e!)) return false;
  if (r.followers && !compare(followers(s), r.followers)) return false;
  if (r.day && !compare(s.day, r.day)) return false;
  if (r.decisions && !compare(s.decisions, r.decisions)) return false;
  if (r.groups) for (const [g, e] of Object.entries(r.groups)) if (!compare(groupShare(s, g as Group), e!)) return false;
  if (r.cities && !compare(s.region.filter((id) => s.cities[id].milestone).length, r.cities)) return false;
  if (r.known && !compare(s.region.filter((id) => s.cities[id].known).length, r.known)) return false;
  if (r.meetings && !compare(meetingNumber(s.day), r.meetings)) return false;
  if (r.memory && !findMemories(s, r.memory).length) return false;
  return true;
}

// ------------------------------------------------------------------ creation

export function regionAround(hometown: number): number[] {
  const h = city(hometown);
  const near = CITIES.filter((c) => c.id !== hometown && distanceKm(h, c) <= TIME.regionRadiusKm)
    .sort((a, b) => distanceKm(h, a) - distanceKm(h, b))
    .slice(0, TIME.regionMaxCities - 1)
    .map((c) => c.id);
  return [hometown, ...near];
}

export function newStory(founderName: string, hometown: number, seed: number, now = Date.now()): StoryState {
  const name = founderName.trim() || 'Jeff';
  const region = regionAround(hometown);
  const s: StoryState = {
    version: STORY_VERSION,
    seed,
    rng: seed >>> 0,
    day: 0,
    lastRealTime: now,
    founder: { name, initial: name.charAt(0).toUpperCase() },
    movementName: null,
    founderTitle: null,
    era: 'founding',
    gauges: { enthusiasm: 55, unity: 60, attention: 22, resources: 45 },
    chars: {},
    groups: { founders: 5, casuals: 0, enthusiasts: 0, organizers: 0, traditionalists: 0, reformers: 0, opportunists: 0 },
    customs: {},
    hometown,
    region,
    cities: Object.fromEntries(region.map((id) => [id, { id, known: id === hometown, followers: id === hometown ? 5 : 0, awareness: id === hometown ? 0.0005 : 0, reputation: 0.1, organizers: 0, milestone: false, frac: 0 }])),
    organizersFree: 0,
    flags: {},
    modifiers: [],
    inbox: [],
    scheduled: [],
    memory: [],
    nextMemoryId: 1,
    chains: { delivered: 0, expired: 0, cancelled: 0, log: [] },
    lastSeen: {},
    lastSeenAt: {},
    decisions: 0,
    history: [],
    chronicle: [{ day: 0, text: `${name} and three friends began meeting in Gary’s garage in ${city(hometown).name}. Nobody had agreed on what it was about.` }],
    stats: { recruited: 0, churned: 0, peak: 5, growthPerDay: 0 },
    crisis: null,
    ended: null,
    nextUid: 1,
    nextCardAt: 0,
  };
  for (const c of LIBRARY.characters) {
    s.chars[c.id] = { present: c.startsPresent, status: c.startsPresent ? 'active' : 'absent', loyalty: c.startLoyalty, influence: c.startInfluence, role: c.role, joinedDay: c.startsPresent ? 0 : undefined, memories: [] };
  }
  const rng = rngOf(s);
  // the opening card is always the garage
  enqueue(s, 'found.garage', rng, {});
  s.nextCardAt = 0.8; // Martin's question about meetings comes first
  s.rng = rng.state;
  return s;
}

// ------------------------------------------------------------------ card selection

function resolveSpeaker(s: StoryState, card: CardDef, rng: Rng): { speaker: string; anon?: CardInstance['anon'] } | null {
  const sp = card.speaker;
  if (typeof sp === 'object') return { speaker: 'anon', anon: { name: sp.anon.name, role: sp.anon.role, seed: Math.floor(rng.next() * 1e9) } };
  const present = Object.entries(s.chars).filter(([, c]) => c.present && c.status === 'active');
  const pickWeighted = (ids: [string, CharState][]) => rng.weighted(ids, ([, c]) => 0.5 + c.influence / 20)?.[0] ?? null;
  if (sp === 'any') return wrap(pickWeighted(present));
  if (sp === 'unhappy') return wrap(rng.weighted(present.filter(([, c]) => c.loyalty <= -20), ([, c]) => -c.loyalty)?.[0] ?? null);
  if (sp === 'devoted') return wrap(rng.weighted(present.filter(([, c]) => c.loyalty >= 40), ([, c]) => c.loyalty)?.[0] ?? null);
  if (sp.startsWith('agenda:')) return wrap(pickWeighted(present.filter(([id]) => CHAR_BY_ID.get(id)?.agenda === sp.slice(7))));
  if (sp.startsWith('role:')) return wrap(pickWeighted(present.filter(([, c]) => c.role.toLowerCase().includes(sp.slice(5).toLowerCase()))));
  if (sp.startsWith('champion:')) {
    return null; // resolved by bindCard when the practice is known
  }
  const c = s.chars[sp];
  if (c && !c.present && c.status === 'absent' && card.requires?.chars?.[sp]?.present === false) return { speaker: sp }; // an introduction
  return c && c.present && c.status === 'active' ? { speaker: sp } : null;
}
function wrap(id: string | null) {
  return id ? { speaker: id } : null;
}

function bindCard(s: StoryState, card: CardDef, rng: Rng, preset: Record<string, string>): Record<string, string> | null {
  const ctx: Record<string, string> = { ...preset };
  for (const [k, binder] of Object.entries(card.bind ?? {})) {
    if (ctx[k] != null) continue;
    const fn = binderFor(binder);
    const v = fn ? fn(s, rng) : null;
    if (v == null) return null;
    ctx[k] = v;
  }
  if (ctx.emergent != null && ctx.emergentBy == null) {
    const by = s.customs[ctx.emergent]?.startedBy;
    ctx.emergentById = by ?? '';
    ctx.emergentBy = by ? charName(s, by) : 'a few of the members';
  }
  if (card.recall && ctx.mem == null) {
    const fixed = typeof card.speaker === 'string' && CHAR_BY_ID.has(card.speaker) ? card.speaker : undefined;
    const list = findMemories(s, card.recall, fixed);
    if (!list.length) return null;
    const m = rng.weighted(list, (x) => salience(s, x) + 0.01)!;
    const meet = meetingWord(s);
    const day = s.customs.weekly_meeting?.values.day ?? 'Tuesday';
    Object.assign(ctx, {
      mem: String(m.id),
      mWhoId: m.who,
      mWho: charName(s, m.who),
      mQuote: m.quote.replace(/[.!?]$/, ''),
      mAgo: agoText(meetingNumber(s.day) - m.meeting, meet, day),
      mWhen: `on day ${Math.floor(m.day) + 1}`,
      mDay: String(Math.floor(m.day) + 1),
      mWhere: whereText(m.setting, meet.one),
      mOtherId: m.other ?? '',
      mOther: m.other ? charName(s, m.other) : 'someone else',
      mTopic: m.topic.includes('.') ? 'that' : m.topic,
    });
  }
  if (card.bind?.anon && !ctx.anon) ctx.anon = BINDERS.anonName(s, rng)!;
  if (ctx.past != null && ctx.pastText == null) {
    const h = s.history[Number(ctx.past)];
    if (!h) return null;
    ctx.pastText = h.summary.replace(/^[“"]|[”"]$/g, '').replace(/\.$/, '');
    ctx.pastDay = String(Math.floor(h.day) + 1);
    ctx.pastWho = h.speaker === 'anon' ? 'a member' : charName(s, h.speaker);
  }
  if (card.variants?.length && ctx.v == null) ctx.v = String(rng.int(0, card.variants.length - 1));
  return ctx;
}

function enqueue(s: StoryState, cardId: string, rng: Rng, preset: Record<string, string>, speakerOverride?: string): CardInstance | null {
  const card = CARD_BY_ID.get(cardId);
  if (!card) return null;
  const ctx = bindCard(s, card, rng, preset);
  if (!ctx) return null;
  let who: ReturnType<typeof resolveSpeaker>;
  if (speakerOverride && s.chars[speakerOverride]?.present) who = { speaker: speakerOverride };
  else if (card.speaker === 'recall') who = ctx.mWhoId ? { speaker: ctx.mWhoId } : null;
  else if (typeof card.speaker === 'string' && card.speaker.startsWith('champion:')) {
    const cid = ctx[card.speaker.slice(9)] ?? '';
    const p = CUSTOM_BY_ID.get(cid);
    const pick = s.customs[cid]?.startedBy ?? p?.champion;
    const champ = pick && s.chars[pick]?.present && s.chars[pick].status === 'active' ? pick : null;
    const present = Object.entries(s.chars).filter(([, c]) => c.present && c.status === 'active');
    who = champ ? { speaker: champ } : present.length ? { speaker: rng.pick(present)[0] } : null;
  } else who = resolveSpeaker(s, card, rng);
  if (!who) return null;
  if (who.anon && ctx.anon) who.anon.name = ctx.anon;
  const inst: CardInstance = { uid: `k${s.nextUid++}`, cardId, speaker: who.speaker, anon: who.anon, ctx, arrivedDay: s.day, priority: card.priority ?? 0 };
  s.inbox.push(inst);
  if (ctx.mem) {
    const m = s.memory.find((x) => x.id === Number(ctx.mem));
    if (m) {
      m.recalled++;
      m.lastRecalled = s.day;
    }
  }
  s.lastSeen[cardId] = s.day;
  s.lastSeenAt[cardId] = s.decisions;
  return inst;
}

export function eligibleCards(s: StoryState): CardDef[] {
  const inInbox = new Set(s.inbox.map((i) => i.cardId));
  return LIBRARY.cards.filter((c) => {
    if (c.followUpOnly || c.type === 'crisis' || inInbox.has(c.id)) return false;
    if (c.once && s.lastSeen[c.id] != null) return false;
    if (s.lastSeen[c.id] != null && s.day - s.lastSeen[c.id] < (c.cooldown ?? 30)) return false;
    // spacing is measured in decisions, but quiet stretches count too (otherwise an empty desk could never refill)
    const spacing = c.spacing ?? 12;
    if (s.lastSeenAt[c.id] != null && s.decisions - s.lastSeenAt[c.id] < spacing && s.day - s.lastSeen[c.id] < spacing) return false;
    if (!requirementsMet(s, c.requires)) return false;
    if (c.recall && !findMemories(s, c.recall, typeof c.speaker === 'string' && CHAR_BY_ID.has(c.speaker) ? c.speaker : undefined).length) return false;
    return true;
  });
}

function drawRandomCard(s: StoryState, rng: Rng): CardInstance | null {
  const recentSpeakers = s.history.slice(-2).map((h) => h.speaker);
  // vary the comic structure: the same kind of joke twice running is the fastest way to make 1,000 cards feel like 10
  const recentShapes = s.history.slice(-2).map((h) => CARD_BY_ID.get(h.cardId)?.shape);
  const pool = eligibleCards(s);
  for (let attempt = 0; attempt < 6 && pool.length; attempt++) {
    const card = rng.weighted(pool, (c) => {
      let w = c.weight ?? 1;
      if (c.priority) w *= 1 + c.priority / 2;
      if (c.shape && c.shape === recentShapes[1]) w *= 0.35;
      else if (c.shape && c.shape === recentShapes[0]) w *= 0.7;
      if (typeof c.speaker === 'string' && s.chars[c.speaker]) {
        w *= 0.5 + s.chars[c.speaker].influence / 25; // influential people get your attention
        if (recentSpeakers.includes(c.speaker)) w *= 0.4;
      }
      return w;
    });
    if (!card) return null;
    const inst = enqueue(s, card.id, rng, {});
    if (inst) return inst;
    pool.splice(pool.indexOf(card), 1);
  }
  return null;
}

/** The next problem waiting on your desk. */
export function currentCard(s: StoryState): CardInstance | null {
  if (!s.inbox.length || s.ended) return null;
  return [...s.inbox].sort((a, b) => b.priority - a.priority || a.arrivedDay - b.arrivedDay || Number(a.uid.slice(1)) - Number(b.uid.slice(1)))[0];
}

// ------------------------------------------------------------------ members

function addMembers(s: StoryState, n: number) {
  if (n <= 0) return;
  const e = s.gauges.enthusiasm / 100;
  const mix: Partial<Record<Group, number>> = { casuals: 0.6 - e * 0.15, enthusiasts: 0.2 + e * 0.15, opportunists: 0.05 + s.gauges.resources / 1000 };
  if (s.era === 'founding') mix.founders = 0.3;
  const total = Object.values(mix).reduce((a, b) => a + b!, 0);
  for (const [g, w] of Object.entries(mix)) s.groups[g as Group] += (n * w!) / total;
}

function removeMembers(s: StoryState, n: number) {
  if (n <= 0) return;
  const weight: Record<Group, number> = { founders: 0.1, casuals: 3, enthusiasts: 0.6, organizers: 0.3, traditionalists: 0.4, reformers: 1.2, opportunists: 1.6 };
  const tot = GROUPS.reduce((a, g) => a + s.groups[g] * weight[g], 0);
  if (tot <= 0) return;
  for (const g of GROUPS) s.groups[g] = Math.max(0, s.groups[g] - (n * s.groups[g] * weight[g]) / tot);
}

function shiftGroup(s: StoryState, g: Group, share: number) {
  const total = GROUPS.reduce((a, k) => a + s.groups[k], 0);
  const amount = Math.abs(share) * total;
  if (share > 0) {
    const others = GROUPS.filter((k) => k !== g && k !== 'founders');
    const pool = others.reduce((a, k) => a + s.groups[k], 0);
    if (pool <= 0) return;
    const moved = Math.min(amount, pool);
    for (const k of others) s.groups[k] -= (moved * s.groups[k]) / pool;
    s.groups[g] += moved;
  } else {
    const moved = Math.min(amount, s.groups[g]);
    s.groups[g] -= moved;
    s.groups.casuals += moved;
  }
}

function reconcileGroups(s: StoryState) {
  const f = followers(s);
  const total = GROUPS.reduce((a, k) => a + s.groups[k], 0);
  if (total <= 0) {
    s.groups.casuals = f;
    return;
  }
  const k = f / total;
  for (const g of GROUPS) s.groups[g] *= k;
}

// ------------------------------------------------------------------ the continuous simulation

interface Agg {
  w: number;
  appeal: number;
  friction: number;
  visibility: number;
  commitment: number;
  commerce: number;
  ambiguity: number;
  traditions: number;
}
function customAggregates(s: StoryState): Agg {
  const a: Agg = { w: 0, appeal: 0, friction: 0, visibility: 0, commitment: 0, commerce: 0, ambiguity: 0, traditions: 0 };
  for (const [id, c] of Object.entries(s.customs)) {
    const def = CUSTOM_BY_ID.get(id);
    // a condemned custom that survives underground still shapes the movement, quietly
    const w = c.underground ? 0.3 : STATUS_WEIGHT[c.status];
    if (!def || !w) continue;
    const st = c.origin === 'members' ? c.stance ?? 'none' : 'endorsed';
    const fr = st === 'reformed' ? 0.5 : c.underground ? 1.5 : 1; // reform files the edges off; secrecy sharpens them
    const amb = st === 'none' || st === 'tolerated' ? 1.6 : st === 'reformed' ? 1.2 : 1; // nobody knows if it is official
    const vis = c.underground ? 0.3 : 1;
    a.w += w;
    a.appeal += w * (def.props.appeal - 50);
    a.friction += w * def.props.friction * fr;
    a.visibility += w * def.props.visibility * vis;
    a.commitment += w * (def.props.commitment - 50);
    a.commerce += w * def.props.commerce;
    a.ambiguity += w * def.props.ambiguity * amb;
    if (c.status === 'tradition' || c.status === 'sacred') a.traditions += 1;
  }
  return a;
}

function drift(s: StoryState, g: Gauge, target: number, rate: number, dt: number) {
  const v = s.gauges[g];
  const next = v + (target - v) * (1 - Math.exp(-rate * dt));
  // the passage of time never pushes a gauge over the edge; only decisions do
  s.gauges[g] = v < 4 || v > 96 ? next : clamp(next, 4, 96);
}

/** Advance the world by dt game days (dt <= 0.5 recommended). */
export function simulate(s: StoryState, dt: number, rng: Rng, report?: AwayReport) {
  s.day += dt;
  s.modifiers = s.modifiers.filter((m) => m.until > s.day);
  const F = followers(s);
  const agg = customAggregates(s);
  const enthF = 0.4 + (s.gauges.enthusiasm / 100) * 1.2;
  const attF = 0.55 + s.gauges.attention / 100;
  const appealMult = Math.max(0.6, 1 + agg.appeal / 300);
  const gf = 1 + groupShare(s, 'enthusiasts') * 1.2 + groupShare(s, 'organizers') * 0.8 - groupShare(s, 'casuals') * 0.3;
  const baseR = 0.032 * enthF * attF * appealMult * gf * mod(s, 'recruitment');
  const churnRate = (0.0025 + groupShare(s, 'casuals') * 0.005 + Math.max(0, 35 - s.gauges.unity) / 35 * 0.006 + (s.gauges.enthusiasm > 88 ? 0.006 : 0) + (s.gauges.resources < 10 ? 0.004 : 0)) / mod(s, 'retention');
  const repTarget = clamp(0.15 + agg.appeal / 250 - (agg.friction / 400) * (s.gauges.attention / 60), -1, 1) * mod(s, 'reputation');
  let gained = 0;
  let lost = 0;
  for (const id of s.region) {
    const c = s.cities[id];
    const pop = city(id).pop;
    const conv = c.followers / pop;
    c.reputation += (repTarget - c.reputation) * (1 - Math.exp(-0.05 * dt));
    const repF = 0.5 + (c.reputation + 1) / 4;
    // awareness: attention, neighbours and organizers
    const neighbour = id === s.hometown ? 0 : Math.min(1, followers(s) / Math.max(1, city(s.hometown).pop) * 3);
    const aRate = (0.0015 * s.gauges.attention / 50 + neighbour * 0.01 + c.organizers * 0.02) * mod(s, 'awareness');
    if (c.known || c.followers > 0) c.awareness += (1 - c.awareness) * (1 - Math.exp(-aRate * dt));
    // word of mouth + passive + campaigns
    let add = c.followers * baseR * repF * (1 - conv) * dt;
    add += c.awareness * pop * 0.00004 * appealMult * repF * (1 - conv) * dt;
    if (c.organizers > 0) add += Math.pow(c.organizers, 0.8) * 5 * enthF * repF * (1 - conv) * mod(s, 'campaign') * dt;
    const churn = c.followers * churnRate * dt;
    const delta = add - churn + c.frac;
    let whole = delta >= 0 ? Math.floor(delta) : Math.ceil(delta);
    c.frac = delta - whole;
    whole = clamp(whole, -c.followers, pop - c.followers);
    c.followers += whole;
    if (whole > 0) gained += whole;
    else lost -= whole;
    if (!c.known && (c.followers > 0 || c.awareness > 0.02)) c.known = true;
    if (!c.milestone && c.followers / pop >= 0.85) {
      c.milestone = true;
      s.organizersFree += 1 + (pop > 500_000 ? 1 : 0);
      c.organizers = 0;
      s.chronicle.push({ day: s.day, text: `${city(id).name} reached 85%. It is, by any reasonable measure, ours.` });
      report?.milestones.push(`${city(id).name} reached 85%`);
      revealNext(s, 2);
    }
    if (c.followers / pop > 0.1 && !c.milestone) revealNext(s, 1, true);
  }
  addMembers(s, gained);
  removeMembers(s, lost);
  reconcileGroups(s);
  s.stats.recruited += gained;
  s.stats.churned += lost;
  const f2 = followers(s);
  s.stats.peak = Math.max(s.stats.peak, f2);
  s.stats.growthPerDay = s.stats.growthPerDay * 0.9 + ((gained - lost) / Math.max(dt, 1e-6)) * 0.1;
  if (report) {
    report.newFollowers += gained;
    report.lostFollowers += lost;
  }

  // group maturation
  const tr = dt;
  const move = (from: Group, to: Group, rate: number) => {
    const n = s.groups[from] * Math.min(1, rate * tr);
    s.groups[from] -= n;
    s.groups[to] += n;
  };
  move('casuals', 'enthusiasts', 0.008 * enthF);
  if (s.organizersFree + s.region.reduce((a, id) => a + s.cities[id].organizers, 0) > 0 || s.flags.organizer_training) move('enthusiasts', 'organizers', 0.003);
  move('enthusiasts', 'traditionalists', 0.004 * agg.traditions);
  move('casuals', 'reformers', 0.0015 * (agg.friction / 100) * agg.traditions);
  move('enthusiasts', 'casuals', s.gauges.enthusiasm > 85 ? 0.01 : 0); // burnout

  // gauges drift toward what the membership actually is
  const disgruntled = Object.values(s.chars).filter((c) => c.present && c.status === 'active' && c.loyalty <= -40).length;
  const factional = Math.abs(groupShare(s, 'traditionalists') - groupShare(s, 'reformers'));
  const campaigns = s.region.reduce((a, id) => a + s.cities[id].organizers, 0);
  drift(s, 'enthusiasm', 42 + agg.commitment * 0.2 + groupShare(s, 'enthusiasts') * 35 - groupShare(s, 'casuals') * 12, 0.03, dt);
  drift(s, 'unity', 66 - agg.ambiguity * 0.06 - factional * 40 - disgruntled * 7 + groupShare(s, 'founders') * 15 - groupShare(s, 'opportunists') * 20, 0.025, dt);
  drift(s, 'attention', 14 + Math.log10(f2 + 1) * 9 + agg.visibility * 0.06 + campaigns * 2, 0.04, dt);
  drift(s, 'resources', 36 + groupShare(s, 'opportunists') * 50 + agg.commerce * 0.05 + (s.flags.dues ? 12 : 0) * mod(s, 'income') - campaigns * 1.5 - (s.flags.departments ?? 0) * 0, 0.03, dt);

  // people: influence follows their base of support and their role
  for (const [id, c] of Object.entries(s.chars)) {
    if (!c.present || c.status !== 'active') continue;
    const def = CHAR_BY_ID.get(id)!;
    const target = clamp(def.startInfluence * 0.4 + groupShare(s, def.ally) * 90 + (c.role !== def.role ? 15 : 0), 0, 100);
    c.influence += (target - c.influence) * (1 - Math.exp(-0.02 * dt));
  }

  // era progression safety nets (cards normally move eras)
  if (s.era === 'founding' && s.movementName && f2 >= 80) setEra(s, 'grassroots');
  if (s.era === 'grassroots' && (f2 >= TIME.regionalFollowers || s.region.filter((id) => s.cities[id].milestone).length >= 2) && s.flags.regional_ready == null) {
    s.flags.regional_ready = s.day;
  }
  if (s.era === 'regional' && (f2 >= TIME.nationalFollowers || s.region.filter((id) => s.cities[id].milestone).length >= 4) && s.flags.national_ready == null) {
    s.flags.national_ready = s.day;
  }

  // follow-ups and new arrivals
  if (s.crisis && (s.day - s.crisis.day > TIME.crisisWindowDays || s.decisions - (s.crisis.decision ?? s.decisions) > TIME.crisisWindowDecisions)) s.crisis = null;
  processChains(s, rng, report);
  emergeCustoms(s, dt, rng, report);
  if (s.day >= s.nextCardAt) {
    s.nextCardAt = s.day + (1 / TIME.cardsPerDay[s.era]) * rng.range(0.6, 1.4);
    if (s.inbox.length < TIME.inboxMax && drawRandomCard(s, rng) && report) report.arrivals++;
  }
}

// ------------------------------------------------------------------ story chains

function chainOutcome(s: StoryState, x: ScheduledCard, outcome: 'expired' | 'cancelled') {
  s.chains[outcome]++;
  s.chains.log.push({ card: x.card, outcome, day: s.day });
  if (s.chains.log.length > 60) s.chains.log.shift();
}

/** Deliver follow-ups inside their window, wait while their prerequisites are unmet, drop them when the moment has passed. */
function processChains(s: StoryState, rng: Rng, report?: AwayReport) {
  if (!s.scheduled.length) return;
  const keep: ScheduledCard[] = [];
  for (const x of s.scheduled) {
    const until = x.until ?? x.day + 10;
    const speakerGone = x.speaker && !(s.chars[x.speaker]?.present && s.chars[x.speaker].status === 'active');
    if ((x.cancelIf && requirementsMet(s, x.cancelIf)) || speakerGone) {
      chainOutcome(s, x, 'cancelled');
      continue;
    }
    if (s.day < x.day) {
      keep.push(x);
      continue;
    }
    const card = CARD_BY_ID.get(x.card);
    const ready = requirementsMet(s, x.requires) && requirementsMet(s, card?.requires && { ...card.requires, era: undefined });
    if (ready) {
      const inst = enqueue(s, x.card, rng, x.ctx, x.speaker);
      if (inst) {
        s.chains.delivered++;
        if (report) report.arrivals++;
        continue;
      }
    }
    if (s.day > until) chainOutcome(s, x, 'expired');
    else keep.push(x);
  }
  s.scheduled = keep;
}

// ------------------------------------------------------------------ emergent doctrine

export const EMERGENT = LIBRARY.customs.filter((c) => c.emergent);
const EMERGE = { perDay: 0.05, maxUnaddressed: 1, maxActive: 7 };

/** Members invent customs of their own. The founder finds out afterwards and has to take a position. */
function emergeCustoms(s: StoryState, dt: number, rng: Rng, report?: AwayReport) {
  if (s.era === 'founding') return;
  const mine = Object.entries(s.customs).filter(([, c]) => c.origin === 'members');
  for (const [, c] of mine) {
    if (c.stance === 'tolerated' && c.status !== 'abandoned') c.prominence += 0.12 * dt; // left alone, it grows
    if (c.underground) {
      c.prominence -= 0.04 * dt;
      if (c.prominence <= 0) {
        c.underground = false;
        c.prominence = 0;
      }
    }
  }
  const unaddressed = mine.filter(([, c]) => (c.stance ?? 'none') === 'none' && c.status !== 'abandoned').length;
  const active = mine.filter(([, c]) => c.status !== 'abandoned' || c.underground).length;
  if (unaddressed >= EMERGE.maxUnaddressed || active >= EMERGE.maxActive) return;
  const zeal = 0.5 + s.gauges.enthusiasm / 100 + groupShare(s, 'traditionalists') * 2 + groupShare(s, 'enthusiasts');
  if (!rng.chance(1 - Math.exp(-EMERGE.perDay * zeal * dt))) return;
  const free = EMERGENT.filter((d) => customStatus(s, d.id) === 'none');
  const def = rng.weighted(free, (d) => (d.startedBy && s.chars[d.startedBy]?.present ? 2 : d.startedBy ? 0.2 : 1));
  if (!def) return;
  const starter = def.startedBy && s.chars[def.startedBy]?.present && s.chars[def.startedBy].status === 'active' ? def.startedBy : undefined;
  setCustom(s, def.id, 'practice', undefined, 0.5);
  Object.assign(s.customs[def.id], { origin: 'members', stance: 'none', startedBy: starter });
  s.customs[def.id].history[s.customs[def.id].history.length - 1].note = 'started by members';
  const text = `Members began ${renderCustomLabel(s, def.id).replace(/^\w/, (ch) => ch.toLowerCase())} without asking anyone.`;
  s.chronicle.push({ day: s.day, text });
  report?.notes.push(text);
}

/** The founder's position on a custom the members started. */
function applyStance(s: StoryState, id: string, stance: Stance, inst: CardInstance, out: ChoiceOutcome, rng: Rng, quote: string, setting: Setting, choice: 0 | 1) {
  const c = s.customs[id];
  if (!c) return;
  c.stance = stance;
  c.history.push({ day: s.day, status: c.status, note: stance });
  if (stance === 'endorsed') {
    setCustom(s, id, 'tradition', undefined, 2);
    c.underground = false;
  } else if (stance === 'tolerated') {
    if (c.status === 'abandoned') setCustom(s, id, 'practice');
    c.underground = false;
  } else if (stance === 'reformed') {
    if (c.status === 'abandoned') setCustom(s, id, 'practice');
    c.prominence = Math.max(0, c.prominence - 1);
    c.underground = false;
  } else if (stance === 'condemned') {
    setCustom(s, id, 'abandoned');
    // the more devoted the membership, the likelier it carries on in secret
    c.underground = rng.chance(Math.min(0.9, 0.25 + groupShare(s, 'traditionalists') * 1.5 + groupShare(s, 'enthusiasts')));
    if (c.underground) c.prominence = Math.max(c.prominence, 2);
  }
  const lbl = renderCustomLabel(s, id);
  out.notes.push(`${lbl}: ${stance}${c.underground ? ' (it carries on quietly)' : ''}`);
  s.chronicle.push({ day: s.day, text: `${address(s)} ${stance === 'tolerated' ? 'tolerated' : stance} ${lbl.replace(/^\w/, (ch) => ch.toLowerCase())}.` });
  // the person who started it takes it personally
  if (c.startedBy && s.chars[c.startedBy]?.present) {
    const kind: MemoryKind = stance === 'endorsed' ? 'credited' : stance === 'condemned' ? 'overruled' : stance === 'reformed' ? 'overruled' : 'backed';
    recordMemory(s, { who: c.startedBy, kind, topic: lbl, cardId: inst.cardId, choice, quote, setting, weight: stance === 'condemned' ? 3 : stance === 'endorsed' ? 2 : 1 });
  }
}

function revealNext(s: StoryState, n: number, quiet = false) {
  let k = 0;
  for (const id of s.region) {
    if (k >= n) break;
    if (!s.cities[id].known) {
      s.cities[id].known = true;
      s.cities[id].awareness = Math.max(s.cities[id].awareness, 0.01);
      if (!quiet) s.chronicle.push({ day: s.day, text: `Word reached ${city(id).name}.` });
      k++;
    }
  }
}

function setEra(s: StoryState, e: Era) {
  if (ERAS.indexOf(e) <= ERAS.indexOf(s.era)) return;
  s.era = e;
  if (e === 'regional') {
    // the arena widens: towns further from home come into play
    const h = city(s.hometown);
    const wider = CITIES.filter((c) => !s.cities[c.id] && distanceKm(h, c) <= TIME.regionalRadiusKm)
      .sort((a, b) => distanceKm(h, a) - distanceKm(h, b))
      .slice(0, TIME.regionalMaxCities - s.region.length);
    for (const c of wider) {
      s.region.push(c.id);
      s.cities[c.id] = { id: c.id, known: false, followers: 0, awareness: 0, reputation: 0.1, organizers: 0, milestone: false, frac: 0 };
    }
  }
  const label: Record<Era, string> = { founding: 'Founding', grassroots: 'Grassroots', regional: 'Regional', national: 'National', international: 'International', world: 'World Order' };
  s.chronicle.push({ day: s.day, text: `The ${label[e]} era began.` });
}

// ------------------------------------------------------------------ decisions

export function choose(s: StoryState, uid: string, choiceIdx: 0 | 1, input?: string): { ok: true; outcome: ChoiceOutcome } | { ok: false; error: string } {
  if (s.ended) return { ok: false, error: 'Your leadership has ended.' };
  const inst = s.inbox.find((i) => i.uid === uid);
  if (!inst) return { ok: false, error: 'That matter has already been dealt with.' };
  const card = CARD_BY_ID.get(inst.cardId)!;
  const ch = card.choices[choiceIdx];
  if (ch.input) {
    const text = (input ?? '').trim();
    if (!text) return { ok: false, error: 'Please write something.' };
    if (text.length > 60) return { ok: false, error: 'Shorter, please. It has to fit on a banner.' };
    const m = moderate(text);
    if (!m.ok) return { ok: false, error: m.message };
  }
  const rng = rngOf(s);
  const outcome: ChoiceOutcome = { reaction: render(s, ch.reaction, inst.ctx, inst.speaker), gaugeDelta: {}, loyalty: [], groupNotes: [], notes: [] };
  // inputs are applied first so the reaction can use them
  if (ch.input) {
    const text = input!.trim();
    if (ch.input.target === 'movementName') s.movementName = text;
    else if (ch.input.target === 'founderTitle') s.founderTitle = text;
    else if (ch.input.target.startsWith('custom:')) {
      const [id, field] = ch.input.target.slice(7).split('.');
      setCustom(s, id, 'practice', { [field]: text });
    }
  }
  applyEffects(s, ch.effects, inst, rng, outcome, ch.label, choiceIdx);
  outcome.reaction = render(s, ch.reaction, inst.ctx, inst.speaker);
  s.inbox = s.inbox.filter((i) => i.uid !== uid);
  s.decisions++;
  s.history.push({ cardId: card.id, day: s.day, choice: choiceIdx, speaker: inst.speaker, summary: render(s, ch.label, inst.ctx, inst.speaker) });
  if (s.history.length > 400) s.history.splice(0, s.history.length - 400);
  if (card.type === 'crisis') s.flags[`survived_${card.id}`] = s.day;
  checkCrisis(s, rng);
  // keep the desk from going quiet during the founding era
  if (!s.inbox.length && s.era === 'founding' && !s.scheduled.some((x) => x.day - s.day <= 1)) drawRandomCard(s, rng);
  s.rng = rng.state;
  return { ok: true, outcome };
}

function setCustom(s: StoryState, id: string, status: CustomStatus | undefined, values?: Record<string, string>, prominence = 0) {
  const cur = s.customs[id] ?? { status: 'none' as CustomStatus, values: {}, prominence: 0, since: s.day, history: [] };
  if (status && status !== cur.status) {
    cur.status = status;
    cur.since = s.day;
    cur.history.push({ day: s.day, status });
  }
  if (values) Object.assign(cur.values, values);
  cur.prominence += prominence;
  s.customs[id] = cur;
}

export function applyEffects(s: StoryState, e: Effects, inst: CardInstance, rng: Rng, out: ChoiceOutcome, label: string, choiceIdx: 0 | 1 = 0) {
  const R = (t: string) => render(s, t, inst.ctx, inst.speaker);
  for (const [g, v] of Object.entries(e.gauges ?? {})) {
    const before = s.gauges[g as Gauge];
    s.gauges[g as Gauge] = clamp(before + v!, 0, 100);
    out.gaugeDelta[g as Gauge] = s.gauges[g as Gauge] - before;
  }
  const loyaltyDelta: Record<string, number> = {};
  for (const tag of e.serves ?? []) {
    const neg = tag.startsWith('-');
    const agenda = neg ? tag.slice(1) : tag;
    if (!AGENDAS.includes(agenda as never)) continue;
    for (const [id, c] of Object.entries(s.chars)) {
      if (!c.present) continue;
      if (CHAR_BY_ID.get(id)?.agenda === agenda) loyaltyDelta[id] = (loyaltyDelta[id] ?? 0) + (neg ? -6 : 4); // slights are remembered longer than favours
    }
  }
  for (const [id, v] of Object.entries(e.loyalty ?? {})) loyaltyDelta[id] = (loyaltyDelta[id] ?? 0) + v;
  if (e.speakerLoyalty && s.chars[inst.speaker]) loyaltyDelta[inst.speaker] = (loyaltyDelta[inst.speaker] ?? 0) + e.speakerLoyalty;
  if (e.otherLoyalty && inst.ctx.mOtherId && s.chars[inst.ctx.mOtherId]) loyaltyDelta[inst.ctx.mOtherId] = (loyaltyDelta[inst.ctx.mOtherId] ?? 0) + e.otherLoyalty;
  if (e.starterLoyalty && inst.ctx.emergentById && s.chars[inst.ctx.emergentById]) loyaltyDelta[inst.ctx.emergentById] = (loyaltyDelta[inst.ctx.emergentById] ?? 0) + e.starterLoyalty;
  if (e.speakerInfluence && s.chars[inst.speaker]) s.chars[inst.speaker].influence = clamp(s.chars[inst.speaker].influence + e.speakerInfluence, 0, 100);
  for (const [id, v] of Object.entries(loyaltyDelta)) {
    const c = s.chars[id];
    if (!c || !c.present) continue;
    c.loyalty = clamp(c.loyalty + v, -100, 100);
    out.loyalty.push({ id, delta: v });
    updateCharacterStatus(s, id, out);
  }
  writeMemories(s, e, inst, loyaltyDelta, R(label), choiceIdx);
  for (const [id, v] of Object.entries(e.influence ?? {})) if (s.chars[id]) s.chars[id].influence = clamp(s.chars[id].influence + v, 0, 100);
  for (const [g, v] of Object.entries(e.groups ?? {})) {
    shiftGroup(s, g as Group, v!);
    out.groupNotes.push(`${GROUP_LABEL[g as Group]} ${v! > 0 ? 'gain ground' : 'lose ground'}`);
  }
  const card = CARD_BY_ID.get(inst.cardId);
  const setting: Setting = card?.setting ?? 'private';
  if (e.stance && inst.ctx.emergent) applyStance(s, inst.ctx.emergent, e.stance, inst, out, rng, R(label), setting, choiceIdx);
  if (e.recall && inst.ctx.mem) {
    const m = s.memory.find((x) => x.id === Number(inst.ctx.mem));
    if (m && e.recall === 'resolve') m.resolved = true;
    if (m && e.recall === 'deepen') m.weight = Math.min(3, m.weight + 1);
    if (m && e.recall === 'forget') s.memory = s.memory.filter((x) => x !== m);
  }
  for (const c of e.custom ?? []) {
    const values = c.values ? Object.fromEntries(Object.entries(c.values).map(([k, v]) => [k, R(v)])) : undefined;
    const id = R(c.id);
    const before = customStatus(s, id);
    setCustom(s, id, c.status, values, c.prominence ?? 0);
    if (c.stance) applyStance(s, id, c.stance, inst, out, rng, R(label), setting, choiceIdx);
    if (c.status && c.status !== before) {
      const def = CUSTOM_BY_ID.get(id);
      const lbl = def ? R(renderCustomLabel(s, id)) : id;
      out.notes.push(`${lbl}: ${c.status}`);
      if (c.status === 'tradition' || c.status === 'sacred') s.chronicle.push({ day: s.day, text: `${lbl} became ${c.status === 'sacred' ? 'sacred' : 'an official tradition'}.` });
    }
  }
  for (const f of e.flags ?? []) s.flags[R(f)] = s.day;
  for (const f of e.clearFlags ?? []) delete s.flags[R(f)];
  for (const m of e.modifiers ?? []) {
    s.modifiers.push({ stat: m.stat, mult: m.mult, until: s.day + m.days, label: R(m.label) });
    out.notes.push(`${R(m.label)} (${m.days} days)`);
  }
  const target = inst.ctx.city ? Number(inst.ctx.city) : s.hometown;
  if (e.followers) {
    const c = s.cities[target] ?? s.cities[s.hometown];
    const pop = city(c.id).pop;
    const n = clamp(e.followers, -c.followers, pop - c.followers);
    c.followers += n;
    c.known = true;
    if (n > 0) addMembers(s, n);
    else removeMembers(s, -n);
    out.notes.push(`${n >= 0 ? '+' : ''}${n} ${membersNoun(s).many}`);
  }
  if (e.followersPct) {
    let total = 0;
    for (const id of s.region) {
      const c = s.cities[id];
      const n = Math.round(c.followers * e.followersPct);
      const k = clamp(n, -c.followers, city(id).pop - c.followers);
      c.followers += k;
      total += k;
    }
    if (total > 0) addMembers(s, total);
    else removeMembers(s, -total);
    out.notes.push(`${total >= 0 ? '+' : ''}${total.toLocaleString('en-US')} ${membersNoun(s).many}`);
  }
  if (e.organizers) {
    s.organizersFree = Math.max(0, s.organizersFree + e.organizers);
    out.notes.push(`${e.organizers > 0 ? '+' : ''}${e.organizers} organizer${Math.abs(e.organizers) === 1 ? '' : 's'}`);
  }
  if (e.awareness) {
    const ids = e.awareness.scope === 'hometown' ? [s.hometown] : e.awareness.scope === 'ctx' ? [target] : s.region.filter((id) => s.cities[id].known);
    for (const id of ids) s.cities[id].awareness = clamp(s.cities[id].awareness + e.awareness.amount * (1 - s.cities[id].awareness), 0, 1);
  }
  if (e.reveal) revealNext(s, e.reveal);
  if (e.campaign) {
    const id = e.campaign.city === 'ctx' ? target : Number(BINDERS.nextCity(s, rng));
    if (id && s.cities[id]) {
      s.cities[id].known = true;
      s.cities[id].organizers += e.campaign.organizers;
      s.cities[id].awareness = Math.max(s.cities[id].awareness, 0.03);
      out.notes.push(`Organizers sent to ${city(id).name}`);
    }
  }
  for (const id of e.join ?? []) {
    const c = s.chars[id];
    if (c && !c.present) {
      c.present = true;
      c.status = 'active';
      c.joinedDay = s.day;
      out.notes.push(`${charName(s, id, true)} joins ${s.movementName ?? 'the group'}`);
    }
  }
  for (const l of e.leave ?? []) {
    const c = s.chars[l.id];
    if (c && c.present) {
      c.present = false;
      c.status = l.as;
      s.flags[`${l.id}_${l.as}`] = s.day;
      s.chronicle.push({ day: s.day, text: `${charName(s, l.id, true)} ${l.as === 'retired' ? 'retired' : l.as === 'rival' ? 'left to start something of their own' : 'left the movement'}.` });
      out.notes.push(`${charName(s, l.id)} has ${l.as === 'retired' ? 'retired' : 'left'}`);
    }
  }
  for (const [id, r] of Object.entries(e.role ?? {})) {
    if (s.chars[id]) {
      s.chars[id].role = R(r);
      out.notes.push(`${charName(s, id)} is now ${R(r)}`);
    }
  }
  if (e.era) setEra(s, e.era);
  if (e.movementName) s.movementName = R(e.movementName);
  if (e.founderTitle) s.founderTitle = R(e.founderTitle);
  for (const f of e.followUps ?? []) {
    if (f.chance != null && !rng.chance(f.chance)) continue;
    const speaker = f.speaker === 'same' ? (s.chars[inst.speaker] ? inst.speaker : undefined) : f.speaker;
    s.scheduled.push({ card: f.card, day: s.day + f.delay, until: s.day + (f.maxDelay ?? f.delay + 10), ctx: { ...inst.ctx, mem: '' }, speaker, requires: f.requires, cancelIf: f.cancelIf, from: inst.cardId });
  }
  if (e.memory) s.chronicle.push({ day: s.day, text: R(e.memory) });
}

/**
 * Who remembers this choice, and how. Automatic rules (authored `remember` adds to them):
 * - the speaker remembers being backed or overruled when their loyalty moved by 4 or more;
 * - if you overruled the speaker while someone else gained, the speaker remembers who you favoured,
 *   and that person remembers being chosen over the speaker (and vice versa when you backed the speaker);
 * - anyone else whose loyalty moved by 8 or more remembers being passed over or favoured.
 * Weight: 1 for small moves, 2 for 10+, 3 for 18+; witnessed slights count one step heavier.
 */
function writeMemories(s: StoryState, e: Effects, inst: CardInstance, delta: Record<string, number>, quote: string, choice: 0 | 1) {
  const card = CARD_BY_ID.get(inst.cardId);
  if (!card) return;
  const setting: Setting = card.setting ?? 'private';
  const topic = card.topic ?? card.id;
  const weigh = (v: number, slight: boolean) => Math.min(3, (Math.abs(v) >= 18 ? 3 : Math.abs(v) >= 10 ? 2 : 1) + (slight && setting !== 'private' ? 1 : 0));
  const base = { topic, cardId: inst.cardId, choice, quote, setting };
  const sp = inst.speaker;
  const spv = delta[sp] ?? 0;
  const others = Object.entries(delta).filter(([id]) => id !== sp && s.chars[id]?.present);
  if (s.chars[sp] && Math.abs(spv) >= 4) {
    if (spv < 0) {
      const fav = others.filter(([, v]) => v >= 4).sort((a, b) => b[1] - a[1])[0]?.[0];
      recordMemory(s, { ...base, who: sp, kind: 'overruled', other: fav, weight: weigh(spv, true) });
      if (fav) recordMemory(s, { ...base, who: fav, kind: 'favoured', other: sp, weight: weigh(delta[fav], false) });
    } else {
      const rival = others.filter(([, v]) => v <= -4).sort((a, b) => a[1] - b[1])[0]?.[0];
      recordMemory(s, { ...base, who: sp, kind: 'backed', other: rival, weight: weigh(spv, false) });
      if (rival) recordMemory(s, { ...base, who: rival, kind: 'passed_over', other: sp, weight: weigh(delta[rival], true) });
    }
  }
  for (const [id, v] of others) {
    if (Math.abs(v) < 8) continue;
    recordMemory(s, { ...base, who: id, kind: v > 0 ? 'favoured' : 'passed_over', other: s.chars[sp] ? sp : undefined, weight: weigh(v, v < 0) });
  }
  for (const r of e.remember ?? []) {
    const who = r.who === 'speaker' ? sp : r.who === 'other' ? inst.ctx.mOtherId : r.who === 'starter' ? inst.ctx.emergentById : r.who;
    if (!who || !s.chars[who]?.present) continue;
    const other = r.other === 'speaker' ? sp : r.other === 'other' ? inst.ctx.mOtherId : r.other;
    recordMemory(s, { ...base, topic: r.topic ?? topic, who, kind: r.kind, other: other && s.chars[other] ? other : undefined, weight: r.weight ?? 2 });
  }
}

function updateCharacterStatus(s: StoryState, id: string, out: ChoiceOutcome) {
  const c = s.chars[id];
  if (c.loyalty <= -40 && s.flags[`${id}_disgruntled`] == null) {
    s.flags[`${id}_disgruntled`] = s.day;
    out.notes.push(`${charName(s, id)} is unhappy with you`);
  }
  if (c.loyalty > -20) delete s.flags[`${id}_disgruntled`];
  if (c.loyalty >= 60) s.flags[`${id}_devoted`] = s.day;
  if (c.loyalty <= -90 && c.present) {
    c.present = false;
    c.status = 'left';
    s.flags[`${id}_left`] = s.day;
    s.gauges.unity = clamp(s.gauges.unity - 8, 0, 100);
    s.chronicle.push({ day: s.day, text: `${charName(s, id, true)} walked out of ${s.movementName ?? 'the group'}, and took the good chairs.` });
    out.notes.push(`${charName(s, id)} has left the movement`);
  }
}

const CRISIS_SPEAKER: Record<string, string> = {};
function checkCrisis(s: StoryState, rng: Rng) {
  for (const g of GAUGES) {
    const v = s.gauges[g];
    if (v > 0 && v < 100) continue;
    const high = v >= 100;
    // a second extreme soon after a crisis (within the day window and the decision window) ends your leadership
    if (s.crisis && s.day - s.crisis.day <= TIME.crisisWindowDays && s.decisions - (s.crisis.decision ?? s.decisions) <= TIME.crisisWindowDecisions) {
      s.ended = endingFor(s, g, high);
      s.chronicle.push({ day: s.day, text: `${address(s)}’s leadership ended: ${s.ended.title}.` });
      return;
    }
    s.crisis = { gauge: g, high, day: s.day, decision: s.decisions };
    const id = `crisis.${g}.${high ? 'high' : 'low'}`;
    const inst = enqueue(s, id, rng, {}, CRISIS_SPEAKER[id]);
    if (inst) inst.priority = 100;
    return;
  }
}

export const ENDINGS: Record<string, { title: string; text: string }> = {
  'enthusiasm.high': { title: 'Out-believed', text: 'The members became more devoted to {movement} than {title} could ever be. At an emergency {meeting}, they concluded that {title} lacked conviction, and replaced them with someone who had never once questioned {belief}.' },
  'enthusiasm.low': { title: 'Nobody Came', text: 'One {day}, nobody came. Not {c.martin}, not {c.priya}, not even {c.gary}, whose garage it was. {title} sat alone with the soup and understood that the movement had moved on without them.' },
  'unity.high': { title: 'Total Agreement', text: 'Everyone agreed about everything, including that {title} was no longer necessary. The vote was unanimous. Nobody discussed it, because nobody ever discussed anything anymore.' },
  'unity.low': { title: 'The Split', text: '{Movement} split into four groups, each claiming to be the real one. {title} was not invited to any of them.' },
  'attention.high': { title: 'Under Investigation', text: 'Three news vans, a council inquiry and a documentary crew later, {title} agreed to “step back for a while”. The while has not ended.' },
  'attention.low': { title: 'Forgotten', text: '{Movement} became so quiet that the world forgot it existed, and then so did the members. {title} still meets on {day}s, sometimes with {c.gary}.' },
  'resources.high': { title: 'The Foundation', text: '{Movement} accumulated so much money that it became a foundation with a board, a logo and lawyers. The board thanked {title} for their service.' },
  'resources.low': { title: 'Bankrupt', text: 'The hall was repossessed, the urn was sold, and {title} was asked to return the megaphone. {Movement} survives as a group chat.' },
};

function endingFor(s: StoryState, g: Gauge, high: boolean) {
  const e = ENDINGS[`${g}.${high ? 'high' : 'low'}`];
  return { title: e.title, text: render(s, e.text), day: s.day };
}

// ------------------------------------------------------------------ time

export function renderCustomLabel(s: StoryState, id: string): string {
  const def = CUSTOM_BY_ID.get(id);
  if (!def) return id;
  const vals = s.customs[id]?.values ?? {};
  return def.label.replace(/\{value\.(\w+)\}/g, (_, k) => vals[k] ?? '…');
}

export function advanceDays(s: StoryState, days: number, report?: AwayReport) {
  const rng = rngOf(s);
  let left = days;
  while (left > 1e-9 && !s.ended) {
    const dt = Math.min(0.25, left);
    simulate(s, dt, rng, report);
    left -= dt;
  }
  s.rng = rng.state;
}

/** "Call a meeting": move time forward until someone needs you (at most two days). */
export function callMeeting(s: StoryState): number {
  const start = s.day;
  const rng = rngOf(s);
  while (!s.inbox.length && s.day - start < 2 && !s.ended) simulate(s, 0.1, rng);
  if (!s.inbox.length) {
    drawRandomCard(s, rng);
  }
  s.rng = rng.state;
  return s.day - start;
}

export function tickRealTime(s: StoryState, nowMs: number): AwayReport | null {
  const elapsed = Math.max(0, (nowMs - s.lastRealTime) / 1000);
  s.lastRealTime = nowMs;
  const days = elapsed / TIME.realSecondsPerDay;
  if (elapsed > 120) {
    const capped = Math.min(days, TIME.offlineCapDays);
    const report: AwayReport = { days: capped, newFollowers: 0, lostFollowers: 0, milestones: [], arrivals: 0, notes: [] };
    const before = Object.values(s.chars).map((c) => c.status);
    advanceDays(s, capped, report);
    if (days > capped) report.notes.push(`Progress is capped at ${TIME.offlineCapDays} days while you are away.`);
    if (Object.values(s.chars).map((c) => c.status).join() !== before.join()) report.notes.push('Someone’s status in the movement has changed.');
    s.report = report;
    return report;
  }
  advanceDays(s, days);
  return null;
}

// ------------------------------------------------------------------ persistence

export function serializeStory(s: StoryState): string {
  return JSON.stringify({ format: 'the-movement-v2', version: STORY_VERSION, state: s });
}

export function loadStory(json: string): StoryState {
  const p = JSON.parse(json);
  const s = (p?.format === 'the-movement-v2' ? p.state : p) as StoryState;
  if (!s || !s.gauges || !s.chars || !s.cities || !Array.isArray(s.inbox)) throw new Error('Not a save for this version of THE MOVEMENT.');
  for (const g of GAUGES) s.gauges[g] = clamp(Number.isFinite(Number(s.gauges[g])) ? Number(s.gauges[g]) : 50, 0, 100);
  // characters added to the content library after this save was made
  for (const c of LIBRARY.characters) {
    s.chars[c.id] ??= { present: false, status: 'absent', loyalty: c.startLoyalty, influence: c.startInfluence, role: c.role, memories: [] };
  }
  s.lastSeenAt ??= {};
  s.memory ??= [];
  s.nextMemoryId ??= 1;
  s.chains ??= { delivered: 0, expired: 0, cancelled: 0, log: [] };
  for (const x of s.scheduled ?? []) x.until ??= x.day + 10;
  s.inbox = s.inbox.filter((i) => CARD_BY_ID.has(i.cardId));
  s.scheduled = (s.scheduled ?? []).filter((x) => CARD_BY_ID.has(x.card));
  return s;
}

export function growthPerRealHour(s: StoryState): number {
  return s.stats.growthPerDay * (3600 / TIME.realSecondsPerDay);
}

/** Secondary control: send or recall an organizer for a known city. */
export function assignOrganizer(s: StoryState, cityId: number, delta: 1 | -1): boolean {
  const c = s.cities[cityId];
  if (!c || !c.known || c.milestone) return false;
  if (delta > 0) {
    if (s.organizersFree < 1) return false;
    s.organizersFree--;
    c.organizers++;
  } else {
    if (c.organizers < 1) return false;
    c.organizers--;
    s.organizersFree++;
  }
  return true;
}

/** Is anything left to ask the player in this era? Used to be honest when the written story runs out. */
export function deskStatus(s: StoryState) {
  const eligible = eligibleCards(s).length;
  const scheduled = s.scheduled.length;
  return { eligible, scheduled, exhausted: eligible === 0 && scheduled === 0 && s.inbox.length === 0 };
}

/** The text of a card as drawn (recurring cards pick one of several variants). */
export function cardText(card: CardDef, inst: { ctx: Record<string, string> }): string {
  return card.variants?.length ? card.variants[Number(inst.ctx.v ?? 0)] ?? card.text : card.text;
}
