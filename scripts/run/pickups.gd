class_name PickupSystem
extends Node2D
## Signal motes (XP), repair cells and magnet cores. Motes merge when the field
## gets crowded so late-run screens stay readable and cheap.

const MAX_MOTES: int = 260

var run: Node
var items: Array = [] # Dictionaries: kind, pos, vel, value, age, attracted
var anim: float = 0.0
var combo: int = 0
var combo_clock: float = 0.0

func drop(kind: String, pos: Vector2, value: int = 1) -> void:
	if kind == "mote" and items.size() >= MAX_MOTES:
		_merge_into_nearest(pos, value)
		return
	items.append({"kind": kind, "pos": pos, "vel": Vector2.from_angle(randf() * TAU) * randf_range(40.0, 110.0), "value": value, "age": 0.0, "attracted": false})

func _merge_into_nearest(pos: Vector2, value: int) -> void:
	var best: Dictionary = {}
	var best_d: float = INF
	for it: Dictionary in items:
		if it.kind == "mote":
			var d: float = pos.distance_squared_to(it.pos)
			if d < best_d:
				best_d = d
				best = it
	if not best.is_empty():
		best.value = int(best.value) + value

func attract_all() -> void:
	for it: Dictionary in items:
		if it.kind == "mote":
			it.attracted = true

func step(delta: float, player: ForcePlayer) -> void:
	anim += delta
	combo_clock -= delta
	if combo_clock <= 0.0:
		combo = 0
	var reach: float = player.pickup_range
	for i in range(items.size() - 1, -1, -1):
		var it: Dictionary = items[i]
		it.age = float(it.age) + delta
		var to: Vector2 = player.position - Vector2(it.pos)
		var d: float = to.length()
		if not bool(it.attracted) and d < reach:
			it.attracted = true
		if not bool(it.attracted) and d < reach * 2.6 and String(it.kind) == "mote":
			# Soft pull: nearby motes drift in so near-misses still land.
			it.vel = Vector2(it.vel).move_toward(to.normalized() * 150.0, 400.0 * delta)
		elif bool(it.attracted):
			var spd: float = 520.0 + float(it.age) * 120.0
			it.vel = Vector2(it.vel).lerp(to.normalized() * spd, minf(1.0, delta * 9.0))
		else:
			it.vel = Vector2(it.vel).move_toward(Vector2.ZERO, 260.0 * delta)
		it.pos = Vector2(it.pos) + Vector2(it.vel) * delta
		if d < 26.0 and float(it.age) > 0.12:
			_collect(it, player)
			items.remove_at(i)
			if String(it.kind) == "mote":
				# Chain: collecting a mote tugs its neighbours in — a satisfying string.
				for other: Dictionary in items:
					if String(other.kind) == "mote" and Vector2(other.pos).distance_squared_to(it.pos) < 140.0 * 140.0:
						other.attracted = true
	queue_redraw()

func _collect(it: Dictionary, player: ForcePlayer) -> void:
	match String(it.kind):
		"mote":
			combo += 1
			combo_clock = 0.6
			# Rising pitch on chained pickups — the satisfying "string" sound.
			Audio.play_sfx("pickup", 1.0 + minf(combo, 24) * 0.035, -9.0, 0.03)
			run.gain_xp(int(it.value))
		"repair":
			player.heal(player.max_hp * 0.25 * (1.5 if run.character_id == "ella_venn" else 1.0))
			run.fx.label(player.position + Vector2(0, -40), "REPAIRED", Color("7dffb2"), 18, 1.0)
			run.fx.ring(player.position, 20.0, 80.0, Color("7dffb2"), 0.5)
			Audio.play_sfx("heal", 1.0, -3.0)
		"magnet":
			attract_all()
			run.fx.ring(player.position, 20.0, 600.0, Color("9fe8ff"), 0.6, 3.0)
			Audio.play_sfx("magnet", 1.0, -3.0)

func _draw() -> void:
	for it: Dictionary in items:
		var p: Vector2 = it.pos
		match String(it.kind):
			"mote":
				var v: int = int(it.value)
				var c: Color = Color("6ff6ff") if v < 4 else (Color("b38bff") if v < 15 else Color("ffd85f"))
				var s: float = 5.0 + minf(8.0, sqrt(float(v)) * 1.6)
				var rot: float = anim * 2.4 + float(it.age)
				draw_circle(p, s * 2.0, Color(c, 0.10))
				var pts: PackedVector2Array = PackedVector2Array()
				for k in 4:
					pts.append(p + Vector2.from_angle(rot + TAU * k / 4.0) * s)
				draw_colored_polygon(pts, c)
			"repair":
				draw_circle(p, 16.0 + sin(anim * 4.0) * 2.0, Color("7dffb2", 0.18))
				draw_rect(Rect2(p - Vector2(9, 3), Vector2(18, 6)), Color("7dffb2"))
				draw_rect(Rect2(p - Vector2(3, 9), Vector2(6, 18)), Color("7dffb2"))
			"magnet":
				draw_circle(p, 18.0 + sin(anim * 5.0) * 3.0, Color("9fe8ff", 0.15))
				draw_arc(p, 10.0, PI, TAU, 16, Color("9fe8ff"), 4.0)
				draw_line(p + Vector2(-10, 0), p + Vector2(-10, 8), Color("9fe8ff"), 4.0)
				draw_line(p + Vector2(10, 0), p + Vector2(10, 8), Color("9fe8ff"), 4.0)
