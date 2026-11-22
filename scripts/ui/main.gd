extends Node
## Screen flow: Title → Departure → Expedition → Results → Archive/Workshop.

var ui_layer: CanvasLayer
var screen: Control
var theme_res: Theme
var current_run: GameRun
var selected_character: String = "ella_venn"
var selected_force: String = "pulse_width_codex"
var selected_destination: String = "black_drift_reach"
var last_result: Dictionary = {}
var last_commit: Dictionary = {}

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(TouchScroll.new())
	ui_layer = CanvasLayer.new()
	ui_layer.layer = 5
	add_child(ui_layer)
	theme_res = UiTheme.build()
	Profile.settings_changed.connect(func() -> void: theme_res = UiTheme.build())
	get_window().size_changed.connect(_apply_ui_scale)
	_apply_ui_scale()
	selected_character = String(Profile.data.get("last_character", "ella_venn"))
	selected_destination = String(Profile.data.get("last_destination", "black_drift_reach"))
	if not Profile.has_character(selected_character):
		selected_character = "ella_venn"
	var recovered: Dictionary = Profile.recover_interrupted_run()
	show_title()
	if Profile.last_load_note != "":
		_toast(Profile.last_load_note)
	if not recovered.is_empty():
		_toast("Your last expedition was interrupted — progress kept: %d discoveries, +%d signal." % [int(recovered["discoveries"]), int(recovered["currency"])])

func _menu_music() -> void:
	Audio.stop_catalog()
	Audio.set_mix({"menu": 0.9, "bed": 0.35})

# ================================================================== scaffolding

func _new_screen() -> VBoxContainer:
	if current_run and is_instance_valid(current_run):
		current_run.queue_free()
		current_run = null
	get_tree().paused = false
	if screen and is_instance_valid(screen):
		screen.queue_free()
	screen = Control.new()
	screen.theme = theme_res
	screen.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui_layer.add_child(screen)
	var bg: MenuBackdrop = MenuBackdrop.new()
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	screen.add_child(bg)
	var margin: MarginContainer = MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var ins: Vector4 = ScreenInsets.get_insets(get_viewport().get_visible_rect().size)
	var side_m: int = 20 if UiTheme.is_narrow() else 48
	margin.add_theme_constant_override("margin_left", side_m + int(ins.x))
	margin.add_theme_constant_override("margin_right", side_m + int(ins.z))
	margin.add_theme_constant_override("margin_top", 28 + int(ins.y))
	margin.add_theme_constant_override("margin_bottom", 28 + int(ins.w))
	screen.add_child(margin)
	# Short windows (phones, browser panels) scroll instead of clipping.
	var scroll: ScrollContainer = ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	margin.add_child(scroll)
	var v: VBoxContainer = VBoxContainer.new()
	v.add_theme_constant_override("separation", 14)
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.add_child(v)
	return v

## Full screen. In a browser it needs the host page's permission, and iPhone
## browsers only allow it for video, so the button only appears where the
## browser reports it can work.
static func can_fullscreen() -> bool:
	if OS.has_feature("web"):
		return bool(JavaScriptBridge.eval("!!(document.fullscreenEnabled || document.webkitFullscreenEnabled)", true))
	return not OS.has_feature("mobile")

static func is_fullscreen() -> bool:
	return DisplayServer.window_get_mode() in [DisplayServer.WINDOW_MODE_FULLSCREEN, DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN]

static func toggle_fullscreen() -> void:
	DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED if is_fullscreen() else DisplayServer.WINDOW_MODE_FULLSCREEN)

## The next thing of a kind ("character" or "force") the Corridor Chart will
## give, in chart order: {"id", "stop"} or {} when none is waiting.
func _next_unlock(kind: String) -> Dictionary:
	for st: Dictionary in GameData.CHART:
		if Profile.stop_done(String(st["id"])):
			continue
		if kind == "character":
			for c: Variant in (st["grants"] as Dictionary).get("characters", []):
				if not Profile.has_character(String(c)):
					return {"id": String(c), "stop": st}
		for did: Variant in st["discoveries"]:
			var d: Dictionary = GameData.DISCOVERIES[String(did)]
			if kind == "character" and String(d.get("unlock_character", "")) != "" and not Profile.has_character(String(d["unlock_character"])):
				return {"id": String(d["unlock_character"]), "stop": st}
			if kind == "force" and String(d.get("force", "")) != "" and not Profile.is_attuned(String(d["force"])):
				return {"id": String(d["force"]), "stop": st}
	return {}

## The single line that stands in for everything not yet found.
func _more_line(text: String) -> Label:
	return UiTheme.label(text, 15, Color("bfe9ff"))

## Usable width of a menu screen's content column.
func _content_width() -> float:
	return get_viewport().get_visible_rect().size.x - 2.0 * (20.0 if UiTheme.is_narrow() else 48.0) - 24.0

func _heading(parent: Control, text: String, sub: String = "") -> void:
	var t: Label = UiTheme.label(text, 30 if UiTheme.is_narrow() else 40, Color.WHITE, "display")
	parent.add_child(t)
	if sub != "":
		parent.add_child(UiTheme.label(sub, 16, UiTheme.DIM))

## Keeps text readable in small windows (browser panels, phones): the layout
## is designed at 1280x720, but when the window is too small to show it at
## READABLE_SCALE CSS pixels per design pixel, the design canvas shrinks
## instead, down to MIN_LAYOUT so every screen still fits.
const DESIGN_SIZE: Vector2 = Vector2(1280, 720)
const MIN_LAYOUT: Vector2 = Vector2(880, 500)
const READABLE_SCALE: float = 1.0
const PORTRAIT_WIDTH: float = 540.0

func _apply_ui_scale() -> void:
	var win: Window = get_window()
	var dpr: float = maxf(1.0, DisplayServer.screen_get_scale())
	var css: Vector2 = Vector2(win.size) / dpr
	if css.x < 2.0 or css.y < 2.0:
		return
	var fit: float = minf(css.x / DESIGN_SIZE.x, css.y / DESIGN_SIZE.y)
	var layout: Vector2 = DESIGN_SIZE
	if css.y > css.x * 1.1:
		# Portrait: a narrow layout, never wider than PORTRAIT_WIDTH units,
		# so an upright phone shows text at a readable size (the landscape
		# minimum of 880 shrank everything to ~44% on a 390-pt phone).
		var w: float = clampf(css.x / READABLE_SCALE, PORTRAIT_WIDTH, 620.0)
		layout = Vector2(w, css.y * w / css.x)
	elif fit < READABLE_SCALE:
		layout = (css / READABLE_SCALE).max(MIN_LAYOUT)
	var target: Vector2i = Vector2i(layout.round())
	if win.content_scale_size != target:
		win.content_scale_size = target

## Canonical artwork imported by tools/import_reference_assets.py.
func _art(path: String, size: Vector2) -> TextureRect:
	if not ResourceLoader.exists(path):
		return null
	var tr: TextureRect = TextureRect.new()
	tr.texture = load(path)
	tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	tr.custom_minimum_size = size
	return tr

func _portrait(cid: String, size: float) -> TextureRect:
	var key: String = String(GameData.CHARACTERS.get(cid, {}).get("portrait", cid))
	return _art("res://assets/characters/%s_256.png" % key, Vector2(size, size))

func _project_force(pname: String) -> String:
	for fid: String in GameData.FORCES.keys():
		if String(GameData.FORCES[fid]["name"]) == pname:
			return fid
	return pname.to_lower().replace(" ", "_")

func _toast(text: String) -> void:
	if screen == null:
		return
	var l: Label = UiTheme.label(text, 17, UiTheme.GOLD, "bold")
	var stacked: int = 0
	for c: Node in screen.get_children():
		if c.has_meta("toast"):
			stacked += 1
	l.set_meta("toast", true)
	l.position = Vector2(48, 672 - stacked * 34)
	screen.add_child(l)
	var tw: Tween = create_tween()
	tw.tween_interval(6.0)
	tw.tween_property(l, "modulate:a", 0.0, 0.8)
	tw.tween_callback(l.queue_free)

func _back_row(parent: Control, callback: Callable) -> void:
	var row: HBoxContainer = HBoxContainer.new()
	parent.add_child(row)
	var b: Button = UiTheme.button("BACK", callback, 200.0, 50.0)
	row.add_child(b)

# ================================================================== title

func show_title() -> void:
	var v: VBoxContainer = _new_screen()
	_menu_music()
	var spacer: Control = Control.new()
	spacer.custom_minimum_size = Vector2(0, 40 if get_viewport().get_visible_rect().size.y >= 640 else 0)
	v.add_child(spacer)
	var title: Label = UiTheme.label("STAR SPLITTER FORCES", 46 if UiTheme.is_narrow() else 64, Color.WHITE, "display")
	v.add_child(title)
	v.add_child(UiTheme.label("I wonder what is over there.", 20, UiTheme.ACCENT))
	var row: BoxContainer = UiTheme.row(40)
	row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(row)
	var menu: VBoxContainer = VBoxContainer.new()
	menu.add_theme_constant_override("separation", 10)
	row.add_child(menu)
	var nxt: String = Profile.next_stop()
	var begin_text: String = "CORRIDOR CHART"
	if nxt != "":
		begin_text = ("BEGIN — " if Profile.stops_done_count() == 0 else "CONTINUE — ") + GameData.stage_tag(nxt)
	var begin: Button = UiTheme.button(begin_text, func() -> void: show_chart(), 340.0, 60.0)
	menu.add_child(begin)
	if Profile.has_feature("open_reach"):
		menu.add_child(UiTheme.button("OPEN EXPEDITION", func() -> void:
			selected_stop = ""
			show_departure(), 340.0))
	menu.add_child(UiTheme.button("STAR SPLITTER ARCHIVE", show_archive, 340.0))
	if Profile.has_feature("workshop"):
		var ready_n: int = workshop_affordable()
		var wb: Button = UiTheme.button("FLEET WORKSHOP" + ("  •  %d READY" % ready_n if ready_n > 0 else ""), show_workshop, 340.0)
		if ready_n > 0:
			wb.add_theme_color_override("font_color", UiTheme.GOLD)
		menu.add_child(wb)
	if can_fullscreen():
		menu.add_child(UiTheme.button("FULL SCREEN" if not is_fullscreen() else "EXIT FULL SCREEN", func() -> void:
			toggle_fullscreen()
			show_title(), 340.0))
	menu.add_child(UiTheme.button("SETTINGS", show_settings, 340.0))
	menu.add_child(UiTheme.button("CREDITS", show_credits, 340.0))
	if OS.is_debug_build():
		menu.add_child(UiTheme.button("QUICK TEST (dev)", func() -> void: start_expedition(true), 340.0, 44.0))
	var info: VBoxContainer = VBoxContainer.new()
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info.add_theme_constant_override("separation", 6)
	row.add_child(info)
	var s: Dictionary = Profile.data["stats"]
	var discovered: int = Profile.discovered_count()
	var total: int = GameData.DISCOVERIES.size()
	info.add_child(UiTheme.label("CORRIDOR: %d / %d BEACONS RELIT   •   ARCHIVE %d / %d" % [Profile.stops_done_count(), GameData.CHART.size(), discovered, total], 15, UiTheme.GOLD, "bold"))
	info.add_child(UiTheme.label("Records heard %d / %d   •   Signal %d" % [(Profile.data["transmissions"] as Array).size(), GameData.TRANSMISSIONS.size(), int(Profile.data["currency"])], 15, UiTheme.DIM))
	var next: String = _next_goal_text()
	if next != "":
		info.add_child(UiTheme.label(next, 16, Color("bfe9ff")))
	v.add_child(UiTheme.label("Characters from Rex Fleet. Forces from Star Splitter Records. A provisional pre-release build.", 13, Color(1, 1, 1, 0.35)))
	begin.grab_focus()

func _next_goal_text() -> String:
	var nxt: String = Profile.next_stop()
	if nxt != "":
		var st: Dictionary = GameData.chart_stop(nxt)
		return "NEXT: %s — %s" % [String(st["name"]), String(st["reward"][0])]
	if int(Profile.data["stats"]["expeditions"]) == 0:
		return "Your first expedition: follow the columns of light, tune three signals, and come home."
	var unseen_signals: int = 0
	for id: String in GameData.DISCOVERIES.keys():
		if String(GameData.DISCOVERIES[id]["kind"]) == "signal" and not Profile.is_discovered(id):
			unseen_signals += 1
	if unseen_signals > 0:
		return "%d signal%s still unheard somewhere in the Reach." % [unseen_signals, "" if unseen_signals == 1 else "s"]
	return "Every signal in the Reach is charted. Hunt the hidden sites — some only show themselves in Fracture or Resonance."

# ================================================================== corridor chart

var selected_stop: String = ""
var workshop_after: String = ""

## The spine of the game: pick the next beacon to relight.
func show_chart(focus: String = "", chapter: int = 0) -> void:
	var v: VBoxContainer = _new_screen()
	_menu_music()
	var pick: String = focus
	if pick == "" or GameData.chart_stop(pick).is_empty():
		pick = Profile.next_stop()
	if pick == "":
		pick = String(GameData.chart_main()[-1]["id"])
	if chapter <= 0:
		chapter = GameData.chart_chapter(pick)
	elif GameData.chart_chapter(pick) != chapter:
		pick = ""
		for st0: Dictionary in GameData.chart_main(chapter):
			if pick == "" and not Profile.stop_done(String(st0["id"])):
				pick = String(st0["id"])
		if pick == "":
			pick = String(GameData.chart_main(chapter)[-1]["id"])
	var head: BoxContainer = UiTheme.row(4 if UiTheme.is_narrow() else 18)
	v.add_child(head)
	var ht: Label = UiTheme.label("CORRIDOR CHART", 26, Color.WHITE, "display")
	ht.autowrap_mode = TextServer.AUTOWRAP_OFF
	head.add_child(ht)
	# Chapter switch: a chapter opens when the one before it is finished.
	var tabs_row: HBoxContainer = HBoxContainer.new()
	tabs_row.add_theme_constant_override("separation", 8)
	tabs_row.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	head.add_child(tabs_row)
	for cdef: Dictionary in GameData.CHAPTERS:
		var cid: int = int(cdef["id"])
		var first: Array = GameData.chart_main(cid)
		var open_ch: bool = not first.is_empty() and (Profile.stop_available(String(first[0]["id"])) or Profile.stop_done(String(first[0]["id"])))
		var tb: Button = UiTheme.button(("%s  %s" % [String(cdef["numeral"]), String(cdef["name"]).to_upper()]) if open_ch else "%s  ?" % String(cdef["numeral"]), func() -> void: show_chart("", cid), 0.0, 40.0)
		tb.disabled = not open_ch
		tb.add_theme_font_size_override("font_size", UiTheme.fs(13))
		if cid == chapter:
			tb.add_theme_stylebox_override("normal", UiTheme.box(UiTheme.PANEL_HI, UiTheme.ACCENT, 2, 10, 10))
		tabs_row.add_child(tb)
	var sc: ScrollContainer = ScrollContainer.new()
	sc.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	# The lane shrinks on short screens so the briefing always fits below it.
	var vh: float = get_viewport().get_visible_rect().size.y
	var k: float = clampf((vh - (620.0 if UiTheme.is_narrow() else 392.0)) / 342.0, 0.5, 1.0)
	sc.custom_minimum_size = Vector2(0, 342.0 * k)
	v.add_child(sc)
	var holder: Control = Control.new()
	sc.add_child(holder)
	var chart: ChartView = ChartView.new(chapter)
	chart.scale = Vector2(k, k)
	holder.add_child(chart)
	holder.custom_minimum_size = chart.custom_minimum_size * k
	var brief: PanelContainer = PanelContainer.new()
	brief.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.PANEL, UiTheme.LINE, 1, 12, 16))
	v.add_child(brief)
	chart.stop_selected.connect(func(id: String) -> void:
		selected_stop = id
		_fill_briefing(brief, id))
	chart.select(pick)
	# Bring the chosen beacon into view.
	await get_tree().process_frame
	if is_instance_valid(sc) and chart.positions.has(pick):
		sc.scroll_horizontal = int(maxf(0.0, Vector2(chart.positions[pick]).x * k - sc.size.x * 0.45))

func _fill_briefing(panel: PanelContainer, id: String) -> void:
	for c: Node in panel.get_children():
		c.queue_free()
	var st: Dictionary = GameData.chart_stop(id)
	var done: bool = Profile.stop_done(id)
	var open: bool = Profile.stop_available(id)
	var num: int = GameData.chart_number(id)
	var h: BoxContainer = UiTheme.row(20)
	panel.add_child(h)
	var col: VBoxContainer = VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 3)
	h.add_child(col)
	if not open and not done:
		# Past the next beacon the corridor is still dark: no spoilers.
		col.add_child(UiTheme.label(GameData.stage_tag(id), 13, UiTheme.DIM, "bold"))
		col.add_child(UiTheme.label("UNCHARTED", 20, UiTheme.DIM, "display"))
		col.add_child(UiTheme.label("Further down the corridor. Relight the beacon before it to see what waits here.", 14, UiTheme.DIM))
		col.add_child(UiTheme.button("BACK", show_title, 250.0, 42.0))
		return
	var tag: String = GameData.stage_tag(id) + "   •   " + String(st["place"]).to_upper() + ("   •   LIT" if done else "")
	col.add_child(UiTheme.label(tag, 13, Color("68ecff") if done else UiTheme.GOLD, "bold"))
	col.add_child(UiTheme.label(String(st["name"]).to_upper(), 20, Color.WHITE, "display"))
	if not open and not done:
		var need: String = String(GameData.chart_stop(String(st["side_of"]) if st.has("side_of") else GameData.chart_prev_main(id))["name"])
		col.add_child(UiTheme.label("Still dark. Relight \"%s\" first." % need, 15, UiTheme.DIM))
		col.add_child(UiTheme.label("REWARD WAITING: " + "  •  ".join(st["reward"]), 14, Color(UiTheme.GOLD, 0.7)))
	else:
		if get_viewport().get_visible_rect().size.y >= 600.0 or UiTheme.is_narrow():
			col.add_child(UiTheme.label(String(st["brief"]), 13, UiTheme.TEXT))
		col.add_child(UiTheme.label("OBJECTIVE: " + GameData.chart_objective_text(st), 15, Color("a8f7ff"), "bold"))
		col.add_child(UiTheme.label(("EARNED: " if done else "REWARD: ") + "  •  ".join(st["reward"]), 15, UiTheme.GOLD, "bold"))
		var unheard: int = GameData.unheard_roaming(Profile.data["discovered"]).size()
		if unheard > 0:
			col.add_child(UiTheme.label("♪ One unheard record is hidden somewhere on every run (%d left to find)." % unheard, 13, Color("bfe9ff")))
	var side: BoxContainer = BoxContainer.new()
	side.vertical = true
	side.add_theme_constant_override("separation", 8)
	side.alignment = BoxContainer.ALIGNMENT_CENTER
	h.add_child(side)
	var go: Button = UiTheme.button("CHOOSE EXPLORER  →" if not done else "PLAY AGAIN  →", show_departure, 250.0, 54.0)
	go.disabled = not open and not done
	go.add_theme_color_override("font_color", UiTheme.ACCENT)
	side.add_child(go)
	side.add_child(UiTheme.button("BACK", show_title, 250.0, 42.0))
	if not go.disabled:
		go.grab_focus()

# ================================================================== departure

func show_departure() -> void:
	var v: VBoxContainer = _new_screen()
	_heading(v, "DEPARTURE", "Choose an explorer and the Force you carry out of the gate.")
	var row: BoxContainer = UiTheme.row(18)
	row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(row)
	# Explorers.
	var list_scroll: ScrollContainer = ScrollContainer.new()
	list_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	list_scroll.custom_minimum_size = Vector2(340, 0) if not UiTheme.is_narrow() else Vector2(0, 230)
	row.add_child(list_scroll)
	var list: VBoxContainer = VBoxContainer.new()
	list.add_theme_constant_override("separation", 8)
	list.custom_minimum_size = Vector2(330, 0)
	list_scroll.add_child(list)
	list.add_child(UiTheme.label("EXPLORER", 13, UiTheme.DIM, "bold"))
	var first: Button = null
	var locked_count: int = 0
	for cid: String in GameData.CHARACTERS.keys():
		var c: Dictionary = GameData.CHARACTERS[cid]
		var unlocked: bool = Profile.has_character(cid)
		if not unlocked:
			locked_count += 1
			continue # only explorers you have; the next one is named below
		var b: Button = UiTheme.button((String(c["name"]) if unlocked else "UNKNOWN CONTACT"), func() -> void:
			selected_character = cid
			show_departure(), 330.0, 50.0)
		b.disabled = not unlocked
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		if cid == selected_character:
			b.add_theme_stylebox_override("normal", UiTheme.box(UiTheme.PANEL_HI, c["accent"], 2, 10, 16))
		list.add_child(b)
		if first == null and unlocked:
			first = b
	if locked_count > 0:
		var nxt: Dictionary = _next_unlock("character")
		var hint: String = "%d more explorer%s to find." % [locked_count, "" if locked_count == 1 else "s"]
		if not nxt.is_empty():
			hint += " Next: %s (stage \"%s\")." % [String(GameData.CHARACTERS[String(nxt["id"])]["name"]), String(nxt["stop"]["name"])]
		var hl: Label = UiTheme.label(hint, 13, UiTheme.DIM)
		hl.custom_minimum_size.x = 320.0 if not UiTheme.is_narrow() else _content_width()
		list.add_child(hl)
	# Detail.
	var c2: Dictionary = GameData.CHARACTERS[selected_character]
	var detail_scroll: ScrollContainer = ScrollContainer.new()
	detail_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	detail_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	detail_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	row.add_child(detail_scroll)
	var detail: PanelContainer = PanelContainer.new()
	detail.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	detail.add_theme_stylebox_override("panel", UiTheme.box(Color(UiTheme.PANEL, 0.9), Color(c2["accent"], 0.6), 1, 14, 20))
	detail_scroll.add_child(detail)
	var dv: VBoxContainer = VBoxContainer.new()
	dv.add_theme_constant_override("separation", 6)
	detail.add_child(dv)
	var ch_head: HBoxContainer = HBoxContainer.new()
	ch_head.add_theme_constant_override("separation", 14)
	dv.add_child(ch_head)
	var pic: TextureRect = _portrait(selected_character, 112.0)
	if pic:
		ch_head.add_child(pic)
	var ch_txt: VBoxContainer = VBoxContainer.new()
	ch_txt.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ch_head.add_child(ch_txt)
	ch_txt.add_child(UiTheme.label(String(c2["origin"]).to_upper() + "   •   " + String(c2["vessel"]), 13, c2["accent"], "bold"))
	ch_txt.add_child(UiTheme.label(String(c2["name"]), 30, Color.WHITE, "display"))
	ch_txt.add_child(UiTheme.label(String(c2["tagline"]), 16, UiTheme.TEXT))
	dv.add_child(UiTheme.label(String(c2["bio"]), 14, UiTheme.DIM))
	var ab: Dictionary = GameData.ABILITIES[String(c2["ability"])]
	dv.add_child(UiTheme.label("ABILITY — %s (%ds): %s" % [String(ab["name"]), int(ab["cooldown"]), String(ab["desc"])], 14, Color("bfe9ff")))
	dv.add_child(UiTheme.label("TRAIT — " + String(c2["trait"]), 14, Color("9ff7d0")))
	dv.add_child(UiTheme.label("TRADE-OFF — " + String(c2["weakness"]), 14, Color("ff9fb4")))
	dv.add_child(UiTheme.label("HULL %d   •   SPEED %d   •   ARMOUR %.1f" % [int(c2["max_hp"]), int(c2["speed"]), float(c2.get("armor", 0.0))], 14, UiTheme.DIM))
	var m: Dictionary = Profile.mastery(selected_character)
	var perks: Array = GameData.MASTERY[selected_character]
	var mlvl: int = int(m["level"])
	var mtext: String = "MASTERY %d / %d" % [mlvl, perks.size()]
	if mlvl < perks.size():
		mtext += "   •   next: " + String(perks[mlvl]) + " (%d / %d xp)" % [int(m["xp"]), int(GameData.MASTERY_THRESHOLDS[mlvl])]
	dv.add_child(UiTheme.label(mtext, 13, UiTheme.GOLD))
	# Force.
	dv.add_child(UiTheme.label("SIGNATURE FORCE", 13, UiTheme.DIM, "bold"))
	var frow: HFlowContainer = HFlowContainer.new()
	frow.add_theme_constant_override("h_separation", 8)
	frow.add_theme_constant_override("v_separation", 8)
	dv.add_child(frow)
	if not Profile.is_attuned(selected_force):
		selected_force = "pulse_width_codex"
	var unheard: int = 0
	for fid: String in GameData.FORCES.keys():
		var f: Dictionary = GameData.FORCES[fid]
		var att: bool = Profile.is_attuned(fid)
		if not att:
			unheard += 1
			continue
		var fb: Button = UiTheme.button(String(f["name"]), func() -> void:
			selected_force = fid
			show_departure(), 168.0, 40.0)
		fb.disabled = not att
		if fid == selected_force:
			fb.add_theme_stylebox_override("normal", UiTheme.box(UiTheme.PANEL_HI, f["color"], 2, 10, 12))
		fb.add_theme_font_size_override("font_size", UiTheme.fs(14))
		frow.add_child(fb)
	if unheard > 0:
		var nf: Dictionary = _next_unlock("force")
		var ft: String = "%d more Force%s unheard." % [unheard, "" if unheard == 1 else "s"]
		if not nf.is_empty():
			ft += " Next: %s (stage \"%s\")." % [String(GameData.FORCES[String(nf["id"])]["name"]), String(nf["stop"]["name"])]
		dv.add_child(UiTheme.label(ft, 13, UiTheme.DIM))
	var sf: Dictionary = GameData.FORCES[selected_force]
	dv.add_child(UiTheme.label("%s — %s: %s  Starts with %s." % [String(sf["name"]), String(sf["mechanic"]), String(sf["desc"]), GameData.weapon_name(String(sf["primary"]))], 14, sf["color"]))
	# Destination (Open Expedition only; a Corridor stop fixes the place).
	var stop: Dictionary = GameData.chart_stop(selected_stop)
	var unlocked_dests: Array = GameData.DESTINATIONS.keys().filter(func(d: String) -> bool: return Profile.has_destination(d))
	if not selected_destination in unlocked_dests:
		selected_destination = "black_drift_reach"
	if unlocked_dests.size() > 1 and stop.is_empty():
		dv.add_child(UiTheme.label("DESTINATION", 13, UiTheme.DIM, "bold"))
		var drow: HFlowContainer = HFlowContainer.new()
		drow.add_theme_constant_override("h_separation", 8)
		dv.add_child(drow)
		for did: String in GameData.DESTINATIONS.keys():
			var dd: Dictionary = GameData.DESTINATIONS[did]
			var open: bool = did in unlocked_dests
			var db: Button = UiTheme.button(String(dd["name"]) if open else "?  UNCHARTED", func() -> void:
				selected_destination = did
				show_departure(), 240.0, 40.0)
			db.disabled = not open
			db.add_theme_font_size_override("font_size", UiTheme.fs(14))
			if did == selected_destination:
				db.add_theme_stylebox_override("normal", UiTheme.box(UiTheme.PANEL_HI, UiTheme.ACCENT, 2, 10, 12))
			drow.add_child(db)
		var found: int = 0
		var total: int = 0
		for disc: String in GameData.DISCOVERIES.keys():
			if GameData.discovery_in_destination(disc, selected_destination):
				total += 1
				if Profile.is_discovered(disc):
					found += 1
		dv.add_child(UiTheme.label("%s — %d / %d discoveries charted" % [String(GameData.DESTINATIONS[selected_destination]["name"]), found, total], 13, UiTheme.DIM))
	# Launch row.
	var launch: HFlowContainer = HFlowContainer.new()
	launch.add_theme_constant_override("h_separation", 12)
	launch.add_theme_constant_override("v_separation", 8)
	v.add_child(launch)
	launch.add_child(UiTheme.button("BACK", (func() -> void: show_chart(selected_stop)) if not stop.is_empty() else show_title, 180.0, 56.0))
	var dest: Dictionary = GameData.DESTINATIONS[selected_destination]
	var launch_text: String = "LAUNCH — " + String(dest["name"]).to_upper()
	var launch_note: String = String(dest["desc"])
	if not stop.is_empty():
		var sn: int = GameData.chart_number(selected_stop)
		launch_text = "LAUNCH — " + String(stop["name"]).to_upper()
		launch_note = "OBJECTIVE: %s.   REWARD: %s" % [GameData.chart_objective_text(stop), String(stop["reward"][0])]
	var go: Button = UiTheme.button(launch_text, func() -> void: start_expedition(false), 420.0 if not UiTheme.is_narrow() else _content_width() - 192.0, 56.0)
	go.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	go.add_theme_color_override("font_color", UiTheme.ACCENT)
	launch.add_child(go)
	var dl: Label = UiTheme.label(launch_note, 13, UiTheme.DIM if stop.is_empty() else UiTheme.GOLD)
	if UiTheme.is_narrow():
		dl.custom_minimum_size.x = _content_width()
	dl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	launch.add_child(dl)
	go.grab_focus()

# ================================================================== expedition

func start_expedition(quick: bool) -> void:
	if screen:
		screen.queue_free()
		screen = null
	current_run = GameRun.new()
	current_run.setup({"character": selected_character, "destination": selected_destination, "force": selected_force, "quick_test": quick, "stop": "" if quick else selected_stop})
	current_run.finished.connect(_on_run_finished)
	add_child(current_run)

func _on_run_finished(result: Dictionary) -> void:
	last_result = result
	last_commit = Profile.record_expedition(result)
	# Let the final moment breathe before the results screen.
	await get_tree().create_timer(1.2, true, false, true).timeout
	show_results()

func show_results() -> void:
	var v: VBoxContainer = _new_screen()
	var r: Dictionary = last_result
	var title: String = {"complete": "EXPEDITION COMPLETE", "extracted": "SAFE RETURN", "defeat": "LOST SIGNAL"}.get(String(r["outcome"]), "EXPEDITION ENDED")
	var sub: String = {"complete": "The Silence is broken and the Reach can hear itself again.", "extracted": "You came home with what you found.", "defeat": "Your logs reached the gate relays before the signal dropped."}.get(String(r["outcome"]), "")
	var stop: Dictionary = GameData.chart_stop(String(r.get("stop", "")))
	var stop_won: bool = bool(r.get("stop_complete", false))
	if not stop.is_empty():
		var sn: int = GameData.chart_number(String(stop["id"]))
		var label: String = String(stop["name"]).to_upper()
		title = ("BEACON RELIT — " if stop_won else "STILL DARK — ") + label
		sub = "" if stop_won else "Not done: %s. Nothing is lost." % GameData.chart_objective_text(stop)
	if stop.is_empty():
		_heading(v, title, sub)
	else:
		v.add_child(UiTheme.label(title, 30, Color("68ecff") if stop_won else UiTheme.GOLD, "display"))
		v.add_child(UiTheme.label(sub, 15, UiTheme.DIM))
	if not stop.is_empty() and stop_won:
		var won: PanelContainer = PanelContainer.new()
		won.add_theme_stylebox_override("panel", UiTheme.box(Color("0c1c2a"), Color("68ecff"), 2, 12, 14))
		v.add_child(won)
		var wv: VBoxContainer = VBoxContainer.new()
		wv.add_theme_constant_override("separation", 4)
		won.add_child(wv)
		wv.add_child(UiTheme.label("UNLOCKED" if bool(r.get("stop_first_time", false)) else "ALREADY EARNED", 13, Color("68ecff"), "bold"))
		for line: String in stop["reward"]:
			wv.add_child(UiTheme.label("+ " + line, 18, UiTheme.GOLD, "bold"))
		for side_stop: Dictionary in GameData.chart_sides(String(stop["id"])):
			if bool(r.get("stop_first_time", false)):
				wv.add_child(UiTheme.label("+ Side signal found on the chart: %s (%s)" % [String(side_stop["name"]), String(side_stop["prize"])], 15, Color("bfe9ff")))
		var nxt: String = Profile.next_stop()
		if nxt != "":
			var ns: Dictionary = GameData.chart_stop(nxt)
			wv.add_child(UiTheme.label("NEXT — Stage %d, %s: %s" % [GameData.chart_number(nxt), String(ns["name"]), GameData.chart_objective_text(ns)], 15, UiTheme.TEXT))
		else:
			wv.add_child(UiTheme.label("Every beacon on the corridor is lit.", 15, UiTheme.TEXT))
	var row: BoxContainer = UiTheme.row(24)
	row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(row)
	var left: VBoxContainer = VBoxContainer.new()
	left.custom_minimum_size = Vector2(340, 0) if not UiTheme.is_narrow() else Vector2.ZERO
	left.add_theme_constant_override("separation", 4)
	row.add_child(left)
	var rp: TextureRect = _portrait(String(r["character"]), 96.0)
	if rp:
		left.add_child(rp)
	left.add_child(UiTheme.label(String(GameData.CHARACTERS[String(r["character"])]["name"]), 22, Color.WHITE, "bold"))
	left.add_child(UiTheme.label("Time %s   •   Level %d   •   %d cleared" % [GameData.format_time(float(r["time"])), int(r["level"]), int(r["kills"])], 16, UiTheme.TEXT))
	var regions: Array = []
	for rid: String in r["regions"]:
		regions.append(String(GameData.REGIONS[rid]["name"]))
	left.add_child(UiTheme.label("Regions visited: " + (", ".join(regions) if not regions.is_empty() else "none"), 14, UiTheme.DIM))
	var wl: Array = []
	for wid: String in (r["weapons"] as Dictionary).keys():
		wl.append(GameData.weapon_name(wid))
	left.add_child(UiTheme.label("Loadout: " + ", ".join(wl), 14, UiTheme.DIM))
	if not (r["harmonies"] as Array).is_empty():
		var hl: Array = []
		for h: String in r["harmonies"]:
			hl.append(String(GameData.HARMONIES[h]["name"]))
		left.add_child(UiTheme.label("Harmonies found: " + ", ".join(hl), 14, UiTheme.GOLD))
	left.add_child(UiTheme.label("+%d SIGNAL%s" % [int(last_commit.get("currency", 0)), "   (halved — signal lost)" if String(r["outcome"]) == "defeat" else ""], 20, UiTheme.GOLD, "bold"))
	if int(last_commit.get("mastery_levels", 0)) > 0:
		left.add_child(UiTheme.label("MASTERY UP — new perk unlocked for this explorer", 15, UiTheme.GOLD))
	var right: VBoxContainer = VBoxContainer.new()
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.add_theme_constant_override("separation", 4)
	row.add_child(right)
	right.add_child(UiTheme.label("DISCOVERIES", 13, UiTheme.DIM, "bold"))
	var discs: Array = r["discoveries"]
	if discs.is_empty():
		right.add_child(UiTheme.label("None this time." if not stop.is_empty() else "None this time. Columns of light are signals — fly into the ring and hold still.", 15, UiTheme.TEXT))
	for did: String in discs:
		var d: Dictionary = GameData.DISCOVERIES[did]
		var is_new: bool = did in (last_commit.get("new_discoveries", []) as Array)
		right.add_child(UiTheme.label(("NEW  " if is_new else "") + String(d["title"]) + "  —  " + String(d["kind"]).to_upper(), 15, UiTheme.GOLD if is_new else UiTheme.TEXT))
	for u: Dictionary in last_commit.get("unlocks", []):
		var text: String = ""
		match String(u["kind"]):
			"force":
				text = "FORCE ATTUNED: " + String(GameData.FORCES[String(u["id"])]["name"])
			"transmission":
				var t: Dictionary = GameData.TRANSMISSIONS[String(u["id"])]
				text = "ARCHIVE: %s — %s" % [String(t["project"]), String(t["title"])]
			"character":
				text = "NEW EXPLORER: " + String(GameData.CHARACTERS[String(u["id"])]["name"])
			"fragment":
				text = "MYSTERY FRAGMENT RECOVERED"
			"destination":
				text = "NEW DESTINATION: " + String(GameData.DESTINATIONS[String(u["id"])]["name"])
		right.add_child(UiTheme.label(text, 15, Color("9ff7d0"), "bold"))
	var buttons: HFlowContainer = HFlowContainer.new()
	buttons.add_theme_constant_override("h_separation", 12)
	buttons.add_theme_constant_override("v_separation", 8)
	v.add_child(buttons)
	var again: Button
	if workshop_affordable() > 0:
		# Coming home with Signal to spend: the Workshop first (playtest: "I
		# always forget about the workshop").
		again = UiTheme.button("WORKSHOP: %d REFIT%s READY  →" % [workshop_affordable(), "" if workshop_affordable() == 1 else "S"], func() -> void: show_workshop("chart"), 360.0)
		again.add_theme_color_override("font_color", UiTheme.GOLD)
	elif stop.is_empty():
		again = UiTheme.button("EXPLORE AGAIN", show_departure, 260.0)
	elif stop_won:
		again = UiTheme.button("CORRIDOR CHART  →", func() -> void: show_chart(), 300.0)
	else:
		again = UiTheme.button("TRY AGAIN", show_departure, 220.0)
		buttons.add_child(again)
		buttons.add_child(UiTheme.button("CHART", func() -> void: show_chart(selected_stop), 160.0))
	if again.get_parent() == null:
		buttons.add_child(again)
	buttons.add_child(UiTheme.button("ARCHIVE", show_archive, 180.0))
	if Profile.has_feature("workshop"):
		buttons.add_child(UiTheme.button("WORKSHOP", show_workshop, 200.0))
	buttons.add_child(UiTheme.button("TITLE", show_title, 160.0))
	var saved_label: Label = UiTheme.label("Progress saved." if Profile.last_save_ok else "WARNING: progress could not be saved.", 13, UiTheme.DIM if Profile.last_save_ok else Color("ff8fa8"))
	saved_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	saved_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	buttons.add_child(saved_label)
	again.grab_focus()

# ================================================================== archive

func show_archive() -> void:
	var v: VBoxContainer = _new_screen()
	Audio.set_mix({"menu": 0.6, "bed": 0.3})
	var found: int = Profile.discovered_count()
	_heading(v, "STAR SPLITTER ARCHIVE", "A record collection assembled by exploration — %d of %d discoveries." % [found, GameData.DISCOVERIES.size()])
	var tabs: TabContainer = TabContainer.new()
	tabs.clip_tabs = true
	tabs.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(tabs)
	tabs.add_child(_archive_projects())
	tabs.add_child(_archive_universe())
	tabs.add_child(_archive_forces())
	tabs.add_child(_archive_explorers())
	tabs.add_child(_archive_mystery())
	tabs.add_child(_archive_log())
	tabs.add_child(_archive_visions())
	var fg: Array = _scroll("Field Guide")
	FieldGuide.fill(fg[1], minf(1080.0, _content_width() - 40.0))
	tabs.add_child(fg[0])
	_back_row(v, func() -> void:
		Audio.stop_catalog()
		show_title())

func _scroll(name: String) -> Array:
	var sc: ScrollContainer = ScrollContainer.new()
	sc.name = name
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var inner: VBoxContainer = VBoxContainer.new()
	inner.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	inner.add_theme_constant_override("separation", 10)
	sc.add_child(inner)
	return [sc, inner]

func _archive_projects() -> Control:
	var s: Array = _scroll("Records")
	var inner: VBoxContainer = s[1]
	var transmissions: Array = Profile.data["transmissions"]
	var unheard_projects: int = 0
	for pname: String in GameData.PROJECTS.keys():
		var pdef: Dictionary = GameData.PROJECTS[pname]
		var owned: Array = []
		for tid: String in GameData.TRANSMISSIONS.keys():
			if String(GameData.TRANSMISSIONS[tid]["project"]) == pname and tid in transmissions:
				owned.append(tid)
		var known: bool = not owned.is_empty()
		if not known:
			unheard_projects += 1
			continue # only what you have heard; a single line counts the rest
		var panel: PanelContainer = PanelContainer.new()
		panel.add_theme_stylebox_override("panel", UiTheme.box(Color(UiTheme.PANEL, 0.9), Color(pdef["accent"], 0.7), 1, 12, 16))
		inner.add_child(panel)
		var pv: VBoxContainer = VBoxContainer.new()
		panel.add_child(pv)
		var head: HBoxContainer = HBoxContainer.new()
		head.add_theme_constant_override("separation", 16)
		pv.add_child(head)
		var ident: TextureRect = _art("res://assets/music/identity/%s.png" % _project_force(pname), Vector2(132, 132))
		if ident:
			head.add_child(ident)
		else:
			var sleeve: RecordSleeve = RecordSleeve.new()
			sleeve.accent = pdef["accent"]
			sleeve.title = pname
			sleeve.seed_value = pname.hash()
			sleeve.custom_minimum_size = Vector2(132, 132)
			head.add_child(sleeve)
		var hv: VBoxContainer = VBoxContainer.new()
		hv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		head.add_child(hv)
		hv.add_child(UiTheme.label(pname.to_upper(), 22, pdef["accent"], "display"))
		hv.add_child(UiTheme.label(String(pdef["field"]) + "   •   " + String(pdef["role"]), 13, UiTheme.DIM, "bold"))
		hv.add_child(UiTheme.label(String(pdef["bio"]), 15, UiTheme.TEXT))
		for tid2: String in owned:
			var t: Dictionary = GameData.TRANSMISSIONS[tid2]
			var tr: HBoxContainer = HBoxContainer.new()
			tr.add_theme_constant_override("separation", 10)
			pv.add_child(tr)
			var cover: TextureRect = _art("res://assets/music/covers/%s.png" % tid2, Vector2(42, 42))
			if cover:
				tr.add_child(cover)
			var has_master: bool = Audio.has_master(tid2)
			# Records without a Force have no motif to preview until a master exists.
			if has_master or String(t.get("force", "")) != "":
				tr.add_child(UiTheme.button("▶ PLAY" if has_master else "▶ FORCE MOTIF", func() -> void:
					var mode: String = Audio.play_catalog(tid2)
					_toast("Now playing: %s — %s" % [String(t["project"]), String(t["title"])] if mode == "master" else "Master not yet supplied — playing the in-game %s motif (original placeholder, not the release)." % String(GameData.FORCES[String(t["force"])]["name"])), 190.0, 42.0))
			var tl: Label = UiTheme.label("%s   (%s)" % [String(t["title"]), String(t["meta"])], 15, UiTheme.TEXT, "bold")
			tl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			tl.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			tr.add_child(tl)
		if String(pdef["url"]) != "":
			pv.add_child(UiTheme.button("Listen on official platforms ↗", func() -> void: OS.shell_open(String(pdef["url"])), 300.0, 40.0))
	inner.add_child(UiTheme.button("STOP PLAYBACK", func() -> void:
		Audio.stop_catalog()
		Audio.set_mix({"menu": 0.6, "bed": 0.3}), 220.0, 44.0))
	if unheard_projects > 0:
		inner.add_child(_more_line("%d more project%s still unheard. Each one is a signal somewhere on the Corridor Chart." % [unheard_projects, "" if unheard_projects == 1 else "s"]))
	return s[0]

## Rex Fleet: the released fiction the explorers come from, plus a clear note
## on what the game adds (GAME_CANON_ADAPTATION.md).
func _archive_universe() -> Control:
	var s: Array = _scroll("Rex Fleet")
	var inner: VBoxContainer = s[1]
	var row: HBoxContainer = HBoxContainer.new()
	row.add_theme_constant_override("separation", 18)
	inner.add_child(row)
	var cover: TextureRect = _art("res://assets/universe/rex_fleet_issue01_cover.png", Vector2(190, 303))
	if cover:
		row.add_child(cover)
	var v: VBoxContainer = VBoxContainer.new()
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.add_theme_constant_override("separation", 8)
	row.add_child(v)
	v.add_child(UiTheme.label("REX FLEET — ISSUE 01: GREEN CORRIDOR", 22, Color("74e6a5"), "display"))
	v.add_child(UiTheme.label("Star Splitter Visions · released August 15, 2026 · \"Three powers. One frontier.\"", 13, UiTheme.DIM, "bold"))
	v.add_child(UiTheme.label("After the Shattering, three rival powers carry different versions of history into the same contested frontier. Commodore Ella Venn is trying to keep people alive on a frontier divided among the Core, the Shards, and the Verge.", 15, UiTheme.TEXT))
	v.add_child(UiTheme.label("THE FLEET — navy and gold, the four-point star.   THE VERGE — tan and green, the leaf.   THE SHARDS — white and red, the fang. Not villains: survivors of the wreckage zones.", 13, UiTheme.DIM))
	var cast: HFlowContainer = HFlowContainer.new()
	cast.add_theme_constant_override("h_separation", 8)
	v.add_child(cast)
	for key: String in ["ella_venn", "cael_dominion", "colin_rhyne", "naomi_sol", "chris_halev", "abby_saville", "billie_rusk", "tessa_banks", "jex_marrin"]:
		var pc: TextureRect = _art("res://assets/characters/%s_96.png" % key, Vector2(56, 56))
		if pc:
			pc.tooltip_text = key.replace("_", " ").capitalize()
			cast.add_child(pc)
	# People met and places charted on the Corridor Chart.
	var met: Array = Profile.contacts_met()
	inner.add_child(UiTheme.label("CONTACTS MET", 14, UiTheme.GOLD, "bold"))
	for ck: String in met:
		var cdef: Dictionary = GameData.CONTACTS[ck]
		var crow: HBoxContainer = HBoxContainer.new()
		crow.add_theme_constant_override("separation", 10)
		inner.add_child(crow)
		var cp: TextureRect = _art("res://assets/characters/%s_96.png" % String(cdef["portrait"]), Vector2(56, 56))
		if cp:
			crow.add_child(cp)
		var cv: VBoxContainer = VBoxContainer.new()
		cv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		crow.add_child(cv)
		cv.add_child(UiTheme.label("%s  •  %s" % [String(cdef["name"]), String(cdef["faction"])], 15, Color.WHITE, "bold"))
		cv.add_child(UiTheme.label(String(cdef["role"]), 13, UiTheme.DIM))
	if met.size() < GameData.CONTACTS.size():
		inner.add_child(_more_line("%d more contact%s on the Corridor Chart." % [GameData.CONTACTS.size() - met.size(), "" if GameData.CONTACTS.size() - met.size() == 1 else "s"]))
	var charted: Array = Profile.places_charted()
	inner.add_child(UiTheme.label("PLACES CHARTED", 14, UiTheme.GOLD, "bold"))
	for pk: String in charted:
		var pdef2: Dictionary = GameData.PLACES[pk]
		inner.add_child(UiTheme.label("%s  •  %s" % [String(pdef2["name"]), String(pdef2["series"])], 15, Color.WHITE, "bold"))
		inner.add_child(UiTheme.label("%s  (%s)" % [String(pdef2["text"]), String(pdef2["source"])], 13, UiTheme.DIM))
	if charted.size() < GameData.PLACES.size():
		inner.add_child(_more_line("%d more place%s to chart." % [GameData.PLACES.size() - charted.size(), "" if GameData.PLACES.size() - charted.size() == 1 else "s"]))
	inner.add_child(UiTheme.label("ABOUT THIS GAME'S SIGNALS", 14, UiTheme.GOLD, "bold"))
	inner.add_child(UiTheme.label("The characters, factions and places come from Rex Fleet. The signals do not: Star Splitter Records music reaching the frontier, the Forces, and the hush that hunts it are original to Star Splitter Forces and are not part of Rex Fleet canon.", 14, UiTheme.TEXT))
	return s[0]

func _archive_forces() -> Control:
	var s: Array = _scroll("Forces")
	var inner: VBoxContainer = s[1]
	for fid: String in GameData.FORCES.keys():
		var f: Dictionary = GameData.FORCES[fid]
		var att: bool = Profile.is_attuned(fid)
		if not att:
			inner.add_child(UiTheme.label("? — an unheard Force", 16, UiTheme.DIM, "bold"))
			continue
		inner.add_child(UiTheme.label("%s   •   %s" % [String(f["name"]).to_upper(), String(f["mechanic"])], 20, f["color"], "display"))
		inner.add_child(UiTheme.label("“%s”  %s" % [String(f["tagline"]), String(f["desc"])], 14, UiTheme.TEXT))
		var ws: Array = []
		for wid: String in GameData.WEAPONS.keys():
			if String(GameData.WEAPONS[wid]["force"]) == fid:
				ws.append("%s → %s" % [GameData.WEAPONS[wid]["name"], GameData.EVOLUTIONS[String(GameData.WEAPONS[wid]["evolution"])]["name"]])
		inner.add_child(UiTheme.label("Weapons: " + ", ".join(ws), 13, UiTheme.DIM))
	inner.add_child(UiTheme.label("HARMONIES", 16, UiTheme.GOLD, "bold"))
	for hid: String in GameData.HARMONIES.keys():
		var h: Dictionary = GameData.HARMONIES[hid]
		var seen: bool = Profile.seen("harmony_" + hid)
		var a: String = String(GameData.FORCES[String(h["forces"][0])]["name"])
		var b: String = String(GameData.FORCES[String(h["forces"][1])]["name"])
		inner.add_child(UiTheme.label(("%s (%s + %s): %s" % [h["name"], a, b, h["desc"]]) if seen else "??? — raise two Forces together to level 3 to discover a harmony.", 14, UiTheme.TEXT if seen else UiTheme.DIM))
	return s[0]

func _archive_explorers() -> Control:
	var s: Array = _scroll("Explorers")
	var inner: VBoxContainer = s[1]
	var unknown_contacts: int = 0
	for cid: String in GameData.CHARACTERS.keys():
		var c: Dictionary = GameData.CHARACTERS[cid]
		if not Profile.has_character(cid):
			unknown_contacts += 1
			continue
		var m: Dictionary = Profile.mastery(cid)
		var eh: HBoxContainer = HBoxContainer.new()
		eh.add_theme_constant_override("separation", 12)
		inner.add_child(eh)
		var ep: TextureRect = _portrait(cid, 72.0)
		if ep:
			eh.add_child(ep)
		var ev: VBoxContainer = VBoxContainer.new()
		ev.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		eh.add_child(ev)
		ev.add_child(UiTheme.label(String(c["name"]).to_upper(), 20, c["accent"], "display"))
		ev.add_child(UiTheme.label(String(c["origin"]) + "   •   " + String(c["tagline"]), 13, UiTheme.DIM))
		ev.add_child(UiTheme.label(String(c["bio"]), 14, UiTheme.TEXT))
		var perks: Array = GameData.MASTERY[cid]
		var lines: Array = []
		for i in perks.size():
			lines.append(("✓ " if i < int(m["level"]) else "· ") + String(perks[i]))
		inner.add_child(UiTheme.label("Mastery %d — expeditions %d, completions %d\n%s" % [int(m["level"]), int(m["expeditions"]), int(m["completions"]), "\n".join(lines)], 13, UiTheme.DIM))
	if unknown_contacts > 0:
		var nx: Dictionary = _next_unlock("character")
		inner.add_child(_more_line("%d more explorer%s to find.%s" % [unknown_contacts, "" if unknown_contacts == 1 else "s", (" Next: %s, at \"%s\"." % [String(GameData.CHARACTERS[String(nx["id"])]["name"]), String(nx["stop"]["name"])]) if not nx.is_empty() else ""]))
	return s[0]

## Other Star Splitter Visions series that reached the Reach through Signal
## Space. A series page opens when its crossover landmark is found.
func _archive_visions() -> Control:
	var s: Array = _scroll("Visions")
	var inner: VBoxContainer = s[1]
	inner.add_child(UiTheme.label("STAR SPLITTER VISIONS — SIGNAL SPACE GUESTS", 20, UiTheme.GOLD, "display"))
	inner.add_child(UiTheme.label("Other Star Splitter Visions series, as published. Their appearance here is a Signal Space crossover: a game-only meeting point, not canon for any series.", 13, UiTheme.DIM))
	var unseen_series: int = 0
	for sid: String in GameData.VISIONS_SERIES.keys():
		var v: Dictionary = GameData.VISIONS_SERIES[sid]
		var found: bool = Profile.is_discovered(String(v["discovery"]))
		if not found:
			unseen_series += 1
			continue
		var panel: PanelContainer = PanelContainer.new()
		panel.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.PANEL, Color(v["accent"], 0.6 if found else 0.2), 1, 10, 14))
		inner.add_child(panel)
		var h: HBoxContainer = HBoxContainer.new()
		h.add_theme_constant_override("separation", 16)
		panel.add_child(h)
		var cover: TextureRect = _art("res://assets/universe/%s_cover.png" % String(v["cover"]), Vector2(120, 180))
		if cover:
			if not found:
				cover.modulate = Color(0.25, 0.25, 0.3, 1.0)
			h.add_child(cover)
		var col: VBoxContainer = VBoxContainer.new()
		col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		col.add_theme_constant_override("separation", 4)
		h.add_child(col)
		col.add_child(UiTheme.label(String(v["title"]).to_upper(), 20, v["accent"] if found else UiTheme.DIM, "display"))
		col.add_child(UiTheme.label("%s   •   %s" % [String(v["label"]), String(v["release"])], 12, UiTheme.DIM))
		if not found:
			var where: String = String(GameData.DISCOVERIES[String(v["discovery"])]["title"])
			col.add_child(UiTheme.label("Signal not yet found. Look for the %s." % where, 14, UiTheme.DIM))
			continue
		col.add_child(UiTheme.label("\"%s\"" % String(v["tagline"]), 15, Color.WHITE, "bold"))
		col.add_child(UiTheme.label(String(v["description"]), 13, UiTheme.TEXT))
		col.add_child(UiTheme.label("IN SIGNAL SPACE: " + String(v["signal_space"]), 13, UiTheme.GOLD))
		var guests: HBoxContainer = HBoxContainer.new()
		guests.add_theme_constant_override("separation", 8)
		col.add_child(guests)
		var faces: Array = [String(v["explorer"])]
		if sid == "vikings_2026":
			faces.append("gunnar")
		for f: String in faces:
			var pr: TextureRect = _art("res://assets/characters/%s_96.png" % String(GameData.CHARACTERS.get(f, {}).get("portrait", f)), Vector2(56, 56))
			if pr:
				guests.add_child(pr)
			var gl: Label = UiTheme.label(String(GameData.CHARACTERS[f]["name"]) if GameData.CHARACTERS.has(f) else f.capitalize(), 14, UiTheme.TEXT, "bold")
			gl.autowrap_mode = TextServer.AUTOWRAP_OFF
			gl.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			guests.add_child(gl)
	if unseen_series > 0:
		inner.add_child(_more_line("%d more series still out in Signal Space. They show up as side signals on the Corridor Chart." % unseen_series))
	return s[0]

func _archive_mystery() -> Control:
	var s: Array = _scroll("Mystery")
	var inner: VBoxContainer = s[1]
	inner.add_child(UiTheme.label(GameData.FRAGMENT_TITLE, 22, Color("d7d0ff"), "display"))
	var have: Array = Profile.data["fragments"]
	inner.add_child(UiTheme.label("%d / %d fragments recovered" % [have.size(), GameData.FRAGMENTS.size()], 14, UiTheme.DIM))
	var keys: Array = GameData.FRAGMENTS.keys()
	keys.sort()
	for fid: String in keys:
		if fid in have:
			inner.add_child(UiTheme.label("• " + String(GameData.FRAGMENTS[fid]), 16, UiTheme.TEXT))

	if have.size() == GameData.FRAGMENTS.size():
		inner.add_child(UiTheme.label("Every fragment points the same way: the quiet is drawn to music. So keep playing.", 16, UiTheme.GOLD))
	return s[0]

func _archive_log() -> Control:
	var s: Array = _scroll("Discoveries")
	var inner: VBoxContainer = s[1]
	var kinds: Array = ["signal", "character", "artifact", "anomaly", "fragment"]
	for k: String in kinds:
		var total: int = 0
		var found: int = 0
		for id: String in GameData.DISCOVERIES.keys():
			if String(GameData.DISCOVERIES[id]["kind"]) == k:
				total += 1
				if Profile.is_discovered(id):
					found += 1
		inner.add_child(UiTheme.label("%sS  %d / %d" % [k.to_upper(), found, total], 15, UiTheme.GOLD, "bold"))
		for id2: String in GameData.DISCOVERIES.keys():
			var d: Dictionary = GameData.DISCOVERIES[id2]
			if String(d["kind"]) != k:
				continue
			if Profile.is_discovered(id2):
				var region: String = String(GameData.REGIONS[String(d["region"])]["name"]) if String(d.get("region", "")) != "" else "OPEN DRIFT"
				inner.add_child(UiTheme.label("%s — %s\n%s" % [String(d["title"]), region, String(d["text"])], 14, UiTheme.TEXT))
	return s[0]

# ================================================================== workshop

## Refits the player can afford right now.
func workshop_affordable() -> int:
	if not Profile.has_feature("workshop"):
		return 0
	var n: int = 0
	for wid: String in GameData.WORKSHOP.keys():
		var rank: int = Profile.workshop_rank(wid)
		if rank < int(GameData.WORKSHOP[wid]["max"]) and int(Profile.data["currency"]) >= GameData.workshop_cost(wid, rank):
			n += 1
	return n

## after: where the Workshop's main button goes ("chart" after a stage).
func show_workshop(after: String = "") -> void:
	workshop_after = after
	var v: VBoxContainer = _new_screen()
	_heading(v, "FLEET WORKSHOP", "Spend Signal on permanent refits. You have %d Signal." % int(Profile.data["currency"]))
	var grid: GridContainer = GridContainer.new()
	grid.columns = 1 if UiTheme.is_narrow() else 2
	grid.add_theme_constant_override("h_separation", 14)
	grid.add_theme_constant_override("v_separation", 10)
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(grid)
	var first: Button = null
	for wid: String in GameData.WORKSHOP.keys():
		var w: Dictionary = GameData.WORKSHOP[wid]
		var rank: int = Profile.workshop_rank(wid)
		var maxed: bool = rank >= int(w["max"])
		var cost: int = GameData.workshop_cost(wid, rank)
		var text: String = "%s  %d/%d\n%s\n%s" % [String(w["name"]), rank, int(w["max"]), String(w["desc"]), "MAXED" if maxed else "%d SIGNAL" % cost]
		var b: Button = UiTheme.button(text, func() -> void:
			if Profile.buy_workshop(wid):
				Audio.play_sfx("choose")
			show_workshop(workshop_after), 520.0 if not UiTheme.is_narrow() else _content_width(), 92.0)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		b.disabled = maxed or int(Profile.data["currency"]) < cost
		b.add_theme_font_size_override("font_size", UiTheme.fs(15))
		grid.add_child(b)
		if first == null and not b.disabled:
			first = b
	if workshop_after == "chart":
		var cont: Button = UiTheme.button("CONTINUE TO THE CHART  →", func() -> void: show_chart(selected_stop), 340.0, 54.0)
		cont.add_theme_color_override("font_color", UiTheme.ACCENT)
		v.add_child(cont)
	else:
		_back_row(v, show_title)
	if first:
		first.grab_focus()

# ================================================================== settings

func show_settings() -> void:
	var v: VBoxContainer = _new_screen()
	_heading(v, "SETTINGS", "Changes save automatically.")
	var grid: GridContainer = GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 24)
	grid.add_theme_constant_override("v_separation", 12)
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(grid)
	_slider(grid, "Music volume", "music_volume", 0.0, 1.0, 0.05)
	_slider(grid, "Effects volume", "sfx_volume", 0.0, 1.0, 0.05)
	_slider(grid, "Screen shake", "screen_shake", 0.0, 1.0, 0.25)
	_slider(grid, "Text size", "text_scale", 0.8, 1.4, 0.1)
	_slider(grid, "Screen edge padding (if the top or bottom is hidden)", "edge_padding", 0.0, 90.0, 5.0)
	_toggle(grid, "Reduced flashes & hit-stop", "reduced_flashes")
	_toggle(grid, "Damage numbers", "damage_numbers")
	_toggle(grid, "Navigation assist (edge compass)", "nav_assist")
	_choice(grid, "Movement stick", "joystick_mode", ["floating", "fixed"])
	_choice(grid, "Steering hand (ability button goes on the other side)", "handedness", ["right", "left"])
	_choice(grid, "Frame rate cap", "fps_cap", [60, 30])
	var row: BoxContainer = BoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	v.add_child(row)
	var back: Button = UiTheme.button("SAVE & BACK", func() -> void:
		Profile.save()
		show_title(), 240.0)
	row.add_child(back)
	if UiTheme.is_narrow():
		row.vertical = true
	var keys_label: Label = UiTheme.label("Keyboard: WASD/arrows move • Space ability • M map • Esc pause • 1-4 choose • R reroll • E confront. Gamepad: stick, A ability, Start pause, Back map.", 13, UiTheme.DIM)
	keys_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(keys_label)
	back.grab_focus()

func _setting_label(grid: GridContainer, text: String) -> void:
	var l: Label = UiTheme.label(text, 17)
	l.autowrap_mode = TextServer.AUTOWRAP_OFF
	l.custom_minimum_size = Vector2(360, 0) if not UiTheme.is_narrow() else Vector2(200, 0)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if UiTheme.is_narrow() else TextServer.AUTOWRAP_OFF
	grid.add_child(l)

func _slider(grid: GridContainer, text: String, key: String, lo: float, hi: float, step: float) -> void:
	_setting_label(grid, text)
	var s: HSlider = HSlider.new()
	s.min_value = lo
	s.max_value = hi
	s.step = step
	s.value = float(Profile.setting(key))
	s.custom_minimum_size = Vector2(380, 36) if not UiTheme.is_narrow() else Vector2(220, 36)
	s.value_changed.connect(func(val: float) -> void: Profile.set_setting(key, val))
	grid.add_child(s)

func _toggle(grid: GridContainer, text: String, key: String) -> void:
	_setting_label(grid, text)
	var c: CheckButton = CheckButton.new()
	c.button_pressed = bool(Profile.setting(key))
	c.toggled.connect(func(on: bool) -> void: Profile.set_setting(key, on))
	grid.add_child(c)

func _choice(grid: GridContainer, text: String, key: String, options: Array) -> void:
	_setting_label(grid, text)
	var ob: OptionButton = OptionButton.new()
	for o: Variant in options:
		ob.add_item(str(o).to_upper())
	ob.selected = maxi(0, options.find(Profile.setting(key)))
	ob.item_selected.connect(func(i: int) -> void: Profile.set_setting(key, options[i]))
	ob.custom_minimum_size = Vector2(220, 44)
	grid.add_child(ob)

# ================================================================== credits

func show_credits() -> void:
	var v: VBoxContainer = _new_screen()
	_heading(v, "CREDITS")
	var text: String = "\n".join([
		"STAR SPLITTER FORCES — pre-release development build",
		"Music projects and catalog metadata: Star Splitter Records (original music by Jeff Hines).",
		"Rex Fleet characters, factions and setting: Star Splitter Visions.",
		"Forces are gameplay interpretations of each project's documented musical language — not official releases.",
		"In-game score and sound effects: original placeholder audio generated for this build (tools/generate_audio.py).",
		"No Star Splitter masters are bundled in this build. Archive playback uses authorised masters when supplied.",
		"Typeface: Inter by The Inter Project Authors, SIL Open Font License 1.1.",
		"Engine: Godot Engine (MIT licence).",
	])
	var l: Label = UiTheme.label(text, 16, UiTheme.TEXT)
	l.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(l)
	_back_row(v, show_title)

# ================================================================== app lifecycle

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_WM_GO_BACK_REQUEST or what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		# Mobile interruption: pause the expedition and persist settings.
		if current_run and is_instance_valid(current_run) and not current_run.ended and not get_tree().paused:
			var hud: Node = current_run.hud
			if hud and hud.has_method("toggle_pause"):
				hud.toggle_pause()
		Profile.save()

## A procedural record sleeve in the project's catalog accent — a placeholder
## until approved project artwork is supplied (ART_BIBLE.md).
class RecordSleeve:
	extends Control
	var accent: Color = Color.WHITE
	var title: String = ""
	var seed_value: int = 0
	var t: float = 0.0
	func _process(delta: float) -> void:
		t += delta
		queue_redraw()
	func _draw() -> void:
		var sz: Vector2 = size
		var r: RandomNumberGenerator = RandomNumberGenerator.new()
		r.seed = seed_value
		draw_rect(Rect2(Vector2.ZERO, sz), accent.darkened(0.78))
		for k in 7:
			var y: float = sz.y * (0.15 + 0.11 * k)
			var pts: PackedVector2Array = PackedVector2Array()
			var amp: float = r.randf_range(2.0, 9.0)
			var freq: float = r.randf_range(0.05, 0.16)
			for i in 24:
				var x: float = sz.x * i / 23.0
				pts.append(Vector2(x, y + sin(i * freq * 6.0 + k + t * 0.6) * amp))
			draw_polyline(pts, Color(accent, 0.18 + 0.07 * (k % 3)), 2.0)
		var c: Vector2 = Vector2(sz.x * 0.62, sz.y * 0.58)
		var rad: float = sz.x * 0.36
		draw_circle(c, rad, Color("0b0b10"))
		for k in 5:
			draw_arc(c, rad * (0.45 + k * 0.11), 0.0, TAU, 48, Color(1, 1, 1, 0.05), 1.0)
		draw_circle(c, rad * 0.32, accent)
		draw_circle(c, rad * 0.05, Color("0b0b10"))
		var spin: float = t * 1.2
		draw_arc(c, rad * 0.8, spin, spin + 0.5, 12, Color(1, 1, 1, 0.18), 3.0)
		var words: PackedStringArray = title.split(" ")
		var initials: String = ""
		for w: String in words:
			if w.length() > 0:
				initials += w.substr(0, 1)
		draw_string(UiTheme.font("display"), Vector2(10, 30), initials, HORIZONTAL_ALIGNMENT_LEFT, -1, 24, Color(accent.lightened(0.4), 0.95))
		draw_rect(Rect2(Vector2.ZERO, sz), Color(accent, 0.6), false, 2.0)

class MenuBackdrop:
	extends Control
	var t: float = 0.0
	func _process(delta: float) -> void:
		t += delta
		queue_redraw()
	func _draw() -> void:
		var vp: Vector2 = size
		draw_rect(Rect2(Vector2.ZERO, vp), UiTheme.BG)
		var r: RandomNumberGenerator = RandomNumberGenerator.new()
		r.seed = 99
		for i in 140:
			var p: Vector2 = Vector2(r.randf() * vp.x, r.randf() * vp.y)
			var drift: Vector2 = Vector2(fmod(p.x - t * (4.0 + r.randf() * 10.0), vp.x), p.y)
			if drift.x < 0.0:
				drift.x += vp.x
			draw_circle(drift, r.randf_range(0.6, 1.8), Color(0.7, 0.85, 1.0, r.randf_range(0.2, 0.7)))
		var c: Vector2 = Vector2(vp.x * 0.78, vp.y * 0.55)
		for k in 4:
			var rad: float = 120.0 + k * 55.0
			draw_arc(c, rad, t * (0.1 + k * 0.05), t * (0.1 + k * 0.05) + PI * 1.3, 64, Color(UiTheme.ACCENT, 0.12 - k * 0.02), 2.0)
		var wave: PackedVector2Array = PackedVector2Array()
		for i in 64:
			var x: float = vp.x * i / 63.0
			wave.append(Vector2(x, vp.y * 0.92 + sin(i * 0.4 + t * 1.5) * 8.0 * sin(t * 0.5 + i * 0.05)))
		draw_polyline(wave, Color(UiTheme.ACCENT, 0.25), 2.0)
