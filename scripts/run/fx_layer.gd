class_name FxLayer
extends Node2D
## Purely cosmetic effects: sparks, rings, floating numbers, beams, flashes.
## Budgeted so a busy screen stays readable and cheap on mobile.

const MAX_PARTICLES: int = 360
const MAX_TEXTS: int = 40

var particles: Array = [] # [pos, vel, life, max_life, color, size]
var rings: Array = [] # [pos, radius_from, radius_to, life, max_life, color, width]
var texts: Array = [] # [pos, text, life, color, size]
var lines: Array = [] # [from, to, life, max_life, color, width]
var reduced_flashes: bool = false
var damage_numbers: bool = true
var font: Font

func _ready() -> void:
	font = ThemeDB.fallback_font
	z_index = 20

func burst(pos: Vector2, color: Color, count: int = 8, speed: float = 220.0, size: float = 3.0, life: float = 0.45) -> void:
	for i in count:
		if particles.size() >= MAX_PARTICLES:
			particles.pop_front()
		var v: Vector2 = Vector2.from_angle(randf() * TAU) * speed * randf_range(0.35, 1.0)
		particles.append([pos, v, life, life, color, size * randf_range(0.6, 1.3)])

func trail(pos: Vector2, vel: Vector2, color: Color, size: float = 3.0) -> void:
	if particles.size() >= MAX_PARTICLES:
		return
	particles.append([pos, vel, 0.35, 0.35, color, size])

func ring(pos: Vector2, from_r: float, to_r: float, color: Color, life: float = 0.4, width: float = 4.0) -> void:
	if reduced_flashes:
		color.a *= 0.6
	rings.append([pos, from_r, to_r, life, life, color, width])

func beam(from: Vector2, to: Vector2, color: Color, life: float = 0.18, width: float = 10.0) -> void:
	lines.append([from, to, life, life, color, width])

func number(pos: Vector2, value: float, color: Color = Color.WHITE, big: bool = false) -> void:
	if not damage_numbers:
		return
	if texts.size() >= MAX_TEXTS:
		texts.pop_front()
	texts.append([pos + Vector2(randf_range(-10, 10), -10), str(int(round(value))), 0.6, color, 22 if big else 15])

func label(pos: Vector2, text: String, color: Color, size: int = 18, life: float = 1.2) -> void:
	texts.append([pos, text, life, color, size])

func step(delta: float) -> void:
	for i in range(particles.size() - 1, -1, -1):
		var p: Array = particles[i]
		p[2] -= delta
		if p[2] <= 0.0:
			particles.remove_at(i)
			continue
		p[0] += p[1] * delta
		p[1] *= 1.0 - minf(1.0, delta * 4.0)
	for i in range(rings.size() - 1, -1, -1):
		rings[i][3] -= delta
		if rings[i][3] <= 0.0:
			rings.remove_at(i)
	for i in range(texts.size() - 1, -1, -1):
		texts[i][2] -= delta
		texts[i][0] += Vector2(0, -38.0 * delta)
		if texts[i][2] <= 0.0:
			texts.remove_at(i)
	for i in range(lines.size() - 1, -1, -1):
		lines[i][2] -= delta
		if lines[i][2] <= 0.0:
			lines.remove_at(i)
	queue_redraw()

func _draw() -> void:
	for p: Array in particles:
		var t: float = p[2] / p[3]
		draw_circle(p[0], p[5] * (0.4 + t * 0.6), Color(p[4], t))
	for r: Array in rings:
		var t2: float = 1.0 - r[3] / r[4]
		var rad: float = lerpf(r[1], r[2], ease(t2, 0.4))
		draw_arc(r[0], rad, 0.0, TAU, 48, Color(r[5], r[5].a * (1.0 - t2)), r[6] * (1.0 - t2 * 0.5))
	for l: Array in lines:
		var t3: float = l[2] / l[3]
		draw_line(l[0], l[1], Color(l[4], 0.35 * t3), l[5] * 1.8)
		draw_line(l[0], l[1], Color(l[4], t3), l[5] * 0.5)
		draw_line(l[0], l[1], Color(1, 1, 1, 0.8 * t3), maxf(1.0, l[5] * 0.15))
	for tx: Array in texts:
		var a: float = clampf(tx[2] * 3.0, 0.0, 1.0)
		var size: int = tx[4]
		var w: float = font.get_string_size(tx[1], HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
		draw_string_outline(font, tx[0] - Vector2(w / 2.0, 0), tx[1], HORIZONTAL_ALIGNMENT_LEFT, -1, size, 4, Color(0, 0, 0, 0.6 * a))
		draw_string(font, tx[0] - Vector2(w / 2.0, 0), tx[1], HORIZONTAL_ALIGNMENT_LEFT, -1, size, Color(tx[3], a))
