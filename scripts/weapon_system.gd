class_name WeaponSystem
extends Node2D

var owner_player: ForcePlayer
var run
var weapons := {}
var passives := {}
var clocks := {}
var wave_fx := 0.0
var lance_fx := 0.0
var lance_end := Vector2.ZERO
var orbit_phase := 0.0
var evolved_pulse := false

func setup(player: ForcePlayer, run_node, starting_weapon: String) -> void:
	owner_player = player
	run = run_node
	weapons[starting_weapon] = 1
	for id in GameData.WEAPONS.keys():
		clocks[id] = 0.0

func _process(delta: float) -> void:
	if not owner_player or run.paused_for_choice:
		return
	orbit_phase += delta * 1.9
	wave_fx = maxf(0.0, wave_fx-delta)
	lance_fx = maxf(0.0, lance_fx-delta)
	for id in weapons.keys():
		clocks[id] = float(clocks.get(id,0.0)) - delta
		if float(clocks[id]) <= 0.0:
			fire_weapon(id, int(weapons[id]))
	check_orbit_damage(delta)
	queue_redraw()

func cooldown(base: float) -> float:
	return maxf(0.12, base * owner_player.cooldown_multiplier)

func damage(base: float, level: int) -> float:
	return base * (1.0 + 0.28 * (level-1)) * owner_player.damage_multiplier

func fire_weapon(id: String, level: int) -> void:
	match id:
		"pulse_bolt":
			clocks[id] = cooldown(0.78 - level*0.035)
			var target = run.nearest_enemy(owner_player.position)
			if target:
				var count := 3 if evolved_pulse else (2 if level >= 5 else 1)
				for i in count:
					var dir := owner_player.position.direction_to(target.position).rotated((i-(count-1)/2.0)*0.13)
					run.spawn_projectile(owner_player.position, dir*520.0, damage(18.0,level), 2.1, 6.0, owner_player.accent, 1 if level>=4 else 0)
		"resonance_wave":
			clocks[id] = cooldown(3.7 - level*0.22)
			wave_fx = 0.32
			var range := 125.0 + 23.0*level
			for enemy in run.live_enemies():
				if owner_player.position.distance_to(enemy.position) <= range:
					enemy.take_damage(damage(28.0,level))
		"ion_lance":
			clocks[id] = cooldown(2.7 - level*0.16)
			var target = run.nearest_enemy(owner_player.position)
			if target:
				var dir := owner_player.position.direction_to(target.position)
				lance_end = dir * (620.0 + level*45.0)
				lance_fx = 0.15
				for enemy in run.live_enemies():
					var rel: Vector2 = enemy.position-owner_player.position
					var along := rel.dot(dir)
					var off := absf(rel.cross(dir))
					if along > 0.0 and along < lance_end.length() and off < 24.0+level*2.0:
						enemy.take_damage(damage(42.0,level))
		"ghost_mine":
			clocks[id] = cooldown(3.4 - level*0.18)
			run.spawn_mine(owner_player.position, damage(44.0,level), 90.0+level*8.0)
		"warm_drone":
			clocks[id] = cooldown(1.5 - level*0.08)
			var target = run.nearest_enemy(owner_player.position)
			if target:
				var dir := owner_player.position.direction_to(target.position)
				var side := Vector2(-dir.y,dir.x) * 28.0
				run.spawn_projectile(owner_player.position+side, dir*440.0, damage(24.0,level), 2.5, 8.0, Color("ffb35c"), 0)
		"orbit_shard":
			clocks[id] = 999.0

func check_orbit_damage(delta: float) -> void:
	if not weapons.has("orbit_shard"):
		return
	var level := int(weapons.orbit_shard)
	var count := 1 + int((level-1)/2)
	var radius := 75.0 + level*8.0
	for enemy in run.live_enemies():
		for i in count:
			var p := owner_player.position + Vector2.from_angle(orbit_phase+TAU*i/count)*radius
			if p.distance_to(enemy.position) < enemy.radius+11.0:
				enemy.take_damage(damage(19.0,level)*delta*4.2)
				break

func add_upgrade(id: String, passive: bool) -> void:
	if passive:
		passives[id] = min(int(passives.get(id,0))+1, int(GameData.PASSIVES[id].max))
		var lvl := int(passives[id])
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
		weapons[id] = min(int(weapons.get(id,0))+1, int(GameData.WEAPONS[id].max))
		if id == "orbit_shard":
			clocks[id] = 0.0
	if int(weapons.get("pulse_bolt",0)) >= 4 and int(passives.get("amplifier",0)) >= 2:
		evolved_pulse = true

func choices() -> Array:
	var pool: Array = []
	for id in GameData.WEAPONS.keys():
		var lvl := int(weapons.get(id,0))
		if lvl < int(GameData.WEAPONS[id].max):
			pool.append({"id":id,"passive":false,"level":lvl+1})
	for id in GameData.PASSIVES.keys():
		var lvl := int(passives.get(id,0))
		if lvl < int(GameData.PASSIVES[id].max):
			pool.append({"id":id,"passive":true,"level":lvl+1})
	pool.shuffle()
	return pool.slice(0,min(3,pool.size()))

func _draw() -> void:
	if not owner_player:
		return
	if weapons.has("orbit_shard"):
		var level := int(weapons.orbit_shard)
		var count := 1+int((level-1)/2)
		var radius := 75.0+level*8.0
		for i in count:
			var p := owner_player.position + Vector2.from_angle(orbit_phase+TAU*i/count)*radius
			draw_circle(to_local(p), 9.0, Color("d38cff"))
	if wave_fx>0.0:
		var level := int(weapons.get("resonance_wave",1))
		draw_arc(to_local(owner_player.position),125.0+23.0*level,0,TAU,64,Color(0.4,0.95,1.0,wave_fx/0.32),6.0)
	if lance_fx>0.0:
		draw_line(to_local(owner_player.position),to_local(owner_player.position+lance_end),Color(0.75,0.95,1.0,lance_fx/0.15),12.0)
