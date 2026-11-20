'use client';
import { useMemo, useState } from 'react';
import { DATASET_META } from '@/engine/geo';
import { calculateRegionalStatistics, type StatLevel, type StatRow, statsToCSV } from '@/engine/stats';
import { fmt, pct } from '@/engine/text';
import { downloadText } from '@/lib/storage';
import { useStore } from '@/store/game';

type SortKey = 'followers' | 'conversion' | 'growth' | 'resistance' | 'zealots' | 'outposts';
const LEVELS: { id: StatLevel; label: string }[] = [
  { id: 'world', label: 'World' },
  { id: 'continent', label: 'Continents' },
  { id: 'region', label: 'Regions' },
  { id: 'country', label: 'Countries' },
  { id: 'admin', label: 'States / Provinces' },
  { id: 'city', label: 'Cities' },
  { id: 'faction', label: 'Factions' },
];

export default function StatsPanel() {
  const game = useStore((s) => s.game)!;
  const version = useStore((s) => s.version);
  const [level, setLevel] = useState<StatLevel>('country');
  const [sort, setSort] = useState<SortKey>('followers');
  const [q, setQ] = useState('');
  const tick = Math.floor(version / 8); // recompute ~every 2 s
  const rows = useMemo(() => calculateRegionalStatistics(game, level), [game, level, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const world = useMemo(() => calculateRegionalStatistics(game, 'world')[0], [game, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = rows
    .filter((r) => level === 'world' || level === 'faction' || r.followers > 0 || q)
    .filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.parent ?? '').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b[sort] as number) - (a[sort] as number))
    .slice(0, 200);
  const head = (k: SortKey, label: string) => (
    <th scope="col" className="px-2 py-1 text-right">
      <button className={`hover:text-brass-300 ${sort === k ? 'text-brass-300' : ''}`} onClick={() => setSort(k)} aria-sort={sort === k ? 'descending' : 'none'}>
        {label}
        {sort === k ? ' ▾' : ''}
      </button>
    </th>
  );
  return (
    <div>
      <div className="doc p-4">
        <div className="text-center text-xs uppercase tracking-[0.3em] text-ink-500">The Movement — Worldwide Membership</div>
        <div className="mt-1 text-center font-serif text-2xl font-bold">{game.movement.ideologyName}</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <Big label="Followers" value={fmt(world.followers)} title={Math.round(world.followers).toLocaleString()} />
          <Big label="World population" value={fmt(world.population)} />
          <Big label="Converted" value={pct(world.conversion, 3)} />
          <Big label="Countries reached" value={String(game.totals.countriesReached)} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1" role="tablist" aria-label="Geographic level">
        {LEVELS.map((l) => (
          <button key={l.id} role="tab" aria-selected={level === l.id} className={`chip text-xs ${level === l.id ? 'chip-on' : 'chip-off'}`} onClick={() => setLevel(l.id)}>
            {l.label}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input aria-label="Filter rows" className="input w-48 py-1.5 text-xs" placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-ghost btn-sm" onClick={() => downloadText(`${game.movement.ideologyName}-${level}-stats.csv`, statsToCSV(rows, level), 'text/csv')}>
          Export CSV
        </button>
        <span className="text-xs text-ink-500">{shown.length} rows</span>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="text-xs text-ink-400">
            <tr>
              <th scope="col" className="px-2 py-1 text-left">
                Name
              </th>
              {head('followers', 'Followers')}
              <th scope="col" className="px-2 py-1 text-right">
                Population
              </th>
              {head('conversion', 'Converted')}
              {head('growth', 'Growth/min')}
              {head('resistance', 'Resistance')}
              {head('zealots', 'Zealots')}
              {head('outposts', 'Outposts')}
            </tr>
          </thead>
          <tbody>
            {shown.map((r: StatRow) => (
              <tr key={r.key} className="border-t border-ink-800">
                <td className="px-2 py-1">
                  <div className="font-semibold">{r.name}</div>
                  {r.parent && <div className="text-[11px] text-ink-500">{r.parent}</div>}
                </td>
                <td className="tabular px-2 py-1 text-right" title={Math.round(r.followers).toLocaleString()}>
                  {fmt(r.followers)}
                </td>
                <td className="tabular px-2 py-1 text-right">{fmt(r.population)}</td>
                <td className="tabular px-2 py-1 text-right">{pct(r.conversion, 2)}</td>
                <td className="tabular px-2 py-1 text-right">{r.growth > 0 ? fmt(r.growth) : '—'}</td>
                <td className="tabular px-2 py-1 text-right">{r.resistance ? r.resistance.toFixed(0) : '—'}</td>
                <td className="tabular px-2 py-1 text-right">{r.zealots || '—'}</td>
                <td className="tabular px-2 py-1 text-right">{r.outposts || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ink-500">
        Game estimates from a fixed dataset snapshot ({DATASET_META.snapshotYear}; {DATASET_META.source}). Country and world totals include population outside modeled cities; state/province totals cover modeled cities only. All social reactions are fictional.
      </p>
    </div>
  );
}

function Big({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div title={title}>
      <div className="text-[10px] uppercase tracking-widest text-ink-500">{label}</div>
      <div className="tabular font-serif text-xl font-bold">{value}</div>
    </div>
  );
}
