extends Node
## Visual QA of every screen with a late-game profile (needs a display):
##   xvfb-run -s "-screen 0 390x844x24" godot --rendering-driver opengl3 --resolution 390x844 res://tools/CapturePortrait.tscn -- <out_dir>

var out_dir: String = "user://captures_portrait"
var main: Node

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	var args: PackedStringArray = OS.get_cmdline_user_args()
	if args.size() > 0:
		out_dir = args[0]
	DirAccess.make_dir_recursive_absolute(out_dir)
	Profile.save_path = "user://capture_portrait_profile.json"
	Profile.data = Profile.defaults()
	for st: Dictionary in GameData.CHART:
		if String(st["id"]) != "the_silence":
			Profile.complete_stop(String(st["id"]))
	Profile.data["unlocked_characters"] = GameData.CHARACTERS.keys()
	Profile.data["forces_attuned"] = GameData.FORCES.keys()
	Profile.data["transmissions"] = GameData.TRANSMISSIONS.keys()
	Profile.data["fragments"] = GameData.FRAGMENTS.keys().slice(0, 4)
	for d: String in GameData.DISCOVERIES.keys():
		Profile.data["discovered"][d] = {"expedition": 1, "character": "ella_venn"}
	Profile.data["currency"] = 900
	Profile.data["workshop"] = {"insight": 1}
	for c: String in GameData.CATEGORIES.keys():
		Profile.mark_seen("cat_" + c)
	main = load("res://scripts/ui/main.gd").new()
	add_child(main)
	await _wait(0.5)
	await _shot("p01_title")
	main.show_chart()
	await _wait(0.4)
	await _shot("p02_chart")
	main.selected_stop = "the_silence"
	main.show_departure()
	await _wait(0.3)
	await _shot("p03_departure")
	main.show_archive()
	await _wait(0.3)
	var tabs: TabContainer = main.screen.find_children("*", "TabContainer", true, false)[0]
	for i in tabs.get_tab_count():
		tabs.current_tab = i
		await _wait(0.25)
		await _shot("p04_archive_%d" % i)
	main.show_workshop()
	await _wait(0.3)
	await _shot("p05_workshop")
	main.show_settings()
	await _wait(0.3)
	await _shot("p06_settings")
	main.show_credits()
	await _wait(0.3)
	await _shot("p07_credits")
	main.selected_stop = "the_silence"
	main.selected_character = "jax_orien"
	main.start_expedition(false)
	await _wait(1.0)
	var run: GameRun = main.current_run
	run.scripted_input = true
	run.player.god_mode = true
	run.hud.teach_queue.clear()
	await _wait(0.5)
	await _shot("p08_hud")
	run.pending_levels = 1
	await _wait(0.5)
	await _shot("p09_levelup")
	if run.choosing:
		run.hud._pick(run.hud.level_options[0])
	await _wait(0.3)
	run.hud.toggle_pause()
	await _wait(0.3)
	await _shot("p10_pause")
	run.hud._open_field_guide()
	await _wait(0.3)
	await _shot("p11_field_guide")
	run.hud.toggle_pause()
	run.hud.open_map()
	await _wait(0.3)
	await _shot("p12_map")
	run.hud._close_map()
	run.left_gate = true
	run.player.position = run.world.gate
	await _wait(0.6)
	await _shot("p13_gate")
	run.end_run("defeat")
	await _wait(2.0)
	await _shot("p14_results")
	get_tree().quit()

func _wait(seconds: float) -> void:
	await get_tree().create_timer(seconds, true, false, true).timeout

func _shot(name: String) -> void:
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(out_dir.path_join(name + ".png"))
