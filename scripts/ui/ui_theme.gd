class_name UiTheme
extends RefCounted
## Shared visual language for menus and HUD: Inter type, deep navy panels,
## thin luminous borders. Text scale comes from accessibility settings.

const BG: Color = Color("080a16")
const PANEL: Color = Color("0e1426")
const PANEL_HI: Color = Color("16203a")
const LINE: Color = Color("2b3d63")
const TEXT: Color = Color("e6f1ff")
const DIM: Color = Color("8a9bbd")
const ACCENT: Color = Color("68ecff")
const GOLD: Color = Color("ffe08a")

static var _fonts: Dictionary = {}

static func font(kind: String = "medium") -> Font:
	if _fonts.has(kind):
		return _fonts[kind]
	var path: String = {"medium": "res://assets/fonts/Inter-Medium.otf", "bold": "res://assets/fonts/Inter-Bold.otf", "display": "res://assets/fonts/InterDisplay-Bold.otf"}.get(kind, "res://assets/fonts/Inter-Medium.otf")
	var f: Font = load(path) if ResourceLoader.exists(path) else ThemeDB.fallback_font
	_fonts[kind] = f
	return f

static func text_scale() -> float:
	var p: Node = Engine.get_main_loop().root.get_node_or_null("/root/Profile") if Engine.get_main_loop() else null
	if p == null or p.data.is_empty():
		return 1.0
	return clampf(float(p.setting("text_scale")), 0.8, 1.5)

## Playtest: text read as too small on laptops and phones, so every UI size
## is scaled up from its design value before the player's own Text size.
const BASE_TEXT: float = 1.3

static func fs(size: int) -> int:
	return int(round(size * BASE_TEXT * text_scale()))

static func box(bg: Color, border: Color, width: int = 1, radius: int = 10, pad: int = 14) -> StyleBoxFlat:
	var s: StyleBoxFlat = StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(width)
	s.set_corner_radius_all(radius)
	s.content_margin_left = pad
	s.content_margin_right = pad
	s.content_margin_top = pad * 0.7
	s.content_margin_bottom = pad * 0.7
	s.anti_aliasing = true
	return s

static func build() -> Theme:
	var t: Theme = Theme.new()
	t.default_font = font("medium")
	t.default_font_size = fs(18)
	var normal: StyleBoxFlat = box(Color(PANEL, 0.92), LINE, 1, 10, 16)
	var hover: StyleBoxFlat = box(PANEL_HI, ACCENT.darkened(0.2), 2, 10, 16)
	var pressed: StyleBoxFlat = box(Color("1b2c4f"), ACCENT, 2, 10, 16)
	var disabled: StyleBoxFlat = box(Color(PANEL, 0.5), Color(LINE, 0.4), 1, 10, 16)
	var focus: StyleBoxFlat = box(Color(0, 0, 0, 0), GOLD, 2, 10, 16)
	for cls: String in ["Button", "OptionButton", "CheckButton"]:
		t.set_stylebox("normal", cls, normal)
		t.set_stylebox("hover", cls, hover)
		t.set_stylebox("pressed", cls, pressed)
		t.set_stylebox("disabled", cls, disabled)
		t.set_stylebox("focus", cls, focus)
		t.set_color("font_color", cls, TEXT)
		t.set_color("font_hover_color", cls, Color.WHITE)
		t.set_color("font_pressed_color", cls, ACCENT)
		t.set_color("font_disabled_color", cls, Color(DIM, 0.6))
		t.set_color("font_focus_color", cls, Color.WHITE)
		t.set_font("font", cls, font("bold"))
		t.set_font_size("font_size", cls, fs(18))
	t.set_stylebox("panel", "PanelContainer", box(Color(PANEL, 0.94), LINE, 1, 14, 18))
	t.set_stylebox("panel", "Panel", box(Color(PANEL, 0.94), LINE, 1, 14, 18))
	t.set_color("font_color", "Label", TEXT)
	t.set_font_size("font_size", "Label", fs(18))
	t.set_color("default_color", "RichTextLabel", TEXT)
	t.set_font("normal_font", "RichTextLabel", font("medium"))
	t.set_font("bold_font", "RichTextLabel", font("bold"))
	t.set_font_size("normal_font_size", "RichTextLabel", fs(17))
	t.set_font_size("bold_font_size", "RichTextLabel", fs(17))
	var bar_bg: StyleBoxFlat = box(Color("0b1120"), Color(LINE, 0.8), 1, 6, 0)
	var bar_fill: StyleBoxFlat = box(ACCENT, Color(0, 0, 0, 0), 0, 6, 0)
	t.set_stylebox("background", "ProgressBar", bar_bg)
	t.set_stylebox("fill", "ProgressBar", bar_fill)
	var slider: StyleBoxFlat = box(Color("0b1120"), LINE, 1, 6, 0)
	slider.content_margin_top = 6
	slider.content_margin_bottom = 6
	t.set_stylebox("slider", "HSlider", slider)
	t.set_stylebox("grabber_area", "HSlider", box(Color(ACCENT, 0.6), Color(0, 0, 0, 0), 0, 6, 0))
	t.set_stylebox("grabber_area_highlight", "HSlider", box(ACCENT, Color(0, 0, 0, 0), 0, 6, 0))
	t.set_stylebox("panel", "TabContainer", box(Color(PANEL, 0.6), LINE, 1, 10, 12))
	t.set_stylebox("tab_selected", "TabContainer", box(PANEL_HI, ACCENT, 1, 8, 12))
	t.set_stylebox("tab_unselected", "TabContainer", box(Color(PANEL, 0.6), LINE, 1, 8, 12))
	t.set_stylebox("tab_hovered", "TabContainer", box(PANEL_HI, LINE, 1, 8, 12))
	t.set_font("font", "TabContainer", font("bold"))
	t.set_font_size("font_size", "TabContainer", fs(16))
	t.set_stylebox("panel", "ScrollContainer", StyleBoxEmpty.new())
	return t

static func label(text: String, size: int = 18, color: Color = TEXT, kind: String = "medium") -> Label:
	var l: Label = Label.new()
	l.text = text
	l.add_theme_font_override("font", font(kind))
	l.add_theme_font_size_override("font_size", fs(size))
	l.add_theme_color_override("font_color", color)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return l

static func button(text: String, callback: Callable, min_width: float = 280.0, height: float = 56.0) -> Button:
	var b: Button = Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(min_width, height)
	b.pressed.connect(func() -> void:
		var a: Node = Engine.get_main_loop().root.get_node_or_null("/root/Audio")
		if a:
			a.play_sfx("ui_click", 1.0, -6.0, 0.05)
		callback.call())
	return b
