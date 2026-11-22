# Canon Registry

Indexed inventory of the Star Splitter fictional properties relevant to the game.
Status: **R** released (published on Star Splitter Visions) · **A** approved
unpublished production draft · **D** working data/script · **—** name only.
Sources and revisions: see `SOURCE_PROVENANCE.md`.

## 1. Properties

| Property | Status | Premise (source) | Game suitability |
|---|---|---|---|
| **Rex Fleet** | R (Issue 01 "Green Corridor", 2026-08-15, 22 pp); A (I02, most of I03); D (I04–I12) | "After the Shattering, three rival powers carry different versions of history into the same contested frontier." (SSV `series/rex-fleet.json`) | **Primary.** Explorers, factions, ships, places, anomalies |
| Rex Fleet spin-offs (Glass Horizon, Ghostwind Arrow, Slip Knife, Aegis Vigil, Crimson Warden, Stormwell Archive) and Academy titles | D (no released or approved art) | RP `data/shows/rex-fleet-*/` | Later: candidates only once approved art exists |
| **Shattering of the Corridors** (prequel) | A (24 approved I01 drafts, RP manifest); — on SSV ("Coming soon", page 022) | Collapse of the High Era corridor network; "Before the corridors reopened, generations grew up cut off…" (SSV page 022) | Historical artifacts only, in High Era visual language (§4) |
| Vikings 2026! | R (Issue 01, 2026-08-22, 26 pp) | Viking warriors processed by NYC's Department of Temporal Integration (SSV) | **Signal Space guest** (owner direction 2026-11-20): Bjorn playable, Gunnar escort, DTI intake beacon landmark |
| Azure Reach | R | Social-media-famous marine park workplace comedy (SSV) | Not used |
| Stardust Station | R (Issue 01 "Mandatory Proximity", 2026-08-29) | Orbital workplace sitcom (SSV) | **Signal Space guest**: Jax Orien playable; station landmark; crew referenced (Zib, Pixa) only in ability text |
| Backyard Rockets | R (Issues 01–02) | Mojave rocketry workshop vs "Tethergrid" (SSV) | **Signal Space guest**: Lucia playable, OCHRE-9 relay rocket landmark; Tethergrid named, never fought |
| Sunforge Outlaw (incl. **Los Lagartos**, `C_sun_lagartos`) | cover only (SSV, in development) | Pursuit/survival under a relentless sun (SSV); Los Lagartos "itinerant brotherhood" (RP) | **Signal Space guest**: Brandon Mack (name from RP working data) playable, Sunforge landmark; no unreleased plot used |
| Low Tide Signal | cover only | Flooded-coast mystery | **Harbor Signal branch** (sea): Harbor Phase place + flood gate landmark and the flooded coast, from the cover and series page text only; no characters, no plot |
| Division Threshold | in production, no art | "Who gets to count as a person…" — the Stack | Not used ("PX-7" not found in any source) |
| Echoes of a Forgotten War | D only | Excavation colony Olyria-Prime uncovers an ancient war (RP `regions.json`) | Not used (no released/approved art) |
| Forces of Darkness LLC | A (prototype strip) | Evil fantasy empire run like a corporation | Not used |

**Decision:** Star Splitter Forces is a Rex Fleet–era game. Other properties appear
only as Signal Space guests (owner direction 2026-11-20: "all three [guest explorers,
places, Archive] but adapted for the series and their setting"), using the
noncanonical framing in `GAME_CANON_ADAPTATION.md`.

## 2. Rex Fleet chronology

High Era (Cooperative Network, BHA) → BHA crisis / the Shattering → long isolation
→ divergent survival cultures (Fleet/Crowns, Verge, Shards) → Reach and Resolve
reconnection ("corridors reblazed") → Shattered Accord (RP `rex-fleet-academy-accord/series.json`;
`rex-fleet-full-performance/README.md`: "Fleet emerges afterward").

Issue arc (RP `editorial_pages.json`, `covers.json`): I01 Green Corridor (Kaldr
approach raid) · I02 Mercy of Dawn rescue; Venn's command cost · I03 Auric crisis ·
I04 Tal Corvus, tribunal, **Lt. Erin Deka commands Thunderbreak** · I05–I12 as listed
in RP; I12 the first Shattered Accord.

**Game placement:** the Black Drift Reach and Kaldr Rift expeditions are set
**around Issue 01** (corridor reblazing, Venn in command of Thunderbreak).

## 3. Factions (Rex Fleet era)

| Faction | Identity (RP `factions.json`) | Colours | Symbol (seen, page 003) | Ships / places |
|---|---|---|---|---|
| Fleet / Reach and Resolve | "Core-aligned military and relief fleet… rescue missions, and corridor protection" | deep navy, gold, white ("Ion White") | gold four-point compass star | Thunderbreak (heavy cruiser); Core Admiralty |
| The Verge | "Frontier trade worlds, farms, freeports, escorts, and civilian governments" | tan, muted green, gold trade accents | leaf sprig; green chevron on freighters | Verge freighters, escort fighters; Auric Bazaar, Luminara Fields |
| The Shards / Confederacy | "salvagers, raiders, captains, engineers, civilians… formed in wreckage zones" — **not all villains** | pale grey-white over black, bright red | red three-prong fang | Gravefire, Ashfang, Broken Oath; Black Drift, Shatterforge |
| Silent Triarch (Shard rulers) | "masked ruling council… institutional rulers, never supernatural" | pale industrial, bright red | Raid / Trade / Fear masks | Triarch Chamber |
| Independent / Veil Market | "Brokers, smugglers, merchants, route specialists" | brown/bronze band (page 003) | compass-cross | Veil Market |
| Lattice Research | "Physicists, survey crews… anomaly observers" | violet "survey" grammar | survey markers, shear maps | — |
| Unmarked raider splinter group | "no recognized Crown or Shard faction insignia" (RP Crimson Warden factions) | mixed salvage | none | **Game enemy swarm** |
| Five Crowns (Aurelian, Cerulean, Ember, Tempest, Aegis) | Fleet-internal doctrine lineages, **not factions** | restrained crest geometry | — | Not used |

## 4. Shattering-era institutions (do not mix with Rex Fleet era)

Cooperative Network (tri-band cooperative seal), Beacon Harmonization Authority
(harmonic certification sigil), Convoy and Trade Coalition (convoy route emblem),
Outer Band (patched-node signet) — RP `data/factions.json`, each "not the mature
faction". Rule: "must not copy mature Fleet, Verge, Shard, or Crown uniforms,
ships, institutions, or finished iconography" (RP `production/references/shattering/cover-production-normalization.json`).
Visual language seen (`shat_i01_p03.png`): luminous art-deco civic halls, cream/gold/black
formal dress, stable green corridors.

**Game use:** only as *relics* found in the Rex Fleet era (e.g. "BHA Beacon Core"),
always described as High Era, never with mature faction iconography.

## 5. Places

| Place | Description (RP `settings.json`/`regions.json`) | Released visual | Game use |
|---|---|---|---|
| Black Drift | "inhabited asteroid-industrial dock… Pale industrial layers and bright-red markings coexist with meals, families" | page 021 | Named destination "Black Drift Reach" (surroundings; the dock itself not depicted) |
| Kaldr Rift | "dense asteroid fragments, broken industrial structures and old hull wreckage… never a magical tunnel" | pages 005, 007 | Destination 2 |
| Green Corridor | beacon line, "restrained navigational green" | page 002 | Beacons / safe volume |
| Auric Bazaar / Auric Gate | Verge freeport ring; "ember-orange pylons, stability rims" | page 010 | Not yet used (future destination) |
| Thunderbreak bridge | "older ship repeatedly repaired" | Keeper image | Art reference for Venn's ship |
| Core Admiralty | white stone-metal, deep-navy banners | page 019 | Not used |
| Tal Corvus, Shatterforge, Veil Market | RP settings | — | Not used |

## 6. Technology & anomalies

Reciprocal-field transit, asymptotic inversion ("Ride the inversion to the exit
mark", page 005). Anomaly families (RP Academy README): Metric (Mirrorfold), Temporal
(Lattice Drift), Echo (Memory Wells, gravitic echoes), Gradient (Lattice Tides,
broken-geometry storms, Void Gyres), Phase (Fracture Blooms, Veil Auroras, Mirror
Star); Ebon Maw is an unexplained boundary case. "Anomalies are objective and
measurable. Avoid magic."

## 7. Characters

See `CHARACTER_REFERENCE_REGISTRY.md`.
