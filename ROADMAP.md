# Roadmap

Prioritised and actionable. Milestones follow the production directive (A–H).

## Now — Milestone A/B close-out (stability + the satisfying minute)

1. **Human playtest of the first 3 minutes** on desktop and on a phone (see `PLAYTEST.md`
   script). Highest-value unknown in the project.
2. Owner decision on the Venn name (Ella vs Ilyra — see `DECISIONS.md` D-02).
3. Listen to the generated score in-game; adjust layer levels in `tools/generate_audio.py`
   (`LEVELS`) and the mix in `GameRun._update_music`.
4. Add iOS + Android export presets, app icon and launch screen; first device build.

## Next — Milestone C/D (exploration worth doing, musical identity)

5. Region-specific enemy variants and one mini-boss per region (Shard captain types).
6. Two more anomaly families (Lattice Tide lanes, Gravitic echo wells).
7. Archive: project artwork panels (needs approved artwork export from
   StarSplitterVisions), per-transmission notes, listening history.
8. Stem-aware transitions once any authorised stems exist (`AUDIO_DESIGN.md`).
9. Ability touch UX: hold-to-aim for Corridor Run on touch (currently uses move direction).

## Later — Milestone E/F (depth + content)

10. Second destination (proposed: Kaldr Rift — canon convoy passage) reusing the
    data-driven region system; completion unlock already wired.
11. Abby Saville (summoner) as sixth explorer; Billie Rusk as optional anti-hero/boss.
12. Expand Forces: Supersonic Being, Night Motion Archives, Robots Sing Love Songs,
    Before the Reboot (no releases listed — needs owner input before any transmission).
13. Challenge modifiers ("Hush levels") unlocked by completion.
14. Weapon count 11 → ~20 with a second weapon per later Force.

## Polish — Milestone G/H

15. Replace vector placeholder art per `ART_BIBLE.md` asset specs.
16. Controller remapping UI, colour-blind palette review, localisation framework.
17. Device profiling (midrange Android, iPhone 12-class), thermal/battery checks.
18. Licensing review of every transmission and master before distribution.

## Done this cycle

- Modular rebuild, headless tests, balance simulator, capture tool, placeholder audio,
  five-character roster, seven Forces, signal locks, camps, echoes, Archive, Workshop.
