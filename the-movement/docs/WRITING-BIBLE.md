# THE MOVEMENT — Writing Bible (v2)

This file sets how cards are written. Human writers follow it, and the development-time drafting script sends it to Claude with every batch.

## The premise in one line

The jokes aren't absurd things happening *to* a movement. They come from absurd people, whose decisions together *make* one.

## Voice

- **Deadpan.** Characters take ridiculous things completely seriously. Nobody winks at the player.
- **Specific.** Write "fourteen dollars, two buttons and a bus token", not "some money". Write "Martin is already making a laminated sign", not "Martin approves".
- **Short.** A card's text is one or two short paragraphs, under 420 characters. Choice labels are something the player would say aloud, under 80 characters. Reactions are one or two sentences.
- **Escalation through callbacks.** The best card pays off something the player decided 20 cards ago: the book club, Tuesday, Gary's garage, the soup in the trunk of Priya's car.
- **No meanness to real groups.** Everything is fictional. No real people, parties, religions or hatred. Conflict is petty, procedural and theatrical.

## American English only

All player-facing text is American English, in both spelling and vocabulary. The validator rejects the common British forms.

- **Spelling:** color, favor, neighbor, organize, apologize, practice (as a verb too), license, canceled, traveling, center, meter, gray, program.
- **Words:**

  | Write | Not |
  |---|---|
  | schedule | rota |
  | gas | petrol |
  | parking lot | car park |
  | trunk | boot |
  | line | queue |
  | cookies | biscuits |
  | chips | crisps |
  | two weeks | fortnight |
  | vacation | holiday |
  | sidewalk | pavement |
  | highway | motorway |
  | Main Street | high street |
  | trash cans | bins |
  | stroller | pram |
  | lawyer | solicitor |
  | police officer | constable |
  | mom | mum |
  | around | round, as in "a line round the square" |
  | toward | towards |
  | real or actual | proper, as in "a proper hall" |
  | just saying | only saying |
  | pretty good | quite good |

- **Address and idiom:** Bev says "hon", not "love". Nobody says "your lot", "mind", "a lie-down" or "on your head be it".
- **Punctuation:** periods and commas go inside closing quotation marks (“like this.”). Titles take a period: Mr., Mrs., Ms., Dr.



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
| **Ophelia Stroud** (regional) | expansion | Warm in public, precise in private | Believes the movement belongs to whoever is growing it. Prints calendars before asking. |
| **Lionel Fitch** (regional) | order | Fluent in departments | Came to observe and stayed to restructure. Martin's natural ally, and therefore his greatest threat. |

Characters can be competent, idiots, or both. They remember. Write their lines so that loyalty shows: a devoted Martin is fussy-proud, while a hurt Martin is fussy-formal.

### Characters are not buttons

**Characters must sometimes be right for the wrong reasons, and wrong for entirely reasonable ones.**

- Martin's obsession with procedure should occasionally save the organization. He laminated an evacuation plan in week two because he wanted to try the orange pouches, and when the fire inspector arrives it is the only reason you pass.
- Dez's reckless promotional promises should occasionally produce extraordinary successes. He promised the mayor a parade, and you become the front of the carnival.
- Priya's insistence on having a nice time should sometimes undermine an important organizational objective. She scheduled the picnic at the same hour as the council vote on the hall.
- Agnes's purity can be wrong for the best reasons: everyone must re-read the founding minutes before voting on the roof, and the roof is leaking now.

Without this, the cast becomes six predictable buttons for six agendas, and the player stops reading the cards and starts reading the speaker. Tag these cards with `twist: "right_wrong_reasons"` or `"wrong_reasonable"`. The validator warns about any character who has none. The stress test flags any character whose agenda moves the gauges the same way more than 85% of the time.

### Not everything is a mechanic

Some details exist only to make the characters feel like people. **Gary likes whales.** It serves no agenda, moves no gauge, and must never be explained. It turns up anyway: in his book, in Whale Wednesday, in the newsletter, and in the flyer that brings the weather presenter. Every character deserves one of these: Martin's orange pouches, Priya's soup that nobody asked for, Rolf's discomfort at not understanding why the potato mug sold. Protect them in editing.

## Mechanics cheat sheet for writers

- **Gauges:** enthusiasm, unity, attention, resources. Typical changes are ±2–10; ±15 counts as big. Neither extreme is good.
- **`serves`:** agendas helped or hurt (`"order"`, `"-joy"`). Characters' loyalty follows this automatically, so only add explicit `loyalty` for personal stakes.
- **`groups`:** shift the membership (e.g. traditionalists +0.03). Use this for "who is pleased by this".
- **`custom`:** creates or evolves a custom: proposed → practice → tradition → sacred, or abandoned. Customs are how decisions become identity.
- **`followUps`:** the next beat of the story, scheduled for later. Most good cards plant one.
- **`requires`:** gate cards on flags, customs, people and their loyalty, so situations only appear when they make sense.
- **`setting`:** `private`, `meeting` or `public`. Being overruled in front of everyone is remembered more heavily than being overruled in private.
- **`topic`:** a short phrase for what the card is about (`the picnic`). Callbacks quote it.
- **`shape`:** the comic structure (`proposal`, `escalation`, `literalism`, `procedure`, `overpromise`, `commerce`, `feud`, `outsider`, `callback`, `vindication`, `backfire`, `schism`, `drift`, `logistics`). The engine avoids serving the same shape twice in a row, and the stress test reports any shape that is carrying a playthrough.

### Memory and callbacks

Characters remember automatically:

- who you overruled and who you favored instead;
- whether it happened in front of everyone;
- the exact words you chose;
- how many meetings ago it was.

A callback card declares `recall` and quotes the memory with `{mQuote}`, `{mAgo}`, `{mWhere}` and `{mOther}`. It resolves, deepens or forgets it. See `docs/STORY-STATE.md`.

- Quote the player's words; they are the punchline.
- Callbacks need distance: three meetings ago is a grudge, last week is a complaint.
- Apologizing should cost something, and standing firm should gain something.

### Chains

A follow-up has a window (`delay` to `maxDelay`), prerequisites (`requires`) and cancellation conditions (`cancelIf`). **A punchline must not arrive after the situation that made it funny has gone.** Cancel it if the person left, if the matter was settled another way, or if the hall has already burned down.

### Customs the members invent

Not every custom is yours. Members start things without asking: the Nod, the empty chair, whale facts before the minutes. You find out afterwards and must **endorse, tolerate, reform or condemn** something you never intended. Write these cards from the point of view of someone who assumed you already knew.

## Process

1. A writer or the drafting script produces a batch in `content/drafts/`.
2. `npm run content:validate` and the review checklist catch structural problems.
3. An editor cuts weak cards, punches up the rest and checks callbacks.
4. Approved cards move into `src/story/content/`. `npm run content:stress` then checks coverage, repetition and how much playthroughs differ from each other. It also checks for repeated comic shapes, dominant characters, predictable tradeoffs, and choices where both options lead to the same story.
