class_name ForcePlayer
extends Node2D
## The player's vessel. Movement is velocity-based with high acceleration and
## strong braking: responsive on a phone, readable direction changes, no ice.

signal died
signal damaged(amount: float)

const ACCEL: float = 3000.0
const BRAKE: float = 3800.0

var character_id: String = "ilyra_venn"
var def: Dictionary = {}
var accent: Color = Color("68ecff")
var hull_color: Color = Color("68ecff")
var trim_color: Color = Color.WHITE
var style: String = "cruiser"

var move_input: Vector2 = Vector2.ZERO
var velocity: Vector2 = Vector2.ZERO
var facing: float = -PI / 2.0
var bank: float = 0.0
var bounds: Rect2 = Rect2(-3000, -2000, 6000, 4000)

# Stats (modified by passives, Forces, states and workshop).
var base_speed: float = 300.0
var speed_mult: float = 1.0
var max_hp: float = 100.0
var hp: float = 100.0
var armor: float = 0.0
var regen: float = 0.0
var pickup_range: float = 90.0
var damage_mult: float = 1.0
var cooldown_mult: float = 1.0
var area_mult: float = 1.0
var projectile_bonus: int = 0
var xp_mult: float = 1.0
var luck: float = 0.0
var shield: float = 0.0
var max_shield: float = 0.0
var damage_taken_mult: float = 1.0
var crit_chance: float = 0.0
var duration_mult: float = 1.0
var bandwidth_mult: float = 1.0
var knock_mult: float = 1.0
var slow_timer: float = 0.0 # latched leeches drag the hull

var invuln: float = 0.0
var hurt_flash: float = 0.0
var state: String = "DRIFT"
var anim: float = 0.0
var alive: bool = true
var god_mode: bool = false
var wake: PackedVector2Array = PackedVector2Array() # recent world positions
var wake_clock: float = 0.0
const WAKE_POINTS: int = 14

func configure(id: String) -> void:
	character_id = id
	def = GameData.CHARACTERS[id]
	accent = def["accent"]
	hull_color = def.get("hull", accent)
	trim_color = def.get("trim", Color.WHITE)
	style = String(def.get("style", "cruiser"))
	base_speed = float(def["speed"])
	max_hp = float(def["max_hp"])
	armor = float(def.get("armor", 0.0))
	pickup_range = float(def.get("pickup", 90.0))
	hp = max_hp
	queue_redraw()

func move_speed() -> float:
	var s: float = base_speed * speed_mult
	if state == "DRIFT":
		s *= 1.12
	if slow_timer > 0.0:
		s *= 0.62
	elif state == "RESONANCE":
		s *= 0.94
	return s

func movement_ratio() -> float:
	return clampf(velocity.length() / maxf(1.0, move_speed()), 0.0, 1.2)

func step(delta: float) -> void:
	anim += delta
	invuln = maxf(0.0, invuln - delta)
	slow_timer = maxf(0.0, slow_timer - delta)
	hurt_flash = maxf(0.0, hurt_flash - delta)
	var desired: Vector2 = move_input.limit_length(1.0) * move_speed()
	var rate: float = ACCEL if desired.length_squared() > 1.0 and velocity.dot(desired) >= 0.0 else BRAKE
	velocity = velocity.move_toward(desired, rate * delta)
	position += velocity * delta
	position = position.clamp(bounds.position, bounds.end)
	if velocity.length_squared() > 400.0:
		var target: float = velocity.angle()
		var diff: float = wrapf(target - facing, -PI, PI)
		facing += diff * minf(1.0, delta * 14.0)
		bank = lerpf(bank, clampf(diff * 1.4, -0.6, 0.6), minf(1.0, delta * 10.0))
	else:
		bank = lerpf(bank, 0.0, minf(1.0, delta * 6.0))
	# Engine wake: a fading ribbon that makes speed and turns readable.
	wake_clock -= delta
	if wake_clock <= 0.0:
		wake_clock = 0.03
		if velocity.length_squared() > 900.0:
			wake.insert(0, position - Vector2.from_angle(facing) * 16.0)
		elif wake.size() > 0:
			wake.remove_at(wake.size() - 1)
		if wake.size() > WAKE_POINTS:
			wake.resize(WAKE_POINTS)
	if regen > 0.0 and alive:
		heal(regen * delta)
	if max_shield > 0.0:
		shield = minf(max_shield, shield + delta * max_shield * 0.08)
	queue_redraw()

func hurt(amount: float) -> bool:
	if invuln > 0.0 or not alive or god_mode:
		return false
	var dmg: float = maxf(1.0, amount * damage_taken_mult - armor)
	if shield > 0.0:
		var absorbed: float = minf(shield, dmg)
		shield -= absorbed
		dmg -= absorbed
	hp -= dmg
	invuln = 0.65
	hurt_flash = 0.25
	damaged.emit(dmg)
	if hp <= 0.0:
		hp = 0.0
		alive = false
		died.emit()
	return true

func heal(amount: float) -> void:
	hp = minf(max_hp, hp + amount)

func _draw() -> void:
	var flicker: bool = invuln > 0.0 and int(anim * 16.0) % 2 == 0
	var body: Color = hull_color
	if hurt_flash > 0.0:
		body = body.lerp(Color.WHITE, 0.6)
	if flicker:
		body = Color(body, 0.45)
	# Aura reflects the performance state (shape + colour, never colour alone).
	var aura_r: float = 34.0 + sin(anim * 3.0) * 2.0
	match state:
		"RESONANCE":
			draw_arc(Vector2.ZERO, aura_r + 8.0, 0.0, TAU, 40, Color(accent, 0.35), 2.0)
			draw_arc(Vector2.ZERO, aura_r + 14.0, anim, anim + PI * 1.2, 24, Color(accent, 0.22), 2.0)
		"FRACTURE":
			for i in 6:
				var a: float = TAU * i / 6.0 + anim * 0.8
				var r1: float = aura_r + 4.0 + sin(anim * 9.0 + i) * 4.0
				draw_line(Vector2.from_angle(a) * r1, Vector2.from_angle(a + 0.35) * (r1 + 6.0), Color("ff4f7b", 0.55), 2.0)
	draw_circle(Vector2.ZERO, aura_r, Color(accent, 0.07))
	for i in range(wake.size() - 1):
		var t: float = 1.0 - float(i) / float(WAKE_POINTS)
		draw_line(wake[i] - position, wake[i + 1] - position, Color(accent, 0.35 * t), 2.0 + 7.0 * t * movement_ratio())
	if shield > 1.0:
		draw_arc(Vector2.ZERO, 30.0, 0.0, TAU, 32, Color("bff6ff", 0.25 + 0.4 * shield / maxf(1.0, max_shield)), 3.0)
	draw_set_transform(Vector2.ZERO, facing + PI / 2.0, Vector2(1.0 - absf(bank) * 0.35, 1.0))
	_draw_hull(body)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

## Ships use their faction palette (CHARACTER_REFERENCE_REGISTRY): hull
## colour + trim + a pale edge so dark hulls (Fleet navy) read on the void.
func _draw_hull(c: Color) -> void:
	var t: Color = trim_color
	var edge: Color = Color(1, 1, 1, 0.55)
	var engine_c: Color = Color("6fb8ff") if style == "cruiser" else (Color("ff5a6a") if style in ["hauler", "warlord"] else accent)
	var engine: float = 0.6 + movement_ratio() * 0.6 + sin(anim * 30.0) * 0.08
	var pts: PackedVector2Array
	match style:
		"cruiser":
			# Thunderbreak: long heavy-cruiser hull, gold trim, blue engines.
			draw_circle(Vector2(-7, 24), 5.0 * engine, Color(engine_c, 0.7))
			draw_circle(Vector2(7, 24), 5.0 * engine, Color(engine_c, 0.7))
			pts = PackedVector2Array([Vector2(0, -32), Vector2(7, -16), Vector2(12, 6), Vector2(22, 12), Vector2(12, 22), Vector2(-12, 22), Vector2(-22, 12), Vector2(-12, 6), Vector2(-7, -16)])
			draw_colored_polygon(pts, c)
			draw_polyline(pts + PackedVector2Array([pts[0]]), edge, 1.5)
			draw_line(Vector2(0, -26), Vector2(0, 16), t, 2.5)
			draw_line(Vector2(-18, 13), Vector2(18, 13), t, 2.5)
			draw_rect(Rect2(-4, -6, 8, 8), Color("e8ecf5"))
		"interceptor":
			# Verge escort fighter: tan hull, muted-green panels.
			draw_circle(Vector2(0, 22), 6.0 * engine, Color(engine_c, 0.6))
			pts = PackedVector2Array([Vector2(0, -30), Vector2(5, -6), Vector2(18, -12), Vector2(10, 14), Vector2(0, 18), Vector2(-10, 14), Vector2(-18, -12), Vector2(-5, -6)])
			draw_colored_polygon(pts, c)
			draw_polyline(pts + PackedVector2Array([pts[0]]), edge, 1.2)
			draw_colored_polygon(PackedVector2Array([Vector2(5, -6), Vector2(18, -12), Vector2(12, 4)]), t)
			draw_colored_polygon(PackedVector2Array([Vector2(-5, -6), Vector2(-18, -12), Vector2(-12, 4)]), t)
		"hauler":
			# Gravefire: compact Shard working cutter, pale plating, red seams.
			draw_circle(Vector2(-10, 22), 5.0 * engine, Color(engine_c, 0.6))
			draw_circle(Vector2(10, 22), 5.0 * engine, Color(engine_c, 0.6))
			pts = PackedVector2Array([Vector2(-12, -22), Vector2(12, -22), Vector2(20, -6), Vector2(20, 18), Vector2(-20, 18), Vector2(-20, -6)])
			draw_colored_polygon(pts, c)
			draw_polyline(pts + PackedVector2Array([pts[0]]), Color("1a1a1e"), 1.5)
			draw_line(Vector2(-20, -2), Vector2(20, -2), t, 3.0)
			draw_line(Vector2(0, -22), Vector2(0, 18), t, 2.0)
			draw_rect(Rect2(-7, -16, 14, 9), Color("1a1a1e"))
		"warlord":
			# Abby Saville's command ship: broad pale hull, narrow red seams.
			draw_circle(Vector2(-12, 22), 5.0 * engine, Color(engine_c, 0.6))
			draw_circle(Vector2(12, 22), 5.0 * engine, Color(engine_c, 0.6))
			pts = PackedVector2Array([Vector2(0, -30), Vector2(10, -14), Vector2(24, -4), Vector2(18, 20), Vector2(0, 14), Vector2(-18, 20), Vector2(-24, -4), Vector2(-10, -14)])
			draw_colored_polygon(pts, c)
			draw_polyline(pts + PackedVector2Array([pts[0]]), Color("1a1a1e"), 1.5)
			draw_line(Vector2(-22, -2), Vector2(-4, 10), t, 2.5)
			draw_line(Vector2(22, -2), Vector2(4, 10), t, 2.5)
			draw_line(Vector2(0, -24), Vector2(0, 8), t, 2.0)
		"wraith":
			# Veil courier: bronze split hull with anomaly-glass shimmer.
			draw_circle(Vector2(0, 20), 4.0 * engine, Color(engine_c, 0.6))
			draw_colored_polygon(PackedVector2Array([Vector2(-4, -30), Vector2(-2, 16), Vector2(-20, 10), Vector2(-14, -6)]), c)
			draw_colored_polygon(PackedVector2Array([Vector2(4, -30), Vector2(14, -6), Vector2(20, 10), Vector2(2, 16)]), c)
			for k in 3:
				draw_circle(Vector2(sin(anim * 2.0 + k * 2.1) * 6.0, -10.0 + k * 9.0), 1.8, Color(t, 0.6 + 0.3 * sin(anim * 4.0 + k)))
		_:
			draw_colored_polygon(PackedVector2Array([Vector2(0, -24), Vector2(18, 16), Vector2(0, 9), Vector2(-18, 16)]), c)
	draw_circle(Vector2(0, -2), 3.0, Color("f7fbff"))
