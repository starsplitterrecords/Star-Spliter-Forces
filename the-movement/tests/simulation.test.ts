import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/engine/config';
import { activeCampaigns, assignedZealots, availableZealots, ensureCity, othersTotal } from '../src/engine/core';
import { CITIES, city } from '../src/engine/geo';
import { advanceSimulation, allocateZealots, applyOfflineProgress, debug, endCampaign, establishOutpost, launchCampaign, scout, unlockUpgrade } from '../src/engine/sim';
import type { GameState } from '../src/engine/types';
import { autoplayTurn } from '../src/engine/autoplay';
import { springGame } from './fixtures';

function checkInvariants(s: GameState) {
  for (const id of s.touched) {
    const d = s.cities[id];
    expect(d.followers).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(d.followers)).toBe(true);
    expect(d.followers + othersTotal(d)).toBeLessThanOrEqual(city(id).pop + 1e-6);
    expect(d.awareness).toBeGreaterThanOrEqual(0);
    expect(d.awareness).toBeLessThanOrEqual(1);
  }
  expect(assignedZealots(s)).toBeLessThanOrEqual(s.zealots.total);
  expect(new Set(s.discovered).size).toBe(s.discovered.length);
  expect(new Set(s.touched).size).toBe(s.touched.length);
  expect(s.totals.followers).toBeLessThanOrEqual(s.totals.population);
}

function smallest(s: GameState) {
  return [...s.candidates].sort((a, b) => city(a).pop - city(b).pop)[0];
}

describe('conversion', () => {
  it('offers three small starting cities near headquarters', () => {
    const s = springGame();
    expect(s.candidates).toHaveLength(3);
    for (const id of s.candidates) {
      expect(city(id).pop).toBeLessThanOrEqual(400_000);
      expect(s.cities[id].discovered).toBe(true);
    }
  });

  it('first founder-led campaign reaches 85% in roughly 45-90 seconds', () => {
    const s = springGame();
    const id = smallest(s);
    expect(launchCampaign(s, id).ok).toBe(true);
    let t85 = -1;
    for (let i = 0; i < 300 && t85 < 0; i++) {
      advanceSimulation(s, 1);
      if (s.cities[id].followers / city(id).pop >= 0.85) t85 = s.time;
    }
    expect(t85).toBeGreaterThanOrEqual(35);
    expect(t85).toBeLessThanOrEqual(100);
    checkInvariants(s);
  });

  it('grants zealot and discovery rewards exactly once at 85%', () => {
    const s = springGame();
    const id = smallest(s);
    launchCampaign(s, id);
    advanceSimulation(s, 150);
    expect(s.totals.citiesEver85).toBe(1);
    const z = s.zealots.lifetime;
    expect(z).toBeGreaterThanOrEqual(1);
    expect(s.discovered.length).toBeGreaterThanOrEqual(6);
    // knock the city below control, then recover: no duplicate rewards
    s.cities[id].followers = Math.floor(city(id).pop * 0.5);
    advanceSimulation(s, 3);
    expect(s.cities[id].controlled).toBe(false);
    s.cities[id].followers = Math.floor(city(id).pop * 0.9);
    advanceSimulation(s, 3);
    expect(s.cities[id].controlled).toBe(true);
    expect(s.totals.citiesEver85).toBe(1);
    checkInvariants(s);
  });

  it('passive conversion is slower than active but happens in aware neighbours', () => {
    const s = springGame();
    const [a, b] = [...s.candidates].sort((x, y) => city(x).pop - city(y).pop);
    launchCampaign(s, a);
    advanceSimulation(s, 240);
    endCampaign(s, s.cities[a].campaignId!, 'passive');
    const d = s.cities[b];
    expect(d.followers).toBeGreaterThanOrEqual(0);
    advanceSimulation(s, 1200, { stepSize: 2 });
    expect(s.totals.passiveConversions).toBeGreaterThan(0);
    expect(s.totals.activeConversions).toBeGreaterThan(0);
  });

  it('never exceeds population and can eventually reach 100%', () => {
    const s = springGame();
    const id = smallest(s);
    launchCampaign(s, id);
    debug.zealots(s, 6);
    allocateZealots(s, s.cities[id].campaignId!, 6);
    unlockUpgrade(s, 'r1');
    for (let i = 0; i < 400 && s.cities[id].followers < city(id).pop; i++) advanceSimulation(s, 10, { stepSize: 2 });
    expect(s.cities[id].followers).toBe(city(id).pop);
    expect(s.counters.cities100).toBe(1);
    checkInvariants(s);
  });

  it('prevents double-assigning zealots and enforces campaign slots', () => {
    const s = springGame();
    const [a, b, c] = s.candidates;
    expect(launchCampaign(s, a).ok).toBe(true);
    expect(launchCampaign(s, b, { zealots: 1 }).ok).toBe(false); // no zealots yet
    debug.zealots(s, 2);
    expect(launchCampaign(s, b, { zealots: 2 }).ok).toBe(false); // slots full (1)
    expect(unlockUpgrade(s, 'o1').ok).toBe(false); // cannot afford yet
    debug.influence(s, 100);
    expect(unlockUpgrade(s, 'o1').ok).toBe(true);
    expect(unlockUpgrade(s, 'o1').ok).toBe(false); // already owned
    expect(launchCampaign(s, b, { zealots: 2, founder: false }).ok).toBe(true);
    expect(availableZealots(s)).toBe(0);
    expect(launchCampaign(s, c, { zealots: 1, founder: false }).ok).toBe(false);
    expect(allocateZealots(s, activeCampaigns(s)[1].id, 1).ok).toBe(false);
    checkInvariants(s);
  });

  it('city discovery never duplicates and scouts recover from dead ends', () => {
    const s = springGame();
    for (let i = 0; i < 6; i++) {
      s.time += 100;
      scout(s);
    }
    expect(new Set(s.discovered).size).toBe(s.discovered.length);
    expect(s.discovered.length).toBeGreaterThan(8);
  });
});

describe('outposts and offline progression', () => {
  function withOutpost() {
    const s = springGame();
    const hq = city(s.movement.headquarters.cityId);
    const big = CITIES.filter((c) => c.pop >= BALANCE.outpostEligiblePop && c.cc === 'US').sort((a, b) => Math.hypot(a.lat - hq.lat, a.lon - hq.lon) - Math.hypot(b.lat - hq.lat, b.lon - hq.lon))[0];
    debug.addFollowers(s, big.id, big.pop);
    advanceSimulation(s, 1);
    s.upgrades = [...s.upgrades, 'i1'];
    expect(establishOutpost(s, big.id).ok).toBe(true);
    return s;
  }

  it('produces zealots every 24 hours without double-producing', () => {
    const s = withOutpost();
    const o = Object.values(s.outposts)[0];
    const z0 = s.zealots.lifetime;
    advanceSimulation(s, BALANCE.outpostCycleSeconds - 10, { stepSize: 600 });
    expect(o.produced).toBe(0);
    advanceSimulation(s, 20, { stepSize: 5 });
    expect(o.produced).toBe(1);
    advanceSimulation(s, 100, { stepSize: 5 });
    expect(o.produced).toBe(1);
    expect(s.zealots.lifetime).toBeGreaterThanOrEqual(z0 + 1);
  });

  it('applies bounded offline progress and defers decisions', () => {
    const s = withOutpost();
    launchCampaign(s, s.candidates[0]);
    const before = s.totals.followers;
    const now = s.lastRealTime + 72 * 3600 * 1000; // 3 days away
    const t0 = Date.now();
    const r = applyOfflineProgress(s, now)!;
    expect(Date.now() - t0).toBeLessThan(20000);
    expect(r.capped).toBe(true);
    expect(r.seconds).toBe(24 * 3600);
    expect(s.totals.followers).toBeGreaterThan(before);
    expect(r.outpostZealots).toBe(1);
    // decisions are never auto-resolved offline
    for (const id of s.pendingDecisions) expect(s.events.find((e) => e.id === id)!.choiceSelected).toBeUndefined();
    checkInvariants(s);
    // a second immediate catch-up does nothing
    expect(applyOfflineProgress(s, now)).toBeNull();
  });
});

describe('long autoplay', () => {
  it('progresses through phases without breaking invariants or getting stuck', () => {
    const s = springGame(777);
    for (let i = 0; i < 300; i++) {
      autoplayTurn(s);
      advanceSimulation(s, 5, { stepSize: 2.5 });
    }
    expect(s.phase).toBeGreaterThanOrEqual(3);
    expect(s.totals.citiesEver85).toBeGreaterThan(5);
    expect(s.milestones.firstOpposition).toBeDefined();
    checkInvariants(s);
  });
});

describe('ensureCity', () => {
  it('creates a dyn once', () => {
    const s = springGame();
    const n = s.touched.length;
    ensureCity(s, CITIES[0].id);
    ensureCity(s, CITIES[0].id);
    expect(s.touched.length).toBe(n + 1);
  });
});
