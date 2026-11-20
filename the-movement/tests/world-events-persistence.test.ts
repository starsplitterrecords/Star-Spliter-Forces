import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { checkAchievements, doctrineAchievements } from '../src/engine/achievements';
import { EVENT_DEFS, resolveChoice, runEventCheck, triggerEvent } from '../src/engine/events';
import { respondToFaction } from '../src/engine/factions';
import { CITIES, COUNTRIES, CITY_BY_ID, MODELED_CITY_POPULATION, WORLD_POPULATION } from '../src/engine/geo';
import { Rng } from '../src/engine/rng';
import { loadGame, migrate, serializeGame } from '../src/engine/save';
import { advanceSimulation, debug, getRng, issueProclamation, launchCampaign } from '../src/engine/sim';
import { calculateRegionalStatistics, statsToCSV } from '../src/engine/stats';
import { chooseEnding, endingNarrative } from '../src/engine/victory';
import { autoplayTurn } from '../src/engine/autoplay';
import { listSlots, loadSlot, saveSlot } from '../src/lib/storage';
import { springGame } from './fixtures';

describe('world data', () => {
  it('has unique city ids and a valid hierarchy', () => {
    expect(new Set(CITIES.map((c) => c.id)).size).toBe(CITIES.length);
    expect(CITIES.length).toBeGreaterThan(5000);
    const codes = new Set(COUNTRIES.map((c) => c.code));
    for (const c of CITIES) {
      expect(codes.has(c.cc)).toBe(true);
      expect(c.admin.length).toBeGreaterThan(0);
      expect(c.pop).toBeGreaterThan(0);
    }
  });

  it('never double-counts population: hinterland + cities = country', () => {
    const byCountry: Record<string, number> = {};
    for (const c of CITIES) byCountry[c.cc] = (byCountry[c.cc] ?? 0) + c.pop;
    for (const co of COUNTRIES) {
      expect(co.hinterland).toBeGreaterThanOrEqual(0);
      // per-city rounding of scaled populations allows a tiny discrepancy
      expect(Math.abs(co.hinterland + (byCountry[co.code] ?? 0) - co.population)).toBeLessThanOrEqual(Math.max(5, co.population * 0.001));
    }
    expect(MODELED_CITY_POPULATION).toBeLessThan(WORLD_POPULATION);
  });

  it('regional statistics sum to world totals', () => {
    const s = springGame();
    launchCampaign(s, s.candidates[0]);
    advanceSimulation(s, 200);
    const world = calculateRegionalStatistics(s, 'world')[0];
    for (const level of ['continent', 'region', 'country'] as const) {
      const rows = calculateRegionalStatistics(s, level);
      expect(Math.round(rows.reduce((a, r) => a + r.followers, 0))).toBe(Math.round(world.followers));
      expect(rows.reduce((a, r) => a + r.population, 0)).toBe(world.population);
    }
    expect(world.population).toBe(WORLD_POPULATION);
    expect(Math.round(world.followers)).toBe(Math.round(s.totals.followers));
    const csv = statsToCSV(calculateRegionalStatistics(s, 'admin'), 'admin');
    expect(csv.split('\n')[0]).toContain('followers');
    expect(csv).toContain('Connecticut');
  });
});

describe('events', () => {
  function grown(seed = 99) {
    const s = springGame(seed);
    for (let i = 0; i < 200; i++) {
      autoplayTurn(s);
      advanceSimulation(s, 5, { stepSize: 2.5 });
    }
    return s;
  }

  it('generates varied, doctrine-specific news without identical repeats', () => {
    const s = grown();
    const heads = s.events.filter((e) => !['achievement', 'city-85', 'upgrade', 'outpost-produce', 'control-lost'].includes(e.defId)).map((e) => e.headline);
    expect(heads.length).toBeGreaterThan(10);
    const cats = new Set(s.events.map((e) => e.category));
    expect(cats.size).toBeGreaterThan(5);
    const text = s.events.map((e) => `${e.headline} ${e.body}`).join(' ').toLowerCase();
    // Springism's own customs appear in its news
    expect(/spring|potato|yacht|popsicle|yurt|journey/.test(text)).toBe(true);
    // no identical headline within the recent window
    const recent = s.events.slice(-40).filter((e) => e.defId !== 'achievement' && e.defId !== 'outpost-produce').map((e) => e.headline);
    const dup = recent.filter((h, i) => recent.indexOf(h) !== i && !/Reaches 85%|Slips Below|Graduates/.test(h));
    expect(dup.length).toBeLessThanOrEqual(2);
  });

  it('respects trigger conditions and cooldowns', () => {
    const s = springGame();
    const rng = new Rng(1);
    // phase 1: decision events are not eligible
    for (let i = 0; i < 20; i++) {
      const e = runEventCheck(s, rng);
      if (e) expect(e.choices).toBeUndefined();
    }
    const e = triggerEvent(s, 'doctrine-incident', rng);
    expect(s.cooldowns['doctrine-incident']).toBeGreaterThan(s.time);
    expect(e).not.toBeNull();
  });

  it('applies choice consequences once and schedules delayed effects', () => {
    const s = grown(5);
    const rng = getRng(s);
    const ev = triggerEvent(s, 'great-controversy', rng)!;
    expect(ev.choices).toHaveLength(4);
    expect(s.pendingDecisions).toContain(ev.id);
    const before = s.bureaucracy;
    const r = resolveChoice(s, ev.id, 1, rng); // committee
    expect(r.ok).toBe(true);
    expect(s.committees.length).toBeGreaterThan(0);
    expect(s.bureaucracy).toBeGreaterThan(before);
    expect(s.scheduled.some((x) => x.sourceEventId === ev.id)).toBe(true);
    expect(resolveChoice(s, ev.id, 0, rng).ok).toBe(false); // cannot choose twice
    advanceSimulation(s, 400, { stepSize: 5 });
    expect(s.events.some((x) => x.refs.eventId === ev.id)).toBe(true); // event memory
  });

  it('every event definition builds coherently in a mature game', () => {
    const s = grown(11);
    debug.jumpPhase(s, 6);
    const rng = getRng(s);
    for (const d of EVENT_DEFS) {
      const built = d.build(s, rng);
      if (!built) continue;
      expect(built.headline).not.toMatch(/\{\w+\}/);
      expect(built.body).not.toMatch(/\{\w+\}/);
      for (const c of built.choices ?? []) expect(c.label).not.toMatch(/\{\w+\}/);
    }
  });

  it('splinters form from real doctrines and faction responses work', () => {
    const s = grown(21);
    debug.splinter(s);
    const f = Object.values(s.factions).find((x) => x.kind === 'splinter')!;
    expect(f).toBeDefined();
    const doctrine = s.movement.doctrines.find((d) => d.id === f.doctrineId)!;
    expect(doctrine).toBeDefined();
    expect(f.followerCount).toBeGreaterThan(0);
    s.influence += 200;
    const r = respondToFaction(s, f.id, 'negotiate', new Rng(3));
    expect(r.ok).toBe(true);
    expect(f.relationship).toBe('negotiating');
    const u = respondToFaction(s, f.id, 'unity', new Rng(4));
    expect(u.ok).toBe(true);
  });

  it('proclamations change doctrine but keep the original', () => {
    const s = grown(31);
    const d = s.movement.doctrines[0];
    expect(issueProclamation(s, { doctrineId: d.id, stance: 'relax' }).ok).toBe(true);
    expect(d.currentText).not.toBe(d.originalText);
    expect(issueProclamation(s, { doctrineId: d.id, stance: 'reverse' }).ok).toBe(false); // cooldown
    s.time += 100;
    expect(issueProclamation(s, { doctrineId: d.id, stance: 'reverse' }).ok).toBe(true);
    expect(d.currentText).toBe(d.originalText);
    expect(s.counters.reversals).toBe(1);
    checkAchievements(s);
    expect(s.achievements['always-supported']).toBeDefined();
    expect(issueProclamation(s, { stance: 'custom', text: 'kill all hats' }).ok).toBe(false);
  });

  it('doctrine-specific achievements only reference chosen doctrines', () => {
    const s = springGame();
    const names = doctrineAchievements(s).map((a) => a.name).join(' ');
    expect(names).not.toMatch(/Hat|Nap/);
  });

  it('endings reference the original beliefs', () => {
    const s = grown(41);
    const e = chooseEnding(s);
    const text = endingNarrative(s, e);
    expect(text).toContain(s.movement.doctrines[0].originalText);
    expect(text).toContain(s.movement.founderTitle);
  });
});

describe('persistence', () => {
  it('save/reload produces identical subsequent simulation', () => {
    const a = springGame(55);
    launchCampaign(a, a.candidates[0]);
    advanceSimulation(a, 120);
    const b = loadGame(serializeGame(a)).state;
    advanceSimulation(a, 300);
    advanceSimulation(b, 300);
    expect(b.totals.followers).toBe(a.totals.followers);
    expect(b.rng).toBe(a.rng);
    expect(b.events.map((e) => e.headline)).toEqual(a.events.map((e) => e.headline));
  });

  it('migrates old schema versions', () => {
    const s = springGame();
    const raw = JSON.parse(serializeGame(s)).state;
    raw.schemaVersion = 1;
    delete raw.control;
    delete raw.committees;
    delete raw.tutorial.seen;
    const m = migrate(raw);
    expect(m.schemaVersion).toBe(3);
    expect(m.control).toBe(70);
    expect(m.tutorial.seen).toEqual([]);
  });

  it('repairs corrupted values and rejects garbage', () => {
    const s = springGame();
    const id = s.candidates[0];
    const raw = JSON.parse(serializeGame(s));
    raw.state.cities[id].followers = 1e12;
    raw.state.cities[id].awareness = 7;
    raw.state.cohesion = null;
    const { state, fixes } = loadGame(JSON.stringify(raw));
    expect(state.cities[id].followers).toBeLessThanOrEqual(CITY_BY_ID.get(id)!.pop);
    expect(state.cities[id].awareness).toBe(1);
    expect(fixes.length).toBeGreaterThan(0);
    expect(() => loadGame('not json')).toThrow();
    expect(() => loadGame('{"hello":1}')).toThrow();
  });

  it('supports multiple IndexedDB slots with backup recovery', async () => {
    const a = springGame(1);
    const b = springGame(2);
    b.slot = 1;
    b.movement.ideologyName = 'Hatism';
    await saveSlot(a);
    await saveSlot(b);
    await saveSlot(a); // creates a backup of slot 0
    const metas = await listSlots();
    expect(metas[0]?.ideologyName).toBe('Springism');
    expect(metas[1]?.ideologyName).toBe('Hatism');
    expect(metas[2]).toBeNull();
    const loaded = await loadSlot(1);
    expect(loaded?.state.movement.ideologyName).toBe('Hatism');
  });
});

describe('performance', () => {
  it('steps quickly with thousands of active cities', () => {
    const s = springGame(9);
    debug.jumpPhase(s, 6);
    expect(s.touched.length).toBeGreaterThan(800);
    const t = performance.now();
    advanceSimulation(s, 100, { stepSize: 1 });
    const per = (performance.now() - t) / 100;
    expect(per).toBeLessThan(40);
  });
});
