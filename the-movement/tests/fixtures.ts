import { createMovement, type MovementInput } from '../src/engine/ideology';
import { CITIES } from '../src/engine/geo';
import { newGame } from '../src/engine/sim';
import type { GameMode } from '../src/engine/types';

export const HARTFORD = CITIES.find((c) => c.name === 'Hartford' && c.cc === 'US')!;

export function springismInput(seed = 12345, mode: GameMode = 'standard'): MovementInput {
  return {
    ideologyName: 'Spring',
    founderName: 'Jeff',
    headquarters: { cityId: HARTFORD.id, type: 'Yurt', style: 'Rustic', features: ['A hand-painted sign'] },
    spiritAnimal: 'Capybara',
    banner: { primary: '#6b3fa0', secondary: '#d4a72c', accent: '#ffffff', symbol: 'animal', shape: 'shield', pattern: 'stripe' },
    motto: 'Obviously.',
    temperament: { emotion: 15, social: 20, conflict: 40, activity: 10 },
    principles: ['People should spend more time enjoying the journey than the destination.'],
    customs: [
      { category: 'clothing', text: 'Wear springs on shoes.' },
      { category: 'food', text: 'Eat mashed potatoes once daily.' },
      { category: 'music', text: 'Yacht rock.' },
      { category: 'hobby', text: 'Build towers from popsicle sticks.' },
      { category: 'housing', text: 'Yurts.' },
    ],
    meetingName: 'Hootenannies',
    outpostName: 'Power Circles',
    gameMode: mode,
    worldSeed: seed,
    foundingDate: 1_700_000_000_000,
  };
}

export function springGame(seed = 12345, mode: GameMode = 'standard') {
  const mv = createMovement(springismInput(seed, mode));
  return newGame(mv, { seed, now: 1_700_000_000_000 });
}
