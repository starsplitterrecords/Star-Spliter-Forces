class_name ForceEnemy
extends Node2D
## A hostile. Each archetype has a behaviour, not just different numbers:
## wanderers ignore you until you come close, hounds telegraph their charges,
## carriers summon, lancers keep range and fire telegraphed shots, layers deny
## space, ambushers hide as debris, wardens shield allies, elites pulse, and
## The Silence runs a three-phase pattern set.

signal died(enemy: ForceEnemy)

var run: Node # GameRun (untyped to avoid a cyclic class dependency)
var kind: String = "static_wisp"
var def: Dictionary = {}
var behavior: String = "drift"
var hp: float = 10.0
var max_hp: float = 10.0
var speed: float = 80.0
var contact_damage: float = 8.0
var xp_value: int = 1
var radius: float = 14.0
var tint: Color = Color.WHITE
var shape: String = "orb"
var elite: bool = false
var boss: bool = false
var region_id: String = ""
var last_hit_dir: Vector2 = Vector2.ZERO
var last_number_time: float = -1.0
var harmony_mark: bool = false
var latched: float = 0.0       # leech: seconds attached to the player
var blink_target: Vector2 = Vector2.ZERO
var camp: int = -1

var engaged: bool = false
var aggro_radius: float = 420.0
var home: Vector2 = Vector2.ZERO
var wander_target: Vector2 = Vector2.ZERO
var age: float = 0.0
var clock: float = 0.0
var phase_clock: float = 0.0
var lateral: float = 1.0
var knock: Vector2 = Vector2.ZERO
var dash: Vector2 = Vector2.ZERO
var telegraph: float = 0.0
var telegraph_dir: Vector2 = Vector2.ZERO
var hit_flash: float = 0.0
var contact_clock: float = 0.0
var slow: float = 0.0
var shielded: float = 0.0
var boss_phase: int = 1
var dead: bool = false
var disguised: bool = false
var visible_on_screen: bool = true
var damage_taken_mult: float = 1.0

func configure(enemy_kind: String, run_node: Node, scale: float, region: String) -> void:
	kind = enemy_kind
	run = run_node
	region_id = region
	def = GameData.ENEMIES[kind]
	behavior = String(def["behavior"])
	hp = float(def["hp"]) * scale
	max_hp = hp
	speed = float(def["speed"]) * (1.0 + (scale - 1.0) * 0.15)
	contact_damage = float(def["damage"]) * (1.0 + (scale - 1.0) * 0.5)
	xp_value = int(def["xp"])
	radius = float(def["radius"])
	tint = def["color"]
	shape = String(def.get("shape", "orb"))
	elite = bool(def.get("elite", false))
	boss = bool(def.get("boss", false))
	aggro_radius = float(def.get("aggro", 460.0))
	lateral = -1.0 if randf() < 0.5 else 1.0
	clock = randf_range(0.5, 2.0)
	home = position
	wander_target = position
	if behavior == "ambush":
		disguised = true
	if elite or boss:
		engaged = true

func step(delta: float, player_pos: Vector2) -> void:
	age += delta
	clock -= delta
	hit_flash = maxf(0.0, hit_flash - delta)
	contact_clock = maxf(0.0, contact_clock - delta)
	slow = maxf(0.0, slow - delta)
	shielded = maxf(0.0, shielded - delta)
	var to_player: Vector2 = player_pos - position
	var dist: float = to_player.length()
	var dir: Vector2 = to_player / maxf(dist, 0.001)
	var spd: float = speed * (0.55 if slow > 0.0 else 1.0)
	if not engaged:
		if dist < aggro_radius:
			engaged = true
			if disguised:
				disguised = false
				telegraph = 0.45
				if run:
					run.on_ambush(self)
		else:
			_wander(delta, spd)
			_apply_knock(delta)
			return
	elif dist > aggro_radius * 2.6 and not elite and not boss:
		engaged = false
		if camp < 0:
			home = position
	if telegraph > 0.0:
		telegraph -= delta
		if telegraph <= 0.0:
			_release(dir)
		_apply_knock(delta)
		return
	match behavior:
		"drift":
			var tangent: Vector2 = Vector2(-dir.y, dir.x)
			position += (dir + tangent * sin(age * 3.0) * 0.6).normalized() * spd * delta
		"charge":
			if dash.length_squared() > 4.0:
				position += dash * delta
				dash = dash.move_toward(Vector2.ZERO, 700.0 * delta)
			elif clock <= 0.0 and dist < 380.0:
				telegraph = 0.7
				telegraph_dir = dir
				clock = 2.8
			else:
				position += dir * spd * 0.7 * delta
		"orbit":
			var orbit: Vector2 = Vector2(-dir.y, dir.x) * lateral
			var radial: float = 0.45 if dist > 300.0 else -0.25
			position += (orbit + dir * radial).normalized() * spd * delta
			if clock <= 0.0 and run:
				clock = float(def.get("summon_every", 6.0))
				run.enemy_summon(self, String(def.get("summon", "skiff")), int(def.get("summon_count", 2)))
		"ranged":
			var keep: float = float(def.get("keep", 330.0))
			var radial2: float = 1.0 if dist > keep + 40.0 else (-1.0 if dist < keep - 40.0 else 0.0)
			var strafe: Vector2 = Vector2(-dir.y, dir.x) * lateral * 0.6
			position += (dir * radial2 + strafe).normalized() * spd * delta
			if clock <= 0.0 and dist < keep + 220.0:
				telegraph = 0.75
				telegraph_dir = dir
				clock = float(def.get("fire_every", 3.2))
		"layer":
			var drift_dir: Vector2 = (dir + Vector2(-dir.y, dir.x) * lateral * 1.4).normalized()
			position += drift_dir * spd * delta
			if clock <= 0.0 and run:
				clock = float(def.get("lay_every", 2.6))
				run.spawn_hazard(position, float(def.get("hazard_radius", 60.0)), contact_damage * 0.5, 5.0, tint)
		"ambush":
			position += dir * spd * (1.6 if age < 3.0 else 1.0) * delta
		"warden":
			var keep2: float = 220.0
			var r2: float = 1.0 if dist > keep2 else -0.6
			position += (dir * r2 + Vector2(-dir.y, dir.x) * lateral * 0.5).normalized() * spd * delta
			if clock <= 0.0 and run:
				clock = 1.0
				run.enemy_shield_pulse(self, 170.0)
		"surge":
			var surge_mult: float = 1.9 if fmod(age, 3.4) < 0.9 else 0.6
			position += dir * spd * surge_mult * delta
			if clock <= 0.0:
				telegraph = 0.9
				telegraph_dir = dir
				clock = 5.5
		"boss":
			_boss_step(delta, dir, dist, spd)
		"leech":
			# Latches onto the hull and drags it down, then lets go.
			if latched > 0.0:
				latched -= delta
				position = player_pos + Vector2.from_angle(age * 3.0) * 20.0
				if run:
					run.player.slow_timer = maxf(run.player.slow_timer, 0.2)
				if latched <= 0.0:
					knock = -dir * 520.0
					clock = 3.0
			elif dist < radius + 26.0 and clock <= 0.0:
				latched = 4.0
			else:
				var wobble: Vector2 = Vector2(-dir.y, dir.x) * sin(age * 7.0) * 0.5
				position += (dir + wobble).normalized() * spd * delta
		"blink":
			# A Veil flicker: marks a point beside you, then reappears there.
			position += Vector2(-dir.y, dir.x) * lateral * spd * 0.4 * delta
			if clock <= 0.0 and dist < 700.0:
				blink_target = player_pos + Vector2.from_angle(randf() * TAU) * randf_range(90.0, 150.0)
				telegraph = 0.85
				telegraph_dir = dir
				clock = 3.2
		"dreadnought":
			# Salvage hulk: closes slowly, then turns broadside and fires.
			var want: float = 300.0
			var radial: float = 1.0 if dist > want + 60.0 else (-0.4 if dist < want - 60.0 else 0.0)
			position += (dir * radial + Vector2(-dir.y, dir.x) * lateral * 0.3).normalized() * spd * delta
			if clock <= 0.0:
				telegraph = 1.1
				telegraph_dir = dir
				clock = 4.4
			if fmod(age, 9.0) < delta and run:
				run.enemy_summon(self, "skiff", 2)
		_:
			position += dir * spd * delta
	_apply_knock(delta)

func _wander(delta: float, spd: float) -> void:
	if position.distance_squared_to(wander_target) < 400.0 or clock <= 0.0:
		wander_target = home + Vector2.from_angle(randf() * TAU) * randf_range(40.0, 180.0)
		clock = randf_range(2.0, 4.5)
	if behavior == "ambush":
		return
	position += position.direction_to(wander_target) * spd * 0.35 * delta

func _apply_knock(delta: float) -> void:
	if knock.length_squared() > 1.0:
		position += knock * delta
		knock = knock.move_toward(Vector2.ZERO, 900.0 * delta)

func _release(dir: Vector2) -> void:
	match behavior:
		"charge":
			dash = telegraph_dir * speed * 4.2
		"ranged":
			if run:
				var burst: int = int(def.get("burst", 1))
				for k in burst:
					var spread: float = (float(k) - float(burst - 1) / 2.0) * 0.18
					run.spawn_enemy_shot(position, telegraph_dir.rotated(spread) * float(def.get("shot_speed", 260.0)), contact_damage * 0.8, tint)
		"blink":
			if run:
				run.fx.flash(position, 24.0, tint, 0.12)
				position = blink_target
				run.fx.flash(position, 30.0, tint, 0.15)
				run.fx.ring(position, 10.0, 70.0, tint, 0.3, 4.0)
				if position.distance_to(run.player.position) < 75.0:
					run.player_hit(contact_damage, position)
		"dreadnought":
			if run:
				# Broadsides: two long lines perpendicular to its heading.
				var side: Vector2 = telegraph_dir.orthogonal()
				for sgn: float in [-1.0, 1.0]:
					run.spawn_beam(position, side * sgn, 760.0, 30.0, contact_damage, tint)
				run.fx.flash(position, radius * 1.2, Color("ffcf8a"), 0.15)
		"surge":
			if run:
				run.spawn_shockwave(position, 210.0, contact_damage, tint)
		"boss":
			_boss_release(dir)

# ------------------------------------------------------------------ boss

func _boss_step(delta: float, dir: Vector2, dist: float, spd: float) -> void:
	var ratio: float = hp / max_hp
	var new_phase: int = 3 if ratio < 0.34 else (2 if ratio < 0.67 else 1)
	if new_phase != boss_phase:
		boss_phase = new_phase
		clock = 1.4
		if run:
			run.on_boss_phase(self, boss_phase)
	var tangent: Vector2 = Vector2(-dir.y, dir.x) * lateral
	var want: float = 260.0
	var radial: float = 0.8 if dist > want + 60.0 else (-0.5 if dist < want - 60.0 else 0.0)
	position += (dir * radial + tangent * 0.55).normalized() * spd * (0.8 + 0.15 * boss_phase) * delta
	if clock <= 0.0:
		telegraph_dir = dir
		match boss_phase:
			1:
				telegraph = 0.8
				clock = 3.6
			2:
				telegraph = 1.0
				clock = 4.2
			_:
				telegraph = 0.9
				clock = 3.4

func _boss_release(_dir: Vector2) -> void:
	if run == null:
		return
	match boss_phase:
		1:
			# Expanding ring with a gap aimed away from the player's flank:
			# readable, dodge by moving to the gap.
			var gap: float = telegraph_dir.angle() + PI * 0.15 * lateral
			for i in 18:
				var a: float = TAU * i / 18.0
				if absf(wrapf(a - gap, -PI, PI)) < 0.45:
					continue
				run.spawn_enemy_shot(position, Vector2.from_angle(a) * 190.0, contact_damage * 0.55, tint)
		2:
			run.spawn_beam(position, telegraph_dir, 900.0, 46.0, contact_damage * 1.1, tint)
			run.enemy_summon(self, "skiff", 3)
		_:
			for i in 3:
				var off: Vector2 = Vector2.from_angle(randf() * TAU) * randf_range(60.0, 220.0)
				run.spawn_silence_zone(run.player.position + off, 110.0, 6.0)
			for i in 10:
				run.spawn_enemy_shot(position, Vector2.from_angle(TAU * i / 10.0 + age) * 220.0, contact_damage * 0.5, tint)

# ------------------------------------------------------------------ damage

func take_damage(amount: float, knock_dir: Vector2 = Vector2.ZERO, knock_force: float = 0.0) -> float:
	if dead:
		return 0.0
	if disguised:
		disguised = false
		engaged = true
	var dmg: float = amount * damage_taken_mult * (0.5 if shielded > 0.0 else 1.0)
	hp -= dmg
	hit_flash = 0.09
	engaged = true
	if knock_force > 0.0 and not boss:
		var resist: float = 0.35 if elite else 1.0
		knock += knock_dir * knock_force * resist
	if hp <= 0.0:
		dead = true
		died.emit(self)
	return dmg

# ------------------------------------------------------------------ drawing

func _process(_delta: float) -> void:
	if visible_on_screen:
		queue_redraw()

const THREAT_RIM: Color = Color(1.0, 0.29, 0.29, 0.9)

func _draw() -> void:
	var c: Color = Color.WHITE if hit_flash > 0.0 else tint
	# Hit squash: a quick flattening along the impact direction reads as weight.
	if hit_flash > 0.0 and not boss:
		var sq: float = hit_flash / 0.09
		var ang: float = last_hit_dir.angle()
		# Scale along the hit axis without rotating the silhouette.
		var m: Transform2D = Transform2D(ang, Vector2.ZERO) * Transform2D.IDENTITY.scaled(Vector2(1.0 - 0.22 * sq, 1.0 + 0.16 * sq)) * Transform2D(-ang, Vector2.ZERO)
		draw_set_transform_matrix(m)
	if disguised:
		# Disguised as drifting debris — an observant player can spot the faint pulse.
		var pts: PackedVector2Array = PackedVector2Array([Vector2(-radius, -radius * 0.4), Vector2(-radius * 0.2, -radius), Vector2(radius, -radius * 0.3), Vector2(radius * 0.6, radius * 0.8), Vector2(-radius * 0.7, radius * 0.6)])
		draw_colored_polygon(pts, Color("2a3142"))
		draw_circle(Vector2.ZERO, 2.0 + sin(age * 2.0) * 1.0, Color(tint, 0.35))
		return
	if telegraph > 0.0:
		_draw_telegraph(c)
	# Threat language (Field Guide): every hostile sits on a red glow inside a
	# red ring, so nothing dangerous can be mistaken for a pickup.
	var rim_r: float = radius + (7.0 if elite or boss else 5.0)
	draw_circle(Vector2.ZERO, rim_r, Color(1.0, 0.12, 0.18, 0.16))
	draw_arc(Vector2.ZERO, rim_r, 0.0, TAU, 20 if radius < 30.0 else 40, THREAT_RIM, 2.5 if not (elite or boss) else 5.0)
	if elite or boss:
		draw_arc(Vector2.ZERO, rim_r + 6.0, 0.0, TAU, 40, Color("ffb03a", 0.8), 2.0)
	if shielded > 0.0:
		draw_arc(Vector2.ZERO, radius + 6.0, 0.0, TAU, 24, Color("9fe8ff", 0.6), 2.0)
	var face: float = telegraph_dir.angle() if telegraph_dir != Vector2.ZERO else age
	match shape:
		"orb":
			draw_circle(Vector2.ZERO, radius, Color(c, 0.92))
			draw_circle(Vector2.ZERO, radius * 0.4, Color("111426"))
			draw_arc(Vector2.ZERO, radius * 0.7, age * 3.0, age * 3.0 + 2.0, 10, Color(1, 1, 1, 0.5), 2.0)
		"dart":
			var rot: Vector2 = Vector2.from_angle(face if behavior == "charge" else (run.player.position - position).angle() if run and run.player else 0.0)
			var side: Vector2 = Vector2(-rot.y, rot.x)
			draw_colored_polygon(PackedVector2Array([rot * radius * 1.2, -rot * radius * 0.7 + side * radius * 0.8, -rot * radius * 0.3, -rot * radius * 0.7 - side * radius * 0.8]), c)
		"ring":
			draw_arc(Vector2.ZERO, radius, 0.0, TAU, 22, c, 7.0)
			draw_circle(Vector2.ZERO, radius * 0.4, Color(c, 0.6))
			for i in 3:
				draw_circle(Vector2.from_angle(age * 1.4 + TAU * i / 3.0) * radius, 4.0, c)
		"lancer":
			var r2: Vector2 = Vector2.from_angle((run.player.position - position).angle()) if run and run.player else Vector2.RIGHT
			var s2: Vector2 = Vector2(-r2.y, r2.x)
			draw_colored_polygon(PackedVector2Array([r2 * radius * 1.3, s2 * radius * 0.5, -r2 * radius * 0.8, -s2 * radius * 0.5]), c)
			draw_line(-r2 * radius * 0.4, r2 * radius * 1.7, Color(1, 1, 1, 0.6), 2.0)
		"cell":
			for i in 5:
				var a: float = TAU * i / 5.0 + age * 0.5
				draw_circle(Vector2.from_angle(a) * radius * 0.55, radius * 0.45, Color(c, 0.7))
			draw_circle(Vector2.ZERO, radius * 0.35, Color("101425"))
		"warden":
			draw_colored_polygon(PackedVector2Array([Vector2(0, -radius), Vector2(radius, 0), Vector2(0, radius), Vector2(-radius, 0)]), Color(c, 0.85))
			draw_arc(Vector2.ZERO, radius * 1.3, age, age + PI, 16, Color(c, 0.6), 3.0)
			draw_arc(Vector2.ZERO, radius * 1.3, age + PI, age + PI * 2.0, 16, Color(1, 1, 1, 0.3), 3.0)
		"shard":
			draw_colored_polygon(PackedVector2Array([Vector2(-radius, -radius * 0.4), Vector2(-radius * 0.2, -radius), Vector2(radius, -radius * 0.3), Vector2(radius * 0.6, radius * 0.8), Vector2(-radius * 0.7, radius * 0.6)]), c)
			draw_circle(Vector2.ZERO, radius * 0.3, Color("101425"))
		"elite":
			var spin: float = age * 0.8
			var pts2: PackedVector2Array = PackedVector2Array()
			for i in 8:
				var rr: float = radius * (1.0 if i % 2 == 0 else 0.62)
				pts2.append(Vector2.from_angle(spin + TAU * i / 8.0) * rr)
			draw_colored_polygon(pts2, c)
			draw_circle(Vector2.ZERO, radius * 0.38, Color("16172a"))
			draw_arc(Vector2.ZERO, radius * 0.38, 0.0, TAU, 20, Color(1, 1, 1, 0.6), 2.0)
		"gunship":
			var gr: Vector2 = Vector2.from_angle((run.player.position - position).angle()) if run and run.player else Vector2.RIGHT
			var gs: Vector2 = gr.orthogonal()
			draw_colored_polygon(PackedVector2Array([gr * radius, gs * radius * 0.9 - gr * radius * 0.6, -gr * radius * 0.4, -gs * radius * 0.9 - gr * radius * 0.6]), c)
			for sg2: float in [-1.0, 1.0]:
				draw_line(gs * sg2 * radius * 0.45, gs * sg2 * radius * 0.45 + gr * radius * 1.3, Color("2a2a30"), 4.0)
			draw_circle(Vector2.ZERO, radius * 0.25, Color("1a1a20"))
		"leech":
			for k in 4:
				var seg: Vector2 = Vector2.from_angle(age * 5.0 + k * 0.6) * k * 4.0
				draw_circle(seg, radius * (1.0 - k * 0.18), Color(c, 1.0 - k * 0.15))
			draw_circle(Vector2.ZERO, radius * 0.35, Color("1a2416"))
		"blink":
			var flick: float = 0.6 + 0.4 * sin(age * 13.0)
			draw_colored_polygon(PackedVector2Array([Vector2(0, -radius), Vector2(radius * 0.7, 0), Vector2(0, radius), Vector2(-radius * 0.7, 0)]), Color(c, flick))
			draw_arc(Vector2.ZERO, radius * 1.3, age * 2.0, age * 2.0 + PI, 16, Color(c, 0.5), 2.0)
		"dreadnought":
			var dr: Vector2 = Vector2.from_angle(telegraph_dir.angle() if telegraph_dir != Vector2.ZERO else 0.0)
			var ds: Vector2 = dr.orthogonal()
			var hull: PackedVector2Array = PackedVector2Array([dr * radius * 1.5, ds * radius * 0.7 + dr * radius * 0.4, ds * radius * 0.8 - dr * radius * 1.2, -ds * radius * 0.8 - dr * radius * 1.2, -ds * radius * 0.7 + dr * radius * 0.4])
			draw_colored_polygon(hull, c)
			# Mismatched salvage plating: no faction marks.
			for k in 4:
				var pc: Vector2 = dr * radius * (0.8 - k * 0.55)
				draw_rect(Rect2(pc - Vector2(9, 9), Vector2(18, 18)), [Color("8a8f99"), Color("7d7f4a"), Color("5f6670"), Color("b0683a")][k])
			draw_circle(-dr * radius * 1.2, 8.0, Color("ffcf8a", 0.8))
		"silence":
			for i in 8:
				var a2: float = TAU * i / 8.0 + age * 0.25 * (1.0 + boss_phase * 0.3)
				draw_line(Vector2.from_angle(a2) * radius * 0.6, Vector2.from_angle(a2) * radius * (1.45 + 0.1 * sin(age * 3.0 + i)), Color(c, 0.6), 7.0)
			draw_circle(Vector2.ZERO, radius, Color(c, 0.9))
			draw_circle(Vector2.ZERO, radius * 0.62, Color("0c0a16"))
			draw_arc(Vector2.ZERO, radius * 0.8, 0.0, TAU, 40, c, 5.0)
			# The "eye" tracks the player.
			if run and run.player:
				var look: Vector2 = (run.player.position - position).limit_length(radius * 0.25)
				draw_circle(look, radius * 0.16, Color(1, 1, 1, 0.85))
		_:
			draw_circle(Vector2.ZERO, radius, c)
	if (elite or boss) and not boss:
		var w: float = radius * 2.4
		draw_rect(Rect2(-w / 2.0, -radius - 14.0, w, 5.0), Color("211d32"))
		draw_rect(Rect2(-w / 2.0, -radius - 14.0, w * clampf(hp / max_hp, 0.0, 1.0), 5.0), c)

func _draw_telegraph(c: Color) -> void:
	var t: float = clampf(telegraph, 0.0, 1.0)
	var warn: Color = Color(1.0, 0.92, 0.6, 0.25 + (1.0 - t) * 0.45)
	match behavior:
		"charge":
			draw_line(Vector2.ZERO, telegraph_dir * 380.0, Color(warn, warn.a * 0.6), radius * 1.4)
			draw_line(Vector2.ZERO, telegraph_dir * 380.0, warn, 2.0)
		"ranged":
			draw_line(Vector2.ZERO, telegraph_dir * 520.0, Color(warn, warn.a * 0.7), 2.0)
			draw_circle(Vector2.ZERO, radius + 6.0 * (1.0 - t), Color(warn, 0.3))
		"blink":
			var local: Vector2 = blink_target - position
			draw_arc(local, 24.0 + 20.0 * t, 0.0, TAU, 24, warn, 3.0)
			draw_line(Vector2.ZERO, local, Color(warn, warn.a * 0.3), 1.5)
		"dreadnought":
			var side2: Vector2 = telegraph_dir.orthogonal()
			for sg: float in [-1.0, 1.0]:
				draw_line(Vector2.ZERO, side2 * sg * 760.0, Color(warn, warn.a * 0.45), 60.0 * (1.0 - t * 0.5))
				draw_line(Vector2.ZERO, side2 * sg * 760.0, warn, 2.0)
		"surge":
			draw_arc(Vector2.ZERO, 210.0, 0.0, TAU, 48, warn, 3.0)
			draw_arc(Vector2.ZERO, 210.0 * (1.0 - t), 0.0, TAU, 48, Color(warn, 0.3), 2.0)
		"boss":
			if boss_phase == 2:
				draw_line(Vector2.ZERO, telegraph_dir * 900.0, Color(warn, warn.a * 0.5), 46.0)
				draw_line(Vector2.ZERO, telegraph_dir * 900.0, warn, 2.0)
			else:
				draw_arc(Vector2.ZERO, radius + 30.0 * (1.0 - t), 0.0, TAU, 40, warn, 4.0)
		"ambush", "drift", "orbit", "layer", "warden":
			draw_arc(Vector2.ZERO, radius + 10.0, 0.0, TAU, 20, warn, 3.0)
