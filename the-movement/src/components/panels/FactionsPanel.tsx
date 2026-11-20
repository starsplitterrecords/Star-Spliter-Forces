'use client';
import { useState } from 'react';
import { REACTION_STAGES } from '@/engine/config';
import { FACTION_RESPONSES, respondToFaction, type FactionResponse } from '@/engine/factions';
import { CITY_BY_ID, countryName } from '@/engine/geo';
import { getRng } from '@/engine/sim';
import { duration, fmt } from '@/engine/text';
import { useStore } from '@/store/game';
import { Empty, Progress } from '../ui';

export default function FactionsPanel() {
  const game = useStore((s) => s.game)!;
  const { act, openEvent } = useStore();
  const [result, setResult] = useState<Record<string, string>>({});
  const factions = Object.values(game.factions).sort((a, b) => b.followerCount - a.followerCount);
  const live = factions.filter((f) => f.relationship !== 'dissolved' && f.relationship !== 'merged');
  const past = factions.filter((f) => !live.includes(f));
  const respond = (fid: string, r: FactionResponse) => {
    const out = act(
      (g) => {
        const rng = getRng(g);
        const x = respondToFaction(g, fid, r, rng);
        g.rng = rng.state;
        return x;
      },
      { save: true },
    );
    if (out) setResult((m) => ({ ...m, [fid]: out.outcome }));
  };
  return (
    <div className="space-y-5">
      <section>
        <h3 className="label">World reaction: {REACTION_STAGES[game.reaction.stage].name}</h3>
        <p className="text-sm text-ink-300">{REACTION_STAGES[game.reaction.stage].blurb}</p>
      </section>
      <section>
        <h3 className="label">Splinters & rival movements</h3>
        {!live.length && <Empty>No organized dissent yet. Enjoy it.</Empty>}
        <ul className="mt-2 space-y-3">
          {live.map((f) => {
            const hq = CITY_BY_ID.get(f.hqCityId)!;
            const origin = f.originEventId ? game.events.find((e) => e.id === f.originEventId) : undefined;
            return (
              <li key={f.id} className="rounded-md border border-ink-700 p-3">
                <div className="flex justify-between gap-2">
                  <div>
                    <div className="font-serif text-lg font-bold" style={{ color: f.color }}>
                      ▲ {f.name}
                    </div>
                    <div className="text-xs text-ink-400">
                      {f.kind === 'splinter' ? `Splinter (${f.style})` : f.kind === 'rival' ? 'Independent rival movement' : 'Historical precedent'} · led by {f.founder} · HQ {hq.name}, {countryName(hq.cc)} · founded {duration(f.createdAt)} in
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tabular font-semibold">{fmt(f.followerCount)}</div>
                    <div className="text-xs capitalize text-ink-400">{f.relationship}</div>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-ink-400">Believes:</span> {f.doctrineDifferences.join(' ')}
                  {f.customs.length > 0 && f.kind !== 'splinter' && <div className="text-xs text-ink-400">Customs: {f.customs.join(' ')}</div>}
                </div>
                {origin && (
                  <button className="mt-1 text-left text-xs text-ink-400 underline" onClick={() => openEvent(origin.id)}>
                    Origin: {origin.headline}
                  </button>
                )}
                <div className="mt-2">
                  <div className="text-xs text-ink-400">Strength of disagreement</div>
                  <Progress value={f.disagreement} max={100} color="#d68c46" label="Disagreement" />
                </div>
                <div className="mt-1 text-xs text-ink-400">Present in {f.locations.length} cities.</div>
                {f.kind !== 'precedent' && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {FACTION_RESPONSES.filter((r) => f.kind === 'splinter' || !['adopt', 'autonomy', 'clarify'].includes(r.id)).map((r) => (
                      <button key={r.id} className="btn-ghost btn-sm" title={r.desc} disabled={!!r.cost && game.influence < r.cost} onClick={() => respond(f.id, r.id)}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}
                {result[f.id] && <p className="mt-2 rounded bg-ink-850 p-2 font-serif text-sm">{result[f.id]}</p>}
              </li>
            );
          })}
        </ul>
      </section>
      <section>
        <h3 className="label">Opposition organizations</h3>
        {!game.reaction.orgs.length && <Empty>No one has organized against you. Yet.</Empty>}
        <ul className="mt-2 space-y-2">
          {game.reaction.orgs.map((o) => (
            <li key={o.id} className={`rounded-md border border-ink-700 p-2 text-sm ${o.dissolved ? 'opacity-50' : ''}`}>
              <div className="flex justify-between">
                <span className="font-semibold">{o.name}</span>
                <span className="text-xs">{o.dissolved ? 'disbanded' : `strength ${Math.round(o.strength)}`}</span>
              </div>
              <div className="text-xs text-ink-400">
                {countryName(o.homeCountry)} · tactic: {o.tactic} · backfired {o.backfires}×
              </div>
            </li>
          ))}
        </ul>
      </section>
      {past.length > 0 && (
        <section>
          <h3 className="label">Former factions</h3>
          <ul className="mt-1 text-sm text-ink-400">
            {past.map((f) => (
              <li key={f.id}>
                {f.name} — {f.relationship}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
