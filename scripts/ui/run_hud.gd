extends CanvasLayer
## In-expedition interface. Mobile-first: floating thumb joystick, a large
## ability button, a tappable minimap, edge compass, and readable banners.
## Every state is signalled by shape and text as well as colour.

var run: GameRun
var root: Control
var canvas: Control
var theme_res: Theme
var safe: Rect2

var touch_vector: Vector2 = Vector2.ZERO
var touch_id: int = -1
var touch_origin: Vector2 = Vector2.ZERO
var touch_pos: Vector2 = Vector2.ZERO
var free_reroll_used: bool = false

var hull_label: Label
var top_label: Label
var level_label: Label
var state_label: Label
var objective_label: Label
var banner_title: Label
var banner_sub: Label
var banner_clock: float = 0.0
var banner_total: float = 1.0
var toast_label: Label
var toast_clock: float = 0.0
var hint_label: Label
var hint_clock: float = 0.0
var card: PanelContainer
var card_clock: float = 0.0
var level_panel: Control
var level_box: HBoxContainer
var level_options: Array = []
var reroll_button: Button
var gate_panel: PanelContainer
var gate_label: Label
var gate_info: Label
var extract_button: Button
var confront_button: Button
var _gate_state: String = ""
var ability_button: Button
var pause_button: Button
var pause_panel: Control
var map_overlay: Control
var alerts: Array = [] # [text, world_pos, life]
var damage_flash: float = 0.0
var beat_pulse: float = 0.0

func _ready() -> void:
	layer = 10
	process_mode = Node.PROCESS_MODE_ALWAYS
	theme_res = UiTheme.build()
	root = Control.new()
	root.theme = theme_res
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	canvas = HudCanvas.new()
	canvas.hud = self
	canvas.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	canvas.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(canvas)
	_compute_safe()
	_build_labels()
	_build_buttons()
	_build_gate_panel()
	_build_level_panel()
	get_viewport().size_changed.connect(_on_resize)

func _compute_safe() -> void:
	var vp: Vector2 = get_viewport().get_visible_rect().size
	safe = Rect2(Vector2(16, 12), vp - Vector2(32, 24))
	var screen_safe: Rect2i = DisplayServer.get_display_safe_area()
	var screen_size: Vector2i = DisplayServer.screen_get_size()
	if screen_size.x > 0 and screen_safe.size.x > 0 and OS.has_feature("mobile"):
		var sx: float = vp.x / float(screen_size.x)
		var sy: float = vp.y / float(screen_size.y)
		var left: float = maxf(16.0, screen_safe.position.x * sx)
		var top: float = maxf(12.0, screen_safe.position.y * sy)
		var right: float = maxf(16.0, (screen_size.x - screen_safe.end.x) * sx)
		var bottom: float = maxf(12.0, (screen_size.y - screen_safe.end.y) * sy)
		safe = Rect2(Vector2(left, top), vp - Vector2(left + right, top + bottom))

func _on_resize() -> void:
	_compute_safe()
	_layout()

func _layout() -> void:
	if gate_panel == null or ability_button == null:
		return
	hull_label.position = safe.position + Vector2(0, 26)
	top_label.position = Vector2(safe.position.x + safe.size.x * 0.5 - 220, safe.position.y + 14)
	level_label.position = safe.position + Vector2(0, 52)
	state_label.position = safe.position + Vector2(0, 84)
	objective_label.position = safe.position + Vector2(0, 132)
	banner_title.position = Vector2(safe.position.x, safe.position.y + safe.size.y * 0.2)
	banner_title.size.x = safe.size.x
	banner_sub.position = banner_title.position + Vector2(0, UiTheme.fs(44))
	banner_sub.size.x = safe.size.x
	toast_label.position = Vector2(safe.position.x, safe.end.y - 150)
	toast_label.size.x = safe.size.x
	hint_label.position = Vector2(safe.position.x + safe.size.x * 0.2, safe.end.y - 70)
	hint_label.size.x = safe.size.x * 0.6
	var right_hand: bool = String(Profile.setting("handedness")) == "right"
	var ab_x: float = safe.end.x - 150 if right_hand else safe.position.x + 22
	ability_button.position = Vector2(ab_x, safe.end.y - 150)
	pause_button.position = Vector2(safe.end.x - 64, safe.position.y)
	var gx: float = safe.end.x - gate_panel.size.x - 170.0 if right_hand else safe.position.x + 170.0
	gate_panel.position = Vector2(maxf(safe.position.x, gx), maxf(safe.position.y + 190.0, safe.end.y - gate_panel.size.y - 20.0))

func _build_labels() -> void:
	hull_label = UiTheme.label("", 17, UiTheme.TEXT, "bold")
	root.add_child(hull_label)
	top_label = UiTheme.label("", 16, UiTheme.DIM)
	top_label.size = Vector2(440, 30)
	top_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(top_label)
	level_label = UiTheme.label("", 15, UiTheme.DIM)
	root.add_child(level_label)
	state_label = UiTheme.label("", 16, UiTheme.TEXT, "bold")
	root.add_child(state_label)
	objective_label = UiTheme.label("", 15, Color("a8f7ff"))
	objective_label.size = Vector2(520, 60)
	root.add_child(objective_label)
	banner_title = UiTheme.label("", 38, Color.WHITE, "display")
	banner_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	banner_title.add_theme_constant_override("outline_size", 8)
	banner_title.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.6))
	root.add_child(banner_title)
	banner_sub = UiTheme.label("", 17, UiTheme.TEXT)
	banner_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	banner_sub.add_theme_constant_override("outline_size", 6)
	banner_sub.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.6))
	root.add_child(banner_sub)
	toast_label = UiTheme.label("", 16, Color("dff8ff"), "bold")
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_label.add_theme_constant_override("outline_size", 6)
	toast_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.7))
	root.add_child(toast_label)
	hint_label = UiTheme.label("", 16, Color("ffe9b0"))
	hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint_label.add_theme_constant_override("outline_size", 6)
	hint_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	root.add_child(hint_label)
	for l0: Label in [hull_label, level_label, state_label, top_label]:
		l0.autowrap_mode = TextServer.AUTOWRAP_OFF
	for l: Label in [hull_label, level_label, state_label, objective_label]:
		l.add_theme_constant_override("outline_size", 5)
		l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.6))
		l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for l2: Label in [banner_title, banner_sub, toast_label, hint_label, top_label]:
		l2.mouse_filter = Control.MOUSE_FILTER_IGNORE

func _build_buttons() -> void:
	ability_button = Button.new()
	ability_button.custom_minimum_size = Vector2(128, 128)
	ability_button.size = Vector2(128, 128)
	ability_button.focus_mode = Control.FOCUS_NONE
	var clear: StyleBoxFlat = UiTheme.box(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 0, 64, 0)
	for st: String in ["normal", "hover", "pressed", "disabled", "focus"]:
		ability_button.add_theme_stylebox_override(st, clear)
	ability_button.pressed.connect(func() -> void: run.use_ability())
	# Touch presses are handled in _input for every finger; the Button still
	# serves desktop mouse clicks.
	root.add_child(ability_button)
	pause_button = Button.new()
	pause_button.text = "II"
	pause_button.custom_minimum_size = Vector2(56, 48)
	pause_button.focus_mode = Control.FOCUS_NONE
	pause_button.pressed.connect(toggle_pause)
	root.add_child(pause_button)
	_layout()

func _build_gate_panel() -> void:
	gate_panel = PanelContainer.new()
	gate_panel.add_theme_stylebox_override("panel", UiTheme.box(Color(0.03, 0.06, 0.1, 0.92), Color("68ecff"), 2, 12, 16))
	gate_panel.custom_minimum_size = Vector2(480, 0)
	gate_panel.visible = false
	gate_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(gate_panel)
	var v: VBoxContainer = VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	gate_panel.add_child(v)
	gate_label = UiTheme.label("", 18, Color("a8f7ff"), "bold")
	v.add_child(gate_label)
	gate_info = UiTheme.label("", 14, UiTheme.TEXT)
	gate_info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	gate_info.custom_minimum_size = Vector2(448, 0)
	v.add_child(gate_info)
	extract_button = UiTheme.button("GO HOME — KEEP EVERYTHING  [Q]", func() -> void: run.request_extract(), 448.0, 54.0)
	extract_button.add_theme_color_override("font_color", Color("a8f7ff"))
	v.add_child(extract_button)
	confront_button = UiTheme.button("FACE THE SILENCE  [E]", func() -> void: run.confront(), 448.0, 54.0)
	confront_button.add_theme_color_override("font_color", Color("ff8fb0"))
	v.add_child(confront_button)
	_layout()

# ================================================================== per-frame

func _process(delta: float) -> void:
	if run == null or run.player == null:
		return
	banner_clock = maxf(0.0, banner_clock - delta)
	var ba: float = clampf(minf(banner_clock, banner_total - banner_clock) * 3.0, 0.0, 1.0)
	banner_title.modulate.a = ba
	banner_sub.modulate.a = ba
	toast_clock = maxf(0.0, toast_clock - delta)
	toast_label.modulate.a = clampf(toast_clock * 2.0, 0.0, 1.0)
	damage_flash = maxf(0.0, damage_flash - delta)
	beat_pulse = maxf(0.0, beat_pulse - delta * 3.0)
	# Lore cards wait while an upgrade choice or pause covers them.
	if not get_tree().paused:
		card_clock -= delta
	if card and card_clock <= 0.0:
		card.queue_free()
		card = null
	for i in range(alerts.size() - 1, -1, -1):
		alerts[i][2] -= delta
		if alerts[i][2] <= 0.0:
			alerts.remove_at(i)
	_update_hint(delta)
	_update_teach(delta)
	_update_labels()
	_update_gate()
	if Input.is_action_just_pressed("pause"):
		if map_overlay:
			_close_map()
		else:
			toggle_pause()
	if Input.is_action_just_pressed("map") and not run.choosing:
		if map_overlay:
			_close_map()
		elif pause_panel == null:
			open_map()
	if level_panel and level_panel.visible:
		for i in 4:
			if Input.is_action_just_pressed("choose_%d" % (i + 1)) and i < level_options.size():
				_pick(level_options[i])
				break
		if Input.is_action_just_pressed("reroll"):
			_do_reroll()
	canvas.queue_redraw()

func _update_hint(delta: float) -> void:
	hint_clock -= delta
	if hint_clock <= 0.0:
		hint_label.text = ""
		if not run.hint_queue.is_empty() and run.elapsed > 1.0:
			var h: Array = run.hint_queue.pop_front()
			hint_label.text = String(h[1])
			hint_clock = 7.0
			Profile.mark_seen(String(h[0]))
	hint_label.modulate.a = clampf(hint_clock, 0.0, 1.0)

func _update_labels() -> void:
	var p: ForcePlayer = run.player
	var ch: Dictionary = GameData.CHARACTERS[run.character_id]
	hull_label.text = "%s   %d / %d%s" % [String(ch["short"]), int(ceil(p.hp)), int(p.max_hp), ("   +%d SHIELD" % int(p.shield)) if p.shield > 1.0 else ""]
	var region_name: String = String(run.current_region_def()["name"])
	top_label.text = "%s   •   %s" % [GameData.format_time(run.elapsed), region_name]
	level_label.text = "LEVEL %d   •   %d CLEARED" % [run.level, run.kills]
	var glyph: String = {"RESONANCE": "◆", "DRIFT": "◇", "FRACTURE": "✕"}.get(run.force_state, "")
	state_label.text = "%s %s" % [glyph, run.force_state]
	state_label.add_theme_color_override("font_color", _state_color())
	var obj: String = ""
	var found: int = run.signals_found()
	if run.boss_spawned and not run.boss_defeated:
		obj = "Defeat THE SILENCE"
	elif run.boss_defeated:
		obj = "Signal restored — returning home"
	elif run.climax_available():
		obj = "SIGNALS %d/%d ✓   Fly to the %s: go home, or face The Silence" % [found, run.goal_signals(), run.gate_name()]
	else:
		obj = "SIGNALS %d/%d   Tune signals to call out The Silence • Go home at the %s any time" % [found, run.goal_signals(), run.gate_name()]
	objective_label.text = obj

func _state_color() -> Color:
	match run.force_state:
		"RESONANCE":
			return Color("9ff7d0")
		"FRACTURE":
			return Color("ff6f8f")
	return Color("a8c8ff")

func _update_gate() -> void:
	var show: bool = run.can_extract()
	gate_panel.visible = show
	if not show:
		return
	var found: int = run.discoveries.size()
	var est: int = int(run.build_result("extracted")["currency"])
	if run.extract_armed:
		gate_label.text = "LEAVING THE REACH IN %.1fs" % maxf(0.0, GameRun.EXTRACT_TIME - run.extract_progress)
		gate_info.text = "Fly out of the ring, or press again, to stay."
		extract_button.text = "STAY  [Q]"
	else:
		gate_label.text = run.gate_name().to_upper() + " — YOUR WAY HOME"
		var lines: Array[String] = ["Go home now: keep all %d discoveries and about +%d Signal. The expedition ends safely." % [found, est]]
		if run.climax_available():
			lines.append("Or face The Silence: beat it to complete the Reach — +120 Signal bonus and new explorers / routes.")
		else:
			var need: int = run.goal_signals() - run.signals_found()
			lines.append("Tune %d more signal%s to call out The Silence and finish the expedition. Or keep exploring — the gate will be here." % [need, "" if need == 1 else "s"])
		gate_info.text = "\n".join(lines)
		extract_button.text = "GO HOME — KEEP EVERYTHING  [Q]"
	confront_button.visible = run.climax_available() and not run.extract_armed
	var state_key: String = str(run.extract_armed) + str(confront_button.visible)
	if state_key != _gate_state:
		_gate_state = state_key
		gate_panel.size = Vector2.ZERO
		gate_panel.reset_size()
	_layout()

# ================================================================== messages

func banner(title: String, sub: String, color: Color, duration: float = 2.4) -> void:
	banner_title.text = title
	banner_title.add_theme_color_override("font_color", color)
	banner_sub.text = sub
	banner_clock = duration
	banner_total = duration

func toast(text: String) -> void:
	toast_label.text = text
	toast_clock = 2.6

func alert(text: String, world_pos: Vector2) -> void:
	alerts.append([text, world_pos, 4.0])
	toast(text)

func flash_damage() -> void:
	damage_flash = 0.35 if not bool(Profile.setting("reduced_flashes")) else 0.15

func on_beat(index: int) -> void:
	beat_pulse = 1.0 if index % 4 == 0 else 0.5

func discovery_card(title: String, text: String, color: Color, first_time: bool, kind: String, gains: Array = []) -> void:
	if card:
		card.queue_free()
	card = PanelContainer.new()
	card.add_theme_stylebox_override("panel", UiTheme.box(Color(0.03, 0.05, 0.1, 0.94), color, 2, 14, 20))
	card.custom_minimum_size = Vector2(minf(680.0, safe.size.x - 40.0), 0)
	var h: HBoxContainer = HBoxContainer.new()
	h.add_theme_constant_override("separation", 14)
	card.add_child(h)
	var cat: String = GameData.poi_category(kind)
	var cdef: Dictionary = GameData.CATEGORIES.get(cat, {})
	var icon: CategoryIcon = CategoryIcon.new(cat if cat != "" else "signal", 64.0)
	icon.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	h.add_child(icon)
	var v: VBoxContainer = VBoxContainer.new()
	v.add_theme_constant_override("separation", 6)
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(v)
	var tag: String = String(cdef.get("name", "DISCOVERY"))
	v.add_child(UiTheme.label(tag + ("   •   NEW TO THE ARCHIVE" if first_time else ""), 13, cdef.get("color", color), "bold"))
	v.add_child(UiTheme.label(title, 22, Color.WHITE, "display"))
	for g: Variant in gains:
		var gl: Label = UiTheme.label("+ " + String(g), 15, UiTheme.GOLD, "bold")
		gl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		v.add_child(gl)
	if text != "":
		var tl: Label = UiTheme.label(text, 14, UiTheme.DIM)
		tl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		v.add_child(tl)
	root.add_child(card)
	card.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.modulate.a = 0.0
	card_clock = 6.5 + 1.5 * gains.size()
	# Autowrapped labels only know their height after a layout pass.
	var c: PanelContainer = card
	await get_tree().process_frame
	if not is_instance_valid(c):
		return
	c.size = Vector2(c.custom_minimum_size.x, 0)
	c.reset_size()
	# Sit low on screen, clear of the ship at the centre and the HUD at the top.
	c.position = Vector2(safe.position.x + (safe.size.x - c.size.x) * 0.5, safe.end.y - c.size.y - 96)
	c.modulate.a = 1.0

# ================================================================== field guide

var teach_queue: Array[String] = []
var teach_panel: PanelContainer
var teach_clock: float = 0.0

## Shows a "first sighting" card for a Field Guide category.
func teach(cat: String) -> void:
	if not cat in teach_queue:
		teach_queue.append(cat)

func _update_teach(delta: float) -> void:
	if not get_tree().paused:
		teach_clock -= delta
	if teach_panel and teach_clock <= 0.0:
		teach_panel.queue_free()
		teach_panel = null
	if teach_panel == null and not teach_queue.is_empty():
		_show_teach(teach_queue.pop_front())
	if teach_panel:
		teach_panel.modulate.a = clampf(teach_clock * 2.0, 0.0, 1.0)
		teach_panel.visible = not level_panel.visible and pause_panel == null and not run.ended

func _show_teach(cat: String) -> void:
	var def: Dictionary = GameData.CATEGORIES[cat]
	teach_panel = PanelContainer.new()
	teach_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	teach_panel.add_theme_stylebox_override("panel", UiTheme.box(Color(0.03, 0.05, 0.1, 0.9), Color(def["color"], 0.8), 2, 12, 12))
	var h: HBoxContainer = HBoxContainer.new()
	h.add_theme_constant_override("separation", 12)
	teach_panel.add_child(h)
	var icon: CategoryIcon = CategoryIcon.new(cat, 56.0)
	icon.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(icon)
	var v: VBoxContainer = VBoxContainer.new()
	v.add_theme_constant_override("separation", 2)
	h.add_child(v)
	v.add_child(UiTheme.label("NEW SIGHTING  •  " + String(def["name"]), 14, def["color"], "bold"))
	var what: Label = UiTheme.label(String(def["what"]), 13, UiTheme.TEXT)
	what.custom_minimum_size = Vector2(380, 0)
	v.add_child(what)
	var why: Label = UiTheme.label(String(def["why"]), 13, UiTheme.GOLD)
	why.custom_minimum_size = Vector2(380, 0)
	v.add_child(why)
	root.add_child(teach_panel)
	teach_panel.position = Vector2(safe.position.x, safe.position.y + UiTheme.fs(160))
	teach_clock = 7.0 + String(def["why"]).length() / 40.0
	# Autowrapped labels only know their height after a layout pass.
	var tp: PanelContainer = teach_panel
	tp.modulate.a = 0.0
	await get_tree().process_frame
	if is_instance_valid(tp):
		tp.size = Vector2.ZERO
		tp.reset_size()

# ================================================================== level up

func _build_level_panel() -> void:
	level_panel = Control.new()
	level_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	level_panel.visible = false
	level_panel.process_mode = Node.PROCESS_MODE_ALWAYS
	root.add_child(level_panel)
	var dim: ColorRect = ColorRect.new()
	dim.color = Color(0.01, 0.02, 0.05, 0.72)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	level_panel.add_child(dim)
	var center: VBoxContainer = VBoxContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.alignment = BoxContainer.ALIGNMENT_CENTER
	center.add_theme_constant_override("separation", 16)
	level_panel.add_child(center)
	var title: Label = UiTheme.label("LEVEL UP — CHOOSE WHAT TO CARRY FORWARD", 26, UiTheme.GOLD, "display")
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	center.add_child(title)
	level_box = HBoxContainer.new()
	level_box.alignment = BoxContainer.ALIGNMENT_CENTER
	level_box.add_theme_constant_override("separation", 14)
	center.add_child(level_box)
	var row: HBoxContainer = HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	center.add_child(row)
	reroll_button = UiTheme.button("REROLL", _do_reroll, 220.0, 50.0)
	row.add_child(reroll_button)

func show_level_up(options: Array) -> void:
	release_touch()
	level_options = options
	free_reroll_used = false if run.character_id == "jex_marrin" and level_panel.visible == false else free_reroll_used
	for c: Node in level_box.get_children():
		c.queue_free()
	var card_w: float = clampf((safe.size.x - 60.0) / float(options.size()) - 14.0, 220.0, 300.0)
	for i in options.size():
		level_box.add_child(_choice_card(options[i], i, card_w))
	var jex_free: bool = run.character_id == "jex_marrin" and not free_reroll_used
	reroll_button.text = "REROLL  [R]   (%s)" % ("FREE" if jex_free else str(run.rerolls))
	reroll_button.disabled = run.rerolls <= 0 and not jex_free
	level_panel.visible = true
	await get_tree().process_frame
	# Grow every card to fit its wrapped text, all to the same height.
	var tallest: float = 236.0
	for c: Node in level_box.get_children():
		if c.get_child_count() > 0:
			tallest = maxf(tallest, (c.get_child(0) as Control).get_combined_minimum_size().y + 34.0)
	for c: Node in level_box.get_children():
		(c as Control).custom_minimum_size.y = tallest
	if level_box.get_child_count() > 0:
		(level_box.get_child(0) as Control).grab_focus()

func _choice_card(option: Dictionary, index: int, width: float) -> Button:
	var b: Button = Button.new()
	b.custom_minimum_size = Vector2(width, 236)
	b.process_mode = Node.PROCESS_MODE_ALWAYS
	var type: String = String(option["type"])
	var id: String = String(option["id"])
	var color: Color = UiTheme.ACCENT
	var name: String = ""
	var origin: String = ""
	var desc: String = ""
	var note: String = ""
	var kind_tag: String = ""
	var lvl: int = int(option["level"])
	match type:
		"weapon":
			var w: Dictionary = GameData.WEAPONS[id]
			var f: Dictionary = GameData.FORCES[String(w["force"])]
			color = f["color"]
			name = String(w["name"])
			origin = "Force: " + String(f["name"]) + " (" + String(f["mechanic"]) + ")"
			kind_tag = "NEW WEAPON" if lvl == 1 else "WEAPON UPGRADE"
			desc = String(w["desc"])
			note = "Adds a new gun to your ship." if lvl == 1 else "LEVEL %d: %s" % [lvl, String(w["notes"][lvl - 1])]
			if lvl == 1 and run.weapons.force_level(String(w["force"])) == 0:
				note += "\nAdds the %s mechanic: %s" % [String(f["mechanic"]), String(f["desc"])]
		"passive":
			var pdef: Dictionary = GameData.PASSIVES[id]
			color = Color("cfd9ff")
			name = String(pdef["name"])
			origin = "Boosts your whole ship"
			kind_tag = "SHIP SYSTEM"
			desc = String(pdef["desc"])
			note = "RANK %d / %d" % [lvl, int(pdef["max"])]
			for wid: String in run.weapons.weapons.keys():
				if not run.weapons.is_evolved(wid) and String(GameData.WEAPONS[wid].get("evolve_with", "")) == id:
					note += "\nEvolves %s at level 5" % GameData.weapon_name(wid)
		"evolution":
			var ev: Dictionary = GameData.EVOLUTIONS[id]
			color = UiTheme.GOLD
			name = String(ev["name"])
			origin = "Your weapon transforms"
			kind_tag = "EVOLUTION"
			desc = String(ev["desc"])
			note = "Transforms " + GameData.weapon_name(String(ev["from"]))
	b.add_theme_stylebox_override("normal", UiTheme.box(Color("0d1428", 0.96), Color(color, 0.7), 2, 14, 16))
	b.add_theme_stylebox_override("hover", UiTheme.box(Color("15203d"), color, 3, 14, 16))
	b.add_theme_stylebox_override("focus", UiTheme.box(Color("15203d", 0.0), UiTheme.GOLD, 3, 14, 16))
	b.add_theme_stylebox_override("pressed", UiTheme.box(Color("1b2a50"), color, 3, 14, 16))
	var v: VBoxContainer = VBoxContainer.new()
	v.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 16)
	v.add_theme_constant_override("separation", 8)
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(v)
	var key: Label = UiTheme.label("[%d]  %s" % [index + 1, kind_tag], 14, color, "bold")
	v.add_child(key)
	v.add_child(UiTheme.label(origin, 11, UiTheme.DIM))
	v.add_child(UiTheme.label(name, 23, Color.WHITE, "display"))
	if type == "weapon" or type == "passive":
		var maxl: int = 5 if type == "weapon" else int(GameData.PASSIVES[id]["max"])
		var pips: String = ""
		for k in maxl:
			pips += "●" if k < lvl else "○"
		v.add_child(UiTheme.label(pips, 14, color))
	v.add_child(UiTheme.label(desc, 15, UiTheme.TEXT))
	v.add_child(UiTheme.label(note, 14, UiTheme.GOLD if type == "evolution" else Color("bfe9ff")))
	for c: Node in v.get_children():
		(c as Control).mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.pressed.connect(_pick.bind(option))
	return b

func _pick(option: Dictionary) -> void:
	if not level_panel.visible:
		return
	level_panel.visible = false
	run.choose_upgrade(option)

func _do_reroll() -> void:
	var opts: Array = run.reroll_choices()
	if not opts.is_empty():
		Audio.play_sfx("ui_click", 1.2, -4.0)
		show_level_up(opts)

# ================================================================== pause & map

func toggle_pause() -> void:
	if run.choosing or run.ended:
		return
	if pause_panel:
		pause_panel.queue_free()
		pause_panel = null
		get_tree().paused = false
		return
	release_touch()
	get_tree().paused = true
	pause_panel = Control.new()
	pause_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_child(pause_panel)
	var dim: ColorRect = ColorRect.new()
	dim.color = Color(0.01, 0.02, 0.05, 0.8)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	pause_panel.add_child(dim)
	var v: VBoxContainer = VBoxContainer.new()
	v.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	v.add_theme_constant_override("separation", 12)
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	pause_panel.add_child(v)
	var t: Label = UiTheme.label("EXPEDITION PAUSED", 34, Color.WHITE, "display")
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(t)
	var loadout: Label = UiTheme.label(_loadout_text(), 15, UiTheme.DIM)
	loadout.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	loadout.custom_minimum_size = Vector2(560, 0)
	v.add_child(loadout)
	var resume: Button = UiTheme.button("RESUME", toggle_pause, 360.0)
	v.add_child(resume)
	v.add_child(UiTheme.button("MAP", func() -> void:
		toggle_pause()
		open_map(), 360.0))
	v.add_child(UiTheme.button("FIELD GUIDE — WHAT IS EVERYTHING?", _open_field_guide, 360.0))
	var shake_btn: CheckButton = CheckButton.new()
	shake_btn.text = "Screen shake"
	shake_btn.button_pressed = float(Profile.setting("screen_shake")) > 0.0
	shake_btn.toggled.connect(func(on: bool) -> void: Profile.set_setting("screen_shake", 1.0 if on else 0.0))
	v.add_child(shake_btn)
	var nav_btn: CheckButton = CheckButton.new()
	nav_btn.text = "Navigation assist"
	nav_btn.button_pressed = bool(Profile.setting("nav_assist"))
	nav_btn.toggled.connect(func(on: bool) -> void: Profile.set_setting("nav_assist", on))
	v.add_child(nav_btn)
	v.add_child(UiTheme.button("ABANDON EXPEDITION (keep discoveries)", func() -> void:
		toggle_pause()
		run.end_run("defeat"), 360.0))
	v.position = (get_viewport().get_visible_rect().size - v.get_combined_minimum_size()) * 0.5
	resume.grab_focus()

func _open_field_guide() -> void:
	if pause_panel == null:
		return
	var vp: Vector2 = get_viewport().get_visible_rect().size
	var backdrop: ColorRect = ColorRect.new()
	backdrop.color = Color(0.01, 0.015, 0.04, 1.0)
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	pause_panel.add_child(backdrop)
	var overlay: PanelContainer = PanelContainer.new()
	overlay.add_theme_stylebox_override("panel", UiTheme.box(Color(0.02, 0.03, 0.07, 0.98), UiTheme.ACCENT, 2, 14, 18))
	overlay.position = safe.position + Vector2(10, 10)
	overlay.size = safe.size - Vector2(20, 20)
	pause_panel.add_child(overlay)
	var v: VBoxContainer = VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	overlay.add_child(v)
	var top: HBoxContainer = HBoxContainer.new()
	v.add_child(top)
	var t: Label = UiTheme.label("FIELD GUIDE", 28, Color.WHITE, "display")
	t.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(t)
	var close: Button = UiTheme.button("BACK", func() -> void:
		backdrop.queue_free()
		overlay.queue_free(), 160.0, 48.0)
	top.add_child(close)
	var sc: ScrollContainer = ScrollContainer.new()
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	sc.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(sc)
	var inner: VBoxContainer = VBoxContainer.new()
	inner.add_theme_constant_override("separation", 8)
	inner.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.add_child(inner)
	FieldGuide.fill(inner, minf(1000.0, vp.x - 100.0))
	close.grab_focus()

func _loadout_text() -> String:
	var parts: Array = []
	for id: String in run.weapons.weapon_order:
		parts.append("%s %d" % [GameData.weapon_name(id), int(run.weapons.weapons[id])])
	var pas: Array = []
	for id: String in run.weapons.passives.keys():
		pas.append("%s %d" % [GameData.PASSIVES[id]["name"], int(run.weapons.passives[id])])
	var harms: Array = []
	for h: String in run.weapons.harmonies:
		harms.append(String(GameData.HARMONIES[h]["name"]))
	return "WEAPONS: %s\nSYSTEMS: %s%s" % [", ".join(parts), ", ".join(pas) if not pas.is_empty() else "none", ("\nHARMONIES: " + ", ".join(harms)) if not harms.is_empty() else ""]

func open_map() -> void:
	if run.choosing or run.ended:
		return
	release_touch()
	get_tree().paused = true
	map_overlay = MapOverlay.new()
	map_overlay.hud = self
	map_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	map_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	map_overlay.gui_input.connect(func(ev: InputEvent) -> void:
		if (ev is InputEventMouseButton and ev.pressed) or (ev is InputEventScreenTouch and ev.pressed):
			_close_map())
	root.add_child(map_overlay)

func _close_map() -> void:
	if map_overlay:
		map_overlay.queue_free()
		map_overlay = null
		get_tree().paused = false

# ================================================================== touch

func release_touch() -> void:
	touch_id = -1
	touch_vector = Vector2.ZERO

func _input(event: InputEvent) -> void:
	if run == null:
		return
	# Releases must always be seen, even while paused, or the stick sticks.
	if event is InputEventScreenTouch and not (event as InputEventScreenTouch).pressed and (event as InputEventScreenTouch).index == touch_id:
		release_touch()
		return
	if get_tree().paused:
		return
	# HUD buttons react to any finger (Godot only turns finger 0 into mouse
	# input), so the ability works while the other thumb steers.
	if event is InputEventScreenTouch and (event as InputEventScreenTouch).pressed:
		var tp: Vector2 = (event as InputEventScreenTouch).position
		if ability_button.get_global_rect().grow(12.0).has_point(tp):
			run.use_ability()
			get_viewport().set_input_as_handled()
			return
		if pause_button.get_global_rect().grow(8.0).has_point(tp):
			toggle_pause()
			get_viewport().set_input_as_handled()
			return
		if gate_panel.visible and confront_button.visible and confront_button.get_global_rect().has_point(tp):
			run.confront()
			get_viewport().set_input_as_handled()
			return
		if gate_panel.visible and extract_button.get_global_rect().has_point(tp):
			run.request_extract()
			get_viewport().set_input_as_handled()
			return
	if event is InputEventMouseButton and (event as InputEventMouseButton).device == InputEvent.DEVICE_ID_EMULATION:
		# Touch already handled above; ignore the emulated duplicate.
		get_viewport().set_input_as_handled()
		return
	var vp: Vector2 = get_viewport().get_visible_rect().size
	var right_hand: bool = String(Profile.setting("handedness")) == "right"
	if event is InputEventScreenTouch:
		var st: InputEventScreenTouch = event
		if st.pressed and touch_id == -1:
			var on_move_side: bool = st.position.x < vp.x * 0.55 if right_hand else st.position.x > vp.x * 0.45
			if on_move_side:
				touch_id = st.index
				touch_origin = st.position
				if String(Profile.setting("joystick_mode")) == "fixed":
					touch_origin = _fixed_stick_center()
				touch_pos = st.position
				_update_touch_vector()
		elif not st.pressed and st.index == touch_id:
			touch_id = -1
			touch_vector = Vector2.ZERO
	elif event is InputEventScreenDrag:
		var sd: InputEventScreenDrag = event
		if sd.index == touch_id:
			touch_pos = sd.position
			# Floating stick follows the thumb if it drifts far, avoiding "dead" drags.
			var radius: float = 78.0
			if String(Profile.setting("joystick_mode")) == "floating" and touch_pos.distance_to(touch_origin) > radius * 1.6:
				touch_origin = touch_pos - (touch_pos - touch_origin).normalized() * radius * 1.6
			_update_touch_vector()

func _fixed_stick_center() -> Vector2:
	var right_hand: bool = String(Profile.setting("handedness")) == "right"
	return Vector2(safe.position.x + 140.0, safe.end.y - 140.0) if right_hand else Vector2(safe.end.x - 140.0, safe.end.y - 140.0)

func _update_touch_vector() -> void:
	var radius: float = 78.0
	var v: Vector2 = (touch_pos - touch_origin) / radius
	if v.length() < 0.12:
		touch_vector = Vector2.ZERO
	else:
		touch_vector = v.limit_length(1.0)

# ================================================================== drawing

class HudCanvas:
	extends Control
	var hud: Node

	func _draw() -> void:
		var run: GameRun = hud.run
		if run == null or run.player == null:
			return
		var font: Font = UiTheme.font("bold")
		var safe: Rect2 = hud.safe
		var vp: Vector2 = get_viewport_rect().size
		# Damage vignette.
		if hud.damage_flash > 0.0:
			var a: float = hud.damage_flash
			for k in 6:
				draw_rect(Rect2(Vector2(k * 6, k * 6), vp - Vector2(k * 12, k * 12)), Color(1, 0.2, 0.3, a * 0.08), false, 12.0)
		# Hull bar.
		var hb: Rect2 = Rect2(safe.position, Vector2(300, 18))
		var p: ForcePlayer = run.player
		draw_rect(hb, Color("0b1120"))
		var hp_ratio: float = p.hp / maxf(1.0, p.max_hp)
		var hp_col: Color = Color("7dffb2") if hp_ratio > 0.5 else (Color("ffd36b") if hp_ratio > 0.25 else Color("ff5f7f"))
		draw_rect(Rect2(hb.position, Vector2(hb.size.x * hp_ratio, hb.size.y)), hp_col)
		if p.shield > 1.0:
			draw_rect(Rect2(hb.position + Vector2(0, hb.size.y - 4), Vector2(hb.size.x * clampf(p.shield / maxf(1.0, p.max_shield), 0.0, 1.0), 4)), Color("bff6ff"))
		draw_rect(hb, Color(1, 1, 1, 0.25), false, 1.0)
		# XP bar across the top.
		var xb: Rect2 = Rect2(Vector2(safe.position.x + 320, safe.position.y + 4), Vector2(safe.size.x - 320 - 220 - 80, 8))
		draw_rect(xb, Color("0b1120"))
		draw_rect(Rect2(xb.position, Vector2(xb.size.x * float(run.xp) / float(maxi(1, run.xp_need)), xb.size.y)), Color("ffe08a"))
		# Resonance meter with zone markers.
		var rb: Rect2 = Rect2(safe.position + Vector2(0, 112), Vector2(300, 10))
		draw_rect(rb, Color("0b1120"))
		draw_rect(Rect2(rb.position, Vector2(rb.size.x * 0.28, rb.size.y)), Color(1.0, 0.35, 0.5, 0.25))
		draw_rect(Rect2(rb.position + Vector2(rb.size.x * 0.72, 0), Vector2(rb.size.x * 0.28, rb.size.y)), Color(0.5, 1.0, 0.8, 0.25))
		var rx: float = rb.position.x + rb.size.x * run.resonance / 100.0
		draw_rect(Rect2(Vector2(rx - 3, rb.position.y - 4), Vector2(6, rb.size.y + 8)), Color.WHITE)
		# Force mechanic meters.
		_draw_force_meters(run, safe.position + Vector2(320, 44), font)
		# Minimap.
		_draw_minimap(run, Rect2(Vector2(safe.end.x - 220 - 70, safe.position.y), Vector2(220, 150)))
		# Compass markers at screen edge.
		_draw_compass(run, vp, font)
		# Ability button.
		_draw_ability(run, font)
		# Joystick.
		if hud.touch_id != -1:
			draw_circle(hud.touch_origin, 78.0, Color(1, 1, 1, 0.06))
			draw_arc(hud.touch_origin, 78.0, 0.0, TAU, 40, Color(1, 1, 1, 0.25), 2.0)
			draw_circle(hud.touch_origin + hud.touch_vector * 78.0, 30.0, Color(1, 1, 1, 0.35))
		elif String(Profile.setting("joystick_mode")) == "fixed" and DisplayServer.is_touchscreen_available():
			var c: Vector2 = hud._fixed_stick_center()
			draw_arc(c, 78.0, 0.0, TAU, 40, Color(1, 1, 1, 0.15), 2.0)
		# Gate extraction ring progress in screen space.
		if run.extract_progress > 0.0:
			var sp: Vector2 = run.get_viewport().get_canvas_transform() * run.player.position
			draw_arc(sp, 52.0, -PI / 2.0, -PI / 2.0 + TAU * run.extract_progress / GameRun.EXTRACT_TIME, 48, Color("68ecff"), 6.0)

	func _draw_force_meters(run: GameRun, origin: Vector2, font: Font) -> void:
		var x: float = origin.x
		var w: WeaponSystem = run.weapons
		var entries: Array = []
		for fid: String in GameData.FORCES.keys():
			var lvl: int = w.force_level(fid)
			if lvl <= 0:
				continue
			var value: float = -1.0
			match fid:
				"pulse_width_codex":
					value = w.build / 100.0 if w.drop_time <= 0.0 else 1.0
				"ghost_driver_unit":
					value = w.momentum
				"warm_circuits_rise":
					value = w.jam
				"minor_collapse":
					value = w.swell
				"supersonic_being":
					value = fmod(w.hype, 15.0) / 15.0
			entries.append([fid, lvl, value])
		for e: Array in entries:
			var f: Dictionary = GameData.FORCES[String(e[0])]
			var col: Color = f["color"]
			var text: String = "%s %d" % [String(f["mechanic"]), int(e[1])]
			draw_string(font, Vector2(x, origin.y + 14), text, HORIZONTAL_ALIGNMENT_LEFT, -1, UiTheme.fs(12), col)
			var tw: float = font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, UiTheme.fs(12)).x
			if float(e[2]) >= 0.0:
				draw_rect(Rect2(Vector2(x, origin.y + 20), Vector2(tw, 4)), Color(col, 0.2))
				draw_rect(Rect2(Vector2(x, origin.y + 20), Vector2(tw * float(e[2]), 4)), col)
			x += tw + 18.0

	func _draw_minimap(run: GameRun, rect: Rect2) -> void:
		var world: ExpeditionWorld = run.world
		var hs: Vector2 = world.half_size
		var sc: float = minf(rect.size.x / (hs.x * 2.0), rect.size.y / (hs.y * 2.0))
		var center: Vector2 = rect.get_center()
		draw_rect(rect, Color(0.02, 0.03, 0.07, 0.75))
		var to_map: Callable = func(p: Vector2) -> Vector2: return center + p * sc
		for rid: String in world.region_ids:
			var r: Dictionary = GameData.REGIONS[rid]
			var col: Color = r["color"]
			if String(r["shape"]) == "capsule":
				draw_line(to_map.call(r["a"]), to_map.call(r["b"]), Color(col, 0.22), float(r["radius"]) * 2.0 * sc)
			else:
				draw_circle(to_map.call(r["center"]), float(r["radius"]) * sc, Color(col, 0.16))
		# Fog: unexplored cells are darker unless the survey chart is known.
		# Baked into a tiny texture, rebuilt only when exploration changes,
		# instead of ~700 rectangles every frame.
		if not run.map_revealed:
			var fog: ImageTexture = _fog_texture(run, hs)
			if fog:
				draw_texture_rect(fog, Rect2(to_map.call(-hs), hs * 2.0 * sc), false)
		for poi: Dictionary in run.pois.items:
			if not bool(poi.known) or bool(poi.claimed) and String(poi.kind) != "resonator":
				continue
			if not run.pois.is_visible_poi(poi) and not bool(poi.get("revealed", false)):
				continue
			var mp: Vector2 = to_map.call(poi.pos)
			var c: Color = poi.color
			match String(poi.kind):
				"signal", "character":
					draw_circle(mp, 4.0, c)
					draw_arc(mp, 6.5, 0.0, TAU, 12, Color(c, 0.6), 1.0)
				"cache", "fracture_cache":
					draw_rect(Rect2(mp - Vector2(2, 2), Vector2(4, 4)), c)
				_:
					draw_circle(mp, 2.5, c)
		var g: Vector2 = to_map.call(world.gate)
		draw_arc(g, 5.0, 0.0, TAU, 16, Color("68ecff"), 2.0)
		if run.boss and is_instance_valid(run.boss) and not run.boss.dead:
			draw_circle(to_map.call(run.boss.position), 5.0, Color("ff376f"))
		var pp: Vector2 = to_map.call(run.player.position)
		var f: Vector2 = Vector2.from_angle(run.player.facing)
		draw_colored_polygon(PackedVector2Array([pp + f * 6.0, pp + f.rotated(2.4) * 4.0, pp + f.rotated(-2.4) * 4.0]), Color.WHITE)
		draw_rect(rect, Color(1, 1, 1, 0.2), false, 1.0)
		draw_string(UiTheme.font("bold"), rect.position + Vector2(6, rect.size.y + 16), "MAP [M]", HORIZONTAL_ALIGNMENT_LEFT, -1, UiTheme.fs(11), Color(1, 1, 1, 0.45))

	var _fog_tex: ImageTexture
	var _fog_count: int = -1

	func _fog_texture(run: GameRun, hs: Vector2) -> ImageTexture:
		if run.explored.size() == _fog_count and _fog_tex:
			return _fog_tex
		_fog_count = run.explored.size()
		var cell: float = 400.0
		var w: int = int(ceil(hs.x * 2.0 / cell))
		var h: int = int(ceil(hs.y * 2.0 / cell))
		var img: Image = Image.create(w, h, false, Image.FORMAT_RGBA8)
		img.fill(Color(0.0, 0.0, 0.02, 0.55))
		var ox: int = floori(-hs.x / cell)
		var oy: int = floori(-hs.y / cell)
		for key: Vector2i in run.explored.keys():
			var px: int = key.x - ox
			var py: int = key.y - oy
			if px >= 0 and py >= 0 and px < w and py < h:
				img.set_pixel(px, py, Color(0, 0, 0, 0))
		if _fog_tex == null:
			_fog_tex = ImageTexture.create_from_image(img)
		else:
			_fog_tex.set_image(img)
		return _fog_tex

	func _draw_compass(run: GameRun, vp: Vector2, font: Font) -> void:
		var targets: Array = []
		var assist: bool = bool(Profile.setting("nav_assist"))
		var p: Vector2 = run.player.position
		if run.boss_spawned and not run.boss_defeated and run.boss and is_instance_valid(run.boss):
			targets.append([run.boss.position, "THE SILENCE", Color("ff376f")])
		else:
			if run.climax_available() or run.elapsed > 900.0 or (run.player.hp < run.player.max_hp * 0.3):
				targets.append([run.world.gate, "GATE", Color("68ecff")])
			var echo: Dictionary = run.pois.nearest_unclaimed(p, ["echo"], true)
			if not echo.is_empty():
				targets.append([echo.pos, "ECHO %ds" % int(float(echo.life)), echo.color])
			var sig: Dictionary = run.pois.nearest_unclaimed(p, ["signal", "character"], true)
			if not sig.is_empty() and (assist or p.distance_to(sig.pos) < 1400.0):
				targets.append([sig.pos, String(sig.title), sig.color])
			if assist:
				var other: Dictionary = run.pois.nearest_unclaimed(p, ["artifact", "fragment", "anomaly", "mirror"], true)
				if not other.is_empty():
					targets.append([other.pos, String(other.title), Color(other.color, 0.7)])
		for a: Array in hud.alerts:
			targets.append([a[1], String(a[0]), Color("ffb35c")])
		var xf: Transform2D = run.get_viewport().get_canvas_transform()
		var center: Vector2 = vp * 0.5
		var radii: Vector2 = vp * 0.5 - Vector2(70, 70)
		for t: Array in targets:
			var sp: Vector2 = xf * Vector2(t[0])
			if Rect2(Vector2(60, 60), vp - Vector2(120, 120)).has_point(sp):
				continue
			var dir: Vector2 = (sp - center).normalized()
			var edge: Vector2 = center + Vector2(dir.x * radii.x, dir.y * radii.y)
			# Keep compass markers below the top HUD band (bars, labels, minimap).
			edge.y = maxf(edge.y, hud.safe.position.y + 200.0)
			var col: Color = t[2]
			draw_colored_polygon(PackedVector2Array([edge + dir * 14.0, edge + dir.rotated(2.5) * 10.0, edge + dir.rotated(-2.5) * 10.0]), col)
			var dist: int = int(p.distance_to(Vector2(t[0])) / 10.0)
			var txt: String = "%s  %dm" % [String(t[1]), dist]
			var tw: float = font.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, UiTheme.fs(12)).x
			var tp: Vector2 = edge - dir * 26.0 - Vector2(tw * 0.5, -4)
			tp.x = clampf(tp.x, 8.0, vp.x - tw - 8.0)
			draw_string_outline(font, tp, txt, HORIZONTAL_ALIGNMENT_LEFT, -1, UiTheme.fs(12), 4, Color(0, 0, 0, 0.7))
			draw_string(font, tp, txt, HORIZONTAL_ALIGNMENT_LEFT, -1, UiTheme.fs(12), col)

	func _draw_ability(run: GameRun, font: Font) -> void:
		var b: Button = hud.ability_button
		var c: Vector2 = b.position + b.size * 0.5
		var r: float = 58.0
		var accent: Color = GameData.CHARACTERS[run.character_id]["accent"]
		var cd_total: float = run.ability_cooldown()
		var ready: bool = run.ability_cd <= 0.0 or run._naomi_charges > 0
		draw_circle(c, r, Color(0.03, 0.05, 0.1, 0.75))
		if ready:
			draw_arc(c, r, 0.0, TAU, 48, Color(accent, 0.9), 4.0)
			draw_circle(c, r * (0.86 + hud.beat_pulse * 0.04), Color(accent, 0.12))
		else:
			var t: float = 1.0 - run.ability_cd / maxf(0.1, cd_total)
			draw_arc(c, r, -PI / 2.0, -PI / 2.0 + TAU * t, 48, Color(accent, 0.6), 4.0)
			draw_string(font, c + Vector2(-20, 8), "%d" % int(ceil(run.ability_cd)), HORIZONTAL_ALIGNMENT_CENTER, 40, UiTheme.fs(20), Color(1, 1, 1, 0.7))
		var name: String = String(run.ability_def()["name"]).to_upper()
		var w: float = font.get_string_size(name, HORIZONTAL_ALIGNMENT_LEFT, -1, UiTheme.fs(11)).x
		draw_string(font, c + Vector2(-w * 0.5, r + 18.0), name, HORIZONTAL_ALIGNMENT_LEFT, -1, UiTheme.fs(11), Color(1, 1, 1, 0.65))
		if ready:
			draw_string(font, c + Vector2(-30, 6), "READY", HORIZONTAL_ALIGNMENT_CENTER, 60, UiTheme.fs(14), Color(accent, 0.95))

class MapOverlay:
	extends Control
	var hud: Node

	func _draw() -> void:
		var run: GameRun = hud.run
		var vp: Vector2 = get_viewport_rect().size
		draw_rect(Rect2(Vector2.ZERO, vp), Color(0.01, 0.02, 0.05, 0.93))
		var world: ExpeditionWorld = run.world
		var hs: Vector2 = world.half_size
		var area: Rect2 = Rect2(Vector2(40, 70), vp - Vector2(80, 120))
		var sc: float = minf(area.size.x / (hs.x * 2.0), area.size.y / (hs.y * 2.0))
		var center: Vector2 = area.get_center()
		var font: Font = UiTheme.font("bold")
		draw_string(UiTheme.font("display"), Vector2(40, 48), GameData.DESTINATIONS[run.destination_id]["name"].to_upper(), HORIZONTAL_ALIGNMENT_LEFT, -1, UiTheme.fs(28), Color.WHITE)
		draw_string(font, Vector2(vp.x - 340, 48), "Tap or press M to close", HORIZONTAL_ALIGNMENT_LEFT, -1, UiTheme.fs(14), UiTheme.DIM)
		draw_rect(Rect2(center - hs * sc, hs * 2.0 * sc), Color(0.03, 0.05, 0.1), true)
		for rid: String in world.region_ids:
			var r: Dictionary = GameData.REGIONS[rid]
			var col: Color = r["color"]
			var anchor: Vector2 = center + GameData.region_anchor(r) * sc
			if String(r["shape"]) == "capsule":
				draw_line(center + Vector2(r["a"]) * sc, center + Vector2(r["b"]) * sc, Color(col, 0.25), float(r["radius"]) * 2.0 * sc)
			else:
				draw_circle(anchor, float(r["radius"]) * sc, Color(col, 0.18))
				draw_arc(anchor, float(r["radius"]) * sc, 0.0, TAU, 48, Color(col, 0.4), 1.5)
			var known: bool = rid in run.visited_regions or run.map_revealed
			var name: String = String(r["name"]) if known else "?"
			var w: float = font.get_string_size(name, HORIZONTAL_ALIGNMENT_LEFT, -1, UiTheme.fs(14)).x
			draw_string(font, anchor - Vector2(w * 0.5, 0), name, HORIZONTAL_ALIGNMENT_LEFT, -1, UiTheme.fs(14), Color(col, 0.9))
		if not run.map_revealed:
			var cell: float = 400.0
			var x: float = -hs.x
			while x < hs.x:
				var y: float = -hs.y
				while y < hs.y:
					if not run.explored.has(Vector2i(floori(x / cell), floori(y / cell))):
						draw_rect(Rect2(center + Vector2(x, y) * sc, Vector2(cell, cell) * sc + Vector2(0.6, 0.6)), Color(0, 0, 0.02, 0.5))
					y += cell
				x += cell
		for poi: Dictionary in run.pois.items:
			if not bool(poi.known):
				continue
			if not run.pois.is_visible_poi(poi) and not bool(poi.get("revealed", false)):
				continue
			var mp: Vector2 = center + Vector2(poi.pos) * sc
			var c: Color = poi.color
			if bool(poi.claimed) and String(poi.kind) != "resonator":
				draw_arc(mp, 5.0, 0.0, TAU, 12, Color(c, 0.4), 1.5)
				continue
			draw_circle(mp, 6.0 if String(poi.kind) in ["signal", "character"] else 4.0, c)
			if String(poi.kind) in ["signal", "character", "artifact", "anomaly", "mirror"]:
				draw_string(font, mp + Vector2(9, 5), String(poi.title), HORIZONTAL_ALIGNMENT_LEFT, -1, UiTheme.fs(12), Color(c, 0.85))
		var g: Vector2 = center + world.gate * sc
		draw_arc(g, 9.0, 0.0, TAU, 20, Color("68ecff"), 2.5)
		draw_string(font, g + Vector2(12, -8), run.gate_name() + " (way home)", HORIZONTAL_ALIGNMENT_LEFT, -1, UiTheme.fs(12), Color("68ecff"))
		var pp: Vector2 = center + run.player.position * sc
		var f: Vector2 = Vector2.from_angle(run.player.facing)
		draw_colored_polygon(PackedVector2Array([pp + f * 10.0, pp + f.rotated(2.4) * 7.0, pp + f.rotated(-2.4) * 7.0]), Color.WHITE)
		var legend: String = "●  signal / contact     ■  cache     ◯  resolved     Hidden sites appear in RESONANCE, FRACTURE, or to scanners."
		draw_string(font, Vector2(40, vp.y - 20), legend, HORIZONTAL_ALIGNMENT_LEFT, vp.x - 80, UiTheme.fs(13), UiTheme.DIM)
