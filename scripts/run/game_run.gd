class_name GameRun
extends Node2D
## One expedition. Owns the simulation and wires together world, actors,
## weapons, points of interest, music and HUD. `step(delta)` advances the
## whole simulation deterministically so headless tests can drive it.

signal finished(result: Dictionary)

const STATE_ENTER_RES: float = 72.0
const STATE_EXIT_RES: float = 66.0
const STATE_ENTER_FRAC: float = 28.0
const STATE_EXIT_FRAC: float = 34.0
const GATE_RADIUS: float = 170.0
const EXTRACT_TIME: float = 2.0
const MAX_ENEMIES: int = 90

# Config
var character_id: String = "ella_venn"
var destination_id: String = "black_drift_reach"
var signature_force: String = "pulse_width_codex"
var quick_test: bool = false
var start_bonuses: Dictionary = {}

# Systems
var world: ExpeditionWorld
var player: ForcePlayer
var camera: Camera2D
var weapons: WeaponSystem
var projectiles: ProjectileSystem
var hazards: HazardSystem
var pickups: PickupSystem
var fx: FxLayer
var pois: PointsOfInterest
var hud: Node # RunHud
var enemy_layer: Node2D
var enemies: Array[ForceEnemy] = []
var enemy_hash: SpatialHash = SpatialHash.new(96.0)
var rng: RandomNumberGenerator = RandomNumberGenerator.new()

# State
var elapsed: float = 0.0
var kills: int = 0
var level: int = 1
var xp: int = 0
var xp_need: int = 8
var pending_levels: int = 0
var upgrades_offered: int = 0
var choosing: bool = false
var rerolls: int = 0
var ended: bool = false
var outcome: String = ""
var resonance: float = 50.0
var force_state: String = "DRIFT"
var attuned: Array = []
var discoveries: Array = []
var new_this_run: Array = []
## Corridor Chart stop being played ({} in Open Expedition).
var stop_id: String = ""
var mission: Dictionary = {}
var stop_complete: bool = false
var stop_first_time: bool = false
var last_checkpoint: float = 0.0
var checkpoint_due: bool = false
var current_region: String = ""
var visited_regions: Array = []
var boss: ForceEnemy = null
const POWER_SCALE: float = 0.65
## Boss fights are meant to be a spectacle, not a wall: 30% softer hits.
const BOSS_EASE: float = 0.7
## Enemies grow tougher with how far along the whole route you are (up to +40%).
const DEPTH_PER_STAGE: float = 0.006
const DEPTH_MAX: float = 0.4
var steady: bool = false
var boss_spawned: bool = false
var boss_defeated: bool = false
var victory_clock: float = -1.0
var extract_progress: float = 0.0
var left_gate: bool = false
var extract_armed: bool = false
var spawn_clock: float = 1.5
var patrol_clock: float = 22.0
var elite_times: Array = [180.0, 420.0, 660.0, 900.0]
var strike_clock: float = 2.0
var shake_amount: float = 0.0
var punch_amount: float = 0.0
var hitstop_clock: float = 0.0
var music_clock: float = 0.0
var beat_clock: float = 0.0
var beat_index: int = 0
var climax_warned: bool = false
var dreadnought_spawned: bool = false
var pending_beats: Array[int] = []
var step_usec: int = 0 # last simulation step cost (perf probes)
var motes_collected: int = 0
var second_wind_used: bool = false
var player_veiled: float = 0.0
var ability_cd: float = 0.0
var ability_charges: int = 1
var ability_active: float = 0.0
var damage_boost: float = 0.0
var mastery_level: int = 0
var allies: Array = [] # Abby's answering captains / Gunnar: {angle, clock, kind?}
var relay_pos: Vector2 = Vector2.ZERO
var relay_time: float = 0.0
var relay_clock: float = 0.0
var since_hurt: float = 0.0
var on_stage: bool = false # inside an unclaimed crowd-locked signal
var stage_clock: float = 0.0
var ally_time: float = 0.0
var debug_enabled: bool = true
var scripted_input: bool = false # tests/bots drive player.move_input directly
var hint_queue: Array = []
var combat_heat: float = 0.0
var damage_dealt: float = 0.0
var map_revealed: bool = false
var explored: Dictionary = {} # Vector2i cells of 400px
var camps: Array = [] # {pos, region, remaining, active, members, cleared}
var camp_clock: float = 0.0
var echo_clock: float = 75.0
var echoes_tuned: int = 0
var bonus_currency: int = 0

func setup(config: Dictionary) -> void:
	character_id = String(config.get("character", "ella_venn"))
	destination_id = String(config.get("destination", "black_drift_reach"))
	signature_force = String(config.get("force", GameData.FORCES.keys()[0]))
	quick_test = bool(config.get("quick_test", false))
	stop_id = String(config.get("stop", ""))
	mission = GameData.chart_stop(stop_id).duplicate(true)
	# Gentle pacing: a stage's tuner charge is 65% of its listed power, so
	# stages land around 4-8 minutes instead of up to 15.
	if mission.has("power"):
		mission["power"] = int(round(float(mission["power"]) * POWER_SCALE))
	# A loss on a stage: the next try is steadier.
	steady = not mission.is_empty() and Profile.stage_losses(stop_id) >= 1
	if Profile.is_playtest() and bool(Profile.setting("playtest_short")) and mission.has("objective"):
		# Playtest: holds and boss arrivals come four times sooner.
		var o: Dictionary = mission["objective"]
		for k: String in ["seconds", "at"]:
			if o.has(k):
				o[k] = float(o[k]) * 0.25
	if not mission.is_empty():
		destination_id = String(GameData.chapter_def(int(mission.get("chapter", 1)))["destination"])
	if config.has("seed"):
		rng.seed = int(config["seed"])
	else:
		rng.randomize()
	attuned = (Profile.data["forces_attuned"] as Array).duplicate()
	if not signature_force in attuned:
		attuned.append(signature_force)

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_PAUSABLE
	_build()

func _build() -> void:
	world = ExpeditionWorld.new()
	add_child(world)
	if not mission.is_empty():
		world.gate_override = GameData.chart_start_random(mission, rng, GameData.DESTINATIONS[destination_id]["half_size"])
	world.build(destination_id)
	pois = PointsOfInterest.new()
	pois.run = self
	add_child(pois)
	pois.populate(world, rng, Profile.data["discovered"])
	_place_camps()
	hazards = HazardSystem.new()
	hazards.run = self
	add_child(hazards)
	pickups = PickupSystem.new()
	pickups.run = self
	add_child(pickups)
	enemy_layer = Node2D.new()
	add_child(enemy_layer)
	player = ForcePlayer.new()
	add_child(player)
	if Profile.is_playtest() and bool(Profile.setting("playtest_invincible")):
		player.god_mode = true
	player.configure(character_id)
	player.position = world.gate + Vector2(0, 60)
	player.bounds = Rect2(-world.half_size, world.half_size * 2.0)
	_apply_start_bonuses()
	weapons = WeaponSystem.new()
	add_child(weapons)
	weapons.setup(self, player, String(GameData.FORCES[signature_force]["primary"]))
	weapons.apply_passives()
	player.hp = player.max_hp
	projectiles = ProjectileSystem.new()
	projectiles.run = self
	add_child(projectiles)
	fx = FxLayer.new()
	fx.reduced_flashes = bool(Profile.setting("reduced_flashes"))
	fx.damage_numbers = bool(Profile.setting("damage_numbers"))
	add_child(fx)
	camera = Camera2D.new()
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 7.0
	camera.limit_left = int(-world.half_size.x - 300)
	camera.limit_right = int(world.half_size.x + 300)
	camera.limit_top = int(-world.half_size.y - 300)
	camera.limit_bottom = int(world.half_size.y + 300)
	add_child(camera)
	camera.position = player.position
	camera.make_current()
	var hud_script: GDScript = load("res://scripts/ui/run_hud.gd")
	hud = hud_script.new()
	hud.run = self
	add_child(hud)
	if Audio.has_signal("beat"):
		Audio.beat.connect(_on_audio_beat)
	_update_music(true)
	if Profile.data["discovered"].has("art_survey_chart"):
		map_revealed = true
	if bool(start_bonuses.get("head_start", false)):
		pending_levels += 1
	_queue_onboarding()
	if not mission.is_empty():
		var num: int = GameData.chart_number(stop_id)
		hud.banner(String(mission["name"]).to_upper(), (("Stage %d  •  " % num) if num > 0 else "Side signal  •  ") + GameData.chart_objective_text(mission), Color("68ecff"), 4.0)
		if not Profile.seen("stop_new_" + stop_id):
			Profile.mark_seen("stop_new_" + stop_id)
			hud.teach_custom("NEW  •  " + String(mission["new_title"]), String(mission["new"]), "OBJECTIVE: " + GameData.chart_objective_text(mission), Color("68ecff"), String(mission.get("icon", "signal")))

func _apply_start_bonuses() -> void:
	var def: Dictionary = GameData.CHARACTERS[character_id]
	mastery_level = int(Profile.mastery(character_id)["level"])
	var b: Dictionary = {
		"max_hp": float(def["max_hp"]) + 10.0 * Profile.workshop_rank("plating") + (20.0 if character_id == "ella_venn" and mastery_level >= 3 else 0.0),
		"speed_mult": 1.0 + 0.04 * Profile.workshop_rank("thrust") + (0.06 if character_id == "naomi_sol" and mastery_level >= 3 else 0.0),
		"pickup": float(def["pickup"]) * (1.0 + 0.12 * Profile.workshop_rank("magnet")) * (1.15 if character_id == "jax_orien" and mastery_level >= 3 else 1.0),
		"armor": float(def.get("armor", 0.0)) + (0.5 if character_id in ["tessa_banks", "bjorn", "brandon_mack", "sir_eric"] and mastery_level >= 3 else 0.0),
		"head_start": Profile.workshop_rank("head_start") > 0 or (character_id == "jex_marrin" and mastery_level >= 4),
	}
	# Crew ride along with their captain.
	var crew_rerolls: int = 0
	for c: String in Profile.crew(character_id):
		var pk: Dictionary = GameData.CONTACTS[c]["perk"]
		var v: float = float(pk["value"])
		match String(pk["kind"]):
			"hp":
				b["max_hp"] = float(b["max_hp"]) + v
			"armor":
				b["armor"] = float(b["armor"]) + v
			"speed":
				b["speed_mult"] = float(b["speed_mult"]) + v
			"pickup":
				b["pickup"] = float(b["pickup"]) * (1.0 + v)
			"reroll":
				crew_rerolls += int(v)
	if steady:
		b["max_hp"] = float(b["max_hp"]) * 1.3
	start_bonuses = b
	player.max_hp = float(b["max_hp"])
	player.hp = player.max_hp
	if character_id == "jex_marrin":
		player.damage_taken_mult = 1.15
	rerolls = Profile.workshop_rank("reroll") + 2 * Profile.workshop_rank("insight") + crew_rerolls + (1 if character_id == "sir_eric" else 0)
	ability_charges = 2 if character_id == "naomi_sol" and mastery_level >= 1 else 1
	if Profile.data["discovered"].has("art_beacon_core"):
		resonance = 65.0

## Raider camps: idle clusters around a marked salvage pile. They give the
## journey friction and the route a choice — go around, or clear it for an
## upgrade. Members materialise only when the player is near.
func _place_camps() -> void:
	for rid: String in world.region_ids:
		var r: Dictionary = GameData.REGIONS[rid]
		var threat: int = int(r.get("threat", 0))
		if threat <= 0:
			continue
		var count: int = 2 + (1 if threat >= 3 else 0)
		for i in count:
			var pos: Vector2 = world.random_open_point_near(GameData.region_anchor(r), 200.0, float(r.get("radius", 600.0)) * 0.85, rng)
			camps.append({"pos": pos, "region": rid, "remaining": 5 + threat * 2, "active": false, "members": [], "cleared": false})
			pois.add({"kind": "camp", "pos": pos, "title": String(GameData.biome_get(world.biome, "camp_name", "RAIDER CAMP")), "color": Color("d0743c"), "radius": 70.0, "camp": camps.size() - 1})

func _step_camps() -> void:
	for i in camps.size():
		var c: Dictionary = camps[i]
		if bool(c.cleared):
			continue
		var d: float = player.position.distance_to(c.pos)
		if not bool(c.active) and d < 1300.0:
			c.active = true
			var r: Dictionary = GameData.REGIONS[String(c.region)]
			for k in int(c.remaining):
				var kind: String = _pick_kind(r)
				var e: ForceEnemy = spawn_enemy(kind, Vector2(c.pos) + Vector2.from_angle(rng.randf() * TAU) * rng.randf_range(40.0, 170.0), false, true)
				if e:
					e.camp = i
					e.home = c.pos
					(c.members as Array).append(e)
		elif bool(c.active):
			var alive: Array = (c.members as Array).filter(func(e: Variant) -> bool: return is_instance_valid(e) and not (e as ForceEnemy).dead)
			c.members = alive
			if alive.is_empty():
				c.cleared = true
				pending_levels += 1
				pickups.drop("repair", c.pos)
				for k in 6:
					pickups.drop("mote", Vector2(c.pos) + Vector2.from_angle(TAU * k / 6.0) * 30.0, 3 + int(elapsed / 200.0))
				fx.ring(c.pos, 20.0, 260.0, Color("ffe08a"), 0.8, 6.0)
				Audio.play_sfx("discovery", 1.4, -4.0, 0.3)
				if hud:
					hud.toast("RAIDER CAMP CLEARED — salvage recovered")
				for poi: Dictionary in pois.items:
					if String(poi.kind) == "camp" and int(poi.get("camp", -1)) == i:
						poi.claimed = true
			elif d > 2100.0:
				c.remaining = alive.size()
				for e2: ForceEnemy in alive:
					e2.dead = true
					enemies.erase(e2)
					e2.queue_free()
				c.members = []
				c.active = false

## Echo transmissions: short-lived signals that surface across the Reach,
## giving a long expedition a rhythm of new reasons to travel.
func _spawn_echo() -> void:
	var pos: Vector2 = world.random_open_point_near(player.position, 1500.0, 3200.0, rng)
	var forces: Array = attuned.duplicate()
	var fid: String = String(forces[rng.randi() % forces.size()])
	var p: Dictionary = pois.add({"kind": "echo", "pos": pos, "title": "ECHO TRANSMISSION", "color": GameData.FORCES[fid]["color"],
		"radius": 64.0, "known": true, "life": 75.0, "force": fid})
	if hud:
		hud.alert("ECHO TRANSMISSION", p.pos)
	Audio.play_sfx("ping", 1.1, -2.0, 0.3)

func _queue_onboarding() -> void:
	if not Profile.seen("hint_move"):
		hint_queue.append(["hint_move", "Drag anywhere to fly. Guns fire on their own."])
	if not Profile.seen("hint_signal") and mission.is_empty():
		hint_queue.append(["hint_signal", "Columns of light are SIGNALS. Fly into the ring and hold still to tune them in."])
	if not Profile.seen("hint_extract") and mission.is_empty():
		hint_queue.append(["hint_extract", "Fly back into the %s ring any time to go home with everything you've found." % gate_name()])

# ================================================================== loop

func _process(delta: float) -> void:
	if ended:
		return
	if hitstop_clock > 0.0:
		hitstop_clock -= delta
		delta *= 0.15
	var t0: int = Time.get_ticks_usec()
	step(minf(delta, 1.0 / 20.0))
	step_usec = Time.get_ticks_usec() - t0
	_update_camera(delta)

func step(delta: float) -> void:
	if ended or choosing:
		return
	elapsed += delta
	_read_input()
	# While a boss is up, light hulls take proportionally less damage (as if
	# every explorer had 130 hull): their weakness stays for the rest of a run.
	player.damage_ease = BOSS_EASE * clampf(float(start_bonuses.get("max_hp", 130.0)) / 130.0, 0.6, 1.0) if boss_spawned and not boss_defeated else 1.0
	player.step(delta)
	var before: Vector2 = player.position
	player.position = world.resolve(player.position, 18.0)
	var push: Vector2 = player.position - before
	if push.length_squared() > 0.0001:
		# Slide along rocks and hulls instead of sticking to them.
		var n: Vector2 = push.normalized()
		var into: float = player.velocity.dot(n)
		if into < 0.0:
			player.velocity -= n * into
	_update_region()
	_explore_mark()
	_scan_categories(delta)
	if checkpoint_due or elapsed - last_checkpoint > 45.0:
		checkpoint_due = false
		checkpoint()
	# Broad-phase rebuild once per frame, before anything queries it
	# (abilities included), so no query can return an enemy freed since.
	enemy_hash.clear()
	for e: ForceEnemy in enemies:
		if is_instance_valid(e) and not e.dead:
			enemy_hash.insert(e, e.position, e.radius)
	_update_state(delta)
	_update_ability(delta)
	_step_enemies(delta)
	for b: int in pending_beats:
		beat_index = b
		weapons.on_beat(b)
		if hud:
			hud.on_beat(b)
	pending_beats.clear()
	_step_stage(delta)
	weapons.step(delta)
	projectiles.step(delta, enemy_hash, player)
	hazards.step(delta, player, enemy_hash)
	pickups.step(delta, player)
	pois.step(delta, player, scanner_range())
	fx.step(delta)
	_spawn_director(delta)
	echo_clock -= delta
	if echo_clock <= 0.0 and not boss_spawned:
		echo_clock = rng.randf_range(80.0, 110.0) * (0.3 if quick_test else 1.0)
		_spawn_echo()
	camp_clock -= delta
	if camp_clock <= 0.0:
		camp_clock = 0.5
		_step_camps()
	_environment(delta)
	_gate_logic(delta)
	_beat_fallback(delta)
	music_clock -= delta
	if music_clock <= 0.0:
		music_clock = 0.3
		_update_music(false)
	combat_heat = maxf(0.0, combat_heat - delta * 0.12)
	if victory_clock > 0.0:
		victory_clock -= delta
		if victory_clock <= 0.0:
			end_run("complete")
	if ended:
		return
	if pending_levels > 0 and not choosing:
		_open_level_up()

func _read_input() -> void:
	if scripted_input:
		return
	var v: Vector2 = InputSetup.move_vector()
	if hud and hud.touch_vector.length() > 0.05:
		v = hud.touch_vector
	player.move_input = v

func _update_camera(delta: float) -> void:
	if camera == null:
		return
	var lead: Vector2 = player.velocity * 0.18
	camera.position = player.position + lead
	var shake_scale: float = float(Profile.setting("screen_shake"))
	shake_amount = maxf(0.0, shake_amount - delta * 30.0)
	camera.offset = Vector2(randf_range(-1, 1), randf_range(-1, 1)) * shake_amount * shake_scale
	# Zoom punch eases back to rest.
	punch_amount = move_toward(punch_amount, 0.0, delta * 0.6)
	camera.zoom = Vector2.ONE * base_zoom() * (1.0 + punch_amount * shake_scale)

## The camera sits further out than 1:1 so more of the field is in view
## (playtest: "seeing more of the field at once would be good"); UI text is
## unaffected. Phones held upright see the most.
func base_zoom() -> float:
	return 0.72 if UiTheme.is_narrow() else 0.88

## Distance from the player to just beyond the visible edge, so spawns never
## pop in on screen at the wider zoom.
func view_radius() -> float:
	var vp: Vector2 = get_viewport().get_visible_rect().size / base_zoom()
	return vp.length() * 0.5 + 80.0

func shake(amount: float) -> void:
	shake_amount = minf(16.0, maxf(shake_amount, amount))

## A brief camera zoom-in for heavy moments (Drops, elites, boss phases).
func punch(amount: float) -> void:
	punch_amount = minf(0.12, maxf(punch_amount, amount))

func hitstop(t: float) -> void:
	if not bool(Profile.setting("reduced_flashes")):
		hitstop_clock = maxf(hitstop_clock, t)

# ================================================================== regions & exploration

func _update_region() -> void:
	var rid: String = world.region_at(player.position)
	if rid == current_region:
		return
	current_region = rid
	if rid != "" and not rid in visited_regions:
		visited_regions.append(rid)
		var r: Dictionary = GameData.REGIONS[rid]
		if hud:
			hud.banner(String(r["name"]), String(r["blurb"]), r["color"])

## First sighting of each Field Guide category teaches what it is (once per
## profile). Checked a few times a second, not every frame.
var _scan_clock: float = 0.0
var taught: Dictionary = {}

func _scan_categories(delta: float) -> void:
	_scan_clock -= delta
	if _scan_clock > 0.0 or hud == null:
		return
	_scan_clock = 0.4
	var pp: Vector2 = player.position
	for e: ForceEnemy in enemies:
		if is_instance_valid(e) and not e.dead and not e.disguised and e.position.distance_squared_to(pp) < 460.0 * 460.0:
			_teach("elite" if (e.elite or e.boss) else "hostile")
	for it: Dictionary in pickups.items:
		if Vector2(it.pos).distance_squared_to(pp) < 300.0 * 300.0:
			_teach("xp" if String(it.kind) == "mote" else "supply")
	for p: Dictionary in pois.items:
		if bool(p.known) and not bool(p.claimed) and String(p.get("hidden", "")) in ["", force_state] and Vector2(p.pos).distance_squared_to(pp) < 420.0 * 420.0:
			var cat: String = GameData.poi_category(String(p.kind), p.get("data", {}))
			if cat != "":
				_teach(cat)
	if left_gate and at_gate():
		_teach("gate")

func _teach(cat: String) -> void:
	if taught.has(cat):
		return
	if Profile.seen("cat_" + cat) or quick_test:
		taught[cat] = true
		return
	if not mission.is_empty() and String(mission.get("icon", "")) == cat and Profile.seen("stop_new_" + stop_id):
		Profile.mark_seen("cat_" + cat)
		taught[cat] = true
		return # this stop's own briefing just explained it
	# Only counts once the card is really shown; otherwise try again later.
	if hud.teach(cat):
		taught[cat] = true

func _explore_mark() -> void:
	var cell: Vector2i = Vector2i(floori(player.position.x / 400.0), floori(player.position.y / 400.0))
	for x in range(-1, 2):
		for y in range(-1, 2):
			explored[cell + Vector2i(x, y)] = true

func scanner_range() -> float:
	var r: float = 620.0 * (1.0 + 0.3 * int(weapons.passives.get("scanner", 0)) if weapons else 1.0)
	if force_state == "DRIFT":
		r *= 1.5
	if character_id == "bjorn":
		r *= 0.7
	return r

func current_region_def() -> Dictionary:
	return world.region_def(current_region)

func _environment(delta: float) -> void:
	var r: Dictionary = current_region_def()
	if bool(r.get("strikes", false)):
		strike_clock -= delta
		if strike_clock <= 0.0:
			strike_clock = rng.randf_range(1.8, 3.4)
			var p: Vector2 = player.position + Vector2.from_angle(rng.randf() * TAU) * rng.randf_range(40.0, 380.0)
			var dmg: float = 14.0
			hazards.add("strike", p, 85.0, dmg, 1.4, Color("ffe08a"), {"warn": 1.15})
	if world.in_beacon(player.position):
		player.heal(3.0 * delta)

# ================================================================== resonance state

func add_resonance(amount: float, reason: String = "") -> void:
	if amount > 0.0:
		amount *= 1.0 + 0.25 * int(weapons.passives.get("harmonics", 0)) if weapons else 1.0
	resonance = clampf(resonance + amount, 0.0, 100.0)
	if reason != "" and absf(amount) >= 5.0 and fx:
		fx.label(player.position + Vector2(0, -48), reason, Color("9ff7d0") if amount > 0.0 else Color("ff8fa8"), 15, 1.0)

func _update_state(delta: float) -> void:
	resonance = move_toward(resonance, 50.0, delta * 0.7)
	var next: String = force_state
	match force_state:
		"DRIFT":
			if resonance >= STATE_ENTER_RES:
				next = "RESONANCE"
			elif resonance <= STATE_ENTER_FRAC:
				next = "FRACTURE"
		"RESONANCE":
			if resonance < STATE_EXIT_RES:
				next = "DRIFT"
		"FRACTURE":
			if resonance > STATE_EXIT_FRAC:
				next = "DRIFT"
	if next != force_state:
		set_force_state(next)

func set_force_state(s: String) -> void:
	var prev: String = force_state
	force_state = s
	player.state = s
	if prev == s:
		return
	var info: Dictionary = {
		"RESONANCE": ["RESONANCE", "Forces in harmony: +damage, faster weapons, hidden harmonic sites appear.", Color("9ff7d0")],
		"DRIFT": ["DRIFT", "Free motion: +speed, wider scanner.", Color("a8c8ff")],
		"FRACTURE": ["FRACTURE", "Unstable: +30% damage, +50% Signal motes — but you take more damage. Hidden caches surface.", Color("ff6f8f")],
	}
	var i: Array = info[s]
	if hud:
		hud.banner(String(i[0]), String(i[1]), i[2], 2.2)
	Audio.play_sfx("state_up" if (s == "RESONANCE" or (prev == "FRACTURE")) else "state_down", 1.0, -2.0, 0.3)
	fx.ring(player.position, 30.0, 260.0, i[2], 0.7, 6.0)
	player.damage_taken_mult = (1.2 if s == "FRACTURE" else 1.0) * (1.15 if character_id == "jex_marrin" else 1.0)
	_update_music(false)

# ================================================================== enemies

func _step_enemies(delta: float) -> void:
	var veil_pos: Vector2 = Vector2(1e7, 1e7)
	var pp: Vector2 = player.position
	var view: Rect2 = Rect2(camera.get_screen_center_position() - Vector2(900, 560), Vector2(1800, 1120)) if camera else Rect2()
	var in_beacon_player: bool = world.in_beacon(pp)
	for i in range(enemies.size() - 1, -1, -1):
		var e: ForceEnemy = enemies[i]
		if e.dead or not is_instance_valid(e):
			enemies.remove_at(i)
			continue
		var target: Vector2 = veil_pos if (player_veiled > 0.0 and not e.elite and not e.boss) else pp
		e.step(delta, target)
		e.position = world.resolve(e.position, e.radius * 0.8)
		e.position = world.clamp_to_world(e.position)
		e.visible_on_screen = view.has_point(e.position)
		# Corridor beacons keep their safe volume clear.
		if in_beacon_player and not e.boss:
			for b: Dictionary in world.beacons:
				var bp: Vector2 = b.pos
				var lim: float = float(b.r) + e.radius
				if e.position.distance_squared_to(bp) < lim * lim:
					e.position = bp + (e.position - bp).normalized() * lim
		var d2: float = e.position.distance_squared_to(pp)
		var reach: float = e.radius + 16.0
		if d2 < reach * reach and e.contact_clock <= 0.0 and not e.disguised:
			if player_hit(e.contact_damage, e.position):
				e.contact_clock = 0.9
		# Despawn far, idle wanderers to keep the world light.
		if d2 > 1700.0 * 1700.0 and not e.engaged and not e.elite and not e.boss and e.camp < 0:
			e.dead = true
			e.queue_free()
			enemies.remove_at(i)

func spawn_enemy(kind: String, pos: Vector2, engaged: bool = false, camp_member: bool = false) -> ForceEnemy:
	var cap: int = MAX_ENEMIES + (30 if camp_member else 0)
	if enemies.size() >= cap and not GameData.ENEMIES[kind].get("elite", false) and not GameData.ENEMIES[kind].get("boss", false):
		return null
	var e: ForceEnemy = ForceEnemy.new()
	e.position = world.clamp_to_world(pos)
	var scale: float = (1.0 + minf(1.6, elapsed / (420.0 if not quick_test else 60.0) * 0.35)) * route_depth()
	e.configure(kind, self, scale, world.region_at(pos))
	if engaged:
		e.engaged = true
	e.died.connect(_on_enemy_died)
	enemy_layer.add_child(e)
	enemies.append(e)
	return e

func _spawn_director(delta: float) -> void:
	if boss_spawned and not boss_defeated:
		spawn_clock -= delta
		if spawn_clock <= 0.0:
			spawn_clock = 4.0
			if enemies.size() < 18:
				_spawn_near_player("skiff", true)
		return
	var r: Dictionary = current_region_def()
	var threat: int = int(r.get("threat", 1))
	var target: float = [9.0, 12.0, 18.0, 24.0][threat]
	target += elapsed / (110.0 if not quick_test else 20.0)
	match force_state:
		"RESONANCE":
			target *= 0.8
		"FRACTURE":
			target *= 1.3
	if quick_test:
		target *= 1.4
	spawn_clock -= delta
	if spawn_clock <= 0.0:
		spawn_clock = 0.55 if not quick_test else 0.3
		var ambient: int = enemies.reduce(func(acc: int, e: ForceEnemy) -> int: return acc + (1 if e.camp < 0 else 0), 0)
		if float(ambient) < minf(target, MAX_ENEMIES - 10):
			var engaged: bool = rng.randf() < clampf(0.3 + elapsed / 1500.0, 0.3, 0.65)
			_spawn_near_player("", engaged)
	patrol_clock -= delta
	if patrol_clock <= 0.0:
		patrol_clock = rng.randf_range(42.0, 66.0) * (0.4 if quick_test else 1.0) * (1.25 if force_state == "RESONANCE" else 1.0) * (0.7 if character_id == "brandon_mack" else 1.0)
		spawn_patrol()
	if not elite_times.is_empty() and elapsed >= float(elite_times[0]) * (0.25 if quick_test else 1.0):
		elite_times.pop_front()
		spawn_elite()
	var dread_at: float = 480.0 if not quick_test else 40.0
	if not mission.is_empty():
		var mo: Dictionary = mission["objective"]
		dread_at = float(mo.get("at", 60.0)) if String(mo["type"]) == "elite" else INF
	if not dreadnought_spawned and elapsed >= dread_at:
		dreadnought_spawned = true
		var dp: Vector2 = world.random_open_point_near(player.position, view_radius() + 40.0, view_radius() + 160.0, rng)
		var ekind: String = "dreadnought"
		if not mission.is_empty() and String(mission["objective"]["type"]) == "elite":
			ekind = String(mission["objective"].get("enemy", "dreadnought"))
		spawn_enemy(ekind, dp, true)
		if hud:
			var ename: String = String(GameData.ENEMIES[ekind]["name"]).to_upper()
			hud.alert(ename, dp)
			hud.banner(ename, "A salvage hulk has picked up your trail. Watch its broadsides." if ekind == "dreadnought" else "It has picked up your trail. Watch its broadsides.", Color("e0a060"), 2.6)
		Audio.stinger("boss_phase", -2.0)
	var climax_time: float = float(GameData.DESTINATIONS[destination_id]["climax_time"]) * (0.08 if quick_test else 1.0)
	if not mission.is_empty():
		# Stops have one objective; The Silence only comes to its own stop.
		climax_time = float(mission["objective"].get("at", 300.0)) if is_boss_stop() else INF
	_check_objective()
	if not boss_spawned and not climax_warned and elapsed >= climax_time - 90.0 * (0.1 if quick_test else 1.0):
		climax_warned = true
		hud.banner("THE HUSH IS SPREADING", "Signals are going quiet. Finish what you came for — The Silence is coming.", Color("ff376f"), 3.0)
	if not boss_spawned and elapsed >= climax_time:
		spawn_boss(player.position + Vector2.from_angle(rng.randf() * TAU) * 520.0)

func _spawn_near_player(kind: String, engaged: bool) -> void:
	var pos: Vector2 = world.random_open_point_near(player.position, view_radius(), view_radius() + 200.0, rng)
	var k: String = kind
	if k == "":
		k = _pick_kind(world.region_def(world.region_at(pos)))
	spawn_enemy(k, pos, engaged)

func _pick_kind(r: Dictionary) -> String:
	var table: Dictionary = r.get("enemies", {"skiff": 1.0}).duplicate()
	# Newer threats join the mix only after the opening minutes.
	for k0: String in table.keys():
		if elapsed * (6.0 if quick_test else 1.0) < float(GameData.ENEMIES[k0].get("min_time", 0.0)):
			table.erase(k0)
	if table.is_empty():
		table = {"skiff": 1.0}
	var total: float = 0.0
	for k: String in table.keys():
		total += float(table[k])
	var roll: float = rng.randf() * total
	for k: String in table.keys():
		roll -= float(table[k])
		if roll <= 0.0:
			return k
	return "skiff"

func spawn_patrol() -> void:
	var dir: float = rng.randf() * TAU
	var center: Vector2 = world.clamp_to_world(player.position + Vector2.from_angle(dir) * 700.0)
	var n: int = 4 + int(elapsed / 300.0) + (2 if force_state == "FRACTURE" else 0)
	var r: Dictionary = current_region_def()
	for i in n:
		var k: String = _pick_kind(r) if i % 2 == 0 else "skiff"
		if k == "wreck_lurker":
			k = "ram_cutter"
		spawn_enemy(k, center + Vector2.from_angle(TAU * i / n) * 80.0, true)
	if hud:
		hud.alert("PATROL INBOUND", center)
	Audio.play_sfx("ping", 0.8, -4.0, 0.5)

func spawn_elite() -> void:
	var p: Vector2 = world.random_open_point_near(player.position, view_radius(), view_radius() + 120.0, rng)
	spawn_enemy("splinter_captain", p, true)
	for i in 3:
		spawn_enemy("skiff", p + Vector2.from_angle(TAU * i / 3.0) * 70.0, true)
	if hud:
		hud.alert("SPLINTER CAPTAIN", p)
	Audio.play_sfx("boss_phase", 1.3, -4.0, 0.5)

func boss_name() -> String:
	return String(GameData.biome_get(world.biome if world else "space", "boss_name", "THE SILENCE"))

func route_depth() -> float:
	return 1.0 + minf(DEPTH_MAX, DEPTH_PER_STAGE * float(Profile.stops_done_count()))

func spawn_boss(pos: Vector2) -> void:
	if boss_spawned:
		return
	boss_spawned = true
	boss = spawn_enemy("the_silence", world.random_open_point_near(pos, 0.0, 60.0, rng), true)
	if boss and is_boss_stop():
		boss.hp *= float(mission["objective"].get("hp", 1.0)) * (0.75 if steady else 1.0)
		boss.max_hp = boss.hp
	if boss and quick_test:
		boss.hp *= 0.2
		boss.max_hp = boss.hp
	if hud:
		hud.banner(boss_name(), "It isn't hunting ships. It's hunting songs. Keep playing." if boss_name() == "THE SILENCE" else "The Silence, in this realm's shape. Keep playing.", Color("ff376f"), 3.2)
	Audio.stinger("boss_appear", 0.0)
	shake(12.0)
	_update_music(false)

func nearest_enemy(pos: Vector2, max_dist: float = 99999.0) -> ForceEnemy:
	var best: ForceEnemy = null
	var best_d: float = max_dist * max_dist
	for e: ForceEnemy in enemies:
		if e.dead or e.disguised:
			continue
		var d: float = pos.distance_squared_to(e.position)
		if d < best_d:
			best_d = d
			best = e
	return best

## Prefers elites/bosses in range, otherwise nearest — lances aim at threats.
func strongest_enemy(pos: Vector2, max_dist: float) -> ForceEnemy:
	var best: ForceEnemy = null
	var best_score: float = -1.0
	for e: ForceEnemy in enemies:
		if e.dead or e.disguised:
			continue
		var d: float = pos.distance_to(e.position)
		if d > max_dist:
			continue
		var score: float = (3.0 if (e.elite or e.boss) else 1.0) * (1.0 - d / max_dist) + e.max_hp / 4000.0
		if score > best_score:
			best_score = score
			best = e
	return best

func damage_enemy(e: ForceEnemy, amount: float, dir: Vector2, knock: float, weapon_id: String, quiet: bool = false) -> void:
	if e.dead:
		return
	var weapon_hit: bool = weapon_id != "environment" and weapon_id != "ability" and weapon_id != ""
	var mult: float = weapons.target_multiplier(e, weapon_id) if weapon_hit else 1.0
	var crit: bool = weapon_hit and not quiet and randf() < player.crit_chance
	if crit:
		mult *= 2.0
	var dealt: float = e.take_damage(amount * mult, dir, knock)
	if GameData.weapon_force(weapon_id) == "robots_sing_love_songs":
		e.harmony_mark = true
	if crit and not e.dead:
		fx.label(e.position + Vector2(0, -e.radius - 18.0), "CRIT %d" % int(dealt), Color("ffe08a"), 20, 0.7)
		fx.flash(e.position, e.radius * 1.4, Color("ffe08a"), 0.1)
	damage_dealt += dealt
	combat_heat = minf(1.0, combat_heat + 0.02)
	if weapon_id != "environment" and weapon_id != "ability":
		weapons.on_hit(weapon_id)
	e.last_hit_dir = dir if dir != Vector2.ZERO else (e.position - player.position).normalized()
	if not quiet:
		var col: Color = GameData.FORCES.get(GameData.weapon_force(weapon_id), {}).get("color", Color.WHITE)
		var heavy: bool = dealt > 60.0
		# One number per enemy per quarter-second keeps area hits readable.
		if elapsed - e.last_number_time > 0.25 or heavy and e.elite:
			e.last_number_time = elapsed
			fx.number(e.position + Vector2(0, -e.radius), dealt, Color.WHITE.lerp(col, 0.35), heavy)
		fx.impact(e.position - e.last_hit_dir * e.radius * 0.6, e.last_hit_dir, col, heavy)
		Audio.play_sfx("hit", randf_range(0.9, 1.15), -14.0, 0.05)
	elif randf() < 0.08:
		fx.spark_spray(e.position, e.last_hit_dir, Color.WHITE.lerp(GameData.FORCES.get(GameData.weapon_force(weapon_id), {}).get("color", Color.WHITE), 0.5), 1, 300.0, 1.2)

func _on_enemy_died(e: ForceEnemy) -> void:
	enemies.erase(e)
	if not mission.is_empty() and String(mission["objective"]["type"]) == "elite" and e.kind == String(mission["objective"]["enemy"]):
		complete_stop()
	kills += 1
	weapons.on_kill()
	var glow: int = int(weapons.passives.get("afterglow", 0))
	if glow > 0:
		player.heal(0.4 * glow)
	add_resonance(0.12 if not e.elite else 6.0)
	var val: int = e.xp_value
	if force_state == "FRACTURE":
		val = int(ceil(val * 1.5))
	if e.boss:
		_on_boss_defeated(e)
	elif e.elite:
		if e.kind == "dreadnought":
			pending_levels += 1
			for i in 10:
				pickups.drop("mote", e.position + Vector2.from_angle(TAU * i / 10.0) * 40.0, 4)
			if hud:
				hud.toast("DREADNOUGHT BROKEN — salvage everywhere")
		for i in 6:
			pickups.drop("mote", e.position, maxi(1, val / 6))
		pickups.drop("repair", e.position + Vector2(20, 0))
		pending_levels += 1
		fx.big_kill(e.position, e.tint, e.radius)
		shake(9.0)
		punch(0.06)
		hitstop(0.07)
		Audio.play_sfx("kill_big", 1.0, -2.0, 0.1)
	else:
		pickups.drop("mote", e.position, val)
		var roll: float = rng.randf()
		if roll < 0.012:
			pickups.drop("repair", e.position)
		elif roll < 0.018:
			pickups.drop("magnet", e.position)
		fx.kill(e.position, e.last_hit_dir, e.tint, e.radius)
		Audio.play_sfx("kill", randf_range(0.85, 1.2), -9.0, 0.04)
	e.queue_free()

func _on_boss_defeated(e: ForceEnemy) -> void:
	boss_defeated = true
	if is_boss_stop():
		complete_stop()
	projectiles.clear_hostile()
	hazards.clear()
	for i in 20:
		pickups.drop("mote", e.position, 6)
	fx.big_kill(e.position, e.tint, e.radius)
	fx.shatter(e.position, Color("2a1020"), 30, 600.0, 22.0)
	punch(0.12)
	for k in 4:
		fx.ring(e.position, 20.0, 260.0 + k * 120.0, Color.WHITE.lerp(e.tint, k * 0.25), 0.8 + k * 0.2, 8.0)
	shake(16.0)
	hitstop(0.2)
	Audio.stinger("boss_die", 0.0)
	if hud:
		hud.banner("SIGNAL RESTORED", "The Silence breaks apart. The Reach can hear itself again.", Color("9ff7d0"), 3.5)
	pickups.attract_all()
	victory_clock = 4.5
	_update_music(false)

# ------------------------------------------------------------------ enemy callbacks

func on_ambush(e: ForceEnemy) -> void:
	fx.ring(e.position, 10.0, 70.0, Color("ffcf8a"), 0.35, 3.0)
	Audio.play_sfx("ping", 1.4, -8.0, 0.2)

func enemy_summon(src: ForceEnemy, kind: String, n: int) -> void:
	for i in n:
		spawn_enemy(kind, src.position + Vector2.from_angle(rng.randf() * TAU) * (src.radius + 20.0), true)
	fx.ring(src.position, src.radius, src.radius + 50.0, src.tint, 0.35, 3.0)

func spawn_hazard(pos: Vector2, radius: float, dmg: float, life: float, color: Color) -> void:
	hazards.add("pool", pos, radius, dmg, life, color)

func enemy_shield_pulse(src: ForceEnemy, radius: float) -> void:
	for e: ForceEnemy in enemy_hash.query(src.position, radius):
		if e != src and not e.dead and e.position.distance_to(src.position) < radius:
			e.shielded = 1.2

func spawn_enemy_shot(pos: Vector2, vel: Vector2, dmg: float, color: Color) -> void:
	projectiles.spawn(pos, vel, dmg, 4.0, 8.0, color, {"hostile": true})
	Audio.play_sfx("enemy_shot", randf_range(0.9, 1.1), -12.0, 0.08)

func spawn_shockwave(pos: Vector2, radius: float, dmg: float, color: Color) -> void:
	hazards.add("wave", pos, radius, dmg, 0.5, color)
	shake(4.0)

func spawn_beam(pos: Vector2, dir: Vector2, length: float, width: float, dmg: float, color: Color) -> void:
	hazards.add("beam", pos, width, dmg, 0.35, color, {"dir": dir, "length": length})
	shake(6.0)

func spawn_silence_zone(pos: Vector2, radius: float, life: float) -> void:
	hazards.add("silence", world.clamp_to_world(pos), radius, 0.0, life, Color("ff376f"))

func on_boss_phase(e: ForceEnemy, phase: int) -> void:
	Audio.stinger("boss_phase", -2.0)
	var text: Array = ["", "", "It learns the rhythm of your weapons.", "It reaches for the quiet between notes — weapons fall silent in its zones."]
	if hud:
		hud.banner("%s — PHASE %d" % [boss_name(), phase], String(text[phase]), Color("ff376f"), 2.4)
	fx.ring(e.position, e.radius, 400.0, e.tint, 0.8, 8.0)
	shake(10.0)

func clear_hostile_shots_near(pos: Vector2, radius: float) -> void:
	for s: ProjectileSystem.Shot in projectiles.shots:
		if s.hostile and s.active and s.pos.distance_to(pos) < radius:
			s.active = false

# ================================================================== player

func player_hit(amount: float, from: Vector2) -> bool:
	if ended or victory_clock > 0.0:
		return false
	if not player.hurt(amount):
		return false
	add_resonance(-6.0)
	since_hurt = 0.0
	weapons.on_player_hurt()
	shake(7.0)
	fx.burst(player.position, Color("ff6f8f"), 10, 240.0)
	fx.spark_spray(player.position, (player.position - from).normalized() if from != Vector2.ZERO else Vector2.ZERO, Color("ffb0c0"), 10, 520.0, 1.0)
	fx.flash(player.position, 34.0, Color("ff6f8f"), 0.12)
	Audio.play_sfx("hurt", randf_range(0.95, 1.05), -2.0, 0.1)
	if hud:
		hud.flash_damage()
	if not player.alive:
		if not second_wind_used and Profile.workshop_rank("second_wind") > 0:
			second_wind_used = true
			player.alive = true
			player.hp = player.max_hp * 0.4
			player.invuln = 2.0
			projectiles.clear_hostile()
			fx.ring(player.position, 20.0, 340.0, Color.WHITE, 0.8, 8.0)
			if hud:
				hud.banner("SECOND WIND", "Hull restored. Make it count.", Color.WHITE, 2.0)
		else:
			end_run("defeat")
	if from != Vector2.ZERO:
		player.velocity += (player.position - from).normalized() * 160.0
	return true

func gain_xp(value: int) -> void:
	motes_collected += 1
	if not mission.is_empty() and not stop_complete and motes_collected == int(mission.get("power", 0)) and String(mission["objective"]["type"]) == "discover":
		Audio.stinger("discovery", -4.0)
		# The charged tuner fixes the signal's exact position.
		for p: Dictionary in pois.items:
			if is_stop_target(String(p.id)) and String(p.hidden) == "":
				p.known = true
		if hud:
			hud.banner("SIGNAL LOCATED", "Follow the gold arrow", Color("ffd75e"), 2.5)
	add_resonance(0.06)
	if character_id == "tessa_banks":
		var every: int = 30 if mastery_level >= 1 else 40
		if motes_collected % every == 0:
			player.heal(4.0)
			fx.label(player.position + Vector2(0, -40), "+4", Color("7dffb2"), 14, 0.7)
	var amount: int = int(round(value * (2.5 if quick_test else 1.0)))
	xp += amount
	while xp >= xp_need:
		xp -= xp_need
		level += 1
		xp_need = GameData.xp_required(level)
		pending_levels += 1

func _open_level_up() -> void:
	if ended:
		return
	pending_levels -= 1
	upgrades_offered += 1
	var count: int = 3 # always three (playtest: four was too many)
	var options: Array = weapons.choices(count, attuned)
	if options.is_empty():
		player.heal(20.0)
		return
	choosing = true
	Audio.play_sfx("levelup", 1.0, -2.0, 0.2)
	fx.ring(player.position, 20.0, 200.0, Color("ffe08a"), 0.6, 5.0)
	if hud:
		hud.show_level_up(options)
	get_tree().paused = true

func reroll_choices() -> Array:
	var free: bool = character_id == "jex_marrin" and not bool(hud.free_reroll_used if hud else true)
	if rerolls <= 0 and not free:
		return []
	if free:
		hud.free_reroll_used = true
	else:
		rerolls -= 1
	var count: int = 3 # always three (playtest: four was too many)
	return weapons.choices(count, attuned)

func choose_upgrade(option: Dictionary) -> void:
	weapons.apply_choice(option)
	weapons.apply_passives()
	choosing = false
	get_tree().paused = false
	var t: String = String(option["type"])
	if t == "evolution":
		Audio.stinger("evolve", 0.0)
		fx.ring(player.position, 20.0, 300.0, Color("ffe08a"), 0.8, 8.0)
		if hud:
			hud.banner("EVOLVED: " + GameData.weapon_name(String(option["id"])), String(GameData.EVOLUTIONS[String(option["id"])]["desc"]), Color("ffe08a"), 2.6)
	else:
		Audio.play_sfx("choose", 1.0, -3.0, 0.1)
	player.invuln = maxf(player.invuln, 0.6)

## Naomi's Corridor Sense: every hazard area (strikes, pools, waves, beams,
## silence) hurts her half as much.
func hazard_damage_mult() -> float:
	return 0.5 if character_id == "naomi_sol" else 1.0

func ability_damage_mult() -> float:
	return 1.4 if damage_boost > 0.0 else 1.0

# ================================================================== abilities

func ability_def() -> Dictionary:
	return GameData.ABILITIES[String(GameData.CHARACTERS[character_id]["ability"])]

func ability_cooldown() -> float:
	var cd: float = float(ability_def()["cooldown"])
	match character_id:
		"ella_venn", "bjorn", "lucia", "brandon_mack", "sir_eric":
			if mastery_level >= 4:
				cd -= 4.0
		"jax_orien":
			if mastery_level >= 4:
				cd -= 5.0
		"tessa_banks":
			if mastery_level >= 4:
				cd -= 6.0
		"abby_saville":
			if mastery_level >= 4:
				cd -= 4.0
	return cd

func ability_ready() -> bool:
	return ability_charges > 0 and ability_cd <= 0.0 or (ability_charges > 0 and character_id == "naomi_sol" and _naomi_has_charge())

var _naomi_charges: int = 0
func _naomi_has_charge() -> bool:
	return _naomi_charges > 0

func use_ability() -> bool:
	if ended or choosing:
		return false
	var id: String = String(GameData.CHARACTERS[character_id]["ability"])
	if id == "corridor_run":
		var max_charges: int = 2 if mastery_level >= 1 else 1
		if _naomi_charges <= 0:
			# Charges refill together once the cooldown has run out.
			if ability_cd > 0.0:
				return false
			_naomi_charges = max_charges
		_naomi_charges -= 1
		if _naomi_charges <= 0:
			ability_cd = ability_cooldown()
	else:
		if ability_cd > 0.0:
			return false
		ability_cd = ability_cooldown()
	Audio.play_sfx("ability", 1.0, -2.0, 0.1)
	match id:
		"hold_the_line":
			ability_active = 5.0 + (1.0 if mastery_level >= 1 else 0.0)
			fx.ring(player.position, 20.0, 190.0, Color("8fd3ff"), 0.5, 8.0)
		"corridor_run":
			var dir: Vector2 = player.move_input.normalized() if player.move_input.length() > 0.1 else Vector2.from_angle(player.facing)
			var start: Vector2 = player.position
			player.velocity = dir * 1250.0
			player.invuln = maxf(player.invuln, 0.4)
			var end_pos: Vector2 = world.resolve(world.clamp_to_world(start + dir * 300.0), 18.0)
			var dmg: float = 45.0 * (2.0 if mastery_level >= 2 else 1.0) * player.damage_mult
			for e: ForceEnemy in enemy_hash.query((start + end_pos) * 0.5, 190.0).duplicate():
				var rel: Vector2 = e.position - start
				if not e.dead and rel.dot(dir) > -20.0 and rel.dot(dir) < 320.0 and absf(rel.cross(dir)) < 40.0 + e.radius:
					damage_enemy(e, dmg, dir.orthogonal() * (1.0 if rel.cross(dir) > 0.0 else -1.0), 220.0, "ability")
			fx.beam(start, end_pos, Color("c6e27a"), 0.35, 16.0)
			if mastery_level >= 4:
				damage_boost = 1.5
		"seal_the_breach":
			player.heal(player.max_hp * 0.35)
			player.max_shield = 40.0
			player.shield = 40.0
			ability_active = 4.0
			if mastery_level >= 2:
				add_resonance(20.0, "+RESONANCE")
			fx.ring(player.position, 20.0, 140.0, Color("7dffb2"), 0.6, 6.0)
		"call_the_captains":
			# Allied Shard cutters answer Abby's call and hold a ring around her.
			var n: int = 4 if mastery_level >= 2 else 3
			allies.clear()
			for i in n:
				allies.append({"angle": TAU * i / n, "clock": 0.2 * i})
			ally_time = 8.0 + (2.0 if mastery_level >= 1 else 0.0)
			fx.ring(player.position, 20.0, 160.0, Color("d8323a"), 0.6, 6.0)
			if hud:
				hud.toast("SHARD CAPTAINS ANSWER THE CALL")
		"requisition":
			# Fodder and the skeleton legion: a ring of spears around Sir Eric.
			var nsk: int = 4 if mastery_level >= 2 else 3
			allies.clear()
			for i in nsk:
				allies.append({"angle": TAU * i / nsk, "clock": 0.2 * i, "kind": "skeleton"})
			ally_time = 8.0 + (2.0 if mastery_level >= 1 else 0.0)
			fx.ring(player.position, 20.0, 160.0, Color("b0243a"), 0.6, 6.0)
			if hud:
				hud.toast("REQUISITION APPROVED")
		"shield_wall":
			ability_active = 6.0 + (2.0 if mastery_level >= 1 else 0.0)
			allies.clear()
			allies.append({"angle": 0.0, "clock": 0.1, "kind": "gunnar"})
			ally_time = ability_active
			fx.ring(player.position, 20.0, 170.0, Color("c9a46a"), 0.5, 8.0)
			if hud:
				hud.toast("SHIELD WALL — GUNNAR COMES ALONGSIDE")
		"all_hands":
			# Mandatory proximity: everyone into one corridor.
			var knot: Vector2 = player.position + Vector2.from_angle(player.facing) * 160.0
			var reach: float = 360.0 + (140.0 if mastery_level >= 1 else 0.0)
			for e: ForceEnemy in enemy_hash.query(player.position, reach).duplicate():
				if e.dead or e.boss:
					continue
				if e.position.distance_to(player.position) < reach + e.radius:
					e.knock += (knot - e.position) * 3.2
					e.slow = maxf(e.slow, 1.2)
					e.harmony_mark = true
					e.meeting_mark = 5.0
			player.heal(20.0 + (20.0 if mastery_level >= 2 else 0.0))
			fx.ring(knot, reach, 30.0, Color("ffce5c"), 0.45, 6.0)
			fx.label(player.position + Vector2(0, -44), "ZIB: PATCHED", Color("ffce5c"), 18, 1.0)
			if hud:
				hud.toast("ALL-HANDS MEETING — ATTENDANCE MANDATORY")
		"build_another_way":
			relay_pos = player.position
			relay_time = 10.0 + (4.0 if mastery_level >= 1 else 0.0)
			relay_clock = 0.2
			fx.ring(relay_pos, 20.0, 120.0, Color("e58a2b"), 0.5, 6.0)
			if hud:
				hud.toast("LAUNCH-SHOP RELAY UP — NO TETHERGRID FEE")
		"high_noon":
			var cap: int = 18 if mastery_level >= 1 else 12
			var dmg: float = 70.0 * (1.5 if mastery_level >= 2 else 1.0) * player.damage_mult
			var targets: Array = []
			for e: ForceEnemy in enemies:
				if is_instance_valid(e) and not e.dead and not e.disguised and e.position.distance_to(player.position) < 760.0:
					targets.append(e)
			targets.sort_custom(func(a: ForceEnemy, b: ForceEnemy) -> bool: return a.position.distance_squared_to(player.position) < b.position.distance_squared_to(player.position))
			for e: ForceEnemy in targets.slice(0, cap):
				e.slow = maxf(e.slow, 1.5)
				fx.beam(player.position, e.position, Color("ffcf8a"), 0.22, 3.0)
				damage_enemy(e, dmg * (2.0 if e.elite or e.boss else 1.0), player.position.direction_to(e.position), 180.0, "ability")
			fx.flash(player.position, 120.0, Color("ff9b3d"), 0.15)
			shake(6.0)
		"veil_step":
			player_veiled = 4.0 + (2.0 if mastery_level >= 3 else 0.0)
			for e: ForceEnemy in enemies:
				if not e.elite and not e.boss:
					e.engaged = false
					e.home = e.position
			fx.ring(player.position, 20.0, 160.0, Color("ffcf7a"), 0.5, 4.0)
	return true

## Lucia's Launch-Shop relay: a planted station that fires homemade rockets
## and pulls shards in.
func _step_relay(delta: float) -> void:
	if relay_time <= 0.0:
		return
	relay_time -= delta
	relay_clock -= delta
	for it: Dictionary in pickups.items:
		var d: float = Vector2(it.pos).distance_to(relay_pos)
		if d < 420.0:
			it.pos = Vector2(it.pos).move_toward(player.position, 520.0 * delta)
	if relay_clock <= 0.0:
		relay_clock = 0.55
		var shots: int = 2 if mastery_level >= 2 else 1
		for k in shots:
			var t: ForceEnemy = nearest_enemy(relay_pos, 520.0)
			if t:
				var dir: Vector2 = relay_pos.direction_to(t.position).rotated((k - 0.5) * 0.3 if shots > 1 else 0.0)
				projectiles.spawn(relay_pos + Vector2(0, -26), dir * 520.0, 34.0 * player.damage_mult, 1.2, 7.0, Color("e58a2b"), {"weapon": "", "knock": 140.0})

func ally_position(a: Dictionary) -> Vector2:
	if String(a.get("kind", "")) == "gunnar":
		# Gunnar keeps station at Bjorn's shoulder.
		return player.position + Vector2.from_angle(player.facing + PI / 2.0) * 58.0 - Vector2.from_angle(player.facing) * 14.0
	return player.position + Vector2.from_angle(float(a.angle) + elapsed * 1.4) * 115.0

func _step_allies(delta: float) -> void:
	if ally_time <= 0.0:
		if not allies.is_empty():
			allies.clear()
		return
	ally_time -= delta
	for a: Dictionary in allies:
		a.clock = float(a.clock) - delta
		if float(a.clock) <= 0.0:
			var gunnar: bool = String(a.get("kind", "")) == "gunnar"
			a.clock = (0.22 if mastery_level >= 2 else 0.4) if gunnar else 0.45
			var p: Vector2 = ally_position(a)
			var t: ForceEnemy = nearest_enemy(p, 480.0)
			if t:
				projectiles.spawn(p, p.direction_to(t.position) * 600.0, (20.0 if gunnar else 16.0) * player.damage_mult, 1.0, 6.0, Color("c9a46a") if gunnar else Color("ff5a5f"), {"weapon": "", "knock": 80.0 if gunnar else 60.0})

func _update_ability(delta: float) -> void:
	_step_allies(delta)
	ability_cd = maxf(0.0, ability_cd - delta)
	damage_boost = maxf(0.0, damage_boost - delta)
	player_veiled = maxf(0.0, player_veiled - delta)
	if character_id == "jex_marrin":
		player.speed_mult = (1.0 + 0.07 * int(weapons.passives.get("thrusters", 0))) * float(start_bonuses.get("speed_mult", 1.0)) * (1.35 if player_veiled > 0.0 else 1.0)
	if ability_active > 0.0:
		ability_active -= delta
		match character_id:
			"ella_venn":
				var r: float = 190.0
				clear_hostile_shots_near(player.position, r)
				player.heal(6.0 * delta)
				for e: ForceEnemy in enemy_hash.query(player.position, r).duplicate():
					if e.dead:
						continue
					var d: float = e.position.distance_to(player.position)
					if d < r + e.radius:
						e.slow = maxf(e.slow, 0.3)
						if not e.boss:
							e.knock += (e.position - player.position).normalized() * 900.0 * delta
						if mastery_level >= 2:
							damage_enemy(e, 25.0 * delta * player.damage_mult, Vector2.ZERO, 0.0, "ability", true)
			"tessa_banks":
				if ability_active <= 0.0:
					player.max_shield = 0.0
					player.shield = 0.0
			"bjorn":
				# Shield wall: a forward half-circle that stops shots and shoves.
				var fwd: Vector2 = Vector2.from_angle(player.facing)
				var r2: float = 170.0
				clear_hostile_shots_near(player.position + fwd * 60.0, 120.0)
				for e: ForceEnemy in enemy_hash.query(player.position, r2).duplicate():
					if e.dead:
						continue
					var rel: Vector2 = e.position - player.position
					if rel.length() < r2 + e.radius and rel.dot(fwd) > 0.0:
						e.slow = maxf(e.slow, 0.4)
						if not e.boss:
							e.knock += rel.normalized() * 1100.0 * delta
	_step_relay(delta)
	if character_id == "lucia":
		since_hurt += delta
		if since_hurt > (2.5 if mastery_level >= 3 else 4.0) and player.hp < player.max_hp:
			player.heal(2.0 * delta)
	if Input.is_action_just_pressed("ability"):
		use_ability()

# ================================================================== points of interest

func on_poi_spotted(p: Dictionary) -> void:
	if String(p.kind) in ["artifact", "character", "fragment", "anomaly", "fracture_cache"]:
		if hud:
			hud.toast("SCANNER: %s detected" % String(p.title))
		Audio.play_sfx("ping", 1.2, -10.0, 0.4)

func on_poi_claimed(p: Dictionary) -> void:
	var kind: String = String(p.kind)
	match kind:
		"cache":
			pickups.drop("repair", p.pos)
			if character_id == "bjorn":
				pickups.drop("repair", Vector2(p.pos) + Vector2(24, 0))
			for i in 5:
				pickups.drop("mote", Vector2(p.pos) + Vector2.from_angle(TAU * i / 5.0) * 20.0, 2 + int(elapsed / 240.0))
			if rng.randf() < 0.35 or (character_id == "jex_marrin" and mastery_level >= 1):
				pickups.drop("magnet", p.pos)
			fx.burst(p.pos, p.color, 12, 200.0)
			Audio.play_sfx("heal", 1.3, -6.0)
		"fracture_cache":
			pending_levels += 1
			for i in 8:
				pickups.drop("mote", p.pos, 4 + int(elapsed / 180.0))
			fx.ring(p.pos, 10.0, 180.0, p.color, 0.6, 6.0)
			Audio.play_sfx("discovery", 1.3, -3.0)
			if hud:
				hud.toast("FRACTURE CACHE: unstable salvage recovered")
		"resonator":
			add_resonance(35.0, "+RESONANCE")
			player.heal(15.0)
			fx.ring(p.pos, 20.0, 220.0, p.color, 0.8, 6.0)
			Audio.play_sfx("state_up", 1.2, -4.0)
		"echo":
			echoes_tuned += 1
			pending_levels += 1
			add_resonance(10.0, "+RESONANCE")
			bonus_currency += 8
			fx.ring(p.pos, 20.0, 300.0, p.color, 0.8, 6.0)
			Audio.stinger("discovery", -4.0)
			var note: String = "An echo of %s — an upgrade and +8 Signal." % String(GameData.FORCES[String(p.force)]["name"])
			# Rarely an echo carries a fragment of the mystery.
			for fid2: String in ["frag_drift", "frag_corridor", "frag_wrecks"]:
				if not Profile.is_discovered(fid2) and not fid2 in discoveries and rng.randf() < 0.35:
					discoveries.append(fid2)
					new_this_run.append(fid2)
					note += "\nIt carries a log fragment: " + String(GameData.DISCOVERIES[fid2]["text"])
					break
			if hud:
				hud.discovery_card("ECHO TRANSMISSION", note, p.color, false, "echo")
		"relay":
			fx.ring(p.pos, 10.0, 160.0, p.color, 0.5, 5.0)
			Audio.play_sfx("choose", 1.2, -4.0)
			if hud:
				hud.toast("RELAY SECTION ONLINE")
		"rift":
			add_resonance(-38.0, "-RESONANCE")
			for i in 6:
				pickups.drop("mote", p.pos, 3 + int(elapsed / 200.0))
			fx.burst(p.pos, p.color, 22, 320.0)
			shake(5.0)
			Audio.play_sfx("state_down", 0.8, -3.0)
		_:
			_claim_discovery(p)

func _claim_discovery(p: Dictionary) -> void:
	var id: String = String(p.id)
	var d: Dictionary = p.data
	if not id in discoveries:
		discoveries.append(id)
		checkpoint_due = true
		if not mission.is_empty() and String(mission["objective"]["type"]) == "discover" and String(mission["objective"]["id"]) == id:
			complete_stop()
		if not Profile.is_discovered(id):
			new_this_run.append(id)
	var first_time: bool = id in new_this_run
	# The tuning pulse clears breathing room so the moment can be read.
	for e: ForceEnemy in enemy_hash.query(p.pos, 320.0).duplicate():
		if not e.dead and not e.boss and e.position.distance_to(p.pos) < 320.0:
			e.knock += (e.position - Vector2(p.pos)).normalized() * 520.0
			e.slow = maxf(e.slow, 1.5)
	add_resonance(14.0 if String(p.kind) == "signal" else 8.0, "+RESONANCE")
	Audio.stinger("discovery", 0.0)
	fx.ring(p.pos, 20.0, 340.0, p.color, 1.0, 8.0)
	fx.burst(p.pos, p.color, 30, 340.0, 4.0, 0.9)
	var detail: String = String(d.get("text", ""))
	var heading: String = String(p.title)
	var gains: Array[String] = [] # "What you got" lines for the card.
	var att: String = ""
	match String(p.kind):
		"signal":
			var t: Dictionary = GameData.TRANSMISSIONS.get(String(d.get("transmission", "")), {})
			if not t.is_empty():
				heading = "%s — %s" % [String(t["project"]).to_upper(), String(t["title"])]
				if String(d.get("force", "")) == "":
					gains.append("Record: %s" % String(t["project"]))
				gains.append("Track: %s" % String(t["title"]))
			att = _attune(String(d.get("force", "")))
			if mission.is_empty():
				var left: int = goal_signals() - signals_found()
				gains.append("SIGNALS %d / %d — %s" % [signals_found(), goal_signals(), ("%d more to call out The Silence." % left) if left > 0 else "The Silence can be called out at the gate."])
		"character":
			if d.has("seam"):
				var found_seams: int = 1 + GameData.seams().filter(func(sid: String) -> bool: return Profile.is_discovered(sid) and sid != String(p.id)).size()
				gains.append(String(d["text"]))
				gains.append("Seam %d / %d — logged in the Mystery" % [found_seams, GameData.seams().size()])
			var cid: String = String(d.get("unlock_character", ""))
			if cid != "" and not Profile.has_character(cid):
				gains.append("Explorer: %s (next expedition)" % GameData.CHARACTERS[cid]["name"])
			for ct: Variant in d.get("contacts", []):
				var cdef2: Dictionary = GameData.CONTACTS[String(ct)]
				var capn: String = String(cdef2.get("captain", ""))
				if GameData.CHARACTERS.has(capn) and cdef2.has("perk"):
					gains.append("Crew: %s rides with %s (%s)" % [String(cdef2["name"]), String(GameData.CHARACTERS[capn]["short"]), GameData.perk_text(cdef2["perk"])])
				else:
					gains.append("Contact: %s" % String(cdef2["name"]))
			if String(d.get("place", "")) != "":
				gains.append("Place: %s" % String(GameData.PLACES[String(d["place"])]["name"]))
			gains.append("Free upgrade")
			pending_levels += 1
		"artifact":
			att = _attune(String(d.get("force", "")))
			var cid2: String = String(d.get("unlock_character", ""))
			if cid2 != "" and not Profile.has_character(cid2):
				gains.append("Explorer: %s (next expedition)" % GameData.CHARACTERS[cid2]["name"])
			if String(d.get("perk", "")) != "":
				gains.append("Permanent perk")
			gains.append("Free upgrade")
			pending_levels += 1
		"anomaly":
			match String(d.get("effect", "")):
				"memory_well":
					pending_levels += 1
					gains.append("Free upgrade")
				"mirrorfold":
					gains.append("Shortcut: fly into either fold")
		"fragment":
			gains.append("Log added to the Archive")
	if att != "":
		gains.push_front(att.strip_edges())
	if hud:
		# Flavour text lives in the Archive; the card says what you got.
		hud.discovery_card(heading, "" if not gains.is_empty() else detail, p.color, first_time, GameData.poi_category(String(p.kind), d), gains)
	_update_music(false)

## Broadcasting a signal draws attention: a raider pack homes in while you tune.
## Spectacle (crowd lock): standing in the ring puts you on stage. Weapons
## hold fire, the stage halves damage taken, and an audience keeps arriving
## until enough of them are watching. Before this, an upgraded ship cleared
## every raider before three could gather and the stop could not be finished.
func _step_stage(delta: float) -> void:
	var was: bool = on_stage
	on_stage = false
	var stage: Dictionary = {}
	for p: Dictionary in pois.items:
		if String(p.get("lock", "")) == "crowd" and not bool(p.claimed) and player.position.distance_to(p.pos) < float(p.radius):
			on_stage = true
			stage = p
			break
	player.damage_taken_mult = (1.2 if force_state == "FRACTURE" else 1.0) * (1.15 if character_id == "jex_marrin" else 1.0) * (0.5 if on_stage else 1.0)
	if not on_stage:
		return
	if not was:
		stage_clock = 0.0
		if hud:
			hud.toast("ON STAGE — guns hold fire")
	stage_clock -= delta
	if stage_clock <= 0.0:
		stage_clock = 3.5
		var watching: int = 0
		for e: ForceEnemy in enemy_hash.query(Vector2(stage.pos), 420.0):
			if not e.dead and e.position.distance_to(Vector2(stage.pos)) < 420.0:
				watching += 1
		if watching < 4:
			var dir: float = rng.randf() * TAU
			for i in 3:
				var e2: ForceEnemy = spawn_enemy("skiff", Vector2(stage.pos) + Vector2.from_angle(dir + i * 0.5) * rng.randf_range(480.0, 560.0), true)
				if e2:
					e2.engaged = true

func on_tuning_started(p: Dictionary) -> void:
	var r: Dictionary = world.region_def(world.region_at(p.pos))
	var threat: int = int(r.get("threat", 1))
	var n: int = 3 + threat * 2 + int(elapsed / 240.0)
	if world.region_at(p.pos) == world.region_at(world.gate) and int(Profile.data["stats"]["expeditions"]) == 0:
		n = 2 # first-ever signal: a gentle introduction
	var dir: float = rng.randf() * TAU
	for i in n:
		var k: String = _pick_kind(r)
		if k == "wreck_lurker":
			k = "ram_cutter"
		spawn_enemy(k, Vector2(p.pos) + Vector2.from_angle(dir + (i - n * 0.5) * 0.25) * rng.randf_range(maxf(560.0, view_radius() - 120.0), maxf(680.0, view_radius())), true)
	if hud:
		hud.toast("TUNING — the broadcast has drawn attention. Hold the ring.")
	Audio.play_sfx("ping", 0.9, -4.0, 0.3)

func spawn_guardian(p: Dictionary) -> ForceEnemy:
	var g: ForceEnemy = spawn_enemy("splinter_captain", world.random_open_point_near(p.pos, 380.0, 460.0, rng), true)
	if hud:
		hud.alert("GUARDIAN CAPTAIN", g.position if g else p.pos)
	return g

## Attunes a Force mid-run. A newly heard Force arrives as a weapon at once:
## discovery changes what you can do, right now. Returns text for the card.
func _attune(force_id: String) -> String:
	if force_id == "" or force_id in attuned:
		return ""
	attuned.append(force_id)
	if weapons.weapons.size() < WeaponSystem.MAX_WEAPONS:
		var primary: String = String(GameData.FORCES[force_id]["primary"])
		if not weapons.has_base(primary):
			weapons.add_weapon(primary)
			return "Force: %s (+%s)" % [GameData.FORCES[force_id]["name"], GameData.weapon_name(primary)]
	return "Force: %s" % GameData.FORCES[force_id]["name"]

func on_mirrorfold(from: Dictionary, to: Dictionary) -> void:
	var dest: Vector2 = Vector2(to.pos) + Vector2(0, 70)
	fx.ring(player.position, 10.0, 120.0, from.color, 0.5, 5.0)
	player.position = world.resolve(dest, 18.0)
	camera.reset_smoothing()
	fx.ring(player.position, 10.0, 120.0, to.color, 0.5, 5.0)
	Audio.play_sfx("magnet", 0.7, -2.0, 0.2)
	if not "anom_mirrorfold" in discoveries:
		_claim_discovery(pois.items.filter(func(q: Dictionary) -> bool: return String(q.id) == "anom_mirrorfold")[0])

func on_harmony(hid: String) -> void:
	var h: Dictionary = GameData.HARMONIES[hid]
	Audio.stinger("harmony", 0.0)
	if hud:
		hud.banner("HARMONY: " + String(h["name"]).to_upper(), String(h["desc"]), Color("ffe08a"), 3.0)
	var seen: Dictionary = Profile.data.get("seen", {})
	seen["harmony_" + hid] = true

# ================================================================== gate / extraction

func gate_name() -> String:
	if not mission.is_empty():
		return "HOME BEACON"
	return String(world.region_def(world.region_at(world.gate))["name"])

# ------------------------------------------------------------------ corridor stop

func is_stop_target(id: String) -> bool:
	return id != "" and not mission.is_empty() and String(mission["objective"].get("id", "")) == id

## Shards still needed before this stop's signal will tune. Clearing raiders
## and collecting what they drop is what charges the tuner.
func power_needed() -> int:
	if mission.is_empty() or stop_complete:
		return 0
	return maxi(0, int(mission.get("power", 0)) - motes_collected)

func is_boss_stop() -> bool:
	return not mission.is_empty() and String(mission["objective"]["type"]) == "boss"

func _check_objective() -> void:
	if mission.is_empty() or stop_complete:
		return
	var o: Dictionary = mission["objective"]
	if String(o["type"]) == "survive" and elapsed >= float(o["seconds"]) * (0.1 if quick_test else 1.0):
		complete_stop()

## The stop's objective is met: relight the beacon. Banked at once, so it
## stays won whatever happens on the way home.
func complete_stop() -> void:
	if mission.is_empty() or stop_complete:
		return
	stop_complete = true
	stop_first_time = Profile.complete_stop(stop_id)
	bonus_currency += 40.0 if stop_first_time else 10.0
	Audio.stinger("victory", -2.0)
	fx.ring(player.position, 30.0, 520.0, Color("68ecff"), 1.2, 10.0)
	if hud:
		hud.banner("BEACON RELIT", String(mission["name"]), Color("68ecff"), 3.0)

## Short text for the HUD objective line (playtest: fewer words).
func objective_text() -> String:
	if mission.is_empty():
		return ""
	if stop_complete:
		return "✓ Stage complete  •  home beacon when ready"
	var o: Dictionary = mission["objective"]
	var base: String = GameData.chart_objective_text(mission)
	match String(o["type"]):
		"survive":
			return "%s  •  %s" % [base, GameData.format_time(maxf(0.0, float(o["seconds"]) - elapsed))]
		"elite":
			return base if dreadnought_spawned else "%s  •  arrives %s" % [base, GameData.format_time(maxf(0.0, float(o.get("at", 60.0)) - elapsed))]
		"boss":
			return base if boss_spawned else "%s  •  arrives %s" % [base, GameData.format_time(maxf(0.0, float(o.get("at", 300.0)) - elapsed))]
		"discover":
			var d: Dictionary = GameData.DISCOVERIES[String(o["id"])]
			if power_needed() > 0:
				return "Explore  •  tuner %d / %d" % [motes_collected, int(mission.get("power", 0))]
			var hidden: String = String(d.get("hidden", ""))
			if hidden == "FRACTURE" and force_state != "FRACTURE":
				return base + "  •  only in Fracture"
			if hidden == "RESONANCE" and force_state != "RESONANCE":
				return base + "  •  only in Resonance"
			return base
	return base

## Where the compass should point for the stop: [pos, label, color] or [].
func objective_target() -> Array:
	if mission.is_empty():
		return []
	if stop_complete:
		return [world.gate, "HOME BEACON", Color("68ecff")]
	var o: Dictionary = mission["objective"]
	if String(o["type"]) == "discover":
		for p: Dictionary in pois.items:
			if String(p.id) == String(o["id"]) and not bool(p.claimed):
				if power_needed() > 0 and not bool(p.known):
					# Explore first: no pointer at all for the first two
					# minutes, then only the rough area until the tuner is
					# charged (playtest: pointers came too early).
					if elapsed < SEARCH_HINT_AFTER:
						return []
					return [search_area(), "SEARCH: " + String(mission["place"]).to_upper(), Color("ffd75e", 0.8)]
				var visible: bool = String(p.hidden) in ["", force_state] or bool(p.known)
				return [p.pos, String(p.title) if visible else "SEARCH AREA", Color("ffd75e")]
	return []

## Centre of the stop's search area (its region, or near an open-drift site).
const SEARCH_HINT_AFTER: float = 120.0

func search_area() -> Vector2:
	if mission.has("region"):
		return GameData.region_anchor(GameData.REGIONS[String(mission["region"])])
	var d: String = String(mission["objective"].get("id", ""))
	if d != "":
		return GameData.discovery_position(d) + Vector2(380, -260)
	return world.gate

func signals_found() -> int:
	var n: int = 0
	for id: String in discoveries:
		if String(GameData.DISCOVERIES[id]["kind"]) == "signal":
			n += 1
	return n

func goal_signals() -> int:
	return int(GameData.DESTINATIONS[destination_id]["goal_signals"])

func climax_available() -> bool:
	if not mission.is_empty():
		return is_boss_stop() and not boss_spawned
	return signals_found() >= goal_signals() and not boss_spawned

func at_gate() -> bool:
	return player.position.distance_to(world.gate) < GATE_RADIUS

func _gate_logic(delta: float) -> void:
	if not left_gate and player.position.distance_to(world.gate) > GATE_RADIUS + 120.0:
		left_gate = true
	# Leaving is an explicit choice (playtest: standing in the ring and being
	# sent home by surprise was confusing). Arm it, then a short countdown;
	# flying out of the ring cancels.
	if not can_extract():
		extract_armed = false
	if extract_armed:
		extract_progress += delta
		if extract_progress >= EXTRACT_TIME:
			end_run("extracted")
	else:
		extract_progress = 0.0
	if scripted_input:
		return
	if can_extract() and Input.is_action_just_pressed("extract"):
		request_extract()
	if at_gate() and climax_available() and left_gate and Input.is_action_just_pressed("interact"):
		confront()

func can_extract() -> bool:
	return left_gate and at_gate() and not (boss_spawned and not boss_defeated) and victory_clock < 0.0 and not ended

## Toggles the go-home countdown (pressing again cancels).
func request_extract() -> void:
	if not can_extract():
		return
	extract_armed = not extract_armed
	if extract_armed:
		Audio.play_sfx("extract", 1.0, -4.0)

func confront() -> void:
	if not climax_available():
		return
	extract_progress = 0.0
	extract_armed = false
	spawn_boss(world.gate + Vector2(0, -420))

# ================================================================== music

func _on_audio_beat(index: int) -> void:
	if ended or choosing or get_tree().paused:
		return
	# Handled inside step(), after the enemy list is rebuilt, so beat-driven
	# weapons never see enemies freed between frames.
	pending_beats.append(index)

func _beat_fallback(delta: float) -> void:
	if Audio.music_running:
		return
	beat_clock += delta
	var bl: float = 60.0 / Audio.BPM
	while beat_clock >= bl:
		beat_clock -= bl
		beat_index += 1
		weapons.on_beat(beat_index)
		if hud:
			hud.on_beat(beat_index)

func _update_music(_immediate: bool) -> void:
	var mix: Dictionary = {"bed": 0.75}
	var intensity: float = clampf(float(enemies.size()) / 35.0 + combat_heat * 0.6, 0.0, 1.0)
	mix["pulse"] = clampf(0.35 + intensity * 0.65, 0.0, 1.0)
	mix["drive"] = clampf((intensity - 0.45) * 1.8, 0.0, 1.0)
	var r: Dictionary = current_region_def()
	var layer: String = String(r.get("music", ""))
	if layer != "":
		mix[layer] = 0.8
	# Each attuned Force played this expedition contributes its motif.
	var strongest: String = ""
	var strongest_lvl: int = 0
	for fid: String in GameData.FORCES.keys():
		var lvl: int = weapons.force_level(fid) if weapons else 0
		if lvl > 0:
			mix[String(GameData.FORCES[fid]["motif_layer"])] = clampf(0.25 + lvl * 0.08, 0.0, 0.75)
			if lvl > strongest_lvl:
				strongest_lvl = lvl
				strongest = fid
	if strongest != "":
		mix[String(GameData.FORCES[strongest]["motif_layer"])] = 0.9
	if force_state == "RESONANCE":
		mix["state_resonance"] = 0.85
	elif force_state == "FRACTURE":
		mix["state_fracture"] = 0.85
		mix["bed"] = 0.45
	if boss_spawned and not boss_defeated:
		mix = {"boss": 1.0, "pulse": 0.8, "drive": 0.9}
		if strongest != "":
			mix[String(GameData.FORCES[strongest]["motif_layer"])] = 0.6
	elif boss_defeated:
		mix = {"bed": 0.9, "state_resonance": 1.0}
		if strongest != "":
			mix[String(GameData.FORCES[strongest]["motif_layer"])] = 1.0
	Audio.set_mix(mix)

# ================================================================== end

func end_run(result: String) -> void:
	if ended:
		return
	ended = true
	outcome = result
	get_tree().paused = false
	Audio.play_sfx("victory" if result != "defeat" else "defeat", 1.0, 0.0, 0.2)
	finished.emit(build_result(result))

## Result dictionary shared by the real ending and mid-run checkpoints.
func build_result(result: String) -> Dictionary:
	var found: int = discoveries.size()
	var currency: float = kills / 8.0 + level * 3.0 + found * 15.0 + bonus_currency
	match result:
		"complete":
			currency += 120.0
		"defeat":
			currency *= 0.5
	if character_id == "jex_marrin":
		currency *= 1.4 + (0.15 if mastery_level >= 2 else 0.0)
	var mastery_xp: int = int(elapsed / 6.0 + found * 25 + kills / 12.0 + (150 if result == "complete" else (40 if result == "extracted" else 0)))
	return {
		"outcome": result, "time": elapsed, "kills": kills, "level": level, "character": character_id,
		"destination": destination_id, "force": signature_force, "state": force_state,
		"discoveries": discoveries.duplicate(), "new_discoveries": new_this_run.duplicate(),
		"currency": int(currency), "mastery_xp": mastery_xp, "regions": visited_regions.duplicate(),
		"weapons": weapons.weapons.duplicate(), "harmonies": weapons.harmonies.duplicate(), "damage": int(damage_dealt),
		"stop": stop_id, "stop_complete": stop_complete, "stop_first_time": stop_first_time,
	}

## Saves the expedition so far. If the game closes or crashes, the next launch
## commits it as an "interrupted" return (everything kept).
func checkpoint() -> void:
	if ended or quick_test:
		return
	last_checkpoint = elapsed
	Profile.checkpoint_run(build_result("interrupted"))

# ================================================================== debug (desktop only)

func _unhandled_input(event: InputEvent) -> void:
	if not debug_enabled or not OS.is_debug_build():
		return
	if event is InputEventKey and event.pressed and not event.echo and event.ctrl_pressed:
		match event.keycode:
			KEY_1:
				pending_levels += 1
			KEY_2:
				spawn_patrol()
			KEY_3:
				resonance = 85.0 if force_state != "RESONANCE" else 12.0
			KEY_4:
				var p: Dictionary = pois.nearest_unclaimed(player.position, ["signal"], false)
				if not p.is_empty():
					player.position = Vector2(p.pos) + Vector2(0, 30)
			KEY_5:
				spawn_boss(player.position + Vector2(0, -400))
			KEY_6:
				player.god_mode = not player.god_mode
				hud.toast("GOD MODE " + ("ON" if player.god_mode else "OFF"))
			KEY_7:
				for e: ForceEnemy in enemies.duplicate():
					damage_enemy(e, 99999.0, Vector2.ZERO, 0.0, "environment", true)
			KEY_8:
				player.position = world.gate
