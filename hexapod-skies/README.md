# Hexapod Skies

A browser-based arcade flight game at insect scale. Ride a dragonfly, honeybee, hawk-moth or ladybird
through four habitats, hunt prey on the wing, gather pollen for the nest, and dodge the things that eat insects.

## Play

It is a single file with no build step. ES modules need an HTTP server, so from this folder run:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

three.js (r170) loads from jsDelivr, so the first load needs a network connection.

## Controls

You hover by default. Fly forward, let go to hover in place. Diving builds speed and climbing bleeds it off.

**Phone (one thumb).** Touch anywhere and you fly; drag that thumb to steer (up climbs, down dives, sideways turns);
lift to hover; tap to strike; push past the ring to boost.

**Desktop.**

| Action | Keys and mouse |
| --- | --- |
| Fly forward | Hold W or the left mouse button |
| Steer | Mouse (click the game to capture it), or A/D and the arrow keys |
| Strike | Space or right-click. When the hex turns gold you swoop straight onto the target |
| Boost | Hold Shift while flying (uses stamina) |
| Back off | S |
| Pause / mute | Esc or P / M |

## How a run works

Each run is three stages that ramp up, and the jobs depend on your insect. Clearing a stage adds 20 seconds.
The hex locks onto targets for your current job (a white hex marks something you can catch that isn't the job right now).
Close swoops always land; prey you swoop at from far away may dodge. Catching by flying straight through scores a
"clean catch" bonus, and swooping again within 1.6 s of a catch is free and builds a chain.

| Mount | Stage 1 | Stage 2 | Stage 3 |
| --- | --- | --- | --- |
| Emperor Dragonfly | Catch 12 flying prey | Pond: skim 4 + catch 10. Meadow/hedgerow: drive off 3 wasps + catch 10. Garden: catch 12 + dodge 2 bats | The swarm: catch 18 from a swarm + dodge 1 dive |
| Honeybee | Deliver 16 pollen | Deliver 16 + drive off 3 wasps, or deliver 18 + dodge 2 dives | Wasp raid on the hive (4 wasps + 14 pollen), or deliver 24 + dodge 1 |
| Privet Hawk-moth | Sip from 6 flowers | 6 more + dodge 2 dives | 9 more + dodge 1 |
| Seven-spot Ladybird | Eat 12 aphids | 12 more + dodge 2 dives | Aphid boom: 20 from a new colony + dodge 1 |

Threats: birds circle and sound an alarm before diving. They track you until the last moment, then commit, so
drop into the grass or turn hard just before they arrive. Frogs puff and glow their throat for a second (with a
"Frog!" marker) before the tongue lashes at where you were. Wasps chase, webs snag.

Stars: clear all three stages, finish with at least half your wings intact, and beat the score for your insect
(dragonfly 12,000, honeybee 7,800, hawk-moth 9,500, ladybird 12,000).

## Modes and progression

- **Habitat run**: every run grows a fresh layout and rolls a weather twist (fair, breezy, heatwave, rain shower,
  swarm day, dusk). An optional risk dial (hungry birds, angry wasps, sticky webs, no lock-on) multiplies your score.
  Clear all three stages within 80 seconds (the Swift medal pace) and you're offered **Overtime**: three optional
  30-second bonus waves, with 1,000 extra points for clearing all three. Your stars are banked either way.
- **Daily flight**: one habitat, insect, twist and layout per date, the same for everyone, with a guaranteed rare
  sighting, your best and a day streak. On the published page there is a shared board for today.
- **Ring race**: a fixed 14-ring course per habitat with bronze, silver and gold times. Your best run is saved and
  flies beside you as a ghost.
- **Migration**: a ten-minute campaign across all four habitats. Wings carry over, and you pick an upgrade after each leg.
- **Medals** for each insect and habitat: Untouched, Swift (under 80 s), Triple ×5, Freehand (no swoops).
- **Field journal**: 26 entries for prey, predators, flowers and four rare sightings (golden mayfly, painted lady,
  luna moth, jewel beetle) that appear in about half of runs.
- **Unlockable insects** at 3/6/9/12 stars: Red-veined Darter, Elephant Hawk-moth, Buff-tailed Bumblebee
  (rain-proof, 30 pollen) and the 22-spot Ladybird, which grazes mildew instead of aphids.
- **Rider gear** (scarves, helmets, goggles) unlocks with medals.

## How it is built

Everything is procedural: terrain from value noise, instanced grass with a wind shader, flowers and props
merged into one vertex-coloured mesh per habitat, creatures assembled from primitives, and all sound
synthesized with the Web Audio API, including a generative soundtrack that picks up as you fly faster. No external art or audio assets.

## Tests

`tests/gameplay.test.cjs` drives the game in headless Chromium on a fixed timestep (30 checks, including the one-thumb
touch control in phone emulation). `tests/features.test.cjs` covers twists, risk, daily, overtime, medals, journal,
rare sightings, variants, gear, races with ghosts and migration (31 checks). `tests/playtest.cjs` runs the bot playtest across every mount and habitat; see
`PLAYTEST_REPORT.md`. Both route the jsDelivr request to a local copy of three.js:

```sh
npm i three@0.170.0   # somewhere, e.g. a scratch folder
SP=<folder containing node_modules> node tests/gameplay.test.cjs "$PWD/index.html"
```
