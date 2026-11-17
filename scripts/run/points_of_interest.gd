class_name PointsOfInterest
extends Node2D
## Everything worth travelling to. Signals and character beacons must be
## *tuned* — hold position inside the ring for a moment — so arriving is an
## event, not a pickup. Some sites only reveal themselves in a particular
## Resonance state or to a scanner sweep: curiosity is rewarded, not marked.

const TUNE_TIME: Dictionary = {"echo": 3.0, "signal": 4.5, "character": 4.0, "artifact": 1.5, "fragment": 0.8, "resonator": 1.4}

var run: Node
var items: Array = [] # Dictionaries
var anim: float = 0.0
var font: Font

func _ready() -> void:
	font = ThemeDB.fallback_font
	z_index = -5

func add(poi: Dictionary) -> Dictionary:
	var p: Dictionary = {"id": "", "kind": "cache", "pos": Vector2.ZERO, "title": "", "hidden": "", "claimed": false,
		"known": false, "progress": 0.0, "radius": 64.0, "color": Color("68ecff"), "data": {}}
	p.merge(poi, true)
	items.append(p)
	return p

func populate(world: ExpeditionWorld, rng: RandomNumberGenerator, profile_discovered: Dictionary) -> void:
	var gate_region: String = world.region_at(world.gate)
	for id: String in GameData.DISCOVERIES.keys():
		var d: Dictionary = GameData.DISCOVERIES[id]
		var rid: String = String(d.get("region", ""))
		if not GameData.discovery_in_destination(id, world.destination_id):
			continue
		var col: Color = Color("cfe9ff")
		if d.has("force"):
			col = GameData.FORCES[String(d["force"])]["color"]
		elif String(d["kind"]) == "character":
			col = Color("8fffc1")
		elif String(d["kind"]) == "fragment":
			col = Color("d7d0ff")
		elif String(d["kind"]) == "anomaly":
			col = Color("9fe8ff")
		var known_before: bool = profile_discovered.has(id)
		var pos: Vector2 = GameData.discovery_position(id)
		# Seeded variation: regional discoveries move within their region each
		# expedition, so the landmarks stay familiar but the hunt is new.
		if rid != "" and not bool(d.get("fixed", false)) and not bool(d.get("moving", false)) and rid != gate_region:
			var region3: Dictionary = GameData.REGIONS[rid]
			if String(region3["shape"]) == "circle":
				pos = world.random_open_point_near(region3["center"], 120.0, float(region3["radius"]) * 0.7, rng)
		var poi: Dictionary = add({"id": id, "kind": String(d["kind"]), "pos": world.resolve(pos, 10.0),
			"title": String(d["title"]), "hidden": String(d.get("hidden", "")), "color": col, "data": d,
			"radius": 70.0 if String(d["kind"]) in ["signal", "character"] else 56.0,
			"repeat": known_before, "known": rid == gate_region and String(d["kind"]) == "signal", "lock": String(d.get("lock", ""))})
		if bool(d.get("moving", false)):
			var region: Dictionary = GameData.REGIONS[rid]
			poi["path_a"] = poi.pos
			poi["path_b"] = Vector2(region["b"]) - (Vector2(region["b"]) - Vector2(region["a"])).normalized() * 220.0
		if String(d.get("effect", "")) == "mirrorfold":
			add({"id": id + "_pair", "kind": "mirror_pair", "pos": world.resolve(Vector2(d["pair"]), 10.0), "title": "MIRRORFOLD", "color": col, "radius": 48.0, "data": d})
			poi["kind"] = "mirror"
			poi["radius"] = 48.0
	# Seeded variation: caches, resonators and rifts move between expeditions.
	var region_list: Array = world.region_ids
	for i in 24:
		var rid2: String = String(region_list[rng.randi() % region_list.size()])
		var region2: Dictionary = GameData.REGIONS[rid2]
		var p: Vector2 = world.random_open_point_near(GameData.region_anchor(region2), 120.0, float(region2.get("radius", 400.0)) * 0.9, rng)
		add({"kind": "cache", "pos": p, "title": "SUPPLY CACHE", "color": Color("7dffb2"), "radius": 40.0})
	for i in 3:
		var p2: Vector2 = world.random_open_point_near(world.gate, 1600.0, maxf(world.half_size.x, world.half_size.y) * 0.85, rng)
		add({"kind": "fracture_cache", "pos": p2, "title": "FRACTURE CACHE", "hidden": "FRACTURE", "color": Color("ff4f7b"), "radius": 44.0})
	# Resonators gather in calm water; rifts in phase blooms and asteroid belts.
	for rid4: String in region_list:
		var r4: Dictionary = GameData.REGIONS[rid4]
		var anchor4: Vector2 = GameData.region_anchor(r4)
		var spread: float = float(r4.get("radius", 600.0)) * 0.6
		match String(r4["props"]):
			"pools":
				for i in 2:
					add({"kind": "resonator", "pos": world.random_open_point_near(anchor4, 150.0, spread, rng), "title": "RESONATOR", "color": Color("71cda0"), "radius": 70.0, "known": true})
			"bloom", "belt":
				for i in 3:
					add({"kind": "rift", "pos": world.random_open_point_near(anchor4, 120.0, spread, rng), "title": "PHASE RIFT", "color": Color("ff4f7b"), "radius": 46.0, "known": true})
	var reach: float = minf(world.half_size.x, world.half_size.y)
	add({"kind": "resonator", "pos": world.random_open_point_near(world.gate, reach * 0.45, reach * 1.05, rng), "title": "RESONATOR", "color": Color("71cda0"), "radius": 70.0})
	add({"kind": "rift", "pos": world.random_open_point_near(world.gate, reach * 0.4, reach * 1.1, rng), "title": "PHASE RIFT", "color": Color("ff4f7b"), "radius": 46.0})

func is_visible_poi(p: Dictionary) -> bool:
	if bool(p.claimed) and not String(p.kind) in ["mirror", "mirror_pair", "resonator"]:
		return false
	match String(p.hidden):
		"FRACTURE":
			return run.force_state == "FRACTURE" or bool(p.get("revealed", false))
		"RESONANCE":
			return run.force_state == "RESONANCE" or bool(p.get("revealed", false))
		"SCAN":
			return bool(p.get("revealed", false))
	return true

func reveal_within(center: Vector2, radius: float, include_hidden: bool) -> int:
	var n: int = 0
	for p: Dictionary in items:
		if Vector2(p.pos).distance_to(center) <= radius:
			if not bool(p.known):
				n += 1
			p.known = true
			if include_hidden and String(p.hidden) != "":
				p.revealed = true
	return n

func step(delta: float, player: ForcePlayer, scanner_range: float) -> void:
	anim += delta
	for p0: Dictionary in items:
		if String(p0.kind) == "echo" and not bool(p0.claimed):
			p0.life = float(p0.life) - delta
			if float(p0.life) <= 0.0:
				p0.claimed = true
				p0.expired = true
	for p: Dictionary in items:
		if bool(p.claimed) and not String(p.kind) in ["mirror", "mirror_pair", "resonator"]:
			continue
		var d: float = player.position.distance_to(p.pos)
		# Signal beams can be heard from far further than the scanner reaches.
		var listen: float = scanner_range * (2.2 if String(p.kind) in ["signal", "character"] else 1.0)
		if d < listen and is_visible_poi(p):
			if not bool(p.known):
				p.known = true
				run.on_poi_spotted(p)
		if String(p.hidden) == "SCAN" and d < scanner_range * 0.45:
			p.revealed = true
		if not is_visible_poi(p):
			p.progress = 0.0
			continue
		if p.has("path_a") and not bool(p.claimed):
			_move_signal(p, player, delta)
			d = player.position.distance_to(p.pos)
		var inside: bool = d < float(p.radius)
		var tune: float = float(TUNE_TIME.get(String(p.kind), 0.0))
		if String(p.kind) == "resonator" and bool(p.claimed):
			continue
		if String(p.kind) == "camp":
			continue
		if inside:
			if tune > 0.0 and not bool(p.get("tuning_started", false)) and String(p.kind) in ["signal", "character"]:
				p.tuning_started = true
				run.on_tuning_started(p)
			if tune > 0.0:
				var why: String = _lock_blocker(p, player)
				p.blocked = why
				if why == "":
					p.progress = minf(tune, float(p.progress) + delta)
				if float(p.progress) >= tune:
					_claim(p)
			else:
				_claim(p)
		else:
			p.progress = maxf(0.0, float(p.progress) - delta * 0.7)
	queue_redraw()

## Returns "" when the signal may tune, otherwise a short reason for the HUD.
func _lock_blocker(p: Dictionary, player: ForcePlayer) -> String:
	match String(p.get("lock", "")):
		"resonance":
			if run.force_state != "RESONANCE":
				return "NEEDS RESONANCE"
		"stillness":
			if player.velocity.length() > 30.0:
				return "HOLD STILL"
		"guardian":
			# Spawn exactly once; a freed guardian compares equal to null in
			# Godot 4, so presence of the key — not the value — is the test.
			if not p.has("guardian"):
				p.guardian = run.spawn_guardian(p)
				return "DEFEAT THE GUARDIAN"
			var g: Variant = p.guardian
			if is_instance_valid(g) and not (g as ForceEnemy).dead:
				return "DEFEAT THE GUARDIAN"
		"ensemble":
			if not p.has("relays"):
				p.relays = []
				for k in 3:
					var rp: Vector2 = run.world.resolve(Vector2(p.pos) + Vector2.from_angle(TAU * k / 3.0 + 0.5) * 300.0, 20.0)
					p.relays.append(add({"kind": "relay", "pos": rp, "title": "RELAY", "color": p.color, "radius": 42.0, "known": true}))
			for r: Dictionary in p.relays:
				if not bool(r.claimed):
					return "ACTIVATE THE RELAYS"
	return ""

func _move_signal(p: Dictionary, player: ForcePlayer, delta: float) -> void:
	# The Night Trace stays just ahead of you until it reaches the corridor's end.
	var a: Vector2 = p.path_a
	var b: Vector2 = p.path_b
	var pos: Vector2 = p.pos
	var d: float = player.position.distance_to(pos)
	if d < 520.0 and pos.distance_to(b) > 8.0:
		var spd: float = 210.0 if d < 260.0 else 120.0
		pos = pos.move_toward(b, spd * delta)
		p.pos = pos
	if a == Vector2.INF:
		pass

func _claim(p: Dictionary) -> void:
	match String(p.kind):
		"mirror", "mirror_pair":
			if float(p.get("cooldown", 0.0)) > run.elapsed:
				return
			var other_id: String = String(p.id).trim_suffix("_pair") if String(p.kind) == "mirror_pair" else String(p.id) + "_pair"
			for q: Dictionary in items:
				if String(q.id) == other_id:
					q.cooldown = run.elapsed + 2.0
					p.cooldown = run.elapsed + 2.0
					run.on_mirrorfold(p, q)
					break
			if not bool(p.claimed):
				p.claimed = true
		"resonator":
			p.claimed = true
			run.on_poi_claimed(p)
		_:
			p.claimed = true
			run.on_poi_claimed(p)

func nearest_unclaimed(from: Vector2, kinds: Array, known_only: bool) -> Dictionary:
	var best: Dictionary = {}
	var best_d: float = INF
	for p: Dictionary in items:
		if bool(p.claimed) or not String(p.kind) in kinds:
			continue
		if known_only and not bool(p.known):
			continue
		if not is_visible_poi(p):
			continue
		var d: float = from.distance_squared_to(p.pos)
		if d < best_d:
			best_d = d
			best = p
	return best

func signals_remaining() -> int:
	var n: int = 0
	for p: Dictionary in items:
		if String(p.kind) == "signal" and not bool(p.claimed):
			n += 1
	return n

# ------------------------------------------------------------------ drawing

func _draw() -> void:
	for b: Dictionary in run.world.beacons:
		var bp: Vector2 = b.pos
		draw_circle(bp, float(b.r), Color(0.3, 1.0, 0.55, 0.05))
		draw_arc(bp, float(b.r), anim * 0.5, anim * 0.5 + TAU, 40, Color(0.3, 1.0, 0.55, 0.25), 2.0)
		draw_rect(Rect2(bp - Vector2(5, 14), Vector2(10, 28)), Color("1b3a2a"))
		draw_circle(bp + Vector2(0, -16), 5.0 + sin(anim * 3.0 + bp.x) * 1.5, Color(0.4, 1.0, 0.6, 0.9))
	for p: Dictionary in items:
		var vis: bool = is_visible_poi(p)
		var pos: Vector2 = p.pos
		var c: Color = p.color
		if not vis:
			# A faint glitch hints that something is hiding here.
			if String(p.hidden) in ["FRACTURE", "RESONANCE"] and not bool(p.claimed) and int(anim * 7.0 + pos.x) % 9 == 0:
				draw_rect(Rect2(pos + Vector2(randf_range(-20, 20), randf_range(-20, 20)), Vector2(18, 3)), Color(c, 0.35))
			continue
		var r: float = float(p.radius)
		match String(p.kind):
			"signal", "character", "echo":
				# A tall broadcast beam visible from far away.
				for k in 6:
					var h: float = 140.0 + k * 50.0
					draw_line(pos, pos + Vector2(0, -h), Color(c, 0.06), 26.0 - k * 3.0)
				draw_line(pos, pos + Vector2(0, -320), Color(c, 0.25), 3.0)
				for k in 3:
					var ph: float = fmod(anim * 0.6 + k / 3.0, 1.0)
					draw_arc(pos, r * (0.4 + ph * 1.2), 0.0, TAU, 40, Color(c, 0.5 * (1.0 - ph)), 2.0)
				draw_arc(pos, r, 0.0, TAU, 48, Color(c, 0.55), 2.0)
				if String(p.kind) == "character":
					draw_colored_polygon(PackedVector2Array([pos + Vector2(0, -16), pos + Vector2(12, 8), pos + Vector2(-12, 8)]), c)
				else:
					# Waveform glyph: signals are musical.
					var wave: PackedVector2Array = PackedVector2Array()
					for k in 13:
						wave.append(pos + Vector2(-18 + k * 3.0, sin(anim * 6.0 + k * 0.9) * 7.0))
					draw_polyline(wave, c, 3.0)
				_draw_progress(p, pos, r, c)
			"artifact", "fragment":
				draw_circle(pos, r * 0.5, Color(c, 0.10))
				var rot: float = anim * 0.8
				var pts: PackedVector2Array = PackedVector2Array()
				for k in 6:
					pts.append(pos + Vector2.from_angle(rot + TAU * k / 6.0) * (12.0 if k % 2 == 0 else 7.0))
				draw_colored_polygon(pts, c)
				draw_arc(pos, r * 0.75, -rot, -rot + PI, 20, Color(c, 0.5), 2.0)
				_draw_progress(p, pos, r * 0.75, c)
			"anomaly":
				for k in 4:
					var rr: float = r * (0.3 + 0.2 * k) + sin(anim * 2.0 + k) * 4.0
					draw_arc(pos, rr, anim * (k + 1) * 0.4, anim * (k + 1) * 0.4 + PI * 1.4, 24, Color(c, 0.6 - k * 0.12), 2.0)
			"mirror", "mirror_pair":
				draw_circle(pos, r, Color(c, 0.08))
				for k in 2:
					var sx: float = 1.0 if k == 0 else -1.0
					draw_arc(pos + Vector2(sx * 8.0, 0), r * 0.7, 0.0, TAU, 32, Color(c, 0.6), 2.0)
				draw_line(pos + Vector2(0, -r), pos + Vector2(0, r), Color(1, 1, 1, 0.45), 2.0)
			"cache", "fracture_cache":
				var s: float = 14.0
				draw_rect(Rect2(pos - Vector2(s, s * 0.7), Vector2(s * 2.0, s * 1.4)), Color("0e1a1a"))
				draw_rect(Rect2(pos - Vector2(s, s * 0.7), Vector2(s * 2.0, s * 1.4)), c, false, 2.0)
				draw_line(pos + Vector2(-s, 0), pos + Vector2(s, 0), c, 2.0)
				draw_circle(pos + Vector2(0, -s * 1.3), 3.0 + sin(anim * 4.0) * 1.0, c)
			"resonator":
				var done: bool = bool(p.claimed)
				var rc: Color = Color(c, 0.3 if done else 0.9)
				draw_colored_polygon(PackedVector2Array([pos + Vector2(-9, 18), pos + Vector2(9, 18), pos + Vector2(4, -26), pos + Vector2(-4, -26)]), Color("13241d"))
				draw_circle(pos + Vector2(0, -28), 6.0, rc)
				if not done:
					for k in 2:
						var ph2: float = fmod(anim * 0.5 + k * 0.5, 1.0)
						draw_arc(pos, r * ph2, 0.0, TAU, 32, Color(c, 0.4 * (1.0 - ph2)), 2.0)
					draw_arc(pos, r, 0.0, TAU, 40, Color(c, 0.3), 1.5)
					_draw_progress(p, pos, r, c)
			"camp":
				# Shard salvage pile with red markings; pale-grey plating.
				draw_circle(pos, r, Color(c, 0.05))
				draw_arc(pos, r, 0.0, TAU, 32, Color(c, 0.25), 2.0)
				for k in 4:
					var a: float = TAU * k / 4.0 + 0.4
					draw_rect(Rect2(pos + Vector2.from_angle(a) * 22.0 - Vector2(10, 7), Vector2(20, 14)), Color("8e939c"))
				draw_line(pos + Vector2(0, -6), pos + Vector2(0, -44), Color("cfd3da"), 3.0)
				draw_colored_polygon(PackedVector2Array([pos + Vector2(0, -44), pos + Vector2(22, -38), pos + Vector2(0, -31)]), c)
			"relay":
				draw_circle(pos, 10.0, Color(c, 0.9))
				draw_arc(pos, r, anim, anim + TAU * 0.75, 24, Color(c, 0.6), 3.0)
				draw_line(pos, pos + Vector2(0, -40), Color(c, 0.5), 2.0)
			"rift":
				var pts2: PackedVector2Array = PackedVector2Array()
				for k in 10:
					var rr2: float = r * (0.45 if k % 2 == 0 else 0.9) * (1.0 + sin(anim * 5.0 + k) * 0.1)
					pts2.append(pos + Vector2.from_angle(TAU * k / 10.0 + anim * 0.3) * rr2)
				draw_colored_polygon(pts2, Color(c, 0.35))
				draw_circle(pos, r * 0.25, Color(0.05, 0.0, 0.05, 0.9))
		if bool(p.known) and String(p.kind) in ["signal", "character", "artifact", "anomaly", "mirror", "echo"] and String(p.title) != "":
			var label: String = String(p.title)
			var w: float = font.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, 15).x
			draw_string_outline(font, pos + Vector2(-w / 2.0, r + 24.0), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 15, 4, Color(0, 0, 0, 0.7))
			draw_string(font, pos + Vector2(-w / 2.0, r + 24.0), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color(c, 0.9))

func _draw_progress(p: Dictionary, pos: Vector2, r: float, c: Color) -> void:
	var tune: float = float(TUNE_TIME.get(String(p.kind), 0.0))
	var blocked: String = String(p.get("blocked", ""))
	if blocked != "" and run.player.position.distance_to(pos) < r:
		var w: float = font.get_string_size(blocked, HORIZONTAL_ALIGNMENT_LEFT, -1, 16).x
		draw_string_outline(font, pos + Vector2(-w / 2.0, -r - 16.0), blocked, HORIZONTAL_ALIGNMENT_LEFT, -1, 16, 4, Color(0, 0, 0, 0.8))
		draw_string(font, pos + Vector2(-w / 2.0, -r - 16.0), blocked, HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color("ffe08a"))
	if tune <= 0.0 or float(p.progress) <= 0.0:
		return
	var t: float = float(p.progress) / tune
	draw_arc(pos, r + 8.0, -PI / 2.0, -PI / 2.0 + TAU * t, 48, Color(c, 0.95), 6.0)
