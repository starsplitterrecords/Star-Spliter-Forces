extends Node2D
## Renders the provisional app icon (1024x1024) from the game's own vector
## language: Thunderbreak silhouette inside a signal ring. Placeholder until
## final art (ART_BIBLE.md).
##   xvfb-run -a godot --rendering-driver opengl3 --resolution 1024x1024 res://tools/IconRender.tscn

func _ready() -> void:
	get_window().content_scale_mode = Window.CONTENT_SCALE_MODE_DISABLED
	get_window().size = Vector2i(1024, 1024)
	await get_tree().process_frame
	queue_redraw()
	await RenderingServer.frame_post_draw
	await RenderingServer.frame_post_draw
	var img: Image = get_viewport().get_texture().get_image()
	img = img.get_region(Rect2i(0, 0, 1024, 1024))
	img.save_png("res://assets/icon.png")
	var small: Image = img.duplicate()
	small.resize(192, 192, Image.INTERPOLATE_LANCZOS)
	small.save_png("res://assets/icon_192.png")
	print("icon written")
	get_tree().quit()

func _draw() -> void:
	var c: Vector2 = Vector2(512, 512)
	draw_rect(Rect2(0, 0, 1024, 1024), Color("070a15"))
	for k in 18:
		draw_circle(c, 470.0 - k * 14.0, Color(0.1, 0.3, 0.5, 0.025))
	var accent: Color = Color("68ecff")
	var pink: Color = Color("f0327f")
	for k in 3:
		var r: float = 300.0 + k * 62.0
		draw_arc(c, r, -2.4 + k * 0.5, 0.6 + k * 0.5, 96, Color(accent, 0.75 - k * 0.2), 18.0 - k * 4.0)
	draw_arc(c, 300.0, 1.0, 2.2, 64, Color(pink, 0.9), 18.0)
	var wave: PackedVector2Array = PackedVector2Array()
	for i in 41:
		var x: float = 250.0 + i * 13.0
		wave.append(Vector2(x, 770.0 + sin(i * 0.6) * 26.0 * sin(i * 0.08 * PI)))
	draw_polyline(wave, Color(accent, 0.8), 8.0, true)
	var s: float = 7.2
	var hull: PackedVector2Array = PackedVector2Array()
	for p: Vector2 in [Vector2(0, -28), Vector2(9, -10), Vector2(24, 10), Vector2(10, 18), Vector2(0, 12), Vector2(-10, 18), Vector2(-24, 10), Vector2(-9, -10)]:
		hull.append(c + p * s + Vector2(0, -20))
	draw_circle(c + Vector2(-8, 22) * s + Vector2(0, -20), 6.0 * s, Color(accent, 0.45))
	draw_circle(c + Vector2(8, 22) * s + Vector2(0, -20), 6.0 * s, Color(accent, 0.45))
	draw_colored_polygon(hull, Color("8fd3ff"))
	var bridge: PackedVector2Array = PackedVector2Array()
	for p2: Vector2 in [Vector2(0, -18), Vector2(5, -4), Vector2(0, 4), Vector2(-5, -4)]:
		bridge.append(c + p2 * s + Vector2(0, -20))
	draw_colored_polygon(bridge, Color("0b1020"))
	draw_line(c + Vector2(-18, 8) * s + Vector2(0, -20), c + Vector2(18, 8) * s + Vector2(0, -20), Color.WHITE, 12.0)
