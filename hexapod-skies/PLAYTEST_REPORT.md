# Automated playtests

## Round 1 — version 2 (hover-first flight, lock-on, per-mount jobs)

### Method

`tests/playtest.cjs` runs two bot players through every mount and habitat. The bots play through `input` only:
held keys and mouse deltas, the same signals a person produces. They see what a player sees: the goal arrow,
the lock-on hex, bird alarms. The game advances on a fixed 1/30 s step without rendering, so a 4-minute run
takes a few seconds.

| Bot | Aim speed | Reaction | Aim noise | Strike | Threats |
| --- | --- | --- | --- | --- | --- |
| Skilled | 5 rad/s | 0.15 s | ±0.03 rad | as soon as the hex turns gold | drops into the grass on a bird alarm; flees wasps if it can't fight |
| Novice | 2.2 rad/s | 0.45 s | ±0.12 rad | only when gold and close, after 0.5 s | ignores threats, follows the goal arrow, overshoots flowers |

Matrix: 2 bots × 4 mounts × 4 habitats × 2 seeds = 64 runs. Raw data: `playtests/2026-11-18-v2.json`.
The game records telemetry in `game.tele`: strikes, swoop hits and misses, damage by source, bumps, stuck time,
hover time, camera-inside-geometry time, time with no goal, and time the gold lock is available.

### Results

| | Skilled | Novice |
| --- | --- | --- |
| Runs won | 28/32 | 30/32 |
| Time to finish (median, of 240 s) | 45 s | 49 s |
| Slowest finish | 71 s | 153 s |
| First objective done (median) | 17 s | 27 s |
| Damage taken (median) | 4 | 5 |
| Runs with no damage | 15/32 | 14/32 |
| Three stars | 28/32 | 30/32 |

Damage by source across all runs: frog tongue 931, webs 96, swallow 72, wasp stings 35.
Median winning score by mount: hawk-moth 6,340, ladybird 4,510, dragonfly 4,010, honeybee 3,360.

### Findings

1. **Bug: some aphids can't be reached (ladybird, hedgerow).** Aphids on bramble canes sit inside the cane's
   collision sphere. The swoop pushes into the cane, gets pushed back, misses, re-locks the same aphid and repeats.
   Skilled runs logged about 190 swoops, 185 misses and 430 bumps, and failed at 6–7 of 20 aphids. Rendered frame:
   the camera pressed against the cane, gold hex on an aphid it cannot touch.
2. **Lock-on ignores the current objective.** After the dragonfly finished its mosquitoes in the pond, the hex kept
   locking onto mosquitoes, so the skilled bot never skimmed (0/4 in both runs) and farmed points until a frog
   or the clock ended it. The novice, who follows the arrow, won more runs than the skilled bot for this reason.
3. **Far too easy and too short.** Median finish is under a minute of a four-minute clock, almost half the runs
   take no damage, and three stars came in 58 of 64 runs. The timer and the star criteria never bite.
   Humans aim and decide more slowly than these bots, but even at 3× slower most runs end by the 2.5-minute mark.
4. **Frogs are the only real threat, and they feel unfair.** Frogs did 82% of all damage and caused both
   deaths. Mosquitoes hang over the lily pads, so the main job keeps you in tongue range. In a rendered frame, the
   windup is easy to miss.
5. **Birds almost never connect, so "dodge the dives" is free.** The dodge objective finished at a median of
   47 s whether or not the bot tried to evade. Swallows hit twice in 64 runs.
6. **Little skill expression.** A gold hex is on screen 36% of the time and swoops at prey never miss, so
   "press Space when gold" carries the game. Skilled and novice scores sit close together.
7. **The camera ends up inside stems and flower heads**: 1.6% of play time on median, up to 7.6% for the bee in the
   pond and meadow (about 15 s of a run).
8. **Bumps are frequent.** Pond reeds and bramble canes give 20–40 bumps per run; each one cuts speed by 40%,
   which breaks the swooping flow the controls are meant to give.
9. **Score is uneven between mounts.** The hawk-moth's nectar chains reach ×5 combos easily and score about double
   the honeybee.

What looks healthy: no run ever lacked a goal to follow, stuck time is under 5 s per run, webs are a
light tax (one hit per run), and every mount's core loop works end to end.

### Caveats

Bots can't judge feel, joy or readability; these numbers are proxies. They read the goal arrow perfectly,
never misread the HUD, and never get disoriented. Human players will be slower and take more hits, so treat the
difficulty findings as a floor. Real frame rate was not measured (no GPU here).

### Next round, in priority order

**Fix**
1. Make every target reachable: during the last few units of a swoop, ignore obstacle push-back; count a hit
   within 2.5 units; place aphids just outside the stem's collision; if a swoop misses, skip that target for 3 s.
2. Lock-on prefers the current objective's targets. Other edible prey still lock, but only when no objective
   target is in the cone, and the hex shows them in a muted colour.
3. Camera collision: pull the camera in along its line to the insect when it would sit inside a stem, rock or
   flower head, and fade flower heads that come within a few units of the lens.

**Give runs an arc and real stakes**
4. Stage the jobs. Each habitat run becomes three short stages that ramp up, for example for the dragonfly in the
   pond: catch 8 mosquitoes → skim and catch faster damselflies that juke → a finale (a mosquito swarm at dusk with
   the swallow hunting). Finishing early starts the next stage instead of ending the run.
5. Make birds a real threat: track hard until the last second of a dive, then commit, so a sharp turn or hiding
   at the right moment is what saves you. A dodge only counts if the bird got within 15 units.
6. Make frogs fair: a one-second windup with a bright throat pulse, a croak and an on-screen marker, and a tongue
   aimed where you were at the end of the windup, so you can see it and get out of the way. Lower damage, add a
   brief grab, and keep mosquito swarms a little away from the biggest pads.

**Reward skill**
7. Long swoops (from beyond about 18 units) let prey juke away; short swoops always land. Catching by flying
   through, with no swoop, scores a "clean catch" bonus. Each swoop costs some stamina, so spamming has a price.
8. A short window after a catch where the next swoop is free and adds to the combo, so chaining catches feels great.

**Polish and balance**
9. Turn bumps into glancing deflections (slide along the stem, keep most speed) and thin reeds near mosquito zones.
10. Normalise points per job so each mount scores in a similar range; set star thresholds per mount and habitat
    from playtest data (for example a three-star score the skilled bot reaches only with clean play).
11. Move `tests/gameplay.test.cjs` onto the fixed-step simulation so it no longer depends on frame rate
    (it failed twice under CPU load).

Re-run `tests/playtest.cjs` after each change. Targets: skilled finishes in 2–3 minutes, novice wins about 60–70%,
three stars in at most 25% of runs, no single damage source above 50%, camera clipping under 0.3%.

## Round 2 — version 3 (staged runs, one-thumb touch, fixes from round 1)

Same bots and matrix (64 runs). Raw data: `playtests/2026-11-19-v3.json`. The bots were updated to behave more like
a person: they follow the white (off-job) hex less eagerly and steer away when pinned against something.

| | Round 1 skilled | Round 2 skilled | Round 1 novice | Round 2 novice |
| --- | --- | --- | --- | --- |
| Runs won | 28/32 | 32/32 | 30/32 | 32/32 |
| Time to clear the run (median) | 45 s | 79 s | 49 s | 126 s |
| Slowest clear | 71 s | 138 s | 153 s | 278 s |
| Damage taken (median) | 4 | 11 | 5 | 54 |
| Three stars | 28/32 | 15/32 | 30/32 | 2/32 |
| Worst stuck time in a run | 26 s* | 8 s | 78 s* | 4 s |
| Swoop misses (median) | 0** | 0 | 0** | 0 |

\* during development of round 2, before the deflection fix. \*\* round 1 had a ladybird loop of ~185 misses per hedgerow run.

Damage share in round 2: swallow 64%, bat 14%, webs 11%, frogs 7% (was 82%), wasps 4%.

What changed and why:
- **Reachability:** aphid spots and flowers buried in logs, trunks, sunflower stems and the wasp nest are filtered out
  when a habitat is built (15 aphid spots and 6 flowers in the hedgerow, 15 aphid spots in the meadow). Swoops pass
  through obstacles on their last few units and a missed target is skipped for 3 s.
- **Obstacles deflect:** hitting a stem turns you around it and a log or rock lifts you over, keeping most of your speed.
  This fixed runs that wedged for over 100 s.
- **Lock-on follows the job;** off-job targets show a white hex and rank much lower.
- **Camera:** pulls in along its line to the insect instead of clipping, ignoring the flower you're hovering in.
  Camera-inside-geometry time fell to a 0.7–0.8% median, but some runs still reach 6%, mostly hovering near big
  sunflower heads. Not solved yet.
- **Stages** tripled run length for the skilled bot. **Birds** track then commit, and dodges only count if the bird got
  within 15 units or you hid. **Frogs** telegraph for a full second and aim where you were.
- **Scoring:** chains cap at ×7, aphids ×1.5, pollen 30 each plus a load bonus. Three-star scores are set so about half
  of skilled-bot wins earn them and almost no novice wins do.

Still open:
1. Camera clipping near big flower heads (fade the head, or keep the camera above it).
2. Long-range swoop jukes show up in the dragonfly data only; worth a human check on whether it feels fair or random.
3. Score spread between mounts is still about 1.6× (honeybee lowest), handled for now by per-mount star scores.
4. Difficulty for real players: the novice bot clears every run in about 2 minutes. People will be slower, and the
   target of roughly 60–70% wins needs a human playtest to confirm.

## Round 3: replayability (twists, overtime, races)

Raw data: `playtests/2026-11-20-v4-twists.json` (64 habitat runs with random twists) and `playtests/2026-11-20-v4-races.json`.

- **Twists:** every twist was cleared by both bots. Rain and heatwave make runs slower, as intended. Rain made birds
  dive so rarely that dodge goals couldn't finish, so birds now keep diving while a dodge goal is open.
- **Medals** were retuned from the data: Swift was earned in 30/32 skilled runs at 2 minutes, so it is now 80 s
  (13/32 skilled, 5/32 novice). Combo ×5 became Triple ×5 (17/32 skilled, 14/32 novice). Untouched: 6/32 skilled,
  1/32 novice. Freehand (no swoops) is never earned by the bots, which always swoop; it is meant as a human challenge.
- **Overtime:** waves now ramp faster (more targets, shorter timers). The skilled bot reaches a median of 6 waves and the novice 4.
- **Races:** the hawk-moth bot circled rings forever until it learned to ease off for tight turns, as a person would.
  Medal times are set from course length and insect speed: skilled runs earn mostly silver with some gold, and novice
  runs earn bronze.
