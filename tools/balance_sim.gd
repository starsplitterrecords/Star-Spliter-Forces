extends Node
## Plays whole expeditions headlessly with a simple explorer bot and prints a
## pacing timeline. Not a test — a tuning instrument.
##   godot --headless res://tools/BalanceSim.tscn -- [character] [force] [seed] [plan]
## plan: "explore" (tune signals, then confront) or "extract" (two signals then home)

func _ready() -> void:
	var args: PackedStringArray = OS.get_cmdline_user_args()
	var character: String = args[0] if args.size() > 0 else "ella_venn"
	var force: String = args[1] if args.size() > 1 else "pulse_width_codex"
	var seed_value: int = int(args[2]) if args.size() > 2 else 7
	var plan: String = args[3] if args.size() > 3 else "explore"
	var destination: String = args[4] if args.size() > 4 else "black_drift_reach"
	Profile.save_path = "user://balance_profile.json"
	Profile.data = Profile.defaults()
	Profile.data["forces_attuned"] = [force, "pulse_width_codex"]
	Profile.data["unlocked_characters"] = GameData.CHARACTERS.keys()
	var run: GameRun = GameRun.new()
	run.setup({"character": character, "force": force, "seed": seed_value, "destination": destination})
	run.scripted_input = true
	run.debug_enabled = false
	add_child(run)
	await get_tree().process_frame
	run.hint_queue.clear()
	var result: Dictionary = {}
	run.finished.connect(func(r: Dictionary) -> void: result.merge(r))
	var dt: float = 1.0 / 30.0
	var next_report: float = 60.0
	var hp_min: float = 9999.0
	var target_desc: String = ""
	var stuck: float = 0.0
	var detour: float = 0.0
	var last_pos: Vector2 = Vector2.ZERO
	var detour_angle: float = PI / 2.0
	var boss_t: float = -1.0
	var boss_end: float = -1.0
	print("t     lvl kills enemies hp      state      region            target")
	while not run.ended and run.elapsed < 1500.0:
		if run.choosing:
			var opts: Array = run.hud.level_options
			# Prefer evolutions, then weapons, then passives — like a typical player.
			var pick: Dictionary = opts[0]
			for o: Dictionary in opts:
				if String(o["type"]) == "evolution":
					pick = o
			run.hud._pick(pick)
		var goal: Vector2 = _goal(run, plan)
		target_desc = str(goal.round())
		var mv: Vector2 = run.player.position.direction_to(goal) if run.player.position.distance_to(goal) > 20.0 else Vector2.ZERO
		# Swerve for nearby motes and away from contact.
		for it: Dictionary in run.pickups.items:
			if Vector2(it.pos).distance_to(run.player.position) < 200.0:
				mv = (mv + run.player.position.direction_to(it.pos) * 0.6).normalized()
				break
		var threat: ForceEnemy = run.nearest_enemy(run.player.position, 90.0)
		if threat:
			mv = (mv + threat.position.direction_to(run.player.position) * 1.2).normalized()
		# Unstick: if pushing but not moving, steer sideways for a moment.
		if mv.length() > 0.5 and run.player.position.distance_to(last_pos) < 2.0:
			stuck += dt
		else:
			stuck = maxf(0.0, stuck - dt)
		if stuck > 0.4:
			detour = 1.2
			stuck = 0.0
			detour_angle = [PI / 2.0, -PI / 2.0, PI * 0.8, -PI * 0.8][randi() % 4]
		if detour > 0.0:
			detour -= dt
			mv = mv.rotated(detour_angle)
		run.player.move_input = mv
		if run.ability_cd <= 0.0 and (run.player.hp < run.player.max_hp * 0.5 or run.enemies.size() > 25):
			run.use_ability()
		last_pos = run.player.position
		run.step(dt)
		if OS.get_environment("SIM_DEBUG") != "" and run.elapsed > 70.0 and run.elapsed < 70.2:
			print("DBG in=", run.player.move_input, " vel=", run.player.velocity, " pos=", run.player.position, " last=", last_pos, " stuck=", stuck, " detour=", detour, " choosing=", run.choosing, " alive=", run.player.alive, " paused=", get_tree().paused)
		hp_min = minf(hp_min, run.player.hp)
		if run.boss_spawned and boss_t < 0.0:
			boss_t = run.elapsed
			print("  boss spawned at %s (level %d, hp %d)" % [GameData.format_time(run.elapsed), run.level, int(run.boss.max_hp) if run.boss else 0])
		if run.boss_defeated and boss_end < 0.0:
			boss_end = run.elapsed
			print("  boss defeated after %ds" % int(boss_end - boss_t))
		if run.elapsed >= next_report:
			next_report += 60.0
			print("%4ds  %3d %5d %7d %3d/%3d %-10s %-17s sig %d/%d pos %s goal %s" % [int(run.elapsed), run.level, run.kills, run.enemies.size(), int(run.player.hp), int(run.player.max_hp), run.force_state, String(run.current_region_def()["name"]), run.signals_found(), run.goal_signals(), str(run.player.position.round()), target_desc])
	print("RESULT %s at %s, level %d, kills %d, discoveries %s, lowest hull %d, weapons %s, harmonies %s" % [String(result.get("outcome", "timeout")), GameData.format_time(run.elapsed), run.level, run.kills, str(run.discoveries), int(hp_min), str(run.weapons.weapons), str(run.weapons.harmonies)])
	get_tree().quit()

func _goal(run: GameRun, plan: String) -> Vector2:
	if run.boss_spawned and not run.boss_defeated and run.boss and is_instance_valid(run.boss):
		# Kite around the boss at medium range.
		var away: Vector2 = run.boss.position.direction_to(run.player.position)
		return run.boss.position + away.rotated(0.6) * 300.0
	var enough: bool = run.signals_found() >= run.goal_signals() and (plan == "extract" or run.elapsed > 720.0)
	if enough or run.player.hp < run.player.max_hp * 0.25:
		if run.at_gate() and run.climax_available() and plan == "explore" and run.player.hp > run.player.max_hp * 0.5:
			run.confront()
		return run.world.gate
	# Locks: relays first; Resonance-locked signals want a resonator.
	var echo: Dictionary = run.pois.nearest_unclaimed(run.player.position, ["echo"], true)
	if not echo.is_empty():
		return echo.pos
	var relay: Dictionary = run.pois.nearest_unclaimed(run.player.position, ["relay"], true)
	if not relay.is_empty():
		return relay.pos
	var p: Dictionary = run.pois.nearest_unclaimed(run.player.position, ["signal", "character"], true)
	if not p.is_empty() and String(p.get("lock", "")) == "resonance" and run.force_state != "RESONANCE":
		var res: Dictionary = run.pois.nearest_unclaimed(run.player.position, ["resonator"], true)
		if not res.is_empty():
			return res.pos
	if p.is_empty():
		p = run.pois.nearest_unclaimed(run.player.position, ["cache", "camp", "artifact", "fragment", "anomaly"], true)
		if not p.is_empty() and Vector2(p.pos).distance_to(run.player.position) > 900.0:
			p = {}
	if not p.is_empty():
		return p.pos
	# Nothing known: head for the nearest unvisited region, like a curious player.
	var best: Vector2 = run.world.gate
	var best_d: float = INF
	for rid: String in run.world.region_ids:
		if rid in run.visited_regions:
			continue
		var a: Vector2 = GameData.region_anchor(GameData.REGIONS[rid])
		var d: float = a.distance_to(run.player.position)
		if d < best_d:
			best_d = d
			best = a
	if best == run.world.gate and plan == "explore" and run.elapsed < 720.0:
		# Everything charted: patrol the drift, waiting for echoes.
		return run.world.gate * 0.4 + Vector2(cos(run.elapsed * 0.05) * run.world.half_size.x * 0.5, sin(run.elapsed * 0.05) * run.world.half_size.y * 0.5)
	return best
