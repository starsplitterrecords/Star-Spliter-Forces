# Audio Design

## Architecture (`scripts/core/audio_director.gd`, autoload `Audio`)

- Buses: Master → Music, SFX. Volumes from settings.
- **Score**: every layer in `GameData.SCORE_LAYERS` is an Ogg loop of identical length
  (112 BPM × 16 bars = 34.29 s). The first layer (`bed`) is the master clock and always
  plays; other layers join at the master's playback position when their target volume
  rises and stop when silent (saves mobile decode). Volumes move at 0.65/s, so every
  transition is a phrase-aligned crossfade.
- **Beat clock**: `beat` / `bar` signals from the master position. Gameplay uses them:
  Pulse Width Codex Drops land on the next downbeat; Ion Drive Orchestra sections fire
  on beats; the ability button pulses on the beat. (A fallback clock runs when audio is absent.)
- **SFX**: 14-voice pool, per-name rate limiting (default 35 ms), pitch variation per call.
  Stingers duck the score briefly.
- **Catalog**: `play_catalog(transmission_id)` plays `res://audio/catalog/<master_file>`
  when present; otherwise mixes that Force's motif layer and the UI says so explicitly.

## Mix rules (`GameRun._update_music`)

| Condition | Layers |
|---|---|
| Always (expedition) | `bed` 0.75; `pulse` 0.35–1.0 and `drive` 0–1.0 by combat intensity |
| Region | `region_gate/wrecks/shelf/basin/corridor/bloom` at 0.8 |
| Forces carried | each Force motif 0.25 + 0.08 × level (max 0.75); strongest Force 0.9 |
| Resonance / Fracture | `state_resonance` / `state_fracture` 0.85 (Fracture halves the bed) |
| Boss | `boss` + `pulse` + `drive` + strongest motif |
| Boss defeated | bed + resonance shimmer + strongest motif (victory) |
| Menus | `menu` 0.9 + `bed` 0.35 |

## Placeholder score (`tools/generate_audio.py`) — ORIGINAL, not Star Splitter recordings

D minor; bars 1–8 Dm–B♭–F–C, bars 9–16 Dm–B♭–Gm–A. Force motifs *evoke* each
project's documented style: Codex supersaw hook + plucks (dance build), Currents offbeat
skank into tape echo + sub (dub), Ghost palm-muted power-chord chug (rock), Rex taiko
hits + brass stabs + ostinato (cinematic), Orchestra string ostinato + brass swells,
Circuits portamento analog lead that never repeats (improvisation), Collapse distorted
tremolo wall in long reverb (shoegaze). Loudness-normalised per layer (`LEVELS`);
tails are folded into the loop start for seamless looping (verified numerically).

## Integrating authorised Star Splitter audio

1. Confirm distribution rights in writing (RELEASE_CHECKLIST).
2. Export Ogg Vorbis q6, 44.1 kHz stereo; name per `GameData.TRANSMISSIONS[*].master_file`;
   place in `audio/catalog/`. Godot imports automatically; the Archive switches from
   "FORCE MOTIF" to "PLAY".
3. Stems (future): `audio/catalog/<id>/{drums,bass,music,fx}.ogg`, same length, same
   tempo. Register the BPM in the transmission entry; the director can then use stems
   as gameplay layers in place of placeholder motifs.

## Licensing assumptions

No third-party or Star Splitter audio is in the repository. Generated audio is original
to this project. Before distribution, the owner must approve any catalog use and confirm
platform terms for embedded playback.
