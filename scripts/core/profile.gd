extends Node
## Persistent player profile: progression, archive state and settings.
## Saves are versioned, written atomically (temp file + rename) and mirrored to
## a backup so an interrupted write never destroys progress.

signal settings_changed
signal profile_changed

const SAVE_VERSION: int = 2
const PATH: String = "user://star_splitter_forces_save.json"
const BACKUP_PATH: String = "user://star_splitter_forces_save.backup.json"
const TEMP_PATH: String = "user://star_splitter_forces_save.tmp"

## Old prototype ids → current discovery ids.
const LEGACY_DISCOVERY_IDS: Dictionary = {
	"rc_echo_01": "sig_green_echo",
	"rex_beacon_01": "sig_thunderbreak_beacon",
	"gdu_trace_01": "sig_night_trace",
}

var data: Dictionary = {}
var save_path: String = PATH
## Playtest mode: a separate save with everything open, so testing never
## touches real progress. The marker file remembers the mode across restarts.
const PLAYTEST_PATH: String = "user://playtest_profile.json"
const PLAYTEST_MARK: String = "user://playtest_on"
var last_save_ok: bool = true
var last_load_note: String = ""

func _ready() -> void:
	InputSetup.ensure_actions()
	load_profile(PLAYTEST_PATH if FileAccess.file_exists(PLAYTEST_MARK) else PATH)
	if is_playtest():
		_open_everything()
	apply_settings()

static func default_settings() -> Dictionary:
	return {
		"music_volume": 0.8,
		"sfx_volume": 0.85,
		"master_volume": 1.0,
		"screen_shake": 1.0,
		"reduced_flashes": false,
		"text_scale": 1.0,
		"damage_numbers": true,
		"nav_assist": true,
		"joystick_mode": "floating",
		"handedness": "right",
		"fps_cap": 60,
		"high_contrast": false,
		"edge_padding": 0.0,
		"playtest_invincible": false,
		"playtest_short": true,
		"playtest_review": false,
	}

static func defaults() -> Dictionary:
	return {
		"version": SAVE_VERSION,
		"stats": {"expeditions": 0, "completions": 0, "extractions": 0, "defeats": 0, "kills": 0, "best_time": 0.0, "total_time": 0.0, "bosses": 0},
		"currency": 0,
		"unlocked_characters": ["ella_venn"],
		"unlocked_destinations": ["black_drift_reach"],
		"discovered": {},
		"forces_attuned": ["pulse_width_codex"],
		"transmissions": [],
		"fragments": [],
		"mastery": {},
		"workshop": {},
		"seen": {},
		"chart": {"done": {}},
		"last_character": "ella_venn",
		"last_destination": "black_drift_reach",
		"settings": default_settings(),
	}

# ---------------------------------------------------------------- persistence

func load_profile(path: String = PATH) -> void:
	save_path = path
	var parsed: Variant = _read_json(path)
	if typeof(parsed) != TYPE_DICTIONARY:
		var backup: Variant = _read_json(_backup_for(path))
		if typeof(backup) == TYPE_DICTIONARY:
			parsed = backup
			last_load_note = "Recovered progress from backup save."
		else:
			parsed = {}
			if FileAccess.file_exists(path):
				last_load_note = "Save file was unreadable; started a fresh profile."
	data = migrate(parsed)

func _backup_for(path: String) -> String:
	return path.get_basename() + ".backup.json"

func _read_json(path: String) -> Variant:
	if not FileAccess.file_exists(path):
		return null
	var file: FileAccess = FileAccess.open(path, FileAccess.READ)
	if file == null:
		return null
	var text: String = file.get_as_text()
	file.close()
	var json: JSON = JSON.new()
	if json.parse(text) != OK:
		return null
	return json.data

func save() -> bool:
	data["version"] = SAVE_VERSION
	var text: String = JSON.stringify(data, "\t")
	var temp: String = save_path.get_basename() + ".tmp"
	var file: FileAccess = FileAccess.open(temp, FileAccess.WRITE)
	if file == null:
		last_save_ok = false
		return false
	file.store_string(text)
	file.flush()
	file.close()
	if FileAccess.file_exists(save_path):
		DirAccess.copy_absolute(save_path, _backup_for(save_path))
	var err: Error = DirAccess.rename_absolute(temp, save_path)
	last_save_ok = err == OK
	profile_changed.emit()
	return last_save_ok

static func migrate(raw: Dictionary) -> Dictionary:
	var out: Dictionary = defaults()
	var version: int = int(raw.get("version", 0))
	if version <= 1 and not raw.is_empty():
		# Prototype schema: flat counters + discovered_signals/forces arrays.
		var stats: Dictionary = out["stats"]
		stats["expeditions"] = int(raw.get("runs", 0))
		stats["completions"] = int(raw.get("wins", 0))
		stats["best_time"] = float(raw.get("best_time", 0.0))
		out["currency"] = int(raw.get("currency", 0))
		var discovered: Dictionary = out["discovered"]
		for old_id: Variant in raw.get("discovered_signals", []):
			var new_id: String = String(LEGACY_DISCOVERY_IDS.get(String(old_id), String(old_id)))
			discovered[new_id] = {"expedition": 0}
		for f: Variant in raw.get("discovered_forces", []):
			var fid: String = String(f)
			if fid == "ghost_driver":
				fid = "ghost_driver_unit"
			if GameData.FORCES.has(fid) and not fid in out["forces_attuned"]:
				out["forces_attuned"].append(fid)
		var old_settings: Dictionary = raw.get("settings", {})
		var settings: Dictionary = out["settings"]
		if old_settings.has("music"):
			settings["music_volume"] = clampf(float(old_settings["music"]), 0.0, 1.0)
		if old_settings.has("sfx"):
			settings["sfx_volume"] = clampf(float(old_settings["sfx"]), 0.0, 1.0)
		if old_settings.has("screen_shake"):
			settings["screen_shake"] = 1.0 if bool(old_settings["screen_shake"]) else 0.0
		# Re-derive unlocks from the migrated discoveries.
		for did: String in discovered.keys():
			_apply_unlocks(out, did)
		return out
	# Current schema: overlay known keys, keeping defaults for anything missing.
	for key: String in out.keys():
		if not raw.has(key):
			continue
		var numeric: bool = typeof(out[key]) in [TYPE_INT, TYPE_FLOAT] and typeof(raw[key]) in [TYPE_INT, TYPE_FLOAT]
		if numeric:
			# JSON stores every number as a float; restore the default's type.
			out[key] = int(raw[key]) if typeof(out[key]) == TYPE_INT else float(raw[key])
		elif typeof(raw[key]) == typeof(out[key]):
			if typeof(out[key]) == TYPE_DICTIONARY:
				var merged: Dictionary = out[key].duplicate(true)
				var incoming: Dictionary = raw[key]
				for sub: Variant in incoming.keys():
					merged[sub] = incoming[sub]
				out[key] = merged
			else:
				out[key] = raw[key]
	# The prototype used the retired name "Ilyra"; current Rex Fleet canon is Ella Venn.
	# Retired ids: "ilyra_venn" (prototype name) and "kess_darrow" (removed from
	# the roster 2026-11-17: no approved art). Her unlock carries to Abby Saville.
	var retired: Dictionary = {"ilyra_venn": "ella_venn", "kess_darrow": "abby_saville"}
	out["unlocked_characters"] = out["unlocked_characters"].map(func(c: Variant) -> String: return String(retired.get(String(c), String(c))))
	if retired.has(String(out.get("last_character", ""))):
		out["last_character"] = retired[String(out["last_character"])]
	for old_id: String in retired.keys():
		if out["mastery"].has(old_id) and not out["mastery"].has(retired[old_id]):
			out["mastery"][retired[old_id]] = out["mastery"][old_id]
		out["mastery"].erase(old_id)
	# Saves from before the Corridor Chart: credit every stop whose objective
	# was already achieved, so nothing earned is taken away.
	if not raw.is_empty() and not raw.has("chart"):
		var done: Dictionary = out["chart"]["done"]
		for st: Dictionary in GameData.CHART:
			var o: Dictionary = st["objective"]
			if String(o["type"]) == "discover" and out["discovered"].has(String(o["id"])):
				done[String(st["id"])] = true
		if int(out["stats"]["expeditions"]) > 0:
			done["first_light"] = true
			done["hold_the_lane"] = true
		if "abby_saville" in out["unlocked_characters"]:
			done["dreadnought"] = true
		if int(out["stats"]["completions"]) > 0:
			done["the_silence"] = true
	if typeof(raw.get("active_run")) == TYPE_DICTIONARY:
		out["active_run"] = raw["active_run"]
	if not "ella_venn" in out["unlocked_characters"]:
		out["unlocked_characters"].append("ella_venn")
	if not "black_drift_reach" in out["unlocked_destinations"]:
		out["unlocked_destinations"].append("black_drift_reach")
	if not "pulse_width_codex" in out["forces_attuned"]:
		out["forces_attuned"].append("pulse_width_codex")
	# Drop references to content that no longer exists.
	out["unlocked_characters"] = out["unlocked_characters"].filter(func(c: Variant) -> bool: return GameData.CHARACTERS.has(String(c)))
	out["forces_attuned"] = out["forces_attuned"].filter(func(f: Variant) -> bool: return GameData.FORCES.has(String(f)))
	out["version"] = SAVE_VERSION
	return out

# ---------------------------------------------------------------- queries

func settings() -> Dictionary:
	return data["settings"]

func setting(key: String) -> Variant:
	return data["settings"].get(key, default_settings().get(key))

func set_setting(key: String, value: Variant) -> void:
	data["settings"][key] = value
	apply_settings()
	settings_changed.emit()
	_settings_dirty = true

var _settings_dirty: bool = false

func _process(_delta: float) -> void:
	# Coalesce slider drags into one write per frame.
	if _settings_dirty:
		_settings_dirty = false
		save()

func is_discovered(id: String) -> bool:
	return data["discovered"].has(id)

func discovered_count() -> int:
	return data["discovered"].size()

func has_character(id: String) -> bool:
	return id in data["unlocked_characters"]

func has_destination(id: String) -> bool:
	return id in data["unlocked_destinations"]

func is_attuned(force_id: String) -> bool:
	return force_id in data["forces_attuned"]

func workshop_rank(id: String) -> int:
	return int(data["workshop"].get(id, 0))

func mastery(character_id: String) -> Dictionary:
	var m: Dictionary = data["mastery"]
	if not m.has(character_id):
		m[character_id] = {"xp": 0, "level": 0, "expeditions": 0, "completions": 0}
	return m[character_id]

func seen(key: String) -> bool:
	return bool(data["seen"].get(key, false))

func mark_seen(key: String) -> void:
	data["seen"][key] = true

# ---------------------------------------------------------------- progression

static func _apply_unlocks(target: Dictionary, discovery_id: String) -> Array:
	var gained: Array = []
	var d: Dictionary = GameData.DISCOVERIES.get(discovery_id, {})
	if d.is_empty():
		return gained
	var force_id: String = String(d.get("force", ""))
	if force_id != "" and not force_id in target["forces_attuned"]:
		target["forces_attuned"].append(force_id)
		gained.append({"kind": "force", "id": force_id})
	var transmission: String = String(d.get("transmission", ""))
	if transmission != "" and not transmission in target["transmissions"]:
		target["transmissions"].append(transmission)
		gained.append({"kind": "transmission", "id": transmission})
	var fragment: String = String(d.get("fragment", ""))
	if fragment != "" and not fragment in target["fragments"]:
		target["fragments"].append(fragment)
		gained.append({"kind": "fragment", "id": fragment})
	var character: String = String(d.get("unlock_character", ""))
	if character != "" and GameData.CHARACTERS.has(character) and not character in target["unlocked_characters"]:
		target["unlocked_characters"].append(character)
		gained.append({"kind": "character", "id": character})
	var destination: String = String(d.get("unlock_destination", ""))
	if destination != "" and GameData.DESTINATIONS.has(destination) and not destination in target["unlocked_destinations"]:
		target["unlocked_destinations"].append(destination)
		gained.append({"kind": "destination", "id": destination})
	return gained

## Commits an expedition result. Returns {"currency": int, "unlocks": Array,
## "new_discoveries": Array, "mastery_levels": int}.
func record_expedition(result: Dictionary) -> Dictionary:
	var stats: Dictionary = data["stats"]
	var outcome: String = String(result.get("outcome", "defeat"))
	var time: float = float(result.get("time", 0.0))
	stats["expeditions"] = int(stats["expeditions"]) + 1
	stats["kills"] = int(stats["kills"]) + int(result.get("kills", 0))
	stats["total_time"] = float(stats["total_time"]) + time
	stats["best_time"] = maxf(float(stats["best_time"]), time)
	match outcome:
		"complete":
			stats["completions"] = int(stats["completions"]) + 1
			stats["bosses"] = int(stats["bosses"]) + 1
		"extracted", "interrupted":
			stats["extractions"] = int(stats["extractions"]) + 1
		_:
			stats["defeats"] = int(stats["defeats"]) + 1
	var unlocks: Array = []
	var new_discoveries: Array = []
	for did: Variant in result.get("discoveries", []):
		var id: String = String(did)
		if not data["discovered"].has(id):
			data["discovered"][id] = {"expedition": int(stats["expeditions"]), "character": String(result.get("character", ""))}
			new_discoveries.append(id)
		unlocks.append_array(_apply_unlocks(data, id))
	# Completion-gated unlocks (defined per destination).
	if outcome == "complete":
		var dest: Dictionary = GameData.DESTINATIONS.get(String(result.get("destination", "")), {})
		for c: Variant in dest.get("completion_unlocks", []):
			var cid: String = String(c)
			if GameData.CHARACTERS.has(cid) and not cid in data["unlocked_characters"]:
				data["unlocked_characters"].append(cid)
				unlocks.append({"kind": "character", "id": cid})
			elif GameData.DESTINATIONS.has(cid) and not cid in data["unlocked_destinations"]:
				data["unlocked_destinations"].append(cid)
				unlocks.append({"kind": "destination", "id": cid})
	var currency: int = int(result.get("currency", 0))
	data["currency"] = int(data["currency"]) + currency
	var cid2: String = String(result.get("character", "ella_venn"))
	var m: Dictionary = mastery(cid2)
	var before: int = int(m["level"])
	m["expeditions"] = int(m["expeditions"]) + 1
	if outcome == "complete":
		m["completions"] = int(m["completions"]) + 1
	m["xp"] = int(m["xp"]) + int(result.get("mastery_xp", 0))
	m["level"] = GameData.mastery_level(int(m["xp"]))
	data["last_character"] = cid2
	data["last_destination"] = String(result.get("destination", data["last_destination"]))
	data.erase("active_run")
	save()
	return {"currency": currency, "unlocks": unlocks, "new_discoveries": new_discoveries, "mastery_levels": int(m["level"]) - before}

# ---------------------------------------------------------------- corridor chart

func stop_done(id: String) -> bool:
	return bool((data["chart"]["done"] as Dictionary).get(id, false))

func stop_available(id: String) -> bool:
	var st: Dictionary = GameData.chart_stop(id)
	if st.is_empty():
		return false
	if is_playtest():
		return true
	if st.has("side_of"):
		return stop_done(String(st["side_of"]))
	var prev: String = GameData.chart_prev_main(id)
	return prev == "" or stop_done(prev)

## First main stop not yet relit ("" when the corridor is fully open).
func next_stop() -> String:
	var fallback: String = ""
	for st: Dictionary in GameData.chart_main():
		var sid: String = String(st["id"])
		if stop_done(sid):
			continue
		if stop_available(sid):
			return sid
		if fallback == "":
			fallback = sid
	return fallback

func stops_done_count() -> int:
	var n: int = 0
	for st: Dictionary in GameData.CHART:
		if stop_done(String(st["id"])):
			n += 1
	return n

## Contacts met and places charted come from discoveries already made.
func contacts_met() -> Array:
	var out: Array = []
	for did: String in data["discovered"].keys():
		for c: Variant in GameData.DISCOVERIES.get(did, {}).get("contacts", []):
			if not String(c) in out:
				out.append(String(c))
	return out

func places_charted() -> Array:
	var out: Array = ["kaldr_rift"] if "kaldr_rift" in data["unlocked_destinations"] else []
	for did: String in data["discovered"].keys():
		var pl: String = String(GameData.DISCOVERIES.get(did, {}).get("place", ""))
		if pl != "" and not pl in out:
			out.append(pl)
	return out

func is_playtest() -> bool:
	return save_path == PLAYTEST_PATH

## Review (playtest only): every locked thing is shown, tagged, for evaluation.
func review() -> bool:
	return is_playtest() and bool(setting("playtest_review"))

## Switches between the real save and the playtest save. Settings travel along.
func set_playtest(on: bool) -> void:
	if on == is_playtest():
		return
	var settings: Dictionary = (data.get("settings", default_settings()) as Dictionary).duplicate(true)
	save()
	if on:
		var f: FileAccess = FileAccess.open(PLAYTEST_MARK, FileAccess.WRITE)
		if f:
			f.store_string("1")
			f.close()
		load_profile(PLAYTEST_PATH)
		_open_everything()
	else:
		DirAccess.remove_absolute(PLAYTEST_MARK)
		load_profile(PATH)
	data["settings"] = settings
	save()
	apply_settings()

## Fresh playtest save: wipes it and opens everything again.
func reset_playtest() -> void:
	if not is_playtest():
		return
	var settings: Dictionary = (data["settings"] as Dictionary).duplicate(true)
	data = defaults()
	data["settings"] = settings
	_open_everything()
	save()

func _open_everything() -> void:
	for c: String in GameData.CHARACTERS.keys():
		if not c in data["unlocked_characters"]:
			data["unlocked_characters"].append(c)
	for f: String in GameData.FORCES.keys():
		if not f in data["forces_attuned"]:
			data["forces_attuned"].append(f)
	for d: String in GameData.DESTINATIONS.keys():
		if not d in data["unlocked_destinations"]:
			data["unlocked_destinations"].append(d)
	data["currency"] = maxi(int(data["currency"]), 5000)
	data["playtest"] = true

func has_feature(feature: String) -> bool:
	if is_playtest():
		return true
	for st: Dictionary in GameData.CHART:
		if feature in (st["grants"] as Dictionary).get("features", []) and stop_done(String(st["id"])):
			return true
	return false

## Relights a stop's beacon: marks it done, applies its grants and saves at
## once (a stop stays won even if the explorer is lost on the way home).
## Returns true the first time.
func complete_stop(id: String) -> bool:
	var st: Dictionary = GameData.chart_stop(id)
	if st.is_empty() or stop_done(id):
		return false
	data["chart"]["done"][id] = true
	var grants: Dictionary = st["grants"]
	for c: Variant in grants.get("characters", []):
		if not String(c) in data["unlocked_characters"]:
			data["unlocked_characters"].append(String(c))
	for d: Variant in grants.get("destinations", []):
		if not String(d) in data["unlocked_destinations"]:
			data["unlocked_destinations"].append(String(d))
	data["currency"] = int(data["currency"]) + int(grants.get("signal", 0))
	save()
	return true

## Mid-run checkpoint: a result-shaped snapshot of the expedition in progress.
func checkpoint_run(snapshot: Dictionary) -> void:
	data["active_run"] = snapshot
	save()

func has_interrupted_run() -> bool:
	return typeof(data.get("active_run")) == TYPE_DICTIONARY and not (data["active_run"] as Dictionary).is_empty()

## Commits an expedition that never reached its ending (crash, closed tab).
## Everything found is kept. Returns the record_expedition summary, or {}.
func recover_interrupted_run() -> Dictionary:
	if not has_interrupted_run():
		data.erase("active_run")
		return {}
	var snap: Dictionary = data["active_run"]
	snap["outcome"] = "interrupted"
	var out: Dictionary = record_expedition(snap)
	out["discoveries"] = (snap.get("discoveries", []) as Array).size()
	out["time"] = float(snap.get("time", 0.0))
	return out

func buy_workshop(id: String) -> bool:
	var def: Dictionary = GameData.WORKSHOP.get(id, {})
	if def.is_empty():
		return false
	var rank: int = workshop_rank(id)
	if rank >= int(def["max"]):
		return false
	var cost: int = GameData.workshop_cost(id, rank)
	if int(data["currency"]) < cost:
		return false
	data["currency"] = int(data["currency"]) - cost
	data["workshop"][id] = rank + 1
	save()
	return true

# ---------------------------------------------------------------- settings

func apply_settings() -> void:
	var s: Dictionary = data.get("settings", default_settings())
	Engine.max_fps = int(s.get("fps_cap", 60))
	var master_idx: int = AudioServer.get_bus_index("Master")
	AudioServer.set_bus_volume_db(master_idx, linear_to_db(maxf(0.0001, float(s.get("master_volume", 1.0)))))
	var audio: Node = get_node_or_null("/root/Audio")
	if audio and audio.has_method("apply_volumes"):
		audio.apply_volumes()
