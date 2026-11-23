extends Node
## Visual QA: the departure crew row (needs a display).

func _ready() -> void:
	var out_dir: String = OS.get_cmdline_user_args()[0]
	DirAccess.make_dir_recursive_absolute(out_dir)
	Profile.save_path = "user://capture_crew_profile.json"
	Profile.data = Profile.defaults()
	Profile.data["unlocked_characters"] = GameData.CHARACTERS.keys()
	for d: String in ["fod_war_camp", "fod_depot"]:
		Profile.data["discovered"][d] = {"expedition": 1, "character": "sir_eric"}
	var main: Node = load("res://scripts/ui/main.gd").new()
	add_child(main)
	await get_tree().create_timer(0.3).timeout
	main.selected_character = "sir_eric"
	main.selected_stop = "fod_training"
	main.show_departure()
	await get_tree().create_timer(0.4).timeout
	var sc: ScrollContainer = main.screen.find_children("*", "ScrollContainer", true, false)[-1]
	sc.scroll_vertical = 330
	await get_tree().create_timer(0.3).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(out_dir.path_join("crew.png"))
	get_tree().quit()
