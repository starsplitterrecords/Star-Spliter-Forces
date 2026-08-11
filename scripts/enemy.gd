class_name ForceEnemy
extends Node2D

signal died(enemy: ForceEnemy, xp_value: int)

var kind: String = "static_wisp"
var hp: float = 10.0
var max_hp: float = 10.0
var speed: float = 80.0
var contact_damage: float = 8.0
var xp_value: int = 1
var radius: float = 14.0
var tint: Color = Color.WHITE
var target: Node2D
var hit_flash: float = 0.0
var elite: bool = false
var boss: bool = false
var contact_clock: float = 0.0
var behavior: String = "drift"
var age: float = 0.0
var behavior_clock: float = 0.0
var lateral_sign: float = 1.0
var dash_velocity: Vector2 = Vector2.ZERO
var boss_phase: int = 1

func configure(enemy_kind: String, target_node: Node2D, scale_factor: float = 1.0) -> void:
	kind = enemy_kind
	target = target_node
	var d: Dictionary = GameData.ENEMIES[kind]
	hp = float(d.hp) * scale_factor
	max_hp = hp
	speed = float(d.speed) * (1.0 + (scale_factor - 1.0) * 0.10)
	contact_damage = float(d.damage) * sqrt(scale_factor)
	xp_value = int(d.xp)
	radius = float(d.radius)
	tint = d.color
	behavior = String(d.behavior)
	elite = kind == "elite_null"
	boss = kind == "the_silence"
	lateral_sign = -1.0 if randi() % 2 == 0 else 1.0
	queue_redraw()

func _process(delta: float) -> void:
	contact_clock = maxf(0.0, contact_clock - delta)
	hit_flash = maxf(0.0, hit_flash - delta)
	age += delta
	behavior_clock -= delta
	if not target or not is_instance_valid(target):
		return
	var to_target: Vector2 = global_position.direction_to(target.global_position)
	var distance: float = global_position.distance_to(target.global_position)
	match behavior:
		"drift":
			var tangent: Vector2 = Vector2(-to_target.y, to_target.x)
			var weave: float = sin(age * 3.2) * 0.55
			position += (to_target + tangent * weave).normalized() * speed * delta
		"charge":
			if dash_velocity.length() > 1.0:
				position += dash_velocity * delta
				dash_velocity = dash_velocity.move_toward(Vector2.ZERO, 520.0 * delta)
			elif behavior_clock <= 0.0 and distance < 430.0:
				dash_velocity = to_target * speed * 3.4
				behavior_clock = 2.4
			else:
				position += to_target * speed * 0.72 * delta
		"orbit":
			var orbit_tangent: Vector2 = Vector2(-to_target.y, to_target.x) * lateral_sign
			var radial: float = 0.35 if distance > 245.0 else -0.18
			position += (orbit_tangent + to_target * radial).normalized() * speed * delta
		"surge":
			var surge_mult: float = 1.8 if fmod(age, 3.0) < 0.8 else 0.65
			position += to_target * speed * surge_mult * delta
		"boss":
			boss_phase = 3 if hp < max_hp * 0.33 else (2 if hp < max_hp * 0.66 else 1)
			var boss_tangent: Vector2 = Vector2(-to_target.y, to_target.x) * lateral_sign
			var boss_vector: Vector2 = to_target + boss_tangent * (0.16 * float(boss_phase - 1))
			position += boss_vector.normalized() * speed * (0.75 + 0.18 * boss_phase) * delta
		_:
			position += to_target * speed * delta
	queue_redraw()

func take_damage(amount: float) -> void:
	hp -= amount
	hit_flash = 0.08
	if hp <= 0.0:
		died.emit(self, xp_value)
		queue_free()

func _draw() -> void:
	var c: Color = Color.WHITE if hit_flash > 0.0 else tint
	draw_circle(Vector2.ZERO, radius * 1.7, Color(c, 0.09))
	if boss:
		for i in 6:
			var a: float = TAU * float(i) / 6.0 + age * 0.22
			draw_line(Vector2.from_angle(a) * radius * 0.5, Vector2.from_angle(a) * radius * 1.5, Color(c, 0.55), 6.0)
		draw_circle(Vector2.ZERO, radius, Color(c, 0.88))
		draw_circle(Vector2.ZERO, radius * 0.58, Color("171126"))
		draw_arc(Vector2.ZERO, radius * 0.78, 0.0, TAU, 32, c, 5.0)
	elif elite:
		draw_colored_polygon(PackedVector2Array([Vector2(0,-radius),Vector2(radius,0),Vector2(0,radius),Vector2(-radius,0)]), c)
		draw_circle(Vector2.ZERO, radius * 0.38, Color("16172a"))
	elif behavior == "charge":
		draw_colored_polygon(PackedVector2Array([Vector2(radius,0),Vector2(-radius*0.7,-radius*0.72),Vector2(-radius*0.7,radius*0.72)]), c)
	elif behavior == "orbit":
		draw_arc(Vector2.ZERO, radius, 0.0, TAU, 18, c, 7.0)
		draw_circle(Vector2.ZERO, radius * 0.42, Color("111426"))
	else:
		draw_circle(Vector2.ZERO, radius, Color(c, 0.92))
		draw_circle(Vector2.ZERO, radius * 0.40, Color("111426"))
	if elite or boss:
		var w: float = radius * 2.4
		draw_rect(Rect2(-w/2.0, -radius-13.0, w, 5.0), Color("211d32"))
		draw_rect(Rect2(-w/2.0, -radius-13.0, w * clampf(hp/max_hp,0.0,1.0), 5.0), c)
