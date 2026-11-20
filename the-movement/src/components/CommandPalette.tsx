'use client';
import { useMemo, useState } from 'react';
import { CITIES, countryName } from '@/engine/geo';
import { type PanelId, useStore } from '@/store/game';

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const store = useStore();
  const game = store.game!;
  const panels: [PanelId, string, string][] = [
    ['stats', 'Statistics', 'stats'],
    ['charts', 'Charts', 'graphs history'],
    ['campaigns', 'Campaigns', 'dispatch zealots'],
    ['outposts', 'Outposts', game.movement.outpostName],
    ['upgrades', 'Upgrades', 'tech tree'],
    ['doctrine', 'Doctrine & Proclamations', 'proclaim'],
    ['news', 'News', 'events headlines'],
    ['factions', 'Factions & Rivals', 'splinters opposition'],
    ['achievements', 'Achievements', ''],
    ['chronicle', 'Chronicle', 'history timeline'],
    ['saves', 'Save / Load / Export', 'export import'],
    ['settings', 'Settings', 'accessibility sound'],
    ['help', 'Help', 'reference mechanics'],
  ];
  const cmds = useMemo<Cmd[]>(() => {
    const list: Cmd[] = panels.map(([id, label, hint]) => ({ id, label: `Open ${label}`, hint, run: () => store.setPanel(id) }));
    list.push({ id: 'pause', label: store.paused ? 'Resume' : 'Pause', run: () => store.setPaused(!store.paused) });
    list.push({ id: 'save', label: 'Save now', run: () => void store.save() });
    if (game.settings.debug) list.push({ id: 'debug', label: 'Open Debug tools', run: () => store.setPanel('debug') });
    const qq = q.trim().toLowerCase();
    if (qq.length >= 2) {
      for (const c of CITIES.filter((c) => c.name.toLowerCase().startsWith(qq)).slice(0, 6)) {
        list.push({
          id: `city-${c.id}`,
          label: `Go to ${c.name}, ${countryName(c.cc)}`,
          hint: game.cities[c.id]?.discovered ? 'discovered' : 'not yet reached',
          run: () => {
            (window as unknown as { __centerCity?: (id: number) => void }).__centerCity?.(c.id);
            if (game.cities[c.id]?.discovered) store.selectCity(c.id);
          },
        });
      }
    }
    return list.filter((c) => !qq || c.label.toLowerCase().includes(qq) || (c.hint ?? '').toLowerCase().includes(qq) || c.id.startsWith('city-'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, store.paused, game]);
  const run = (c?: Cmd) => {
    if (!c) return;
    c.run();
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[15vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-lg overflow-hidden" role="dialog" aria-label="Command palette">
        <input
          autoFocus
          className="w-full border-b border-ink-700 bg-ink-900 px-4 py-3 text-base outline-none"
          placeholder="Type a command… (try “stats”)"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') setSel((s) => Math.min(cmds.length - 1, s + 1));
            if (e.key === 'ArrowUp') setSel((s) => Math.max(0, s - 1));
            if (e.key === 'Enter') run(cmds[sel]);
          }}
          aria-label="Command"
        />
        <ul className="max-h-80 overflow-y-auto scroll-thin" role="listbox">
          {cmds.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === sel}>
              <button className={`flex w-full justify-between px-4 py-2 text-left text-sm ${i === sel ? 'bg-ink-700' : 'hover:bg-ink-800'}`} onMouseEnter={() => setSel(i)} onClick={() => run(c)}>
                <span>{c.label}</span>
                <span className="text-xs text-ink-500">{c.hint}</span>
              </button>
            </li>
          ))}
          {!cmds.length && <li className="px-4 py-3 text-sm text-ink-400">No matching commands.</li>}
        </ul>
      </div>
    </div>
  );
}
