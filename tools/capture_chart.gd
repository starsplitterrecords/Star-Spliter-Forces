extends Node
## Visual QA for the Corridor Chart (needs a display):
##   xvfb-run -s "-screen 0 1280x720x24" godot --rendering-driver opengl3 res://tools/CaptureChart.tscn -- <out_dir>

var out_dir: String = "user://captures_chart"
var main: Node

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	var args: PackedStringArray = OS.get_cmdline_user_args()
	if args.size() > 0:
		out_dir = args[0]
	DirAccess.make_dir_recursive_absolute(out_dir)
	Profile.save_path = "user://capture_chart_profile.json"
	Profile.data = Profile.defaults()
	main = load("res://scripts/ui/main.gd").new()
	add_child(main)
	await _wait(0.5)
	await _shot("c01_title_fresh")
	main.show_chart()
	await _wait(0.4)
	await _shot("c02_chart_fresh")
	for id: String in ["first_light", "hold_the_lane", "gravefire", "green_echo"]:
		Profile.complete_stop(id)
	Profile.data["unlocked_characters"].append("tessa_banks")
	main.show_title()
	await _wait(0.3)
	await _shot("c03_title_progress")
	main.show_chart()
	await _wait(0.4)
	await _shot("c04_chart_progress")
	main.show_chart("s_dti")
	await _wait(0.4)
	await _shot("c05_chart_side")
	main.show_chart("the_silence")
	await _wait(0.4)
	await _shot("c06_chart_locked")
	main.selected_stop = "verge_escort"
	main.show_departure()
	await _wait(0.3)
	await _shot("c07_departure_stop")
	main.start_expedition(false)
	await _wait(1.2)
	var run: GameRun = main.current_run
	run.scripted_input = true
	run.player.god_mode = true
	await _shot("c08_stop_start")
	await _wait(5.0)
	await _shot("c09_stop_hint")
	for q: Dictionary in run.pois.items:
		if String(q.id) == "char_verge_escort":
			run.player.position = Vector2(q.pos) + Vector2(0, 40)
			run.camera.position = run.player.position
			run.camera.reset_smoothing()
			await _wait(0.3)
			run._claim_discovery(q)
	await _wait(0.8)
	await _shot("c10_stop_complete")
	run.player.position = run.world.gate + Vector2(30, 30)
	run.camera.position = run.player.position
	run.camera.reset_smoothing()
	run.left_gate = true
	await _wait(0.6)
	await _shot("c11_home_beacon")
	run.end_run("extracted")
	await _wait(2.0)
	await _shot("c12_results")
	get_tree().quit()

func _wait(seconds: float) -> void:
	await get_tree().create_timer(seconds, true, false, true).timeout

func _shot(name: String) -> void:
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(out_dir.path_join(name + ".png"))
	print("captured ", name)
