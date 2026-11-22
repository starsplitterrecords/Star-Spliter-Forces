class_name WeaponSystem
extends Node2D
## Owns the player's loadout and every automatic attack.
## Weapons and passives are levelled through upgrade choices; each Force adds
## a mechanic of its own while the player carries any of its weapons.

const MAX_WEAPONS: int = 5
const MAX_PASSIVES: int = 5

var run: Node
var player: ForcePlayer
var weapons: Dictionary = {} # id -> level (evolved ids keep level 5)
var weapon_order: Array[String] = []
var passives: Dictionary = {}
var clocks: Dictionary = {}
var harmonies: Array[String] = []

# Force mechanics
var build: float = 0.0          # Pulse Width Codex 0..100
var drop_armed: bool = false
var drop_time: float = 0.0       # seconds of Drop tempo remaining
var momentum: float = 0.0       # Ghost Driver Unit 0..1
var jam: float = 0.0            # Warm Circuits Rise 0..1
var swell: float = 0.0          # Minor Collapse 0..1
var orbit_phase: float = 0.0
var echoes: Array = []          # delayed repeats: {t, kind, pos, dir, dmg, radius}
var charges: Array = []         # trail charges: {pos, t, radius, dmg}
var fields: Array = []          # lingering fields: {pos, radius, t, dps, slow}
var last_charge_pos: Vector2 = Vector2.ZERO
var jam_pattern: int = 0
var road_jam_clock: float = 0.0
var reverb_clock: float = 0.0
var silenced: bool = false
var anim: float = 0.0
# New Forces
var hype: float = 0.0            # Supersonic Being streak count
var hype_clock: float = 0.0
var hype_bursts: int = 0
var beam_angle: float = 0.0      # Night Motion Archives searchlights
var afterimages: Array = []      # {angle, t, max_t, id}
var afterimage_clock: float = 0.0
var companions: Array[Vector2] = [] # Robots Sing Love Songs duet units
var tracker_step: int = -1       # Before the Reboot sequencer
var blooms: Array = []           # Minor Collapse feedback seeds
var brass_repeat: float = -1.0

const BEAT_WEAPONS: Array = ["section_drones", "full_orchestra", "the_drop", "pattern_cannon", "full_module"]

func setup(run_node: Node, p: ForcePlayer, starting_weapon: String) -> void:
	run = run_node
	player = p
	add_weapon(starting_weapon)
	last_charge_pos = player.position

# ------------------------------------------------------------------ loadout

func add_weapon(id: String) -> void:
	if weapons.has(id):
		weapons[id] = mini(int(weapons[id]) + 1, 5)
	else:
		weapons[id] = 1
		weapon_order.append(id)
		clocks[id] = 0.4
	_check_harmonies()

func evolve(id: String) -> void:
	var from: String = String(GameData.EVOLUTIONS[id]["from"])
	if not weapons.has(from):
		return
	weapons.erase(from)
	weapons[id] = 5
	var idx: int = weapon_order.find(from)
	weapon_order[idx] = id
	clocks[id] = 0.2

func add_passive(id: String) -> void:
	passives[id] = mini(int(passives.get(id, 0)) + 1, int(GameData.PASSIVES[id]["max"]))
	apply_passives()

func level_of(id: String) -> int:
	return int(weapons.get(id, 0))

func base_id(id: String) -> String:
	return String(GameData.EVOLUTIONS[id]["from"]) if GameData.EVOLUTIONS.has(id) else id

func is_evolved(id: String) -> bool:
	return GameData.EVOLUTIONS.has(id)

func has_base(base: String) -> bool:
	for id: String in weapons.keys():
		if base_id(id) == base:
			return true
	return false

func force_level(force_id: String) -> int:
	var total: int = 0
	for id: String in weapons.keys():
		if GameData.weapon_force(id) == force_id:
			total += int(weapons[id]) + (2 if is_evolved(id) else 0)
	return total

func has_force(force_id: String) -> bool:
	return force_level(force_id) > 0

func apply_passives() -> void:
	var p: Dictionary = passives
	var bonus: Dictionary = run.start_bonuses if run else {}
	player.damage_mult = (1.0 + 0.10 * int(p.get("amplifier", 0)) + 0.05 * _multiplexer_damage_ranks()) * float(bonus.get("damage_mult", 1.0))
	player.cooldown_mult = pow(0.93, int(p.get("capacitor", 0))) * float(bonus.get("cooldown_mult", 1.0))
	player.pickup_range = float(bonus.get("pickup", 90.0)) * (1.0 + 0.30 * int(p.get("collector", 0)))
	player.speed_mult = (1.0 + 0.07 * int(p.get("thrusters", 0))) * float(bonus.get("speed_mult", 1.0))
	player.area_mult = 1.0 + 0.10 * int(p.get("reach", 0))
	var mp: int = int(p.get("multiplexer", 0))
	player.projectile_bonus = (1 if mp >= 2 else 0) + (1 if mp >= 4 else 0)
	player.armor = float(bonus.get("armor", 0.0)) + 1.5 * int(p.get("plating", 0))
	player.regen = 0.5 * int(p.get("nanoweave", 0))
	player.crit_chance = 0.06 * int(p.get("gain_stage", 0))
	player.duration_mult = 1.0 + 0.15 * int(p.get("long_delay", 0))
	player.bandwidth_mult = 1.0 + 0.12 * int(p.get("bandwidth", 0))
	player.knock_mult = 1.0 + 0.2 * int(p.get("compressor", 0))
	var new_max: float = float(bonus.get("max_hp", 100.0)) + 20.0 * int(p.get("hull", 0))
	if new_max > player.max_hp:
		player.hp += new_max - player.max_hp
	player.max_hp = new_max
	player.hp = minf(player.hp, player.max_hp)

func _multiplexer_damage_ranks() -> int:
	var mp: int = int(passives.get("multiplexer", 0))
	return mp - ((1 if mp >= 2 else 0) + (1 if mp >= 4 else 0))

func harmonics_mult() -> float:
	return 1.0 + 0.2 * int(passives.get("harmonics", 0))

func _check_harmonies() -> void:
	for hid: String in GameData.HARMONIES.keys():
		if hid in harmonies:
			continue
		var forces: Array = GameData.HARMONIES[hid]["forces"]
		if force_level(String(forces[0])) >= 3 and force_level(String(forces[1])) >= 3:
			harmonies.append(hid)
			if run:
				run.on_harmony(hid)

func has_harmony(id: String) -> bool:
	return id in harmonies

# ------------------------------------------------------------------ choices

## Returns up to `count` upgrade options: {type, id, level}.
## type: weapon | passive | evolution
func choices(count: int, attuned: Array) -> Array:
	var pool: Array = []
	var evolutions: Array = []
	for id: String in weapons.keys():
		if is_evolved(id):
			continue
		var lvl: int = int(weapons[id])
		var wdef: Dictionary = GameData.WEAPONS[id]
		if lvl >= 5:
			var passive: String = String(wdef.get("evolve_with", ""))
			if passives.has(passive):
				evolutions.append({"type": "evolution", "id": String(wdef["evolution"]), "level": 0})
		else:
			pool.append({"type": "weapon", "id": id, "level": lvl + 1, "weight": 1.3})
	if weapons.size() < MAX_WEAPONS:
		for id: String in GameData.WEAPONS.keys():
			if has_base(id):
				continue
			if not String(GameData.WEAPONS[id]["force"]) in attuned:
				continue
			pool.append({"type": "weapon", "id": id, "level": 1, "weight": 1.0})
	for id: String in GameData.PASSIVES.keys():
		var lvl2: int = int(passives.get(id, 0))
		if lvl2 >= int(GameData.PASSIVES[id]["max"]):
			continue
		if lvl2 == 0 and passives.size() >= MAX_PASSIVES:
			continue
		# Gently favour passives that would unlock an evolution.
		var w: float = 0.8
		for wid: String in weapons.keys():
			if not is_evolved(wid) and String(GameData.WEAPONS[wid].get("evolve_with", "")) == id:
				w = 1.4
		pool.append({"type": "passive", "id": id, "level": lvl2 + 1, "weight": w})
	var out: Array = []
	for e: Dictionary in evolutions:
		if out.size() < count:
			out.append(e)
	# Guarantee at least one weapon option when any exist: weapons are where
	# the build's personality comes from.
	var weapon_opts: Array = pool.filter(func(o: Dictionary) -> bool: return String(o["type"]) == "weapon")
	if out.size() < count and not weapon_opts.is_empty():
		var pick: Dictionary = weapon_opts[randi() % weapon_opts.size()]
		out.append(pick)
		pool.erase(pick)
	while out.size() < count and not pool.is_empty():
		var total: float = 0.0
		for o: Dictionary in pool:
			total += float(o["weight"])
		var r: float = randf() * total
		for i in pool.size():
			r -= float(pool[i]["weight"])
			if r <= 0.0:
				out.append(pool[i])
				pool.remove_at(i)
				break
	return out

func apply_choice(option: Dictionary) -> void:
	match String(option["type"]):
		"weapon":
			add_weapon(String(option["id"]))
		"passive":
			add_passive(String(option["id"]))
		"evolution":
			evolve(String(option["id"]))

# ------------------------------------------------------------------ numbers

func stat(id: String, key: String, fallback: float = 0.0) -> float:
	var wdef: Dictionary = GameData.weapon_def(id)
	var arr: Variant = wdef.get(key)
	if arr == null:
		return fallback
	var lvl: int = clampi(int(weapons.get(id, 1)), 1, 5)
	return float((arr as Array)[lvl - 1])

func cooldown_for(id: String) -> float:
	var cd: float = stat(id, "cooldown", 1.0) * player.cooldown_mult
	if run.force_state == "RESONANCE":
		cd *= 1.0 / (1.0 + 0.15 * harmonics_mult())
	if drop_time > 0.0:
		cd *= 0.55
	if run.character_id == "abby_saville":
		cd *= 1.1
	return maxf(0.08, cd)

func damage_for(id: String, base: float) -> float:
	var dmg: float = base * player.damage_mult
	match run.force_state:
		"RESONANCE":
			dmg *= 1.0 + 0.2 * harmonics_mult()
		"FRACTURE":
			dmg *= 1.0 + 0.3 * harmonics_mult()
	var force: String = GameData.weapon_force(id)
	if force == "ghost_driver_unit":
		dmg *= 1.0 + momentum * 0.5
	if force == "warm_circuits_rise":
		dmg *= 1.0 + jam * 0.6
	if force == "minor_collapse":
		dmg *= 0.8 + swell * 0.8
	if force == "supersonic_being":
		dmg *= 1.0 + minf(hype, 40.0) * 0.015
	if id in BEAT_WEAPONS:
		dmg *= 1.0 + 0.15 * int(passives.get("metronome", 0))
	if run.character_id == "tessa_banks":
		dmg *= 0.9
	if run.character_id == "abby_saville" and player.movement_ratio() < 0.15:
		dmg *= 1.2
	if run.character_id == "naomi_sol" and player.movement_ratio() > 0.9:
		dmg *= 1.15
	if run.character_id == "brandon_mack" and run.force_state == "FRACTURE":
		dmg *= 1.15
	dmg *= run.ability_damage_mult()
	return dmg

## Per-target modifiers (Impact vs elites, Space for Currents).
func target_multiplier(e: ForceEnemy, weapon_id: String) -> float:
	var force: String = GameData.weapon_force(weapon_id)
	var m: float = 1.0
	if force == "star_splitter_rex" and (e.elite or e.boss):
		m *= 1.35
	if has_harmony("boss_score") and (e.elite or e.boss):
		m *= 1.4
	if e.elite or e.boss:
		m *= 1.0 + 0.06 * int(passives.get("compressor", 0))
	# Duet: a target left in harmony takes +30% from any other Force.
	if e.harmony_mark and force != "robots_sing_love_songs" and force != "":
		m *= 1.3
		if not weapons.has("choir_of_machines"):
			e.harmony_mark = false
	if force == "resonant_currents":
		var crowded: bool = false
		for other: ForceEnemy in run.enemy_hash.query(e.position, 80.0):
			if other != e and not other.dead and other.position.distance_squared_to(e.position) < 6400.0:
				crowded = true
				break
		if not crowded:
			m *= 1.3
	return m

func knock_for(id: String, base: float) -> float:
	var k: float = base * player.knock_mult
	if GameData.weapon_force(id) == "star_splitter_rex":
		k *= 2.2
		if has_harmony("stadium"):
			k *= 1.0 + momentum
	return k

## Called by the run whenever a weapon hit lands.
func on_hit(weapon_id: String) -> void:
	var f: String = GameData.weapon_force(weapon_id)
	var codex_like: bool = f == "pulse_width_codex" or (f == "before_the_reboot" and has_harmony("chiptune_anthem"))
	if codex_like and drop_time <= 0.0:
		var gain: float = 1.6 * (1.6 if run.force_state == "RESONANCE" else 1.0) * (3.0 if f == "before_the_reboot" else 1.0)
		build = minf(100.0, build + gain)
		if build >= 100.0 and not drop_armed:
			drop_armed = true
			run.fx.label(player.position + Vector2(0, -56), "BUILD PEAKING", GameData.FORCES["pulse_width_codex"]["color"], 16, 0.9)

## Called by the run when an enemy dies (Hype streaks).
func on_kill() -> void:
	if not has_force("supersonic_being"):
		return
	hype += 1.0
	hype_clock = 1.6
	if int(hype) % 15 == 0:
		_spectacle()

func _spectacle() -> void:
	hype_bursts += 1
	var lvl: int = force_level("supersonic_being")
	var r: float = (230.0 + lvl * 12.0) * player.area_mult
	_area_hit(player.position, r, damage_for("mic_drop", 30.0 + lvl * 8.0), "mic_drop", 300.0)
	var col: Color = GameData.FORCES["supersonic_being"]["color"]
	for c: Color in [col, Color("ffe08a"), Color("6ff6ff"), Color("b38bff")]:
		run.fx.spark_spray(player.position, Vector2.ZERO, c, 8, 760.0, PI)
	run.fx.ring(player.position, 20.0, r, col, 0.55, 8.0)
	run.fx.label(player.position + Vector2(0, -64), "HYPE x%d" % int(hype), col, 26, 1.0)
	run.punch(0.05)
	run.shake(6.0)
	Audio.play_sfx("harmony", 1.25, -4.0, 0.2)

func on_player_hurt() -> void:
	jam = 0.0 if not is_evolved_present("long_jam") else jam * 0.5

func is_evolved_present(id: String) -> bool:
	return weapons.has(id)

# ------------------------------------------------------------------ beats

func on_beat(index: int) -> void:
	var on_bar: bool = index % 4 == 0
	if on_bar and drop_armed:
		_drop()
	if has_harmony("machine_chorus") and not silenced:
		for wid: String in weapon_order:
			if base_id(wid) == "duet_unit":
				_fire_duet(wid, true)
	for id: String in weapon_order:
		if base_id(id) == "section_drones" and not silenced:
			var every: int = 1 if (drop_time > 0.0 and has_harmony("festival_score")) else 2
			if index % every == 0:
				_fire_sections(id, on_bar and is_evolved(id))
		if id == "the_drop" and on_bar and not silenced:
			_fire_riser(id, 1.6 if (index / 4) % 4 == 0 else 1.0)
			if (index / 4) % 4 == 0 and not drop_armed:
				build = 100.0
				drop_armed = true

func _drop() -> void:
	drop_armed = false
	build = 0.0
	drop_time = 4.0
	var lvl: int = force_level("pulse_width_codex")
	var radius: float = (240.0 + lvl * 14.0) * player.area_mult
	var dmg: float = damage_for("pulse_bolt", 40.0 + lvl * 9.0)
	_area_hit(player.position, radius, dmg, "pulse_bolt", 320.0)
	var col: Color = GameData.FORCES["pulse_width_codex"]["color"]
	run.fx.ring(player.position, 30.0, radius, col, 0.6, 10.0)
	run.fx.flash(player.position, 120.0, col.lerp(Color.WHITE, 0.5), 0.18)
	run.fx.spark_spray(player.position, Vector2.ZERO, col.lerp(Color.WHITE, 0.4), 24, 900.0, PI)
	run.punch(0.08)
	run.fx.ring(player.position, 10.0, radius * 0.7, Color.WHITE, 0.45, 4.0)
	run.fx.label(player.position + Vector2(0, -70), "DROP", col, 30, 1.0)
	run.shake(8.0)
	run.hitstop(0.05)
	Audio.play_sfx("drop", 1.0, 0.0, 0.2)
	if has_harmony("main_stage"):
		hype += 12.0
		hype_clock = 2.0
		_spectacle()
	if has_harmony("dub_drop"):
		_queue_echo(0.5, "area", player.position, Vector2.ZERO, dmg * 0.6, radius * 0.9, "pulse_bolt")
		_queue_echo(1.0, "area", player.position, Vector2.ZERO, dmg * 0.35, radius * 0.8, "pulse_bolt")

# ------------------------------------------------------------------ update

func step(delta: float) -> void:
	anim += delta
	# On a Spectacle stage the show needs an audience: weapons hold fire.
	silenced = run.hazards.player_silenced(player.position) or run.on_stage
	drop_time = maxf(0.0, drop_time - delta)
	var moving: float = player.movement_ratio()
	if has_force("ghost_driver_unit"):
		momentum = clampf(momentum + (delta * 0.45 if moving > 0.7 else -delta * 0.8), 0.0, 1.0)
	if has_force("warm_circuits_rise"):
		jam = minf(1.0, jam + delta / 40.0)
	if has_force("minor_collapse"):
		swell = clampf(swell + (delta * 0.6 if moving < 0.45 else -delta * 0.9), 0.0, 1.0)
	orbit_phase += delta * (2.4 if run.force_state == "RESONANCE" else 2.0)
	hype_clock -= delta
	if hype_clock <= 0.0:
		hype = maxf(0.0, hype - 12.0 * delta)
	_step_companions(delta)
	_step_afterimages(delta)
	_step_blooms(delta)
	if brass_repeat > 0.0:
		brass_repeat -= delta
		if brass_repeat <= 0.0 and weapons.has("fanfare"):
			_fire_brass("fanfare", true)
	_step_echoes(delta)
	_step_charges(delta)
	_step_fields(delta)
	if not silenced:
		for id: String in weapon_order:
			clocks[id] = float(clocks.get(id, 0.0)) - delta
			if float(clocks[id]) <= 0.0:
				_fire(id)
		_continuous(delta)
		_harmony_extras(delta)
	queue_redraw()

func _fire(id: String) -> void:
	var b: String = base_id(id)
	match b:
		"pulse_bolt":
			clocks[id] = cooldown_for(id)
			var target: ForceEnemy = run.nearest_enemy(player.position, 480.0)
			if target == null:
				clocks[id] = 0.15
				return
			var evolved: bool = id == "anthem_bolt"
			var count: int = (4 if evolved else int(stat(id, "count"))) + player.projectile_bonus
			var base_dir: Vector2 = player.position.direction_to(target.position)
			for i in count:
				var spread: float = (float(i) - float(count - 1) / 2.0) * 0.16
				run.projectiles.spawn(player.position, base_dir.rotated(spread) * 560.0, damage_for(id, stat(id, "damage") * (1.15 if evolved else 1.0)), 1.6, 6.0,
					GameData.FORCES["pulse_width_codex"]["color"], {"pierce": int(stat(id, "pierce")) + (1 if evolved else 0), "homing": 5.0, "weapon": id, "knock": 50.0, "split": 1 if evolved else 0})
			Audio.play_sfx("shot", randf_range(0.95, 1.08), -10.0, 0.06)
		"riser":
			if id == "the_drop":
				clocks[id] = 999.0 # beat-driven
				return
			clocks[id] = cooldown_for(id)
			_fire_riser(id, 1.0)
		"sub_wave":
			clocks[id] = cooldown_for(id)
			var radius: float = stat(id, "radius") * player.area_mult
			var dmg: float = damage_for(id, stat(id, "damage"))
			_area_hit(player.position, radius, dmg, id, 380.0)
			run.fx.ring(player.position, 20.0, radius, GameData.FORCES["resonant_currents"]["color"], 0.4, 8.0)
			Audio.play_sfx("wave", randf_range(0.95, 1.05), -6.0)
			run.fx.flash(player.position, radius * 0.45, GameData.FORCES["resonant_currents"]["color"], 0.1)
			_queue_echo(0.45, "area", player.position, Vector2.ZERO, dmg * 0.5, radius * 0.85, id)
			_queue_echo(0.9, "area", player.position, Vector2.ZERO, dmg * 0.25, radius * 0.7, id)
			if id == "deep_pressure":
				fields.append({"pos": player.position, "radius": radius * 0.9, "t": 3.0, "dps": dmg * 0.35, "slow": true, "weapon": id, "color": GameData.FORCES["resonant_currents"]["color"]})
		"echo_tap":
			clocks[id] = cooldown_for(id)
			var target2: ForceEnemy = run.nearest_enemy(player.position, 560.0)
			if target2 == null:
				clocks[id] = 0.2
				return
			var evolved2: bool = id == "dub_siren"
			var count2: int = int(stat(id, "count")) + player.projectile_bonus
			var dir: Vector2 = player.position.direction_to(target2.position)
			var dmg2: float = damage_for(id, stat(id, "damage"))
			var repeats: int = 4 if evolved2 else (3 if int(weapons[id]) >= 4 else 2)
			for i in count2:
				var d2: Vector2 = dir.rotated((float(i) - float(count2 - 1) / 2.0) * 0.22)
				run.projectiles.spawn(player.position, d2 * 300.0, dmg2, 1.8, 9.0, GameData.FORCES["resonant_currents"]["color"], {"pierce": 2, "weapon": id, "knock": 90.0})
				for r in repeats:
					var fan: float = (0.18 * (r + 1) * (1.0 if r % 2 == 0 else -1.0)) if evolved2 else 0.0
					_queue_echo(0.35 * (r + 1), "shot", player.position, d2.rotated(fan), dmg2 * pow(0.7, r + 1), 8.0, id)
			Audio.play_sfx("shot_heavy", randf_range(0.8, 0.9), -9.0, 0.08)
		"power_chord":
			clocks[id] = cooldown_for(id)
			var dir3: Vector2 = player.velocity.normalized() if player.velocity.length() > 40.0 else Vector2.ZERO
			if dir3 == Vector2.ZERO:
				var t3: ForceEnemy = run.nearest_enemy(player.position, 400.0)
				if t3 == null:
					clocks[id] = 0.2
					return
				dir3 = player.position.direction_to(t3.position)
			var reach: float = stat(id, "radius") * player.area_mult * (1.0 + momentum * 0.3)
			var half_angle: float = 0.55 + momentum * 0.35
			var dmg3: float = damage_for(id, stat(id, "damage"))
			if id == "encore" and momentum > 0.7:
				half_angle = PI
			for e: ForceEnemy in run.enemy_hash.query(player.position, reach).duplicate():
				if e.dead:
					continue
				var rel: Vector2 = e.position - player.position
				if rel.length() < reach + e.radius and absf(dir3.angle_to(rel)) < half_angle:
					run.damage_enemy(e, dmg3, rel.normalized(), knock_for(id, 260.0), id)
			_draw_chord_fx(dir3, reach, half_angle)
			Audio.play_sfx("chord", randf_range(0.95, 1.05), -5.0)
		"trail_charges":
			clocks[id] = cooldown_for(id)
			if player.position.distance_to(last_charge_pos) < 30.0 and run.nearest_enemy(player.position, 200.0) == null:
				clocks[id] = 0.2
				return
			last_charge_pos = player.position
			var n: int = 1 + player.projectile_bonus
			for i in n:
				var off: Vector2 = -player.velocity.normalized() * (30.0 + i * 40.0) if player.velocity.length() > 20.0 else Vector2.from_angle(randf() * TAU) * 40.0 * i
				charges.append({"pos": player.position + off, "t": 0.55, "radius": stat(id, "radius") * player.area_mult, "dmg": damage_for(id, stat(id, "damage")), "weapon": id})
		"ion_lance":
			clocks[id] = cooldown_for(id)
			var t4: ForceEnemy = run.strongest_enemy(player.position, 700.0)
			if t4 == null:
				clocks[id] = 0.2
				return
			var dir4: Vector2 = player.position.direction_to(t4.position)
			var lances: Array = [0.0]
			if id == "breaker_lance":
				lances = [-0.2, 0.0, 0.2]
			elif int(weapons[id]) >= 5:
				lances = [-0.1, 0.1]
			for a: float in lances:
				_lance(player.position, dir4.rotated(a), 760.0 * player.area_mult, stat(id, "width") * player.area_mult, damage_for(id, stat(id, "damage")), id)
			Audio.play_sfx("lance", randf_range(0.95, 1.05), -5.0)
		"analog_star":
			clocks[id] = cooldown_for(id)
			_improvise(id)
		"mic_drop":
			clocks[id] = cooldown_for(id)
			_fire_mic_drop(id)
		"duet_unit":
			clocks[id] = cooldown_for(id)
			_fire_duet(id, false)
		"pattern_cannon":
			# One sequencer step per sixteenth note at the score's tempo.
			clocks[id] = 60.0 / Audio.BPM / 4.0
			_tracker_step(id)
		"brass_swell":
			clocks[id] = cooldown_for(id)
			_fire_brass(id, false)
		"feedback_bloom":
			clocks[id] = cooldown_for(id)
			_seed_bloom(id)
		"nightline":
			clocks[id] = 999.0 # continuous
		_:
			clocks[id] = 999.0

func _fire_riser(id: String, scale: float) -> void:
	var radius: float = stat(id, "radius") * player.area_mult * scale
	var dmg: float = damage_for(id, stat(id, "damage")) * scale
	var col: Color = GameData.FORCES["pulse_width_codex"]["color"]
	for e: ForceEnemy in run.enemy_hash.query(player.position, radius).duplicate():
		if e.dead:
			continue
		var d: float = e.position.distance_to(player.position)
		if d < radius + e.radius:
			# The crest hits harder the further it has risen.
			run.damage_enemy(e, dmg * (0.6 + 0.8 * clampf(d / radius, 0.0, 1.0)), (e.position - player.position).normalized(), 120.0, id)
	run.fx.ring(player.position, 30.0, radius, col, 0.55, 5.0)
	Audio.play_sfx("wave", 1.3, -9.0)

func _lance(from: Vector2, dir: Vector2, length: float, width: float, dmg: float, id: String) -> void:
	var to: Vector2 = from + dir * length
	var mid: Vector2 = from + dir * length * 0.5
	var pierce_all: bool = has_harmony("stadium") or true
	for e: ForceEnemy in run.enemy_hash.query(mid, length * 0.5 + width).duplicate():
		if e.dead:
			continue
		var rel: Vector2 = e.position - from
		var along: float = rel.dot(dir)
		if along > 0.0 and along < length and absf(rel.cross(dir)) < width + e.radius:
			run.damage_enemy(e, dmg, dir, knock_for(id, 140.0), id)
			if id == "breaker_lance":
				e.slow = maxf(e.slow, 0.8)
		if not pierce_all:
			break
	run.fx.flash(from + dir * 24.0, width * 1.4, GameData.FORCES["star_splitter_rex"]["color"], 0.1)
	run.fx.spark_spray(to, dir, GameData.FORCES["star_splitter_rex"]["color"], 5, 400.0, 0.6)
	run.fx.beam(from, to, GameData.FORCES["star_splitter_rex"]["color"], 0.22, width)

func _fire_sections(id: String, swell_volley: bool) -> void:
	var count: int = 5 if id == "full_orchestra" else int(stat(id, "count"))
	var col: Color = GameData.FORCES["ion_drive_orchestra"]["color"]
	var heavy: bool = has_harmony("boss_score")
	for i in count:
		var p: Vector2 = drone_position(i, count)
		var t: ForceEnemy = run.nearest_enemy(p, 520.0)
		if t:
			run.projectiles.spawn(p, p.direction_to(t.position) * 620.0, damage_for(id, stat(id, "damage") * (1.4 if heavy else 1.0)), 1.0, 7.0 if heavy else 5.0, col, {"weapon": id, "knock": 40.0})
		if swell_volley:
			for k in 6:
				run.projectiles.spawn(p, Vector2.from_angle(TAU * k / 6.0 + anim) * 480.0, damage_for(id, stat(id, "damage") * 0.8), 0.8, 5.0, col, {"weapon": id})
	Audio.play_sfx("shot", 1.5, -14.0, 0.1)

# ------------------------------------------------------------------ new Forces

func _fire_mic_drop(id: String) -> void:
	var targets: Array = []
	var n: int = 3 if id == "headliner" else 1
	var pool: Array = run.enemy_hash.query(player.position, 520.0).duplicate()
	pool.sort_custom(func(a: ForceEnemy, b: ForceEnemy) -> bool: return a.position.distance_squared_to(player.position) < b.position.distance_squared_to(player.position))
	for e: ForceEnemy in pool:
		if e.dead or e.disguised or e.position.distance_to(player.position) > 520.0:
			continue
		var crowded: bool = false
		for t: ForceEnemy in targets:
			if t.position.distance_to(e.position) < 150.0:
				crowded = true
		if not crowded:
			targets.append(e)
		if targets.size() >= n:
			break
	if targets.is_empty():
		clocks[id] = 0.2
		return
	var col: Color = GameData.FORCES["supersonic_being"]["color"]
	var r: float = stat(id, "radius") * player.area_mult
	for t2: ForceEnemy in targets:
		var at: Vector2 = t2.position
		_area_hit(at, r, damage_for(id, stat(id, "damage")), id, 260.0)
		run.fx.flash(at, r * 0.7, col.lerp(Color.WHITE, 0.4), 0.12)
		run.fx.ring(at, 10.0, r, col, 0.35, 7.0)
		run.fx.spark_spray(at, Vector2.ZERO, col.lerp(Color.WHITE, 0.3), 10, 560.0, PI)
		run.fx.scorch_mark(at, r * 0.6, col)
		if id == "headliner":
			for c: Color in [Color("ffe08a"), Color("6ff6ff"), Color("b38bff")]:
				run.fx.spark_spray(at, Vector2.ZERO, c, 5, 640.0, PI)
	run.shake(4.0)
	Audio.play_sfx("chord", 0.8, -4.0, 0.08)

func _step_companions(delta: float) -> void:
	var want: int = 0
	for id: String in weapon_order:
		if base_id(id) == "duet_unit":
			want = 3 if id == "choir_of_machines" else 1
	while companions.size() < want:
		companions.append(player.position)
	while companions.size() > want:
		companions.pop_back()
	for i in companions.size():
		var slot: Vector2 = player.position + Vector2.from_angle(player.facing + PI + (i - (companions.size() - 1) * 0.5) * 0.8) * 54.0
		companions[i] = companions[i].lerp(slot, minf(1.0, delta * 6.0))

func _fire_duet(id: String, on_beat_volley: bool) -> void:
	var col: Color = GameData.FORCES["robots_sing_love_songs"]["color"]
	var notes: int = int(stat(id, "count"))
	for i in companions.size():
		var p: Vector2 = companions[i]
		var t: ForceEnemy = run.nearest_enemy(p, 540.0)
		if t == null:
			continue
		var dir: Vector2 = p.direction_to(t.position)
		for k in (2 if on_beat_volley else notes):
			var spread: float = (float(k) - float(notes - 1) / 2.0) * 0.12
			run.projectiles.spawn(p, dir.rotated(spread) * 560.0, damage_for(id, stat(id, "damage")), 1.2, 6.0, col, {"weapon": id, "homing": 3.0, "knock": 40.0})
		run.fx.flash(p, 10.0, col, 0.08)
	Audio.play_sfx("shot", 1.35, -12.0, 0.08)

func _tracker_pattern(id: String) -> Array:
	var notes: int = int(stat(id, "count"))
	var order: Array = [0, 8, 4, 12, 14, 6, 2, 10, 3, 11]
	return order.slice(0, notes)

func _tracker_step(id: String) -> void:
	tracker_step = (tracker_step + 1) % 16
	var pattern: Array = _tracker_pattern(id)
	var col: Color = GameData.FORCES["before_the_reboot"]["color"]
	var downbeat: bool = tracker_step % 4 == 0
	var t: ForceEnemy = run.nearest_enemy(player.position, 560.0)
	if t == null:
		return
	var dir: Vector2 = player.position.direction_to(t.position)
	var dmg: float = damage_for(id, stat(id, "damage")) * (1.3 if downbeat else 1.0)
	if tracker_step in pattern:
		run.projectiles.spawn(player.position, dir * 620.0, dmg, 1.1, 6.0 if downbeat else 4.5, col, {"weapon": id, "knock": 50.0, "square": true})
		Audio.play_sfx("pickup", 0.5 + (tracker_step % 8) * 0.06, -16.0, 0.02)
	# Full Module: a counter-melody channel on the off-steps.
	if id == "full_module" and (tracker_step + 2) % 16 in pattern:
		for k in [-0.25, 0.25]:
			run.projectiles.spawn(player.position, dir.rotated(k) * 560.0, dmg * 0.7, 1.0, 4.0, col.lerp(Color("6ff6ff"), 0.4), {"weapon": id, "square": true})

func _fire_brass(id: String, repeat: bool) -> void:
	var col: Color = GameData.FORCES["ion_drive_orchestra"]["color"]
	var t: ForceEnemy = run.nearest_enemy(player.position, 560.0)
	var dmg: float = damage_for(id, stat(id, "damage")) * (0.6 if repeat else 1.0)
	if id == "fanfare":
		for k in 16:
			run.projectiles.spawn(player.position, Vector2.from_angle(TAU * k / 16.0 + anim) * 360.0, dmg, 0.9, 10.0, col, {"weapon": id, "pierce": 3, "knock": 120.0})
		if not repeat:
			brass_repeat = 0.5 * player.duration_mult
	else:
		if t == null:
			clocks[id] = 0.2
			return
		var aim: Vector2 = player.position.direction_to(t.position)
		var n: int = int(stat(id, "count"))
		for k in n:
			var a: float = -0.5 + 1.0 * k / maxf(1.0, n - 1.0)
			run.projectiles.spawn(player.position, aim.rotated(a) * 380.0, dmg, 0.9, 10.0, col, {"weapon": id, "pierce": 3, "knock": 120.0})
	run.fx.ring(player.position, 20.0, 90.0, col, 0.3, 5.0)
	Audio.play_sfx("wave", 0.8, -7.0, 0.1)

func _seed_bloom(id: String) -> void:
	var t: ForceEnemy = run.nearest_enemy(player.position, 520.0)
	var at: Vector2 = (t.position if t else player.position) + Vector2.from_angle(randf() * TAU) * randf_range(20.0, 90.0)
	var life: float = 1.6 * player.duration_mult
	blooms.append({"pos": player.position, "target": at, "t": life, "max_t": life, "radius": stat(id, "radius") * player.area_mult, "dmg": damage_for(id, stat(id, "damage")), "weapon": id})

func _step_blooms(delta: float) -> void:
	for i in range(blooms.size() - 1, -1, -1):
		if i >= blooms.size():
			continue
		var b: Dictionary = blooms[i]
		b.t = float(b.t) - delta
		b.pos = Vector2(b.pos).lerp(Vector2(b.target), minf(1.0, delta * 3.0))
		if float(b.t) <= 0.0:
			blooms.remove_at(i)
			_burst_bloom(b)

func _burst_bloom(b: Dictionary) -> void:
	var col: Color = GameData.FORCES["minor_collapse"]["color"]
	_area_hit(b.pos, float(b.radius), float(b.dmg), String(b.weapon), 200.0)
	run.fx.flash(b.pos, float(b.radius) * 0.6, col.lerp(Color.WHITE, 0.5), 0.12)
	run.fx.ring(b.pos, 10.0, float(b.radius), col, 0.4, 7.0)
	run.fx.spark_spray(b.pos, Vector2.ZERO, col.lerp(Color.WHITE, 0.4), 10, 480.0, PI)
	run.fx.puff(b.pos, 2, float(b.radius) * 0.5)
	Audio.play_sfx("mine", 0.7, -8.0, 0.06)
	if String(b.weapon) == "overload_bloom":
		# Chain reaction: nearby seeds go off with it.
		for other: Dictionary in blooms.duplicate():
			if Vector2(other.pos).distance_to(b.pos) < float(b.radius) * 1.2:
				blooms.erase(other)
				_burst_bloom(other)

func beam_count(id: String) -> int:
	return 4 if id == "night_shift" else int(stat(id, "count"))

func _step_afterimages(delta: float) -> void:
	for i in range(afterimages.size() - 1, -1, -1):
		afterimages[i].t = float(afterimages[i].t) - delta
		if float(afterimages[i].t) <= 0.0:
			afterimages.remove_at(i)

func _nightline(id: String, delta: float) -> void:
	beam_angle += delta * 1.7
	var n: int = beam_count(id)
	var length: float = stat(id, "radius") * player.area_mult * (1.25 if id == "night_shift" else 1.0)
	var dps: float = damage_for(id, stat(id, "damage")) * 3.0
	afterimage_clock -= delta
	if afterimage_clock <= 0.0:
		afterimage_clock = 0.1
		var life: float = 0.6 * player.duration_mult * (2.0 if (id == "night_shift" or has_harmony("late_night_dub")) else 1.0)
		for k in n:
			afterimages.append({"angle": beam_angle + TAU * k / n, "t": life, "max_t": life, "id": id})
	var angles: Array = []
	for k in n:
		angles.append([beam_angle + TAU * k / n, 1.0])
	for a: Dictionary in afterimages:
		angles.append([float(a.angle), 0.4])
	for e: ForceEnemy in run.enemy_hash.query(player.position, length).duplicate():
		if e.dead:
			continue
		var rel: Vector2 = e.position - player.position
		var d: float = rel.length()
		if d > length + e.radius or d < 1.0:
			continue
		var best: float = 0.0
		for pair: Array in angles:
			var off: float = absf(wrapf(rel.angle() - float(pair[0]), -PI, PI)) * d
			if off < 16.0 + e.radius:
				best = maxf(best, float(pair[1]))
		if best > 0.0:
			run.damage_enemy(e, dps * best * delta, rel / d, 0.0, id, true)

func drone_position(i: int, count: int) -> Vector2:
	return player.position + Vector2.from_angle(-orbit_phase * 0.6 + TAU * i / maxf(1.0, float(count))) * 56.0

func _improvise(id: String) -> void:
	var count: int = int(stat(id, "count")) + player.projectile_bonus * 2
	var col: Color = GameData.FORCES["warm_circuits_rise"]["color"]
	var dmg: float = damage_for(id, stat(id, "damage"))
	var size: float = 6.0 + jam * 4.0
	var patterns: int = 2 if id == "long_jam" else 1
	for k in patterns:
		jam_pattern = (jam_pattern + 1 + randi() % 3) % 4 # never repeat the same pattern
		var t: ForceEnemy = run.nearest_enemy(player.position, 600.0)
		var aim: float = player.position.direction_to(t.position).angle() if t else randf() * TAU
		match jam_pattern:
			0: # spiral
				for i in count:
					var a: float = anim * 3.0 + TAU * i / count
					run.projectiles.spawn(player.position, Vector2.from_angle(a) * 340.0, dmg, 1.4, size, col, {"weapon": id})
			1: # aimed triplet bursts
				for i in count:
					var a2: float = aim + (randf() - 0.5) * 0.5
					run.projectiles.spawn(player.position, Vector2.from_angle(a2) * randf_range(380.0, 520.0), dmg, 1.3, size, col, {"weapon": id, "homing": 1.5})
			2: # wide arc
				for i in count:
					var a3: float = aim - 1.0 + 2.0 * i / maxf(1.0, count - 1.0)
					run.projectiles.spawn(player.position, Vector2.from_angle(a3) * 420.0, dmg, 1.2, size, col, {"weapon": id, "pierce": 1})
			_: # slow drifting stars
				for i in maxi(3, count / 2):
					run.projectiles.spawn(player.position, Vector2.from_angle(randf() * TAU) * 140.0, dmg * 1.6, 2.6, size + 3.0, col, {"weapon": id, "homing": 2.5, "pierce": 2})
	Audio.play_sfx("shot", randf_range(0.7, 1.3), -11.0, 0.08)

func _continuous(delta: float) -> void:
	for id: String in weapon_order:
		var b: String = base_id(id)
		if b == "riff_blades":
			var count: int = 6 if id == "titan_riff" else int(stat(id, "count"))
			var radius: float = stat(id, "radius") * player.area_mult * (1.0 + (0.25 * sin(anim * 1.6) if id == "titan_riff" else 0.0))
			var blade_r: float = 16.0 if id == "titan_riff" else 11.0
			var dps: float = damage_for(id, stat(id, "damage")) * 4.0
			for e: ForceEnemy in run.enemy_hash.query(player.position, radius + blade_r).duplicate():
				if e.dead:
					continue
				for i in count:
					var p: Vector2 = player.position + Vector2.from_angle(orbit_phase + TAU * i / count) * radius
					if p.distance_to(e.position) < e.radius + blade_r:
						run.damage_enemy(e, dps * delta, (e.position - player.position).normalized(), knock_for(id, 30.0), id, true)
						break
		elif b == "fuzz_wall":
			var radius2: float = stat(id, "radius") * player.area_mult * (0.75 + swell * 0.6)
			var dps2: float = damage_for(id, stat(id, "damage")) * 4.0
			for e: ForceEnemy in run.enemy_hash.query(player.position, radius2).duplicate():
				if e.dead:
					continue
				if e.position.distance_to(player.position) < radius2 + e.radius:
					run.damage_enemy(e, dps2 * delta, Vector2.ZERO, 0.0, id, true)
					if id == "wall_of_sound":
						e.slow = maxf(e.slow, 0.3)
			if id == "wall_of_sound":
				run.clear_hostile_shots_near(player.position, radius2)
		elif b == "nightline":
			_nightline(id, delta)

func _harmony_extras(delta: float) -> void:
	if has_harmony("road_jam") and player.movement_ratio() > 0.8:
		road_jam_clock -= delta
		if road_jam_clock <= 0.0:
			road_jam_clock = 1.0
			var aid: String = "long_jam" if weapons.has("long_jam") else "analog_star"
			if weapons.has(aid):
				_improvise(aid)
	if has_harmony("reverb_wall"):
		reverb_clock -= delta
		if reverb_clock <= 0.0:
			reverb_clock = 2.0
			var fid: String = "wall_of_sound" if weapons.has("wall_of_sound") else "fuzz_wall"
			var r: float = stat(fid, "radius") * player.area_mult * 1.3
			_area_hit(player.position, r, damage_for(fid, 30.0), fid, 160.0)
			run.fx.ring(player.position, 20.0, r, GameData.FORCES["minor_collapse"]["color"], 0.5, 6.0)

func _area_hit(center: Vector2, radius: float, dmg: float, id: String, knock: float) -> void:
	for e: ForceEnemy in run.enemy_hash.query(center, radius).duplicate():
		if e.dead:
			continue
		if e.position.distance_to(center) < radius + e.radius:
			run.damage_enemy(e, dmg, (e.position - center).normalized(), knock_for(id, knock), id)

func _queue_echo(delay: float, kind: String, pos: Vector2, dir: Vector2, dmg: float, radius: float, id: String) -> void:
	echoes.append({"t": delay, "kind": kind, "pos": pos, "dir": dir, "dmg": dmg, "radius": radius, "weapon": id})

func _step_echoes(delta: float) -> void:
	for i in range(echoes.size() - 1, -1, -1):
		var e: Dictionary = echoes[i]
		e.t = float(e.t) - delta
		if float(e.t) > 0.0:
			continue
		echoes.remove_at(i)
		var col: Color = GameData.FORCES["resonant_currents"]["color"]
		if String(e.kind) == "area":
			_area_hit(e.pos, float(e.radius), float(e.dmg), String(e.weapon), 160.0)
			run.fx.ring(e.pos, 20.0, float(e.radius), Color(col, 0.6), 0.4, 4.0)
		else:
			run.projectiles.spawn(e.pos, Vector2(e.dir) * 300.0, float(e.dmg), 1.6, float(e.radius) * 0.85, Color(col, 0.75), {"pierce": 1, "weapon": String(e.weapon), "knock": 60.0})

func _step_charges(delta: float) -> void:
	for i in range(charges.size() - 1, -1, -1):
		var c: Dictionary = charges[i]
		c.t = float(c.t) - delta
		if float(c.t) > 0.0:
			continue
		charges.remove_at(i)
		var col: Color = GameData.FORCES["ghost_driver_unit"]["color"]
		_area_hit(c.pos, float(c.radius), float(c.dmg), String(c.weapon), 220.0)
		run.fx.ring(c.pos, 10.0, float(c.radius), col, 0.35, 6.0)
		run.fx.burst(c.pos, col, 6, 200.0)
		Audio.play_sfx("mine", randf_range(0.9, 1.1), -8.0, 0.07)
		run.fx.flash(c.pos, float(c.radius) * 0.6, col.lerp(Color("ffcf7a"), 0.5), 0.1)
		run.fx.spark_spray(c.pos, Vector2.ZERO, Color("ffcf7a"), 8, 500.0, PI)
		run.fx.puff(c.pos, 2, float(c.radius) * 0.6)
		run.fx.scorch_mark(c.pos, float(c.radius) * 0.7, col)
		if String(c.weapon) == "ghost_mode":
			fields.append({"pos": c.pos, "radius": float(c.radius) * 0.7, "t": 2.0, "dps": float(c.dmg) * 0.4, "slow": false, "weapon": "ghost_mode", "color": col})

func _step_fields(delta: float) -> void:
	for i in range(fields.size() - 1, -1, -1):
		var f: Dictionary = fields[i]
		f.t = float(f.t) - delta
		if float(f.t) <= 0.0:
			fields.remove_at(i)
			continue
		for e: ForceEnemy in run.enemy_hash.query(f.pos, float(f.radius)).duplicate():
			if not e.dead and e.position.distance_to(f.pos) < float(f.radius) + e.radius:
				run.damage_enemy(e, float(f.dps) * delta, Vector2.ZERO, 0.0, String(f.weapon), true)
				if bool(f.slow):
					e.slow = maxf(e.slow, 0.3)

func _draw_chord_fx(dir: Vector2, reach: float, half_angle: float) -> void:
	var col: Color = GameData.FORCES["ghost_driver_unit"]["color"]
	var steps: int = 5
	for i in steps:
		var a: float = dir.angle() - half_angle + 2.0 * half_angle * i / (steps - 1)
		run.fx.beam(player.position + Vector2.from_angle(a) * 30.0, player.position + Vector2.from_angle(a) * reach, col, 0.16, 6.0)
	run.fx.ring(player.position + dir * reach * 0.4, 10.0, reach * 0.5, Color(col, 0.6), 0.25, 4.0)

# ------------------------------------------------------------------ drawing

func _draw() -> void:
	if player == null:
		return
	# Abby's answering Shard captains: pale hulls, red seams.
	for a: Dictionary in run.allies:
		var ap: Vector2 = run.ally_position(a)
		if String(a.get("kind", "")) == "skeleton":
			# A skeleton guard: dented helmet, bone body, a spear.
			draw_circle(ap, 7.0, Color("e8e2d0"))
			draw_arc(ap + Vector2(0, -3), 7.5, PI, TAU, 8, Color("6a6a70"), 3.0)
			draw_circle(ap + Vector2(-2.5, 0), 1.5, Color("1a1a1e"))
			draw_circle(ap + Vector2(2.5, 0), 1.5, Color("1a1a1e"))
			var sp: Vector2 = Vector2.from_angle(player.facing)
			draw_line(ap + sp * 4.0, ap + sp * 22.0, Color("8a6a40"), 2.0)
			draw_circle(ap + sp * 22.0, 2.5, Color("c8ccd6"))
			continue
		if String(a.get("kind", "")) == "gunnar":
			# Gunnar's smaller longship, round shield on the gunwale.
			var gf: Vector2 = Vector2.from_angle(player.facing)
			var gs: Vector2 = gf.orthogonal()
			draw_colored_polygon(PackedVector2Array([ap + gf * 16.0, ap + gs * 6.0, ap - gf * 12.0, ap - gs * 6.0]), Color("6b4a2e"))
			draw_circle(ap + gs * 5.0, 4.5, Color("c9a46a"))
			continue
		var fwd: Vector2 = Vector2.from_angle(float(a.angle) + run.elapsed * 1.4 + PI / 2.0)
		var sd: Vector2 = fwd.orthogonal()
		draw_colored_polygon(PackedVector2Array([ap + fwd * 12.0, ap - fwd * 8.0 + sd * 8.0, ap - fwd * 8.0 - sd * 8.0]), Color("e6e3dc"))
		draw_line(ap - fwd * 6.0, ap + fwd * 8.0, Color("d8323a"), 2.0)
	if run.relay_time > 0.0:
		# Launch-Shop relay: a short tripod mast with a dish and a blinking lamp.
		var rp: Vector2 = run.relay_pos
		var oc: Color = Color("e58a2b")
		draw_line(rp + Vector2(-14, 12), rp + Vector2(0, -24), Color("e9e0cc"), 3.0)
		draw_line(rp + Vector2(14, 12), rp + Vector2(0, -24), Color("e9e0cc"), 3.0)
		draw_line(rp + Vector2(0, 14), rp + Vector2(0, -24), Color("2f6fb0"), 3.0)
		draw_arc(rp + Vector2(0, -28), 10.0, PI * 1.1, PI * 1.9, 8, oc, 3.0)
		draw_circle(rp + Vector2(0, -24), 3.0, Color(oc, 0.5 + 0.5 * sin(run.elapsed * 8.0)))
		draw_arc(rp, 420.0, 0.0, TAU, 48, Color(oc, 0.18), 2.0)
	for id: String in weapon_order:
		var b: String = base_id(id)
		if b == "riff_blades":
			var count: int = 6 if id == "titan_riff" else int(stat(id, "count"))
			var radius: float = stat(id, "radius") * player.area_mult * (1.0 + (0.25 * sin(anim * 1.6) if id == "titan_riff" else 0.0))
			var col: Color = GameData.FORCES["star_splitter_rex"]["color"]
			var blade: float = 16.0 if id == "titan_riff" else 11.0
			for i in count:
				var a: float = orbit_phase + TAU * i / count
				var p: Vector2 = player.position + Vector2.from_angle(a) * radius
				var t: Vector2 = Vector2.from_angle(a + PI / 2.0)
				draw_line(p - t * blade * 1.3, p + t * blade * 1.3, Color(col, 0.3), blade * 1.2)
				draw_colored_polygon(PackedVector2Array([p + t * blade * 1.4, p + Vector2.from_angle(a) * blade * 0.5, p - t * blade * 0.8, p - Vector2.from_angle(a) * blade * 0.5]), col)
		elif b == "section_drones":
			var count2: int = 5 if id == "full_orchestra" else int(stat(id, "count"))
			var col2: Color = GameData.FORCES["ion_drive_orchestra"]["color"]
			for i in count2:
				var p2: Vector2 = drone_position(i, count2)
				draw_circle(p2, 10.0, Color(col2, 0.18))
				draw_colored_polygon(PackedVector2Array([p2 + Vector2(0, -8), p2 + Vector2(7, 5), p2 + Vector2(-7, 5)]), col2)
		elif b == "nightline":
			var length: float = stat(id, "radius") * player.area_mult * (1.25 if id == "night_shift" else 1.0)
			var ncol: Color = GameData.FORCES["night_motion_archives"]["color"]
			for a: Dictionary in afterimages:
				var tt: float = float(a.t) / float(a.max_t)
				draw_line(player.position, player.position + Vector2.from_angle(float(a.angle)) * length, Color(ncol, 0.10 * tt), 14.0)
			var n2: int = beam_count(id)
			for k in n2:
				var ang: float = beam_angle + TAU * k / n2
				var tip: Vector2 = player.position + Vector2.from_angle(ang) * length
				draw_line(player.position, tip, Color(ncol, 0.18), 26.0)
				draw_line(player.position, tip, Color(ncol, 0.75), 4.0)
				draw_circle(tip, 6.0, Color(1, 1, 1, 0.8))
		elif b == "duet_unit":
			var dcol: Color = GameData.FORCES["robots_sing_love_songs"]["color"]
			for cp: Vector2 in companions:
				draw_circle(cp, 13.0, Color(dcol, 0.15))
				draw_rect(Rect2(cp - Vector2(7, 8), Vector2(14, 14)), Color("e9e4f0"))
				draw_rect(Rect2(cp - Vector2(5, 4), Vector2(10, 3)), dcol)
				var mouth: float = 2.0 + 2.0 * absf(sin(anim * 9.0))
				draw_rect(Rect2(cp + Vector2(-3, 1), Vector2(6, mouth)), Color("2a2030"))
		elif b == "fuzz_wall":
			var radius3: float = stat(id, "radius") * player.area_mult * (0.75 + swell * 0.6)
			var col3: Color = GameData.FORCES["minor_collapse"]["color"]
			draw_circle(player.position, radius3, Color(col3, 0.07 + swell * 0.07))
			for k in 3:
				draw_arc(player.position, radius3 * (0.7 + 0.15 * k), anim * (0.4 + k * 0.2), anim * (0.4 + k * 0.2) + PI * 1.3, 32, Color(col3, 0.25 + swell * 0.25), 3.0)
	for bl: Dictionary in blooms:
		var grow: float = 1.0 - float(bl.t) / float(bl.max_t)
		var bc: Color = GameData.FORCES["minor_collapse"]["color"]
		draw_circle(bl.pos, 6.0 + 14.0 * grow, Color(bc, 0.25 + 0.4 * grow))
		draw_arc(bl.pos, float(bl.radius) * grow, 0.0, TAU, 32, Color(bc, 0.35), 2.0)
	for c: Dictionary in charges:
		var col4: Color = GameData.FORCES["ghost_driver_unit"]["color"]
		draw_circle(c.pos, 8.0, col4)
		draw_arc(c.pos, float(c.radius) * (1.0 - float(c.t) / 0.55), 0.0, TAU, 24, Color(col4, 0.35), 2.0)
	for f: Dictionary in fields:
		var fc: Color = f.color
		draw_circle(f.pos, float(f.radius), Color(fc, 0.10 * minf(1.0, float(f.t))))
		draw_arc(f.pos, float(f.radius), anim, anim + TAU, 32, Color(fc, 0.35 * minf(1.0, float(f.t))), 2.0)
