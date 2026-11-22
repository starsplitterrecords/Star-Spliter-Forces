// The shipped content library: authored, validated JSON compiled into the game.
// No AI or network is involved at runtime. See docs/STORY-ENGINE.md and scripts/content/.
import characters from './content/characters.json';
import customs from './content/customs.json';
import absurd from './content/cards.absurd.json';
import crisis from './content/cards.crisis.json';
import doctrine from './content/cards.doctrine.json';
import people from './content/cards.people.json';
import founding from './content/cards.founding.json';
import grassroots from './content/cards.grassroots.json';
import national from './content/cards.national.json';
import recurring from './content/cards.recurring.json';
import regional from './content/cards.regional.json';
import road from './content/cards.road.json';
import type { CardDef, CharacterDef, ContentLibrary, CustomDef } from './types';

export const LIBRARY: ContentLibrary = {
  version: 1,
  characters: characters as unknown as CharacterDef[],
  customs: customs as unknown as CustomDef[],
  cards: [...(founding as unknown as CardDef[]), ...(grassroots as unknown as CardDef[]), ...(recurring as unknown as CardDef[]), ...(regional as unknown as CardDef[]), ...(national as unknown as CardDef[]), ...(people as unknown as CardDef[]), ...(road as unknown as CardDef[]), ...(doctrine as unknown as CardDef[]), ...(absurd as unknown as CardDef[]), ...(crisis as unknown as CardDef[])],
};
