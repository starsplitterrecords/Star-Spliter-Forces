# THE MOVEMENT: Story State and Character Memory

This specification describes what the game remembers and how cards read and write it. It exists so that a thousand cards written by different people, or drafted by AI at development time, form one evolving comedy rather than a thousand disconnected jokes. The systems overview is in `STORY-ENGINE.md` and the writing rules are in `WRITING-BIBLE.md`.

The code lives in `src/story/types.ts` (the schema), `src/story/memory.ts` (memory) and `src/story/engine.ts` (chains, doctrine and the effects that write state).

## 1. The layers of story state

Each layer has one job. A card should read and write the layer that matches what it means.

| Layer | Answers | Written by | Read by |
|---|---|---|---|
| **Flags** (`flags`) | Did this happen? (`hq_hall`, `biologists`, `dez_promise_settled`) | `effects.flags`; the engine sets `<id>_left`, `<id>_devoted` and similar | `requires.flags`, `notFlags`, `anyFlags`; chain conditions |
| **Customs** (`customs`) | What does the movement do, and who decided it? | `effects.custom`, `effects.stance`, emergence | `requires.customs`, binders (`tradition`, `practice1`, `emergent:*`) |
| **People** (`chars`) | How do they feel about you right now? | `serves`, `loyalty`, `speakerLoyalty`, `otherLoyalty`, `starterLoyalty`, `influence`, `join`, `leave`, `role` | `requires.chars`; speakers (`unhappy`, `devoted`, `agenda:x`) |
| **Memory** (`memory`) | What exactly happened between you and them? | Automatic rules, plus `effects.remember` | `card.recall`, `requires.memory`, the People sheet |
| **Chains** (`scheduled`) | What is about to happen because of what you did? | `effects.followUps` | The engine delivers, waits, expires or cancels each one |
| **History and chronicle** | What did you decide, in order? | Every choice; `effects.memory` writes the chronicle | `pastDecision` binder (`rec.reopen`); the History sheet |

**Rule of thumb.** Use a *flag* for a fact about the world. Use *loyalty* for a feeling. Use a *memory* when the joke depends on the details: when, where, in front of whom, and who you chose instead. Use a *chain* when something must happen later because of this choice.

## 2. Character memory

### 2.1 The record

```ts
interface MemoryRecord {
  who: string;          // the character who remembers
  kind: MemoryKind;     // overruled | backed | passed_over | favoured | promise | broken_promise
                        // | credited | blamed | vindicated | embarrassed
  topic: string;        // what it was about: the card's `topic`, else the card id
  cardId: string;
  choice: 0 | 1;
  quote: string;        // the choice label exactly as the player said it
  day: number;
  decision: number;
  meeting: number;      // which weekly meeting: floor(day / 7)
  setting: 'private' | 'meeting' | 'public';  // from the card: was it witnessed?
  other?: string;       // whom you sided with instead (or against)
  weight: 1 | 2 | 3;    // small, notable, unforgettable
  resolved?: boolean;   // apologised for, repaid, settled
  recalled: number;     // how many times a card has brought it up
}
```

These fields support a line like Martin's: *"You rejected it **publicly**, **in favour of Dez**, **three meetings ago**: '**Let Dez keep his 4 a.m. meetings.**'"* Each bold detail comes from one field: `setting`, `other`, `meeting`, and `quote`.

### 2.2 When memories are written

Writers don't need to remember to create memories. Every choice runs these rules:

1. **The speaker.** If the speaker's loyalty moved by 4 or more, they remember being *backed* (positive) or *overruled* (negative).
2. **Who you chose instead.** If you overruled the speaker and someone else's loyalty rose by 4 or more, the speaker's memory names them as `other`. That person remembers being *favoured* over the speaker. In the reverse case (you backed the speaker and someone lost out), the loser remembers being *passed over* for the speaker.
3. **Bystanders.** Anyone else whose loyalty moved by 8 or more remembers being favoured or passed over.
4. **Weight.** A change of less than 10 is weight 1, 10 or more is weight 2, and 18 or more is weight 3. **A witnessed slight counts one step heavier**: being overruled at a meeting hurts more than being overruled privately.
5. **Doctrine.** When you take a stance on a custom someone started, they remember it (§4).
6. **Authored memories.** `effects.remember` adds anything the rules can't infer. Examples are a *promise*, being *credited* or *blamed*, being proven right (*vindicated*), or being *embarrassed*.

```json
"remember": [{ "who": "speaker", "kind": "vindicated", "weight": 2 }]
```

`who` can be `speaker`, `other` (the person named in the recalled memory), `starter` (whoever started the bound emergent custom) or a character id.

Each person keeps one memory per choice, and the stronger reading wins. The movement keeps at most 400 memories and forgets the least salient first.

### 2.3 Salience: what is on someone's mind

```
salience = weight × e^(−age_days / 90) × 1.5 if witnessed × 0.3 if resolved × 0.1 if recalled in the last 10 days
           ÷ (1 + 0.7 × times recalled)
```

Witnessed slights last. Settled ones fade. Something that was just brought up gets a rest. The People sheet shows each character's three most salient memories.

### 2.4 Calling a memory back

A card declares a `recall` query. It is eligible only when a matching memory exists. When drawn, it binds the most salient match (weighted at random) and fills these tokens:

| Token | Example |
|---|---|
| `{mQuote}` | `Let Dez keep his 4 a.m. meetings` |
| `{mAgo}` | `last Tuesday`, `three meetings ago`, `about two months ago` |
| `{mWhere}` | `in front of everyone at the meeting`, `in public`, `privately` |
| `{mOther}` | `Dez` |
| `{mWho}` | the person who remembers (useful when someone else, such as Agnes, quotes it) |
| `{mWhen}` / `{mDay}` | `on day 12` / `12` |
| `{mTopic}` | the card's `topic` (`the evacuation plan`), or `that` |

The query fields are:

- `who`: `any` (the default), `speaker`, or a character id.
- `kind`: one kind or a list.
- `topic`
- `witnessed`: true or false.
- `hasOther`: the person you sided with must still be around.
- `minAgo` and `maxAgo`: in meetings.
- `minWeight`
- `unresolved`: defaults to true.
- `exclude`: character ids to skip.

Use `"speaker": "recall"` to make the person who remembers present the card.

A choice decides what happens to the memory:

| `effects.recall` | Meaning |
|---|---|
| `resolve` | Settled. It fades and won't be called back again. |
| `deepen` | +1 weight. The grudge grows. |
| `forget` | Struck from the record (Agnes's favourite). |

`otherLoyalty` changes loyalty for `{mOther}`, so standing by a decision can please the person you sided with.

### 2.5 Writing callbacks well

- **Quote, don't summarise.** `{mQuote}` is the player's own words. Make them the punchline.
- **Callbacks need distance.** Use `minAgo` of at least 2. A grudge from last week is a complaint; a grudge from three meetings ago is a character.
- **Give the player a real choice.** Apologising should cost something (unity, momentum, or the other person's goodwill), and standing firm should gain something.
- **Different people remember differently.** Martin keeps a laminated record. Agnes quotes the minutes. Gary forgets, then remembers at the worst moment. Write the voice; the mechanics supply the facts.

## 3. Story chains

### 3.1 The follow-up

```json
"followUps": [{
  "card": "twist.dez_delivers",
  "delay": 3,                // earliest arrival, in days
  "maxDelay": 9,             // latest arrival; after this the punchline has expired (default delay + 10)
  "chance": 1,
  "requires": { "gauges": { "attention": ">=40" } },                          // must hold when it arrives
  "cancelIf": { "anyFlags": ["dez_promise_settled", "dez_left", "dez_rival"] }, // drop it the moment this holds
  "speaker": "same"          // keep the original speaker (cancelled if they leave)
}]
```

### 3.2 Lifecycle

```
planted ──(before delay)──▶ waiting ──(delay reached)──▶ due
   │                                                     │
   └─ cancelIf holds, or a "same" speaker has left ─▶ CANCELLED
                                                         │
             due ── requires (and the card's own requires) hold ──▶ DELIVERED
             due ── not yet ──▶ keeps waiting ── past maxDelay ──▶ EXPIRED
```

Each state's stats are counted (`s.chains`), and the stress test reports them. In the current library, 15 runs produce about 100 deliveries, 1 expiry and 6 cancellations.

### 3.3 Patterns

- **Either/or outcomes.** Schedule two follow-ups with opposite `requires`. Each outcome card sets a shared flag that the other's `cancelIf` watches. Dez's weather presenter works this way: success if attention is at least 40, a flop otherwise.
- **Punchlines that need their setup.** Use `cancelIf` on the flag or departure that would make the joke meaningless (for example `priya_left` for the picnic aftermath).
- **Something that will happen eventually.** Use a long `maxDelay` and a `requires` that waits for the right moment.

## 4. Emergent doctrine: customs the members invent

Customs have an **origin**: `founder` (the default, decided at your desk) or `members` (they started it without asking).

- **Emergence.** From the grassroots era on, the simulation lets members adopt one of the `emergent: true` customs in `customs.json` (14 in the library, prefixed `emergent.`). It happens at a rate that rises with enthusiasm, enthusiasts and traditionalists. Each custom can name a likely `startedBy` character, such as Gary for *Whale facts before the minutes* or Agnes for *Arriving exactly one minute early*. Only one unaddressed custom exists at a time, and at most seven are active.
- **Stances.** The founder then takes a position:

| Stance | Effect |
|---|---|
| **endorsed** | It becomes a tradition and yours too. The starter remembers being *credited*. |
| **tolerated** | It stays unofficial and keeps growing (+0.12 prominence a day). Its ambiguity weighs on unity. |
| **reformed** | You keep it but change it. Its friction is halved and its prominence drops. The starter remembers being *overruled*. |
| **condemned** | It is abandoned. It may carry on **underground**, more likely the more devoted the membership is. An underground custom keeps 30% of its weight, is less visible and causes more friction. The starter remembers it at weight 3. |

- **Cards** bind a custom with `emergent:<stance>[:starter|:grown]`. Examples are `emergent:none` (not yet addressed), `emergent:tolerated:grown` (grown big while you looked away) and `emergent:underground`. The cards supply `{emergent}` and `{emergentBy}`. Choices set `stance` and can change `starterLoyalty`.
- **The doctrine cards** cover the whole life of such a custom:
  - noticed: by its starter, a purist, an organiser, or a confused member;
  - grown while tolerated;
  - mutated after you endorsed it;
  - carried on underground;
  - defended by originalists against your reform;
  - credited in the press.

## 5. Card metadata for coherence

| Field | Purpose |
|---|---|
| `setting` | `private`, `meeting` or `public`: decides whether memories were witnessed. |
| `topic` | A short human phrase (`the picnic`) that callbacks can name. |
| `shape` | The comic structure. See the list in `types.ts` (`proposal`, `escalation`, `literalism`, `procedure`, `overpromise`, `commerce`, `feud`, `outsider`, `callback`, `vindication`, `backfire`, `schism`, `drift`, `logistics`, `crisis`). |
| `twist` | `right_wrong_reasons` or `wrong_reasonable`. The character subverts their own agenda. |

**Selection uses shape.** A card that repeats the previous decision's shape is down-weighted ×0.35, and one that repeats the shape from two decisions ago ×0.7. This cut back-to-back repeats of the same structure from about 24 to about 6 per 300-day run.

## 6. Editorial novelty (`npm run content:stress`)

The stress test plays many games with five leadership styles and then reports:

1. **Comic shapes:**
   - each shape's share of a playthrough;
   - the worst 15-decision window;
   - how often a shape appears twice in a row;
   - any shape over 22% (flagged).
2. **Character dominance:**
   - the most frequent speaker in each run and their share;
   - the worst 20-decision window held by one character.
3. **Predictable tradeoffs:**
   - the most common gauge trades;
   - **dominated choices**, where one option is no worse on any gauge and costs nobody more;
   - **no-cost cards**;
   - **agenda predictability**: for each character, how consistently serving their agenda moves each gauge the same way. Over 85% is flagged as a "button".
4. **Counterfactual branches.** At set decisions the game is snapshotted. Both choices are played forward 25 days with identical luck. The resulting movements are compared by flags, customs (with stance), relationships, the cards that followed, name and belief, size and fate. **Inert choices**, where both options led to effectively the same story, are listed by card.

The validator (`npm run content:validate`) also warns when:

- a character has no twist card;
- a card has no shape;
- a recall card never quotes its memory;
- a chain condition refers to a flag nothing sets.

## 7. Open questions (next steps)

- **Memory and selection.** Memories currently surface through recall cards. A natural next step is to let heavy, unresolved memories raise a character's chance of presenting `unhappy` or `devoted` cards, and colour their reactions.
- **A topic registry.** At 1,000 cards, `topic` should come from a shared vocabulary (`the meeting day`, `the soup`, `money`) so callbacks can target themes, not just cards.
- **Promises as obligations.** A `promise` memory could carry a due date and turn into `broken_promise` automatically when it lapses.
- **Succession.** When a leader falls, memories should transfer: characters remember the old leader, judge the new one against them, and the new leader inherits the grudges.
- **Content backlog from the novelty report.**
  - Dominated choices remain in older cards: `found.handshake`, `found.symbol`, `found.whales`, `found.husband`, `found.constable`, `grass.mugs`, `grass.principles`, `grass.sacred_day`, `grass.weekend`, `grass.whale_wednesday`, `rec.windfall`, `reg.reformers_lite`.
  - Choices that serve Dez's and Ophelia's expansion agenda are about 90% "+enthusiasm +attention −resources", which makes them predictable buttons.
