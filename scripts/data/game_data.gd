class_name GameData
extends RefCounted
## Single source of truth for game content. Everything here is plain data so
## new characters, Forces, regions and discoveries can be added without code.
##
## Canon status markers used in comments:
##   [CANON]       documented in StarSplitterVisions / RexPrompt sources
##   [CATALOG]     verbatim Star Splitter Records catalog metadata
##   [PROVISIONAL] newly proposed game content, not established canon
## See CONTENT_MANIFEST.md for the full inventory and sources.

# ============================================================== characters
# Rex Fleet characters [CANON identities; gameplay kits PROVISIONAL].

const CHARACTERS: Dictionary = {
	"ella_venn": {
		"name": "Commodore Ella Venn",
		"short": "VENN",
		"origin": "Rex Fleet — The Fleet",
		"vessel": "Thunderbreak (heavy cruiser)",
		"tagline": "Save lives without turning protection into provocation.",
		"bio": "Commander of the old heavy cruiser Thunderbreak. Calm, deliberate and unshowy; her authority comes from steadiness and operational clarity.",
		"style": "cruiser",
		"accent": Color("8fd3ff"),
		"speed": 232.0,
		"max_hp": 140.0,
		"armor": 1.5,
		"pickup": 115.0,
		"ability": "hold_the_line",
		"trait": "Command Presence: +1.5 armour. Repair cells restore 50% more.",
		"weakness": "Heaviest hull in the fleet — the slowest explorer.",
		"unlock": "Available from the start.",
	},
	"naomi_sol": {
		"name": "Captain Naomi Sol",
		"short": "SOL",
		"origin": "Rex Fleet — The Verge",
		"vessel": "Verge escort fighter",
		"tagline": "Damaged corridors are just roads nobody else will drive.",
		"bio": "Veteran Verge escort commander whose corridor knowledge comes from repeated real crossings. Blunt, sharp and proud.",
		"style": "interceptor",
		"accent": Color("c6e27a"),
		"speed": 300.0,
		"max_hp": 82.0,
		"armor": 0.0,
		"pickup": 110.0,
		"ability": "corridor_run",
		"trait": "Corridor Sense: environmental hazards deal half damage; +15% damage while at full speed.",
		"weakness": "A light escort hull — mistakes hurt.",
		"unlock": "Answer the Verge escort beacon in the Night Corridor.",
	},
	"tessa_banks": {
		"name": "Tessa Banks",
		"short": "BANKS",
		"origin": "Rex Fleet — The Shards",
		"vessel": "Gravefire (cutter)",
		"tagline": "Seal the breach. Argue later.",
		"bio": "Captain of the Gravefire, a compact Shard working ship kept alive through visible repair. Sparse, cutting, honest and weary of ideology.",
		"style": "hauler",
		"accent": Color("e9e4dc"),
		"speed": 248.0,
		"max_hp": 110.0,
		"armor": 0.5,
		"pickup": 150.0,
		"ability": "seal_the_breach",
		"trait": "Field Repair: every 40 Signal motes collected restore 4 hull.",
		"weakness": "Weapons deal 10% less damage.",
		"unlock": "Recover the Gravefire distress call in the Silver Wrecks.",
	},
	"kess_darrow": {
		"name": "Kess Darrow",
		"short": "DARROW",
		"origin": "Rex Fleet — Glass Horizon survey",
		"vessel": "Lantern Two (survey cutter)",
		"tagline": "If it's out there, I'd like to have a look first.",
		"bio": "Lead survey pilot of the Glass Horizon, flying the cutter Lantern Two. Quick, practical and lightly funny under pressure.",
		"style": "scout",
		"accent": Color("c8a2ff"),
		"speed": 268.0,
		"max_hp": 92.0,
		"armor": 0.0,
		"pickup": 125.0,
		"ability": "survey_ping",
		"trait": "Survey Instruments: double scanner range; every tuned signal grants a bonus upgrade.",
		"weakness": "Weapons recharge 10% slower.",
		"unlock": "Complete an expedition — Glass Horizon follows the cleared signal.",
	},
	"jex_marrin": {
		"name": "Jex Marrin",
		"short": "MARRIN",
		"origin": "Rex Fleet — Veil Market",
		"vessel": "Veil Market courier",
		"tagline": "Every route has a price. Some are worth paying.",
		"bio": "Independent Veil Market broker who knows timing windows, shear markers and traffic. Smooth, sardonic, transactional — anomaly-glass beads sewn into his cloak bend the light.",
		"style": "wraith",
		"accent": Color("ffcf7a"),
		"speed": 264.0,
		"max_hp": 86.0,
		"armor": 0.0,
		"pickup": 115.0,
		"ability": "veil_step",
		"trait": "Broker: +40% Signal earned; one free reroll every level.",
		"weakness": "Fragile — and The Silence hunts him harder (+15% damage taken).",
		"unlock": "Find the Veil route token hidden in the Fracture Bloom.",
	},
}

const ABILITIES: Dictionary = {
	"hold_the_line": {"name": "Hold the Line", "cooldown": 16.0, "desc": "Project Thunderbreak's bulwark for 5s: hostile shots are destroyed, enemies inside are slowed and pushed back, and you repair steadily."},
	"corridor_run": {"name": "Corridor Run", "cooldown": 6.0, "desc": "Burst forward, untouchable, leaving a slipstream that damages everything it crosses."},
	"seal_the_breach": {"name": "Seal the Breach", "cooldown": 20.0, "desc": "Emergency repair: restore 35% hull and raise a shield for 4s."},
	"survey_ping": {"name": "Survey Ping", "cooldown": 14.0, "desc": "Reveal every point of interest within 1800m, including hidden ones, and stun nearby enemies."},
	"veil_step": {"name": "Veil Step", "cooldown": 15.0, "desc": "Anomaly-glass distortion: for 4s enemies lose your track and you move 35% faster."},
}

## Per-character mastery perks, unlocked by mastery level (earned per expedition).
const MASTERY: Dictionary = {
	"ella_venn": ["Bulwark lasts 1s longer.", "Bulwark pulses damage to enemies inside.", "Start each expedition with +20 max hull.", "Bulwark cooldown -4s."],
	"naomi_sol": ["Corridor Run gains a second charge.", "Slipstream damage doubled.", "+6% base speed.", "Corridor Run grants 1.5s of +40% damage."],
	"tessa_banks": ["Field Repair every 30 motes.", "Seal the Breach also restores 20 Resonance.", "+0.5 armour.", "Seal the Breach cooldown -6s."],
	"kess_darrow": ["Survey Ping radius +50%.", "Ping also charts the map fog it sweeps.", "Start with the Survey Scanner passive.", "Ping cooldown -4s."],
	"jex_marrin": ["Caches drop an extra magnet core.", "+15% Signal earned (stacks).", "Veil Step lasts 2s longer.", "Start with one extra upgrade choice."],
}

const MASTERY_THRESHOLDS: Array = [120, 360, 800, 1500]

static func mastery_level(xp: int) -> int:
	var lvl: int = 0
	for t: int in MASTERY_THRESHOLDS:
		if xp >= t:
			lvl += 1
	return lvl

# ============================================================== forces
# Each Force translates a Star Splitter Records project's documented musical
# language [CATALOG] into a mechanic [PROVISIONAL interpretation].

const FORCES: Dictionary = {
	"pulse_width_codex": {
		"name": "Pulse Width Codex", "field": "Melodic dance", "color": Color("f0327f"),
		"tagline": "Dance music can move the body and still carry a generous emotional center.",
		"mechanic": "BUILD & DROP", "motif_layer": "force_codex",
		"desc": "Codex hits fill the Build. When it peaks, the next bar lands a Drop: a radiant pulse and a burst of tempo.",
		"primary": "pulse_bolt",
	},
	"resonant_currents": {
		"name": "Resonant Currents", "field": "Dub", "color": Color("da3929"),
		"tagline": "Space is an instrument.",
		"mechanic": "ECHO & SPACE", "motif_layer": "force_currents",
		"desc": "Currents attacks repeat as delayed echoes, and hit harder against enemies with empty space around them.",
		"primary": "sub_wave",
	},
	"ghost_driver_unit": {
		"name": "Ghost Driver Unit", "field": "Modern rock", "color": Color("e8e3d8"),
		"tagline": "Rock survives when the song is stronger than the costume.",
		"mechanic": "MOMENTUM", "motif_layer": "force_ghost",
		"desc": "Sustained movement builds Momentum (up to +50% damage). Stopping lets it fall away.",
		"primary": "power_chord",
	},
	"star_splitter_rex": {
		"name": "Star Splitter Rex", "field": "Cinematic rock instrumentals", "color": Color("71e8f5"),
		"tagline": "Music for a boss fight.",
		"mechanic": "IMPACT", "motif_layer": "force_rex",
		"desc": "Rex weapons hit with real weight: heavy knockback, and +35% damage to elites and bosses.",
		"primary": "ion_lance",
	},
	"ion_drive_orchestra": {
		"name": "Ion Drive Orchestra", "field": "Symphonic electronic", "color": Color("f1b826"),
		"tagline": "The orchestra never stopped evolving.",
		"mechanic": "ENSEMBLE", "motif_layer": "force_orchestra",
		"desc": "Each Orchestra weapon adds a section. Sections fire together on the downbeat for a combined swell.",
		"primary": "section_drones",
	},
	"warm_circuits_rise": {
		"name": "Warm Circuits Rise", "field": "Jamtronica / psychedelic", "color": Color("fbb040"),
		"tagline": "Improvised trips through sonic campfires and analog stars.",
		"mechanic": "IMPROVISATION", "motif_layer": "force_circuits",
		"desc": "Circuits weapons never repeat a pattern. The longer you go unhurt, the further the jam stretches (+damage, +size).",
		"primary": "analog_star",
	},
	"minor_collapse": {
		"name": "Minor Collapse", "field": "Immersive rock", "color": Color("7e86a8"),
		"tagline": "The quietest emotions often feel the biggest.",
		"mechanic": "WALL OF SOUND", "motif_layer": "force_collapse",
		"desc": "Collapse weapons swell while you move slowly or hold still, and recede when you rush.",
		"primary": "fuzz_wall",
	},
}

## Cross-Force harmonies: discovered in play when both Forces reach level 3.
const HARMONIES: Dictionary = {
	"dub_drop": {"forces": ["pulse_width_codex", "resonant_currents"], "name": "Dub Drop", "desc": "Every Drop echoes twice."},
	"stadium": {"forces": ["ghost_driver_unit", "star_splitter_rex"], "name": "Stadium Riff", "desc": "Momentum also boosts Impact knockback; lances pierce everything."},
	"festival_score": {"forces": ["pulse_width_codex", "ion_drive_orchestra"], "name": "Festival Score", "desc": "During a Drop, sections fire every beat."},
	"road_jam": {"forces": ["ghost_driver_unit", "warm_circuits_rise"], "name": "Road Jam", "desc": "Moving at speed improvises an extra Circuits pattern each second."},
	"reverb_wall": {"forces": ["resonant_currents", "minor_collapse"], "name": "Reverb Wall", "desc": "The Wall of Sound pulses an echo wave every 2 seconds."},
	"boss_score": {"forces": ["star_splitter_rex", "ion_drive_orchestra"], "name": "Score for a Boss Fight", "desc": "+40% damage to elites and bosses; sections fire heavier rounds."},
}

# ============================================================== weapons
# Per-level tables make every upgrade a perceptible change.

const WEAPONS: Dictionary = {
	"pulse_bolt": {"name": "Pulse Bolt", "force": "pulse_width_codex", "desc": "Homing melodic packets that seek the nearest hostile.",
		"damage": [16.0, 19.0, 23.0, 27.0, 33.0], "cooldown": [0.78, 0.72, 0.64, 0.58, 0.5], "count": [1, 2, 2, 3, 3], "pierce": [0, 0, 1, 1, 2],
		"notes": ["Homing packets.", "+1 bolt per volley.", "Bolts pierce one target.", "+1 bolt per volley.", "Faster cadence; pierce two."],
		"evolution": "anthem_bolt", "evolve_with": "amplifier"},
	"riser": {"name": "Riser", "force": "pulse_width_codex", "desc": "An expanding ring that hits harder the further it travels.",
		"damage": [18.0, 22.0, 27.0, 32.0, 40.0], "cooldown": [3.2, 3.0, 2.7, 2.5, 2.2], "radius": [170.0, 190.0, 215.0, 240.0, 270.0],
		"notes": ["A rising ring.", "Wider ring.", "Stronger crest.", "Faster rise.", "Huge, frequent rings."],
		"evolution": "the_drop", "evolve_with": "capacitor"},
	"sub_wave": {"name": "Sub Wave", "force": "resonant_currents", "desc": "A bass shock that throws close enemies back into space.",
		"damage": [26.0, 31.0, 37.0, 44.0, 54.0], "cooldown": [3.0, 2.8, 2.6, 2.4, 2.1], "radius": [120.0, 135.0, 150.0, 168.0, 190.0],
		"notes": ["Close-range bass shock.", "Wider shock.", "Heavier shock.", "Faster pulse.", "Massive low end."],
		"evolution": "deep_pressure", "evolve_with": "hull"},
	"echo_tap": {"name": "Echo Tap", "force": "resonant_currents", "desc": "A slow tape-echo shot that repeats itself behind its own path.",
		"damage": [22.0, 26.0, 31.0, 36.0, 44.0], "cooldown": [1.7, 1.6, 1.45, 1.3, 1.15], "count": [1, 1, 2, 2, 3],
		"notes": ["A shot that echoes.", "Echoes hit harder.", "+1 shot.", "Longer tape.", "+1 shot."],
		"evolution": "dub_siren", "evolve_with": "harmonics"},
	"power_chord": {"name": "Power Chord", "force": "ghost_driver_unit", "desc": "A forward blast in your direction of travel. Momentum widens it.",
		"damage": [30.0, 36.0, 43.0, 51.0, 62.0], "cooldown": [1.9, 1.75, 1.6, 1.45, 1.3], "radius": [190.0, 205.0, 220.0, 240.0, 265.0],
		"notes": ["Forward riff blast.", "Longer reach.", "Heavier riff.", "Faster strumming.", "Arena-sized chord."],
		"evolution": "encore", "evolve_with": "thrusters"},
	"trail_charges": {"name": "Trail Charges", "force": "ghost_driver_unit", "desc": "Drops charges in your wake that detonate a beat later.",
		"damage": [34.0, 40.0, 47.0, 55.0, 66.0], "cooldown": [1.6, 1.45, 1.3, 1.15, 1.0], "radius": [80.0, 88.0, 96.0, 106.0, 118.0],
		"notes": ["Charges in your wake.", "Bigger blasts.", "More frequent.", "Bigger blasts.", "A trail of fire."],
		"evolution": "ghost_mode", "evolve_with": "multiplexer"},
	"ion_lance": {"name": "Ion Lance", "force": "star_splitter_rex", "desc": "A piercing line of light through everything in its path.",
		"damage": [42.0, 50.0, 60.0, 72.0, 88.0], "cooldown": [2.6, 2.4, 2.2, 2.0, 1.7], "width": [22.0, 25.0, 28.0, 32.0, 38.0],
		"notes": ["Piercing lance.", "Wider beam.", "Heavier strike.", "Faster recharge.", "Twin lances."],
		"evolution": "breaker_lance", "evolve_with": "plating"},
	"riff_blades": {"name": "Riff Blades", "force": "star_splitter_rex", "desc": "Blades that circle your hull and carve anything close.",
		"damage": [14.0, 17.0, 20.0, 24.0, 30.0], "count": [2, 2, 3, 3, 4], "radius": [80.0, 88.0, 96.0, 104.0, 115.0],
		"notes": ["Two orbiting blades.", "Sharper blades.", "+1 blade.", "Wider orbit.", "+1 blade."],
		"evolution": "titan_riff", "evolve_with": "reach"},
	"section_drones": {"name": "Section Drones", "force": "ion_drive_orchestra", "desc": "Companion drones that play their part — fire on the beat.",
		"damage": [14.0, 17.0, 20.0, 24.0, 29.0], "count": [1, 2, 2, 3, 4],
		"notes": ["One drone section.", "+1 drone.", "Stronger rounds.", "+1 drone.", "+1 drone, full section."],
		"evolution": "full_orchestra", "evolve_with": "collector"},
	"analog_star": {"name": "Analog Star", "force": "warm_circuits_rise", "desc": "An emitter that improvises a new firing pattern every time.",
		"damage": [12.0, 14.0, 17.0, 20.0, 24.0], "cooldown": [1.5, 1.4, 1.3, 1.2, 1.05], "count": [5, 6, 7, 8, 10],
		"notes": ["Improvised patterns.", "+1 shot per phrase.", "Warmer tone (+damage).", "+1 shot per phrase.", "Long phrases."],
		"evolution": "long_jam", "evolve_with": "scanner"},
	"fuzz_wall": {"name": "Fuzz Wall", "force": "minor_collapse", "desc": "A haze of distortion around you that swells when you slow down.",
		"damage": [9.0, 11.0, 13.0, 16.0, 20.0], "radius": [95.0, 105.0, 118.0, 130.0, 145.0],
		"notes": ["A swelling haze.", "Wider haze.", "Denser fuzz.", "Wider haze.", "Shoegaze storm."],
		"evolution": "wall_of_sound", "evolve_with": "nanoweave"},
}

const EVOLUTIONS: Dictionary = {
	"anthem_bolt": {"name": "Anthem Bolt", "from": "pulse_bolt", "desc": "Four homing bolts per volley that split into harmonies on impact."},
	"the_drop": {"name": "The Drop", "from": "riser", "desc": "Rings fire on every bar downbeat; every fourth bar is a full Drop."},
	"deep_pressure": {"name": "Deep Pressure", "from": "sub_wave", "desc": "Shocks leave a sub-bass field that slows and grinds enemies."},
	"dub_siren": {"name": "Dub Siren", "from": "echo_tap", "desc": "Each shot echoes four times and the echoes spread into a fan."},
	"encore": {"name": "Encore", "from": "power_chord", "desc": "At high Momentum the chord rings out in every direction."},
	"ghost_mode": {"name": "Ghost Mode", "from": "trail_charges", "desc": "Charges chain-detonate and leave burning wake."},
	"breaker_lance": {"name": "Breaker Lance", "from": "ion_lance", "desc": "Three lances in a spread that stagger everything they touch."},
	"titan_riff": {"name": "Titan Riff", "from": "riff_blades", "desc": "Six huge blades on a breathing orbit."},
	"full_orchestra": {"name": "Full Orchestra", "from": "section_drones", "desc": "Five drones; on every bar they swell together in a radial volley."},
	"long_jam": {"name": "Long Jam", "from": "analog_star", "desc": "Patterns chain into each other and the jam never resets."},
	"wall_of_sound": {"name": "Wall of Sound", "from": "fuzz_wall", "desc": "The haze slows enemies and dissolves hostile shots."},
}

const PASSIVES: Dictionary = {
	"amplifier": {"name": "Signal Amplifier", "desc": "+10% weapon damage.", "max": 5},
	"capacitor": {"name": "Overclock Capacitor", "desc": "-7% weapon cooldowns.", "max": 5},
	"collector": {"name": "Resonant Collector", "desc": "+30% pickup reach.", "max": 5},
	"hull": {"name": "Reactive Hull", "desc": "+20 max hull and repair 20.", "max": 5},
	"thrusters": {"name": "Vector Thrusters", "desc": "+7% movement speed.", "max": 5},
	"reach": {"name": "Wide Stereo", "desc": "+10% weapon area.", "max": 5},
	"multiplexer": {"name": "Multiplexer", "desc": "+1 projectile on ranks 2 and 4; +5% damage otherwise.", "max": 5},
	"harmonics": {"name": "Harmonics", "desc": "Resonance and Fracture bonuses +20%; Resonance gained +25%.", "max": 5},
	"scanner": {"name": "Survey Scanner", "desc": "+30% scanner range; reveals hidden sites on the map.", "max": 5},
	"plating": {"name": "Shard-glass Plating", "desc": "+1.5 armour.", "max": 5},
	"nanoweave": {"name": "Nanoweave", "desc": "Repair 0.5 hull per second.", "max": 5},
}

# ============================================================== enemies
# The unmarked raider splinter group [CANON faction concept] and measurable
# anomaly phenomena [CANON families]. Individual units are [PROVISIONAL].

const ENEMIES: Dictionary = {
	"skiff": {"name": "Splinter Skiff", "hp": 16.0, "speed": 96.0, "damage": 8.0, "xp": 1, "radius": 13.0, "color": Color("c9cfd8"), "behavior": "drift", "shape": "dart", "aggro": 430.0},
	"ram_cutter": {"name": "Ram Cutter", "hp": 40.0, "speed": 120.0, "damage": 13.0, "xp": 2, "radius": 17.0, "color": Color("ff6a4f"), "behavior": "charge", "shape": "dart", "aggro": 480.0},
	"swarm_tender": {"name": "Swarm Tender", "hp": 95.0, "speed": 62.0, "damage": 14.0, "xp": 5, "radius": 25.0, "color": Color("5ee6a8"), "behavior": "orbit", "shape": "ring", "aggro": 520.0, "summon": "skiff", "summon_count": 2, "summon_every": 7.0},
	"rail_picket": {"name": "Rail Picket", "hp": 34.0, "speed": 88.0, "damage": 12.0, "xp": 3, "radius": 16.0, "color": Color("ffb35c"), "behavior": "ranged", "shape": "lancer", "aggro": 560.0, "keep": 330.0, "fire_every": 3.4, "shot_speed": 250.0},
	"mine_hauler": {"name": "Mine Hauler", "hp": 70.0, "speed": 58.0, "damage": 14.0, "xp": 4, "radius": 22.0, "color": Color("ff4fd8"), "behavior": "layer", "shape": "cell", "aggro": 500.0, "lay_every": 2.8, "hazard_radius": 62.0},
	"wreck_lurker": {"name": "Wreck Lurker", "hp": 52.0, "speed": 150.0, "damage": 15.0, "xp": 4, "radius": 18.0, "color": Color("ff8f6a"), "behavior": "ambush", "shape": "shard", "aggro": 190.0},
	"shield_tug": {"name": "Shield Tug", "hp": 60.0, "speed": 80.0, "damage": 10.0, "xp": 4, "radius": 19.0, "color": Color("9fe8ff"), "behavior": "warden", "shape": "warden", "aggro": 520.0},
	"echo_mote": {"name": "Gravitic Echo", "hp": 22.0, "speed": 70.0, "damage": 7.0, "xp": 2, "radius": 14.0, "color": Color("8ff0c8"), "behavior": "drift", "shape": "orb", "aggro": 360.0},
	"splinter_captain": {"name": "Splinter Captain", "hp": 520.0, "speed": 84.0, "damage": 22.0, "xp": 30, "radius": 36.0, "color": Color("ffd75e"), "behavior": "surge", "shape": "elite", "elite": true, "aggro": 9999.0},
	"the_silence": {"name": "The Silence", "hp": 30000.0, "speed": 78.0, "damage": 26.0, "xp": 0, "radius": 72.0, "color": Color("ff376f"), "behavior": "boss", "shape": "silence", "boss": true, "aggro": 99999.0},
}

# ============================================================== destinations & regions

const DESTINATIONS: Dictionary = {
	"black_drift_reach": {
		"name": "Black Drift Reach",
		"desc": "The broken frontier around Black Drift, where corridor beacons flicker and signals from across the catalog drift through the wreckage.",
		"half_size": Vector2(6400.0, 4500.0),
		"gate": Vector2.ZERO,
		"goal_signals": 3,
		"climax_time": 1140.0,
		"background": Color("070a15"),
		"drift_name": "BLACK DRIFT",
		"regions": ["array_gate", "silver_wrecks", "thunderbreak_shelf", "quiet_basin", "night_corridor", "fracture_bloom"],
		"completion_unlocks": ["kess_darrow", "kaldr_rift"],
		"seed": 7741,
	},
	"kaldr_rift": {
		"name": "Kaldr Rift",
		"desc": "A hazardous convoy passage through dense asteroid fragments, broken industrial structures and old hull wreckage. Signals here travel the long way round.",
		"half_size": Vector2(7400.0, 3200.0),
		"gate": Vector2(-6300.0, 0.0),
		"goal_signals": 3,
		"climax_time": 1200.0,
		"background": Color("080a12"),
		"drift_name": "OPEN RIFT",
		"regions": ["rift_mouth", "grain_convoy", "fragment_belt", "broken_foundry", "shear_window", "echo_shallows"],
		"completion_unlocks": [],
		"seed": 9152,
	},
}

## shape: "circle" uses center+radius; "capsule" uses a,b endpoints + radius.
const REGIONS: Dictionary = {
	"array_gate": {"name": "ARRAY GATE", "shape": "circle", "center": Vector2(0, 0), "radius": 494.0,
		"color": Color("68ecff"), "floor": Color("0a1424"), "props": "gate", "density": 0.25, "music": "region_gate",
		"enemies": {"skiff": 1.0}, "blurb": "A reblazed corridor gate. Extraction point.", "threat": 0},
	"silver_wrecks": {"name": "SILVER WRECKS", "shape": "circle", "center": Vector2(3325, 2128), "radius": 1208.0,
		"color": Color("9fb4d0"), "floor": Color("0b111c"), "props": "wreck", "density": 1.0, "music": "region_wrecks",
		"enemies": {"skiff": 0.9, "ram_cutter": 0.6, "wreck_lurker": 0.55, "shield_tug": 0.25}, "blurb": "Old hull wreckage. Not every piece of debris is debris.", "threat": 2},
	"thunderbreak_shelf": {"name": "THUNDERBREAK SHELF", "shape": "circle", "center": Vector2(-3857, -2128), "radius": 1265.0,
		"color": Color("ff9a5f"), "floor": Color("150d0c"), "props": "crystal", "density": 1.0, "music": "region_shelf",
		"enemies": {"skiff": 0.8, "rail_picket": 0.8, "ram_cutter": 0.4}, "blurb": "Crystalline shelves charged with stray lightning. Watch the sky.", "threat": 2, "strikes": true},
	"quiet_basin": {"name": "QUIET BASIN", "shape": "circle", "center": Vector2(-2660, 2660), "radius": 1150.0,
		"color": Color("71cda0"), "floor": Color("08130f"), "props": "pools", "density": 0.45, "music": "region_basin",
		"enemies": {"echo_mote": 1.0, "swarm_tender": 0.25}, "blurb": "Still water and slow echoes. A place to breathe — and to tune.", "threat": 1},
	"night_corridor": {"name": "NIGHT CORRIDOR", "shape": "capsule", "a": Vector2(1463, -1197), "b": Vector2(5719, -3192), "radius": 391.0,
		"color": Color("b07cff"), "floor": Color("0c0918"), "props": "corridor", "density": 0.8, "music": "region_corridor",
		"enemies": {"skiff": 0.8, "mine_hauler": 0.7, "ram_cutter": 0.35}, "blurb": "A half-reblazed lane. Green beacons still mark safe volume.", "threat": 2},
	"fracture_bloom": {"name": "FRACTURE BLOOM", "shape": "circle", "center": Vector2(399, -3591), "radius": 828.0,
		"color": Color("ff4f7b"), "floor": Color("16070f"), "props": "bloom", "density": 0.9, "music": "region_bloom",
		"enemies": {"shield_tug": 0.5, "ram_cutter": 0.6, "skiff": 0.6, "rail_picket": 0.4}, "blurb": "A phase anomaly in full bloom. Rifts here unbalance everything.", "threat": 3},
	"rift_mouth": {"name": "RIFT MOUTH", "shape": "circle", "center": Vector2(-6300, 0), "radius": 520.0,
		"color": Color("68ecff"), "floor": Color("0a1424"), "props": "gate", "density": 0.25, "music": "region_gate",
		"enemies": {"skiff": 1.0}, "blurb": "Convoy staging point. Extraction.", "threat": 0},
	"grain_convoy": {"name": "GRAIN CONVOY WRECK", "shape": "circle", "center": Vector2(-3500, 1100), "radius": 1150.0,
		"color": Color("c6e27a"), "floor": Color("0d120a"), "props": "wreck", "density": 1.1, "music": "region_wrecks",
		"enemies": {"skiff": 0.9, "ram_cutter": 0.7, "wreck_lurker": 0.6}, "blurb": "What is left of a Verge grain convoy. Someone is still picking it over.", "threat": 2},
	"fragment_belt": {"name": "FRAGMENT BELT", "shape": "circle", "center": Vector2(-700, -1000), "radius": 1350.0,
		"color": Color("b9a68a"), "floor": Color("100d0a"), "props": "belt", "density": 1.0, "music": "region_shelf",
		"enemies": {"skiff": 0.8, "rail_picket": 0.7, "mine_hauler": 0.4}, "blurb": "Dense asteroid fragments. Find the lanes, or make them.", "threat": 2, "strikes": true},
	"broken_foundry": {"name": "BROKEN FOUNDRY", "shape": "circle", "center": Vector2(2300, 900), "radius": 1150.0,
		"color": Color("ff9a5f"), "floor": Color("140c08"), "props": "wreck", "density": 0.9, "music": "region_wrecks",
		"enemies": {"shield_tug": 0.5, "ram_cutter": 0.6, "swarm_tender": 0.4, "skiff": 0.6}, "blurb": "Broken industrial structures, still warm.", "threat": 3},
	"shear_window": {"name": "SHEAR WINDOW", "shape": "capsule", "a": Vector2(3600, -1900), "b": Vector2(6600, -700), "radius": 400.0,
		"color": Color("b07cff"), "floor": Color("0c0918"), "props": "corridor", "density": 0.8, "music": "region_corridor",
		"enemies": {"skiff": 0.8, "mine_hauler": 0.6, "rail_picket": 0.4}, "blurb": "A timing window through the shear. Beacons hold it open.", "threat": 2},
	"echo_shallows": {"name": "ECHO SHALLOWS", "shape": "circle", "center": Vector2(5800, 1900), "radius": 950.0,
		"color": Color("71cda0"), "floor": Color("08130f"), "props": "pools", "density": 0.5, "music": "region_basin",
		"enemies": {"echo_mote": 1.0, "swarm_tender": 0.3}, "blurb": "Gravitic echoes pool here. Quiet, mostly.", "threat": 1},
}

const DRIFT_REGION: Dictionary = {"name": "BLACK DRIFT", "color": Color("5b6b8a"), "floor": Color("070a15"), "music": "", "enemies": {"skiff": 1.0, "ram_cutter": 0.25}, "density": 0.35, "threat": 1, "blurb": "Open drift between landmarks."}

# ============================================================== discoveries
# kind: signal | artifact | fragment | anomaly | character
# region-relative `offset`; `hidden`: "" | "FRACTURE" | "RESONANCE" | "SCAN"
# (visible only in that state / once scanned). `moving` signals flee along a path.

const DISCOVERIES: Dictionary = {
	"sig_now_or_never": {"kind": "signal", "region": "array_gate", "offset": Vector2(260, -170), "title": "OPENING CARRIER",
		"force": "pulse_width_codex", "transmission": "pwc_now_or_never",
		"text": "A bright carrier wave just outside the gate — a melody strong enough to cross broken corridors."},
	"sig_green_echo": {"kind": "signal", "region": "quiet_basin", "offset": Vector2(-150, 120), "title": "GREEN ECHO",
		"force": "resonant_currents", "transmission": "rc_meaningless_dub", "lock": "resonance",
		"text": "A delayed signal repeating through empty space, each repeat a little deeper than the last."},
	"sig_thunderbreak_beacon": {"kind": "signal", "region": "thunderbreak_shelf", "offset": Vector2(180, -60), "title": "SHELF BEACON",
		"force": "star_splitter_rex", "transmission": "rex_signals_and_shadows", "lock": "guardian",
		"text": "Something enormous is playing under the lightning. It sounds like the moment before a fight."},
	"sig_night_trace": {"kind": "signal", "region": "night_corridor", "offset": Vector2(-200, 0), "title": "NIGHT TRACE", "moving": true,
		"force": "ghost_driver_unit", "transmission": "gdu_watch_out",
		"text": "A transmission that keeps moving just ahead of you down the corridor — catch it."},
	"sig_ignition": {"kind": "signal", "region": "silver_wrecks", "offset": Vector2(320, 260), "title": "IGNITION CHORUS",
		"force": "ion_drive_orchestra", "transmission": "ido_ignition_sequence", "lock": "ensemble",
		"text": "Strings and engines tuning together inside a dead hull."},
	"sig_hexagonis": {"kind": "signal", "region": "fracture_bloom", "offset": Vector2(0, -160), "title": "HEXAGONAL HAZE",
		"force": "minor_collapse", "transmission": "mc_hexagonis", "lock": "stillness",
		"text": "A wall of fuzz-soaked sound, so quiet at its center you can hear yourself."},
	"sig_campfire": {"kind": "signal", "region": "", "destination": "black_drift_reach", "world": Vector2(-5586, 3924), "title": "ANALOG CAMPFIRE",
		"force": "warm_circuits_rise", "transmission": "wcr_this_paths_for_you",
		"text": "Far out in the drift, a warm improvised groove circles a ring of old beacons."},
	# Kaldr Rift signals [CATALOG titles]
	"sig_light_water": {"kind": "signal", "region": "rift_mouth", "offset": Vector2(300, 200), "title": "LIGHT ON THE WATER",
		"force": "pulse_width_codex", "transmission": "pwc_where_the_light_meets_the_water",
		"text": "A melody reflecting off ice-bright fragments, steady enough to steer by."},
	"sig_grind": {"kind": "signal", "region": "grain_convoy", "offset": Vector2(0, 0), "title": "GRIND TRACE", "lock": "guardian",
		"force": "ghost_driver_unit", "transmission": "gdu_its_a_grind",
		"text": "A riff looping through a salvage crew's comms. They do not want to share it."},
	"sig_away": {"kind": "signal", "region": "echo_shallows", "offset": Vector2(0, 0), "title": "AWAY AWAY", "lock": "resonance",
		"force": "resonant_currents", "transmission": "rc_away_away",
		"text": "A bassline arriving long after the drums, as if from very far away."},
	"sig_dominion": {"kind": "signal", "region": "broken_foundry", "offset": Vector2(0, 0), "title": "FOUNDRY CRESCENDO", "lock": "ensemble",
		"force": "star_splitter_rex", "transmission": "rex_dominions_reach",
		"text": "The foundry's dead machinery hums a score built for scale."},
	"sig_freeze": {"kind": "signal", "region": "fragment_belt", "offset": Vector2(0, 0), "title": "FROZEN FRAME", "lock": "stillness",
		"force": "ion_drive_orchestra", "transmission": "ido_freeze_frame",
		"text": "Strings suspended mid-phrase. Move and you lose it."},
	"sig_mach": {"kind": "signal", "region": "shear_window", "offset": Vector2(-400, 0), "title": "MACH POINT FIVE", "moving": true,
		"force": "minor_collapse", "transmission": "mc_mach_point_five",
		"text": "A slow-burning wall of sound sliding through the shear window."},
	"sig_shine": {"kind": "signal", "region": "", "world": Vector2(800, 2700), "destination": "kaldr_rift", "title": "SHINE",
		"force": "warm_circuits_rise", "transmission": "wcr_shine",
		"text": "A warm improvised glow in the empty rift floor, far from any lane."},
	"frag_convoy": {"kind": "fragment", "region": "grain_convoy", "offset": Vector2(400, -300), "title": "CONVOY MANIFEST", "fragment": "frag_07", "hidden": "SCAN",
		"text": "Manifest, annotated: \"Cargo intact. Crew intact. Music library: erased.\""},
	"frag_foundry": {"kind": "fragment", "region": "broken_foundry", "offset": Vector2(-400, 300), "title": "FOUNDRY LOG", "fragment": "frag_08", "hidden": "FRACTURE",
		"text": "Foundry log: \"We ran the machines loud on purpose. The hush stays away from the loud places.\""},
	# Characters
	"char_gravefire": {"kind": "character", "region": "silver_wrecks", "offset": Vector2(-380, -200), "title": "GRAVEFIRE DISTRESS CALL",
		"unlock_character": "tessa_banks", "fragment": "frag_02",
		"text": "Tessa Banks, Gravefire: \"Breach sealed. Engines cold. If you're Fleet, I'm not asking — I'm telling you where the medicine went.\""},
	"char_verge_escort": {"kind": "character", "region": "night_corridor", "offset": Vector2(450, 60), "title": "VERGE ESCORT BEACON",
		"unlock_character": "naomi_sol",
		"text": "Captain Naomi Sol: \"I've crossed this lane forty times. You're flying it like a tourist. Move over.\""},
	"art_route_token": {"kind": "artifact", "region": "fracture_bloom", "offset": Vector2(-260, 140), "title": "VEIL ROUTE TOKEN", "hidden": "FRACTURE",
		"unlock_character": "jex_marrin", "fragment": "frag_04",
		"text": "A Veil Market route token stamped with timing windows nobody should know. A courier's mark is etched on the reverse: MARRIN."},
	# Artifacts with lasting effects
	"art_survey_chart": {"kind": "artifact", "region": "thunderbreak_shelf", "offset": Vector2(-330, 300), "title": "LATTICE SURVEY CHART", "hidden": "RESONANCE",
		"text": "Lattice Research shear maps of the Reach. Future expeditions start with the full map charted.", "perk": "full_map"},
	"art_beacon_core": {"kind": "artifact", "region": "quiet_basin", "offset": Vector2(330, -280), "title": "BHA BEACON CORE",
		"text": "A green harmonization beacon core, still warm. Future expeditions begin with +15 Resonance.", "perk": "resonance_start"},
	# Mystery fragments [PROVISIONAL game lore]
	"frag_gate": {"kind": "fragment", "region": "array_gate", "offset": Vector2(-300, 210), "title": "GATE LOG", "fragment": "frag_01", "text": "Gate log, partial: \"...the beacons don't fail. They go quiet. Like something is listening for them.\""},
	"frag_wrecks": {"kind": "fragment", "region": "silver_wrecks", "offset": Vector2(80, -420), "title": "FLIGHT RECORDER", "fragment": "frag_03", "hidden": "SCAN", "text": "Flight recorder: \"Comms are clear but empty. Not static. Empty.\""},
	"frag_corridor": {"kind": "fragment", "region": "night_corridor", "offset": Vector2(900, -80), "title": "BEACON SHADOW", "fragment": "frag_05", "text": "A beacon still broadcasting into a pocket of nothing. The nothing is moving."},
	"frag_drift": {"kind": "fragment", "region": "", "destination": "black_drift_reach", "world": Vector2(5586, 3857), "title": "LONE BUOY", "fragment": "frag_06", "hidden": "SCAN", "text": "Lone buoy, last entry: \"It isn't hunting ships. It's hunting songs.\""},
	# Anomalies (in-run effects)
	"anom_memory_well": {"kind": "anomaly", "region": "quiet_basin", "offset": Vector2(220, 330), "title": "MEMORY WELL", "effect": "memory_well", "text": "An echo anomaly. It plays back a choice you haven't made yet."},
	"anom_mirrorfold": {"kind": "anomaly", "region": "", "destination": "black_drift_reach", "world": Vector2(-1463, -1729), "title": "MIRRORFOLD", "effect": "mirrorfold", "pair": Vector2(3192, -200), "text": "A metric anomaly folds two places into one. Step through."},
}

## Signal locks: each project's signal asks to be heard in its own way.
const LOCKS: Dictionary = {
	"resonance": "Only resolves in RESONANCE. Find a resonator, or play in harmony.",
	"guardian": "A guardian captain answers the broadcast. Defeat it to finish tuning.",
	"stillness": "Only resolves in stillness. Hold your position.",
	"ensemble": "Three relay sections must play together. Activate the relays around the signal.",
}

const FRAGMENTS: Dictionary = {
	"frag_01": "The gate beacons don't fail. They go quiet — as if something is listening for them.",
	"frag_02": "Gravefire found the medicine convoy intact, crew alive, every channel open. Nobody aboard could remember a single song.",
	"frag_03": "Comms are clear but empty. Not static. Empty.",
	"frag_04": "Veil brokers sell routes around a region they call 'the hush'. The price keeps going up.",
	"frag_05": "A beacon broadcasting into a pocket of nothing. The nothing moves toward whatever is loudest.",
	"frag_06": "It isn't hunting ships. It's hunting songs. Keep playing.",
	"frag_07": "Kaldr convoys arrive with cargo and crew intact — and every recording aboard erased.",
	"frag_08": "The hush keeps away from loud places. Someone learned that the hard way, and kept the furnaces roaring.",
}

const FRAGMENT_TITLE: String = "THE HUSH (provisional mystery)"

# ============================================================== catalog transmissions
# Titles and dates are verbatim catalog metadata [CATALOG]. No masters are
# bundled; drop authorised files into res://audio/catalog/<master_file>.

const TRANSMISSIONS: Dictionary = {
	"pwc_now_or_never": {"project": "Pulse Width Codex", "force": "pulse_width_codex", "title": "Now or Never", "meta": "Released · November 19, 2025", "master_file": "pwc_now_or_never.ogg"},
	"rc_meaningless_dub": {"project": "Resonant Currents", "force": "resonant_currents", "title": "Meaningless Dub", "meta": "Upcoming · September 18, 2026", "master_file": "rc_meaningless_dub.ogg"},
	"rex_signals_and_shadows": {"project": "Star Splitter Rex", "force": "star_splitter_rex", "title": "Signals and Shadows", "meta": "Upcoming · August 2, 2026", "master_file": "rex_signals_and_shadows.ogg"},
	"gdu_watch_out": {"project": "Ghost Driver Unit", "force": "ghost_driver_unit", "title": "Watch Out", "meta": "Upcoming · October 10, 2026", "master_file": "gdu_watch_out.ogg"},
	"ido_ignition_sequence": {"project": "Ion Drive Orchestra", "force": "ion_drive_orchestra", "title": "Ignition Sequence (feat. Cheddr)", "meta": "Selected catalog", "master_file": "ido_ignition_sequence.ogg"},
	"mc_hexagonis": {"project": "Minor Collapse", "force": "minor_collapse", "title": "Hexagonis", "meta": "Selected catalog", "master_file": "mc_hexagonis.ogg"},
	"pwc_where_the_light_meets_the_water": {"project": "Pulse Width Codex", "force": "pulse_width_codex", "title": "Where the Light Meets the Water", "meta": "Selected catalog", "master_file": "pwc_where_the_light_meets_the_water.ogg"},
	"gdu_its_a_grind": {"project": "Ghost Driver Unit", "force": "ghost_driver_unit", "title": "It’s a Grind (Ghost Mode Remix)", "meta": "Upcoming · August 17, 2026", "master_file": "gdu_its_a_grind.ogg"},
	"rc_away_away": {"project": "Resonant Currents", "force": "resonant_currents", "title": "Away Away", "meta": "Upcoming · October 31, 2026", "master_file": "rc_away_away.ogg"},
	"rex_dominions_reach": {"project": "Star Splitter Rex", "force": "star_splitter_rex", "title": "Dominion’s Reach", "meta": "Selected catalog", "master_file": "rex_dominions_reach.ogg"},
	"ido_freeze_frame": {"project": "Ion Drive Orchestra", "force": "ion_drive_orchestra", "title": "Freeze Frame", "meta": "Released · January 8, 2026", "master_file": "ido_freeze_frame.ogg"},
	"mc_mach_point_five": {"project": "Minor Collapse", "force": "minor_collapse", "title": "Mach Point Five", "meta": "Upcoming · December 13, 2026", "master_file": "mc_mach_point_five.ogg"},
	"wcr_shine": {"project": "Warm Circuits Rise", "force": "warm_circuits_rise", "title": "Shine (feat. Cheddr)", "meta": "Selected catalog", "master_file": "wcr_shine.ogg"},
	"wcr_this_paths_for_you": {"project": "Warm Circuits Rise", "force": "warm_circuits_rise", "title": "This Path’s for You", "meta": "Selected catalog", "master_file": "wcr_this_paths_for_you.ogg"},
}

## Project pages in the Archive [CATALOG].
const PROJECTS: Dictionary = {
	"Pulse Width Codex": {"field": "Melodic dance", "role": "Open-hearted dance language", "accent": Color("f0327f"), "bio": "Uplifting electronic anthems built around memorable melody, expansive builds, and the communal release of a drop that feels emotionally earned.", "url": "https://music.apple.com/gb/artist/pulse-width-codex/1853956207"},
	"Resonant Currents": {"field": "Dub", "role": "Modern dub language", "accent": Color("da3929"), "bio": "Composes with bass, drums, echo, and empty space — modern dub that feels deep, suspended, physical, and alive.", "url": ""},
	"Star Splitter Rex": {"field": "Cinematic rock instrumentals", "role": "Cinematic electronic scale", "accent": Color("71e8f5"), "bio": "Massive electronic structures with integrated guitar force — cinematic music built for adrenaline, danger, triumph, and screen-sized momentum.", "url": ""},
	"Ghost Driver Unit": {"field": "Modern rock", "role": "Modern rock language", "accent": Color("e8e3d8"), "bio": "Modern rock with classic instincts: durable riffs, commanding choruses, forward momentum, and songs built to outlast their production era.", "url": ""},
	"Ion Drive Orchestra": {"field": "Symphonic electronic", "role": "Orchestral electronic language", "accent": Color("f1b826"), "bio": "Orchestral scale fused with electronic motion — strings, brass, synthesis, beats and sound design evolving together.", "url": ""},
	"Minor Collapse": {"field": "Immersive rock", "role": "Immersive rock language", "accent": Color("7e86a8"), "bio": "Quiet vulnerability given immense physical scale: intimate vocals, fuzz-soaked guitars, celestial haze, and slow-burning walls of sound.", "url": ""},
	"Warm Circuits Rise": {"field": "Jamtronica / psychedelic", "role": "Long-form improvisational language", "accent": Color("fbb040"), "bio": "Improvised grooves through psychedelic guitars, drifting analog synths, ambient space, and patient long-form journeys.", "url": ""},
}

const STAR_SPLITTER_URL: String = "https://starsplitterrecords.com"

# ============================================================== workshop (permanent)

const WORKSHOP: Dictionary = {
	"plating": {"name": "Reinforced Frames", "desc": "+10 starting max hull per rank.", "max": 5, "cost": 40},
	"thrust": {"name": "Tuned Drives", "desc": "+4% movement speed per rank.", "max": 3, "cost": 60},
	"magnet": {"name": "Wider Collectors", "desc": "+12% pickup reach per rank.", "max": 3, "cost": 50},
	"reroll": {"name": "Spare Charts", "desc": "+1 upgrade reroll per expedition per rank.", "max": 3, "cost": 70},
	"insight": {"name": "Fourth Option", "desc": "Level-ups offer four choices.", "max": 1, "cost": 220},
	"second_wind": {"name": "Second Wind", "desc": "Once per expedition, survive a fatal hit with 40% hull.", "max": 1, "cost": 260},
	"head_start": {"name": "Warm Start", "desc": "Begin each expedition with one free upgrade.", "max": 1, "cost": 180},
}

static func workshop_cost(id: String, rank: int) -> int:
	return int(float(WORKSHOP[id]["cost"]) * pow(1.6, rank))

# ============================================================== audio manifest

const SCORE_LAYERS: Array[String] = [
	"bed", "pulse", "drive", "menu", "boss",
	"region_gate", "region_wrecks", "region_shelf", "region_basin", "region_corridor", "region_bloom",
	"force_codex", "force_currents", "force_ghost", "force_rex", "force_orchestra", "force_circuits", "force_collapse",
	"state_resonance", "state_fracture",
]

const SFX_NAMES: Array[String] = [
	"shot", "shot_heavy", "hit", "kill", "kill_big", "pickup", "levelup", "choose", "discovery", "hurt",
	"ability", "wave", "lance", "mine", "chord", "drop", "strike", "heal", "magnet", "state_up", "state_down",
	"extract", "boss_appear", "boss_phase", "boss_die", "ui_click", "ui_back", "harmony", "enemy_shot",
	"victory", "defeat", "ping", "evolve",
]

# ============================================================== helpers

static func xp_required(level: int) -> int:
	return int(5 + pow(float(level), 1.45) * 4.5)

static func format_time(seconds: float) -> String:
	var s: int = maxi(0, int(seconds))
	return "%02d:%02d" % [s / 60, s % 60]

static func weapon_def(id: String) -> Dictionary:
	if WEAPONS.has(id):
		return WEAPONS[id]
	if EVOLUTIONS.has(id):
		return WEAPONS[EVOLUTIONS[id]["from"]]
	return {}

static func weapon_force(id: String) -> String:
	return String(weapon_def(id).get("force", ""))

static func weapon_name(id: String) -> String:
	if EVOLUTIONS.has(id):
		return String(EVOLUTIONS[id]["name"])
	return String(WEAPONS.get(id, {}).get("name", id))

static func region_contains(region: Dictionary, p: Vector2) -> bool:
	return region_distance(region, p) <= 0.0

## Signed distance from point to region boundary (negative inside).
static func region_distance(region: Dictionary, p: Vector2) -> float:
	if String(region.get("shape", "circle")) == "capsule":
		var a: Vector2 = region["a"]
		var b: Vector2 = region["b"]
		var ab: Vector2 = b - a
		var t: float = clampf((p - a).dot(ab) / ab.length_squared(), 0.0, 1.0)
		return p.distance_to(a + ab * t) - float(region["radius"])
	return p.distance_to(region["center"]) - float(region["radius"])

static func region_anchor(region: Dictionary) -> Vector2:
	if String(region.get("shape", "circle")) == "capsule":
		return (Vector2(region["a"]) + Vector2(region["b"])) * 0.5
	return region["center"]

## True when a discovery belongs to the given destination (by region, or by
## an explicit "destination" tag for open-drift sites).
static func discovery_in_destination(id: String, destination_id: String) -> bool:
	var d: Dictionary = DISCOVERIES[id]
	var rid: String = String(d.get("region", ""))
	if rid != "":
		return rid in DESTINATIONS[destination_id]["regions"]
	return String(d.get("destination", "black_drift_reach")) == destination_id

static func discovery_destination(id: String) -> String:
	for dest: String in DESTINATIONS.keys():
		if discovery_in_destination(id, dest):
			return dest
	return ""

static func discovery_position(id: String) -> Vector2:
	var d: Dictionary = DISCOVERIES[id]
	if d.has("world"):
		return d["world"]
	var region: Dictionary = REGIONS[String(d["region"])]
	return region_anchor(region) + Vector2(d.get("offset", Vector2.ZERO))
