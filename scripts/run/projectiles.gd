class_name ProjectileSystem
extends Node2D
## Pooled, data-oriented projectiles drawn in a single canvas item.
## Player shots query the enemy spatial hash; hostile shots test the player.

class Shot:
	extends RefCounted
	var pos: Vector2
	var vel: Vector2
	var damage: float
	var life: float
	var radius: float
	var color: Color
	var pierce: int
	var hostile: bool
	var homing: float
	var knock: float
	var weapon: String
	var echo: int
	var split: int
	var hit: Dictionary = {}
	var active: bool = false

var run: Node
var shots: Array[Shot] = []
var pool: Array[Shot] = []
const MAX_SHOTS: int = 420

func spawn(pos: Vector2, vel: Vector2, damage: float, life: float, radius: float, color: Color, opts: Dictionary = {}) -> Shot:
	if shots.size() >= MAX_SHOTS:
		return null
	var s: Shot = pool.pop_back() if not pool.is_empty() else Shot.new()
	s.pos = pos
	s.vel = vel
	s.damage = damage
	s.life = life
	s.radius = radius
	s.color = color
	s.pierce = int(opts.get("pierce", 0))
	s.hostile = bool(opts.get("hostile", false))
	s.homing = float(opts.get("homing", 0.0))
	s.knock = float(opts.get("knock", 60.0))
	s.weapon = String(opts.get("weapon", ""))
	s.echo = int(opts.get("echo", 0))
	s.split = int(opts.get("split", 0))
	s.hit.clear()
	s.active = true
	shots.append(s)
	return s

func clear_hostile() -> void:
	for s: Shot in shots:
		if s.hostile:
			s.active = false

func step(delta: float, hash: SpatialHash, player: ForcePlayer) -> void:
	for i in range(shots.size() - 1, -1, -1):
		var s: Shot = shots[i]
		if s.active:
			s.life -= delta
			if s.homing > 0.0 and not s.hostile:
				var target: ForceEnemy = run.nearest_enemy(s.pos, 420.0)
				if target:
					var want: Vector2 = s.pos.direction_to(target.position) * s.vel.length()
					s.vel = s.vel.lerp(want, minf(1.0, s.homing * delta))
			s.pos += s.vel * delta
			if s.life <= 0.0:
				s.active = false
			elif s.hostile:
				if player.alive and s.pos.distance_squared_to(player.position) < pow(s.radius + 14.0, 2.0):
					run.player_hit(s.damage, s.pos)
					s.active = false
			else:
				_hit_enemies(s, hash)
		if not s.active:
			shots.remove_at(i)
			pool.append(s)
	queue_redraw()

func _hit_enemies(s: Shot, hash: SpatialHash) -> void:
	for e: ForceEnemy in hash.query(s.pos, s.radius + 4.0):
		if e.dead:
			continue
		var id: int = e.get_instance_id()
		if s.hit.has(id):
			continue
		var r: float = s.radius + e.radius
		if s.pos.distance_squared_to(e.position) < r * r:
			s.hit[id] = true
			run.damage_enemy(e, s.damage, s.vel.normalized(), s.knock, s.weapon)
			if s.split > 0:
				for k in 2:
					var v: Vector2 = s.vel.rotated(0.55 * (1.0 if k == 0 else -1.0)) * 0.85
					var child: Shot = spawn(s.pos, v, s.damage * 0.5, 0.6, s.radius * 0.7, s.color, {"weapon": s.weapon, "knock": s.knock * 0.5})
					if child:
						child.hit = s.hit.duplicate()
				s.split = 0
			if s.pierce <= 0:
				s.active = false
				return
			s.pierce -= 1

func _draw() -> void:
	for s: Shot in shots:
		if not s.active:
			continue
		var tail: Vector2 = s.vel.normalized() * s.radius * (3.0 if not s.hostile else 1.6)
		if s.hostile:
			draw_circle(s.pos, s.radius * 1.9, Color(s.color, 0.18))
			draw_circle(s.pos, s.radius, s.color)
			draw_circle(s.pos, s.radius * 0.45, Color(1, 1, 1, 0.9))
		else:
			draw_line(s.pos - tail, s.pos, Color(s.color, 0.45), s.radius * 1.2)
			draw_circle(s.pos, s.radius * 1.7, Color(s.color, 0.14))
			draw_circle(s.pos, s.radius, s.color)
			draw_circle(s.pos, s.radius * 0.45, Color(1, 1, 1, 0.85))
