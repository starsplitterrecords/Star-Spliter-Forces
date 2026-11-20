// Content validation: the gate every authored or AI-drafted batch must pass before shipping.
// Errors block the build; warnings go to editorial review.
import { BINDERS, ENDINGS, RECALL_TOKENS, RENDER_TOKENS } from './engine';
import { AGENDAS, type CardDef, type ContentLibrary, type Effects, ERAS, GAUGES, GROUPS, type RecallQuery, type Requires, SHAPES, STATUS_ORDER } from './types';

const MEMORY_KINDS = ['overruled', 'backed', 'passed_over', 'favoured', 'promise', 'broken_promise', 'credited', 'blamed', 'vindicated', 'embarrassed'];
const SETTINGS = ['private', 'meeting', 'public'];
const STANCES = ['none', 'endorsed', 'tolerated', 'reformed', 'condemned'];
const EMERGENT_ARGS = /^(none|endorsed|tolerated|reformed|condemned|underground)(:(starter|grown))?$/;

export interface ValidationReport {
  errors: string[];
  warnings: string[];
  stats: Record<string, number | Record<string, number>>;
}

const LIMITS = { text: 420, label: 80, reaction: 260, hint: 70, gauge: 40, loyalty: 30, group: 0.1 };
const STATS = ['recruitment', 'retention', 'awareness', 'campaign', 'income', 'reputation'];
const ENGINE_FLAGS = ['regional_ready', 'national_ready'];
const CHAR_FLAG_SUFFIXES = ['_disgruntled', '_devoted', '_left', '_rival', '_retired'];
const CMP = /^(>=|<=|>|<|=)?\s*-?[\d.]+$/;

function strings(e: Effects): string[] {
  const out: string[] = [];
  if (e.memory) out.push(e.memory);
  if (e.movementName) out.push(e.movementName);
  if (e.founderTitle) out.push(e.founderTitle);
  for (const m of e.modifiers ?? []) out.push(m.label);
  for (const c of e.custom ?? []) {
    out.push(c.id);
    for (const v of Object.values(c.values ?? {})) out.push(v);
  }
  for (const r of Object.values(e.role ?? {})) out.push(r);
  return out;
}

export function validateLibrary(lib: ContentLibrary): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const charIds = new Set(lib.characters.map((c) => c.id));
  const customIds = new Set(lib.customs.map((c) => c.id));
  const cardIds = new Set<string>();
  const setFlags = new Set<string>(ENGINE_FLAGS);
  for (const c of charIds) for (const s of CHAR_FLAG_SUFFIXES) setFlags.add(`${c}${s}`);
  const followTargets = new Set<string>();
  const perSpeaker: Record<string, number> = {};
  const perType: Record<string, number> = {};
  const perEra: Record<string, number> = {};

  // characters & customs
  const seenChar = new Set<string>();
  for (const c of lib.characters) {
    if (seenChar.has(c.id)) errors.push(`character ${c.id}: duplicate id`);
    seenChar.add(c.id);
    if (!AGENDAS.includes(c.agenda)) errors.push(`character ${c.id}: unknown agenda ${c.agenda}`);
    if (!GROUPS.includes(c.ally)) errors.push(`character ${c.id}: unknown ally group ${c.ally}`);
    if (!c.bio || c.bio.length < 40) warnings.push(`character ${c.id}: bio is thin`);
  }
  for (const c of lib.customs) {
    for (const [k, v] of Object.entries(c.props)) if (v < 0 || v > 100) errors.push(`custom ${c.id}: ${k}=${v} out of range`);
    if (c.category === 'practice' && (!c.noun || !c.phrase || !c.root)) errors.push(`custom ${c.id}: practices need noun, phrase and root`);
    if (c.champion && !charIds.has(c.champion)) errors.push(`custom ${c.id}: unknown champion ${c.champion}`);
    if (c.startedBy && !charIds.has(c.startedBy)) errors.push(`custom ${c.id}: unknown startedBy ${c.startedBy}`);
    if (c.emergent && !c.id.startsWith('emergent.')) warnings.push(`custom ${c.id}: emergent customs should use the emergent. prefix`);
  }
  const emergentCount = lib.customs.filter((c) => c.emergent).length;
  if (emergentCount < 6) warnings.push(`only ${emergentCount} emergent customs; members will run out of things to invent`);

  // pass 1: collect ids, flags, follow-up targets
  for (const card of lib.cards) {
    if (cardIds.has(card.id)) errors.push(`card ${card.id}: duplicate id`);
    cardIds.add(card.id);
    for (const ch of card.choices ?? []) {
      for (const f of ch.effects.flags ?? []) setFlags.add(f);
      if (ch.effects.leave?.length) for (const l of ch.effects.leave) setFlags.add(`${l.id}_${l.as}`);
      for (const f of ch.effects.followUps ?? []) followTargets.add(f.card);
    }
  }
  followTargets.add('found.garage'); // the engine opens with it

  // pass 2: each card
  const texts = new Map<string, string>();
  for (const card of lib.cards) {
    const where = `card ${card.id}`;
    perType[card.type] = (perType[card.type] ?? 0) + 1;
    const spk = typeof card.speaker === 'string' ? card.speaker : 'anon';
    perSpeaker[spk] = (perSpeaker[spk] ?? 0) + 1;
    for (const e of card.requires?.era ?? ['any']) perEra[e] = (perEra[e] ?? 0) + 1;
    if (!card.choices || card.choices.length !== 2) {
      errors.push(`${where}: must have exactly two choices`);
      continue;
    }
    // speaker
    if (typeof card.speaker === 'string') {
      const sp = card.speaker;
      if (sp.startsWith('agenda:')) {
        if (!AGENDAS.includes(sp.slice(7) as never)) errors.push(`${where}: unknown agenda speaker ${sp}`);
      } else if (sp.startsWith('champion:')) {
        if (!card.bind?.[sp.slice(9)]) errors.push(`${where}: champion speaker needs bind.${sp.slice(9)}`);
      } else if (sp === 'recall') {
        if (!card.recall) errors.push(`${where}: speaker “recall” needs a recall query`);
      } else if (!sp.startsWith('role:') && !['any', 'unhappy', 'devoted'].includes(sp) && !charIds.has(sp)) errors.push(`${where}: unknown speaker ${sp}`);
    } else if (!card.speaker.anon?.name || !card.speaker.anon?.role) errors.push(`${where}: anonymous speaker needs name and role`);
    // binds
    const ctxKeys = new Set<string>();
    for (const [k, b] of Object.entries(card.bind ?? {})) {
      const [name, ...rest] = b.split(':');
      if (!BINDERS[name]) errors.push(`${where}: unknown binder ${b}`);
      if (name === 'emergent' && rest.length && !EMERGENT_ARGS.test(rest.join(':'))) errors.push(`${where}: bad emergent binder ${b}`);
      if (name === 'emergent') ['emergentBy', 'ctx.emergentBy'].forEach((x) => ctxKeys.add(x));
      ctxKeys.add(k);
      ctxKeys.add(`ctx.${k}`);
      if (k.startsWith('practice')) ctxKeys.add(`${k}Noun`);
      if (k === 'past') ['pastText', 'pastDay', 'pastWho'].forEach((x) => ctxKeys.add(x));
    }
    // memory, setting, shape
    if (card.recall) {
      RECALL_TOKENS.forEach((x) => ctxKeys.add(x));
      checkRecall(card.recall, where, charIds, errors);
      const all = [card.text, ...(card.variants ?? [])].join(' ');
      if (!/\{m[A-Z]\w*\}/.test(all)) warnings.push(`${where}: recalls a memory but never quotes it`);
    }
    if (card.setting && !SETTINGS.includes(card.setting)) errors.push(`${where}: unknown setting ${card.setting}`);
    if (!card.shape) warnings.push(`${where}: no comic shape tagged`);
    else if (!SHAPES.includes(card.shape)) errors.push(`${where}: unknown shape ${card.shape}`);
    if (card.twist && !['right_wrong_reasons', 'wrong_reasonable'].includes(card.twist)) errors.push(`${where}: unknown twist ${card.twist}`);
    if (card.twist && (typeof card.speaker !== 'string' || !charIds.has(card.speaker))) warnings.push(`${where}: a twist should belong to a named character`);
    // requires
    const r = card.requires ?? {};
    if (r.memory) checkRecall(r.memory, `${where} requires.memory`, charIds, errors);
    for (const e of r.era ?? []) if (!ERAS.includes(e)) errors.push(`${where}: unknown era ${e}`);
    for (const f of [...(r.flags ?? []), ...(r.anyFlags ?? [])]) if (!setFlags.has(f)) warnings.push(`${where}: requires flag “${f}” that no card sets`);
    for (const [id, e] of Object.entries(r.customs ?? {})) {
      if (!customIds.has(id)) errors.push(`${where}: requires unknown custom ${id}`);
      const base = e.replace(/[+-]$/, '');
      if (!STATUS_ORDER.includes(base as never)) errors.push(`${where}: bad custom status ${e}`);
    }
    for (const [id, c] of Object.entries(r.chars ?? {})) {
      if (!charIds.has(id)) errors.push(`${where}: requires unknown character ${id}`);
      for (const v of [c.loyalty, c.influence]) if (v && !CMP.test(v)) errors.push(`${where}: bad comparison ${v}`);
    }
    for (const [g, e] of Object.entries(r.gauges ?? {})) {
      if (!GAUGES.includes(g as never)) errors.push(`${where}: unknown gauge ${g}`);
      if (!CMP.test(e!)) errors.push(`${where}: bad comparison ${e}`);
    }
    for (const g of Object.keys(r.groups ?? {})) if (!GROUPS.includes(g as never)) errors.push(`${where}: unknown group ${g}`);
    for (const v of [r.followers, r.day, r.decisions, r.cities, r.known]) if (v && !CMP.test(v)) errors.push(`${where}: bad comparison ${v}`);
    if (card.followUpOnly && !followTargets.has(card.id)) warnings.push(`${where}: follow-up only, but nothing schedules it`);

    // text + tokens
    const allowed = (tok: string) => {
      if (RENDER_TOKENS.includes(tok) || ctxKeys.has(tok)) return true;
      if (/^(c|C|role)\.(\w+)$/.test(tok)) return charIds.has(tok.split('.')[1]);
      if (tok.startsWith('custom.')) return customIds.has(tok.split('.')[1]);
      return false;
    };
    const checkTokens = (s: string, what: string) => {
      for (const m of s.matchAll(/\{([\w.]+)\}/g)) if (!allowed(m[1])) errors.push(`${where}: unknown token {${m[1]}} in ${what}`);
    };
    if (!card.text || card.text.length > LIMITS.text) errors.push(`${where}: text missing or longer than ${LIMITS.text}`);
    checkTokens(card.text, 'text');
    for (const [vi, v] of (card.variants ?? []).entries()) {
      if (v.length > LIMITS.text) errors.push(`${where}: variant ${vi} longer than ${LIMITS.text}`);
      checkTokens(v, `variant ${vi}`);
    }
    if (card.variants && (card.speaker === 'unhappy' || card.speaker === 'devoted') && card.once) warnings.push(`${where}: recurring speakers usually should not be once-only`);
    const norm = card.text.toLowerCase().replace(/\{[\w.]+\}/g, '').replace(/[^a-z ]/g, '');
    if (texts.has(norm)) errors.push(`${where}: duplicate text of ${texts.get(norm)}`);
    texts.set(norm, card.id);

    card.choices.forEach((ch, i) => {
      const w = `${where} choice ${i ? 'B' : 'A'}`;
      if (!ch.label || ch.label.length > LIMITS.label) errors.push(`${w}: label missing or too long`);
      if (!ch.reaction || ch.reaction.length > LIMITS.reaction) errors.push(`${w}: reaction missing or too long`);
      if (ch.hint && ch.hint.length > LIMITS.hint) warnings.push(`${w}: hint is long`);
      checkTokens(ch.label, `${w} label`);
      checkTokens(ch.reaction, `${w} reaction`);
      for (const s of strings(ch.effects)) checkTokens(s, `${w} effects`);
      const e = ch.effects;
      for (const [g, v] of Object.entries(e.gauges ?? {})) {
        if (!GAUGES.includes(g as never)) errors.push(`${w}: unknown gauge ${g}`);
        if (Math.abs(v!) > LIMITS.gauge) errors.push(`${w}: gauge change ${v} exceeds ±${LIMITS.gauge}`);
      }
      for (const tag of e.serves ?? []) if (!AGENDAS.includes(tag.replace(/^-/, '') as never)) errors.push(`${w}: serves unknown agenda ${tag}`);
      for (const [id, v] of [...Object.entries(e.loyalty ?? {}), ...Object.entries(e.influence ?? {})]) {
        if (!charIds.has(id)) errors.push(`${w}: unknown character ${id}`);
        if (Math.abs(v) > LIMITS.loyalty) errors.push(`${w}: loyalty/influence change ${v} exceeds ±${LIMITS.loyalty}`);
      }
      for (const [g, v] of Object.entries(e.groups ?? {})) {
        if (!GROUPS.includes(g as never)) errors.push(`${w}: unknown group ${g}`);
        if (Math.abs(v!) > LIMITS.group) errors.push(`${w}: group shift ${v} exceeds ±${LIMITS.group}`);
      }
      for (const c of e.custom ?? []) {
        const m = /^\{ctx\.(\w+)\}$/.exec(c.id);
        if (m ? !card.bind?.[m[1]] : !customIds.has(c.id)) errors.push(`${w}: unknown custom ${c.id}`);
        if (c.status && !STATUS_ORDER.includes(c.status)) errors.push(`${w}: bad status ${c.status}`);
      }
      for (const f of e.followUps ?? []) {
        if (!cardIds.has(f.card)) errors.push(`${w}: follow-up to unknown card ${f.card}`);
        if (f.delay < 0) errors.push(`${w}: negative follow-up delay`);
        if (f.maxDelay != null && f.maxDelay < f.delay) errors.push(`${w}: follow-up maxDelay is before delay`);
        if (f.speaker && f.speaker !== 'same' && !charIds.has(f.speaker)) errors.push(`${w}: follow-up speaker ${f.speaker} unknown`);
        for (const q of [f.requires, f.cancelIf]) checkRequiresFlags(q, w, setFlags, warnings);
      }
      for (const m of e.remember ?? []) {
        if (!MEMORY_KINDS.includes(m.kind)) errors.push(`${w}: unknown memory kind ${m.kind}`);
        if (!['speaker', 'other', 'starter'].includes(m.who) && !charIds.has(m.who)) errors.push(`${w}: remember who “${m.who}” unknown`);
        if (m.who === 'other' && !card.recall) errors.push(`${w}: remember who “other” needs a recall query`);
        if (m.who === 'starter' && !Object.values(card.bind ?? {}).some((b) => b.startsWith('emergent'))) errors.push(`${w}: remember who “starter” needs an emergent binder`);
      }
      if ((e.recall || e.otherLoyalty) && !card.recall) errors.push(`${w}: recall effects need a recall query on the card`);
      if ((e.stance || e.starterLoyalty) && !card.bind?.emergent) errors.push(`${w}: stance needs bind.emergent`);
      if (e.stance && !STANCES.includes(e.stance)) errors.push(`${w}: unknown stance ${e.stance}`);
      for (const id of e.join ?? []) if (!charIds.has(id)) errors.push(`${w}: join unknown character ${id}`);
      for (const l of e.leave ?? []) if (!charIds.has(l.id)) errors.push(`${w}: leave unknown character ${l.id}`);
      for (const id of Object.keys(e.role ?? {})) if (!charIds.has(id)) errors.push(`${w}: role for unknown character ${id}`);
      for (const m of e.modifiers ?? []) {
        if (!STATS.includes(m.stat)) errors.push(`${w}: unknown modifier stat ${m.stat}`);
        if (m.days <= 0 || m.mult <= 0) errors.push(`${w}: modifier needs positive days and multiplier`);
      }
      if (e.era && !ERAS.includes(e.era)) errors.push(`${w}: unknown era ${e.era}`);
      if (ch.input && !/^(movementName|founderTitle|custom:[\w.]+)$/.test(ch.input.target)) errors.push(`${w}: bad input target`);
      const consequential = Object.keys(e).filter((k) => k !== 'memory').length;
      if (!consequential) warnings.push(`${w}: has no mechanical effect`);
    });
    if (card.choices[0].label === card.choices[1].label) errors.push(`${where}: both choices have the same label`);
    if (card.choices[0].reaction === card.choices[1].reaction && !card.id.includes('compete')) warnings.push(`${where}: both choices share a reaction`);
  }

  // shapes and twists across the library
  const shapes: Record<string, number> = {};
  for (const c of lib.cards) if (c.shape) shapes[c.shape] = (shapes[c.shape] ?? 0) + 1;
  const twists: Record<string, number> = {};
  for (const c of lib.cards) if (c.twist && typeof c.speaker === 'string') twists[c.speaker] = (twists[c.speaker] ?? 0) + 1;
  for (const c of lib.characters) if (!twists[c.id]) warnings.push(`character ${c.id}: never right for the wrong reasons or wrong for reasonable ones (no twist cards)`);

  // crisis coverage
  for (const g of GAUGES) for (const hl of ['high', 'low']) {
    if (!cardIds.has(`crisis.${g}.${hl}`)) errors.push(`missing crisis card crisis.${g}.${hl}`);
    if (!ENDINGS[`${g}.${hl}`]) errors.push(`missing ending ${g}.${hl}`);
  }
  // balance of speakers
  const named = Object.entries(perSpeaker).filter(([k]) => charIds.has(k));
  const max = Math.max(...named.map(([, v]) => v));
  for (const [k, v] of named) if (v < max / 4) warnings.push(`speaker ${k} has only ${v} cards (max ${max}); consider more`);

  return {
    errors,
    warnings,
    stats: { cards: lib.cards.length, characters: lib.characters.length, customs: lib.customs.length, emergent: emergentCount, perType, perSpeaker, perEra, shapes, twists, flags: setFlags.size },
  };
}

function checkRecall(q: RecallQuery, where: string, charIds: Set<string>, errors: string[]) {
  for (const k of [q.kind ?? []].flat()) if (!MEMORY_KINDS.includes(k)) errors.push(`${where}: unknown memory kind ${k}`);
  if (q.who && !['any', 'speaker'].includes(q.who) && !charIds.has(q.who)) errors.push(`${where}: recall who “${q.who}” unknown`);
  for (const x of q.exclude ?? []) if (!charIds.has(x)) errors.push(`${where}: recall exclude “${x}” unknown`);
  if (q.minAgo != null && q.maxAgo != null && q.maxAgo < q.minAgo) errors.push(`${where}: recall window is empty`);
}

function checkRequiresFlags(q: Requires | undefined, where: string, setFlags: Set<string>, warnings: string[]) {
  for (const f of [...(q?.flags ?? []), ...(q?.anyFlags ?? []), ...(q?.notFlags ?? [])]) if (!setFlags.has(f)) warnings.push(`${where}: chain condition on flag “${f}” that nothing sets`);
}

export type { CardDef };
