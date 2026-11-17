extends Node
## Renders real frames for visual QA (needs a display; use xvfb-run).
##   xvfb-run -s "-screen 0 1280x720x24" godot --rendering-driver opengl3 res://tools/Capture.tscn -- <out_dir>

var out_dir: String = "user://captures"
var main: Node

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	var args: PackedStringArray = OS.get_cmdline_user_args()
	if args.size() > 0:
		out_dir = args[0]
	DirAccess.make_dir_recursive_absolute(out_dir)
	Profile.save_path = "user://capture_profile.json"
	Profile.data = Profile.defaults()
	Profile.data["forces_attuned"] = ["pulse_width_codex", "resonant_currents", "star_splitter_rex"]
	Profile.data["transmissions"] = ["pwc_now_or_never", "rc_meaningless_dub"]
	Profile.data["unlocked_characters"] = ["ella_venn", "naomi_sol"]
	main = load("res://scripts/ui/main.gd").new()
	add_child(main)
	await _wait(0.6)
	await _shot("01_title")
	main.show_departure()
	await _wait(0.3)
	await _shot("02_departure")
	main.show_archive()
	await _wait(0.3)
	await _shot("03_archive")
	main.show_settings()
	await _wait(0.3)
	await _shot("03b_settings")
	Profile.data["currency"] = 400
	main.show_workshop()
	await _wait(0.3)
	await _shot("03c_workshop")
	main.last_result = {"outcome": "extracted", "time": 734.0, "kills": 212, "level": 17, "character": "ella_venn", "regions": ["silver_wrecks", "quiet_basin"], "weapons": {"pulse_bolt": 5, "sub_wave": 3}, "harmonies": ["dub_drop"], "discoveries": ["sig_green_echo", "char_gravefire", "frag_gate"]}
	main.last_commit = {"currency": 96, "unlocks": [{"kind": "force", "id": "resonant_currents"}, {"kind": "character", "id": "tessa_banks"}, {"kind": "transmission", "id": "rc_meaningless_dub"}], "new_discoveries": ["sig_green_echo", "char_gravefire"], "mastery_levels": 1}
	main.show_results()
	await _wait(0.3)
	await _shot("03d_results")
	main.start_expedition(false)
	await _wait(0.5)
	var run: GameRun = main.current_run
	run.scripted_input = true
	run.player.god_mode = true
	await _wait(0.5)
	await _shot("04_gate_start")
	await _drive(run, Vector2(1750, 1150), 9.0)
	await _shot("05_en_route")
	await _drive(run, Vector2(1750, 1150), 6.0)
	await _shot("06_silver_wrecks")
	run.player.position = Vector2(-1350, 1450)
	run.camera.reset_smoothing()
	await _drive(run, Vector2(-1500, 1570), 3.0)
	await _shot("07_quiet_basin")
	run.player.position = Vector2(-2050, -1150)
	run.camera.reset_smoothing()
	await _drive(run, Vector2(-1870, -1210), 3.0)
	await _shot("08_thunderbreak")
	run.player.position = Vector2(1300, -900)
	run.camera.reset_smoothing()
	await _drive(run, Vector2(2200, -1300), 3.0)
	await _shot("09_night_corridor")
	run.resonance = 10.0
	run.player.position = Vector2(250, -1700)
	run.camera.reset_smoothing()
	await _drive(run, Vector2(100, -1600), 3.0)
	await _shot("10_fracture_bloom")
	run.pending_levels = 1
	await _wait(0.4)
	await _shot("11_level_up")
	if run.choosing:
		run.hud._pick(run.hud.level_options[0])
	await _wait(0.2)
	run.hud.open_map()
	await _wait(0.3)
	await _shot("12_map")
	run.hud._close_map()
	run.discoveries = ["sig_green_echo", "sig_now_or_never"]
	run.spawn_boss(run.player.position + Vector2(0, -300))
	await _drive(run, run.player.position + Vector2(300, 0), 4.0)
	await _shot("13_boss")
	get_tree().quit()

func _drive(run: GameRun, target: Vector2, seconds: float) -> void:
	var t: float = 0.0
	while t < seconds:
		if run.choosing:
			run.hud._pick(run.hud.level_options[0])
		run.player.move_input = run.player.position.direction_to(target) if run.player.position.distance_to(target) > 30.0 else Vector2.ZERO
		await get_tree().process_frame
		t += get_process_delta_time()

func _wait(seconds: float) -> void:
	await get_tree().create_timer(seconds, true, false, true).timeout

func _shot(name: String) -> void:
	await RenderingServer.frame_post_draw
	var img: Image = get_viewport().get_texture().get_image()
	img.save_png(out_dir.path_join(name + ".png"))
	print("captured ", name)
