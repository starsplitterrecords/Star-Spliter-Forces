extends Node
## Renders a combat-heavy frame for effects review (xvfb-run, see capture.gd).
func _ready() -> void:
	var out: String = OS.get_cmdline_user_args()[0] if OS.get_cmdline_user_args().size() > 0 else "user://"
	Profile.save_path = "user://capture_profile.json"
	Profile.data = Profile.defaults()
	var run: GameRun = GameRun.new()
	run.setup({"character": "ella_venn", "force": "pulse_width_codex", "seed": 3})
	add_child(run)
	await get_tree().process_frame
	run.scripted_input = true
	run.player.god_mode = true
	run.hint_queue.clear()
	for w: String in ["mic_drop", "nightline", "duet_unit", "pattern_cannon", "feedback_bloom"]:
		run.weapons.add_weapon(w)
		run.weapons.weapons[w] = 4
	run.player.position = Vector2(1400, 600)
	run.camera.position = run.player.position
	run.camera.reset_smoothing()
	for i in 45:
		run.spawn_enemy(["skiff", "ram_cutter", "swarm_tender", "rail_picket"][i % 4], run.player.position + Vector2.from_angle(i * 0.6) * (140.0 + (i % 7) * 45.0), true)
	run.spawn_enemy("dreadnought", run.player.position + Vector2(330, -80), true)
	run.spawn_enemy("gunship", run.player.position + Vector2(-260, 120), true)
	run.spawn_enemy("leech", run.player.position + Vector2(-120, -160), true)
	run.spawn_enemy("blink", run.player.position + Vector2(160, 220), true)
	var t: float = 0.0
	var shot: int = 0
	while t < 6.0:
		if run.choosing:
			run.hud._pick(run.hud.level_options[0])
		run.player.move_input = Vector2(cos(t * 1.3), sin(t * 1.3))
		if t > 2.0 and shot == 0:
			run.weapons.build = 100.0
			run.weapons.drop_armed = true
		await get_tree().process_frame
		t += get_process_delta_time()
		if (t > 2.6 and shot == 0) or (t > 4.4 and shot == 1):
			await RenderingServer.frame_post_draw
			get_viewport().get_texture().get_image().save_png(out.path_join("fx_%d.png" % shot))
			shot += 1
	get_tree().quit()
