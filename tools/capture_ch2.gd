extends Node
## Visual QA for Chapter II (needs a display):
##   xvfb-run -s "-screen 0 1280x720x24" godot --rendering-driver opengl3 res://tools/CaptureCh2.tscn -- <out_dir>

var out_dir: String = "user://captures_ch2"
var main: Node

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	var args: PackedStringArray = OS.get_cmdline_user_args()
	if args.size() > 0:
		out_dir = args[0]
	DirAccess.make_dir_recursive_absolute(out_dir)
	Profile.save_path = "user://capture_ch2_profile.json"
	Profile.data = Profile.defaults()
	for st: Dictionary in GameData.chart_main(1):
		Profile.complete_stop(String(st["id"]))
	for id: String in ["k_light", "k_freighter", "k_grind"]:
		Profile.complete_stop(id)
	for d: String in ["rf_grain_freighter", "rf_auric_bazaar", "rec_phase_redux"]:
		Profile.data["discovered"][d] = {"expedition": 1, "character": "ella_venn"}
	Profile.data["transmissions"] = ["pr_sail_west"]
	for c: String in GameData.CATEGORIES.keys():
		Profile.mark_seen("cat_" + c)
	main = load("res://scripts/ui/main.gd").new()
	add_child(main)
	await _wait(0.4)
	await _shot("k01_title")
	main.show_chart()
	await _wait(0.5)
	await _shot("k02_chart_ch2")
	main.show_archive()
	await _wait(0.3)
	var tabs: TabContainer = main.screen.find_children("*", "TabContainer", true, false)[0]
	tabs.current_tab = 1
	await _wait(0.3)
	var sc: ScrollContainer = tabs.get_current_tab_control() as ScrollContainer
	sc.scroll_vertical = 10000
	await _wait(0.3)
	await _shot("k03_archive_contacts")
	tabs.current_tab = 0
	await _wait(0.3)
	await _shot("k04_archive_records")
	for pair: Array in [["k_freighter", "rf_grain_freighter"], ["k_luminara", "rf_luminara_dock"], ["k_auric", "rf_auric_bazaar"]]:
		main.selected_stop = String(pair[0])
		main.start_expedition(false)
		await _wait(0.6)
		var run: GameRun = main.current_run
		run.scripted_input = true
		run.player.god_mode = true
		run.hud.teach_queue.clear()
		if run.hud.teach_panel:
			run.hud.teach_panel.queue_free()
			run.hud.teach_panel = null
			get_tree().paused = false
		for q: Dictionary in run.pois.items:
			if String(q.id) == String(pair[1]):
				q.known = true
				run.player.position = Vector2(q.pos) + Vector2(0, 230)
				run.camera.position = run.player.position
				run.camera.reset_smoothing()
		await _wait(0.8)
		await _shot("k05_" + String(pair[0]))
		run.queue_free()
		main.current_run = null
		get_tree().paused = false
		await _wait(0.2)
	get_tree().quit()

func _wait(seconds: float) -> void:
	await get_tree().create_timer(seconds, true, false, true).timeout

func _shot(name: String) -> void:
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(out_dir.path_join(name + ".png"))
