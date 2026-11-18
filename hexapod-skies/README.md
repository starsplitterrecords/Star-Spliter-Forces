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

You hover by default. Hold to fly, let go to hover in place. Diving builds speed and climbing bleeds it off.

| Action | Desktop | Touch |
| --- | --- | --- |
| Fly forward | Hold W or the left mouse button | Hold Fly |
| Steer | Mouse (click the game to capture it), or A/D and the arrow keys | Left stick |
| Strike | Space or right-click: when the hex locks on, you swoop straight onto the target | Strike |
| Boost | Hold Shift while flying (uses stamina) | Boost |
| Back off | S | |
| Pause / mute | Esc or P / M | Pause button |

## Mounts and their jobs

Every insect does what it does in nature, so the objectives depend on which one you ride.

| Mount | Does | Lock-on targets |
| --- | --- | --- |
| Emperor Dragonfly | Hunts mosquitoes, gnats and midges; fights wasps; skims water | Flying prey, wasps |
| Honeybee | Gathers pollen for the nest (20 per trip); stings wasps for double damage | Pollen flowers, the nest, wasps |
| Privet Hawk-moth | Hovers inside flowers to sip nectar; sees in the dark | Unvisited flowers |
| Seven-spot Ladybird | Eats aphids off stems (double points); heavy armour | Aphids |

## Habitats

| Habitat | Dragonfly | Honeybee | Hawk-moth | Ladybird | Threats |
| --- | --- | --- | --- | --- | --- |
| Lily Pond | 12 mosquitoes, 4 skims | 16 pollen, dodge 2 dives | 6 flowers, dodge 2 dives | 14 aphids, dodge 2 dives | Frogs, swallow, webs |
| Wildflower Meadow | 12 gnats, 2 wasps | 30 pollen, 2 wasps | 10 flowers, dodge 2 dives | 16 aphids, dodge 2 dives | Wasps, swallow, webs |
| Moonlit Garden | 12 midges, dodge 2 bats | 14 pollen, dodge 2 bats | 8 flowers, dodge 2 bats | 14 aphids, dodge 2 bats | Bats, webs |
| Bramble Hedgerow | 12 gnats, 2 wasps | 20 pollen, 2 wasps | 8 flowers, dodge 2 dives | 20 aphids, dodge 2 dives | Wasps, swallow, webs |

Each run lasts four minutes. A gold arrow always points to your next goal, and the first run walks you through
the controls. Birds sound an alarm before diving: drop into the grass or turn hard, and each dive you escape
counts as a dodge. Stars: finish every objective, finish with at least half health, finish with a minute to spare.

## How it is built

Everything is procedural: terrain from value noise, instanced grass with a wind shader, flowers and props
merged into one vertex-coloured mesh per habitat, creatures assembled from primitives, and all sound
synthesized with the Web Audio API, including a generative soundtrack that picks up as you fly faster. No external art or audio assets.

## Tests

`tests/gameplay.test.cjs` drives the game in headless Chromium with Playwright (hover and flight, lock-on swoops for each mount,
skimming, pollen, nectar, wasps, dodging, win flow). It routes the jsDelivr request to a local copy of three.js:

```sh
npm i three@0.170.0   # somewhere, e.g. a scratch folder
SP=<folder containing node_modules> node tests/gameplay.test.cjs "$PWD/index.html"
```
