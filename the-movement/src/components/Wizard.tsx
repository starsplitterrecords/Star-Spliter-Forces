'use client';
import { useMemo, useState } from 'react';
import {
  BANNER_COLORS,
  CUSTOM_PRESETS,
  FOUNDER_NAMES,
  FOUNDER_TITLES,
  HQ_FEATURES,
  HQ_STYLES,
  HQ_TYPES,
  IDEOLOGY_EXAMPLES,
  MEETING_NAMES,
  MOTTOS,
  OUTPOST_NAMES,
  PATTERNS,
  PRINCIPLE_SUGGESTIONS,
  SHAPES,
  SPIRIT_ANIMALS,
  SYMBOLS,
} from '@/content/presets';
import { MODES } from '@/engine/config';
import { CITIES, countryName } from '@/engine/geo';
import { createMovement, defaultFounderTitle, deriveNames, generateProclamation, interpretDoctrine, moderate } from '@/engine/ideology';
import { randomSeed } from '@/engine/rng';
import { newGame } from '@/engine/sim';
import { fmt } from '@/engine/text';
import type { Banner, DoctrineCategory, GameMode, Temperament } from '@/engine/types';
import { play } from '@/lib/audio';
import { loadLegacy, saveSlot } from '@/lib/storage';
import { useStore } from '@/store/game';
import { Emblem } from './Emblem';
import { HQVisual } from './HQVisual';
import { Slider } from './ui';

interface Draft {
  ideology: string;
  singular: string;
  plural: string;
  adjective: string;
  shortName: string;
  founderName: string;
  title: string;
  customTitle: string;
  hqCityId: number;
  hqType: string;
  hqStyle: string;
  hqFeatures: string[];
  principles: string[];
  animal: string;
  temperament: Temperament;
  customs: { category: DoctrineCategory; text: string }[];
  meeting: string;
  outpost: string;
  banner: Banner;
  motto: string;
  mode: GameMode;
}

const r = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const HQ_CITY_POOL = CITIES.filter((c) => c.pop > 150_000 && c.pop < 3_000_000);

function randomDraft(): Draft {
  const customs: Draft['customs'] = [];
  for (const p of CUSTOM_PRESETS) if (Math.random() < 0.55) customs.push({ category: p.category, text: r(p.options) });
  if (!customs.length) customs.push({ category: 'clothing', text: 'Wear oversized hats.' });
  const pr = [...PRINCIPLE_SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2));
  const c1 = r(BANNER_COLORS);
  let c2 = r(BANNER_COLORS);
  while (c2 === c1) c2 = r(BANNER_COLORS);
  return {
    ideology: r(IDEOLOGY_EXAMPLES),
    singular: '', plural: '', adjective: '', shortName: '',
    founderName: r(FOUNDER_NAMES),
    title: 'Master',
    customTitle: '',
    hqCityId: r(HQ_CITY_POOL).id,
    hqType: r(HQ_TYPES),
    hqStyle: r(HQ_STYLES),
    hqFeatures: [r(HQ_FEATURES)],
    principles: pr,
    animal: r(SPIRIT_ANIMALS).name,
    temperament: { emotion: Math.floor(Math.random() * 100), social: Math.floor(Math.random() * 100), conflict: Math.floor(Math.random() * 100), activity: Math.floor(Math.random() * 100) },
    customs,
    meeting: r(MEETING_NAMES),
    outpost: r(OUTPOST_NAMES),
    banner: { primary: c1, secondary: c2, accent: '#f4eedf', symbol: r(SYMBOLS), shape: r(SHAPES), pattern: r(PATTERNS) },
    motto: r(MOTTOS),
    mode: 'standard',
  };
}

const STEPS = ['Name', 'Founder', 'Headquarters', 'Beliefs', 'Spirit Animal', 'Temperament', 'Customs', 'Meetings', 'Outposts', 'Banner', 'Proclamation'] as const;

function titleFor(d: Draft) {
  if (d.title === 'Custom') return d.customTitle.trim() || defaultFounderTitle(d.founderName);
  return defaultFounderTitle(d.founderName, d.title);
}

export default function Wizard({ slot, onCancel }: { slot: number; onCancel: () => void }) {
  const [d, setD] = useState<Draft>(() => ({ ...randomDraft(), ideology: '', principles: [''], customs: [] }));
  const [step, setStep] = useState(0);
  const [cityQuery, setCityQuery] = useState('');
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [founding, setFounding] = useState(false);
  const { setGame, setScreen, globalSettings } = useStore();
  const up = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const names = deriveNames(d.ideology || 'Thing');
  const plural = d.plural || names.pluralFollowers;
  const singular = d.singular || names.singularFollower;
  const hqCity = CITIES.find((c) => c.id === d.hqCityId)!;

  const check = (key: string, text: string) => {
    const m = moderate(text);
    setErrors((e) => {
      const n = { ...e };
      if (!m.ok) n[key] = m.message;
      else delete n[key];
      return n;
    });
    return m.ok;
  };

  const cityResults = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return CITIES.filter((c) => c.name.toLowerCase().startsWith(q) || `${c.name}, ${countryName(c.cc)}`.toLowerCase().includes(q)).slice(0, 8);
  }, [cityQuery]);

  const movementPreview = useMemo(() => {
    const doctrines = [
      ...d.principles.filter((p) => p.trim()).map((p, i) => interpretDoctrine(p, 'principle', 'custom', `p${i}`)),
      ...d.customs.map((c, i) => interpretDoctrine(c.text, c.category, 'preset', `c${i}`)),
    ];
    return doctrines;
  }, [d.principles, d.customs]);

  const buildMovement = (seed: number) =>
    createMovement({
      ideologyName: d.ideology || 'Thing',
      singularFollower: d.singular || undefined,
      pluralFollowers: d.plural || undefined,
      adjective: d.adjective || undefined,
      shortName: d.shortName || undefined,
      founderName: d.founderName || 'Founder',
      founderTitle: titleFor(d),
      headquarters: { cityId: d.hqCityId, type: d.hqType, style: d.hqStyle, features: d.hqFeatures },
      spiritAnimal: d.animal,
      banner: d.banner,
      motto: d.motto,
      temperament: d.temperament,
      principles: d.principles,
      customs: d.customs,
      meetingName: d.meeting,
      outpostName: d.outpost,
      gameMode: d.mode,
      worldSeed: seed,
    });

  const proclamation = useMemo(() => {
    if (step !== STEPS.length - 1) return '';
    return generateProclamation(buildMovement(1), hqCity.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, d]);

  const allText = [d.ideology, d.founderName, d.customTitle, d.motto, d.hqType, d.meeting, d.outpost, d.animal, d.singular, d.plural, d.adjective, ...d.principles, ...d.customs.map((c) => c.text)].join(' \n ');
  const globalCheck = moderate(allText);

  const found = async () => {
    if (!globalCheck.ok) return;
    setFounding(true);
    const seed = randomSeed();
    const mv = buildMovement(seed);
    mv.proclamation = generateProclamation(mv, hqCity.name);
    const legacy = await loadLegacy();
    const g = newGame(mv, { seed, slot, settings: globalSettings, legacy: legacy.length ? legacy : undefined });
    await saveSlot(g);
    play('milestone');
    setGame(g);
    setScreen('game');
  };

  const toggleCustom = (category: DoctrineCategory, text: string) => {
    const has = d.customs.some((c) => c.text === text);
    up({ customs: has ? d.customs.filter((c) => c.text !== text) : [...d.customs, { category, text }] });
  };

  const sections = [
    // 1 name
    <section key="name" aria-labelledby="h-name">
      <h2 id="h-name" className="font-serif text-2xl font-bold">What is the name of your unquestionably correct philosophy?</h2>
      <div className="mt-4 flex items-center gap-2">
        <label htmlFor="ideology" className="sr-only">
          Ideology name
        </label>
        <input id="ideology" className="input max-w-xs text-lg" placeholder="Hat" value={d.ideology} onChange={(e) => up({ ideology: e.target.value })} onBlur={(e) => check('ideology', e.target.value)} maxLength={24} />
        <span className="font-serif text-2xl text-brass-300">{d.ideology ? names.ideologyName.slice(names.ideologyName.length - 3) : 'ism'}</span>
        <button className="btn-ghost btn-sm" onClick={() => up({ ideology: r(IDEOLOGY_EXAMPLES), singular: '', plural: '', adjective: '' })}>
          🎲 Randomize
        </button>
      </div>
      <p className="mt-2 text-sm text-ink-300">Examples: {IDEOLOGY_EXAMPLES.slice(0, 7).map((x) => `${x}ism`).join(', ')}.</p>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(
          [
            ['singular', 'Singular follower', names.singularFollower],
            ['plural', 'Plural followers', names.pluralFollowers],
            ['adjective', 'Adjective', names.adjective],
            ['shortName', 'Short movement name', `the ${plural}`],
          ] as const
        ).map(([k, label, ph]) => (
          <div key={k}>
            <label className="label" htmlFor={`f-${k}`}>
              {label} <span className="normal-case tracking-normal text-ink-500">(override)</span>
            </label>
            <input id={`f-${k}`} className="input mt-1" placeholder={ph} value={d[k]} onChange={(e) => up({ [k]: e.target.value } as Partial<Draft>)} onBlur={(e) => check(k, e.target.value)} />
          </div>
        ))}
      </div>
    </section>,
    // 2 founder
    <section key="founder" aria-labelledby="h-founder">
      <h2 id="h-founder" className="font-serif text-2xl font-bold">What is your name?</h2>
      <input aria-label="Founder name" className="input mt-4 max-w-xs text-lg" value={d.founderName} onChange={(e) => up({ founderName: e.target.value })} onBlur={(e) => check('founder', e.target.value)} maxLength={40} />
      <p className="mt-4 font-serif text-lg">
        From now on, you shall be known as <strong className="text-brass-300">{titleFor(d)}</strong>
      </p>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Honorary title">
        {[...FOUNDER_TITLES, 'Custom'].map((t) => (
          <button key={t} role="radio" aria-checked={d.title === t} className={`chip ${d.title === t ? 'chip-on' : 'chip-off'}`} onClick={() => up({ title: t })}>
            {t}
          </button>
        ))}
      </div>
      {d.title === 'Custom' && <input aria-label="Custom title" className="input mt-3 max-w-sm" placeholder="Supreme Overseer of Elevation" value={d.customTitle} onChange={(e) => up({ customTitle: e.target.value })} onBlur={(e) => check('title', e.target.value)} />}
    </section>,
    // 3 HQ
    <section key="hq" aria-labelledby="h-hq">
      <h2 id="h-hq" className="font-serif text-2xl font-bold">Where shall your great movement begin?</h2>
      <div className="relative mt-4 max-w-md">
        <label className="label" htmlFor="hq-city">
          Starting city
        </label>
        <input id="hq-city" className="input mt-1" placeholder={`${hqCity.name}, ${countryName(hqCity.cc)}`} value={cityQuery} onChange={(e) => setCityQuery(e.target.value)} autoComplete="off" />
        {cityResults.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-ink-600 bg-ink-850" role="listbox">
            {cityResults.map((c) => (
              <li key={c.id}>
                <button
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-ink-700"
                  role="option"
                  aria-selected={c.id === d.hqCityId}
                  onClick={() => {
                    up({ hqCityId: c.id });
                    setCityQuery('');
                  }}
                >
                  {c.name}, {c.admin.replace(/ Region$/, '')}, {countryName(c.cc)} <span className="text-ink-400">· {fmt(c.pop)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-sm text-ink-300">
          Selected: <strong>{hqCity.name}</strong>, {countryName(hqCity.cc)}{' '}
          <button className="ml-2 text-brass-300 underline" onClick={() => up({ hqCityId: r(HQ_CITY_POOL).id })}>
            random city
          </button>
        </p>
      </div>
      <div className="label mt-5">Nature of the headquarters</div>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Headquarters type">
        {HQ_TYPES.map((t) => (
          <button key={t} role="radio" aria-checked={d.hqType === t} className={`chip ${d.hqType === t ? 'chip-on' : 'chip-off'}`} onClick={() => up({ hqType: t })}>
            {t}
          </button>
        ))}
        <input aria-label="Custom headquarters" className="input w-48" placeholder="Custom…" onBlur={(e) => e.target.value.trim() && check('hq', e.target.value) && up({ hqType: e.target.value.trim() })} />
      </div>
      <div className="label mt-5">What does it look like?</div>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Architectural style">
        {HQ_STYLES.map((t) => (
          <button key={t} role="radio" aria-checked={d.hqStyle === t} className={`chip ${d.hqStyle === t ? 'chip-on' : 'chip-off'}`} onClick={() => up({ hqStyle: t })}>
            {t}
          </button>
        ))}
      </div>
      <div className="label mt-4">Distinctive features (up to 3)</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {HQ_FEATURES.map((t) => {
          const on = d.hqFeatures.includes(t);
          return (
            <button key={t} aria-pressed={on} className={`chip ${on ? 'chip-on' : 'chip-off'}`} onClick={() => up({ hqFeatures: on ? d.hqFeatures.filter((x) => x !== t) : [...d.hqFeatures, t].slice(-3) })}>
              {t}
            </button>
          );
        })}
      </div>
    </section>,
    // 4 beliefs
    <section key="beliefs" aria-labelledby="h-beliefs">
      <h2 id="h-beliefs" className="font-serif text-2xl font-bold">What truths has the world foolishly overlooked?</h2>
      <p className="mt-1 text-sm text-ink-300">One to three founding principles. These will haunt the movement forever.</p>
      <div className="mt-4 space-y-3">
        {d.principles.map((p, i) => (
          <div key={i} className="flex gap-2">
            <label className="sr-only" htmlFor={`pr-${i}`}>
              Principle {i + 1}
            </label>
            <input
              id={`pr-${i}`}
              className="input"
              value={p}
              placeholder={PRINCIPLE_SUGGESTIONS[i]}
              maxLength={140}
              onChange={(e) => up({ principles: d.principles.map((x, j) => (j === i ? e.target.value : x)) })}
              onBlur={(e) => check(`pr${i}`, e.target.value)}
            />
            <button className="btn-ghost btn-sm" aria-label={`Random principle ${i + 1}`} onClick={() => up({ principles: d.principles.map((x, j) => (j === i ? r(PRINCIPLE_SUGGESTIONS) : x)) })}>
              🎲
            </button>
            {d.principles.length > 1 && (
              <button className="btn-ghost btn-sm" aria-label={`Remove principle ${i + 1}`} onClick={() => up({ principles: d.principles.filter((_, j) => j !== i) })}>
                ✕
              </button>
            )}
          </div>
        ))}
        {d.principles.length < 3 && (
          <button className="btn-ghost btn-sm" onClick={() => up({ principles: [...d.principles, ''] })}>
            + Add principle
          </button>
        )}
      </div>
    </section>,
    // 5 animal
    <section key="animal" aria-labelledby="h-animal">
      <h2 id="h-animal" className="font-serif text-2xl font-bold">Choose your spirit animal</h2>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Spirit animal">
        {SPIRIT_ANIMALS.map((a) => (
          <button key={a.name} role="radio" aria-checked={d.animal === a.name} className={`rounded-md border p-3 text-left ${d.animal === a.name ? 'border-brass-400 bg-brass-400/10' : 'border-ink-600 bg-ink-850 hover:border-ink-400'}`} onClick={() => up({ animal: a.name })}>
            <div className="text-2xl" aria-hidden>
              {a.glyph}
            </div>
            <div className="font-semibold">{a.name}</div>
            <div className="text-xs text-ink-300">{a.trait}</div>
          </button>
        ))}
      </div>
      <input aria-label="Custom spirit animal" className="input mt-3 max-w-xs" placeholder="Custom animal…" onBlur={(e) => e.target.value.trim() && check('animal', e.target.value) && up({ animal: e.target.value.trim() })} />
      <p className="mt-2 text-xs text-ink-400">No animal is objectively superior. Some are merely more dignified.</p>
    </section>,
    // 6 temperament
    <section key="temper" aria-labelledby="h-temper" className="space-y-5">
      <h2 id="h-temper" className="font-serif text-2xl font-bold">Define the philosophy&apos;s temperament</h2>
      <Slider label="Emotional outlook" left="Laughter" right="Tears" value={d.temperament.emotion} onChange={(v) => up({ temperament: { ...d.temperament, emotion: v } })} />
      <Slider label="Social philosophy" left="Love" right="Hate" value={d.temperament.social} onChange={(v) => up({ temperament: { ...d.temperament, social: v } })} />
      <Slider label="Conflict disposition" left="Peace" right="War" value={d.temperament.conflict} onChange={(v) => up({ temperament: { ...d.temperament, conflict: v } })} />
      <Slider label="Organizational behavior" left="Active" right="Passive" value={d.temperament.activity} onChange={(v) => up({ temperament: { ...d.temperament, activity: v } })} />
      <p className="text-xs text-ink-400">
        “Hate” and “War” here mean theatrical grudges, competitive zeal and dramatic proclamations — all entirely fictional. Contradictory combinations are permitted and, frankly, encouraged.
      </p>
    </section>,
    // 7 customs
    <section key="customs" aria-labelledby="h-customs">
      <h2 id="h-customs" className="font-serif text-2xl font-bold">People should always…</h2>
      <div className="mt-4 space-y-4">
        {CUSTOM_PRESETS.map((p) => (
          <fieldset key={p.category}>
            <legend className="label">{p.label}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {p.options.map((o) => {
                const on = d.customs.some((c) => c.text === o);
                return (
                  <button key={o} aria-pressed={on} className={`chip ${on ? 'chip-on' : 'chip-off'}`} onClick={() => toggleCustom(p.category, o)}>
                    {o}
                  </button>
                );
              })}
              {d.customs
                .filter((c) => c.category === p.category && !p.options.includes(c.text))
                .map((c) => (
                  <button key={c.text} aria-pressed className="chip chip-on" onClick={() => toggleCustom(p.category, c.text)}>
                    {c.text} ✕
                  </button>
                ))}
              <form
                className="flex gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = (customInputs[p.category] ?? '').trim();
                  if (v && check(`custom-${p.category}`, v)) {
                    toggleCustom(p.category, v);
                    setCustomInputs((x) => ({ ...x, [p.category]: '' }));
                  }
                }}
              >
                <input aria-label={`Custom ${p.label} commandment`} className="input w-52 py-1.5" placeholder="Custom…" value={customInputs[p.category] ?? ''} onChange={(e) => setCustomInputs((x) => ({ ...x, [p.category]: e.target.value }))} />
                <button className="btn-ghost btn-sm" type="submit">
                  Add
                </button>
              </form>
              {errors[`custom-${p.category}`] && <p className="w-full text-sm text-seal-500">{errors[`custom-${p.category}`]}</p>}
            </div>
          </fieldset>
        ))}
      </div>
    </section>,
    // 8 meetings
    <section key="meet" aria-labelledby="h-meet">
      <h2 id="h-meet" className="font-serif text-2xl font-bold">What shall your gatherings be called?</h2>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Meeting name">
        {MEETING_NAMES.map((t) => (
          <button key={t} role="radio" aria-checked={d.meeting === t} className={`chip ${d.meeting === t ? 'chip-on' : 'chip-off'}`} onClick={() => up({ meeting: t })}>
            {t}
          </button>
        ))}
        <input aria-label="Custom meeting name" className="input w-52" placeholder="Custom (plural)…" onBlur={(e) => e.target.value.trim() && check('meeting', e.target.value) && up({ meeting: e.target.value.trim() })} />
      </div>
      <p className="mt-3 text-xs text-ink-400">All such names refer to imaginary, cartoonish get-togethers. Attendance is enthusiastic and voluntary.</p>
    </section>,
    // 9 outposts
    <section key="out" aria-labelledby="h-out">
      <h2 id="h-out" className="font-serif text-2xl font-bold">What shall your forward operating facilities be called?</h2>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Outpost name">
        {OUTPOST_NAMES.map((t) => (
          <button key={t} role="radio" aria-checked={d.outpost === t} className={`chip ${d.outpost === t ? 'chip-on' : 'chip-off'}`} onClick={() => up({ outpost: t })}>
            {t}
          </button>
        ))}
        <input aria-label="Custom outpost name" className="input w-52" placeholder="Custom (plural)…" onBlur={(e) => e.target.value.trim() && check('outpost', e.target.value) && up({ outpost: e.target.value.trim() })} />
      </div>
    </section>,
    // 10 banner
    <section key="banner" aria-labelledby="h-banner">
      <h2 id="h-banner" className="font-serif text-2xl font-bold">Banner and emblem</h2>
      {(['primary', 'secondary', 'accent'] as const).map((k) => (
        <div key={k} className="mt-4">
          <div className="label">{k} color</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {BANNER_COLORS.map((c) => (
              <button key={c} aria-label={`${k} ${c}`} aria-pressed={d.banner[k] === c} className={`h-8 w-8 rounded-full border-2 ${d.banner[k] === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} onClick={() => up({ banner: { ...d.banner, [k]: c } })} />
            ))}
            <input aria-label={`Custom ${k} color`} type="color" className="h-8 w-10 cursor-pointer rounded bg-transparent" value={d.banner[k]} onChange={(e) => up({ banner: { ...d.banner, [k]: e.target.value } })} />
          </div>
        </div>
      ))}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(
          [
            ['symbol', SYMBOLS],
            ['shape', SHAPES],
            ['pattern', PATTERNS],
          ] as const
        ).map(([k, opts]) => (
          <div key={k}>
            <div className="label">{k}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {opts.map((o) => (
                <button key={o} aria-pressed={d.banner[k] === o} className={`chip text-xs ${d.banner[k] === o ? 'chip-on' : 'chip-off'}`} onClick={() => up({ banner: { ...d.banner, [k]: o } as Banner })}>
                  {o === 'animal' ? `${d.animal}` : o}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <label className="label mt-4 block" htmlFor="motto">
        Motto (optional)
      </label>
      <div className="mt-1 flex gap-2">
        <input id="motto" className="input max-w-md" value={d.motto} maxLength={60} onChange={(e) => up({ motto: e.target.value })} onBlur={(e) => check('motto', e.target.value)} />
        <button className="btn-ghost btn-sm" onClick={() => up({ motto: r(MOTTOS) })} aria-label="Random motto">
          🎲
        </button>
      </div>
    </section>,
    // 11 proclamation
    <section key="procl" aria-labelledby="h-procl">
      <h2 id="h-procl" className="font-serif text-2xl font-bold">The Founding Proclamation</h2>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Difficulty">
        {(Object.keys(MODES) as GameMode[]).map((m) => (
          <button key={m} role="radio" aria-checked={d.mode === m} className={`rounded-md border p-2 text-left text-sm ${d.mode === m ? 'border-brass-400 bg-brass-400/10' : 'border-ink-600 bg-ink-850'}`} onClick={() => up({ mode: m })}>
            <div className="font-semibold">{MODES[m].label}</div>
            <div className="max-w-[220px] text-xs text-ink-300">{MODES[m].description}</div>
          </button>
        ))}
      </div>
      <div className="doc mt-4 p-5 font-serif">
        <div className="text-center text-xs uppercase tracking-[0.3em] text-ink-500">Official Proclamation · Document No. 1</div>
        <div className="mt-2 flex justify-center">
          <Emblem banner={d.banner} animal={d.animal} size={72} />
        </div>
        {proclamation.split('\n\n').map((p, i) => (
          <p key={i} className="mt-3 leading-relaxed">
            {p}
          </p>
        ))}
        <div className="mt-4 text-right">
          <span className="stamp">Approved</span>
        </div>
      </div>
      {!globalCheck.ok && <p className="mt-3 text-seal-500">{globalCheck.message}</p>}
      <button className="btn-primary mt-5 w-full py-4 font-serif text-xl tracking-widest" disabled={founding || !globalCheck.ok} onClick={found}>
        {founding ? 'FOUNDING…' : 'FOUND THE MOVEMENT'}
      </button>
    </section>,
  ];

  const errorList = Object.values(errors);
  return (
    <div className="flex h-full flex-col bg-ink-950">
      <header className="flex items-center justify-between gap-2 border-b border-ink-700 px-4 py-3">
        <div>
          <div className="label">Founding a Movement · Step {step + 1} of {STEPS.length}</div>
          <div className="font-serif text-lg font-bold">{STEPS[step]}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost btn-sm" onClick={() => setD({ ...randomDraft() })}>
            🎲 Randomize everything
          </button>
          <button className="btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </header>
      <nav aria-label="Wizard steps" className="flex gap-1 overflow-x-auto border-b border-ink-800 px-4 py-2 scroll-thin">
        {STEPS.map((s, i) => (
          <button key={s} className={`shrink-0 rounded px-2 py-1 text-xs ${i === step ? 'bg-brass-400 text-ink-950' : 'text-ink-300 hover:bg-ink-800'}`} onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined}>
            {i + 1}. {s}
          </button>
        ))}
      </nav>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8 scroll-thin">
          <div className="mx-auto max-w-3xl">
            {sections[step]}
            {errorList.length > 0 && (
              <div role="alert" className="mt-4 rounded-md border border-seal-500/50 bg-seal-500/10 p-3 text-sm text-seal-500">
                {errorList[0]}
              </div>
            )}
            <div className="mt-8 flex justify-between">
              <button className="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
                ← Back
              </button>
              {step < STEPS.length - 1 && (
                <button className="btn-primary" onClick={() => setStep(step + 1)}>
                  Continue →
                </button>
              )}
            </div>
          </div>
        </main>
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-ink-700 bg-ink-900 p-4 scroll-thin lg:block" aria-label="Live preview">
          <div className="label">Live preview</div>
          <div className="mt-3 flex items-center gap-3">
            <Emblem banner={d.banner} animal={d.animal} size={64} />
            <div>
              <div className="font-serif text-xl font-bold">{d.ideology ? names.ideologyName : '______ism'}</div>
              <div className="text-sm text-ink-300">
                {singular} / {plural}
              </div>
              <div className="text-xs italic text-ink-400">{d.motto}</div>
            </div>
          </div>
          <div className="mt-4 text-sm">
            <div>
              <span className="text-ink-400">Founder:</span> {titleFor(d)}
            </div>
            <div>
              <span className="text-ink-400">HQ:</span> {d.hqType} ({d.hqStyle}), {hqCity.name}
            </div>
            <div>
              <span className="text-ink-400">Spirit animal:</span> {d.animal}
            </div>
            <div>
              <span className="text-ink-400">Gatherings:</span> {d.meeting}
            </div>
            <div>
              <span className="text-ink-400">Outposts:</span> {d.outpost}
            </div>
          </div>
          <div className="mt-3 rounded-md bg-ink-850 p-2">
            <HQVisual type={d.hqType} banner={d.banner} level={0} width={260} />
          </div>
          <div className="label mt-4">Doctrines ({movementPreview.length})</div>
          <ul className="mt-2 space-y-2 text-sm">
            {movementPreview.map((m) => (
              <li key={m.id} className="rounded border border-ink-700 p-2">
                <div>{m.originalText}</div>
                <div className="mt-1 text-[11px] text-ink-400">
                  {m.category} · visibility {m.attributes.visibility} · controversy {m.attributes.controversy} · ambiguity {m.attributes.ambiguity}
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
