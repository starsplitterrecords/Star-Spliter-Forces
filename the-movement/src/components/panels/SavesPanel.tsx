'use client';
import { useEffect, useRef, useState } from 'react';
import { PHASES } from '@/engine/config';
import { loadGame, serializeGame } from '@/engine/save';
import { fmt } from '@/engine/text';
import { SLOT_COUNT, type SlotMeta, downloadText, listSlots, saveSlot } from '@/lib/storage';
import { useStore } from '@/store/game';
import { Modal } from '../ui';

export default function SavesPanel() {
  const game = useStore((s) => s.game)!;
  const { save, lastSaved, setGame, setScreen } = useStore();
  const [slots, setSlots] = useState<(SlotMeta | null)[]>([]);
  const [msg, setMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void listSlots().then(setSlots);
  }, [lastSaved]);
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-300">
        Saved locally in this browser (IndexedDB). Current slot: {game.slot + 1}. {lastSaved ? `Last saved ${new Date(lastSaved).toLocaleTimeString()}.` : ''}
      </p>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => save().then(() => setMsg('Saved.'))}>
          Save now
        </button>
        <button className="btn-ghost" onClick={() => downloadText(`${game.movement.ideologyName.toLowerCase()}-save.json`, serializeGame(game))}>
          Export JSON
        </button>
        <button className="btn-ghost" onClick={() => file.current?.click()}>
          Import JSON into this slot
        </button>
        <input
          ref={file}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-label="Import save"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const { state, fixes } = loadGame(await f.text());
              state.slot = game.slot;
              state.lastRealTime = Date.now();
              await saveSlot(state);
              setGame(state);
              setMsg(`Imported ${state.movement.ideologyName}.${fixes.length ? ` Repaired ${fixes.length} inconsistencies.` : ''}`);
            } catch (err) {
              setMsg(`Import failed: ${(err as Error).message}`);
            }
          }}
        />
      </div>
      {msg && <p role="status" className="text-sm text-brass-300">{msg}</p>}
      <section>
        <h3 className="label">Slots</h3>
        <ul className="mt-2 space-y-2">
          {Array.from({ length: SLOT_COUNT }).map((_, i) => {
            const m = slots[i];
            return (
              <li key={i} className={`rounded border p-2 text-sm ${i === game.slot ? 'border-brass-400' : 'border-ink-700'}`}>
                <div className="label">Slot {i + 1}{i === game.slot ? ' (current)' : ''}</div>
                {m ? `${m.ideologyName} · ${fmt(m.followers)} followers · ${PHASES[m.phase - 1]?.name}` : 'Empty'}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-ink-500">Switch slots from the main menu.</p>
      </section>
      <section className="border-t border-ink-700 pt-3">
        <h3 className="label text-seal-500">Danger zone</h3>
        <button className="btn-danger mt-2" onClick={() => setConfirmReset(true)}>
          Abandon movement &amp; start a new game in this slot
        </button>
      </section>
      {confirmReset && (
        <Modal title="Abandon the movement?" onClose={() => setConfirmReset(false)}>
          <p>
            {game.movement.ideologyName} and all its history in slot {game.slot + 1} will be replaced by a new movement once you found it. Consider exporting first.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
            <button
              className="btn-danger"
              onClick={() => {
                setGame(null);
                setScreen('wizard');
              }}
            >
              Abandon
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
