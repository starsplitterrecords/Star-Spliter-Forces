extends Node

const HALF_SIZE := Vector2(5000.0, 3200.0)
const EXTRACTION_POINT := Vector2.ZERO
const EXPEDITION_SECONDS := 1200.0

const SIGNAL_POSITIONS: Array = [
    Vector2(1850,-920),
    Vector2(-2700,-1550),
    Vector2(3300,1900)
]

const LANDMARKS: Array = [
    {"name":"ARRAY GATE","position":Vector2(0,0),"radius":220.0,"color":Color("68ecff")},
    {"name":"SILVER WRECKS","position":Vector2(1450,1150),"radius":520.0,"color":Color("8aa7c7")},
    {"name":"THUNDERBREAK SHELF","position":Vector2(-2550,-1300),"radius":650.0,"color":Color("ff9a5f")},
    {"name":"QUIET BASIN","position":Vector2(-1100,2100),"radius":600.0,"color":Color("71cda0")},
    {"name":"NIGHT CORRIDOR","position":Vector2(3050,1550),"radius":700.0,"color":Color("ff4fd8")}
]

var configured_runs: Dictionary = {}

class ExpeditionOverlay:
    extends Node2D
    var run
    func _init(run_node) -> void:
        run = run_node
    func _process(_delta: float) -> void:
        queue_redraw()
    func _draw() -> void:
        draw_rect(Rect2(-HALF_SIZE, HALF_SIZE * 2.0), Color("080b16"))
        for landmark in LANDMARKS:
            var pos: Vector2 = Vector2(landmark.position)
            var c: Color = Color(landmark.color)
            draw_circle(pos, float(landmark.radius), Color(c,0.035))
            draw_arc(pos,float(landmark.radius),0.0,TAU,64,Color(c,0.12),2.0)
            draw_string(ThemeDB.fallback_font,pos+Vector2(-150,-float(landmark.radius)-18),String(landmark.name),HORIZONTAL_ALIGNMENT_CENTER,300,18,Color(c,0.62))
        draw_circle(EXTRACTION_POINT,82.0,Color(0.25,0.9,1.0,0.04))
        var ready: bool = run != null and bool(run.extraction_ready)
        draw_arc(EXTRACTION_POINT,105.0,0.0,TAU,48,Color(0.3,0.9,1.0,0.42 if ready else 0.14),3.0)

func _process(_delta: float) -> void:
    var root: Node = get_tree().current_scene
    if root == null:
        return
    var run = _find_run(root)
    if run == null:
        return
    var id: int = run.get_instance_id()
    if not configured_runs.has(id):
        _configure_run(run)
        configured_runs[id] = true
    _update_run(run)

func _find_run(node: Node):
    if node is GameRun:
        return node
    for child in node.get_children():
        var found = _find_run(child)
        if found != null:
            return found
    return null

func _configure_run(run) -> void:
    if not bool(run.quick_test_mode):
        run.run_length = EXPEDITION_SECONDS
    var index: int = 0
    for node in run.discovery_nodes:
        if is_instance_valid(node) and index < SIGNAL_POSITIONS.size():
            node.position = SIGNAL_POSITIONS[index]
            index += 1
    var overlay := ExpeditionOverlay.new(run)
    overlay.z_index = -10
    run.add_child(overlay)
    var guide := Label.new()
    guide.name = "ExplorationGuide"
    guide.position = Vector2(24,145)
    guide.size = Vector2(1100,45)
    guide.add_theme_font_size_override("font_size",16)
    guide.modulate = Color(0.75,0.95,1.0,0.78)
    run.hud_layer.add_child(guide)

func _update_run(run) -> void:
    if run.player == null:
        return
    run.player.position.x = clampf(run.player.position.x,-HALF_SIZE.x,HALF_SIZE.x)
    run.player.position.y = clampf(run.player.position.y,-HALF_SIZE.y,HALF_SIZE.y)
    if not bool(run.quick_test_mode) and bool(run.extraction_ready) and not bool(run.boss_spawned):
        if run.player.position.distance_to(EXTRACTION_POINT) <= 180.0:
            run.spawn_boss()
    var guide: Label = run.hud_layer.get_node_or_null("ExplorationGuide")
    if guide != null:
        guide.text = _guidance_text(run)

func _guidance_text(run) -> String:
    if bool(run.boss_spawned):
        return "ARRAY GATE: extraction contested"
    if bool(run.extraction_ready):
        return "Return to ARRAY GATE  •  %dm" % int(run.player.position.distance_to(EXTRACTION_POINT))
    var nearest_distance: float = INF
    var nearest_delta: Vector2 = Vector2.ZERO
    for node in run.discovery_nodes:
        if is_instance_valid(node):
            var d: float = run.player.position.distance_to(node.position)
            if d < nearest_distance:
                nearest_distance = d
                nearest_delta = node.position-run.player.position
    if nearest_distance == INF:
        return "Explore the reach"
    var direction: String = "E"
    if absf(nearest_delta.y) > absf(nearest_delta.x):
        direction = "S" if nearest_delta.y > 0.0 else "N"
    elif nearest_delta.x < 0.0:
        direction = "W"
    return "Nearest unresolved signal: %s  %dm  •  %s" % [direction,int(nearest_distance),_region_name(run.player.position)]

func _region_name(pos: Vector2) -> String:
    for landmark in LANDMARKS:
        if pos.distance_to(Vector2(landmark.position)) <= float(landmark.radius):
            return String(landmark.name)
    return "BLACK DRIFT REACH"
