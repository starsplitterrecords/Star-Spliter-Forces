'use client';
import { useEffect, useRef, useState } from 'react';
import { PHASES, REACTION_STAGES } from '@/engine/config';
import { activeCampaigns, availableZealots, campaignSlots } from '@/engine/core';
import { CITY_BY_ID, WORLD_POPULATION } from '@/engine/geo';
import { advanceSimulation, applyOfflineProgress } from '@/engine/sim';
import { fmt, pct } from '@/engine/text';
import type { GameEvent, GameState } from '@/engine/types';
import { getMods } from '@/engine/upgrades';
import { enhanceEvent } from '@/lib/ai';
import { play } from '@/lib/audio';
import { type PanelId, useStore } from '@/store/game';
import CityPanel from './CityPanel';
import CommandPalette from './CommandPalette';
import { Emblem } from './Emblem';
import EventModal from './EventModal';
import { HQVisual } from './HQVisual';
import MapView from './MapView';
import OfflineReportModal from './OfflineReport';
import Panels from './panels/Panels';
import StartingCities from './StartingCities';
import Tutorial from './Tutorial';
import { AnimatedNumber, Progress, StatBlock } from './ui';

const NAV: { id: PanelId; label: string; icon: string; key?: string }[] = [
  { id: 'campaigns', label: 'Campaigns', icon: '⚑', key: 'c' },
  { id: 'outposts', label: 'Outposts', icon: '■', key: 'o' },
  { id: 'upgrades', label: 'Upgrades', icon: '⬆', key: 'u' },
  { id: 'doctrine', label: 'Doctrine', icon: '✎', key: 'd' },
  { id: 'news', label: 'News', icon: '☰', key: 'n' },
  { id: 'factions', label: 'Factions', icon: '⚔', key: 'f' },
  { id: 'stats', label: 'Statistics', icon: '▦', key: 's' },
  { id: 'charts', label: 'Charts', icon: '📈', key: 'g' },
  { id: 'achievements', label: 'Achievements', icon: '★', key: 'a' },
  { id: 'chronicle', label: 'Chronicle', icon: '📜', key: 'h' },
  { id: 'saves', label: 'Save / Load', icon: '💾' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
  { id: 'help', label: 'Help', icon: '?' },
];

function eventNum(id: string) {
  return Number(id.slice(1)) || 0;
}

const SOUND_FOR: Record<string, Parameters<typeof play>[0]> = {
  'city-85': 'milestone',
  'city-100': 'milestone',
  'splinter-formed': 'schism',
  outpost: 'outpost',
  'outpost-produce': 'zealot',
  upgrade: 'upgrade',
  victory: 'victory',
  achievement: 'zealot',
};

export default function GameScreen() {
  const game = useStore((s) => s.game)!;
  const version = useStore((s) => s.version);
  const { panel, togglePanel, setPanel, selectedCity, eventModal, openEvent, paused, setPaused, setPalette, palette, toasts, dismissToast, bump, save, setScreen, setGame, announce, setAnnounce } = useStore();
  const lastSeen = useRef(0);
  const [mobileMore, setMobileMore] = useState(false);
  const [offline, setOffline] = useState(!!game.offlineReport);

  // initialize seen-events marker
  useEffect(() => {
    lastSeen.current = Math.max(0, ...game.events.map((e) => eventNum(e.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id]);

  // the game loop: fixed-step simulation decoupled from rendering
  useEffect(() => {
    let last = performance.now();
    let acc = 0;
    let sinceSave = 0;
    const tick = () => {
      const st = useStore.getState();
      const g = st.game;
      if (!g) return;
      const now = performance.now();
      const real = Math.min(5, (now - last) / 1000);
      last = now;
      if (!st.paused) {
        const speed = g.settings.speed;
        acc += real * speed;
        const stepSize = speed > 5 ? speed / 5 : 1;
        const whole = Math.floor(acc / stepSize) * stepSize;
        if (whole > 0) {
          advanceSimulation(g, whole, { stepSize });
          acc -= whole;
        }
      }
      g.lastRealTime = Date.now();
      handleNewEvents(g);
      st.bump();
      sinceSave += real;
      if (sinceSave >= g.settings.autosaveSeconds) {
        sinceSave = 0;
        void st.save();
      }
    };
    const id = setInterval(tick, 250);
    const onVis = () => {
      const g = useStore.getState().game;
      if (!g) return;
      if (document.visibilityState === 'hidden') void useStore.getState().save();
      else {
        const r = applyOfflineProgress(g, Date.now());
        if (r) setOffline(true);
        last = performance.now();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    const onUnload = () => void useStore.getState().save();
    window.addEventListener('beforeunload', onUnload);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', onUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleNewEvents(g: GameState) {
    const fresh: GameEvent[] = [];
    for (let i = g.events.length - 1; i >= 0; i--) {
      const e = g.events[i];
      if (eventNum(e.id) <= lastSeen.current) break;
      fresh.unshift(e);
    }
    if (!fresh.length) return;
    lastSeen.current = eventNum(fresh[fresh.length - 1].id);
    const st = useStore.getState();
    const notif = g.settings.notifications;
    for (const e of fresh) {
      const snd = SOUND_FOR[e.defId] ?? (e.choices ? 'news' : undefined);
      if (snd && (notif !== 'minimal' || e.choices)) play(snd);
      if (e.choices && !st.eventModal && notif !== 'minimal' && !e.offline) st.openEvent(e.id);
      else if (e.important && notif !== 'minimal') st.toast({ text: e.headline, kind: e.choices ? 'event' : 'good', eventId: e.id });
      else if (notif === 'all' && (e.defId === 'achievement' || e.defId === 'city-85')) st.toast({ text: e.headline, kind: 'good', eventId: e.id });
      if (e.important) st.setAnnounce(e.headline);
      if (g.settings.aiNarrative && e.important && !e.aiEnhanced) void enhanceEvent(g, e).then((ok) => ok && st.bump());
    }
  }

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette(true);
        return;
      }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === ' ') {
        e.preventDefault();
        setPaused(!useStore.getState().paused);
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        setPalette(true);
        return;
      }
      const n = NAV.find((x) => x.key === e.key.toLowerCase());
      if (n) togglePanel(n.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPalette, setPaused, togglePanel]);

  // victory modal once
  useEffect(() => {
    if (game.victory.achieved && !game.flags.victorySeen) {
      game.flags.victorySeen = game.time;
      setPanel('victory');
      play('victory');
    }
  }, [version, game, setPanel]);

  const mv = game.movement;
  const t = game.totals;
  const slots = campaignSlots(game);
  const active = activeCampaigns(game);
  const avail = availableZealots(game);
  const mods = getMods(game);
  const showStart = (game.counters.campaignsLaunched ?? 0) === 0;
  const pending = game.pendingDecisions.length;
  const headlines = game.events.filter((e) => e.defId !== 'achievement' && e.defId !== 'outpost-produce').slice(-14).reverse();
  const hqLevel = Math.min(6, mods.hqLevel + Math.floor(game.phase / 2));
  const speedOpts = game.settings.debug ? [1, 2, 5, 20, 100] : [1, 2, 5];

  const quit = async () => {
    await save();
    setGame(null);
    setScreen('menu');
  };

  return (
    <div className="flex h-full flex-col" style={{ ['--mv-primary' as string]: mv.banner.primary, ['--mv-secondary' as string]: mv.banner.secondary }}>
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b border-ink-700 bg-ink-900 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 lg:hidden">
          <Emblem banner={mv.banner} animal={mv.spiritAnimal} size={30} />
          <span className="hidden truncate font-serif font-bold sm:inline">{mv.ideologyName}</span>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-x-4 gap-y-1 sm:grid-cols-6">
          <StatBlock label="Followers" title={Math.round(t.followers).toLocaleString()}>
            <AnimatedNumber value={t.followers} />
          </StatBlock>
          <StatBlock label="World">{pct(t.followers / WORLD_POPULATION, 2)}</StatBlock>
          <StatBlock label="Zealots">
            {avail}
            <span className="text-sm text-ink-400">/{game.zealots.total}</span>
          </StatBlock>
          <div className="hidden sm:block">
            <StatBlock label="Countries">{t.countriesReached}</StatBlock>
          </div>
          <div className="hidden sm:block">
            <StatBlock label="Cities converted">{t.citiesControlled}</StatBlock>
          </div>
          <div className="hidden sm:block">
            <StatBlock label="Campaigns">
              {active.length}/{slots}
            </StatBlock>
          </div>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Game speed">
          <button className={`btn-sm btn ${paused ? 'bg-seal-600 text-white' : 'btn-ghost'}`} onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? 'Resume' : 'Pause'}>
            {paused ? '▶' : '❚❚'}
          </button>
          {speedOpts.map((s) => (
            <button
              key={s}
              className={`btn-sm btn hidden sm:inline-flex ${game.settings.speed === s && !paused ? 'bg-brass-400 text-ink-950' : 'btn-ghost'}`}
              aria-pressed={game.settings.speed === s}
              onClick={() => {
                game.settings.speed = s;
                setPaused(false);
                bump();
              }}
            >
              {s}×
            </button>
          ))}
          <button className="btn-ghost btn-sm hidden md:inline-flex" onClick={() => togglePanel('stats')}>
            STATS
          </button>
          <button className="btn-ghost btn-sm hidden md:inline-flex" onClick={() => setPalette(true)} aria-label="Command palette (Ctrl+K)">
            ⌘K
          </button>
          <button className="btn-ghost btn-sm" onClick={quit}>
            Menu
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left sidebar */}
        <nav className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-ink-700 bg-ink-900 p-3 scroll-thin lg:flex" aria-label="Movement">
          <div className="flex items-center gap-2">
            <Emblem banner={mv.banner} animal={mv.spiritAnimal} size={48} title={`${mv.ideologyName} emblem`} />
            <div className="min-w-0">
              <div className="truncate font-serif text-lg font-bold">{mv.ideologyName}</div>
              <div className="truncate text-xs text-ink-300">{mv.founderTitle}</div>
              <div className="truncate text-[11px] italic text-ink-400">{mv.motto}</div>
            </div>
          </div>
          <div className="mt-2 rounded bg-ink-850 p-1">
            <HQVisual type={mv.headquarters.type} banner={mv.banner} level={hqLevel} bureaucracy={game.bureaucracy} width={210} />
          </div>
          <div className="mt-3 space-y-1">
            {NAV.map((n) => (
              <button key={n.id} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${panel === n.id ? 'bg-ink-700 text-brass-300' : 'hover:bg-ink-800'}`} onClick={() => togglePanel(n.id)} aria-pressed={panel === n.id}>
                <span className="w-5 text-center" aria-hidden>
                  {n.icon}
                </span>
                <span className="flex-1">{n.label}</span>
                {n.id === 'news' && pending > 0 && <span className="rounded-full bg-seal-500 px-1.5 text-[10px] font-bold text-white">{pending}</span>}
                {n.key && <kbd className="text-[10px] text-ink-500">{n.key.toUpperCase()}</kbd>}
              </button>
            ))}
            {game.settings.debug && (
              <button className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-seal-500 hover:bg-ink-800" onClick={() => togglePanel('debug')}>
                <span className="w-5 text-center">⚠</span> Debug tools
              </button>
            )}
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-300">Influence</span>
              <span className="tabular font-semibold">{Math.floor(game.influence)}</span>
            </div>
            {game.fundsUnlocked && (
              <div className="flex justify-between">
                <span className="text-ink-300">Movement Funds</span>
                <span className="tabular font-semibold">{fmt(game.funds)}</span>
              </div>
            )}
            <Meter label="Cohesion" v={game.cohesion} />
            <Meter label="Enthusiasm" v={game.enthusiasm} />
            <Meter label="Doctrinal drift" v={game.drift} warn />
            <Meter label="Founder control" v={game.control} />
            {game.bureaucracy > 1 && <Meter label="Bureaucracy" v={game.bureaucracy} warn />}
          </div>
          <div className="mt-4 rounded border border-ink-700 p-2 text-xs">
            <div className="label">Phase {game.phase}</div>
            <div className="font-serif font-semibold">{PHASES[game.phase - 1].name}</div>
            <div className="label mt-2">World reaction</div>
            <div className="font-serif font-semibold">{REACTION_STAGES[game.reaction.stage].name}</div>
            <div className="text-ink-400">{REACTION_STAGES[game.reaction.stage].blurb}</div>
          </div>
          <Objectives game={game} />
        </nav>

        {/* Center map */}
        <main className="relative min-w-0 flex-1">
          <MapView game={game} version={version} />
          {selectedCity != null && <CityPanel cityId={selectedCity} />}
          <Panels />
          {showStart && <StartingCities />}
          <Tutorial />
          {/* toasts */}
          <div className="pointer-events-none absolute bottom-14 right-2 z-40 flex w-80 max-w-[calc(100%-1rem)] flex-col gap-2 sm:bottom-10">
            {toasts.map((tt) => (
              <div key={tt.id} className={`pointer-events-auto pop rounded-md border px-3 py-2 text-sm shadow-lg ${tt.kind === 'event' ? 'border-seal-500 bg-ink-900' : tt.kind === 'warn' ? 'border-seal-500/60 bg-ink-900' : 'border-brass-500/60 bg-ink-900'}`}>
                <div className="flex items-start gap-2">
                  <button
                    className="flex-1 text-left"
                    onClick={() => {
                      if (tt.eventId) openEvent(tt.eventId);
                      dismissToast(tt.id);
                    }}
                  >
                    {tt.text}
                  </button>
                  <button className="text-ink-400" aria-label="Dismiss" onClick={() => dismissToast(tt.id)}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Right panel */}
        <aside className="hidden w-80 shrink-0 flex-col border-l border-ink-700 bg-ink-900 xl:flex" aria-label="Campaigns and news">
          <div className="border-b border-ink-700 p-3">
            <div className="flex items-center justify-between">
              <h2 className="label">Active campaigns</h2>
              <span className="text-xs text-ink-400">
                {active.length}/{slots} slots
              </span>
            </div>
            <div className="mt-2 space-y-2">
              {active.length === 0 && <p className="text-xs text-ink-400">{avail > 0 ? `${avail} zealot${avail > 1 ? 's' : ''} await${avail === 1 ? 's' : ''} your instructions.` : 'No active campaigns. Select a discovered city on the map.'}</p>}
              {active.map((c) => {
                const city = CITY_BY_ID.get(c.cityId)!;
                const conv = (game.cities[c.cityId]?.followers ?? 0) / city.pop;
                return (
                  <button key={c.id} className="block w-full rounded border border-ink-700 p-2 text-left hover:border-ink-500" onClick={() => useStore.getState().selectCity(c.cityId)}>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold">{city.name}</span>
                      <span className="tabular">{(conv * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={conv} marker={0.85} label={`${city.name} conversion`} />
                    <div className="mt-1 text-[11px] text-ink-400">
                      {c.founder ? `${mv.founderTitle} + ` : ''}
                      {c.zealots} zealot{c.zealots === 1 ? '' : 's'}
                      {c.reached85At != null && <span className="ml-1 text-brass-300">· 85% reached — awaiting orders</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 scroll-thin">
            <div className="flex items-center justify-between">
              <h2 className="label">News</h2>
              {pending > 0 && <span className="rounded-full bg-seal-500 px-2 text-[10px] font-bold text-white">{pending} awaiting decision</span>}
            </div>
            <ul className="mt-2 space-y-2">
              {game.pendingDecisions.map((id) => {
                const e = game.events.find((x) => x.id === id);
                return e ? (
                  <li key={id}>
                    <button className="w-full rounded border border-seal-500/70 bg-seal-500/10 p-2 text-left text-sm" onClick={() => openEvent(id)}>
                      <span className="stamp mr-1 text-[9px]">Decide</span> {e.headline}
                    </button>
                  </li>
                ) : null;
              })}
              {headlines.map((e) => (
                <li key={e.id}>
                  <button className="w-full rounded p-2 text-left hover:bg-ink-800" onClick={() => openEvent(e.id)}>
                    <div className="text-[10px] uppercase tracking-wider text-ink-500">{e.category}</div>
                    <div className="font-serif text-sm leading-snug">{e.headline}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* News ticker */}
      <div className="hidden h-8 items-center overflow-hidden border-t border-ink-700 bg-ink-900 text-sm sm:flex" aria-label="News ticker">
        <span className="z-10 flex h-full shrink-0 items-center bg-seal-600 px-3 text-xs font-bold uppercase tracking-widest text-white">Breaking</span>
        <div className="relative flex-1 overflow-hidden">
          <div className="ticker-track flex w-max gap-10 whitespace-nowrap px-4">
            {[...headlines, ...headlines].map((e, i) => (
              <button key={`${e.id}-${i}`} className="hover:text-brass-300" onClick={() => openEvent(e.id)} tabIndex={i >= headlines.length ? -1 : 0}>
                ◆ {e.headline}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="grid grid-cols-5 border-t border-ink-700 bg-ink-900 lg:hidden" aria-label="Primary">
        {(
          [
            ['map', 'Map', '🗺'],
            ['campaigns', 'Campaigns', '⚑'],
            ['news', 'News', '☰'],
            ['upgrades', 'Upgrades', '⬆'],
            ['more', 'More', '⋯'],
          ] as const
        ).map(([id, label, icon]) => (
          <button
            key={id}
            className={`flex min-h-[52px] flex-col items-center justify-center text-[11px] ${panel === id ? 'text-brass-300' : 'text-ink-200'}`}
            onClick={() => {
              if (id === 'map') {
                setPanel(null);
                useStore.getState().selectCity(null);
              } else if (id === 'more') setMobileMore(true);
              else togglePanel(id);
            }}
          >
            <span className="text-lg" aria-hidden>
              {icon}
            </span>
            {label}
            {id === 'news' && pending > 0 && <span className="sr-only">{pending} decisions pending</span>}
          </button>
        ))}
      </nav>
      {mobileMore && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setMobileMore(false)}>
          <div className="w-full rounded-t-xl bg-ink-900 p-3" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-3 gap-2">
              {NAV.map((n) => (
                <button
                  key={n.id}
                  className="btn-ghost flex-col py-3"
                  onClick={() => {
                    setPanel(n.id);
                    setMobileMore(false);
                  }}
                >
                  <span aria-hidden>{n.icon}</span>
                  <span className="text-xs">{n.label}</span>
                </button>
              ))}
              <button className="btn-ghost flex-col py-3" onClick={() => { setPalette(true); setMobileMore(false); }}>
                <span aria-hidden>⌘</span>
                <span className="text-xs">Commands</span>
              </button>
              {game.settings.debug && (
                <button className="btn-ghost flex-col py-3" onClick={() => { setPanel('debug'); setMobileMore(false); }}>
                  <span aria-hidden>⚠</span>
                  <span className="text-xs">Debug</span>
                </button>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div>Influence: {Math.floor(game.influence)}</div>
              <div>Cohesion: {Math.round(game.cohesion)}</div>
              <div>{PHASES[game.phase - 1].name}</div>
            </div>
          </div>
        </div>
      )}

      {eventModal && <EventModal eventId={eventModal} onClose={() => openEvent(null)} />}
      {palette && <CommandPalette onClose={() => setPalette(false)} />}
      {offline && game.offlineReport && (
        <OfflineReportModal
          report={game.offlineReport}
          onClose={() => {
            game.offlineReport = undefined;
            setOffline(false);
          }}
        />
      )}
    </div>
  );
}

function Meter({ label, v, warn }: { label: string; v: number; warn?: boolean }) {
  const color = warn ? (v > 60 ? '#c0392b' : v > 30 ? '#d8b55e' : '#5ec8a0') : v < 30 ? '#c0392b' : v < 55 ? '#d8b55e' : '#5ec8a0';
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-ink-300">{label}</span>
        <span className="tabular">{Math.round(v)}</span>
      </div>
      <Progress value={v} max={100} color={color} label={label} />
    </div>
  );
}

function Objectives({ game }: { game: GameState }) {
  const objs: string[] = [];
  const avail = availableZealots(game);
  if ((game.counters.campaignsLaunched ?? 0) === 0) objs.push('Launch your first campaign.');
  else if (game.totals.citiesEver85 === 0) objs.push('Bring your first city to 85%.');
  if (avail > 0 && activeCampaigns(game).length < campaignSlots(game)) objs.push(`Dispatch ${avail} idle zealot${avail > 1 ? 's' : ''}.`);
  if (game.influence >= 6 && game.upgrades.length === 0) objs.push('Unlock your first upgrade.');
  if (game.pendingDecisions.length) objs.push('Respond to pending decisions.');
  if (game.totals.citiesEver85 >= 2 && !game.upgrades.includes('i1')) objs.push('Unlock outposts (Infrastructure).');
  if (game.phase >= 4 && !game.victory.achieved) objs.push('Expand internationally.');
  if (!objs.length) objs.push('Spread. Organize. Clarify. Repeat.');
  return (
    <div className="mt-4">
      <div className="label">Current objectives</div>
      <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-ink-200">
        {objs.slice(0, 4).map((o) => (
          <li key={o}>{o}</li>
        ))}
      </ul>
    </div>
  );
}
