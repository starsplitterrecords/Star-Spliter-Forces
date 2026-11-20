import { describe, expect, it } from 'vitest';
import '../src/cards/deck';
import { ALL_CARDS } from '../src/cards/deck';
import { choose, drawCard, loadCards, newCardGame, nextLeader, serializeCards, worldShare } from '../src/cards/engine';
import { METERS, type CardGame } from '../src/cards/types';
import { Rng } from '../src/engine/rng';

function greedy(g: CardGame, rng: Rng): 'left' | 'right' {
  const c = g.current!;
  const score = (d: Record<string, number | undefined>) => METERS.reduce((s, k) => s + Math.abs(g.meters[k] + (d[k] ?? 0) - 50) ** 2, 0);
  if (rng.chance(0.15)) return rng.chance(0.5) ? 'left' : 'right';
  return score(c.left.delta) <= score(c.right.delta) ? 'left' : 'right';
}

function play(seed: number, cards: number, policy: (g: CardGame, r: Rng) => 'left' | 'right' = greedy) {
  const g = newCardGame('Jeff', seed, 0);
  const rng = new Rng(seed * 31);
  const seen: string[] = [];
  for (let i = 0; i < cards && g.victoryAt == null; i++) {
    if (g.over) {
      nextLeader(g);
      continue;
    }
    seen.push(g.current!.defId);
    choose(g, policy(g, rng));
  }
  return { g, seen };
}

describe('card edition', () => {
  it('starts with the founding sequence and decides beliefs by choice', () => {
    const g = newCardGame('Jeff', 42, 0);
    expect(g.current!.defId).toBe('found-idea');
    expect(g.movement.doctrines).toHaveLength(0);
    choose(g, 'left');
    expect(g.movement.doctrines).toHaveLength(1);
    expect(g.movement.ideologyName).toMatch(/ism$/);
    expect(g.current!.defId).toBe('found-title');
    for (let i = 0; i < 6; i++) choose(g, 'right');
    expect(g.movement.founded).toBe(true);
    expect(g.leader.title).toMatch(/J$/);
  });

  it('is deterministic for a seed and survives save/load', () => {
    const a = play(7, 60).g;
    const b = play(7, 60).g;
    expect(serializeCards(a)).toBe(serializeCards(b));
    const c = loadCards(serializeCards(a));
    const r1 = new Rng(1), r2 = new Rng(1);
    for (let i = 0; i < 40; i++) {
      if (a.over) nextLeader(a);
      if (c.over) nextLeader(c);
      choose(a, greedy(a, r1));
      choose(c, greedy(c, r2));
    }
    expect(c.converted).toBe(a.converted);
    expect(c.current?.text).toBe(a.current?.text);
  });

  it('keeps meters in range, ends a leader at an extreme, and continues with a successor', () => {
    const { g } = play(3, 300, (gg) => {
      // push the reach meter up relentlessly
      const c = gg.current!;
      return (c.left.delta.reach ?? 0) >= (c.right.delta.reach ?? 0) ? 'left' : 'right';
    });
    expect(g.leaders.length).toBeGreaterThan(0);
    for (const k of METERS) {
      expect(g.meters[k]).toBeGreaterThanOrEqual(0);
      expect(g.meters[k]).toBeLessThanOrEqual(100);
    }
    expect(g.leaders[0].endingTitle).toBeTruthy();
    expect(g.leader.name).not.toBe('Jeff');
  });

  it('renders every card without unfilled template tokens', () => {
    for (const seed of [1, 2, 3, 4]) {
      const { g } = play(seed, 220);
      const rng = new Rng(seed);
      for (const def of ALL_CARDS) {
        const ctx = def.prepare ? def.prepare(g, rng) : {};
        if (!ctx) continue;
        g.current = null;
        g.queue.unshift({ defId: def.id, at: 0, ctx });
        g.over = null;
        const c = drawCard(g)!;
        expect(c.defId).toBe(def.id);
        for (const s of [c.text, c.left.label, c.right.label]) expect(s, `${def.id}: ${s}`).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it('never draws follow-up cards at random and does not repeat a card back-to-back', () => {
    const { seen } = play(11, 400);
    for (let i = 1; i < seen.length; i++) if (seen[i] === seen[i - 1]) expect(['retire', 'succession']).toContain(seen[i]);
  });

  it('reaches world domination with sensible play, with a doctrine-aware ending', () => {
    for (const seed of [5, 6]) {
      const { g } = play(seed, 900);
      expect(worldShare(g)).toBeGreaterThanOrEqual(0.95);
      expect(g.over?.kind).toBe('victory');
      expect(g.over!.text).toContain(g.movement.doctrines[0].originalText);
      expect(g.turn).toBeGreaterThan(120);
      expect(g.movement.doctrines.length).toBeGreaterThanOrEqual(5);
    }
  });
});
