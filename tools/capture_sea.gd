extends Node
## Visual QA for the Harbor Signal (sea) branch (needs a display):
##   xvfb-run -s "-screen 0 390x844x24" godot --rendering-driver opengl3 --resolution 390x844 res://tools/CaptureSea.tscn -- <out_dir>

var out_dir: String = "user://captures_sea"
var main: Node

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	var args: PackedStringArray = OS.get_cmdline_user_args()
	if args.size() > 0:
		out_dir = args[0]
	DirAccess.make_dir_recursive_absolute(out_dir)
	Profile.save_path = "user://capture_sea_profile.json"
	Profile.data = Profile.defaults()
	for st: Dictionary in GameData.chart_main(1):
		Profile.complete_stop(String(st["id"]))
	for id: String in ["green_echo", "s_dti", "sea_atlantic", "sea_river"]:
		Profile.complete_stop(id)
	for c: String in GameData.CATEGORIES.keys():
		Profile.mark_seen("cat_" + c)
	main = load("res://scripts/ui/main.gd").new()
	add_child(main)
	await _wait(0.4)
	main.show_chart("sea_pier", 10)
	await _wait(0.5)
	await _shot("s01_chart_sea")
	# Visit each landmark region with the run frozen in place.
	main.selected_stop = "sea_dti"
	main.start_expedition(false)
	await _wait(1.0)
	var run: GameRun = main.current_run
	run.scripted_input = true
	run.player.god_mode = true
	run.hud.teach_queue.clear()
	var n: int = 2
	for rid: String in ["north_atlantic", "east_river", "dti_building", "bushwick_rooftop", "harbor_phase", "harbor_pier"]:
		run.player.position = GameData.region_anchor(GameData.REGIONS[rid]) + Vector2(60, 180)
		for k in 5:
			run.spawn_enemy(["skiff", "ram_cutter", "mine_hauler", "echo_mote", "gunship"][k], run.player.position + Vector2.from_angle(k * 1.3) * 260.0, true)
		await _wait(1.2)
		if run.hud.teach_blocking:
			run.hud._dismiss_teach()
			await _wait(0.2)
		await _shot("s%02d_%s" % [n, rid])
		n += 1
	get_tree().quit()

func _wait(seconds: float) -> void:
	await get_tree().create_timer(seconds, true, false, true).timeout

func _shot(name: String) -> void:
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(out_dir.path_join(name + ".png"))
