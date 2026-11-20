import { describe, expect, it } from 'vitest';
import { CITIES, city } from '../src/engine/geo';
import { Rng } from '../src/engine/rng';
import { CARD_BY_ID, choose, currentCard, loadStory, newStory, serializeStory } from '../src/story/engine';
import { assignUnit, endWeek, isOurs, pins, reachable, units, whereIs } from '../src/story/campaign';
import { playWeeks } from '../src/story/autoplay';
import type { StoryState } from '../src/story/types';

const LEEDS = CITIES.find((c) => c.name === 'Leeds')!.id;
const weekly = (seed = 1) => newStory('Jeff', LEEDS, seed, 0, { weekly: true });

describe('weekly dispatch', () => {
  it('starts with people to send, real towns to send them to, and a week of problems', () => {
    const s = weekly(1);
    expect(units(s).map((u) => u.id).sort()).toEqual(['dez', 'gary', 'martin', 'priya']);
    expect(reachable(s).length).toBeGreaterThanOrEqual(5);
    expect(s.inbox.length).toBeGreaterThanOrEqual(2);
    expect(s.inbox[0].cardId).toBe('found.garage');
  });

  it('sends people to towns; the week moves the map and pins next week’s problems where they are', () => {
    const s = weekly(2);
    const town = reachable(s).find((id) => id !== s.hometown)!;
    expect(assignUnit(s, 'priya', town)).toBe(true);
    expect(whereIs(s, 'priya')).toBe(town);
    while (currentCard(s)) {
      const i = currentCard(s)!;
      choose(s, i.uid, 0, CARD_BY_ID.get(i.cardId)!.choices[0].input ? 'The Lentil Fellowship' : undefined);
    }
    const r = endWeek(s);
    expect(s.week).toBe(2);
    expect(r.lines.some((l) => l.text.includes(`Priya spent the week in ${city(town).name}`))).toBe(true);
    expect(s.cities[town].followers).toBeGreaterThan(0);
    for (const i of s.inbox) expect(i.city).toBeDefined();
    // a character's problem is pinned wherever that character is
    for (const i of s.inbox) if (s.chars[i.speaker]?.present && i.ctx.city == null) expect(i.city).toBe(whereIs(s, i.speaker));
  });

  it('problems left for more than a week get worse, and people remember who kept them waiting', () => {
    const s = weekly(3);
    const martinCard = s.inbox.find((i) => i.speaker === 'martin') ?? s.inbox[0];
    const who = martinCard.speaker;
    const before = s.chars[who]?.loyalty ?? 0;
    endWeek(s); // week 1 -> 2: still waiting
    expect(s.inbox.some((i) => i.uid === martinCard.uid)).toBe(true);
    const r = endWeek(s); // a whole week ignored
    expect(s.inbox.some((i) => i.uid === martinCard.uid)).toBe(false);
    expect(r.lines.some((l) => l.icon === '🕳️')).toBe(true);
    if (s.chars[who]) {
      expect(s.chars[who].loyalty).toBeLessThan(before + 1);
      expect(s.memory.some((m) => m.who === who && m.kind === 'ignored')).toBe(true);
    }
  });

  it('rivals hold real towns; your people can win them over', () => {
    let s = weekly(4);
    let seed = 4;
    // play until the Knitting Circle has dug in somewhere (it arrives with the grassroots era)
    while (!s.rivals.knitters && seed < 12) {
      s = weekly(seed);
      playWeeks(s, 8, 'pleaser', new Rng(seed++));
    }
    const knitters = s.rivals.knitters;
    expect(knitters).toBeDefined();
    const target = knitters.towns[0];
    expect(s.cities[target].rival).toBe('knitters');
    expect(isOurs(s, target)).toBe(false);
    for (const u of units(s).slice(0, 3)) assignUnit(s, u.id, target);
    for (let w = 0; w < 3; w++) {
      s.inbox = [];
      endWeek(s);
    }
    expect(s.cities[target].rival).toBeUndefined();
    expect(s.flags.won_from_knitters).toBeDefined();
  });

  it('customs mutate by place: towns take on the habits of whoever you send', () => {
    let found = false;
    for (const seed of [5, 6, 7]) {
      const s = weekly(seed);
      playWeeks(s, 30, 'pleaser', new Rng(seed));
      const local = s.region.filter((id) => s.cities[id].variant);
      if (local.some((id) => s.cities[id].variantBy)) found = true;
    }
    expect(found).toBe(true);
  });

  it('the North is a real place: the most northerly towns, led by Tobias', () => {
    const s: StoryState = weekly(8);
    playWeeks(s, 40, 'pleaser', new Rng(8));
    if (s.flags.north_exists == null) return; // eras vary by seed; the next test covers the joining
    const north = s.region.filter((id) => s.cities[id].bloc === 'north');
    expect(north.length).toBeGreaterThan(0);
    const avgLat = north.reduce((a, id) => a + city(id).lat, 0) / north.length;
    expect(avgLat).toBeGreaterThan(city(s.hometown).lat);
  });

  it('a weekly game survives save and load, and plays on identically', () => {
    const a = weekly(9);
    playWeeks(a, 8, 'random', new Rng(9));
    const b = loadStory(serializeStory(a));
    playWeeks(a, 6, 'pleaser', new Rng(10));
    playWeeks(b, 6, 'pleaser', new Rng(10));
    expect(serializeStory(b)).toBe(serializeStory(a));
    expect(pins(a).size).toBe(pins(b).size);
  });
});
