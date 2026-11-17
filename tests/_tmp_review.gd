extends Node
func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	await get_tree().process_frame
	Profile.load_profile("user://_tmp_review.json")
	# 1. Guardian with real frames
	var run := GameRun.new()
	run.setup({"character": "ella_venn", "force": "pulse_width_codex", "seed": 1234})
	run.debug_enabled = false
	run.scripted_input = true
	add_child(run)
	run.set_process(false)
	run.hint_queue.clear()
	var beacon: Dictionary = {}
	for q: Dictionary in run.pois.items:
		if String(q.id) == "sig_thunderbreak_beacon":
			beacon = q
	run.player.god_mode = true
	for i in 30:
		run.player.position = Vector2(beacon.pos)
		run.step(1.0/60.0)
	var g = beacon.get("guardian")
	print("guardian1 valid: ", is_instance_valid(g))
	run.damage_enemy(g, 99999.0, Vector2.ZERO, 0.0, "environment", true)
	var guardians := 1
	var last = g
	for i in 600:
		await get_tree().process_frame
		if run.choosing:
			run.hud._pick(run.hud.level_options[0])
		run.player.position = Vector2(beacon.pos)
		run.step(1.0/60.0)
		var cur = beacon.get("guardian")
		if is_instance_valid(cur) and cur != last:
			guardians += 1
			last = cur
			run.damage_enemy(cur, 99999.0, Vector2.ZERO, 0.0, "environment", true)
	print("guardians spawned: ", guardians, " tuned: ", "sig_thunderbreak_beacon" in run.discoveries, " progress: ", beacon.progress)
	run.queue_free()
	await get_tree().process_frame
	# 2. Naomi charges
	Profile.data["mastery"]["naomi_sol"] = {"xp": 999999, "level": 2, "expeditions": 0, "completions": 0}
	var r2 := GameRun.new()
	r2.setup({"character": "naomi_sol", "force": "pulse_width_codex", "seed": 1})
	r2.scripted_input = true
	add_child(r2)
	r2.set_process(false)
	var ok := 0
	for i in 20:
		if r2.use_ability():
			ok += 1
		r2.step(1.0/60.0)
	print("naomi dashes in 20 frames: ", ok, " cd=", r2.ability_cd)
	r2.queue_free()
	DirAccess.remove_absolute(ProjectSettings.globalize_path("user://_tmp_review.json"))
	get_tree().quit()
