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

var invuln: float = 0.0
var hurt_flash: float = 0.0
var state: String = "DRIFT"
var anim: float = 0.0
var alive: bool = true
var god_mode: bool = false

func configure(id: String) -> void:
	character_id = id
	def = GameData.CHARACTERS[id]
	accent = def["accent"]
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
	elif state == "RESONANCE":
		s *= 0.94
	return s

func movement_ratio() -> float:
	return clampf(velocity.length() / maxf(1.0, move_speed()), 0.0, 1.2)

func step(delta: float) -> void:
	anim += delta
	invuln = maxf(0.0, invuln - delta)
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
	var body: Color = accent
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
	if shield > 1.0:
		draw_arc(Vector2.ZERO, 30.0, 0.0, TAU, 32, Color("bff6ff", 0.25 + 0.4 * shield / maxf(1.0, max_shield)), 3.0)
	draw_set_transform(Vector2.ZERO, facing + PI / 2.0, Vector2(1.0 - absf(bank) * 0.35, 1.0))
	_draw_hull(body)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func _draw_hull(c: Color) -> void:
	var dark: Color = Color("0b1020")
	var engine: float = 0.6 + movement_ratio() * 0.6 + sin(anim * 30.0) * 0.08
	match style:
		"cruiser":
			# Command cruiser: broad swept wings, raised bridge, twin engines.
			draw_circle(Vector2(-8, 20), 5.0 * engine, Color(c, 0.55))
			draw_circle(Vector2(8, 20), 5.0 * engine, Color(c, 0.55))
			draw_colored_polygon(PackedVector2Array([Vector2(0, -28), Vector2(9, -10), Vector2(24, 10), Vector2(10, 18), Vector2(0, 12), Vector2(-10, 18), Vector2(-24, 10), Vector2(-9, -10)]), c)
			draw_colored_polygon(PackedVector2Array([Vector2(0, -18), Vector2(5, -4), Vector2(0, 4), Vector2(-5, -4)]), dark)
			draw_line(Vector2(-18, 8), Vector2(18, 8), Color(1, 1, 1, 0.7), 2.0)
		"interceptor":
			# Long needle with forward-swept fins: fast, fragile.
			draw_circle(Vector2(0, 22), 6.0 * engine, Color(c, 0.6))
			draw_colored_polygon(PackedVector2Array([Vector2(0, -32), Vector2(5, -6), Vector2(18, -14), Vector2(10, 14), Vector2(0, 18), Vector2(-10, 14), Vector2(-18, -14), Vector2(-5, -6)]), c)
			draw_line(Vector2(0, -24), Vector2(0, 8), dark, 3.0)
		"hauler":
			# Heavy armoured block with side pods.
			draw_circle(Vector2(-12, 22), 5.0 * engine, Color(c, 0.5))
			draw_circle(Vector2(12, 22), 5.0 * engine, Color(c, 0.5))
			draw_colored_polygon(PackedVector2Array([Vector2(-14, -22), Vector2(14, -22), Vector2(22, -6), Vector2(22, 18), Vector2(-22, 18), Vector2(-22, -6)]), c)
			draw_rect(Rect2(-9, -14, 18, 12), dark)
			draw_rect(Rect2(-28, -4, 6, 18), Color(c.darkened(0.3)))
			draw_rect(Rect2(22, -4, 6, 18), Color(c.darkened(0.3)))
		"scout":
			# Ring-hulled survey craft: round silhouette, sensor mast.
			draw_circle(Vector2(0, 16), 5.0 * engine, Color(c, 0.6))
			draw_arc(Vector2.ZERO, 16.0, 0.0, TAU, 28, c, 6.0)
			draw_circle(Vector2.ZERO, 7.0, c)
			draw_line(Vector2(0, -8), Vector2(0, -30), c, 3.0)
			draw_circle(Vector2(0, -30), 3.5, Color.WHITE)
		"wraith":
			# Split-hull runner: two blades around an empty centre.
			draw_circle(Vector2(0, 20), 4.0 * engine, Color(c, 0.6))
			draw_colored_polygon(PackedVector2Array([Vector2(-4, -30), Vector2(-2, 16), Vector2(-20, 10), Vector2(-14, -6)]), c)
			draw_colored_polygon(PackedVector2Array([Vector2(4, -30), Vector2(14, -6), Vector2(20, 10), Vector2(2, 16)]), c)
		_:
			draw_colored_polygon(PackedVector2Array([Vector2(0, -24), Vector2(18, 16), Vector2(0, 9), Vector2(-18, 16)]), c)
	draw_circle(Vector2(0, -2), 3.5, Color("f7fbff"))
