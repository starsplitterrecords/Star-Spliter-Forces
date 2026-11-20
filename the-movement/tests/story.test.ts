import { describe, expect, it } from 'vitest';
import { CITIES, city } from '../src/engine/geo';
import { Rng } from '../src/engine/rng';
import { playFor } from '../src/story/autoplay';
import { CARD_BY_ID, advanceDays, callMeeting, choose, currentCard, followers, loadStory, newStory, render, serializeStory, tickRealTime } from '../src/story/engine';
import { LIBRARY } from '../src/story/library';
import { validateLibrary } from '../src/story/validate';
import { GROUPS, type StoryState } from '../src/story/types';

const LEEDS = CITIES.find((c) => c.name === 'Leeds')!.id;
const fresh = (seed = 1) => newStory('Jeff', LEEDS, seed, 0);
const pickByLabel = (s: StoryState, re: RegExp) => {
  const inst = currentCard(s)!;
  const i = CARD_BY_ID.get(inst.cardId)!.choices.findIndex((c) => re.test(c.label));
  return choose(s, inst.uid, i as 0 | 1);
};

function invariants(s: StoryState) {
  const f = followers(s);
  const g = GROUPS.reduce((a, k) => a + s.groups[k], 0);
  expect(Math.abs(g - f)).toBeLessThan(1 + f * 1e-6);
  for (const id of s.region) {
    expect(s.cities[id].followers).toBeGreaterThanOrEqual(0);
    expect(s.cities[id].followers).toBeLessThanOrEqual(city(id).pop);
  }
  for (const v of Object.values(s.gauges)) expect(v >= 0 && v <= 100).toBe(true);
  for (const c of Object.values(s.chars)) expect(c.loyalty >= -100 && c.loyalty <= 100).toBe(true);
}

describe('content library', () => {
  it('passes validation with no errors', () => {
    const r = validateLibrary(LIBRARY);
    expect(r.errors).toEqual([]);
    expect(LIBRARY.cards.length).toBeGreaterThanOrEqual(50);
    expect(LIBRARY.characters.length).toBeGreaterThanOrEqual(4);
  });
});

describe('founding', () => {
  it('starts with almost nothing: Gary’s garage, then Martin’s meeting question', () => {
    const s = fresh();
    expect(s.movementName).toBeNull();
    expect(Object.keys(s.customs)).toHaveLength(0);
    expect(followers(s)).toBe(5);
    expect(currentCard(s)!.cardId).toBe('found.garage');
    expect(currentCard(s)!.speaker).toBe('gary');
    pickByLabel(s, /book club/);
    advanceDays(s, 0.5);
    expect(currentCard(s)!.cardId).toBe('found.first_gathering');
    expect(currentCard(s)!.speaker).toBe('martin');
  });

  it('remembers decisions as customs, loyalty and memories', () => {
    const s = fresh();
    pickByLabel(s, /book club/);
    advanceDays(s, 0.5);
    const before = { martin: s.chars.martin.loyalty, priya: s.chars.priya.loyalty };
    const r = pickByLabel(s, /Every Tuesday/);
    expect(r.ok).toBe(true);
    expect(s.customs.weekly_meeting.status).toBe('practice');
    expect(s.customs.weekly_meeting.values.day).toBe('Tuesday');
    expect(s.chars.martin.loyalty).toBeGreaterThan(before.martin);
    expect(s.chars.priya.loyalty).toBeLessThan(before.priya);
    expect(s.flags.meeting_mandatory).toBeDefined(); // the follow-up is scheduled with 90% chance
    expect(render(s, 'Meet on {day}s')).toBe('Meet on Tuesdays');
    invariants(s);
  });

  it('lets the player name the movement in their own words, with moderation', () => {
    const s = fresh(3);
    s.decisions = 6;
    s.inbox = [];
    s.customs['practice.soup'] = { status: 'practice', values: {}, prominence: 10, since: 0, history: [] };
    (s as unknown as { flags: Record<string, number> }).flags = {};
    // queue the naming card directly
    s.scheduled.push({ card: 'found.name', day: s.day, ctx: {} });
    advanceDays(s, 0.3);
    const inst = s.inbox.find((i) => i.cardId === 'found.name')!;
    expect(inst.ctx.name).toMatch(/Soup/);
    expect(choose(s, inst.uid, 1, 'kill everyone club').ok).toBe(false);
    expect(choose(s, inst.uid, 1, 'The Lentil Fellowship').ok).toBe(true);
    expect(s.movementName).toBe('The Lentil Fellowship');
    expect(s.flags.named).toBeDefined();
  });
});

describe('simulation', () => {
  it('is deterministic and save/load does not change the story', () => {
    const a = fresh(9);
    playFor(a, 30, 'random', new Rng(4));
    const b = loadStory(serializeStory(a));
    playFor(a, 40, 'pleaser', new Rng(8));
    playFor(b, 40, 'pleaser', new Rng(8));
    expect(serializeStory(b)).toBe(serializeStory(a));
  });

  it('keeps growing while idle, within a bounded offline window, without deciding for you', () => {
    const s = fresh(2);
    playFor(s, 40, 'pleaser', new Rng(2));
    const f0 = followers(s);
    const decisions = s.decisions;
    const report = tickRealTime(s, s.lastRealTime + 5 * 24 * 3600 * 1000)!;
    expect(report.days).toBe(14);
    expect(report.notes.join(' ')).toMatch(/capped/);
    expect(s.decisions).toBe(decisions);
    expect(followers(s)).toBeGreaterThan(f0);
    expect(s.inbox.length).toBeLessThanOrEqual(8);
    invariants(s);
  });

  it('calling a meeting brings the next problem', () => {
    const s = fresh(5);
    s.inbox = [];
    s.decisions = 10;
    callMeeting(s);
    expect(currentCard(s)).not.toBeNull();
  });

  it('an extreme gauge brings a crisis; a second extreme ends the leadership', () => {
    const s = fresh(6);
    const force = (gauges: Record<string, number>) => {
      if (!currentCard(s)) callMeeting(s);
      const inst = currentCard(s)!;
      const ch = CARD_BY_ID.get(inst.cardId)!.choices[0];
      const saved = ch.effects.gauges;
      ch.effects.gauges = gauges;
      choose(s, inst.uid, 0);
      ch.effects.gauges = saved;
    };
    force({ unity: -100 });
    expect(s.crisis).toMatchObject({ gauge: 'unity', high: false });
    const crisis = currentCard(s)!;
    expect(crisis.cardId).toBe('crisis.unity.low');
    choose(s, crisis.uid, 0);
    expect(s.gauges.unity).toBeGreaterThan(0);
    expect(s.ended).toBeNull();
    force({ enthusiasm: -100 });
    expect(s.ended?.title).toBe('Nobody Came');
    expect(s.ended?.text).not.toMatch(/\{/);
  });

  it('characters remember: enough slights and they walk out', () => {
    const s = fresh(7);
    s.chars.dez.loyalty = -85;
    const inst = currentCard(s)!;
    // apply a direct slight through effects
    CARD_BY_ID.get(inst.cardId)!.choices[0].effects.loyalty = { ...(CARD_BY_ID.get(inst.cardId)!.choices[0].effects.loyalty ?? {}), dez: -10 };
    choose(s, inst.uid, 0);
    delete CARD_BY_ID.get(inst.cardId)!.choices[0].effects.loyalty!.dez;
    expect(s.chars.dez.present).toBe(false);
    expect(s.flags.dez_left).toBeDefined();
  });

  it('plays long sessions with every style without errors or unresolved text', () => {
    for (const [i, p] of (['pleaser', 'random', 'order', 'expansion', 'stubborn'] as const).entries()) {
      const s = newStory('Jeff', CITIES[300 + i * 50].id, 100 + i, 0);
      const rng = new Rng(i);
      for (let d = 0; d < 160 && !s.ended; d += 4) {
        playFor(s, 4, p, rng);
        for (const inst of s.inbox) {
          const card = CARD_BY_ID.get(inst.cardId)!;
          for (const t of [card.text, ...card.choices.map((c) => c.label), ...card.choices.map((c) => c.reaction)]) {
            expect(render(s, t, inst.ctx, inst.speaker), `${card.id}`).not.toMatch(/\{[\w.]+\}/);
          }
        }
      }
      invariants(s);
      expect(s.decisions).toBeGreaterThan(20);
    }
  });

  it('different playthroughs grow into different movements', () => {
    const identities = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const s = newStory('Jeff', LEEDS, 500 + i, 0);
      playFor(s, 80, (['random', 'order', 'expansion'] as const)[i % 3], new Rng(i));
      identities.add(Object.keys(s.customs).filter((k) => s.customs[k].status !== 'none').sort().join(','));
    }
    expect(identities.size).toBeGreaterThanOrEqual(4);
  });
});
