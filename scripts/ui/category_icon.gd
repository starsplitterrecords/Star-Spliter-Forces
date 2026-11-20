class_name CategoryIcon
extends Control
## Draws the Field Guide icon for a category. The same static drawer is used
## by the HUD, the Field Guide and the map legend, so the language matches.

var category: String = "hostile"
var anim: float = 0.0

func _init(cat: String = "hostile", icon_size: float = 56.0) -> void:
	category = cat
	custom_minimum_size = Vector2(icon_size, icon_size)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _process(delta: float) -> void:
	anim += delta
	queue_redraw()

func _draw() -> void:
	draw(self, category, size * 0.5, minf(size.x, size.y) * 0.5, anim)

static func draw(ci: CanvasItem, cat: String, c: Vector2, r: float, t: float) -> void:
	var def: Dictionary = GameData.CATEGORIES.get(cat, {})
	var col: Color = def.get("color", Color.WHITE)
	match cat:
		"hostile", "elite":
			var body: Color = Color("9aa3ad") if cat == "hostile" else Color("e0a060")
			var s: float = r * (0.45 if cat == "hostile" else 0.55)
			ci.draw_circle(c, r * 0.9, Color(1.0, 0.15, 0.2, 0.18))
			var rot: Vector2 = Vector2.from_angle(-PI / 2.0 + sin(t * 2.0) * 0.2)
			ci.draw_colored_polygon(PackedVector2Array([c + rot * s * 1.3, c + rot.orthogonal() * s * 0.8 - rot * s * 0.6, c - rot * s * 0.3, c - rot.orthogonal() * s * 0.8 - rot * s * 0.6]), body)
			ci.draw_arc(c, r * 0.82, 0.0, TAU, 28, Color("ff4a4a"), 3.0 if cat == "hostile" else 5.0)
			if cat == "elite":
				ci.draw_arc(c, r * 0.95, 0.0, TAU, 28, Color("ffb03a"), 2.0)
		"xp":
			var cols: Array = [Color("6ff6ff"), Color("b38bff"), Color("ffd85f")]
			for k in 3:
				var p: Vector2 = c + Vector2((k - 1) * r * 0.62, sin(t * 3.0 + k) * r * 0.08)
				var s2: float = r * (0.2 + k * 0.06)
				var pts: PackedVector2Array = PackedVector2Array()
				for j in 4:
					pts.append(p + Vector2.from_angle(t * 2.0 + TAU * j / 4.0) * s2)
				ci.draw_colored_polygon(pts, cols[k])
		"supply":
			var g: Color = Color("7dffb2")
			var p1: Vector2 = c + Vector2(-r * 0.42, 0)
			ci.draw_rect(Rect2(p1 - Vector2(r * 0.32, r * 0.1), Vector2(r * 0.64, r * 0.2)), g)
			ci.draw_rect(Rect2(p1 - Vector2(r * 0.1, r * 0.32), Vector2(r * 0.2, r * 0.64)), g)
			var p2: Vector2 = c + Vector2(r * 0.45, r * 0.05)
			ci.draw_arc(p2, r * 0.3, PI, TAU, 12, Color("9fe8ff"), 4.0)
			ci.draw_line(p2 + Vector2(-r * 0.3, 0), p2 + Vector2(-r * 0.3, r * 0.25), Color("9fe8ff"), 4.0)
			ci.draw_line(p2 + Vector2(r * 0.3, 0), p2 + Vector2(r * 0.3, r * 0.25), Color("9fe8ff"), 4.0)
		"cache":
			ci.draw_rect(Rect2(c - Vector2(r * 0.55, r * 0.4), Vector2(r * 1.1, r * 0.8)), Color(col, 0.25))
			ci.draw_rect(Rect2(c - Vector2(r * 0.55, r * 0.4), Vector2(r * 1.1, r * 0.8)), col, false, 3.0)
			ci.draw_line(c - Vector2(r * 0.55, 0), c + Vector2(r * 0.55, 0), col, 2.0)
		"signal":
			ci.draw_rect(Rect2(c - Vector2(r * 0.12, r * 0.95), Vector2(r * 0.24, r * 1.25)), Color(col, 0.55))
			ci.draw_arc(c + Vector2(0, r * 0.35), r * 0.62, 0.0, TAU, 28, col, 3.0)
			ci.draw_arc(c + Vector2(0, r * 0.35), r * (0.3 + fmod(t, 1.0) * 0.5), 0.0, TAU, 20, Color(col, 1.0 - fmod(t, 1.0)), 2.0)
		"explorer":
			var pts3: PackedVector2Array = PackedVector2Array()
			for k in 10:
				pts3.append(c + Vector2.from_angle(-PI / 2.0 + TAU * k / 10.0) * r * (0.8 if k % 2 == 0 else 0.36))
			ci.draw_colored_polygon(pts3, col)
		"visions":
			# Four-point star from the Star Splitter Visions mark.
			var st: PackedVector2Array = PackedVector2Array()
			for k in 8:
				st.append(c + Vector2.from_angle(-PI / 2.0 + TAU * k / 8.0) * r * (0.85 if k % 2 == 0 else 0.22))
			ci.draw_colored_polygon(st, col)
			ci.draw_arc(c, r * 0.55, t, t + PI * 1.2, 16, Color(col, 0.6), 2.0)
		"artifact":
			var pts4: PackedVector2Array = PackedVector2Array()
			for k in 6:
				pts4.append(c + Vector2.from_angle(t * 0.8 + TAU * k / 6.0) * r * 0.7)
			ci.draw_colored_polygon(pts4, Color(col, 0.35))
			pts4.append(pts4[0])
			ci.draw_polyline(pts4, col, 3.0)
			ci.draw_circle(c, r * 0.18, Color.WHITE)
		"fragment":
			ci.draw_rect(Rect2(c - Vector2(r * 0.42, r * 0.6), Vector2(r * 0.84, r * 1.2)), Color(col, 0.2))
			ci.draw_rect(Rect2(c - Vector2(r * 0.42, r * 0.6), Vector2(r * 0.84, r * 1.2)), col, false, 2.5)
			for k in 3:
				ci.draw_line(c + Vector2(-r * 0.25, -r * 0.3 + k * r * 0.28), c + Vector2(r * 0.25, -r * 0.3 + k * r * 0.28), col, 2.0)
		"anomaly":
			for k in 3:
				ci.draw_arc(c, r * (0.25 + k * 0.22), t * (1.5 + k) , t * (1.5 + k) + PI * 1.3, 16, Color(col, 1.0 - k * 0.25), 3.0)
		"echo":
			ci.draw_circle(c, r * 0.22, col)
			for k in 2:
				var ph: float = fmod(t * 0.8 + k * 0.5, 1.0)
				ci.draw_arc(c, r * (0.3 + ph * 0.6), 0.0, TAU, 24, Color(col, 1.0 - ph), 2.5)
		"resonator":
			ci.draw_rect(Rect2(c - Vector2(r * 0.16, r * 0.7), Vector2(r * 0.32, r * 1.4)), col)
			ci.draw_arc(c, r * 0.75, 0.0, TAU, 24, Color(col, 0.6 + sin(t * 4.0) * 0.3), 2.5)
		"rift":
			var pts5: PackedVector2Array = PackedVector2Array()
			for k in 10:
				pts5.append(c + Vector2.from_angle(TAU * k / 10.0 + t * 0.3) * r * (0.4 if k % 2 == 0 else 0.85))
			ci.draw_colored_polygon(pts5, Color(col, 0.5))
			ci.draw_circle(c, r * 0.22, Color(0.05, 0.0, 0.05, 0.95))
		"camp":
			ci.draw_arc(c, r * 0.7, 0.0, TAU, 6, col, 4.0)
			for k in 3:
				ci.draw_circle(c + Vector2.from_angle(TAU * k / 3.0 + t * 0.5) * r * 0.7, r * 0.14, Color("ff4a4a"))
		"gate":
			ci.draw_arc(c, r * 0.8, 0.0, TAU, 32, col, 4.0)
			ci.draw_arc(c, r * 0.55, 0.0, TAU, 32, Color(col, 0.5), 2.0)
		_:
			ci.draw_circle(c, r * 0.5, col)
