// The deck. Every belief is chosen during play, and every belief keeps coming back.
import { MOTIFS, type MotifDef } from '../content/motifs';
import { BANNER_COLORS, FOUNDER_TITLES, HQ_TYPES, MEETING_NAMES, OUTPOST_NAMES, PRINCIPLE_SUGGESTIONS, RIVAL_SEEDS, SPIRIT_ANIMALS } from '../content/presets';
import { city, countryName } from '../engine/geo';
import { interpretDoctrine, multiWordSingular } from '../engine/ideology';
import type { Rng } from '../engine/rng';
import type { DoctrineCategory } from '../engine/types';
import { type CardDef, type EndingDef, convertedCities, leaderTitle, frontierCity, registerDeck, registerEndings, worldShare } from './engine';
import type { CardGame, Ctx, Delta } from './types';

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const tc = (s: string) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());

// ------------------------------------------------------------ helpers

export const ROOTS: Record<string, string> = {
  hat: 'Hat', spring: 'Spring', nap: 'Nap', weekday: 'Tuesday', sock: 'Sock', chair: 'Tallchair', soup: 'Soup', potato: 'Mash', door: 'Door',
  backward: 'Backward', noon: 'Noon', teeth: 'Brush', bath: 'Bath', sandwich: 'Triangle', dessert: 'Dessert', tower: 'Tower', handshake: 'Handshake',
  rock: 'Pebble', cape: 'Cape', kazoo: 'Kazoo', yachtrock: 'Smooth', kpop: 'Sync', folk: 'Strum', metal: 'Shred', polka: 'Polka', jazz: 'Fusion',
  synthwave: 'Neon', elevator: 'Lift', yurt: 'Yurt', hut: 'Hut', tent: 'Tent', treehouse: 'Canopy', dome: 'Dome', underground: 'Burrow', green: 'Hue',
  walk: 'Journey', noodle: 'Noodle', beard: 'Mustache', dance: 'Dance', garden: 'Garden', tea: 'Tea', cheese: 'Cheese', umbrella: 'Umbrella',
  silence: 'Hush', pets: 'Pet', bicycle: 'Bell', pancake: 'Pancake', glasses: 'Monocle',
};

const motif = (key: string) => MOTIFS.find((m) => m.key === key)!;
const usedKeys = (g: CardGame) => new Set(g.movement.doctrines.map((d) => d.motif.key));
const hasCat = (g: CardGame, c: DoctrineCategory) => g.movement.doctrines.some((d) => d.category === c);

function twoMotifs(g: CardGame, rng: Rng, pred: (m: MotifDef) => boolean): [MotifDef, MotifDef] | null {
  const used = usedKeys(g);
  const pool = rng.shuffle(MOTIFS.filter((m) => !used.has(m.key) && pred(m)));
  return pool.length >= 2 ? [pool[0], pool[1]] : null;
}

/** Meter consequences of adopting a doctrine come from its derived attributes. */
function adoptDelta(key: string, cat: DoctrineCategory): Delta {
  const a = interpretDoctrine(`People should ${motif(key).verb}.`, cat).attributes;
  const r = (v: number) => Math.max(-12, Math.min(12, Math.round(v)));
  return { reach: r((a.appeal - 55) / 3), fervor: r((a.identity - 50) / 3 + 3), coffers: r((a.commerce - 55) / 4), standing: r(-(a.controversy - 40) / 3) };
}

function addDoctrine(g: CardGame, key: string, cat: DoctrineCategory) {
  const m = motif(key);
  const d = interpretDoctrine(`People should ${m.verb}.`, cat, 'custom', `d${g.movement.doctrines.length}`);
  g.movement.doctrines.push(d);
  return d;
}

function amend(g: CardGame, id: string, text: string, reason: string) {
  const d = g.movement.doctrines.find((x) => x.id === id);
  if (!d) return;
  d.currentText = text;
  d.modificationHistory.push({ time: g.turn, text, reason });
}

function pickDoctrine(g: CardGame, rng: Rng, pred: (d: CardGame['movement']['doctrines'][number]) => boolean = () => true): string | null {
  const list = g.movement.doctrines.filter(pred);
  if (!list.length) return null;
  return rng.pick(list).id;
}

function someCity(g: CardGame, rng: Rng): number {
  const held = convertedCities(g);
  return held.length ? held[rng.int(0, held.length - 1)] : g.hqCityId;
}

const founded = (g: CardGame) => g.movement.founded;
const atLeast = (n: number) => (g: CardGame) => founded(g) && g.converted >= n;
const shareAtLeast = (s: number) => (g: CardGame) => founded(g) && worldShare(g) >= s;

function doctrineCard(def: Omit<CardDef, 'prepare'> & { pick?: (d: CardGame['movement']['doctrines'][number]) => boolean; withCity?: boolean }): CardDef {
  const { pick, withCity, ...rest } = def;
  return {
    ...rest,
    when: (g) => founded(g) && g.movement.doctrines.length > 0 && (!def.when || def.when(g)),
    prepare: (g, rng) => {
      const doctrine = pickDoctrine(g, rng, pick);
      if (!doctrine) return null;
      const ctx: Ctx = { doctrine };
      if (withCity) ctx.city = someCity(g, rng);
      return ctx;
    },
  };
}

function addFaction(g: CardGame, name: string, stance: string, hostile: boolean) {
  if (g.factions.some((f) => f.name === name)) return;
  g.factions.push({ name, stance, hostile, since: g.turn });
  g.chronicle.push({ turn: g.turn, text: `${name} broke away, insisting that ${stance.replace(/\.$/, '')}.` });
}

const PALETTES: [string, string, string][] = [
  ['Purple & Gold', '#6b3fa0', '#d4a72c'],
  ['Teal & Coral', '#0a9396', '#ee6c4d'],
  ['Crimson & Cream', '#9b2226', '#f4f1de'],
  ['Forest & Mustard', '#2e8b57', '#f1c40f'],
  ['Navy & Orange', '#3d5a80', '#e67e22'],
  ['Magenta & Mint', '#e84393', '#94d2bd'],
  ['Charcoal & Brass', '#2c3e50', '#d8b55e'],
  ['Plum & Seafoam', '#8e44ad', '#16a085'],
];
void BANNER_COLORS;

// ------------------------------------------------------------ founding (forced, in order)

const FOUNDING: CardDef[] = [
  {
    id: 'found-idea', who: 'self', once: true,
    prepare: (g, rng) => {
      const pair = twoMotifs(g, rng, (m) => !!ROOTS[m.key]);
      return pair ? { a: pair[0].key, b: pair[1].key, verbA: pair[0].verb, verbB: pair[1].verb, nounA: tc(pair[0].plural), nounB: tc(pair[1].plural) } : null;
    },
    text: 'It comes to you in the bath. Every problem in the world exists because people refuse to {verbA}. Or was it that they refuse to {verbB}?',
    left: { label: 'It is about {nounA}.', delta: { fervor: 5 }, apply: (g, c) => setIdea(g, String(c.a)) },
    right: { label: 'It is about {nounB}.', delta: { reach: 5 }, apply: (g, c) => setIdea(g, String(c.b)) },
  },
  {
    id: 'found-title', who: 'mom', once: true,
    prepare: (g, rng) => {
      const t = rng.shuffle(FOUNDER_TITLES.filter((x) => x !== 'The Magnificent'));
      return { t1: t[0], t2: t[1], i: g.leader.name.charAt(0).toUpperCase() };
    },
    text: 'Your mother has heard you founded {Ism}. She would like to know what she is supposed to call you now.',
    left: { label: '{t1} {i}', delta: { fervor: 5, standing: -3 }, apply: (g, c) => setTitle(g, String(c.t1)) },
    right: { label: '{t2} {i}', delta: { standing: 5, fervor: -2 }, apply: (g, c) => setTitle(g, String(c.t2)) },
  },
  {
    id: 'found-hq', who: 'cousin', once: true,
    prepare: (_g, rng) => {
      const t = rng.shuffle(HQ_TYPES.slice());
      return { h1: t[0], h2: t[1] };
    },
    text: 'Every movement needs a headquarters. Cousin Rupert can get you a {h1}. A man at the bus stop is offering a {h2}, “no questions asked.”',
    left: { label: 'The {h1}.', delta: { coffers: -5, standing: 6 }, apply: (g, c) => (g.movement.hqType = String(c.h1)) },
    right: { label: 'The {h2}.', delta: { coffers: 6, standing: -6, fervor: 3 }, apply: (g, c) => (g.movement.hqType = String(c.h2)) },
  },
  {
    id: 'found-first', who: 'first', once: true,
    text: '“I heard you speaking outside the library in {hqCity}. I also believe people should {verb}. May I join {Ism}?”',
    left: { label: 'Prove your devotion first.', delta: { fervor: 10, reach: -6 }, log: 'Gwendolyn Larkspur became the first follower, after passing an entirely improvised test of devotion.' },
    right: { label: 'Welcome, friend!', delta: { reach: 10, fervor: -4 }, log: 'Gwendolyn Larkspur became the first follower. She was welcomed with open arms and a commemorative pamphlet.' },
  },
  {
    id: 'found-meeting', who: 'first', once: true,
    prepare: (_g, rng) => {
      const t = rng.shuffle(MEETING_NAMES.slice());
      return { m1: t[0], m2: t[1] };
    },
    text: '“There are now nine of us. What should we call our gatherings?”',
    left: { label: '{m1}.', delta: { fervor: 4 }, apply: (g, c) => setMeeting(g, String(c.m1)) },
    right: { label: '{m2}.', delta: { reach: 4 }, apply: (g, c) => setMeeting(g, String(c.m2)) },
  },
  {
    id: 'found-animal', who: 'dream', once: true,
    prepare: (_g, rng) => {
      const t = rng.shuffle(SPIRIT_ANIMALS.slice());
      return { a1: t[0].name, a2: t[1].name };
    },
    text: 'That night you dream of a {a1} and a {a2}. Both stare at you expectantly. One of them is clearly the spirit animal of {Ism}.',
    left: { label: 'The {a1}.', delta: { fervor: 4, standing: -2 }, apply: (g, c) => (g.movement.animal = String(c.a1)) },
    right: { label: 'The {a2}.', delta: { reach: 4 }, apply: (g, c) => (g.movement.animal = String(c.a2)) },
  },
  {
    id: 'found-banner', who: 'artist', once: true,
    prepare: (_g, rng) => {
      const t = rng.shuffle(PALETTES.map((_, i) => i));
      return { p1: t[0], p2: t[1], n1: PALETTES[t[0]][0], n2: PALETTES[t[1]][0] };
    },
    text: '“A movement is nothing without a banner. I have prepared two designs featuring the {animal}. Choose wisely; the other one will be destroyed.”',
    left: { label: '{n1}.', delta: { fervor: 3, coffers: -3 }, apply: (g, c) => setBanner(g, Number(c.p1)) },
    right: { label: '{n2}.', delta: { reach: 3, coffers: -3 }, apply: (g, c) => setBanner(g, Number(c.p2)) },
  },
];

function setIdea(g: CardGame, key: string) {
  const root = ROOTS[key] ?? tc(motif(key).noun.split(' ').pop()!);
  Object.assign(g.movement, { root, ideologyName: `${root}ism`, singular: `${root}ist`, plural: `${root}ists`, adjective: `${root}ist` });
  addDoctrine(g, key, motif(key).category ?? 'principle');
  g.news.push({ turn: g.turn, headline: `Local Resident Announces ${root}ism; Neighbours Unsure How to Respond` });
}
function setTitle(g: CardGame, t: string) {
  g.movement.titleWord = t;
  g.leader.title = leaderTitle(t, g.leader.name);
}
function setMeeting(g: CardGame, m: string) {
  g.movement.meeting = m;
  g.movement.meetingSingular = multiWordSingular(m);
}
function setBanner(g: CardGame, i: number) {
  const p = PALETTES[i];
  g.movement.banner = { ...g.movement.banner, primary: p[1], secondary: p[2] };
  g.movement.founded = true;
  g.chronicle.push({
    turn: g.turn,
    text: `${g.movement.ideologyName} was formally founded by ${g.leader.title} at a ${g.movement.hqType.toLowerCase()} in ${city(g.hqCityId).name}, under a banner of ${p[0].toLowerCase()} bearing the ${g.movement.animal.toLowerCase()}. Historians agree civilization was never the same.`,
  });
}

// ------------------------------------------------------------ beliefs chosen during play

const CUSTOMS: { cat: DoctrineCategory; who: string; text: string; after: number }[] = [
  { cat: 'food', who: 'chef', text: '“{F} keep asking what a proper {f} eats. I have two proposals: people should {verbA}, or people should {verbB}.”', after: 8 },
  { cat: 'clothing', who: 'tailor', text: '“Nobody can tell a {f} from an ordinary person. Unacceptable. Shall we {verbA}, or {verbB}?”', after: 14 },
  { cat: 'music', who: 'dj', text: '“Every movement needs an official sound. I am torn: {nounA} or {nounB}?”', after: 20 },
  { cat: 'housing', who: 'architect', text: '“{F} are asking how they ought to live. My two finest proposals: {nounA}, or {nounB}.”', after: 30 },
  { cat: 'hobby', who: 'first', text: '“The {meeting} need an activity. Some members want to {verbA}. Others want to {verbB}.”', after: 40 },
  { cat: 'hygiene', who: 'doctor', text: '“As your physician, I must ask what {Ism} says about hygiene. Should people {verbA}, or {verbB}?”', after: 55 },
];

const CUSTOM_CARDS: CardDef[] = CUSTOMS.map((cu) => ({
  id: `custom-${cu.cat}`,
  who: cu.who,
  once: true,
  weight: 4,
  when: (g) => founded(g) && g.turn >= cu.after && !hasCat(g, cu.cat),
  prepare: (g, rng) => {
    const pair = twoMotifs(g, rng, (m) => m.category === cu.cat);
    if (!pair) return null;
    return { a: pair[0].key, b: pair[1].key, verbA: pair[0].verb, verbB: pair[1].verb, nounA: tc(pair[0].plural), nounB: tc(pair[1].plural) };
  },
  text: cu.text,
  left: {
    label: (_g, c) => cap(motif(String(c.a)).plural) + '.',
    delta: (_g, c) => adoptDelta(String(c.a), cu.cat),
    apply: (g, c) => addDoctrine(g, String(c.a), cu.cat),
    log: (_g, c) => `It was decreed that all {F} shall ${motif(String(c.a)).verb}.`,
    news: (_g, c) => `${tc(motif(String(c.a)).plural)} Now Mandatory for {F}`,
  },
  right: {
    label: (_g, c) => cap(motif(String(c.b)).plural) + '.',
    delta: (_g, c) => adoptDelta(String(c.b), cu.cat),
    apply: (g, c) => addDoctrine(g, String(c.b), cu.cat),
    log: (_g, c) => `It was decreed that all {F} shall ${motif(String(c.b)).verb}.`,
    news: (_g, c) => `${tc(motif(String(c.b)).plural)} Now Mandatory for {F}`,
  },
}));

const EXTRA_BELIEFS: CardDef[] = [
  {
    id: 'principle-2', who: 'scholar', once: true, weight: 3,
    when: (g) => founded(g) && g.turn >= 26,
    prepare: (_g, rng) => {
      const t = rng.shuffle(PRINCIPLE_SUGGESTIONS.slice());
      return { p1: t[0], p2: t[1] };
    },
    text: '“The founding texts are thin, {Title}. Scholars will need a second great principle. I have narrowed it down to two.”',
    left: { label: '“{p1}”', delta: { fervor: 6, standing: -2 }, apply: (g, c) => g.movement.doctrines.push(interpretDoctrine(String(c.p1), 'principle', 'custom', `d${g.movement.doctrines.length}`)) },
    right: { label: '“{p2}”', delta: { reach: 6, fervor: -2 }, apply: (g, c) => g.movement.doctrines.push(interpretDoctrine(String(c.p2), 'principle', 'custom', `d${g.movement.doctrines.length}`)) },
  },
  {
    id: 'name-outposts', who: 'treasurer', once: true, weight: 4,
    when: atLeast(3000),
    prepare: (_g, rng) => {
      const t = rng.shuffle(OUTPOST_NAMES.slice());
      return { o1: t[0], o2: t[1] };
    },
    text: '“We can finally afford branches in other towns. The paperwork needs a name for them.”',
    left: { label: '{o1}.', delta: { coffers: -8, reach: 8 }, apply: (g, c) => (g.movement.outpost = String(c.o1)), log: 'The first {outpost} opened its doors.' },
    right: { label: '{o2}.', delta: { coffers: -8, reach: 8 }, apply: (g, c) => (g.movement.outpost = String(c.o2)), log: 'The first {outpost} opened its doors.' },
  },
];

// ------------------------------------------------------------ cards built from your doctrines

const DOCTRINE_CARDS: CardDef[] = [
  doctrineCard({
    id: 'heresy', who: 'scholar', weight: 3,
    text: '“A delicate question has arisen, {Title}. Members want to know whether {heresy} count. The founding text, “{original}”, is silent.”',
    left: { label: 'Absolutely not.', delta: { fervor: 10, reach: -8 }, then: { id: 'progressives', in: 6, chance: 0.5 }, news: '{Ism} Rules Out {Heresy}; Purists Delighted' },
    right: {
      label: 'Sure, why not.', delta: { reach: 10, fervor: -9 },
      apply: (g, c) => { const d = g.movement.doctrines.find((x) => x.id === c.doctrine)!; amend(g, d.id, `${d.currentText.replace(/\.$/, '')} (${d.motif.heresy} included).`, 'Heresy accepted'); },
      then: { id: 'orthodox', in: 6, chance: 0.6 }, log: 'The doctrine was broadened to include {heresy}.', news: '{Heresy} Officially Acceptable, Says {Ism}',
    },
  }),
  doctrineCard({
    id: 'purism', who: 'zealot', weight: 2.5,
    text: '“{Title}, the faithful are slipping. I propose we declare that {purism}.”',
    left: { label: 'Make it official.', delta: { fervor: 12, standing: -10, reach: -4 }, apply: (g, c) => { const d = g.movement.doctrines.find((x) => x.id === c.doctrine)!; amend(g, d.id, `${d.originalText.replace(/\.$/, '')}, and ${d.motif.purism}.`, 'Purist decree'); }, log: 'It was decreed that {purism}.' },
    right: { label: 'Calm down, Barnaby.', delta: { fervor: -8, standing: 5 }, then: { id: 'barnaby-sulks', in: 4, chance: 0.4 } },
  }),
  doctrineCard({
    id: 'radical', who: 'scholar', weight: 1.5, when: atLeast(20000),
    text: '“A visiting philosopher has persuaded half my students that {radical}. Should we take a position?”',
    left: { label: 'Nonsense. Next.', delta: { standing: 5, fervor: 4, reach: -4 } },
    right: { label: 'Profound. Adopt it.', delta: { reach: 6, fervor: -6, standing: -6 }, apply: (g, c) => { const d = g.movement.doctrines.find((x) => x.id === c.doctrine)!; amend(g, d.id, `${d.currentText.replace(/\.$/, '')} (understood spiritually: ${d.motif.radical}).`, 'Philosophical reinterpretation'); }, log: 'Scholars concluded that {radical}.' },
  }),
  doctrineCard({
    id: 'shortage', who: 'treasurer', weight: 2, when: atLeast(50000),
    text: '“There is a worldwide shortage of {shortage}. Prices have tripled. {F} are anxious.”',
    left: { label: 'Buy every last one.', delta: { coffers: -16, fervor: 8 }, news: '{Ism} Corners Global {Shortage} Market' },
    right: { label: 'Members will improvise.', delta: { fervor: -10, coffers: 4, reach: 3 }, news: '{F} Improvise Amid {Shortage} Shortage; Results Mixed' },
  }),
  doctrineCard({
    id: 'incident', who: 'press', weight: 2.5, withCity: true,
    text: '“Big story in {city} today, {Title}: {headline}. Any comment for the Clarion?”',
    left: { label: 'No comment.', delta: { standing: -4, reach: 5 } },
    right: { label: 'Issue a statement.', delta: { standing: 6, coffers: -3, fervor: -2 } },
  }),
  doctrineCard({
    id: 'merch', who: 'merch', weight: 2, when: atLeast(5000),
    text: '“{Noun}-shaped key rings. {Noun} mugs. {Adj} socks. I can have them in shops by Friday. Say the word.”',
    left: { label: 'The doctrine is not for sale.', delta: { fervor: 6, coffers: -6 } },
    right: { label: 'Do it. All of it.', delta: { coffers: 16, fervor: -9, standing: -3 }, news: 'Official {Adj} Merchandise Sells Out in Hours' },
  }),
  doctrineCard({
    id: 'measure', who: 'mayor', weight: 2, withCity: true, when: atLeast(2000),
    text: '“The council of {city} is considering limits on {measure}. I am personally neutral. Mostly.”',
    left: { label: 'Fight it in the streets.', delta: { fervor: 9, standing: -10, reach: 3 }, news: '{F} Protest {Measure} Limits in {city}' },
    right: { label: 'We will comply.', delta: { standing: 8, fervor: -8 } },
  }),
  doctrineCard({
    id: 'committee', who: 'committee', weight: 1.5, when: atLeast(30000),
    text: '“Disputes over {plural} are multiplying. I propose a {committee}. It would meet monthly, then weekly, then continuously.”',
    left: { label: 'Establish it.', delta: { standing: 8, fervor: -6, coffers: -6 }, apply: (g) => (g.flags.committees = (g.flags.committees ?? 0) + 1), log: 'The {committee} was established. Its first act was to establish a subcommittee.' },
    right: { label: 'No more committees.', delta: { fervor: 4, standing: -5 } },
  }),
  doctrineCard({
    id: 'day', who: 'delegate', weight: 2, when: shareAtLeast(0.02), once: true,
    text: '“Several governments propose recognizing {day}. Would {Ism} prefer a solemn observance or a festival?”',
    left: { label: 'Solemn. Very solemn.', delta: { fervor: 8, standing: 6, reach: -3 }, log: '{day} was observed in respectful silence around the world.' },
    right: { label: 'A festival!', delta: { reach: 12, standing: -4, coffers: -6 }, log: '{day} became a worldwide festival.' },
  }),
  doctrineCard({
    id: 'animal-act', who: 'animal', weight: 1.2,
    text: 'The {animal} has wandered into the {meetingS} and is sitting on the official copy of “{original}”. Everyone is looking at you.',
    left: { label: 'Interpret this as a sign.', delta: { fervor: 9, standing: -5 }, log: 'The {animal} sat upon the doctrine, and it was taken as a sign.' },
    right: { label: 'Gently relocate the {animal}.', delta: { standing: 4, fervor: -4 } },
  }),
  doctrineCard({
    id: 'industry', who: 'mayor', weight: 1.5, when: atLeast(100000), withCity: true,
    text: '“The {industry} industry in {city} is booming thanks to your {F}. They would like to sponsor the next {meetingS}.”',
    left: { label: 'Accept the sponsorship.', delta: { coffers: 12, fervor: -6 } },
    right: { label: 'We answer to no industry.', delta: { fervor: 6, coffers: -4 } },
  }),
];

// the press 'incident' card needs a headline from the motif
DOCTRINE_CARDS.find((c) => c.id === 'incident')!.prepare = (g, rng) => {
  const doctrine = pickDoctrine(g, rng);
  if (!doctrine) return null;
  const d = g.movement.doctrines.find((x) => x.id === doctrine)!;
  const cityId = someCity(g, rng);
  return { doctrine, city: cityId, headline: rng.pick(d.motif.incidents).replace(/\{city\}/g, city(cityId).name).replace(/\{country\}/g, countryName(city(cityId).cc)).replace(/\{F\}/g, g.movement.plural).replace(/\{f\}/g, g.movement.singular).replace(/\{(\w+)\}/g, (_, k) => String((d.motif as unknown as Record<string, string>)[k] ?? k)) };
};

// ------------------------------------------------------------ follow-ups

const FOLLOWUPS: CardDef[] = [
  {
    id: 'orthodox', who: 'defector', cooldown: 0,
    prepare: (g, rng) => {
      const doctrine = pickDoctrine(g, rng);
      return doctrine ? { doctrine, fname: `The Traditional ${g.movement.plural}` } : null;
    },
    text: '“Some of us remember when {F} meant something. We have formed {fname}. We insist that {purism}.”',
    left: { label: 'Excommunicate them.', delta: { fervor: 10, reach: -10, standing: -4 }, apply: (g, c) => addFaction(g, String(c.fname), render2(g, '{purism}', c), true) },
    right: { label: 'Invite them to dinner.', delta: { fervor: -6, reach: 4, coffers: -4 }, apply: (g, c) => addFaction(g, String(c.fname), render2(g, '{purism}', c), false) },
  },
  {
    id: 'progressives', who: 'youth', cooldown: 0,
    prepare: (g, rng) => {
      const doctrine = pickDoctrine(g, rng);
      return doctrine ? { doctrine, fname: `The Progressive ${g.movement.plural}` } : null;
    },
    text: '“Respectfully, {Title}, banning {heresy} was cringe. We are starting {fname}. You are welcome to join, honestly.”',
    left: { label: 'Denounce them.', delta: { fervor: 8, reach: -9 }, apply: (g, c) => addFaction(g, String(c.fname), render2(g, '{heresy} should count', c), true) },
    right: { label: 'Make them a youth wing.', delta: { reach: 7, fervor: -7 }, apply: (g, c) => addFaction(g, String(c.fname), render2(g, '{heresy} should count', c), false) },
  },
  {
    id: 'barnaby-sulks', who: 'zealot', cooldown: 0,
    text: '“I have been reflecting, {Title}. Perhaps the {F} need a leader who truly believes people should {verb}.”',
    left: { label: 'Promote Barnaby.', delta: { fervor: 10, standing: -6, coffers: -4 } },
    right: { label: 'Remind him who founded this.', delta: { fervor: -6, standing: 3 }, then: { id: 'barnaby-schism', in: 8, chance: 0.5 } },
  },
  {
    id: 'barnaby-schism', who: 'zealot', cooldown: 0,
    prepare: (g) => ({ fname: `The Fundamental ${g.movement.root} Society` }),
    text: '“I am leaving to found {fname}. We will {verb} properly, as the founder originally intended.”',
    left: { label: 'Good riddance.', delta: { fervor: -10, reach: -6 }, apply: (g, c) => addFaction(g, String(c.fname), render2(g, 'people must {verb} more strictly', c), true) },
    right: { label: 'Beg him to stay.', delta: { fervor: 8, standing: -8, coffers: -6 } },
  },
  {
    id: 'new-country', who: 'press', cooldown: 0,
    prepare: (g) => ({ city: convertedCities(g).at(-1) ?? g.hqCityId }),
    text: '“{F} have appeared in {country}, starting in {city}. Locals want to adapt the customs to local tastes. Thoughts?”',
    left: { label: 'Adapt them.', delta: { reach: 9, fervor: -6 }, log: 'In {country}, the customs were adapted to local tastes.' },
    right: { label: 'The same, everywhere.', delta: { fervor: 7, reach: -5, standing: -3 } },
  },
  {
    id: 'succession', who: 'committee', cooldown: 0,
    prepare: (g) => ({ prev: g.leaders[g.leaders.length - 1]?.title ?? 'the founder', how: g.leaders[g.leaders.length - 1]?.endingTitle ?? '' }),
    text: '“The committee has chosen you, {Title}, to lead {Ism} after {prev} (“{how}”). How shall we honor your predecessor?”',
    left: { label: 'A statue at the {hq}.', delta: { coffers: -10, fervor: 8 }, log: 'A statue of {prev} was erected at the {hq}.' },
    right: { label: 'Quietly move on.', delta: { fervor: -5, coffers: 4, standing: 3 } },
  },
  {
    id: 'retire', who: 'doctor', cooldown: 0,
    prepare: (g) => ({ years: Math.max(1, Math.round((g.turn - g.leader.startTurn) / 12)) }),
    text: '“{years} years of leading {Ism} have taken their toll, {Title}. I strongly recommend retirement. Or at least a long nap.”',
    left: { label: 'Retire gracefully.', delta: {}, apply: (g) => { g.flags.forceEnd = 1; g.flags['end:retired'] = 1; } },
    right: { label: 'Never!', delta: { fervor: 12, standing: -8 } },
  },
];

function render2(g: CardGame, s: string, c: Ctx) {
  const d = g.movement.doctrines.find((x) => x.id === c.doctrine) ?? g.movement.doctrines[0];
  return s.replace('{purism}', d.motif.purism).replace('{heresy}', d.motif.heresy).replace('{verb}', d.motif.verb);
}

// ------------------------------------------------------------ general cards

const G: CardDef[] = [
  { id: 'budget', who: 'treasurer', when: founded, text: '“The {meeting} budget is due. We can rent a proper hall, or keep meeting in the {hq}.”', left: { label: 'Rent the hall.', delta: { coffers: -10, reach: 8, standing: 4 } }, right: { label: 'The {hq} is fine.', delta: { coffers: 6, reach: -4, fervor: 3 } } },
  { id: 'rally', who: 'zealot', when: founded, text: '“The {F} are restless. Let us march through the centre of {city}, chanting!”', prepare: (g, rng) => ({ city: someCity(g, rng) }), left: { label: 'March!', delta: { fervor: 10, reach: 6, standing: -9 }, news: '{F} March Through {city}; Traffic Delayed, Spirits High' }, right: { label: 'Write a strongly worded leaflet.', delta: { fervor: -6, standing: 3 } } },
  { id: 'interview', who: 'press', when: founded, text: '“I am writing a profile of you, {Title}. Is it true that {Ism} is just a hobby that got out of hand?”', left: { label: '“It is a philosophy.”', delta: { standing: 6, reach: 4, fervor: -2 } }, right: { label: '“It is a way of life, and you will join us.”', delta: { fervor: 8, standing: -8, reach: 5 } } },
  { id: 'mom-call', who: 'mom', when: founded, text: '“Darling, the neighbours are asking about your little group. Can I tell them it is a book club?”', left: { label: 'Tell them everything.', delta: { reach: 5, standing: -4 } }, right: { label: 'Yes, a book club.', delta: { standing: 5, fervor: -5 } } },
  { id: 'donation', who: 'treasurer', when: atLeast(500), text: '“An anonymous donor has offered a large sum, on the condition that we stop meeting on Thursdays.”', left: { label: 'Take the money.', delta: { coffers: 14, fervor: -7 } }, right: { label: 'Thursdays are sacred.', delta: { fervor: 7, coffers: -2 } } },
  { id: 'flashmob', who: 'youth', when: atLeast(1000), text: '“What if we did a flash {meetingS} in the airport? It would go viral. Probably.”', left: { label: 'Do it.', delta: { reach: 12, standing: -7 } }, right: { label: 'Absolutely not.', delta: { standing: 4, reach: -4, fervor: -2 } } },
  { id: 'heckler', who: 'heckler', when: founded, text: '“Oi! Why should anyone {verb}? Explain it in one sentence!”', left: { label: 'Explain it beautifully.', delta: { reach: 6, fervor: 2 } }, right: { label: 'Have him removed.', delta: { fervor: 5, standing: -6 } } },
  { id: 'tax', who: 'official', when: atLeast(20000), text: '“The tax office has questions about whether {Ism} is a charity, a club, a business, or an incident.”', left: { label: 'A charity, obviously.', delta: { coffers: 8, standing: -6 }, then: { id: 'audit', in: 10, chance: 0.5 } }, right: { label: 'Pay full taxes.', delta: { coffers: -12, standing: 8 } } },
  { id: 'audit', who: 'official', cooldown: 0, text: '“Following up: the charity application listed your main activity as “being correct”. We have opened an audit.”', left: { label: 'Cooperate fully.', delta: { coffers: -10, standing: 6 } }, right: { label: '“The system is rigged.”', delta: { fervor: 9, standing: -10 } } },
  { id: 'study', who: 'scientist', when: atLeast(10000), text: '“My new study finds no measurable benefit to people who {verb}. Would you like to respond before it is published?”', left: { label: 'Fund a counter-study.', delta: { coffers: -10, standing: 6 } }, right: { label: '“Despite all evidence, we are right.”', delta: { fervor: 9, reach: 6, standing: -8 }, news: 'New Study Finds No Evidence Supporting {Ism}. Recruitment Increases.' } },
  { id: 'celebrity', who: 'celebrity', when: atLeast(100000), text: '“Darling, I adore {Ism}. I want to be your ambassador. I have only skimmed the doctrine, but I get the vibe.”', left: { label: 'Make her ambassador.', delta: { reach: 14, fervor: -8, standing: 3 }, then: { id: 'celebrity-gaffe', in: 7, chance: 0.6 } }, right: { label: 'We need no celebrities.', delta: { fervor: 6, reach: -3 } } },
  { id: 'celebrity-gaffe', who: 'celebrity', cooldown: 0, text: '“Small thing. On live TV I may have said that {Ism} is mainly about {heresy}. Is that a problem?”', left: { label: 'Issue a correction.', delta: { fervor: 6, reach: -6, standing: 3 } }, right: { label: 'It is now, I suppose.', delta: { reach: 8, fervor: -10 }, apply: (g) => { const d = g.movement.doctrines[0]; if (d) amend(g, d.id, `${d.currentText.replace(/\.$/, '')} (and, per a celebrity, ${d.motif.heresy}).`, 'Celebrity gaffe'); } } },
  { id: 'snacks', who: 'committee', when: atLeast(5000), text: '“The Snack Subcommittee requires six months to approve the biscuits for the next {meetingS}. Do you wish to intervene?”', left: { label: 'Approve the biscuits myself.', delta: { fervor: 5, standing: -3 } }, right: { label: 'Respect the process.', delta: { standing: 5, fervor: -5 }, apply: (g) => (g.flags.committees = (g.flags.committees ?? 0) + 1) } },
  { id: 'defector-book', who: 'defector', when: atLeast(50000), text: '“I am writing a tell-all memoir about my years in {Ism}. Working title: I Was Taught To.”', left: { label: 'Buy the publishing rights.', delta: { coffers: -12, standing: 5 } }, right: { label: 'Let them publish.', delta: { standing: -7, reach: 7 }, news: 'Ex-Member Memoir “I Was Taught To” Tops Charts; Sales of {Ism} Pamphlets Also Rise' } },
  { id: 'investigation', who: 'official', when: atLeast(200000), text: '“Investigations have been launched. Nothing personal. Somebody complained about the {meeting}.”', left: { label: 'Invite the investigators in.', delta: { standing: 9, fervor: -6 } }, right: { label: '“Don’t they know that we are right?”', delta: { fervor: 9, standing: -11 } } },
  { id: 'opposition', who: 'mayor', when: atLeast(150000), prepare: (g, rng) => ({ city: someCity(g, rng), group: rng.pick(['Citizens for Normal Behaviour', 'The League of Moderate Enthusiasts', 'The Bureau of Ordinary Conduct', 'Concerned Neighbours Association']) }), text: '“{group} is holding a “Normal Day” festival in {city} to oppose you. They have a bouncy castle.”', left: { label: 'Crash it with a {meetingS}.', delta: { fervor: 8, reach: 6, standing: -9 } }, right: { label: 'Ignore them.', delta: { reach: -5, standing: 4 } } },
  { id: 'rival', who: 'rival', when: atLeast(1_000_000), once: true, prepare: (g, rng) => { const r = rng.pick(RIVAL_SEEDS); g.flags.rivalName = rng.int(0, 99); return { rism: `${r.root}ism`, rbelief: r.custom }; }, text: '“I am the founder of {rism}. We believe: {rbelief} I challenge you to a public debate, {Title}.”', left: { label: 'Accept the debate.', delta: { reach: 12, standing: -4, fervor: 4 }, log: '{Title} debated the founder of {rism}. Both sides declared victory.', apply: (g, c) => (g.flags.rivalRism = 1, g.chronicle.push({ turn: g.turn, text: `${c.rism} emerged as the movement's great rival.` }), undefined) }, right: { label: 'We do not debate rivals.', delta: { standing: 5, fervor: -6 } } },
  { id: 'rival-merger', who: 'rival', when: (g) => !!g.flags.rivalRism && worldShare(g) > 0.01, once: true, text: '“Our movements together could rule the world. Merge with us. We keep our hats; you keep your… everything else.”', left: { label: 'Merge.', delta: { reach: 15, fervor: -12 }, log: 'The great rival movement merged into {Ism}. Some of its customs came along.' }, right: { label: 'Never.', delta: { fervor: 10, reach: -6 } } },
  { id: 'faction-feud', who: 'defector', when: (g) => founded(g) && g.factions.some((f) => f.hostile), prepare: (g, rng) => { const h = g.factions.filter((f) => f.hostile); return h.length ? { fname: rng.pick(h).name } : null; }, text: '“{fname} is holding rival {meeting} across the street from ours. Their snacks are better.”', left: { label: 'Offer reconciliation.', delta: { fervor: -6, reach: 6 }, apply: (g, c) => { const f = g.factions.find((x) => x.name === c.fname); if (f) f.hostile = false; }, log: '{fname} reconciled with the movement over shared snacks.' }, right: { label: 'Better snacks. Now.', delta: { coffers: -10, fervor: 6 } } },
  { id: 'tv', who: 'press', when: atLeast(400_000), once: true, text: '“National television wants a documentary about {Ism}. They have asked to film a real {meetingS}.”', left: { label: 'Show them everything.', delta: { reach: 14, standing: -5, fervor: -3 }, news: 'They’re Talking About Us: {Ism} Documentary Airs Nationwide' }, right: { label: 'Stage a tidy version.', delta: { standing: 7, fervor: -6, coffers: -5 } } },
  { id: 'foreign', who: 'delegate', when: (g) => founded(g) && g.countries.length >= 3, prepare: (g) => ({ city: frontierCity(g, 5) }), text: '“A delegation from {country} would like to bring {Ism} to {city}. They ask for funding and a signed copy of the doctrine.”', left: { label: 'Fund the expansion.', delta: { coffers: -12, reach: 12 } }, right: { label: 'They must find their own way.', delta: { fervor: 5, reach: -4, coffers: 3 } } },
  { id: 'un', who: 'delegate', when: shareAtLeast(0.15), once: true, text: '“The United Nations of the Fictional World requests clarification on {Adj} regulations regarding {measure}.”', left: { label: 'Provide a binding standard.', delta: { standing: 12, fervor: -6, coffers: -6 }, apply: (g) => (g.flags.committees = (g.flags.committees ?? 0) + 1) }, right: { label: 'Reply with an inspiring, vague speech.', delta: { reach: 10, standing: -6 } } },
  { id: 'holdouts', who: 'scholar', when: shareAtLeast(0.6), text: '“The remaining holdouts are the most unreasonable people on Earth. Specialists say they respond only to {plural} delivered in person.”', left: { label: 'Send the best {F}.', delta: { reach: 10, coffers: -10 } }, right: { label: 'They will come around.', delta: { reach: -4, standing: 4 } } },
  { id: 'clarify', who: 'scholar', when: atLeast(20000), text: '“{F} disagree on what you meant by “{original}”. A clarification from {Title} would help.”', prepare: (g, rng) => { const doctrine = pickDoctrine(g, rng); return doctrine ? { doctrine } : null; }, left: { label: '“All {plural} are equal.”', delta: { standing: 6, fervor: -4 }, news: 'Founder Issues Clarification. Confusion Increases.' }, right: { label: '“The previous position was misunderstood.”', delta: { fervor: 6, reach: -3, standing: -3 } } },
  { id: 'animal-adopt', who: 'animal', when: atLeast(300), once: true, text: 'The {animal} has been elected honorary treasurer by a show of hands. Penelope is furious.', left: { label: 'Respect the vote.', delta: { fervor: 8, coffers: -8 } }, right: { label: 'Overrule the vote.', delta: { coffers: 4, fervor: -6 } } },
  { id: 'hq-upgrade', who: 'architect', when: atLeast(250_000), text: '“The {hq} is too small for {Ism}. I propose a grand headquarters: still technically a {hq}, but with an executive conference wing.”', left: { label: 'Build it.', delta: { coffers: -16, standing: 8, fervor: 4 }, log: 'The original {hq} was expanded with an executive conference wing.' }, right: { label: 'Humility is our strength.', delta: { fervor: 5, standing: -3 } } },
];

// ------------------------------------------------------------ endings

const ENDINGS: EndingDef[] = [
  { id: 'reach-low', meter: 'reach', high: false, title: 'Forgotten', loss: 0.05, text: 'Nobody came to the {meetingS}. Not even {Title}’s mother. After {years} years, {Title} retired to the {hq} to {verb} alone, which had always been the point anyway.' },
  { id: 'reach-high', meter: 'reach', high: true, title: 'Gone Mainstream', loss: 0.08, text: '{Ism} became so popular it stopped being a movement and became a lifestyle brand. {Title} was replaced by a focus group, which concluded that people should {verb}, “but make it aspirational”.' },
  { id: 'fervor-low', meter: 'fervor', high: false, title: 'The Great Shrug', loss: 0.1, text: '{F} slowly stopped caring. The last {meetingS} was postponed indefinitely. {Title} was removed by a vote that nobody attended, including {Title}.' },
  { id: 'fervor-high', meter: 'fervor', high: true, title: 'Insufficiently Devout', loss: 0.12, text: 'The zealots concluded that {Title} did not {verb} nearly enough. {Title} was denounced at a {meetingS} and replaced by someone who does it constantly, even in their sleep.' },
  { id: 'coffers-low', meter: 'coffers', high: false, title: 'Bankrupt', loss: 0.06, text: 'The {outpost} were repossessed. Creditors seized the official banner and the {animal}. {Title} left {hqCity} on a borrowed bicycle, still insisting people should {verb}.' },
  { id: 'coffers-high', meter: 'coffers', high: true, title: 'Incorporated', loss: 0.05, text: '{Ism} Holdings plc floated on the stock exchange. The board voted to replace {Title} with a more shareholder-friendly founder. The share price rose 4%.' },
  { id: 'standing-low', meter: 'standing', high: false, title: 'Run Out of Town', loss: 0.1, text: 'Investigations were launched, then concluded, then relaunched. {Title} was escorted to the city limits, waving and shouting that people should {verb}. “The system is rigged,” said a spokesperson.' },
  { id: 'standing-high', meter: 'standing', high: true, title: 'Absorbed by the Establishment', loss: 0.04, text: 'The government created a Ministry of {Ism} and made {Title} deputy undersecretary. {F} now need a permit to gather, and a second permit to {verb}.' },
  { id: 'retired', title: 'A Graceful Exit', loss: 0, text: 'After {years} years, {Title} retired to the {hq}. The {F} held the largest {meetingS} in history. Historians describe the era as “mostly correct”.' },
];

// follow-ups only ever arrive through the queue
for (const f of [...FOLLOWUPS, ...G.filter((c) => ['audit', 'celebrity-gaffe'].includes(c.id))]) f.when = () => false;

export const ALL_CARDS: CardDef[] = [...FOUNDING, ...CUSTOM_CARDS, ...EXTRA_BELIEFS, ...DOCTRINE_CARDS, ...FOLLOWUPS, ...G];
registerDeck(ALL_CARDS);
registerEndings(ENDINGS);
export { ENDINGS as CARD_ENDINGS };
