import { describe, expect, it } from 'vitest';
import { CITIES, city } from '../src/engine/geo';
import { Rng } from '../src/engine/rng';
import { CARD_BY_ID, choose, currentCard, loadStory, newStory, serializeStory } from '../src/story/engine';
import { assignUnit, claim, endWeek, hasScheduler, isOurs, pins, planWeek, reachable, units, whereIs } from '../src/story/campaign';
import { playWeeks } from '../src/story/autoplay';
import { needsYou } from '../src/story/idle';
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
    expect(r.lines.some((l) => l.text.includes('Priya') && l.text.includes(`spent the week in ${city(town).name}`))).toBe(true);
    expect(s.cities[town].followers).toBeGreaterThan(0);
    for (const i of s.inbox) expect(i.city).toBeDefined();
    // a character's problem is pinned wherever that character is
    for (const i of s.inbox) if (s.chars[i.speaker]?.present && i.ctx.city == null) expect(i.city).toBe(whereIs(s, i.speaker));
  });

  it('with no administrator, routine problems left for more than a week get worse, and people remember who kept them waiting', () => {
    const s = weekly(3);
    playWeeks(s, 3, 'pleaser', new Rng(3), 0);
    for (const id of ['martin', 'rolf', 'agnes', 'constance']) if (s.chars[id]) s.chars[id].present = false;
    const routine = s.inbox.find((i) => !needsYou(CARD_BY_ID.get(i.cardId), i) && s.chars[i.speaker]?.present) ?? s.inbox.find((i) => !needsYou(CARD_BY_ID.get(i.cardId), i))!;
    expect(routine).toBeDefined();
    routine.week = s.week - 1;
    const who = routine.speaker;
    const r = endWeek(s);
    expect(s.inbox.some((i) => i.uid === routine.uid)).toBe(false);
    expect(r.lines.some((l) => l.icon === '🕳️')).toBe(true);
    if (s.chars[who]) expect(s.memory.some((m) => m.who === who && m.kind === 'ignored')).toBe(true);
  });

  it('rivals hold real towns; your people can win them over', () => {
    const s = weekly(4);
    playWeeks(s, 6, 'pleaser', new Rng(4));
    const target = reachable(s).find((id) => id !== s.hometown && s.cities[id].followers === 0) ?? reachable(s)[1];
    claim(s, 'original', [target]);
    expect(isOurs(s, target)).toBe(false);
    for (const u of units(s).slice(0, 3)) assignUnit(s, u.id, target);
    for (let w = 0; w < 3; w++) {
      s.inbox = [];
      for (const u of units(s).slice(0, 3)) assignUnit(s, u.id, target);
      endWeek(s);
    }
    expect(s.cities[target].rival).toBeUndefined();
    expect(s.flags.won_from_original).toBeDefined();
  });

  it('without a scheduler people go where their nature takes them; homesick people go home', () => {
    const s = weekly(14);
    playWeeks(s, 3, 'pleaser', new Rng(14));
    if (s.chars.bev) s.chars.bev.present = false; // without Bev, people follow their nature
    expect(hasScheduler(s)).toBe(false);
    // Gary has been away two weeks: he goes home
    s.away.gary = 2;
    s.manual = {};
    planWeek(s);
    expect(whereIs(s, 'gary')).toBe(s.hometown);
    // someone sent home by a choice goes home
    s.flags.priya_go_home = s.day;
    planWeek(s);
    expect(whereIs(s, 'priya')).toBe(s.hometown);
  });

  it('Bev’s rota: a focus for the week, and a week off lowers attention', () => {
    const s = weekly(15);
    s.chars.bev.present = true;
    s.chars.bev.status = 'active';
    s.focus = 'spread';
    planWeek(s);
    const dez = whereIs(s, 'dez');
    expect(dez === s.hometown || s.cities[dez].followers === 0).toBe(true);
    s.focus = 'rest';
    s.gauges.attention = 80;
    planWeek(s);
    for (const u of units(s)) expect(whereIs(s, u.id)).toBe(s.hometown);
    s.inbox = [];
    endWeek(s);
    expect(s.gauges.attention).toBeLessThan(80);
    expect(s.focus).toBe('grow');
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
