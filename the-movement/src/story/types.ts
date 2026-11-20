// THE MOVEMENT v2: data model for the people-driven story engine.
// Content (characters, customs, cards) is authored data; StoryState is the save.

export type Gauge = 'enthusiasm' | 'unity' | 'attention' | 'resources';
export const GAUGES: Gauge[] = ['enthusiasm', 'unity', 'attention', 'resources'];

export type Agenda = 'expansion' | 'purity' | 'order' | 'joy' | 'money' | 'comfort';
export const AGENDAS: Agenda[] = ['expansion', 'purity', 'order', 'joy', 'money', 'comfort'];

export type Group = 'founders' | 'casuals' | 'enthusiasts' | 'organizers' | 'traditionalists' | 'reformers' | 'opportunists';
export const GROUPS: Group[] = ['founders', 'casuals', 'enthusiasts', 'organizers', 'traditionalists', 'reformers', 'opportunists'];

export type Era = 'founding' | 'grassroots' | 'regional' | 'national' | 'international' | 'world';
export const ERAS: Era[] = ['founding', 'grassroots', 'regional', 'national', 'international', 'world'];

export type CustomStatus = 'none' | 'proposed' | 'practice' | 'tradition' | 'sacred' | 'abandoned';
export const STATUS_ORDER: CustomStatus[] = ['none', 'abandoned', 'proposed', 'practice', 'tradition', 'sacred'];

// ------------------------------------------------------------------ authored content

export interface PortraitSpec {
  skin: string;
  hair: string;
  coat: string;
  hat?: 'none' | 'top' | 'beret' | 'cap' | 'crown' | 'hood' | 'chef' | 'helmet' | 'bun';
  glasses?: boolean;
  mustache?: boolean;
  prop?: string;
  mood?: 'smile' | 'flat' | 'worried' | 'smug';
}

export interface CharacterDef {
  id: string;
  name: string; // full name
  short: string; // how people refer to them
  role: string; // starting role
  agenda: Agenda;
  ally: Group; // member group they draw support from
  bio: string;
  competence: number; // 0..100
  startsPresent: boolean;
  startLoyalty: number;
  startInfluence: number;
  portrait: PortraitSpec;
}

export interface CustomProps {
  visibility: number;
  commitment: number;
  friction: number;
  appeal: number;
  commerce: number;
  ambiguity: number;
}

export interface CustomDef {
  id: string; // 'weekly_meeting' or 'practice.soup'
  category: 'schedule' | 'name' | 'attire' | 'greeting' | 'practice' | 'symbol' | 'rule' | 'ritual' | 'economy' | 'place';
  label: string; // shown in the customs list; may contain {value.x}
  noun?: string; // practices: "soup"
  phrase?: string; // practices: "sharing soup"
  root?: string; // practices: "Soup" (name suggestions)
  champion?: string; // character most associated with it
  props: CustomProps;
}

export type Cmp = string; // ">=10", "<0.3", "practice+", "none"

export interface Requires {
  era?: Era[];
  flags?: string[];
  notFlags?: string[];
  anyFlags?: string[];
  customs?: Record<string, Cmp>;
  chars?: Record<string, { present?: boolean; loyalty?: Cmp; influence?: Cmp; role?: string; status?: string }>;
  gauges?: Partial<Record<Gauge, Cmp>>;
  followers?: Cmp;
  day?: Cmp;
  decisions?: Cmp;
  groups?: Partial<Record<Group, Cmp>>;
  cities?: Cmp; // cities at 85%+
  known?: Cmp; // known cities
}

export interface Effects {
  gauges?: Partial<Record<Gauge, number>>;
  serves?: string[]; // agendas served ('order') or opposed ('-joy') -> loyalty
  loyalty?: Record<string, number>;
  influence?: Record<string, number>;
  groups?: Partial<Record<Group, number>>; // share of membership moved into (or out of) a group
  custom?: { id: string; status?: CustomStatus; values?: Record<string, string>; prominence?: number }[];
  flags?: string[];
  clearFlags?: string[];
  modifiers?: { stat: Stat; mult: number; days: number; label: string }[];
  followers?: number; // added to the hometown (or campaign city)
  followersPct?: number;
  organizers?: number;
  awareness?: { scope: 'hometown' | 'known' | 'ctx'; amount: number };
  reveal?: number; // discover N nearby cities
  campaign?: { city: 'ctx' | 'next'; organizers: number };
  join?: string[]; // characters who join
  leave?: { id: string; as: 'left' | 'retired' | 'rival' }[];
  role?: Record<string, string>;
  era?: Era;
  followUps?: { card: string; delay: number; chance?: number }[];
  memory?: string; // chronicle entry
  movementName?: string; // set name directly
  founderTitle?: string;
}

export type Stat = 'recruitment' | 'retention' | 'awareness' | 'campaign' | 'income' | 'reputation';

export interface ChoiceDef {
  label: string;
  hint?: string;
  reaction: string;
  input?: { target: 'movementName' | 'founderTitle' | `custom:${string}`; placeholder: string; suggest?: string };
  effects: Effects;
}

export type SpeakerRef = string | { anon: { name: string; role: string; portrait?: Partial<PortraitSpec> } };

export interface CardDef {
  id: string;
  type: 'character' | 'organization' | 'doctrine' | 'regional' | 'follower' | 'rivalry' | 'scandal' | 'plot' | 'crisis';
  speaker: SpeakerRef; // 'martin', 'agenda:expansion', 'role:treasurer', or an anonymous person
  requires?: Requires;
  bind?: Record<string, string>; // ctx binders: { city: 'nextCity', item1: 'attire' }
  text: string;
  choices: [ChoiceDef, ChoiceDef];
  weight?: number;
  cooldown?: number; // game days
  spacing?: number; // minimum decisions between appearances (default 12)
  once?: boolean;
  priority?: number; // higher jumps the queue
  followUpOnly?: boolean; // only arrives via a follow-up
}

export interface ContentLibrary {
  version: number;
  characters: CharacterDef[];
  customs: CustomDef[];
  cards: CardDef[];
}

// ------------------------------------------------------------------ runtime state

export interface CharState {
  present: boolean;
  status: 'active' | 'left' | 'retired' | 'rival' | 'absent';
  loyalty: number; // -100..100
  influence: number; // 0..100
  role: string;
  joinedDay?: number;
  memories: string[]; // short notes the UI can show ("You overruled them about Tuesdays")
}

export interface CustomState {
  status: CustomStatus;
  values: Record<string, string>;
  prominence: number;
  since: number;
  history: { day: number; status: CustomStatus; note?: string }[];
}

export interface CityState {
  id: number;
  known: boolean;
  followers: number;
  awareness: number; // 0..1
  reputation: number; // -1..1 local opinion of the movement
  organizers: number; // assigned campaign organizers
  milestone: boolean; // reached 85% once
  frac: number;
}

export interface CardInstance {
  uid: string;
  cardId: string;
  speaker: string; // character id or 'anon'
  anon?: { name: string; role: string; seed: number };
  ctx: Record<string, string>;
  arrivedDay: number;
  priority: number;
}

export interface Modifier {
  stat: Stat;
  mult: number;
  until: number;
  label: string;
}

export interface Resolved {
  cardId: string;
  day: number;
  choice: 0 | 1;
  speaker: string;
  summary: string;
}

export interface StoryState {
  version: number;
  seed: number;
  rng: number;
  day: number; // game days (float)
  lastRealTime: number;
  founder: { name: string; initial: string };
  movementName: string | null;
  founderTitle: string | null;
  era: Era;
  gauges: Record<Gauge, number>;
  chars: Record<string, CharState>;
  groups: Record<Group, number>; // member counts per group (sum = followers)
  customs: Record<string, CustomState>;
  hometown: number;
  region: number[]; // city ids in play, nearest first
  cities: Record<number, CityState>;
  organizersFree: number;
  flags: Record<string, number>;
  modifiers: Modifier[];
  inbox: CardInstance[];
  scheduled: { card: string; day: number; ctx: Record<string, string>; speaker?: string }[];
  lastSeen: Record<string, number>; // card id -> day
  lastSeenAt: Record<string, number>; // card id -> decision count when it arrived
  decisions: number;
  history: Resolved[];
  chronicle: { day: number; text: string }[];
  stats: { recruited: number; churned: number; peak: number; growthPerDay: number };
  crisis: { gauge: Gauge; high: boolean; day: number } | null;
  ended: { title: string; text: string; day: number } | null;
  nextUid: number;
  nextCardAt: number;
  report?: AwayReport;
}

export interface AwayReport {
  days: number;
  newFollowers: number;
  lostFollowers: number;
  milestones: string[];
  arrivals: number;
  notes: string[];
}

export interface ChoiceOutcome {
  reaction: string;
  gaugeDelta: Partial<Record<Gauge, number>>;
  loyalty: { id: string; delta: number }[];
  groupNotes: string[];
  notes: string[];
}
