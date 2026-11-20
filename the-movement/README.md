# THE MOVEMENT

*A Completely Reasonable Path to World Domination.*

An absurdist movement-building strategy / incremental simulation. Invent a ridiculous philosophy, recruit followers city by city across a real-world map, earn zealots, build outposts, face opposition, survive schisms and rival movements, and try to reshape an (entirely fictional) world around your founding customs, which come back again and again in the news, disputes, splinter groups and the ending.

The game has two modes:

- **The Movement (v2, main mode)**: you lead an increasingly large, increasingly absurd group of people. Co-founders, members and outsiders bring you problems; you choose one of two answers, and the movement responds. Its name, customs and central belief emerge from those decisions. The people remember how you treated them. A continuous simulation (with bounded offline progress) keeps the membership recruiting, drifting and splitting into groups while you're away. This is currently a **vertical slice**: the founding and grassroots eras, with 6 characters and 74 authored cards. The systems spec is in [`docs/STORY-ENGINE.md`](docs/STORY-ENGINE.md) and the writing bible in [`docs/WRITING-BIBLE.md`](docs/WRITING-BIBLE.md).
- **Classic Strategy Edition**: the original map-based simulation described below.

Everything runs in the browser. You don't need an account, an API key or a network connection after the first load.

---

## The Movement v2 at a glance

- `src/story/`: the story engine (`engine.ts`), data model (`types.ts`), content validator (`validate.ts`) and automated players (`autoplay.ts`).
- `src/story/content/*.json`: the shipped content library (characters, customs, cards). No AI or network is used at runtime.
- `src/components/story/`: the dilemma screen, the movement's response, and the People / Customs / Map / History sheets.
- Content pipeline:
  - `npm run content:validate` is the editorial gate.
  - `npm run content:stress -- [runs] [days]` reports coverage, repetition, how much playthroughs differ, pacing and what happens to each character.
  - `npm run content:draft -- --era grassroots --count 12 --brief "..."` is a **development-time** tool that drafts a batch with Claude into `content/drafts/` for human review. It needs `ANTHROPIC_API_KEY`, and nothing it produces ships until a person edits it and moves it into `src/story/content/`.
- Tests: `tests/story.test.ts`. Browser check: `node e2e/story.mjs`.

## Quick start

```bash
cd the-movement
npm install
npm run build && npm start      # http://localhost:3000
# or: npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Vitest unit and integration suite (engine, world, events, persistence, performance) |
| `npm run lint` | TypeScript type check |
| `npm run e2e` | Full browser playthrough with Playwright, run against a running server (`BASE_URL=http://localhost:3000`). It saves screenshots to `e2e/screenshots/` |
| `npm run balance -- [games] [hours]` | Automated balancing: plays many seeded games with different doctrines and modes and reports time-to-milestones |
| `npm run build-standalone` | Builds `dist-standalone/the-movement.html`, the whole game in one file you can open directly in a browser (no server; AI narration off) |
| `npm run build-data -- <geonamescache/data>` | Regenerates the bundled city/country dataset |

**Debug mode:** open `/?debug=1` or enable it in Settings. This adds 20×/100× speed and a Debug panel: accelerate time, add followers, zealots and influence, raise resistance, spawn splinters, jump to phases 3–7, trigger any event, and edit a doctrine's derived attributes.

**Optional AI narration:** set `ANTHROPIC_API_KEY` on the server, then turn on *AI narrative enhancement* in Settings. The route at `src/app/api/narrate/route.ts` asks Claude to rewrite an event's headline, article and quote. The output is checked against a strict JSON schema, moderated, and rejected if it contains numeric outcomes. It only changes presentation; the simulation has already decided every effect. Without a key the game uses its procedural narrative.

---

## How it plays

1. **Found the movement.** An 11-step wizard with a live preview: the `__________ism` name and its follower names (you can override them), the founder's title (`Master J.`), the headquarters city, type and look, 1–3 principles, a spirit animal, four temperament sliders, the mandatory customs, names for your gatherings and outposts, and a banner and emblem. It ends with a generated founding proclamation and a **FOUND THE MOVEMENT** button. You can randomize any field or the whole movement, or write your own entries. Custom text goes through a deterministic moderation filter that answers in the game's voice.
2. **Choose the first city.** You get three small towns near your headquarters, each showing its difficulty, local modifier and reward. The founder leads that first campaign in person.
3. **Convert.** Followers rise continuously. With the default tuning the first city reaches **85%** in about 45–90 seconds. That earns a zealot and reveals three new cities, while the towns you didn't pick start picking up followers passively.
4. **Expand.** You get more campaign slots, 11 campaign types (one of them is built from your own most visible doctrine, such as a *Hat Parade* or *Spring Jamboree*), 43 upgrades across six branches, outposts that produce zealots every 24 hours of real time, Movement Funds, national and international spread, and statistics down to state/province level.
5. **The world reacts.** It moves from Indifference to Amusement, Concern, Organization, Institutional Resistance, International Significance and finally World Transformation. Fictional opposition groups (*Citizens for Normal Hats*, *Coalition Against Unscheduled Hootenannies*) form after roughly six successful campaigns. Some of their efforts backfire.
6. **Lose control of your creation.** Splinter groups break off over your actual doctrines: Orthodox wants the purist reading, Progressive wants the tempting substitute, Radical goes mystical, Regional wants local control. Independent rival movements also appear. You have nine ways to respond to factions, five kinds of proclamation (one of which reverses an earlier proclamation), doctrinal drift, bureaucracy and founder control.
7. **Win.** World Domination needs ≥95% of the modeled world population, majorities in 75% of countries, and cohesion held through a stabilization period. Your history picks one of seven endings: Benevolent Absurdity, Bureaucratic Nightmare, The Founder Has Lost Control, Great Schism, Accidental Utopia, Eternal Committee or Supreme Authority. Each ending gets a narrative built from your original beliefs and key events, plus a downloadable founder's certificate (PNG). After winning you can keep playing in sandbox mode or start **New Game+**, where your old movement shows up as a historical precedent with no gameplay advantage.

---

## Architecture

```
src/
  engine/            Deterministic simulation. Pure TypeScript, no React.
    types.ts         All typed entities (Movement, Doctrine, CityDyn, Campaign, Outpost, Faction, GameEvent, Snapshot, GameState, ...)
    config.ts        Every balancing parameter and the Casual / Standard / Chaos presets
    rng.ts           Seeded, serializable PRNG (state stored in the save)
    geo.ts           Bundled world dataset, spatial grid, neighbour lookup, population tiers
    ideology.ts      Ideology Interpretation Engine: names, doctrine attributes, movement profile, moderation, proclamation
    sim.ts           newGame, campaigns, zealots, outposts, upgrades, proclamations, fixed-step advance, offline catch-up, debug tools
    events.ts        Dynamic event and news system (~30 definitions), choices, delayed effects, opposition, rivals
    effects.ts       The only place event and choice consequences change state
    factions.ts      Splinters, rivals, precedents, defection, responses
    stats.ts         City → state/province → country → region → continent → world aggregation, plus CSV export
    victory.ts       Victory conditions and endings
    achievements.ts  Achievements, including doctrine-specific ones
    save.ts          Serialization, schema migrations, repair of damaged saves
    autoplay.ts      Automated player used by balancing, tests and debug
  content/           Motif lexicon (48 doctrine motifs) and preset/name pools
  components/        React UI: wizard, canvas map, panels, modals, charts
  store/game.ts      Zustand store. The engine mutates GameState and the store bumps a version counter
  lib/               IndexedDB storage (3 slots + backups), WebAudio sounds, AI client
  app/               Next.js App Router page and the optional /api/narrate route
scripts/             Data build and balancing
tests/               Vitest suites
e2e/                 Playwright playthrough
```

### Key systems

- **The ideology turns into gameplay.** Each doctrine gets nine attributes on a 0–100 scale (visibility, difficulty, appeal, identity, controversy, ambiguity, organizational cost, commercial opportunity, intensity). They come from transparent rules (category baseline, keyword motif, wording) and every contribution is listed in `Doctrine.derivation`. Each doctrine also gets a **motif**: a noun, a heresy, a purist reading, a radical reading, an industry, a shortage, a measurement, a showcase campaign, an opposition name and headline templates. Custom doctrines with unknown words get a motif built from their own key noun. Motifs feed the news, disputes, splinter names, shortages, campaign types, achievements and endings. The doctrines together form a movement profile (conversion and resistance multipliers, splinter risk, zeal), with temperament as a soft modifier, and contradictions in the profile can generate jokes.
- **Conversion.** Followers are whole people. Each step adds `eligible × (1 − e^(−rate·dt))`, carrying fractions forward in an accumulator, where eligible = awareness × (population − other movements) − followers. The rate combines campaign type and fit with the movement, founder and zealot power, city size, enthusiasm, resistance, saturation and holdouts, upgrades, outposts, nearby adoption, boosts and bureaucracy drag. Passive conversion uses neighbour influence, national share and outposts. Population outside the modeled cities (the hinterland) follows each country's urban adoption, so world percentages never treat the city list as the whole world and never double-count anyone.
- **Determinism.** The simulation runs in fixed steps of 1 s, decoupled from rendering. All randomness comes from the seeded RNG stored in the save. Reloading and continuing gives exactly the same result as never having saved; there's a test for this.
- **Offline progress.** Elapsed real time, capped at 24 h by default, is replayed in at most ~300 analytic steps, so milestones, outpost cycles and events happen in order. Decisions that come up while you're away wait for you. Outposts keep a persisted `lastProductionTime` and catch up deterministically without producing twice.
- **Invariants checked by tests:** followers stay between 0 and the population (counting other factions); zealots are never double-assigned; first-time milestones fire once even if a city loses and regains control; there are no duplicate discoveries; totals add up across every geographic level; save and reload are equivalent.

### Data

The 10,451 cities and 243 countries come from GeoNames `cities15000`/`countryInfo` (CC-BY 4.0) via the MIT-licensed `geonamescache` package, with UN subregions from `world-countries` (ODbL). Borough and district entries that sit on top of a larger city are merged to avoid double counting. The map is Natural Earth via `world-atlas` (public domain). Populations are game estimates from a fixed 2018-era snapshot. State and province names are exact for the US, Canada, Australia and the UK; elsewhere they are labelled by the region's largest city. No political, religious or demographic attributes of real places are modeled. Every social reaction in the game is fiction.

---

## Balancing

All tuning lives in `src/engine/config.ts` (`BALANCE`, `MODES`) and `src/engine/upgrades.ts`. `npm run balance` plays seeded games across modes and doctrine sets and reports time to first 85%, first zealot, first outpost, first opposition, ten cities, each phase and victory, along with the ending and a stuck counter. With the shipped tuning, the hyper-efficient autoplayer reaches the first 85% in about 40–55 s, opposition in about 3 min, and victory in a few hours of game time. Human play is slower, and outposts and offline progress add to it.

## Limitations and notes

- Moderation is a deterministic keyword filter. It can't recognize every real living person, so the fiction framing and the AI route's server-side checks are the second line of defense.
- The headquarters picture and the founder emblem are procedural SVGs; there are no generated founder portraits. Music is an optional ambient drone made with WebAudio, and sound effects are synthesized. Neither autoplays.
- The map draws Natural Earth 1:110m country outlines, so very small countries are shown only as their city markers.
