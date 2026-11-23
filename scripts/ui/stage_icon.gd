class_name StageIcon
## The chart beacon's icon: who or what is waiting at a stage, in the realm's
## own language. Crew and explorers show their portrait; places show a small
## version of their landmark; music shows a note; holds a shield; bosses the
## Silence in that realm's colours.

const LANDMARK_GLYPH: Dictionary = {
	"longship": "ship", "freighter": "ship", "dti": "kiosk", "dti_building": "building", "bullpen": "building",
	"dark_fortress": "castle", "controller": "screen", "relay_tower": "tower", "flood_gate": "arch", "elven_gate": "arch",
	"rocket": "rocket", "launch_shop": "rocket", "sunforge": "sun", "station": "station", "bazaar": "market",
	"dock": "market", "supply_cart": "cart", "rooftop": "dish", "armored_truck": "truck", "fod_banner": "banner",
	"war_tent": "tent", "turtle_banner": "turtle", "azure_fountain": "fountain", "ring_lights": "ringlight",
	"dragon_hoard": "hoard", "ominous_hole": "hole", "wizard_desk": "hat", "break_room": "microwave",
}
const BIOME_GLYPH: Dictionary = {"sea": "wave", "desert": "sun", "orbit": "station", "park": "turtle", "fantasy": "banner", "cosmic": "marker", "city": "building", "space": "planet"}
const BIOME_TINT: Dictionary = {"sea": Color("78d7ff"), "desert": Color("ffb35a"), "orbit": Color("ffce5c"), "park": Color("4fd8ff"), "fantasy": Color("e8c050"), "cosmic": Color("d7b8ff"), "city": Color("4fb8ff"), "space": Color("bfe9ff")}

static var _tex_cache: Dictionary = {}

static func _portrait(key: String) -> Texture2D:
	if _tex_cache.has(key):
		return _tex_cache[key]
	var path: String = "res://assets/characters/%s_96.png" % key
	var tex: Texture2D = load(path) if ResourceLoader.exists(path) else null
	_tex_cache[key] = tex
	return tex

## The portraits a stage shows: its explorer unlock, then its crew.
static func faces(st: Dictionary) -> Array:
	var out: Array = []
	for did: Variant in st.get("discoveries", []):
		var d: Dictionary = GameData.DISCOVERIES.get(String(did), {})
		var uc: String = String(d.get("unlock_character", ""))
		if uc != "" and GameData.CHARACTERS.has(uc):
			out.append(String(GameData.CHARACTERS[uc]["portrait"]))
		for c: Variant in d.get("contacts", []):
			if GameData.CONTACTS.has(String(c)):
				out.append(String(GameData.CONTACTS[String(c)]["portrait"]))
	return out

static func biome_of(st: Dictionary) -> String:
	var dest: String = String(GameData.chapter_def(int(st.get("chapter", 1))).get("destination", ""))
	return String(GameData.DESTINATIONS.get(dest, {}).get("biome", "space"))

static func draw(ci: CanvasItem, st: Dictionary, c: Vector2, r: float, t: float) -> void:
	var o: Dictionary = st.get("objective", {})
	var biome: String = biome_of(st)
	var tint: Color = BIOME_TINT.get(biome, Color.WHITE)
	match String(o.get("type", "")):
		"boss":
			_silence(ci, c, r, t, tint)
			return
		"elite":
			CategoryIcon.draw(ci, "elite", c, r, t)
			return
		"survive":
			_shield(ci, c, r, tint)
			return
	var f: Array = faces(st)
	if not f.is_empty():
		_face_circle(ci, f[0], c, r * (1.05 if f.size() == 1 else 0.95))
		if f.size() > 1:
			_face_circle(ci, f[1], c + Vector2(r * 0.62, r * 0.55), r * 0.48)
		return
	var d: Dictionary = GameData.DISCOVERIES.get(String(o.get("id", "")), {})
	if String(d.get("kind", "")) == "signal":
		_note(ci, c, r, tint)
		return
	var glyph: String = LANDMARK_GLYPH.get(String(d.get("landmark", "")), BIOME_GLYPH.get(biome, "planet"))
	_glyph(ci, glyph, c, r, t, tint)

static func _face_circle(ci: CanvasItem, key: String, c: Vector2, r: float) -> void:
	var tex: Texture2D = _portrait(key)
	if tex == null:
		ci.draw_circle(c, r, Color("2a3142"))
		return
	var pts: PackedVector2Array = PackedVector2Array()
	var uvs: PackedVector2Array = PackedVector2Array()
	for k in 28:
		var a: float = TAU * k / 28.0
		pts.append(c + Vector2.from_angle(a) * r)
		uvs.append(Vector2(0.5, 0.5) + Vector2.from_angle(a) * 0.5)
	ci.draw_colored_polygon(pts, Color.WHITE, uvs, tex)
	ci.draw_arc(c, r, 0.0, TAU, 28, Color(1, 1, 1, 0.85), 2.0)

static func _note(ci: CanvasItem, c: Vector2, r: float, col: Color) -> void:
	ci.draw_circle(c + Vector2(-r * 0.22, r * 0.38), r * 0.24, col)
	ci.draw_line(c + Vector2(-r * 0.0, r * 0.38), c + Vector2(0, -r * 0.55), col, 3.0)
	ci.draw_colored_polygon(PackedVector2Array([c + Vector2(0, -r * 0.55), c + Vector2(r * 0.42, -r * 0.35), c + Vector2(r * 0.42, -r * 0.12), c + Vector2(0, -r * 0.32)]), col)

static func _shield(ci: CanvasItem, c: Vector2, r: float, col: Color) -> void:
	var pts: PackedVector2Array = PackedVector2Array([c + Vector2(0, -r * 0.7), c + Vector2(r * 0.6, -r * 0.45), c + Vector2(r * 0.5, r * 0.2), c + Vector2(0, r * 0.7), c + Vector2(-r * 0.5, r * 0.2), c + Vector2(-r * 0.6, -r * 0.45)])
	ci.draw_colored_polygon(pts, Color(col, 0.3))
	ci.draw_polyline(pts + PackedVector2Array([pts[0]]), col, 3.0)
	ci.draw_line(c + Vector2(0, -r * 0.45), c + Vector2(0, r * 0.45), col, 2.0)

static func _silence(ci: CanvasItem, c: Vector2, r: float, t: float, tint: Color) -> void:
	ci.draw_circle(c, r * 0.72, Color("ff376f"))
	ci.draw_circle(c, r * 0.45, Color("0c0a16"))
	ci.draw_circle(c + Vector2(sin(t) * r * 0.1, 0), r * 0.14, Color.WHITE)
	for k in 5:
		var a: float = -PI * 0.5 + (k - 2) * 0.3
		ci.draw_line(c + Vector2.from_angle(a) * r * 0.75, c + Vector2.from_angle(a) * r * 1.0, tint, 3.0)

static func _glyph(ci: CanvasItem, g: String, c: Vector2, r: float, t: float, col: Color) -> void:
	var dim: Color = Color(col, 0.35)
	match g:
		"ship":
			ci.draw_colored_polygon(PackedVector2Array([c + Vector2(-r * 0.75, r * 0.1), c + Vector2(r * 0.75, r * 0.1), c + Vector2(r * 0.5, r * 0.45), c + Vector2(-r * 0.5, r * 0.45)]), col)
			ci.draw_line(c + Vector2(0, r * 0.1), c + Vector2(0, -r * 0.7), col, 2.5)
			ci.draw_colored_polygon(PackedVector2Array([c + Vector2(r * 0.05, -r * 0.62), c + Vector2(r * 0.5, -r * 0.1), c + Vector2(r * 0.05, -r * 0.05)]), dim)
		"kiosk":
			ci.draw_rect(Rect2(c + Vector2(-r * 0.4, -r * 0.6), Vector2(r * 0.8, r * 1.2)), dim)
			ci.draw_rect(Rect2(c + Vector2(-r * 0.4, -r * 0.6), Vector2(r * 0.8, r * 1.2)), col, false, 2.0)
			ci.draw_rect(Rect2(c + Vector2(-r * 0.3, -r * 0.45), Vector2(r * 0.6, r * 0.3)), col)
		"building":
			ci.draw_rect(Rect2(c + Vector2(-r * 0.5, -r * 0.6), Vector2(r, r * 1.2)), dim)
			for yy in 3:
				for xx in 2:
					ci.draw_rect(Rect2(c + Vector2(-r * 0.32 + xx * r * 0.4, -r * 0.45 + yy * r * 0.36), Vector2(r * 0.22, r * 0.2)), col)
		"castle":
			ci.draw_rect(Rect2(c + Vector2(-r * 0.55, -r * 0.2), Vector2(r * 1.1, r * 0.75)), dim)
			for k in 3:
				ci.draw_colored_polygon(PackedVector2Array([c + Vector2(-r * 0.55 + k * r * 0.4, -r * 0.2), c + Vector2(-r * 0.4 + k * r * 0.4, -r * 0.75), c + Vector2(-r * 0.25 + k * r * 0.4, -r * 0.2)]), col)
		"screen":
			ci.draw_rect(Rect2(c + Vector2(-r * 0.6, -r * 0.45), Vector2(r * 1.2, r * 0.8)), dim)
			ci.draw_polyline(PackedVector2Array([c + Vector2(-r * 0.45, r * 0.1), c + Vector2(-r * 0.1, -r * 0.15), c + Vector2(r * 0.15, 0), c + Vector2(r * 0.45, -r * 0.3)]), col, 2.5)
		"tower":
			ci.draw_line(c + Vector2(-r * 0.35, r * 0.65), c + Vector2(0, -r * 0.7), col, 2.5)
			ci.draw_line(c + Vector2(r * 0.35, r * 0.65), c + Vector2(0, -r * 0.7), col, 2.5)
			ci.draw_line(c + Vector2(-r * 0.2, r * 0.1), c + Vector2(r * 0.2, r * 0.1), col, 2.0)
			ci.draw_circle(c + Vector2(0, -r * 0.72), r * 0.1, Color(col, 0.6 + 0.4 * sin(t * 4.0)))
		"arch":
			ci.draw_arc(c + Vector2(0, r * 0.1), r * 0.5, PI, TAU, 16, col, 5.0)
			ci.draw_line(c + Vector2(-r * 0.5, r * 0.1), c + Vector2(-r * 0.5, r * 0.6), col, 5.0)
			ci.draw_line(c + Vector2(r * 0.5, r * 0.1), c + Vector2(r * 0.5, r * 0.6), col, 5.0)
		"rocket":
			ci.draw_rect(Rect2(c + Vector2(-r * 0.15, -r * 0.35), Vector2(r * 0.3, r * 0.75)), col)
			ci.draw_colored_polygon(PackedVector2Array([c + Vector2(-r * 0.15, -r * 0.35), c + Vector2(r * 0.15, -r * 0.35), c + Vector2(0, -r * 0.75)]), col)
			ci.draw_colored_polygon(PackedVector2Array([c + Vector2(-r * 0.08, r * 0.4), c + Vector2(r * 0.08, r * 0.4), c + Vector2(0, r * (0.7 + 0.1 * sin(t * 10.0)))]), Color("ffb347"))
		"sun":
			for k in 8:
				var a: float = TAU * k / 8.0 + t * 0.3
				ci.draw_line(c + Vector2.from_angle(a) * r * 0.45, c + Vector2.from_angle(a) * r * 0.75, col, 2.5)
			ci.draw_circle(c, r * 0.38, col)
		"station":
			ci.draw_arc(c, r * 0.6, 0.0, TAU, 24, col, 4.0)
			for k in 4:
				ci.draw_line(c, c + Vector2.from_angle(TAU * k / 4.0 + t * 0.2) * r * 0.6, dim, 2.0)
			ci.draw_circle(c, r * 0.18, col)
		"market":
			ci.draw_arc(c, r * 0.55, 0.0, TAU, 24, dim, 6.0)
			for k in 6:
				ci.draw_rect(Rect2(c + Vector2.from_angle(TAU * k / 6.0) * r * 0.55 - Vector2(r * 0.1, r * 0.1), Vector2(r * 0.2, r * 0.2)), col)
		"cart":
			ci.draw_rect(Rect2(c + Vector2(-r * 0.55, -r * 0.15), Vector2(r * 1.1, r * 0.45)), col)
			ci.draw_circle(c + Vector2(-r * 0.35, r * 0.4), r * 0.16, dim)
			ci.draw_circle(c + Vector2(r * 0.35, r * 0.4), r * 0.16, dim)
		"dish":
			ci.draw_arc(c + Vector2(0, -r * 0.05), r * 0.55, PI * 0.85, PI * 1.9, 14, col, 4.0)
			ci.draw_line(c + Vector2(0, -r * 0.05), c + Vector2(0, r * 0.6), col, 2.5)
		"truck":
			ci.draw_rect(Rect2(c + Vector2(-r * 0.65, -r * 0.2), Vector2(r * 0.9, r * 0.5)), col)
			ci.draw_rect(Rect2(c + Vector2(r * 0.25, -r * 0.4), Vector2(r * 0.4, r * 0.7)), col)
			ci.draw_circle(c + Vector2(-r * 0.4, r * 0.38), r * 0.17, Color("141210"))
			ci.draw_circle(c + Vector2(r * 0.4, r * 0.38), r * 0.17, Color("141210"))
		"banner":
			ci.draw_line(c + Vector2(-r * 0.45, -r * 0.7), c + Vector2(-r * 0.45, r * 0.7), col, 2.5)
			ci.draw_colored_polygon(PackedVector2Array([c + Vector2(-r * 0.4, -r * 0.65), c + Vector2(r * 0.5, -r * 0.65), c + Vector2(r * 0.5, r * 0.25), c + Vector2(r * 0.05, r * 0.45), c + Vector2(-r * 0.4, r * 0.25)]), Color("7a1428"))
			ci.draw_circle(c + Vector2(r * 0.05, -r * 0.2), r * 0.18, col)
			ci.draw_circle(c + Vector2(r * 0.05, -r * 0.2), r * 0.07, Color("1a1a1e"))
		"tent":
			ci.draw_colored_polygon(PackedVector2Array([c + Vector2(-r * 0.65, r * 0.5), c + Vector2(0, -r * 0.6), c + Vector2(r * 0.65, r * 0.5)]), Color("7a1428"))
			ci.draw_line(c + Vector2(0, -r * 0.6), c + Vector2(0, r * 0.5), col, 2.0)
		"turtle":
			ci.draw_circle(c, r * 0.45, col)
			ci.draw_circle(c + Vector2(r * 0.55, -r * 0.05), r * 0.17, col)
			for k in 4:
				ci.draw_circle(c + Vector2(-r * 0.4 + (k % 2) * r * 0.8, -r * 0.35 + int(k / 2) * r * 0.7), r * 0.13, col)
			ci.draw_arc(c, r * 0.28, 0.0, TAU, 12, Color("0b1322", 0.6), 2.0)
		"fountain", "wave":
			for k in 3:
				ci.draw_arc(c + Vector2(0, r * (0.25 - k * 0.25)), r * (0.55 - k * 0.12), PI * 1.1, PI * 1.9, 12, Color(col, 1.0 - k * 0.25), 3.0)
		"ringlight":
			ci.draw_arc(c, r * 0.5, 0.0, TAU, 24, Color(1, 1, 0.9, 0.7 + 0.3 * sin(t * 4.0)), 5.0)
			ci.draw_line(c + Vector2(0, r * 0.5), c + Vector2(0, r * 0.8), col, 2.0)
		"hoard":
			ci.draw_circle(c + Vector2(0, r * 0.2), r * 0.55, Color("c89a30"))
			ci.draw_circle(c + Vector2(-r * 0.15, r * 0.05), r * 0.3, Color("ffd760"))
			ci.draw_colored_polygon(PackedVector2Array([c + Vector2(r * 0.1, -r * 0.45), c + Vector2(r * 0.6, -r * 0.55), c + Vector2(r * 0.55, -r * 0.3)]), Color("c8322a"))
		"hole":
			ci.draw_circle(c, r * 0.6, Color("5a5460"))
			ci.draw_circle(c, r * 0.45, Color("06040a"))
		"hat":
			ci.draw_colored_polygon(PackedVector2Array([c + Vector2(-r * 0.6, r * 0.4), c + Vector2(r * 0.6, r * 0.4), c + Vector2(0, -r * 0.75)]), col)
			ci.draw_circle(c + Vector2(r * 0.1, -r * 0.1), r * 0.08, Color.WHITE)
		"microwave":
			ci.draw_rect(Rect2(c + Vector2(-r * 0.6, -r * 0.35), Vector2(r * 1.2, r * 0.7)), dim)
			ci.draw_rect(Rect2(c + Vector2(-r * 0.5, -r * 0.25), Vector2(r * 0.7, r * 0.5)), Color(col, 0.4 + 0.3 * sin(t * 5.0)))
			ci.draw_circle(c + Vector2(r * 0.38, 0), r * 0.08, Color("ff6a4a"))
		"marker":
			ci.draw_colored_polygon(PackedVector2Array([c + Vector2(-r * 0.25, r * 0.6), c + Vector2(-r * 0.12, -r * 0.7), c + Vector2(r * 0.12, -r * 0.7), c + Vector2(r * 0.25, r * 0.6)]), Color("2a2438"))
			ci.draw_line(c + Vector2(0, -r * 0.55), c + Vector2(0, r * 0.45), Color(col, 0.6 + 0.4 * sin(t * 2.0)), 2.0)
		_:
			# A planet with a ring.
			ci.draw_circle(c, r * 0.42, col)
			ci.draw_arc(c, r * 0.68, PI * 0.1, PI * 0.9, 16, dim, 3.0)
			ci.draw_arc(c, r * 0.68, PI * 1.1, PI * 1.9, 16, dim, 3.0)
