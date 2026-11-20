// Deterministic simulation engine. Pure TypeScript; no React. All mutation happens on a
// GameState passed in (callers clone if they need immutability).
import { BALANCE, DEFAULT_SETTINGS, MODES, PHASES, SCHEMA_VERSION } from './config';
import { CAMPAIGN_TYPE_BY_ID, CAMPAIGN_TYPES } from './campaignTypes';
import {
  activeCampaigns,
  addEvent,
  addZealots,
  availableZealots,
  boostMult,
  campaignSlots,
  chronicle,
  clamp,
  discoverCity,
  ensureCity,
  getCountryShares,
  milestone,
  nid,
  othersTotal,
  outpostCapacity,
  revealCandidates,
  setCountryShares,
} from './core';
import { applyEffects } from './effects';
import { evaluateOpposition, eventInterval, processScheduled, runEventCheck } from './events';
import { createPrecedent, createSplinter, factionStructural, factionTick, liveFactions } from './factions';
import { CITIES, CITIES_BY_COUNTRY, COUNTRIES, COUNTRY_BY_CODE, WORLD_POPULATION, city, citiesNear, countryName, distanceKm, neighbors, populationTier } from './geo';
import { buildProfile, interpretDoctrine, moderate } from './ideology';
import { Rng } from './rng';
import { fill, fmt, makeCtx } from './text';
import type { Campaign, Doctrine, GameState, LegacyRecord, Movement, OfflineReport, Outpost, Proclamation, Settings } from './types';
import { UPGRADE_BY_ID, getMods, upgradeName } from './upgrades';
import { checkAchievements } from './achievements';
import { evaluateVictory } from './victory';

// ------------------------------------------------------------------ static helpers

const COUNTRY_MODELED_POP: Record<string, number> = {};
for (const c of CITIES) COUNTRY_MODELED_POP[c.cc] = (COUNTRY_MODELED_POP[c.cc] ?? 0) + c.pop;

export function getRng(state: GameState) {
  return new Rng(state.rng);
}

// ------------------------------------------------------------------ creation

export interface NewGameOptions {
  seed: number;
  slot?: number;
  settings?: Partial<Settings>;
  legacy?: LegacyRecord[];
  now?: number;
}

export function createEmptyState(mv: Movement, opts: NewGameOptions): GameState {
  const now = opts.now ?? Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: `g-${opts.seed.toString(36)}-${now.toString(36)}`,
    slot: opts.slot ?? 0,
    createdAt: now,
    lastRealTime: now,
    seed: opts.seed,
    rng: opts.seed,
    time: 0,
    nextId: 1,
    movement: mv,
    settings: { ...DEFAULT_SETTINGS, ...opts.settings },
    cities: {},
    touched: [],
    hinterland: {},
    hinterFrac: {},
    discovered: [],
    candidates: [],
    campaigns: {},
    zealots: { total: 0, lifetime: 0 },
    outposts: {},
    upgrades: [],
    influence: 0,
    funds: 0,
    fundsUnlocked: false,
    enthusiasm: 55,
    cohesion: 72,
    drift: 0,
    bureaucracy: 0,
    control: 70,
    committees: [],
    flags: {},
    phase: 1,
    reaction: { stage: 0, oppositionThreshold: 6, orgs: [] },
    factions: {},
    events: [],
    pendingDecisions: [],
    scheduled: [],
    boosts: [],
    cooldowns: {},
    recentHeadlines: [],
    recentCategories: [],
    proclamations: [],
    milestones: {},
    achievements: {},
    chronicle: [],
    snapshots: [],
    totals: {
      followers: 0, population: WORLD_POPULATION, cityFollowers: 0, hinterFollowers: 0, factionFollowers: 0, alignedFollowers: 0,
      citiesControlled: 0, citiesEver85: 0, countriesReached: 0, activeConversions: 0, passiveConversions: 0, defections: 0, peakFollowers: 0, avgResistance: 0,
    },
    counters: {},
    timers: { nextEventAt: BALANCE.firstEventDelay, nextSnapshotAt: 0, scoutReadyAt: 0, nextSpreadAt: 0, nextFactionCheckAt: BALANCE.factionCheckInterval, nextAchievementAt: 0 },
    victory: { achieved: false, sandbox: false },
    tutorial: { step: 0, done: false, skipped: false, seen: [] },
    legacy: opts.legacy,
  };
}

/** Three reasonably small cities near headquarters, with some variation. */
export function initializeStartingCities(state: GameState, rng: Rng): number[] {
  const hq = city(state.movement.headquarters.cityId);
  let pool: number[] = [];
  for (const [radius, maxPop] of [[250, 90_000], [450, 140_000], [900, 220_000], [2500, 400_000]] as const) {
    pool = citiesNear(hq.lat, hq.lon, radius)
      .filter((c) => c.id !== hq.id && c.pop >= 12_000 && c.pop <= maxPop)
      .map((c) => c.id);
    if (pool.length >= 5) break;
  }
  if (pool.length < 3) pool = CITIES.filter((c) => c.pop < 150_000 && c.id !== hq.id).sort((a, b) => distanceKm(hq, a) - distanceKm(hq, b)).slice(0, 12).map((c) => c.id);
  // pick a spread: easiest (smallest), a mid one, and a random one
  const sorted = [...pool].sort((a, b) => city(a).pop - city(b).pop);
  const picks = new Set<number>();
  picks.add(sorted[rng.int(0, Math.min(2, sorted.length - 1))]);
  picks.add(sorted[Math.floor(sorted.length / 2)]);
  for (let i = 0; i < 20 && picks.size < 3; i++) picks.add(rng.pick(sorted));
  const out = [...picks].slice(0, 3);
  for (const id of out) discoverCity(state, id);
  state.candidates = out;
  return out;
}

export function newGame(mv: Movement, opts: NewGameOptions): GameState {
  const state = createEmptyState(mv, opts);
  const rng = new Rng(opts.seed);
  state.reaction.oppositionThreshold = rng.int(BALANCE.oppositionThresholdMin, BALANCE.oppositionThresholdMax);
  const hq = ensureCity(state, mv.headquarters.cityId);
  hq.followers = 1; // the founder
  hq.awareness = 0.002;
  discoverCity(state, mv.headquarters.cityId);
  initializeStartingCities(state, rng);
  const hqc = city(mv.headquarters.cityId);
  chronicle(
    state,
    'founding',
    `The Founding of ${mv.ideologyName}`,
    `On this day, in ${articleish(mv.headquarters.type)} in ${hqc.name}, ${mv.founderTitle} founded ${mv.ideologyName}. Historians universally agree that civilization was never the same.`,
  );
  milestone(state, 'founded');
  if (opts.legacy?.length) createPrecedent(state, rng);
  state.rng = rng.state;
  recomputeTotals(state);
  return state;
}

function articleish(t: string) {
  return /^[aeiou]/i.test(t) ? `an ${t.toLowerCase()}` : `a ${t.toLowerCase()}`;
}

export function startingCityInfo(state: GameState, id: number) {
  const c = city(id);
  const d = state.cities[id];
  const diff = cityDifficulty(c.pop) * (1 - (d?.resistance ?? 0.05) * BALANCE.resistanceImpact);
  const label = diff > 0.85 ? 'Easy' : diff > 0.65 ? 'Moderate' : diff > 0.45 ? 'Challenging' : 'Hard';
  const hq = city(state.movement.headquarters.cityId);
  const dist = distanceKm(hq, c);
  const localMod = 1 + Math.max(0, 0.15 - dist / 3000);
  return { difficulty: label, difficultyValue: diff, modifier: localMod, reward: `${1 + (c.pop >= BALANCE.majorCityPop ? 1 : 0)} zealot at 85%, 3 new cities`, distanceKm: dist, tier: populationTier(c.pop).label };
}

export function cityDifficulty(pop: number): number {
  return Math.min(1.15, Math.pow(BALANCE.popReference / Math.max(1000, pop), BALANCE.popDifficultyExponent));
}

// ------------------------------------------------------------------ rates

export interface RateBreakdown {
  active: number;
  passive: number;
  awarenessRate: number;
  factors: { label: string; value: number }[];
}

export function campaignPower(c: Pick<Campaign, 'zealots' | 'founder'>): number {
  return (c.founder ? BALANCE.founderPower : 0) + BALANCE.zealotPower * Math.pow(c.zealots, BALANCE.zealotExponent);
}

function enthusiasmFactor(state: GameState, local = 1) {
  return (0.6 + (state.enthusiasm / 100) * 0.8) * local;
}

function holdoutFactor(conv: number, holdoutMod: number) {
  if (conv < BALANCE.holdoutStart) return 1;
  const f = Math.max(BALANCE.holdoutFloor, 1 - (conv - BALANCE.holdoutStart) * BALANCE.holdoutSlope);
  return Math.min(1, f * holdoutMod);
}

const influenceCache = new WeakMap<GameState, Map<number, number>>();
function neighborInfluence(state: GameState, id: number): number {
  let cache = influenceCache.get(state);
  if (!cache) influenceCache.set(state, (cache = new Map()));
  const hit = cache.get(id);
  if (hit != null) return hit;
  let s = 0;
  for (const n of neighbors(id)) {
    const d = state.cities[n.id];
    if (!d || !d.followers) continue;
    const conv = d.followers / city(n.id).pop;
    s += n.w * conv * (d.outpostId ? 2 : 1);
  }
  cache.set(id, s);
  return s;
}

export function calculateConversionRate(state: GameState, id: number, withFactors = true): RateBreakdown {
  const c = city(id);
  const d = state.cities[id];
  const mods = getMods(state);
  const mode = MODES[state.movement.gameMode];
  const p = state.movement.profile;
  const conv = d ? d.followers / c.pop : 0;
  const res = d ? Math.min(0.95, d.resistance + (d.resistBoost ?? 0)) : 0.05;
  const shares = getCountryShares(state);
  const factors: { label: string; value: number }[] = [];
  const push = withFactors ? (label: string, value: number) => factors.push({ label, value }) : () => 0;
  const common =
    p.conversionMult * mode.conversion * enthusiasmFactor(state, d?.enthusiasm ?? 1) * (1 - res * BALANCE.resistanceImpact) * holdoutFactor(conv, mods.holdout) * (d?.outpostId ? 1.5 : 1);
  push('Doctrine appeal', p.conversionMult);
  push('Mode', mode.conversion);
  push('Enthusiasm', enthusiasmFactor(state, d?.enthusiasm ?? 1));
  push('Resistance', 1 - res * BALANCE.resistanceImpact);
  if (conv >= BALANCE.holdoutStart) push('Holdouts', holdoutFactor(conv, mods.holdout));
  if (d?.outpostId) push('Outpost', 1.5);
  const nearby = neighborInfluence(state, id);
  let active = 0;
  if (d?.campaignId) {
    const camp = state.campaigns[d.campaignId];
    if (camp && camp.status === 'active') {
      const type = CAMPAIGN_TYPE_BY_ID[camp.type] ?? CAMPAIGN_TYPES[0];
      const aff = type.affinity(state.movement).mult;
      const bureaucracyDrag = 1 - state.bureaucracy / 400;
      active =
        BALANCE.activeBaseRate * type.power * aff * campaignPower(camp) * cityDifficulty(c.pop) * mods.conversion * common *
        boostMult(state, 'conversion', c.cc) * (1 + Math.min(0.5, nearby * 0.5)) * bureaucracyDrag;
      push(`${type.name(state.movement)}`, type.power * aff);
      push('Campaign power', campaignPower(camp));
      push('City size', cityDifficulty(c.pop));
      push('Upgrades', mods.conversion);
      if (state.bureaucracy > 0) push('Bureaucracy', bureaucracyDrag);
    }
  }
  const infl = nearby + (shares[c.cc] ?? 0) * 1.5 + (d?.outpostId ? 1 : 0) + mods.seeding * 0.05;
  const sizeFactor = Math.pow(cityDifficulty(c.pop), 0.8);
  const passive =
    BALANCE.passiveBaseRate * mods.passive * (0.4 + conv * 1.2 + Math.min(2, infl) * 0.6) * common * sizeFactor * boostMult(state, 'passive', c.cc);
  const awarenessRate = BALANCE.awarenessSpread * mods.spread * (0.3 * Math.min(4, infl) + conv * 2) * Math.sqrt(sizeFactor) * boostMult(state, 'awareness', c.cc);
  if (nearby > 0) push('Nearby adoption', 1 + Math.min(0.5, nearby * 0.5));
  return { active, passive, awarenessRate, factors };
}

// ------------------------------------------------------------------ actions

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export function unlockedCampaignTypes(state: GameState) {
  const mods = getMods(state);
  return CAMPAIGN_TYPES.filter((t) => state.phase >= t.minPhase && (!t.requiresUpgrade || mods.campaignTypes.has(t.id)));
}

export function launchCampaign(state: GameState, cityId: number, opts: { type?: string; zealots?: number; founder?: boolean } = {}): ActionResult {
  const d = state.cities[cityId];
  if (!d || !d.discovered) return { ok: false, error: 'That city has not been discovered yet.' };
  if (d.campaignId && state.campaigns[d.campaignId]?.status === 'active') return { ok: false, error: 'A campaign is already underway there.' };
  if (activeCampaigns(state).length >= campaignSlots(state)) return { ok: false, error: 'All campaign slots are in use. Unlock more through Organization upgrades.' };
  const zealots = Math.max(0, Math.floor(opts.zealots ?? 0));
  if (zealots > availableZealots(state)) return { ok: false, error: 'Not enough available zealots.' };
  const founderBusy = activeCampaigns(state).some((c) => c.founder);
  const founder = opts.founder ?? (!founderBusy && zealots === 0);
  if (founder && founderBusy) return { ok: false, error: `${state.movement.founderTitle} is already leading a campaign.` };
  if (!founder && zealots === 0) return { ok: false, error: 'Assign at least one zealot, or lead it yourself.' };
  const typeId = opts.type ?? 'grassroots';
  const type = CAMPAIGN_TYPE_BY_ID[typeId];
  if (!type || !unlockedCampaignTypes(state).includes(type)) return { ok: false, error: 'That campaign type is not available yet.' };
  if (type.founderOnly && !founder) return { ok: false, error: 'Only the founder can lead that campaign.' };
  const fundsCost = type.fundsCost;
  if (type.influenceCost > state.influence) return { ok: false, error: `Requires ${type.influenceCost} influence.` };
  if (fundsCost > 0 && (!state.fundsUnlocked || state.funds < fundsCost)) return { ok: false, error: `Requires ${fmt(fundsCost)} Movement Funds.` };
  state.influence -= type.influenceCost;
  state.funds -= fundsCost;
  const camp: Campaign = {
    id: nid(state, 'c'),
    cityId,
    type: typeId,
    zealots,
    founder,
    startedAt: state.time,
    status: 'active',
    modifiers: [],
    conversionHistory: [d.followers],
    currentRate: 0,
    gained: 0,
  };
  state.campaigns[camp.id] = camp;
  d.campaignId = camp.id;
  d.awareness = Math.max(d.awareness, 0.05);
  if (state.movement.startingCityId == null) {
    state.movement.startingCityId = cityId;
    chronicle(state, 'first-city', `The First Campaign: ${city(cityId).name}`, `${state.movement.founderTitle} personally carried the message to ${city(cityId).name}. The citizens, fortunate beyond their understanding, began to listen.`);
  }
  state.counters.campaignsLaunched = (state.counters.campaignsLaunched ?? 0) + 1;
  // keep only 'completed' history bounded
  const done = Object.values(state.campaigns).filter((c) => c.status !== 'active');
  if (done.length > 150) for (const c of done.slice(0, done.length - 150)) delete state.campaigns[c.id];
  return { ok: true, message: 'DISPATCHED!' };
}

export function allocateZealots(state: GameState, campaignId: string, delta: number): ActionResult {
  const c = state.campaigns[campaignId];
  if (!c || c.status !== 'active') return { ok: false, error: 'No such active campaign.' };
  if (delta > 0 && delta > availableZealots(state)) return { ok: false, error: 'Not enough available zealots.' };
  const next = c.zealots + delta;
  if (next < 0) return { ok: false, error: 'Cannot remove more zealots than assigned.' };
  if (next === 0 && !c.founder) return { ok: false, error: 'A campaign needs at least one zealot or the founder. End it instead.' };
  c.zealots = next;
  return { ok: true };
}

export function endCampaign(state: GameState, campaignId: string, reason: 'redeploy' | 'passive' | 'cancel' = 'redeploy'): ActionResult {
  const c = state.campaigns[campaignId];
  if (!c || c.status !== 'active') return { ok: false, error: 'No such active campaign.' };
  c.status = reason === 'cancel' ? 'cancelled' : 'completed';
  const d = state.cities[c.cityId];
  if (d && d.campaignId === c.id) d.campaignId = undefined;
  const type = CAMPAIGN_TYPE_BY_ID[c.type];
  if (type?.cohesionOnComplete && reason !== 'cancel') state.cohesion = clamp(state.cohesion + type.cohesionOnComplete);
  return { ok: true, message: reason === 'passive' ? 'The city will continue to grow on its own.' : 'Zealots are available for redeployment.' };
}

export function scout(state: GameState): ActionResult {
  if (state.time < state.timers.scoutReadyAt) return { ok: false, error: 'Scouts are still traveling.' };
  const rng = getRng(state);
  const sources = state.touched.filter((id) => state.cities[id].followers > 0);
  const from = sources.length ? rng.pick(sources) : state.movement.headquarters.cityId;
  const ids = revealCandidates(state, from, rng, 3);
  state.timers.scoutReadyAt = state.time + BALANCE.scoutCooldown;
  state.rng = rng.state;
  if (!ids.length) return { ok: false, error: 'No new cities found nearby. Try again later.' };
  return { ok: true, message: `Your message has reached ${ids.map((i) => city(i).name).join(', ')}.` };
}

export function outpostCost(state: GameState): number {
  const n = Object.keys(state.outposts).length;
  return n === 0 ? 0 : Math.round(20 * Math.pow(n, 1.35));
}

export function canEstablishOutpost(state: GameState, cityId: number): string | null {
  const d = state.cities[cityId];
  if (!d) return 'Unknown city.';
  if (d.outpostId) return 'An outpost already exists here.';
  if (!d.controlled) return 'The city must be strategically converted (85%).';
  if (city(cityId).pop < BALANCE.outpostEligiblePop) return `Only strategically important cities (${fmt(BALANCE.outpostEligiblePop)}+ people) can host one.`;
  if (Object.keys(state.outposts).length >= outpostCapacity(state)) return 'Outpost capacity reached. Build Infrastructure upgrades.';
  if (state.influence < outpostCost(state)) return `Requires ${outpostCost(state)} influence.`;
  return null;
}

export function establishOutpost(state: GameState, cityId: number): ActionResult {
  const err = canEstablishOutpost(state, cityId);
  if (err) return { ok: false, error: err };
  state.influence -= outpostCost(state);
  const o: Outpost = {
    id: nid(state, 'op'), cityId, type: 'standard', level: 1, productionRate: 1, lastProductionTime: state.time, establishedAt: state.time, produced: 0, activeModifiers: [],
  };
  state.outposts[o.id] = o;
  state.cities[cityId].outpostId = o.id;
  state.cities[cityId].infrastructure = Math.min(100, state.cities[cityId].infrastructure + 30);
  const first = milestone(state, 'firstOutpost');
  const mv = state.movement;
  if (first) chronicle(state, 'first-outpost', `The First ${mv.outpostSingular}`, `In ${city(cityId).name}, the first ${mv.outpostSingular} was consecrated. Its doors opened outward, toward the future, and also inward, for convenience.`);
  addEvent(state, { defId: 'outpost', category: 'Regional breakthrough', important: true, cityId, headline: `${mv.outpostSingular} Established in ${city(cityId).name}`, body: `The new ${mv.outpostSingular} will train a fresh zealot every 24 hours and radiate influence across the region.` });
  return { ok: true };
}

export function outpostUpgradeCost(o: Outpost): number {
  return Math.round(40 * Math.pow(o.level, 1.6));
}

export function upgradeOutpost(state: GameState, id: string, type?: Outpost['type']): ActionResult {
  const o = state.outposts[id];
  if (!o) return { ok: false, error: 'No such outpost.' };
  if (o.level >= 5) return { ok: false, error: 'Already at maximum level.' };
  const cost = outpostUpgradeCost(o);
  if (state.influence < cost) return { ok: false, error: `Requires ${cost} influence.` };
  state.influence -= cost;
  o.level += 1;
  if (type && o.type === 'standard') o.type = type;
  o.productionRate = o.level * (o.type === 'recruitment' ? 2 : 1);
  if (o.type === 'ceremonial') state.cohesion = clamp(state.cohesion + 3);
  if (o.type === 'bureaucratic') state.bureaucracy = clamp(state.bureaucracy + 3);
  return { ok: true };
}

export function upgradeAvailability(state: GameState, id: string): { ok: boolean; reason?: string } {
  const u = UPGRADE_BY_ID[id];
  if (!u) return { ok: false, reason: 'Unknown' };
  if (state.upgrades.includes(id)) return { ok: false, reason: 'Owned' };
  for (const r of u.requires) if (!state.upgrades.includes(r)) return { ok: false, reason: `Requires ${upgradeName(UPGRADE_BY_ID[r], state.movement)}` };
  if (state.phase < u.minPhase) return { ok: false, reason: `Requires phase ${u.minPhase}: ${PHASES[u.minPhase - 1].name}` };
  if (u.branch === 'finance' && !state.fundsUnlocked && u.id !== 'f1') return { ok: false, reason: 'Movement Funds not yet established' };
  if (state.influence < u.cost) return { ok: false, reason: `Requires ${u.cost} influence` };
  if (u.funds && state.funds < u.funds) return { ok: false, reason: `Requires ${fmt(u.funds)} funds` };
  return { ok: true };
}

export function unlockUpgrade(state: GameState, id: string): ActionResult {
  const av = upgradeAvailability(state, id);
  if (!av.ok) return { ok: false, error: av.reason ?? 'Unavailable' };
  const u = UPGRADE_BY_ID[id];
  state.influence -= u.cost;
  if (u.funds) state.funds -= u.funds;
  state.upgrades = [...state.upgrades, id]; // new array: invalidates mods cache
  const e = u.effects;
  if (e.cohesion) state.cohesion = clamp(state.cohesion + e.cohesion);
  if (e.drift) state.drift = clamp(state.drift + e.drift);
  if (e.bureaucracy) state.bureaucracy = clamp(state.bureaucracy + e.bureaucracy);
  if (e.control) state.control = clamp(state.control + e.control);
  if (e.enthusiasm) state.enthusiasm = clamp(state.enthusiasm + e.enthusiasm);
  if (id === 'f1' && !state.fundsUnlocked) unlockFunds(state);
  state.counters.upgrades = state.upgrades.length;
  if (u.branch === 'organization') milestone(state, 'firstOrgUpgrade');
  addEvent(state, { defId: 'upgrade', category: 'Institutional development', important: false, headline: `${upgradeName(u, state.movement)} Established`, body: u.desc });
  return { ok: true };
}

function unlockFunds(state: GameState) {
  if (state.fundsUnlocked) return;
  state.fundsUnlocked = true;
  state.funds += 5000;
  chronicle(state, 'funds', 'The Treasury Is Founded', `As the movement matured, ${state.movement.pluralFollowers} began, inevitably, to sell things. The Movement Funds were established, with an opening balance and a closing argument.`);
  addEvent(state, { defId: 'funds', category: 'Economic consequence', important: true, headline: 'Movement Treasury Established', body: 'Movement Funds are now available for festivals, celebrations and grand projects. Members have begun asking where the money goes. It goes to festivals.' });
}

// ------------------------------------------------------------------ proclamations

const PROCLAMATION_TEMPLATES: Record<Exclude<Proclamation['stance'], 'custom'>, string[]> = {
  clarify: ['All {plural} are equal.', 'The official position on {plural} remains unchanged.', 'The founder has never opposed {heresy}.', '{Noun} matters remain exactly as clear as they have always been.'],
  relax: ['{Heresy} are acceptable for recreational use but cannot replace personal {plural}.', 'Reasonable substitutes for {plural} will be tolerated on weekdays.', 'A little flexibility regarding {plural} never hurt anyone.'],
  strengthen: ['{Purism}, effective immediately.', 'There is only one correct way to {verb}, and it is ours.', 'Lapses regarding {plural} will be noted in the permanent record.'],
  reverse: ['The previous proclamation was widely misunderstood.', 'I have always supported this.'],
};

export function proclamationText(state: GameState, doctrineId: string | undefined, stance: Proclamation['stance'], idx = 0): string {
  if (stance === 'custom') return '';
  const d = state.movement.doctrines.find((x) => x.id === doctrineId) ?? state.movement.doctrines[0];
  const t = PROCLAMATION_TEMPLATES[stance];
  const ctx = makeCtx(state, { doctrine: d });
  const s = fill(t[idx % t.length], ctx);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const PROCLAMATION_COOLDOWN = 60;

export function issueProclamation(state: GameState, opts: { doctrineId?: string; stance: Proclamation['stance']; text?: string; variant?: number }): ActionResult {
  const last = state.proclamations[state.proclamations.length - 1];
  if (last && state.time - last.time < PROCLAMATION_COOLDOWN) return { ok: false, error: `The scribes are still copying the last proclamation (${Math.ceil(PROCLAMATION_COOLDOWN - (state.time - last.time))}s).` };
  const mv = state.movement;
  const d = mv.doctrines.find((x) => x.id === opts.doctrineId) ?? mv.doctrines[0];
  let text = opts.stance === 'custom' ? (opts.text ?? '').trim() : proclamationText(state, d.id, opts.stance, opts.variant ?? 0);
  if (!text) return { ok: false, error: 'A proclamation must say something.' };
  const mod = moderate(text);
  if (!mod.ok) return { ok: false, error: mod.message };
  const rng = getRng(state);
  const recent = state.proclamations.filter((p) => state.time - p.time < 600).length;
  const eff = 1 / (1 + recent * 0.5);
  const ctx = makeCtx(state, { doctrine: d });
  let outcome = '';
  let reverses: string | undefined;
  const fx: Parameters<typeof applyEffects>[1] = [];
  switch (opts.stance) {
    case 'clarify':
      fx.push({ k: 'cohesion', v: Math.round(7 * eff) }, { k: 'drift', v: -3 });
      outcome = 'The clarification is read aloud in every chapter. Most members nod.';
      if (rng.chance(0.3)) state.scheduled.push({ at: state.time + 90, effects: [{ k: 'drift', v: 4 }], headline: 'Founder Issues Clarification. Confusion Increases.', body: fill('Chapters disagree about what the clarification regarding {plural} clarified.', ctx) });
      if (rng.chance(0.2)) state.scheduled.push({ at: state.time + 150, effects: [{ k: 'spawnSplinter', doctrineId: d.id, style: 'radical', size: 0.02 }], headline: 'Clarification Resolves One Problem, Creates Two' });
      d.currentText = `${d.currentText.replace(/\s*\[Clarified:.*\]$/, '')} [Clarified: ${text}]`;
      break;
    case 'relax':
      fx.push({ k: 'doctrineAttr', doctrineId: d.id, attr: 'appeal', v: 10 }, { k: 'doctrineAttr', doctrineId: d.id, attr: 'controversy', v: -8 }, { k: 'drift', v: 6 }, { k: 'cohesion', v: -3 }, { k: 'boost', kind: 'conversion', mult: 1 + 0.15 * eff, duration: 600, label: 'Relaxed doctrine' });
      outcome = fill('Newcomers find {plural} more approachable. Traditionalists find the proclamation upsetting.', ctx);
      if (rng.chance(0.35)) state.scheduled.push({ at: state.time + 120, effects: [{ k: 'spawnSplinter', doctrineId: d.id, style: 'orthodox' }], headline: fill('Traditionalists Reject Relaxed Rules on {Plural}', ctx) });
      d.currentText = `${d.originalText.replace(/\.$/, '')}. ${text}`;
      break;
    case 'strengthen':
      fx.push({ k: 'doctrineAttr', doctrineId: d.id, attr: 'identity', v: 8 }, { k: 'doctrineAttr', doctrineId: d.id, attr: 'controversy', v: 8 }, { k: 'cohesion', v: Math.round(5 * eff) }, { k: 'control', v: 5 }, { k: 'drift', v: -5 }, { k: 'resistance', v: 0.03, scope: 'global' });
      outcome = 'Discipline improves. Outsiders find the movement slightly more alarming.';
      if (rng.chance(0.3)) state.scheduled.push({ at: state.time + 120, effects: [{ k: 'spawnSplinter', doctrineId: d.id, style: 'progressive' }], headline: fill('Reformers Object to Hard Line on {Plural}', ctx) });
      d.currentText = `${d.originalText.replace(/\.$/, '')}. ${text}`;
      break;
    case 'reverse': {
      const prev = [...state.proclamations].reverse().find((p) => p.doctrineId === d.id && p.stance !== 'reverse');
      if (!prev) return { ok: false, error: 'There is no previous proclamation on this doctrine to reverse.' };
      reverses = prev.id;
      fx.push({ k: 'drift', v: 5 }, { k: 'cohesion', v: rng.chance(0.5) ? 4 : -4 }, { k: 'control', v: -2 });
      outcome = `The proclamation “${prev.text}” is reversed. Official records now indicate it was never issued, except where it was.`;
      d.currentText = d.originalText;
      state.counters.reversals = (state.counters.reversals ?? 0) + 1;
      break;
    }
    case 'custom': {
      const probe = interpretDoctrine(text, 'principle', 'custom', 'probe');
      if (probe.attributes.appeal >= 60) fx.push({ k: 'boost', kind: 'conversion', mult: 1 + 0.1 * eff, duration: 400, label: 'Popular proclamation' });
      if (probe.attributes.controversy >= 55) fx.push({ k: 'resistance', v: 0.02, scope: 'global' }, { k: 'control', v: 3 });
      fx.push({ k: 'drift', v: 3 }, { k: 'cohesion', v: Math.round(3 * eff) });
      outcome = 'The proclamation is inscribed on a commemorative plaque. Interpretations vary.';
      d.currentText = `${d.currentText} [Per proclamation: ${text}]`;
      break;
    }
  }
  d.modificationHistory.push({ time: state.time, text: d.currentText, reason: `Proclamation (${opts.stance})` });
  const summary = applyEffects(state, fx, rng);
  mv.profile = buildProfile(mv.doctrines, mv.temperament, mv.headquarters.type, mv.meetingName);
  const p: Proclamation = { id: nid(state, 'pr'), time: state.time, doctrineId: d.id, stance: opts.stance, text, outcome, reverses };
  state.proclamations.push(p);
  const ev = addEvent(state, { defId: 'proclamation', category: 'Founder proclamation', important: true, headline: `${mv.founderTitle} Proclaims: “${text}”`, body: outcome, refs: { doctrineId: d.id } });
  ev.effectsSummary = summary;
  if (state.proclamations.length === 1) chronicle(state, 'first-proclamation', 'The First Proclamation', `${mv.founderTitle} proclaimed: “${text}” The words were received with the reverence they obviously deserved.`);
  state.rng = rng.state;
  return { ok: true, message: outcome };
}

// ------------------------------------------------------------------ simulation step

function recomputeTotals(state: GameState) {
  let cityF = 0;
  let controlled = 0;
  let factionF = 0;
  let aligned = 0;
  let resSum = 0;
  let resN = 0;
  const byCountry: Record<string, number> = {};
  const alignedIds = new Set(liveFactions(state).filter((f) => f.relationship === 'allied' || f.relationship === 'autonomous').map((f) => f.id));
  for (const id of state.touched) {
    const d = state.cities[id];
    cityF += d.followers;
    if (d.controlled) controlled++;
    const cc = city(id).cc;
    byCountry[cc] = (byCountry[cc] ?? 0) + d.followers;
    for (const k in d.others) {
      factionF += d.others[k];
      if (alignedIds.has(k)) aligned += d.others[k];
    }
    if (d.followers > 0) {
      resSum += d.resistance;
      resN++;
    }
  }
  let hinterF = 0;
  for (const cc in state.hinterland) {
    hinterF += state.hinterland[cc];
    byCountry[cc] = (byCountry[cc] ?? 0) + state.hinterland[cc];
  }
  const shares: Record<string, number> = {};
  let reached = 0;
  for (const cc in byCountry) {
    const pop = COUNTRY_BY_CODE[cc]?.population ?? 1;
    shares[cc] = byCountry[cc] / pop;
    if (byCountry[cc] >= 1) reached++;
  }
  setCountryShares(state, shares);
  const t = state.totals;
  t.cityFollowers = cityF;
  t.hinterFollowers = hinterF;
  t.followers = cityF + hinterF;
  t.factionFollowers = factionF;
  t.alignedFollowers = aligned;
  t.citiesControlled = controlled;
  t.countriesReached = reached;
  t.avgResistance = resN ? resSum / resN : 0;
  t.peakFollowers = Math.max(t.peakFollowers, t.followers);
}

function updatePhase(state: GameState) {
  const t = state.totals;
  const shares = getCountryShares(state);
  const maxShare = Math.max(0, ...Object.values(shares));
  const foreign = Object.entries(shares).filter(([cc, s]) => cc !== city(state.movement.headquarters.cityId).cc && s > 0.01).length;
  let p = 1;
  if (t.citiesEver85 >= 1) p = 2;
  if (t.citiesEver85 >= 4 || t.followers >= 100_000) p = 3;
  if (t.followers >= 600_000) p = Math.max(p, 4);
  if (p >= 4 && foreign >= 2 && t.followers >= 4_000_000) p = 5;
  if (p >= 5 && t.followers >= 150_000_000) p = 6;
  if (p >= 6 && t.followers / WORLD_POPULATION >= 0.5) p = 7;
  if (p > state.phase) {
    const old = state.phase;
    state.phase = p;
    const ph = PHASES[p - 1];
    addEvent(state, { defId: 'phase', category: 'Milestone', important: true, headline: `A New Era: ${ph.name}`, body: `${ph.blurb} The movement has outgrown phase ${old}.` });
    chronicle(state, `phase-${p}`, `The Age of ${ph.name}`, `By this time the ${state.movement.adjective} movement had become ${ph.blurb.charAt(0).toLowerCase()}${ph.blurb.slice(1)} Those who had doubted ${state.movement.founderTitle} were, by now, mostly ${state.movement.pluralFollowers}.`);
    if (p === 4) {
      milestone(state, 'nationalNews');
      addEvent(state, { defId: 'national-news', category: 'Media frenzy', important: true, headline: `They're Talking About Us: ${state.movement.ideologyName} Makes the National News`, body: `A national broadcaster in ${countryName(topCountryCode(state))} ran a four-minute segment, two minutes of which were spent trying to pronounce ${state.movement.ideologyName}.` });
    }
  }
}

function topCountryCode(state: GameState): string {
  const shares = getCountryShares(state);
  let best = city(state.movement.headquarters.cityId).cc;
  let bf = -1;
  for (const cc in shares) {
    const f = shares[cc] * (COUNTRY_BY_CODE[cc]?.population ?? 0);
    if (f > bf) {
      bf = f;
      best = cc;
    }
  }
  return best;
}

function onStrategicConversion(state: GameState, id: number, rng: Rng, offline: boolean) {
  const c = city(id);
  const mv = state.movement;
  const mods = getMods(state);
  state.totals.citiesEver85++;
  let z = BALANCE.zealotsAt85;
  if (c.pop >= BALANCE.majorCityPop) z += BALANCE.majorCityBonusZealots;
  if (rng.chance(mods.zealotChance)) z += 1;
  addZealots(state, z);
  state.influence += BALANCE.influencePer85 + Math.round(2.5 * Math.log10(Math.max(10, c.pop / 10000)) * 3);
  const firstZ = milestone(state, 'firstZealot');
  const first85 = milestone(state, 'firstCity85');
  if (first85) chronicle(state, 'first-zealot', 'The First Zealot', `When ${c.name} reached enlightenment, the first zealot stepped forward from the grateful population. ${mv.founderTitle} assigned them immediately. They have not had a day off since.`);
  void firstZ;
  if (c.pop >= BALANCE.majorCityPop && milestone(state, 'firstMajorCity')) {
    chronicle(state, 'major-city', `Breakthrough in ${c.name}`, `The great city of ${c.name} fell to reason. Historians describe the day as "a turning point", a phrase they have also applied to every other day.`);
    addEvent(state, { defId: 'regional-breakthrough', category: 'Regional breakthrough', important: true, cityId: id, headline: `Regional Breakthrough: ${c.name} Embraces ${mv.ideologyName}`, body: `With ${c.name} strategically converted, the movement's influence radiates across ${c.admin}.` });
  }
  const revealed = revealCandidates(state, id, rng);
  const camp = state.cities[id].campaignId ? state.campaigns[state.cities[id].campaignId!] : undefined;
  if (camp && camp.status === 'active') camp.reached85At = state.time;
  addEvent(state, {
    defId: 'city-85', category: 'Recruitment success', important: !offline && state.totals.citiesEver85 <= 3,
    cityId: id,
    headline: `${c.name} Reaches 85%: Strategically Converted`,
    body: `Congratulations, ${mv.founderTitle}. Your message has reached 85% of the citizens of ${c.name}. ${z === 1 ? 'One new zealot has' : `${z} new zealots have`} emerged from the grateful population.${revealed.length ? ` Your message has reached the cities of ${revealed.map((r) => city(r).name).join(', ')}.` : ''}`,
  });
}

function processCityThresholds(state: GameState, id: number, rng: Rng, offline: boolean, report?: OfflineReport) {
  const d = state.cities[id];
  const c = city(id);
  const conv = d.followers / c.pop;
  const TH = BALANCE.thresholds;
  for (let i = 0; i < TH.length; i++) {
    const t = TH[i];
    const bit = 1 << i;
    if (d.milestones & bit) continue;
    const reached = t >= 1 ? d.followers >= c.pop : conv >= t;
    if (!reached) break;
    d.milestones |= bit;
    if (t === BALANCE.strategicThreshold) {
      onStrategicConversion(state, id, rng, offline);
      report?.cities85.push(c.name);
    } else if (t >= 1) {
      addZealots(state, BALANCE.zealotsAt100);
      state.influence += 4;
      addEvent(state, { defId: 'city-100', category: 'Recruitment success', important: false, cityId: id, headline: `Every Last Citizen of ${c.name} Now a ${state.movement.singularFollower}`, body: `Complete conversion. The final holdout reportedly said, “Fine.” An additional zealot volunteers.` });
      state.counters.cities100 = (state.counters.cities100 ?? 0) + 1;
      const camp = d.campaignId ? state.campaigns[d.campaignId] : undefined;
      if (camp?.status === 'active') endCampaign(state, camp.id, 'redeploy');
    }
  }
  // control can be lost (without duplicating first-time rewards)
  if (!d.controlled && conv >= BALANCE.strategicThreshold) d.controlled = true;
  else if (d.controlled && conv < BALANCE.controlLossThreshold) {
    d.controlled = false;
    addEvent(state, { defId: 'control-lost', category: 'Follower complaint', important: c.pop >= 500_000, cityId: id, headline: `${c.name} Slips Below Strategic Control`, body: 'Defections and resistance have pushed the city below the strategic threshold. Its rewards will not be granted twice, but its pride is at stake.' });
  }
}

export function step(state: GameState, dt: number, rng: Rng, offline = false, report?: OfflineReport) {
  state.time += dt;
  const t = state.time;
  if (state.boosts.length) state.boosts = state.boosts.filter((b) => b.until > t);
  const mods = getMods(state);
  const mv = state.movement;
  const mode = MODES[mv.gameMode];
  const p = mv.profile;
  const shares = getCountryShares(state);

  // global enthusiasm drifts toward a baseline set by temperament, upgrades and cohesion
  const baseE = clamp(45 + mods.enthusiasm + (p.zeal - 1) * 30 + (state.cohesion - 50) * 0.2);
  state.enthusiasm = clamp(state.enthusiasm + (baseE - state.enthusiasm) * (1 - Math.exp(-0.004 * dt)));

  // spread & awareness seeding every few seconds
  if (t >= state.timers.nextSpreadAt) {
    state.timers.nextSpreadAt = t + BALANCE.spreadInterval;
    influenceCache.delete(state);
    spreadStep(state, rng);
  }

  const orgPressure: Record<string, number> = {};
  for (const o of state.reaction.orgs) if (!o.dissolved) orgPressure[o.homeCountry] = (orgPressure[o.homeCountry] ?? 0) + o.strength / 500;

  // cities
  const touched = state.touched;
  for (let i = 0; i < touched.length; i++) {
    const id = touched[i];
    const d = state.cities[id];
    const c = city(id);
    const others = othersTotal(d);
    const free = c.pop - others;
    const rate = calculateConversionRate(state, id, false);
    // awareness
    const campaign = d.campaignId ? state.campaigns[d.campaignId] : undefined;
    const activeCamp = campaign && campaign.status === 'active' ? campaign : undefined;
    let aRate = rate.awarenessRate;
    if (activeCamp) aRate += BALANCE.awarenessActiveRate * (CAMPAIGN_TYPE_BY_ID[activeCamp.type]?.awareness ?? 1) * mods.awareness;
    if (aRate > 0 && d.awareness < 1) {
      d.awareness += (1 - d.awareness) * (1 - Math.exp(-aRate * dt));
      if (d.awareness > 0.9999) d.awareness = 1;
    }
    // conversion
    const eligible = Math.max(0, d.awareness * free - d.followers);
    if (eligible > 0) {
      const r = rate.active + rate.passive;
      const gain = eligible * (1 - Math.exp(-r * dt)) + d.frac;
      let whole = Math.floor(gain);
      d.frac = gain - whole;
      whole = Math.min(whole, Math.max(0, free - d.followers));
      if (whole > 0) {
        d.followers += whole;
        const activeShare = r > 0 ? rate.active / r : 0;
        const a = Math.round(whole * activeShare);
        d.activeGained += a;
        d.passiveGained += whole - a;
        state.totals.activeConversions += a;
        state.totals.passiveConversions += whole - a;
        if (activeCamp) activeCamp.gained += whole;
      }
    }
    if (activeCamp) activeCamp.currentRate = rate.active;
    // resistance
    const conv = d.followers / c.pop;
    const baseRes =
      (0.04 + state.reaction.stage * 0.022 + (orgPressure[c.cc] ?? 0)) * mode.resistance * p.resistanceMult * mods.resistance * boostMult(state, 'resistance', c.cc) *
      (1 - 0.65 * conv) * (1 + Math.log10(Math.max(1, c.pop / 50000)) * 0.12);
    const typeContro = activeCamp ? (CAMPAIGN_TYPE_BY_ID[activeCamp.type]?.controversy ?? 0) : 0;
    const target = Math.min(0.9, Math.max(0, baseRes + typeContro * 3));
    d.resistance += (target - d.resistance) * (1 - Math.exp(-0.004 * dt));
    if (d.resistBoost) {
      d.resistBoost *= Math.exp(-0.003 * dt);
      if (d.resistBoost < 0.005) d.resistBoost = undefined;
    }
    if (activeCamp?.type && CAMPAIGN_TYPE_BY_ID[activeCamp.type]?.spill && rng.chance(0.05 * dt)) {
      for (const n of neighbors(id).slice(0, 4)) {
        const nd = ensureCity(state, n.id);
        nd.awareness = Math.min(1, nd.awareness + 0.02 * n.w);
      }
    }
    if (d.followers > 0 || d.milestones) processCityThresholds(state, id, rng, offline, report);
  }

  // hinterland: population outside modeled cities follows the country's urban adoption
  const hRate = BALANCE.hinterlandRate * mods.hinterland * p.conversionMult * mode.conversion;
  const urban: Record<string, number> = {};
  for (const id of touched) {
    const cc = city(id).cc;
    urban[cc] = (urban[cc] ?? 0) + state.cities[id].followers;
  }
  for (const cc in urban) {
    const co = COUNTRY_BY_CODE[cc];
    if (!co || co.hinterland <= 0) continue;
    const ratio = urban[cc] / (COUNTRY_MODELED_POP[cc] || 1);
    const targetH = co.hinterland * Math.min(1, Math.pow(ratio, 1.15));
    const h = state.hinterland[cc] ?? 0;
    const diff = targetH - h;
    if (Math.abs(diff) < 0.5 && diff <= 0) continue;
    const ch = diff * (1 - Math.exp(-hRate * (diff > 0 ? 1 : 0.5) * dt)) + (state.hinterFrac[cc] ?? 0);
    let whole = ch >= 0 ? Math.floor(ch) : Math.ceil(ch);
    state.hinterFrac[cc] = ch - whole;
    let nh = h + whole;
    if (targetH >= co.hinterland && co.hinterland - nh < 1.5 && ratio >= 1) nh = co.hinterland;
    nh = Math.max(0, Math.min(co.hinterland, nh));
    whole = nh - h;
    if (whole > 0) state.totals.passiveConversions += whole;
    state.hinterland[cc] = nh;
  }

  // campaigns: history
  // outposts: 24h production with deterministic catch-up
  const cycle = BALANCE.outpostCycleSeconds / mods.outpostRate;
  for (const oid in state.outposts) {
    const o = state.outposts[oid];
    let n = 0;
    while (t - o.lastProductionTime >= cycle && n < 50) {
      o.lastProductionTime += cycle;
      addZealots(state, o.productionRate);
      o.produced += o.productionRate;
      if (report) report.outpostZealots += o.productionRate;
      n++;
      addEvent(state, { defId: 'outpost-produce', category: 'Outpost incident', important: false, cityId: o.cityId, headline: `${mv.outpostSingular} in ${city(o.cityId).name} Graduates ${o.productionRate} Zealot${o.productionRate > 1 ? 's' : ''}`, body: 'Another cohort completes its training and awaits your instructions.' });
    }
  }

  // resources
  const F = state.totals.followers;
  state.influence += BALANCE.influenceTrickle * Math.pow(Math.log10(1 + F), 1.5) * dt;
  if (!state.fundsUnlocked && F >= BALANCE.fundsUnlockFollowers) unlockFunds(state);
  if (state.fundsUnlocked) state.funds += F * BALANCE.fundsPerFollowerSecond * (0.5 + p.commerce / 100) * mods.funds * dt;

  // cohesion, drift, control, bureaucracy
  let cohTarget = 0;
  for (const id of state.upgrades) cohTarget += UPGRADE_BY_ID[id]?.effects.cohesion ?? 0;
  const targetC = clamp(72 - 3.5 * Math.log10(1 + F) - state.drift * 0.15 + cohTarget * 0.6 + (state.control - 50) * 0.08 + mods.cohesionRegen * 20 - liveFactions(state).filter((f) => f.kind === 'splinter' && f.relationship !== 'allied' && f.relationship !== 'autonomous').length * 2);
  state.cohesion = clamp(state.cohesion + (targetC - state.cohesion) * (1 - Math.exp(-0.0015 * dt)));
  const countries = state.totals.countriesReached;
  state.drift = clamp(state.drift + mode.driftRate * mods.driftRate * 0.00003 * Math.log10(1 + F) * (1 + countries / 40) * (1 + (state.fundsUnlocked ? 0.3 : 0)) * dt);
  state.drift = clamp(state.drift - state.drift * 0.00015 * dt); // institutions slowly re-normalize
  const autonomous = liveFactions(state).filter((f) => f.relationship === 'autonomous').length;
  const targetCtl = clamp(72 - state.drift * 0.5 - autonomous * 5 + state.bureaucracy * 0.1);
  state.control = clamp(state.control + (targetCtl - state.control) * (1 - Math.exp(-0.001 * dt)));
  const targetB = Math.min(100, state.committees.length * 3 + Object.keys(state.outposts).length * 0.4 + state.upgrades.filter((u) => u.startsWith('o')).length * 2);
  if (state.bureaucracy < targetB) state.bureaucracy = Math.min(targetB, state.bureaucracy + 0.01 * dt);

  // factions
  factionTick(state, dt, rng);
  if (t >= state.timers.nextFactionCheckAt) {
    state.timers.nextFactionCheckAt = t + BALANCE.factionCheckInterval;
    factionStructural(state, rng);
    maybeSpontaneousSplinter(state, rng);
    evaluateOpposition(state, rng);
  }

  // events
  processScheduled(state, rng);
  if (t >= state.timers.nextEventAt) {
    state.timers.nextEventAt = t + eventInterval(state) * rng.range(0.7, 1.3);
    const ev = runEventCheck(state, rng, offline);
    if (ev && report && report.headlines.length < 8) report.headlines.push(ev.headline);
    if (ev && !state.milestones.firstNews) milestone(state, 'firstNews');
  }

  recomputeTotals(state);
  updatePhase(state);
  if (state.totals.followers >= 2 && milestone(state, 'firstFollower')) {
    addEvent(state, { defId: 'first-follower', category: 'Recruitment success', important: false, headline: 'The First Believer', body: `Someone other than ${mv.founderTitle} now agrees. The movement has begun.` });
  }

  // snapshots
  if (t >= state.timers.nextSnapshotAt) {
    state.timers.nextSnapshotAt = t + BALANCE.snapshotInterval;
    snapshot(state);
  }
  if (t >= state.timers.nextAchievementAt) {
    state.timers.nextAchievementAt = t + 2;
    checkAchievements(state);
    evaluateVictory(state, rng);
  }
  void shares;
}

function maybeSpontaneousSplinter(state: GameState, rng: Rng) {
  if (state.totals.followers < BALANCE.splinterMinFollowers || state.cohesion >= 55) return;
  const live = liveFactions(state).filter((f) => f.kind === 'splinter').length;
  if (live >= 6) return;
  const mode = MODES[state.movement.gameMode];
  const p = 0.03 * state.movement.profile.splinterRisk * getMods(state).splinter * mode.splinterChance * ((55 - state.cohesion) / 20);
  if (!rng.chance(p)) return;
  const d = rng.weighted(state.movement.doctrines, (x) => 5 + x.attributes.ambiguity) as Doctrine;
  applyEffects(state, [{ k: 'spawnSplinter', doctrineId: d.id, style: rng.pick(['orthodox', 'progressive', 'radical', 'regional'] as const) }], rng);
  if (milestone(state, 'firstSplinter')) {
    const f = liveFactions(state).filter((x) => x.kind === 'splinter').pop();
    if (f) chronicle(state, 'first-splinter', 'The First Schism', `Led astray by ${f.founder}, a handful of members departed to form ${f.name}, insisting that ${f.doctrineDifferences[0].replace(/\.$/, '').toLowerCase()}. History has judged them. Harshly. In footnotes.`);
  }
}

function spreadStep(state: GameState, rng: Rng) {
  const mods = getMods(state);
  const shares = getCountryShares(state);
  const n = state.touched.length;
  // neighbor seeding from strong sources
  for (let i = 0; i < n; i++) {
    const id = state.touched[i];
    const d = state.cities[id];
    const conv = d.followers / city(id).pop;
    if (conv < 0.1) continue;
    for (const nb of neighbors(id)) {
      const nd = state.cities[nb.id];
      if (nd && nd.awareness > 0) continue;
      if (rng.chance(Math.min(0.9, conv * nb.w * 0.12 * mods.spread))) {
        const x = ensureCity(state, nb.id);
        x.awareness = Math.max(x.awareness, 0.01);
      }
    }
  }
  // national seeding (radio and beyond)
  if (mods.seeding >= 1) {
    for (const cc in shares) {
      if (shares[cc] < 0.01) continue;
      const list = CITIES_BY_COUNTRY[cc];
      if (!list) continue;
      for (let k = 0; k < mods.seeding; k++) {
        const c = rng.weighted(list, (x) => Math.sqrt(x.pop));
        if (c) {
          const x = ensureCity(state, c.id);
          x.awareness = Math.min(1, x.awareness + 0.02 * mods.seeding);
        }
      }
    }
  }
  // international seeding: reach countries with no presence
  if (mods.seeding >= 2 && rng.chance(0.25 * (mods.seeding - 1))) {
    const absent = COUNTRIES.filter((co) => !(shares[co.code] > 0) && CITIES_BY_COUNTRY[co.code]?.length);
    const co = absent.length ? rng.pick(absent) : undefined;
    if (co) {
      const c = CITIES_BY_COUNTRY[co.code][0];
      const x = ensureCity(state, c.id);
      x.awareness = Math.max(x.awareness, 0.03);
    }
  }
  // auto-discovery of aware cities
  for (let i = 0; i < state.touched.length; i++) {
    const id = state.touched[i];
    const d = state.cities[id];
    if (!d.discovered && (d.awareness >= 0.25 || d.followers / city(id).pop > 0.02)) discoverCity(state, id);
  }
}

export function snapshot(state: GameState) {
  const prev = state.snapshots[state.snapshots.length - 1];
  const f = state.totals.followers;
  const dtMin = prev ? Math.max(1e-6, (state.time - prev.t) / 60) : 1;
  state.snapshots.push({
    t: state.time,
    followers: f,
    newPerMin: prev ? Math.max(0, (f - prev.followers) / dtMin) : 0,
    active: state.totals.activeConversions,
    passive: state.totals.passiveConversions,
    cities: state.totals.citiesControlled,
    zealots: state.zealots.total,
    outposts: Object.keys(state.outposts).length,
    countries: state.totals.countriesReached,
    cohesion: state.cohesion,
    resistance: state.totals.avgResistance * 100,
    rivals: state.totals.factionFollowers,
    funds: state.funds,
  });
  // logarithmic retention: thin out the older half when full
  if (state.snapshots.length > BALANCE.maxSnapshots) {
    const half = Math.floor(state.snapshots.length / 2);
    const older = state.snapshots.slice(0, half).filter((_, i) => i % 2 === 0);
    state.snapshots = older.concat(state.snapshots.slice(half));
  }
  for (const id of state.discovered) {
    const d = state.cities[id];
    d.history.push(d.followers);
    if (d.history.length > 90) d.history.splice(0, d.history.length - 90);
  }
  for (const c of activeCampaigns(state)) {
    c.conversionHistory.push(state.cities[c.cityId]?.followers ?? 0);
    if (c.conversionHistory.length > 90) c.conversionHistory.shift();
  }
}

/** Advance the simulation by `seconds` of game time with a fixed timestep. */
export function advanceSimulation(state: GameState, seconds: number, opts: { offline?: boolean; stepSize?: number; report?: OfflineReport } = {}) {
  const rng = getRng(state);
  const stepSize = opts.stepSize ?? 1;
  let remaining = seconds;
  let guard = 0;
  while (remaining > 1e-9 && guard < 2_000_000) {
    const dt = Math.min(stepSize, remaining);
    step(state, dt, rng, !!opts.offline, opts.report);
    remaining -= dt;
    guard++;
  }
  state.rng = rng.state;
}

/** Bounded offline catch-up. Decisions are deferred, never auto-selected. */
export function applyOfflineProgress(state: GameState, nowMs: number): OfflineReport | null {
  const elapsed = Math.max(0, (nowMs - state.lastRealTime) / 1000);
  state.lastRealTime = nowMs;
  if (elapsed < 30) return null;
  const capS = state.settings.offlineCapHours * 3600;
  const seconds = Math.min(elapsed, capS);
  const before = state.totals.followers;
  const z0 = state.zealots.lifetime;
  const report: OfflineReport = { seconds, newFollowers: 0, cities85: [], zealotsProduced: 0, outpostZealots: 0, headlines: [], pendingDecisions: 0, capped: elapsed > capS };
  const stepSize = Math.max(20, seconds / 300); // bounded work: at most ~300 analytic steps
  advanceSimulation(state, seconds, { offline: true, stepSize, report });
  report.newFollowers = Math.max(0, state.totals.followers - before);
  report.zealotsProduced = state.zealots.lifetime - z0;
  report.pendingDecisions = state.pendingDecisions.length;
  state.offlineReport = report;
  return report;
}

// ------------------------------------------------------------------ debug tools

export const debug = {
  addFollowers(state: GameState, cityId: number, n: number) {
    const d = ensureCity(state, cityId);
    discoverCity(state, cityId);
    const c = city(cityId);
    d.followers = Math.min(c.pop - othersTotal(d), d.followers + n);
    d.awareness = Math.max(d.awareness, Math.min(1, d.followers / c.pop + 0.1));
    recomputeTotals(state);
  },
  resistance(state: GameState, v: number) {
    for (const id of state.touched) state.cities[id].resistance = Math.min(0.95, state.cities[id].resistance + v);
  },
  splinter(state: GameState) {
    const rng = getRng(state);
    applyEffects(state, [{ k: 'spawnSplinter', style: rng.pick(['orthodox', 'progressive', 'radical', 'regional'] as const) }], rng);
    state.rng = rng.state;
  },
  zealots(state: GameState, n: number) {
    addZealots(state, n);
  },
  influence(state: GameState, n: number) {
    state.influence += n;
  },
  jumpPhase(state: GameState, phase: number) {
    // convert the largest nearby cities until the phase is plausible
    const targets = [0, 0, 1, 4, 700_000, 5_000_000, 160_000_000, WORLD_POPULATION * 0.52];
    const rng = getRng(state);
    const hq = city(state.movement.headquarters.cityId);
    const order = [...CITIES].sort((a, b) => distanceKm(hq, a) / Math.sqrt(a.pop) - distanceKm(hq, b) / Math.sqrt(b.pop));
    let i = 0;
    while (state.phase < phase && i < order.length) {
      const batch = order.slice(i, i + (phase >= 6 ? 400 : 20));
      i += batch.length;
      for (const c of batch) {
        const d = ensureCity(state, c.id);
        discoverCity(state, c.id);
        d.awareness = 1;
        d.followers = Math.floor((c.pop - othersTotal(d)) * 0.9);
      }
      for (const cc in state.hinterland) void cc;
      for (const c of batch) processCityThresholds(state, c.id, rng, true);
      // hinterland follows
      for (const c of batch) {
        const co = COUNTRY_BY_CODE[c.cc];
        if (co) state.hinterland[c.cc] = Math.max(state.hinterland[c.cc] ?? 0, Math.floor(co.hinterland * (phase >= 6 ? 0.85 : 0.2)));
      }
      recomputeTotals(state);
      updatePhase(state);
      if (state.totals.followers >= targets[phase] && state.phase >= phase) break;
    }
    state.rng = rng.state;
  },
  advance(state: GameState, seconds: number) {
    advanceSimulation(state, seconds, { stepSize: Math.max(1, seconds / 2000) });
  },
};

export { recomputeTotals, updatePhase, processCityThresholds };
