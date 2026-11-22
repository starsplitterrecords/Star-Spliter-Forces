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
  emoji: string; // their token on the map
  flavour: string; // how they do things, appended to whatever they spread ("with soup", "lying down")
  shelved?: boolean; // kept in the files, never joins
  travel: number; // how they feel about being sent away from home each week: + likes it, − misses home
  exit: string; // first-person goodbye, used in their exit scene ({exit})
  habit: string; // what they always do, in the third person ("brings soup nobody asked for"): missed when they go ({habit}, {departedHabit})
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
  emergent?: boolean; // members can start this on their own; the founder never proposes it
  startedBy?: string; // emergent: the character most likely to have started it (or a member group)
  category: 'schedule' | 'name' | 'attire' | 'greeting' | 'practice' | 'symbol' | 'rule' | 'ritual' | 'economy' | 'place';
  label: string; // shown in the customs list; may contain {value.x}
  noun?: string; // practices: "soup"
  phrase?: string; // practices: "sharing soup"
  root?: string; // practices: "Soup" (name suggestions)
  champion?: string; // character most associated with it
  props: CustomProps;
}

export type Cmp = string; // ">=10", "<0.3", "practice+", "none"

// ------------------------------------------------------------------ memory, chains, doctrine

/** What happened between you and a character, in enough detail to call it back precisely. */
export type MemoryKind =
  | 'overruled' // you went against what they asked for
  | 'backed' // you gave them what they asked for
  | 'passed_over' // you chose someone else's proposal over theirs (they were not the speaker)
  | 'favoured' // you chose their proposal over someone else's
  | 'promise' // you promised them something (see promise follow-ups)
  | 'broken_promise'
  | 'credited' // you gave them public credit
  | 'blamed' // you blamed them
  | 'vindicated' // they turned out to be right
  | 'embarrassed' // they were made to look foolish
  | 'ignored'; // they brought you a problem and you never answered

export type Setting = 'private' | 'meeting' | 'public'; // where the conversation on a card takes place

export interface MemoryRecord {
  id: number;
  who: string; // the character who remembers
  kind: MemoryKind;
  topic: string; // what it was about: an authored topic, else the card id
  cardId: string;
  choice: 0 | 1;
  quote: string; // the choice label as the player said it, rendered
  day: number;
  decision: number;
  meeting: number; // which weekly meeting it happened at (floor(day / 7))
  setting: Setting; // 'meeting' and 'public' memories were witnessed
  other?: string; // the character you sided with instead (overruled/passed_over) or against (favoured)
  weight: number; // 1 small, 2 notable, 3 unforgettable
  resolved?: boolean; // apologised for, repaid, or otherwise settled by a later card
  recalled: number; // how many times a card has called it back
  lastRecalled?: number; // day
}

/** Authored memory: who remembers what about this choice. Automatic memories are written as well. */
export interface RememberEffect {
  who: string; // 'speaker', 'other' (from the recalled memory), 'starter' (of the bound emergent custom), or a character id
  kind: MemoryKind;
  topic?: string;
  other?: string; // 'speaker' or a character id
  weight?: number;
}

/** Find the memory a card calls back. The card is only eligible when one matches. */
export interface RecallQuery {
  who?: string; // a character id, 'speaker' (the card's fixed speaker) or 'any' (default)
  exclude?: string[]; // never these characters (e.g. the speaker quoting someone else's memory)
  kind?: MemoryKind | MemoryKind[];
  topic?: string;
  witnessed?: boolean; // setting was meeting/public (true) or private (false)
  hasOther?: boolean; // only memories where you sided with someone else, who is still around
  minAgo?: number; // in meetings
  maxAgo?: number;
  minWeight?: number;
  unresolved?: boolean; // default true
}

export interface FollowUp {
  card: string;
  delay: number; // earliest arrival, in game days after the choice
  maxDelay?: number; // latest arrival; after this the punchline has expired (default delay + 10)
  chance?: number;
  requires?: Requires; // must hold when it arrives (it waits until it does, or expires)
  cancelIf?: Requires; // drop it the moment this holds: the situation that made it funny is gone
  speaker?: 'same' | string; // 'same' keeps the person who presented the original card
}

export interface ScheduledCard {
  card: string;
  day: number; // earliest
  until: number; // latest
  ctx: Record<string, string>;
  speaker?: string;
  requires?: Requires;
  cancelIf?: Requires;
  from?: string; // the card that planted it
  fromDecision?: number;
}

export type Stance = 'none' | 'endorsed' | 'tolerated' | 'reformed' | 'condemned';
export type Origin = 'founder' | 'members';

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
  memory?: RecallQuery; // at least one matching memory exists
  meetings?: Cmp; // weekly meetings held so far
}

export interface Effects {
  gauges?: Partial<Record<Gauge, number>>;
  serves?: string[]; // agendas served ('order') or opposed ('-joy') -> loyalty
  loyalty?: Record<string, number>;
  influence?: Record<string, number>;
  groups?: Partial<Record<Group, number>>; // share of membership moved into (or out of) a group
  custom?: { id: string; status?: CustomStatus; values?: Record<string, string>; prominence?: number; stance?: Stance }[];
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
  leave?: { id: string; as: 'left' | 'retired' | 'rival' }[]; // id may be 'speaker'
  rejoin?: boolean; // the character bound as ctx.departed comes back
  officialVariant?: string; // weekly mode: ctx key holding a local version of the belief to make official everywhere ('none' = the original)
  role?: Record<string, string>;
  era?: Era;
  followUps?: FollowUp[];
  remember?: RememberEffect[];
  recall?: 'resolve' | 'deepen' | 'forget'; // what happens to the memory this card called back
  stance?: Stance; // the founder's position on the emergent custom bound as ctx.emergent
  memory?: string; // chronicle entry
  speakerLoyalty?: number; // loyalty change for whoever presented the card
  speakerInfluence?: number;
  otherLoyalty?: number; // loyalty change for the other person in the recalled memory ({mOther})
  starterLoyalty?: number; // loyalty change for whoever started the bound emergent custom ({emergentBy})
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

// speaker strings: 'martin', 'any', 'agenda:x', 'role:x', 'champion:<bindKey>', 'unhappy' (a resentful co-leader), 'devoted' (a devoted one)
export type SpeakerRef = string | { anon: { name: string; role: string; portrait?: Partial<PortraitSpec> } };

export interface CardDef {
  id: string;
  type: 'character' | 'organization' | 'doctrine' | 'regional' | 'follower' | 'rivalry' | 'scandal' | 'plot' | 'crisis';
  speaker: SpeakerRef; // 'martin', 'agenda:expansion', 'role:treasurer', or an anonymous person
  notSpeaker?: string[]; // characters who must not present it (the card is about them)
  requires?: Requires;
  bind?: Record<string, string>; // ctx binders: { city: 'nextCity', item1: 'attire' }
  text: string;
  variants?: string[]; // alternative texts for recurring cards; one is picked when the card is drawn
  choices: [ChoiceDef, ChoiceDef];
  setting?: Setting; // where this conversation happens (default private): decides whether memories were witnessed
  topic?: string; // what it is about, for memories (default: the card id)
  recall?: RecallQuery; // call back a memory: fills {mQuote} {mAgo} {mWhen} {mWhere} {mOther} {mWho} {mTopic}
  shape?: Shape; // the comic structure, for editorial novelty checks
  twist?: 'right_wrong_reasons' | 'wrong_reasonable'; // a character subverting their own agenda
  weight?: number;
  cooldown?: number; // game days
  spacing?: number; // minimum decisions between appearances (default 12)
  once?: boolean;
  priority?: number; // higher jumps the queue
  followUpOnly?: boolean; // only arrives via a follow-up
  road?: boolean; // weekly mode: drawn only when the speaker has been sent to a town; {city} is that town
  shelved?: boolean; // kept for rewriting, never drawn
}

/** Comic structures. Stress testing reports how often each one appears in a playthrough. */
export const SHAPES = [
  'proposal', // someone wants a thing adopted
  'escalation', // a thing already adopted has grown out of proportion
  'literalism', // someone took words exactly as said
  'procedure', // the problem is the process itself
  'overpromise', // someone committed you to something
  'commerce', // a sacred thing meets money
  'feud', // two people or groups versus each other
  'outsider', // the world outside reacts
  'callback', // the past returns, quoted
  'vindication', // someone was right (possibly for the wrong reason)
  'backfire', // something worked, and that was the problem
  'schism', // the movement threatens to divide
  'drift', // members changed something without asking
  'logistics', // a small practical problem with absurd stakes
  'crisis',
] as const;
export type Shape = (typeof SHAPES)[number];

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
  origin?: Origin; // who established it (default founder)
  stance?: Stance; // the founder's position on a custom members started
  startedBy?: string; // character id, if a character started it
  underground?: boolean; // condemned, but still practised quietly
}

export interface RivalState {
  id: string;
  name: string;
  color: string;
  leader?: string; // a character who leads it, if any
  towns: number[];
  since: number; // week
}

export interface WeekReport {
  week: number;
  lines: { icon: string; text: string }[];
  gains?: Record<number, number>; // members gained per town this week, for the map
  income?: number; // dues collected this week
  joined: number;
  lost: number;
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
  variant?: string; // the local twist on the central belief ("with soup", "lying down", "twice")
  variantBy?: string; // character whose flavour it came from
  rival?: string; // rival group holding this town
  bloc?: string; // a named part of the map that keeps its identity ('north')
  assembly?: number; // the local assembly's level (1 Circle … 6 Capital); assemblies grow on their own
  contest?: number; // weeks your people have spent contesting a rival town
}

export interface CardInstance {
  uid: string;
  cardId: string;
  speaker: string; // character id or 'anon'
  anon?: { name: string; role: string; seed: number };
  ctx: Record<string, string>;
  arrivedDay: number;
  priority: number;
  city?: number; // weekly mode: where this problem is (pinned on the map)
  week?: number; // weekly mode: the week it turned up
}

export interface Modifier {
  stat: Stat;
  mult: number;
  until: number;
  label: string;
}

export interface Resolved {
  n?: number; // decision number
  echoes?: number; // how many later events referred back to this decision (consequential callback coverage)
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
  scheduled: ScheduledCard[];
  // weekly dispatch mode
  weekly?: boolean;
  week: number;
  assign: Record<string, number>; // unit (character id, or org:N) -> city id
  manual: Record<string, boolean>; // units the player placed by hand this week (the planner leaves them alone)
  away: Record<string, number>; // consecutive weeks each unit has been away from home
  planned?: number; // the week the rota was last drawn up
  focus?: 'spread' | 'grow' | 'rest'; // the scheduler's priority this week
  // the idle layer
  money?: number; // the treasury, in dollars: dues from members
  upgrades?: Record<string, number>; // investments by id -> level
  auto?: boolean; // Bev keeps the weeks moving on her own
  lastTick?: number; // real time (ms) the last week ended, for the automatic clock and time away
  away_report?: { weeks: number; joined: number; money: number; handled: number };
  visit?: number; // the town the founder is visiting in person this week
  handsOn?: number; // problems the founder dealt with personally this week
  rivals: Record<string, RivalState>;
  lastWeek?: WeekReport;
  memory: MemoryRecord[]; // what characters remember about you, newest last
  // which decision last wrote each piece of state, so later cards that read it can credit that decision
  provenance: { flags: Record<string, number>; customs: Record<string, number> };
  echoes: Record<number, number>; // decision number -> times a later event referred back to it
  nextMemoryId: number;
  chains: { delivered: number; expired: number; cancelled: number; log: { card: string; outcome: 'expired' | 'cancelled'; day: number }[] };
  lastSeen: Record<string, number>; // card id -> day
  lastSeenAt: Record<string, number>; // card id -> decision count when it arrived
  decisions: number;
  history: Resolved[];
  chronicle: { day: number; text: string }[];
  stats: { recruited: number; churned: number; peak: number; growthPerDay: number };
  crisis: { gauge: Gauge; high: boolean; day: number; decision?: number } | null;
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
