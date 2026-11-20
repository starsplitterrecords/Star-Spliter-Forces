'use client';
import { BALANCE } from '@/engine/config';
import { outpostCapacity } from '@/engine/core';
import { CITY_BY_ID, countryName } from '@/engine/geo';
import { canEstablishOutpost, establishOutpost, outpostCost, outpostUpgradeCost, upgradeOutpost } from '@/engine/sim';
import { duration, fmt } from '@/engine/text';
import type { Outpost } from '@/engine/types';
import { getMods } from '@/engine/upgrades';
import { useStore } from '@/store/game';
import { Empty, Progress } from '../ui';

const TYPES: { id: Outpost['type']; label: string; desc: string }[] = [
  { id: 'recruitment', label: 'Recruitment', desc: 'Double zealot output.' },
  { id: 'broadcast', label: 'Broadcast', desc: 'Stronger regional influence.' },
  { id: 'ceremonial', label: 'Ceremonial', desc: '+cohesion on each upgrade.' },
  { id: 'bureaucratic', label: 'Bureaucratic', desc: '+bureaucracy. Forms in triplicate.' },
];

export default function OutpostsPanel() {
  const game = useStore((s) => s.game)!;
  const { act, selectCity } = useStore();
  const mv = game.movement;
  const outposts = Object.values(game.outposts);
  const cap = outpostCapacity(game);
  const cycle = BALANCE.outpostCycleSeconds / getMods(game).outpostRate;
  const eligible = game.touched.filter((id) => !canEstablishOutpost(game, id));
  const nearly = game.touched.filter((id) => game.cities[id].controlled && !game.cities[id].outpostId && CITY_BY_ID.get(id)!.pop >= BALANCE.outpostEligiblePop).slice(0, 10);
  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-300">
        {mv.outpostName} radiate influence, accelerate local conversion, and train a fresh zealot every {duration(cycle)} of real time — even while you are away. Capacity: {outposts.length}/{cap}.
        {cap === 0 && ' Unlock the Infrastructure upgrade to build your first.'}
      </p>
      <section>
        <h3 className="label">Established</h3>
        {!outposts.length && <Empty>No {mv.outpostName.toLowerCase()} yet.</Empty>}
        <ul className="mt-2 space-y-2">
          {outposts.map((o) => {
            const c = CITY_BY_ID.get(o.cityId)!;
            const next = o.lastProductionTime + cycle - game.time;
            return (
              <li key={o.id} className="rounded-md border border-ink-700 p-3">
                <div className="flex justify-between">
                  <button className="font-serif font-bold hover:text-brass-300" onClick={() => selectCity(o.cityId)}>
                    ■ {c.name}, {countryName(c.cc)}
                  </button>
                  <span className="text-sm">Level {o.level}</span>
                </div>
                <div className="text-xs text-ink-400">
                  {o.type} · {o.productionRate} zealot{o.productionRate > 1 ? 's' : ''} per cycle · produced {o.produced} · next in {duration(Math.max(0, next))}
                </div>
                <Progress value={cycle - next} max={cycle} label="Production cycle" color="var(--mv-secondary)" />
                <div className="mt-2 flex flex-wrap gap-2">
                  {o.level < 5 &&
                    (o.type === 'standard' && o.level >= 1 ? (
                      TYPES.map((t) => (
                        <button key={t.id} className="btn-ghost btn-sm" title={t.desc} disabled={game.influence < outpostUpgradeCost(o)} onClick={() => act((g) => upgradeOutpost(g, o.id, t.id), { save: true })}>
                          Specialize: {t.label} ({outpostUpgradeCost(o)})
                        </button>
                      ))
                    ) : (
                      <button className="btn-ghost btn-sm" disabled={game.influence < outpostUpgradeCost(o)} onClick={() => act((g) => upgradeOutpost(g, o.id), { save: true })}>
                        Upgrade to level {o.level + 1} ({outpostUpgradeCost(o)} influence)
                      </button>
                    ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <section>
        <h3 className="label">Strategically important cities</h3>
        {!nearly.length && <Empty>Convert a city of {fmt(BALANCE.outpostEligiblePop)}+ people to 85% to unlock a site.</Empty>}
        <ul className="mt-2 space-y-1">
          {nearly.map((id) => {
            const err = canEstablishOutpost(game, id);
            return (
              <li key={id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {CITY_BY_ID.get(id)!.name} <span className="text-ink-400">({fmt(CITY_BY_ID.get(id)!.pop)})</span>
                </span>
                <button className="btn-primary btn-sm" disabled={!!err} title={err ?? ''} onClick={() => act((g) => establishOutpost(g, id), { save: true })}>
                  Establish {outpostCost(game) ? `(${outpostCost(game)})` : '(free)'}
                </button>
              </li>
            );
          })}
        </ul>
        {eligible.length === 0 && nearly.length > 0 && <p className="mt-2 text-xs text-ink-400">{canEstablishOutpost(game, nearly[0])}</p>}
      </section>
    </div>
  );
}
