class_name ExpeditionWorld
extends Node2D
## Builds a destination from GameData: region floors, handcrafted landmark
## geometry plus seeded scatter, collision obstacles and corridor beacons.
## Static art is baked into chunk nodes that draw once; Godot culls chunks
## outside the camera, so a large world costs little per frame.

const CHUNK: float = 800.0

var destination_id: String = ""
var dest: Dictionary = {}
var half_size: Vector2 = Vector2(3400, 2400)
var rng: RandomNumberGenerator = RandomNumberGenerator.new()
var obstacles: Array = [] # [{pos, r}]
var obstacle_hash: SpatialHash = SpatialHash.new(220.0)
var beacons: Array = [] # corridor safe-volume beacons: {pos, r}
var chunk_items: Dictionary = {} # Vector2i -> Array of draw ops
var region_ids: Array = []
var gate: Vector2 = Vector2.ZERO
var gate_override: Variant = null # a Corridor stop's home beacon position
## "space" (the Rex Fleet frontier), or a crossover branch's ground: "sea",
## "desert", "orbit", "fantasy", "park", "cosmic" (see GameData.BIOMES).
var biome: String = "space"
var anim: float = 0.0

class Chunk:
	extends Node2D
	var ops: Array = []
	func _draw() -> void:
		for op: Array in ops:
			match String(op[0]):
				"poly":
					draw_colored_polygon(op[1], op[2])
				"line":
					draw_polyline(op[1], op[2], op[3])
				"circle":
					draw_circle(op[1], op[2], op[3])
				"arc":
					draw_arc(op[1], op[2], op[3], op[4], 32, op[5], op[6])

class Floor:
	extends Node2D
	var world: ExpeditionWorld
	func _draw() -> void:
		var hs: Vector2 = world.half_size
		draw_rect(Rect2(-hs, hs * 2.0), Color(world.dest["background"]))
		for rid: String in world.region_ids:
			var r: Dictionary = GameData.REGIONS[rid]
			var col: Color = r["floor"]
			var acc: Color = r["color"]
			if String(r["shape"]) == "capsule":
				var a: Vector2 = r["a"]
				var b: Vector2 = r["b"]
				var rad: float = float(r["radius"])
				# One opaque layer: stacked translucent floors cost a lot of
				# fill rate on phone GPUs.
				var fc: Color = col.lerp(acc, 0.03)
				draw_line(a, b, fc, rad * 2.0)
				draw_circle(a, rad, fc)
				draw_circle(b, rad, fc)
				draw_line(a, b, Color(acc, 0.05), 6.0)
			else:
				var c: Vector2 = r["center"]
				var rad2: float = float(r["radius"])
				draw_circle(c, rad2 * 1.08, Color(col.lerp(Color(world.dest["background"]), 0.5)))
				draw_circle(c, rad2 * 0.92, col.lerp(acc, 0.035))
				draw_arc(c, rad2, 0.0, TAU, 96, Color(acc, 0.10), 3.0)
		# World edge reads as a fading boundary, not a wall.
		draw_rect(Rect2(-hs, hs * 2.0), Color(0.4, 0.6, 1.0, 0.25), false, 6.0)

## Animated surface detail for ground and water biomes: drawn only around
## the camera, so the cost stays flat however big the world is.
class Surface:
	extends Node2D
	var world: ExpeditionWorld
	var t: float = 0.0
	func _process(delta: float) -> void:
		t += delta
		queue_redraw()
	func _draw() -> void:
		var vp: Rect2 = get_viewport().get_visible_rect()
		var inv: Transform2D = get_viewport().get_canvas_transform().affine_inverse()
		var tl: Vector2 = inv * vp.position
		var br: Vector2 = inv * vp.end
		var b: Dictionary = GameData.BIOMES.get(world.biome, {})
		var col: Color = b.get("surface", Color(1, 1, 1, 0.06))
		var step: float = 150.0
		var x0: float = floorf(tl.x / step) * step
		var y0: float = floorf(tl.y / step) * step
		var y: float = y0
		while y < br.y + step:
			var x: float = x0
			while x < br.x + step:
				var h: float = fmod(absf(x * 0.0071 + y * 0.0133), 1.0)
				var p: Vector2 = Vector2(x + h * 90.0, y + fmod(h * 7.3, 1.0) * 90.0)
				match world.biome:
					"sea":
						# Swells: short arcs that rise and fall.
						var ph: float = sin(t * 1.3 + h * 9.0)
						draw_arc(p, 26.0 + ph * 4.0, PI * 1.15, PI * 1.85, 8, Color(col, col.a * (0.6 + 0.4 * ph)), 2.0)
					"desert":
						# Dune ripples.
						draw_arc(p, 40.0, PI * 1.2, PI * 1.8, 8, col, 2.0)
						draw_arc(p + Vector2(10, 9), 34.0, PI * 1.2, PI * 1.8, 8, Color(col, col.a * 0.6), 2.0)
					"fantasy":
						for k in 3:
							draw_line(p + Vector2(k * 7, 0), p + Vector2(k * 7 - 2, -9), col, 2.0)
					"park":
						draw_rect(Rect2(p, Vector2(36, 36)), col, false, 1.5)
				x += step
			y += step

class Stars:
	extends Node2D
	var tile: float = 1024.0
	var count: int = 90
	var tint: Color = Color(0.7, 0.8, 1.0, 0.6)
	var seed_value: int = 1
	var size: float = 1.6
	func _draw() -> void:
		var r: RandomNumberGenerator = RandomNumberGenerator.new()
		r.seed = seed_value
		for i in count:
			var p: Vector2 = Vector2(r.randf() * tile, r.randf() * tile)
			var s: float = size * r.randf_range(0.5, 1.4)
			# Squares batch into a handful of draw calls; circles do not.
			draw_rect(Rect2(p - Vector2(s, s) * 0.5, Vector2(s, s)), Color(tint, tint.a * r.randf_range(0.3, 1.0)))

func build(dest_id: String) -> void:
	destination_id = dest_id
	dest = GameData.DESTINATIONS[dest_id]
	half_size = dest["half_size"]
	gate = dest["gate"] if gate_override == null else Vector2(gate_override)
	region_ids = dest["regions"]
	rng.seed = int(dest["seed"])
	biome = String(dest.get("biome", "space"))
	if biome in ["space", "cosmic", "orbit"]:
		_add_starfield()
	else:
		# Ground and water branches: a living surface instead of stars.
		var surf: Surface = Surface.new()
		surf.world = self
		surf.z_index = -45
		add_child(surf)
	var floor: Floor = Floor.new()
	floor.world = self
	floor.z_index = -50
	add_child(floor)
	for rid: String in region_ids:
		_build_region(rid, GameData.REGIONS[rid])
	_build_drift()
	_bake_chunks()
	for o: Dictionary in obstacles:
		obstacle_hash.insert(o, o.pos, float(o.r))

func _add_starfield() -> void:
	# Tiles larger than the screen need only one repeat each way (3x3 copies);
	# more repeats multiplied the starfield's draw cost many times over.
	var specs: Array = [[0.15, 2048.0, 360, Color(0.6, 0.7, 1.0, 0.45), 11, 1.2], [0.4, 2048.0, 150, Color(0.85, 0.9, 1.0, 0.7), 23, 1.8]]
	for s: Array in specs:
		var px: Parallax2D = Parallax2D.new()
		px.scroll_scale = Vector2(float(s[0]), float(s[0]))
		px.repeat_size = Vector2(float(s[1]), float(s[1]))
		px.repeat_times = 1
		px.z_index = -60
		var stars: Stars = Stars.new()
		stars.tile = float(s[1])
		stars.count = int(s[2])
		stars.tint = s[3]
		stars.seed_value = int(s[4])
		stars.size = float(s[5])
		px.add_child(stars)
		add_child(px)

# ------------------------------------------------------------------ authoring helpers

func _op(pos: Vector2, op: Array) -> void:
	var key: Vector2i = Vector2i(floori(pos.x / CHUNK), floori(pos.y / CHUNK))
	if not chunk_items.has(key):
		chunk_items[key] = []
	chunk_items[key].append(op)

func _obstacle(pos: Vector2, r: float) -> void:
	if pos.distance_to(gate) < 300.0:
		return
	obstacles.append({"pos": pos, "r": r})

func _rock(pos: Vector2, r: float, col: Color, solid: bool = true) -> void:
	var pts: PackedVector2Array = PackedVector2Array()
	var n: int = 7 + rng.randi() % 4
	var rot: float = rng.randf() * TAU
	for i in n:
		pts.append(pos + Vector2.from_angle(rot + TAU * i / n) * r * rng.randf_range(0.75, 1.15))
	_op(pos, ["poly", pts, col])
	var hl: PackedVector2Array = PackedVector2Array()
	for i in range(0, n / 2 + 1):
		hl.append(pts[i])
	_op(pos, ["line", hl, Color(col.lightened(0.35), 0.8), 2.0])
	if solid:
		_obstacle(pos, r * 0.85)

func _scatter_point(region: Dictionary) -> Vector2:
	for attempt in 20:
		var p: Vector2
		if String(region["shape"]) == "capsule":
			var t: float = rng.randf()
			var a: Vector2 = region["a"]
			var b: Vector2 = region["b"]
			var side: Vector2 = (b - a).normalized().orthogonal()
			p = a.lerp(b, t) + side * rng.randf_range(-1.0, 1.0) * float(region["radius"])
		else:
			p = Vector2(region["center"]) + Vector2.from_angle(rng.randf() * TAU) * sqrt(rng.randf()) * float(region["radius"])
		if _clear_of_discoveries(p, 110.0):
			return p
	return Vector2(INF, INF)

func _clear_of_discoveries(p: Vector2, margin: float) -> bool:
	if p.distance_to(gate) < 320.0:
		return false
	for id: String in GameData.DISCOVERIES.keys():
		var d: Dictionary = GameData.DISCOVERIES[id]
		if not GameData.discovery_in_destination(id, destination_id):
			continue
		if GameData.discovery_position(id).distance_to(p) < margin:
			return false
	return true

# ------------------------------------------------------------------ regions

func _build_region(rid: String, r: Dictionary) -> void:
	var acc: Color = r["color"]
	var density: float = float(r["density"])
	match String(r["props"]):
		"gate":
			var c: Vector2 = r["center"]
			_op(c, ["arc", c, 150.0, 0.0, TAU, Color(acc, 0.35), 6.0])
			_op(c, ["arc", c, 175.0, 0.2, PI - 0.2, Color(acc, 0.25), 3.0])
			_op(c, ["arc", c, 175.0, PI + 0.2, TAU - 0.2, Color(acc, 0.25), 3.0])
			for i in 6:
				var a: float = TAU * i / 6.0
				var p: Vector2 = c + Vector2.from_angle(a) * 210.0
				var pyl: PackedVector2Array = PackedVector2Array([p + Vector2(-10, -26), p + Vector2(10, -26), p + Vector2(14, 22), p + Vector2(-14, 22)])
				_op(p, ["poly", pyl, Color("1c3148")])
				_op(p, ["circle", p + Vector2(0, -20), 5.0, Color(acc, 0.9)])
			for i in 14:
				var rp: Vector2 = c + Vector2.from_angle(rng.randf() * TAU) * rng.randf_range(330.0, 430.0)
				_rock(rp, rng.randf_range(10.0, 22.0), Color("1a2235"), false)
		"wreck":
			var hulls: int = int(7 * density)
			for i in hulls:
				var p2: Vector2 = _scatter_point(r)
				if p2.x == INF:
					continue
				_wreck(p2, rng.randf_range(90.0, 190.0), rng.randf() * TAU, acc)
			for i in int(60 * density):
				var p3: Vector2 = _scatter_point(r)
				if p3.x != INF:
					_rock(p3, rng.randf_range(6.0, 14.0), Color("2a3346"), false)
		"crystal":
			for i in int(26 * density):
				var p4: Vector2 = _scatter_point(r)
				if p4.x == INF:
					continue
				_crystal(p4, rng.randf_range(22.0, 60.0), acc)
			# Shelf edges: long jagged ridgelines that funnel movement.
			for i in 5:
				var start: Vector2 = _scatter_point(r)
				if start.x == INF:
					continue
				var dir: Vector2 = Vector2.from_angle(rng.randf() * TAU)
				var pts: PackedVector2Array = PackedVector2Array()
				for k in 7:
					var q: Vector2 = start + dir * k * 70.0 + dir.orthogonal() * rng.randf_range(-20.0, 20.0)
					pts.append(q)
					if k % 2 == 0 and _clear_of_discoveries(q, 90.0):
						_obstacle(q, 26.0)
						_op(q, ["circle", q, 24.0, Color("2b1810")])
				_op(start, ["line", pts, Color(acc, 0.55), 5.0])
		"pools":
			for i in int(16 * density + 4):
				var p5: Vector2 = _scatter_point(r)
				if p5.x == INF:
					continue
				var pr: float = rng.randf_range(40.0, 110.0)
				var pool: PackedVector2Array = PackedVector2Array()
				for k in 18:
					pool.append(p5 + Vector2(cos(TAU * k / 18.0) * pr * 1.4, sin(TAU * k / 18.0) * pr * 0.8))
				_op(p5, ["poly", pool, Color(acc, 0.10)])
				_op(p5, ["arc", p5, pr * 0.6, 0.0, TAU, Color(acc, 0.12), 2.0])
				for k in 5:
					var reed: Vector2 = p5 + Vector2.from_angle(rng.randf() * TAU) * pr * 1.2
					_op(reed, ["line", PackedVector2Array([reed, reed + Vector2(rng.randf_range(-4, 4), -16)]), Color(acc, 0.45), 2.0])
			for i in 8:
				var p6: Vector2 = _scatter_point(r)
				if p6.x != INF:
					_rock(p6, rng.randf_range(18.0, 34.0), Color("17261f"))
		"open_sea":
			# Big slow swells and channel markers.
			for i in int(10 * density + 4):
				var ps: Vector2 = _scatter_point(r)
				if ps.x == INF:
					continue
				_op(ps, ["arc", ps, rng.randf_range(80.0, 200.0), PI * 1.1, PI * 1.9, Color(acc, 0.14), 3.0])
			for i in 10:
				var pb: Vector2 = _scatter_point(r)
				if pb.x != INF:
					_drift_prop(pb, rng.randf_range(24.0, 40.0), true)
		"harbor":
			# Rows of pilings and a dock edge with a crane.
			var hc: Vector2 = GameData.region_anchor(r)
			for row in 4:
				var base: Vector2 = hc + Vector2(-400 + row * 260, -220 + rng.randf_range(-60, 60))
				for k in 6:
					var pp: Vector2 = base + Vector2(rng.randf_range(-20, 20), k * 70.0)
					if _clear_of_discoveries(pp, 160.0):
						_op(pp, ["circle", pp, 11.0, Color("3a2e22")])
						_op(pp, ["arc", pp, 11.0, 0.0, TAU, Color("6b5640"), 2.0])
						_obstacle(pp, 11.0)
			var dock: PackedVector2Array = PackedVector2Array([hc + Vector2(-520, 380), hc + Vector2(520, 300), hc + Vector2(560, 380), hc + Vector2(-480, 460)])
			_op(hc, ["poly", dock, Color("3c444c")])
			var cr: Vector2 = hc + Vector2(220, 330)
			_op(cr, ["line", PackedVector2Array([cr, cr + Vector2(0, -150), cr + Vector2(130, -150)]), Color("8a6a2a"), 6.0])
			_op(cr, ["line", PackedVector2Array([cr + Vector2(120, -150), cr + Vector2(120, -90)]), Color("8a8f98"), 2.0])
			_obstacle(cr, 18.0)
		"shore_city":
			# City blocks on the shore: solid.
			var sc2: Vector2 = GameData.region_anchor(r)
			for k in 9:
				var bp: Vector2 = sc2 + Vector2(rng.randf_range(-1, 1), rng.randf_range(-1, 1)) * float(r["radius"]) * 0.7
				if not _clear_of_discoveries(bp, 200.0):
					continue
				var w: float = rng.randf_range(70.0, 150.0)
				var h2: float = rng.randf_range(60.0, 130.0)
				_op(bp, ["poly", PackedVector2Array([bp, bp + Vector2(w, 0), bp + Vector2(w, h2), bp + Vector2(0, h2)]), Color("2a2f3a")])
				for wi in 4:
					_op(bp, ["poly", PackedVector2Array([bp + Vector2(10 + wi * w / 4.5, 12), bp + Vector2(18 + wi * w / 4.5, 12), bp + Vector2(18 + wi * w / 4.5, 22), bp + Vector2(10 + wi * w / 4.5, 22)]), Color("ffd98a", 0.35)])
				_obstacle(bp + Vector2(w, h2) * 0.5, minf(w, h2) * 0.5)
		"rooftop":
			# A tar roof with a brick parapet and vents.
			var rc: Vector2 = GameData.region_anchor(r)
			var rw: float = float(r["radius"]) * 0.9
			var roof: PackedVector2Array = PackedVector2Array([rc + Vector2(-rw, -rw * 0.7), rc + Vector2(rw, -rw * 0.7), rc + Vector2(rw, rw * 0.7), rc + Vector2(-rw, rw * 0.7)])
			_op(rc, ["poly", roof, Color("1c1d20")])
			_op(rc, ["line", roof + PackedVector2Array([roof[0]]), Color("7a3e2a"), 10.0])
			for k in 6:
				var vp2: Vector2 = rc + Vector2(rng.randf_range(-rw, rw) * 0.8, rng.randf_range(-rw, rw) * 0.5)
				if _clear_of_discoveries(vp2, 160.0):
					_op(vp2, ["circle", vp2, 14.0, Color("8a8f98")])
					_obstacle(vp2, 14.0)
		"flooded":
			# Tops of drowned buildings breaking the water.
			for k in int(12 * density + 4):
				var fp: Vector2 = _scatter_point(r)
				if fp.x == INF:
					continue
				var fw: float = rng.randf_range(50.0, 120.0)
				_op(fp, ["poly", PackedVector2Array([fp, fp + Vector2(fw, 0), fp + Vector2(fw, fw * 0.7), fp + Vector2(0, fw * 0.7)]), Color("26333a")])
				_op(fp, ["line", PackedVector2Array([fp + Vector2(0, fw * 0.7), fp + Vector2(fw, fw * 0.7)]), Color(acc, 0.35), 3.0])
				_obstacle(fp + Vector2(fw, fw * 0.7) * 0.5, fw * 0.35)
		"plaza", "queue", "aquarium", "backstage", "suite":
			_park_region(String(r["props"]), r, acc, density)
		"station_hull", "station_corridor", "bullpen", "break_room", "supply":
			_station_region(String(r["props"]), r, acc, density)
		"lakebed":
			# Cracked flat clay: polygon crack lines, open ground for a launch.
			for k in int(16 * density + 6):
				var lp: Vector2 = _scatter_point(r)
				if lp.x == INF:
					continue
				var crack: PackedVector2Array = PackedVector2Array([lp])
				for s2 in 4:
					crack.append(crack[-1] + Vector2.from_angle(rng.randf() * TAU) * rng.randf_range(30.0, 70.0))
				_op(lp, ["line", crack, Color("1e150e", 0.55), 2.0])
		"desert_camp":
			# Solar panels and parts crates around the workshop.
			for k in 8:
				var cp: Vector2 = _scatter_point(r)
				if cp.x == INF or not _clear_of_discoveries(cp, 180.0):
					continue
				if k % 2 == 0:
					_op(cp, ["poly", PackedVector2Array([cp, cp + Vector2(60, -12), cp + Vector2(66, 18), cp + Vector2(6, 30)]), Color("23384a")])
					_op(cp, ["line", PackedVector2Array([cp + Vector2(30, -6), cp + Vector2(36, 24)]), Color("6a8aa8", 0.6), 1.5])
				else:
					_op(cp, ["poly", PackedVector2Array([cp, cp + Vector2(34, 0), cp + Vector2(34, 26), cp + Vector2(0, 26)]), Color("6a4a2e")])
				_obstacle(cp + Vector2(18, 10), 18.0)
		"town":
			# Adobe blocks and water tanks: solid.
			var tc: Vector2 = GameData.region_anchor(r)
			for k in 8:
				var bp2: Vector2 = tc + Vector2(rng.randf_range(-1, 1), rng.randf_range(-1, 1)) * float(r["radius"]) * 0.7
				if not _clear_of_discoveries(bp2, 200.0):
					continue
				if k % 3 == 0:
					_op(bp2, ["circle", bp2, 26.0, Color("7a8a90")])
					_op(bp2, ["arc", bp2, 26.0, 0.0, TAU, Color(acc, 0.5), 2.0])
					_obstacle(bp2, 26.0)
				else:
					var w2: float = rng.randf_range(70.0, 130.0)
					var h3: float = rng.randf_range(50.0, 90.0)
					_op(bp2, ["poly", PackedVector2Array([bp2, bp2 + Vector2(w2, 0), bp2 + Vector2(w2, h3), bp2 + Vector2(0, h3)]), Color("8a6a4c")])
					_op(bp2, ["poly", PackedVector2Array([bp2 + Vector2(w2 * 0.4, h3 * 0.4), bp2 + Vector2(w2 * 0.4 + 14, h3 * 0.4), bp2 + Vector2(w2 * 0.4 + 14, h3 * 0.4 + 18), bp2 + Vector2(w2 * 0.4, h3 * 0.4 + 18)]), Color("2a1e14")])
					_obstacle(bp2 + Vector2(w2, h3) * 0.5, minf(w2, h3) * 0.5)
		"mesa":
			# Layered red rock plateaus.
			for k in int(5 * density + 2):
				var mp: Vector2 = _scatter_point(r)
				if mp.x == INF or not _clear_of_discoveries(mp, 220.0):
					continue
				var mr: float = rng.randf_range(60.0, 120.0)
				for layer in 3:
					var lr: float = mr * (1.0 - layer * 0.22)
					var pts: PackedVector2Array = PackedVector2Array()
					for q in 9:
						pts.append(mp + Vector2(0, -layer * 8) + Vector2.from_angle(TAU * q / 9.0) * lr * Vector2(1.3, 0.8) * rng.randf_range(0.85, 1.1))
					_op(mp, ["poly", pts, [Color("6a3a26"), Color("8a4a30"), Color("a65a38")][layer]])
				_obstacle(mp, mr * 0.9)
		"dunes":
			# Long dune crests and half-buried scrap.
			for k in int(12 * density + 4):
				var dp: Vector2 = _scatter_point(r)
				if dp.x == INF:
					continue
				var dr: float = rng.randf_range(90.0, 220.0)
				_op(dp, ["arc", dp, dr, PI * 1.15, PI * 1.85, Color("c88a4a", 0.35), 6.0])
				_op(dp, ["arc", dp + Vector2(0, 8), dr, PI * 1.2, PI * 1.8, Color("1e140c", 0.4), 3.0])
			for k in 5:
				var sp: Vector2 = _scatter_point(r)
				if sp.x != INF and _clear_of_discoveries(sp, 160.0):
					_rock(sp, rng.randf_range(20.0, 34.0), Color("4a3a30"))
		"corridor":
			var a: Vector2 = r["a"]
			var b: Vector2 = r["b"]
			var axis: Vector2 = (b - a).normalized()
			var side: Vector2 = axis.orthogonal()
			var length: float = a.distance_to(b)
			var rad: float = float(r["radius"])
			var step: float = 64.0
			var t2: float = 0.0
			while t2 <= length:
				var mid: Vector2 = a + axis * t2
				for s: float in [-1.0, 1.0]:
					# Walls with occasional breaches you can slip through.
					if fmod(t2 + (200.0 if s > 0.0 else 0.0), 720.0) < 600.0:
						var wp: Vector2 = mid + side * s * (rad + rng.randf_range(-10.0, 20.0))
						_rock(wp, rng.randf_range(26.0, 40.0), Color("1d1630"))
				t2 += step
			var bt: float = 260.0
			while bt < length:
				var bp: Vector2 = a + axis * bt + side * rng.randf_range(-60.0, 60.0)
				beacons.append({"pos": bp, "r": 95.0})
				bt += 520.0
		"belt":
			# Dense asteroid fragments with open lanes between clusters.
			for i in int(90 * density):
				var p8: Vector2 = _scatter_point(r)
				if p8.x == INF:
					continue
				var cluster: int = 1 + rng.randi() % 3
				for k in cluster:
					_rock(p8 + Vector2.from_angle(rng.randf() * TAU) * rng.randf_range(0.0, 60.0), rng.randf_range(18.0, 52.0), Color("2a2420"), rng.randf() < 0.8)
			for i in 6:
				var lane_start: Vector2 = _scatter_point(r)
				if lane_start.x == INF:
					continue
				var lane_dir: Vector2 = Vector2.from_angle(rng.randf() * TAU)
				_op(lane_start, ["line", PackedVector2Array([lane_start - lane_dir * 500.0, lane_start + lane_dir * 500.0]), Color(acc, 0.08), 40.0])
		"bloom":
			var c2: Vector2 = r["center"]
			for i in 9:
				var a2: float = TAU * i / 9.0 + rng.randf() * 0.3
				var petal: PackedVector2Array = PackedVector2Array()
				var len2: float = rng.randf_range(260.0, 520.0)
				for k in 12:
					var tt: float = float(k) / 11.0
					petal.append(c2 + Vector2.from_angle(a2 + sin(tt * PI) * 0.18) * len2 * tt)
				for k in range(11, -1, -1):
					var tt2: float = float(k) / 11.0
					petal.append(c2 + Vector2.from_angle(a2 - sin(tt2 * PI) * 0.18) * len2 * tt2)
				_op(c2, ["poly", petal, Color(acc, 0.06)])
				_op(c2, ["line", PackedVector2Array([c2, c2 + Vector2.from_angle(a2) * len2]), Color(acc, 0.25), 2.0])
			for i in int(14 * density):
				var p7: Vector2 = _scatter_point(r)
				if p7.x != INF:
					_crystal(p7, rng.randf_range(18.0, 40.0), acc)

func _build_drift() -> void:
	# Sparse asteroids in the open drift give the space scale and cover.
	var placed: int = 0
	var tries: int = 0
	while placed < 260 and tries < 2600:
		tries += 1
		var p: Vector2 = Vector2(rng.randf_range(-half_size.x, half_size.x), rng.randf_range(-half_size.y, half_size.y))
		var inside: bool = false
		for rid: String in region_ids:
			if GameData.region_distance(GameData.REGIONS[rid], p) < 60.0:
				inside = true
				break
		if inside or not _clear_of_discoveries(p, 140.0):
			continue
		_drift_prop(p, rng.randf_range(16.0, 46.0), rng.randf() < 0.6)
		placed += 1

## Azure Reach: glass, water, queues and the backstage that keeps it running.
func _park_region(kind: String, r: Dictionary, acc: Color, density: float) -> void:
	match kind:
		"aquarium":
			# Big glass tanks: water panels with a bright rim and a few fish.
			for k in int(6 * density + 3):
				var tp: Vector2 = _scatter_point(r)
				if tp.x == INF or not _clear_of_discoveries(tp, 220.0):
					continue
				var w: float = rng.randf_range(160.0, 260.0)
				var h: float = rng.randf_range(70.0, 110.0)
				_op(tp, ["poly", PackedVector2Array([tp, tp + Vector2(w, 0), tp + Vector2(w, h), tp + Vector2(0, h)]), Color("0e4a70", 0.85)])
				_op(tp, ["line", PackedVector2Array([tp, tp + Vector2(w, 0), tp + Vector2(w, h), tp + Vector2(0, h), tp]), Color(acc, 0.6), 3.0])
				for q in 4:
					var fp: Vector2 = tp + Vector2(rng.randf_range(20, w - 20), rng.randf_range(15, h - 15))
					_op(fp, ["poly", PackedVector2Array([fp + Vector2(-8, 0), fp + Vector2(4, -4), fp + Vector2(8, 0), fp + Vector2(4, 4)]), [Color("ffd36b"), Color("ff8a6a"), Color("bfefff")][q % 3]])
				_obstacle(tp + Vector2(w, h) * 0.5, h * 0.5)
		"plaza":
			# Fountains, palms and planters on a tiled plaza.
			for k in int(8 * density + 3):
				var pp: Vector2 = _scatter_point(r)
				if pp.x == INF or not _clear_of_discoveries(pp, 180.0):
					continue
				if k % 3 == 0:
					_op(pp, ["circle", pp, 46.0, Color("1a4a6a")])
					_op(pp, ["arc", pp, 46.0, 0.0, TAU, Color(acc, 0.6), 4.0])
					_op(pp, ["circle", pp, 12.0, Color("bfefff", 0.7)])
					_obstacle(pp, 46.0)
				else:
					# Palm in a planter.
					_op(pp, ["circle", pp, 18.0, Color("2a3a44")])
					for q in 5:
						var fr: Vector2 = Vector2.from_angle(q * TAU / 5.0 + rng.randf()) * 34.0
						_op(pp, ["line", PackedVector2Array([pp, pp + fr]), Color("3a8a5a"), 6.0])
					_obstacle(pp, 18.0)
		"queue":
			# Switchback stanchion lines.
			var qc: Vector2 = GameData.region_anchor(r)
			for row in 5:
				var y: float = -200.0 + row * 90.0
				var x0: float = -320.0
				var x1: float = 320.0
				_op(qc, ["line", PackedVector2Array([qc + Vector2(x0, y), qc + Vector2(x1, y)]), Color(acc, 0.45), 3.0])
				for k in 9:
					var sp: Vector2 = qc + Vector2(x0 + k * 80.0, y)
					if _clear_of_discoveries(sp, 120.0):
						_op(sp, ["circle", sp, 6.0, Color("c8ccd6")])
		"backstage":
			# Crates, cable runs and work lights.
			for k in int(9 * density + 3):
				var bp: Vector2 = _scatter_point(r)
				if bp.x == INF or not _clear_of_discoveries(bp, 170.0):
					continue
				if k % 3 == 0:
					_op(bp, ["circle", bp, 14.0, Color("2a2e36")])
					_op(bp, ["circle", bp, 8.0, Color(acc, 0.8)])
					_op(bp, ["arc", bp, 60.0, -0.6, 0.6, Color(acc, 0.15), 30.0])
				else:
					_op(bp, ["poly", PackedVector2Array([bp, bp + Vector2(50, 0), bp + Vector2(50, 40), bp + Vector2(0, 40)]), Color("34404c")])
					_op(bp, ["line", PackedVector2Array([bp, bp + Vector2(50, 40)]), Color("4a5664"), 2.0])
					_obstacle(bp + Vector2(25, 20), 26.0)
				var cable: Vector2 = bp + Vector2(rng.randf_range(-120, 120), rng.randf_range(-120, 120))
				_op(bp, ["line", PackedVector2Array([bp, (bp + cable) * 0.5 + Vector2(20, 20), cable]), Color("1a1e24"), 3.0])
		"suite":
			# Lounge sofas around low tables.
			var sc: Vector2 = GameData.region_anchor(r)
			_op(sc, ["circle", sc, float(r["radius"]) * 0.7, Color("142a44", 0.8)])
			for k in 5:
				var lp: Vector2 = sc + Vector2.from_angle(k * TAU / 5.0) * float(r["radius"]) * 0.45
				if not _clear_of_discoveries(lp, 150.0):
					continue
				_op(lp, ["circle", lp, 24.0, Color("3a4a6a")])
				for q in 2:
					var so: Vector2 = lp + Vector2.from_angle(q * PI + k) * 46.0
					_op(so, ["poly", PackedVector2Array([so + Vector2(-30, -12), so + Vector2(30, -12), so + Vector2(30, 12), so + Vector2(-30, 12)]), Color("bcd4ff", 0.5)])
				_obstacle(lp, 30.0)

## Stardust Station interiors: deck plating with the room's furniture.
func _station_region(kind: String, r: Dictionary, acc: Color, density: float) -> void:
	var c: Vector2 = GameData.region_anchor(r)
	match kind:
		"station_hull":
			# Ring segments, spokes and solar wings around the branch office.
			for k in 6:
				var a0: float = TAU * k / 6.0 + rng.randf_range(-0.2, 0.2)
				_op(c, ["arc", c, float(r["radius"]) * 0.75, a0, a0 + 0.6, Color("4a5a90"), 18.0])
				_op(c, ["arc", c, float(r["radius"]) * 0.75, a0, a0 + 0.6, Color(acc, 0.25), 3.0])
				var wp: Vector2 = c + Vector2.from_angle(a0 + 0.3) * float(r["radius"]) * 0.75
				if _clear_of_discoveries(wp, 200.0):
					_obstacle(wp, 22.0)
			for k in 4:
				var sp: Vector2 = _scatter_point(r)
				if sp.x != INF and _clear_of_discoveries(sp, 180.0):
					_op(sp, ["poly", PackedVector2Array([sp, sp + Vector2(90, 0), sp + Vector2(90, 34), sp + Vector2(0, 34)]), Color("23305a")])
					for q in 4:
						_op(sp, ["line", PackedVector2Array([sp + Vector2(q * 22 + 11, 0), sp + Vector2(q * 22 + 11, 34)]), Color("6a7ab0", 0.5), 1.0])
					_obstacle(sp + Vector2(45, 17), 24.0)
		"station_corridor":
			# Two long walls with access panels and a sign.
			var a: Vector2 = r["a"]
			var b: Vector2 = r["b"]
			var ax: Vector2 = (b - a).normalized()
			var sd: Vector2 = ax.orthogonal() * (float(r["radius"]) * 0.85)
			_op(a, ["poly", PackedVector2Array([a - sd * 1.1, b - sd * 1.1, b + sd * 1.1, a + sd * 1.1]), Color("161c3a", 0.9)])
			for side in [-1.0, 1.0]:
				_op(a, ["line", PackedVector2Array([a + sd * side, b + sd * side]), Color("5a6aa0"), 10.0])
				var n: int = int(a.distance_to(b) / 220.0)
				for k in n:
					var pp: Vector2 = a + ax * (110.0 + k * 220.0) + sd * side * 0.92
					_op(pp, ["poly", PackedVector2Array([pp - ax * 30, pp + ax * 30, pp + ax * 30 - sd.normalized() * side * 22, pp - ax * 30 - sd.normalized() * side * 22]), Color("2a3460")])
					_op(pp, ["circle", pp - sd.normalized() * side * 11, 3.0, Color(acc, 0.7)])
		"bullpen", "break_room", "supply":
			var rad: float = float(r["radius"]) * 0.8
			var deck: PackedVector2Array = PackedVector2Array()
			for q in 8:
				deck.append(c + Vector2.from_angle(TAU * q / 8.0 + PI / 8.0) * rad)
			_op(c, ["poly", deck, Color("161c3a", 0.9)])
			var edge: PackedVector2Array = deck.duplicate()
			edge.append(deck[0])
			_op(c, ["line", edge, Color(acc, 0.35), 4.0])
			for k in int(9 * density + 3):
				var fp: Vector2 = c + Vector2(rng.randf_range(-1, 1), rng.randf_range(-1, 1)) * rad * 0.6
				if not _clear_of_discoveries(fp, 170.0):
					continue
				match kind:
					"bullpen":
						# A desk with a monitor and a chair.
						_op(fp, ["poly", PackedVector2Array([fp, fp + Vector2(70, 0), fp + Vector2(70, 34), fp + Vector2(0, 34)]), Color("3a4470")])
						_op(fp, ["poly", PackedVector2Array([fp + Vector2(22, 4), fp + Vector2(48, 4), fp + Vector2(48, 18), fp + Vector2(22, 18)]), Color(acc, 0.55)])
						_op(fp, ["circle", fp + Vector2(35, 48), 9.0, Color("252c50")])
						_obstacle(fp + Vector2(35, 17), 30.0)
					"break_room":
						if k % 3 == 0:
							# Vending machine.
							_op(fp, ["poly", PackedVector2Array([fp, fp + Vector2(44, 0), fp + Vector2(44, 70), fp + Vector2(0, 70)]), Color("2a3a6a")])
							for q in 6:
								_op(fp, ["circle", fp + Vector2(12 + (q % 2) * 20, 14 + int(q / 2) * 18), 4.0, [Color("ff8a6a"), Color("ffd86a"), Color("8ae0ff")][q % 3]])
							_obstacle(fp + Vector2(22, 35), 28.0)
						else:
							# A round table and folding chairs.
							_op(fp, ["circle", fp, 22.0, Color("3a4470")])
							for q in 3:
								_op(fp, ["circle", fp + Vector2.from_angle(q * TAU / 3.0) * 36.0, 8.0, Color("5a6070")])
							_obstacle(fp, 22.0)
					"supply":
						# A shelf row with boxes.
						_op(fp, ["poly", PackedVector2Array([fp, fp + Vector2(120, 0), fp + Vector2(120, 24), fp + Vector2(0, 24)]), Color("2e3658")])
						for q in 5:
							_op(fp, ["poly", PackedVector2Array([fp + Vector2(6 + q * 23, 4), fp + Vector2(24 + q * 23, 4), fp + Vector2(24 + q * 23, 20), fp + Vector2(6 + q * 23, 20)]), [Color("c8a46a"), Color("7fe0c0"), Color("e0a0c0")][q % 3]])
						_obstacle(fp + Vector2(60, 12), 30.0)

## Open-ground scatter in the biome's own language.
func _drift_prop(p: Vector2, r: float, solid: bool) -> void:
	match biome:
		"sea":
			if rng.randf() < 0.35:
				# Channel buoy with a light.
				_op(p, ["circle", p, r * 0.45, Color("2a3a44")])
				_op(p, ["arc", p, r * 0.45, 0.0, TAU, Color("c8462e"), 3.0])
				_op(p, ["circle", p + Vector2(0, -r * 0.2), 3.0, Color("ffd36b")])
				if solid:
					_obstacle(p, r * 0.45)
			else:
				# Pilings / drifting debris.
				_rock(p, r * 0.7, Color("22303a"), solid)
		"park":
			if rng.randf() < 0.5:
				# A bench or a bin on the promenade.
				_op(p, ["poly", PackedVector2Array([p + Vector2(-r * 0.6, -6), p + Vector2(r * 0.6, -6), p + Vector2(r * 0.6, 6), p + Vector2(-r * 0.6, 6)]), Color("3a5a6a")])
			else:
				_op(p, ["circle", p, r * 0.35, Color("2a4a5a")])
				_op(p, ["circle", p, r * 0.18, Color("4fd8ff", 0.4)])
				if solid:
					_obstacle(p, r * 0.35)
		"orbit":
			if rng.randf() < 0.3:
				# A loose solar panel or hull plate.
				var ang: float = rng.randf() * TAU
				var ax: Vector2 = Vector2.from_angle(ang) * r * 0.8
				var sd: Vector2 = ax.orthogonal() * 0.5
				_op(p, ["poly", PackedVector2Array([p - ax - sd, p + ax - sd, p + ax + sd, p - ax + sd]), Color("23305a")])
				_op(p, ["line", PackedVector2Array([p - ax, p + ax]), Color("6a7ab0", 0.6), 1.5])
				if solid:
					_obstacle(p, r * 0.6)
			else:
				_rock(p, r * 0.8, Color("1e2240"), solid)
		"desert":
			if rng.randf() < 0.45:
				# Creosote scrub: a low cluster you fly over.
				for k in 5:
					_op(p, ["circle", p + Vector2.from_angle(k * 1.3) * r * 0.3, r * 0.22, Color("4a5a2e", 0.8)])
			else:
				_rock(p, r * 0.8, Color("5a4030"), solid)
		_:
			_rock(p, r, Color(GameData.BIOMES.get(biome, {}).get("rock", Color("1a2033"))), solid)

func _wreck(p: Vector2, length: float, rot: float, acc: Color) -> void:
	var axis: Vector2 = Vector2.from_angle(rot)
	var side: Vector2 = axis.orthogonal()
	var w: float = length * 0.28
	var hull: PackedVector2Array = PackedVector2Array([
		p - axis * length * 0.5 - side * w * 0.6, p - axis * length * 0.2 - side * w, p + axis * length * 0.35 - side * w * 0.8,
		p + axis * length * 0.5, p + axis * length * 0.3 + side * w * 0.9, p - axis * length * 0.1 + side * w,
		p - axis * length * 0.45 + side * w * 0.5])
	_op(p, ["poly", hull, Color("1f2836")])
	var outline: PackedVector2Array = hull.duplicate()
	outline.append(hull[0])
	_op(p, ["line", outline, Color(acc, 0.35), 2.0])
	for k in 4:
		var rib: Vector2 = p - axis * length * 0.35 + axis * length * 0.22 * k
		_op(p, ["line", PackedVector2Array([rib - side * w * 0.7, rib + side * w * 0.7]), Color(acc, 0.18), 3.0])
	# A broken spine glints so wreck fields read at a glance.
	_op(p, ["circle", p + axis * length * 0.42, 4.0, Color(acc, 0.8)])
	for k in 3:
		_obstacle(p - axis * length * 0.3 + axis * length * 0.3 * k, w * 0.8)

func _crystal(p: Vector2, s: float, acc: Color) -> void:
	for k in 3:
		var a: float = -PI / 2.0 + rng.randf_range(-0.6, 0.6)
		var base: Vector2 = p + Vector2(rng.randf_range(-s * 0.4, s * 0.4), 0)
		var tip: Vector2 = base + Vector2.from_angle(a) * s * rng.randf_range(0.8, 1.5)
		var wid: Vector2 = Vector2.from_angle(a).orthogonal() * s * 0.22
		_op(p, ["poly", PackedVector2Array([base - wid, tip, base + wid]), Color(acc.darkened(0.55), 0.95)])
		_op(p, ["line", PackedVector2Array([base - wid, tip]), Color(acc, 0.6), 2.0])
	_obstacle(p, s * 0.55)

func _bake_chunks() -> void:
	for key: Vector2i in chunk_items.keys():
		var ch: Chunk = Chunk.new()
		ch.ops = chunk_items[key]
		ch.z_index = -40
		add_child(ch)
	chunk_items.clear()

# ------------------------------------------------------------------ queries

func region_at(p: Vector2) -> String:
	var best: String = ""
	var best_d: float = 0.0
	for rid: String in region_ids:
		var d: float = GameData.region_distance(GameData.REGIONS[rid], p)
		if d <= 0.0 and (best == "" or d < best_d):
			best = rid
			best_d = d
	return best

func region_def(rid: String) -> Dictionary:
	if GameData.REGIONS.has(rid):
		return GameData.REGIONS[rid]
	if _drift.is_empty():
		_drift = GameData.DRIFT_REGION.duplicate()
		_drift["name"] = String(dest.get("drift_name", "OPEN DRIFT"))
	return _drift

var _drift: Dictionary = {}

func in_beacon(p: Vector2) -> bool:
	for b: Dictionary in beacons:
		if p.distance_to(b.pos) < float(b.r):
			return true
	return false

## Pushes a circle out of solid obstacles. Returns the corrected position.
## Overlapping obstacles are resolved together (summed penetration over a few
## iterations) so two rocks can never trap a ship by pushing in turn.
func resolve(p: Vector2, radius: float) -> Vector2:
	for iteration in 3:
		var correction: Vector2 = Vector2.ZERO
		var hits: int = 0
		for o: Dictionary in obstacle_hash.query(p, radius):
			var op: Vector2 = o.pos
			var min_d: float = float(o.r) + radius
			var delta: Vector2 = p - op
			var d2: float = delta.length_squared()
			if d2 < min_d * min_d:
				var d: float = sqrt(d2)
				var n: Vector2 = delta / d if d > 0.001 else Vector2.RIGHT
				correction += n * (min_d - d)
				hits += 1
		if hits == 0:
			break
		p += correction
	return p

func clamp_to_world(p: Vector2) -> Vector2:
	return p.clamp(-half_size, half_size)

func random_open_point_near(center: Vector2, min_r: float, max_r: float, rng2: RandomNumberGenerator) -> Vector2:
	for attempt in 8:
		var p: Vector2 = center + Vector2.from_angle(rng2.randf() * TAU) * rng2.randf_range(min_r, max_r)
		p = clamp_to_world(p)
		if obstacle_hash.query(p, 30.0).is_empty():
			return p
	return clamp_to_world(center + Vector2.from_angle(rng2.randf() * TAU) * max_r)

func _process(delta: float) -> void:
	anim += delta
