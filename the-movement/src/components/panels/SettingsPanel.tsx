'use client';
import { useEffect, useState } from 'react';
import { MODES } from '@/engine/config';
import type { GameMode, Settings } from '@/engine/types';
import { setMusic, setSound } from '@/lib/audio';
import { saveGlobalSettings } from '@/lib/storage';
import { useStore } from '@/store/game';

export function SettingsForm() {
  const settings = useStore((s) => s.globalSettings);
  const setGlobal = useStore((s) => s.setGlobalSettings);
  const game = useStore((s) => s.game);
  const bump = useStore((s) => s.bump);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_STANDALONE) {
      setAiAvailable(false);
      return;
    }
    fetch('/api/narrate')
      .then((r) => r.json())
      .then((j) => setAiAvailable(!!j.enabled))
      .catch(() => setAiAvailable(false));
  }, []);
  const up = (p: Partial<Settings>) => {
    setGlobal(p);
    void saveGlobalSettings({ ...settings, ...p });
    if (p.sound != null) setSound(p.sound);
    if (p.music != null) setMusic(p.music);
    bump();
  };
  const row = (label: string, control: React.ReactNode, hint?: string) => (
    <div className="flex items-center justify-between gap-4 border-b border-ink-800 py-2">
      <div>
        <div className="text-sm">{label}</div>
        {hint && <div className="text-xs text-ink-400">{hint}</div>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
  const sel = <T extends string | number>(value: T, opts: [T, string][], on: (v: T) => void, label: string) => (
    <select aria-label={label} className="input w-auto py-1.5 text-sm" value={String(value)} onChange={(e) => on((typeof value === 'number' ? Number(e.target.value) : e.target.value) as T)}>
      {opts.map(([v, l]) => (
        <option key={String(v)} value={String(v)}>
          {l}
        </option>
      ))}
    </select>
  );
  const tog = (v: boolean, on: (b: boolean) => void, label: string) => (
    <button role="switch" aria-checked={v} aria-label={label} className={`h-6 w-11 rounded-full p-0.5 transition ${v ? 'bg-brass-400' : 'bg-ink-600'}`} onClick={() => on(!v)}>
      <span className={`block h-5 w-5 rounded-full bg-white transition ${v ? 'translate-x-5' : ''}`} />
    </button>
  );
  return (
    <div>
      <h3 className="label">Gameplay</h3>
      {row('Game speed', sel(game?.settings.speed ?? settings.speed, settings.debug ? [[1, '1×'], [2, '2×'], [5, '5×'], [20, '20× (debug)'], [100, '100× (debug)']] : [[1, '1×'], [2, '2×'], [5, '5×']], (v) => { up({ speed: v }); if (game) game.settings.speed = v; }, 'Game speed'))}
      {row('Event frequency', sel(settings.eventFrequency, [[0.5, 'Rare'], [1, 'Normal'], [1.5, 'Frequent'], [2, 'Relentless']], (v) => up({ eventFrequency: v }), 'Event frequency'))}
      {game &&
        row(
          'Difficulty',
          sel(game.movement.gameMode, (Object.keys(MODES) as GameMode[]).map((m) => [m, MODES[m].label]), (v) => { game.movement.gameMode = v; bump(); }, 'Difficulty'),
          MODES[game.movement.gameMode].description,
        )}
      {row('Notifications', sel(settings.notifications, [['all', 'All'], ['important', 'Important only'], ['minimal', 'Minimal']], (v) => up({ notifications: v }), 'Notifications'), 'Minimal never opens decisions automatically.')}
      {row('Autosave', sel(settings.autosaveSeconds, [[10, 'Every 10s'], [20, 'Every 20s'], [60, 'Every minute'], [300, 'Every 5 min']], (v) => up({ autosaveSeconds: v }), 'Autosave'), 'The game also saves after every important decision.')}
      {row('Offline progress cap', sel(settings.offlineCapHours, [[4, '4 hours'], [12, '12 hours'], [24, '24 hours'], [48, '48 hours']], (v) => up({ offlineCapHours: v }), 'Offline cap'))}
      {row(
        'AI narrative enhancement',
        tog(settings.aiNarrative, (b) => up({ aiNarrative: b }), 'AI narrative'),
        aiAvailable === false ? 'Server has no API key configured; procedural narrative is used (fully playable).' : 'Optional: rewrites headlines via the server. Never changes numbers.',
      )}
      <h3 className="label mt-4">Audio</h3>
      {row('Sound effects', tog(settings.sound, (b) => up({ sound: b }), 'Sound effects'))}
      {row('Ambient music', tog(settings.music, (b) => up({ music: b }), 'Music'), 'Never autoplays.')}
      <h3 className="label mt-4">Accessibility</h3>
      {row('Animation', sel(settings.animation, [['full', 'Full'], ['reduced', 'Reduced'], ['none', 'None']], (v) => up({ animation: v }), 'Animation'), 'Also respects your system reduced-motion setting.')}
      {row('Text size', sel(settings.textScale, [[0.9, 'Small'], [1, 'Normal'], [1.15, 'Large'], [1.3, 'Extra large']], (v) => up({ textScale: v }), 'Text size'))}
      {row('High contrast text', tog(settings.highContrast, (b) => up({ highContrast: b }), 'High contrast'))}
      <h3 className="label mt-4">Developer</h3>
      {row('Debug mode', tog(settings.debug, (b) => up({ debug: b }), 'Debug mode'), 'Shows developer tools and faster speeds.')}
    </div>
  );
}

export default function SettingsPanel() {
  return <SettingsForm />;
}
