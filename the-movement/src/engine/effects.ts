// Applies the numeric consequences of events and choices. The narrative layer
// (procedural or AI) never touches state; only these effects do.
import { addEvent, addZealots, clamp, ensureCity, nid, revealCandidates } from './core';
import { CITIES, city } from './geo';
import { createSplinter, liveFactions, releaseFaction } from './factions';
import type { Rng } from './rng';
import type { Effect, GameState } from './types';

const sign = (v: number) => (v >= 0 ? `+${Math.round(v * 10) / 10}` : `${Math.round(v * 10) / 10}`);

function scopeCities(state: GameState, scope: 'city' | 'country' | 'global', target?: number | string): number[] {
  if (scope === 'city' && typeof target === 'number') return [target];
  if (scope === 'country' && typeof target === 'string') return state.touched.filter((id) => city(id).cc === target);
  return state.touched;
}

export function applyEffects(state: GameState, effects: Effect[], rng: Rng, sourceEventId?: string): string[] {
  const out: string[] = [];
  for (const e of effects) {
    switch (e.k) {
      case 'cohesion':
      case 'drift':
      case 'bureaucracy':
      case 'control':
      case 'enthusiasm': {
        state[e.k] = clamp(state[e.k] + e.v);
        if (e.v) out.push(`${sign(e.v)} ${e.k === 'control' ? 'founder control' : e.k}`);
        break;
      }
      case 'zealots':
        addZealots(state, e.v);
        if (e.v) out.push(`${sign(e.v)} zealot${Math.abs(e.v) === 1 ? '' : 's'}`);
        break;
      case 'influence':
        state.influence = Math.max(0, state.influence + e.v);
        if (e.v) out.push(`${sign(e.v)} influence`);
        break;
      case 'funds':
        state.funds = Math.max(0, state.funds + e.v);
        if (e.v) out.push(`${sign(e.v)} funds`);
        break;
      case 'resistance': {
        for (const id of scopeCities(state, e.scope, e.target)) {
          const d = ensureCity(state, id);
          d.resistance = Math.max(0, Math.min(0.95, d.resistance + e.v));
        }
        out.push(`${e.v > 0 ? 'Higher' : 'Lower'} resistance (${e.scope === 'city' ? 'local' : e.scope === 'country' ? 'national' : 'worldwide'})`);
        break;
      }
      case 'awareness': {
        for (const id of scopeCities(state, e.scope, e.target)) {
          const d = ensureCity(state, id);
          d.awareness = Math.max(0, Math.min(1, d.awareness + e.v * (1 - d.awareness)));
        }
        out.push(`${e.v > 0 ? 'More' : 'Less'} awareness (${e.scope})`);
        break;
      }
      case 'followers': {
        let delta = 0;
        for (const id of scopeCities(state, e.scope, e.target)) {
          const d = state.cities[id];
          if (!d) continue;
          const c = city(id);
          const room = c.pop - d.followers - Object.values(d.others).reduce((a, b) => a + b, 0);
          const ch = e.pct >= 0 ? Math.min(room, Math.floor(d.followers * e.pct)) : -Math.floor(d.followers * -e.pct);
          d.followers += ch;
          delta += ch;
        }
        if (delta < 0) state.totals.defections += -delta;
        out.push(`${delta >= 0 ? '+' : ''}${Math.round(delta).toLocaleString()} followers`);
        break;
      }
      case 'boost':
        state.boosts.push({ id: nid(state, 'b'), kind: e.kind, mult: e.mult, until: state.time + e.duration, scope: e.scope, label: e.label });
        out.push(`${e.label} (${e.mult > 1 ? '+' : ''}${Math.round((e.mult - 1) * 100)}% ${e.kind}, ${Math.round(e.duration / 60)} min)`);
        break;
      case 'spawnSplinter': {
        const f = createSplinter(state, rng, { doctrineId: e.doctrineId, style: e.style, cityId: e.cityId, size: e.size, originEventId: sourceEventId });
        if (f) {
          out.push(`New faction: ${f.name}`);
          const ev = addEvent(state, {
            defId: 'splinter-formed', category: 'Splinter formation', important: true, cityId: f.hqCityId,
            headline: `Heretics! ${f.name} Formally Breaks Away`,
            body: `Led by ${f.founder}, ${f.name} insists that ${f.doctrineDifferences[0].replace(/\.$/, '').toLowerCase()}. ${Math.round(f.followerCount).toLocaleString()} members have followed.`,
            refs: { factionId: f.id, eventId: sourceEventId },
          });
          f.history.push(ev.id);
        }
        break;
      }
      case 'faction': {
        const f = state.factions[e.factionId];
        if (!f) break;
        if (e.relation) f.relationship = e.relation;
        if (e.disagreement) f.disagreement = clamp(f.disagreement + e.disagreement);
        if (e.transferPct) {
          const moved = releaseFaction(state, f, true, e.transferPct);
          out.push(`${Math.round(moved).toLocaleString()} members return from ${f.name}`);
        }
        break;
      }
      case 'doctrineText': {
        const d = state.movement.doctrines.find((x) => x.id === e.doctrineId);
        if (d && d.currentText !== e.text) {
          d.currentText = e.text;
          d.modificationHistory.push({ time: state.time, text: e.text, reason: e.reason });
          out.push(`Doctrine amended`);
        }
        break;
      }
      case 'doctrineAttr': {
        const d = state.movement.doctrines.find((x) => x.id === e.doctrineId);
        if (d) d.attributes[e.attr] = Math.round(clamp(d.attributes[e.attr] + e.v));
        break;
      }
      case 'discover': {
        const sources = state.touched.filter((id) => state.cities[id].controlled);
        const from = sources.length ? rng.pick(sources) : state.movement.headquarters.cityId;
        let ids: number[];
        if (e.distant) {
          ids = [];
          for (let i = 0; i < e.n * 5 && ids.length < e.n; i++) {
            const c = CITIES[rng.int(0, Math.min(CITIES.length - 1, 1200))];
            if (!state.cities[c.id]?.discovered) {
              ensureCity(state, c.id);
              state.cities[c.id].discovered = true;
              state.cities[c.id].discoveredAt = state.time;
              state.discovered.push(c.id);
              ids.push(c.id);
            }
          }
        } else ids = revealCandidates(state, from, rng, e.n);
        if (ids.length) out.push(`Discovered ${ids.map((id) => city(id).name).join(', ')}`);
        break;
      }
      case 'org': {
        const o = state.reaction.orgs.find((x) => x.id === e.orgId);
        if (o) {
          o.strength = clamp(o.strength + e.v);
          out.push(`${o.name} ${e.v > 0 ? 'strengthened' : 'weakened'}`);
        }
        break;
      }
      case 'committee':
        if (!state.committees.includes(e.name)) state.committees.push(e.name);
        state.bureaucracy = clamp(state.bureaucracy + 3);
        out.push(`Established: ${e.name}`);
        break;
      case 'flag':
        state.flags[e.name] = state.time;
        break;
      case 'news':
        addEvent(state, { defId: 'followup', category: 'Follow-up', important: false, headline: e.headline, body: e.body ?? '', refs: { eventId: sourceEventId } });
        break;
    }
  }
  return out;
}

export function factionShareOfWorld(state: GameState): number {
  return liveFactions(state)
    .filter((f) => f.kind === 'splinter')
    .reduce((s, f) => s + f.followerCount, 0);
}
