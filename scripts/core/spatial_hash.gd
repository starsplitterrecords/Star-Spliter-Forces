class_name SpatialHash
extends RefCounted
## Uniform grid broad-phase. Rebuilt once per frame from the live enemy list;
## queries return candidates whose cells overlap a circle. Keeps projectile
## and area-weapon collision O(n) instead of O(projectiles × enemies).

var cell_size: float = 96.0
var cells: Dictionary = {} # Vector2i -> Array
var max_radius: float = 0.0
var _scratch: Array = []

func _init(size: float = 96.0) -> void:
	cell_size = size

func clear() -> void:
	cells.clear()
	max_radius = 0.0

func _key(p: Vector2) -> Vector2i:
	return Vector2i(floori(p.x / cell_size), floori(p.y / cell_size))

func insert(item: Variant, pos: Vector2, item_radius: float = 0.0) -> void:
	max_radius = maxf(max_radius, item_radius)
	var k: Vector2i = _key(pos)
	var bucket: Variant = cells.get(k)
	if bucket == null:
		cells[k] = [item]
	else:
		(bucket as Array).append(item)

## Returns a shared scratch array — copy it if you need to keep it.
## The search is padded by the largest inserted radius so big bodies are found.
func query(center: Vector2, radius: float) -> Array:
	_scratch.clear()
	radius += max_radius
	var lo: Vector2i = _key(center - Vector2(radius, radius))
	var hi: Vector2i = _key(center + Vector2(radius, radius))
	for x in range(lo.x, hi.x + 1):
		for y in range(lo.y, hi.y + 1):
			var bucket: Variant = cells.get(Vector2i(x, y))
			if bucket != null:
				_scratch.append_array(bucket)
	return _scratch
