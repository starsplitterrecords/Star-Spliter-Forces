'use client';
import { PHASES } from '@/engine/config';
import { unlockUpgrade, upgradeAvailability } from '@/engine/sim';
import { fmt } from '@/engine/text';
import { BRANCHES, UPGRADES, upgradeName } from '@/engine/upgrades';
import { play } from '@/lib/audio';
import { useStore } from '@/store/game';

export default function UpgradesPanel() {
  const game = useStore((s) => s.game)!;
  const { act, toast } = useStore();
  const mv = game.movement;
  return (
    <div>
      <p className="text-sm text-ink-300">
        Influence: <strong className="text-brass-300">{Math.floor(game.influence)}</strong>
        {game.fundsUnlocked && (
          <>
            {' '}
            · Movement Funds: <strong>{fmt(game.funds)}</strong>
          </>
        )}{' '}
        · Influence is earned by converting cities and grows with your following.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {BRANCHES.map((b) => (
          <section key={b.id} aria-labelledby={`br-${b.id}`} className="rounded-md border border-ink-700 p-3">
            <h3 id={`br-${b.id}`} className="font-serif text-lg font-bold">
              {b.name}
            </h3>
            <p className="text-xs text-ink-400">{b.blurb}</p>
            <ol className="mt-2 space-y-2">
              {UPGRADES.filter((u) => u.branch === b.id).map((u) => {
                const owned = game.upgrades.includes(u.id);
                const av = upgradeAvailability(game, u.id);
                const locked = !owned && !av.ok && av.reason?.startsWith('Requires') && !av.reason.includes('influence') && !av.reason.includes('funds');
                return (
                  <li key={u.id}>
                    <button
                      className={`w-full rounded border p-2 text-left text-sm ${owned ? 'border-brass-500/60 bg-brass-400/10' : av.ok ? 'border-ink-500 hover:border-brass-400' : 'border-ink-800 opacity-70'}`}
                      disabled={owned || !av.ok}
                      aria-label={`${upgradeName(u, mv)}${owned ? ', owned' : ''}`}
                      onClick={() => {
                        const r = act((g) => unlockUpgrade(g, u.id), { save: true });
                        if (r?.ok) {
                          play('upgrade');
                          toast({ text: `${upgradeName(u, mv)} established.`, kind: 'good' });
                        }
                      }}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-semibold">
                          {owned ? '✓ ' : locked ? '🔒 ' : ''}
                          {upgradeName(u, mv)}
                        </span>
                        {!owned && (
                          <span className="tabular shrink-0 text-xs text-brass-300">
                            {u.cost}
                            {u.funds ? ` + ${fmt(u.funds)}f` : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-ink-300">{u.desc}</div>
                      {u.tradeoff && <div className="text-xs text-seal-500">Tradeoff: {u.tradeoff}</div>}
                      {!owned && !av.ok && <div className="text-[11px] text-ink-500">{av.reason}{u.minPhase > game.phase ? '' : ''}</div>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-500">Current phase: {PHASES[game.phase - 1].name}. Later upgrades unlock as the movement grows.</p>
    </div>
  );
}
