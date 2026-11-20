// Core typed entities for THE MOVEMENT. Everything in GameState is plain JSON
// so it can be serialized, versioned and migrated.

export type GameMode = 'casual' | 'standard' | 'chaos';

export type DoctrineCategory =
  | 'principle'
  | 'hygiene'
  | 'food'
  | 'hobby'
  | 'clothing'
  | 'music'
  | 'housing'
  | 'prohibition';

export interface DoctrineAttributes {
  visibility: number;
  difficulty: number;
  appeal: number;
  identity: number;
  controversy: number;
  ambiguity: number;
  orgCost: number;
  commerce: number;
  intensity: number;
}

/** Language hooks derived from a doctrine, used by the event/news generators. */
export interface Motif {
  key: string;
  noun: string;
  plural: string;
  verb: string; // "wear oversized hats"
  heresy: string; // a tempting adjacent substitute ("baseball caps")
  purism: string; // an orthodox hard-line reading
  radical: string; // a mind-bending reinterpretation
  industry: string;
  shortage: string;
  measure: string;
  showcase: string; // doctrine-specific campaign name
  orgNoun: string; // "Normal Hats"
  committee: string; // "Committee on Hat Compliance"
  incidents: string[]; // headline templates
  dayName?: string; // "International Hat Day"
}

export interface DoctrineModification {
  time: number;
  text: string;
  reason: string;
}

export interface Doctrine {
  id: string;
  category: DoctrineCategory;
  originalText: string;
  currentText: string;
  interpretation: string;
  attributes: DoctrineAttributes;
  motif: Motif;
  tags: string[];
  derivation: string[];
  source: 'preset' | 'custom';
  aiEnriched?: boolean;
  modificationHistory: DoctrineModification[];
}

export interface Temperament {
  /** 0 = Laughter, 100 = Tears */
  emotion: number;
  /** 0 = Love, 100 = Hate */
  social: number;
  /** 0 = Peace, 100 = War */
  conflict: number;
  /** 0 = Active, 100 = Passive */
  activity: number;
}

export interface Banner {
  primary: string;
  secondary: string;
  accent: string;
  symbol: string; // 'animal' | 'sun' | 'star' | 'eye' | 'spiral' | 'crown' | 'circle'
  shape: 'shield' | 'circle' | 'diamond' | 'pennant' | 'hexagon';
  pattern: 'solid' | 'stripe' | 'chevron' | 'quartered' | 'border';
}

export interface Headquarters {
  cityId: number;
  type: string;
  style: string;
  features: string[];
}

export interface MovementProfile {
  appeal: number; // 0..100
  controversy: number;
  visibility: number;
  ambiguity: number;
  commerce: number;
  identity: number;
  difficulty: number;
  intensity: number;
  orgCost: number;
  /** derived multipliers */
  conversionMult: number;
  resistanceMult: number;
  splinterRisk: number;
  zeal: number;
  cooperation: number;
  contradictions: string[];
}

export interface Movement {
  id: string;
  ideologyName: string; // "Hatism"
  singularFollower: string; // "Hatist"
  pluralFollowers: string; // "Hatists"
  adjective: string; // "Hatist"
  shortName: string; // "the Hatists"
  founderName: string;
  founderTitle: string; // "Master J."
  headquarters: Headquarters;
  startingCityId: number | null;
  spiritAnimal: string;
  banner: Banner;
  motto: string;
  temperament: Temperament;
  doctrines: Doctrine[];
  meetingName: string; // "Hootenannies"
  meetingSingular: string;
  outpostName: string; // "Power Circles"
  outpostSingular: string;
  proclamation: string;
  foundingDate: number; // real ms
  gameMode: GameMode;
  worldSeed: number;
  profile: MovementProfile;
}

export interface CityDyn {
  followers: number;
  awareness: number; // 0..1
  resistance: number; // 0..1
  enthusiasm: number; // 0..1.5
  infrastructure: number; // 0..100
  others: Record<string, number>; // factionId -> followers
  frac: number;
  discovered: boolean;
  discoveredAt?: number;
  milestones: number; // bitmask of first-time thresholds reached
  controlled: boolean; // currently >= 85%
  campaignId?: string;
  outpostId?: string;
  resistBoost?: number; // transient additive resistance
  history: number[]; // followers samples (every snapshot)
  events: string[];
  activeGained: number;
  passiveGained: number;
}

export type CampaignStatus = 'active' | 'completed' | 'cancelled';

export interface Campaign {
  id: string;
  cityId: number;
  type: string;
  zealots: number;
  founder: boolean;
  startedAt: number;
  status: CampaignStatus;
  modifiers: string[];
  conversionHistory: number[];
  currentRate: number;
  gained: number;
  reached85At?: number;
}

export interface Outpost {
  id: string;
  cityId: number;
  type: 'standard' | 'recruitment' | 'broadcast' | 'ceremonial' | 'bureaucratic';
  level: number;
  productionRate: number; // zealots per cycle
  lastProductionTime: number; // sim seconds
  establishedAt: number;
  produced: number;
  activeModifiers: string[];
}

export type FactionKind = 'splinter' | 'rival' | 'precedent';
export type FactionRelation =
  | 'hostile'
  | 'rival'
  | 'neutral'
  | 'negotiating'
  | 'allied'
  | 'autonomous'
  | 'merged'
  | 'dissolved';

export interface Faction {
  id: string;
  kind: FactionKind;
  name: string;
  members: string; // "Orthodox Hatists"
  founder: string;
  doctrineDifferences: string[];
  doctrineId?: string;
  customs: string[];
  color: string;
  hqCityId: number;
  locations: number[]; // city ids where present
  followerCount: number;
  growthRate: number;
  relationship: FactionRelation;
  disagreement: number; // 0..100
  cohesion: number;
  createdAt: number;
  history: string[]; // event ids
  originEventId?: string;
  style?: 'orthodox' | 'progressive' | 'radical' | 'regional';
}

export interface OppositionOrg {
  id: string;
  name: string;
  tactic: 'petitions' | 'investigations' | 'counter-events' | 'regulations' | 'media';
  homeCountry: string;
  strength: number; // 0..100
  createdAt: number;
  backfires: number;
  dissolved?: boolean;
  motifKey?: string;
}

export type Effect =
  | { k: 'cohesion'; v: number }
  | { k: 'drift'; v: number }
  | { k: 'bureaucracy'; v: number }
  | { k: 'control'; v: number }
  | { k: 'enthusiasm'; v: number }
  | { k: 'zealots'; v: number }
  | { k: 'influence'; v: number }
  | { k: 'funds'; v: number }
  | { k: 'resistance'; v: number; scope: 'city' | 'country' | 'global'; target?: number | string }
  | { k: 'awareness'; v: number; scope: 'city' | 'country' | 'global'; target?: number | string }
  | { k: 'followers'; pct: number; scope: 'city' | 'country' | 'global'; target?: number | string }
  | { k: 'boost'; kind: 'conversion' | 'passive' | 'awareness' | 'resistance'; mult: number; duration: number; scope?: string; label: string }
  | { k: 'spawnSplinter'; doctrineId?: string; style: 'orthodox' | 'progressive' | 'radical' | 'regional'; cityId?: number; size?: number }
  | { k: 'faction'; factionId: string; relation?: FactionRelation; disagreement?: number; transferPct?: number }
  | { k: 'doctrineText'; doctrineId: string; text: string; reason: string }
  | { k: 'doctrineAttr'; doctrineId: string; attr: keyof DoctrineAttributes; v: number }
  | { k: 'discover'; n: number; distant?: boolean }
  | { k: 'org'; orgId: string; v: number }
  | { k: 'committee'; name: string }
  | { k: 'flag'; name: string }
  | { k: 'news'; headline: string; body?: string };

export interface EventChoice {
  label: string;
  description: string;
  effects: Effect[];
  delayed?: { delay: number; effects: Effect[]; headline: string; body?: string }[];
  outcome: string;
  hint?: string;
}

export interface GameEvent {
  id: string;
  defId: string;
  category: string;
  time: number;
  realTime: number;
  cityId?: number;
  country?: string;
  headline: string;
  body: string;
  quote?: string;
  choices?: EventChoice[];
  choiceSelected?: number;
  resolvedAt?: number;
  effectsSummary: string[];
  important: boolean;
  refs: { factionId?: string; orgId?: string; doctrineId?: string; eventId?: string };
  aiEnhanced?: boolean;
  offline?: boolean;
}

export interface ScheduledEffect {
  at: number;
  effects: Effect[];
  headline: string;
  body?: string;
  sourceEventId?: string;
}

export interface Boost {
  id: string;
  kind: 'conversion' | 'passive' | 'awareness' | 'resistance';
  mult: number;
  until: number;
  scope?: string; // country code
  label: string;
}

export interface Proclamation {
  id: string;
  time: number;
  doctrineId?: string;
  stance: 'clarify' | 'relax' | 'strengthen' | 'reverse' | 'custom';
  text: string;
  outcome: string;
  reverses?: string;
}

export interface HistoricalSnapshot {
  t: number; // sim seconds
  followers: number;
  newPerMin: number;
  active: number; // cumulative active conversions
  passive: number; // cumulative passive conversions
  cities: number; // cities >= 85%
  zealots: number;
  outposts: number;
  countries: number;
  cohesion: number;
  resistance: number; // avg 0..100
  rivals: number; // followers of rivals + splinters
  funds: number;
}

export interface ChronicleEntry {
  time: number;
  realTime: number;
  key: string;
  title: string;
  text: string;
}

export interface Settings {
  speed: number;
  eventFrequency: number; // multiplier 0.5..2
  aiNarrative: boolean;
  animation: 'full' | 'reduced' | 'none';
  notifications: 'all' | 'important' | 'minimal';
  autosaveSeconds: number;
  sound: boolean;
  music: boolean;
  textScale: number;
  highContrast: boolean;
  debug: boolean;
  offlineCapHours: number;
}

export interface LegacyRecord {
  ideologyName: string;
  pluralFollowers: string;
  founderTitle: string;
  ending: string;
  doctrines: string[];
  completedAt: number;
}

export interface GameState {
  schemaVersion: number;
  id: string;
  slot: number;
  createdAt: number;
  lastRealTime: number;
  seed: number;
  rng: number;
  time: number;
  nextId: number;
  movement: Movement;
  settings: Settings;
  cities: Record<number, CityDyn>;
  touched: number[];
  hinterland: Record<string, number>;
  hinterFrac: Record<string, number>;
  discovered: number[];
  candidates: number[];
  campaigns: Record<string, Campaign>;
  zealots: { total: number; lifetime: number };
  outposts: Record<string, Outpost>;
  upgrades: string[];
  influence: number;
  funds: number;
  fundsUnlocked: boolean;
  enthusiasm: number; // 0..100
  cohesion: number; // 0..100
  drift: number; // 0..100
  bureaucracy: number; // 0..100
  control: number; // founder control 0..100
  committees: string[];
  flags: Record<string, number>;
  phase: number; // 1..7
  reaction: { stage: number; oppositionThreshold: number; orgs: OppositionOrg[] };
  factions: Record<string, Faction>;
  events: GameEvent[];
  pendingDecisions: string[];
  scheduled: ScheduledEffect[];
  boosts: Boost[];
  cooldowns: Record<string, number>;
  recentHeadlines: string[];
  recentCategories: string[];
  proclamations: Proclamation[];
  milestones: Record<string, number>;
  achievements: Record<string, number>;
  chronicle: ChronicleEntry[];
  snapshots: HistoricalSnapshot[];
  totals: {
    followers: number;
    population: number;
    cityFollowers: number;
    hinterFollowers: number;
    factionFollowers: number;
    alignedFollowers: number;
    citiesControlled: number;
    citiesEver85: number;
    countriesReached: number;
    activeConversions: number;
    passiveConversions: number;
    defections: number;
    peakFollowers: number;
    avgResistance: number;
  };
  counters: Record<string, number>;
  timers: { nextEventAt: number; nextSnapshotAt: number; scoutReadyAt: number; nextSpreadAt: number; nextFactionCheckAt: number; nextAchievementAt: number };
  victory: { achieved: boolean; at?: number; ending?: string; endingText?: string; stabilizingSince?: number; absoluteAt?: number; sandbox: boolean };
  tutorial: { step: number; done: boolean; skipped: boolean; seen: string[] };
  legacy?: LegacyRecord[];
  offlineReport?: OfflineReport;
}

export interface OfflineReport {
  seconds: number;
  newFollowers: number;
  cities85: string[];
  zealotsProduced: number;
  outpostZealots: number;
  headlines: string[];
  pendingDecisions: number;
  capped: boolean;
}

/** Static city record from the bundled dataset. */
export interface CityStatic {
  id: number;
  name: string;
  admin: string;
  cc: string;
  lat: number;
  lon: number;
  pop: number;
  hub: number;
  idx: number;
}

export interface CountryStatic {
  code: string;
  name: string;
  continent: string;
  region: string;
  population: number;
  hinterland: number;
  mapId: string | null;
}
