// The idle layer of THE MOVEMENT: the movement starts to run itself.
// - Local assemblies form in any town with enough members, level up as they grow, compound their own
//   membership every week and send people to start the next town over. That is the exponential part.
// - Members pay dues into a treasury. You invest it in what each character is good at.
// - The administrators (Martin, Rolf, Agnes, Constance) handle routine problems you leave waiting.
// - Once Bev runs the schedule, the weeks can move on their own, including (a little) while you are away.
import { city, distanceKm } from '../engine/geo';
import type { Rng } from '../engine/rng';
import { CARD_BY_ID, CHAR_BY_ID, choose, render } from './engine';
import type { CardDef, CardInstance, StoryState, WeekReport } from './types';

export const IDLE = {
  weekMs: 20_000, // with Auto on, a week passes every 20 seconds while the game is open
  offlineWeeks: 48, // and at most this many weeks pass while you are away
  dues: 0.05, // dollars per member per week
};

// ------------------------------------------------------------------ assemblies

export { ASSEMBLY_LEVELS } from './engine';
import { ASSEMBLY_LEVELS } from './engine';

export function assemblyName(level?: number): string | null {
  return level ? ASSEMBLY_LEVELS[level - 1].name : null;
}

export const lvl = (s: StoryState, id: string) => s.upgrades?.[id] ?? 0;

/** Assemblies develop on their own: they level up, compound their membership and seed the next town over. */
export function growAssemblies(s: StoryState, rng: Rng, out: WeekReport) {
  const welcome = 1 + 0.12 * lvl(s, 'welcome') + (s.chars.martin?.present ? 0.15 : 0);
  const buses = lvl(s, 'buses');
  let seeded = 0;
  for (const id of s.region) {
    const c = s.cities[id];
    if (c.rival) continue;
    // level from membership
    let level = 0;
    for (const L of ASSEMBLY_LEVELS) if (c.followers >= L.at) level++;
    if (level > (c.assembly ?? 0)) {
      c.assembly = level;
      if (level === 1) out.lines.push({ icon: '🏛️', text: `${city(id).name} has formed a local Circle. Nobody asked it to. It already has a snack schedule.` });
      else out.lines.push({ icon: '🏛️', text: `${city(id).name}’s ${assemblyName(level - 1)} is now a ${assemblyName(level)}.` });
    }
    if (!c.assembly) continue;
    // compound growth inside the town, slowing as the town fills up
    const pop = city(id).pop;
    const room = Math.max(0, 1 - c.followers / pop);
    const add = Math.floor(c.followers * (0.015 + 0.012 * c.assembly) * welcome * room * (0.6 + s.gauges.enthusiasm / 125));
    c.followers = Math.min(pop, c.followers + add);
    if (add > 0) out.gains![id] = (out.gains![id] ?? 0) + add;
    out.joined += add;
    // and from Assembly level up, they send people to start the next town over
    if (c.assembly >= 2 && rng.chance(Math.min(0.9, 0.12 * c.assembly + 0.08 * buses))) {
      const here = city(id);
      const next = s.region
        .filter((x) => !s.cities[x].rival && s.cities[x].followers === 0)
        .sort((a, b) => distanceKm(here, city(a)) - distanceKm(here, city(b)))[0];
      if (next != null) {
        const n = 4 + c.assembly * 4;
        s.cities[next].followers += n;
        s.cities[next].known = true;
        s.cities[next].awareness = Math.max(s.cities[next].awareness, 0.02);
        out.gains![next] = (out.gains![next] ?? 0) + n;
        out.joined += n;
        if (seeded++ < 2) out.lines.push({ icon: '🚌', text: `Members from ${city(id).name} drove over to ${city(next).name} and started something.` });
      }
    }
  }
}

// ------------------------------------------------------------------ the treasury

export interface Upgrade {
  id: string;
  who: string; // the character whose specialty it is (must be present)
  name: string;
  blurb: string;
  base: number; // cost of level 1
  max: number;
}

export const UPGRADES: Upgrade[] = [
  { id: 'billboards', who: 'dez', name: 'Dez’s billboards', blurb: 'Recruitment +10% per level, everywhere.', base: 40, max: 15 },
  { id: 'soup', who: 'priya', name: 'Priya’s soup kitchens', blurb: 'People stay: drift-away falls 10% per level.', base: 50, max: 15 },
  { id: 'naps', who: 'gary', name: 'Gary’s nap rooms', blurb: 'Calm: public attention settles lower, unity higher.', base: 60, max: 10 },
  { id: 'buses', who: 'bev', name: 'Bev’s buses', blurb: 'One more organizer per level, and assemblies reach new towns more often.', base: 100, max: 10 },
  { id: 'welcome', who: 'martin', name: 'Martin’s welcome committees', blurb: 'Assemblies grow 12% faster per level.', base: 80, max: 15 },
  { id: 'dues', who: 'rolf', name: 'Rolf’s dues collection', blurb: 'Income +30% per level.', base: 50, max: 15 },
  { id: 'records', who: 'agnes', name: 'Agnes’s record keeping', blurb: 'Administrators handle routine problems the week they arrive, more wisely.', base: 150, max: 1 },
];

export function upgradeCost(s: StoryState, u: Upgrade): number {
  return Math.round(u.base * Math.pow(3.2, lvl(s, u.id)));
}

export function canBuy(s: StoryState, u: Upgrade): { ok: boolean; why?: string } {
  if (lvl(s, u.id) >= u.max) return { ok: false, why: 'Fully built' };
  if (!s.chars[u.who]?.present) return { ok: false, why: `Needs ${CHAR_BY_ID.get(u.who)?.short ?? u.who}` };
  if ((s.money ?? 0) < upgradeCost(s, u)) return { ok: false, why: 'Not enough in the treasury' };
  return { ok: true };
}

export function buy(s: StoryState, id: string): boolean {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || !canBuy(s, u).ok) return false;
  s.money = (s.money ?? 0) - upgradeCost(s, u);
  s.upgrades = { ...(s.upgrades ?? {}), [id]: lvl(s, id) + 1 };
  if (id === 'buses') s.organizersFree += 1;
  s.chronicle.push({ day: s.day, text: `${u.name}: level ${lvl(s, id)}.` });
  return true;
}

export function weeklyIncome(s: StoryState, members: number): number {
  const rolf = s.chars.rolf?.present ? 1.5 : 1;
  return Math.floor(members * IDLE.dues * rolf * (1 + 0.3 * lvl(s, 'dues')) * (s.flags.dues != null ? 1.4 : 1));
}

// ------------------------------------------------------------------ administrators

const ADMINS = ['martin', 'rolf', 'agnes', 'constance'];

export function administrator(s: StoryState): string | undefined {
  return ADMINS.filter((id) => s.chars[id]?.present && s.chars[id].status === 'active').sort((a, b) => s.chars[b].influence - s.chars[a].influence)[0];
}

/** Story moments and emergencies wait for you; everything else can be delegated. */
export function needsYou(card: CardDef | undefined, inst: CardInstance): boolean {
  if (!card) return true;
  if (card.type === 'crisis' || inst.priority >= 50) return true;
  if (card.choices.some((c) => c.input)) return true; // naming things is yours
  return !!(card.once && (card.priority ?? 0) >= 3);
}

/** An administrator answers in their own style: their agenda first, then whatever keeps things steady. */
function delegatedChoice(s: StoryState, admin: string, card: CardDef): 0 | 1 {
  const agenda = CHAR_BY_ID.get(admin)!.agenda;
  const wise = lvl(s, 'records') > 0;
  const score = (i: 0 | 1) => {
    const e = card.choices[i].effects;
    let v = 0;
    if (e.serves?.includes(agenda)) v += wise ? 2 : 4;
    if (e.serves?.includes(`-${agenda}`)) v -= wise ? 2 : 4;
    for (const [g, d] of Object.entries(e.gauges ?? {})) {
      const now = s.gauges[g as keyof StoryState['gauges']];
      v -= (Math.abs(now + (d ?? 0) - 50) - Math.abs(now - 50)) / (wise ? 4 : 8);
    }
    return v;
  };
  return score(0) >= score(1) ? 0 : 1;
}

/** Hand waiting problems to an administrator. Returns how many were handled. */
export function delegate(s: StoryState, out: WeekReport, all: boolean): number {
  const admin = administrator(s);
  if (!admin) return 0;
  let n = 0;
  for (const inst of [...s.inbox]) {
    const card = CARD_BY_ID.get(inst.cardId);
    if (needsYou(card, inst)) continue;
    if (!all && (inst.week ?? s.week) >= s.week) continue;
    const i = delegatedChoice(s, admin, card!);
    const label = render(s, card!.choices[i].label, inst.ctx, inst.speaker);
    const r = choose(s, inst.uid, i);
    if (!r.ok) continue;
    n++;
    if (n <= 2) out.lines.push({ icon: CHAR_BY_ID.get(admin)!.emoji, text: `${CHAR_BY_ID.get(admin)!.short} handled ${inst.speaker !== 'anon' && CHAR_BY_ID.has(inst.speaker) ? `${CHAR_BY_ID.get(inst.speaker)!.short}’s` : 'a'} problem in ${city(inst.city ?? s.hometown).name}: “${label.replace(/[.!]$/, '')}.”` });
  }
  if (n > 2) out.lines.push({ icon: CHAR_BY_ID.get(admin)!.emoji, text: `…and ${n - 2} other matter${n - 2 === 1 ? '' : 's'}. ${CHAR_BY_ID.get(admin)!.short} has kept notes.` });
  return n;
}

// ------------------------------------------------------------------ the clock

export const canAuto = (s: StoryState) => !!s.chars.bev?.present && s.chars.bev.status === 'active';

/** Something only you can deal with is waiting: the automatic clock stops. */
export function blocked(s: StoryState): boolean {
  return s.inbox.some((i) => needsYou(CARD_BY_ID.get(i.cardId), i)) || !!s.ended;
}
