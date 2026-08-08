class_name ForceProjectile
extends Node2D

var velocity := Vector2.ZERO
var damage := 10.0
var lifetime := 2.0
var radius := 6.0
var pierce := 0
var tint := Color.WHITE
var hit_ids: Dictionary = {}

func setup(pos: Vector2, vel: Vector2, dmg: float, life: float, size: float, color: Color, pierces: int = 0) -> void:
	position = pos
	velocity = vel
	damage = dmg
	lifetime = life
	radius = size
	tint = color
	pierce = pierces
	queue_redraw()

func _process(delta: float) -> void:
	position += velocity * delta
	lifetime -= delta
	if lifetime <= 0.0:
		queue_free()

func _draw() -> void:
	draw_circle(Vector2.ZERO, radius * 1.8, Color(tint, 0.12))
	draw_circle(Vector2.ZERO, radius, tint)
	draw_line(-velocity.normalized() * radius * 2.4, Vector2.ZERO, Color(tint, 0.45), radius * 0.65)
