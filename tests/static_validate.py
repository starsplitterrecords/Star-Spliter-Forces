from pathlib import Path

root = Path(__file__).resolve().parents[1]
required = [
    "project.godot", "scenes/Main.tscn", "scripts/main.gd", "scripts/run.gd",
    "scripts/player.gd", "scripts/enemy.gd", "scripts/weapon_system.gd",
    "PROJECT_STATUS.md", "ROADMAP.md", "DECISIONS.md", "KNOWN_ISSUES.md", "PLAYTEST.md"
]
for rel in required:
    p = root / rel
    assert p.exists() and p.stat().st_size > 0, rel

project = (root / "project.godot").read_text()
assert 'run/main_scene="res://scenes/Main.tscn"' in project

run = (root / "scripts/run.gd").read_text()
for feature in ["show_level_choices", "spawn_enemy", "the_silence", "InputEventScreenDrag", "end_run"]:
    assert feature in run, feature

weapons = (root / "scripts/weapon_system.gd").read_text()
for weapon in ["pulse_bolt", "orbit_shard", "resonance_wave", "ion_lance", "ghost_mine", "warm_drone"]:
    assert weapon in weapons, weapon

print("Static project validation passed")
