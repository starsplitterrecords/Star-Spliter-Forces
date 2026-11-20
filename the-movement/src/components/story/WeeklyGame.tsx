'use client';
// The weekly dispatch screen: the map is the game. Send your people to real towns, deal with the
// problems that turn up where they are, then end the week.
import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { useCallback, useMemo, useState } from 'react';
import { city, countryName } from '@/engine/geo';
import { fmt } from '@/engine/text';
import { play } from '@/lib/audio';
import { saveStory } from '@/lib/storyStorage';
import { BRANCH, assignUnit, pinAll, endWeek, isOurs, pins, reachable, units, variantTerritory, whereIs } from '@/story/campaign';
import { CARD_BY_ID, CHAR_BY_ID, cardText, centralBelief, charName, choose, followers, render } from '@/story/engine';
import { type CardInstance, type ChoiceOutcome, type Gauge, GAUGES, type StoryState } from '@/story/types';
import { Portrait, anonSpec } from './Portrait';
import { CustomsSheet, HistorySheet, PeopleSheet, land } from './StorySheets';

const ERA_LABEL: Record<string, string> = { founding: 'Founding Era', grassroots: 'Grassroots Era', regional: 'Regional Era', national: 'National Era', international: 'International Era', world: 'World Era' };
const GAUGE_LABEL: Record<Gauge, string> = { enthusiasm: 'Enthusiasm', unity: 'Unity', attention: 'Attention', resources: 'Resources' };
const W = 640;
const H = 440;

function variantColor(v: string): string {
  const who = [...CHAR_BY_ID.values()].find((c) => c.flavour === v);
  if (who) return who.portrait.coat;
  let h = 0;
  for (const ch of v) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 55% 60%)`;
}

function Gauges({ s, preview, delta }: { s: StoryState; preview?: Partial<Record<Gauge, number>>; delta?: Partial<Record<Gauge, number>> }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {GAUGES.map((g) => {
        const v = s.gauges[g];
        const danger = v <= 12 || v >= 88;
        const p = preview?.[g];
        const d = delta?.[g];
        return (
          <div key={g} className="min-w-0" title={`${GAUGE_LABEL[g]} ${Math.round(v)}/100. Both extremes are dangerous.`}>
            <div className="flex items-baseline justify-between gap-1">
              <span className="truncate text-[10px] uppercase tracking-wider text-ink-400">{GAUGE_LABEL[g]}</span>
              <span className={`tabular text-xs ${danger ? 'text-red-400' : 'text-ink-200'}`}>{Math.round(v)}</span>
            </div>
            <div className="relative mt-1 h-2 rounded-full bg-ink-700" role="meter" aria-label={GAUGE_LABEL[g]} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-2 rounded-full transition-[width] duration-500" style={{ width: `${v}%`, background: danger ? '#e05a4f' : '#e8cf8a' }} />
            </div>
            <div className="flex h-3 items-center justify-center" aria-hidden>
              {p ? <span className="rounded-full bg-brass-300" style={{ width: Math.abs(p) >= 9 ? 9 : 5, height: Math.abs(p) >= 9 ? 9 : 5 }} /> : null}
              {d ? <span className={`text-[10px] font-bold ${d > 0 ? 'text-emerald-300' : 'text-red-400'}`}>{d > 0 ? `▲ ${Math.round(d)}` : `▼ ${Math.round(-d)}`}</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Sheet = 'people' | 'customs' | 'history' | 'menu' | null;

export default function WeeklyGame({ s, onAbandon, onExit }: { s: StoryState; onAbandon: () => void; onExit: () => void }) {
  const [, setV] = useState(0);
  const bump = () => setV((v) => v + 1);
  const [selected, setSelected] = useState<string | null>(null);
  const [town, setTown] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null); // card instance uid
  const [outcome, setOutcome] = useState<(ChoiceOutcome & { speaker: string; city: number }) | null>(null);
  const [hover, setHover] = useState<0 | 1 | null>(null);
  const [inputFor, setInputFor] = useState<0 | 1 | null>(null);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState('');
  const [report, setReport] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [toast, setToast] = useState('');

  const save = useCallback(() => void saveStory(s), [s]);
  const known = reachable(s);
  const pinMap = pins(s);
  const roster = units(s);
  const belief = centralBelief(s);

  // the map frames the towns you know about, with a margin
  const { paths, pts } = useMemo(() => {
    const ids = known.length > 1 ? known : [s.hometown];
    const h = city(s.hometown);
    const coords = [...ids.map((id) => [city(id).lon, city(id).lat]), [h.lon - 0.12, h.lat - 0.08], [h.lon + 0.12, h.lat + 0.08]];
    const proj = geoMercator().fitExtent([[28, 28], [W - 28, H - 28]], { type: 'MultiPoint', coordinates: coords } as GeoPermissibleObjects);
    const path = geoPath(proj);
    return {
      paths: land.map((f) => path(f as unknown as GeoPermissibleObjects) ?? ''),
      pts: Object.fromEntries(s.region.map((id) => [id, proj([city(id).lon, city(id).lat]) ?? [0, 0]])) as Record<number, [number, number]>,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [known.length, s.hometown]);

  const atTown = useMemo(() => {
    const m = new Map<number, typeof roster>();
    for (const u of roster) {
      const at = whereIs(s, u.id);
      m.set(at, [...(m.get(at) ?? []), u]);
    }
    return m;
  }, [roster, s]);

  // keep labels readable: towns that matter right now
  const labelled = useMemo(() => {
    if (known.length <= 18) return new Set(known);
    const important = known.filter((id) => id === s.hometown || atTown.has(id) || pinMap.has(id) || s.cities[id].rival);
    const rest = known.filter((id) => !important.includes(id) && s.cities[id].followers >= BRANCH).sort((a, b) => s.cities[b].followers - s.cities[a].followers);
    return new Set([...important, ...rest.slice(0, Math.max(0, 14 - important.length))]);
  }, [known, atTown, pinMap, s]);

  const tapTown = (id: number) => {
    if (selected) {
      const u = roster.find((x) => x.id === selected);
      if (assignUnit(s, selected, id)) {
        setToast(`${u?.label ?? 'They'} will spend next week in ${city(id).name}.`);
        play('click');
        save();
      }
      setSelected(null);
      bump();
      return;
    }
    const here = pinMap.get(id) ?? [];
    if (here.length === 1 && town !== id) {
      openCard(here[0]);
      return;
    }
    setTown(id);
  };

  const openCard = (i: CardInstance) => {
    setOpen(i.uid);
    setTown(null);
    setOutcome(null);
    setHover(null);
    setInputFor(null);
    setError('');
  };

  const inst = open ? s.inbox.find((i) => i.uid === open) : undefined;
  const card = inst ? CARD_BY_ID.get(inst.cardId) : undefined;

  const decide = (i: 0 | 1) => {
    if (!inst || !card) return;
    if (card.choices[i].input && inputFor !== i) {
      setInputFor(i);
      setInputText(render(s, card.choices[i].input!.suggest ?? '', inst.ctx));
      return;
    }
    const at = inst.city ?? s.hometown;
    const r = choose(s, inst.uid, i, card.choices[i].input ? inputText : undefined);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    // anything that arrived as a consequence lands on the map too
    pinAll(s);
    play(s.ended ? 'schism' : 'click');
    setOutcome({ ...r.outcome, speaker: inst.speaker, city: at });
    setOpen(null);
    save();
    bump();
  };

  const doEndWeek = () => {
    endWeek(s);
    play('news');
    setReport(true);
    setTown(null);
    setSelected(null);
    save();
    bump();
  };

  const f = followers(s);
  const waiting = s.inbox.length;
  const urgent = s.inbox.filter((i) => i.priority >= 50 || CARD_BY_ID.get(i.cardId)?.type === 'crisis');

  // ------------------------------------------------ the card in front of you
  const speakerId = outcome ? outcome.speaker : inst?.speaker;
  const def = speakerId && speakerId !== 'anon' ? CHAR_BY_ID.get(speakerId) : undefined;
  const portrait = def?.portrait ?? anonSpec(inst?.anon?.seed ?? 7);
  const speakerName = def ? def.name : inst?.anon?.name ?? 'Someone';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ink-950">
      <header className="border-b border-ink-800 bg-ink-900 px-4 pt-3">
        <div className="mx-auto max-w-3xl">
          <Gauges s={s} preview={hover != null && card ? card.choices[hover].effects.gauges : undefined} delta={outcome?.gaugeDelta} />
          <div className="mt-1 flex items-center justify-between pb-2 text-xs text-ink-300">
            <span>{s.customs.weekly_meeting?.values.day ?? 'Tuesday'}, week {s.week} · {ERA_LABEL[s.era] ?? s.era}</span>
            <span className="tabular">{s.movementName ?? 'The group'} · {fmt(f)} members · {known.filter((id) => isOurs(s, id) && s.cities[id].followers > 0).length} towns</span>
          </div>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-3 py-3">
          {s.ended ? (
            <div className="fadeup rounded-2xl border-4 border-parchment-200 bg-parchment-50 p-6 text-ink-950 shadow-2xl">
              <div className="text-xs uppercase tracking-[0.3em] text-ink-500">The end of your leadership</div>
              <h2 className="mt-2 font-serif text-3xl font-black">{s.ended.title}</h2>
              <p className="mt-3 font-serif leading-relaxed">{s.ended.text}</p>
              <p className="mt-3 text-sm text-ink-600">You led {s.movementName ?? 'the group'} for {s.week} weeks. {fmt(f)} people still belong to it.</p>
              <button className="btn mt-4 w-full bg-ink-900 py-3 text-white" onClick={() => setSheet('history')}>Read the history</button>
              <button className="btn mt-2 w-full border border-ink-800 text-ink-900" onClick={() => setConfirmNew(true)}>Start again</button>
            </div>
          ) : (
            <>
              {/* the map */}
              <div className="relative">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl bg-[#0f1520]" role="img" aria-label={`Map: ${known.length} towns. ${waiting} problems waiting.`}>
                  {paths.map((d, i) => <path key={i} d={d} fill="#232a38" stroke="#0b0d12" strokeWidth="0.6" />)}
                  {/* rival territory labels */}
                  {Object.values(s.rivals).map((r) => {
                    const ps = r.towns.map((t) => pts[t]).filter(Boolean);
                    if (!ps.length) return null;
                    const x = ps.reduce((a, p) => a + p[0], 0) / ps.length;
                    const y = ps.reduce((a, p) => a + p[1], 0) / ps.length;
                    return <text key={r.id} x={x} y={y - 16} textAnchor="middle" fontSize="13" fontWeight="700" fill={r.color} opacity="0.9" style={{ pointerEvents: 'none' }}>{r.name}</text>;
                  })}
                  {/* the North keeps its name after it joins */}
                  {!s.rivals.north && (() => {
                    const ps = known.filter((id) => s.cities[id].bloc === 'north').map((id) => pts[id]);
                    if (!ps.length) return null;
                    const x = ps.reduce((a, p) => a + p[0], 0) / ps.length;
                    const y = ps.reduce((a, p) => a + p[1], 0) / ps.length;
                    return <text x={x} y={y - 16} textAnchor="middle" fontSize="13" fontWeight="700" fill="#3d8fd8" opacity="0.8" style={{ pointerEvents: 'none' }}>Tobias’s North</text>;
                  })()}
                  {known.map((id) => {
                    const c = s.cities[id];
                    const [x, y] = pts[id];
                    const ours = isOurs(s, id) && c.followers > 0;
                    const conv = c.followers / city(id).pop;
                    const r = 4 + Math.min(10, Math.sqrt(city(id).pop) / 120);
                    const rival = c.rival ? s.rivals[c.rival] : undefined;
                    const fill = rival ? rival.color : ours ? `rgba(232,207,138,${0.45 + Math.min(0.55, conv * 6)})` : c.followers > 0 ? 'rgba(232,207,138,0.25)' : '#3a4256';
                    const here = atTown.get(id) ?? [];
                    const pinsHere = pinMap.get(id) ?? [];
                    return (
                      <g key={id} onClick={() => tapTown(id)} style={{ cursor: 'pointer' }} role="button" aria-label={`${city(id).name}${pinsHere.length ? `, ${pinsHere.length} problem${pinsHere.length > 1 ? 's' : ''}` : ''}`}>
                        <circle cx={x} cy={y} r={r + 10} fill="transparent" />
                        {c.variant && c.followers > 0 && <circle cx={x} cy={y} r={r + 3.5} fill="none" stroke={variantColor(c.variant)} strokeWidth="2.5" opacity="0.9" />}
                        <circle cx={x} cy={y} r={r} fill={fill} stroke={id === s.hometown ? '#f4eedf' : selected ? '#5ec8a0' : 'none'} strokeWidth={id === s.hometown ? 2.5 : 1.5} strokeDasharray={selected && id !== s.hometown ? '3 2' : undefined} />
                        {labelled.has(id) && (
                          <text x={x + r + 5} y={y + 4} fontSize="12" fill={rival ? rival.color : '#d0d5df'} style={{ pointerEvents: 'none' }}>
                            {city(id).name}
                          </text>
                        )}
                        {here.length > 0 && (
                          <text x={x} y={y - r - 5} textAnchor="middle" fontSize="15" style={{ pointerEvents: 'none' }}>{here.slice(0, 4).map((u) => u.emoji).join('')}{here.length > 4 ? '…' : ''}</text>
                        )}
                        {pinsHere.length > 0 && (
                          <g style={{ pointerEvents: 'none' }}>
                            <circle cx={x - r - 6} cy={y - r - 4} r="9" fill="#e05a4f" stroke="#0f1520" strokeWidth="2" />
                            <text x={x - r - 6} y={y - r} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">{pinsHere.length}</text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
                {selected && (
                  <div className="pointer-events-none absolute inset-x-0 top-2 text-center">
                    <span className="rounded-full bg-emerald-900/90 px-3 py-1 text-xs text-emerald-100">Tap a town to send {roster.find((u) => u.id === selected)?.label}</span>
                  </div>
                )}
              </div>

              {/* legend: how the belief is done where */}
              {belief && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-300">
                  <span className="text-ink-400">{belief.phrase}:</span>
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full border border-ink-400" />as you started it</span>
                  {[...variantTerritory(s).entries()].slice(0, 6).map(([v, towns]) => (
                    <span key={v}><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: variantColor(v) }} />{v} ({towns.length})</span>
                  ))}
                </div>
              )}

              {toast && <p className="mt-2 text-center text-xs text-emerald-300" role="status">{toast}</p>}

              {/* your people */}
              <section className="mt-3">
                <div className="label">Your people this week</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {roster.map((u) => {
                    const at = whereIs(s, u.id);
                    const c = u.charId ? s.chars[u.charId] : undefined;
                    return (
                      <button
                        key={u.id}
                        className={`rounded-xl border px-3 py-2 text-left text-sm transition ${selected === u.id ? 'border-emerald-400 bg-emerald-400/10' : 'border-ink-600 bg-ink-850 hover:border-ink-400'}`}
                        onClick={() => {
                          setSelected(selected === u.id ? null : u.id);
                          setToast('');
                        }}
                        aria-pressed={selected === u.id}
                      >
                        <span className="mr-1" aria-hidden>{u.emoji}</span>
                        <span className="font-semibold">{u.label}</span>
                        <span className="block text-[11px] text-ink-400">
                          {at === s.hometown ? 'at home' : `in ${city(at).name}`}
                          {c && c.loyalty <= -40 ? ' · unhappy' : c && c.loyalty >= 50 ? ' · devoted' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-ink-400">
                  Pick someone, then tap a town. Wherever they go, the movement grows in their image{belief ? `: ${belief.phrase} ${[...new Set(roster.filter((u) => u.charId).map((u) => CHAR_BY_ID.get(u.charId!)!.flavour))].filter((f) => !f.toLowerCase().includes(belief.noun?.toLowerCase() ?? '\u0000')).slice(0, 2).join(', or ')}` : ''}. Towns you leave alone are open to rivals.
                </p>
              </section>

              {/* problems */}
              {waiting > 0 && (
                <section className="mt-4">
                  <div className="label">Waiting for you</div>
                  <ul className="mt-1 space-y-1">
                    {s.inbox.map((i) => {
                      const d = i.speaker !== 'anon' ? CHAR_BY_ID.get(i.speaker) : undefined;
                      const old = (i.week ?? s.week) < s.week;
                      return (
                        <li key={i.uid}>
                          <button className="flex w-full items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-left text-sm hover:border-brass-400" onClick={() => openCard(i)}>
                            <span aria-hidden>{d?.emoji ?? '🙋'}</span>
                            <span className="min-w-0 flex-1 truncate">{d ? d.short : i.anon?.name ?? 'Someone'} in {city(i.city ?? s.hometown).name}</span>
                            {old && <span className="text-[10px] uppercase text-red-300">waiting since last week</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <button className="btn-primary mt-4 w-full py-3 text-base" onClick={doEndWeek} disabled={urgent.length > 0}>
                {urgent.length ? 'Deal with the urgent matter first' : `End the week →`}
              </button>
              {waiting > 0 && !urgent.length && <p className="mt-1 text-center text-[11px] text-ink-400">Problems left for more than a week get worse, and people remember who kept them waiting.</p>}
            </>
          )}
        </div>
      </main>

      <nav className="grid grid-cols-4 border-t border-ink-800 bg-ink-900" aria-label="Movement">
        {([['people', 'People', '👥'], ['customs', 'Customs', '📜'], ['history', 'History', '📖'], ['menu', 'Menu', '⋯']] as const).map(([id, label, icon]) => (
          <button key={id} className="flex min-h-[52px] flex-col items-center justify-center text-[11px] text-ink-200 hover:text-brass-300" onClick={() => setSheet(id)}>
            <span className="text-lg" aria-hidden>{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {/* a town */}
      {town != null && !open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && setTown(null)}>
          <div className="fadeup w-full rounded-t-2xl border border-ink-700 bg-ink-900 p-5 sm:max-w-md sm:rounded-2xl" role="dialog" aria-modal="true" aria-label={city(town).name}>
            {(() => {
              const c = s.cities[town];
              const rival = c.rival ? s.rivals[c.rival] : undefined;
              const here = atTown.get(town) ?? [];
              return (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-serif text-2xl font-bold">{city(town).name}{town === s.hometown ? ' (home)' : ''}</h2>
                      <div className="text-xs text-ink-400">{countryName(city(town).cc)} · population {fmt(city(town).pop)}</div>
                    </div>
                    <button className="btn-ghost btn-sm" onClick={() => setTown(null)} aria-label="Close">✕</button>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm">
                    <li>{c.followers ? `${fmt(c.followers)} members` : 'Nobody here has joined yet.'}</li>
                    {rival && <li style={{ color: rival.color }}>Held by {rival.name}.{(c.contest ?? 0) > 0 ? ` Your people have contested it for ${c.contest} week${c.contest === 1 ? '' : 's'}.` : ' Send people here to win it over.'}</li>}
                    {belief && c.followers > 0 && <li className="text-ink-300">Here they do {belief.phrase} {c.variant ?? 'the way you started it'}.</li>}
                    <li className="text-ink-300">{here.length ? `This week: ${here.map((u) => `${u.emoji} ${u.label}`).join(', ')}` : 'None of your people are here.'}</li>
                  </ul>
                  {(pinMap.get(town) ?? []).map((i) => (
                    <button key={i.uid} className="btn-primary mt-3 w-full" onClick={() => openCard(i)}>
                      {i.speaker !== 'anon' ? charName(s, i.speaker) : i.anon?.name ?? 'Someone'} needs you here
                    </button>
                  ))}
                  <p className="mt-3 text-xs text-ink-400">To send someone here, close this, pick them under the map, then tap {city(town).name}.</p>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* a problem */}
      {(inst && card) || outcome ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center">
          <div className="fadeup max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-ink-700 bg-ink-950 p-5 scroll-thin sm:max-w-lg sm:rounded-2xl" role="dialog" aria-modal="true" aria-label={speakerName}>
            {outcome ? (
              <>
                <div className="flex items-center gap-3">
                  <Portrait spec={portrait} size={64} label={speakerName} />
                  <div className="text-xs uppercase tracking-widest text-ink-400">{city(outcome.city).name} · the movement responds</div>
                </div>
                <p className="mt-3 font-serif text-lg leading-snug">{outcome.reaction}</p>
                <ul className="mt-3 space-y-1 text-sm">
                  {outcome.loyalty.map((l) => (
                    <li key={l.id} className={l.delta > 0 ? 'text-emerald-300' : 'text-red-300'}>
                      {l.delta > 0 ? '▲' : '▼'} {charName(s, l.id)} {l.delta >= 8 ? 'is delighted' : l.delta > 0 ? 'approves' : l.delta <= -8 ? 'will remember this' : 'is not pleased'}
                    </li>
                  ))}
                  {outcome.notes.map((n) => <li key={n} className="text-brass-300">◆ {n}</li>)}
                </ul>
                <Gauges s={s} delta={outcome.gaugeDelta} />
                <button className="btn-primary mt-4 w-full py-3" autoFocus onClick={() => setOutcome(null)}>Back to the map</button>
              </>
            ) : inst && card ? (
              <>
                <div className="flex items-end gap-4">
                  <div className="shrink-0 overflow-hidden rounded-2xl border-4 border-parchment-200 bg-parchment-100">
                    <Portrait spec={portrait} size={112} label={speakerName} />
                  </div>
                  <div className="min-w-0 pb-1">
                    <div className="font-serif text-xl font-bold">{speakerName}</div>
                    <div className="text-xs uppercase tracking-widest text-ink-400">{def ? s.chars[def.id].role : render(s, inst.anon?.role ?? '', inst.ctx)} · {city(inst.city ?? s.hometown).name}</div>
                  </div>
                </div>
                <blockquote className="mt-4 font-serif text-lg leading-snug">“{render(s, cardText(card, inst), inst.ctx, inst.speaker)}”</blockquote>
                <div className="mt-4 grid gap-3">
                  {card.choices.map((ch, i) => (
                    <div key={i}>
                      <button
                        className={`w-full rounded-xl border px-4 py-3 text-left transition ${hover === i ? 'border-brass-400 bg-brass-400/10' : 'border-ink-600 bg-ink-850 hover:border-ink-400'}`}
                        onMouseEnter={() => setHover(i as 0 | 1)}
                        onMouseLeave={() => setHover(null)}
                        onClick={() => decide(i as 0 | 1)}
                      >
                        <div className="font-serif text-base font-semibold">{render(s, ch.label, inst.ctx, inst.speaker)}</div>
                        {ch.hint && <div className="mt-1 text-xs text-ink-400">{render(s, ch.hint, inst.ctx, inst.speaker)}</div>}
                      </button>
                      {inputFor === i && ch.input && (
                        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); decide(i as 0 | 1); }}>
                          <label className="sr-only" htmlFor="choice-input">Your words</label>
                          <input id="choice-input" className="input" autoFocus maxLength={60} value={inputText} placeholder={ch.input.placeholder} onChange={(e) => setInputText(e.target.value)} />
                          <button className="btn-primary" type="submit">Decide</button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
                {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
                <button className="btn-ghost mt-3 w-full text-sm" onClick={() => setOpen(null)}>Not now (back to the map)</button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* the week that was */}
      {report && s.lastWeek && !s.ended && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="doc max-h-[88vh] w-full max-w-md overflow-y-auto p-5" role="dialog" aria-modal="true" aria-label={`Week ${s.lastWeek.week}`}>
            <h2 className="font-serif text-2xl font-bold">Week {s.lastWeek.week}</h2>
            <p className="mt-1 text-sm text-ink-600">
              {fmt(s.lastWeek.joined)} joined{s.lastWeek.lost ? `, ${fmt(s.lastWeek.lost)} drifted away` : ''}. {s.inbox.length ? `${s.inbox.length} ${s.inbox.length === 1 ? 'person needs' : 'people need'} you this week.` : ''}
            </p>
            <ul className="mt-3 space-y-2 font-serif">
              {s.lastWeek.lines.map((l, i) => (
                <li key={i} className="flex gap-2"><span aria-hidden>{l.icon}</span><span>{l.text}</span></li>
              ))}
              {!s.lastWeek.lines.length && <li>A quiet week. Everyone stayed home and nobody minded.</li>}
            </ul>
            <button className="btn mt-4 w-full bg-ink-900 text-white" onClick={() => setReport(false)} autoFocus>To the map</button>
          </div>
        </div>
      )}

      {sheet && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && setSheet(null)}>
          <div className="fadeup max-h-[88vh] w-full overflow-y-auto rounded-t-2xl border border-ink-700 bg-ink-900 p-5 scroll-thin sm:max-w-2xl sm:rounded-2xl" role="dialog" aria-modal="true" aria-label={sheet}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold">{{ people: 'People', customs: 'Customs & Beliefs', history: 'History', menu: 'Menu' }[sheet]}</h2>
              <button className="btn-ghost btn-sm" onClick={() => setSheet(null)} aria-label="Close">✕</button>
            </div>
            {sheet === 'people' && <PeopleSheet s={s} />}
            {sheet === 'customs' && <CustomsSheet s={s} />}
            {sheet === 'history' && <HistorySheet s={s} />}
            {sheet === 'menu' && (
              <div className="flex flex-col gap-2">
                <button className="btn-ghost" onClick={() => setSheet(null)}>Resume</button>
                <button className="btn-ghost" onClick={() => setConfirmNew(true)}>Abandon and start again</button>
                <button className="btn-ghost" onClick={() => { save(); onExit(); }}>Main menu (progress is saved)</button>
                <p className="mt-2 text-xs text-ink-400">Each turn is a week. Send your people out, deal with what turns up, then end the week. Nothing happens while you are away.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card max-w-sm p-5" role="dialog" aria-modal="true" aria-label="Confirm">
            <p className="font-serif">Abandon {s.movementName ?? 'the group'} and everyone in it? This cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setConfirmNew(false)}>Keep going</button>
              <button className="btn-danger" onClick={() => { setConfirmNew(false); setSheet(null); onAbandon(); }}>Abandon</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
