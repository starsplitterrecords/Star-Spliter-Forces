# Project Status

_Last updated: 2026-11-17 · branch `claude/star-splitter-forces-dev-gq8dto`_

## Summary

The prototype (one ~1,100-line set of minified scripts plus a scene-scanning
autoload) has been rebuilt into a modular Godot 4.3 project with a headless
test suite, a balance simulator, a visual capture tool and generated
placeholder audio. A full expedition — departure, exploration, discoveries,
upgrades, extraction or climax boss, results, persistent Archive — is playable
start to finish without developer intervention (verified by tests and the
balance bot, not yet by human playtesters).

## Implemented (verified by automated tests or rendered captures)

**Core loop**
- Departure screen: explorer + signature Force + destination. Two destinations: Black Drift Reach and Kaldr Rift (unlocked by first completion).
- Expedition: six handcrafted regions with seeded variation, ~350 collision obstacles,
  parallax starfield, region banners, fog-of-war minimap, full map, edge compass.
- Objective: tune 3 signals, then extract at the Array Gate *or* confront The Silence.
  Extraction is available any time after leaving the gate (3 s hold). The Silence arrives
  on its own at 19:00.
- Outcomes: complete / extracted / defeat. Defeat keeps discoveries, halves Signal.

**Characters** (Rex Fleet canon identities; kits provisional) — Commodore Ella Venn,
Captain Naomi Sol, Tessa Banks, Abby Saville, Jex Marrin — all on the released Issue 01 cast plate, with released portraits. Each has a distinct hull,
ability (bulwark / dash / repair+shield / survey ping / veil cloak), trait, trade-off,
and a 4-step mastery track.

**Forces** — 7 projects, each with a mechanic: Build & Drop (PWC), Echo & Space (RC),
Momentum (GDU), Impact (Rex), Ensemble (IDO), Improvisation (WCR), Wall of Sound (MC).
11 weapons × 5 levels with per-level tables, 11 evolutions, 11 passives, 6 cross-Force
harmonies.

**Resonance / Drift / Fracture** — meter with hysteresis; each state has benefits
and costs, music layers and visible/hidden sites tied to it.

**Exploration content** — 7 signals (4 with project-specific locks, 1 moving),
2 character beacons, 3 artifacts (2 with permanent perks), 4 fragments + 2 via
echoes, 2 anomalies (memory well, mirrorfold portal pair), 24 supply caches,
3 Fracture caches, 4 resonators, 4 rifts, ~13 raider camps, Night Corridor safe
beacons, Thunderbreak lightning strikes, timed echo transmissions.

**Enemies** — 9 archetypes (wanderer, charger with telegraph, summoner, ranged with
telegraph, mine-layer, disguised ambusher, shield support, elite with shockwave,
anomaly echo) + 3-phase boss (ring with gap, beam + summons, silence zones).

**Progression** — Signal currency, 7-item Fleet Workshop, character unlocks via
discoveries/completion, Force attunement, Archive (Records, Forces, Explorers,
Mystery, Discoveries), mastery.

**Audio** — 20-layer adaptive score (region, Force, state, intensity, boss) and 33 SFX,
all generated placeholders; beat clock drives Build & Drop and Ensemble timing.

**Platform** — touch floating/fixed joystick with handedness option, ability button,
safe-area margins, gamepad + keyboard actions, 30/60 FPS cap, text scale, reduced
flashes/hit-stop, screen shake slider, damage numbers toggle, nav assist toggle.
Versioned atomic saves with backup recovery and prototype migration.

## Measured

- 22/22 headless tests pass (`tools/run_tests.sh`).
- Simulation step ≈ 0.6–0.75 ms with ~80 enemies on desktop CPU (headless, no rendering).
- Balance bot (5 characters): ~13–14 min expeditions to completion, level 15–17 at
  the climax, boss fights 45–130 s.

## Independent code review (2026-11-17)

10 defects found by a separate review pass (guardian respawn loop, Naomi dash with no cooldown, touch stick sticking after pauses, second finger unable to press HUD buttons, beat weapons firing while paused, score restarting over catalog playback, level-up after run end, Naomi hazard trait incomplete, gate button under the stick, lore cards timing out behind level-ups). All fixed; regression test added.

## Source intake (2026-11-17)

Six source deliverables written from inspected files (see `SOURCE_PROVENANCE.md`). Canon fixes applied: roster gate (Abby replaces Kess), de-badged enemies, faction ship palettes, released portraits/cover/project art via a provenance pipeline, invented quotes removed, Kaldr naming aligned with page 005/010, noncanonical signal layer stated in the Archive. Not reachable: Suno profile, private `ssr-tools`.

## Not verified

- **No human has played this build.** Feel, readability and fun are unvalidated.
- No real iOS/Android device run (export presets exist but no signed build); GPU performance unmeasured.
- Audio mix has only been checked numerically (seams, loudness), not by ear.
- Gamepad navigation in menus is implemented via focus but untested with hardware.

See `KNOWN_ISSUES.md` and `ROADMAP.md`.
