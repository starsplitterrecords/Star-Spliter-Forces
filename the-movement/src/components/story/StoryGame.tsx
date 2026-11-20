'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CITIES, city, countryName } from '@/engine/geo';
import { randomSeed } from '@/engine/rng';
import { fmt } from '@/engine/text';
import { play } from '@/lib/audio';
import { clearStory, loadSavedStory, saveStory } from '@/lib/storyStorage';
import { CARD_BY_ID, CHAR_BY_ID, TIME, callMeeting, cardText, deskStatus, charName, choose, currentCard, followers, growthPerRealHour, newStory, render, tickRealTime } from '@/story/engine';
import { type ChoiceOutcome, type Gauge, GAUGES, type StoryState } from '@/story/types';
import { useReducedMotion } from '../ui';
import { Portrait, anonSpec } from './Portrait';
import { CustomsSheet, HistorySheet, MapSheet, PeopleSheet } from './StorySheets';

const GAUGE_INFO: Record<Gauge, { label: string; short: string; blurb: string }> = {
  enthusiasm: { label: 'Enthusiasm', short: 'Zeal', blurb: 'How intensely members participate and recruit.' },
  unity: { label: 'Unity', short: 'Unity', blurb: 'How well followers and leaders agree.' },
  attention: { label: 'Public Attention', short: 'Attention', blurb: 'How much the outside world notices you.' },
  resources: { label: 'Resources', short: 'Means', blurb: 'How much organisational capacity you can sustain.' },
};
const ERA_LABEL: Record<string, string> = { founding: 'Founding Era', grassroots: 'Grassroots Era', regional: 'Regional Era', national: 'National Era' };
const HOMETOWNS = CITIES.filter((c) => c.pop > 80_000 && c.pop < 900_000);

function GaugeBar({ g, value, preview, delta }: { g: Gauge; value: number; preview?: number; delta?: number }) {
  const danger = value <= 12 || value >= 88;
  return (
    <div className="min-w-0" title={`${GAUGE_INFO[g].label} ${Math.round(value)}/100. ${GAUGE_INFO[g].blurb} Both extremes are dangerous.`}>
      <div className="flex items-baseline justify-between gap-1">
        <span className="truncate text-[10px] uppercase tracking-wider text-ink-400"><span className="sm:hidden">{g === 'enthusiasm' ? 'Enthus.' : g === 'resources' ? 'Resources' : GAUGE_INFO[g].short}</span><span className="hidden sm:inline">{GAUGE_INFO[g].label}</span></span>
        <span className={`tabular text-xs ${danger ? 'text-red-400' : 'text-ink-200'}`}>{Math.round(value)}</span>
      </div>
      <div className="relative mt-1 h-2 rounded-full bg-ink-700" role="meter" aria-label={GAUGE_INFO[g].label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-2 rounded-full transition-[width] duration-500" style={{ width: `${value}%`, background: danger ? '#e05a4f' : '#e8cf8a' }} />
        <div className="absolute inset-y-0 left-[12%] w-px bg-ink-500" aria-hidden />
        <div className="absolute inset-y-0 left-[88%] w-px bg-ink-500" aria-hidden />
      </div>
      <div className="flex h-3 items-center justify-center" aria-hidden>
        {preview ? <span className="rounded-full bg-brass-300" style={{ width: Math.abs(preview) >= 9 ? 9 : 5, height: Math.abs(preview) >= 9 ? 9 : 5 }} /> : null}
        {delta ? <span className={`text-[10px] font-bold ${delta > 0 ? 'text-emerald-300' : 'text-red-400'}`}>{delta > 0 ? `▲ ${Math.round(delta)}` : `▼ ${Math.round(-delta)}`}</span> : null}
      </div>
    </div>
  );
}

type Sheet = 'people' | 'customs' | 'map' | 'history' | 'menu' | null;

export default function StoryGame({ onExit }: { onExit: () => void }) {
  const [s, setS] = useState<StoryState | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setV] = useState(0);
  const bump = () => setV((v) => v + 1);
  const [outcome, setOutcome] = useState<(ChoiceOutcome & { speaker: string }) | null>(null);
  const [hover, setHover] = useState<0 | 1 | null>(null);
  const [inputFor, setInputFor] = useState<0 | 1 | null>(null);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [name, setName] = useState('');
  const [townQuery, setTownQuery] = useState('');
  const [town, setTown] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const sinceSave = useRef(0);

  useEffect(() => {
    void loadSavedStory().then((saved) => {
      if (saved) tickRealTime(saved, Date.now());
      setS(saved);
      setLoading(false);
    });
  }, []);

  // the movement keeps living while you watch
  useEffect(() => {
    if (!s) return;
    const id = setInterval(() => {
      tickRealTime(s, Date.now());
      sinceSave.current += 1;
      if (sinceSave.current >= 10) {
        sinceSave.current = 0;
        void saveStory(s);
      }
      bump();
    }, 1000);
    const onHide = () => document.visibilityState === 'hidden' && void saveStory(s);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [s]);

  const inst = s ? currentCard(s) : null;
  const card = inst ? CARD_BY_ID.get(inst.cardId) : undefined;

  const decide = useCallback(
    (i: 0 | 1) => {
      if (!s || !inst || !card) return;
      if (card.choices[i].input && inputFor !== i) {
        setInputFor(i);
        setInputText(render(s, card.choices[i].input!.suggest ?? '', inst.ctx));
        setError('');
        return;
      }
      const r = choose(s, inst.uid, i, card.choices[i].input ? inputText : undefined);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      play(s.ended ? 'schism' : 'click');
      setOutcome({ ...r.outcome, speaker: inst.speaker });
      setInputFor(null);
      setHover(null);
      setError('');
      void saveStory(s);
      bump();
    },
    [s, inst, card, inputFor, inputText],
  );

  const next = useCallback(() => {
    if (!s) return;
    setOutcome(null);
    if (!currentCard(s)) {
      callMeeting(s);
      play('news');
    }
    void saveStory(s);
    bump();
  }, [s]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheet || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (outcome && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')) {
        e.preventDefault();
        next();
      } else if (!outcome && card) {
        if (e.key === 'ArrowLeft' || e.key === '1') decide(0);
        if (e.key === 'ArrowRight' || e.key === '2') decide(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet, outcome, card, decide, next]);

  const townResults = useMemo(() => {
    const q = townQuery.trim().toLowerCase();
    return q.length < 2 ? [] : CITIES.filter((c) => c.name.toLowerCase().startsWith(q)).slice(0, 6);
  }, [townQuery]);

  if (loading) return <div className="flex h-full items-center justify-center font-serif text-ink-300">Unlocking the garage…</div>;

  // ------------------------------------------------ start
  if (!s) {
    return (
      <div className="flex h-full flex-col items-center justify-center overflow-y-auto bg-ink-950 p-6">
        <div className="w-full max-w-md">
          <div className="label tracking-[0.35em]">The Movement</div>
          <h1 className="mt-3 font-serif text-4xl font-black leading-tight">You have three friends, a confused founding member and access to someone’s garage.</h1>
          <p className="mt-3 text-ink-300">Nobody has agreed on what this is about yet. That will depend on you, and on them.</p>
          <form
            className="mt-6 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const home = town ?? HOMETOWNS[Math.floor(Math.random() * HOMETOWNS.length)].id;
              const ns = newStory(name || 'Jeff', home, randomSeed());
              void saveStory(ns);
              play('milestone');
              setS(ns);
            }}
          >
            <label className="label" htmlFor="founder-name">What is your name?</label>
            <input id="founder-name" className="input text-lg" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="Jeff" autoFocus />
            <label className="label" htmlFor="hometown">Your hometown (optional)</label>
            <div className="relative">
              <input id="hometown" className="input" value={town != null ? `${city(town).name}, ${countryName(city(town).cc)}` : townQuery} onChange={(e) => { setTown(null); setTownQuery(e.target.value); }} placeholder="Leave blank for somewhere unexpected" autoComplete="off" />
              {townResults.length > 0 && town == null && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-ink-600 bg-ink-850" role="listbox">
                  {townResults.map((c) => (
                    <li key={c.id}>
                      <button type="button" role="option" aria-selected={false} className="block w-full px-3 py-2 text-left text-sm hover:bg-ink-700" onClick={() => setTown(c.id)}>
                        {c.name}, {countryName(c.cc)} <span className="text-ink-400">· {fmt(c.pop)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button className="btn-primary mt-2 py-3 text-base" type="submit">Open the garage</button>
            <button className="btn-ghost" type="button" onClick={onExit}>Back</button>
          </form>
        </div>
      </div>
    );
  }

  const speakerId = outcome ? outcome.speaker : inst?.speaker;
  const def = speakerId && speakerId !== 'anon' ? CHAR_BY_ID.get(speakerId) : undefined;
  const anon = inst?.anon;
  const portrait = def?.portrait ?? anonSpec(anon?.seed ?? 7);
  const speakerName = def ? def.name : anon?.name ?? 'Someone';
  const speakerRole = def ? s.chars[def.id].role : anon ? render(s, anon.role, inst?.ctx ?? {}) : '';
  const preview = hover != null && card ? card.choices[hover].effects.gauges ?? {} : {};
  const waiting = s.inbox.length;
  const f = followers(s);
  const growth = growthPerRealHour(s);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ink-950">
      {/* vital signs */}
      <header className="border-b border-ink-800 bg-ink-900 px-4 pt-3">
        <div className="mx-auto grid max-w-2xl grid-cols-4 gap-3">
          {GAUGES.map((g) => <GaugeBar key={g} g={g} value={s.gauges[g]} preview={preview[g]} delta={outcome?.gaugeDelta[g]} />)}
        </div>
        <div className="mx-auto mt-1 flex max-w-2xl items-center justify-between pb-2 text-xs text-ink-300">
          <span>{ERA_LABEL[s.era] ?? s.era} · Day {Math.floor(s.day) + 1}</span>
          <span className="tabular" title={`${f.toLocaleString()} followers`}>{s.movementName ?? 'The group'} · {fmt(f)} followers · {growth >= 0 ? '+' : ''}{fmt(growth)}/hr</span>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-4">
        {s.ended ? (
          <div className="fadeup w-full max-w-lg rounded-2xl border-4 border-parchment-200 bg-parchment-50 p-6 text-ink-950 shadow-2xl">
            <div className="text-xs uppercase tracking-[0.3em] text-ink-500">The end of your leadership</div>
            <h2 className="mt-2 font-serif text-3xl font-black">{s.ended.title}</h2>
            <p className="mt-3 font-serif leading-relaxed">{s.ended.text}</p>
            <p className="mt-3 text-sm text-ink-600">You led {s.movementName ?? 'the group'} for {Math.floor(s.day)} days and {s.decisions} decisions. {fmt(f)} people still belong to it.</p>
            <button className="btn mt-4 w-full bg-ink-900 py-3 text-white" onClick={() => setSheet('history')}>Read the history</button>
            <button className="btn mt-2 w-full border border-ink-800 text-ink-900" onClick={() => setConfirmNew(true)}>Start again</button>
          </div>
        ) : outcome ? (
          <div className="fadeup w-full max-w-lg">
            <div className="flex items-center gap-3">
              <Portrait spec={portrait} size={64} label={speakerName} />
              <div className="text-xs uppercase tracking-widest text-ink-400">The movement responds</div>
            </div>
            <p className="mt-3 font-serif text-lg leading-snug">{outcome.reaction}</p>
            <ul className="mt-4 space-y-1 text-sm">
              {outcome.loyalty.map((l) => (
                <li key={l.id} className={l.delta > 0 ? 'text-emerald-300' : 'text-red-300'}>
                  {l.delta > 0 ? '▲' : '▼'} {charName(s, l.id)} {l.delta >= 8 ? 'is delighted' : l.delta > 0 ? 'approves' : l.delta <= -8 ? 'will remember this' : 'is not pleased'}
                </li>
              ))}
              {outcome.groupNotes.map((n) => <li key={n} className="text-ink-200">◆ {n}</li>)}
              {outcome.notes.map((n) => <li key={n} className="text-brass-300">◆ {n}</li>)}
            </ul>
            <button className="btn-primary mt-6 w-full py-3" onClick={next} autoFocus>
              {waiting ? `Next: ${waiting} ${waiting === 1 ? 'person' : 'people'} waiting` : 'Call a meeting'}
            </button>
          </div>
        ) : inst && card ? (
          <div className="fadeup w-full max-w-lg" key={inst.uid}>
            <div className="flex items-end gap-4">
              <div className="shrink-0 overflow-hidden rounded-2xl border-4 border-parchment-200 bg-parchment-100">
                <Portrait spec={portrait} size={reduced ? 120 : 136} label={speakerName} />
              </div>
              <div className="min-w-0 pb-1">
                <div className="font-serif text-xl font-bold">{speakerName}</div>
                <div className="text-xs uppercase tracking-widest text-ink-400">{speakerRole}</div>
                {def && s.chars[def.id].present && (
                  <div className="mt-1 text-[11px] text-ink-400">wants {def.agenda} · loyalty {s.chars[def.id].loyalty >= 15 ? 'warm' : s.chars[def.id].loyalty <= -15 ? 'cool' : 'steady'}</div>
                )}
              </div>
            </div>
            <blockquote className="mt-4 font-serif text-lg leading-snug sm:text-xl">“{render(s, cardText(card, inst), inst.ctx, inst.speaker)}”</blockquote>
            <div className="mt-5 grid gap-3">
              {card.choices.map((ch, i) => (
                <div key={i}>
                  <button
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${hover === i ? 'border-brass-400 bg-brass-400/10' : 'border-ink-600 bg-ink-850 hover:border-ink-400'}`}
                    onMouseEnter={() => setHover(i as 0 | 1)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i as 0 | 1)}
                    onBlur={() => setHover(null)}
                    onClick={() => decide(i as 0 | 1)}
                  >
                    <div className="font-serif text-base font-semibold">{render(s, ch.label, inst.ctx, inst.speaker)}</div>
                    {ch.hint && <div className="mt-1 text-xs text-ink-400">{render(s, ch.hint, inst.ctx, inst.speaker)}</div>}
                  </button>
                  {inputFor === i && ch.input && (
                    <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); decide(i as 0 | 1); }}>
                      <label className="sr-only" htmlFor="choice-input">Your words</label>
                      <input id="choice-input" className="input" autoFocus maxLength={60} value={inputText} placeholder={ch.input.placeholder} onChange={(e) => setInputText(e.target.value)} />
                      <button className="btn-primary" type="submit">Decide</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
            <p className="mt-3 text-center text-[11px] text-ink-500">Dots above show which gauges a choice moves, not which way. Keys: ← / → or 1 / 2.</p>
          </div>
        ) : (
          <div className="mt-10 max-w-md text-center">
            <p className="font-serif text-xl">Nobody needs you right now.</p>
            {deskStatus(s).exhausted && (
              <p className="mt-2 rounded-md border border-brass-500/50 bg-brass-400/10 p-3 text-sm text-brass-300">
                {s.era === 'national' || s.era === 'international' || s.era === 'world'
                  ? 'You have reached the end of the written story so far. The National era has not been written yet; the movement will keep growing on its own.'
                  : `You have reached the edge of the written story for the ${s.era} era. The next chapter opens at ${fmt(s.era === 'regional' ? TIME.nationalFollowers : TIME.regionalFollowers)} followers (you have ${fmt(f)}). The movement keeps growing while you wait.`}
              </p>
            )}
            <p className="mt-2 text-sm text-ink-300">{s.movementName ?? 'The group'} carries on without you: {fmt(f)} people, {growth >= 0 ? 'growing' : 'shrinking'} by about {fmt(Math.abs(growth))} an hour. Someone will turn up with a problem soon.</p>
            <button className="btn-primary mt-5 py-3" onClick={next}>Call a meeting</button>
          </div>
        )}
      </main>

      <nav className="grid grid-cols-5 border-t border-ink-800 bg-ink-900" aria-label="Movement">
        {(
          [
            ['people', 'People', '👥'],
            ['customs', 'Customs', '📜'],
            ['map', 'Map', '🗺'],
            ['history', 'History', '📖'],
            ['menu', 'Menu', '⋯'],
          ] as const
        ).map(([id, label, icon]) => (
          <button key={id} className="flex min-h-[52px] flex-col items-center justify-center text-[11px] text-ink-200 hover:text-brass-300" onClick={() => setSheet(id)}>
            <span className="text-lg" aria-hidden>{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {sheet && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && setSheet(null)}>
          <div className="fadeup max-h-[88vh] w-full overflow-y-auto rounded-t-2xl border border-ink-700 bg-ink-900 p-5 scroll-thin sm:max-w-2xl sm:rounded-2xl" role="dialog" aria-modal="true" aria-label={sheet}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold">{{ people: 'People', customs: 'Customs & Beliefs', map: `The Home Region: ${city(s.hometown).name}`, history: 'History', menu: 'Menu' }[sheet]}</h2>
              <button className="btn-ghost btn-sm" onClick={() => setSheet(null)} aria-label="Close">✕</button>
            </div>
            {sheet === 'people' && <PeopleSheet s={s} />}
            {sheet === 'customs' && <CustomsSheet s={s} />}
            {sheet === 'map' && <MapSheet s={s} onChange={() => { void saveStory(s); bump(); }} />}
            {sheet === 'history' && <HistorySheet s={s} />}
            {sheet === 'menu' && (
              <div className="flex flex-col gap-2">
                <button className="btn-ghost" onClick={() => setSheet(null)}>Resume</button>
                <button className="btn-ghost" onClick={() => setConfirmNew(true)}>Abandon and start again</button>
                <button className="btn-ghost" onClick={() => { void saveStory(s); onExit(); }}>Main menu (progress is saved)</button>
                <p className="mt-2 text-xs text-ink-400">Time passes while the game is open (a day every two minutes) and while you are away (up to 14 days). Decisions wait for you.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {s.report && !s.ended && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="doc w-full max-w-md p-5" role="dialog" aria-modal="true" aria-label="While you were away">
            <h2 className="font-serif text-2xl font-bold">While You Were Away</h2>
            <p className="mt-1 text-sm text-ink-600">{Math.round(s.report.days)} days passed.</p>
            <ul className="mt-3 list-inside list-disc space-y-1 font-serif">
              <li>{fmt(s.report.newFollowers)} people joined{s.report.lostFollowers ? `; ${fmt(s.report.lostFollowers)} drifted away` : ''}.</li>
              {s.report.milestones.map((m) => <li key={m}>{m}.</li>)}
              {s.report.notes.map((m) => <li key={m}>{m}</li>)}
              <li>{s.inbox.length ? `${s.inbox.length} ${s.inbox.length === 1 ? 'person is' : 'people are'} waiting to see you.` : 'Nobody is waiting for you.'}</li>
            </ul>
            <button className="btn mt-4 w-full bg-ink-900 text-white" onClick={() => { s.report = undefined; bump(); }} autoFocus>Back to work</button>
          </div>
        </div>
      )}

      {confirmNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card max-w-sm p-5" role="dialog" aria-modal="true" aria-label="Confirm">
            <p className="font-serif">Abandon {s.movementName ?? 'the group'} and everyone in it? This cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setConfirmNew(false)}>Keep going</button>
              <button className="btn-danger" onClick={async () => { await clearStory(); setConfirmNew(false); setSheet(null); setOutcome(null); setS(null); }}>Abandon</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
