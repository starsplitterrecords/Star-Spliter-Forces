extends Node
## Frame-cost probe: plays a busy scene with real rendering and prints the
## average process time, draw calls and FPS. Use under xvfb-run.
func _ready() -> void:
	Profile.save_path = "user://perf_profile.json"
	Profile.data = Profile.defaults()
	var run: GameRun = GameRun.new()
	run.setup({"character": "ella_venn", "force": "pulse_width_codex", "seed": 5})
	add_child(run)
	await get_tree().process_frame
	run.scripted_input = true
	run.player.god_mode = true
	run.hint_queue.clear()
	for w: String in ["riser", "ion_lance", "trail_charges", "riff_blades"]:
		if GameData.WEAPONS.has(w):
			run.weapons.add_weapon(w)
	for i in 70:
		run.spawn_enemy(["skiff", "ram_cutter", "swarm_tender", "rail_picket"][i % 4], run.player.position + Vector2.from_angle(i * 0.6) * (200.0 + (i % 9) * 50.0), true)
	var hide: String = OS.get_cmdline_user_args()[0] if OS.get_cmdline_user_args().size() > 0 else ""
	match hide:
		"hud": run.hud.canvas.visible = false
		"pois": run.pois.visible = false
		"world": run.world.visible = false
		"stars":
			for c: Node in run.world.get_children():
				if c is Parallax2D:
					c.visible = false
		"chunks":
			for c: Node in run.world.get_children():
				if not c is Parallax2D:
					c.visible = false
		"fx": run.fx.visible = false
		"enemies": run.enemy_layer.visible = false
		"weapons": run.weapons.visible = false
		"minimap": run.hud.set_meta("no_minimap", true)
	var frames: int = 0
	var t_proc: float = 0.0
	var draws: float = 0.0
	var step_total: float = 0.0
	var start: int = Time.get_ticks_msec()
	while frames < 400:
		if run.choosing:
			run.hud._pick(run.hud.level_options[0])
		run.player.move_input = Vector2(cos(frames * 0.02), sin(frames * 0.02))
		await get_tree().process_frame
		if frames > 50:
			t_proc += Performance.get_monitor(Performance.TIME_PROCESS)
			draws += Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
			step_total += run.step_usec
		frames += 1
	var n: float = 349.0
	print(hide, " PERF step_ms=%.2f process_ms=%.2f draw_calls=%d fps=%.1f enemies=%d" % [step_total / n / 1000.0, t_proc / n * 1000.0, int(draws / n), 400.0 / ((Time.get_ticks_msec() - start) / 1000.0), run.enemies.size()])
	get_tree().quit()
