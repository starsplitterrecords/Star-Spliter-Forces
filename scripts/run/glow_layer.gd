class_name GlowLayer
extends Node2D
## Modern light: soft additive halos behind everything that should read as
## lit — the ship and its engine, every shot, shards and supplies, beacons,
## elites and the boss — so colours bloom and overlaps brighten. Works in the
## Compatibility/WebGL renderer (where built-in 2D glow does not) and costs one
## batched textured quad per light.

var run: GameRun
var strength: float = 1.0
var anim: float = 0.0
static var soft: Texture2D

static func soft_texture() -> Texture2D:
	if soft == null:
		var g: Gradient = Gradient.new()
		g.offsets = PackedFloat32Array([0.0, 0.18, 0.45, 0.75, 1.0])
		g.colors = PackedColorArray([Color(1, 1, 1, 1), Color(1, 1, 1, 0.62), Color(1, 1, 1, 0.22), Color(1, 1, 1, 0.05), Color(1, 1, 1, 0)])
		var t: GradientTexture2D = GradientTexture2D.new()
		t.gradient = g
		t.fill = GradientTexture2D.FILL_RADIAL
		t.fill_from = Vector2(0.5, 0.5)
		t.fill_to = Vector2(1.0, 0.5)
		t.width = 128
		t.height = 128
		soft = t
	return soft

func _ready() -> void:
	var mat: CanvasItemMaterial = CanvasItemMaterial.new()
	mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	material = mat
	z_index = 24
	z_as_relative = false
	soft_texture()

func _process(delta: float) -> void:
	anim += delta
	queue_redraw()

func halo(p: Vector2, radius: float, col: Color, a: float) -> void:
	if a <= 0.01:
		return
	draw_texture_rect(soft, Rect2(p - Vector2(radius, radius), Vector2(radius, radius) * 2.0), false, Color(col, a * strength))

func _draw() -> void:
	if run == null or run.player == null or strength <= 0.0:
		return
	var view: Rect2 = get_viewport().get_canvas_transform().affine_inverse() * get_viewport().get_visible_rect()
	view = view.grow(200.0)
	var p: ForcePlayer = run.player
	# The ship: an accent halo and an engine bloom behind it.
	var acc: Color = GameData.CHARACTERS[run.character_id]["accent"]
	halo(p.position, 120.0, acc, 0.4)
	halo(p.position - Vector2.from_angle(p.facing) * 22.0, 40.0 + 24.0 * p.movement_ratio(), Color("8fd3ff"), 0.6)
	# Shots: friendly in their Force colour; hostile ones red, easy to read.
	for s in run.projectiles.shots:
		if not view.has_point(s.pos):
			continue
		halo(s.pos, s.radius * (7.0 if s.hostile else 6.0) + 12.0, Color("ff3b5c") if s.hostile else s.color, 0.95 if s.hostile else 0.8)
	# Shards and supplies.
	for it: Dictionary in run.pickups.items:
		var ip: Vector2 = it.pos
		if not view.has_point(ip):
			continue
		match String(it.kind):
			"mote":
				var v: int = int(it.value)
				halo(ip, 26.0 + minf(18.0, v * 0.9), Color("6ff6ff") if v < 4 else (Color("b38bff") if v < 15 else Color("ffd85f")), 0.4)
			"repair":
				halo(ip, 46.0, Color("7dffb2"), 0.4)
			_:
				halo(ip, 40.0, Color("9fe8ff"), 0.35)
	# Beacons and landmarks breathe light.
	for q: Dictionary in run.pois.items:
		var qp: Vector2 = q.pos
		if bool(q.get("claimed", false)) or not view.has_point(qp):
			continue
		var kind: String = String(q.kind)
		var col: Color = q.get("color", Color.WHITE)
		var pulse: float = 0.75 + 0.25 * sin(anim * 2.0 + qp.x * 0.01)
		match kind:
			"signal", "character", "echo":
				halo(qp, 150.0, col, 0.2 * pulse)
				halo(qp, 60.0, col, 0.35 * pulse)
			"camp":
				halo(qp, 110.0, Color("ff6a3a"), 0.12)
			"gate", "home":
				halo(qp, 170.0, Color("68ecff"), 0.22 * pulse)
			_:
				halo(qp, 70.0, col, 0.18 * pulse)
	# Hostiles: a faint red aura; elites and the boss glow hard.
	for e: ForceEnemy in run.enemies:
		if not is_instance_valid(e) or e.dead or e.disguised or not view.has_point(e.position):
			continue
		if e.boss:
			halo(e.position, e.radius * 4.0, e.tint, 0.5)
			halo(e.position, e.radius * 2.0, Color("ff376f"), 0.45)
		elif e.elite:
			halo(e.position, e.radius * 3.6, e.tint, 0.55)
		else:
			halo(e.position, e.radius * 3.4, Color(e.tint.lerp(Color("ff4060"), 0.45)), 0.6)
	# Allies (Gunnar, skeletons, memories) and the ability field.
	for a: Dictionary in run.allies:
		halo(run.ally_position(a), 36.0, acc, 0.35)
	if run.ability_active > 0.0:
		halo(p.position, 200.0, acc, 0.16)
	# Soft bloom on effect particles and flashes.
	for pa: Array in run.fx.particles:
		var t: float = pa[2] / pa[3]
		if view.has_point(pa[0]):
			halo(pa[0], pa[5] * 7.0, pa[4], 0.5 * t)
	for f: Array in run.fx.flashes:
		var t3: float = f[2] / f[3]
		halo(f[0], f[1] * 2.4, f[4], 0.45 * t3)
