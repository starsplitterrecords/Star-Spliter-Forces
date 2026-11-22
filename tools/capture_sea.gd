extends Node
## Visual QA for a branch world (needs a display). Branch: sea (default) or desert.
##   xvfb-run -s "-screen 0 390x844x24" godot --rendering-driver opengl3 --resolution 390x844 res://tools/CaptureSea.tscn -- <out_dir> [desert]

const BRANCHES: Dictionary = {
	"sea": {"chapter": 10, "done": ["green_echo", "s_dti", "sea_atlantic", "sea_river"], "focus": "sea_pier", "stage": "sea_dti",
		"regions": ["north_atlantic", "east_river", "dti_building", "bushwick_rooftop", "harbor_phase", "harbor_pier"]},
	"desert": {"chapter": 11, "done": ["shelf_beacon", "s_ochre", "des_lakebed", "des_shop"], "focus": "des_esperanza", "stage": "des_red_mesa",
		"regions": ["dry_lakebed", "launch_shop", "esperanza", "ridge_relay", "red_mesa", "two_suns", "the_forge", "coyote_wells"]},
	"orbit": {"chapter": 12, "done": ["gravefire", "s_stardust", "orb_branch"], "focus": "orb_bullpen", "stage": "orb_break",
		"regions": ["station_approach", "main_bullpen", "west_corridor", "break_room", "supply_store"]},
}

var out_dir: String = "user://captures_sea"
var main: Node

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	var args: PackedStringArray = OS.get_cmdline_user_args()
	if args.size() > 0:
		out_dir = args[0]
	var br: Dictionary = BRANCHES[args[1] if args.size() > 1 else "sea"]
	DirAccess.make_dir_recursive_absolute(out_dir)
	Profile.save_path = "user://capture_sea_profile.json"
	Profile.data = Profile.defaults()
	for st: Dictionary in GameData.chart_main(1):
		Profile.complete_stop(String(st["id"]))
	for id: String in br["done"]:
		Profile.complete_stop(id)
	for c: String in GameData.CATEGORIES.keys():
		Profile.mark_seen("cat_" + c)
	main = load("res://scripts/ui/main.gd").new()
	add_child(main)
	await _wait(0.4)
	main.show_chart(String(br["focus"]), int(br["chapter"]))
	await _wait(0.5)
	await _shot("s01_chart")
	# Visit each landmark region with the run frozen in place.
	main.selected_stop = String(br["stage"])
	main.start_expedition(false)
	await _wait(1.0)
	var run: GameRun = main.current_run
	run.scripted_input = true
	run.player.god_mode = true
	run.hud.teach_queue.clear()
	var n: int = 2
	for rid: String in br["regions"]:
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
