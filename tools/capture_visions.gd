extends Node
## Visual QA for the Star Splitter Visions guests (needs a display):
##   xvfb-run -s "-screen 0 1280x720x24" godot --rendering-driver opengl3 res://tools/CaptureVisions.tscn -- <out_dir>

var out_dir: String = "user://captures_visions"
var main: Node

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	var args: PackedStringArray = OS.get_cmdline_user_args()
	if args.size() > 0:
		out_dir = args[0]
	DirAccess.make_dir_recursive_absolute(out_dir)
	Profile.save_path = "user://capture_visions_profile.json"
	Profile.data = Profile.defaults()
	for cid: String in GameData.CHARACTERS.keys():
		Profile.data["unlocked_characters"].append(cid)
	for sid: String in GameData.VISIONS_SERIES.keys():
		Profile.data["discovered"][String(GameData.VISIONS_SERIES[sid]["discovery"])] = {"expedition": 1, "character": "ella_venn"}
	for cat: String in GameData.CATEGORIES.keys():
		Profile.mark_seen("cat_" + cat)
	main = load("res://scripts/ui/main.gd").new()
	add_child(main)
	await _wait(0.5)
	main.show_archive()
	await _wait(0.3)
	var tabs: TabContainer = main.screen.find_children("*", "TabContainer", true, false)[0]
	for i in tabs.get_tab_count():
		if tabs.get_tab_title(i) == "Visions":
			tabs.current_tab = i
	await _wait(0.3)
	await _shot("v01_archive_visions")
	for cid: String in ["bjorn", "jax_orien", "lucia", "brandon_mack"]:
		main.selected_character = cid
		main.show_departure()
		await _wait(0.3)
		await _shot("v02_departure_" + cid)
	for sid: String in GameData.VISIONS_SERIES.keys():
		var v: Dictionary = GameData.VISIONS_SERIES[sid]
		main.selected_character = String(v["explorer"])
		main.start_expedition(false)
		await _wait(0.4)
		var run: GameRun = main.current_run
		run.scripted_input = true
		run.player.god_mode = true
		for q: Dictionary in run.pois.items:
			if String(q.id) == String(v["discovery"]):
				q.known = true
				run.player.position = Vector2(q.pos) + Vector2(0, 220)
				run.camera.position = run.player.position
				run.camera.reset_smoothing()
		for i in 8:
			run.spawn_enemy("skiff", run.player.position + Vector2.from_angle(i) * 260.0, true)
		await _wait(0.6)
		run.player.facing = -PI / 2.0
		run.use_ability()
		await _wait(0.5)
		await _shot("v03_" + sid)
		main.current_run.queue_free()
		main.current_run = null
		get_tree().paused = false
		await _wait(0.2)
	get_tree().quit()

func _wait(seconds: float) -> void:
	await get_tree().create_timer(seconds, true, false, true).timeout

func _shot(name: String) -> void:
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(out_dir.path_join(name + ".png"))
	print("captured ", name)
