'use client';
// Client side of optional AI narration. Only presentation fields are replaced; effects,
// choices' numeric consequences and all state remain owned by the simulation.
import { CITY_BY_ID, countryName } from '@/engine/geo';
import { liveFactions } from '@/engine/factions';
import type { GameEvent, GameState } from '@/engine/types';
import { type NarrationRequest, validateNarration } from './narrativeSchema';

let disabledUntil = 0;

export async function enhanceEvent(g: GameState, e: GameEvent): Promise<boolean> {
  if (Date.now() < disabledUntil || e.aiEnhanced) return false;
  e.aiEnhanced = true; // mark immediately to avoid duplicate requests
  const city = e.cityId != null ? CITY_BY_ID.get(e.cityId) : undefined;
  const req: NarrationRequest = {
    movement: {
      ideologyName: g.movement.ideologyName,
      pluralFollowers: g.movement.pluralFollowers,
      founderTitle: g.movement.founderTitle,
      doctrines: g.movement.doctrines.map((d) => d.currentText),
      meetingName: g.movement.meetingName,
      outpostName: g.movement.outpostName,
    },
    event: { category: e.category, headline: e.headline, body: e.body, quote: e.quote, city: city?.name, country: city ? countryName(city.cc) : undefined, choices: e.choices?.map((c) => c.label) },
    factions: liveFactions(g).map((f) => f.name).slice(0, 6),
    recentHeadlines: g.recentHeadlines.slice(-15),
  };
  try {
    const res = await fetch('/api/narrate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req) });
    if (!res.ok) {
      if (res.status === 503 || res.status === 429) disabledUntil = Date.now() + 5 * 60_000;
      e.aiEnhanced = false;
      return false;
    }
    const r = validateNarration(await res.json(), e.choices?.length ?? 0);
    if (!r) {
      e.aiEnhanced = false;
      return false;
    }
    e.headline = r.headline;
    e.body = r.article;
    if (r.quote) e.quote = r.quote;
    if (r.choiceLabels && e.choices && e.choiceSelected == null) r.choiceLabels.forEach((l, i) => (e.choices![i].label = l));
    return true;
  } catch {
    e.aiEnhanced = false;
    disabledUntil = Date.now() + 60_000;
    return false;
  }
}
