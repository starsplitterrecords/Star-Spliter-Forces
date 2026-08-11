# Roadmap

## North star

Build a small, finished-feeling indie game with a clear identity: **characters and worlds from Star Splitter fiction, combat Forces derived from Star Splitter Records creative languages, and music as a continuous game-state system.** Quality and distinctiveness outrank content count.

## P0 — Validate the synthesis build
- Pull the synthesis branch and run Quick Test in Godot.
- Eliminate any strict-typing/parser/runtime issues.
- Validate debug keys: level, elite, state cycle, boss, invulnerability, purge.
- Confirm Resonance/Drift/Fracture visibly and mechanically alter a run.
- Confirm Ilyra Venn is the starting character on both new and migrated saves.

## P1 — Make 90 seconds compulsively replayable
- Add hit-stop on heavy Force attacks.
- Add impact particles, kill bursts, damage numbers and stronger XP collection feedback.
- Add enemy telegraphs for charge/surge/boss actions.
- Add designed spawn formations and short encounter motifs rather than only radial spawning.
- Tune Resonance gain/loss so all three states appear naturally without feeling arbitrary.
- Make Fracture dangerous but strategically desirable for selected builds.
- Upgrade level-choice presentation so each Force is recognizable instantly.

**Gate:** a tester voluntarily presses Run Again after the 90-second test.

## P2 — Build the showcase run
- Build one Rex Fleet environment with a recognizable setting and visual grammar.
- Give Ilyra Venn a character-specific command/survival mechanic beyond base stats.
- Turn The Silence from a large enemy into a multi-pattern boss encounter.
- Implement one transformative evolution for each showcase Force.
- Integrate the first licensed Star Splitter master and track metadata.
- Add section/bar events so gameplay responds to musical structure without becoming a rhythm game.

**Gate:** a 10-minute run can be shown externally without describing the visuals/gameplay as placeholder.

## P3 — Prove character breadth
- Build a second genuinely different playable character whose incentives change movement and build strategy.
- Decide whether Ghost Driver Unit remains a literal character or becomes purely a Force once a second fictional-property character is ready.
- Add at least one second Star Splitter fictional world.
- Validate that the same Forces behave differently in different character/world contexts.

## P4 — Deep buildcraft
- Expand to 12–18 weapons before considering larger counts.
- Add selected cross-Force evolutions with surprising mechanical transformations.
- Add artifacts/passives that deliberately favor Resonance, Drift or Fracture builds.
- Add secrets, challenge modifiers and a lightweight permanent progression structure.
- Add jukebox/music discovery interface tied to tracks encountered in play.

## P5 — Production art, audio and UX
- Establish a visual bible for characters, enemies, Force effects, environments and UI.
- Replace procedural placeholders selectively; consistency matters more than asset volume.
- Add proper animation, screen feedback, transitions, pause/resume/quit, onboarding and accessibility.
- Build real layered/stem behavior where source material supports it.

## P6 — Mobile production
- Pool enemies/projectiles/pickups.
- Benchmark collision loops; migrate hot paths to spatial partitioning if required.
- Configure iOS/Android export presets, icons, launch screen and signing workflow.
- Device QA, safe areas, battery/thermal profiling and performance targets under late-run density.

## Initial launch-size target
- 6–8 meaningfully different playable characters.
- 4 highly distinctive environments.
- Roughly 30 weapons and 15–20 major evolutions/hybrids.
- 5–7 enemy behaviors/families per environment plus major bosses.
- Strong replayability rather than a huge disposable content library.
