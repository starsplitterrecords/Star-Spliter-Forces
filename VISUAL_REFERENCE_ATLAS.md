# Visual Reference Atlas

Organised index of inspected visual sources. "Opened" = viewed directly during
the 2026-11-17 intake (individually, or on labelled contact sheets built from the
repo files). SSV = StarSplitterVisions `b35d7d8f298c`; RP = RexPrompt `81780449dc96`.

## Characters

| Subject | Source | Opened | Status | Game asset |
|---|---|---|---|---|
| Rex Fleet cast plate (all principals, faction bands, sigils) | SSV `sites/visions/public/images/pages/rex-fleet/issue-01/page-003.jpg` (992×1586) = RP `production/drafts/rex-fleet/rex-fleet-i01/rf_i01_cast.png` | yes | released | 12 portraits `assets/characters/*` (review flag) |
| Venn, Naomi, Abby (cover) | SSV `sites/visions/public/images/covers/rex-fleet-issue-01-green-corridor.jpg` | yes | released | `assets/universe/rex_fleet_issue01_cover.png` |
| Earlier alternate cover (three territories) | SSV `covers/rex-fleet-issue-01-cover.png` | yes | unused by site JSON | not imported |
| Venn on the bridge | SSV page 007, page 019 | yes | released | reference only |
| Naomi in Verge cockpit | SSV page 005; RP `rf_i01_p03.png` | yes | released / approved | reference only |
| Abby, Tessa, Billie at Black Drift | SSV page 014, page 021 | yes | released | reference only |
| Jex Marrin pose study | RP `production/references/rex-fleet/keeper/character/jex-marrin-acting-and-pose-study.png` | yes | Keeper reference | reference only |
| Shattering-era figures (Liora presumed) | RP `production/drafts/shattering/shattering-i01/shat_i01_p03.png` | yes | approved draft | not used |

## Ships & technology

| Subject | Source | Notes |
|---|---|---|
| Thunderbreak exterior | cover; page 002/007 | long navy-and-white hull, gold trim, blue engines |
| Thunderbreak bridge | RP Keeper `a8939324-00ab-48a6-9671-b087fe026b23.png` | three trapezoid viewports, scuffed white-grey panels, gold trim |
| Verge freighters | page 002, cover | cream/tan segmented hulls, green bands, chevron |
| Shard cutters (Gravefire, Ashfang) | pages 005, 021, cover | white-red hulls, pink-red engine glow |
| Green corridor beacons | page 002 / `rf_i01_editor_open.png` | green pylons along a lane |

## Environments

| Place | Source | Key visual |
|---|---|---|
| Kaldr Rift approach | pages 005, 007; RP `rf_i01_p04.png` | blue-black debris field, wreck lattice, convoy lane |
| Auric Bazaar | page 010 | grand orbital ring market, Verge freight |
| Core Admiralty | page 019 | navy/gold chamber, holographic star chart |
| Black Drift | page 021 | Shard fortress-station on a dark asteroid; gold-lit scaffolds; red markings |
| High Era civic hall | RP `shat_i01_p03.png` | gilded art-deco, cream/gold/black, green corridor lanes |

## Faction systems (from art + RP data)

| Faction | Palette | Sigil (page 003) | Game rule |
|---|---|---|---|
| Fleet | navy `#1b2a52`-range, gold `#d6b25e`-range, ion white | four-point compass star | Venn ship + UI band only |
| Verge | tan `#b9a27a`, muted green `#6f8a4e`, gold | leaf sprig, chevron | Naomi ship |
| Shards | pale grey-white `#e6e3dc`, bright red `#d8323a`, black | three-prong fang | Tessa/Abby ships; **never on generic enemies** |
| Independent | brown/bronze `#9a6a3a` | compass-cross | Jex ship |
| Unmarked raiders | mixed salvage (rust, olive, dull steel) | **none** | Enemies & raider camps |
(Hex values are game approximations sampled by eye from the released art, not source tokens.)

## Music project art (SSV Records)

Identity images for the 11 priority projects (`sites/records/public/images/records/…`)
— all opened; imported to `assets/music/identity/`. Release covers with matching
art imported to `assets/music/covers/`. Defects found and excluded: see
`SOURCE_PROVENANCE.md` §contradictions 5.

## Interfaces & brand

| Brand | Tokens / assets (SSV) | Game use |
|---|---|---|
| Star Splitter Visions | chartreuse `#baff00` on navy-black `#05070b`/`#0c1220`; Inter; split-star logo `sites/visions/public/images/brand/logo.png` | Inter already used; logo not imported (owner approval for brand use in game) |
| Star Splitter Records | orange `#f6a62c`, blue `#6f72ff` on `#050609`; text wordmark "STAR SPLITTER / RECORDS"; hero `worlds/label-hero.webp` (blue crystal + lightning) | Archive accents (future) |
| Rex Fleet trade dress | weathered cream block "REX FLEET", gold tagline (RP `direction.json` `D_rex_fleet_cover_trade_dress`) | Archive universe panel shows the released cover itself |

## Production rules that affect game art

- RP `negatives.json` (Rex Fleet comics): "no generic Star Trek or Star Wars visual copying", "no scale ambiguity between capital ships and small craft", "no random neon fog", and **"no video game look"** — a comic-generation rule; for the game it argues for restrained effects and faction-true palettes over neon arcade styling.
- RP `docs/skills/reference-keeper-chat-ingest/SKILL.md`: stored references are never cropped/altered in place — the game pipeline only *reads* sources and writes derivatives into this repo.
- RP `production/approval-policy.json`: a new image never replaces an existing approved identity without explicit owner intent.
