class_name ScreenInsets
extends RefCounted
## How much of each screen edge is hidden (in layout units): browser / app bars
## reported by the web page, the device's safe area, plus the player's own
## "Screen edge padding" setting for hosts nothing can detect.

## Returns Vector4(left, top, right, bottom) in viewport (layout) units.
static func get_insets(vp: Vector2) -> Vector4:
	var l: float = 0.0
	var t: float = 0.0
	var r: float = 0.0
	var b: float = 0.0
	if OS.has_feature("web"):
		var raw: Variant = JavaScriptBridge.eval("window.__ssfInsets ? window.__ssfInsets() : ''", true)
		if typeof(raw) == TYPE_STRING and String(raw) != "":
			var j: Variant = JSON.parse_string(String(raw))
			if typeof(j) == TYPE_DICTIONARY and float(j.get("w", 0.0)) > 0.0:
				var k: float = vp.x / float(j["w"])
				l = float(j.get("l", 0.0)) * k
				t = float(j.get("t", 0.0)) * k
				r = float(j.get("r", 0.0)) * k
				b = float(j.get("b", 0.0)) * k
	var pad: float = float(Profile.setting("edge_padding")) if Profile and not Profile.data.is_empty() else 0.0
	return Vector4(l, t + pad, r, b + pad)
