extends SceneTree
## One-off: writes each branch chapter (id >= 10) to data/realms/<destination>.json.
##   godot --headless -s res://tools/dump_realms.gd

func _init() -> void:
	for cdef: Dictionary in GameData.CHAPTERS:
		var ch: int = int(cdef["id"])
		if ch < 10:
			continue
		var dest_id: String = String(cdef["destination"])
		var dest: Dictionary = GameData.DESTINATIONS[dest_id]
		var realm: Dictionary = {"id": dest_id, "chapter": cdef, "destination": dest, "biome": GameData.BIOMES.get(String(cdef["biome"]), {}),
			"regions": {}, "discoveries": {}, "contacts": {}, "places": {}, "stages": []}
		for rid: String in dest["regions"]:
			realm["regions"][rid] = GameData.REGIONS[rid]
		for did: String in GameData.DISCOVERIES.keys():
			var d: Dictionary = GameData.DISCOVERIES[did]
			if bool(d.get("roaming", false)) or not String(d.get("region", "")) in dest["regions"]:
				continue
			realm["discoveries"][did] = d
			for c: Variant in d.get("contacts", []):
				realm["contacts"][String(c)] = GameData.CONTACTS[String(c)]
			if d.has("place") and GameData.PLACES.has(String(d["place"])):
				realm["places"][String(d["place"])] = GameData.PLACES[String(d["place"])]
		for st: Dictionary in GameData.CHART:
			if int(st.get("chapter", 1)) == ch:
				realm["stages"].append(st)
		var f: FileAccess = FileAccess.open("res://data/realms/%s.json" % dest_id, FileAccess.WRITE)
		f.store_string(JSON.stringify(RealmCodec.encode(realm), " ", false))
		f.close()
		print("wrote ", dest_id, ": ", realm["regions"].size(), " regions, ", realm["discoveries"].size(), " discoveries, ", realm["stages"].size(), " stages")
	quit()
