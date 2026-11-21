// Automated players for stress tests: each policy is a different leadership style.
import { CARD_BY_ID, callMeeting, choose, currentCard, advanceDays, eligibleCards } from './engine';
import { Rng } from './rng-shim';
import * as camp from './campaign';
import { CHAR_BY_ID } from './engine';
import type { StoryState } from './types';

export type Policy = 'random' | 'pleaser' | 'order' | 'expansion' | 'stubborn';

export function pickChoice(s: StoryState, policy: Policy, rng: Rng): 0 | 1 {
  const inst = currentCard(s)!;
  const card = CARD_BY_ID.get(inst.cardId)!;
  const score = (i: 0 | 1) => {
    const e = card.choices[i].effects;
    const serves = e.serves ?? [];
    switch (policy) {
      case 'random':
        return rng.next();
      case 'order':
        return (serves.includes('order') ? 2 : 0) + (serves.includes('purity') ? 1 : 0) - (serves.includes('-order') ? 2 : 0) + rng.next() * 0.5;
      case 'expansion':
        return (serves.includes('expansion') ? 2 : 0) - (serves.includes('-expansion') ? 2 : 0) + (e.followers ?? 0) / 5 + rng.next() * 0.5;
      case 'stubborn':
        return i === 0 ? 1 : 0;
      default: {
        // keep the gauges healthy and the speaker happy
        let v = 0;
        for (const [g, d] of Object.entries(e.gauges ?? {})) v -= Math.abs(s.gauges[g as keyof StoryState['gauges']] + d! - 50) - Math.abs(s.gauges[g as keyof StoryState['gauges']] - 50);
        const agenda = CHAR_BY_ID.get(inst.speaker)?.agenda;
        if (agenda && serves.includes(agenda)) v += 6;
        return v + rng.next();
      }
    }
  };
  return score(0) >= score(1) ? 0 : 1;
}

/** Play for `days` of game time: decide everything that arrives, call meetings when the desk is empty. */
export function playFor(s: StoryState, days: number, policy: Policy, rng: Rng, idleShare = 0.3, track?: { emptyDays: number; starvedDays?: number }) {
  const end = s.day + days;
  let guard = 0;
  while (s.day < end && !s.ended && guard++ < 20000) {
    if (currentCard(s)) {
      const inst = currentCard(s)!;
      const card = CARD_BY_ID.get(inst.cardId)!;
      const i = pickChoice(s, policy, rng);
      const input = card.choices[i].input ? 'The Lentil Fellowship' : undefined;
      choose(s, inst.uid, i, input);
    } else if (rng.chance(idleShare)) {
      advanceDays(s, 1);
      if (track && !currentCard(s)) {
        track.emptyDays += 1;
        if (!eligibleCards(s).length) track.starvedDays = (track.starvedDays ?? 0) + 1;
      }
    } else {
      const waited = callMeeting(s);
      if (track && !currentCard(s)) {
        track.emptyDays += waited;
        if (!eligibleCards(s).length) track.starvedDays = (track.starvedDays ?? 0) + waited;
      }
    }
  }
}

/** Play until `target` decisions have been made and the next card is waiting (or the game ends). */
export function playUntilDecision(s: StoryState, target: number, policy: Policy, rng: Rng, maxDays = 400): boolean {
  const end = s.day + maxDays;
  let guard = 0;
  while (!s.ended && s.day < end && guard++ < 20000) {
    const inst = currentCard(s);
    if (inst && s.decisions >= target) return true;
    if (inst) {
      const card = CARD_BY_ID.get(inst.cardId)!;
      const i = pickChoice(s, policy, rng);
      choose(s, inst.uid, i, card.choices[i].input ? 'The Lentil Fellowship' : undefined);
    } else callMeeting(s);
  }
  return false;
}

/** Playtesting: fast-forward a new game to the start of an era with a sensible, accommodating leader. */
export function fastForwardTo(s: StoryState, era: StoryState['era'], seed = 1): boolean {
  const order = ['founding', 'grassroots', 'regional', 'national', 'international', 'world'];
  const rng = new Rng(seed);
  let guard = 0;
  if (s.weekly) {
    while (order.indexOf(s.era) < order.indexOf(era) && !s.ended && guard++ < 400) playWeeks(s, 1, 'pleaser', rng);
    s.chronicle.push({ day: s.day, text: `(Playtest: the story so far was played automatically, to reach the ${era} era.)` });
    return s.era === era && !s.ended;
  }
  while (order.indexOf(s.era) < order.indexOf(era) && !s.ended && guard++ < 6000) {
    const inst = currentCard(s);
    if (!inst) {
      callMeeting(s);
      continue;
    }
    const card = CARD_BY_ID.get(inst.cardId)!;
    // steer away from the edges so the fast-forward doesn't end the leadership
    const i = pickChoice(s, 'pleaser', rng);
    choose(s, inst.uid, i, card.choices[i].input ? 'The Lentil Fellowship' : undefined);
  }
  s.chronicle.push({ day: s.day, text: `(Playtest: the story so far was played automatically, to reach the ${era} era.)` });
  return s.era === era && !s.ended;
}

/** Weekly mode: send everyone somewhere sensible, answer the problems on the map, end the week. */
export function playWeeks(s: StoryState, weeks: number, policy: Policy, rng: Rng, answerShare = 1): void {
  for (let w = 0; w < weeks && !s.ended; w++) {
    // the rota draws itself up; with a scheduler, pick a focus (lie low when the papers are circling)
    if (camp.hasScheduler(s)) {
      s.focus = s.gauges.attention >= 75 ? 'rest' : rng.chance(0.5) ? 'spread' : 'grow';
      camp.planWeek(s);
    } else if (s.planned !== s.week) camp.planWeek(s);
    let guard = 0;
    while (s.inbox.length && !s.ended && guard++ < 30) {
      if (!rng.chance(answerShare) && currentCard(s)?.priority! < 50) break;
      const inst = currentCard(s)!;
      const card = CARD_BY_ID.get(inst.cardId)!;
      const i = pickChoice(s, policy, rng);
      choose(s, inst.uid, i, card.choices[i].input ? 'The Lentil Fellowship' : undefined);
    }
    if (!s.ended) camp.endWeek(s);
  }
}
