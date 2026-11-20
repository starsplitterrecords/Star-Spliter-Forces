// Campaign styles. Each interacts with the movement's actual customs through `affinity`.
import type { Doctrine, Movement } from './types';

export interface CampaignTypeDef {
  id: string;
  name: (mv: Movement) => string;
  desc: (mv: Movement) => string;
  power: number;
  awareness: number;
  controversy: number; // additive local resistance pressure per minute (can be negative)
  influenceCost: number;
  fundsCost: number;
  minPhase: number;
  requiresUpgrade?: boolean; // unlocked by an upgrade granting this type
  founderOnly?: boolean;
  spill?: boolean;
  cohesionOnComplete?: number;
  affinity: (mv: Movement) => { mult: number; reason: string };
  risk: string;
}

const byCat = (mv: Movement, cat: string) => mv.doctrines.filter((d) => d.category === cat);
const mostVisible = (mv: Movement): Doctrine =>
  [...mv.doctrines].sort((a, b) => b.attributes.visibility + b.attributes.identity - (a.attributes.visibility + a.attributes.identity))[0];

export const CAMPAIGN_TYPES: CampaignTypeDef[] = [
  {
    id: 'grassroots',
    name: (mv) => `Grassroots ${mv.meetingName}`,
    desc: (mv) => `Small, earnest ${mv.meetingName.toLowerCase()} in living rooms and parks.`,
    power: 1, awareness: 1, controversy: 0, influenceCost: 0, fundsCost: 0, minPhase: 1,
    affinity: (mv) => ({ mult: 0.9 + mv.profile.cooperation * 0.2, reason: 'warm temperament helps' }),
    risk: 'Low',
  },
  {
    id: 'booth',
    name: () => 'Local Information Booths',
    desc: () => 'Quiet folding tables staffed by unnervingly patient volunteers. Lowers local resistance.',
    power: 0.8, awareness: 0.9, controversy: -0.02, influenceCost: 0, fundsCost: 0, minPhase: 2,
    affinity: (mv) => ({ mult: 1.15 - mv.profile.visibility / 400, reason: 'subtle doctrines suit booths' }),
    risk: 'Very low; reduces resistance',
  },
  {
    id: 'demonstration',
    name: () => 'Public Demonstration of Enthusiasm',
    desc: () => 'Loud, visible, unavoidable. Spreads awareness fast; irritates officials.',
    power: 1.25, awareness: 1.8, controversy: 0.03, influenceCost: 3, fundsCost: 0, minPhase: 2,
    affinity: (mv) => ({ mult: 0.8 + mv.profile.visibility / 250, reason: 'conspicuous customs amplify demonstrations' }),
    risk: 'Raises local resistance',
  },
  {
    id: 'showcase',
    name: (mv) => mostVisible(mv).motif.showcase,
    desc: (mv) => `A public celebration of the doctrine that people should ${mostVisible(mv).motif.verb}.`,
    power: 1.3, awareness: 1.4, controversy: 0.015, influenceCost: 5, fundsCost: 0, minPhase: 2,
    affinity: (mv) => {
      const d = mostVisible(mv);
      return { mult: 0.75 + (d.attributes.identity + d.attributes.visibility) / 320, reason: `built on “${d.originalText}”` };
    },
    risk: 'Moderate',
  },
  {
    id: 'grand',
    name: (mv) => `Grand ${mv.meetingSingular}`,
    desc: (mv) => `The largest ${mv.meetingSingular.toLowerCase()} the city has ever been subjected to.`,
    power: 1.5, awareness: 1.3, controversy: 0.015, influenceCost: 8, fundsCost: 0, minPhase: 2, requiresUpgrade: true,
    affinity: (mv) => {
      const musical = /hootenann|jam|revival|celebration/i.test(mv.meetingName) || byCat(mv, 'music').length > 0;
      return { mult: musical ? 1.15 : 1, reason: musical ? 'your gatherings already have a soundtrack' : 'standard pageantry' };
    },
    risk: 'Moderate',
  },
  {
    id: 'exhibition',
    name: () => 'Traveling Exhibition',
    desc: (mv) => `A touring display of ${mv.adjective} artifacts. Spills awareness into neighboring cities.`,
    power: 1.2, awareness: 1.6, controversy: 0.01, influenceCost: 14, fundsCost: 0, minPhase: 3, requiresUpgrade: true, spill: true,
    affinity: (mv) => ({ mult: 0.85 + mv.profile.commerce / 300, reason: 'collectible doctrines display well' }),
    risk: 'Low',
  },
  {
    id: 'convention',
    name: () => 'Organizational Convention',
    desc: () => 'Lanyards, breakout sessions, a keynote. Lowers resistance, restores cohesion on completion.',
    power: 1.0, awareness: 1.0, controversy: -0.03, influenceCost: 10, fundsCost: 0, minPhase: 2, requiresUpgrade: true, cohesionOnComplete: 3,
    affinity: (mv) => ({ mult: /board|convention|retreat/i.test(mv.meetingName) ? 1.2 : 1, reason: 'procedure suits you' }),
    risk: 'Very low',
  },
  {
    id: 'music',
    name: (mv) => {
      const m = byCat(mv, 'music')[0];
      return m ? `${m.motif.noun.replace(/^\w/, (c) => c.toUpperCase())} Concert` : 'Music Event';
    },
    desc: (mv) => (byCat(mv, 'music').length ? 'A concert of the only acceptable music. Huge for musical movements.' : 'A concert. Your movement has no official music, which is awkward.'),
    power: 1.1, awareness: 1.7, controversy: 0.02, influenceCost: 18, fundsCost: 0, minPhase: 3, requiresUpgrade: true,
    affinity: (mv) => (byCat(mv, 'music').length ? { mult: 1.6, reason: 'you have an official genre' } : { mult: 0.85, reason: 'no musical doctrine' }),
    risk: 'Moderate',
  },
  {
    id: 'festival',
    name: () => 'Cultural Festival',
    desc: (mv) => `Food, music, and ${mv.adjective} customs for everyone. Costs Movement Funds.`,
    power: 1.7, awareness: 1.6, controversy: 0.01, influenceCost: 0, fundsCost: 4000, minPhase: 3, requiresUpgrade: true,
    affinity: (mv) => ({ mult: 0.85 + (byCat(mv, 'food').length + byCat(mv, 'music').length) * 0.15 + mv.profile.commerce / 500, reason: 'food and music customs make better festivals' }),
    risk: 'Low',
  },
  {
    id: 'appearance',
    name: (mv) => `Grand Ceremonial Appearance by ${mv.founderTitle}`,
    desc: (mv) => `${mv.founderTitle} appears in person. Founder-led only.`,
    power: 2.1, awareness: 2.0, controversy: 0.02, influenceCost: 25, fundsCost: 0, minPhase: 3, founderOnly: true, cohesionOnComplete: 2,
    affinity: (mv) => ({ mult: 0.9 + mv.profile.zeal * 0.15, reason: 'zeal amplifies the founder' }),
    risk: 'Moderate',
  },
  {
    id: 'celebration',
    name: () => 'Mass Synchronized Celebration',
    desc: (mv) => `Millions ${mostVisible(mv).motif.verb} at exactly the same moment. Costs Movement Funds.`,
    power: 2.6, awareness: 2.2, controversy: 0.04, influenceCost: 0, fundsCost: 40000, minPhase: 5, requiresUpgrade: true,
    affinity: (mv) => ({ mult: 0.8 + mv.profile.intensity / 250, reason: 'participatory customs synchronize well' }),
    risk: 'High resistance',
  },
];

export const CAMPAIGN_TYPE_BY_ID = Object.fromEntries(CAMPAIGN_TYPES.map((c) => [c.id, c]));
