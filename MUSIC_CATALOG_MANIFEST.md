# Music Catalog Manifest

Verified inventory of Star Splitter Records projects as published on the label
site: SSV `sites/records/content/artists/*.json` at `b35d7d8f298c`. Titles and meta
strings are **verbatim**. Images were opened and checked (see `VISUAL_REFERENCE_ATLAS.md`).

## Status of the wider catalog

| Data | Status |
|---|---|
| Suno profile `@starsplittersequence` (owner-designated official source) | **Not catalogued — inaccessible from this session.** Needs owner action (see SOURCE_PROVENANCE) |
| Track durations, audio formats | **Unknown** — no audio in any accessible repo |
| Masters / stems | **None available.** Expected under `audio/catalog/<master_file>` |
| Credits / lineage | Every release has `lineage.display: hidden`, provenance fields `undocumented` (label policy: do not publish until confirmed) |
| Rights / licensing for in-game use | **Unconfirmed.** Label site offers licensing incl. "games" (`site.json`); written confirmation required before distribution |
| SSR_Tools catalog aliases | `PWC`, `NMA`, `SSB`, `AVO` (`SSR_Tools/data/star_scheduler_repo.py`) — schema only |
| Private `ssr-tools` ("music catalog") | Not accessible |

## Projects used as Forces

| Project | Field · accent | Tagline (verbatim) | Releases (title · meta) | Listen links (verbatim) | Identity art in game | Force (provisional) |
|---|---|---|---|---|---|---|
| Pulse Width Codex | Melodic dance · #F0327F | "Dance music can move the body and still carry a generous emotional center." | Now or Never · Released · November 19, 2025; I Never Want to Not Do This · Catalog release · July 14, 2026; Where the Light Meets the Water · Selected catalog; Free Mode (feat. Cheddr) · Selected catalog; Edge Spaces (Epsilon Version) · Selected catalog | `https://music.amazon.com/albums/B0GWW7Y8TB`, `https://music.apple.com/gb/artist/pulse-width-codex/1853956207` | `artists/pulse-width-codex.webp` (312² — low-res) | Build & Drop |
| Resonant Currents | Dub · #DA3929 | "Space is an instrument." | Meaningless Dub · Upcoming · September 18, 2026; Away Away · Upcoming · October 31, 2026 | none | `artists/resonant-currents.webp` | Echo & Space |
| Star Splitter Rex | Cinematic Rock Instrumentals · #71E8F5 | "Music for a boss fight." | Slip Knife (feat. Cheddr) · Released · August 15, 2025; Say What (feat. Cheddr) · Released · July 14, 2025; Dominion’s Reach · Selected catalog; Signals and Shadows · Upcoming · August 2, 2026; Graphite · Upcoming · November 11, 2026 | `https://distrokid.com/hyperfollow/starsplitterrex/say-what-feat-cheddr`, `https://music.apple.com/us/artist/star-splitter-rex/1826410328` | `chatgpt-image-jun-24-2025-012441-pm.png` (as referenced by JSON) | Impact |
| Ghost Driver Unit | Modern rock · #E8E3D8 | "Rock survives when the song is stronger than the costume." | It’s a Grind (Ghost Mode Remix) · Upcoming · August 17, 2026; Watch Out · Upcoming · October 10, 2026 | none | `artists/ghost-driver-unit.webp` | Momentum |
| Ion Drive Orchestra | Symphonic electronic · #F1B826 | "The orchestra never stopped evolving." | Unification Theory · Released · January 16, 2026; Freeze Frame · Released · January 8, 2026; Ignition Sequence (feat. Cheddr) · Selected catalog | `https://music.amazon.in/artists/B0GCT7W8V2/ion-drive-orchestra` | `chatgpt-image-jun-21-2025-042715-pm.png` | Ensemble |
| Warm Circuits Rise | Jamtronica / psychedelic · #FBB040 | "Improvised trips through sonic campfires and analog stars." | This Path’s for You; Shine (feat. Cheddr); "feat. Cheddr" (likely data error) — all Selected catalog | none | `artists/warmcircuitsrise.webp` | Improvisation |
| Minor Collapse | Immersive rock · #7E86A8 | "The quietest emotions often feel the biggest." | Hexagonis · Selected catalog; Mach Point Five · Upcoming · December 13, 2026 | none | `artists/minor-collapse.webp` | Wall of Sound |

## Forces added 2026-11-20 (same verified data as below)

Supersonic Being (Hype) — transmission "Give It Up, Let’s Go" · Released · 2025.
Night Motion Archives (Afterimage) — transmission "Hanging on the Edge" · Selected catalog.
Robots Sing Love Songs (Duet) — transmission "Magnetic" · Selected catalog.
Before the Reboot (Tracker) — **no transmission** (no published releases); attuned through the "Tracker Module" artifact, whose text states that nothing in it is a track.
Motif layers `force_supersonic`, `force_night`, `force_robots`, `force_tracker` are original placeholder audio.

## Projects documented but not yet Forces

| Project | Field · accent | Tagline | Releases | Notes for future Forces |
|---|---|---|---|---|
| Supersonic Being | Hip-hop / pop spectacle · #F9268D | "Life is too short to be boring." | Give It Up, Let’s Go · Released · 2025 (`https://distrokid.com/hyperfollow/supersonicbeing/give-it-up-let-go-feat-cheddr`) | identity art imported |
| Night Motion Archives | Indie / alternative · #C8C3D6 | "A song must survive the removal of its surface." | Hanging on the Edge; Be Somebody; Leave the Past Behind — Selected catalog | identity art imported (JSON PNG; the `artists/` webp is 0 bytes) |
| Robots Sing Love Songs | Speculative pop · #FFB3C7 | "We built minds from sand and lightning." | Perception (cover file is a PWC mismatch); Magnetic — Selected catalog | identity art imported |
| Before the Reboot | Tracker interpretation · #F3F5F7 | "Finished, tracker-inspired reinterpretations of Star Splitter compositions." | **No releases** — do not invent any | identity art imported |
| Jeff Hines, Phase Redux, Star Splitter Visions, Daisy Grohs, Milo Bright, The Altered Velvet Band, The Arthur Vaughn Octet, Ascent Code, Current Intents, Sterling Drake, Sun Comes Through the Musical, The Verse Assembly | see SSV artist JSON | — | see SSV | Not used yet |

## Transmissions in the game (all real catalog titles)

Each signal unlocks one transmission; `master_file` is where an authorised master
would go. Status today for all: **title verified, audio not supplied**.

| Transmission id | Project — Title (verbatim) | Cover art in game |
|---|---|---|
| pwc_now_or_never | Pulse Width Codex — Now or Never | — (no release image) |
| pwc_where_the_light_meets_the_water | Pulse Width Codex — Where the Light Meets the Water | excluded (mismatched file) |
| rc_meaningless_dub, rc_away_away | Resonant Currents — Meaningless Dub / Away Away | — |
| rex_signals_and_shadows, rex_dominions_reach | Star Splitter Rex — Signals and Shadows / Dominion’s Reach | Dominion’s Reach ✓ |
| gdu_watch_out, gdu_its_a_grind | Ghost Driver Unit — Watch Out / It’s a Grind (Ghost Mode Remix) | both ✓ |
| ido_ignition_sequence, ido_freeze_frame | Ion Drive Orchestra — Ignition Sequence (feat. Cheddr) / Freeze Frame | Freeze Frame ✓ (Ignition is a 0-byte file) |
| sb_give_it_up | Supersonic Being — Give It Up, Let’s Go | — |
| nma_hanging_on_the_edge | Night Motion Archives — Hanging on the Edge | — |
| rsls_magnetic | Robots Sing Love Songs — Magnetic | — (Perception's file is a PWC mismatch) |
| mc_hexagonis, mc_mach_point_five | Minor Collapse — Hexagonis / Mach Point Five | Mach Point Five ✓ (Hexagonis excluded) |
| wcr_this_paths_for_you, wcr_shine | Warm Circuits Rise — This Path’s for You / Shine (feat. Cheddr) | both ✓ |

### Records signals (added 2026-11-22; projects heard as music, not Forces)

| Transmission id | Project — Title (verbatim) · meta (verbatim) | Source |
|---|---|---|
| pr_sail_west | Phase Redux — Sail West · Selected catalog | SSV `sites/records/content/artists/phase-redux.json` |
| dg_for_all_creative_habits | Daisy Grohs — For All Creative Habits · Upcoming · September 9, 2026 | SSV `daisy-grohs.json` |
| mb_figure_it_out | Milo Bright — Figure It Out · Upcoming · August 23, 2026 | SSV `milo-bright.json` |
| avo_all_i_am | The Arthur Vaughn Octet — All I Am · Selected catalog | SSV `arthur-vaughn-octet.json` |

Project pages for these four use the verbatim field, catalogRole and oneSentenceBio from the same JSON. No audio is bundled; the Archive shows no preview for them until a master exists.

**Distinguished from real tracks:** signal names in the world ("GREEN ECHO", "SHELF
BEACON", "ECHO TRANSMISSION" …) are **game location names**, never presented as
track titles. The in-game score and the Archive "Force motif" previews are
**original placeholder audio** (`tools/generate_audio.py`), labelled as such.

## Archive presentation requirements

Project name, field, catalog role, verbatim tagline/bio from SSV; identity art
via the pipeline; transmissions with verbatim title + meta; "Listen" opens only
links present in SSV JSON; no claim of availability where the meta says
"Upcoming"; no audio played as a release unless an authorised master exists.
