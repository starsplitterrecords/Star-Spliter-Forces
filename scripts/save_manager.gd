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
	return data

static func save_data(data: Dictionary) -> void:
	var file: FileAccess = FileAccess.open(PATH, FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(data, "\t"))
