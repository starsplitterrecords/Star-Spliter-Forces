// Preset options for the founding wizard and procedural name pools.
import type { DoctrineCategory } from '../engine/types';

export const IDEOLOGY_EXAMPLES = ['Hat', 'Noodle', 'Tuesday', 'Kazoo', 'Spring', 'Beige', 'Yurt', 'Nap', 'Sock', 'Soup', 'Pancake', 'Monocle', 'Puddle', 'Tallchair'];

export const FOUNDER_TITLES = [
  'Master',
  'Grand Master',
  'Supreme Coordinator',
  'Esteemed Founder',
  'Chief Visionary',
  'Supreme Chairperson',
  'First Among Equals',
  'The Magnificent',
  'Self-Appointed Director',
];

export const HQ_TYPES = [
  'Yurt', 'Hut', 'Tent', 'Basement', 'Garage', 'Treehouse', 'Abandoned warehouse', 'Office suite',
  'Suburban living room', 'Mountain cave', 'Barn', 'Inflatable castle', 'Secret underground bunker',
];

export const HQ_STYLES = ['Rustic', 'Brutalist', 'Art Deco', 'Gothic', 'Mid-century modern', 'Whimsical', 'Neoclassical', 'Utilitarian', 'Retro-futurist'];

export const HQ_FEATURES = [
  'A suspiciously large flagpole', 'A hand-painted sign', 'A ceremonial doorbell', 'Fairy lights',
  'A very serious filing cabinet', 'An overly ambitious satellite dish', 'A moat (decorative)',
  'A gift shop', 'A podium facing nobody', 'An inspirational mural', 'A bell tower (small)', 'A suggestion box (sealed)',
];

export const PRINCIPLE_SUGGESTIONS = [
  'Tuesdays are superior to all other days.',
  'Everyone deserves a really tall chair.',
  'All doors should be painted orange.',
  'Walking backward improves wisdom.',
  'Soup is an underappreciated form of communication.',
  'Matching socks demonstrate a troubling lack of imagination.',
  'Nothing important should happen before noon.',
  'People should spend more time enjoying the journey than the destination.',
  'Every pocket deserves an interesting rock.',
  'A day without a nap is a day misunderstood.',
  'Umbrellas are a statement, not a tool.',
  'Pancakes are the only honest breakfast.',
  'Every meeting should end with a polka.',
  'Monocles reveal what spectacles conceal.',
];

export const SPIRIT_ANIMALS: { name: string; glyph: string; trait: string }[] = [
  { name: 'Capybara', glyph: '🦫', trait: 'Calm under pressure. Universally befriended.' },
  { name: 'Wombat', glyph: '🐻', trait: 'Sturdy, stubborn, produces cube-shaped arguments.' },
  { name: 'Flamingo', glyph: '🦩', trait: 'Balanced on one principle at a time.' },
  { name: 'Platypus', glyph: '🦆', trait: 'Defies categorization. Mildly venomous in debate.' },
  { name: 'Goose', glyph: '🪿', trait: 'Fearless. Loud. Respected by no one, feared by all.' },
  { name: 'Raccoon', glyph: '🦝', trait: 'Resourceful. Opens any locked committee.' },
  { name: 'Sloth', glyph: '🦥', trait: 'Deliberate. Every decision is final eventually.' },
  { name: 'Ferret', glyph: '🐈', trait: 'Enthusiastic beyond reason.' },
  { name: 'Squirrel', glyph: '🐿️', trait: 'Prepared. Hoards resources and opinions.' },
  { name: 'Alpaca', glyph: '🦙', trait: 'Fluffy diplomacy. Occasionally spits.' },
  { name: 'Octopus', glyph: '🐙', trait: 'Eight simultaneous initiatives.' },
  { name: 'Honey badger', glyph: '🦡', trait: 'Does not care about the opposition.' },
  { name: 'Penguin', glyph: '🐧', trait: 'Formal attire at all times.' },
  { name: 'Hedgehog', glyph: '🦔', trait: 'Prickly about doctrine, soft about members.' },
  { name: 'Axolotl', glyph: '🦎', trait: 'Regenerates after every schism.' },
];

export interface CustomPreset {
  category: DoctrineCategory;
  label: string;
  options: string[];
}

export const CUSTOM_PRESETS: CustomPreset[] = [
  { category: 'hygiene', label: 'Hygiene', options: ['Brush teeth only once a week.', 'Bathe precisely twice per day.', 'Never use scented soap.', 'Wear mismatched socks.'] },
  { category: 'food', label: 'Food', options: ['Eat mashed potatoes every day.', 'Consume soup on Tuesdays.', 'Never eat square sandwiches.', 'Begin meals with dessert.'] },
  { category: 'hobby', label: 'Hobbies', options: ['Build towers from popsicle sticks.', 'Practice competitive napping.', 'Collect interesting rocks.', 'Perfect elaborate handshakes.'] },
  { category: 'clothing', label: 'Clothing', options: ['Wear springs on shoes.', 'Wear oversized hats.', 'Always wear green socks.', 'Wear capes on weekends.'] },
  { category: 'music', label: 'Music', options: ['Yacht rock.', 'K-pop.', 'Hippie-dippy folk music.', 'Death metal.', 'Polka.', 'Jazz fusion.', 'Synthwave.', 'Elevator music.'] },
  { category: 'housing', label: 'Housing', options: ['Yurts.', 'Huts.', 'Tents.', 'Treehouses.', 'Domes.', 'Underground dwellings.'] },
];

export const MEETING_NAMES = [
  'Re-education Camps', 'Revivals', 'Hootenannies', 'Gatherings', 'Jam Sessions', 'Board Meetings',
  'Mandatory Celebrations', 'Sacred Conventions', 'Strategic Retreats', 'Group Activities',
];

export const OUTPOST_NAMES = [
  'Re-reeducation Camps', 'Strongholds', 'Lairs', 'Information Booths', 'Power Circles', 'Regional Headquarters',
  'Welcome Centers', 'Branch Offices', 'Shrines to Common Sense',
];

export const BANNER_COLORS = [
  '#6b3fa0', '#d4a72c', '#1f6f8b', '#c0392b', '#2e8b57', '#e67e22', '#e84393', '#2c3e50', '#16a085',
  '#8e44ad', '#f1c40f', '#3d5a80', '#9b2226', '#ee6c4d', '#0a9396', '#f4f1de', '#222222', '#94d2bd',
];

export const SYMBOLS = ['animal', 'sun', 'star', 'eye', 'spiral', 'crown', 'circle'];
export const SHAPES = ['shield', 'circle', 'diamond', 'pennant', 'hexagon'] as const;
export const PATTERNS = ['solid', 'stripe', 'chevron', 'quartered', 'border'] as const;

export const MOTTOS = [
  'Obviously.', 'We Were Right All Along.', 'Onward, Reasonably.', 'Nobody Asked, We Answered.',
  'Correct Since Founding.', 'Further Clarification Pending.', 'In Principle, Forever.', 'Probably Inevitable.',
];

export const FOUNDER_NAMES = ['Jeff', 'Morgan', 'Priya', 'Dmitri', 'Alex', 'Beatrix', 'Kofi', 'Yuki', 'Rosa', 'Theo', 'Ingrid', 'Sam'];

// Fictional people for generated factions, rivals, officials and celebrities.
export const FIRST_NAMES = [
  'Barnaby', 'Delphine', 'Oswaldo', 'Philippa', 'Ignatius', 'Marguerite', 'Thaddeus', 'Ottoline', 'Rupert', 'Clementine',
  'Ezekiel', 'Hortense', 'Lysander', 'Winifred', 'Cornelius', 'Agatha', 'Fitzgerald', 'Perpetua', 'Montgomery', 'Esmerelda',
  'Bartholomew', 'Gwendolyn', 'Leopold', 'Prudence', 'Mortimer', 'Wilhelmina', 'Augustin', 'Beatrix', 'Cassius', 'Dorothea',
];
export const LAST_NAMES = [
  'Pemberton-Huff', 'Quibble', 'Fennimore', 'Ashgrove', 'Thistlewood', 'Crumplehorn', 'Vantablack', 'Ollerenshaw', 'Puddington',
  'Merriweather', 'Grubb', 'Fairbottom', 'Snodgrass', 'Wigglesworth', 'Bramblecombe', 'Cuthbertson', 'Pickering', 'Dunderdale',
  'Kettleby', 'Larkspur', 'Mumbleby', 'Noggins', 'Oddfellow', 'Plumtree',
];
export const CELEBRITY_ROLES = [
  'beloved fictional daytime television host', 'retired professional mime', 'chart-topping (fictional) yodeler',
  'world-famous competitive gardener', 'disgraced weather presenter', 'beloved children\'s puppet (and its handler)',
  'Olympic-adjacent sprinter', 'reclusive novelist', 'celebrity chef known for shouting',
];

export const RIVAL_SEEDS = [
  { root: 'Beige', custom: 'Everything must be beige.', noun: 'beige', motif: 'green' },
  { root: 'Squarel', custom: 'All food must be square.', noun: 'square', motif: 'sandwich' },
  { root: 'Earlybird', custom: 'Everything important happens at dawn.', noun: 'dawn', motif: 'noon' },
  { root: 'Gravel', custom: 'Gravel is the superior surface.', noun: 'gravel', motif: 'rock' },
  { root: 'Puddle', custom: 'Every puddle must be jumped in.', noun: 'puddle', motif: 'umbrella' },
  { root: 'Ladder', custom: 'Ladders should replace stairs.', noun: 'ladder', motif: 'chair' },
  { root: 'Mitten', custom: 'Mittens year-round.', noun: 'mitten', motif: 'sock' },
  { root: 'Spoon', custom: 'Forks are a fad.', noun: 'spoon', motif: 'soup' },
  { root: 'Whistle', custom: 'Communicate exclusively by whistling.', noun: 'whistle', motif: 'kazoo' },
  { root: 'Lighthouse', custom: 'Everyone should live in a lighthouse.', noun: 'lighthouse', motif: 'tent' },
  { root: 'Corduroy', custom: 'Corduroy, always.', noun: 'corduroy', motif: 'cape' },
  { root: 'Sundial', custom: 'Clocks are a conspiracy of gears.', noun: 'sundial', motif: 'noon' },
];

export const RIVAL_COLORS = ['#c45a5a', '#4f8f6f', '#b07a2a', '#5a6fc4', '#8f4f8f', '#3f8f8f', '#a35f2f', '#7a7a2a'];
