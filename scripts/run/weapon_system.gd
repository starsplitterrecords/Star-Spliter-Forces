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
	if run.character_id == "kess_darrow":
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
	if run.character_id == "tessa_banks":
		dmg *= 0.9
	if run.character_id == "naomi_sol" and player.movement_ratio() > 0.9:
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
	var k: float = base
	if GameData.weapon_force(id) == "star_splitter_rex":
		k *= 2.2
		if has_harmony("stadium"):
			k *= 1.0 + momentum
	return k

## Called by the run whenever a weapon hit lands.
func on_hit(weapon_id: String) -> void:
	if GameData.weapon_force(weapon_id) == "pulse_width_codex" and drop_time <= 0.0:
		var gain: float = 1.6 * (1.6 if run.force_state == "RESONANCE" else 1.0)
		build = minf(100.0, build + gain)
		if build >= 100.0 and not drop_armed:
			drop_armed = true
			run.fx.label(player.position + Vector2(0, -56), "BUILD PEAKING", GameData.FORCES["pulse_width_codex"]["color"], 16, 0.9)

func on_player_hurt() -> void:
	jam = 0.0 if not is_evolved_present("long_jam") else jam * 0.5

func is_evolved_present(id: String) -> bool:
	return weapons.has(id)

# ------------------------------------------------------------------ beats

func on_beat(index: int) -> void:
	var on_bar: bool = index % 4 == 0
	if on_bar and drop_armed:
		_drop()
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
	run.fx.ring(player.position, 10.0, radius * 0.7, Color.WHITE, 0.45, 4.0)
	run.fx.label(player.position + Vector2(0, -70), "DROP", col, 30, 1.0)
	run.shake(8.0)
	run.hitstop(0.05)
	Audio.play_sfx("drop", 1.0, 0.0, 0.2)
	if has_harmony("dub_drop"):
		_queue_echo(0.5, "area", player.position, Vector2.ZERO, dmg * 0.6, radius * 0.9, "pulse_bolt")
		_queue_echo(1.0, "area", player.position, Vector2.ZERO, dmg * 0.35, radius * 0.8, "pulse_bolt")

# ------------------------------------------------------------------ update

func step(delta: float) -> void:
	anim += delta
	silenced = run.hazards.player_silenced(player.position)
	drop_time = maxf(0.0, drop_time - delta)
	var moving: float = player.movement_ratio()
	if has_force("ghost_driver_unit"):
		momentum = clampf(momentum + (delta * 0.45 if moving > 0.7 else -delta * 0.8), 0.0, 1.0)
	if has_force("warm_circuits_rise"):
		jam = minf(1.0, jam + delta / 40.0)
	if has_force("minor_collapse"):
		swell = clampf(swell + (delta * 0.6 if moving < 0.45 else -delta * 0.9), 0.0, 1.0)
	orbit_phase += delta * (2.4 if run.force_state == "RESONANCE" else 2.0)
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
		elif b == "fuzz_wall":
			var radius3: float = stat(id, "radius") * player.area_mult * (0.75 + swell * 0.6)
			var col3: Color = GameData.FORCES["minor_collapse"]["color"]
			draw_circle(player.position, radius3, Color(col3, 0.07 + swell * 0.07))
			for k in 3:
				draw_arc(player.position, radius3 * (0.7 + 0.15 * k), anim * (0.4 + k * 0.2), anim * (0.4 + k * 0.2) + PI * 1.3, 32, Color(col3, 0.25 + swell * 0.25), 3.0)
	for c: Dictionary in charges:
		var col4: Color = GameData.FORCES["ghost_driver_unit"]["color"]
		draw_circle(c.pos, 8.0, col4)
		draw_arc(c.pos, float(c.radius) * (1.0 - float(c.t) / 0.55), 0.0, TAU, 24, Color(col4, 0.35), 2.0)
	for f: Dictionary in fields:
		var fc: Color = f.color
		draw_circle(f.pos, float(f.radius), Color(fc, 0.10 * minf(1.0, float(f.t))))
		draw_arc(f.pos, float(f.radius), anim, anim + TAU, 32, Color(fc, 0.35 * minf(1.0, float(f.t))), 2.0)
