extends Node
## Visual QA: the chart with every chapter open (needs a display).

func _ready() -> void:
	var out_dir: String = OS.get_cmdline_user_args()[0]
	DirAccess.make_dir_recursive_absolute(out_dir)
	Profile.save_path = Profile.PLAYTEST_PATH
	Profile.data = Profile.defaults()
	Profile._open_everything()
	var main: Node = load("res://scripts/ui/main.gd").new()
	add_child(main)
	await get_tree().create_timer(0.3).timeout
	main.show_chart("r3_approach", 3)
	await get_tree().create_timer(0.5).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(out_dir.path_join("chart_all.png"))
	DirAccess.remove_absolute(Profile.PLAYTEST_PATH)
	get_tree().quit()
