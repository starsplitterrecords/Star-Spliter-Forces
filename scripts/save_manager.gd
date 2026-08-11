class_name SaveManager
extends RefCounted

const PATH := "user://star_splitter_forces_save.json"

static func defaults() -> Dictionary:
	return {
		"currency": 0,
		"best_time": 0.0,
		"wins": 0,
		"runs": 0,
		"unlocked_characters": ["ilyra_venn"],
		"unlocked_tracks": [],
		"discovered_signals": [],
		"discovered_projects": [],
		"discovered_forces": ["pulse_width_codex"],
		"archive_reads": 0,
		"settings": {"music": 0.75, "sfx": 0.9, "screen_shake": true}
	}

static func load_data() -> Dictionary:
	var data: Dictionary = defaults()
	if not FileAccess.file_exists(PATH):
		return data
	var file: FileAccess = FileAccess.open(PATH, FileAccess.READ)
	if file == null:
		return data
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		return data
	var parsed_data: Dictionary = parsed
	for key in parsed_data.keys():
		data[key] = parsed_data[key]
	var unlocked: Array = data.get("unlocked_characters", [])
	if not "ilyra_venn" in unlocked:
		unlocked.append("ilyra_venn")
	data["unlocked_characters"] = unlocked
	for array_key in ["unlocked_tracks", "discovered_signals", "discovered_projects", "discovered_forces"]:
		if typeof(data.get(array_key, [])) != TYPE_ARRAY:
			data[array_key] = []
	if not "pulse_width_codex" in data["discovered_forces"]:
		data["discovered_forces"].append("pulse_width_codex")
	return data

static func save_data(data: Dictionary) -> void:
	var file: FileAccess = FileAccess.open(PATH, FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(data, "\t"))
