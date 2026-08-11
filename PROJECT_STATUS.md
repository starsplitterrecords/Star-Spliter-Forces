# Project Status

## Current direction

Star Splitter Forces is an exploration-first survivor roguelite built to be satisfying, readable and replayable rather than frantic.

- **Characters and worlds** come from fictional properties such as Rex Fleet.
- **Forces** are Star Splitter Records creative languages expressed as combat systems.
- **Music** is a continuous systemic layer and a discovery reward.
- **Exploration** exposes players to projects, tracks and Forces through in-world signals.
- The persistent **Star Splitter Archive** becomes a record collection assembled by play.
- Player state moves through **RESONANCE / DRIFT / FRACTURE**; none is simply a failure state.

## Implemented

- Godot 4 mobile-first project.
- Commodore Ilyra Venn as showcase explorer.
- 20-minute normal expedition target plus 90-second systems test.
- Lower ambient enemy populations and periodic authored patrol encounters rather than constant exponential swarm pressure.
- Three discoverable signal sites placed away from the starting route.
- Signals identify Resonant Currents, Star Splitter Rex and Ghost Driver Unit material and persist after a run.
- Discoveries can change the active musical Force during an expedition.
- Persistent Archive screen for discovered projects, transmissions/tracks and Forces.
- Expedition results explicitly report discoveries.
- Discovery objective replaces survival time as the central run motivation.
- Six existing weapons, passive upgrades and evolution system retained.
- Resonance / Drift / Fracture state system retained and slowed to support deliberate play.
- Differentiated enemy movement: weaving wisps, charging hounds, orbiting carriers, elite and boss behaviors.
- Touch and keyboard movement.
- AudioDirector carries Force/state/intensity/boss metadata for eventual mastered Star Splitter integration.
- Debug harness: `1` level-up, `2` patrol encounter, `3` state, `4` bring nearest discovery into test range, `5` climax boss, `6` invulnerability, `7` purge.

## Design test

The next playtest is not "can the player survive?" It is:

1. Does movement through mostly readable space feel pleasant?
2. Does a distant signal create curiosity strong enough to change direction?
3. Does reaching a signal feel like a meaningful discovery rather than collecting a pickup?
4. Does the player want to open the Archive afterward?
5. Does another unexplored signal create a reason to run again?

## Validation status

The earlier prototype was opened successfully in Godot and strict-typing parser issues were corrected through live testing. This exploration pass still needs a Godot parse/runtime pass after pull. Use Quick Test and debug key `4` to validate discovery persistence rapidly before judging normal expedition pacing.
