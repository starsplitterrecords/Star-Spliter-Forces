'use client';
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import worldTopo from 'world-atlas/countries-110m.json';
import '@/cards/deck';
import { character } from '@/cards/characters';
import { choose, convertedCities, newCardGame, nextLeader, worldShare } from '@/cards/engine';
import { type CardGame, type Delta, METERS, type MeterKey } from '@/cards/types';
import { CITY_BY_ID, COUNTRIES, city, countryName } from '@/engine/geo';
import { randomSeed } from '@/engine/rng';
import { fmt, pct } from '@/engine/text';
import { play } from '@/lib/audio';
import { clearCardGame, loadCardGame, saveCardGame } from '@/lib/cardStorage';
import { Emblem } from '../Emblem';
import { useReducedMotion } from '../ui';
import { Portrait } from './Portrait';

const METER_INFO: Record<MeterKey, { label: string; low: string; high: string }> = {
  reach: { label: 'Reach', low: 'Nobody listens', high: 'Gone mainstream' },
  fervor: { label: 'Fervor', low: 'Apathy', high: 'Zealots revolt' },
  coffers: { label: 'Coffers', low: 'Bankrupt', high: 'Incorporated' },
  standing: { label: 'Standing', low: 'Run out of town', high: 'Absorbed by the state' },
};

function MeterIcon({ k }: { k: MeterKey }) {
  switch (k) {
    case 'reach':
      return <path d="M8 26v-8l22-10v28L8 26zm-4-7h4v6H4zM32 14q6 6 0 12" />;
    case 'fervor':
      return <path d="M20 4c2 8 10 10 10 20a10 10 0 0 1-20 0c0-6 4-8 4-14 3 3 4 5 4 8 2-4 2-9 2-14z" />;
    case 'coffers':
      return <path d="M8 28h24v6H8zm2-8h20v6H10zm-2-8h24v6H8zm4-6h16v4H12z" />;
    default:
      return <path d="M4 34h32v3H4zm2-4h28v3H6zM8 14h4v15H8zm10 0h4v15h-4zm10 0h4v15h-4zM4 11 20 3l16 8z" />;
  }
}

function Meter({ k, value, preview, flash }: { k: MeterKey; value: number; preview?: number; flash?: number }) {
  const danger = value < 15 || value > 85;
  const id = `clip-${k}`;
  return (
    <div className="flex flex-col items-center gap-1" title={`${METER_INFO[k].label}: ${Math.round(value)} (too low: ${METER_INFO[k].low}; too high: ${METER_INFO[k].high})`}>
      <svg viewBox="0 0 40 40" className="h-9 w-9 sm:h-11 sm:w-11" role="img" aria-label={`${METER_INFO[k].label} ${Math.round(value)} out of 100`}>
        <defs>
          <clipPath id={id}>
            <MeterIcon k={k} />
          </clipPath>
        </defs>
        <g fill="#363e50">
          <MeterIcon k={k} />
        </g>
        <rect x="0" y={40 - (value / 100) * 40} width="40" height={(value / 100) * 40} clipPath={`url(#${id})`} fill={danger ? '#e05a4f' : '#f4eedf'} style={{ transition: 'all 0.5s' }} />
      </svg>
      <div className="flex h-3 items-center" aria-hidden>
        {preview ? <span className="rounded-full bg-brass-300" style={{ width: Math.abs(preview) >= 9 ? 10 : 6, height: Math.abs(preview) >= 9 ? 10 : 6 }} /> : null}
        {flash ? <span className={`text-[10px] font-bold ${flash > 0 ? 'text-emerald-300' : 'text-red-400'}`}>{flash > 0 ? '▲' : '▼'}</span> : null}
      </div>
      <span className="text-[10px] uppercase tracking-widest text-ink-400">{METER_INFO[k].label}</span>
    </div>
  );
}

// ------------------------------------------------------------ world map sheet

type Feat = { id: string; properties: { name: string } };
const topo = worldTopo as unknown as Topology;
const countriesGeo = (feature(topo, topo.objects.countries) as unknown as { features: Feat[] }).features;
const MAP_TO_CC: Record<string, string> = Object.fromEntries(COUNTRIES.filter((c) => c.mapId).map((c) => [c.mapId!, c.code]));

function WorldMap({ g }: { g: CardGame }) {
  const { paths, pts } = useMemo(() => {
    const proj = geoNaturalEarth1().fitExtent([[4, 4], [596, 316]], { type: 'Sphere' } as GeoPermissibleObjects);
    const path = geoPath(proj);
    const reached = new Set(g.countries);
    const paths = countriesGeo.map((f) => ({ id: String(f.id), d: path(f as unknown as GeoPermissibleObjects) ?? '', on: reached.has(MAP_TO_CC[String(f.id)]) }));
    const ids = convertedCities(g);
    const step = Math.max(1, Math.floor(ids.length / 1500));
    const pts = ids.filter((_, i) => i % step === 0).map((id) => proj([CITY_BY_ID.get(id)!.lon, CITY_BY_ID.get(id)!.lat]) ?? [0, 0]);
    const hq = proj([city(g.hqCityId).lon, city(g.hqCityId).lat]) ?? [0, 0];
    pts.push(hq);
    return { paths, pts };
  }, [g, g.cityCount, g.countries.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const hq = pts[pts.length - 1];
  return (
    <svg viewBox="0 0 600 320" className="w-full" role="img" aria-label={`World map: the movement is present in ${g.countries.length} countries and ${g.cityCount} cities.`}>
      <rect width="600" height="320" fill="#0f1520" rx="8" />
      {paths.map((p) => (
        <path key={p.id} d={p.d} fill={p.on ? g.movement.banner.primary : '#262c3a'} fillOpacity={p.on ? 0.75 : 1} stroke="#0b0d12" strokeWidth="0.5" />
      ))}
      {pts.slice(0, -1).map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="1.3" fill={g.movement.banner.secondary} />
      ))}
      <circle cx={hq[0]} cy={hq[1]} r="4" fill="#f4eedf" stroke="#0b0d12" />
    </svg>
  );
}

// ------------------------------------------------------------ main component

type Sheet = 'map' | 'chronicle' | 'doctrine' | 'menu' | null;

export default function CardsGame({ onExit }: { onExit: () => void }) {
  const [g, setG] = useState<CardGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [, setV] = useState(0);
  const bump = () => setV((v) => v + 1);
  const [drag, setDrag] = useState(0);
  const [hover, setHover] = useState<'left' | 'right' | null>(null);
  const [flying, setFlying] = useState<'left' | 'right' | null>(null);
  const [flash, setFlash] = useState<Delta>({});
  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const reduced = useReducedMotion();
  const start = useRef<{ x: number; id: number } | null>(null);

  useEffect(() => {
    void loadCardGame().then((saved) => {
      setG(saved);
      setLoading(false);
    });
  }, []);

  const commit = useCallback(
    (side: 'left' | 'right') => {
      if (!g || !g.current || flying) return;
      setFlying(side);
      play('click');
      const finish = () => {
        const r = choose(g, side);
        setFlying(null);
        setDrag(0);
        setHover(null);
        if (r) {
          setFlash(r.delta);
          setTimeout(() => setFlash({}), 1200);
          if (r.ended) play(r.ended.kind === 'victory' ? 'victory' : 'schism');
          else if (r.log) play('news');
        }
        void saveCardGame(g);
        bump();
      };
      if (reduced) finish();
      else setTimeout(finish, 260);
    },
    [g, flying, reduced],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheet || !g?.current || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') commit('left');
      if (e.key === 'ArrowRight') commit('right');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [g, sheet, commit]);

  if (loading) return <div className="flex h-full items-center justify-center font-serif text-ink-300">Shuffling the deck…</div>;

  // ---------------- new game
  if (!g) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-ink-950 p-6 text-center">
        <div className="label tracking-[0.35em]">The Movement · Card Edition</div>
        <h1 className="mt-3 max-w-md font-serif text-4xl font-black leading-tight">Every great movement starts with one person and a bad idea.</h1>
        <p className="mt-3 max-w-sm text-ink-300">Swipe left or right on each card. Your beliefs, your title, your followers&apos; customs and your fate are all decided one card at a time. Keep all four meters away from empty and full.</p>
        <form
          className="mt-6 flex w-full max-w-sm flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const ng = newCardGame(name || 'Jeff', randomSeed());
            void saveCardGame(ng);
            play('milestone');
            setG(ng);
          }}
        >
          <label htmlFor="founder" className="label text-left">
            What is your name?
          </label>
          <input id="founder" className="input text-lg" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="Jeff" autoFocus />
          <button className="btn-primary py-3 text-base" type="submit">
            Have an idea
          </button>
          <button className="btn-ghost" type="button" onClick={onExit}>
            Back
          </button>
        </form>
      </div>
    );
  }

  const mv = g.movement;
  const card = g.current;
  const who = card ? character(card.who) : null;
  const preview: Delta = hover ? (card?.[hover].delta ?? {}) : drag < -25 ? (card?.left.delta ?? {}) : drag > 25 ? (card?.right.delta ?? {}) : {};
  const leaning = hover ?? (drag < -25 ? 'left' : drag > 25 ? 'right' : null);
  const years = Math.floor(g.turn / 12) + 1;
  const tx = flying ? (flying === 'left' ? -600 : 600) : drag;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ink-950" style={{ ['--mv-primary' as string]: mv.banner.primary }}>
      {/* meters */}
      <header className="flex items-start justify-center gap-5 border-b border-ink-800 bg-ink-900 px-4 pb-2 pt-3 sm:gap-10">
        {METERS.map((k) => (
          <Meter key={k} k={k} value={g.meters[k]} preview={preview[k]} flash={flash[k]} />
        ))}
      </header>

      {/* card area */}
      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-3">
        {card && who && !g.over && (
          <>
            <p className="mb-4 min-h-[5.5rem] max-w-md text-center font-serif text-lg leading-snug sm:text-xl" aria-live="polite">
              {card.text}
            </p>
            <div
              className="relative w-[min(78vw,300px)] touch-none select-none"
              style={{ transform: `translateX(${tx}px) rotate(${tx / 18}deg)`, transition: start.current ? 'none' : 'transform 0.26s ease-out', opacity: flying ? 0 : 1 }}
              onPointerDown={(e) => {
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                start.current = { x: e.clientX, id: e.pointerId };
              }}
              onPointerMove={(e) => start.current && setDrag(e.clientX - start.current.x)}
              onPointerUp={() => {
                const d = drag;
                start.current = null;
                if (d < -90) commit('left');
                else if (d > 90) commit('right');
                else setDrag(0);
              }}
              onPointerCancel={() => {
                start.current = null;
                setDrag(0);
              }}
            >
              <div className="relative overflow-hidden rounded-2xl border-4 border-parchment-200 bg-parchment-100 shadow-2xl" style={{ aspectRatio: '3 / 4' }}>
                <div className="absolute inset-x-0 top-0 h-2" style={{ background: mv.banner.primary }} aria-hidden />
                <div className="flex h-full flex-col items-center justify-center pt-4">
                  <Portrait who={card.who} game={g} size={190} />
                </div>
                {leaning && (
                  <div className={`absolute inset-x-0 top-0 bg-ink-950/85 px-3 py-3 font-serif text-base font-bold text-parchment-50 ${leaning === 'left' ? 'text-left' : 'text-right'}`}>
                    {card[leaning].label}
                  </div>
                )}
              </div>
              <div className="mt-3 text-center">
                <div className="font-serif text-lg font-bold">{who.name(g)}</div>
                <div className="text-xs uppercase tracking-widest text-ink-400">{who.role}</div>
              </div>
            </div>
            <div className="mt-4 grid w-full max-w-md grid-cols-2 gap-3">
              {(['left', 'right'] as const).map((side) => (
                <button
                  key={side}
                  className={`rounded-lg border px-3 py-2.5 text-sm leading-snug transition ${leaning === side ? 'border-brass-400 bg-brass-400/15' : 'border-ink-600 bg-ink-850 hover:border-ink-400'} ${side === 'left' ? 'text-left' : 'text-right'}`}
                  onMouseEnter={() => setHover(side)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(side)}
                  onBlur={() => setHover(null)}
                  onClick={() => commit(side)}
                  aria-label={`${side === 'left' ? 'Swipe left' : 'Swipe right'}: ${card[side].label}`}
                >
                  {side === 'left' ? '◀ ' : ''}
                  {card[side].label}
                  {side === 'right' ? ' ▶' : ''}
                </button>
              ))}
            </div>
            <p className="mt-2 text-center text-[11px] text-ink-500">Drag the card, tap a choice, or use ← →. Dots show which meters will move, not which way.</p>
          </>
        )}

        {g.over && (
          <div className="fadeup w-full max-w-md rounded-2xl border-4 border-parchment-200 bg-parchment-50 p-6 text-center text-ink-950 shadow-2xl">
            <div className="text-xs uppercase tracking-[0.3em] text-ink-500">{g.over.kind === 'victory' ? 'World Domination' : `The end of ${g.leader.title}`}</div>
            <h2 className="mt-2 font-serif text-3xl font-black">{g.over.title}</h2>
            <div className="mt-3 space-y-3 text-left font-serif leading-relaxed">
              {g.over.text.split('\n\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {g.over.lostFollowers > 0 && <p className="mt-3 text-sm text-seal-600">{fmt(g.over.lostFollowers)} followers left with them.</p>}
            {g.over.kind === 'leader' ? (
              <>
                <p className="mt-4 text-sm text-ink-600">But {mv.ideologyName} lives on. {fmt(g.converted)} {mv.plural} await new leadership.</p>
                <button
                  className="btn mt-4 w-full bg-ink-900 py-3 text-base text-white hover:bg-ink-800"
                  onClick={() => {
                    nextLeader(g);
                    void saveCardGame(g);
                    play('milestone');
                    bump();
                  }}
                >
                  Appoint a successor
                </button>
              </>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                <button className="btn w-full bg-ink-900 py-3 text-white" onClick={() => { nextLeader(g); void saveCardGame(g); bump(); }}>
                  Keep ruling the world
                </button>
                <button className="btn w-full border border-ink-800 text-ink-900" onClick={() => setConfirmNew(true)}>
                  Found a new movement
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* footer */}
      <footer className="border-t border-ink-800 bg-ink-900 px-4 py-2">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Emblem banner={mv.banner} animal={mv.animal} size={34} title={`${mv.ideologyName} emblem`} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-serif font-bold">
              {g.leader.title} <span className="font-sans text-xs font-normal text-ink-400">· {mv.founded ? mv.ideologyName : 'an idea'} · year {years}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-300">
              <span className="tabular" title={g.converted.toLocaleString()}>
                {fmt(g.converted)} {g.converted === 1 ? mv.singular : mv.plural}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700" role="progressbar" aria-label="World converted" aria-valuenow={Math.round(worldShare(g) * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full" style={{ width: `${Math.max(0.5, worldShare(g) * 100)}%`, background: mv.banner.secondary }} />
              </div>
              <span className="tabular">{pct(worldShare(g), worldShare(g) < 0.01 ? 3 : 1)} of world</span>
            </div>
          </div>
        </div>
        <nav className="mx-auto mt-2 grid max-w-2xl grid-cols-4 gap-2" aria-label="Game">
          {(
            [
              ['map', 'Map'],
              ['doctrine', 'Beliefs'],
              ['chronicle', 'History'],
              ['menu', 'Menu'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} className="btn-ghost btn-sm" onClick={() => setSheet(id)}>
              {label}
            </button>
          ))}
        </nav>
      </footer>

      {/* sheets */}
      {sheet && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && setSheet(null)}>
          <div className="fadeup max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-ink-700 bg-ink-900 p-5 scroll-thin sm:max-w-2xl sm:rounded-2xl" role="dialog" aria-modal="true" aria-label={sheet}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold">{{ map: 'The Known World', doctrine: 'Beliefs of ' + (mv.founded ? mv.ideologyName : 'your idea'), chronicle: 'The Official History', menu: 'Menu' }[sheet]}</h2>
              <button className="btn-ghost btn-sm" onClick={() => setSheet(null)} aria-label="Close">
                ✕
              </button>
            </div>
            {sheet === 'map' && (
              <div>
                <WorldMap g={g} />
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <div className="label">Followers</div>
                    <div className="font-serif text-lg font-bold">{fmt(g.converted)}</div>
                  </div>
                  <div>
                    <div className="label">Cities</div>
                    <div className="font-serif text-lg font-bold">{g.cityCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="label">Countries</div>
                    <div className="font-serif text-lg font-bold">{g.countries.length}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-ink-300">
                  Headquarters: a {mv.hqType.toLowerCase()} in {city(g.hqCityId).name}, {countryName(city(g.hqCityId).cc)}. Higher Reach spreads the word faster; Fervor and Standing help it stick. Domination comes at 95% of the world.
                </p>
              </div>
            )}
            {sheet === 'doctrine' && (
              <div className="space-y-3">
                {!mv.doctrines.length && <p className="text-ink-300">You have not decided anything yet. Keep swiping.</p>}
                {mv.doctrines.map((d) => (
                  <div key={d.id} className="rounded-lg border border-ink-700 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-ink-400">{d.category}</div>
                    <div className="font-serif">“{d.originalText}”</div>
                    {d.currentText !== d.originalText && <div className="mt-1 font-serif text-brass-300">Now: “{d.currentText}”</div>}
                  </div>
                ))}
                <div className="text-sm text-ink-300">
                  Gatherings: {mv.meeting} · Branches: {mv.outpost} · Spirit animal: {mv.animal}
                </div>
                {g.factions.length > 0 && (
                  <div>
                    <div className="label mt-2">Breakaway factions</div>
                    <ul className="mt-1 space-y-1 text-sm">
                      {g.factions.map((f) => (
                        <li key={f.name}>
                          <strong>{f.name}</strong> {f.hostile ? '(hostile)' : '(friendly)'}: {f.stance}.
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {sheet === 'chronicle' && (
              <div>
                {g.leaders.length > 0 && (
                  <div className="mb-4">
                    <div className="label">Past leaders</div>
                    <ul className="mt-1 text-sm">
                      {g.leaders.map((l, i) => (
                        <li key={i}>
                          {l.title}, years {Math.floor(l.startTurn / 12) + 1}–{Math.floor((l.endTurn ?? 0) / 12) + 1}: <em>{l.endingTitle}</em>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <ol className="space-y-2 border-l-2 border-ink-700 pl-4">
                  {[...g.chronicle].reverse().map((c, i) => (
                    <li key={i} className="font-serif text-sm">
                      <span className="mr-2 text-xs text-ink-500">Year {Math.floor(c.turn / 12) + 1}</span>
                      {c.text}
                    </li>
                  ))}
                  {!g.chronicle.length && <li className="text-sm text-ink-400">History has not started yet.</li>}
                </ol>
                {g.news.length > 0 && (
                  <div className="mt-4">
                    <div className="label">Headlines</div>
                    <ul className="mt-1 space-y-1 text-sm text-ink-200">
                      {[...g.news].reverse().slice(0, 15).map((n, i) => (
                        <li key={i}>◆ {n.headline}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {sheet === 'menu' && (
              <div className="flex flex-col gap-2">
                <button className="btn-ghost" onClick={() => setSheet(null)}>
                  Resume
                </button>
                <button className="btn-ghost" onClick={() => setConfirmNew(true)}>
                  Abandon and found a new movement
                </button>
                <button className="btn-ghost" onClick={onExit}>
                  Main menu (progress is saved)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {confirmNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card max-w-sm p-5" role="dialog" aria-modal="true" aria-label="Confirm new movement">
            <p className="font-serif">Abandon {mv.founded ? mv.ideologyName : 'this idea'} forever? This cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setConfirmNew(false)}>
                Keep it
              </button>
              <button
                className="btn-danger"
                onClick={async () => {
                  await clearCardGame();
                  setConfirmNew(false);
                  setSheet(null);
                  setG(null);
                }}
              >
                Abandon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
