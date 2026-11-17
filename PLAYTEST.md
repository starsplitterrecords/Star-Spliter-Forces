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
