extends Node
## Visual QA for Review mode (needs a display):
##   xvfb-run -s "-screen 0 390x844x24" godot --rendering-driver opengl3 --resolution 390x844 res://tools/CaptureReview.tscn -- <out_dir>

var out_dir: String = "user://captures_review"

func _ready() -> void:
	var args: PackedStringArray = OS.get_cmdline_user_args()
	if args.size() > 0:
		out_dir = args[0]
	DirAccess.make_dir_recursive_absolute(out_dir)
	Profile.save_path = "user://capture_review_profile.json"
	Profile.data = Profile.defaults()
	var main: Node = load("res://scripts/ui/main.gd").new()
	add_child(main)
	await get_tree().create_timer(0.3).timeout
	for mode in ["normal", "review"]:
		if mode == "review":
			Profile.save_path = Profile.PLAYTEST_PATH
			Profile.set_setting("playtest_review", true)
		main.show_archive()
		await get_tree().create_timer(0.3).timeout
		var tabs: TabContainer = main.screen.find_children("*", "TabContainer", true, false)[0]
		for i in tabs.get_tab_count():
			var nm: String = tabs.get_tab_control(i).name
			if nm in ["Forces", "Rex Fleet", "Shelves"]:
				tabs.current_tab = i
				await get_tree().create_timer(0.3).timeout
				await RenderingServer.frame_post_draw
				get_viewport().get_texture().get_image().save_png(out_dir.path_join("%s_%s.png" % [mode, nm.replace(" ", "_")]))
	DirAccess.remove_absolute(Profile.PLAYTEST_PATH)
	get_tree().quit()
