extends Node
## Visual QA: the results screen with a mixed haul (needs a display).

func _ready() -> void:
	var out_dir: String = OS.get_cmdline_user_args()[0]
	DirAccess.make_dir_recursive_absolute(out_dir)
	Profile.save_path = "user://capture_results_profile.json"
	Profile.data = Profile.defaults()
	var main: Node = load("res://scripts/ui/main.gd").new()
	add_child(main)
	await get_tree().create_timer(0.3).timeout
	var recs: Array = GameData.DISCOVERIES.keys().filter(func(d: String) -> bool: return d.begins_with("trk_")).slice(0, 3)
	var discs: Array = recs + ["r3_approach", "r3_echo_freeze", "seam_twice", "r3_wake", "r3_echo_shadows", "r3_mouth", "r3_echo_edge"]
	var frag: String = ""
	for d: String in GameData.DISCOVERIES.keys():
		if String(GameData.DISCOVERIES[d]["kind"]) == "fragment":
			frag = d
			break
	discs.append(frag)
	main.last_result = {"outcome": "extracted", "time": 640.0, "kills": 210, "level": 9, "character": "ella_venn", "destination": "shatterwake",
		"regions": ["auric_approach", "the_shatterwake"], "weapons": {"pulse_bolt": 5}, "harmonies": [], "discoveries": discs, "stop": "r3_wake", "stop_complete": true}
	var unl: Array = []
	for d2: String in discs:
		if GameData.DISCOVERIES[d2].has("transmission"):
			unl.append({"kind": "transmission", "id": String(GameData.DISCOVERIES[d2]["transmission"])})
	unl.append({"kind": "fragment", "id": "x"})
	main.last_commit = {"currency": 180, "new_discoveries": discs, "unlocks": unl}
	main.show_results()
	await get_tree().create_timer(0.5).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(out_dir.path_join("results.png"))
	get_tree().quit()
