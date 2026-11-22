class_name RealmCodec
## JSON <-> game values for realm files: Vector2 as "@v2:x,y", Color as "@c:rrggbbaa".

static func encode(v: Variant) -> Variant:
	match typeof(v):
		TYPE_VECTOR2:
			return "@v2:%s,%s" % [str(v.x), str(v.y)]
		TYPE_COLOR:
			return "@c:" + (v as Color).to_html(true)
		TYPE_DICTIONARY:
			var o: Dictionary = {}
			for k: Variant in v:
				o[k] = encode(v[k])
			return o
		TYPE_ARRAY:
			return (v as Array).map(func(x: Variant) -> Variant: return encode(x))
	return v

static func decode(v: Variant) -> Variant:
	match typeof(v):
		TYPE_STRING:
			var s: String = v
			if s.begins_with("@v2:"):
				var p: PackedStringArray = s.substr(4).split(",")
				return Vector2(float(p[0]), float(p[1]))
			if s.begins_with("@c:"):
				return Color(s.substr(3))
			return s
		TYPE_FLOAT:
			# JSON has no ints; whole numbers come back as int.
			return int(v) if float(v) == floorf(float(v)) and absf(float(v)) < 1e9 else v
		TYPE_DICTIONARY:
			var o: Dictionary = {}
			for k: Variant in v:
				o[k] = decode(v[k])
			return o
		TYPE_ARRAY:
			return (v as Array).map(func(x: Variant) -> Variant: return decode(x))
	return v
