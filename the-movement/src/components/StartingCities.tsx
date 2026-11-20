'use client';
import { CITY_BY_ID, countryName } from '@/engine/geo';
import { launchCampaign, startingCityInfo } from '@/engine/sim';
import { fmt } from '@/engine/text';
import { play } from '@/lib/audio';
import { useStore } from '@/store/game';

export default function StartingCities() {
  const game = useStore((s) => s.game)!;
  const { act, addDispatchFx, toast } = useStore();
  const mv = game.movement;
  const go = (id: number) => {
    const r = act((g) => launchCampaign(g, id, { founder: true }), { save: true });
    if (r?.ok) {
      play('dispatch');
      addDispatchFx(id, mv.headquarters.cityId);
      toast({ text: `DISPATCHED! ${mv.founderTitle} sets out for ${CITY_BY_ID.get(id)!.name}.`, kind: 'good' });
      (window as unknown as { __centerCity?: (id: number) => void }).__centerCity?.(id);
    }
  };
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <div className="card fadeup w-full max-w-3xl p-5" role="dialog" aria-labelledby="start-title">
        <div className="label">{mv.ideologyName} · Day One</div>
        <h2 id="start-title" className="mt-1 font-serif text-2xl font-bold">
          Choose the first city fortunate enough to hear your message.
        </h2>
        <p className="mt-1 text-sm text-ink-300">
          {mv.founderTitle} will lead this campaign personally. The other cities will begin to hear rumors on their own.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {game.candidates.map((id) => {
            const c = CITY_BY_ID.get(id)!;
            const info = startingCityInfo(game, id);
            return (
              <button key={id} className="rounded-lg border border-ink-600 bg-ink-850 p-4 text-left transition hover:border-brass-400 focus-visible:ring-2 focus-visible:ring-brass-400" onClick={() => go(id)}>
                <div className="font-serif text-xl font-bold">{c.name}</div>
                <div className="text-sm text-ink-300">
                  {c.admin.replace(/ Region$/, '')}, {countryName(c.cc)}
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-400">Population</dt>
                    <dd className="tabular">{fmt(c.pop)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-400">Difficulty</dt>
                    <dd>{info.difficulty}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-400">Local modifier</dt>
                    <dd>×{info.modifier.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-400">Distance from HQ</dt>
                    <dd>{Math.round(info.distanceKm)} km</dd>
                  </div>
                </dl>
                <div className="mt-2 text-xs text-brass-300">Reward: {info.reward}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
