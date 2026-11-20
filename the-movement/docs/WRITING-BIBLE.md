# THE MOVEMENT — Writing Bible (v2)

This file sets how cards are written. Human writers follow it, and the development-time drafting script sends it to Claude with every batch.

## The premise in one line

The jokes aren't absurd things happening *to* a movement. They come from absurd people, whose decisions together *make* one.

## Voice

- **Deadpan.** Characters take ridiculous things completely seriously. Nobody winks at the player.
- **Specific.** Write "fourteen dollars, two buttons and a bus token", not "some money". Write "Martin is already making a laminated sign", not "Martin approves".
- **Short.** A card's text is one or two short paragraphs, under 420 characters. Choice labels are something the player would say aloud, under 80 characters. Reactions are one or two sentences.
- **Escalation through callbacks.** The best card pays off something the player decided 20 cards ago: the book club, Tuesday, Gary's garage, the soup in the boot of Priya's car.
- **No meanness to real groups.** Everything is fictional. No real people, parties, religions or hatred. Conflict is petty, procedural and theatrical.

## What makes a good card

1. **Someone with an agenda wants something.** The speaker's agenda is visible in what they ask for.
2. **Both choices are tempting,** and each costs something different. A choice that is obviously right is a waste of a card.
3. **The consequences match the fiction.** If Agnes gets her way, purists gain ground and somebody else remembers it.
4. **The reaction shows the movement responding.** Show members, co-founders or the street reacting. Don't just restate the choice.
5. **It leaves something behind:** a flag, a custom, a loyalty change or a follow-up, so later cards can build on it.

## The cast (vertical slice)

| Character | Agenda | Voice | Comic engine |
|---|---|---|---|
| **Martin Pell**, co-founder | order | Earnest, procedural, slightly wounded | Laminates things. Believes every problem is a scheduling problem. |
| **Priya Moss**, co-founder | joy | Warm, practical, quietly stubborn | Brings soup nobody asked for. The only one who says the point is to have a nice time. |
| **Dez Ferrante**, co-founder | expansion | Breathless, promotional, sincere | Promises things. Has a megaphone. Orders business cards before asking. |
| **Gary Bonk**, founding member | comfort | Kind, literal, sleepy | Thought it was a book club. Owns the garage. Whales. |
| **Agnes Thimble** (joins) | purity | Precise, dry, devastating | Minutes everything, and remembers exactly what you said last Thursday. |
| **Rolf Ledger** (joins) | money | Helpful, then very helpful | Sees every tradition as an untapped revenue stream. |

Characters can be competent, idiots, or both. They remember. Write their lines so that loyalty shows: a devoted Martin is fussy-proud, while a hurt Martin is fussy-formal.

## Mechanics cheat sheet for writers

- **Gauges:** enthusiasm, unity, attention, resources. Typical changes are ±2–10; ±15 counts as big. Neither extreme is good.
- **`serves`:** agendas helped or hurt (`"order"`, `"-joy"`). Characters' loyalty follows this automatically, so only add explicit `loyalty` for personal stakes.
- **`groups`:** shift the membership (e.g. traditionalists +0.03). Use this for "who is pleased by this".
- **`custom`:** creates or evolves a custom: proposed → practice → tradition → sacred, or abandoned. Customs are how decisions become identity.
- **`followUps`:** the next beat of the story, scheduled for later. Most good cards plant one.
- **`requires`:** gate cards on flags, customs, people and their loyalty, so situations only appear when they make sense.

## Process

1. A writer or the drafting script produces a batch in `content/drafts/`.
2. `npm run content:validate` and the review checklist catch structural problems.
3. An editor cuts weak cards, punches up the rest and checks callbacks.
4. Approved cards move into `src/story/content/`. `npm run content:stress` then checks coverage, repetition and how much playthroughs differ from each other.
