'use client';
import { allAchievements } from '@/engine/achievements';
import { CITY_BY_ID, WORLD_POPULATION } from '@/engine/geo';
import { duration, fmt, pct } from '@/engine/text';
import { ENDINGS, victoryProgress } from '@/engine/victory';
import { addLegacy } from '@/lib/storage';
import { useStore } from '@/store/game';
import { Modal } from '../ui';

function certificateSVG(g: NonNullable<ReturnType<typeof useStore.getState>['game']>): string {
  const mv = g.movement;
  const e = ENDINGS.find((x) => x.id === g.victory.ending);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const docs = mv.doctrines.slice(0, 4).map((d, i) => `<text x="600" y="${430 + i * 28}" font-size="20" text-anchor="middle" font-style="italic">“${esc(d.originalText)}”</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" font-family="Georgia, serif">
<rect width="1200" height="800" fill="#fbf8f1"/><rect x="30" y="30" width="1140" height="740" fill="none" stroke="${mv.banner.primary}" stroke-width="10"/>
<rect x="50" y="50" width="1100" height="700" fill="none" stroke="${mv.banner.secondary}" stroke-width="3"/>
<text x="600" y="140" font-size="22" text-anchor="middle" letter-spacing="8" fill="#4b5468">CERTIFICATE OF WORLD DOMINATION</text>
<text x="600" y="220" font-size="64" text-anchor="middle" font-weight="bold" fill="#11141b">${esc(mv.ideologyName)}</text>
<text x="600" y="270" font-size="26" text-anchor="middle" fill="#363e50">Founded by ${esc(mv.founderTitle)} · ${esc(mv.motto || '')}</text>
<text x="600" y="330" font-size="30" text-anchor="middle" fill="${mv.banner.primary}" font-weight="bold">${esc(e?.name ?? 'Victory')}</text>
<text x="600" y="380" font-size="20" text-anchor="middle" fill="#363e50">${fmt(g.totals.followers)} ${esc(mv.pluralFollowers)} · ${pct(g.totals.followers / WORLD_POPULATION, 1)} of the world · ${g.totals.countriesReached} countries</text>
${docs}
<text x="600" y="660" font-size="18" text-anchor="middle" fill="#4b5468">Achieved in ${esc(duration(g.victory.at ?? g.time))} of recorded history. Historians agree this was inevitable.</text>
<g transform="translate(980 600) rotate(-8)"><rect x="-90" y="-30" width="180" height="60" fill="none" stroke="#b3403a" stroke-width="4"/><text x="0" y="10" font-size="26" text-anchor="middle" fill="#b3403a" font-weight="bold" letter-spacing="4">CERTIFIED</text></g>
</svg>`;
}

async function downloadCertificate(svg: string, name: string) {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error('render failed'));
    img.src = url;
  });
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 800;
  c.getContext('2d')!.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = `${name}-certificate.png`;
  a.click();
}

export default function VictoryPanel({ onClose }: { onClose: () => void }) {
  const game = useStore((s) => s.game)!;
  const { save, setGame, setScreen } = useStore();
  const mv = game.movement;
  const p = victoryProgress(game);
  const e = ENDINGS.find((x) => x.id === game.victory.ending);
  const ach = allAchievements(game).filter((a) => game.achievements[a.id] != null);
  const legacyRecord = () => ({ ideologyName: mv.ideologyName, pluralFollowers: mv.pluralFollowers, founderTitle: mv.founderTitle, ending: e?.name ?? 'Unknown', doctrines: mv.doctrines.map((d) => d.originalText), completedAt: game.victory.at ?? game.time });
  if (!game.victory.achieved) {
    return (
      <Modal title="Path to World Domination" onClose={onClose}>
        <ul className="space-y-2 text-sm">
          <li>{p.conversionOk ? '✓' : '○'} 95% of the world converted — currently {pct(p.conversion, 2)}</li>
          <li>{p.countriesOk ? '✓' : '○'} Majority in 75% of countries — currently {pct(p.countryShare, 1)}</li>
          <li>{p.cohesionOk ? '✓' : '○'} Cohesion 35+ — currently {Math.round(game.cohesion)}</li>
        </ul>
      </Modal>
    );
  }
  return (
    <Modal title="WORLD DOMINATION" onClose={onClose} wide doc>
      <div className="text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-ink-500">Ending</div>
        <h3 className="font-serif text-3xl font-black">{e?.name}</h3>
        <p className="italic text-ink-700">{e?.blurb}</p>
      </div>
      <div className="mt-4 space-y-3 font-serif leading-relaxed">
        {(game.victory.endingText ?? '').split('\n\n').map((t, i) => (
          <p key={i}>{t}</p>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
        <div>
          <div className="text-xs uppercase text-ink-500">Followers</div>
          <div className="font-bold">{fmt(game.totals.followers)}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-ink-500">First city</div>
          <div className="font-bold">{mv.startingCityId != null ? CITY_BY_ID.get(mv.startingCityId)?.name : '—'}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-ink-500">Factions</div>
          <div className="font-bold">{Object.keys(game.factions).length}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-ink-500">Achievements</div>
          <div className="font-bold">{ach.length}</div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button className="btn bg-ink-900 text-white" onClick={() => downloadCertificate(certificateSVG(game), mv.ideologyName.toLowerCase())}>
          Download founder&apos;s certificate (PNG)
        </button>
        <button
          className="btn border border-ink-800 text-ink-900"
          onClick={async () => {
            game.victory.sandbox = true;
            await addLegacy(legacyRecord());
            await save();
            onClose();
          }}
        >
          Continue in sandbox
        </button>
        <button
          className="btn border border-seal-600 text-seal-600"
          onClick={async () => {
            await addLegacy(legacyRecord());
            await save();
            setGame(null);
            setScreen('menu');
          }}
        >
          New Game+ (your movement becomes history)
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-ink-500">New Game+ adds your movement to the Hall of Founders; it appears as a historical precedent in future games. No gameplay advantages are carried over.</p>
    </Modal>
  );
}
