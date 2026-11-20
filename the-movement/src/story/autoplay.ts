// Automated players for stress tests: each policy is a different leadership style.
import { CARD_BY_ID, callMeeting, choose, currentCard, advanceDays } from './engine';
import { Rng } from './rng-shim';
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
export function playFor(s: StoryState, days: number, policy: Policy, rng: Rng, idleShare = 0.3, track?: { emptyDays: number }) {
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
      if (track && !currentCard(s)) track.emptyDays += 1;
    } else {
      const waited = callMeeting(s);
      if (track && !currentCard(s)) track.emptyDays += waited;
    }
  }
}
