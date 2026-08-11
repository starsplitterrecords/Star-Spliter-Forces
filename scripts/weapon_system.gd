class_name WeaponSystem
extends Node2D

var owner_player: ForcePlayer
var run
var weapons: Dictionary = {}
var passives: Dictionary = {}
var clocks: Dictionary = {}
var wave_fx: float = 0.0
var lance_fx: float = 0.0
var lance_end: Vector2 = Vector2.ZERO
var orbit_phase: float = 0.0
var evolved_pulse: bool = false
var fracture_burst_clock: float = 0.0

func setup(player: ForcePlayer, run_node, starting_weapon: String) -> void:
	owner_player = player
	run = run_node
	weapons[starting_weapon] = 1
	for id in GameData.WEAPONS.keys():
		clocks[id] = 0.0

func _process(delta: float) -> void:
	if not owner_player or run.paused_for_choice:
		return
	orbit_phase += delta * (2.35 if run.force_state == "RESONANCE" else 1.9)
	wave_fx = maxf(0.0, wave_fx-delta)
	lance_fx = maxf(0.0, lance_fx-delta)
	fracture_burst_clock = maxf(0.0, fracture_burst_clock-delta)
	for id in weapons.keys():
		clocks[id] = float(clocks.get(id,0.0)) - delta
		if float(clocks[id]) <= 0.0:
			fire_weapon(String(id), int(weapons[id]))
	check_orbit_damage(delta)
	queue_redraw()

func force_id_for_weapon(id: String) -> String:
	return String(GameData.WEAPONS[id].force)

func cooldown(base: float, id: String) -> float:
	var mult: float = owner_player.cooldown_multiplier
	var force_id: String = force_id_for_weapon(id)
	if run.force_state == "RESONANCE" and force_id == "pulse_width_codex":
		mult *= 0.78
	elif run.force_state == "FRACTURE" and force_id == "ghost_driver":
		mult *= 0.82
	return maxf(0.10, base * mult)

func damage(base: float, level: int, id: String) -> float:
	var result: float = base * (1.0 + 0.28 * float(level-1)) * owner_player.damage_multiplier
	var force_id: String = force_id_for_weapon(id)
	if run.force_state == "RESONANCE":
		if force_id == "star_splitter_rex":
			result *= 1.30
		elif force_id == "pulse_width_codex":
			result *= 1.15
		elif force_id == "resonant_currents":
			result *= 1.18
	elif run.force_state == "FRACTURE":
		if force_id == "ghost_driver":
			result *= 1.35
		else:
			result *= 0.92
	if force_id == "ghost_driver":
		result *= 1.0 + owner_player.movement_ratio * 0.22
	return result

func fire_weapon(id: String, level: int) -> void:
	match id:
		"pulse_bolt":
			clocks[id] = cooldown(0.78 - level*0.035,id)
			var target = run.nearest_enemy(owner_player.position)
			if target:
				var count: int = 3 if evolved_pulse else (2 if level >= 5 else 1)
				if run.force_state == "RESONANCE":
					count += 1
				for i in count:
					var spread_index: float = float(i) - float(count-1)/2.0
					var dir: Vector2 = owner_player.position.direction_to(target.position).rotated(spread_index*0.13)
					run.spawn_projectile(owner_player.position, dir*540.0, damage(18.0,level,id), 2.1, 6.0, owner_player.accent, 1 if level>=4 else 0)
		"resonance_wave":
			clocks[id] = cooldown(3.7 - level*0.22,id)
			wave_fx = 0.38
			var wave_range: float = 125.0 + 23.0*level
			var wave_damage: float = damage(28.0,level,id)
			for enemy in run.live_enemies():
				if owner_player.position.distance_to(enemy.position) <= wave_range:
					enemy.take_damage(wave_damage)
					if run.force_state == "RESONANCE":
						enemy.take_damage(wave_damage * 0.32)
		"ion_lance":
			clocks[id] = cooldown(2.7 - level*0.16,id)
			var target = run.nearest_enemy(owner_player.position)
			if target:
				var dir: Vector2 = owner_player.position.direction_to(target.position)
				lance_end = dir * (620.0 + level*45.0)
				lance_fx = 0.18
				for enemy in run.live_enemies():
					var rel: Vector2 = enemy.position-owner_player.position
					var along: float = rel.dot(dir)
					var off: float = absf(rel.cross(dir))
					if along > 0.0 and along < lance_end.length() and off < 24.0+level*2.0:
						enemy.take_damage(damage(42.0,level,id))
		"ghost_mine":
			clocks[id] = cooldown(3.4 - level*0.18,id)
			var radius: float = 90.0+level*8.0
			run.spawn_mine(owner_player.position, damage(44.0,level,id), radius)
			if run.force_state == "FRACTURE" and owner_player.movement_ratio > 0.75:
				var offset: Vector2 = owner_player.move_input.normalized() * -55.0
				run.spawn_mine(owner_player.position+offset, damage(30.0,level,id), radius*0.75)
		"warm_drone":
			clocks[id] = cooldown(1.5 - level*0.08,id)
			var target = run.nearest_enemy(owner_player.position)
			if target:
				var dir: Vector2 = owner_player.position.direction_to(target.position)
				var side: Vector2 = Vector2(-dir.y,dir.x) * 28.0
				run.spawn_projectile(owner_player.position+side, dir*460.0, damage(24.0,level,id), 2.5, 8.0, Color("ffb35c"), 0)
		"orbit_shard":
			clocks[id] = 999.0

func check_orbit_damage(delta: float) -> void:
	if not weapons.has("orbit_shard"):
		return
	var level: int = int(weapons.orbit_shard)
	var count: int = 1 + int((level-1)/2)
	if run.force_state == "RESONANCE":
		count += 1
	var radius: float = 75.0 + level*8.0
	for enemy in run.live_enemies():
		for i in count:
			var p: Vector2 = owner_player.position + Vector2.from_angle(orbit_phase+TAU*float(i)/float(count))*radius
			if p.distance_to(enemy.position) < enemy.radius+11.0:
				enemy.take_damage(damage(19.0,level,"orbit_shard")*delta*4.2)
				break

func add_upgrade(id: String, passive: bool) -> void:
	if passive:
		passives[id] = mini(int(passives.get(id,0))+1, int(GameData.PASSIVES[id].max))
		var lvl: int = int(passives[id])
		match id:
			"amplifier":
				owner_player.damage_multiplier = 1.0 + 0.15*lvl
			"capacitor":
				owner_player.cooldown_multiplier = pow(0.92,lvl)
			"collector":
				owner_player.pickup_range = 84.0 + 28.0*lvl
			"hull":
				owner_player.max_hp += 18.0
				owner_player.heal(18.0)
	else:
		weapons[id] = mini(int(weapons.get(id,0))+1, int(GameData.WEAPONS[id].max))
		if id == "orbit_shard":
			clocks[id] = 0.0
	if int(weapons.get("pulse_bolt",0)) >= 4 and int(passives.get("amplifier",0)) >= 2:
		evolved_pulse = true

func choices() -> Array:
	var pool: Array = []
	for id in GameData.WEAPONS.keys():
		var lvl: int = int(weapons.get(id,0))
		if lvl < int(GameData.WEAPONS[id].max):
			pool.append({"id":String(id),"passive":false,"level":lvl+1})
	for id in GameData.PASSIVES.keys():
		var lvl: int = int(passives.get(id,0))
		if lvl < int(GameData.PASSIVES[id].max):
			pool.append({"id":String(id),"passive":true,"level":lvl+1})
	pool.shuffle()
	return pool.slice(0,mini(3,pool.size()))

func _draw() -> void:
	if not owner_player:
		return
	if weapons.has("orbit_shard"):
		var level: int = int(weapons.orbit_shard)
		var count: int = 1+int((level-1)/2)
		if run.force_state == "RESONANCE":
			count += 1
		var radius: float = 75.0+level*8.0
		for i in count:
			var p: Vector2 = owner_player.position + Vector2.from_angle(orbit_phase+TAU*float(i)/float(count))*radius
			draw_circle(to_local(p), 9.0, Color("d38cff"))
	if wave_fx>0.0:
		var level: int = int(weapons.get("resonance_wave",1))
		draw_arc(to_local(owner_player.position),125.0+23.0*level,0,TAU,64,Color(0.4,0.95,1.0,wave_fx/0.38),6.0)
		if run.force_state == "RESONANCE":
			draw_arc(to_local(owner_player.position),105.0+20.0*level,0,TAU,64,Color(0.45,1.0,0.72,wave_fx/0.38),3.0)
	if lance_fx>0.0:
		var lance_color: Color = Color("ff9a68") if run.force_state == "RESONANCE" else Color("bff3ff")
		draw_line(to_local(owner_player.position),to_local(owner_player.position+lance_end),Color(lance_color,lance_fx/0.18),14.0)
