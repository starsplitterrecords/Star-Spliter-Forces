'use client';
import { useEffect, useRef, useState } from 'react';
import { PHASES } from '@/engine/config';
import { loadGame } from '@/engine/save';
import { applyOfflineProgress } from '@/engine/sim';
import { fmt } from '@/engine/text';
import type { LegacyRecord } from '@/engine/types';
import { play } from '@/lib/audio';
import { SLOT_COUNT, type SlotMeta, deleteSlot, lastSlot, listSlots, loadLegacy, loadSlot, saveSlot } from '@/lib/storage';
import { useStore } from '@/store/game';
import { loadSavedStory } from '@/lib/storyStorage';
import { SettingsForm } from './panels/SettingsPanel';
import { Modal } from './ui';

export default function MainMenu({ onNew }: { onNew: (slot: number) => void }) {
  const [slots, setSlots] = useState<(SlotMeta | null)[]>([]);
  const [last, setLast] = useState<number | null>(null);
  const [legacy, setLegacy] = useState<LegacyRecord[]>([]);
  const [modal, setModal] = useState<'new' | 'load' | 'settings' | 'legacy' | null>(null);
  const [confirm, setConfirm] = useState<{ slot: number; action: 'overwrite' | 'delete' } | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { setGame, setScreen } = useStore();

  const [hasCards, setHasCards] = useState(false);
  useEffect(() => {
    void loadSavedStory().then((g) => setHasCards(!!g));
  }, []);
  const refresh = async () => {
    setSlots(await listSlots());
    setLast(await lastSlot());
    setLegacy(await loadLegacy());
  };
  useEffect(() => {
    void refresh();
  }, []);

  const open = async (slot: number) => {
    setBusy(true);
    try {
      const r = await loadSlot(slot);
      if (!r) return setMsg('That slot is empty.');
      // offline catch-up, chunked so the page stays responsive
      await new Promise((res) => setTimeout(res, 30));
      applyOfflineProgress(r.state, Date.now());
      if (r.recovered) setMsg('The latest save was damaged; the previous autosave was restored.');
      setGame(r.state);
      setScreen('game');
      play('click');
    } catch (e) {
      setMsg(`Could not load: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const importFile = async (f: File) => {
    try {
      const { state } = loadGame(await f.text());
      const free = slots.findIndex((s) => !s);
      state.slot = free >= 0 ? free : 0;
      state.lastRealTime = Date.now();
      await saveSlot(state);
      await refresh();
      setMsg(`Imported “${state.movement.ideologyName}” into slot ${state.slot + 1}.`);
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`);
    }
  };

  const SlotCard = ({ m, i, mode }: { m: SlotMeta | null; i: number; mode: 'new' | 'load' }) => (
    <div className="flex items-center justify-between gap-3 rounded-md border border-ink-600 bg-ink-850 p-3">
      <div className="min-w-0">
        <div className="label">Slot {i + 1}</div>
        {m ? (
          <>
            <div className="flex items-center gap-2 font-serif text-lg font-bold">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: m.primary }} aria-hidden />
              {m.ideologyName} {m.victory && <span className="stamp text-[10px]">Victorious</span>}
            </div>
            <div className="text-sm text-ink-300">
              {m.founderTitle} · {fmt(m.followers)} followers · {PHASES[m.phase - 1]?.name}
            </div>
            <div className="text-xs text-ink-500">Saved {new Date(m.savedAt).toLocaleString()}</div>
          </>
        ) : (
          <div className="text-ink-400">Empty</div>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        {mode === 'load' && m && (
          <>
            <button className="btn-primary btn-sm" disabled={busy} onClick={() => open(i)}>
              Load
            </button>
            <button className="btn-ghost btn-sm" onClick={() => setConfirm({ slot: i, action: 'delete' })} aria-label={`Delete slot ${i + 1}`}>
              Delete
            </button>
          </>
        )}
        {mode === 'new' && (
          <button className="btn-primary btn-sm" onClick={() => (m ? setConfirm({ slot: i, action: 'overwrite' }) : onNew(i))}>
            {m ? 'Overwrite' : 'Begin'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-y-auto bg-ink-950 p-6" style={{ backgroundImage: 'radial-gradient(ellipse at top, rgba(107,63,160,0.25), transparent 60%)' }}>
      <div className="w-full max-w-md text-center">
        <div className="label tracking-[0.4em]">A Completely Reasonable Path to World Domination</div>
        <h1 className="mt-3 font-serif text-5xl font-black tracking-tight sm:text-6xl">THE MOVEMENT</h1>
        <p className="mt-3 font-serif italic text-ink-300">Plant a seed. Watch it grow. Spread it. Eventually the world will recognize your obvious brilliance. Muahahaha.</p>
        <div className="mt-8 flex flex-col gap-3">
          <button className="btn-primary py-4 text-lg" onClick={() => setScreen('story')}>
            {hasCards ? 'Continue the Movement' : 'Begin the Movement'}
          </button>
          <p className="-mt-1 text-xs text-ink-400">Lead an increasingly large, increasingly absurd group of people. They will tell you what the movement is.</p>
          <div className="label mt-4">Classic Strategy Edition</div>
          {last != null && slots[last] && (
            <button className="btn-ghost py-3 text-base" disabled={busy} onClick={() => open(last)}>
              {busy ? 'Calculating what happened while you were away…' : `Continue: ${slots[last]!.ideologyName}`}
            </button>
          )}
          <button className="btn-ghost py-3 text-base" onClick={() => setModal('new')}>
            New Movement
          </button>
          <button className="btn-ghost py-3 text-base" onClick={() => setModal('load')} disabled={!slots.some(Boolean)}>
            Load Movement
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
              Import
            </button>
            <button className="btn-ghost" onClick={() => setModal('settings')}>
              Settings
            </button>
            <button className="btn-ghost" onClick={() => setModal('legacy')} disabled={!legacy.length}>
              Legacy
            </button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import save file" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
        </div>
        {msg && (
          <p role="status" className="mt-4 text-sm text-brass-300">
            {msg}
          </p>
        )}
        <p className="mt-10 text-xs text-ink-500">
          A work of satirical fiction set in an alternate world. Real geography; entirely imaginary social reactions. No account required — progress is saved in this browser.
        </p>
      </div>

      {modal === 'new' && (
        <Modal title="Choose a save slot for your new movement" onClose={() => setModal(null)}>
          <div className="space-y-2">
            {Array.from({ length: SLOT_COUNT }).map((_, i) => (
              <SlotCard key={i} m={slots[i]} i={i} mode="new" />
            ))}
          </div>
        </Modal>
      )}
      {modal === 'load' && (
        <Modal title="Load a movement" onClose={() => setModal(null)}>
          <div className="space-y-2">
            {Array.from({ length: SLOT_COUNT }).map((_, i) => (
              <SlotCard key={i} m={slots[i]} i={i} mode="load" />
            ))}
          </div>
        </Modal>
      )}
      {modal === 'settings' && (
        <Modal title="Settings" onClose={() => setModal(null)}>
          <SettingsForm />
        </Modal>
      )}
      {modal === 'legacy' && (
        <Modal title="Hall of Founders" onClose={() => setModal(null)}>
          <p className="text-sm text-ink-300">Victorious movements of the past. They will be remembered — in your next game, as historical precedents.</p>
          <ul className="mt-3 space-y-2">
            {legacy.map((l) => (
              <li key={l.completedAt} className="rounded border border-ink-600 p-3">
                <div className="font-serif font-bold">{l.ideologyName}</div>
                <div className="text-sm text-ink-300">
                  {l.founderTitle} · {l.ending}
                </div>
                <div className="text-xs text-ink-400">{l.doctrines.join(' · ')}</div>
              </li>
            ))}
          </ul>
        </Modal>
      )}
      {confirm && (
        <Modal title={confirm.action === 'delete' ? 'Delete this movement?' : 'Overwrite this slot?'} onClose={() => setConfirm(null)}>
          <p>This cannot be undone. {slots[confirm.slot]?.ideologyName} and all its history will be lost.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setConfirm(null)}>
              Keep it
            </button>
            <button
              className="btn-danger"
              onClick={async () => {
                const c = confirm;
                setConfirm(null);
                if (c.action === 'delete') {
                  await deleteSlot(c.slot);
                  await refresh();
                } else {
                  await deleteSlot(c.slot);
                  onNew(c.slot);
                }
              }}
            >
              {confirm.action === 'delete' ? 'Delete' : 'Overwrite'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
