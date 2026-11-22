# Game Design Document — Star Splitter Forces

Describes the game **as implemented**. Proposed-but-unbuilt items are marked _(planned)_.

## 1. Pillars

1. **"I wonder what is over there."** Exploration is the motive; combat gives it texture.
2. **Music is mechanics.** Each Star Splitter project's documented musical language becomes a Force — a way of fighting, with its own sound.
3. **Calm with spikes.** Wandering enemies ignore you until you come close; pressure arrives as readable events (patrols, tuning raids, guardians, the climax).
4. **One thumb.** Auto-fire, analog movement, one optional ability button.

## 1a. The Corridor Chart (the spine)

Player-facing name: **stages** (owner, 2026-11-22). Code and save data keep the
older internal name `stop` (`GameData.CHART`, `Profile.stop_done`).

Design principles (D-31), from owner playtest 3:

1. **One path.** The player always knows the next step: the gold beacon on the chart.
2. **One objective per expedition**, stated before launch and on the HUD throughout.
3. **One new idea per stage**, named ("NEW — RESONANCE: …") in the briefing and again as
   the expedition starts. Nothing appears in the world before its stage introduces it:
   a stage only spawns its own discoveries.
4. **The reward is promised first, then paid.** The chart shows the prize under every
   stop; the results screen shows what was unlocked and what comes next.
5. **Every unlock has one source**, on the chart: explorers, Forces, the Workshop,
   Open Expedition and the next corridor.
6. **Progress is never lost.** A stage is saved the moment its objective is met.
7. **The fiction is the structure.** After the Shattering the corridors went dark; you
   relight this one beacon by beacon, each expedition leaving from the last beacon lit.

| # | Stage | Objective | Introduces | Reward |
|---|---|---|---|---|
| 1 | First Light (Array Gate) | Tune the Opening Carrier | flying, shards, tuning | first track |
| 2 | Hold the Lane | Hold for 3:00 | raiders, level-ups | Fleet Workshop |
| 3 | Gravefire (Silver Wrecks) | Answer the distress call | explorer contacts, lurkers | Tessa Banks |
| 4 | Green Echo (Quiet Basin) | Tune in Resonance | Resonance, resonators | Force: Resonant Currents |
| 5 | The Escort (Night Corridor) | Answer the Verge beacon | hazards / mines | Naomi Sol |
| 6 | Shelf Beacon (Thunderbreak Shelf) | Tune; beat its guardian | elites / guardians | Force: Star Splitter Rex |
| 7 | Night Trace | Tune a moving signal | moving signals | Force: Ghost Driver Unit |
| 8 | Ignition Chorus | Bring three relays online, tune | relays | Force: Ion Drive Orchestra |
| 9 | Hexagonal Haze (Fracture Bloom) | Tune in stillness | Fracture, rifts | Force: Minor Collapse |
| 10 | The Hulk | Destroy the Dreadnought | the Dreadnought | Abby Saville |
| 11 | The Token | Recover a Fracture-hidden token | hidden sites | Jex Marrin |
| 12 | The Silence | Defeat The Silence | the boss | Kaldr Rift, Open Expedition |

Side signals (optional, appear when their parent is relit): Mandatory Proximity → Jax
Orien; After Hours → Night Motion Archives; Now Serving G-53 → Bjorn; OCHRE-9 → Lucia;
Spectacle → Supersonic Being; Analog Campfire → Warm Circuits Rise; The Sunforge →
Brandon Mack. Data: `GameData.CHART`.

Next corridors (not built): Kaldr Rift as a second chart (Robots Sing Love Songs, Before
the Reboot, new enemies and its own boss).

## 2. Expedition structure (Open Expedition)

| Phase | Implementation |
|-------|----------------|
| Departure | Choose explorer + signature Force (starts with that Force's primary weapon). |
| Exploration | 12,800 × 9,000 px Reach; six regions + open drift; compass, minimap, map (M). |
| Development | XP motes → level-ups (3 cards, 4 with Workshop) incl. guaranteed weapon option; evolutions; harmonies. |
| Discovery | Signals (tune 4.5 s; some locked), contacts, artifacts, fragments, anomalies, caches, camps, echoes. |
| Decision | After 3 signals: extract (3 s at gate) or confront The Silence (button / E at gate). |
| Climax | The Silence, 3 phases; arrives on its own at 19:00 if not confronted. |
| Return | Results: discoveries, unlocks, Signal, mastery; Archive updated. |

Outcomes: **complete** (+120 Signal, completion unlocks), **extracted** (full Signal),
**defeat** (discoveries kept, Signal halved). Abandon from pause counts as defeat.

## 3. Movement & controls

Velocity-based: accel 3000 px/s², brake 3800 px/s² — responsive without drift.
Iterative obstacle resolution with wall sliding. Camera leads velocity by 0.18 s.
Touch: floating joystick on the move side (right-handed default = left side), dead
zone 12%, follows the thumb beyond 1.6× radius; optional fixed stick.

## 4. Explorers (Rex Fleet)

| Explorer | Hull | Speed | Ability (cd) | Trait | Trade-off |
|---|---|---|---|---|---|
| Ella Venn — Thunderbreak | 140 | 232 | Hold the Line (16 s): 5 s bulwark, destroys shots, slows/pushes, repairs | +1.5 armour | Slowest |
| Naomi Sol — Verge escort | 82 | 300 | Corridor Run (6 s): invulnerable dash, damaging slipstream | Half hazard damage; +15% dmg at full speed | Fragile |
| Tessa Banks — Gravefire | 110 | 248 | Seal the Breach (20 s): +35% hull, 40 shield 4 s | Repair 4 per 40 motes; big pickup | −10% damage |
| Abby Saville — Shard command ship | 118 | 244 | Call the Captains (18 s): allied Shard cutters ring and defend for 8 s | +20% damage while holding position | −10% fire rate |
| Jex Marrin — Veil courier | 86 | 264 | Veil Step (15 s): enemies lose track, +35% speed | +40% Signal; free reroll each level | +15% damage taken |

Unlocks: Naomi — Verge escort beacon (Night Corridor); Tessa — Gravefire distress call
(Silver Wrecks); Jex — Veil route token (Fracture Bloom, visible only in Fracture);
Abby — first completion of the Reach. Portraits and identities: `CHARACTER_REFERENCE_REGISTRY.md`. Mastery: 4 perks each (thresholds 120/360/800/1500 xp).

## 5. Forces

| Force | Mechanic | Weapons → evolutions (passive) |
|---|---|---|
| Pulse Width Codex | Build & Drop: hits fill Build; peak → Drop lands on next bar (AoE + 4 s tempo) | Pulse Bolt → Anthem Bolt (Amplifier); Riser → The Drop (Capacitor) |
| Resonant Currents | Echo & Space: attacks repeat as decaying echoes; +30% vs isolated targets | Sub Wave → Deep Pressure (Hull); Echo Tap → Dub Siren (Harmonics) |
| Ghost Driver Unit | Momentum: sustained movement → up to +50% damage | Power Chord → Encore (Thrusters); Trail Charges → Ghost Mode (Multiplexer) |
| Star Splitter Rex | Impact: 2.2× knockback, +35% vs elites/bosses | Ion Lance → Breaker Lance (Plating); Riff Blades → Titan Riff (Wide Stereo) |
| Ion Drive Orchestra | Ensemble: drone sections fire on the beat | Section Drones → Full Orchestra (Collector) |
| Warm Circuits Rise | Improvisation: never repeats a pattern; jam grows while unhurt | Analog Star → Long Jam (Scanner) |
| Minor Collapse | Wall of Sound: aura swells when slow/still | Fuzz Wall → Wall of Sound (Nanoweave); Feedback Bloom → Overload Bloom (Gain Stage) |
| Supersonic Being | Hype: kill streaks raise Supersonic damage (to +60%); every 15 kills a spectacle burst | Mic Drop → Headliner (Compressor) |
| Night Motion Archives | Afterimage: sweeping searchlights leave lingering cutting afterimages | Nightline → Night Shift (Bandwidth) |
| Robots Sing Love Songs | Duet: companion machines; touched targets take +30% from other Forces | Duet Unit → Choir of Machines (Afterglow) |
| Before the Reboot | Tracker: 16-step sequencer; downbeat notes +30% | Pattern Cannon → Full Module (Metronome) |

Ion Drive Orchestra also has Brass Swell → Fanfare (Long Delay). New upgrades: Gain Stage (critical hits), Long Delay, Bandwidth, Compressor, Afterglow, Metronome. New harmonies: Main Stage, Late-Night Dub, Machine Chorus, Chiptune Anthem.

Harmonies (both Forces ≥ level 3): Dub Drop, Stadium Riff, Festival Score, Road Jam,
Reverb Wall, Score for a Boss Fight. Discovered in play, then listed in the Archive.

A newly tuned signal attunes its Force immediately **and grants its primary weapon**
if a slot is free — discovery changes what you can do mid-run.

## 6. Resonance — Drift — Fracture

Meter 0–100, drifts to 50 (0.7/s). Enter Resonance ≥72 (leave <66); Fracture ≤28 (leave >34).

| State | Benefits | Costs | Raised/lowered by |
|---|---|---|---|
| Resonance | +20% damage, +15% fire rate (×Harmonics), Build fills faster, fewer spawns, Resonance-hidden sites | −6% speed (vs base) | Resonators +35, discoveries +8–14, echoes +10, kills/motes (small) |
| Drift | +12% speed, 1.5× scanner | — | default |
| Fracture | +30% damage, +50% XP per kill, Fracture caches & hidden sites | +20% damage taken, +30% spawns | Taking damage −6, rifts −38 |

Shape-coded aura (rings / jagged arcs) and glyphs (◆ ◇ ✕) — never colour alone.

## 7. World — Black Drift Reach

Regions: **Array Gate** (hub/extraction), **Silver Wrecks** (hull wreckage, disguised
lurkers), **Thunderbreak Shelf** (crystal ridges, telegraphed lightning that also hits
enemies), **Quiet Basin** (calm pools, resonators, gravitic echoes), **Night Corridor**
(walled lane with breaches; green beacons are safe volume), **Fracture Bloom** (phase
anomaly, rifts). Open drift: ~260 asteroids, campfire signal, buoy, mirrorfold portal pair.

Signal locks: Green Echo — Resonance; Shelf Beacon — guardian captain; Hexagonal Haze —
stillness; Ignition Chorus — three relays; Night Trace — moves away until cornered.

## 8. Enemies

Splinter Skiff (weaving), Ram Cutter (telegraphed charge), Swarm Tender (summons),
Rail Picket (keeps range, telegraphed shot), Mine Hauler (lays pools), Wreck Lurker
(disguised as debris), Shield Tug (halves damage to allies), Gravitic Echo (anomaly),
Splinter Captain (elite, telegraphed shockwave; drops an upgrade), Splinter Gunship (3-shot bursts, from 3:00), Drift Leech (latches and slows, from 2:00), Veil Flicker (Phase anomaly that marks a point and reappears there, from 2:30), **Splinter Dreadnought** mini-boss at 8:00 (telegraphed twin broadsides, summons skiffs, drops an upgrade), The Silence (boss).

## 8a. Feedback

Hits spray sparks along the impact direction and squash the target; kills shatter into tumbling wreckage, flash and leave scorch marks; elites and the Dreadnought explode with smoke, shockwaves, hit-stop and a camera zoom-punch. Light effects use additive blending. Critical hits show a gold "CRIT". Damage numbers are throttled to one per enemy per 0.25 s. Shake, punch and hit-stop follow the accessibility settings.
Wanderers idle until within aggro range; a portion spawn engaged (30% → 65% over time).

## 9. Progression

Signal currency → Fleet Workshop (frames, drives, collectors, rerolls, 4th option,
second wind, warm start). Forces attuned permanently by signals. Transmissions,
fragments, harmonies and explorers recorded in the Archive.

## 10. Archive

Tabs: Records (project pages, transmissions with verbatim catalog titles/dates, play
master or labelled motif, link to official platform where documented), Forces
(mechanics, weapons, harmonies), Explorers (bio, mastery), Mystery (fragments),
Discoveries (log with location hints for missing items).
