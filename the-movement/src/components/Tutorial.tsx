'use client';
import { activeCampaigns, availableZealots } from '@/engine/core';
import { CITY_BY_ID } from '@/engine/geo';
import type { GameState } from '@/engine/types';
import { useStore } from '@/store/game';

interface Step {
  id: string;
  when: (g: GameState) => boolean;
  text: (g: GameState) => string;
}

// Integrated first-play sequence, voiced by the founder's overconfident assistant.
const STEPS: Step[] = [
  {
    id: 'watch',
    when: (g) => (g.counters.campaignsLaunched ?? 0) >= 1 && g.totals.citiesEver85 === 0 && maxConv(g) < 0.5,
    text: (g) => `Splendid, ${g.movement.founderTitle}. The campaign is underway. Watch the number of ${g.movement.pluralFollowers} rise — each one entirely of their own free will.`,
  },
  {
    id: 'nearly',
    when: (g) => g.totals.citiesEver85 === 0 && maxConv(g) >= 0.5,
    text: (g) => `Excellent, ${g.movement.founderTitle}. Your first city is nearly convinced. Only a small number of unreasonable holdouts remain.`,
  },
  {
    id: 'zealot',
    when: (g) => g.totals.citiesEver85 >= 1 && (g.counters.campaignsLaunched ?? 0) < 2,
    text: (g) => `A zealot has emerged from the grateful population, and three new cities have heard of us. ${availableZealots(g) > 0 ? 'Select one on the map and dispatch them.' : 'Redeploy your forces to a new city.'}`,
  },
  {
    id: 'passive',
    when: (g) => (g.counters.campaignsLaunched ?? 0) >= 2 && g.totals.passiveConversions > 0 && g.upgrades.length === 0,
    text: () => 'Observe: cities you have not visited are acquiring followers on their own. Word of mouth, my lord. Also: you have Influence. Visit Upgrades (U) to spend it.',
  },
  {
    id: 'upgrade',
    when: (g) => g.upgrades.length >= 1 && !g.milestones.firstNews,
    text: () => 'A wise investment. The press has not noticed us yet. They will.',
  },
  {
    id: 'news',
    when: (g) => !!g.milestones.firstNews && g.totals.citiesEver85 < 4,
    text: () => 'We are in the news! Headlines appear in the ticker below and the News panel (N). Some events will require your judgment.',
  },
  {
    id: 'slots',
    when: (g) => g.totals.citiesEver85 >= 2 && activeCampaigns(g).length < 2 && availableZealots(g) > 0,
    text: () => 'You may now run two campaigns at once. More slots come from Organization upgrades. Idle zealots accomplish nothing, which is unacceptable.',
  },
];

function maxConv(g: GameState) {
  let m = 0;
  for (const c of activeCampaigns(g)) m = Math.max(m, (g.cities[c.cityId]?.followers ?? 0) / CITY_BY_ID.get(c.cityId)!.pop);
  return m;
}

export default function Tutorial() {
  const game = useStore((s) => s.game)!;
  useStore((s) => s.version);
  const { bump } = useStore();
  if (game.tutorial.skipped || game.tutorial.done) return null;
  const step = STEPS.find((s) => !game.tutorial.seen.includes(s.id) && s.when(game));
  if (!step) {
    if (game.totals.citiesEver85 >= 5 && game.upgrades.length >= 2) {
      game.tutorial.done = true;
    }
    return null;
  }
  return (
    <div className="fadeup absolute bottom-16 left-2 z-30 max-w-sm rounded-lg border border-brass-500/60 bg-ink-900/95 p-3 shadow-xl sm:bottom-12" role="status">
      <div className="label text-brass-300">Your Assistant</div>
      <p className="mt-1 font-serif text-sm leading-snug">{step.text(game)}</p>
      <div className="mt-2 flex justify-end gap-2">
        <button
          className="btn-ghost btn-sm"
          onClick={() => {
            game.tutorial.skipped = true;
            bump();
          }}
        >
          Skip tutorial
        </button>
        <button
          className="btn-primary btn-sm"
          onClick={() => {
            game.tutorial.seen.push(step.id);
            game.tutorial.step++;
            bump();
          }}
        >
          Understood
        </button>
      </div>
    </div>
  );
}
