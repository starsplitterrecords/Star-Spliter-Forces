# THE MOVEMENT v2: Systems Specification and Vertical Slice

This document locks down the systems that content is written against (section 11 of the v2 direction). The code is in `src/story/` and the authored content in `src/story/content/`.

## 1. Loop

1. **Someone needs your attention.** The next card in your inbox comes from a co-founder, a member or an outsider.
2. **You decide.** Two choices, each shown with a hint of its consequences. Dots on the gauges show which gauges a choice will move, not in which direction.
3. **The movement responds.** You see the reaction text, which gauges moved, who was pleased or hurt, which member groups gained ground and which customs changed.
4. **The world changes.** The simulation keeps running: people recruit, churn and mature into new groups, cities convert, and new people and problems arrive.

Decisions don't cost time. When nobody needs you, **Call a meeting** moves time forward until someone does, so active play never waits on a timer. While the game is open, one game day passes every two real minutes. While you're away, up to 14 game days are simulated (about 28 hours). Decisions that arrive while you're away wait for you; none are made for you. When you return, a short report summarises what happened.

## 2. People: the core simulation

**A. Named characters** (`characters.json`). Each has an **agenda** (expansion, purity, order, joy, money, comfort), an **ally group**, competence and a bio. At runtime each has loyalty (−100 to 100), influence (0 to 100), a role, a status (active, left, retired, rival, absent) and **memories**: short notes of decisions that hurt or pleased them.

- Every choice can declare `serves`, the agendas it helps or opposes. Loyalty changes automatically for everyone with that agenda: +4 when helped, −6 when opposed, because slights are remembered longer than favours. Authored `loyalty` changes add personal stakes on top.
- Influence drifts toward the size of the character's ally group in the membership, plus a bonus for holding a new role. **Influential people bring more of the cards**, so who reaches your desk changes as the organisation does.
- Loyalty thresholds set flags that cards can require: `<id>_disgruntled` (≤ −40), `<id>_devoted` (≥ 60). At ≤ −90 the character walks out. Authored arcs also let characters retire, leave as rivals, be promoted or come back.

**B. Member groups:** founders, casuals, enthusiasts, organizers, traditionalists, reformers, opportunists. These are counts that always sum to total followers.

- New recruits arrive mostly as casuals and enthusiasts, in proportions set by enthusiasm and resources.
- Over time members mature: casuals become enthusiasts, enthusiasts become organizers (once organizer roles exist), enthusiasts become traditionalists as traditions accumulate, and casuals become reformers when customs cause friction. High enthusiasm causes burnout back to casual.
- Churn falls hardest on casuals and opportunists.
- Choices move members between groups directly (`groups`).
- Group composition drives the gauges' long-run targets and each character's influence.

**C. The general population** is per city, within the home region: the 40 nearest cities within 260 km. Each city has population, **awareness**, **reputation** (−1 to 1) and followers. Reputation moves toward a target set by how appealing your customs are, how much friction they cause, and how much attention you attract.

## 3. Gauges

**Enthusiasm, Unity, Public Attention and Resources**, each 0–100. Every authored choice moves them. Between decisions they also drift slowly toward targets set by the membership:

| Gauge | Long-run target is raised by | …and lowered by |
|---|---|---|
| Enthusiasm | customs that demand commitment, enthusiasts | casuals |
| Unity | founders | ambiguous customs, traditionalist/reformer imbalance, disgruntled co-leaders, opportunists |
| Attention | log of follower count, visible customs, active campaigns | |
| Resources | opportunists, commercial customs, dues | active campaigns |

Time alone never pushes a gauge past 4 or 96; only decisions reach 0 or 100. Reaching an extreme brings an immediate **crisis card** (8 of them, one for each gauge and direction). Hitting a second extreme within 14 days ends your leadership with one of 8 endings. A full succession system, where the movement continues under a new leader, is deliberately left for a later release.

The gauges feed the simulation each day:

- recruitment ∝ enthusiasm × attention × appeal of customs × reputation × group mix
- churn rises with low unity, burnout and an empty treasury
- awareness grows with attention and organizers

## 4. Customs: how identity forms (`customs.json`)

Nothing is set up in advance. Customs come up during play and move through the statuses **none → proposed → practice → tradition → sacred**, or to **abandoned**.

Each custom has six properties, each 0–100: visibility, commitment, friction, appeal, commerce and ambiguity. Weighted by status, they set appeal, reputation friction, the attention baseline, the enthusiasm baseline, income and unity pressure.

- **Practices** are the unusual things members start doing, such as soup, naps, walking backward, pebbles or puddles. Each has a prominence score, and **the most prominent practice becomes the movement's central belief** (`{belief}` in text).
- **The name** is proposed by Dez, built from the central belief ("Soupism", "The Nap Fellowship"). You can accept it or write your own; free text passes the same moderation as everything else.
- **The founder's title** is proposed ("Master J"), and you can accept or reject it.
- **The weekly meeting** example from the v2 direction is the second card. The Tuesday it sets up can later become a tradition, then sacred, then the subject of a reformist petition, but only if later decisions lead there.

## 5. Story engine: content format and selection

Each card (`CardDef` in `src/story/types.ts`) has:

| Field | Purpose |
|---|---|
| `id` | Stable identity |
| `speaker` | `martin`, `agenda:expansion`, `role:treasurer`, `champion:<bind>`, `any`, or an anonymous person `{anon:{name, role}}` |
| `requires` | Era, flags (all, none, any), custom status (`practice+`), character presence/loyalty/role, gauges, followers, day, decisions, group shares, cities |
| `bind` | Context filled when the card is drawn (a city, a practice, a suggested name) and stored with the card so a save replays identically |
| `text` | The situation, with tokens such as `{title}`, `{belief}`, `{day}`, `{c.martin}` and bound keys |
| `choices[2]` | `label`, `hint`, `reaction`, `effects`, and optional free-text `input` |
| `effects` | Gauges, `serves`, loyalty, influence, group shifts, customs, flags, timed modifiers, followers, organizers, awareness, campaigns, joins/leaves/roles, era, follow-ups, chronicle memory |
| `weight`, `cooldown` (days), `spacing` (decisions), `once`, `priority`, `followUpOnly` | Frequency and repetition control |
| `setting`, `topic`, `recall`, `shape`, `twist` | Memory, callbacks and editorial novelty (see `STORY-STATE.md`) |

**Selection.** Follow-ups are scheduled at a specific day. Otherwise a card is drawn roughly every 0.4–0.9 game days, depending on era, from all eligible cards. A card is eligible when its requirements are met, it isn't on cooldown or spacing, and its speaker is present. Each card's weight is multiplied by its speaker's influence, and recent speakers are down-weighted. Crises jump the queue. Everything is seeded, so the same choices produce the same story.

**Eras:** Founding → Grassroots → Regional (→ National → International → World Order, for later production). Era changes come from authored cards, such as "We've outgrown the garage". If those cards never come, safety nets advance the era anyway.

## 6. Geography

The map is the arena; it isn't the screen you play on. Campaigns (organizers sent to a city by a decision), word of mouth, passive awareness and the 85% milestone (which earns organizers and reveals neighbouring cities) all survive from the original design. Cards decide where and how the movement spreads ("There's real interest in {city}…"). The slice is limited to the home region; growth beyond it belongs to later eras.

## 7. No AI at runtime

The shipped game reads only the bundled JSON. Generative AI is a **development tool**:

- `scripts/content/draft-batch.ts` drafts a batch of cards with Claude, using the writing bible, the schema, the cast, the existing cards and examples. It writes the batch to `content/drafts/` along with a review file.
- `npm run content:validate` checks schema, references, tokens, bounds, reachability, duplicates and crisis coverage.
- `npm run content:stress` plays dozens of games with five leadership styles (pleaser, random, order, expansion, stubborn). It reports card coverage, back-to-back repeats, decisions to each era, follower growth, idle compounding, how much playthroughs differ (names, beliefs, sets of customs) and what happened to each character.
- A person edits drafts and promotes them into `src/story/content/`.

Character memory, story chains with windows and cancellation, and customs the members invent are specified in **[`STORY-STATE.md`](STORY-STATE.md)**.

## 8. Vertical slice: what exists now

- **8 characters.** Four at the start. Agnes and Rolf join in the grassroots era, Ophelia Stroud (ambitious branch leader, agenda expansion) and Lionel Fitch (consultant who speaks in departments, agenda order) in the regional era.
- **40 customs:** 14 practices, and 14 customs the members can invent without asking.
- **148 cards:**
  - 30 founding
  - 36 grassroots
  - 23 regional
  - 21 recurring
  - 21 character cards (memory callbacks, plus twists where characters are right for the wrong reasons)
  - 9 doctrine cards (taking a stance on members' customs)
  - 8 crises
- **Arcs:**
  - Grassroots: Rolf's commercialisation, Agnes's minutes leading to a schism, Priya's burnout, the Knitting Circle feud, Kevin's memoir, soup in the boot of a car, and the Tuesday that becomes sacred.
  - Regional: Martin versus Lionel, Ophelia's rise (shared leadership or a breakaway), pilgrimages to Gary's garage, and payoffs for characters who left earlier (Agnes's *Original* movement, Rolf's subscription-box company).
- **The recurring layer** (`cards.recurring.json`) keeps the desk busy between authored beats. These are templated situations with several text variants, drawn again whenever their cooldowns allow:
  - whoever is influential pushing their agenda;
  - an *unhappy* co-leader airing grievances, or a *devoted* one asking for more responsibility;
  - someone reopening a decision you made earlier, quoted back to you;
  - newcomers and members with requests;
  - neighbours complaining;
  - the press;
  - towns feeling forgotten, branch leaders, rival towns;
  - money running tight, or a windfall.
- **Eras:** founding, grassroots and regional are written. The **National** era opens with a documentary card at 20,000 followers (or four towns at 85%), and the written story currently stops there. Entering the Regional era widens the map from 40 to about 110 towns.
- **Continuous idle simulation** with bounded offline progress and a report when you return.

**Stress-test results** (15 runs × 300 days, five leadership styles):

- **Starved days** (nothing left that could be drawn, the stall reported in playtest) are a median of 0 and a maximum of 7. Before the recurring layer it was about 196 of 200.
- **Quiet days** (nobody at the door, including ordinary gaps between arrivals that *Call a meeting* skips) run 25–45 of 300, mostly in the Regional era.
- 136 of 148 cards were seen, with 0 back-to-back repeats.
- **Character memory:** each run writes about 170 memories. About a third were witnessed and about 40% name a rival; about 18 get called back.
- **Story chains:** 101 delivered, 1 expired and 6 cancelled across 15 runs.
- **Members' customs:** about 5 per run. The automated players mostly reform or condemn them; tolerating is rare.
- **Editorial novelty:**
  - the same comic shape twice running about 6 times per run;
  - no character presents more than about 33% of named-character cards;
  - a median story distance of 0.37 between counterfactual branches;
  - 3 of 52 branched choices found inert.
- Leaving the founding era takes about 25 decisions.
- Most careful playthroughs reach the National era in 100–260 game days (130–330 decisions).
- Leadership endings follow play style:
  - careful styles almost never lose their leader;
  - random play rarely does;
  - reckless expansion often goes bankrupt;
  - always picking the first option gets you out-believed early.

## 9. Known gaps (next steps)

- **The National era** is not written; the story ends at the documentary. Players are told so on screen.
- **Succession:** the movement continuing under a new leader.
- **Quiet stretches in the Regional era** could be cut further with more regional recurring cards.
- **Loyalty patterns from automated play:**
  - Priya leaves in about 40% of runs, because many choices oppose her joy agenda;
  - Dez and Martin are usually devoted.
  - Real playtests should confirm whether this feels right.
- **Rare content:** a few arcs (Agnes's schism and its regional payoff, Rolf's company) appear in under 10% of runs. That's fine for surprise, but worth watching.
