'use client';
import { useState } from 'react';
import { allAchievements } from '@/engine/achievements';
import { BALANCE, MODES, PHASES } from '@/engine/config';
import { DATASET_META } from '@/engine/geo';
import { duration } from '@/engine/text';
import { useStore } from '@/store/game';
import { Emblem } from '../Emblem';
import { Empty } from '../ui';

export function NewsPanel() {
  const game = useStore((s) => s.game)!;
  const { openEvent } = useStore();
  const [cat, setCat] = useState('all');
  const [importantOnly, setImportantOnly] = useState(false);
  const cats = [...new Set(game.events.map((e) => e.category))].sort();
  const list = [...game.events].reverse().filter((e) => (cat === 'all' || e.category === cat) && (!importantOnly || e.important)).slice(0, 200);
  return (
    <div>
      {game.pendingDecisions.length > 0 && (
        <section className="mb-4">
          <h3 className="label text-seal-500">Awaiting your decision</h3>
          <ul className="mt-1 space-y-1">
            {game.pendingDecisions.map((id) => {
              const e = game.events.find((x) => x.id === id);
              return e ? (
                <li key={id}>
                  <button className="w-full rounded border border-seal-500/70 p-2 text-left font-serif hover:bg-ink-800" onClick={() => openEvent(id)}>
                    {e.headline}
                  </button>
                </li>
              ) : null;
            })}
          </ul>
        </section>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Category" className="input w-auto py-1.5 text-xs" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">All categories</option>
          {cats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={importantOnly} onChange={(e) => setImportantOnly(e.target.checked)} /> Important only
        </label>
      </div>
      <ul className="mt-3 space-y-1">
        {list.map((e) => (
          <li key={e.id}>
            <button className="w-full rounded p-2 text-left hover:bg-ink-800" onClick={() => openEvent(e.id)}>
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-ink-500">
                <span>
                  {e.category}
                  {e.choices ? (e.choiceSelected != null ? ' · decided' : ' · decision pending') : ''}
                  {e.offline ? ' · while away' : ''}
                </span>
                <span>{duration(e.time)}</span>
              </div>
              <div className={`font-serif ${e.important ? 'font-bold' : ''}`}>{e.headline}</div>
            </button>
          </li>
        ))}
        {!list.length && <Empty>No news yet. The world has not noticed. It will.</Empty>}
      </ul>
    </div>
  );
}

export function AchievementsPanel() {
  const game = useStore((s) => s.game)!;
  const all = allAchievements(game);
  const got = all.filter((a) => game.achievements[a.id] != null).length;
  return (
    <div>
      <p className="text-sm text-ink-300">
        {got} of {all.length} unlocked.
      </p>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {all.map((a) => {
          const t = game.achievements[a.id];
          return (
            <li key={a.id} className={`rounded-md border p-3 ${t != null ? 'border-brass-500/60 bg-brass-400/10' : 'border-ink-700 opacity-70'}`}>
              <div className="font-serif font-bold">
                {t != null ? '★' : '☆'} {a.name}
              </div>
              <div className="text-xs text-ink-300">{a.desc}</div>
              {t != null && <div className="text-[11px] text-ink-500">Unlocked at {duration(t)}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ChroniclePanel() {
  const game = useStore((s) => s.game)!;
  const mv = game.movement;
  return (
    <div className="doc p-5 font-serif">
      <div className="text-center text-xs uppercase tracking-[0.3em] text-ink-500">An Official History, Written by Extremely Biased Historians</div>
      <div className="mt-2 flex items-center justify-center gap-3">
        <Emblem banner={mv.banner} animal={mv.spiritAnimal} size={56} />
        <div>
          <div className="text-2xl font-bold">{mv.ideologyName}</div>
          <div className="text-sm italic">{mv.motto}</div>
        </div>
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer font-bold">The Founding Proclamation</summary>
        {mv.proclamation.split('\n\n').map((p, i) => (
          <p key={i} className="mt-2 text-sm leading-relaxed">
            {p}
          </p>
        ))}
      </details>
      <div className="mt-3 text-sm">
        <div className="font-bold">Original doctrines</div>
        <ul className="list-inside list-disc">
          {mv.doctrines.map((d) => (
            <li key={d.id}>{d.originalText}</li>
          ))}
        </ul>
      </div>
      <ol className="relative mt-5 space-y-4 border-l-2 border-ink-300 pl-4">
        {game.chronicle.map((c) => (
          <li key={c.key}>
            <div className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-seal-500" aria-hidden />
            <div className="text-xs uppercase tracking-wider text-ink-500">{duration(c.time)} into the movement</div>
            <div className="text-lg font-bold">{c.title}</div>
            {c.text.split('\n\n').map((p, i) => (
              <p key={i} className="mt-1 leading-relaxed">
                {p}
              </p>
            ))}
          </li>
        ))}
      </ol>
      {game.proclamations.length > 0 && (
        <div className="mt-5 text-sm">
          <div className="font-bold">Important proclamations</div>
          <ul className="list-inside list-disc">
            {game.proclamations.slice(-8).map((p) => (
              <li key={p.id}>“{p.text}”</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function HelpPanel() {
  const game = useStore((s) => s.game)!;
  const mv = game.movement;
  const H = ({ t, children }: { t: string; children: React.ReactNode }) => (
    <section className="mt-4">
      <h3 className="font-serif text-lg font-bold">{t}</h3>
      <div className="mt-1 space-y-1 text-sm text-ink-200">{children}</div>
    </section>
  );
  return (
    <div>
      <p className="text-sm text-ink-300">The complete reference to the unquestionably correct operation of {mv.ideologyName}.</p>
      <H t="The loop">
        <p>Invent → Recruit → Convert → Expand → Organize → Upgrade → Face Resistance → Adapt → Dominate.</p>
      </H>
      <H t="Cities & conversion">
        <p>Each city has a finite population. Awareness is how many have heard of you; followers are converts. Followers never exceed population.</p>
        <p>Active campaigns convert quickly (the founder, zealots and campaign type set the strength; bigger cities are harder). Passive conversion spreads by word of mouth from nearby converted cities, national presence and outposts — much slower but continuous, even offline.</p>
        <p>At {BALANCE.strategicThreshold * 100}% a city is <strong>strategically converted</strong>: +1 zealot (+1 more for cities over 1M), influence, and three newly discovered cities. Reaching 100% grants one more zealot. The last holdouts are hardest; Recruitment upgrades help finish them. A city can slip below {BALANCE.controlLossThreshold * 100}% and lose control, without repeating its rewards.</p>
        <p>Population outside modeled cities (the hinterland) follows each country&apos;s urban adoption over time.</p>
      </H>
      <H t="Zealots & campaigns">
        <p>Zealots are assigned, not consumed. End or redeploy a campaign to free them. Start with one campaign slot; more come from milestones and Organization upgrades. If you are ever stuck, the founder can always lead a campaign, and scouts can find new cities.</p>
      </H>
      <H t={mv.outpostName}>
        <p>Build in strategically converted cities of 150k+ after unlocking Infrastructure. They boost local and regional conversion and train zealots every 24 hours of real time, including while you are away.</p>
      </H>
      <H t="Influence, funds & upgrades">
        <p>Influence comes from converted cities and your total following; spend it on upgrades, outposts and special campaigns. Movement Funds appear once the movement matures (250K followers or the Merchandise Office).</p>
      </H>
      <H t="Cohesion, drift, control, bureaucracy">
        <p>Cohesion falls as you grow; low cohesion breeds splinter groups. Doctrinal drift rises with size, commerce and reinterpretation — adaptable, but unpredictable. Founder control tracks how much the movement still listens to you. Bureaucracy accumulates with committees and organization.</p>
        <p>Proclamations change doctrine and these meters, sometimes with delayed side effects.</p>
      </H>
      <H t="World reaction">
        <p>The world progresses from indifference to transformation. After roughly six successful campaigns, organized opposition appears. Rivals emerge in the national phase.</p>
      </H>
      <H t="Phases">
        <ol className="list-inside list-decimal">
          {PHASES.map((p) => (
            <li key={p.n}>
              <strong>{p.name}</strong> — {p.blurb}
            </li>
          ))}
        </ol>
      </H>
      <H t="Victory">
        <p>
          World Domination: at least {BALANCE.victoryConversion * 100}% of the modeled world (your followers plus allied/autonomous factions), at least {BALANCE.victoryCountryConversion * 100}% conversion in {BALANCE.victoryCountryShare * 100}% of countries, and cohesion of {BALANCE.victoryCohesion}+ held for {BALANCE.victoryStabilizeSeconds}s. The ending depends on how you got there. Absolute Certainty requires 100%.
        </p>
      </H>
      <H t="Modes">
        {Object.values(MODES).map((m) => (
          <p key={m.label}>
            <strong>{m.label}</strong>: {m.description}
          </p>
        ))}
      </H>
      <H t="Keyboard">
        <p>Ctrl/⌘+K or / — command palette (type “stats”). Space — pause. C, O, U, D, N, F, S, G, A, H — panels. On the map: +/− zoom, arrows pan.</p>
      </H>
      <H t="Data & fiction">
        <p>Geography: {DATASET_META.source}. Population figures are game estimates from a fixed snapshot. All movements, reactions, organizations and people in the news are fictional.</p>
      </H>
    </div>
  );
}
