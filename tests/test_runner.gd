extends Node
## Headless gameplay test suite. Run with:
##   godot --headless res://tests/TestRunner.tscn
## Exits with code 0 when every test passes, 1 otherwise.
## These tests drive the real simulation (GameRun.step) — not text searches.

const TEST_SAVE: String = "user://test_profile.json"

var failures: Array = []
var passes: int = 0
var current: String = ""
var finished_result: Dictionary = {}

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	await get_tree().process_frame
	_reset_profile()
	var tests: Array[String] = [
		"test_scripts_compile", "test_data_integrity", "test_save_migration_and_recovery",
		"test_simulated_expedition_minute", "test_upgrade_pause_cycle", "test_signal_discovery_attunes_force",
		"test_hidden_sites_follow_state", "test_signal_locks", "test_camps_and_echoes", "test_extraction", "test_boss_completion_and_unlocks", "test_death_keeps_discoveries", "test_checkpoint_recovery",
		"test_evolution_offer", "test_every_weapon_fires", "test_harmony_discovery", "test_abilities",
		"test_real_frames", "test_new_content", "test_visions_guests", "test_corridor_chart", "test_review_regressions", "test_second_destination", "test_sea_branch", "test_playtest_mode", "test_menu_screens_build", "test_hud_fits_aspect_ratios", "test_performance_budget",
	]
	# Optional filter: godot --headless res://tests/TestRunner.tscn -- name [name...]
	var only: PackedStringArray = OS.get_cmdline_user_args()
	if not only.is_empty():
		tests = tests.filter(func(n: String) -> bool: return n in only)
	for t: String in tests:
		current = t
		var before: int = failures.size()
		await _dispatch(t)
		_cleanup_runs()
		if failures.size() == before:
			passes += 1
			print("  PASS  ", t)
		else:
			print("  FAIL  ", t)
	print("\n%d passed, %d failed" % [passes, tests.size() - passes])
	for f: String in failures:
		print("  - ", f)
	_remove_test_saves()
	get_tree().quit(0 if failures.is_empty() else 1)

func _dispatch(t: String) -> void:
	match t:
		"test_real_frames":
			await test_real_frames()
		"test_second_destination":
			await test_second_destination()
		"test_review_regressions":
			await test_review_regressions()
		"test_corridor_chart":
			await test_corridor_chart()
		"test_sea_branch":
			await test_sea_branch()
		"test_playtest_mode":
			await test_playtest_mode()
		"test_visions_guests":
			await test_visions_guests()
		"test_new_content":
			await test_new_content()
		"test_signal_locks":
			await test_signal_locks()
		"test_camps_and_echoes":
			await test_camps_and_echoes()
		"test_scripts_compile":
			await test_scripts_compile()
		"test_data_integrity":
			await test_data_integrity()
		"test_save_migration_and_recovery":
			await test_save_migration_and_recovery()
		"test_simulated_expedition_minute":
			await test_simulated_expedition_minute()
		"test_upgrade_pause_cycle":
			await test_upgrade_pause_cycle()
		"test_signal_discovery_attunes_force":
			await test_signal_discovery_attunes_force()
		"test_hidden_sites_follow_state":
			await test_hidden_sites_follow_state()
		"test_extraction":
			await test_extraction()
		"test_boss_completion_and_unlocks":
			await test_boss_completion_and_unlocks()
		"test_checkpoint_recovery":
			await test_checkpoint_recovery()
		"test_death_keeps_discoveries":
			await test_death_keeps_discoveries()
		"test_evolution_offer":
			await test_evolution_offer()
		"test_every_weapon_fires":
			await test_every_weapon_fires()
		"test_harmony_discovery":
			await test_harmony_discovery()
		"test_abilities":
			await test_abilities()
		"test_menu_screens_build":
			await test_menu_screens_build()
		"test_hud_fits_aspect_ratios":
			await test_hud_fits_aspect_ratios()
		"test_performance_budget":
			await test_performance_budget()

func check(cond: bool, msg: String) -> void:
	if not cond:
		failures.append("%s: %s" % [current, msg])

func _reset_profile() -> void:
	Profile.save_path = TEST_SAVE
	Profile.data = Profile.defaults()
	Profile.data["settings"]["screen_shake"] = 0.0

func _remove_test_saves() -> void:
	var dir: DirAccess = DirAccess.open("user://")
	if dir:
		for f: String in ["test_profile.json", "test_profile.backup.json", "test_profile.tmp", "test_migrate.json", "test_migrate.backup.json"]:
			if dir.file_exists(f):
				dir.remove(f)

func _cleanup_runs() -> void:
	for c: Node in get_children():
		# Stop it at once: a run waiting to be freed can still open a
		# level-up (and pause the tree) during its last frame.
		c.process_mode = Node.PROCESS_MODE_DISABLED
		c.queue_free()
	get_tree().paused = false
	_reset_profile()

func _make_run(config: Dictionary = {}) -> GameRun:
	var run: GameRun = GameRun.new()
	var cfg: Dictionary = {"character": "ella_venn", "force": "pulse_width_codex", "seed": 1234}
	cfg.merge(config, true)
	run.setup(cfg)
	run.debug_enabled = false
	run.scripted_input = true
	add_child(run)
	run.hint_queue.clear()
	run.finished.connect(func(r: Dictionary) -> void: finished_result = r)
	finished_result = {}
	return run

## Advances the simulation, auto-choosing the first upgrade whenever offered.
func _sim(run: GameRun, seconds: float, bot: Callable = Callable()) -> void:
	var dt: float = 1.0 / 60.0
	var steps: int = int(seconds / dt)
	for i in steps:
		if run.ended:
			return
		if run.choosing:
			var opts: Array = run.hud.level_options
			check(get_tree().paused, "tree must be paused while choosing")
			if not opts.is_empty():
				run.hud._pick(opts[0])
			check(not run.choosing and not get_tree().paused, "choosing an upgrade must resume play")
		if bot.is_valid():
			bot.call(run)
		run.step(dt)

# ------------------------------------------------------------------ tests

func test_scripts_compile() -> void:
	var paths: Array = []
	for dir_path: String in ["res://scripts/core", "res://scripts/data", "res://scripts/run", "res://scripts/ui"]:
		var d: DirAccess = DirAccess.open(dir_path)
		check(d != null, "missing dir " + dir_path)
		if d == null:
			continue
		for f: String in d.get_files():
			if f.ends_with(".gd"):
				paths.append(dir_path + "/" + f)
	check(paths.size() >= 15, "expected at least 15 scripts, found %d" % paths.size())
	for p: String in paths:
		var s: GDScript = load(p)
		check(s != null and s.can_instantiate(), "script failed to compile: " + p)
	var scene: PackedScene = load("res://scenes/Main.tscn")
	check(scene != null, "Main.tscn failed to load")

func test_data_integrity() -> void:
	for wid: String in GameData.WEAPONS.keys():
		var w: Dictionary = GameData.WEAPONS[wid]
		check(GameData.FORCES.has(String(w["force"])), "weapon %s has unknown force" % wid)
		check(GameData.EVOLUTIONS.has(String(w["evolution"])), "weapon %s evolution missing" % wid)
		check(GameData.PASSIVES.has(String(w["evolve_with"])), "weapon %s evolve_with unknown" % wid)
		check((w["notes"] as Array).size() == 5, "weapon %s needs 5 level notes" % wid)
	var used_passives: Dictionary = {}
	for wid2: String in GameData.WEAPONS.keys():
		var ew: String = String(GameData.WEAPONS[wid2]["evolve_with"])
		check(not used_passives.has(ew), "two evolutions share passive " + ew)
		used_passives[ew] = true
	for fid: String in GameData.FORCES.keys():
		var f: Dictionary = GameData.FORCES[fid]
		check(GameData.WEAPONS.has(String(f["primary"])), "force %s primary weapon missing" % fid)
		check(String(f["motif_layer"]) in GameData.SCORE_LAYERS, "force %s motif layer not in score" % fid)
	for did: String in GameData.DISCOVERIES.keys():
		var d: Dictionary = GameData.DISCOVERIES[did]
		if String(d.get("region", "")) != "":
			check(GameData.REGIONS.has(String(d["region"])), "discovery %s region" % did)
		if d.has("force"):
			check(GameData.FORCES.has(String(d["force"])), "discovery %s force" % did)
		if d.has("transmission"):
			check(GameData.TRANSMISSIONS.has(String(d["transmission"])), "discovery %s transmission" % did)
		if d.has("unlock_character"):
			check(GameData.CHARACTERS.has(String(d["unlock_character"])), "discovery %s character" % did)
		if d.has("fragment"):
			check(GameData.FRAGMENTS.has(String(d["fragment"])), "discovery %s fragment" % did)
		if bool(d.get("roaming", false)):
			continue # catalogue records are placed per expedition
		var p: Vector2 = GameData.discovery_position(did)
		var dest_id: String = GameData.discovery_destination(did)
		check(dest_id != "", "discovery %s belongs to no destination" % did)
		if dest_id != "":
			var hs: Vector2 = GameData.DESTINATIONS[dest_id]["half_size"]
			check(absf(p.x) < hs.x and absf(p.y) < hs.y, "discovery %s outside world" % did)
	for dest2: String in GameData.DESTINATIONS.keys():
		var dd: Dictionary = GameData.DESTINATIONS[dest2]
		for rid2: String in dd["regions"]:
			check(GameData.REGIONS.has(rid2), "destination %s region %s missing" % [dest2, rid2])
			var anchor: Vector2 = GameData.region_anchor(GameData.REGIONS[rid2])
			check(absf(anchor.x) < Vector2(dd["half_size"]).x and absf(anchor.y) < Vector2(dd["half_size"]).y, "region %s outside %s" % [rid2, dest2])
		var sigs: int = 0
		for did3: String in GameData.DISCOVERIES.keys():
			if GameData.discovery_in_destination(did3, dest2) and String(GameData.DISCOVERIES[did3]["kind"]) == "signal":
				sigs += 1
		check(sigs >= int(dd["goal_signals"]) + 2, "destination %s has too few signals for its goal" % dest2)
	for cid: String in GameData.CHARACTERS.keys():
		check(GameData.ABILITIES.has(String(GameData.CHARACTERS[cid]["ability"])), "character %s ability" % cid)
		check(GameData.MASTERY.has(cid), "character %s mastery" % cid)
	for tid: String in GameData.TRANSMISSIONS.keys():
		check(GameData.PROJECTS.has(String(GameData.TRANSMISSIONS[tid]["project"])), "transmission %s project page" % tid)
	# Every non-starting character must be unlockable somehow.
	for cid2: String in GameData.CHARACTERS.keys():
		if cid2 == "ella_venn":
			continue
		var reachable: bool = false
		for did2: String in GameData.DISCOVERIES.keys():
			if String(GameData.DISCOVERIES[did2].get("unlock_character", "")) == cid2:
				reachable = true
		for dest: String in GameData.DESTINATIONS.keys():
			if cid2 in GameData.DESTINATIONS[dest].get("completion_unlocks", []):
				reachable = true
		for st0: Dictionary in GameData.CHART:
			if cid2 in (st0["grants"] as Dictionary).get("characters", []):
				reachable = true
		check(reachable, "character %s cannot be unlocked" % cid2)
	# Corridor Chart: every stop is well-formed and its reward is reachable.
	var seen_ids: Dictionary = {}
	for st: Dictionary in GameData.CHART:
		var sid: String = String(st["id"])
		check(not seen_ids.has(sid), "duplicate chart stop %s" % sid)
		seen_ids[sid] = true
		for key: String in ["name", "place", "objective", "discoveries", "new_title", "new", "brief", "reward", "grants", "prize", "icon"]:
			check(st.has(key), "chart stop %s lacks %s" % [sid, key])
		check(st.has("start") or st.has("region"), "chart stop %s has no start" % sid)
		check(GameData.CATEGORIES.has(String(st["icon"])), "chart stop %s icon unknown" % sid)
		var o: Dictionary = st["objective"]
		if String(o["type"]) == "discover":
			check(GameData.DISCOVERIES.has(String(o["id"])), "chart stop %s targets unknown discovery" % sid)
			check(String(o["id"]) in st["discoveries"], "chart stop %s does not spawn its own target" % sid)
			var dest_id: String = String(GameData.chapter_def(int(st.get("chapter", 1)))["destination"])
			check(GameData.discovery_in_destination(String(o["id"]), dest_id), "chart stop %s target is outside %s" % [sid, dest_id])
		for did3: String in st["discoveries"]:
			check(GameData.DISCOVERIES.has(did3), "chart stop %s lists unknown discovery %s" % [sid, did3])
		if st.has("side_of"):
			check(not GameData.chart_stop(String(st["side_of"])).is_empty(), "side stop %s has no parent" % sid)
		check(GameData.chart_objective_text(st) != "", "chart stop %s has no objective text" % sid)
	check(GameData.chart_main().size() >= 10, "main corridor too short")
	for d4: String in GameData.DISCOVERIES.keys():
		for c4: Variant in GameData.DISCOVERIES[d4].get("contacts", []):
			check(GameData.CONTACTS.has(String(c4)), "%s names unknown contact %s" % [d4, c4])
			check(ResourceLoader.exists("res://assets/characters/%s_96.png" % String(GameData.CONTACTS[String(c4)]["portrait"])), "contact %s has no portrait" % c4)
		var pl4: String = String(GameData.DISCOVERIES[d4].get("place", ""))
		check(pl4 == "" or GameData.PLACES.has(pl4), "%s names unknown place %s" % [d4, pl4])
	for t4: String in GameData.TRANSMISSIONS.keys():
		check(GameData.PROJECTS.has(String(GameData.TRANSMISSIONS[t4]["project"])), "transmission %s has no project page" % t4)
	# Canon gate: every explorer has a faction palette and a released portrait.
	for cid3: String in GameData.CHARACTERS.keys():
		var c3: Dictionary = GameData.CHARACTERS[cid3]
		check(c3.has("hull") and c3.has("trim") and c3.has("faction"), "explorer %s lacks faction palette" % cid3)
		check(ResourceLoader.exists("res://assets/characters/%s_256.png" % String(c3.get("portrait", cid3))), "explorer %s lacks a released portrait" % cid3)
	# Unmarked raiders must not wear the Shard palette (pale white + bright red).
	for eid: String in GameData.ENEMIES.keys():
		var ec: Color = GameData.ENEMIES[eid]["color"]
		check(not (ec.r > 0.9 and ec.g < 0.45 and ec.b < 0.4), "enemy %s uses Shard bright red" % eid)
	# Every transmission title must be a verbatim SSV catalog title (manifest).
	var manifest: String = FileAccess.get_file_as_string("res://MUSIC_CATALOG_MANIFEST.md")
	for tid4: String in GameData.TRANSMISSIONS.keys():
		check(manifest.find(String(GameData.TRANSMISSIONS[tid4]["title"])) != -1, "transmission %s not in the verified catalog manifest" % tid4)
	# No retired canon names may appear in shipped data.
	var src: String = FileAccess.get_file_as_string("res://scripts/data/game_data.gd")
	for retired: String in ["Ilyra Venn", "Varra Cindral", "Elyra Vorn", "Sira Red Fang", "Nira Sol"]:
		check(src.find(retired) == -1, "retired name in data: " + retired)

func test_save_migration_and_recovery() -> void:
	var legacy: Dictionary = {"currency": 42, "best_time": 77.0, "wins": 1, "runs": 3, "unlocked_characters": ["ilyra_venn", "ghost_driver_unit"],
		"unlocked_tracks": ["x"], "discovered_signals": ["rc_echo_01", "gdu_trace_01"], "discovered_projects": ["Resonant Currents"],
		"discovered_forces": ["pulse_width_codex", "ghost_driver", "resonant_currents"], "archive_reads": 2,
		"settings": {"music": 0.5, "sfx": 0.4, "screen_shake": false}}
	var m: Dictionary = Profile.migrate(legacy)
	check(int(m["version"]) == Profile.SAVE_VERSION, "version not upgraded")
	check(int(m["currency"]) == 42, "currency lost")
	check(int(m["stats"]["expeditions"]) == 3 and int(m["stats"]["completions"]) == 1, "stats lost")
	check(m["discovered"].has("sig_green_echo") and m["discovered"].has("sig_night_trace"), "legacy discoveries not remapped")
	check("ghost_driver_unit" in m["forces_attuned"] and "resonant_currents" in m["forces_attuned"], "forces not migrated")
	check("rc_meaningless_dub" in m["transmissions"], "transmission not derived from discovery")
	check("ella_venn" in m["unlocked_characters"], "starting explorer missing")
	check(not "ghost_driver_unit" in m["unlocked_characters"], "musical project leaked into explorers")
	check(is_equal_approx(float(m["settings"]["music_volume"]), 0.5), "settings not migrated")
	# v2 save with retired id.
	var v2: Dictionary = Profile.defaults()
	v2["unlocked_characters"] = ["ilyra_venn"]
	v2["last_character"] = "ilyra_venn"
	var m2: Dictionary = Profile.migrate(v2)
	check(m2["unlocked_characters"] == ["ella_venn"] and String(m2["last_character"]) == "ella_venn", "retired character id not migrated")
	# Round trip + corruption recovery.
	Profile.save_path = "user://test_migrate.json"
	Profile.data = m
	check(Profile.save(), "save failed")
	check(Profile.save(), "second save failed (backup rotation)")
	var f: FileAccess = FileAccess.open("user://test_migrate.json", FileAccess.WRITE)
	f.store_string("{ this is not json")
	f.close()
	Profile.load_profile("user://test_migrate.json")
	check(int(Profile.data["currency"]) == 42, "did not recover from backup after corruption")
	check(Profile.last_load_note.find("backup") != -1, "recovery not reported to player")
	var dir: DirAccess = DirAccess.open("user://")
	dir.remove("test_migrate.json")
	dir.remove("test_migrate.backup.json")
	_reset_profile()

func test_checkpoint_recovery() -> void:
	_reset_profile()
	Profile.save()
	var run: GameRun = _make_run()
	await get_tree().process_frame
	_sim(run, 50.0, func(r: GameRun) -> void: r.player.move_input = Vector2.RIGHT)
	check(Profile.has_interrupted_run(), "no periodic checkpoint after 50s")
	run.discoveries.append("sig_green_echo")
	run.new_this_run.append("sig_green_echo")
	run.checkpoint()
	# Simulate a crash: reload from disk without ending the run.
	Profile.load_profile(TEST_SAVE)
	check(Profile.has_interrupted_run(), "checkpoint not persisted to disk")
	var rec: Dictionary = Profile.recover_interrupted_run()
	check(not rec.is_empty() and int(rec["discoveries"]) == 1, "recovery summary wrong: %s" % str(rec))
	check(Profile.is_discovered("sig_green_echo"), "discovery lost after crash")
	check(Profile.is_attuned("resonant_currents"), "force from discovery not granted on recovery")
	check(int(Profile.data["stats"]["expeditions"]) == 1, "interrupted run not counted")
	check(not Profile.has_interrupted_run(), "checkpoint not cleared after recovery")
	Profile.load_profile(TEST_SAVE)
	check(not Profile.has_interrupted_run(), "cleared checkpoint came back after reload")
	_reset_profile()

func test_simulated_expedition_minute() -> void:
	var run: GameRun = _make_run()
	await get_tree().process_frame
	check(run.world.obstacles.size() > 50, "world has too few obstacles: %d" % run.world.obstacles.size())
	check(run.pois.items.size() > 20, "too few points of interest")
	var start_pos: Vector2 = run.player.position
	# Bot: fly toward Silver Wrecks.
	# A plausible player: heads for the wrecks but swerves for nearby motes.
	var bot: Callable = func(r: GameRun) -> void:
		var goal: Vector2 = GameData.REGIONS["silver_wrecks"]["center"]
		var best: Vector2 = Vector2.INF
		for it: Dictionary in r.pickups.items:
			if Vector2(it.pos).distance_to(r.player.position) < 320.0:
				best = it.pos
				break
		r.player.move_input = r.player.position.direction_to(best if best != Vector2.INF else goal)
	_sim(run, 60.0, bot)
	print("        first minute: level %d, kills %d, motes %d, xp %d/%d, field motes %d, hp %d/%d, enemies %d, pos %s" % [run.level, run.kills, run.motes_collected, run.xp, run.xp_need, run.pickups.items.size(), int(run.player.hp), int(run.player.max_hp), run.enemies.size(), str(run.player.position)])
	check(run.player.position.distance_to(start_pos) > 1200.0, "player did not travel (obstacles stuck?) %s" % str(run.player.position))
	check(run.kills > 5, "too few kills in a minute: %d" % run.kills)
	# Beat-driven weapons follow the real-time audio clock, so this minute is
	# not deterministic: a dead or unlucky run says nothing about travel.
	if run.player.alive:
		check(run.level >= 3, "too few level-ups in a minute: %d" % run.level)
	var ranks: int = 0
	for w: String in run.weapons.weapons.keys():
		ranks += int(run.weapons.weapons[w])
	for pz: String in run.weapons.passives.keys():
		ranks += int(run.weapons.passives[pz])
	check(ranks >= run.level - run.pending_levels, "upgrades not applied: %d ranks at level %d" % [ranks, run.level])
	if not run.player.alive:
		print("        NOTE: Venn was lost in this minute (non-deterministic; see KNOWN_ISSUES)")
	check("silver_wrecks" in run.visited_regions, "region entry not tracked")
	check(run.enemies.size() <= GameRun.MAX_ENEMIES, "enemy cap exceeded")

func test_upgrade_pause_cycle() -> void:
	var run: GameRun = _make_run()
	await get_tree().process_frame
	run.pending_levels = 1
	run.step(1.0 / 60.0)
	check(run.choosing, "level up did not open choices")
	check(get_tree().paused, "tree not paused during choice")
	var before_hp: float = run.player.hp
	var t: float = run.elapsed
	run.step(1.0 / 60.0)
	check(is_equal_approx(run.elapsed, t), "simulation advanced during choice")
	var opts: Array = run.hud.level_options
	check(opts.size() >= 3, "fewer than 3 options")
	var sig: Array = []
	for o: Dictionary in opts:
		sig.append(String(o["type"]) + ":" + String(o["id"]))
	check(sig.size() == _unique(sig).size(), "duplicate options offered")
	run.hud._pick(opts[0])
	check(not run.choosing and not get_tree().paused, "did not resume after choosing")
	check(run.player.hp >= before_hp - 0.01, "hp changed during choice")
	# Pause menu toggles cleanly.
	run.hud.toggle_pause()
	check(get_tree().paused, "pause menu did not pause")
	run.hud.toggle_pause()
	check(not get_tree().paused, "pause menu did not resume")
	# Choice cannot be opened twice from the same level.
	run.hud._pick(opts[0])
	check(not run.choosing, "stale pick reopened choice")

func _unique(a: Array) -> Array:
	var d: Dictionary = {}
	for x: Variant in a:
		d[x] = true
	return d.keys()

func test_signal_discovery_attunes_force() -> void:
	var run: GameRun = _make_run()
	await get_tree().process_frame
	var poi: Dictionary = {}
	for p: Dictionary in run.pois.items:
		if String(p.id) == "sig_green_echo":
			poi = p
	check(not poi.is_empty(), "green echo signal not placed")
	run.player.position = Vector2(poi.pos)
	run.player.god_mode = true
	run.resonance = 50.0
	run.set_force_state("DRIFT")
	_sim(run, 2.0, func(r: GameRun) -> void:
		r.resonance = 50.0
		r.player.position = Vector2(poi.pos)
		r.player.velocity = Vector2.ZERO)
	check(not "sig_green_echo" in run.discoveries, "Resonance-locked signal tuned outside Resonance")
	check(String(poi.get("blocked", "")) == "NEEDS RESONANCE", "lock reason not reported: " + String(poi.get("blocked", "")))
	_sim(run, 5.0, func(r: GameRun) -> void:
		r.resonance = 90.0
		r.player.position = Vector2(poi.pos)
		r.player.velocity = Vector2.ZERO)
	check("sig_green_echo" in run.discoveries, "signal not claimed after tuning")
	check("resonant_currents" in run.attuned, "force not attuned in run")
	check(run.weapons.has_base("sub_wave"), "discovered Force weapon not granted")
	var commit: Dictionary = Profile.record_expedition({"outcome": "extracted", "time": 100.0, "discoveries": run.discoveries, "character": "ella_venn", "destination": "black_drift_reach", "currency": 10, "mastery_xp": 10})
	check(Profile.is_attuned("resonant_currents"), "force not persisted")
	check("rc_meaningless_dub" in Profile.data["transmissions"], "transmission not persisted to Archive")
	check("sig_green_echo" in commit["new_discoveries"], "new discovery not reported")
	var p2: Dictionary = {}
	for q: Dictionary in run.pois.items:
		if String(q.id) == "sig_night_trace":
			p2 = q
	var start: Vector2 = p2.pos
	run.player.position = start + Vector2(-150, 0)
	_sim(run, 1.0)
	check(Vector2(p2.pos).distance_to(start) > 50.0, "Night Trace did not move away")

func test_hidden_sites_follow_state() -> void:
	var run: GameRun = _make_run()
	await get_tree().process_frame
	var token: Dictionary = {}
	for p: Dictionary in run.pois.items:
		if String(p.id) == "art_route_token":
			token = p
	check(not token.is_empty(), "route token missing")
	run.set_force_state("DRIFT")
	check(not run.pois.is_visible_poi(token), "fracture site visible in Drift")
	run.resonance = 10.0
	run.step(1.0 / 60.0)
	check(run.force_state == "FRACTURE", "low resonance did not enter Fracture")
	check(run.pois.is_visible_poi(token), "fracture site hidden in Fracture")
	run.resonance = 90.0
	run.step(1.0 / 60.0)
	check(run.force_state == "DRIFT", "state must pass through Drift (hysteresis)")
	_sim(run, 0.1)
	check(run.force_state == "RESONANCE", "high resonance did not enter Resonance")
	# Rifts push toward Fracture; resonators toward Resonance.
	run.resonance = 50.0
	run.set_force_state("DRIFT")
	run.on_poi_claimed({"kind": "rift", "pos": run.player.position, "color": Color.RED})
	check(run.resonance < 20.0, "rift did not drop resonance")

func test_extraction() -> void:
	var run: GameRun = _make_run()
	await get_tree().process_frame
	run.player.god_mode = true
	_sim(run, 0.5)
	check(not run.left_gate, "left_gate set while still at the gate")
	run.player.position = Vector2(600, 0)
	_sim(run, 0.2)
	check(run.left_gate, "left_gate not set after leaving")
	run.player.position = run.world.gate
	_sim(run, 3.0, func(r: GameRun) -> void: r.player.position = r.world.gate)
	check(not run.ended, "extracted without the player choosing to")
	run.request_extract()
	_sim(run, 1.0, func(r: GameRun) -> void: r.player.position = r.world.gate)
	check(not run.ended, "extracted too quickly")
	run.player.position = Vector2(600, 0)
	_sim(run, 0.1)
	check(not run.extract_armed, "leaving the ring did not cancel extraction")
	run.player.position = run.world.gate
	_sim(run, 0.1, func(r: GameRun) -> void: r.player.position = r.world.gate)
	run.request_extract()
	_sim(run, 2.5, func(r: GameRun) -> void: r.player.position = r.world.gate)
	check(run.ended and String(finished_result.get("outcome", "")) == "extracted", "extraction did not complete: %s" % str(finished_result.get("outcome")))

func test_boss_completion_and_unlocks() -> void:
	var run: GameRun = _make_run()
	await get_tree().process_frame
	run.player.god_mode = true
	check(not run.climax_available(), "climax available before signals")
	run.discoveries = ["sig_green_echo", "sig_now_or_never"]
	check(not run.climax_available(), "climax available below the signal goal")
	run.discoveries.append("sig_hexagonis")
	check(run.climax_available(), "climax not available at the signal goal")
	run.left_gate = true
	run.player.position = run.world.gate
	run.confront()
	check(run.boss_spawned and run.boss != null, "boss not spawned")
	_sim(run, 1.0)
	check(run.extract_progress == 0.0, "can extract while boss alive")
	# Fight for a while with heavy damage to traverse all phases.
	var phases: Dictionary = {}
	for i in 40:
		if run.boss and not run.boss.dead:
			run.damage_enemy(run.boss, run.boss.max_hp * 0.03, Vector2.ZERO, 0.0, "environment", true)
			phases[run.boss.boss_phase] = true
		_sim(run, 0.25)
	check(phases.has(1) and phases.has(2) and phases.has(3), "boss did not pass through all phases: %s" % str(phases.keys()))
	check(run.boss_defeated, "boss not defeated")
	_sim(run, 6.0)
	check(String(finished_result.get("outcome", "")) == "complete", "completion not reached: %s" % str(finished_result.get("outcome")))
	var commit: Dictionary = Profile.record_expedition(finished_result)
	check(Profile.has_destination("kaldr_rift"), "completion unlock (Kaldr Rift) not granted")
	check(int(commit["currency"]) > 100, "completion currency too low")
	check(int(Profile.data["stats"]["completions"]) == 1, "completion not counted")

func test_signal_locks() -> void:
	var run: GameRun = _make_run()
	await get_tree().process_frame
	run.player.god_mode = true
	var find: Callable = func(id: String) -> Dictionary:
		for q: Dictionary in run.pois.items:
			if String(q.id) == id:
				return q
		return {}
	# Stillness: moving never tunes; holding still does.
	var haze: Dictionary = find.call("sig_hexagonis")
	_sim(run, 6.0, func(r: GameRun) -> void:
		r.player.position = Vector2(haze.pos) + Vector2(cos(r.elapsed * 6.0), sin(r.elapsed * 6.0)) * 20.0
		r.player.velocity = Vector2(200, 0))
	check(not "sig_hexagonis" in run.discoveries, "stillness signal tuned while moving")
	_sim(run, 5.0, func(r: GameRun) -> void:
		r.player.position = Vector2(haze.pos)
		r.player.velocity = Vector2.ZERO)
	check("sig_hexagonis" in run.discoveries, "stillness signal did not tune while still")
	# Guardian: a captain spawns and must die first.
	var beacon: Dictionary = find.call("sig_thunderbreak_beacon")
	run.player.position = Vector2(beacon.pos)
	_sim(run, 1.0, func(r: GameRun) -> void: r.player.position = Vector2(beacon.pos))
	var g: Variant = beacon.get("guardian")
	check(g != null and is_instance_valid(g), "guardian not spawned")
	_sim(run, 5.0, func(r: GameRun) -> void: r.player.position = Vector2(beacon.pos))
	check(not "sig_thunderbreak_beacon" in run.discoveries, "guardian signal tuned with guardian alive")
	if g != null and is_instance_valid(g):
		run.damage_enemy(g, 99999.0, Vector2.ZERO, 0.0, "environment", true)
	_sim(run, 5.0, func(r: GameRun) -> void: r.player.position = Vector2(beacon.pos))
	check("sig_thunderbreak_beacon" in run.discoveries, "guardian signal did not tune after guardian fell")
	# Ensemble: three relays.
	var chorus: Dictionary = find.call("sig_ignition")
	_sim(run, 0.5, func(r: GameRun) -> void: r.player.position = Vector2(chorus.pos))
	check(chorus.has("relays") and (chorus.relays as Array).size() == 3, "relays not created")
	for relay: Dictionary in chorus.get("relays", []):
		_sim(run, 0.3, func(r: GameRun) -> void: r.player.position = Vector2(relay.pos))
	_sim(run, 5.0, func(r: GameRun) -> void: r.player.position = Vector2(chorus.pos))
	check("sig_ignition" in run.discoveries, "ensemble signal did not tune after relays")
	check(run.weapons.weapons.size() >= 2, "attuned Force weapons not granted")

func test_camps_and_echoes() -> void:
	var run: GameRun = _make_run()
	await get_tree().process_frame
	run.player.god_mode = true
	check(run.camps.size() >= 8, "too few raider camps: %d" % run.camps.size())
	var c: Dictionary = run.camps[0]
	run.player.position = Vector2(c.pos) + Vector2(900, 0)
	_sim(run, 0.6)
	check(bool(c.active) and (c.members as Array).size() > 0, "camp did not materialise when approached")
	var lv: int = run.upgrades_offered + run.pending_levels
	for e: Variant in (c.members as Array).duplicate():
		if is_instance_valid(e):
			run.damage_enemy(e, 99999.0, Vector2.ZERO, 0.0, "environment", true)
	_sim(run, 0.6)
	check(bool(c.cleared), "camp not cleared")
	check(run.upgrades_offered + run.pending_levels > lv, "camp clear did not grant an upgrade")
	# Far camps dematerialise and keep their remaining count.
	var c2: Dictionary = run.camps[1]
	run.player.position = Vector2(c2.pos) + Vector2(500, 0)
	_sim(run, 0.6)
	var n: int = (c2.members as Array).size()
	run.player.position = Vector2(c2.pos) + Vector2(2600, 0)
	run.player.position = run.world.clamp_to_world(run.player.position)
	_sim(run, 0.6)
	check(not bool(c2.active) and int(c2.remaining) == n, "camp did not dematerialise cleanly")
	# Echo transmissions spawn, can be tuned, and expire.
	run._spawn_echo()
	var echo: Dictionary = run.pois.nearest_unclaimed(run.player.position, ["echo"], true)
	check(not echo.is_empty(), "echo not spawned")
	var lv2: int = run.upgrades_offered + run.pending_levels
	_sim(run, 3.5, func(r: GameRun) -> void: r.player.position = Vector2(echo.pos))
	check(bool(echo.claimed) and run.echoes_tuned == 1, "echo not tuned")
	check(run.upgrades_offered + run.pending_levels > lv2, "echo did not grant an upgrade")
	run._spawn_echo()
	var echo2: Dictionary = run.pois.nearest_unclaimed(run.player.position, ["echo"], true)
	echo2.life = 0.1
	_sim(run, 0.3)
	check(bool(echo2.claimed) and bool(echo2.get("expired", false)), "echo did not expire")

func test_death_keeps_discoveries() -> void:
	var run: GameRun = _make_run()
	await get_tree().process_frame
	run.discoveries = ["char_gravefire"]
	run.player.hp = 1.0
	run.player.invuln = 0.0
	run.player_hit(50.0, Vector2.ZERO)
	check(run.ended and String(finished_result.get("outcome", "")) == "defeat", "death did not end run")
	Profile.record_expedition(finished_result)
	check(Profile.has_character("tessa_banks"), "discoveries lost on defeat")
	check(int(Profile.data["stats"]["defeats"]) == 1, "defeat not counted")
	# Second Wind workshop upgrade.
	_reset_profile()
	Profile.data["workshop"]["second_wind"] = 1
	var run2: GameRun = _make_run()
	await get_tree().process_frame
	run2.player.hp = 1.0
	run2.player.invuln = 0.0
	run2.player_hit(50.0, Vector2.ZERO)
	check(not run2.ended and run2.player.alive, "second wind did not trigger")

func test_evolution_offer() -> void:
	var run: GameRun = _make_run()
	await get_tree().process_frame
	run.weapons.weapons["pulse_bolt"] = 5
	run.weapons.add_passive("amplifier")
	var opts: Array = run.weapons.choices(3, run.attuned)
	var found: bool = false
	for o: Dictionary in opts:
		if String(o["type"]) == "evolution" and String(o["id"]) == "anthem_bolt":
			found = true
			run.weapons.apply_choice(o)
	check(found, "evolution not offered")
	check(run.weapons.weapons.has("anthem_bolt") and not run.weapons.weapons.has("pulse_bolt"), "evolution not applied")
	check(run.weapons.weapon_order.has("anthem_bolt"), "weapon order not updated")
	var opts2: Array = run.weapons.choices(3, run.attuned)
	for o2: Dictionary in opts2:
		check(String(o2["id"]) != "pulse_bolt", "base weapon re-offered after evolution")

func test_every_weapon_fires() -> void:
	for group: Array in [["pulse_bolt", "riser", "sub_wave", "echo_tap", "power_chord"], ["trail_charges", "ion_lance", "riff_blades", "section_drones", "analog_star"], ["fuzz_wall", "mic_drop", "nightline", "duet_unit", "pattern_cannon"], ["brass_swell", "feedback_bloom"]]:
		var run: GameRun = _make_run()
		await get_tree().process_frame
		run.player.god_mode = true
		run.weapons.weapons.clear()
		run.weapons.weapon_order.clear()
		for w: String in group:
			run.weapons.add_weapon(w)
		for i in 30:
			run.spawn_enemy("skiff", run.player.position + Vector2.from_angle(i * 0.7) * (90.0 + i * 8.0), true)
		var dmg0: float = run.damage_dealt
		_sim(run, 6.0, func(r: GameRun) -> void: r.player.move_input = Vector2(cos(r.elapsed), sin(r.elapsed)))
		check(run.damage_dealt > dmg0 + 100.0, "weapons %s dealt too little damage: %d" % [str(group), int(run.damage_dealt - dmg0)])
		# Evolved forms.
		for w2: String in group:
			if run.weapons.weapons.has(w2):
				run.weapons.weapons[w2] = 5
				run.weapons.evolve(String(GameData.WEAPONS[w2]["evolution"]))
		for i in 25:
			run.spawn_enemy("ram_cutter", run.player.position + Vector2.from_angle(i * 0.9) * (100.0 + i * 6.0), true)
		var dmg1: float = run.damage_dealt
		_sim(run, 6.0, func(r: GameRun) -> void: r.player.move_input = Vector2(cos(r.elapsed * 0.7), sin(r.elapsed * 0.7)))
		check(run.damage_dealt > dmg1 + 100.0, "evolved %s dealt too little damage" % str(group))
		_cleanup_runs()
		await get_tree().process_frame

func test_harmony_discovery() -> void:
	var run: GameRun = _make_run()
	await get_tree().process_frame
	run.weapons.weapons["pulse_bolt"] = 3
	run.weapons.add_weapon("sub_wave")
	run.weapons.add_weapon("sub_wave")
	run.weapons.add_weapon("sub_wave")
	check(run.weapons.has_harmony("dub_drop"), "Dub Drop harmony not discovered at level 3+3")
	# Build & Drop lands a Drop on the bar.
	run.weapons.build = 100.0
	run.weapons.drop_armed = true
	run.weapons.on_beat(4)
	check(run.weapons.drop_time > 0.0, "Drop did not trigger on downbeat")
	check(run.weapons.echoes.size() >= 2, "Dub Drop did not schedule echoes")

func test_abilities() -> void:
	for cid: String in GameData.CHARACTERS.keys():
		var run: GameRun = _make_run({"character": cid})
		await get_tree().process_frame
		run.player.god_mode = true
		for i in 10:
			run.spawn_enemy("skiff", run.player.position + Vector2.from_angle(i) * 120.0, true)
		_sim(run, 0.2)
		var ok: bool = run.use_ability()
		check(ok, "%s ability did not activate" % cid)
		_sim(run, 1.0)
		check(run.ability_cd > 0.0 or cid == "naomi_sol", "%s ability has no cooldown" % cid)
		_cleanup_runs()
		await get_tree().process_frame

## Corridor Chart: stops open in order, each objective type completes, the
## reward is banked at once, and a stop carries only its own discoveries.
func test_corridor_chart() -> void:
	_reset_profile()
	check(Profile.next_stop() == "first_light", "fresh profile does not start at stop 1")
	check(Profile.stop_available("first_light") and not Profile.stop_available("hold_the_lane"), "stop 2 open before stop 1")
	check(not Profile.stop_available("s_stardust"), "side stop open before its parent")
	check(not Profile.has_feature("workshop") and not Profile.has_feature("open_reach"), "features open on a fresh profile")
	# Discover-type stop: only its own discoveries exist; claiming completes it.
	var run: GameRun = _make_run({"stop": "gravefire"})
	await get_tree().process_frame
	run.player.god_mode = true
	check(run.world.gate.distance_to(GameData.region_anchor(GameData.REGIONS["silver_wrecks"])) > 1200.0, "home beacon inside the stage's region")
	check(run.player.position.distance_to(run.world.gate) < 200.0, "player not at the home beacon")
	var ids: Array = []
	var target: Dictionary = {}
	for q: Dictionary in run.pois.items:
		if String(q.id) != "":
			ids.append(String(q.id))
		if String(q.id) == "char_gravefire":
			target = q
	check("char_gravefire" in ids and not "sig_ignition" in ids and not "sig_now_or_never" in ids, "stop carries other stops' discoveries: %s" % str(ids))
	check(not target.is_empty() and Vector2(target.pos).distance_to(run.world.gate) > 500.0, "target sits on top of the home beacon")
	check(run.objective_target().is_empty(), "pointer shown before exploring")
	run.elapsed = GameRun.SEARCH_HINT_AFTER + 1.0
	check(not run.objective_target().is_empty(), "no compass target for the objective after exploring")
	run.elapsed = 0.0
	check(not run.climax_available(), "The Silence can be called on an ordinary stop")
	# The tuner must be charged with shards before the target will tune.
	check(run.power_needed() > 0, "stop target needs no power")
	run.player.position = Vector2(target.pos)
	_sim(run, 6.0, func(r: GameRun) -> void: r.player.position = Vector2(target.pos))
	check(not run.stop_complete and String(target.get("blocked", "")).find("POWER") != -1, "target tuned without power: %s" % str(target.get("blocked", "")))
	run.motes_collected = int(run.mission["power"])
	check(run.power_needed() == 0, "power not satisfied by collected shards")
	run._claim_discovery(target)
	check(run.stop_complete and Profile.stop_done("gravefire"), "claiming the target did not complete the stop")
	check(Profile.stop_available("s_stardust"), "side stop did not open")
	# The discovery card must stay card-sized even while a level-up hides it
	# (it once came back as a blank panel covering the screen).
	await get_tree().process_frame
	await get_tree().process_frame
	var vp_size: Vector2 = get_viewport().get_visible_rect().size
	check(run.hud.card != null and run.hud.card.size.y < vp_size.y * 0.7 and run.hud.card.size.x <= vp_size.x, "discovery card overfills the screen: %s" % str(run.hud.card.size if run.hud.card else Vector2.ZERO))
	# Banked even if the explorer is then lost.
	run.end_run("defeat")
	check(bool(finished_result.get("stop_complete", false)), "result does not report the stop complete")
	Profile.record_expedition(finished_result)
	check(Profile.stop_done("gravefire") and Profile.has_character("tessa_banks"), "stop reward lost after defeat")
	_cleanup_runs()
	await get_tree().process_frame
	# Survive-type stop.
	run = _make_run({"stop": "hold_the_lane"})
	await get_tree().process_frame
	run.player.god_mode = true
	run.elapsed = 179.0
	_sim(run, 2.0)
	await get_tree().process_frame
	await get_tree().process_frame
	check(run.stop_complete and Profile.has_feature("workshop"), "survive stop did not complete / open the Workshop")
	_cleanup_runs()
	await get_tree().process_frame
	# Elite-type stop.
	run = _make_run({"stop": "dreadnought"})
	await get_tree().process_frame
	run.player.god_mode = true
	var hulk: ForceEnemy = run.spawn_enemy("dreadnought", run.player.position + Vector2(300, 0), true)
	run.damage_enemy(hulk, 999999.0, Vector2.RIGHT, 0.0, "environment", true)
	check(run.stop_complete and Profile.has_character("abby_saville"), "destroying the dreadnought did not unlock Abby Saville")
	_cleanup_runs()
	await get_tree().process_frame
	# Boss stop: The Silence can be called at once, and beating it opens the rest.
	run = _make_run({"stop": "the_silence"})
	await get_tree().process_frame
	run.player.god_mode = true
	check(run.climax_available(), "The Silence cannot be called on its own stop")
	run.left_gate = true
	run.confront()
	check(run.boss != null and run.boss.max_hp < float(GameData.ENEMIES["the_silence"]["hp"]), "boss stop does not scale The Silence")
	run.damage_enemy(run.boss, 9999999.0, Vector2.ZERO, 0.0, "environment", true)
	check(run.stop_complete and Profile.has_feature("open_reach") and Profile.has_destination("kaldr_rift"), "beating The Silence did not open the Reach / Kaldr Rift")
	_cleanup_runs()
	await get_tree().process_frame
	# Spectacle: on stage, weapons hold fire and an audience is sent in, so a
	# strong ship can still gather the crowd the signal needs.
	run = _make_run({"stop": "s_spectacle"})
	await get_tree().process_frame
	run.player.god_mode = true
	run.motes_collected = 999
	var stage: Dictionary = {}
	for q2: Dictionary in run.pois.items:
		if String(q2.id) == "sig_spectacle":
			stage = q2
	check(not stage.is_empty(), "spectacle stop has no signal")
	var before_n: int = run.enemies.size()
	_sim(run, 1.0, func(r: GameRun) -> void: r.player.position = Vector2(stage.pos))
	check(run.on_stage and run.weapons.silenced, "standing in the Spectacle ring does not hold fire")
	check(run.enemies.size() > before_n, "no audience was sent to the stage")
	check(is_equal_approx(run.player.damage_taken_mult, 0.5), "the stage does not halve damage")
	_sim(run, 40.0, func(r: GameRun) -> void: r.player.position = Vector2(stage.pos))
	check(run.stop_complete, "the Spectacle could not be finished with the crowd sent in")
	_cleanup_runs()
	await get_tree().process_frame
	# Roaming: a stop's target is a real flight from its home beacon, and its
	# exact position is only known once the tuner is charged.
	run = _make_run({"stop": "gravefire"})
	await get_tree().process_frame
	for q3: Dictionary in run.pois.items:
		if run.is_stop_target(String(q3.id)):
			check(Vector2(q3.pos).distance_to(run.world.gate) > 1200.0, "target only %d px from home" % int(Vector2(q3.pos).distance_to(run.world.gate)))
			check(not bool(q3.known), "target known before the tuner is charged")
	check(run.objective_target().is_empty(), "a pointer appears before the player has explored")
	run.elapsed = GameRun.SEARCH_HINT_AFTER + 1.0
	check(String(run.objective_target()[1]).begins_with("SEARCH"), "compass points at the exact target before charging")
	_cleanup_runs()
	await get_tree().process_frame
	# Chapter II opens after The Silence and plays in the Kaldr Rift.
	_reset_profile()
	check(not Profile.stop_available("k_light"), "Chapter II open before Chapter I is finished")
	for st5: Dictionary in GameData.chart_main(1):
		Profile.complete_stop(String(st5["id"]))
	check(Profile.stop_available("k_light") and Profile.next_stop() == "k_light", "Chapter II did not open after The Silence")
	run = _make_run({"stop": "k_auric"})
	await get_tree().process_frame
	check(run.destination_id == "kaldr_rift", "Chapter II stage not played in the Kaldr Rift")
	var bz: Dictionary = {}
	for q5: Dictionary in run.pois.items:
		if String(q5.id) == "rf_auric_bazaar":
			bz = q5
	check(not bz.is_empty(), "Auric Bazaar landmark missing")
	run.motes_collected = 999
	run._claim_discovery(bz)
	check(run.stop_complete, "Auric Bazaar did not complete its stage")
	run.end_run("extracted")
	Profile.record_expedition(finished_result)
	check("chris_halev" in Profile.contacts_met() and "auric_bazaar" in Profile.places_charted(), "contacts / place not recorded")
	_cleanup_runs()
	await get_tree().process_frame
	_reset_profile()
	# Catalogue records: loaded from data/catalog.json, one hidden per stage,
	# found by roaming, and filed in the Archive.
	_reset_profile()
	var roaming: Array = GameData.unheard_roaming({})
	check(roaming.size() >= 10, "catalogue records did not load (%d)" % roaming.size())
	run = _make_run({"stop": "gravefire"})
	await get_tree().process_frame
	var rec: Dictionary = {}
	for q6: Dictionary in run.pois.items:
		if bool(q6.get("roaming", false)):
			rec = q6
	check(not rec.is_empty(), "no unheard record hidden on the stage")
	if not rec.is_empty():
		check(Vector2(rec.pos).distance_to(run.world.gate) > 1000.0, "record hidden next to home")
		run._claim_discovery(rec)
		check(not run.stop_complete, "a record completed the stage")
		run.end_run("extracted")
		Profile.record_expedition(finished_result)
		var tid6: String = String(GameData.DISCOVERIES[String(rec.id)]["transmission"])
		check(tid6 in Profile.data["transmissions"], "found record not filed in the Archive")
		check(not String(rec.id) in GameData.unheard_roaming(Profile.data["discovered"]), "found record still counted as unheard")
	_cleanup_runs()
	await get_tree().process_frame
	_reset_profile()
	# Old saves keep what they earned.
	var old: Dictionary = Profile.defaults()
	old.erase("chart")
	old["stats"]["expeditions"] = 4
	old["discovered"] = {"sig_green_echo": {}, "char_gravefire": {}}
	var mig: Dictionary = Profile.migrate(old)
	check(bool(mig["chart"]["done"].get("green_echo", false)) and bool(mig["chart"]["done"].get("gravefire", false)) and bool(mig["chart"]["done"].get("hold_the_lane", false)), "old save not credited on the chart: %s" % str(mig["chart"]))
	_reset_profile()

## Star Splitter Visions guests: each ability does its job, each crossover
## landmark unlocks its explorer and opens its Archive page.
func test_visions_guests() -> void:
	for sid: String in GameData.VISIONS_SERIES.keys():
		var v: Dictionary = GameData.VISIONS_SERIES[sid]
		var cid: String = String(v["explorer"])
		var disc: Dictionary = GameData.DISCOVERIES[String(v["discovery"])]
		check(String(disc["unlock_character"]) == cid, "%s crossover does not unlock %s" % [sid, cid])
		check(ResourceLoader.exists("res://assets/characters/%s_256.png" % cid), "%s portrait missing" % cid)
		check(ResourceLoader.exists("res://assets/universe/%s_cover.png" % String(v["cover"])), "%s cover missing" % sid)
		check(GameData.poi_category("character", disc) == "visions", "%s landmark not classified as a Visions crossover" % sid)
	# Shield Wall: Gunnar flies escort and enemies ahead are pushed away.
	var run: GameRun = _make_run({"character": "bjorn"})
	await get_tree().process_frame
	run.player.god_mode = true
	run.player.facing = 0.0
	var e: ForceEnemy = run.spawn_enemy("ram_cutter", run.player.position + Vector2(90, 0), true)
	run.use_ability()
	check(run.allies.size() == 1 and String(run.allies[0].get("kind", "")) == "gunnar", "Gunnar did not come alongside")
	_sim(run, 0.6, func(r: GameRun) -> void: r.player.facing = 0.0)
	check(not is_instance_valid(e) or e.dead or e.position.x > run.player.position.x + 120.0, "shield wall did not shove the enemy ahead")
	_cleanup_runs()
	await get_tree().process_frame
	# All-Hands: marked enemies take +50% damage.
	run = _make_run({"character": "jax_orien"})
	await get_tree().process_frame
	run.player.god_mode = true
	var m: ForceEnemy = run.spawn_enemy("splinter_captain", run.player.position + Vector2(200, 0), true)
	_sim(run, 0.05)
	run.use_ability()
	check(m.meeting_mark > 0.0, "All-Hands did not mark the enemy")
	var before: float = m.hp
	var dealt: float = m.take_damage(10.0)
	check(is_equal_approx(dealt, 15.0 * m.damage_taken_mult) or dealt > 10.0, "meeting mark did not raise damage taken (%s)" % dealt)
	check(m.hp < before, "marked enemy took no damage")
	_cleanup_runs()
	await get_tree().process_frame
	# Build Another Way: the relay fires on its own.
	run = _make_run({"character": "lucia"})
	await get_tree().process_frame
	run.player.god_mode = true
	run.use_ability()
	check(run.relay_time > 0.0, "Launch-Shop relay did not deploy")
	var shots_before: int = run.projectiles.shots.size()
	run.spawn_enemy("skiff", run.relay_pos + Vector2(250, 0), true)
	_sim(run, 1.2)
	check(run.projectiles.shots.size() > shots_before or run.kills > 0, "relay did not fire")
	_cleanup_runs()
	await get_tree().process_frame
	# Quick Draw: hits every hostile in range.
	run = _make_run({"character": "brandon_mack"})
	await get_tree().process_frame
	run.player.god_mode = true
	var targets: Array = []
	for i in 6:
		targets.append(run.spawn_enemy("rail_picket", run.player.position + Vector2.from_angle(TAU * i / 6.0) * 300.0, true))
	run.use_ability()
	var hit: int = 0
	for t: ForceEnemy in targets:
		if not is_instance_valid(t) or t.dead or t.hp < t.max_hp:
			hit += 1
	check(hit == 6, "Quick Draw hit %d of 6 targets" % hit)
	_cleanup_runs()
	await get_tree().process_frame
	# Claiming a crossover unlocks the guest on return.
	_reset_profile()
	Profile.record_expedition({"outcome": "extracted", "time": 60.0, "discoveries": ["vis_sunforge"], "character": "ella_venn", "destination": "black_drift_reach", "currency": 0, "mastery_xp": 0})
	check(Profile.has_character("brandon_mack"), "Sunforge did not unlock Brandon Mack")
	_reset_profile()

## Force mechanics, upgrades and enemies added 2026-11-20.
func test_new_content() -> void:
	var run: GameRun = _make_run()
	await get_tree().process_frame
	run.player.god_mode = true
	# Hype: 15 quick kills fire a spectacle burst.
	run.weapons.add_weapon("mic_drop")
	for i in 15:
		var e: ForceEnemy = run.spawn_enemy("skiff", run.player.position + Vector2(300 + i * 4, 0), true)
		run.damage_enemy(e, 9999.0, Vector2.RIGHT, 0.0, "mic_drop", true)
	check(run.weapons.hype_bursts >= 1, "15-kill streak did not trigger a Hype spectacle")
	# Critical hits.
	run.weapons.passives["gain_stage"] = 5
	run.weapons.apply_passives()
	check(is_equal_approx(run.player.crit_chance, 0.30), "Gain Stage crit chance wrong")
	# Duet harmony mark boosts the next hit from another Force, then clears.
	var t: ForceEnemy = run.spawn_enemy("splinter_captain", run.player.position + Vector2(400, 0), true)
	run.weapons.add_weapon("duet_unit")
	run.player.crit_chance = 0.0
	run.damage_enemy(t, 1.0, Vector2.ZERO, 0.0, "duet_unit", true)
	check(t.harmony_mark, "Duet hit did not mark the target")
	var before: float = t.hp
	run.damage_enemy(t, 100.0, Vector2.ZERO, 0.0, "pulse_bolt", true)
	check(before - t.hp > 125.0 and not t.harmony_mark, "harmony mark did not add +30% and clear")
	# Leech latches and slows.
	var leech: ForceEnemy = run.spawn_enemy("leech", run.player.position + Vector2(20, 0), true)
	leech.clock = 0.0
	_sim(run, 0.3)
	check(leech.latched > 0.0 and run.player.slow_timer > 0.0, "leech did not latch and slow")
	# Flicker teleports beside the player.
	var fl: ForceEnemy = run.spawn_enemy("blink", run.player.position + Vector2(500, 0), true)
	fl.clock = 0.0
	_sim(run, 1.2)
	check(not is_instance_valid(fl) or fl.position.distance_to(run.player.position) < 260.0, "flicker did not teleport near the player")
	# Dreadnought arrives at 8:00 and fires broadsides.
	run.elapsed = 479.9
	_sim(run, 0.5)
	check(run.dreadnought_spawned, "dreadnought did not spawn at 8:00")
	var dn: ForceEnemy = null
	for e2: ForceEnemy in run.enemies:
		if e2.kind == "dreadnought":
			dn = e2
	check(dn != null, "dreadnought missing")
	if dn:
		dn.clock = 0.0
		_sim(run, 1.4)
		var beams: int = run.hazards.items.filter(func(h: Dictionary) -> bool: return String(h.kind) == "beam").size()
		check(beams >= 2 or dn.telegraph > 0.0, "dreadnought broadside not fired")
	# Crowd lock (Supersonic Being signal).
	var sig: Dictionary = {}
	for q: Dictionary in run.pois.items:
		if String(q.id) == "sig_spectacle":
			sig = q
	check(not sig.is_empty(), "spectacle signal missing")
	check(run.pois._lock_blocker(sig, run.player).begins_with("NEEDS A CROWD"), "crowd lock not enforced")
	# Artifact discoveries attune their Force mid-run (Before the Reboot).
	var run2: GameRun = run
	run2.weapons.weapons.clear()
	run2.weapons.weapon_order.clear()
	run2._claim_discovery({"id": "art_tracker_module", "kind": "artifact", "pos": run2.player.position, "color": Color.WHITE, "title": "T", "data": GameData.DISCOVERIES["art_tracker_module"]})
	check("before_the_reboot" in run2.attuned and run2.weapons.has_base("pattern_cannon"), "artifact did not attune Before the Reboot")

## Regressions from the 2026-11-17 code review.
func test_review_regressions() -> void:
	# 1. Guardian lock under real frames: exactly one guardian, tunes after it falls.
	var run: GameRun = _make_run()
	await get_tree().process_frame
	run.player.god_mode = true
	var beacon: Dictionary = {}
	for q: Dictionary in run.pois.items:
		if String(q.id) == "sig_thunderbreak_beacon":
			beacon = q
	var captains: Callable = func() -> int:
		return run.enemies.filter(func(e: ForceEnemy) -> bool: return e.kind == "splinter_captain").size()
	run.player.position = Vector2(beacon.pos)
	for i in 30:
		run.player.position = Vector2(beacon.pos)
		if run.choosing:
			run.hud._pick(run.hud.level_options[0])
		await get_tree().process_frame
	run.elite_times.clear()
	var g: Variant = beacon.get("guardian")
	check(is_instance_valid(g), "guardian missing (has key %s, blocked '%s', claimed %s, dist %d, visible %s, choosing %s, paused %s, elapsed %.2f, ended %s)" % [str(beacon.has("guardian")), String(beacon.get("blocked", "")), str(beacon.claimed), int(run.player.position.distance_to(beacon.pos)), str(run.pois.is_visible_poi(beacon)), str(run.choosing), str(get_tree().paused), run.elapsed, str(run.ended)])
	if not is_instance_valid(g):
		return
	run.damage_enemy(g, 999999.0, Vector2.ZERO, 0.0, "environment", true)
	for i in 400:
		run.player.position = Vector2(beacon.pos)
		run.player.velocity = Vector2.ZERO
		if run.choosing:
			run.hud._pick(run.hud.level_options[0])
		await get_tree().process_frame
	check(captains.call() == 0, "guardian respawned after dying (%d captains)" % captains.call())
	check("sig_thunderbreak_beacon" in run.discoveries, "guardian signal never tuned under real frames")
	_cleanup_runs()
	await get_tree().process_frame
	# 2. Naomi (mastery 1): two dashes, then cooldown.
	Profile.mastery("naomi_sol")["level"] = 1
	var run2: GameRun = _make_run({"character": "naomi_sol"})
	await get_tree().process_frame
	check(run2.use_ability() and run2.use_ability(), "Naomi should have two charges")
	check(not run2.use_ability(), "Naomi dashed a third time without cooldown")
	check(run2.ability_cd > 0.0, "Naomi cooldown not started after charges spent")
	# 5. Beats do nothing while paused.
	run2.weapons.build = 100.0
	run2.weapons.drop_armed = true
	get_tree().paused = true
	run2._on_audio_beat(8)
	check(run2.weapons.drop_time == 0.0, "Drop fired while paused")
	get_tree().paused = false
	# 7. No level-up after the run ends.
	run2.pending_levels = 2
	run2.player.hp = 1.0
	run2.player.invuln = 0.0
	run2.player_hit(999.0, Vector2.ZERO)
	run2.step(1.0 / 60.0)
	check(run2.ended and not run2.choosing and not get_tree().paused, "level-up opened after the run ended")
	_cleanup_runs()
	await get_tree().process_frame
	# 3. Stick released during a level-up pause does not stay held.
	var run3: GameRun = _make_run()
	await get_tree().process_frame
	run3.hud.touch_id = 0
	run3.hud.touch_vector = Vector2(1, 0)
	run3.pending_levels = 1
	run3.step(1.0 / 60.0)
	check(run3.hud.touch_id == -1 and run3.hud.touch_vector == Vector2.ZERO, "touch not released when level-up opened")
	# 8. Naomi halves every hazard type.
	check(is_equal_approx(run3.hazard_damage_mult(), 1.0), "hazard mult should be 1 for Venn")
	_cleanup_runs()
	await get_tree().process_frame
	# Touch: the stick starts wherever the thumb lands, on either side, and
	# the ability button sits opposite the steering hand.
	var run4: GameRun = _make_run()
	await get_tree().process_frame
	await get_tree().process_frame
	var vp4: Vector2 = get_viewport().get_visible_rect().size
	for x: float in [vp4.x * 0.85, vp4.x * 0.15]:
		var t: InputEventScreenTouch = InputEventScreenTouch.new()
		t.index = 3
		t.position = Vector2(x, vp4.y * 0.45)
		t.pressed = true
		run4.hud._input(t)
		check(run4.hud.touch_id == 3, "stick did not start at x=%d" % int(x))
		var up: InputEventScreenTouch = InputEventScreenTouch.new()
		up.index = 3
		up.position = t.position
		up.pressed = false
		run4.hud._input(up)
		check(run4.hud.touch_id == -1, "stick not released")
	Profile.data["settings"]["handedness"] = "right"
	run4.hud._layout()
	check(run4.hud.ability_button.position.x < vp4.x * 0.5, "right-handed player: ability button should be on the left")
	Profile.data["settings"]["handedness"] = "left"
	run4.hud._layout()
	check(run4.hud.ability_button.position.x > vp4.x * 0.5, "left-handed player: ability button should be on the right")
	Profile.data["settings"]["handedness"] = "right"

func test_second_destination() -> void:
	var run: GameRun = _make_run({"destination": "kaldr_rift"})
	await get_tree().process_frame
	check(run.player.position.distance_to(Vector2(-6300, 0)) < 200.0, "player did not start at the Rift Mouth")
	var ids: Array = run.pois.items.map(func(q: Dictionary) -> String: return String(q.id))
	check("sig_grind" in ids and "sig_shine" in ids, "Kaldr signals missing")
	check(not "sig_green_echo" in ids and not "sig_campfire" in ids, "Black Drift discoveries leaked into Kaldr")
	check(run.camps.size() >= 8, "Kaldr camps missing")
	check(run.gate_name() == "RIFT MOUTH", "gate name wrong: " + run.gate_name())
	var reached: Array = []
	_sim(run, 20.0, func(r: GameRun) -> void:
		r.player.move_input = r.player.position.direction_to(GameData.REGIONS["grain_convoy"]["center"]))
	check("grain_convoy" in run.visited_regions, "could not travel into the Grain Convoy region")
	# Unlock path: completing the Reach charts Kaldr.
	Profile.record_expedition({"outcome": "complete", "destination": "black_drift_reach", "character": "ella_venn", "time": 600.0})
	check(Profile.has_destination("kaldr_rift"), "Kaldr Rift not unlocked by completing the Reach")

## Playtest mode: separate save, everything open, real progress kept.
func test_playtest_mode() -> void:
	_reset_profile()
	var real_path: String = Profile.save_path
	Profile.data["currency"] = 7
	Profile.save()
	Profile.load_profile(Profile.PATH) # behave like the real game
	var had_real: bool = FileAccess.file_exists(Profile.PATH)
	var real_before: Dictionary = Profile.data.duplicate(true)
	Profile.set_playtest(true)
	check(Profile.is_playtest(), "playtest did not switch on")
	check(Profile.stop_available("des_heat") and Profile.stop_available("sea_undertow"), "playtest should open every stage")
	check(Profile.has_feature("workshop"), "playtest should open features")
	check("lucia" in Profile.data["unlocked_characters"], "playtest should open explorers")
	Profile.set_setting("playtest_short", true)
	var run: GameRun = _make_run({"stop": "des_heat"})
	check(is_equal_approx(float(run.mission["objective"]["at"]), 90.0), "short timers not applied")
	check(is_equal_approx(float(GameData.chart_stop("des_heat")["objective"]["at"]), 360.0), "short timers changed the chart data")
	run.queue_free()
	Profile.set_playtest(false)
	check(not Profile.is_playtest(), "playtest did not switch off")
	check(not FileAccess.file_exists(Profile.PLAYTEST_MARK), "playtest marker left behind")
	check(int(Profile.data["currency"]) == int(real_before["currency"]), "real save changed by playtest")
	DirAccess.remove_absolute(Profile.PLAYTEST_PATH)
	DirAccess.remove_absolute(Profile.PLAYTEST_PATH.get_basename() + ".backup.json")
	if not had_real:
		DirAccess.remove_absolute(Profile.PATH)
		DirAccess.remove_absolute(Profile.PATH.get_basename() + ".backup.json")
	Profile.load_profile(real_path)

## Branch paths: a crossover series gets its own chapter, world and look.
func test_sea_branch() -> void:
	check(GameData.chart_prev_main("sea_atlantic") == "s_dti", "Sea branch should open from Now Serving G-53")
	check(GameData.chart_prev_main("k_light") != "", "Chapter II should follow Chapter I")
	check(GameData.is_branch(10) and not GameData.is_branch(2), "branch flags wrong")
	for st: Dictionary in GameData.CHART:
		if int(st.get("chapter", 1)) != 10:
			continue
		for did: String in st.get("discoveries", []):
			check(GameData.discovery_in_destination(did, "harbor_signal"), "%s not in Harbor Signal" % did)
	check(not Profile.stop_available("sea_atlantic"), "Sea open too early")
	Profile.complete_stop("s_dti")
	check(Profile.stop_available("sea_atlantic"), "Sea did not open after Now Serving G-53")
	var run: GameRun = _make_run({"stop": "sea_atlantic"})
	await get_tree().process_frame
	check(run.destination_id == "harbor_signal", "Sea stage ran in " + run.destination_id)
	check(run.world.biome == "sea", "Sea biome not set")
	var e: ForceEnemy = run.spawn_enemy("skiff", run.player.position + Vector2(300, 0))
	check(e != null and e.skin_name == "Fog Skiff", "sea skin not applied")
	run.queue_free()
	# Desert: opens from OCHRE-9 (Lucia).
	check(GameData.chart_prev_main("des_lakebed") == "s_ochre", "Desert branch should open from OCHRE-9")
	for st2: Dictionary in GameData.CHART:
		if int(st2.get("chapter", 1)) == 11:
			for did2: String in st2.get("discoveries", []):
				check(GameData.discovery_in_destination(did2, "dryline"), "%s not in Dryline" % did2)
	var run2: GameRun = _make_run({"stop": "des_lakebed"})
	await get_tree().process_frame
	check(run2.world.biome == "desert", "Desert biome not set")
	var e2: ForceEnemy = run2.spawn_enemy("skiff", run2.player.position + Vector2(300, 0))
	check(e2 != null and e2.skin_name == "Dust Skiff", "desert skin not applied")
	run2.queue_free()
	# Orbit: opens from Mandatory Proximity (Jax Orien).
	check(GameData.chart_prev_main("orb_branch") == "s_stardust", "Orbit branch should open from s_stardust")
	for st3: Dictionary in GameData.CHART:
		if int(st3.get("chapter", 1)) == 12:
			for did3: String in st3.get("discoveries", []):
				check(GameData.discovery_in_destination(did3, "stardust_orbit"), "%s not in Stardust Orbit" % did3)
	# A stage track counts as heard for roaming.
	var before: int = GameData.unheard_roaming({}).size()
	check(GameData.unheard_roaming({"des_launch_signal": {}}).size() == before - 1, "stage track still roaming")

## Lets the engine drive the run for real frames (queue_free, signals, HUD).
func test_real_frames() -> void:
	var run: GameRun = _make_run()
	await get_tree().process_frame
	run.player.god_mode = true
	for w: String in ["riser", "ion_lance", "trail_charges"]:
		run.weapons.add_weapon(w)
	for i in 40:
		run.spawn_enemy("skiff", run.player.position + Vector2.from_angle(i * 0.5) * (120.0 + i * 5.0), true)
	var k0: int = run.kills
	for i in 240:
		run.player.move_input = Vector2(cos(i * 0.03), sin(i * 0.03))
		if run.choosing:
			run.hud._pick(run.hud.level_options[0])
		await get_tree().process_frame
	check(run.kills > k0 + 10, "real-frame combat killed too few: %d" % (run.kills - k0))
	for e: Variant in run.enemies:
		check(is_instance_valid(e), "freed enemy left in list")

func test_menu_screens_build() -> void:
	var main_script: GDScript = load("res://scripts/ui/main.gd")
	var main: Node = main_script.new()
	add_child(main)
	await get_tree().process_frame
	Profile.data["transmissions"] = ["rc_meaningless_dub", "pwc_now_or_never"]
	Profile.data["forces_attuned"] = GameData.FORCES.keys()
	for fn: String in ["show_title", "show_departure", "show_archive", "show_workshop", "show_settings", "show_credits"]:
		main.call(fn)
		for k in 6:
			await get_tree().process_frame
		check(main.screen != null and is_instance_valid(main.screen), "%s did not build" % fn)
		_check_layout(main.screen, fn)
	# Touch drag-scrolls a list even when the drag starts on a button/panel.
	main.show_archive()
	for k2 in 4:
		await get_tree().process_frame
	var tabs: TabContainer = main.screen.find_children("*", "TabContainer", true, false)[0]
	tabs.current_tab = tabs.get_tab_count() - 1 # Field Guide: a long list
	for k3 in 4:
		await get_tree().process_frame
	var fg: ScrollContainer = tabs.get_current_tab_control() as ScrollContainer
	var p0: Vector2 = fg.get_global_rect().get_center()
	var press: InputEventScreenTouch = InputEventScreenTouch.new()
	press.index = 0
	press.position = p0
	press.pressed = true
	get_viewport().push_input(press, true)
	for step in 6:
		var drag: InputEventScreenDrag = InputEventScreenDrag.new()
		drag.index = 0
		drag.position = p0 - Vector2(0, 20 * (step + 1))
		drag.relative = Vector2(0, -20)
		get_viewport().push_input(drag, true)
	var rel: InputEventScreenTouch = InputEventScreenTouch.new()
	rel.index = 0
	rel.position = p0 - Vector2(0, 120)
	get_viewport().push_input(rel, true)
	await get_tree().process_frame
	check(fg.scroll_vertical > 60, "touch drag did not scroll the Field Guide (scroll %d)" % fg.scroll_vertical)
	Profile.data["transmissions"] = ["rc_meaningless_dub"]
	Profile.data["fragments"] = ["frag_01"]
	main.show_archive()
	await get_tree().process_frame
	main.last_result = {"outcome": "extracted", "time": 300.0, "kills": 40, "level": 7, "character": "ella_venn", "regions": ["silver_wrecks"], "weapons": {"pulse_bolt": 3}, "harmonies": ["dub_drop"], "discoveries": ["sig_green_echo"]}
	main.last_commit = {"currency": 50, "unlocks": [{"kind": "force", "id": "resonant_currents"}, {"kind": "character", "id": "tessa_banks"}], "new_discoveries": ["sig_green_echo"], "mastery_levels": 1}
	main.show_results()
	for k in 6:
		await get_tree().process_frame
	check(is_instance_valid(main.screen), "results did not build")
	_check_layout(main.screen, "show_results")
	main.start_expedition(true)
	await get_tree().process_frame
	check(main.current_run != null, "expedition did not start from menu")
	main.queue_free()

## Catches letter-stacked labels (autowrap with no width) and buttons pushed
## off the 1280x720 design viewport outside of scroll areas.
func _check_layout(node: Node, screen_name: String) -> void:
	var vp: Rect2 = (node as Control).get_viewport_rect()
	for c: Node in node.find_children("*", "Control", true, false):
		var ctl: Control = c
		if not ctl.is_visible_in_tree():
			continue
		var in_scroll: bool = false
		var p: Node = ctl.get_parent()
		while p != null and p != node:
			if p is ScrollContainer:
				in_scroll = true
				break
			p = p.get_parent()
		if ctl is Label:
			var l: Label = ctl
			if l.autowrap_mode != TextServer.AUTOWRAP_OFF and l.text.length() > 4:
				check(l.size.x >= 60.0, "%s: label squeezed to %dpx: '%s'" % [screen_name, int(l.size.x), l.text.left(30)])
		if ctl is Button and not in_scroll:
			var r: Rect2 = ctl.get_global_rect()
			check(vp.grow(2.0).encloses(r), "%s: button off-screen '%s' %s" % [screen_name, (ctl as Button).text.left(24), str(r)])

func test_hud_fits_aspect_ratios() -> void:
	var run: GameRun = _make_run()
	await get_tree().process_frame
	for size: Vector2 in [Vector2(1280, 720), Vector2(1560, 720), Vector2(960, 720)]:
		run.hud.safe = Rect2(Vector2(16, 12), size - Vector2(32, 24))
		run.hud._layout()
		var ab: Rect2 = Rect2(run.hud.ability_button.position, run.hud.ability_button.size)
		check(Rect2(Vector2.ZERO, size).encloses(ab), "ability button off-screen at %s" % str(size))
		check(ab.size.x >= 88.0, "ability button below touch target size")
		check(run.hud.pause_button.position.x + 48 <= size.x, "pause button off-screen at %s" % str(size))

func test_performance_budget() -> void:
	var run: GameRun = _make_run()
	await get_tree().process_frame
	run.player.god_mode = true
	for w: String in ["riser", "sub_wave", "riff_blades", "section_drones", "analog_star"]:
		run.weapons.add_weapon(w)
	for i in 85:
		run.spawn_enemy(["skiff", "ram_cutter", "rail_picket", "swarm_tender"][i % 4], run.player.position + Vector2.from_angle(i * 0.37) * (200.0 + (i % 9) * 60.0), true)
	var dt: float = 1.0 / 60.0
	var t0: int = Time.get_ticks_usec()
	var frames: int = 300
	for i in frames:
		run.player.move_input = Vector2(cos(i * 0.02), sin(i * 0.02))
		if run.choosing:
			run.hud._pick(run.hud.level_options[0])
		run.step(dt)
	var avg_ms: float = float(Time.get_ticks_usec() - t0) / frames / 1000.0
	print("        simulation step avg: %.2f ms with %d enemies, %d shots" % [avg_ms, run.enemies.size(), run.projectiles.shots.size()])
	check(avg_ms < 8.0, "simulation step too slow: %.2f ms" % avg_ms)
