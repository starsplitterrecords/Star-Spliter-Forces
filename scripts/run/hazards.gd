class_name HazardSystem
extends Node2D
## Hostile and environmental area effects. Every damaging effect is
## telegraphed first (a pale ring or line) so positioning, not reflex, decides.
##   pool     – lingering denial area (mine haulers)
##   strike   – environmental lightning: warns, then hits players AND enemies
##   beam     – boss sweep line (already telegraphed by the boss)
##   silence  – zone where the player's weapons fall silent
##   wave     – expanding shockwave (elites)

var run: Node
var items: Array = [] # Dictionaries
var anim: float = 0.0

func add(kind: String, pos: Vector2, radius: float, damage: float, life: float, color: Color, extra: Dictionary = {}) -> void:
	var h: Dictionary = {"kind": kind, "pos": pos, "radius": radius, "damage": damage, "life": life, "max_life": life, "color": color, "tick": 0.0, "fired": false}
	h.merge(extra)
	items.append(h)

func clear() -> void:
	items.clear()

func player_silenced(pos: Vector2) -> bool:
	for h: Dictionary in items:
		if h.kind == "silence" and pos.distance_to(h.pos) < float(h.radius):
			return true
	return false

func step(delta: float, player: ForcePlayer, hash: SpatialHash) -> void:
	anim += delta
	for i in range(items.size() - 1, -1, -1):
		var h: Dictionary = items[i]
		h.life = float(h.life) - delta
		h.tick = float(h.tick) - delta
		var d: float = player.position.distance_to(h.pos)
		match String(h.kind):
			"pool":
				if d < float(h.radius) + 10.0 and float(h.tick) <= 0.0 and float(h.max_life) - float(h.life) > 0.6:
					h.tick = 0.7
					run.player_hit(float(h.damage), h.pos)
			"strike":
				# Warning for `warn` seconds, then a single strike.
				if not bool(h.fired) and float(h.max_life) - float(h.life) >= float(h.get("warn", 1.1)):
					h.fired = true
					run.fx.beam(h.pos + Vector2(randf_range(-30, 30), -520), h.pos, Color("fff1b8"), 0.25, 14.0)
					run.fx.ring(h.pos, 10.0, float(h.radius) * 1.2, Color("ffe08a"), 0.4, 6.0)
					run.fx.burst(h.pos, Color("fff1b8"), 14, 320.0)
					run.shake(6.0)
					Audio.play_sfx("strike", randf_range(0.9, 1.1), -4.0)
					if d < float(h.radius):
						run.player_hit(float(h.damage), h.pos)
					for e: ForceEnemy in hash.query(h.pos, float(h.radius)):
						if not e.dead and e.position.distance_to(h.pos) < float(h.radius) + e.radius:
							run.damage_enemy(e, float(h.damage) * 6.0, (e.position - h.pos).normalized(), 260.0, "environment")
			"beam":
				if not bool(h.fired):
					h.fired = true
					var dir: Vector2 = h.dir
					var rel: Vector2 = player.position - h.pos
					var along: float = rel.dot(dir)
					if along > 0.0 and along < float(h.length) and absf(rel.cross(dir)) < float(h.radius):
						run.player_hit(float(h.damage), h.pos)
			"wave":
				var progress: float = 1.0 - float(h.life) / float(h.max_life)
				var front: float = float(h.radius) * progress
				if not bool(h.fired) and absf(d - front) < 26.0:
					h.fired = true
					run.player_hit(float(h.damage), h.pos)
		if float(h.life) <= 0.0:
			items.remove_at(i)
	queue_redraw()

func _draw() -> void:
	for h: Dictionary in items:
		var c: Color = h.color
		var t: float = clampf(float(h.life) / float(h.max_life), 0.0, 1.0)
		match String(h.kind):
			"pool":
				var grow: float = clampf((float(h.max_life) - float(h.life)) / 0.6, 0.0, 1.0)
				draw_circle(h.pos, float(h.radius) * grow, Color(c, 0.16 * minf(1.0, t * 3.0)))
				draw_arc(h.pos, float(h.radius) * grow, anim, anim + TAU, 32, Color(c, 0.55 * minf(1.0, t * 3.0)), 2.0)
				for k in 3:
					var a: float = anim * 1.5 + TAU * k / 3.0
					draw_circle(h.pos + Vector2.from_angle(a) * float(h.radius) * 0.5, 3.0, Color(c, 0.6))
			"strike":
				if not bool(h.fired):
					var warn: float = float(h.get("warn", 1.1))
					var p: float = clampf((float(h.max_life) - float(h.life)) / warn, 0.0, 1.0)
					draw_circle(h.pos, float(h.radius), Color(1.0, 0.9, 0.55, 0.06 + 0.12 * p))
					draw_arc(h.pos, float(h.radius), 0.0, TAU, 40, Color(1.0, 0.9, 0.55, 0.35 + 0.5 * p), 2.0)
					draw_arc(h.pos, float(h.radius) * p, 0.0, TAU, 40, Color(1.0, 0.95, 0.75, 0.6), 3.0)
			"beam":
				var dir2: Vector2 = h.dir
				draw_line(h.pos, h.pos + dir2 * float(h.length), Color(c, 0.6 * t), float(h.radius) * 2.0 * t)
				draw_line(h.pos, h.pos + dir2 * float(h.length), Color(1, 1, 1, 0.9 * t), 4.0)
			"silence":
				var appear: float = clampf((float(h.max_life) - float(h.life)) * 3.0, 0.0, 1.0)
				draw_circle(h.pos, float(h.radius) * appear, Color(0.02, 0.02, 0.05, 0.55 * minf(1.0, t * 4.0)))
				draw_arc(h.pos, float(h.radius) * appear, -anim, -anim + TAU, 40, Color(c, 0.7 * minf(1.0, t * 4.0)), 3.0)
				# Muted "waveform" flatline marks the zone without relying on colour.
				draw_line(h.pos + Vector2(-float(h.radius) * 0.5, 0), h.pos + Vector2(float(h.radius) * 0.5, 0), Color(1, 1, 1, 0.35), 2.0)
			"wave":
				var progress: float = 1.0 - t
				draw_arc(h.pos, float(h.radius) * progress, 0.0, TAU, 56, Color(c, 0.8 * t), 8.0)
