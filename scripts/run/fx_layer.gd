class_name FxLayer
extends Node2D
## Cosmetic effects. Light (sparks, flashes, rings, beams, glows) is drawn on
## an additive layer so overlapping energy blooms instead of muddying; matter
## (debris, smoke, scorch marks) and text are drawn normally. Everything is
## budgeted so a busy late-run screen stays readable and cheap on mobile.

const MAX_PARTICLES: int = 320
const MAX_SPARKS: int = 220
const MAX_DEBRIS: int = 140
const MAX_SCORCH: int = 60
const MAX_TEXTS: int = 40

var particles: Array = [] # [pos, vel, life, max_life, color, size]
var sparks: Array = []    # [pos, vel, life, max_life, color, width]
var flashes: Array = []   # [pos, radius, life, max_life, color]
var rings: Array = []     # [pos, radius_from, radius_to, life, max_life, color, width]
var lines: Array = []     # [from, to, life, max_life, color, width]
var debris: Array = []    # [pos, vel, rot, spin, life, max_life, color, size, shape]
var smoke: Array = []     # [pos, vel, radius, life, max_life]
var scorch: Array = []    # [pos, radius, life, max_life, color]
var texts: Array = []     # [pos, text, life, max_life, color, size, pop]
var reduced_flashes: bool = false
var damage_numbers: bool = true
var font: Font
var light: Node2D
var ground: Node2D

class LightLayer:
	extends Node2D
	var fx: FxLayer
	func _draw() -> void:
		fx._draw_light(self)

class GroundLayer:
	extends Node2D
	var fx: FxLayer
	func _draw() -> void:
		for s: Array in fx.scorch:
			var t: float = clampf(s[2] / s[3], 0.0, 1.0)
			draw_circle(s[0], s[1], Color(0.02, 0.02, 0.03, 0.35 * t))
			draw_circle(s[0], s[1] * 0.55, Color(s[4], 0.10 * t))

func _ready() -> void:
	font = UiTheme.font("bold")
	z_index = 20
	ground = GroundLayer.new()
	ground.fx = self
	ground.z_index = -30
	ground.z_as_relative = false
	add_child(ground)
	light = LightLayer.new()
	light.fx = self
	var mat: CanvasItemMaterial = CanvasItemMaterial.new()
	mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	light.material = mat
	add_child(light)

# ------------------------------------------------------------------ emitters

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

## Streaks thrown along a direction (impacts spray away from the hit).
func spark_spray(pos: Vector2, dir: Vector2, color: Color, count: int = 6, speed: float = 520.0, spread: float = 0.9) -> void:
	var base: float = dir.angle() if dir != Vector2.ZERO else randf() * TAU
	for i in count:
		if sparks.size() >= MAX_SPARKS:
			sparks.pop_front()
		var a: float = base + randf_range(-spread, spread)
		var life: float = randf_range(0.12, 0.28)
		sparks.append([pos, Vector2.from_angle(a) * speed * randf_range(0.45, 1.0), life, life, color, randf_range(1.5, 3.0)])

func flash(pos: Vector2, radius: float, color: Color = Color.WHITE, life: float = 0.12) -> void:
	if reduced_flashes:
		color.a *= 0.4
	flashes.append([pos, radius, life, life, color])

## Hull fragments that tumble outward and settle — the wreckage of a kill.
func shatter(pos: Vector2, color: Color, count: int, speed: float, size: float, dir: Vector2 = Vector2.ZERO) -> void:
	for i in count:
		if debris.size() >= MAX_DEBRIS:
			debris.pop_front()
		var a: float = (dir.angle() + randf_range(-1.3, 1.3)) if dir != Vector2.ZERO and randf() < 0.7 else randf() * TAU
		var life: float = randf_range(0.6, 1.3)
		debris.append([pos, Vector2.from_angle(a) * speed * randf_range(0.3, 1.0), randf() * TAU, randf_range(-12.0, 12.0), life, life, color.darkened(randf_range(0.0, 0.35)), size * randf_range(0.6, 1.4), randi() % 3])

func puff(pos: Vector2, count: int, radius: float) -> void:
	for i in count:
		var life: float = randf_range(0.7, 1.4)
		smoke.append([pos + Vector2.from_angle(randf() * TAU) * radius * 0.3, Vector2.from_angle(randf() * TAU) * randf_range(20.0, 70.0), radius * randf_range(0.5, 1.0), life, life])

func scorch_mark(pos: Vector2, radius: float, color: Color) -> void:
	if scorch.size() >= MAX_SCORCH:
		scorch.pop_front()
	scorch.append([pos, radius, 5.0, 5.0, color])

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
	texts.append([pos + Vector2(randf_range(-10, 10), -10), str(int(round(value))), 0.65, 0.65, color, 24 if big else 15, 1.0 if big else 0.0])

func label(pos: Vector2, text: String, color: Color, size: int = 18, life: float = 1.2) -> void:
	texts.append([pos, text, life, life, color, size, 0.6])

## Composite effects ------------------------------------------------------

func impact(pos: Vector2, dir: Vector2, color: Color, heavy: bool = false) -> void:
	spark_spray(pos, dir, color.lerp(Color.WHITE, 0.4), 5 if heavy else 3, 560.0 if heavy else 420.0, 0.7)
	flash(pos, 16.0 if heavy else 9.0, color.lerp(Color.WHITE, 0.6), 0.07)

func kill(pos: Vector2, dir: Vector2, color: Color, size: float) -> void:
	flash(pos, size * 2.2, Color.WHITE.lerp(color, 0.3), 0.1)
	spark_spray(pos, dir, color.lerp(Color.WHITE, 0.5), 8, 620.0, 1.1)
	shatter(pos, color, 4 + int(size / 6.0), 260.0, size * 0.32, dir)
	burst(pos, color, 6, 200.0, 2.6, 0.4)
	scorch_mark(pos, size * 1.1, color)

func big_kill(pos: Vector2, color: Color, size: float) -> void:
	flash(pos, size * 3.2, Color.WHITE, 0.16)
	for k in 2:
		ring(pos, size * 0.5, size * (4.0 + k * 2.0), Color.WHITE.lerp(color, 0.3 + k * 0.4), 0.45 + k * 0.2, 8.0 - k * 3.0)
	spark_spray(pos, Vector2.ZERO, color.lerp(Color.WHITE, 0.5), 22, 760.0, PI)
	shatter(pos, color, 16, 420.0, size * 0.28)
	puff(pos, 7, size * 1.2)
	burst(pos, color, 22, 380.0, 4.0, 0.8)
	scorch_mark(pos, size * 2.2, color)

# ------------------------------------------------------------------ update

func step(delta: float) -> void:
	for i in range(particles.size() - 1, -1, -1):
		var p: Array = particles[i]
		p[2] -= delta
		if p[2] <= 0.0:
			particles.remove_at(i)
			continue
		p[0] += p[1] * delta
		p[1] *= 1.0 - minf(1.0, delta * 4.0)
	for i in range(sparks.size() - 1, -1, -1):
		var s: Array = sparks[i]
		s[2] -= delta
		if s[2] <= 0.0:
			sparks.remove_at(i)
			continue
		s[0] += s[1] * delta
		s[1] *= 1.0 - minf(1.0, delta * 6.0)
	for i in range(flashes.size() - 1, -1, -1):
		flashes[i][2] -= delta
		if flashes[i][2] <= 0.0:
			flashes.remove_at(i)
	for i in range(debris.size() - 1, -1, -1):
		var d: Array = debris[i]
		d[4] -= delta
		if d[4] <= 0.0:
			debris.remove_at(i)
			continue
		d[0] += d[1] * delta
		d[1] *= 1.0 - minf(1.0, delta * 3.2)
		d[2] += d[3] * delta
		d[3] *= 1.0 - minf(1.0, delta * 2.0)
	for i in range(smoke.size() - 1, -1, -1):
		var m: Array = smoke[i]
		m[3] -= delta
		if m[3] <= 0.0:
			smoke.remove_at(i)
			continue
		m[0] += m[1] * delta
		m[2] += delta * 22.0
	for i in range(scorch.size() - 1, -1, -1):
		scorch[i][2] -= delta
		if scorch[i][2] <= 0.0:
			scorch.remove_at(i)
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
	light.queue_redraw()
	ground.queue_redraw()

# ------------------------------------------------------------------ drawing

func _draw() -> void:
	# Matter: smoke under, debris over.
	for m: Array in smoke:
		var t: float = m[3] / m[4]
		draw_circle(m[0], m[2], Color(0.08, 0.08, 0.11, 0.2 * t))
	for d: Array in debris:
		var t2: float = clampf(d[4] / d[5] * 2.0, 0.0, 1.0)
		var s: float = d[7]
		var rot: Vector2 = Vector2.from_angle(d[2])
		var side: Vector2 = rot.orthogonal()
		var pts: PackedVector2Array
		match int(d[8]):
			0:
				pts = PackedVector2Array([d[0] + rot * s, d[0] + side * s * 0.6, d[0] - rot * s * 0.8])
			1:
				pts = PackedVector2Array([d[0] + rot * s, d[0] + side * s * 0.5, d[0] - rot * s * 0.6, d[0] - side * s * 0.7])
			_:
				pts = PackedVector2Array([d[0] + rot * s * 1.3, d[0] + side * s * 0.3, d[0] - rot * s * 1.1, d[0] - side * s * 0.3])
		draw_colored_polygon(pts, Color(d[6], t2))
	for tx: Array in texts:
		var life_t: float = 1.0 - tx[2] / tx[3]
		var a: float = clampf(tx[2] * 3.0, 0.0, 1.0)
		var pop: float = 1.0 + float(tx[6]) * maxf(0.0, 0.5 - life_t * 3.0)
		var size: int = int(tx[5] * pop)
		var w: float = font.get_string_size(tx[1], HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
		draw_string_outline(font, tx[0] - Vector2(w / 2.0, 0), tx[1], HORIZONTAL_ALIGNMENT_LEFT, -1, size, 4, Color(0, 0, 0, 0.65 * a))
		draw_string(font, tx[0] - Vector2(w / 2.0, 0), tx[1], HORIZONTAL_ALIGNMENT_LEFT, -1, size, Color(tx[4], a))

func _draw_light(c: CanvasItem) -> void:
	for p: Array in particles:
		var t: float = p[2] / p[3]
		c.draw_circle(p[0], p[5] * (0.4 + t * 0.6), Color(p[4], t))
	for s: Array in sparks:
		var t2: float = s[2] / s[3]
		c.draw_line(s[0], s[0] - Vector2(s[1]) * 0.035, Color(s[4], t2), s[5])
	for f: Array in flashes:
		var t3: float = f[2] / f[3]
		c.draw_circle(f[0], f[1] * (1.4 - t3 * 0.4), Color(f[4], 0.25 * t3))
		c.draw_circle(f[0], f[1] * 0.55, Color(f[4], 0.75 * t3))
	for r: Array in rings:
		var t4: float = 1.0 - r[3] / r[4]
		var rad: float = lerpf(r[1], r[2], ease(t4, 0.4))
		var col: Color = r[5]
		c.draw_arc(r[0], rad, 0.0, TAU, 56, Color(col, col.a * 0.3 * (1.0 - t4)), r[6] * 2.6 * (1.0 - t4 * 0.5))
		c.draw_arc(r[0], rad, 0.0, TAU, 56, Color(col, col.a * (1.0 - t4)), r[6] * (1.0 - t4 * 0.5))
	for l: Array in lines:
		var t5: float = l[2] / l[3]
		c.draw_line(l[0], l[1], Color(l[4], 0.3 * t5), l[5] * 2.2)
		c.draw_line(l[0], l[1], Color(l[4], t5), l[5] * 0.55)
		c.draw_line(l[0], l[1], Color(1, 1, 1, 0.85 * t5), maxf(1.0, l[5] * 0.16))
