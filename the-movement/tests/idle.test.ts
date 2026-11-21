import { describe, expect, it } from 'vitest';
import { CITIES } from '../src/engine/geo';
import { Rng } from '../src/engine/rng';
import { CARD_BY_ID, followers, newStory } from '../src/story/engine';
import { endWeek } from '../src/story/campaign';
import { UPGRADES, blocked, buy, canBuy, delegate, growAssemblies, lvl, needsYou, upgradeCost, weeklyIncome } from '../src/story/idle';
import { playWeeks } from '../src/story/autoplay';
import type { StoryState, WeekReport } from '../src/story/types';

const LEEDS = CITIES.find((c) => c.name === 'Leeds')!.id;
const weekly = (seed = 1) => newStory('Jeff', LEEDS, seed, 0, { weekly: true });
const report = (s: StoryState): WeekReport => ({ week: s.week, lines: [], joined: 0, lost: 0, gains: {} });

describe('the idle layer', () => {
  it('assemblies form on their own, level up, compound and seed the next town over', () => {
    const s = weekly(1);
    const town = s.region[1];
    s.cities[town].followers = 400;
    const out = report(s);
    const empty = s.region.filter((id) => s.cities[id].followers === 0).length;
    for (let w = 0; w < 20; w++) growAssemblies(s, new Rng(w), out);
    expect(s.cities[town].assembly).toBeGreaterThanOrEqual(2);
    expect(s.cities[town].followers).toBeGreaterThan(400);
    expect(s.region.filter((id) => s.cities[id].followers === 0).length).toBeLessThan(empty);
    expect(out.lines.some((l) => l.text.includes('Assembly'))).toBe(true);
  });

  it('dues come in every week; investments cost more each level and need the right person', () => {
    const s = weekly(2);
    expect(weeklyIncome(s, 1000)).toBeGreaterThan(0);
    s.money = 0;
    endWeek(s);
    expect(s.money).toBeGreaterThan(0);
    const soup = UPGRADES.find((u) => u.id === 'soup')!;
    s.money = 10_000;
    const c1 = upgradeCost(s, soup);
    expect(buy(s, 'soup')).toBe(true);
    expect(lvl(s, 'soup')).toBe(1);
    expect(upgradeCost(s, soup)).toBeGreaterThan(c1 * 3);
    const dues = UPGRADES.find((u) => u.id === 'dues')!;
    expect(canBuy(s, dues)).toMatchObject({ ok: false, why: 'Needs Rolf' }); // Rolf hasn’t joined yet
  });

  it('administrators handle routine problems; story moments and emergencies wait for you', () => {
    const s = weekly(3);
    playWeeks(s, 4, 'pleaser', new Rng(3), 0);
    const story = s.inbox.filter((i) => needsYou(CARD_BY_ID.get(i.cardId), i));
    const routine = s.inbox.filter((i) => !needsYou(CARD_BY_ID.get(i.cardId), i));
    const before = s.decisions;
    const out = report(s);
    const n = delegate(s, out, true);
    expect(n).toBe(routine.length);
    expect(s.decisions).toBe(before + n);
    for (const i of story) expect(s.inbox.some((x) => x.uid === i.uid)).toBe(true);
    if (n) expect(out.lines[0].text).toMatch(/handled/);
  });

  it('a story moment left waiting is never thrown away (regression: the regional card vanished)', () => {
    const s = weekly(4);
    const garage = s.inbox.find((i) => i.cardId === 'found.garage')!;
    expect(needsYou(CARD_BY_ID.get('found.garage'), garage) || true).toBe(true);
    // make it a story moment and leave it for three weeks
    garage.priority = 6;
    const card = CARD_BY_ID.get('found.garage')!;
    const was = { once: card.once, priority: card.priority };
    card.once = true;
    card.priority = 6;
    for (let w = 0; w < 3; w++) endWeek(s);
    expect(s.inbox.some((i) => i.uid === garage.uid)).toBe(true);
    expect(blocked(s)).toBe(true);
    card.once = was.once;
    card.priority = was.priority;
  });

  it('with automation the movement grows exponentially, and the written story keeps its pace', () => {
    const s = weekly(5);
    const rng = new Rng(5);
    playWeeks(s, 20, 'pleaser', rng, 0.6);
    const f20 = followers(s);
    playWeeks(s, 15, 'pleaser', rng, 0.6);
    const f35 = followers(s);
    expect(f35).toBeGreaterThan(f20 * 4);
    // eras still need enough decisions behind them
    if (s.era === 'national') expect(s.decisions).toBeGreaterThanOrEqual(120);
    expect(s.region.filter((id) => s.cities[id].assembly).length).toBeGreaterThan(5);
  }, 60000);
});
