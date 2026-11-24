extends Node2D
## Probe: the bloom shader in this renderer. Captures off/on.

func _ready() -> void:
	var out_dir: String = OS.get_cmdline_user_args()[0]
	DirAccess.make_dir_recursive_absolute(out_dir)
	await get_tree().create_timer(0.3).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(out_dir.path_join("glow_off.png"))
	var layer: CanvasLayer = CanvasLayer.new()
	add_child(layer)
	var rect: ColorRect = ColorRect.new()
	rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var mat: ShaderMaterial = ShaderMaterial.new()
	mat.shader = load("res://shaders/bloom.gdshader")
	rect.material = mat
	layer.add_child(rect)
	await get_tree().create_timer(0.3).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(out_dir.path_join("glow_on.png"))
	get_tree().quit()

func _draw() -> void:
	draw_rect(Rect2(0, 0, 400, 300), Color("080a16"))
	draw_circle(Vector2(100, 150), 20, Color("68ecff"))
	draw_circle(Vector2(200, 150), 12, Color("ff376f"))
	draw_line(Vector2(260, 80), Vector2(360, 220), Color("ffe08a"), 4.0)
