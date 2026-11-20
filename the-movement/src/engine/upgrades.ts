// Institutional development tree.
import type { GameState, Movement } from './types';

export type Branch = 'recruitment' | 'organization' | 'communications' | 'infrastructure' | 'doctrine' | 'finance';

export interface UpgradeEffects {
  conversion?: number; // additive % (0.1 = +10%)
  awareness?: number;
  passive?: number;
  spread?: number;
  hinterland?: number;
  holdout?: number;
  slots?: number;
  outpostCap?: number;
  outpostRate?: number; // multiplier added
  cohesion?: number; // one-off
  cohesionRegen?: number;
  drift?: number; // one-off
  driftRate?: number; // multiplier added (negative slows)
  bureaucracy?: number; // one-off
  control?: number; // one-off
  enthusiasm?: number; // baseline add
  resistance?: number; // multiplier add (negative helps)
  splinter?: number; // multiplier add
  zealotChance?: number;
  candidates?: number;
  distant?: number;
  seeding?: number; // country/international seeding strength
  funds?: number; // income multiplier add
  hqLevel?: number;
  campaignTypes?: string[];
}

export interface UpgradeDef {
  id: string;
  branch: Branch;
  name: string | ((mv: Movement) => string);
  desc: string;
  cost: number; // influence
  funds?: number;
  requires: string[];
  minPhase: number;
  effects: UpgradeEffects;
  tradeoff?: string;
}

export const BRANCHES: { id: Branch; name: string; blurb: string }[] = [
  { id: 'recruitment', name: 'Recruitment', blurb: 'Higher conversion and awareness.' },
  { id: 'organization', name: 'Organization', blurb: 'More simultaneous campaigns. More committees.' },
  { id: 'communications', name: 'Communications', blurb: 'Passive spread and distant discovery.' },
  { id: 'infrastructure', name: 'Infrastructure', blurb: 'Outposts, production, stability.' },
  { id: 'doctrine', name: 'Doctrine', blurb: 'Cohesion and control, at a price.' },
  { id: 'finance', name: 'Finance & Culture', blurb: 'Movement Funds and cultural influence.' },
];

export const UPGRADES: UpgradeDef[] = [
  // Recruitment
  { id: 'r1', branch: 'recruitment', name: 'Better Pamphlets', desc: 'Now with pictures. +10% conversion.', cost: 6, requires: [], minPhase: 1, effects: { conversion: 0.1 } },
  { id: 'r2', branch: 'recruitment', name: 'Improved Slogans', desc: 'Shorter. Louder. +10% conversion, +15% awareness.', cost: 16, requires: ['r1'], minPhase: 1, effects: { conversion: 0.1, awareness: 0.15 } },
  { id: 'r3', branch: 'recruitment', name: (mv) => `More Charismatic ${mv.meetingName}`, desc: 'Unlocks the Grand gathering campaign. +10% conversion.', cost: 30, requires: ['r2'], minPhase: 2, effects: { conversion: 0.1, campaignTypes: ['grand'] } },
  { id: 'r4', branch: 'recruitment', name: 'Membership Drives', desc: '35% chance of a bonus zealot whenever a city is strategically converted.', cost: 55, requires: ['r3'], minPhase: 2, effects: { zealotChance: 0.35 } },
  { id: 'r5', branch: 'recruitment', name: 'Traveling Recruitment Teams', desc: 'Unlocks Traveling Exhibitions, which spill awareness into neighboring cities.', cost: 145, requires: ['r4'], minPhase: 3, effects: { campaignTypes: ['exhibition'], awareness: 0.1 } },
  { id: 'r6', branch: 'recruitment', name: 'Celebrity Endorsements', desc: 'Several fictional celebrities agree, loudly. +15% conversion, +20% awareness.', cost: 350, requires: ['r5'], minPhase: 4, effects: { conversion: 0.15, awareness: 0.2 } },
  { id: 'r7', branch: 'recruitment', name: 'Enthusiasm Department', desc: 'A department dedicated to feeling things. +10 enthusiasm baseline, holdouts 30% easier.', cost: 615, requires: ['r6'], minPhase: 4, effects: { enthusiasm: 10, holdout: 0.3 } },
  { id: 'r8', branch: 'recruitment', name: 'Mass Public Celebrations', desc: 'Unlocks Mass Synchronized Celebrations. +20% conversion.', cost: 1145, requires: ['r7'], minPhase: 5, effects: { conversion: 0.2, campaignTypes: ['celebration'] } },
  { id: 'r9', branch: 'recruitment', name: 'Final Outreach Initiative', desc: 'Specialists in the last unreasonable holdouts. Holdouts 120% easier.', cost: 3080, requires: ['r8'], minPhase: 6, effects: { holdout: 1.2, hinterland: 0.5 } },
  // Organization
  { id: 'o1', branch: 'organization', name: 'Volunteer Coordinators', desc: '+1 simultaneous campaign.', cost: 12, requires: [], minPhase: 1, effects: { slots: 1 } },
  { id: 'o2', branch: 'organization', name: 'Committees', desc: 'Unlocks Organizational Conventions. +5 cohesion. Bureaucracy begins.', cost: 32, requires: ['o1'], minPhase: 2, effects: { cohesion: 5, bureaucracy: 6, campaignTypes: ['convention'] } },
  { id: 'o3', branch: 'organization', name: 'Regional Management', desc: '+2 simultaneous campaigns.', cost: 120, requires: ['o2'], minPhase: 3, effects: { slots: 2, bureaucracy: 4 } },
  { id: 'o4', branch: 'organization', name: 'Standardized Meeting Procedures', desc: 'Every meeting now has minutes. +10% conversion.', cost: 210, requires: ['o3'], minPhase: 3, effects: { conversion: 0.1, bureaucracy: 6, cohesionRegen: 0.2 } },
  { id: 'o5', branch: 'organization', name: 'International Headquarters', desc: '+3 simultaneous campaigns. The headquarters expands considerably.', cost: 570, requires: ['o4'], minPhase: 4, effects: { slots: 3, hqLevel: 1, bureaucracy: 5 } },
  { id: 'o6', branch: 'organization', name: 'Central Membership Database', desc: 'Faster allocation, better records. +5 cohesion, +10% passive.', cost: 925, requires: ['o5'], minPhase: 4, effects: { cohesion: 5, passive: 0.1, bureaucracy: 6 } },
  { id: 'o7', branch: 'organization', name: 'Bureaucratic Efficiency Initiative', desc: '+2 campaigns. The initiative has its own initiative.', cost: 1540, requires: ['o6'], minPhase: 5, effects: { slots: 2, bureaucracy: 12 } },
  { id: 'o8', branch: 'organization', name: 'Office of Unnecessary Oversight', desc: '+2 campaigns, +10 cohesion, but −5% conversion while everything is reviewed.', cost: 2530, requires: ['o7'], minPhase: 5, effects: { slots: 2, cohesion: 10, conversion: -0.05, bureaucracy: 18 }, tradeoff: 'Bureaucracy rises sharply.' },
  // Communications
  { id: 'c1', branch: 'communications', name: 'Word of Mouth', desc: 'Followers mention it constantly. +20% passive conversion.', cost: 8, requires: [], minPhase: 1, effects: { passive: 0.2 } },
  { id: 'c2', branch: 'communications', name: 'Homemade Newsletters', desc: 'Photocopied with love. +20% passive, +30% awareness spread.', cost: 22, requires: ['c1'], minPhase: 2, effects: { passive: 0.2, spread: 0.3 } },
  { id: 'c3', branch: 'communications', name: 'Local Newspapers', desc: '+1 candidate city per discovery, +20% passive.', cost: 48, requires: ['c2'], minPhase: 2, effects: { candidates: 1, passive: 0.2 } },
  { id: 'c4', branch: 'communications', name: 'Radio Programming', desc: 'Awareness spreads across whole countries. +50% spread.', cost: 150, requires: ['c3'], minPhase: 3, effects: { spread: 0.5, seeding: 1 } },
  { id: 'c5', branch: 'communications', name: 'Television Specials', desc: 'Unlocks Music Events. +35% passive. Distant cities discovered more often.', cost: 420, requires: ['c4'], minPhase: 4, effects: { passive: 0.35, distant: 0.25, campaignTypes: ['music'] } },
  { id: 'c6', branch: 'communications', name: 'Online Communities', desc: 'Awareness seeds internationally. +40% hinterland spread.', cost: 725, requires: ['c5'], minPhase: 4, effects: { seeding: 2, hinterland: 0.4, spread: 0.3 } },
  { id: 'c7', branch: 'communications', name: 'Global Media Network', desc: '+50% passive, +60% hinterland spread.', cost: 1430, requires: ['c6'], minPhase: 5, effects: { passive: 0.5, hinterland: 0.6, seeding: 2 } },
  { id: 'c8', branch: 'communications', name: 'International Symposiums', desc: 'Learned panels agree with you. +100% hinterland, −10% resistance.', cost: 2420, requires: ['c7'], minPhase: 6, effects: { hinterland: 1, resistance: -0.1, passive: 0.3 } },
  // Infrastructure
  { id: 'i1', branch: 'infrastructure', name: (mv) => `First ${mv.outpostSingular}`, desc: 'Allows establishing your first outpost in a converted city of 150k+.', cost: 14, requires: [], minPhase: 2, effects: { outpostCap: 1 } },
  { id: 'i2', branch: 'infrastructure', name: 'Regional Offices', desc: '+2 outpost capacity.', cost: 95, requires: ['i1'], minPhase: 3, effects: { outpostCap: 2 } },
  { id: 'i3', branch: 'infrastructure', name: 'Ceremonial Headquarters', desc: 'The HQ gains a ceremonial wing. +5 cohesion, +5 enthusiasm.', cost: 175, requires: ['i2'], minPhase: 3, effects: { cohesion: 5, enthusiasm: 5, hqLevel: 1 } },
  { id: 'i4', branch: 'infrastructure', name: 'Monument Construction', desc: 'A monument to the founding doctrine. −8% resistance.', cost: 440, requires: ['i3'], minPhase: 4, effects: { resistance: -0.08, outpostCap: 1 } },
  { id: 'i5', branch: 'infrastructure', name: 'Major Convention Centers', desc: '+3 outpost capacity. Unlocks Cultural Festivals.', cost: 790, requires: ['i4'], minPhase: 4, effects: { outpostCap: 3, campaignTypes: ['festival'] } },
  { id: 'i6', branch: 'infrastructure', name: 'International Training Facilities', desc: 'Outposts produce zealots twice as often.', cost: 1365, requires: ['i5'], minPhase: 5, effects: { outpostRate: 1, outpostCap: 2 } },
  { id: 'i7', branch: 'infrastructure', name: 'Bureau of Important Buildings', desc: '+6 outpost capacity, +50% outpost output. The Bureau occupies most of them.', cost: 2310, requires: ['i6'], minPhase: 5, effects: { outpostCap: 6, outpostRate: 0.5, bureaucracy: 12, hqLevel: 1 } },
  // Doctrine
  { id: 'd1', branch: 'doctrine', name: 'Official Handbook', desc: '+8 cohesion. Splinter risk −10%.', cost: 12, requires: [], minPhase: 1, effects: { cohesion: 8, splinter: -0.1 } },
  { id: 'd2', branch: 'doctrine', name: 'Authorized Interpretation', desc: '+6 cohesion, −5 drift.', cost: 36, requires: ['d1'], minPhase: 2, effects: { cohesion: 6, drift: -5, control: 5 } },
  { id: 'd3', branch: 'doctrine', name: 'Ceremonial Uniform', desc: '+8 enthusiasm, +10% awareness, but +5% resistance.', cost: 60, requires: ['d2'], minPhase: 2, effects: { enthusiasm: 8, awareness: 0.1, resistance: 0.05 } },
  { id: 'd4', branch: 'doctrine', name: 'Annual Festival', desc: '+10 enthusiasm. Unlocks Cultural Festivals.', cost: 170, requires: ['d3'], minPhase: 3, effects: { enthusiasm: 10, campaignTypes: ['festival'] } },
  { id: 'd5', branch: 'doctrine', name: 'Standardized Teachings', desc: 'Drift accumulates 25% slower. +5 cohesion.', cost: 305, requires: ['d4'], minPhase: 3, effects: { driftRate: -0.25, cohesion: 5 } },
  { id: 'd6', branch: 'doctrine', name: 'Reform Council', desc: 'Doctrine can bend without breaking. Splinter risk −20%, but +5 drift.', cost: 680, requires: ['d5'], minPhase: 4, effects: { splinter: -0.2, drift: 5, cohesionRegen: 0.2 } },
  { id: 'd7', branch: 'doctrine', name: 'International Orthodoxy Commission', desc: '+15 cohesion, −15 drift, +15 control. Resentment: splinter risk +15%, resistance +5%.', cost: 1145, requires: ['d6'], minPhase: 5, effects: { cohesion: 15, drift: -15, control: 15, splinter: 0.15, resistance: 0.05, driftRate: -0.2 }, tradeoff: 'Control breeds resentment.' },
  { id: 'd8', branch: 'doctrine', name: 'Office of Correct Interpretation', desc: '+15 cohesion, −20 drift, +20 control. Splinter risk +25%.', cost: 1935, requires: ['d7'], minPhase: 5, effects: { cohesion: 15, drift: -20, control: 20, splinter: 0.25, bureaucracy: 8, driftRate: -0.2 }, tradeoff: 'Orthodoxy invites heresy.' },
  // Finance
  { id: 'f1', branch: 'finance', name: 'Merchandise Office', desc: 'Followers can buy things. +50% Movement Funds income.', cost: 50, requires: [], minPhase: 3, effects: { funds: 0.5 } },
  { id: 'f2', branch: 'finance', name: 'Licensing Department', desc: '+50% funds income, +5 drift (the brand has opinions).', cost: 200, requires: ['f1'], minPhase: 4, effects: { funds: 0.5, drift: 5 } },
  { id: 'f3', branch: 'finance', name: 'Movement Investment Fund', desc: '+100% funds income.', cost: 485, requires: ['f2'], minPhase: 4, effects: { funds: 1 } },
  { id: 'f4', branch: 'finance', name: 'Cultural Foundation', desc: '+25% passive, −10% resistance. Costs funds.', cost: 925, funds: 60000, requires: ['f3'], minPhase: 5, effects: { passive: 0.25, resistance: -0.1 } },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

export function upgradeName(u: UpgradeDef, mv: Movement): string {
  return typeof u.name === 'function' ? u.name(mv) : u.name;
}

export interface Mods {
  conversion: number;
  awareness: number;
  passive: number;
  spread: number;
  hinterland: number;
  holdout: number;
  slots: number;
  outpostCap: number;
  outpostRate: number;
  cohesionRegen: number;
  driftRate: number;
  enthusiasm: number;
  resistance: number;
  splinter: number;
  zealotChance: number;
  candidates: number;
  distant: number;
  seeding: number;
  funds: number;
  hqLevel: number;
  campaignTypes: Set<string>;
}

const modsCache = new WeakMap<string[], Mods>();
export function getMods(state: GameState): Mods {
  const hit = modsCache.get(state.upgrades);
  if (hit) return hit;
  const m: Mods = {
    conversion: 1, awareness: 1, passive: 1, spread: 1, hinterland: 1, holdout: 1, slots: 0, outpostCap: 0, outpostRate: 1,
    cohesionRegen: 0, driftRate: 1, enthusiasm: 0, resistance: 1, splinter: 1, zealotChance: 0, candidates: 0, distant: 0, seeding: 0, funds: 1, hqLevel: 0,
    campaignTypes: new Set(['grassroots']),
  };
  for (const id of state.upgrades) {
    const e = UPGRADE_BY_ID[id]?.effects;
    if (!e) continue;
    m.conversion += e.conversion ?? 0;
    m.awareness += e.awareness ?? 0;
    m.passive += e.passive ?? 0;
    m.spread += e.spread ?? 0;
    m.hinterland += e.hinterland ?? 0;
    m.holdout += e.holdout ?? 0;
    m.slots += e.slots ?? 0;
    m.outpostCap += e.outpostCap ?? 0;
    m.outpostRate += e.outpostRate ?? 0;
    m.cohesionRegen += e.cohesionRegen ?? 0;
    m.driftRate += e.driftRate ?? 0;
    m.enthusiasm += e.enthusiasm ?? 0;
    m.resistance += e.resistance ?? 0;
    m.splinter += e.splinter ?? 0;
    m.zealotChance += e.zealotChance ?? 0;
    m.candidates += e.candidates ?? 0;
    m.distant += e.distant ?? 0;
    m.seeding += e.seeding ?? 0;
    m.funds += e.funds ?? 0;
    m.hqLevel += e.hqLevel ?? 0;
    for (const t of e.campaignTypes ?? []) m.campaignTypes.add(t);
  }
  m.driftRate = Math.max(0.2, m.driftRate);
  m.resistance = Math.max(0.4, m.resistance);
  m.splinter = Math.max(0.3, m.splinter);
  modsCache.set(state.upgrades, m);
  return m;
}
