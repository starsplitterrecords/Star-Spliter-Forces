class_name GameData
extends RefCounted

const RUN_LENGTH := 600.0
const WORLD_HALF := Vector2(1500.0, 1000.0)

const CHARACTERS := {
	"ilyra_venn": {
		"name": "Commodore Ilyra Venn",
		"tagline": "Hold the corridor. Bring them home.",
		"origin": "Rex Fleet",
		"speed": 300.0,
		"max_hp": 112.0,
		"starting_weapon": "pulse_bolt",
		"starting_force": "pulse_width_codex",
		"accent": Color("68ecff")
	},
	"ghost_driver_unit": {
		"name": "Ghost Driver Unit",
		"tagline": "Velocity is a weapon.",
		"origin": "Star Splitter Records",
		"speed": 335.0,
		"max_hp": 88.0,
		"starting_weapon": "ghost_mine",
		"starting_force": "ghost_driver",
		"accent": Color("ff4fd8")
	}
}

const FORCES := {
	"pulse_width_codex": {
		"name": "Pulse Width Codex",
		"philosophy": "Build tension toward earned release.",
		"resonance_bonus": "Faster cooldowns and multi-shot pulses in Resonance.",
		"color": Color("64f4ff")
	},
	"star_splitter_rex": {
		"name": "Star Splitter Rex",
		"philosophy": "Scale becomes meaningful when impact and architecture collide.",
		"resonance_bonus": "Damage and knock force rise with intensity.",
		"color": Color("ff7657")
	},
	"resonant_currents": {
		"name": "Resonant Currents",
		"philosophy": "Space is an instrument.",
		"resonance_bonus": "Echoes repeat attacks after a delay.",
		"color": Color("71cda0")
	},
	"ghost_driver": {
		"name": "Ghost Driver Unit",
		"philosophy": "Momentum is survival.",
		"resonance_bonus": "Movement speed feeds damage and mine frequency.",
		"color": Color("ff4fd8")
	}
}

const WEAPONS := {
	"pulse_bolt": {"name":"Pulse Bolt","desc":"Homing packets seek the nearest hostile signal.","max":6,"force":"pulse_width_codex"},
	"orbit_shard": {"name":"Orbit Shard","desc":"Fragments carve a defensive geometry around you.","max":6,"force":"star_splitter_rex"},
	"resonance_wave": {"name":"Resonance Wave","desc":"A radial shock that rewards letting enemies approach.","max":6,"force":"resonant_currents"},
	"ion_lance": {"name":"Ion Lance","desc":"A piercing line built for impossible corridors.","max":6,"force":"star_splitter_rex"},
	"ghost_mine": {"name":"Ghost Mine","desc":"Leaves unstable fields in your wake.","max":6,"force":"ghost_driver"},
	"warm_drone": {"name":"Warm Circuit Drone","desc":"A companion emitter alternates fire across the field.","max":6,"force":"pulse_width_codex"}
}

const PASSIVES := {
	"amplifier": {"name":"Signal Amplifier","desc":"+15% weapon damage per rank.","max":5},
	"capacitor": {"name":"Overclock Capacitor","desc":"-8% weapon cooldown per rank.","max":5},
	"collector": {"name":"Resonant Collector","desc":"+28 pickup range per rank.","max":5},
	"hull": {"name":"Reactive Hull","desc":"+18 max HP and heal 18 per rank.","max":5}
}

const ENEMIES := {
	"static_wisp": {"hp":18.0,"speed":92.0,"damage":8.0,"xp":1,"radius":13.0,"color":Color("8f80ff"),"behavior":"drift"},
	"scrap_hound": {"hp":42.0,"speed":130.0,"damage":12.0,"xp":2,"radius":18.0,"color":Color("ff895c"),"behavior":"charge"},
	"carrier": {"hp":90.0,"speed":66.0,"damage":16.0,"xp":4,"radius":25.0,"color":Color("5ee6a8"),"behavior":"orbit"},
	"elite_null": {"hp":460.0,"speed":86.0,"damage":24.0,"xp":25,"radius":36.0,"color":Color("ffd75e"),"behavior":"surge"},
	"the_silence": {"hp":5500.0,"speed":74.0,"damage":30.0,"xp":200,"radius":70.0,"color":Color("ff376f"),"behavior":"boss"}
}

static func xp_required(level: int) -> int:
	return int(7 + pow(level, 1.42) * 5.0)

static func format_time(seconds: float) -> String:
	var s: int = maxi(0, int(seconds))
	return "%02d:%02d" % [s / 60, s % 60]
