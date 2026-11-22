class_name ChartView
extends Control
## The Corridor Chart: a lane of beacons (stops) from the gate outward. Lit
## beacons are done, the gold one is next, dark ones are still ahead. Side
## signals branch off the stop that opens them.

signal stop_selected(id: String)

const STEP: float = 196.0
const NODE: float = 68.0

var positions: Dictionary = {} # stop id -> centre
var selected: String = ""
var anim: float = 0.0
var buttons: Dictionary = {}

func _init() -> void:
	var main: Array = GameData.chart_main()
	for i in main.size():
		var id: String = String(main[i]["id"])
		var pos: Vector2 = Vector2(96.0 + i * STEP, 156.0 + sin(i * 1.15) * 26.0)
		positions[id] = pos
		var sides: Array = GameData.chart_sides(id)
		for k in sides.size():
			var up: bool = k % 2 == 0
			positions[String(sides[k]["id"])] = Vector2(pos.x + (58.0 if up else -58.0), 64.0 if up else 268.0)
	custom_minimum_size = Vector2(96.0 * 2.0 + (main.size() - 1) * STEP, 330.0)

## How far the chart is revealed: every lit stop, the next one, and a single
## unnamed beacon beyond it. The rest of the corridor stays dark (playtest:
## a full list of things not yet found is noise).
var reveal: int = 0 # index into chart_main of the last visible main stop
var teaser: String = "" # the one dark "?" beacon past the next stop

func _visible(id: String) -> bool:
	var st: Dictionary = GameData.chart_stop(id)
	if st.has("side_of"):
		return Profile.stop_available(id) or Profile.stop_done(id)
	var n: int = GameData.chart_number(id)
	return n - 1 <= reveal

func _ready() -> void:
	var main: Array = GameData.chart_main()
	reveal = 0
	for i in main.size():
		if Profile.stop_available(String(main[i]["id"])) or Profile.stop_done(String(main[i]["id"])):
			reveal = i
	if reveal + 1 < main.size():
		teaser = String(main[reveal + 1]["id"])
		reveal += 1
	for st: Dictionary in GameData.CHART:
		var id: String = String(st["id"])
		var side: bool = st.has("side_of")
		if not _visible(id):
			continue # still dark: not on the chart yet
		var b: Button = Button.new()
		b.flat = true
		b.focus_mode = Control.FOCUS_ALL
		var half: float = NODE * (0.42 if side else 0.5) + 8.0
		b.position = Vector2(positions[id]) - Vector2(half, half)
		b.size = Vector2(half, half) * 2.0
		for sb: String in ["normal", "hover", "pressed", "focus", "disabled"]:
			b.add_theme_stylebox_override(sb, StyleBoxEmpty.new())
		b.pressed.connect(func() -> void: select(id))
		add_child(b)
		buttons[id] = b

func select(id: String) -> void:
	selected = id
	stop_selected.emit(id)
	queue_redraw()

func _process(delta: float) -> void:
	anim += delta
	queue_redraw()

func _state(id: String) -> String:
	if Profile.stop_done(id):
		return "done"
	return "open" if Profile.stop_available(id) else "locked"

func _draw() -> void:
	var font: Font = UiTheme.font("bold")
	var main: Array = GameData.chart_main()
	var lit: Color = Color("68ecff")
	# The lane itself: lit as far as the last relit beacon.
	for i in main.size() - 1:
		var a: Vector2 = positions[String(main[i]["id"])]
		var b: Vector2 = positions[String(main[i + 1]["id"])]
		var on: bool = Profile.stop_done(String(main[i]["id"]))
		if i >= reveal:
			# The lane fades out into the dark past the last visible beacon.
			for k in 6:
				var t0: float = k / 6.0
				draw_line(a.lerp(b, t0), a.lerp(b, t0 + 1.0 / 12.0), Color(1, 1, 1, 0.12 * (1.0 - t0)), 3.0)
			break
		draw_line(a, b, Color(lit, 0.16) if on else Color(1, 1, 1, 0.05), 26.0)
		draw_line(a, b, Color(lit, 0.8) if on else Color(1, 1, 1, 0.14), 3.0)
		if on:
			var t: float = fmod(anim * 0.5 + i * 0.3, 1.0)
			draw_circle(a.lerp(b, t), 4.0, Color(1, 1, 1, 0.8))
	for st: Dictionary in GameData.CHART:
		var id: String = String(st["id"])
		if not buttons.has(id):
			continue
		var pos: Vector2 = positions[id]
		var side: bool = st.has("side_of")
		var state: String = _state(id)
		var r: float = NODE * (0.34 if side else 0.5)
		if side:
			var parent: Vector2 = positions[String(st["side_of"])]
			draw_dashed_line(parent, pos, Color(UiTheme.GOLD, 0.45), 2.0, 8.0)
		var col: Color = lit if state == "done" else (UiTheme.GOLD if state == "open" else Color("4a5670"))
		if state == "open":
			var pulse: float = 0.5 + 0.5 * sin(anim * 3.0)
			draw_arc(pos, r + 8.0 + pulse * 6.0, 0.0, TAU, 40, Color(col, 0.5 - pulse * 0.3), 3.0)
		draw_circle(pos, r, Color("0b1322"))
		draw_circle(pos, r, Color(col, 0.22 if state != "locked" else 0.08))
		draw_arc(pos, r, 0.0, TAU, 40, col, 4.0 if id == selected else 2.5)
		if id == selected:
			draw_arc(pos, r + 5.0, 0.0, TAU, 40, Color.WHITE, 2.0)
		if id == teaser:
			var qw: float = font.get_string_size("?", HORIZONTAL_ALIGNMENT_LEFT, -1, 30).x
			draw_string(font, pos + Vector2(-qw * 0.5, 11.0), "?", HORIZONTAL_ALIGNMENT_LEFT, -1, 30, Color("6b7892"))
			continue
		if state == "locked":
			# Padlock.
			draw_rect(Rect2(pos + Vector2(-9, -2), Vector2(18, 14)), Color("6b7892"))
			draw_arc(pos + Vector2(0, -3), 7.0, PI, TAU, 10, Color("6b7892"), 3.0)
		else:
			CategoryIcon.draw(self, String(st.get("icon", "signal")), pos, r * 0.72, anim)
		var num: int = GameData.chart_number(id)
		if num > 0:
			var ns: String = str(num)
			draw_circle(pos + Vector2(-r * 0.78, -r * 0.78), 12.0, Color("0b1322"))
			draw_arc(pos + Vector2(-r * 0.78, -r * 0.78), 12.0, 0.0, TAU, 16, col, 2.0)
			var nw: float = font.get_string_size(ns, HORIZONTAL_ALIGNMENT_LEFT, -1, 14).x
			draw_string(font, pos + Vector2(-r * 0.78 - nw * 0.5, -r * 0.78 + 5.0), ns, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color.WHITE)
		if state == "done":
			draw_circle(pos + Vector2(r * 0.78, -r * 0.78), 11.0, lit)
			draw_polyline(PackedVector2Array([pos + Vector2(r * 0.78 - 5, -r * 0.78), pos + Vector2(r * 0.78 - 1, -r * 0.78 + 4), pos + Vector2(r * 0.78 + 6, -r * 0.78 - 4)]), Color("0b1322"), 2.5)
		# Name, and the prize waiting there.
		var below: bool = not side or pos.y > 156.0
		var name: String = String(st["name"])
		var fs1: int = UiTheme.fs(13) if not side else UiTheme.fs(11)
		var w1: float = font.get_string_size(name, HORIZONTAL_ALIGNMENT_LEFT, -1, fs1).x
		var fs2: int = UiTheme.fs(11)
		var y1: float = pos.y + r + 6.0 + fs1 if below else pos.y - r - 10.0 - fs2
		draw_string(font, Vector2(pos.x - w1 * 0.5, y1), name, HORIZONTAL_ALIGNMENT_LEFT, -1, fs1, Color.WHITE if state != "locked" else Color("6b7892"))
		var prize: String = String(st.get("prize", ""))
		var w2: float = font.get_string_size(prize, HORIZONTAL_ALIGNMENT_LEFT, -1, fs2).x
		draw_string(font, Vector2(pos.x - w2 * 0.5, y1 + fs2 + 3.0), prize, HORIZONTAL_ALIGNMENT_LEFT, -1, fs2, Color(UiTheme.GOLD, 0.9 if state != "locked" else 0.4))
