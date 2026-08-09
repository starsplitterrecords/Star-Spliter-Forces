class_name GameData
extends RefCounted

const RUN_LENGTH := 600.0
const WORLD_HALF := Vector2(1500.0, 1000.0)

const CHARACTERS := {
	"pulse_width_codex": {
		"name": "Pulse Width Codex",
		"tagline": "A waveform given intent.",
		"speed": 285.0,
		"max_hp": 100.0,
		"starting_weapon": "pulse_bolt",
		"accent": Color("64f4ff")
	},
	"ghost_driver_unit": {
		"name": "Ghost Driver Unit",
		"tagline": "Velocity is a weapon.",
		"speed": 325.0,
		"max_hp": 85.0,
		"starting_weapon": "ghost_mine",
		"accent": Color("ff4fd8")
	}
}

const WEAPONS := {
	"pulse_bolt": {"name":"Pulse Bolt","desc":"Homing packets seek the nearest signal.","max":6},
	"orbit_shard": {"name":"Orbit Shard","desc":"Fragments rotate through anything nearby.","max":6},
	"resonance_wave": {"name":"Resonance Wave","desc":"A periodic radial shock of compressed sound.","max":6},
	"ion_lance": {"name":"Ion Lance","desc":"A piercing line of charged light.","max":6},
	"ghost_mine": {"name":"Ghost Mine","desc":"Drops unstable fields that detonate after a delay.","max":6},
	"warm_drone": {"name":"Warm Circuit Drone","desc":"A companion emitter fires alternating bursts.","max":6}
}

const PASSIVES := {
	"amplifier": {"name":"Signal Amplifier","desc":"+15% weapon damage per rank.","max":5},
	"capacitor": {"name":"Overclock Capacitor","desc":"-8% weapon cooldown per rank.","max":5},
	"collector": {"name":"Resonant Collector","desc":"+28 pickup range per rank.","max":5},
	"hull": {"name":"Reactive Hull","desc":"+18 max HP and heal 18 per rank.","max":5}
}

const ENEMIES := {
	"static_wisp": {"hp":18.0,"speed":88.0,"damage":8.0,"xp":1,"radius":13.0,"color":Color("8f80ff")},
	"scrap_hound": {"hp":42.0,"speed":126.0,"damage":12.0,"xp":2,"radius":18.0,"color":Color("ff895c")},
	"carrier": {"hp":90.0,"speed":62.0,"damage":16.0,"xp":4,"radius":25.0,"color":Color("5ee6a8")},
	"elite_null": {"hp":460.0,"speed":82.0,"damage":24.0,"xp":25,"radius":36.0,"color":Color("ffd75e")},
	"the_silence": {"hp":5500.0,"speed":72.0,"damage":30.0,"xp":200,"radius":70.0,"color":Color("ff376f")}
}

static func xp_required(level: int) -> int:
	return int(7 + pow(level, 1.42) * 5.0)

static func format_time(seconds: float) -> String:
	var s: int = maxi(0, int(seconds))
	return "%02d:%02d" % [s / 60, s % 60]
