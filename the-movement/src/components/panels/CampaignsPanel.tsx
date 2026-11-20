'use client';
import { useMemo, useState } from 'react';
import { BALANCE } from '@/engine/config';
import { CAMPAIGN_TYPE_BY_ID } from '@/engine/campaignTypes';
import { activeCampaigns, availableZealots, campaignSlots } from '@/engine/core';
import { CITY_BY_ID, countryName, populationTier } from '@/engine/geo';
import { calculateConversionRate, endCampaign, scout, startingCityInfo } from '@/engine/sim';
import { duration, fmt, pct } from '@/engine/text';
import { useStore } from '@/store/game';
import { projectedSeconds } from '../CityPanel';
import { Empty, Progress } from '../ui';

type Filter = 'open' | 'candidates' | 'converted' | 'all';
type Sort = 'pop' | 'conv' | 'name' | 'difficulty';

export default function CampaignsPanel() {
  const game = useStore((s) => s.game)!;
  const { act, selectCity, toast } = useStore();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('open');
  const [sort, setSort] = useState<Sort>('pop');
  const [tier, setTier] = useState(0);
  const mv = game.movement;
  const active = activeCampaigns(game);
  const avail = availableZealots(game);
  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let ids = game.discovered.filter((id) => {
      const d = game.cities[id];
      if (filter === 'open' && (d.controlled || d.campaignId)) return false;
      if (filter === 'candidates' && !game.candidates.includes(id)) return false;
      if (filter === 'converted' && !d.controlled) return false;
      const c = CITY_BY_ID.get(id)!;
      if (tier && populationTier(c.pop).tier !== tier) return false;
      return !qq || c.name.toLowerCase().includes(qq) || countryName(c.cc).toLowerCase().includes(qq);
    });
    ids = ids.sort((a, b) => {
      const ca = CITY_BY_ID.get(a)!, cb = CITY_BY_ID.get(b)!;
      if (sort === 'name') return ca.name.localeCompare(cb.name);
      if (sort === 'conv') return game.cities[b].followers / cb.pop - game.cities[a].followers / ca.pop;
      if (sort === 'difficulty') return startingCityInfo(game, b).difficultyValue - startingCityInfo(game, a).difficultyValue;
      return cb.pop - ca.pop;
    });
    return ids.slice(0, 150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, game.discovered.length, q, filter, sort, tier, useStore.getState().version]);

  return (
    <div className="space-y-5">
      <section>
        <div className="flex items-center justify-between">
          <h3 className="label">
            Active campaigns ({active.length}/{campaignSlots(game)})
          </h3>
          <span className="text-xs text-ink-400">
            {avail} zealot{avail === 1 ? '' : 's'} available · {game.zealots.total} total
          </span>
        </div>
        {active.length === 0 && <Empty>{avail} zealots await your instructions. Choose a city below.</Empty>}
        <ul className="mt-2 space-y-2">
          {active.map((c) => {
            const city = CITY_BY_ID.get(c.cityId)!;
            const d = game.cities[c.cityId];
            const conv = d.followers / city.pop;
            const rate = calculateConversionRate(game, c.cityId, false);
            const eta = projectedSeconds(d.followers, city.pop, conv >= 0.85 ? 1 : 0.85, rate.active + rate.passive, 1);
            return (
              <li key={c.id} className="rounded-md border border-ink-700 p-3">
                <div className="flex justify-between gap-2">
                  <button className="text-left font-serif font-bold hover:text-brass-300" onClick={() => selectCity(c.cityId)}>
                    {city.name}, {countryName(city.cc)}
                  </button>
                  <span className="tabular text-sm">{pct(conv, 1)}</span>
                </div>
                <Progress value={conv} marker={BALANCE.strategicThreshold} label={`${city.name} progress`} />
                <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-ink-400">
                  <span>
                    {CAMPAIGN_TYPE_BY_ID[c.type]?.name(mv)} · {c.founder ? `${mv.founderTitle} + ` : ''}
                    {c.zealots} zealot{c.zealots === 1 ? '' : 's'} · {fmt(c.gained)} converted
                  </span>
                  <span>{Number.isFinite(eta) && eta > 0 ? `projected ${conv >= 0.85 ? '100%' : '85%'} in ~${duration(eta)}` : ''}</span>
                </div>
                {conv >= 0.85 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="btn-primary btn-sm" onClick={() => act((g) => endCampaign(g, c.id, 'redeploy'), { save: true })}>
                      Declare converted &amp; redeploy
                    </button>
                    <button className="btn-ghost btn-sm" onClick={() => act((g) => endCampaign(g, c.id, 'passive'))}>
                      Leave to grow passively
                    </button>
                    <button className="btn-ghost btn-sm" onClick={() => selectCity(c.cityId)}>
                      More options
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section>
        <div className="flex items-center justify-between">
          <h3 className="label">Discovered cities ({game.discovered.length})</h3>
          <button
            className="btn-ghost btn-sm"
            disabled={game.time < game.timers.scoutReadyAt}
            onClick={() => {
              const r = act((g) => scout(g));
              if (r) toast({ text: r.ok ? r.message ?? 'Scouts dispatched.' : r.error, kind: r.ok ? 'good' : 'warn' });
            }}
          >
            {game.time < game.timers.scoutReadyAt ? `Scouts return in ${Math.ceil(game.timers.scoutReadyAt - game.time)}s` : 'Send scouts (find 3 cities)'}
          </button>
        </div>
        {game.candidates.length > 0 && (
          <p className="mt-1 text-sm text-ink-200">
            {avail > 0 ? `${avail} zealot${avail === 1 ? ' is' : 's are'} ready. ` : ''}Your message has reached the cities of {game.candidates.map((id) => CITY_BY_ID.get(id)!.name).join(', ')}.
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <input aria-label="Filter cities" className="input w-40 py-1.5 text-xs" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select aria-label="Filter" className="input w-auto py-1.5 text-xs" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="open">Not yet converted</option>
            <option value="candidates">Latest discoveries</option>
            <option value="converted">Converted</option>
            <option value="all">All</option>
          </select>
          <select aria-label="City size" className="input w-auto py-1.5 text-xs" value={tier} onChange={(e) => setTier(Number(e.target.value))}>
            <option value={0}>Any size</option>
            {[1, 2, 3, 4, 5, 6, 7].map((t) => (
              <option key={t} value={t}>
                {populationTier([20000, 50000, 150000, 500000, 1500000, 5000000, 15000000][t - 1]).label}
              </option>
            ))}
          </select>
          <select aria-label="Sort" className="input w-auto py-1.5 text-xs" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="pop">Sort: population</option>
            <option value="conv">Sort: conversion</option>
            <option value="difficulty">Sort: easiest</option>
            <option value="name">Sort: name</option>
          </select>
        </div>
        <ul className="mt-2 divide-y divide-ink-800">
          {list.map((id) => {
            const c = CITY_BY_ID.get(id)!;
            const d = game.cities[id];
            const info = startingCityInfo(game, id);
            return (
              <li key={id}>
                <button className="flex w-full items-center justify-between gap-2 py-2 text-left hover:bg-ink-800" onClick={() => selectCity(id)}>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {game.candidates.includes(id) && <span className="mr-1 text-brass-300">new</span>}
                      {c.name}
                    </span>
                    <span className="block truncate text-xs text-ink-400">
                      {countryName(c.cc)} · {fmt(c.pop)} · {info.difficulty}
                      {d.campaignId ? ' · campaign active' : ''}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-sm">{pct(d.followers / c.pop, 1)}</span>
                </button>
              </li>
            );
          })}
          {!list.length && <Empty>No cities match. Send scouts, or improve Communications.</Empty>}
        </ul>
      </section>
    </div>
  );
}
