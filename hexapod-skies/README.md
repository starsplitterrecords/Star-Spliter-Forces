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

| Action | Desktop | Touch |
| --- | --- | --- |
| Steer | Point the mouse where you want to fly, or WASD / arrows | Left thumb joystick |
| Strike (lunge to grab prey, hit wasps) | Space or left click | Strike button |
| Boost (uses stamina) | Hold Shift or right mouse | Boost button |
| Hover / slow down | Hold Q | Hover button |
| Pause / mute | Esc or P / M | Pause button |

## Mounts

| Mount | Strengths |
| --- | --- |
| Emperor Dragonfly | Fastest and most agile, biggest catch reach, bonus for skimming water |
| Honeybee | Carries 20 pollen, sting does double damage to wasps |
| Privet Hawk-moth | Sees in the dark (less fog at night), nectar gives double stamina, huge stamina pool |
| Seven-spot Ladybird | Heavy armour, aphids score double |

## Habitats

| Habitat | Objectives | Threats |
| --- | --- | --- |
| Lily Pond | Catch 15 mosquitoes, skim the water 5 times | Bullfrog tongues, swallow dives, spider webs |
| Wildflower Meadow | Deliver 40 pollen to the hive, drive off 3 wasps | Wasps, swallow dives, webs |
| Moonlit Garden (night) | Sip from 8 different moonflowers, catch 12 midges | Bats, webs |
| Bramble Hedgerow | Eat 25 aphids, deliver 20 pollen | Wasps, swallow dives, many webs |

Flowers with pollen glow gold; fly into the head to collect, then into the gold hex ring at the nest to deliver.
Birds warn before they dive and their shadow grows; fly low into the grass to make them lose you.
Stars: finish every objective, finish with at least half health, finish with a minute to spare.

## How it is built

Everything is procedural: terrain from value noise, instanced grass with a wind shader, flowers and props
merged into one vertex-coloured mesh per habitat, creatures assembled from primitives, and all sound
synthesized with the Web Audio API. No external art or audio assets.

## Tests

`tests/gameplay.test.cjs` drives the game in headless Chromium with Playwright (pollen, delivery, catching,
wasp combat, pause, win and downed endings). It routes the jsDelivr request to a local copy of three.js:

```sh
npm i three@0.170.0   # somewhere, e.g. a scratch folder
SP=<folder containing node_modules> node tests/gameplay.test.cjs "$PWD/index.html"
```
