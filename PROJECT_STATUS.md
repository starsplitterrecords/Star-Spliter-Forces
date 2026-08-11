# Project Status

## Current direction

Star Splitter Forces is now being built as a synthesis of the earlier survivor-game experiments and the expanded Star Splitter universe.

- **Characters and worlds** come from fictional properties such as Rex Fleet.
- **Forces** are Star Splitter Records creative languages expressed as combat systems.
- **Music** is a continuous systemic layer rather than background decoration.
- Player performance moves through **RESONANCE / DRIFT / FRACTURE** rather than a simple good/bad meter.

## Implemented

- Godot 4 mobile-first project and main scene.
- Title, character selection, settings, results, persistent save/unlocks.
- **Commodore Ilyra Venn** is the showcase starting character from Rex Fleet.
- Ghost Driver Unit remains an unlockable alternate experimental character.
- Save migration automatically unlocks Ilyra for existing development saves.
- Approximately 10-minute normal survivor run plus a 90-second accelerated test mode.
- Desktop keyboard and touch virtual-stick movement.
- Auto targeting and six weapon families: Pulse Bolt, Orbit Shard, Resonance Wave, Ion Lance, Ghost Mine, Warm Circuit Drone.
- Weapons are now assigned to Force families: Pulse Width Codex, Star Splitter Rex, Resonant Currents, Ghost Driver Unit.
- Live **Resonance / Drift / Fracture** performance-state system.
- State affects enemy pressure, visuals, weapon cadence, damage and special behavior.
- Performance responds to kills, elites, damage and XP collection.
- Four passive upgrade tracks and randomized level-up selection.
- Upgrade UI identifies the originating Force for each weapon.
- Pulse Bolt + Signal Amplifier evolution into a multi-shot barrage.
- Three standard enemy families now have differentiated motion: weaving wisps, charging hounds, orbiting carriers.
- Null elites surge; The Silence has escalating boss movement phases.
- XP drops, pickup magnetism, level curve, HP/damage/death/victory.
- Procedural environment changes visual state in Resonance and Fracture.
- Beat/bar/intensity-aware AudioDirector with Force, state and boss metadata ready for Star Splitter masters/stems.
- Debug harness: `1` level-up, `2` elite, `3` cycle state, `5` boss, `6` invulnerability, `7` purge enemies.
- Enemy population cap to protect mobile performance.

## Validation status

The project has previously been opened successfully in Godot and the first strict-typing parser issues were corrected through live testing. This synthesis pass has not yet been run on the user's Godot installation. First action after pulling is therefore a 90-second Quick Test plus direct debug-key validation of upgrades, states, elite and boss behavior.
