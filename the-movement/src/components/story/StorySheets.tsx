'use client';
import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { useMemo } from 'react';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import worldTopo from 'world-atlas/countries-50m.json';
import { city, countryName } from '@/engine/geo';
import { fmt, pct } from '@/engine/text';
import { CHAR_BY_ID, CUSTOM_BY_ID, GROUP_LABEL, assignOrganizer, centralBelief, charName, followers, groupShare, renderCustomLabel } from '@/story/engine';
import { describeMemory, salience } from '@/story/memory';
import { GROUPS, type StoryState } from '@/story/types';
import { Portrait } from './Portrait';

const GROUP_COLOR: Record<string, string> = { founders: '#d8b55e', casuals: '#7a8399', enthusiasts: '#e05a4f', organizers: '#3d8fd8', traditionalists: '#8e44ad', reformers: '#16a085', opportunists: '#e67e22' };
const STATUS_STYLE: Record<string, string> = { proposed: 'border-ink-500 text-ink-300', practice: 'border-sky-400 text-sky-300', tradition: 'border-brass-400 text-brass-300', sacred: 'border-seal-500 text-seal-500', abandoned: 'border-ink-600 text-ink-500 line-through' };

export function PeopleSheet({ s }: { s: StoryState }) {
  const total = followers(s);
  const order = Object.keys(s.chars).sort((a, b) => Number(s.chars[b].present) - Number(s.chars[a].present) || s.chars[b].influence - s.chars[a].influence);
  return (
    <div className="space-y-5">
      <section>
        <h3 className="label">The membership ({fmt(total)})</h3>
        <div className="mt-2 flex h-4 overflow-hidden rounded-full" role="img" aria-label={GROUPS.map((g) => `${GROUP_LABEL[g]} ${Math.round(groupShare(s, g) * 100)}%`).join(', ')}>
          {GROUPS.map((g) => <div key={g} style={{ width: `${groupShare(s, g) * 100}%`, background: GROUP_COLOR[g] }} />)}
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {GROUPS.filter((g) => s.groups[g] >= 0.5).map((g) => (
            <li key={g} className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: GROUP_COLOR[g] }} aria-hidden />
              <span className="flex-1">{GROUP_LABEL[g]}</span>
              <span className="tabular text-ink-300">{fmt(s.groups[g])}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="label">The people around you</h3>
        <ul className="mt-2 space-y-3">
          {order.map((id) => {
            const c = s.chars[id];
            const def = CHAR_BY_ID.get(id)!;
            if (c.status === 'absent') return null;
            const mood = c.loyalty >= 50 ? 'Devoted' : c.loyalty >= 15 ? 'Supportive' : c.loyalty > -15 ? 'Neutral' : c.loyalty > -50 ? 'Resentful' : 'Hostile';
            return (
              <li key={id} className={`rounded-lg border border-ink-700 p-3 ${c.present ? '' : 'opacity-60'}`}>
                <div className="flex gap-3">
                  <Portrait spec={def.portrait} size={64} label={def.name} />
                  <div className="min-w-0 flex-1">
                    <div className="font-serif font-bold">{def.name}</div>
                    <div className="text-xs text-ink-300">{c.present ? c.role : c.status === 'retired' ? 'Retired' : c.status === 'rival' ? 'Left to start something of their own' : 'Left the movement'} · wants: {def.agenda}</div>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <div className="text-ink-400">Loyalty: {mood}</div>
                        <div className="relative h-1.5 rounded-full bg-ink-700"><div className="absolute top-0 h-1.5 rounded-full" style={{ left: c.loyalty < 0 ? `${50 + c.loyalty / 2}%` : '50%', width: `${Math.abs(c.loyalty) / 2}%`, background: c.loyalty < 0 ? '#e05a4f' : '#5ec8a0' }} /></div>
                      </div>
                      <div>
                        <div className="text-ink-400">Influence {Math.round(c.influence)}</div>
                        <div className="h-1.5 rounded-full bg-ink-700"><div className="h-1.5 rounded-full bg-brass-400" style={{ width: `${c.influence}%` }} /></div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-ink-300">{def.bio}</p>
                {(() => {
                  // what is on their mind: the most salient things they remember about you
                  const mems = (s.memory ?? []).filter((m) => m.who === id).sort((a, b) => salience(s, b) - salience(s, a)).slice(0, 3);
                  if (!mems.length) return null;
                  return (
                    <ul className="mt-1 space-y-0.5 text-[11px] text-ink-400">
                      {mems.map((m) => <li key={m.id}>• {describeMemory(m, (x) => charName(s, x))}</li>)}
                    </ul>
                  );
                })()}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export function CustomsSheet({ s }: { s: StoryState }) {
  const belief = centralBelief(s);
  const list = Object.entries(s.customs).filter(([, c]) => c.status !== 'none').sort((a, b) => b[1].prominence - a[1].prominence);
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-ink-700 p-3">
        <div className="label">Name</div>
        <div className="font-serif text-xl font-bold">{s.movementName ?? 'Not yet named'}</div>
        <div className="label mt-2">Central belief</div>
        <div className="font-serif">{belief ? belief.label : 'Nobody has agreed yet.'}</div>
        <div className="label mt-2">You are called</div>
        <div className="font-serif">{s.founderTitle ?? s.founder.name}</div>
      </div>
      <ul className="space-y-2">
        {list.map(([id, c]) => {
          const def = CUSTOM_BY_ID.get(id);
          return (
            <li key={id} className="rounded-lg border border-ink-700 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="font-serif">{def ? renderCustomLabel(s, id) : id}</span>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_STYLE[c.status] ?? ''}`}>{c.status}</span>
              </div>
              {c.origin === 'members' ? (
                <div className="mt-1 text-[11px] text-ink-300">
                  Started by {c.startedBy ? charName(s, c.startedBy) : 'the members'}, not you · {c.stance && c.stance !== 'none' ? `you ${({ endorsed: 'endorsed', tolerated: 'tolerate', reformed: 'reformed', condemned: 'condemned' } as Record<string, string>)[c.stance]} it` : 'you have not taken a position'}
                  {c.underground && ' · still practised quietly'}
                </div>
              ) : (
                def?.champion && <div className="mt-1 text-[11px] text-ink-400">Champion: {charName(s, def.champion)}</div>
              )}
              <div className="mt-1 text-[11px] text-ink-500">{c.history.map((h) => `${h.note && h.note !== 'started by members' ? h.note : h.status} (day ${Math.floor(h.day) + 1})`).join(' → ')}</div>
            </li>
          );
        })}
        {!list.length && <li className="text-sm text-ink-400">No customs yet. They will emerge from what you decide.</li>}
      </ul>
    </div>
  );
}

type Feat = { id: string };
const topo = worldTopo as unknown as Topology;
const land = (feature(topo, topo.objects.countries) as unknown as { features: Feat[] }).features;

export function MapSheet({ s, onChange }: { s: StoryState; onChange: () => void }) {
  const { paths, pts } = useMemo(() => {
    const coords = s.region.map((id) => [city(id).lon, city(id).lat]);
    const proj = geoMercator().fitExtent([[24, 24], [576, 356]], { type: 'MultiPoint', coordinates: coords } as GeoPermissibleObjects);
    const path = geoPath(proj);
    return { paths: land.map((f) => path(f as unknown as GeoPermissibleObjects) ?? ''), pts: Object.fromEntries(s.region.map((id) => [id, proj([city(id).lon, city(id).lat]) ?? [0, 0]])) };
  }, [s.region]);
  const known = s.region.filter((id) => s.cities[id].known);
  return (
    <div>
      <svg viewBox="0 0 600 380" className="w-full rounded-lg bg-[#0f1520]" role="img" aria-label={`Map of the home region: ${known.length} towns know about the movement.`}>
        {paths.map((d, i) => <path key={i} d={d} fill="#262c3a" stroke="#0b0d12" strokeWidth="0.6" />)}
        {s.region.map((id) => {
          const c = s.cities[id];
          const [x, y] = pts[id];
          const conv = c.followers / city(id).pop;
          const r = 3 + Math.sqrt(city(id).pop) / 160;
          return (
            <g key={id}>
              <circle cx={x} cy={y} r={r} fill={c.known ? `rgba(216,181,94,${0.25 + Math.min(0.75, conv * 2)})` : '#363e50'} stroke={id === s.hometown ? '#f4eedf' : c.organizers ? '#5ec8a0' : 'none'} strokeWidth="2" />
              {(id === s.hometown || c.followers > 0) && <text x={x + r + 3} y={y + 4} fontSize="11" fill="#d0d5df">{city(id).name}</text>}
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-ink-400">
        {s.organizersFree} organizer{s.organizersFree === 1 ? '' : 's'} available. Organizers are earned when a town reaches 85%, and by some decisions. Your people decide most of where the movement goes; here you can nudge it.
      </p>
      <ul className="mt-3 divide-y divide-ink-800">
        {known.map((id) => {
          const c = s.cities[id];
          const conv = c.followers / city(id).pop;
          return (
            <li key={id} className="flex items-center gap-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{city(id).name}{id === s.hometown ? ' (home)' : ''}</div>
                <div className="text-[11px] text-ink-400">{countryName(city(id).cc)} · {fmt(c.followers)} of {fmt(city(id).pop)} · {pct(conv, 2)}{c.milestone ? ' · 85% reached' : ''}</div>
                <div className="mt-1 h-1.5 rounded-full bg-ink-700"><div className="h-1.5 rounded-full bg-brass-400" style={{ width: `${Math.max(0.5, conv * 100)}%` }} /></div>
              </div>
              {!c.milestone && (
                <div className="flex items-center gap-1" aria-label={`Organizers in ${city(id).name}`}>
                  <button className="btn-ghost btn-sm w-8" aria-label={`Recall organizer from ${city(id).name}`} disabled={c.organizers < 1} onClick={() => assignOrganizer(s, id, -1) && onChange()}>−</button>
                  <span className="tabular w-5 text-center">{c.organizers}</span>
                  <button className="btn-ghost btn-sm w-8" aria-label={`Send organizer to ${city(id).name}`} disabled={s.organizersFree < 1} onClick={() => assignOrganizer(s, id, 1) && onChange()}>+</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function HistorySheet({ s }: { s: StoryState }) {
  return (
    <div className="space-y-4">
      <ol className="space-y-2 border-l-2 border-ink-700 pl-4">
        {[...s.chronicle].reverse().map((c, i) => (
          <li key={i} className="font-serif text-sm">
            <span className="mr-2 text-xs text-ink-500">Day {Math.floor(c.day) + 1}</span>
            {c.text}
          </li>
        ))}
      </ol>
      <div>
        <div className="label">Your recent decisions</div>
        <ul className="mt-1 space-y-1 text-sm text-ink-300">
          {[...s.history].reverse().slice(0, 25).map((h, i) => (
            <li key={i}>
              <span className="text-ink-500">Day {Math.floor(h.day) + 1} · {h.speaker === 'anon' ? 'a member' : charName(s, h.speaker)}:</span> {h.summary}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
