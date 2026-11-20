// A simple automated player used by balancing scripts, tests and the debug autopilot.
import { BALANCE } from './config';
import { activeCampaigns, availableZealots, campaignSlots } from './core';
import { city } from './geo';
import { resolveChoice } from './events';
import { respondToFaction, liveFactions } from './factions';
import { Rng } from './rng';
import { canEstablishOutpost, establishOutpost, endCampaign, launchCampaign, scout, unlockUpgrade, unlockedCampaignTypes, upgradeAvailability, upgradeOutpost, outpostUpgradeCost } from './sim';
import type { GameState } from './types';
import { UPGRADES } from './upgrades';

export function autoplayTurn(state: GameState, rng = new Rng(state.seed ^ Math.floor(state.time))) {
  // decisions: pick a random option (deferred decisions are fine, but keep the queue moving)
  for (const id of [...state.pendingDecisions]) {
    const ev = state.events.find((e) => e.id === id);
    if (ev?.choices) resolveChoice(state, id, rng.int(0, ev.choices.length - 1), rng);
  }
  // redeploy from cities that hit 85%
  for (const c of activeCampaigns(state)) {
    const d = state.cities[c.cityId];
    if (d.followers / city(c.cityId).pop >= BALANCE.strategicThreshold) endCampaign(state, c.id, 'redeploy');
  }
  // upgrades: cheapest available first
  for (const u of [...UPGRADES].sort((a, b) => a.cost - b.cost)) {
    if (upgradeAvailability(state, u.id).ok) unlockUpgrade(state, u.id);
  }
  // outposts
  for (const id of state.discovered) {
    if (!canEstablishOutpost(state, id)) establishOutpost(state, id);
  }
  for (const o of Object.values(state.outposts)) if (state.influence > outpostUpgradeCost(o) * 3) upgradeOutpost(state, o.id, 'recruitment');
  // launch campaigns on discovered, unconverted cities (smallest-first with zealot scaling)
  const targets = state.discovered
    .filter((id) => {
      const d = state.cities[id];
      return !d.controlled && !d.campaignId;
    })
    .sort((a, b) => city(a).pop - city(b).pop);
  const types = unlockedCampaignTypes(state);
  for (const id of targets) {
    if (activeCampaigns(state).length >= campaignSlots(state)) break;
    const founderFree = !activeCampaigns(state).some((c) => c.founder);
    const avail = availableZealots(state);
    if (!founderFree && avail === 0) break;
    const pop = city(id).pop;
    const want = Math.max(founderFree ? 0 : 1, Math.min(avail, Math.ceil(Math.log10(pop / 20000) * 2)));
    const best = types.filter((t) => !t.founderOnly && t.influenceCost <= state.influence * 0.3 && (t.fundsCost === 0 || (state.fundsUnlocked && t.fundsCost <= state.funds * 0.5))).sort((a, b) => b.power - a.power)[0];
    launchCampaign(state, id, { type: best?.id ?? 'grassroots', zealots: want, founder: founderFree });
  }
  if (!targets.length || state.discovered.length < 4) scout(state);
  // factions: try to defuse the largest hostile splinter
  const hostile = liveFactions(state).filter((f) => f.kind === 'splinter' && (f.relationship === 'rival' || f.relationship === 'hostile')).sort((a, b) => b.followerCount - a.followerCount)[0];
  if (hostile && state.influence > 60) respondToFaction(state, hostile.id, rng.pick(['negotiate', 'unity', 'reunify', 'autonomy'] as const), rng);
}
