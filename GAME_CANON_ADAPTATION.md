# Game Canon Adaptation

How Star Splitter fiction and music appear in Star Splitter Forces — what is
canon, what is adaptation, and what is intentionally noncanonical.

## The framing: two kinds of truth

1. **Fiction layer (Rex Fleet canon).** Characters, factions, ships, places and
   anomalies come from released Rex Fleet material (Issue 01) and current
   series data. The game is set **around Issue 01**: corridors are being
   reblazed, Venn commands Thunderbreak, raiders strike convoys in Kaldr Rift.
2. **Signal layer (noncanonical, game-original).** Star Splitter Records music
   reaches the frontier as *signals*. This crossover is **not Rex Fleet canon**
   — no released comic says Pulse Width Codex plays in the Reach. The game
   presents it as a "Signal Space" device: the Archive and Credits state that
   Forces are gameplay interpretations of real music projects and that the
   signal mystery ("the hush", The Silence) is original to the game.

Nothing in the signal layer may be used as evidence about Rex Fleet canon.

## Element-by-element

| Element | Classification | Rule |
|---|---|---|
| Explorers (Venn, Sol, Banks, Saville, Marrin) | **Canon identity, adapted kit** | Names, factions, looks from released art; abilities are adaptations consistent with documented roles (CHARACTER_REFERENCE_REGISTRY) |
| Explorer ships | Canon palettes; game silhouettes | Thunderbreak is a heavy cruiser — the game hull is a stylised top-down silhouette, scale abstracted for play |
| Character text in game | Canon descriptors or released lines only | No invented quotes attributed to canon characters |
| Enemies (Splinter Skiff, Ram Cutter, …) | **Adaptation** of the canon "unmarked raider splinter group" | No faction insignia; never labelled Shards |
| Raider camps | Game-original | Salvage piles without faction marks |
| Silent Triarch, Billie Rusk, Oren Pike | Canon, **not used as enemies** | Shards are not villains as a people; any future appearance needs owner approval |
| Black Drift Reach regions (Array Gate, Silver Wrecks, Thunderbreak Shelf, Quiet Basin, Night Corridor, Fracture Bloom) | Game-original locations in a canon area | "Black Drift" is canon (Shard dock); the dock itself is not depicted. Fracture Bloom uses a canon anomaly class |
| Kaldr Rift regions | Canon place, game-original sub-areas | "Green Corridor approach" follows page 005; no convoy deaths (page 010: "No one lost from the freighter") |
| Green beacons as safe volume | Canon-derived | Corridor beacons mark safe volume |
| Mirrorfold, Memory Well, gravitic echoes, Fracture Bloom, lightning on the shelf | Canon anomaly families, game behaviour | "Objective and measurable" — hazards, not magic |
| Lattice Survey Chart | Canon organisation (Lattice Research), game item | — |
| BHA Beacon Core | **High Era relic** (Shattering-era institution) found in the Rex Fleet era | Described as pre-Shattering; no mature faction iconography |
| Forces | **Adaptation** of real projects' documented musical language | Provisional; owner review. Taglines/fields verbatim from SSV |
| Transmissions | **Real catalog titles** (verbatim) | Audio only from authorised masters; otherwise the labelled placeholder motif |
| Signal / echo names ("GREEN ECHO", "SHELF BEACON") | Game location names | Never presented as track titles |
| The Silence, "the hush", mystery fragments | **Noncanonical, game-original** | Archive title marks it "(game original — not Rex Fleet canon)" |
| Resonance / Drift / Fracture | Game-original system | Origin: this repo `077a0bf` |
| Placeholder score and SFX | Game-original, placeholder | Credited as such; replaced by authorised stems when available |

## Canon quality gate (applied to every new element)

Before an element ships: source identified (path + revision) · approval status
recorded · identity preserved · no contradiction with released material ·
correct chronology (no mature factions in High Era content) · faction-true visual
treatment · musical association genuine · assets available and authorised · new
material labelled · improves the game rather than advertising another property.
Gaps are recorded in `SOURCE_PROVENANCE.md`, never filled with invented certainty.

## Comparison: implementation before this audit (2026-11-17)

| Finding | Severity | Resolution |
|---|---|---|
| Kess Darrow playable with no approved art; spin-off only | High | Replaced by Abby Saville (released art) |
| Raider camps and enemies used Shard pale-white + red | High | Recoloured to unmarked salvage |
| Explorer ships coloured by arbitrary accents, not faction palettes | Medium | Faction palettes + sigils |
| Invented dialogue quoted from Tessa Banks and Naomi Sol in contact beacons | Medium | Replaced with narration / released line |
| "Grain Convoy Wreck" implies convoy losses contradicting page 010 | Medium | Renamed "Green Corridor Approach" |
| Taglines invented for explorers | Low | Replaced with documented voice descriptors |
| No canonical artwork in game | Medium | Portraits, cover, project identity art, release covers via pipeline |
| Mystery labelled only "provisional" | Low | Labelled "game original — not Rex Fleet canon" |
| Track titles | — | Verified: all transmissions are real catalog titles |
| Ilyra vs Ella | Open | Ella (released); awaiting owner confirmation |

## Prioritised implementation queue

1. **[done now]** Roster gate (Abby for Kess), enemy de-badging, faction ship palettes, portraits in Departure/HUD/Archive, project and cover art in the Archive, text corrections.
2. Owner confirmations: Venn name; derivative portrait crops; Forces interpretations; "Thunderbreak Shelf" name; music rights for in-game playback.
3. Suno catalog intake once reachable → MUSIC_CATALOG_MANIFEST, add tracks as discoverable transmissions.
4. `ssr-tools` intake → durations, masters, stems → replace placeholder motifs with real stems.
5. Auric Bazaar / Auric Gate destination (released page 010; Chris Halev) — the next canon-rich environment.
6. Billie Rusk as rival or explorer (released art) with owner approval.
7. Shattering-era relic discoveries using High Era visual language (approved drafts), never mature factions.
8. Ship sprites drawn from released Thunderbreak / Verge / Shard references (asset spec in ART_BIBLE) to replace vector silhouettes.
