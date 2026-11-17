# QA Plan

## Automated (run on every change)

`tools/run_tests.sh` imports the project, runs `tests/TestRunner.tscn` headless, and
fails on any failed test **or** any engine `SCRIPT ERROR` / parse / compile error.

| Test | Covers |
|---|---|
| scripts_compile | Every script compiles; main scene loads |
| data_integrity | Cross-references (forces, evolutions, passives, regions, transmissions, unlockability); retired canon names absent |
| save_migration_and_recovery | Prototype save migration, retired ids, JSON int coercion, corruption → backup recovery |
| simulated_expedition_minute | 60 s bot flight: travel, kills, level-ups, upgrades applied, region tracking, enemy cap |
| upgrade_pause_cycle | Level-up pauses sim, unique options, pick resumes, pause menu toggles, stale pick ignored |
| signal_discovery_attunes_force | Resonance lock, tuning, Force attunement, weapon grant, persistence, moving signal |
| hidden_sites_follow_state | Fracture-only visibility, state transitions + hysteresis, rifts |
| signal_locks | Stillness, guardian, ensemble relays |
| camps_and_echoes | Camp materialise/clear/reward/dematerialise; echo spawn/tune/expire |
| extraction | Must leave gate first; 3 s hold extracts |
| boss_completion_and_unlocks | Climax gating, no extraction during boss, all three phases, completion, Kess unlock, currency |
| death_keeps_discoveries | Defeat persists discoveries; Second Wind |
| evolution_offer | Evolution offered/applied, base weapon retired |
| every_weapon_fires | All 11 weapons and 11 evolutions deal damage |
| harmony_discovery | Harmony triggers; Drop lands on downbeat; Dub Drop echoes |
| abilities | All five explorers' abilities activate with cooldowns |
| real_frames | Engine-driven frames (queue_free, signals) with no stale references |
| menu_screens_build | Every menu screen builds; no squeezed labels or off-screen buttons |
| hud_fits_aspect_ratios | Ability/pause buttons on-screen at 16:9, 19.5:9, 4:3; touch target ≥ 88 px |
| performance_budget | Sim step < 8 ms with ~80 enemies (prints measured average) |

## Tools

- **BalanceSim** — full-expedition bot; use after any tuning change. Compare timeline to
  `PLAYTEST.md` table.
- **Capture** — renders 16 real frames (menus, every region, level-up, map, boss) under
  Xvfb for visual review; run after any UI/visual change.

## Manual (per milestone)

- Human playtest script in `PLAYTEST.md`.
- Device pass: iPhone (notch + Dynamic Island safe areas), midrange Android, tablet 4:3.
- Interruption: background/foreground mid-expedition, phone call, low battery mode.
- Accessibility: text scale 1.4 on every screen, reduced flashes, no-shake, colour-blind
  simulation screenshots.
- Gamepad: complete an expedition and navigate every menu without touch/mouse.
