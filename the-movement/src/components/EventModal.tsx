'use client';
import { useState } from 'react';
import { resolveChoice } from '@/engine/events';
import { getRng } from '@/engine/sim';
import { CITY_BY_ID, countryName } from '@/engine/geo';
import { duration } from '@/engine/text';
import { play } from '@/lib/audio';
import { eventById, useStore } from '@/store/game';
import { Modal } from './ui';

export default function EventModal({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const game = useStore((s) => s.game)!;
  const { act, openEvent } = useStore();
  const [result, setResult] = useState<{ outcome: string; summary: string[] } | null>(null);
  const ev = eventById(game, eventId);
  if (!ev) return null;
  const pending = ev.choices && ev.choiceSelected == null;
  const city = ev.cityId != null ? CITY_BY_ID.get(ev.cityId) : undefined;
  const ref = ev.refs.eventId ? game.events.find((e) => e.id === ev.refs.eventId) : undefined;
  const faction = ev.refs.factionId ? game.factions[ev.refs.factionId] : undefined;
  const choose = (i: number) => {
    const r = act(
      (g) => {
        const rng = getRng(g);
        const out = resolveChoice(g, eventId, i, rng);
        g.rng = rng.state;
        return out;
      },
      { save: true },
    );
    if (r?.ok) {
      play('click');
      setResult({ outcome: r.outcome, summary: r.summary });
    }
  };
  const nextPending = game.pendingDecisions.find((id) => id !== eventId);
  return (
    <Modal title={pending ? 'A Decision Is Required' : ev.category} onClose={onClose} doc>
      <article>
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-ink-500">
          <span>{ev.category}</span>
          {city && (
            <span>
              · {city.name}, {countryName(city.cc)}
            </span>
          )}
          <span>· {duration(ev.time)} into the movement</span>
          {ev.aiEnhanced && <span>· narrated</span>}
        </div>
        <h3 className="mt-2 font-serif text-2xl font-bold leading-tight">{ev.headline}</h3>
        <p className="mt-3 font-serif leading-relaxed">{ev.body}</p>
        {ev.quote && <blockquote className="mt-3 border-l-4 border-seal-500 pl-3 font-serif italic text-ink-700">{ev.quote}</blockquote>}
        {ref && (
          <p className="mt-3 text-sm text-ink-600">
            Related: <button className="underline" onClick={() => openEvent(ref.id)}>{ref.headline}</button>
          </p>
        )}
        {faction && <p className="mt-2 text-sm text-ink-600">Faction: {faction.name} ({faction.relationship})</p>}
        {!pending && ev.choices && ev.choiceSelected != null && !result && (
          <div className="mt-4 rounded border border-parchment-300 bg-parchment-100 p-3 text-sm">
            <div className="font-semibold">Decision taken: {ev.choices[ev.choiceSelected].label}</div>
            <div className="mt-1">{ev.choices[ev.choiceSelected].outcome}</div>
          </div>
        )}
        {ev.effectsSummary.length > 0 && !result && (
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            {ev.effectsSummary.map((s, i) => (
              <li key={i} className="rounded bg-parchment-200 px-2 py-0.5">
                {s}
              </li>
            ))}
          </ul>
        )}
      </article>
      {pending && !result && (
        <div className="mt-5 space-y-2">
          {ev.choices!.map((c, i) => (
            <button key={i} className="block w-full rounded-md border-2 border-ink-800 bg-white p-3 text-left text-ink-950 hover:border-seal-500 hover:bg-parchment-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal-500" onClick={() => choose(i)}>
              <div className="font-serif font-bold">
                {String.fromCharCode(65 + i)}. {c.label}
              </div>
              <div className="text-sm text-ink-600">{c.description}</div>
              {c.hint && <div className="mt-1 text-xs uppercase tracking-wider text-seal-600">{c.hint}</div>}
            </button>
          ))}
          <p className="text-xs text-ink-500">You may close this and decide later. The simulation continues meanwhile.</p>
        </div>
      )}
      {result && (
        <div className="fadeup mt-5 rounded-md border-2 border-seal-500 p-3">
          <span className="stamp">Decided</span>
          <p className="mt-2 font-serif">{result.outcome}</p>
          {result.summary.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2 text-xs">
              {result.summary.map((s, i) => (
                <li key={i} className="rounded bg-parchment-200 px-2 py-0.5">
                  {s}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-ink-500">Some consequences may arrive later.</p>
          <div className="mt-3 flex justify-end gap-2">
            {nextPending && (
              <button className="btn btn-sm border border-ink-800 text-ink-900" onClick={() => { setResult(null); openEvent(nextPending); }}>
                Next decision →
              </button>
            )}
            <button className="btn btn-sm bg-ink-900 text-white" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
