# Playtest Log

## Automated play (balance bot) — 2026-11-17

`tools/BalanceSim.tscn` plays whole expeditions with a simple explorer bot
(steers to known sites, swerves for motes, backs off contact, uses its ability
when hurt or crowded, explores unvisited regions, waits for echoes, confronts at
12:00). It has no dodging of telegraphs, so damage taken is pessimistic.

| Run | Outcome | Time | Level | Kills | Boss fight |
|-----|---------|------|-------|-------|------------|
| Venn / Pulse Width Codex | complete | 13:30 | 17 | 953 | 75 s |
| Naomi / Ghost Driver Unit | complete | 14:19 | 17 | 774 | 131 s |
| Kess / Star Splitter Rex (earlier tuning) | complete | 12:58 | 17 | 886 | 43 s |

Findings that drove changes (see `DECISIONS.md` D-10 – D-12):
1. Signals were pickups collectible in ~20 s → tuning + locks + tuning raids.
2. Player out-ran all enemies; travel had no friction → raider camps, speed −12%.
3. Fixed discovery positions exhausted in ~4 min → seeded positions + echoes.
4. Boss scaled with level → fixed HP; confronting early is now a gamble.
5. Resonance was permanent → kill/mote gains reduced; Drift is now the default.
6. Bot wedged between rocks → iterative collision resolution + wall sliding.

## Human playtest script (not yet run)

Run on a phone if at all possible. Do not explain anything beyond "drag to fly".

1. **First 60 s** — Can they move without instruction? Do they notice weapons fire
   automatically? Note first level-up time and whether the cards are read.
2. **First signal** — Do they find the Opening Carrier without help? Do they stop in the
   ring? Do they understand the tuning ring / lock message?
3. **Curiosity** — Ask at 3 min: "Where are you going and why?" Record answer verbatim.
4. **States** — Do they notice Resonance/Drift/Fracture changing? Can they say what
   caused it?
5. **Extraction** — Do they find out how to go home without being told? (Hint text + gate.)
6. **Archive** — After the run, do they open the Archive unprompted? Do they press play?
7. **Run again?** — Do they voluntarily start another expedition?

Record: device, session length, deaths, discoveries, and every moment of confusion.

## Owner playtest 2 — 2026-11-20 (web build)

"It's fun!" Liked the regions and the variety of finds (explorers, weapon systems,
weapons, music). Problems reported and responses:

| Report | Response |
|---|---|
| Text still too small; clicked through cards unread | UI text ×1.3, larger world labels, cards stay longer and list concrete gains (D-22, D-23) |
| Can't tell pickups from enemies | Red threat rings on every hostile, warm enemy palette, Field Guide + first-sighting explainers (D-23) |
| Crashed after a long session | **Found and fixed:** the web build's WebGL name tables leaked ~16 MB/min of browser memory (D-27); now flat. Game state itself was bounded. Mid-run checkpoints also added so a crash can't lose progress (D-25) |
| Save my progress | Checkpoints every 45 s + every discovery; recovered on next launch (D-25) |
| Never beat a boss | Silence HP −20 %; gate panel now explains how to call it out (D-24, D-26) |
| Going back through the gate is confusing | Gate is an explicit two-button choice; no accidental extraction (D-24) |
| Not clear what I'm picking up or why to care | Category tags, "why it matters", discovery "+ gained" lines, level-up card types (D-23) |

