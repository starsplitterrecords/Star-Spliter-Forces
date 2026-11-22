class_name TouchScroll
extends Node
## Drag-to-scroll for every ScrollContainer, for touch screens. Godot only
## scrolls when the drag starts on the container itself; buttons and panels
## inside swallow the touch, so on a phone only the scroll bar worked. This
## watches touches globally: a drag of more than a few pixels inside a
## scrollable area scrolls it, and the finger's release is swallowed so the
## drag never counts as a tap on whatever was under it.

const START_DISTANCE: float = 14.0

var finger: int = -1
var start: Vector2
var last: Vector2
var target: ScrollContainer = null
var axis: int = -1 # 0 horizontal, 1 vertical
var dragging: bool = false
var swallow_release: bool = false

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		var st: InputEventScreenTouch = event
		if st.pressed and finger == -1:
			finger = st.index
			start = st.position
			last = st.position
			target = null
			dragging = false
			axis = -1
		elif not st.pressed and st.index == finger:
			finger = -1
			if dragging:
				dragging = false
				swallow_release = true
				get_viewport().set_input_as_handled()
	elif event is InputEventScreenDrag:
		var sd: InputEventScreenDrag = event
		if sd.index != finger:
			return
		if not dragging:
			var d: Vector2 = sd.position - start
			if d.length() < START_DISTANCE:
				return
			axis = 0 if absf(d.x) > absf(d.y) else 1
			target = _find_target(start, axis)
			if target == null:
				finger = -1 # not a scroll: leave the touch to the game
				return
			dragging = true
			last = sd.position
		var delta: Vector2 = sd.position - last
		last = sd.position
		if axis == 0:
			target.scroll_horizontal -= int(round(delta.x))
		else:
			target.scroll_vertical -= int(round(delta.y))
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseButton and swallow_release and not (event as InputEventMouseButton).pressed:
		# The emulated mouse release of the same finger.
		swallow_release = false
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseMotion and dragging:
		get_viewport().set_input_as_handled()

## The innermost visible ScrollContainer under the point that can scroll along
## the axis.
func _find_target(p: Vector2, ax: int) -> ScrollContainer:
	var best: ScrollContainer = null
	var best_area: float = INF
	for n: Node in get_tree().root.find_children("*", "ScrollContainer", true, false):
		var sc: ScrollContainer = n as ScrollContainer
		if not sc.is_visible_in_tree() or not sc.get_global_rect().has_point(p):
			continue
		if not _can_scroll(sc, ax):
			continue
		var area: float = sc.size.x * sc.size.y
		if area < best_area:
			best_area = area
			best = sc
	return best

static func _can_scroll(sc: ScrollContainer, ax: int) -> bool:
	if ax == 0:
		var hb: HScrollBar = sc.get_h_scroll_bar()
		return sc.horizontal_scroll_mode != ScrollContainer.SCROLL_MODE_DISABLED and hb.max_value - hb.page > 1.0
	var vb: VScrollBar = sc.get_v_scroll_bar()
	return sc.vertical_scroll_mode != ScrollContainer.SCROLL_MODE_DISABLED and vb.max_value - vb.page > 1.0
