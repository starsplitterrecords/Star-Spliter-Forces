# Release Checklist

Nothing here is complete unless ticked with evidence. Store submission requires owner approval.

## Rights & canon
- [ ] Owner confirms Venn's name (D-02) and approves all character kits and new lore (The Silence).
- [ ] Written confirmation of rights for every bundled master/stem; credits list each track.
- [ ] Owner approves catalog metadata display (several "Upcoming" labels are past-dated).
- [ ] Approved artwork exports replace placeholders where used.
- [ ] Inter OFL licence shipped (`assets/fonts/OFL.txt`) ✔ present; Godot MIT notice in credits ✔.

## Build
- [ ] iOS export preset, bundle id, signing team, icons, launch screen.
- [ ] Android export preset, keystore (owner-held), adaptive icon, target SDK current.
- [ ] Version/build numbers set (`application/config/version`).
- [ ] Debug cheats unreachable in release (gated by `OS.is_debug_build()` + Ctrl) — verify on export.
- [ ] Remove "QUICK TEST (dev)" (debug-only) — verify on export.

## Quality
- [ ] `tools/run_tests.sh` green on the release commit.
- [ ] BalanceSim timelines reviewed for every explorer.
- [ ] Human playtests: ≥ 5 new players complete the PLAYTEST script.
- [ ] Device performance: 60 FPS (or stable 30) on target devices for a full expedition.
- [ ] Save migration tested from every shipped save version.
- [ ] No S1/S2 items open in `KNOWN_ISSUES.md`.

## Store
- [ ] Privacy: no data collection, no accounts, no network required (current build: none) — confirm in store forms.
- [ ] No ads, no IAP (current build: none).
- [ ] Screenshots/trailer captured from release build.
