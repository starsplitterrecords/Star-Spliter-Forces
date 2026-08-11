from pathlib import Path

root = Path(__file__).resolve().parents[1]
required = [
    "project.godot", "scenes/Main.tscn", "scripts/main.gd", "scripts/run.gd",
    "scripts/player.gd", "scripts/enemy.gd", "scripts/weapon_system.gd",
    "scripts/audio_director.gd", "scripts/game_data.gd", "scripts/discovery_node.gd",
    "PROJECT_STATUS.md", "ROADMAP.md", "DECISIONS.md", "KNOWN_ISSUES.md", "PLAYTEST.md"
]
for rel in required:
    p = root / rel
    assert p.exists() and p.stat().st_size > 0, rel

project = (root / "project.godot").read_text()
assert 'run/main_scene="res://scenes/Main.tscn"' in project

run = (root / "scripts/run.gd").read_text()
for feature in ["show_level_choices", "spawn_enemy", "InputEventScreenDrag", "end_run", "RESONANCE", "DRIFT", "FRACTURE", "seed_discoveries", "on_discovery_claimed", "spawn_patrol_encounter", "expedition_goal"]:
    assert feature in run, feature

weapons = (root / "scripts/weapon_system.gd").read_text()
for weapon in ["pulse_bolt", "orbit_shard", "resonance_wave", "ion_lance", "ghost_mine", "warm_drone"]:
    assert weapon in weapons, weapon

main = (root / "scripts/main.gd").read_text()
for feature in ["ilyra_venn", "show_archive", "discovered_signals", "unlocked_tracks", "BEGIN EXPEDITION"]:
    assert feature in main, feature

save = (root / "scripts/save_manager.gd").read_text()
for feature in ["discovered_signals", "discovered_projects", "discovered_forces", "archive_reads"]:
    assert feature in save, feature

print("Static project validation passed")
