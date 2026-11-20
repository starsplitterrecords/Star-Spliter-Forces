// Dynamic Event & News System. Events are selected from state-dependent definitions,
// built from the movement's actual doctrines, cities, factions and history, and carry
// numeric effects decided here (never by the narrative layer).
import { CELEBRITY_ROLES } from '../content/presets';
import { BALANCE, MODES } from './config';
import { addEvent, clamp, getCountryShares, nid } from './core';
import { applyEffects } from './effects';
import { createRival, fictionalPerson, liveFactions } from './factions';
import { city, countryName } from './geo';
import type { Rng } from './rng';
import { fill, fmt, headlineCase, makeCtx } from './text';
import type { Doctrine, Effect, EventChoice, GameEvent, GameState, OppositionOrg } from './types';
import { getMods } from './upgrades';

export interface BuiltEvent {
  headline: string;
  body: string;
  quote?: string;
  cityId?: number;
  choices?: EventChoice[];
  effects?: Effect[];
  refs?: GameEvent['refs'];
  important?: boolean;
}

export interface EventDef {
  id: string;
  category: string;
  minPhase: number;
  minStage?: number;
  decision?: boolean;
  cooldown: number;
  weight: (s: GameState) => number;
  build: (s: GameState, rng: Rng) => BuiltEvent | null;
}

// ------------------------------------------------------------ helpers

const QUOTES = [
  'Don\'t they know that we are right?',
  'The system is rigged.',
  'Despite all evidence, I still believe I won.',
  '{F} rule. Everyone else drools.',
  'I can\'t.',
  'I have to.',
  'I was taught to.',
  'Honestly, it just makes sense once you try it.',
  'We are simply asking questions, and the answer is {plural}.',
  'I came for the {meeting}. I stayed for the {plural}.',
];

function quote(s: GameState, rng: Rng, ctx: Record<string, string>, who?: string): string {
  return `“${fill(rng.pick(QUOTES), ctx)}” — ${who ?? fill(rng.pick(['a {f} in {city}', 'a local {f}', 'a long-time member', 'a newly converted {f}', 'an anonymous source close to {Title}']), ctx)}`;
}

function pickDoctrine(s: GameState, rng: Rng, pred?: (d: Doctrine) => boolean): Doctrine {
  const pool = s.movement.doctrines.filter(pred ?? (() => true));
  const list = pool.length ? pool : s.movement.doctrines;
  // rotate doctrines so every founding choice keeps coming back
  return rng.weighted(list, (d) => 1 / (1 + (s.counters[`doc_${d.id}`] ?? 0)))!;
}

function useDoctrine(s: GameState, d: Doctrine) {
  s.counters[`doc_${d.id}`] = (s.counters[`doc_${d.id}`] ?? 0) + 1;
}

function pickCity(s: GameState, rng: Rng, pred: (id: number) => boolean = () => true): number | undefined {
  const pool = s.touched.filter((id) => s.cities[id].followers > 0 && pred(id));
  return rng.weighted(pool, (id) => Math.sqrt(s.cities[id].followers) + 1);
}

function controlledCities(s: GameState) {
  return s.touched.filter((id) => s.cities[id].controlled);
}

function topCountry(s: GameState): string {
  const by: Record<string, number> = {};
  for (const id of s.touched) by[city(id).cc] = (by[city(id).cc] ?? 0) + s.cities[id].followers;
  return Object.entries(by).sort((a, b) => b[1] - a[1])[0]?.[0] ?? city(s.movement.headquarters.cityId).cc;
}

function oppositionOrg(s: GameState, rng: Rng): OppositionOrg | undefined {
  const live = s.reaction.orgs.filter((o) => !o.dissolved);
  return live.length ? rng.weighted(live, (o) => o.strength + 5) : undefined;
}

export function createOppositionOrg(s: GameState, rng: Rng, cc?: string): OppositionOrg {
  const d = pickDoctrine(s, rng);
  const ctx = makeCtx(s, { doctrine: d });
  const used = new Set(s.reaction.orgs.map((o) => o.name));
  const templates = [
    'Citizens for {orgNoun}',
    'Bureau of Ordinary Conduct',
    'International Committee for Reasonable Behavior',
    'Coalition Against Unscheduled {Meeting}',
    'League of Moderate Enthusiasts',
    'Society for the Defense of {Heresy}',
    'Alliance for Ordinary {Plural}',
    'Concerned Parents Against {Plural}',
    'The {Industry} Standards Association',
    'Foundation for Doing Things the Usual Way',
  ];
  let name = '';
  for (const t of rng.shuffle([...templates])) {
    name = fill(t, ctx);
    if (!used.has(name)) break;
  }
  if (used.has(name)) name = `${name} (${s.reaction.orgs.length + 1}th Chapter)`;
  const org: OppositionOrg = {
    id: nid(s, 'o'),
    name,
    tactic: rng.pick(['petitions', 'investigations', 'counter-events', 'regulations', 'media'] as const),
    homeCountry: cc ?? topCountry(s),
    strength: rng.int(25, 50),
    createdAt: s.time,
    backfires: 0,
    motifKey: d.motif.key,
  };
  s.reaction.orgs.push(org);
  return org;
}

const doc = (d: Doctrine) => d.id;

// ------------------------------------------------------------ definitions

export const EVENT_DEFS: EventDef[] = [
  // ---------------- news (no decision)
  {
    id: 'doctrine-incident', category: 'Recruitment success', minPhase: 1, cooldown: 30,
    weight: (s) => 3 + s.phase,
    build: (s, rng) => {
      const cid = pickCity(s, rng);
      if (cid == null) return null;
      const d = pickDoctrine(s, rng);
      useDoctrine(s, d);
      const ctx = makeCtx(s, { cityId: cid, doctrine: d });
      const headline = headlineCase(fill(rng.pick(d.motif.incidents), ctx));
      const body = fill(
        rng.pick([
          'Observers attribute the development to the growing number of {F}, who are said to {verb} with "unsettling commitment".',
          'Officials in {city} described the situation as "new". {F} described it as "overdue".',
          'The phenomenon follows the founding principle that people should {verb}. {Title} has not commented, which members interpret as approval.',
        ]),
        ctx,
      );
      return { headline, body, cityId: cid, quote: rng.chance(0.5) ? quote(s, rng, ctx) : undefined, effects: [{ k: 'awareness', v: 0.15, scope: 'city', target: cid }], refs: { doctrineId: d.id } };
    },
  },
  {
    id: 'embarrassment', category: 'Public embarrassment', minPhase: 2, cooldown: 120,
    weight: () => 2,
    build: (s, rng) => {
      const cid = pickCity(s, rng);
      if (cid == null) return null;
      const d = pickDoctrine(s, rng);
      useDoctrine(s, d);
      const ctx = makeCtx(s, { cityId: cid, doctrine: d });
      const headline = headlineCase(
        fill(
          rng.pick([
            '{Adj} Delegation Arrives in {city} One Week Early, Waits Patiently',
            'Spokesperson Unable to Explain Fundamental Doctrine on Live Radio',
            '{city} {MeetingS} Accidentally Booked Into Dentists\' Convention',
            'Movement Officially Denies Allegations That Nobody Was Making',
            'Ceremonial {Noun} Malfunctions During {city} Address',
          ]),
          ctx,
        ),
      );
      return {
        headline, cityId: cid,
        body: fill('The incident drew laughter from onlookers in {city}. {F} insist it went "exactly as intended." Enthusiasm dipped slightly; awareness did not.', ctx),
        effects: [{ k: 'enthusiasm', v: -2 }, { k: 'awareness', v: 0.2, scope: 'city', target: cid }],
      };
    },
  },
  {
    id: 'sudden-popularity', category: 'Sudden popularity', minPhase: 2, cooldown: 150,
    weight: (s) => 1.5 + s.movement.profile.commerce / 60,
    build: (s, rng) => {
      const d = pickDoctrine(s, rng, (x) => x.attributes.commerce > 50);
      useDoctrine(s, d);
      const cc = topCountry(s);
      const cid = pickCity(s, rng, (id) => city(id).cc === cc);
      const ctx = makeCtx(s, { cityId: cid, doctrine: d });
      return {
        headline: headlineCase(fill(rng.pick(['{Noun} Sales Surge {n}% in {country}', '{Plural} Become Unexpected Fashion Statement in {city}', 'Teenagers in {country} Now Ironically {verbIng}, Then Unironically']), { ...ctx, n: String(rng.int(140, 900)), verbIng: d.motif.verb.replace(/^(\w+)/, (w) => (w.endsWith('e') ? w.slice(0, -1) : w) + 'ing') })),
        body: fill('Market analysts in {country} cannot explain it. {F} can, at length.', ctx),
        cityId: cid,
        effects: [{ k: 'boost', kind: 'passive', mult: 1.4, duration: 240, scope: cc, label: `${d.motif.noun} craze in ${countryName(cc)}` }],
      };
    },
  },
  {
    id: 'study', category: 'Media frenzy', minPhase: 2, cooldown: 300,
    weight: () => 1,
    build: (s, rng) => {
      const d = pickDoctrine(s, rng);
      const ctx = makeCtx(s, { doctrine: d });
      return {
        headline: 'New Study Finds No Evidence Supporting Movement\'s Claims. Recruitment Increases.',
        body: fill('Researchers concluded that the doctrine that people should {verb} "has no measurable benefit." Within hours, sign-ups rose sharply among people who enjoy being told no.', ctx),
        effects: [{ k: 'boost', kind: 'conversion', mult: 1.2, duration: 180, label: 'Contrarian surge' }],
      };
    },
  },
  {
    id: 'reluctant-city', category: 'Recruitment success', minPhase: 2, cooldown: 200,
    weight: (s) => controlledCities(s).length > 1 ? 1.5 : 0,
    build: (s, rng) => {
      const ctl = controlledCities(s);
      if (!ctl.length) return null;
      const cid = rng.pick(ctl);
      const ctx = makeCtx(s, { cityId: cid });
      return {
        headline: `Entire City of ${city(cid).name} Reluctantly Agrees to Participate`,
        body: fill('“We held out as long as we reasonably could,” said one resident of {city}, now wearing the appropriate attire. Local enthusiasm is described as "grudging but rising."', ctx),
        cityId: cid, quote: quote(s, rng, ctx, 'a resident of ' + city(cid).name),
        effects: [{ k: 'enthusiasm', v: 3 }],
      };
    },
  },
  {
    id: 'follower-complaint', category: 'Follower complaint', minPhase: 2, cooldown: 150,
    weight: (s) => 1 + (100 - s.cohesion) / 40,
    build: (s, rng) => {
      const d = pickDoctrine(s, rng);
      useDoctrine(s, d);
      const ctx = makeCtx(s, { doctrine: d });
      return {
        headline: headlineCase(fill('Your Loyal Followers Have Requested Clarification Regarding {Plural}', ctx)),
        body: fill('A petition signed by several thousand {F} asks whether {heresy} are acceptable under the founding doctrine (“{original}”). The petition itself is formatted inconsistently, which has generated a second petition.', ctx),
        effects: [{ k: 'cohesion', v: -2 }],
        refs: { doctrineId: d.id },
      };
    },
  },
  {
    id: 'unexpected-hero', category: 'Unexpected hero', minPhase: 2, cooldown: 240,
    weight: () => 1,
    build: (s, rng) => {
      const cid = pickCity(s, rng);
      if (cid == null) return null;
      const d = pickDoctrine(s, rng);
      const ctx = makeCtx(s, { cityId: cid, doctrine: d });
      const hero = fictionalPerson(rng);
      return {
        headline: headlineCase(fill(`${hero}, a {f} From {city}, Hailed as Hero After Using {Noun} to Rescue Stranded Cat`, ctx)),
        body: fill(`${hero} credited the doctrine that people should {verb}. The cat has not joined, but is said to be considering it.`, ctx),
        cityId: cid,
        effects: [{ k: 'enthusiasm', v: 5 }, { k: 'awareness', v: 0.3, scope: 'country', target: city(cid).cc }],
      };
    },
  },
  {
    id: 'merch-boom', category: 'Merchandise boom', minPhase: 3, cooldown: 240,
    weight: (s) => (s.fundsUnlocked ? 2 : 0.5),
    build: (s, rng) => {
      const d = pickDoctrine(s, rng, (x) => x.attributes.commerce > 45);
      const ctx = makeCtx(s, { doctrine: d });
      const amt = Math.round(2000 + s.totals.followers * 0.002);
      return {
        headline: headlineCase(fill(rng.pick(['Official {Adj} {Noun} Merchandise Sells Out Worldwide', 'Limited-Edition Commemorative {Plural} Fetch Absurd Prices', 'The {Industry} Industry Thanks {Title} in Full-Page Advertisement']), ctx)),
        body: fill('Movement Funds swell as members purchase official goods. Purists note that the doctrine never mentioned gift shops.', ctx),
        effects: s.fundsUnlocked ? [{ k: 'funds', v: amt }, { k: 'drift', v: 1 }] : [{ k: 'influence', v: 8 }],
      };
    },
  },
  {
    id: 'bureaucratic-paralysis', category: 'Total bureaucratic paralysis', minPhase: 3, cooldown: 300,
    weight: (s) => (s.bureaucracy > 30 ? s.bureaucracy / 15 : 0),
    build: (s, rng) => {
      const ctx = makeCtx(s, { doctrine: pickDoctrine(s, rng) });
      return {
        headline: rng.pick([
          'Regional Leadership Announces Emergency Meeting to Discuss Whether Emergency Meetings Are Permitted',
          'Snack Approval Process Now Takes Six Months',
          `Form 14-B Required to Request Form 14-A`,
          headlineCase(fill('{committee} Forms Subcommittee to Review Its Own Formation', ctx)),
        ]),
        body: 'Operations slow temporarily while paperwork is completed in triplicate. Morale is described as "pending review."',
        effects: [{ k: 'boost', kind: 'conversion', mult: 0.85, duration: 180, label: 'Paperwork backlog' }, { k: 'cohesion', v: 1 }],
      };
    },
  },
  {
    id: 'misunderstood', category: 'Misunderstood teaching', minPhase: 3, cooldown: 240,
    weight: (s) => 1 + s.drift / 30,
    build: (s, rng) => {
      const d = pickDoctrine(s, rng);
      useDoctrine(s, d);
      const cid = pickCity(s, rng);
      const ctx = makeCtx(s, { cityId: cid, doctrine: d });
      s.counters.misunderstandings = (s.counters.misunderstandings ?? 0) + 1;
      return {
        headline: 'Members Insist the Founder\'s Teachings Have Been Taken Out of Context',
        body: fill('A chapter in {city} has concluded that the doctrine “{original}” actually means {radical}. {Title} is said to be "reviewing the transcript."', ctx),
        cityId: cid,
        effects: [{ k: 'drift', v: 3 }],
        refs: { doctrineId: d.id },
      };
    },
  },
  {
    id: 'former-member', category: 'Internal leadership conflict', minPhase: 4, cooldown: 400,
    weight: (s) => s.drift / 20,
    build: (s, rng) => {
      const d = s.movement.doctrines.find((x) => x.modificationHistory.length) ?? pickDoctrine(s, rng);
      const ctx = makeCtx(s, { doctrine: d });
      const who = fictionalPerson(rng);
      return {
        headline: 'Former Member Claims the Movement Has Lost Its Way',
        body: fill(`${who}, an early {f}, says the movement "used to be about {original}" and now "is mostly about forms." The current doctrine reads: “{doctrine}”.`, ctx),
        effects: [{ k: 'cohesion', v: -2 }],
        quote: `“I was there at the ${s.movement.headquarters.type.toLowerCase()}. It was different then.” — ${who}`,
      };
    },
  },
  {
    id: 'economic', category: 'Economic consequence', minPhase: 5, cooldown: 300,
    weight: () => 1.5,
    build: (s, rng) => {
      const d = pickDoctrine(s, rng);
      useDoctrine(s, d);
      const cc = topCountry(s);
      const ctx = makeCtx(s, { doctrine: d, cityId: pickCity(s, rng, (id) => city(id).cc === cc) });
      return {
        headline: headlineCase(fill(rng.pick(['{Industry} Stocks Soar on {Adj} Demand', 'Central Bank of {country} Cites "{Plural}" in Inflation Report', 'International {Shortage} Shortage Threatens Global Supply Chains']), ctx)),
        body: fill('Economists describe the movement as a "structural factor". Followers describe it as "the plan".', ctx),
        effects: [{ k: 'influence', v: 10 }, s.fundsUnlocked ? { k: 'funds', v: 5000 } : { k: 'enthusiasm', v: 2 }],
      };
    },
  },
  {
    id: 'cultural', category: 'Cultural consequence', minPhase: 5, cooldown: 300,
    weight: () => 1.5,
    build: (s, rng) => {
      const d = pickDoctrine(s, rng);
      useDoctrine(s, d);
      const cc = topCountry(s);
      const ctx = makeCtx(s, { doctrine: d, cityId: pickCity(s, rng, (id) => city(id).cc === cc) });
      return {
        headline: headlineCase(
          fill(rng.pick(['Parliament of {country} Adopts {Adj} Customs for Official Functions', 'Schools in {country} Add {Plural} to Curriculum', '{day} Declared a Public Holiday in {country}', 'Architects in {city} Now Required to Consult a {f}']), ctx),
        ),
        body: fill('What began in a {hq} has become, for millions, simply how things are done.', ctx),
        effects: [{ k: 'resistance', v: -0.05, scope: 'country', target: cc }, { k: 'boost', kind: 'passive', mult: 1.3, duration: 300, scope: cc, label: `Cultural adoption in ${countryName(cc)}` }],
      };
    },
  },
  {
    id: 'anniversary', category: 'Event memory', minPhase: 3, cooldown: 600,
    weight: (s) => (s.events.some((e) => e.choices && e.choiceSelected != null && s.time - e.time > 300) ? 1.5 : 0),
    build: (s, rng) => {
      const old = s.events.filter((e) => e.choices && e.choiceSelected != null && s.time - e.time > 300);
      if (!old.length) return null;
      const e = rng.pick(old);
      const choice = e.choices![e.choiceSelected!];
      return {
        headline: headlineCase(`Members Mark Anniversary of “${e.headline.replace(/^The /i, '')}”`),
        body: `Commemorations recall the founder's decision to ${choice.label.replace(/\.$/, '').toLowerCase()}. ${rng.pick(['Opinions about whether it was the right call remain sharply divided.', 'A commemorative plaque was unveiled; its wording is already disputed.', 'Historians aligned with the movement call it "a masterstroke".'])}`,
        effects: [{ k: 'cohesion', v: rng.chance(0.5) ? 2 : -2 }],
        refs: { eventId: e.id },
      };
    },
  },
  {
    id: 'faction-news', category: 'Rival movement activity', minPhase: 3, cooldown: 120,
    weight: (s) => liveFactions(s).length * 1.5,
    build: (s, rng) => {
      const f = rng.pick(liveFactions(s));
      if (!f) return null;
      const origin = s.events.find((e) => e.id === f.originEventId);
      const ctx = makeCtx(s, { faction: f, cityId: f.hqCityId });
      const hostile = f.relationship === 'rival' || f.relationship === 'hostile';
      const headline =
        f.kind === 'rival'
          ? fill(rng.pick([`${f.name} Opens Branch in {city}`, `${f.founder} Calls ${s.movement.ideologyName} "A Fad"`, `${f.members} Hold Counter-${'{MeetingS}'} in {city}`, `${f.name} Members Fail to Agree on ${f.doctrineDifferences[0].replace(/\.$/, '')}`]), ctx)
          : fill(rng.pick([`${f.name} Holds First Congress in {city}`, `${f.founder} of ${f.name}: "We Are the True ${s.movement.pluralFollowers}"`, `${f.name} Publishes Rival Handbook, Two Pages Longer`]), ctx);
      return {
        headline: headlineCase(headline),
        body: `${f.name} (${f.relationship}) now claims ${fmt(f.followerCount)} members. ${origin ? `The group traces its origin to “${origin.headline}”.` : ''} ${hostile ? 'Its growth continues to draw members away.' : 'Relations are currently civil.'}`,
        cityId: f.hqCityId,
        refs: { factionId: f.id },
        effects: hostile ? [{ k: 'cohesion', v: -1 }] : [],
      };
    },
  },
  {
    id: 'opposition-action', category: 'Local government inquiry', minPhase: 3, minStage: 3, cooldown: 90,
    weight: (s) => s.reaction.orgs.filter((o) => !o.dissolved).length * 1.4,
    build: (s, rng) => {
      const o = oppositionOrg(s, rng);
      if (!o) return null;
      const cid = pickCity(s, rng, (id) => city(id).cc === o.homeCountry) ?? pickCity(s, rng);
      const ctx = makeCtx(s, { org: o, cityId: cid });
      const backfire = rng.chance(0.25 + s.movement.profile.zeal * 0.1);
      const lines: Record<OppositionOrg['tactic'], string[]> = {
        petitions: ['{org} Delivers Petition With {n} Signatures to {city} Council'],
        investigations: ['Investigations Have Been Launched', '{org} Demands Inquiry Into {city} {Meeting}'],
        'counter-events': ['{org} Holds "Normal Day" Counter-Festival in {city}'],
        regulations: ['{city} Considers Ordinance Limiting {Measure}', '{org} Lobbies for Strict {Noun} Regulations'],
        media: ['{org} Launches Advertising Campaign: "Have You Considered Not?"'],
      };
      const headline = headlineCase(fill(rng.pick(lines[o.tactic]), { ...ctx, n: fmt(rng.int(800, 90000)) }));
      if (backfire) {
        o.backfires++;
        return {
          headline, cityId: cid, refs: { orgId: o.id },
          body: fill('The effort backfired. Coverage of the campaign introduced thousands to the movement for the first time, many of whom now {verb}.', ctx),
          effects: [{ k: 'awareness', v: 0.25, scope: 'country', target: city(cid ?? s.movement.headquarters.cityId).cc }, { k: 'org', orgId: o.id, v: -6 }],
        };
      }
      return {
        headline, cityId: cid, refs: { orgId: o.id },
        body: fill('{org} has slowed the movement\'s progress locally. {F} called the campaign "deeply unreasonable."', ctx),
        quote: quote(s, rng, ctx),
        effects: [
          { k: 'resistance', v: 0.03 + o.strength / 1500, scope: 'country', target: o.homeCountry },
          ...(cid != null ? [{ k: 'resistance' as const, v: 0.06, scope: 'city' as const, target: cid }] : []),
          { k: 'org', orgId: o.id, v: 3 },
        ],
      };
    },
  },
  {
    id: 'rival-implodes', category: 'Rival movement activity', minPhase: 4, cooldown: 400,
    weight: (s) => liveFactions(s).filter((f) => f.kind === 'rival' && f.cohesion < 45).length * 2,
    build: (s, rng) => {
      const f = rng.pick(liveFactions(s).filter((x) => x.kind === 'rival' && x.cohesion < 45));
      if (!f) return null;
      f.relationship = 'dissolved';
      let freed = 0;
      for (const id of f.locations) {
        const cd = s.cities[id];
        if (!cd) continue;
        freed += cd.others[f.id] ?? 0;
        delete cd.others[f.id];
        cd.awareness = Math.min(1, cd.awareness + 0.3);
      }
      return {
        headline: headlineCase(`${f.name} Implodes After Members Fail to Agree on ${f.doctrineDifferences[0].replace(/\.$/, '')}`),
        body: `${fmt(freed)} former ${f.members} are now unaffiliated, curious, and very much aware of ${s.movement.ideologyName}.`,
        cityId: f.hqCityId,
        refs: { factionId: f.id },
        effects: [{ k: 'enthusiasm', v: 4 }],
      };
    },
  },

  // ---------------- decisions
  {
    id: 'great-controversy', category: 'Ceremonial dispute', minPhase: 2, decision: true, cooldown: 260,
    weight: (s) => (s.totals.citiesEver85 >= 2 ? 2 + s.phase * 0.4 : 0),
    build: (s, rng) => {
      const d = pickDoctrine(s, rng, (x) => x.attributes.ambiguity > 40);
      useDoctrine(s, d);
      const ctx = makeCtx(s, { doctrine: d });
      const N = ctx.Noun;
      return {
        headline: `The Great ${N} Controversy`,
        body: fill('Members are divided over the official status of {heresy}. The founding text (“{original}”) does not mention them, which both sides consider decisive.', ctx),
        quote: quote(s, rng, ctx),
        important: true,
        refs: { doctrineId: d.id },
        choices: [
          {
            label: fill('Recognize {heresy} as valid.', ctx),
            description: 'Broadens appeal. Traditionalists will be upset.',
            effects: [{ k: 'drift', v: 8 }, { k: 'boost', kind: 'conversion', mult: 1.2, duration: 300, label: 'Broader appeal' }, { k: 'doctrineText', doctrineId: d.id, text: `${d.currentText.replace(/\.$/, '')} (${d.motif.heresy} included).`, reason: 'The Great Controversy' }, { k: 'doctrineAttr', doctrineId: d.id, attr: 'appeal', v: 8 }],
            delayed: [{ delay: 120, effects: rng.chance(0.6) ? [{ k: 'spawnSplinter', doctrineId: d.id, style: 'orthodox' }] : [{ k: 'cohesion', v: -4 }], headline: fill('Traditionalists Denounce Acceptance of {Heresy}', ctx) }],
            outcome: fill('{heresy} are now officially acceptable. Somewhere, a purist sharpens a pamphlet.', ctx),
            hint: 'Growth now; orthodox backlash later',
          },
          {
            label: `Establish an official ${d.motif.committee}.`,
            description: 'Buys time. Adds bureaucracy. The committee will eventually report.',
            effects: [{ k: 'committee', name: d.motif.committee }, { k: 'cohesion', v: 4 }],
            delayed: [{ delay: 240, effects: [{ k: 'cohesion', v: rng.chance(0.5) ? 5 : -5 }, { k: 'bureaucracy', v: 4 }], headline: fill('{committee} Issues 600-Page Report; Recommends Further Study', ctx) }],
            outcome: fill('The {committee} convenes. Its first decision concerns the font of its letterhead.', ctx),
            hint: '+bureaucracy, delayed verdict',
          },
          {
            label: 'Refuse to address this nonsense.',
            description: 'Firm. Some will feel unheard.',
            effects: [{ k: 'cohesion', v: -6 }, { k: 'control', v: 4 }],
            delayed: [{ delay: 150, effects: rng.chance(0.45) ? [{ k: 'spawnSplinter', doctrineId: d.id, style: 'progressive' }] : [{ k: 'enthusiasm', v: -3 }], headline: fill('{Heresy} Advocates Continue Campaign Despite Silence From Leadership', ctx) }],
            outcome: `${s.movement.founderTitle} declines to comment. The silence is analyzed for weeks.`,
            hint: 'Keeps control; risks progressive splinter',
          },
          {
            label: 'Let local chapters decide.',
            description: 'Peaceful. The doctrine will mean different things in different places.',
            effects: [{ k: 'drift', v: 6 }, { k: 'cohesion', v: 3 }, { k: 'control', v: -5 }],
            outcome: fill('Chapters decide independently. In some cities {heresy} are mandatory; in others, illegal.', ctx),
            hint: '+drift, −founder control',
          },
        ],
      };
    },
  },
  {
    id: 'architecture-crisis', category: 'Outpost incident', minPhase: 4, decision: true, cooldown: 600,
    weight: (s) => (Object.keys(s.outposts).length && s.movement.doctrines.some((d) => d.category === 'housing') ? 2.5 : Object.keys(s.outposts).length ? 0.8 : 0),
    build: (s, rng) => {
      const ops = Object.values(s.outposts);
      if (!ops.length) return null;
      const op = rng.pick(ops);
      const d = s.movement.doctrines.find((x) => x.category === 'housing') ?? pickDoctrine(s, rng);
      const c = city(op.cityId);
      const ctx = makeCtx(s, { doctrine: d, cityId: op.cityId });
      return {
        headline: headlineCase(fill('The International {Noun} Crisis', ctx)),
        body: fill(`The {outpostS} in {city} has been constructed using concrete and steel. Orthodox members argue this violates the founding requirement that {F} {verb}.`, ctx),
        cityId: op.cityId, important: true, refs: { doctrineId: d.id },
        choices: [
          { label: fill('Require immediate conversion to traditional {plural}.', ctx), description: 'Orthodox. Expensive.', effects: [{ k: 'cohesion', v: 6 }, { k: 'influence', v: -15 }, { k: 'control', v: 5 }, { k: 'resistance', v: 0.05, scope: 'country', target: c.cc }], outcome: fill('Demolition crews and {industry} specialists arrive in {city}.', ctx), hint: '+cohesion, costs influence' },
          { label: fill('Declare that all suitable buildings are technically {plural}.', ctx), description: 'Clever. Doctrinal drift.', effects: [{ k: 'drift', v: 10 }, { k: 'doctrineText', doctrineId: d.id, text: `${d.currentText.replace(/\.$/, '')} (all suitable structures qualify).`, reason: 'International Crisis' }, { k: 'boost', kind: 'conversion', mult: 1.15, duration: 300, scope: c.cc, label: 'Architectural flexibility' }], outcome: 'Architects worldwide are relieved. Purists are not.', hint: '+drift, local growth' },
          { label: fill('Establish an International Committee on {Noun} Compliance.', ctx), description: 'Bureaucratic.', effects: [{ k: 'committee', name: fill('International Committee on {Noun} Compliance', ctx) }, { k: 'cohesion', v: 2 }], outcome: 'The Committee schedules an inspection for next fiscal year.', hint: '+bureaucracy' },
          { label: 'Denounce architecture as a distraction from the movement\'s true purpose.', description: 'Radical.', effects: [{ k: 'drift', v: 6 }, { k: 'enthusiasm', v: 5 }], delayed: [{ delay: 120, effects: rng.chance(0.5) ? [{ k: 'spawnSplinter', doctrineId: d.id, style: 'radical' }] : [], headline: 'Anti-Architecture Wing Holds Meeting Outdoors, Gets Rained On' }], outcome: 'Members are urged to look past walls. Several walk into them.', hint: '+enthusiasm, radical risk' },
        ],
      };
    },
  },
  {
    id: 'shortage', category: 'Economic consequence', minPhase: 4, decision: true, cooldown: 500,
    weight: (s) => 1.2 + s.movement.profile.commerce / 60,
    build: (s, rng) => {
      const d = pickDoctrine(s, rng, (x) => x.attributes.commerce > 50);
      useDoctrine(s, d);
      const ctx = makeCtx(s, { doctrine: d });
      const cost = s.fundsUnlocked ? 15000 + Math.round(s.totals.followers * 0.002) : 0;
      return {
        headline: headlineCase(fill('International {Shortage} Shortage Threatens Global {Industry} Industry', ctx)),
        body: fill('Demand from {F} has outstripped worldwide supply of {shortage}. Prices have tripled. Members ask what the founder intends to do.', ctx),
        important: true, refs: { doctrineId: d.id },
        choices: [
          { label: 'Invest in manufacturing.', description: cost ? `Costs ${fmt(cost)} funds.` : 'Costs 25 influence.', effects: cost ? [{ k: 'funds', v: -cost }, { k: 'enthusiasm', v: 5 }, { k: 'boost', kind: 'conversion', mult: 1.15, duration: 400, label: 'Supply secured' }] : [{ k: 'influence', v: -25 }, { k: 'enthusiasm', v: 5 }], outcome: fill('{Adj} factories open. {Shortage} flow once more.', ctx), hint: 'Costs resources, boosts growth' },
          { label: 'Relax the doctrine temporarily.', description: 'Practical. Some members object.', effects: [{ k: 'drift', v: 7 }, { k: 'cohesion', v: -4 }, { k: 'doctrineText', doctrineId: d.id, text: `${d.currentText.replace(/\.$/, '')} (where supplies permit).`, reason: 'Shortage' }], outcome: 'An asterisk is added to the doctrine. Asterisks are now controversial.', hint: '+drift, −cohesion' },
          { label: 'Insist the world must adjust.', description: 'Uncompromising.', effects: [{ k: 'enthusiasm', v: 6 }, { k: 'resistance', v: 0.04, scope: 'global' }, { k: 'control', v: 3 }], outcome: fill('The world is informed that it will simply need to make more {shortage}.', ctx), hint: '+enthusiasm, +resistance' },
        ],
      };
    },
  },
  {
    id: 'leadership-conflict', category: 'Internal leadership conflict', minPhase: 3, decision: true, cooldown: 400,
    weight: (s) => 1 + Object.keys(s.outposts).length * 0.3,
    build: (s, rng) => {
      const a = fictionalPerson(rng);
      const b = fictionalPerson(rng);
      const d = pickDoctrine(s, rng);
      const ctx = makeCtx(s, { doctrine: d });
      const cc = topCountry(s);
      return {
        headline: headlineCase(`Leadership Dispute Divides ${countryName(cc)} ${s.movement.pluralFollowers}`),
        body: fill(`Regional coordinator ${a} insists that {purism}. Deputy coordinator ${b} believes {heresy} are "basically fine". Each has scheduled a rival {meetingS} at the same time, in the same room.`, ctx),
        important: true,
        choices: [
          { label: `Back ${a} (the purist).`, description: 'Orthodoxy wins locally.', effects: [{ k: 'cohesion', v: 3 }, { k: 'control', v: 3 }, { k: 'resistance', v: 0.03, scope: 'country', target: cc }], delayed: [{ delay: 180, effects: rng.chance(0.4) ? [{ k: 'spawnSplinter', doctrineId: d.id, style: 'progressive' }] : [], headline: `${b} Resigns, Promises "Big Announcement"` }], outcome: `${a} is confirmed. ${b} has been seen drafting a manifesto.`, hint: 'Possible progressive splinter' },
          { label: `Back ${b} (the pragmatist).`, description: 'Flexibility wins locally.', effects: [{ k: 'drift', v: 4 }, { k: 'boost', kind: 'conversion', mult: 1.15, duration: 300, scope: cc, label: 'Pragmatic leadership' }], delayed: [{ delay: 180, effects: rng.chance(0.4) ? [{ k: 'spawnSplinter', doctrineId: d.id, style: 'orthodox' }] : [], headline: `${a} Denounces "Watered-Down" Leadership` }], outcome: `${b} is confirmed. ${a} has begun wearing a very serious expression.`, hint: 'Possible orthodox splinter' },
          { label: 'Appoint both as co-coordinators with a committee to mediate.', description: 'Nobody loses. Nothing happens.', effects: [{ k: 'committee', name: `${countryName(cc)} Coordination Mediation Board` }, { k: 'boost', kind: 'conversion', mult: 0.9, duration: 240, scope: cc, label: 'Mediation gridlock' }], outcome: 'The mediation board meets weekly. The coordinators sit at opposite ends.', hint: '+bureaucracy, slower growth' },
          { label: 'Dismiss both and send zealots to restore order.', description: 'Costs 2 idle zealots.', effects: [{ k: 'zealots', v: -2 }, { k: 'cohesion', v: 5 }, { k: 'control', v: 6 }], outcome: 'Order is restored. Both former coordinators now run a podcast.', hint: '−2 zealots' },
        ],
      };
    },
  },
  {
    id: 'investigation', category: 'Local government inquiry', minPhase: 3, minStage: 3, decision: true, cooldown: 420,
    weight: (s) => 1 + s.reaction.stage * 0.4,
    build: (s, rng) => {
      const o = oppositionOrg(s, rng) ?? createOppositionOrg(s, rng);
      const cc = o.homeCountry;
      const cid = pickCity(s, rng, (id) => city(id).cc === cc);
      const ctx = makeCtx(s, { org: o, cityId: cid, doctrine: pickDoctrine(s, rng) });
      return {
        headline: 'Investigations Have Been Launched.',
        body: fill(`Prompted by {org}, officials in {country} have opened an inquiry into the activities of {F}, specifically the practice of people choosing to {verb}.`, ctx),
        cityId: cid, important: true, refs: { orgId: o.id },
        choices: [
          { label: 'Cooperate fully and transparently.', description: 'Lower resistance, lower enthusiasm.', effects: [{ k: 'resistance', v: -0.06, scope: 'country', target: cc }, { k: 'enthusiasm', v: -3 }, { k: 'org', orgId: o.id, v: -10 }], outcome: 'Investigators find nothing illegal, only a great deal that is unusual.', hint: '−resistance' },
          { label: 'Declare that the system is rigged.', description: 'Rallies the base. Annoys officials.', effects: [{ k: 'enthusiasm', v: 7 }, { k: 'resistance', v: 0.06, scope: 'country', target: cc }, { k: 'org', orgId: o.id, v: 5 }], outcome: '“The system is rigged,” members chant, while also complying with most of it.', hint: '+enthusiasm, +resistance' },
          { label: fill('Invite the investigators to a {meetingS}.', ctx), description: 'Gamble: they might convert.', effects: rng.chance(0.55) ? [{ k: 'org', orgId: o.id, v: -25 }, { k: 'awareness', v: 0.3, scope: 'country', target: cc }, { k: 'news', headline: 'Lead Investigator Seen Enjoying Himself at Movement Event' }] : [{ k: 'resistance', v: 0.05, scope: 'country', target: cc }, { k: 'news', headline: 'Investigators Describe Movement Event as "Exhausting"' }], outcome: 'The investigators attend. The results will be in the news.', hint: 'Risky' },
          { label: `Launch a counter-${s.movement.meetingSingular.toLowerCase()} campaign.`, description: 'Costs 20 influence.', effects: [{ k: 'influence', v: -20 }, { k: 'boost', kind: 'awareness', mult: 1.5, duration: 300, scope: cc, label: 'Counter-campaign' }], outcome: 'A counter-campaign begins. Billboards appear overnight.', hint: 'Costs influence, +awareness' },
        ],
      };
    },
  },
  {
    id: 'celebrity', category: 'Sudden popularity', minPhase: 3, decision: true, cooldown: 500,
    weight: () => 1,
    build: (s, rng) => {
      const who = fictionalPerson(rng);
      const role = rng.pick(CELEBRITY_ROLES);
      const d = pickDoctrine(s, rng);
      const ctx = makeCtx(s, { doctrine: d });
      return {
        headline: headlineCase(`${who} Announces Conversion to ${s.movement.ideologyName}`),
        body: fill(`${who}, a ${role}, has begun to {verb} publicly and wishes to become an official ambassador. Their understanding of the doctrine is enthusiastic but approximate.`, ctx),
        important: true,
        choices: [
          { label: 'Appoint them Official Ambassador.', description: 'Huge awareness. They will improvise doctrine.', effects: [{ k: 'awareness', v: 0.15, scope: 'global' }, { k: 'drift', v: 5 }, { k: 'boost', kind: 'conversion', mult: 1.25, duration: 360, label: `${who} effect` }], delayed: [{ delay: 200, effects: [{ k: 'drift', v: 4 }, { k: 'cohesion', v: -3 }], headline: fill(`${who} Tells Talk Show That {radical}`, ctx) }], outcome: `${who} accepts and immediately mispronounces ${s.movement.ideologyName}.`, hint: 'Big boost, later drift' },
          { label: 'Accept their support quietly.', description: 'Modest boost.', effects: [{ k: 'boost', kind: 'awareness', mult: 1.3, duration: 240, label: 'Celebrity mention' }], outcome: 'They mention the movement in one interview. It is enough.', hint: 'Small, safe' },
          { label: 'Decline: the movement needs no celebrities.', description: 'Purists approve.', effects: [{ k: 'cohesion', v: 4 }, { k: 'control', v: 3 }], outcome: 'The refusal itself becomes a headline, which is almost as good.', hint: '+cohesion' },
        ],
      };
    },
  },
  {
    id: 'reinterpretation', category: 'Doctrine reinterpretation', minPhase: 4, decision: true, cooldown: 420,
    weight: (s) => 1 + s.drift / 25,
    build: (s, rng) => {
      const d = pickDoctrine(s, rng);
      useDoctrine(s, d);
      const cid = pickCity(s, rng, (id) => city(id).cc !== city(s.movement.headquarters.cityId).cc) ?? pickCity(s, rng);
      if (cid == null) return null;
      const c = city(cid);
      const ctx = makeCtx(s, { doctrine: d, cityId: cid });
      const local = `${d.currentText.replace(/\.$/, '')} (in ${countryName(c.cc)}, interpreted as: ${d.motif.radical})`;
      return {
        headline: headlineCase(fill('{country} Branch Publishes Its Own Interpretation of {Plural}', ctx)),
        body: fill('The {country} branch has concluded that “{original}” means that {radical}. Membership there is growing quickly. Headquarters has not been consulted.', ctx),
        cityId: cid, important: true, refs: { doctrineId: d.id },
        choices: [
          { label: 'Endorse the interpretation worldwide.', description: 'Adaptable, popular, drifting.', effects: [{ k: 'doctrineText', doctrineId: d.id, text: local, reason: `${countryName(c.cc)} interpretation` }, { k: 'drift', v: 10 }, { k: 'boost', kind: 'passive', mult: 1.25, duration: 400, label: 'Cultural adaptation' }], outcome: 'The doctrine is officially updated. The original is preserved "for historical interest".', hint: '+growth, +drift' },
          { label: 'Condemn it as heresy.', description: 'Protects the original text.', effects: [{ k: 'cohesion', v: 3 }, { k: 'control', v: 5 }, { k: 'resistance', v: 0.05, scope: 'country', target: c.cc }], delayed: [{ delay: 120, effects: rng.chance(0.6) ? [{ k: 'spawnSplinter', doctrineId: d.id, style: 'regional', cityId: cid }] : [], headline: fill('{country} Branch "Respectfully Disagrees" With Headquarters', ctx) }], outcome: 'Headquarters issues a condemnation. The branch issues a condemnation of the condemnation.', hint: 'Regional splinter risk' },
          { label: 'Permit it as a regional variant.', description: 'Compromise.', effects: [{ k: 'drift', v: 5 }, { k: 'control', v: -3 }, { k: 'boost', kind: 'conversion', mult: 1.2, duration: 300, scope: c.cc, label: 'Regional variant' }], outcome: 'Regional variants are now officially recognized, and immediately multiply.', hint: '+drift, local growth' },
        ],
      };
    },
  },
  {
    id: 'commercial-license', category: 'Merchandise boom', minPhase: 4, decision: true, cooldown: 600,
    weight: (s) => (s.fundsUnlocked ? 1.2 : 0),
    build: (s, rng) => {
      const d = pickDoctrine(s, rng, (x) => x.attributes.commerce > 40);
      const ctx = makeCtx(s, { doctrine: d });
      const corp = rng.pick(['MegaCorp Consolidated', 'Universal Things Inc.', 'Brandwell & Sons', 'Global Products of Global Scale']);
      const amt = 20000 + Math.round(s.totals.followers * 0.004);
      return {
        headline: `${corp} Seeks License for Official ${s.movement.adjective} Products`,
        body: fill(`${corp} wishes to sell {plural} bearing the {Adj} emblem in every store on Earth.`, ctx),
        important: true,
        choices: [
          { label: 'Accept the licensing deal.', description: `+${fmt(amt)} funds. The brand will develop opinions.`, effects: [{ k: 'funds', v: amt }, { k: 'drift', v: 6 }, { k: 'awareness', v: 0.08, scope: 'global' }], outcome: `Products appear worldwide. One of them is a scented candle that smells like "${d.motif.noun}".`, hint: '+funds, +drift' },
          { label: 'Refuse. The doctrine is not for sale.', description: 'Integrity.', effects: [{ k: 'cohesion', v: 5 }, { k: 'enthusiasm', v: 3 }], outcome: `${corp} releases unofficial products anyway.`, hint: '+cohesion' },
          { label: 'Approve a strictly limited edition.', description: 'Compromise.', effects: [{ k: 'funds', v: Math.round(amt / 3) }, { k: 'drift', v: 2 }], outcome: 'The limited edition sells out in nine seconds.', hint: 'Some funds' },
        ],
      };
    },
  },
  {
    id: 'alliance-offer', category: 'Unexpected alliance', minPhase: 4, decision: true, cooldown: 500,
    weight: (s) => liveFactions(s).filter((f) => f.kind === 'rival' && f.relationship === 'rival').length * 1.2,
    build: (s, rng) => {
      const f = rng.pick(liveFactions(s).filter((x) => x.kind === 'rival' && x.relationship === 'rival'));
      if (!f) return null;
      return {
        headline: `${f.name} Proposes Alliance With ${s.movement.ideologyName}`,
        body: `${f.founder} suggests the two movements cooperate, noting that ${f.members} and ${s.movement.pluralFollowers} share "a mutual disdain for ordinary people doing ordinary things." ${f.name} believes: ${f.doctrineDifferences[0]}`,
        cityId: f.hqCityId, important: true, refs: { factionId: f.id },
        choices: [
          { label: 'Accept the alliance.', description: 'They stop poaching members; their followers count as aligned.', effects: [{ k: 'faction', factionId: f.id, relation: 'allied', disagreement: -20 }, { k: 'drift', v: 3 }], outcome: 'A joint statement is signed with two different pens, for symbolic reasons.', hint: 'Aligned followers' },
          { label: 'Propose a full merger.', description: 'Absorb them, if they agree.', effects: rng.chance(0.45) ? [{ k: 'faction', factionId: f.id, relation: 'merged', transferPct: 1 }, { k: 'drift', v: 8 }, { k: 'news', headline: `${f.name} Merges Into ${s.movement.ideologyName}; Customs Combined` }] : [{ k: 'faction', factionId: f.id, relation: 'hostile', disagreement: 20 }, { k: 'news', headline: `${f.name} Insulted by Merger Proposal` }], outcome: 'The proposal is delivered. The response will be dramatic either way.', hint: 'Gamble' },
          { label: 'Decline politely.', description: 'Status quo.', effects: [{ k: 'faction', factionId: f.id, disagreement: 5 }], outcome: 'They are declined politely, and take it impolitely.', hint: 'No change' },
        ],
      };
    },
  },
  {
    id: 'generational', category: 'Doctrine reinterpretation', minPhase: 5, decision: true, cooldown: 600,
    weight: () => 1,
    build: (s, rng) => {
      const d = pickDoctrine(s, rng);
      const ctx = makeCtx(s, { doctrine: d });
      return {
        headline: 'Young Members Call Founding Customs "Kind of Cringe"',
        body: fill('A new generation raised entirely within the movement wants to replace {plural} with {heresy}. Elders are appalled. Both groups are very loud.', ctx),
        important: true, refs: { doctrineId: d.id },
        choices: [
          { label: 'Side with the youth.', description: 'Future-proofing.', effects: [{ k: 'drift', v: 9 }, { k: 'enthusiasm', v: 6 }, { k: 'boost', kind: 'passive', mult: 1.2, duration: 400, label: 'Youth movement' }], outcome: 'The elders form a reading group about the old days.', hint: '+growth, +drift' },
          { label: 'Side with the elders.', description: 'Tradition.', effects: [{ k: 'cohesion', v: 5 }, { k: 'enthusiasm', v: -4 }], delayed: [{ delay: 150, effects: rng.chance(0.5) ? [{ k: 'spawnSplinter', doctrineId: d.id, style: 'progressive' }] : [], headline: 'Youth Wing Holds "Unofficial" Gathering' }], outcome: 'Tradition is upheld. Eye-rolling is recorded at historic levels.', hint: 'Youth splinter risk' },
          { label: 'Create a Youth Advisory Subcommittee.', description: 'Classic.', effects: [{ k: 'committee', name: 'Youth Advisory Subcommittee' }], outcome: 'The subcommittee meets in a group chat that the elders cannot find.', hint: '+bureaucracy' },
        ],
      };
    },
  },
  {
    id: 'world-day', category: 'International recognition', minPhase: 5, decision: true, cooldown: 900,
    weight: () => 0.8,
    build: (s, rng) => {
      const d = pickDoctrine(s, rng);
      const ctx = makeCtx(s, { doctrine: d });
      return {
        headline: headlineCase(fill('Proposal to Declare {day}', ctx)),
        body: fill('Several governments propose an annual worldwide observance of {plural}. Details are up to the movement.', ctx),
        important: true, refs: { doctrineId: d.id },
        choices: [
          { label: 'Make it a solemn day of reflection.', description: 'Cohesion.', effects: [{ k: 'cohesion', v: 8 }, { k: 'flag', name: `day_${d.motif.key}` }], outcome: 'The day is observed quietly and with great seriousness.', hint: '+cohesion' },
          { label: 'Make it a worldwide festival.', description: 'Growth and noise.', effects: [{ k: 'boost', kind: 'conversion', mult: 1.3, duration: 400, label: 'Worldwide festival' }, { k: 'resistance', v: 0.02, scope: 'global' }, { k: 'flag', name: `day_${d.motif.key}` }], outcome: 'The festival is enormous. Several cities run out of {shortage}.', hint: '+growth' },
          { label: 'Make it mandatory, daily.', description: 'It is no longer a day; it is life.', effects: [{ k: 'control', v: 8 }, { k: 'resistance', v: 0.05, scope: 'global' }, { k: 'enthusiasm', v: 4 }, { k: 'flag', name: `day_${d.motif.key}` }], outcome: 'Every day is now the day. Calendars are reprinted.', hint: '+control, +resistance' },
        ],
      };
    },
  },
  {
    id: 'scandal', category: 'Organizational scandal', minPhase: 3, decision: true, cooldown: 500,
    weight: (s) => 0.6 + s.bureaucracy / 50,
    build: (s, rng) => {
      const d = pickDoctrine(s, rng);
      const ctx = makeCtx(s, { doctrine: d });
      const who = fictionalPerson(rng);
      return {
        headline: headlineCase(fill(`Treasurer ${who} Accused of Spending Movement Budget on Personal {Plural}`, ctx)),
        body: fill(`Receipts show ${who} acquired an extraordinary number of {plural} "for doctrinal research."`, ctx),
        important: true,
        choices: [
          { label: 'Issue a full public apology.', description: 'Honest.', effects: [{ k: 'enthusiasm', v: -3 }, { k: 'resistance', v: -0.03, scope: 'global' }], outcome: 'The apology is accepted. The {plural} are donated.'.replace('{plural}', d.motif.plural), hint: '−resistance' },
          { label: 'Deny everything.', description: '“Movement Officially Denies Allegations.”', effects: [{ k: 'resistance', v: 0.04, scope: 'global' }, { k: 'control', v: 2 }], outcome: 'The movement denies the allegations, and several others nobody had made.', hint: '+resistance' },
          { label: `Promote ${who} to Head of Doctrinal Research.`, description: 'Bold.', effects: [{ k: 'drift', v: 4 }, { k: 'enthusiasm', v: 4 }, { k: 'committee', name: 'Department of Doctrinal Research' }], outcome: `${who} accepts the promotion and requests a larger budget.`, hint: 'Chaotic' },
        ],
      };
    },
  },
  {
    id: 'un-clarification', category: 'International recognition', minPhase: 6, decision: true, cooldown: 900,
    weight: () => 1,
    build: (s, rng) => {
      const d = pickDoctrine(s, rng);
      const ctx = makeCtx(s, { doctrine: d });
      return {
        headline: headlineCase(fill('United Nations of the Fictional World Requests Clarification on {Adj} {Measure} Regulations', ctx)),
        body: fill('Delegates from dozens of nations ask {Title} for a definitive statement on {measure}, citing "practical difficulties" with {plural}.', ctx),
        important: true, refs: { doctrineId: d.id },
        choices: [
          { label: 'Provide a precise, binding standard.', description: '+control, +bureaucracy.', effects: [{ k: 'control', v: 8 }, { k: 'bureaucracy', v: 8 }, { k: 'cohesion', v: 4 }, { k: 'resistance', v: -0.04, scope: 'global' }], outcome: 'A 400-page standard is delivered. It is adopted unread.', hint: 'Order' },
          { label: 'Reply with an inspiring but vague speech.', description: 'Inspiring. Vague.', effects: [{ k: 'enthusiasm', v: 8 }, { k: 'drift', v: 6 }], outcome: 'Delegates weep openly, then ask what it meant.', hint: '+enthusiasm, +drift' },
          { label: 'Founder issues clarification. Confusion increases.', description: 'Classic.', effects: [{ k: 'drift', v: 4 }, { k: 'awareness', v: 0.1, scope: 'global' }], outcome: 'The clarification is translated into 190 languages, each differently.', hint: '+awareness' },
        ],
      };
    },
  },
];

export const EVENT_DEF_BY_ID = Object.fromEntries(EVENT_DEFS.map((d) => [d.id, d]));

// ------------------------------------------------------------ runtime

export function eventInterval(s: GameState): number {
  const mode = MODES[s.movement.gameMode];
  return (BALANCE.eventIntervalBase / (mode.eventFrequency * s.settings.eventFrequency)) * (s.phase <= 2 ? 1.2 : 1);
}

export function runEventCheck(s: GameState, rng: Rng, offline = false): GameEvent | null {
  const pendingFull = s.pendingDecisions.length >= BALANCE.maxPendingDecisions;
  const candidates = EVENT_DEFS.filter(
    (d) =>
      s.phase >= d.minPhase &&
      (d.minStage == null || s.reaction.stage >= d.minStage) &&
      !(d.decision && pendingFull) &&
      (s.cooldowns[d.id] ?? -Infinity) <= s.time,
  );
  for (let attempt = 0; attempt < 4; attempt++) {
    const def = rng.weighted(candidates, (d) => {
      let w = d.weight(s);
      if (s.recentCategories.slice(-3).includes(d.category)) w *= 0.25; // category rotation
      return w;
    });
    if (!def) return null;
    const built = def.build(s, rng);
    if (!built) continue;
    if (s.recentHeadlines.includes(built.headline)) continue; // no identical repeats
    return emitBuilt(s, def, built, rng, offline);
  }
  return null;
}

export function triggerEvent(s: GameState, defId: string, rng: Rng, offline = false): GameEvent | null {
  const def = EVENT_DEF_BY_ID[defId];
  if (!def) return null;
  const built = def.build(s, rng);
  if (!built) return null;
  return emitBuilt(s, def, built, rng, offline);
}

function emitBuilt(s: GameState, def: EventDef, built: BuiltEvent, rng: Rng, offline: boolean): GameEvent {
  s.cooldowns[def.id] = s.time + def.cooldown;
  s.recentCategories.push(def.category);
  if (s.recentCategories.length > 10) s.recentCategories.shift();
  const ev = addEvent(s, {
    defId: def.id,
    category: def.category,
    headline: built.headline,
    body: built.body,
    quote: built.quote,
    cityId: built.cityId,
    country: built.cityId != null ? city(built.cityId).cc : undefined,
    choices: built.choices,
    important: built.important ?? !!built.choices,
    refs: built.refs ?? {},
    offline,
  });
  if (built.effects?.length) ev.effectsSummary = applyEffects(s, built.effects, rng, ev.id);
  if (built.choices?.length) s.pendingDecisions.push(ev.id);
  for (const ref of [built.refs?.factionId]) if (ref && s.factions[ref]) s.factions[ref].history.push(ev.id);
  s.counters.events = (s.counters.events ?? 0) + 1;
  return ev;
}

export function resolveChoice(s: GameState, eventId: string, choiceIdx: number, rng: Rng): { ok: boolean; summary: string[]; outcome: string } {
  const ev = s.events.find((e) => e.id === eventId);
  if (!ev || !ev.choices || ev.choiceSelected != null) return { ok: false, summary: [], outcome: '' };
  const choice = ev.choices[choiceIdx];
  if (!choice) return { ok: false, summary: [], outcome: '' };
  ev.choiceSelected = choiceIdx;
  ev.resolvedAt = s.time;
  s.pendingDecisions = s.pendingDecisions.filter((x) => x !== eventId);
  const summary = applyEffects(s, choice.effects, rng, ev.id);
  for (const d of choice.delayed ?? []) {
    s.scheduled.push({ at: s.time + d.delay * MODES[s.movement.gameMode].consequence ** 0, effects: d.effects, headline: d.headline, body: d.body, sourceEventId: ev.id });
  }
  ev.effectsSummary = summary;
  s.counters.decisions = (s.counters.decisions ?? 0) + 1;
  return { ok: true, summary, outcome: choice.outcome };
}

export function processScheduled(s: GameState, rng: Rng) {
  if (!s.scheduled.length) return;
  const due = s.scheduled.filter((x) => x.at <= s.time);
  if (!due.length) return;
  s.scheduled = s.scheduled.filter((x) => x.at > s.time);
  for (const d of due) {
    const ev = addEvent(s, { defId: 'delayed', category: 'Follow-up', important: true, headline: d.headline, body: d.body ?? 'A consequence of an earlier decision has arrived.', refs: { eventId: d.sourceEventId } });
    ev.effectsSummary = applyEffects(s, d.effects, rng, ev.id);
  }
}

/** World reaction: stage progression, opposition organizations, rivals. */
export function evaluateOpposition(s: GameState, rng: Rng) {
  const f = s.totals.followers;
  const cities = s.totals.citiesEver85;
  let stage = 0;
  if (cities >= 1 || f > 2000) stage = 1;
  if (cities >= 3 || f > 20000) stage = 2;
  if (cities >= s.reaction.oppositionThreshold) stage = Math.max(stage, 3);
  if (s.phase >= 4 && s.reaction.orgs.length) stage = Math.max(stage, 4);
  if (s.phase >= 5) stage = Math.max(stage, 5);
  if (s.phase >= 7) stage = 6;
  if (stage > s.reaction.stage) {
    const prev = s.reaction.stage;
    s.reaction.stage = stage;
    if (prev < 3 && stage >= 3) {
      const org = createOppositionOrg(s, rng);
      s.milestones.firstOpposition = s.time;
      const ctx = makeCtx(s, { org });
      const ev = addEvent(s, {
        defId: 'first-opposition', category: 'Local government inquiry', important: true,
        headline: `${org.name} Formed to Oppose ${s.movement.ideologyName}`,
        body: fill(`After the movement's sixth or so success, a group calling itself {org} has formed in {country} "to restore ordinary behavior." Its founding charter specifically objects to people who {verb}.`, { ...ctx, country: countryName(org.homeCountry) }),
        refs: { orgId: org.id },
      });
      ev.effectsSummary = applyEffects(s, [{ k: 'resistance', v: 0.04, scope: 'country', target: org.homeCountry }], rng, ev.id);
    }
  }
  // more organizations as the movement grows
  const wanted = stage >= 3 ? Math.min(8, 1 + Math.floor(Math.log10(Math.max(1, f / 50000)) * 1.5)) : 0;
  if (s.reaction.orgs.filter((o) => !o.dissolved).length < wanted && rng.chance(0.3)) {
    const org = createOppositionOrg(s, rng, rng.chance(0.5) ? topCountry(s) : city(rng.pick(s.touched)).cc);
    addEvent(s, { defId: 'new-org', category: 'Organization', important: false, headline: `New Group, ${org.name}, Vows to "Do Something"`, body: `Headquartered in ${countryName(org.homeCountry)}. Its tactics: ${org.tactic}.`, refs: { orgId: org.id } });
  }
  // organizations dissolve when their home country is converted
  for (const o of s.reaction.orgs) {
    if (o.dissolved) continue;
    const share = countryShare(s, o.homeCountry);
    if (share > 0.8 || o.strength <= 0) {
      o.dissolved = true;
      addEvent(s, { defId: 'org-dissolved', category: 'Organization', important: false, headline: `${o.name} Quietly Disbands; Former Members Seen at ${s.movement.meetingName}`, body: 'A final press release thanked supporters "for trying."', refs: { orgId: o.id } });
    }
  }
  // rival movements
  if (s.phase >= BALANCE.rivalMinPhase) {
    const rivals = liveFactions(s).filter((x) => x.kind === 'rival').length;
    const target = Math.min(5, s.phase - 3 + (s.movement.gameMode === 'chaos' ? 1 : 0));
    if (rivals < target && rng.chance(0.15 * MODES[s.movement.gameMode].rivalAggression)) {
      const r = createRival(s, rng);
      if (r) {
        const ev = addEvent(s, {
          defId: 'rival-founded', category: 'Rival movement activity', important: true, cityId: r.hqCityId,
          headline: `Rival Movement ${r.name} Emerges in ${city(r.hqCityId).name}`,
          body: `${r.founder} has founded ${r.name}, whose followers believe: ${r.customs.join(' ')} Analysts call it "derivative of ${s.movement.ideologyName}." ${r.founder} calls ${s.movement.ideologyName} "derivative of ${r.name}."`,
          refs: { factionId: r.id },
        });
        r.history.push(ev.id);
        if (!s.milestones.firstRival) s.milestones.firstRival = s.time;
      }
    }
  }
}

export function countryShare(s: GameState, cc: string): number {
  return getCountryShares(s)[cc] ?? 0;
}

export { clamp };
