from pathlib import Path

root = Path(__file__).resolve().parents[1]
required = [
    "project.godot", "scenes/Main.tscn", "scripts/main.gd", "scripts/run.gd",
    "scripts/player.gd", "scripts/enemy.gd", "scripts/weapon_system.gd",
    "scripts/audio_director.gd", "scripts/game_data.gd",
    "PROJECT_STATUS.md", "ROADMAP.md", "DECISIONS.md", "KNOWN_ISSUES.md", "PLAYTEST.md"
]
for rel in required:
    p = root / rel
    assert p.exists() and p.stat().st_size > 0, rel

project = (root / "project.godot").read_text()
assert 'run/main_scene="res://scenes/Main.tscn"' in project

run = (root / "scripts/run.gd").read_text()
for feature in [
    "show_level_choices", "spawn_enemy", "the_silence", "InputEventScreenDrag", "end_run",
    "RESONANCE", "DRIFT", "FRACTURE", "debug_level_up", "spawn_boss", "active_force"
]:
    assert feature in run, feature

weapons = (root / "scripts/weapon_system.gd").read_text()
for weapon in ["pulse_bolt", "orbit_shard", "resonance_wave", "ion_lance", "ghost_mine", "warm_drone"]:
    assert weapon in weapons, weapon
for force in ["pulse_width_codex", "star_splitter_rex", "resonant_currents", "ghost_driver"]:
    assert force in weapons or force in (root / "scripts/game_data.gd").read_text(), force

main = (root / "scripts/main.gd").read_text()
assert "ilyra_venn" in main
assert "CHARACTERS. WORLDS. MUSICAL PHYSICS." in main

print("Static project validation passed")
