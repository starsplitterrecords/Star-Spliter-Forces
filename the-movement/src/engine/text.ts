// Template filling for the procedural narrative system.
import { city, countryName } from './geo';
import type { Doctrine, Faction, GameState, OppositionOrg } from './types';

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const title = (s: string) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());

export interface TextExtra {
  cityId?: number;
  doctrine?: Doctrine;
  faction?: Faction;
  org?: OppositionOrg;
  other?: Record<string, string>;
}

export function makeCtx(state: GameState, extra: TextExtra = {}): Record<string, string> {
  const mv = state.movement;
  const d = extra.doctrine ?? mv.doctrines[0];
  const m = d.motif;
  const c = extra.cityId != null ? city(extra.cityId) : mv.headquarters.cityId ? city(mv.headquarters.cityId) : undefined;
  const ctx: Record<string, string> = {
    F: mv.pluralFollowers,
    f: mv.singularFollower,
    Ism: mv.ideologyName,
    Adj: mv.adjective,
    Title: mv.founderTitle,
    Founder: mv.founderTitle,
    founderName: mv.founderName,
    city: c?.name ?? 'the capital',
    country: c ? countryName(c.cc) : 'the nation',
    admin: c?.admin ?? 'the region',
    noun: m.noun,
    Noun: title(m.noun),
    plural: m.plural,
    Plural: title(m.plural),
    verb: m.verb,
    heresy: m.heresy,
    Heresy: cap(m.heresy),
    purism: m.purism,
    radical: m.radical,
    industry: m.industry,
    Industry: title(m.industry),
    shortage: m.shortage,
    Shortage: title(m.shortage),
    measure: m.measure,
    Measure: title(m.measure),
    showcase: m.showcase,
    committee: m.committee,
    orgNoun: m.orgNoun,
    day: m.dayName ?? `International ${title(m.noun)} Day`,
    doctrine: d.currentText,
    original: d.originalText,
    meeting: mv.meetingName.toLowerCase(),
    Meeting: mv.meetingName,
    meetingS: mv.meetingSingular.toLowerCase(),
    MeetingS: mv.meetingSingular,
    outpost: mv.outpostName,
    outpostS: mv.outpostSingular,
    animal: mv.spiritAnimal.toLowerCase(),
    Animal: mv.spiritAnimal,
    hq: mv.headquarters.type.toLowerCase(),
    faction: extra.faction?.name ?? 'the splinter faction',
    factionMembers: extra.faction?.members ?? 'dissidents',
    org: extra.org?.name ?? 'the opposition',
    motto: mv.motto,
  };
  if (extra.other) Object.assign(ctx, extra.other);
  return ctx;
}

export function fill(template: string, ctx: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in ctx ? ctx[k] : `{${k}}`));
}

export function headlineCase(s: string): string {
  return s
    .split(' ')
    .map((w, i) => (i > 0 && /^(a|an|the|of|in|on|at|to|for|and|or|but|by|with|as|is)$/i.test(w) ? w.toLowerCase() : cap(w)))
    .join(' ');
}

export function fmt(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(a >= 1e10 ? 1 : 2)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`;
  if (a >= 1e4) return `${(n / 1e3).toFixed(a >= 1e5 ? 0 : 1)}K`;
  return Math.round(n).toLocaleString('en-US');
}

export function pct(x: number, digits = 1): string {
  if (x > 0 && x < 0.0001) return '<0.01%';
  return `${(x * 100).toFixed(digits)}%`;
}

export function duration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.round((seconds % 86400) / 3600)}h`;
}
