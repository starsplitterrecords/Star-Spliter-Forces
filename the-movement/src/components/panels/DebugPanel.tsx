'use client';
import { useState } from 'react';
import { autoplayTurn } from '@/engine/autoplay';
import { EVENT_DEFS, triggerEvent } from '@/engine/events';
import { applyAttributeOverrides } from '@/engine/ideology';
import { debug, getRng } from '@/engine/sim';
import type { DoctrineAttributes } from '@/engine/types';
import { useStore } from '@/store/game';

export default function DebugPanel() {
  const game = useStore((s) => s.game)!;
  const { act, selectedCity } = useStore();
  const [defId, setDefId] = useState(EVENT_DEFS[0].id);
  const [docId, setDocId] = useState(game.movement.doctrines[0].id);
  const target = selectedCity ?? game.movement.headquarters.cityId;
  const btn = (label: string, fn: () => void) => (
    <button key={label} className="btn-ghost btn-sm" onClick={fn}>
      {label}
    </button>
  );
  const doc = game.movement.doctrines.find((d) => d.id === docId)!;
  return (
    <div className="space-y-4 text-sm">
      <p className="text-seal-500">Developer tools. Hidden unless debug mode is enabled (Settings or ?debug=1).</p>
      <section className="flex flex-wrap gap-2">
        {btn('+5 min game time', () => act((g) => debug.advance(g, 300)))}
        {btn('+1 hour', () => act((g) => debug.advance(g, 3600)))}
        {btn('+24 hours', () => act((g) => debug.advance(g, 86400)))}
        {btn('Autoplay 1 turn', () => act((g) => autoplayTurn(g)))}
        {btn('+10k followers (selected/HQ)', () => act((g) => debug.addFollowers(g, target, 10000)))}
        {btn('+5 zealots', () => act((g) => debug.zealots(g, 5)))}
        {btn('+500 influence', () => act((g) => debug.influence(g, 500)))}
        {btn('+0.1 resistance everywhere', () => act((g) => debug.resistance(g, 0.1)))}
        {btn('Spawn splinter', () => act((g) => debug.splinter(g)))}
        {[3, 4, 5, 6, 7].map((p) => btn(`Jump to phase ${p}`, () => act((g) => debug.jumpPhase(g, p))))}
      </section>
      <section>
        <div className="label">Trigger event</div>
        <div className="mt-1 flex gap-2">
          <select aria-label="Event definition" className="input py-1.5 text-xs" value={defId} onChange={(e) => setDefId(e.target.value)}>
            {EVENT_DEFS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} ({d.category})
              </option>
            ))}
          </select>
          {btn('Trigger', () =>
            act((g) => {
              const rng = getRng(g);
              triggerEvent(g, defId, rng);
              g.rng = rng.state;
            }),
          )}
        </div>
      </section>
      <section>
        <div className="label">Doctrine interpretation (edit tags)</div>
        <select aria-label="Doctrine" className="input mt-1 py-1.5 text-xs" value={docId} onChange={(e) => setDocId(e.target.value)}>
          {game.movement.doctrines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.originalText}
            </option>
          ))}
        </select>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(Object.keys(doc.attributes) as (keyof DoctrineAttributes)[]).map((k) => (
            <label key={k} className="text-xs">
              {k}
              <input
                type="number"
                min={0}
                max={100}
                className="input py-1 text-xs"
                value={doc.attributes[k]}
                onChange={(e) =>
                  act((g) => {
                    const i = g.movement.doctrines.findIndex((d) => d.id === docId);
                    g.movement.doctrines[i] = applyAttributeOverrides(g.movement.doctrines[i], { [k]: Number(e.target.value) }, `debug override: ${k}`);
                  })
                }
              />
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-ink-500">Motif: {doc.motif.key} · tags: {doc.tags.join(', ')}</p>
      </section>
      <section className="text-xs text-ink-400">
        time {Math.round(game.time)}s · touched {game.touched.length} · discovered {game.discovered.length} · events {game.events.length} · rng {game.rng}
      </section>
    </div>
  );
}
