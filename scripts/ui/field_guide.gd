class_name FieldGuide
extends RefCounted
## Builds the Field Guide list: every category, its icon, what it looks like
## and why it matters. Used by the pause menu and the Archive.

static func fill(inner: VBoxContainer, width: float = 900.0) -> void:
	var intro: Label = UiTheme.label("Everything you meet out there belongs to one of these. Red rings mean danger; small bright diamonds are pickups; tall landmarks with labels are discoveries.", 15, UiTheme.TEXT)
	intro.custom_minimum_size = Vector2(width, 0)
	inner.add_child(intro)
	var group: String = ""
	for cat: String in GameData.CATEGORY_ORDER:
		var def: Dictionary = GameData.CATEGORIES[cat]
		if String(def["group"]) != group:
			group = String(def["group"])
			var gl: Label = UiTheme.label(group, 17, UiTheme.ACCENT, "bold")
			inner.add_child(gl)
		var row: PanelContainer = PanelContainer.new()
		row.add_theme_stylebox_override("panel", UiTheme.box(UiTheme.PANEL, Color(def["color"], 0.45), 1, 10, 10))
		inner.add_child(row)
		var h: HBoxContainer = HBoxContainer.new()
		h.add_theme_constant_override("separation", 14)
		row.add_child(h)
		var icon: CategoryIcon = CategoryIcon.new(cat, 60.0)
		icon.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		h.add_child(icon)
		var v: VBoxContainer = VBoxContainer.new()
		v.add_theme_constant_override("separation", 2)
		v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(v)
		v.add_child(UiTheme.label(String(def["name"]), 16, def["color"], "bold"))
		var what: Label = UiTheme.label(String(def["what"]), 14, UiTheme.TEXT)
		what.custom_minimum_size = Vector2(width - 110.0, 0)
		v.add_child(what)
		var why: Label = UiTheme.label("Why it matters: " + String(def["why"]), 14, UiTheme.GOLD)
		why.custom_minimum_size = Vector2(width - 110.0, 0)
		v.add_child(why)
