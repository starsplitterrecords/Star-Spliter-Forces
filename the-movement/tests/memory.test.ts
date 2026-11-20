import { describe, expect, it } from 'vitest';
import { advanceDays, applyEffects, choose, loadStory, newStory, serializeStory, EMERGENT } from '../src/story/engine';
import { agoText, findMemories } from '../src/story/memory';
import { playFor } from '../src/story/autoplay';
import { Rng } from '../src/engine/rng';
import { CITIES } from '../src/engine/geo';
import type { CardInstance, ChoiceOutcome, StoryState } from '../src/story/types';

const LEEDS = CITIES.find((c) => c.name === 'Leeds')!.id;
const fresh = (seed = 1) => newStory('Jeff', LEEDS, seed, 0);
const out = (): ChoiceOutcome => ({ reaction: '', gaugeDelta: {}, loyalty: [], groupNotes: [], notes: [] });
const inst = (cardId: string, speaker: string, ctx: Record<string, string> = {}): CardInstance => ({ uid: 'kx', cardId, speaker, ctx, arrivedDay: 0, priority: 0 });
const grassroots = (s: StoryState) => {
  s.era = 'grassroots';
  s.inbox = [];
  s.scheduled = [];
};

describe('character memory', () => {
  it('remembers being overruled in front of everyone, and who you favoured instead', () => {
    const s = fresh();
    // found.spontaneous_chaos takes place at a meeting; Martin asked, Dez benefited
    applyEffects(s, { loyalty: { martin: -10, dez: 6 } }, inst('found.spontaneous_chaos', 'martin'), new Rng(1), out(), 'Let Dez keep his 4 a.m. meetings.', 1);
    const m = s.memory.find((x) => x.who === 'martin')!;
    expect(m).toMatchObject({ kind: 'overruled', other: 'dez', setting: 'meeting', choice: 1, quote: 'Let Dez keep his 4 a.m. meetings.' });
    expect(m.weight).toBe(3); // a notable slight, witnessed
    expect(s.memory.find((x) => x.who === 'dez')).toMatchObject({ kind: 'favoured', other: 'martin' });
    expect(findMemories(s, { kind: 'overruled', witnessed: true, hasOther: true })).toHaveLength(1);
    expect(findMemories(s, { kind: 'overruled', witnessed: false })).toHaveLength(0);
  });

  it('calls the memory back precisely, three meetings later, and settles it', () => {
    const s = fresh(2);
    grassroots(s);
    applyEffects(s, { loyalty: { martin: -10, dez: 6 } }, inst('found.spontaneous_chaos', 'martin'), new Rng(1), out(), 'Let Dez keep his 4 a.m. meetings.', 1);
    s.day = 21.5;
    s.scheduled.push({ card: 'mem.public_rejection', day: s.day, until: s.day + 3, ctx: {} });
    advanceDays(s, 0.2);
    const card = s.inbox.find((i) => i.cardId === 'mem.public_rejection')!;
    expect(card.speaker).toBe('martin');
    expect(card.ctx).toMatchObject({ mOther: 'Dez', mAgo: 'three meetings ago', mWhere: 'in front of everyone at the meeting', mQuote: 'Let Dez keep his 4 a.m. meetings' });
    const before = s.chars.martin.loyalty;
    expect(choose(s, card.uid, 0).ok).toBe(true);
    expect(s.chars.martin.loyalty).toBeGreaterThan(before);
    expect(s.memory.find((x) => x.who === 'martin' && x.cardId === 'found.spontaneous_chaos')!.resolved).toBe(true);
    expect(findMemories(s, { kind: 'overruled', who: 'martin' })).toHaveLength(0);
  });

  it('describes time in meetings', () => {
    const w = { one: 'meeting', many: 'meetings' };
    expect(agoText(1, w, 'Tuesday')).toBe('last Tuesday');
    expect(agoText(3, w, 'Tuesday')).toBe('three meetings ago');
    expect(agoText(30, w, 'Tuesday')).toBe('about seven months ago');
  });

  it('survives save and load', () => {
    const s = fresh(3);
    playFor(s, 60, 'random', new Rng(3));
    expect(s.memory.length).toBeGreaterThan(5);
    const t = loadStory(serializeStory(s));
    expect(t.memory).toEqual(s.memory);
  });
});

describe('story chains', () => {
  it('waits for prerequisites, then expires when the moment has passed', () => {
    const s = fresh(4);
    grassroots(s);
    s.gauges.attention = 10;
    applyEffects(s, { followUps: [{ card: 'twist.dez_delivers', delay: 1, maxDelay: 3, requires: { gauges: { attention: '>=40' } } }] }, inst('twist.dez_promise', 'dez'), new Rng(1), out(), 'x');
    advanceDays(s, 2);
    expect(s.scheduled).toHaveLength(1); // waiting: not enough attention yet
    advanceDays(s, 2);
    expect(s.scheduled).toHaveLength(0);
    expect(s.chains.expired).toBe(1);
    expect(s.inbox.some((i) => i.cardId === 'twist.dez_delivers')).toBe(false);
  });

  it('delivers inside the window once the condition holds', () => {
    const s = fresh(5);
    grassroots(s);
    s.gauges.attention = 10;
    applyEffects(s, { followUps: [{ card: 'twist.dez_delivers', delay: 1, maxDelay: 6, requires: { gauges: { attention: '>=40' } } }] }, inst('twist.dez_promise', 'dez'), new Rng(1), out(), 'x');
    advanceDays(s, 2);
    s.gauges.attention = 50;
    advanceDays(s, 0.5);
    expect(s.inbox.some((i) => i.cardId === 'twist.dez_delivers')).toBe(true);
    expect(s.chains.delivered).toBe(1);
  });

  it('is cancelled when the situation that made it funny is gone', () => {
    const s = fresh(6);
    grassroots(s);
    applyEffects(s, { followUps: [{ card: 'twist.dez_flop', delay: 3, maxDelay: 9, cancelIf: { anyFlags: ['dez_left', 'dez_promise_settled'] } }] }, inst('twist.dez_promise', 'dez'), new Rng(1), out(), 'x');
    s.flags.dez_promise_settled = s.day;
    advanceDays(s, 1);
    expect(s.scheduled).toHaveLength(0);
    expect(s.chains.cancelled).toBe(1);
  });

  it('a follow-up kept with the same speaker is cancelled if that person leaves', () => {
    const s = fresh(7);
    grassroots(s);
    applyEffects(s, { followUps: [{ card: 'twist.picnic_after', delay: 2, speaker: 'same' }] }, inst('twist.priya_picnic', 'priya'), new Rng(1), out(), 'x');
    s.chars.priya.present = false;
    s.chars.priya.status = 'left';
    advanceDays(s, 3);
    expect(s.chains.cancelled).toBe(1);
  });
});

describe('emergent doctrine', () => {
  it('members invent customs the founder never proposed; the founder must take a position', () => {
    const s = fresh(8);
    playFor(s, 120, 'pleaser', new Rng(8));
    const mine = Object.entries(s.customs).filter(([, c]) => c.origin === 'members');
    expect(EMERGENT.length).toBeGreaterThanOrEqual(10);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.some(([, c]) => c.stance && c.stance !== 'none')).toBe(true);
    // founder-established customs never carry the members' origin
    expect(s.customs.weekly_meeting?.origin).toBeUndefined();
  });

  it('endorsing makes it a tradition and credits whoever started it; condemning may drive it underground', () => {
    const s = fresh(9);
    grassroots(s);
    s.customs['emergent.whale_facts'] = { status: 'practice', values: {}, prominence: 1, since: 0, history: [], origin: 'members', stance: 'none', startedBy: 'gary' };
    applyEffects(s, { stance: 'endorsed' }, inst('doc.noticed_starter', 'gary', { emergent: 'emergent.whale_facts', emergentById: 'gary' }), new Rng(1), out(), 'Make it official.');
    expect(s.customs['emergent.whale_facts']).toMatchObject({ status: 'tradition', stance: 'endorsed' });
    expect(s.memory.find((m) => m.who === 'gary')).toMatchObject({ kind: 'credited' });

    s.groups.traditionalists = s.groups.casuals = 100;
    s.customs['emergent.nod'] = { status: 'practice', values: {}, prominence: 1, since: 0, history: [], origin: 'members', stance: 'none' };
    let underground = 0;
    for (let i = 0; i < 20; i++) {
      s.customs['emergent.nod'].underground = false;
      applyEffects(s, { stance: 'condemned' }, inst('doc.noticed_purist', 'agnes', { emergent: 'emergent.nod' }), new Rng(i), out(), 'Stop it.');
      if (s.customs['emergent.nod'].underground) underground++;
    }
    expect(s.customs['emergent.nod'].status).toBe('abandoned');
    expect(underground).toBeGreaterThan(0);
    expect(underground).toBeLessThan(20);
  });
});
