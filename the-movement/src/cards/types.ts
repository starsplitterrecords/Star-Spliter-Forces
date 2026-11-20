// Card Edition: you lead the movement one decision at a time.
import type { Banner, Doctrine } from '../engine/types';

export type MeterKey = 'reach' | 'fervor' | 'coffers' | 'standing';
export const METERS: MeterKey[] = ['reach', 'fervor', 'coffers', 'standing'];
export type Meters = Record<MeterKey, number>;
export type Delta = Partial<Record<MeterKey, number>>;

export type Ctx = Record<string, string | number>;

export interface Leader {
  name: string;
  title: string;
  startTurn: number;
  endTurn?: number;
  ending?: string;
  endingTitle?: string;
}

export interface CardMovement {
  root: string;
  ideologyName: string;
  singular: string;
  plural: string;
  adjective: string;
  titleWord: string; // "Master"
  meeting: string; // "Hootenannies"
  meetingSingular: string;
  outpost: string;
  hqType: string;
  animal: string;
  banner: Banner;
  doctrines: Doctrine[];
  founded: boolean;
}

export interface ChoiceView {
  label: string;
  delta: Delta;
}

export interface DrawnCard {
  defId: string;
  who: string;
  text: string;
  left: ChoiceView;
  right: ChoiceView;
  ctx: Ctx;
}

export interface Faction {
  name: string;
  stance: string;
  hostile: boolean;
  since: number;
}

export interface Outcome {
  kind: 'leader' | 'victory';
  id: string;
  title: string;
  text: string;
  lostFollowers: number;
}

export interface CardGame {
  version: number;
  seed: number;
  rng: number;
  turn: number; // months since the idea
  meters: Meters;
  leader: Leader;
  leaders: Leader[]; // past leaders
  founderName: string;
  movement: CardMovement;
  flags: Record<string, number>;
  lastSeen: Record<string, number>;
  queue: { defId: string; at: number; ctx?: Ctx }[];
  converted: number;
  hqCityId: number;
  cityCount: number;
  countries: string[];
  factions: Faction[];
  chronicle: { turn: number; text: string }[];
  news: { turn: number; headline: string }[];
  current: DrawnCard | null;
  over: Outcome | null;
  victoryAt?: number;
  createdAt: number;
}
