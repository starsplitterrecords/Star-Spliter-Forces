extends Node
## Visual QA: Maya's ship and Life Support dome (needs a display).

func _ready() -> void:
	var out_dir: String = OS.get_cmdline_user_args()[0]
	DirAccess.make_dir_recursive_absolute(out_dir)
	Profile.save_path = "user://capture_maya_profile.json"
	Profile.data = Profile.defaults()
	Profile.data["unlocked_characters"] = GameData.CHARACTERS.keys()
	for d: String in ["az_queue", "az_media", "az_suite"]:
		Profile.data["discovered"][d] = {"expedition": 1, "character": "maya_serrano"}
	for c: String in GameData.CATEGORIES.keys():
		Profile.mark_seen("cat_" + c)
	var main: Node = load("res://scripts/ui/main.gd").new()
	add_child(main)
	await get_tree().create_timer(0.3).timeout
	main.selected_character = "maya_serrano"
	main.selected_stop = "az_ops"
	main.start_expedition(false)
	await get_tree().create_timer(1.0).timeout
	var run: GameRun = main.current_run
	run.scripted_input = true
	run.player.god_mode = true
	run.hud.teach_queue.clear()
	for k in 6:
		run.spawn_enemy("skiff", run.player.position + Vector2.from_angle(k) * 150.0, true)
	run.ability_cd = 0.0
	run.use_ability()
	await get_tree().create_timer(0.6).timeout
	if run.hud.teach_blocking:
		run.hud._dismiss_teach()
		await get_tree().create_timer(0.3).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(out_dir.path_join("maya.png"))
	get_tree().quit()
