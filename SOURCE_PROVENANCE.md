# Source Provenance

Where every important creative decision in Star Splitter Forces comes from.
Paths are repo-relative. Revisions are the commits inspected on 2026-11-17.

## Sources inspected

| Source | Revision | Access | What was inspected |
|---|---|---|---|
| `starsplitterrecords/StarSplitterVisions` (SSV) | `b35d7d8f298c` (2026-11-14, shallow) | public clone | Records site artist JSON (23 projects, all releases), Visions series JSON (8 series), Rex Fleet Issue 01 reader (22 pages; cover, 002, 003, 005, 007, 010, 014, 019, 021, 022 opened individually), all Records artist/world/release images and all 26 covers (via contact sheets), site colour tokens, publishing/approval docs and CI |
| `starsplitterrecords/RexPrompt` (RP) | `81780449dc96` (2026-11-16, shallow) | public clone | `data/shows/rex-fleet-s1/{characters,factions,regions,settings,negatives,lighting,mood,direction,editorial_pages,covers}.json`, Shattering shelves (`data/characters.json`, `data/factions.json`, `data/regions.json`, `data/shows/shattering/README.md`), `data/shows.json` (118 configs), skills under `docs/skills/`, `production/approval-policy.json`, `production/drafts/manifest.json`, `production/references/**`, audits under `production/audits/` and `docs/audits/`, `tools/validate_rex_fleet.py`; images `rf_i01_cast.png`, `rf_i01_editor_open.png`, `rf_i01_p03.png`, `rf_i01_p04.png`, Keeper `jex-marrin-acting-and-pose-study.png`, Keeper `a8939324…png` (Thunderbreak bridge), `shat_i01_p03.png` |
| `starsplitterrecords/Star-Spliter-Forces` | full local history (41 commits) | working repo | Original brief `c90edb1:GAME_BUILD_BRIEF.md`, vertical slice `f16d8ee`, Forces synthesis `1ac1858`, R/D/F `077a0bf`, `09cd179`, music director `91b091c`, exploration pivot `df03461`…`99050ed` |
| `starsplitterrecords/SSR_Tools` | HEAD (public) | clone | Catalog *schema* only (`core/models/work.py`, `alias.py`, `data/star_scheduler_repo.py` aliases `NMA, SSB, PWC, AVO`) — no catalog data |
| `starsplitterrecords/PrestigeShowBuilder`, `ECAID` | HEAD (public) | clone | Tools/policy; no Star Splitter fiction, music or game content |

Full evidence notes from the intake are summarised in the registries below;
raw notes were kept outside the repo (session scratch) and are not canon.

## Sources NOT accessible (recorded gaps)

| Source | Status | Effect |
|---|---|---|
| Suno profile `suno.com/@starsplittersequence` | Blocked. Network allowlist was updated by the owner, but the session's fetch tool did not pick it up and a direct request was refused by the agent permission classifier | **No Suno track has been catalogued.** MUSIC_CATALOG_MANIFEST lists only SSV Records releases |
| Private repos `ssr-tools` ("music catalog"), `PrestigeComicBuilder`, `PCB-whittled-down` | Not attached to this session (attach request refused by permission classifier) | Real catalog database, track durations, masters and stems unknown |
| Catalog audio / masters | Live on the owner's machine (`SSR_Tools` config points to a local Windows path) | No authorised audio in the game |
| "Star Splitter Survivors", "Star Splitter: Resonance" | Not found in any accessible repo or history | Lineage reconstructed from this repo's own commits only |
| Echoes of a Forgotten War art; "PX-7"; Shattering art beyond one draft page | No released art; "PX-7" not found anywhere | Not used |
| Remote branch `agent/test-tree` (`c2869cd`) | Not fetched | Unknown |

## Decisions and their origins

| Decision in game | Origin | Authority level (owner hierarchy) | Status |
|---|---|---|---|
| Commodore **Ella Venn** (not Ilyra) | Released Issue 01 cast plate SSV `…/issue-01/page-003.jpg` and editor's letter `page-022.jpg`; SSV `src/content/series/rex-fleet.json`; RP `characters.json` `C_commodore_ella_venn`; SSV CI `validate.yml:62` | 2 — released canon | **Open:** RP audit `VIS-C3-001` asks for written owner confirmation; the owner's brief says "Ilyra". Game uses Ella; one-line switch if the owner directs otherwise |
| Playable roster: Venn, Naomi Sol, Tessa Banks, Abby Saville, Jex Marrin | All five on the released cast plate (page 003) with released portraits | 2 | Adopted |
| Kess Darrow removed from the roster | RP `rex-fleet-glass-horizon/characters.json` — spin-off only, **no approved image** | 5 (working draft data) | Kept as documented candidate; returns when an approved image exists |
| Faction colours: Fleet navy/gold/white, Verge tan/muted green, Shards pale grey-white/bright red over black | RP `factions.json`; RP Many Crowns bible ("Mature Fleet visual grammar is blue, gold and white"); seen on page 003 and cover | 2–3 | Adopted for explorer ships and UI bands |
| Faction sigils: Fleet four-point compass star, Verge leaf sprig, Shards red three-prong "fang", Independent compass-cross | Seen on page 003 banners and cover | 2 | Used only on their own faction's characters |
| Enemy swarm = unmarked raider splinter group, **no faction insignia** | RP `rex-fleet-crimson-warden/factions.json` ("no recognized Crown or Shard faction insignia") | 3 | Enemies recoloured to mixed salvage (no Shard white/red) |
| Kaldr Rift "dense asteroid fragments, broken industrial structures and old hull wreckage… never a magical tunnel" | RP `settings.json`; page 005 caption "KALDR RIFT — GREEN CORRIDOR APPROACH" | 2–3 | Destination 2 built to this description |
| Green corridor beacons as safe volume | Page 002/editorial "restrained navigational green" beacon line; RP Vergeward corridor | 2–3 | Night Corridor / Shear Window beacons |
| Anomaly families (Metric, Temporal, Echo, Gradient, Phase); "objective and measurable, avoid magic" | RP `rex-fleet-academy-anomalies/README.md` | 3 (Academy working classification) | Mirrorfold, Memory Well, gravitic echoes, Fracture Bloom adopted as hazards |
| Music project names, fields, taglines, accents, release titles and meta strings | SSV `sites/records/content/artists/*.json` | 2 (published site) | Used verbatim |
| Forces as gameplay interpretations of projects | This repo `1ac1858` (Forces model) + catalog role statements | 7 (agent proposal) | Provisional — owner review |
| Resonance / Drift / Fracture | This repo `077a0bf` | 7 | Game-original system (fiction uses the words only incidentally) |
| The Silence / "the hush" | This repo `f16d8ee` (boss "The Silence") + 2026-11-17 fragments | 7 | Game-original, explicitly non-canonical (GAME_CANON_ADAPTATION) |

## Unresolved contradictions (preserve established version until approved)

1. **Venn's name** — see above.
2. **Tessa Banks's hair** — text: "short-to-medium silver-gray curls" (RP `characters.json`); released art: platinum-blonde (page 003, page 021). RP `visual-reference-pack.json` says released art controls → game portrait uses released art.
3. **Jex Marrin's hair** — text: "older white-haired… short rough beard"; released art and Keeper sheet: tousled brown curls. Released art controls.
4. **Stale documents** — SSV `docs/rex-fleet-issue-01-final-qc.md` (old names, 20-page build), RP `production/CONTROL_BOARD.md` (19 pages, no drafts), RP Rex `visual-reference-pack.json` (19-page numbering), Shattering README ("no approved images" vs 24 approved drafts). Not used as authority.
5. **Records artwork defects** — Hexagonis cover shows Mach Point Five art; PWC "Where the Light Meets the Water" shows the "I Never Want to Not Do This" cover; IDO "Ignition Sequence" cover is 0 bytes; `artists/star-splitter-rex.webp` reads "BACKYARD ROCKET MUSIC"; RSLS "Perception" uses a PWC cover; Arthur Vaughn Octet covers read "SADROBOTS SINGLOVESONGS". All excluded from the game (see `assets/reference/manifest.json`).
6. **Past-dated "Upcoming" labels** in Records meta (e.g. "Away Away — Upcoming · October 31, 2026"). Shown verbatim; owner should update the source site.
7. **"Thunderbreak Shelf"** (prototype landmark) shares the name of Venn's ship. Not a contradiction, but implies an undocumented history; flagged for owner decision.
