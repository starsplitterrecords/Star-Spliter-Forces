// Ideology Interpretation Engine: turns free-form founding choices into a structured,
// numerically meaningful model. Rule-based and transparent: every attribute records
// the reasons that contributed to it (Doctrine.derivation).
import { findMotif, genericMotif } from '../content/motifs';
import type {
  Banner,
  Doctrine,
  DoctrineAttributes,
  DoctrineCategory,
  GameMode,
  Headquarters,
  Movement,
  MovementProfile,
  Temperament,
} from './types';
import { hashString } from './rng';

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------- names

export function ideologyRoot(input: string): string {
  let s = input.trim().replace(/[^\p{L}\p{N}\s'-]/gu, '').replace(/\s+/g, '');
  s = s.replace(/isms?$/i, '');
  if (!s) s = 'Thing';
  return cap(s);
}

export function deriveNames(input: string) {
  const root = ideologyRoot(input);
  // drop a trailing 'y' -> 'i' (Tuesdayism keeps the y), drop doubled vowels softly
  const base = /[aeiou]$/i.test(root) && !/e$/i.test(root) ? root : root;
  return {
    ideologyName: `${base}ism`,
    singularFollower: `${base}ist`,
    pluralFollowers: `${base}ists`,
    adjective: `${base}ist`,
    shortName: `the ${base}ists`,
  };
}

export function founderInitial(name: string): string {
  const t = name.trim();
  return t ? t[0].toUpperCase() : 'X';
}

export function defaultFounderTitle(name: string, title = 'Master'): string {
  if (title === 'The Magnificent') return `${name.trim() || 'Founder'} the Magnificent`;
  return `${title} ${founderInitial(name)}.`;
}

// ---------------------------------------------------------------- moderation

const BLOCK: { re: RegExp; reason: string }[] = [
  { re: /\b(nazi\w*|third reich|kkk|ku klux|isis|al[- ]?qaeda|taliban|white (power|supremac\w*)|aryan|neo-?nazi|fascis\w*)\b/i, reason: 'real extremist organizations' },
  { re: /\b(genocid\w*|ethnic cleansing|extermin\w*|massacre\w*|lynch\w*|terroris\w*|bomb\w*|shoot\w*|murder\w*|kill\w*|stab\w*|rape\w*|enslav\w*|behead\w*|torture\w*)\b/i, reason: 'violence' },
  { re: /\b(hate|ban|deport|eliminate|purge|inferior|subhuman|vermin)\b.*\b(jews?|jewish|muslims?|christians?|hindus?|sikhs?|blacks?|whites?|asians?|latinos?|gays?|lesbians?|trans\w*|immigrants?|refugees?|women|men|disabled|arabs?|africans?|mexicans?)\b/i, reason: 'targeting real groups' },
  { re: /\b(jews?|jewish|muslims?|christians?|blacks?|whites?|asians?|gays?|trans\w*|immigrants?|refugees?|women)\b.*\b(are|is)\b.*\b(inferior|evil|vermin|subhuman|dangerous|criminals?)\b/i, reason: 'targeting real groups' },
  { re: /\b(islam\w*|catholic\w*|protestant\w*|judaism|hinduism|buddhis\w*|scientolog\w*|mormon\w*|evangelical\w*|christianity)\b/i, reason: 'real-world religious institutions' },
  { re: /\b(democrats?|republicans?|labour party|tory|tories|communist party|maga|gop|ccp|bjp|likud)\b/i, reason: 'contemporary political parties' },
  { re: /\b(suicide|self[- ]harm|overdose)\b/i, reason: 'self-harm' },
];

const REJECTIONS = [
  'The Committee on Acceptable Absurdity has rejected this doctrine. Please submit a less catastrophic proposal.',
  'The Office of Correct Interpretation regrets that this proposal exceeds the movement\'s tolerance for actual harm. Try something sillier.',
  'Your loyal scribes have refused to write this down. Perhaps something involving hats?',
];

export function moderate(text: string): { ok: true } | { ok: false; message: string; reason: string } {
  for (const b of BLOCK) {
    if (b.re.test(text)) {
      return { ok: false, reason: b.reason, message: REJECTIONS[hashString(text) % REJECTIONS.length] };
    }
  }
  return { ok: true };
}

// ---------------------------------------------------------------- doctrine interpretation

const CATEGORY_BASE: Record<DoctrineCategory, DoctrineAttributes> = {
  principle: { visibility: 40, difficulty: 35, appeal: 60, identity: 55, controversy: 35, ambiguity: 70, orgCost: 30, commerce: 35, intensity: 40 },
  hygiene: { visibility: 25, difficulty: 50, appeal: 40, identity: 45, controversy: 55, ambiguity: 35, orgCost: 20, commerce: 45, intensity: 45 },
  food: { visibility: 35, difficulty: 40, appeal: 70, identity: 55, controversy: 30, ambiguity: 50, orgCost: 40, commerce: 70, intensity: 55 },
  hobby: { visibility: 55, difficulty: 45, appeal: 65, identity: 65, controversy: 25, ambiguity: 45, orgCost: 45, commerce: 55, intensity: 75 },
  clothing: { visibility: 85, difficulty: 45, appeal: 55, identity: 80, controversy: 45, ambiguity: 55, orgCost: 40, commerce: 75, intensity: 50 },
  music: { visibility: 55, difficulty: 25, appeal: 68, identity: 70, controversy: 40, ambiguity: 50, orgCost: 35, commerce: 60, intensity: 60 },
  housing: { visibility: 70, difficulty: 75, appeal: 45, identity: 75, controversy: 45, ambiguity: 55, orgCost: 75, commerce: 60, intensity: 50 },
  prohibition: { visibility: 35, difficulty: 55, appeal: 35, identity: 60, controversy: 60, ambiguity: 50, orgCost: 30, commerce: 25, intensity: 40 },
};

const TEXT_RULES: { re: RegExp; attr: Partial<DoctrineAttributes>; why: string }[] = [
  { re: /\b(always|every|all|mandatory|must|exclusively|only)\b/i, attr: { difficulty: 10, identity: 8, controversy: 6 }, why: 'absolute language (+difficulty, +identity)' },
  { re: /\b(never|no|ban|forbid\w*|prohibit\w*|without)\b/i, attr: { controversy: 12, appeal: -6, identity: 6 }, why: 'prohibitive phrasing (+controversy)' },
  { re: /\b(daily|every day|twice|per day|each day|hourly)\b/i, attr: { intensity: 15, difficulty: 10 }, why: 'frequency requirement (+intensity)' },
  { re: /\b(once a week|weekly|on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?|weekends?)\b/i, attr: { intensity: -5, difficulty: -5, ambiguity: -6 }, why: 'scheduled observance (-ambiguity)' },
  { re: /\b(precisely|exactly|\d+)\b/i, attr: { ambiguity: -15, difficulty: 8, orgCost: 8 }, why: 'precise quantity (-ambiguity, +compliance burden)' },
  { re: /\b(enjoy|love|fun|joy|happ\w*|celebrat\w*|deserve\w*|party)\b/i, attr: { appeal: 12, controversy: -6 }, why: 'joyful framing (+appeal)' },
  { re: /\b(superior|better|best|wrong|troubling|foolish|correct)\b/i, attr: { controversy: 10, identity: 6 }, why: 'comparative claim (+controversy)' },
  { re: /\b(wisdom|truth|soul|spirit|enlighten\w*|sacred|holy)\b/i, attr: { ambiguity: 12, identity: 6 }, why: 'mystical vocabulary (+ambiguity)' },
  { re: /\b(oversized|enormous|giant|tall|huge|elaborate|grand)\b/i, attr: { visibility: 10, orgCost: 6, commerce: 6 }, why: 'conspicuous scale (+visibility)' },
  { re: /\b(build|make|construct|collect|create|perfect|practice)\b/i, attr: { intensity: 10, commerce: 6 }, why: 'participatory activity (+intensity)' },
];

const INTERPRETATIONS: Record<DoctrineCategory, string[]> = {
  principle: ['A foundational truth, obvious to anyone who has thought about it for under a minute.', 'A principle so self-evident it required writing down.'],
  hygiene: ['A personal discipline that members will observe privately and discuss publicly.', 'A hygiene standard that will be enforced by mutual inspection.'],
  food: ['A dietary practice expected to unite members at every meal.', 'A culinary covenant with significant implications for the catering budget.'],
  hobby: ['A shared pastime elevated to the status of sacred duty.', 'A recreational practice that is no longer optional.'],
  clothing: ['A dress code ensuring members are recognizable from a considerable distance.', 'Attire that communicates commitment before a word is spoken.'],
  music: ['The official soundtrack of the inevitable future.', 'The only acceptable acoustic environment.'],
  housing: ['The correct way to dwell. All other dwellings are temporary misunderstandings.', 'An architectural doctrine with strong opinions about zoning.'],
  prohibition: ['A firm refusal. Its absence is felt everywhere.', 'A prohibition that will generate surprisingly specific debates.'],
};

let doctrineCounter = 0;
export function interpretDoctrine(text: string, category: DoctrineCategory, source: 'preset' | 'custom' = 'custom', id?: string): Doctrine {
  const clean = text.trim().replace(/\s+/g, ' ');
  const motifDef = findMotif(clean);
  const attr: DoctrineAttributes = { ...CATEGORY_BASE[category] };
  const derivation: string[] = [`base attributes for category "${category}"`];
  let motif;
  if (motifDef) {
    const { match: _m, category: _c, attr: mAttr, ...rest } = motifDef;
    motif = rest;
    for (const [k, v] of Object.entries(mAttr)) {
      // blend motif values with the category baseline
      const key = k as keyof DoctrineAttributes;
      attr[key] = Math.round((attr[key] + (v as number)) / 2);
    }
    derivation.push(`recognized motif "${motifDef.key}" (blended attributes: ${Object.keys(mAttr).join(', ')})`);
  } else {
    motif = genericMotif(clean);
    derivation.push(`no known motif; generic motif built from key noun "${motif.noun}"`);
  }
  for (const r of TEXT_RULES) {
    if (r.re.test(clean)) {
      for (const [k, v] of Object.entries(r.attr)) attr[k as keyof DoctrineAttributes] += v as number;
      derivation.push(r.why);
    }
  }
  // length: longer doctrines are more open to interpretation
  if (clean.length > 70) {
    attr.ambiguity += 8;
    derivation.push('long phrasing (+ambiguity)');
  }
  for (const k of Object.keys(attr) as (keyof DoctrineAttributes)[]) attr[k] = Math.round(clamp(attr[k]));
  const h = hashString(clean + category);
  const tags = [category, motif.key];
  if (attr.visibility > 70) tags.push('conspicuous');
  if (attr.controversy > 60) tags.push('contentious');
  if (attr.commerce > 65) tags.push('marketable');
  if (attr.ambiguity > 70) tags.push('debatable');
  return {
    id: id ?? `d${++doctrineCounter}-${h.toString(36)}`,
    category,
    originalText: clean,
    currentText: clean,
    interpretation: INTERPRETATIONS[category][h % INTERPRETATIONS[category].length],
    attributes: attr,
    motif,
    tags,
    derivation,
    source,
    modificationHistory: [],
  };
}

/** Optional AI enrichment is bounded and validated before being merged. */
export function applyAttributeOverrides(d: Doctrine, overrides: Partial<DoctrineAttributes>, note = 'manual override'): Doctrine {
  const attr = { ...d.attributes };
  for (const [k, v] of Object.entries(overrides)) {
    if (typeof v === 'number' && k in attr && Number.isFinite(v)) attr[k as keyof DoctrineAttributes] = Math.round(clamp(v));
  }
  return { ...d, attributes: attr, derivation: [...d.derivation, note] };
}

// ---------------------------------------------------------------- profile

export function buildProfile(doctrines: Doctrine[], t: Temperament, hqType: string, meetingName: string): MovementProfile {
  const avg = (k: keyof DoctrineAttributes) => (doctrines.length ? doctrines.reduce((s, d) => s + d.attributes[k], 0) / doctrines.length : 50);
  const appeal = avg('appeal');
  const controversy = avg('controversy');
  const visibility = avg('visibility');
  const ambiguity = avg('ambiguity');
  const commerce = avg('commerce');
  const identity = avg('identity');
  const difficulty = avg('difficulty');
  const intensity = avg('intensity');
  const orgCost = avg('orgCost');
  // temperament: 0 = laughter/love/peace/active
  const warmth = (100 - t.emotion + (100 - t.social)) / 200; // 1 = laughter + love
  const fight = (t.social + t.conflict) / 200; // 1 = hate + war (theatrical grudges)
  const activity = (100 - t.activity) / 100; // 1 = very active
  const conversionMult =
    (0.8 + appeal / 250 - difficulty / 500) * (0.9 + warmth * 0.18) * (0.85 + activity * 0.3) * (1 + fight * 0.05);
  const resistanceMult = (0.7 + controversy / 160 + visibility / 400) * (0.85 + fight * 0.45) * (1.05 - warmth * 0.15);
  const splinterRisk = (0.6 + ambiguity / 120 + fight * 0.4) * (1.1 - identity / 400);
  const zeal = 0.6 + identity / 200 + intensity / 300 + fight * 0.2 + activity * 0.2;
  const cooperation = 0.5 + warmth * 0.5 - fight * 0.3;
  const contradictions: string[] = [];
  if (t.emotion > 70 && t.social < 30) contradictions.push('weeps openly out of love for everyone');
  if (t.social < 25 && t.conflict > 75) contradictions.push('declares war out of pure affection');
  if (t.conflict > 75 && t.activity > 75) contradictions.push('is extremely warlike but cannot be bothered to get up');
  if (t.emotion < 25 && t.social > 75) contradictions.push('laughs warmly while holding grudges');
  if (t.conflict < 25 && t.social > 75) contradictions.push('hates everyone but would never do anything about it');
  if (/yurt|tent|hut/i.test(hqType) && doctrines.some((d) => d.motif.key === 'underground')) contradictions.push('headquartered above ground despite preferring to live below it');
  if (/board meeting/i.test(meetingName) && t.activity < 20) contradictions.push('holds frantic board meetings');
  return {
    appeal, controversy, visibility, ambiguity, commerce, identity, difficulty, intensity, orgCost,
    conversionMult: Math.max(0.6, Math.min(1.4, conversionMult)),
    resistanceMult: Math.max(0.6, Math.min(1.6, resistanceMult)),
    splinterRisk: Math.max(0.4, Math.min(1.8, splinterRisk)),
    zeal: Math.max(0.6, Math.min(1.6, zeal)),
    cooperation: Math.max(0.1, Math.min(1, cooperation)),
    contradictions,
  };
}

// ---------------------------------------------------------------- movement

export interface MovementInput {
  ideologyName: string;
  singularFollower?: string;
  pluralFollowers?: string;
  adjective?: string;
  shortName?: string;
  founderName: string;
  founderTitle?: string;
  headquarters: Headquarters;
  spiritAnimal: string;
  banner: Banner;
  motto: string;
  temperament: Temperament;
  principles: string[];
  customs: { category: DoctrineCategory; text: string }[];
  meetingName: string;
  outpostName: string;
  gameMode: GameMode;
  worldSeed: number;
  foundingDate?: number;
}

export function singularOf(plural: string): string {
  const p = plural.trim();
  if (/ies$/i.test(p)) return p.replace(/ies$/i, 'y');
  if (/(camps|booths|circles|offices|centers|strongholds|lairs|shrines|headquarters)$/i.test(p) && /headquarters$/i.test(p)) return p;
  if (/Shrines to Common Sense/i.test(p)) return 'Shrine to Common Sense';
  if (/es$/i.test(p) && /(ch|sh|x|ss)es$/i.test(p)) return p.replace(/es$/i, '');
  if (/s$/i.test(p)) return p.replace(/s$/i, '');
  // multi-word like "Re-education Camps"
  return p;
}

export function multiWordSingular(plural: string): string {
  const words = plural.trim().split(' ');
  const idx = words.findIndex((w) => /s$/i.test(w) && w.length > 3 && !/^(to|common|sense)$/i.test(w));
  if (/ to /i.test(plural)) {
    const [head, ...rest] = plural.split(/ to /i);
    return `${singularOf(head)} to ${rest.join(' to ')}`;
  }
  if (idx === words.length - 1) words[idx] = singularOf(words[idx]);
  return words.join(' ');
}

export function createMovement(input: MovementInput): Movement {
  const names = deriveNames(input.ideologyName);
  const doctrines: Doctrine[] = [];
  input.principles.filter((p) => p.trim()).forEach((p, i) => doctrines.push(interpretDoctrine(p, 'principle', 'custom', `p${i}`)));
  input.customs.filter((c) => c.text.trim()).forEach((c, i) => doctrines.push(interpretDoctrine(c.text, c.category, 'preset', `c${i}`)));
  if (!doctrines.length) doctrines.push(interpretDoctrine('Everyone deserves a really tall chair.', 'principle', 'preset', 'p0'));
  const plural = input.pluralFollowers?.trim() || names.pluralFollowers;
  return {
    id: `mv-${input.worldSeed.toString(36)}`,
    ideologyName: names.ideologyName.length && input.ideologyName.trim() ? names.ideologyName : 'Thingism',
    singularFollower: input.singularFollower?.trim() || names.singularFollower,
    pluralFollowers: plural,
    adjective: input.adjective?.trim() || names.adjective,
    shortName: input.shortName?.trim() || `the ${plural}`,
    founderName: input.founderName.trim() || 'Founder',
    founderTitle: input.founderTitle?.trim() || defaultFounderTitle(input.founderName),
    headquarters: input.headquarters,
    startingCityId: null,
    spiritAnimal: input.spiritAnimal,
    banner: input.banner,
    motto: input.motto,
    temperament: input.temperament,
    doctrines,
    meetingName: input.meetingName,
    meetingSingular: multiWordSingular(input.meetingName),
    outpostName: input.outpostName,
    outpostSingular: multiWordSingular(input.outpostName),
    proclamation: '',
    foundingDate: input.foundingDate ?? Date.now(),
    gameMode: input.gameMode,
    worldSeed: input.worldSeed,
    profile: buildProfile(doctrines, input.temperament, input.headquarters.type, input.meetingName),
  };
}

export function temperamentWords(t: Temperament) {
  const side = (v: number, l: string, r: string) => (v < 35 ? l : v > 65 ? r : 'balance');
  return {
    emotion: side(t.emotion, 'laughter', 'tears'),
    social: side(t.social, 'love', 'hate'),
    conflict: side(t.conflict, 'peace', 'war'),
    activity: side(t.activity, 'action', 'repose'),
  };
}

export function articleFor(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

export function generateProclamation(mv: Movement, cityName: string): string {
  const tw = temperamentWords(mv.temperament);
  const principles = mv.doctrines.filter((d) => d.category === 'principle');
  const customs = mv.doctrines.filter((d) => d.category !== 'principle');
  const hq = mv.headquarters.type.toLowerCase();
  const lines: string[] = [];
  lines.push(`BE IT HEREBY PROCLAIMED, from ${articleFor(hq)} ${hq} of ${mv.headquarters.style.toLowerCase()} distinction in ${cityName}, that ${mv.founderTitle} has founded ${mv.ideologyName}, the unquestionably correct philosophy.`);
  if (principles.length) {
    lines.push(`Let it be known that ${principles.map((p) => `“${p.originalText.replace(/\.$/, '')}”`).join('; that ')}. These truths were always obvious; the world simply had not been told.`);
  }
  if (customs.length) {
    lines.push(`Accordingly, all ${mv.pluralFollowers} shall ${customs.map((c) => c.motif.verb).slice(0, 5).join(', ').replace(/, ([^,]*)$/, ', and $1')}.`);
  }
  const temper =
    tw.emotion === 'balance' && tw.social === 'balance'
      ? 'with measured feeling'
      : `in a spirit of ${[tw.emotion, tw.social].filter((x) => x !== 'balance').join(' and ')}`;
  lines.push(`The ${mv.adjective} people shall gather in ${mv.meetingName}, ${temper}, guided by the ${mv.spiritAnimal.toLowerCase()}, and shall establish ${mv.outpostName} wherever reason has been neglected.`);
  if (mv.profile.contradictions.length) lines.push(`Critics who note that the movement ${mv.profile.contradictions[0]} have missed the point entirely.`);
  lines.push(`${mv.motto ? `“${mv.motto}” ` : ''}So it is written. So it shall spread. Muahahaha.`);
  return lines.join('\n\n');
}
