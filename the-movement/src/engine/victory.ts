// Victory conditions and history-dependent endings.
import { BALANCE } from './config';
import { addEvent, chronicle, getCountryShares } from './core';
import { liveFactions } from './factions';
import { COUNTRIES, WORLD_POPULATION, city } from './geo';
import type { Rng } from './rng';
import type { GameState } from './types';

export interface EndingDef {
  id: string;
  name: string;
  blurb: string;
  score: (s: GameState) => number;
}

const t = (s: GameState) => s.movement.temperament;

export const ENDINGS: EndingDef[] = [
  { id: 'benevolent', name: 'The Benevolent Absurdity', blurb: 'Your strange customs become universally accepted and broadly celebrated.', score: (s) => s.cohesion * 0.6 + s.enthusiasm * 0.5 + (100 - t(s).social) * 0.2 },
  { id: 'bureaucratic', name: 'The Bureaucratic Nightmare', blurb: 'Your movement conquers the world, but nobody can accomplish anything without completing fourteen forms.', score: (s) => s.bureaucracy * 1.2 + s.committees.length * 2 },
  { id: 'lost-control', name: 'The Founder Has Lost Control', blurb: 'The world follows your movement, but its current doctrine barely resembles your original vision.', score: (s) => s.drift * 1.2 + (100 - s.control) * 0.4 },
  { id: 'schism', name: 'The Great Schism', blurb: 'The movement achieves world dominance, then fractures into competing interpretations.', score: (s) => liveFactions(s).filter((f) => f.kind === 'splinter').length * 15 + (s.totals.factionFollowers / Math.max(1, s.totals.followers)) * 200 },
  { id: 'utopia', name: 'The Accidental Utopia', blurb: 'Your completely arbitrary philosophy somehow makes the world unexpectedly pleasant.', score: (s) => (100 - t(s).emotion) * 0.3 + (100 - t(s).social) * 0.3 + (100 - t(s).conflict) * 0.3 + s.cohesion * 0.3 + (1 - s.totals.avgResistance) * 20 - s.drift * 0.2 },
  { id: 'committee', name: 'The Eternal Committee', blurb: 'All major decisions are postponed pending a meeting about the scheduling of future meetings.', score: (s) => (s.bureaucracy >= 70 ? s.committees.length * 8 + s.bureaucracy * 0.6 : 0) },
  { id: 'supreme', name: 'The Supreme Authority', blurb: 'The founder retains effective central control over the worldwide institution.', score: (s) => s.control * 1.1 + (100 - s.drift) * 0.3 },
];

export function victoryProgress(s: GameState) {
  const aligned = s.totals.followers + s.totals.alignedFollowers;
  const conv = aligned / WORLD_POPULATION;
  const shares = getCountryShares(s);
  const majority = COUNTRIES.filter((c) => (shares[c.code] ?? 0) >= BALANCE.victoryCountryConversion).length / COUNTRIES.length;
  return {
    conversion: conv,
    countryShare: majority,
    cohesionOk: s.cohesion >= BALANCE.victoryCohesion,
    conversionOk: conv >= BALANCE.victoryConversion,
    countriesOk: majority >= BALANCE.victoryCountryShare,
    stabilizing: s.victory.stabilizingSince != null ? s.time - s.victory.stabilizingSince : 0,
  };
}

export function chooseEnding(s: GameState): EndingDef {
  return [...ENDINGS].sort((a, b) => b.score(s) - a.score(s))[0];
}

export function endingNarrative(s: GameState, e: EndingDef): string {
  const mv = s.movement;
  const first = mv.startingCityId != null ? city(mv.startingCityId).name : city(mv.headquarters.cityId).name;
  const firstDecision = s.events.find((x) => x.choices && x.choiceSelected != null);
  const splinters = Object.values(s.factions).filter((f) => f.kind === 'splinter');
  const rival = Object.values(s.factions).filter((f) => f.kind === 'rival').sort((a, b) => b.followerCount - a.followerCount)[0];
  const changed = mv.doctrines.filter((d) => d.currentText !== d.originalText);
  const lines: string[] = [];
  lines.push(`It began in ${mv.headquarters.type.toLowerCase() === 'yurt' ? 'a yurt' : `a ${mv.headquarters.type.toLowerCase()}`} in ${city(mv.headquarters.cityId).name}, with ${mv.founderTitle} and an idea: ${mv.doctrines.slice(0, 2).map((d) => `“${d.originalText}”`).join(' and ')}.`);
  lines.push(`The first city to hear the message was ${first}. Within ${Math.round(s.time / 3600)} hours of recorded history, ${(victoryProgress(s).conversion * 100).toFixed(1)}% of the world's population had come to ${mv.doctrines.slice(0, 3).map((d) => d.motif.verb).join(', ')}.`);
  if (firstDecision) lines.push(`Scholars still argue about ${firstDecision.headline.replace(/\.$/, '')}, when the founder chose to ${firstDecision.choices![firstDecision.choiceSelected!].label.replace(/\.$/, '').toLowerCase()}.`);
  if (splinters.length) lines.push(`Along the way, ${splinters.length} splinter movement${splinters.length > 1 ? 's' : ''} emerged, beginning with ${splinters[0].name}, who believed that ${splinters[0].doctrineDifferences[0].replace(/\.$/, '').toLowerCase()}.`);
  if (rival) lines.push(`The most significant rival, ${rival.name}, led by ${rival.founder}, ${rival.relationship === 'dissolved' ? 'collapsed under the weight of its own rules' : rival.relationship === 'merged' ? 'was eventually absorbed' : rival.relationship === 'allied' ? 'became an awkward ally' : 'remains, grumbling, at the margins'}.`);
  if (changed.length) lines.push(`Today the doctrine reads “${changed[0].currentText}” — which the founder insists is what it always said.`);
  const specific: Record<string, string> = {
    benevolent: `Everywhere, people ${mv.doctrines[0].motif.verb}, and they seem genuinely happy about it.`,
    bureaucratic: `There are now ${s.committees.length + 12} committees, including the ${s.committees[0] ?? 'Committee on Committees'}. Each requires Form 14-B.`,
    'lost-control': `${mv.founderTitle} occasionally attends a ${mv.meetingSingular.toLowerCase()} incognito and does not recognize most of what is happening.`,
    schism: `The movement rules the world in ${splinters.length + 1} mutually incompatible versions, each certain it is the original.`,
    utopia: `Crime is down. Naps are up. Nobody can explain why ${mv.ideologyName} works, but it does.`,
    committee: `The final victory celebration has been scheduled, pending approval of the scheduling subcommittee.`,
    supreme: `Every proclamation of ${mv.founderTitle} is obeyed to the letter, including the ones that were jokes.`,
  };
  lines.push(specific[e.id] ?? '');
  lines.push(`${e.blurb} Muahahaha.`);
  return lines.filter(Boolean).join('\n\n');
}

export function evaluateVictory(s: GameState, _rng: Rng) {
  const p = victoryProgress(s);
  if (!s.victory.achieved) {
    if (p.conversionOk && p.countriesOk && p.cohesionOk) {
      if (s.victory.stabilizingSince == null) {
        s.victory.stabilizingSince = s.time;
        addEvent(s, { defId: 'victory-stabilizing', category: 'Milestone', important: true, headline: 'World Domination Imminent: Stabilization Period Begins', body: `The world is ${(p.conversion * 100).toFixed(1)}% converted. Maintain cohesion for ${BALANCE.victoryStabilizeSeconds} seconds.` });
      } else if (s.time - s.victory.stabilizingSince >= BALANCE.victoryStabilizeSeconds) {
        const e = chooseEnding(s);
        s.victory.achieved = true;
        s.victory.at = s.time;
        s.victory.ending = e.id;
        s.victory.endingText = endingNarrative(s, e);
        chronicle(s, 'victory', `World Domination: ${e.name}`, s.victory.endingText);
        addEvent(s, { defId: 'victory', category: 'Milestone', important: true, headline: `WORLD DOMINATION: ${e.name}`, body: e.blurb });
      }
    } else if (s.victory.stabilizingSince != null) {
      s.victory.stabilizingSince = undefined;
      addEvent(s, { defId: 'victory-lost', category: 'Milestone', important: true, headline: 'Stabilization Interrupted', body: 'Conditions for world domination have slipped. The world remains, for now, insufficiently enlightened.' });
    }
  }
  if (s.victory.absoluteAt == null && s.totals.followers >= WORLD_POPULATION) {
    s.victory.absoluteAt = s.time;
    chronicle(s, 'absolute', 'Absolute Certainty', `Every last person on Earth now agreed with ${s.movement.founderTitle}. The final holdout, in a small town, said: “Fine.”`);
  }
}
