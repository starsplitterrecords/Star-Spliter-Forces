class_name ForcePlayer
extends Node2D

signal died

var move_input: Vector2 = Vector2.ZERO
var speed: float = 300.0
var hp: float = 100.0
var max_hp: float = 100.0
var invuln: float = 0.0
var accent: Color = Color("68ecff")
var pickup_range: float = 84.0
var damage_multiplier: float = 1.0
var cooldown_multiplier: float = 1.0
var character_id: String = "ilyra_venn"
var movement_ratio: float = 0.0
var force_state: String = "DRIFT"

func configure(id: String) -> void:
    character_id = id
    var d: Dictionary = GameData.CHARACTERS[id]
    speed = float(d.speed)
    max_hp = float(d.max_hp)
    hp = max_hp
    accent = d.accent
    queue_redraw()

func set_force_state(state: String) -> void:
    force_state = state
    queue_redraw()

func _process(delta: float) -> void:
    invuln = maxf(0.0, invuln - delta)
    movement_ratio = move_input.limit_length(1.0).length()
    position += move_input.limit_length(1.0) * speed * delta
    position.x = clampf(position.x, -WorldDirector.HALF_SIZE.x, WorldDirector.HALF_SIZE.x)
    position.y = clampf(position.y, -WorldDirector.HALF_SIZE.y, WorldDirector.HALF_SIZE.y)
    queue_redraw()

func hurt(amount: float) -> bool:
    if invuln > 0.0:
        return false
    hp -= amount
    invuln = 0.55
    if hp <= 0.0:
        hp = 0.0
        died.emit()
    return true

func heal(amount: float) -> void:
    hp = minf(max_hp, hp + amount)

func _draw() -> void:
    var flicker: bool = invuln > 0.0 and int(Time.get_ticks_msec()/60) % 2 == 0
    var c: Color = Color(accent, 0.35) if flicker else accent
    var aura: Color = Color(c, 0.10)
    if force_state == "RESONANCE":
        aura = Color(c, 0.23)
    elif force_state == "FRACTURE":
        aura = Color("ff376f", 0.18)
    draw_circle(Vector2.ZERO, 40.0 if force_state == "RESONANCE" else 34.0, aura)
    if character_id == "ilyra_venn":
        draw_colored_polygon(PackedVector2Array([Vector2(0,-24),Vector2(18,-8),Vector2(15,18),Vector2(0,11),Vector2(-15,18),Vector2(-18,-8)]), c)
        draw_line(Vector2(-12,-4),Vector2(12,-4),Color("f7fbff"),3.0)
    else:
        draw_colored_polygon(PackedVector2Array([Vector2(0,-22),Vector2(19,15),Vector2(0,9),Vector2(-19,15)]), c)
    draw_circle(Vector2.ZERO, 5.0, Color("f7fbff"))
