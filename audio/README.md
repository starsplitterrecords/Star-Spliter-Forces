# Audio integration

This directory is intentionally asset-light. The runtime currently maintains a music phase/intensity clock so gameplay architecture is ready for real Star Splitter Records audio without shipping placeholder copyrighted material.

Recommended future convention:

- `audio/<project>/<track>/master.ogg`
- `audio/<project>/<track>/stem_drums.ogg`
- `audio/<project>/<track>/stem_bass.ogg`
- `audio/<project>/<track>/stem_music.ogg`
- `audio/<project>/<track>/stem_fx.ogg`

`AudioDirector` should own transitions, beat/bar callbacks, intensity layers, boss transitions, and metadata display.
