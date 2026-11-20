// The shipped content library: authored, validated JSON compiled into the game.
// No AI or network is involved at runtime. See docs/STORY-ENGINE.md and scripts/content/.
import characters from './content/characters.json';
import customs from './content/customs.json';
import crisis from './content/cards.crisis.json';
import founding from './content/cards.founding.json';
import grassroots from './content/cards.grassroots.json';
import type { CardDef, CharacterDef, ContentLibrary, CustomDef } from './types';

export const LIBRARY: ContentLibrary = {
  version: 1,
  characters: characters as unknown as CharacterDef[],
  customs: customs as unknown as CustomDef[],
  cards: [...(founding as unknown as CardDef[]), ...(grassroots as unknown as CardDef[]), ...(crisis as unknown as CardDef[])],
};
