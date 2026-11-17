# Game Design Document — Star Splitter Forces

Describes the game **as implemented**. Proposed-but-unbuilt items are marked _(planned)_.

## 1. Pillars

1. **"I wonder what is over there."** Exploration is the motive; combat gives it texture.
2. **Music is mechanics.** Each Star Splitter project's documented musical language becomes a Force — a way of fighting, with its own sound.
3. **Calm with spikes.** Wandering enemies ignore you until you come close; pressure arrives as readable events (patrols, tuning raids, guardians, the climax).
4. **One thumb.** Auto-fire, analog movement, one optional ability button.

## 2. Expedition structure

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
| Minor Collapse | Wall of Sound: aura swells when slow/still | Fuzz Wall → Wall of Sound (Nanoweave) |

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
Splinter Captain (elite, telegraphed shockwave; drops an upgrade), The Silence (boss).
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
