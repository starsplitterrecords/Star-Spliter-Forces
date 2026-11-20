# Known Issues

Severity: **S1** blocks release · **S2** important · **S3** polish.

| # | Sev | Issue | Notes |
|---|-----|-------|-------|
| 1 | S1 | Only the owner has playtested (2 sessions, web) | See `PLAYTEST.md`. |
| 2 | S1 | No mobile export presets / device build | Requires Xcode + Apple signing (owner machine) and Android SDK. |
| 3 | S1 | No authorised Star Splitter masters bundled | Archive plays labelled Force motifs. Masters + rights needed (`AUDIO_DESIGN.md`). |
| 4 | S2 | Ships/enemies/props are vector art (faction palettes); portraits/cover/project art are released sources | Ship sprites from released references still to do (GAME_CANON_ADAPTATION queue 8). |
| 14 | S1 | Suno catalog and private `ssr-tools` not accessible to the agent | Owner action needed (SOURCE_PROVENANCE). |
| 5 | S2 | Venn name pending owner decision (Ella vs Ilyra) | `DECISIONS.md` D-02. |
| 6 | S2 | Generated score never listened to by a person | Loudness/seams checked numerically only. |
| 7 | S2 | GPU/frame time on device unmeasured | CPU sim step ≈0.7 ms @ 80 enemies on desktop. |
| 8 | S2 | Corridor Run on touch dashes in move direction only | Fine with stick held; a stationary tap dashes along facing. |
| 9 | S3 | Compass labels can overlap when two targets share a screen edge | Cosmetic. |
| 10 | S3 | Menu gamepad focus order not hand-tuned | Default focus neighbours used. |
| 11 | S3 | Bot pathing (BalanceSim) can wedge on rock clusters; it detours randomly | Tool limitation, not game. |
| 12 | S3 | "36 resources still in use at exit" warning when tests quit | Harmless teardown warning in headless runs. |
| 13 | S3 | Kaldr Rift has no unique enemies, boss variant or character unlock yet | Reuses Reach enemy roster and The Silence. |
| 15 | S2 | Owner saw a browser crash after a long session; cause not reproduced | Game state is bounded in a 13-min sim and a long headless-browser soak. Possibly the browser tab/GPU process on the owner's device. Mitigated by mid-run checkpoints (D-25). Ask: which browser/device, and how long? |
| 16 | S3 | Hazard mines (pink flowers) don't carry the red threat ring | They are environment hazards; consider their own Field Guide entry. |

