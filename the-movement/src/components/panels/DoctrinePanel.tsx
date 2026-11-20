'use client';
import { useState } from 'react';
import { issueProclamation, PROCLAMATION_COOLDOWN, proclamationText } from '@/engine/sim';
import { duration } from '@/engine/text';
import type { Proclamation } from '@/engine/types';
import { play } from '@/lib/audio';
import { useStore } from '@/store/game';
import { Progress } from '../ui';

const STANCES: { id: Proclamation['stance']; label: string; desc: string }[] = [
  { id: 'clarify', label: 'Clarify', desc: '+cohesion, −drift. Clarifications occasionally require clarification.' },
  { id: 'relax', label: 'Relax', desc: 'More appealing; traditionalists may object.' },
  { id: 'strengthen', label: 'Strengthen', desc: '+cohesion and control; outsiders more alarmed; reformers may object.' },
  { id: 'reverse', label: 'Reverse previous', desc: 'Undo your last proclamation on this doctrine. You always supported this.' },
  { id: 'custom', label: 'Custom', desc: 'Say anything (within reason). Interpreted by the Office of Correct Interpretation.' },
];

export default function DoctrinePanel() {
  const game = useStore((s) => s.game)!;
  const { act, toast } = useStore();
  const mv = game.movement;
  const [doctrineId, setDoctrineId] = useState(mv.doctrines[0].id);
  const [stance, setStance] = useState<Proclamation['stance']>('clarify');
  const [variant, setVariant] = useState(0);
  const [custom, setCustom] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const last = game.proclamations[game.proclamations.length - 1];
  const cooldown = last ? Math.max(0, PROCLAMATION_COOLDOWN - (game.time - last.time)) : 0;
  const preview = stance === 'custom' ? custom : proclamationText(game, doctrineId, stance, variant);
  const proclaim = () => {
    const r = act((g) => issueProclamation(g, { doctrineId, stance, text: custom, variant }), { save: true });
    if (!r) return;
    if (r.ok) {
      play('news');
      setMsg({ ok: true, text: r.message ?? '' });
      toast({ text: `${mv.founderTitle} proclaims: “${preview}”`, kind: 'good' });
      setCustom('');
    } else setMsg({ ok: false, text: r.error });
  };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="label">Cohesion</div>
          <Progress value={game.cohesion} max={100} label="Cohesion" color="#5ec8a0" />
        </div>
        <div>
          <div className="label">Doctrinal drift</div>
          <Progress value={game.drift} max={100} label="Drift" color="#c0392b" />
        </div>
      </div>
      <section>
        <h3 className="label">Doctrines</h3>
        <ul className="mt-2 space-y-2">
          {mv.doctrines.map((d) => (
            <li key={d.id} className={`rounded-md border p-3 ${d.id === doctrineId ? 'border-brass-400' : 'border-ink-700'}`}>
              <button className="w-full text-left" onClick={() => setDoctrineId(d.id)} aria-pressed={d.id === doctrineId}>
                <div className="text-[11px] uppercase tracking-wider text-ink-400">{d.category}</div>
                <div className="font-serif">
                  <span className="text-ink-400">Original:</span> “{d.originalText}”
                </div>
                {d.currentText !== d.originalText && (
                  <div className="mt-1 font-serif text-brass-300">
                    <span className="text-ink-400">Current:</span> “{d.currentText}”
                  </div>
                )}
                <div className="mt-1 text-xs text-ink-400">{d.interpretation}</div>
              </button>
              <details className="mt-1 text-xs">
                <summary className="cursor-pointer text-ink-400">Attributes & interpretation</summary>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {Object.entries(d.attributes).map(([k, v]) => (
                    <span key={k}>
                      {k}: <strong>{v}</strong>
                    </span>
                  ))}
                </div>
                <ul className="mt-1 list-inside list-disc text-ink-500">
                  {d.derivation.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                {d.modificationHistory.length > 0 && (
                  <ul className="mt-1 text-ink-400">
                    {d.modificationHistory.map((m, i) => (
                      <li key={i}>
                        {duration(m.time)}: {m.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-md border border-ink-700 p-3">
        <h3 className="font-serif text-lg font-bold">Issue a Proclamation</h3>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Proclamation stance">
          {STANCES.map((s) => (
            <button key={s.id} role="radio" aria-checked={stance === s.id} className={`chip text-xs ${stance === s.id ? 'chip-on' : 'chip-off'}`} onClick={() => setStance(s.id)} title={s.desc}>
              {s.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-ink-400">{STANCES.find((s) => s.id === stance)!.desc}</p>
        {stance === 'custom' ? (
          <textarea aria-label="Custom proclamation" className="input mt-2" rows={2} maxLength={160} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="The founder has never opposed accordion music." />
        ) : (
          <div className="doc mt-2 p-3 font-serif">
            “{preview}”
            {stance !== 'reverse' && (
              <button className="ml-2 text-xs text-seal-600 underline" onClick={() => setVariant(variant + 1)}>
                reword
              </button>
            )}
          </div>
        )}
        <button className="btn-primary mt-3 w-full" disabled={cooldown > 0} onClick={proclaim}>
          {cooldown > 0 ? `Scribes busy (${Math.ceil(cooldown)}s)` : 'Proclaim'}
        </button>
        {msg && <p className={`mt-2 text-sm ${msg.ok ? 'text-brass-300' : 'text-seal-500'}`}>{msg.text}</p>}
        <p className="mt-2 text-xs text-ink-500">Proclamations do not instantly solve every crisis. Frequent proclamations lose force.</p>
      </section>
      {game.proclamations.length > 0 && (
        <section>
          <h3 className="label">Proclamation record</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {[...game.proclamations].reverse().map((p) => (
              <li key={p.id}>
                <span className="text-ink-400">{duration(p.time)} · {p.stance}:</span> <span className="font-serif">“{p.text}”</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {game.committees.length > 0 && (
        <section>
          <h3 className="label">Committees ({game.committees.length})</h3>
          <ul className="mt-1 list-inside list-disc text-sm">
            {game.committees.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
