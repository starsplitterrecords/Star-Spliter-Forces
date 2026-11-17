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
				for k in 4:
					var w: float = rad * 2.0 * (1.0 - k * 0.12)
					draw_line(a, b, Color(col.lerp(acc, 0.02 * k), 0.4), w)
					draw_circle(a, w * 0.5, Color(col.lerp(acc, 0.02 * k), 0.4))
					draw_circle(b, w * 0.5, Color(col.lerp(acc, 0.02 * k), 0.4))
				draw_line(a, b, Color(acc, 0.05), 6.0)
			else:
				var c: Vector2 = r["center"]
				var rad2: float = float(r["radius"])
				for k in 5:
					draw_circle(c, rad2 * (1.15 - k * 0.12), Color(col.lerp(acc, 0.018 * k), 0.32))
				draw_arc(c, rad2, 0.0, TAU, 96, Color(acc, 0.10), 3.0)
		# World edge reads as a fading boundary, not a wall.
		draw_rect(Rect2(-hs, hs * 2.0), Color(0.4, 0.6, 1.0, 0.25), false, 6.0)

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
			draw_circle(p, s, Color(tint, tint.a * r.randf_range(0.3, 1.0)))

func build(dest_id: String) -> void:
	destination_id = dest_id
	dest = GameData.DESTINATIONS[dest_id]
	half_size = dest["half_size"]
	gate = dest["gate"]
	region_ids = dest["regions"]
	rng.seed = int(dest["seed"])
	_add_starfield()
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
	var specs: Array = [[0.15, 1024.0, 120, Color(0.6, 0.7, 1.0, 0.45), 11, 1.2], [0.4, 1400.0, 70, Color(0.85, 0.9, 1.0, 0.7), 23, 1.8]]
	for s: Array in specs:
		var px: Parallax2D = Parallax2D.new()
		px.scroll_scale = Vector2(float(s[0]), float(s[0]))
		px.repeat_size = Vector2(float(s[1]), float(s[1]))
		px.repeat_times = 4
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
		_rock(p, rng.randf_range(16.0, 46.0), Color("1a2033"), rng.randf() < 0.6)
		placed += 1

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
