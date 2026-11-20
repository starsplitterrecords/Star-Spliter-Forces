// Centralized balancing configuration. Nothing in the UI should hard-code these values.
import type { GameMode } from './types';

export const BALANCE = {
  // conversion
  activeBaseRate: 0.03, // per second, easy small town, before modifiers
  founderPower: 1.0,
  zealotPower: 0.8,
  zealotExponent: 0.85,
  popReference: 25000,
  popDifficultyExponent: 0.42,
  passiveBaseRate: 0.0002, // per second once aware
  awarenessActiveRate: 0.16,
  awarenessSpread: 0.0012,
  hinterlandRate: 0.0002,
  holdoutStart: 0.9,
  holdoutSlope: 7.5,
  holdoutFloor: 0.12,
  resistanceImpact: 0.72,
  // thresholds
  thresholds: [0.5, 0.75, 0.85, 0.95, 0.99, 1.0],
  strategicThreshold: 0.85,
  controlLossThreshold: 0.78,
  // rewards
  zealotsAt85: 1,
  zealotsAt100: 1,
  majorCityBonusZealots: 1,
  majorCityPop: 1_000_000,
  outpostEligiblePop: 150_000,
  outpostCycleSeconds: 86_400,
  influencePer85: 6,
  influenceTrickle: 0.012,
  fundsUnlockFollowers: 250_000,
  fundsPerFollowerSecond: 0.00002,
  candidatesPerReveal: 3,
  scoutCooldown: 75,
  // campaign slots by milestone
  slotsBase: 1,
  slotsAfterFirstCities: 2, // after 2 cities controlled
  // timers
  snapshotInterval: 5,
  maxSnapshots: 720,
  spreadInterval: 5,
  factionCheckInterval: 20,
  eventIntervalBase: 55,
  firstEventDelay: 40,
  maxPendingDecisions: 3,
  offlineCapHours: 24,
  offlineStep: 20,
  // world reaction
  oppositionThresholdMin: 5,
  oppositionThresholdMax: 7,
  // splinters / cohesion
  splinterMinFollowers: 60_000,
  cohesionDecayBase: 0.004,
  // victory
  victoryConversion: 0.95,
  victoryCountryShare: 0.75,
  victoryCountryConversion: 0.5,
  victoryCohesion: 35,
  victoryStabilizeSeconds: 300,
  // rivals
  rivalMinPhase: 4,
  rivalGrowthRate: 0.0009,
} as const;

export interface ModeParams {
  label: string;
  description: string;
  conversion: number;
  resistance: number;
  eventFrequency: number;
  splinterChance: number;
  driftRate: number;
  rivalAggression: number;
  consequence: number;
}

export const MODES: Record<GameMode, ModeParams> = {
  casual: {
    label: 'Casual',
    description: 'Faster conversion, lower resistance, forgiving schisms. For relaxed world domination.',
    conversion: 1.35,
    resistance: 0.6,
    eventFrequency: 0.85,
    splinterChance: 0.5,
    driftRate: 0.7,
    rivalAggression: 0.6,
    consequence: 0.7,
  },
  standard: {
    label: 'Standard',
    description: 'The intended experience. Meaningful opposition and strategic decisions.',
    conversion: 1,
    resistance: 1,
    eventFrequency: 1,
    splinterChance: 1,
    driftRate: 1,
    rivalAggression: 1,
    consequence: 1,
  },
  chaos: {
    label: 'Chaos',
    description: 'More events, aggressive rivals, rampant doctrinal drift, dramatic consequences.',
    conversion: 1.1,
    resistance: 1.25,
    eventFrequency: 1.8,
    splinterChance: 1.8,
    driftRate: 1.8,
    rivalAggression: 1.6,
    consequence: 1.5,
  },
};

export const PHASES = [
  { n: 1, name: 'The Seed', blurb: 'A founder and a handful of converts.' },
  { n: 2, name: 'Local Curiosity', blurb: 'An eccentric local phenomenon.' },
  { n: 3, name: 'Regional Movement', blurb: 'Dozens of cities. Somebody has started a committee.' },
  { n: 4, name: 'National Phenomenon', blurb: 'Major cities, national media, internal disputes.' },
  { n: 5, name: 'International Expansion', blurb: 'Branches abroad. Regional interpretations.' },
  { n: 6, name: 'Global Institution', blurb: 'Hundreds of millions. Influence without control.' },
  { n: 7, name: 'World Domination', blurb: 'The world has to deal with the consequences.' },
];

export const REACTION_STAGES = [
  { n: 0, name: 'Indifference', blurb: 'A handful of eccentrics doing something incomprehensible.' },
  { n: 1, name: 'Amusement', blurb: 'Local media notices. Outsiders make jokes.' },
  { n: 2, name: 'Concern', blurb: 'Officials and civic groups ask questions.' },
  { n: 3, name: 'Organization', blurb: 'Opposing groups and industry associations emerge.' },
  { n: 4, name: 'Institutional Resistance', blurb: 'Investigations, restrictions, bureaucratic interference.' },
  { n: 5, name: 'International Significance', blurb: 'Economies and customs bend around the movement.' },
  { n: 6, name: 'World Transformation', blurb: 'The doctrines are now simply how things are done.' },
];

export const DEFAULT_SETTINGS = {
  speed: 1,
  eventFrequency: 1,
  aiNarrative: false,
  animation: 'full' as const,
  notifications: 'all' as const,
  autosaveSeconds: 20,
  sound: true,
  music: false,
  textScale: 1,
  highContrast: false,
  debug: false,
  offlineCapHours: BALANCE.offlineCapHours,
};

export const SCHEMA_VERSION = 3;
