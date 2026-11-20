'use client';
import { useState } from 'react';
import { BALANCE } from '@/engine/config';
import { CAMPAIGN_TYPE_BY_ID } from '@/engine/campaignTypes';
import { activeCampaigns, availableZealots, campaignSlots, nearestCities } from '@/engine/core';
import { CITY_BY_ID, countryName, populationTier } from '@/engine/geo';
import { allocateZealots, calculateConversionRate, canEstablishOutpost, endCampaign, establishOutpost, launchCampaign, outpostCost, startingCityInfo, unlockedCampaignTypes } from '@/engine/sim';
import { duration, fmt, pct } from '@/engine/text';
import { othersTotal } from '@/engine/core';
import { play } from '@/lib/audio';
import { useStore } from '@/store/game';
import { Drawer, Progress } from './ui';

export function projectedSeconds(followers: number, pop: number, target: number, rate: number, awareness: number): number {
  // projection for exponential approach toward awareness * pop; returns Infinity if unreachable
  const cap = awareness * pop;
  const goal = target * pop;
  if (followers >= goal) return 0;
  if (rate <= 0 || cap <= goal) return Infinity;
  return Math.log((cap - followers) / (cap - goal)) / rate;
}

export function DispatchForm({ cityId, compact }: { cityId: number; compact?: boolean }) {
  const game = useStore((s) => s.game)!;
  const { act, addDispatchFx, toast } = useStore();
  const avail = availableZealots(game);
  const founderBusy = activeCampaigns(game).some((c) => c.founder);
  const types = unlockedCampaignTypes(game);
  const [type, setType] = useState('grassroots');
  const [z, setZ] = useState(Math.min(avail, founderBusy ? 1 : 0));
  const [founder, setFounder] = useState(!founderBusy);
  const [msg, setMsg] = useState<string | null>(null);
  const slotsFull = activeCampaigns(game).length >= campaignSlots(game);
  const t = CAMPAIGN_TYPE_BY_ID[type];
  const mv = game.movement;
  const launch = () => {
    const r = act((g) => launchCampaign(g, cityId, { type, zealots: z, founder }), { save: true });
    if (!r) return;
    if (r.ok) {
      play('dispatch');
      const from = nearestCities(CITY_BY_ID.get(cityId)!.lat, CITY_BY_ID.get(cityId)!.lon, 1, () => true)[0];
      addDispatchFx(cityId, from);
      setMsg('DISPATCHED!');
      toast({ text: `DISPATCHED! ${founder ? mv.founderTitle : `${z} zealot${z === 1 ? '' : 's'}`} → ${CITY_BY_ID.get(cityId)!.name}`, kind: 'good' });
    } else setMsg(r.error);
  };
  if (msg === 'DISPATCHED!') return <div className="pop py-4 text-center font-serif text-3xl font-black tracking-widest text-brass-300">DISPATCHED!</div>;
  return (
    <div className="space-y-3">
      {!compact && (
        <p className="text-sm text-ink-200">
          {avail > 0 ? `${avail} zealot${avail === 1 ? ' is' : 's are'} ready.` : 'No zealots are idle.'} {founderBusy ? `${mv.founderTitle} is leading another campaign.` : `${mv.founderTitle} is available to lead personally.`}
        </p>
      )}
      <div>
        <label className="label" htmlFor={`ctype-${cityId}`}>
          Campaign type
        </label>
        <select id={`ctype-${cityId}`} className="input mt-1" value={type} onChange={(e) => setType(e.target.value)}>
          {types.map((ct) => (
            <option key={ct.id} value={ct.id} disabled={(ct.founderOnly && founderBusy) || ct.influenceCost > game.influence || (ct.fundsCost > 0 && game.funds < ct.fundsCost)}>
              {ct.name(mv)}
              {ct.influenceCost ? ` (${ct.influenceCost} influence)` : ''}
              {ct.fundsCost ? ` (${fmt(ct.fundsCost)} funds)` : ''}
            </option>
          ))}
        </select>
        {t && (
          <p className="mt-1 text-xs text-ink-400">
            {t.desc(mv)} Power ×{t.power} · Awareness ×{t.awareness} · Risk: {t.risk}. Fit: ×{t.affinity(mv).mult.toFixed(2)} ({t.affinity(mv).reason}).
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={founder} disabled={founderBusy} onChange={(e) => setFounder(e.target.checked)} className="h-4 w-4 accent-[#d8b55e]" />
          {mv.founderTitle} leads personally
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm">Zealots</span>
          <button className="btn-ghost btn-sm w-8" aria-label="Fewer zealots" onClick={() => setZ(Math.max(0, z - 1))}>
            −
          </button>
          <span className="tabular w-6 text-center" aria-live="polite">
            {z}
          </span>
          <button className="btn-ghost btn-sm w-8" aria-label="More zealots" onClick={() => setZ(Math.min(avail, z + 1))}>
            +
          </button>
          <span className="text-xs text-ink-400">of {avail}</span>
        </div>
      </div>
      {msg && <p className="text-sm text-seal-500">{msg}</p>}
      <button className="btn-primary w-full" disabled={slotsFull || (!founder && z === 0) || (t?.founderOnly && !founder)} onClick={launch}>
        {slotsFull ? 'All campaign slots in use' : 'Dispatch'}
      </button>
    </div>
  );
}

export default function CityPanel({ cityId }: { cityId: number }) {
  const game = useStore((s) => s.game)!;
  useStore((s) => s.version);
  const { selectCity, act, toast } = useStore();
  const c = CITY_BY_ID.get(cityId);
  if (!c) return null;
  const d = game.cities[cityId];
  const conv = d ? d.followers / c.pop : 0;
  const rate = calculateConversionRate(game, cityId, true);
  const camp = d?.campaignId ? game.campaigns[d.campaignId] : undefined;
  const info = startingCityInfo(game, cityId);
  const eligible = d ? Math.max(0, d.awareness * (c.pop - othersTotal(d)) - d.followers) : 0;
  const perSec = eligible * (rate.active + rate.passive);
  const eta85 = d ? projectedSeconds(d.followers, c.pop, 0.85, rate.active + rate.passive, Math.max(d.awareness, camp ? 1 : d.awareness)) : Infinity;
  const outErr = canEstablishOutpost(game, cityId);
  const events = (d?.events ?? []).map((id) => game.events.find((e) => e.id === id)).filter(Boolean).reverse();
  const hist = d?.history ?? [];
  const mv = game.movement;
  const others = d ? Object.entries(d.others).filter(([, v]) => v >= 1) : [];

  return (
    <Drawer title={`${c.name}`} onClose={() => selectCity(null)}>
      <div className="text-sm text-ink-300">
        {c.admin.replace(/ Region$/, '')}, {countryName(c.cc)} · {populationTier(c.pop).label}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <Field label="Population">{c.pop.toLocaleString()}</Field>
        <Field label={mv.pluralFollowers}>{Math.round(d?.followers ?? 0).toLocaleString()}</Field>
        <Field label="Converted">{pct(conv, 2)}</Field>
        <Field label="Awareness">{pct(d?.awareness ?? 0, 1)}</Field>
        <Field label="Conversion rate">{perSec >= 1 ? `${fmt(perSec)}/s` : perSec > 0 ? `${(perSec * 60).toFixed(1)}/min` : '—'}</Field>
        <Field label="Resistance">{Math.round((d?.resistance ?? 0) * 100)}</Field>
        <Field label="Enthusiasm">{Math.round(game.enthusiasm * (d?.enthusiasm ?? 1))}</Field>
        <Field label="Assigned">{camp ? `${camp.founder ? `${mv.founderTitle} + ` : ''}${camp.zealots} zealot${camp.zealots === 1 ? '' : 's'}` : 'None'}</Field>
        <Field label="Infrastructure">{Math.round(d?.infrastructure ?? 0)}</Field>
        <Field label={mv.outpostSingular}>{d?.outpostId ? `Level ${game.outposts[d.outpostId].level}` : 'None'}</Field>
      </div>
      <div className="mt-3">
        <Progress value={conv} marker={BALANCE.strategicThreshold} label="Conversion progress" />
        <div className="mt-1 flex justify-between text-xs text-ink-400">
          <span>{d?.controlled ? 'Strategically converted ✓' : 'Not yet converted'}</span>
          <span>{eta85 > 0 && Number.isFinite(eta85) ? `Projected 85% in ~${duration(eta85)} (projection, not a promise)` : eta85 === 0 ? '85% reached' : 'No projected completion at current rates'}</span>
        </div>
      </div>
      {others.length > 0 && (
        <div className="mt-3 text-xs">
          <div className="label">Other movements here</div>
          {others.map(([fid, n]) => (
            <div key={fid} className="flex justify-between">
              <span>▲ {game.factions[fid]?.name ?? fid}</span>
              <span>{fmt(n)}</span>
            </div>
          ))}
        </div>
      )}
      {hist.length > 2 && (
        <div className="mt-3">
          <div className="label">Conversion history</div>
          <Spark values={hist} pop={c.pop} />
        </div>
      )}

      <div className="mt-4 rounded-md border border-ink-700 p-3">
        {!d?.discovered ? (
          <p className="text-sm text-ink-300">Your message has not yet reached {c.name}. Expand nearby, or improve Communications.</p>
        ) : camp ? (
          <div className="space-y-2">
            <div className="label">Active campaign: {CAMPAIGN_TYPE_BY_ID[camp.type]?.name(mv)}</div>
            <div className="text-xs text-ink-400">Started {duration(game.time - camp.startedAt)} ago · {fmt(camp.gained)} converted</div>
            <div className="flex items-center gap-2 text-sm">
              Zealots: {camp.zealots}
              <button className="btn-ghost btn-sm" onClick={() => act((g) => allocateZealots(g, camp.id, 1))} disabled={availableZealots(game) < 1}>
                + Add
              </button>
              <button className="btn-ghost btn-sm" onClick={() => act((g) => allocateZealots(g, camp.id, -1))} disabled={camp.zealots < 1 || (camp.zealots === 1 && !camp.founder)}>
                − Reassign
              </button>
            </div>
            {conv >= BALANCE.strategicThreshold && (
              <div className="rounded bg-brass-400/10 p-2 text-sm">
                <p className="font-serif">
                  Congratulations, {mv.founderTitle}. {c.name} is strategically converted. Your orders?
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button className="btn-primary btn-sm" onClick={() => act((g) => endCampaign(g, camp.id, 'redeploy'), { save: true })}>
                    Declare converted &amp; redeploy
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => toast({ text: `The campaign in ${c.name} continues toward 100%.`, kind: 'info' })}>
                    Continue toward 100%
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => act((g) => endCampaign(g, camp.id, 'passive'), { save: true })}>
                    Leave it to grow passively
                  </button>
                  <button className="btn-ghost btn-sm" disabled={!!outErr} title={outErr ?? ''} onClick={() => act((g) => establishOutpost(g, cityId), { save: true })}>
                    Establish {mv.outpostSingular}
                  </button>
                </div>
              </div>
            )}
            {conv < BALANCE.strategicThreshold && (
              <button className="btn-ghost btn-sm" onClick={() => act((g) => endCampaign(g, camp.id, 'cancel'))}>
                Recall campaign
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="label mb-2">Launch a campaign · Difficulty: {info.difficulty}</div>
            <DispatchForm cityId={cityId} />
          </>
        )}
        {d?.controlled && !d.outpostId && !camp && (
          <div className="mt-3 border-t border-ink-700 pt-3">
            <button className="btn-ghost w-full" disabled={!!outErr} onClick={() => act((g) => establishOutpost(g, cityId), { save: true })}>
              Establish {mv.outpostSingular} {outpostCost(game) ? `(${outpostCost(game)} influence)` : '(free)'}
            </button>
            {outErr && <p className="mt-1 text-xs text-ink-400">{outErr}</p>}
          </div>
        )}
      </div>

      {rate.factors.length > 0 && (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-ink-300">Rate modifiers</summary>
          <ul className="mt-1 space-y-0.5">
            {rate.factors.map((f) => (
              <li key={f.label} className="flex justify-between">
                <span>{f.label}</span>
                <span className="tabular">×{f.value.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {events.length > 0 && (
        <div className="mt-4">
          <div className="label">Local events</div>
          <ul className="mt-1 space-y-1 text-sm">
            {events.slice(0, 8).map((e) => (
              <li key={e!.id}>
                <button className="text-left font-serif hover:text-brass-300" onClick={() => useStore.getState().openEvent(e!.id)}>
                  {e!.headline}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="tabular font-semibold">{children}</div>
    </div>
  );
}

function Spark({ values, pop }: { values: number[]; pop: number }) {
  const W = 300, H = 50;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - (v / pop) * H}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 h-12 w-full" role="img" aria-label={`Conversion history, now ${((values[values.length - 1] / pop) * 100).toFixed(1)}%`}>
      <line x1="0" x2={W} y1={H * 0.15} y2={H * 0.15} stroke="#b8933a" strokeDasharray="3 3" />
      <polyline points={pts} fill="none" stroke="var(--mv-primary)" strokeWidth="2" />
    </svg>
  );
}
