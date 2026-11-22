extends SceneTree
## Writes the content tables to a JSON file (for before/after comparisons).
##   godot --headless -s res://tools/snapshot_data.gd -- <out.json>

func _init() -> void:
	var out: String = OS.get_cmdline_user_args()[0]
	var disc: Dictionary = {}
	for did: String in GameData.DISCOVERIES.keys():
		if not bool(GameData.DISCOVERIES[did].get("roaming", false)):
			disc[did] = GameData.DISCOVERIES[did]
	var chart_by_ch: Dictionary = {}
	for st: Dictionary in GameData.CHART:
		var k: String = str(int(st.get("chapter", 1)))
		if not chart_by_ch.has(k):
			chart_by_ch[k] = []
		chart_by_ch[k].append(st)
	var chapters: Dictionary = {}
	for c: Dictionary in GameData.CHAPTERS:
		chapters[str(c["id"])] = c
	var snap: Dictionary = {"DESTINATIONS": GameData.DESTINATIONS, "REGIONS": GameData.REGIONS, "DISCOVERIES": disc,
		"CONTACTS": GameData.CONTACTS, "PLACES": GameData.PLACES, "CHAPTERS": chapters, "CHART": chart_by_ch, "BIOMES": GameData.BIOMES,
		"TRANSMISSIONS": GameData.TRANSMISSIONS}
	var f: FileAccess = FileAccess.open(out, FileAccess.WRITE)
	f.store_string(JSON.stringify(RealmCodec.encode(snap), "", true))
	f.close()
	quit()
