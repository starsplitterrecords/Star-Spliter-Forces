class_name ForcePickup
extends Node2D

var xp_value := 1
var velocity := Vector2.ZERO

func _process(delta: float) -> void:
	position += velocity * delta
	velocity = velocity.move_toward(Vector2.ZERO, 240.0 * delta)
	rotation += delta * 2.2

func _draw() -> void:
	var c := Color("66f6ff") if xp_value < 5 else Color("ffd85f")
	draw_colored_polygon(PackedVector2Array([Vector2(0,-7),Vector2(6,0),Vector2(0,7),Vector2(-6,0)]), c)
	draw_circle(Vector2.ZERO, 12.0, Color(c, 0.10))
