// Character memory: what each person remembers about how you treated them, in enough detail
// for a card to call it back precisely ("three meetings ago, in front of everyone, in favour of Dez").
// Pure functions over StoryState; the engine decides when memories are written.
import type { MemoryKind, MemoryRecord, RecallQuery, Setting, StoryState } from './types';

export const MEMORY_CAP = 400;
export const DAYS_PER_MEETING = 7;

export function meetingNumber(day: number): number {
  return Math.floor(day / DAYS_PER_MEETING);
}

export function witnessed(m: Pick<MemoryRecord, 'setting'>): boolean {
  return m.setting === 'meeting' || m.setting === 'public';
}

/** How much a memory is on someone's mind right now. Witnessed slights last; settled ones fade. */
export function salience(s: StoryState, m: MemoryRecord): number {
  const age = Math.max(0, s.day - m.day);
  let v = m.weight * Math.exp(-age / 90);
  if (witnessed(m)) v *= 1.5;
  if (m.resolved) v *= 0.3;
  if (m.lastRecalled != null && s.day - m.lastRecalled < 10) v *= 0.1; // just brought up; give it a rest
  return v / (1 + m.recalled * 0.7);
}

export function recordMemory(
  s: StoryState,
  rec: Omit<MemoryRecord, 'id' | 'recalled' | 'meeting' | 'day' | 'decision'> & Partial<Pick<MemoryRecord, 'day' | 'decision'>>,
): MemoryRecord {
  const m: MemoryRecord = { ...rec, id: s.nextMemoryId++, day: rec.day ?? s.day, decision: rec.decision ?? s.decisions, meeting: meetingNumber(rec.day ?? s.day), recalled: 0 };
  // the same person, the same choice: one memory, the stronger reading wins
  const dup = s.memory.find((x) => x.who === m.who && x.cardId === m.cardId && x.decision === m.decision);
  if (dup) {
    if (m.weight > dup.weight || (m.other && !dup.other)) Object.assign(dup, { ...m, id: dup.id });
    return dup;
  }
  s.memory.push(m);
  if (s.memory.length > MEMORY_CAP) {
    // forget the least salient memories first
    const ranked = [...s.memory].sort((a, b) => salience(s, a) - salience(s, b));
    const drop = new Set(ranked.slice(0, s.memory.length - MEMORY_CAP).map((x) => x.id));
    s.memory = s.memory.filter((x) => !drop.has(x.id));
  }
  return m;
}

const KIND_SET = (k: RecallQuery['kind']): Set<MemoryKind> | null => (k == null ? null : new Set(Array.isArray(k) ? k : [k]));

export function findMemories(s: StoryState, q: RecallQuery, fixedSpeaker?: string): MemoryRecord[] {
  const kinds = KIND_SET(q.kind);
  const now = meetingNumber(s.day);
  const unresolved = q.unresolved ?? true;
  const who = q.who === 'speaker' ? fixedSpeaker : q.who && q.who !== 'any' ? q.who : null;
  return s.memory.filter((m) => {
    if (who && m.who !== who) return false;
    if (q.exclude?.includes(m.who)) return false;
    const c = s.chars[m.who];
    if (!c || !c.present || c.status !== 'active') return false;
    if (kinds && !kinds.has(m.kind)) return false;
    if (q.topic && m.topic !== q.topic) return false;
    if (q.witnessed != null && witnessed(m) !== q.witnessed) return false;
    if (q.hasOther && !(m.other && s.chars[m.other]?.present && s.chars[m.other].status === 'active')) return false;
    if (q.minAgo != null && now - m.meeting < q.minAgo) return false;
    if (q.maxAgo != null && now - m.meeting > q.maxAgo) return false;
    if (q.minWeight != null && m.weight < q.minWeight) return false;
    if (unresolved && m.resolved) return false;
    if (m.lastRecalled != null && s.day - m.lastRecalled < 10) return false;
    return true;
  });
}

const NUMBER = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

/** "last Tuesday", "three meetings ago", "about two months ago". */
export function agoText(meetingsAgo: number, meetingWord: { one: string; many: string }, day: string): string {
  if (meetingsAgo <= 0) return `earlier this week`;
  if (meetingsAgo === 1) return `last ${day}`;
  if (meetingsAgo <= 12) return `${NUMBER[meetingsAgo]} ${meetingWord.many} ago`;
  const months = Math.round(meetingsAgo / 4.3);
  return months >= 12 ? `over a year ago` : `about ${NUMBER[Math.min(12, months)]} months ago`;
}

export function whereText(setting: Setting, meetingWord: string): string {
  return setting === 'meeting' ? `in front of everyone at the ${meetingWord}` : setting === 'public' ? `in public` : `privately`;
}

/** Short line for the People sheet. */
export function describeMemory(m: MemoryRecord, name: (id: string) => string): string {
  const other = m.other ? name(m.other) : null;
  const where = m.setting === 'private' ? '' : m.setting === 'meeting' ? ' in front of everyone' : ' in public';
  const lead: Record<MemoryKind, string> = {
    overruled: `Overruled${where}${other ? `, in favour of ${other}` : ''}`,
    backed: `Backed${where}`,
    passed_over: `Passed over${other ? ` for ${other}` : ''}${where}`,
    favoured: `Chosen${other ? ` over ${other}` : ''}${where}`,
    promise: `Promised${where}`,
    broken_promise: `A promise broken${where}`,
    credited: `Given credit${where}`,
    blamed: `Blamed${where}`,
    vindicated: `Proven right`,
    embarrassed: `Embarrassed${where}`,
  };
  return `${lead[m.kind]}: “${m.quote}” (day ${Math.floor(m.day) + 1}${m.resolved ? ', settled' : ''})`;
}
