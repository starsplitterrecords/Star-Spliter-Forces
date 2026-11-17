# Technical Architecture

Godot 4.3, GDScript (typed), GL Compatibility renderer (mobile-safe), 1280×720
design viewport, `canvas_items` stretch with `expand` aspect, sensor-landscape.

## Layout

```
scripts/core/     Profile (autoload), Audio (autoload), InputSetup, SpatialHash
scripts/data/     GameData — all content as plain data (characters, Forces, weapons,
                  passives, enemies, regions, discoveries, transmissions, workshop)
scripts/run/      GameRun (orchestrator) + ExpeditionWorld, ForcePlayer, ForceEnemy,
                  WeaponSystem, ProjectileSystem, HazardSystem, PickupSystem,
                  PointsOfInterest, FxLayer
scripts/ui/       main.gd (screen flow), run_hud.gd (HUD/level-up/pause/map), UiTheme
tests/            TestRunner.tscn + test_runner.gd (headless gameplay suite)
tools/            run_tests.sh, BalanceSim, Capture, generate_audio.py
```

## Simulation

- `GameRun.step(delta)` advances everything deterministically (input → player → region →
  state → abilities → spatial hash → enemies → weapons → projectiles → hazards → pickups →
  POIs → FX → director → camps/echoes → environment → gate → beat fallback → music).
  `_process` calls it (clamped to 1/20 s, slowed during hit-stop). Tests call it directly.
- Level-up: `pending_levels` → `_open_level_up` pauses the tree (`get_tree().paused`);
  HUD runs with `PROCESS_MODE_ALWAYS`; `choose_upgrade` unpauses.
- Broad-phase: `SpatialHash` (96 px cells) rebuilt per frame; queries padded by the
  largest inserted radius. World obstacles use a static 220 px hash.
- Rendering: projectiles, pickups, hazards, FX, POIs each draw in one canvas item.
  Static world art is baked into 800 px chunk nodes that draw once; the engine culls
  off-screen chunks. Enemies redraw only when on screen.
- Pools/caps: 420 shots (pooled), 260 motes (merge beyond), 360 particles, 90 ambient
  enemies (+30 camp members), far idle enemies despawn; camps materialise < 1300 px and
  dematerialise > 2100 px keeping their remaining count.

## Persistence (`Profile`)

JSON at `user://star_splitter_forces_save.json`, `version` 2. Writes go to `.tmp`, the
previous save is copied to `.backup.json`, then the temp file is renamed over the save.
Load falls back to the backup and reports it. `migrate()` upgrades the prototype schema
(v0/1) and retired ids, coerces JSON floats back to ints, and drops unknown content ids.
The game saves at expedition end, on settings exit, on workshop purchase, and when the
app is backgrounded (expeditions in progress are paused, not saved mid-run).

## Input

`InputSetup.ensure_actions()` registers keyboard/gamepad actions at boot. Touch is
handled in the HUD (`_input`): floating or fixed stick on the move side; Buttons for
ability/pause/map receive touches first via the GUI.

## Adding content

- Force: add to `FORCES` (+ `motif_layer` in `SCORE_LAYERS`, generator layer), a weapon
  with per-level tables and an evolution, then a signal discovery + transmission.
- Region: add to `REGIONS` (shape, palette, props style, enemy table) and the destination's
  `regions` list; prop styles live in `ExpeditionWorld._build_region`.
- Destination: add to `DESTINATIONS`; the departure screen and world builder are data-driven.

## Budgets (targets)

60 FPS on capable devices, 30 FPS option. CPU sim step ≤ 4 ms on midrange mobile
(measured 0.6–0.75 ms desktop headless @ ~80 enemies). Audio ≈ 4.3 MB.
