class_name ForcePlayer
extends Node2D

signal died

var move_input := Vector2.ZERO
var speed := 285.0
var hp := 100.0
var max_hp := 100.0
var invuln := 0.0
var accent := Color("64f4ff")
var pickup_range := 84.0
var damage_multiplier := 1.0
var cooldown_multiplier := 1.0
var character_id := "pulse_width_codex"

func configure(id: String) -> void:
	character_id = id
	var d: Dictionary = GameData.CHARACTERS[id]
	speed = float(d.speed)
	max_hp = float(d.max_hp)
	hp = max_hp
	accent = d.accent
	queue_redraw()

func _process(delta: float) -> void:
	invuln = maxf(0.0, invuln - delta)
	position += move_input.limit_length(1.0) * speed * delta
	position.x = clamp(position.x, -GameData.WORLD_HALF.x, GameData.WORLD_HALF.x)
	position.y = clamp(position.y, -GameData.WORLD_HALF.y, GameData.WORLD_HALF.y)
	queue_redraw()

func hurt(amount: float) -> bool:
	if invuln > 0.0:
		return false
	hp -= amount
	invuln = 0.55
	if hp <= 0.0:
		hp = 0.0
		died.emit()
	return true

func heal(amount: float) -> void:
	hp = minf(max_hp, hp + amount)

func _draw() -> void:
	var flicker := invuln > 0.0 and int(Time.get_ticks_msec()/60) % 2 == 0
	var c := Color(accent, 0.35) if flicker else accent
	draw_circle(Vector2.ZERO, 32.0, Color(c, 0.08))
	draw_colored_polygon(PackedVector2Array([Vector2(0,-22),Vector2(19,15),Vector2(0,9),Vector2(-19,15)]), c)
	draw_circle(Vector2.ZERO, 6.0, Color("f7fbff"))
