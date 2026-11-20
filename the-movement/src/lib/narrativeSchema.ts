// Shared schema + validator for optional AI narration. The AI only rewrites presentation;
// it never supplies numbers or mutates game state.
export interface NarrationRequest {
  movement: { ideologyName: string; pluralFollowers: string; founderTitle: string; doctrines: string[]; meetingName: string; outpostName: string };
  event: { category: string; headline: string; body: string; quote?: string; city?: string; country?: string; choices?: string[] };
  factions: string[];
  recentHeadlines: string[];
}

export interface NarrationResult {
  headline: string;
  article: string;
  quote?: string;
  choiceLabels?: string[];
  tags: string[];
}

export const NARRATION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'article', 'quote', 'choiceLabels', 'tags'],
  properties: {
    headline: { type: 'string' },
    article: { type: 'string' },
    quote: { type: 'string' },
    choiceLabels: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
  },
} as const;

const NUMBERISH = /\b\d{2,}\s?(%|percent|followers|zealots|influence|funds)\b/i;

export function validateNarration(x: unknown, choiceCount = 0): NarrationResult | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const str = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  if (!str(o.headline, 160) || !str(o.article, 900)) return null;
  if (NUMBERISH.test(String(o.headline)) || NUMBERISH.test(String(o.article))) return null; // AI must not invent numeric outcomes
  const labels = Array.isArray(o.choiceLabels) ? o.choiceLabels.filter((s) => typeof s === 'string' && s.length > 0 && s.length <= 140) : [];
  return {
    headline: String(o.headline).trim(),
    article: String(o.article).trim(),
    quote: typeof o.quote === 'string' && o.quote.trim() && o.quote.length <= 240 ? o.quote.trim() : undefined,
    choiceLabels: choiceCount && labels.length === choiceCount ? (labels as string[]) : undefined,
    tags: Array.isArray(o.tags) ? o.tags.filter((t) => typeof t === 'string').slice(0, 8) as string[] : [],
  };
}
