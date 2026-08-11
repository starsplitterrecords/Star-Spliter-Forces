class_name DiscoveryNode
extends Node2D

signal discovered(node: DiscoveryNode)

var discovery_id: String = ""
var title: String = "Unknown Signal"
var project: String = ""
var track: String = ""
var force_id: String = ""
var description: String = ""
var radius: float = 30.0
var pulse: float = 0.0
var claimed: bool = false

func configure(data: Dictionary) -> void:
	discovery_id = String(data.get("id", "signal"))
	title = String(data.get("title", "Unknown Signal"))
	project = String(data.get("project", ""))
	track = String(data.get("track", ""))
	force_id = String(data.get("force", ""))
	description = String(data.get("description", ""))
	queue_redraw()

func _process(delta: float) -> void:
	pulse += delta
	queue_redraw()

func claim() -> void:
	if claimed:
		return
	claimed = true
	discovered.emit(self)
	queue_free()

func _draw() -> void:
	var glow: float = 0.55 + sin(pulse * 2.2) * 0.18
	var color: Color = Color("72f2ff")
	if force_id == "resonant_currents":
		color = Color("72ffbe")
	elif force_id == "star_splitter_rex":
		color = Color("ffb347")
	elif force_id == "ghost_driver_unit":
		color = Color("ff5fd2")
	draw_circle(Vector2.ZERO, radius + 14.0 + sin(pulse * 1.7) * 5.0, Color(color, 0.08))
	draw_arc(Vector2.ZERO, radius + 7.0, 0.0, TAU, 32, Color(color, glow), 2.0)
	draw_circle(Vector2.ZERO, radius, Color(0.03,0.05,0.09,0.92))
	draw_line(Vector2(-12,0), Vector2(12,0), color, 2.0)
	draw_line(Vector2(0,-12), Vector2(0,12), color, 2.0)
