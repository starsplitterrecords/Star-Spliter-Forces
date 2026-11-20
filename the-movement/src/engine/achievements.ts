// Achievements with genuine gameplay triggers, including doctrine-specific ones that only
// exist for doctrines the player actually chose.
import { addEvent } from './core';
import { CITY_BY_ID, WORLD_POPULATION } from './geo';
import type { GameState } from './types';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  check: (s: GameState) => boolean;
  hidden?: boolean;
}

const titleCase = (s: string) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());

export const BASE_ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-believer', name: 'The First Believer', desc: 'Recruit your first follower.', check: (s) => s.totals.followers >= 2 },
  { id: 'dozens', name: 'There Are Dozens of Us', desc: 'Reach 12 followers.', check: (s) => s.totals.followers >= 12 },
  { id: 'reasonable', name: 'An Entirely Reasonable Following', desc: 'Recruit 1,000 followers.', check: (s) => s.totals.followers >= 1000 },
  { id: 'first-zealot', name: 'Zealous', desc: 'Earn your first zealot.', check: (s) => s.zealots.lifetime >= 1 },
  { id: 'legs', name: 'The Movement Has Legs', desc: 'Strategically convert 10 cities.', check: (s) => s.totals.citiesEver85 >= 10 },
  { id: 'out-of-hand', name: 'This Is Getting Out of Hand', desc: 'Reach 1 million followers.', check: (s) => s.totals.followers >= 1e6 },
  { id: 'local-celebrity', name: 'Local Celebrity', desc: 'Complete your first major-city campaign.', check: (s) => s.milestones.firstMajorCity != null },
  { id: 'talking', name: 'They\'re Talking About Us', desc: 'Receive your first national news story.', check: (s) => s.milestones.nationalNews != null },
  { id: 'committee', name: 'We Have a Committee', desc: 'Unlock an organizational upgrade.', check: (s) => s.upgrades.some((u) => u.startsWith('o')) },
  { id: 'committee2', name: 'The Committee Has a Committee', desc: 'Reach advanced bureaucracy (60+).', check: (s) => s.bureaucracy >= 60 },
  { id: 'never-said', name: 'We Never Said That', desc: 'Experience your first doctrinal misunderstanding.', check: (s) => (s.counters.misunderstandings ?? 0) > 0 },
  { id: 'heretic', name: 'Heretic!', desc: 'Experience your first splinter movement.', check: (s) => (s.counters.splinters ?? 0) > 0 },
  { id: 'always-supported', name: 'I Have Always Supported This', desc: 'Reverse a prior doctrinal proclamation.', check: (s) => (s.counters.reversals ?? 0) > 0 },
  { id: 'outpost', name: 'Forward Operating Base', desc: 'Establish your first outpost.', check: (s) => s.milestones.firstOutpost != null },
  { id: 'opposition', name: 'We Have Enemies Now', desc: 'Inspire your first opposition organization.', check: (s) => s.reaction.orgs.length > 0 },
  { id: 'abroad', name: 'Passport Required', desc: 'Reach followers in 5 countries.', check: (s) => s.totals.countriesReached >= 5 },
  { id: 'fifty-countries', name: 'Cultural Exchange Program', desc: 'Reach followers in 50 countries.', check: (s) => s.totals.countriesReached >= 50 },
  { id: 'hundred-million', name: 'A Significant Minority', desc: 'Reach 100 million followers.', check: (s) => s.totals.followers >= 1e8 },
  { id: 'reunified', name: 'Prodigal Members', desc: 'Successfully reunify a splinter faction.', check: (s) => Object.values(s.factions).some((f) => f.kind === 'splinter' && f.relationship === 'merged') },
  { id: 'every-holdout', name: 'Not a Single Holdout', desc: 'Convert 100% of a city.', check: (s) => (s.counters.cities100 ?? 0) > 0 },
  { id: 'world-domination', name: 'World Domination', desc: 'Achieve the primary global victory.', check: (s) => s.victory.achieved },
  { id: 'every-last-one', name: 'Every Last One', desc: 'Reach 100% modeled global conversion.', check: (s) => s.totals.followers >= WORLD_POPULATION },
  { id: 'megacity', name: 'Metropolitan Enlightenment', desc: 'Strategically convert a megacity (10M+).', check: (s) => s.touched.some((id) => s.cities[id].controlled && (CITY_BY_ID.get(id)?.pop ?? 0) >= 1e7) },
];

/** Doctrine-specific achievements, generated from the player's own founding choices. */
export function doctrineAchievements(s: GameState): AchievementDef[] {
  return s.movement.doctrines.map((d) => {
    const N = titleCase(d.motif.noun);
    const names: Record<string, string> = {
      music: `Worldwide ${N} Festival`,
      housing: `A ${N} on Every Hill`,
      clothing: `Global ${N} Dominance`,
      food: `The World Eats ${titleCase(d.motif.plural)}`,
      hobby: `International ${N} Day`,
      hygiene: `Clean by Decree`,
      principle: `Self-Evident: ${N}`,
      prohibition: `Universally Forbidden`,
    };
    return {
      id: `doctrine-${d.id}`,
      name: d.motif.key === 'nap' ? 'International Napping Day' : names[d.category] ?? `Global ${N} Dominance`,
      desc: `Reach 25% world conversion while people still ${d.motif.verb}.`,
      check: (st: GameState) => st.totals.followers / WORLD_POPULATION >= 0.25,
    };
  });
}

export function allAchievements(s: GameState): AchievementDef[] {
  return [...BASE_ACHIEVEMENTS, ...doctrineAchievements(s)];
}

export function checkAchievements(s: GameState): string[] {
  const unlocked: string[] = [];
  for (const a of allAchievements(s)) {
    if (s.achievements[a.id] != null) continue;
    if (a.check(s)) {
      s.achievements[a.id] = s.time;
      unlocked.push(a.id);
      addEvent(s, { defId: 'achievement', category: 'Achievement', important: false, headline: `Achievement: ${a.name}`, body: a.desc });
    }
  }
  return unlocked;
}
