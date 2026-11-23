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
	for pair: Array in [["first_light", 1], ["k_freighter", 2], ["iv_tribunal", 4], ["sea_river", 10], ["des_shop", 11], ["orb_bullpen", 12], ["az_queue", 13], ["fod_depot", 14], ["ech_archives", 15], ["dt_oversight", 16]]:
		main.show_chart(String(pair[0]), int(pair[1]))
		await get_tree().create_timer(0.5).timeout
		var sc: ScrollContainer = main.screen.find_children("*", "ScrollContainer", true, false)[0]
		sc.scroll_horizontal = 0
		await get_tree().create_timer(0.2).timeout
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(out_dir.path_join("chart_%02d.png" % int(pair[1])))
	DirAccess.remove_absolute(Profile.PLAYTEST_PATH)
	get_tree().quit()
