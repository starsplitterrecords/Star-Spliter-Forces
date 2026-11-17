# Art Bible

Current art is **procedural vector placeholder** drawn in code. This document
records the language those placeholders establish and the specs for final art.

## Principles

- Silhouette first: every ship/enemy is identifiable as a solid shape at 32 px.
- Dark field, luminous signal: backgrounds stay near `#070a15`; meaning is carried by light.
- Calm when exploring, bright when earned: big effects are reserved for Drops, evolutions, discoveries, boss phases.
- Never colour alone: every state/threat also has a shape, pattern or glyph.

## Palette

| Use | Colour |
|---|---|
| Void / UI background | `#070a15`, `#080a16` |
| UI panel / line | `#0e1426` / `#2b3d63` |
| UI text / dim / accent / gold | `#e6f1ff` / `#8a9bbd` / `#68ecff` / `#ffe08a` |
| Resonance / Drift / Fracture | `#9ff7d0` ◆ / `#a8c8ff` ◇ / `#ff6f8f` ✕ |
| Forces | Catalog accents (CONTENT_MANIFEST) — PWC `#f0327f`, RC `#da3929`, GDU `#e8e3d8`, Rex `#71e8f5`, IDO `#f1b826`, WCR `#fbb040`, MC `#7e86a8` |
| Regions | Gate `#68ecff`, Wrecks `#9fb4d0`, Shelf `#ff9a5f`, Basin `#71cda0`, Corridor `#b07cff`, Bloom `#ff4f7b` |
| Shard markings (canon) | pale grey-white + bright red — Shard explorers only, never generic enemies |

Rex Fleet canon visual code (words only, no hex in source): Fleet = deep navy, Ion White,
restrained gold; Verge = tan and muted green; Shards = pale grey-white with bright red;
survey ships = violet accents. Character accents follow this.

## Faction palettes (applied 2026-11-17)

Explorer ships now use their faction palette (hull + trim): Venn navy/gold with ion-white edge; Naomi tan/green; Tessa and Abby pale grey-white with red seams; Jex bronze/gold. Enemies use mixed salvage colours and carry no faction marks. See `VISUAL_REFERENCE_ATLAS.md`.

## Silhouettes (current placeholders → final spec)

| Explorer | Placeholder | Final asset spec |
|---|---|---|
| Venn / Thunderbreak | broad swept-wing cruiser, twin engines | Heavy cruiser, top-down, 128 px sprite sheet: idle, bank L/R (3 frames), engine glow layer; navy/ion-white/gold |
| Naomi Sol | needle with forward-swept fins | Small Verge escort fighter, patched tan/green panels |
| Tessa Banks / Gravefire | armoured block with side pods | Compact Shard cutter, visible repairs, pale-grey + red seams |
| Abby Saville | broad pale command hull, red seams | Shard command ship, white industrial plating, narrow red seams, red engine glow |
| Jex Marrin | split twin-blade hull | Courier with anomaly-glass shimmer (shader) |

Enemies keep the current shape language: dart = charger/skiff, ring = summoner,
lancer = ranged, cell cluster = mine layer, shard = ambusher, diamond = support,
eight-point star = elite, eye-ringed disc = The Silence. Telegraphs are pale gold.

## Effects

- Force effects use the Force accent; white core for hits; additive glow circles.
- Budget: 360 particles, 40 floating numbers, rings/beams unbounded but short-lived.
- Reduced-flashes setting dims rings and disables hit-stop.

## Typography

Inter Display Bold (titles), Inter Bold (labels/buttons), Inter Medium (body).
Base 18 px at 1280×720; scales with the text-size setting (0.8–1.4).

## Needed from the art pipeline

1. Approved exports of Rex Fleet cast art (portraits for Departure/Archive; 512×512).
2. Project identity images from StarSplitterVisions for Archive record pages (owner approval).
3. Final ship and enemy sprites per the table above; region prop kits (wreck hulls, crystal shelves, beacons, pools).
4. App icon (1024×1024) and launch screen.
