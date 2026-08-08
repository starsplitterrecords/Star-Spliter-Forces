class_name ForceEnemy
extends Node2D

signal died(enemy: ForceEnemy, xp_value: int)

var kind := "static_wisp"
var hp := 10.0
var max_hp := 10.0
var speed := 80.0
var contact_damage := 8.0
var xp_value := 1
var radius := 14.0
var tint := Color.WHITE
var target: Node2D
var hit_flash := 0.0
var elite := false
var boss := false
var contact_clock := 0.0

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
	elite = kind == "elite_null"
	boss = kind == "the_silence"
	queue_redraw()

func _process(delta: float) -> void:
	contact_clock = maxf(0.0, contact_clock - delta)
	hit_flash = maxf(0.0, hit_flash - delta)
	if target and is_instance_valid(target):
		var dir := global_position.direction_to(target.global_position)
		position += dir * speed * delta
	queue_redraw()

func take_damage(amount: float) -> void:
	hp -= amount
	hit_flash = 0.08
	if hp <= 0.0:
		died.emit(self, xp_value)
		queue_free()

func _draw() -> void:
	var c := Color.WHITE if hit_flash > 0.0 else tint
	draw_circle(Vector2.ZERO, radius * 1.7, Color(c, 0.09))
	if boss:
		for i in 6:
			var a := TAU * float(i) / 6.0
			draw_line(Vector2.from_angle(a) * radius * 0.5, Vector2.from_angle(a) * radius * 1.5, Color(c, 0.55), 6.0)
		draw_circle(Vector2.ZERO, radius, Color(c, 0.88))
		draw_circle(Vector2.ZERO, radius * 0.58, Color("171126"))
		draw_arc(Vector2.ZERO, radius * 0.78, 0.0, TAU, 32, c, 5.0)
	elif elite:
		draw_colored_polygon(PackedVector2Array([Vector2(0,-radius),Vector2(radius,0),Vector2(0,radius),Vector2(-radius,0)]), c)
		draw_circle(Vector2.ZERO, radius * 0.38, Color("16172a"))
	else:
		draw_circle(Vector2.ZERO, radius, Color(c, 0.92))
		draw_circle(Vector2.ZERO, radius * 0.40, Color("111426"))
	if elite or boss:
		var w := radius * 2.4
		draw_rect(Rect2(-w/2.0, -radius-13.0, w, 5.0), Color("211d32"))
		draw_rect(Rect2(-w/2.0, -radius-13.0, w * clamp(hp/max_hp,0.0,1.0), 5.0), c)
