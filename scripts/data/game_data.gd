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
		"faction": "fleet",
		"tagline": "Calm, deliberate, unshowy; authority through steadiness and operational clarity.",
		"bio": "Commander of Thunderbreak, an old heavy cruiser maintained by people who know which fittings are original. She keeps people alive on a frontier divided among the Core, the Shards, and the Verge.",
		"style": "cruiser",
		"accent": Color("d6b25e"),
		"hull": Color("1d2d5c"),
		"trim": Color("d6b25e"),
		"portrait": "ella_venn",
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
		"faction": "verge",
		"tagline": "Blunt, sharp, proud.",
		"bio": "Veteran Verge escort commander whose damaged-corridor knowledge comes from repeated real crossings.",
		"style": "interceptor",
		"accent": Color("a8c46a"),
		"hull": Color("b9a27a"),
		"trim": Color("6f8a4e"),
		"portrait": "naomi_sol",
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
		"faction": "shards",
		"tagline": "Sparse, cutting, honest, weary of ideology.",
		"bio": "Captain of the Gravefire, a compact Shard working ship maintained through visible repair. Abby Saville's sister.",
		"style": "hauler",
		"accent": Color("ff8a8f"),
		"hull": Color("d9d6cf"),
		"trim": Color("d8323a"),
		"portrait": "tessa_banks",
		"speed": 248.0,
		"max_hp": 110.0,
		"armor": 0.5,
		"pickup": 150.0,
		"ability": "seal_the_breach",
		"trait": "Field Repair: every 40 Signal motes collected restore 4 hull.",
		"weakness": "Weapons deal 10% less damage.",
		"unlock": "Recover the Gravefire distress call in the Silver Wrecks.",
	},
	"abby_saville": {
		"name": "Abby Saville",
		"short": "SAVILLE",
		"origin": "Rex Fleet — The Shards",
		"faction": "shards",
		"vessel": "Shard command ship (Scythe of Saville)",
		"tagline": "Sharp, direct, pragmatic; hates wasted words.",
		"bio": "Warlord of the Scythe of Saville, leading Black Drift's survival economy. Commands through stillness and economical movement; Tessa Banks's sister.",
		"style": "warlord",
		"accent": Color("ff5a5f"),
		"hull": Color("e6e3dc"),
		"trim": Color("d8323a"),
		"portrait": "abby_saville",
		"speed": 244.0,
		"max_hp": 118.0,
		"armor": 1.0,
		"pickup": 115.0,
		"ability": "call_the_captains",
		"trait": "Commands Through Stillness: +20% weapon damage while holding position.",
		"weakness": "A command ship, not a fighter: weapons recharge 10% slower.",
		"unlock": "Destroy the Splinter Dreadnought (Corridor stop 10).",
	},
	"jex_marrin": {
		"name": "Jex Marrin",
		"short": "MARRIN",
		"origin": "Rex Fleet — Independent / Veil Market",
		"faction": "independent",
		"vessel": "Veil Market courier",
		"tagline": "Smooth, sardonic, transactional.",
		"bio": "Independent broker who knows timing windows, shear markers, anchor behaviour and traffic. Anomaly-glass beads sewn into his travel cloak bend the light.",
		"style": "wraith",
		"accent": Color("e0b46a"),
		"hull": Color("9a6a3a"),
		"trim": Color("e0b46a"),
		"portrait": "jex_marrin",
		"speed": 264.0,
		"max_hp": 86.0,
		"armor": 0.0,
		"pickup": 115.0,
		"ability": "veil_step",
		"trait": "Broker: +40% Signal earned; one free reroll every level.",
		"weakness": "Fragile — and The Silence hunts him harder (+15% damage taken).",
		"unlock": "Find the Veil route token hidden in the Fracture Bloom.",
	},
	# --- Star Splitter Visions guests (owner direction 2026-11-20). They reach the
	# Reach through Signal Space, the game's noncanonical crossover layer; each
	# keeps the identity and setting of their own series (see GAME_CANON_ADAPTATION).
	"bjorn": {
		"name": "Bjorn",
		"short": "BJORN",
		"origin": "Star Splitter Visions — Vikings 2026!",
		"faction": "visions",
		"series": "vikings_2026",
		"vessel": "DTI temporary transit vessel (a longship, as far as Bjorn is concerned)",
		"tagline": "Serious, responsible, physically capable; used to decisions that affect his people.",
		"bio": "A ninth-century Norse raid leader the Department of Temporal Integration already processed once, in New York. A second time slip dropped him into the Reach, still holding ticket G-53. Gunnar came too.",
		"style": "longship",
		"accent": Color("baff00"),
		"hull": Color("6b4a2e"),
		"trim": Color("c9a46a"),
		"portrait": "bjorn",
		"speed": 236.0,
		"max_hp": 150.0,
		"armor": 1.0,
		"pickup": 110.0,
		"ability": "shield_wall",
		"trait": "Provider: supply caches give an extra repair cell, and repair cells restore 25% more.",
		"weakness": "Systems he never agreed to: scanner range -30%.",
		"unlock": "Answer the DTI intake beacon calling numbers in the Quiet Basin.",
	},
	"jax_orien": {
		"name": "Jax Orien",
		"short": "ORIEN",
		"origin": "Star Splitter Visions — Stardust Station",
		"faction": "visions",
		"series": "stardust_station",
		"vessel": "Stardust Station maintenance shuttle",
		"tagline": "Hands-on station technician; the prosthetic forearm does the fine work.",
		"bio": "Stardust Station's technician, out on a routine inspection when the whole station slipped into Signal Space. The crew is still aboard, still in the West Corridor, still talking. They answer when he calls a meeting.",
		"style": "shuttle",
		"accent": Color("ffce5c"),
		"hull": Color("2a4f9a"),
		"trim": Color("ffce5c"),
		"portrait": "jax_orien",
		"speed": 256.0,
		"max_hp": 104.0,
		"armor": 0.5,
		"pickup": 100.0,
		"ability": "all_hands",
		"trait": "Station Tech: repair cells also give a 25-point shield.",
		"weakness": "Mandatory Proximity: shorter pickup reach than other explorers.",
		"unlock": "Dock at Stardust Station, adrift in the Silver Wrecks.",
	},
	"lucia": {
		"name": "Lucia",
		"short": "LUCIA",
		"origin": "Star Splitter Visions — Backyard Rockets",
		"faction": "visions",
		"series": "backyard_rockets",
		"vessel": "OCHRE-9, a Launch-Shop homemade rocket",
		"tagline": "Skeptical, athletic desert tactician; builds another way.",
		"bio": "Launch-Shop's tactician. OCHRE-9 was meant to lift a water-and-comms relay over the Mojave, outside Tethergrid's network. It came down in the Reach instead, and Lucia is still building the network, one relay at a time.",
		"style": "rocket",
		"accent": Color("e58a2b"),
		"hull": Color("e9e0cc"),
		"trim": Color("2f6fb0"),
		"portrait": "lucia",
		"speed": 272.0,
		"max_hp": 92.0,
		"armor": 0.0,
		"pickup": 120.0,
		"ability": "build_another_way",
		"trait": "Repairable: after 4s without taking a hit, repair 2 hull per second.",
		"weakness": "Homemade hull: no armour, and the lightest hull of the guests.",
		"unlock": "Recover the OCHRE-9 relay rocket on the Thunderbreak Shelf.",
	},
	"brandon_mack": {
		"name": "Brandon Mack",
		"short": "MACK",
		"origin": "Star Splitter Visions — Sunforge Outlaw (in development)",
		"faction": "visions",
		"series": "sunforge_outlaw",
		"vessel": "Sun-scorched frontier runner",
		"tagline": "A drifter other people keep assigning a past to.",
		"bio": "A drifter from under a relentless sun. Every relay that logs his transponder files him under a different name. He does not argue with any of them; he just keeps moving.",
		"style": "runner",
		"accent": Color("ff9b3d"),
		"hull": Color("4a3626"),
		"trim": Color("ff9b3d"),
		"portrait": "brandon_mack",
		"speed": 258.0,
		"max_hp": 108.0,
		"armor": 0.5,
		"pickup": 115.0,
		"ability": "high_noon",
		"trait": "Sunforged: +15% weapon damage while in Fracture.",
		"weakness": "Pursued: raider patrols find you 30% more often.",
		"unlock": "Wake the Sunforge burning in the Fracture Bloom.",
	},
}

const ABILITIES: Dictionary = {
	"hold_the_line": {"name": "Hold the Line", "cooldown": 16.0, "desc": "Project Thunderbreak's bulwark for 5s: hostile shots are destroyed, enemies inside are slowed and pushed back, and you repair steadily."},
	"corridor_run": {"name": "Corridor Run", "cooldown": 6.0, "desc": "Burst forward, untouchable, leaving a slipstream that damages everything it crosses."},
	"seal_the_breach": {"name": "Seal the Breach", "cooldown": 20.0, "desc": "Emergency repair: restore 35% hull and raise a shield for 4s."},
	"call_the_captains": {"name": "Call the Captains", "cooldown": 18.0, "desc": "Allied Shard cutters answer for 8s, holding a defensive ring around you and firing on anything that comes close."},
	"shield_wall": {"name": "Shield Wall", "cooldown": 17.0, "desc": "Bjorn raises the shield wall and Gunnar comes alongside for 6s: shots from ahead are stopped, enemies in front are shoved back and staggered, and Gunnar fires on anything close."},
	"all_hands": {"name": "All-Hands Meeting", "cooldown": 20.0, "desc": "Mandatory proximity: every nearby hostile is pulled into one knot ahead of you and marked (+50% damage taken for 5s). Zib patches 20 hull."},
	"build_another_way": {"name": "Build Another Way", "cooldown": 16.0, "desc": "Plant a Launch-Shop relay for 10s: it fires homemade rockets at hostiles and pulls in every shard around it."},
	"high_noon": {"name": "Quick Draw", "cooldown": 14.0, "desc": "Time slows; one heavy shot at each of up to 12 hostiles in range."},
	"veil_step": {"name": "Veil Step", "cooldown": 15.0, "desc": "Anomaly-glass distortion: for 4s enemies lose your track and you move 35% faster."},
}

## Per-character mastery perks, unlocked by mastery level (earned per expedition).
const MASTERY: Dictionary = {
	"ella_venn": ["Bulwark lasts 1s longer.", "Bulwark pulses damage to enemies inside.", "Start each expedition with +20 max hull.", "Bulwark cooldown -4s."],
	"naomi_sol": ["Corridor Run gains a second charge.", "Slipstream damage doubled.", "+6% base speed.", "Corridor Run grants 1.5s of +40% damage."],
	"tessa_banks": ["Field Repair every 30 motes.", "Seal the Breach also restores 20 Resonance.", "+0.5 armour.", "Seal the Breach cooldown -6s."],
	"abby_saville": ["Captains hold 2s longer.", "Four captains answer instead of three.", "+0.5 armour.", "Call the Captains cooldown -4s."],
	"bjorn": ["Shield Wall lasts 2s longer.", "Gunnar fires twice as fast.", "+0.5 armour.", "Shield Wall cooldown -4s."],
	"jax_orien": ["All-Hands pulls from further away.", "Zib patches 20 more hull.", "+15% pickup reach.", "All-Hands cooldown -5s."],
	"lucia": ["Relay stands 4s longer.", "Relay fires two rockets per salvo.", "Repairable starts after 2.5s.", "Build Another Way cooldown -4s."],
	"brandon_mack": ["Quick Draw reaches up to 18 targets.", "Quick Draw shots deal +50% damage.", "+0.5 armour.", "Quick Draw cooldown -4s."],
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
	"supersonic_being": {
		"name": "Supersonic Being", "field": "Hip-hop / pop spectacle", "color": Color("f9268d"),
		"tagline": "Life is too short to be boring.",
		"mechanic": "HYPE", "motif_layer": "force_supersonic",
		"desc": "Kills in quick succession build Hype (up to +60% Supersonic damage). Every 15-kill streak erupts in a spectacle burst.",
		"primary": "mic_drop",
	},
	"night_motion_archives": {
		"name": "Night Motion Archives", "field": "Indie / alternative", "color": Color("c8c3d6"),
		"tagline": "A song must survive the removal of its surface.",
		"mechanic": "AFTERIMAGE", "motif_layer": "force_night",
		"desc": "Archives attacks leave afterimages that keep cutting where the light has already passed.",
		"primary": "nightline",
	},
	"robots_sing_love_songs": {
		"name": "Robots Sing Love Songs", "field": "Speculative pop", "color": Color("ffb3c7"),
		"tagline": "We built minds from sand and lightning.",
		"mechanic": "DUET", "motif_layer": "force_robots",
		"desc": "A companion machine sings along. Targets it touches are left in harmony: the next hit from any other Force deals +30%.",
		"primary": "duet_unit",
	},
	"before_the_reboot": {
		"name": "Before the Reboot", "field": "Tracker interpretation", "color": Color("f3f5f7"),
		"tagline": "Finished, tracker-inspired reinterpretations of Star Splitter compositions.",
		"mechanic": "TRACKER", "motif_layer": "force_tracker",
		"desc": "Reboot weapons fire on a 16-step pattern. Notes that land on the downbeat hit 30% harder.",
		"primary": "pattern_cannon",
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
	"main_stage": {"forces": ["pulse_width_codex", "supersonic_being"], "name": "Main Stage", "desc": "Every Drop adds 12 Hype and ends in a spectacle burst."},
	"late_night_dub": {"forces": ["night_motion_archives", "resonant_currents"], "name": "Late-Night Dub", "desc": "Afterimages linger twice as long."},
	"machine_chorus": {"forces": ["robots_sing_love_songs", "ion_drive_orchestra"], "name": "Machine Chorus", "desc": "Duet companions fire with the sections on every beat."},
	"chiptune_anthem": {"forces": ["before_the_reboot", "pulse_width_codex"], "name": "Chiptune Anthem", "desc": "Pattern notes fill the Build three times faster."},
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
	"mic_drop": {"name": "Mic Drop", "force": "supersonic_being", "desc": "Slams down on the nearest crowd. Louder with every streak.",
		"damage": [40.0, 48.0, 58.0, 70.0, 86.0], "cooldown": [2.6, 2.4, 2.2, 2.0, 1.8], "radius": [90.0, 100.0, 112.0, 125.0, 140.0],
		"notes": ["Crowd slam.", "Bigger impact.", "Harder hit.", "Faster slams.", "Stadium-sized slam."],
		"evolution": "headliner", "evolve_with": "compressor"},
	"nightline": {"name": "Nightline", "force": "night_motion_archives", "desc": "A searchlight that sweeps around you, cutting everything in its beam.",
		"damage": [16.0, 19.0, 23.0, 27.0, 33.0], "radius": [260.0, 285.0, 310.0, 340.0, 380.0], "count": [1, 1, 2, 2, 2],
		"notes": ["One sweeping beam.", "Longer reach.", "A second beam.", "Brighter beams.", "Floodlight reach."],
		"evolution": "night_shift", "evolve_with": "bandwidth"},
	"duet_unit": {"name": "Duet Unit", "force": "robots_sing_love_songs", "desc": "A companion machine that follows you and answers every threat in harmony.",
		"damage": [14.0, 17.0, 20.0, 24.0, 29.0], "cooldown": [1.1, 1.0, 0.9, 0.8, 0.7], "count": [2, 2, 3, 3, 4],
		"notes": ["Two-note harmony.", "Stronger voice.", "Three-note chords.", "Quicker phrasing.", "Four-part harmony."],
		"evolution": "choir_of_machines", "evolve_with": "afterglow"},
	"pattern_cannon": {"name": "Pattern Cannon", "force": "before_the_reboot", "desc": "Square-wave shots fired on a 16-step tracker pattern.",
		"damage": [15.0, 18.0, 21.0, 25.0, 30.0], "count": [4, 5, 6, 8, 10],
		"notes": ["Four-note pattern.", "Five notes.", "Six notes.", "Eight notes.", "Ten-note pattern."],
		"evolution": "full_module", "evolve_with": "metronome"},
	"brass_swell": {"name": "Brass Swell", "force": "ion_drive_orchestra", "desc": "A widening fan of brass that rolls through the front line.",
		"damage": [22.0, 26.0, 31.0, 37.0, 45.0], "cooldown": [2.4, 2.25, 2.1, 1.95, 1.8], "count": [5, 6, 7, 8, 9],
		"notes": ["A brass fan.", "+1 voice.", "+1 voice, louder.", "+1 voice.", "Full brass line."],
		"evolution": "fanfare", "evolve_with": "long_delay"},
	"feedback_bloom": {"name": "Feedback Bloom", "force": "minor_collapse", "desc": "Seeds of feedback that slowly swell, then burst.",
		"damage": [36.0, 43.0, 52.0, 62.0, 76.0], "cooldown": [2.2, 2.05, 1.9, 1.75, 1.6], "radius": [90.0, 100.0, 112.0, 124.0, 140.0],
		"notes": ["One swelling seed.", "Wider bursts.", "Heavier bursts.", "Faster seeding.", "Huge blooms."],
		"evolution": "overload_bloom", "evolve_with": "gain_stage"},
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
	"headliner": {"name": "Headliner", "from": "mic_drop", "desc": "Three slams on three crowds at once, and every one throws confetti shrapnel."},
	"night_shift": {"name": "Night Shift", "from": "nightline", "desc": "Four searchlights on a long reach; afterimages burn twice as long."},
	"choir_of_machines": {"name": "Choir of Machines", "from": "duet_unit", "desc": "Three companions sing in rounds, and harmony marks last until struck."},
	"full_module": {"name": "Full Module", "from": "pattern_cannon", "desc": "A second tracker channel plays a counter-melody spread."},
	"fanfare": {"name": "Fanfare", "from": "brass_swell", "desc": "The brass rings out in every direction and answers itself a beat later."},
	"overload_bloom": {"name": "Overload Bloom", "from": "feedback_bloom", "desc": "Blooms set each other off in chain reactions."},
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
	"gain_stage": {"name": "Gain Stage", "desc": "+6% critical hit chance (critical hits deal double).", "max": 5},
	"long_delay": {"name": "Long Delay", "desc": "Echoes, fields, afterimages and charges last 15% longer.", "max": 5},
	"bandwidth": {"name": "Bandwidth", "desc": "Projectiles fly 12% faster and 12% further.", "max": 5},
	"compressor": {"name": "Compressor", "desc": "+20% knockback; +6% damage to elites and bosses.", "max": 5},
	"afterglow": {"name": "Afterglow", "desc": "Each kill repairs 0.4 hull.", "max": 5},
	"metronome": {"name": "Metronome", "desc": "Beat-driven weapons (sections, The Drop, patterns) deal +15%.", "max": 5},
}

# ============================================================== enemies
# The unmarked raider splinter group [CANON faction concept] and measurable
# anomaly phenomena [CANON families]. Individual units are [PROVISIONAL].

const ENEMIES: Dictionary = {
	"skiff": {"name": "Splinter Skiff", "hp": 16.0, "speed": 96.0, "damage": 8.0, "xp": 1, "radius": 13.0, "color": Color("9aa3ad"), "behavior": "drift", "shape": "dart", "aggro": 430.0},
	"ram_cutter": {"name": "Ram Cutter", "hp": 40.0, "speed": 120.0, "damage": 13.0, "xp": 2, "radius": 17.0, "color": Color("d0743c"), "behavior": "charge", "shape": "dart", "aggro": 480.0},
	"swarm_tender": {"name": "Swarm Tender", "hp": 95.0, "speed": 62.0, "damage": 14.0, "xp": 5, "radius": 25.0, "color": Color("d8664a"), "behavior": "orbit", "shape": "ring", "aggro": 520.0, "summon": "skiff", "summon_count": 2, "summon_every": 7.0},
	"rail_picket": {"name": "Rail Picket", "hp": 34.0, "speed": 88.0, "damage": 12.0, "xp": 3, "radius": 16.0, "color": Color("ffb35c"), "behavior": "ranged", "shape": "lancer", "aggro": 560.0, "keep": 330.0, "fire_every": 3.4, "shot_speed": 250.0},
	"mine_hauler": {"name": "Mine Hauler", "hp": 70.0, "speed": 58.0, "damage": 14.0, "xp": 4, "radius": 22.0, "color": Color("ff4fd8"), "behavior": "layer", "shape": "cell", "aggro": 500.0, "lay_every": 2.8, "hazard_radius": 62.0},
	"wreck_lurker": {"name": "Wreck Lurker", "hp": 52.0, "speed": 150.0, "damage": 15.0, "xp": 4, "radius": 18.0, "color": Color("ff8f6a"), "behavior": "ambush", "shape": "shard", "aggro": 190.0},
	"shield_tug": {"name": "Shield Tug", "hp": 60.0, "speed": 80.0, "damage": 10.0, "xp": 4, "radius": 19.0, "color": Color("b49aa8"), "behavior": "warden", "shape": "warden", "aggro": 520.0},
	"echo_mote": {"name": "Gravitic Echo", "hp": 22.0, "speed": 70.0, "damage": 7.0, "xp": 2, "radius": 14.0, "color": Color("e0708a"), "behavior": "drift", "shape": "orb", "aggro": 360.0},
	"splinter_captain": {"name": "Splinter Captain", "hp": 520.0, "speed": 84.0, "damage": 22.0, "xp": 30, "radius": 36.0, "color": Color("ffd75e"), "behavior": "surge", "shape": "elite", "elite": true, "aggro": 9999.0},
	"gunship": {"name": "Splinter Gunship", "min_time": 180.0, "hp": 80.0, "speed": 70.0, "damage": 11.0, "xp": 5, "radius": 22.0, "color": Color("c8a24a"), "behavior": "ranged", "shape": "gunship", "aggro": 600.0, "keep": 390.0, "fire_every": 3.8, "shot_speed": 280.0, "burst": 3},
	"leech": {"name": "Drift Leech", "min_time": 120.0, "hp": 30.0, "speed": 135.0, "damage": 4.0, "xp": 3, "radius": 12.0, "color": Color("b0a050"), "behavior": "leech", "shape": "leech", "aggro": 420.0},
	"blink": {"name": "Veil Flicker", "min_time": 150.0, "hp": 36.0, "speed": 60.0, "damage": 11.0, "xp": 3, "radius": 15.0, "color": Color("e05a9a"), "behavior": "blink", "shape": "blink", "aggro": 520.0},
	"dreadnought": {"name": "Splinter Dreadnought", "hp": 3200.0, "speed": 48.0, "damage": 22.0, "xp": 60, "radius": 50.0, "color": Color("a8784a"), "behavior": "dreadnought", "shape": "dreadnought", "elite": true, "aggro": 99999.0},
	"the_silence": {"name": "The Silence", "hp": 24000.0, "speed": 78.0, "damage": 26.0, "xp": 0, "radius": 72.0, "color": Color("ff376f"), "behavior": "boss", "shape": "silence", "boss": true, "aggro": 99999.0},
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
		"completion_unlocks": ["kaldr_rift"],
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
		"enemies": {"skiff": 1.0}, "blurb": "A reblazed corridor gate. Your way home — and where The Silence is called out.", "threat": 0},
	"silver_wrecks": {"name": "SILVER WRECKS", "shape": "circle", "center": Vector2(3325, 2128), "radius": 1208.0,
		"color": Color("9fb4d0"), "floor": Color("0b111c"), "props": "wreck", "density": 1.0, "music": "region_wrecks",
		"enemies": {"skiff": 0.9, "ram_cutter": 0.6, "wreck_lurker": 0.55, "shield_tug": 0.25, "leech": 0.3}, "blurb": "Old hull wreckage. Not every piece of debris is debris.", "threat": 2},
	"thunderbreak_shelf": {"name": "THUNDERBREAK SHELF", "shape": "circle", "center": Vector2(-3857, -2128), "radius": 1265.0,
		"color": Color("ff9a5f"), "floor": Color("150d0c"), "props": "crystal", "density": 1.0, "music": "region_shelf",
		"enemies": {"skiff": 0.8, "rail_picket": 0.8, "ram_cutter": 0.4, "gunship": 0.3}, "blurb": "Crystalline shelves charged with stray lightning. Watch the sky.", "threat": 2, "strikes": true},
	"quiet_basin": {"name": "QUIET BASIN", "shape": "circle", "center": Vector2(-2660, 2660), "radius": 1150.0,
		"color": Color("71cda0"), "floor": Color("08130f"), "props": "pools", "density": 0.45, "music": "region_basin",
		"enemies": {"echo_mote": 1.0, "swarm_tender": 0.25, "leech": 0.35}, "blurb": "Still water and slow echoes. A place to breathe — and to tune.", "threat": 1},
	"night_corridor": {"name": "NIGHT CORRIDOR", "shape": "capsule", "a": Vector2(1463, -1197), "b": Vector2(5719, -3192), "radius": 391.0,
		"color": Color("b07cff"), "floor": Color("0c0918"), "props": "corridor", "density": 0.8, "music": "region_corridor",
		"enemies": {"skiff": 0.8, "mine_hauler": 0.7, "ram_cutter": 0.35}, "blurb": "A half-reblazed lane. Green beacons still mark safe volume.", "threat": 2},
	"fracture_bloom": {"name": "FRACTURE BLOOM", "shape": "circle", "center": Vector2(399, -3591), "radius": 828.0,
		"color": Color("ff4f7b"), "floor": Color("16070f"), "props": "bloom", "density": 0.9, "music": "region_bloom",
		"enemies": {"shield_tug": 0.5, "ram_cutter": 0.6, "skiff": 0.6, "rail_picket": 0.4, "blink": 0.6}, "blurb": "A phase anomaly in full bloom. Rifts here unbalance everything.", "threat": 3},
	"rift_mouth": {"name": "RIFT MOUTH", "shape": "circle", "center": Vector2(-6300, 0), "radius": 520.0,
		"color": Color("68ecff"), "floor": Color("0a1424"), "props": "gate", "density": 0.25, "music": "region_gate",
		"enemies": {"skiff": 1.0}, "blurb": "Convoy staging point. Your way home — and where The Silence is called out.", "threat": 0},
	"grain_convoy": {"name": "GREEN CORRIDOR APPROACH", "shape": "circle", "center": Vector2(-3500, 1100), "radius": 1150.0,
		"color": Color("c6e27a"), "floor": Color("0d120a"), "props": "wreck", "density": 1.1, "music": "region_wrecks",
		"enemies": {"skiff": 0.9, "ram_cutter": 0.7, "wreck_lurker": 0.6, "gunship": 0.3}, "blurb": "Kaldr Rift's convoy lane through old hull wreckage, where raiders strike the approach.", "threat": 2},
	"fragment_belt": {"name": "FRAGMENT BELT", "shape": "circle", "center": Vector2(-700, -1000), "radius": 1350.0,
		"color": Color("b9a68a"), "floor": Color("100d0a"), "props": "belt", "density": 1.0, "music": "region_shelf",
		"enemies": {"skiff": 0.8, "rail_picket": 0.7, "mine_hauler": 0.4, "blink": 0.45}, "blurb": "Dense asteroid fragments. Find the lanes, or make them.", "threat": 2, "strikes": true},
	"broken_foundry": {"name": "BROKEN FOUNDRY", "shape": "circle", "center": Vector2(2300, 900), "radius": 1150.0,
		"color": Color("ff9a5f"), "floor": Color("140c08"), "props": "wreck", "density": 0.9, "music": "region_wrecks",
		"enemies": {"shield_tug": 0.5, "ram_cutter": 0.6, "swarm_tender": 0.4, "skiff": 0.6, "gunship": 0.45}, "blurb": "Broken industrial structures, still warm.", "threat": 3},
	"shear_window": {"name": "SHEAR WINDOW", "shape": "capsule", "a": Vector2(3600, -1900), "b": Vector2(6600, -700), "radius": 400.0,
		"color": Color("b07cff"), "floor": Color("0c0918"), "props": "corridor", "density": 0.8, "music": "region_corridor",
		"enemies": {"skiff": 0.8, "mine_hauler": 0.6, "rail_picket": 0.4}, "blurb": "A timing window through the shear. Beacons hold it open.", "threat": 2},
	"echo_shallows": {"name": "ECHO SHALLOWS", "shape": "circle", "center": Vector2(5800, 1900), "radius": 950.0,
		"color": Color("71cda0"), "floor": Color("08130f"), "props": "pools", "density": 0.5, "music": "region_basin",
		"enemies": {"echo_mote": 1.0, "swarm_tender": 0.3, "leech": 0.4}, "blurb": "Gravitic echoes pool here. Quiet, mostly.", "threat": 1},
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
		"text": "A convoy manifest with a game-original annotation: \"Crew intact. Music library: erased.\""},
	"frag_foundry": {"kind": "fragment", "region": "broken_foundry", "offset": Vector2(-400, 300), "title": "FOUNDRY LOG", "fragment": "frag_08", "hidden": "FRACTURE",
		"text": "Foundry log: \"We ran the machines loud on purpose. The hush stays away from the loud places.\""},
	# Characters
	"char_gravefire": {"kind": "character", "region": "silver_wrecks", "offset": Vector2(-380, -200), "title": "GRAVEFIRE DISTRESS CALL",
		"unlock_character": "tessa_banks", "fragment": "frag_02",
		"text": "The Gravefire, Tessa Banks's Shard working cutter, sits dark in the wreckage with a sealed breach, waiting out a raid. Her distress call carries a repair log and a request for parts — nothing more."},
	"char_verge_escort": {"kind": "character", "region": "night_corridor", "offset": Vector2(450, 60), "title": "VERGE ESCORT BEACON",
		"unlock_character": "naomi_sol",
		"text": "A Verge escort beacon logging a convoy report in Captain Naomi Sol's voice: \"Three containers taken. One split. No one lost from the freighter.\" (Rex Fleet Issue 01)"},
	"sig_spectacle": {"kind": "signal", "region": "thunderbreak_shelf", "offset": Vector2(-200, 220), "title": "SPECTACLE FREQUENCY", "lock": "crowd",
		"force": "supersonic_being", "transmission": "sb_give_it_up",
		"text": "A broadcast that only gets louder the more of a scene you make around it."},
	"sig_after_hours": {"kind": "signal", "region": "silver_wrecks", "offset": Vector2(-300, 360), "title": "AFTER-HOURS CARRIER", "hidden": "SCAN",
		"force": "night_motion_archives", "transmission": "nma_hanging_on_the_edge",
		"text": "A quiet melody hiding in a dark hull, intact even with everything around it stripped away."},
	"sig_magnetic": {"kind": "signal", "region": "broken_foundry", "offset": Vector2(300, -200), "title": "MACHINE DUET",
		"force": "robots_sing_love_songs", "transmission": "rsls_magnetic",
		"text": "Two foundry machines, long abandoned, answering each other in a song neither was built to sing."},
	"art_tracker_module": {"kind": "artifact", "region": "fragment_belt", "offset": Vector2(-350, 300), "title": "TRACKER MODULE", "hidden": "FRACTURE",
		"force": "before_the_reboot",
		"text": "A tracker module: sixteen-step patterns rebuilding an older composition in square waves. (Before the Reboot has no published releases; nothing here is a track.)"},
	"art_route_token": {"kind": "artifact", "region": "fracture_bloom", "offset": Vector2(-260, 140), "title": "VEIL ROUTE TOKEN", "hidden": "FRACTURE",
		"unlock_character": "jex_marrin", "fragment": "frag_04",
		"text": "A Veil Market route token stamped with timing windows nobody should know. A courier's mark is etched on the reverse: MARRIN."},
	# Artifacts with lasting effects
	"art_survey_chart": {"kind": "artifact", "region": "thunderbreak_shelf", "offset": Vector2(-330, 300), "title": "LATTICE SURVEY CHART", "hidden": "RESONANCE",
		"text": "Lattice Research shear maps of the Reach. Future expeditions start with the full map charted.", "perk": "full_map"},
	"art_beacon_core": {"kind": "artifact", "region": "quiet_basin", "offset": Vector2(330, -280), "title": "BHA BEACON CORE",
		"text": "A High Era harmonization beacon core, from before the Shattering — still warm. Future expeditions begin with +15 Resonance.", "perk": "resonance_start"},
	# Star Splitter Visions crossovers (Signal Space; noncanonical for every series).
	"vis_dti_beacon": {"kind": "character", "region": "quiet_basin", "offset": Vector2(-300, -260), "title": "DTI INTAKE BEACON",
		"crossover": "vikings_2026", "landmark": "dti", "color": Color("baff00"), "unlock_character": "bjorn",
		"text": "A Department of Temporal Integration intake beacon, drifting and still calling numbers: \"Now serving G-53.\" Two men in furs have been waiting beside it with a ticket and a round shield. The city had a process for them. The Reach does not."},
	"vis_stardust_dock": {"kind": "character", "region": "silver_wrecks", "offset": Vector2(420, 260), "title": "STARDUST STATION",
		"crossover": "stardust_station", "landmark": "station", "color": Color("ffce5c"), "unlock_character": "jax_orien",
		"text": "An orbital workplace that is on nobody's chart. The routine inspection is still running; the crew is still in the West Corridor, still saying things they would rather not. Jax Orien undocks the maintenance shuttle to see where they are."},
	"vis_ochre_relay": {"kind": "character", "region": "thunderbreak_shelf", "offset": Vector2(300, 240), "title": "OCHRE-9 RELAY ROCKET",
		"crossover": "backyard_rockets", "landmark": "rocket", "color": Color("e58a2b"), "unlock_character": "lucia",
		"text": "A homemade rocket stencilled OCHRE-9, built from salvaged aerospace parts in a Mojave workshop. Its relay is still trying to reach desert towns that were meant to have water and a signal without paying Tethergrid. Lucia climbs out, already rewiring it."},
	"vis_sunforge": {"kind": "character", "region": "fracture_bloom", "offset": Vector2(300, -200), "title": "THE SUNFORGE",
		"crossover": "sunforge_outlaw", "landmark": "sunforge", "color": Color("ff9b3d"), "unlock_character": "brandon_mack",
		"text": "A star burning far too close, hot enough to forge. A drifter in a dark duster is standing in its light like he has seen worse. The relay logs three different names for him. He answers to none of them, and he takes the job anyway."},
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
	"crowd": "Only resolves with a crowd watching. Tune it while enemies are close.",
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

const FRAGMENT_TITLE: String = "THE HUSH (game original — not Rex Fleet canon)"

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
	"sb_give_it_up": {"project": "Supersonic Being", "force": "supersonic_being", "title": "Give It Up, Let’s Go", "meta": "Released · 2025", "master_file": "sb_give_it_up.ogg"},
	"nma_hanging_on_the_edge": {"project": "Night Motion Archives", "force": "night_motion_archives", "title": "Hanging on the Edge", "meta": "Selected catalog", "master_file": "nma_hanging_on_the_edge.ogg"},
	"rsls_magnetic": {"project": "Robots Sing Love Songs", "force": "robots_sing_love_songs", "title": "Magnetic", "meta": "Selected catalog", "master_file": "rsls_magnetic.ogg"},
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
	"Supersonic Being": {"field": "Hip-hop / pop spectacle", "role": "Personality-driven hybrid", "accent": Color("f9268d"), "bio": "Fearless, funny, personality-driven music where hip-hop, pop spectacle, dance-rock, electronic energy, and left-field storytelling collide without asking permission.", "url": "https://distrokid.com/hyperfollow/supersonicbeing/give-it-up-let-go-feat-cheddr"},
	"Night Motion Archives": {"field": "Indie / alternative", "role": "Nocturnal alternative songs", "accent": Color("c8c3d6"), "bio": "Nocturnal indie and alternative songs where durable melodies, lived-in details, and emotional weight remain stronger than the surrounding atmosphere.", "url": ""},
	"Robots Sing Love Songs": {"field": "Speculative pop", "role": "Narrative song project", "accent": Color("ffb3c7"), "bio": "Electronic pop, spoken passages, and character-driven writing exploring memory, creativity, inheritance, and machine consciousness.", "url": ""},
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
	"force_supersonic", "force_night", "force_robots", "force_tracker",
	"state_resonance", "state_fracture",
]

const SFX_NAMES: Array[String] = [
	"shot", "shot_heavy", "hit", "kill", "kill_big", "pickup", "levelup", "choose", "discovery", "hurt",
	"ability", "wave", "lance", "mine", "chord", "drop", "strike", "heal", "magnet", "state_up", "state_down",
	"extract", "boss_appear", "boss_phase", "boss_die", "ui_click", "ui_back", "harmony", "enemy_shot",
	"victory", "defeat", "ping", "evolve",
]

# ============================================================== corridor chart
## The spine of the game (D-31). The Black Drift corridor is reopened one
## beacon at a time. Every stop is one expedition with ONE objective, ONE new
## idea ("new"), and a reward shown before launch. Finishing a stop relights
## its beacon and opens the next. Side stops branch off a main stop.
##
## objective: {"type": "discover", "id"} | {"type": "survive", "seconds"}
##          | {"type": "elite", "enemy"} | {"type": "boss"}
## start: where the home beacon stands for this stop (world position).
## reward: what the player gets, in words; "grants" holds the non-discovery
##         unlocks (features, characters, destinations).
const CHART: Array = [
	{"id": "first_light", "power": 15, "prize": "First track", "icon": "signal", "name": "First Light", "place": "Array Gate", "start": Vector2(0, 0),
		"objective": {"type": "discover", "id": "sig_now_or_never"}, "discoveries": ["sig_now_or_never", "frag_gate"],
		"new_title": "FLYING AND SIGNALS", "new": "Drag to fly; your weapons fire on their own. Cleared raiders drop shards: collect them to charge your tuner. Then fly into the column of light and hold still to tune it in.",
		"brief": "The corridor gate at Black Drift has been reblazed, but everything past it is dark. One carrier is still broadcasting. Tune it.",
		"reward": ["First track for your Archive: Now or Never", "Relights the gate beacon"], "grants": {}},
	{"id": "hold_the_lane", "prize": "Workshop", "icon": "hostile", "name": "Hold the Lane", "place": "Black Drift", "start": Vector2(1500, 700),
		"objective": {"type": "survive", "seconds": 180.0}, "discoveries": [],
		"new_title": "RAIDERS AND LEVEL-UPS", "new": "Red-ringed ships hunt anything that broadcasts. Cleared ships drop shards; shards fill the top bar; every level-up is a new weapon or system. Build a loadout.",
		"brief": "The first beacon is lit and raiders have noticed. Hold the lane open for three minutes.",
		"reward": ["Fleet Workshop opens: spend Signal on permanent refits"], "grants": {"features": ["workshop"]}},
	{"id": "gravefire", "power": 45, "prize": "Tessa Banks", "icon": "explorer", "name": "Gravefire", "place": "Silver Wrecks", "region": "silver_wrecks",
		"objective": {"type": "discover", "id": "char_gravefire"}, "discoveries": ["char_gravefire", "frag_wrecks"],
		"new_title": "EXPLORER CONTACTS", "new": "Gold-tagged beacons are people. Answer one and that explorer joins you, with their own ship and ability. Careful in the wrecks: some debris is not debris.",
		"brief": "A Shard working cutter, the Gravefire, is dark in the wreckage with a sealed breach. Her captain is still transmitting.",
		"reward": ["New explorer: Tessa Banks"], "grants": {}},
	{"id": "green_echo", "power": 55, "prize": "Resonant Currents", "icon": "signal", "name": "Green Echo", "place": "Quiet Basin", "region": "quiet_basin",
		"objective": {"type": "discover", "id": "sig_green_echo"}, "discoveries": ["sig_green_echo", "anom_memory_well", "art_beacon_core"],
		"new_title": "RESONANCE", "new": "The meter under your hull. Green resonators push it up into RESONANCE: stronger weapons, and some signals only resolve there. This one does.",
		"brief": "A delayed signal repeats through still water, a little deeper each time. It will not resolve until you are in Resonance.",
		"reward": ["New Force: Resonant Currents (Echo & Space weapons join your level-ups)", "Track: Meaningless Dub"], "grants": {}},
	{"id": "verge_escort", "power": 65, "prize": "Naomi Sol", "icon": "explorer", "name": "The Escort", "place": "Night Corridor", "region": "night_corridor",
		"objective": {"type": "discover", "id": "char_verge_escort"}, "discoveries": ["char_verge_escort", "frag_corridor"],
		"new_title": "HAZARDS", "new": "Mine haulers seed the lane with charges. Pink blooms on the ground are mines: fly around them, or lead raiders through them.",
		"brief": "A Verge escort beacon is logging a convoy report in a half-reblazed lane. Captain Naomi Sol is still out there.",
		"reward": ["New explorer: Captain Naomi Sol"], "grants": {}},
	{"id": "shelf_beacon", "power": 100, "prize": "Star Splitter Rex", "icon": "signal", "name": "Shelf Beacon", "place": "Thunderbreak Shelf", "region": "thunderbreak_shelf",
		"objective": {"type": "discover", "id": "sig_thunderbreak_beacon"}, "discoveries": ["sig_thunderbreak_beacon", "art_survey_chart"],
		"new_title": "GUARDIANS", "new": "Some broadcasts are defended. Start tuning and an elite captain answers (thick red-and-gold ring, health bar). Defeat it to finish.",
		"brief": "A beacon on the crystal shelves is carrying something heavy. Something else is listening to it.",
		"reward": ["New Force: Star Splitter Rex (Impact weapons)", "Track: Signals and Shadows"], "grants": {}},
	{"id": "night_trace", "power": 120, "prize": "Ghost Driver Unit", "icon": "signal", "name": "Night Trace", "place": "Night Corridor", "region": "night_corridor",
		"objective": {"type": "discover", "id": "sig_night_trace"}, "discoveries": ["sig_night_trace"],
		"new_title": "MOVING SIGNALS", "new": "This signal travels the lane. Match its pace and stay inside its ring to tune it.",
		"brief": "Something is running the Night Corridor end to end and will not stop for anyone.",
		"reward": ["New Force: Ghost Driver Unit (Momentum weapons)", "Track: Watch Out"], "grants": {}},
	{"id": "ignition", "power": 140, "prize": "Ion Drive Orchestra", "icon": "signal", "name": "Ignition Chorus", "place": "Silver Wrecks", "region": "silver_wrecks",
		"objective": {"type": "discover", "id": "sig_ignition"}, "discoveries": ["sig_ignition"],
		"new_title": "RELAYS", "new": "Three relay sections stand around this signal. Fly through each to bring it online; only then can the signal play together and be tuned.",
		"brief": "An orchestra is trying to start in the wreckage, one section at a time.",
		"reward": ["New Force: Ion Drive Orchestra (Ensemble weapons)", "Track: Ignition Sequence"], "grants": {}},
	{"id": "hexagonal_haze", "power": 160, "prize": "Minor Collapse", "icon": "signal", "name": "Hexagonal Haze", "place": "Fracture Bloom", "region": "fracture_bloom",
		"objective": {"type": "discover", "id": "sig_hexagonis"}, "discoveries": ["sig_hexagonis"],
		"new_title": "FRACTURE", "new": "Red rifts drain Resonance into FRACTURE: you hit harder and so does everything else. This signal needs the opposite of a fight: hold completely still inside it.",
		"brief": "A wall of sound at the heart of a phase anomaly, so quiet at its centre you can hear yourself.",
		"reward": ["New Force: Minor Collapse (Wall of Sound weapons)", "Track: Hexagonis"], "grants": {}},
	{"id": "dreadnought", "prize": "Abby Saville", "icon": "elite", "name": "The Hulk", "place": "Black Drift", "start": Vector2(-1800, -600),
		"objective": {"type": "elite", "enemy": "dreadnought", "at": 150.0}, "discoveries": [],
		"new_title": "THE DREADNOUGHT", "new": "A salvage hulk with broadside guns. The wide beams along its flanks are the telegraph: stay ahead of or behind it, never beside it.",
		"brief": "A Splinter Dreadnought has been stripping every beacon you relight. The Shards want it gone as much as you do.",
		"reward": ["New explorer: Abby Saville, warlord of the Scythe of Saville"], "grants": {"characters": ["abby_saville"]}},
	{"id": "veil_token", "power": 180, "prize": "Jex Marrin", "icon": "artifact", "name": "The Token", "place": "Fracture Bloom", "region": "fracture_bloom",
		"objective": {"type": "discover", "id": "art_route_token"}, "discoveries": ["art_route_token"],
		"new_title": "HIDDEN SITES", "new": "Some things only exist in Fracture. Fly through a Phase Rift (torn red star) to tip the meter, then look again.",
		"brief": "A Veil Market courier left a route token in the Bloom, where nobody sane would look for it.",
		"reward": ["New explorer: Jex Marrin, Veil Market broker"], "grants": {}},
	{"id": "the_silence", "prize": "Kaldr Rift", "icon": "elite", "name": "The Silence", "place": "Array Gate", "start": Vector2(0, 0),
		"objective": {"type": "boss", "at": 300.0, "hp": 0.6}, "discoveries": [],
		"new_title": "THE SILENCE", "new": "It is not hunting ships. It is hunting songs. It arrives at 5:00, or call it at the beacon when you are ready. Build your loadout first.",
		"brief": "Every beacon on the corridor is lit, and the thing that put them out is coming to do it again.",
		"reward": ["The Kaldr Rift corridor opens", "Open Expedition: the whole Reach at once, every signal live"], "grants": {"features": ["open_reach"], "destinations": ["kaldr_rift"]}},
	# ---- side stops: optional branches that open when their parent is relit.
	{"id": "s_stardust", "power": 70, "prize": "Jax Orien", "icon": "visions", "side_of": "gravefire", "name": "Mandatory Proximity", "place": "Silver Wrecks", "region": "silver_wrecks",
		"objective": {"type": "discover", "id": "vis_stardust_dock"}, "discoveries": ["vis_stardust_dock"],
		"new_title": "VISIONS CROSSOVERS", "new": "Some things in Signal Space come from other Star Splitter Visions series. Each one brings a guest explorer.",
		"brief": "An orbital workplace that is on nobody's chart has appeared in the wrecks. The inspection is still running.",
		"reward": ["Guest explorer: Jax Orien (Stardust Station)"], "grants": {}},
	{"id": "s_after_hours", "power": 70, "prize": "Night Motion", "icon": "signal", "side_of": "gravefire", "name": "After Hours", "place": "Silver Wrecks", "region": "silver_wrecks",
		"objective": {"type": "discover", "id": "sig_after_hours"}, "discoveries": ["sig_after_hours"],
		"new_title": "THE SCANNER", "new": "Faint sites only show when you pass close. Sweep the area; your scanner calls out what it finds.",
		"brief": "A carrier that only plays when nobody is looking for it.",
		"reward": ["New Force: Night Motion Archives (Afterimage weapons)", "Track: Hanging on the Edge"], "grants": {}},
	{"id": "s_dti", "power": 70, "prize": "Bjorn", "icon": "visions", "side_of": "green_echo", "name": "Now Serving G-53", "place": "Quiet Basin", "region": "quiet_basin",
		"objective": {"type": "discover", "id": "vis_dti_beacon"}, "discoveries": ["vis_dti_beacon"],
		"new_title": "A TIME SLIP", "new": "A municipal intake beacon from somewhere else entirely. Answer it like any contact.",
		"brief": "A Department of Temporal Integration beacon is adrift in the Basin, still calling numbers.",
		"reward": ["Guest explorer: Bjorn, with Gunnar (Vikings 2026!)"], "grants": {}},
	{"id": "s_ochre", "power": 110, "prize": "Lucia", "icon": "visions", "side_of": "shelf_beacon", "name": "OCHRE-9", "place": "Thunderbreak Shelf", "region": "thunderbreak_shelf",
		"objective": {"type": "discover", "id": "vis_ochre_relay"}, "discoveries": ["vis_ochre_relay"],
		"new_title": "BUILD ANOTHER WAY", "new": "A homemade relay rocket. Its builder plants relays that fight for you.",
		"brief": "A rocket built from salvaged aerospace parts has come down on the Shelf, relay still running.",
		"reward": ["Guest explorer: Lucia (Backyard Rockets)"], "grants": {}},
	{"id": "s_spectacle", "power": 110, "prize": "Supersonic Being", "icon": "signal", "side_of": "shelf_beacon", "name": "Spectacle", "place": "Thunderbreak Shelf", "region": "thunderbreak_shelf",
		"objective": {"type": "discover", "id": "sig_spectacle"}, "discoveries": ["sig_spectacle"],
		"new_title": "A SIGNAL THAT WANTS A CROWD", "new": "This one only resolves while enemies are close. Let them gather, then tune it in front of them.",
		"brief": "A frequency that refuses to play to an empty room.",
		"reward": ["New Force: Supersonic Being (Hype weapons)", "Track: Give It Up, Let’s Go"], "grants": {}},
	{"id": "s_campfire", "power": 130, "prize": "Warm Circuits", "icon": "signal", "side_of": "night_trace", "name": "Analog Campfire", "place": "The Far Drift", "start": Vector2(-4500, 3200),
		"objective": {"type": "discover", "id": "sig_campfire"}, "discoveries": ["sig_campfire"],
		"new_title": "THE FAR DRIFT", "new": "Open space, far from any landmark. Follow the compass arrow at the screen edge.",
		"brief": "Far out in the drift, a warm improvised groove circles a ring of old beacons.",
		"reward": ["New Force: Warm Circuits Rise (Improvisation weapons)", "Track: This Path’s for You"], "grants": {}},
	{"id": "s_sunforge", "power": 160, "prize": "Brandon Mack", "icon": "visions", "side_of": "hexagonal_haze", "name": "The Sunforge", "place": "Fracture Bloom", "region": "fracture_bloom",
		"objective": {"type": "discover", "id": "vis_sunforge"}, "discoveries": ["vis_sunforge"],
		"new_title": "HEAT", "new": "A star burning close enough to forge. Someone is standing in its light.",
		"brief": "The relays log three different names for the man at the Sunforge. He answers to none of them.",
		"reward": ["Guest explorer: Brandon Mack (Sunforge Outlaw)"], "grants": {}},
]

static func chart_stop(id: String) -> Dictionary:
	for st: Dictionary in CHART:
		if String(st["id"]) == id:
			return st
	return {}

static func chart_main() -> Array:
	return CHART.filter(func(st: Dictionary) -> bool: return not st.has("side_of"))

static func chart_sides(parent_id: String) -> Array:
	return CHART.filter(func(st: Dictionary) -> bool: return String(st.get("side_of", "")) == parent_id)

## 1-based number of a main stop, or 0 for a side stop.
static func chart_number(id: String) -> int:
	var main: Array = chart_main()
	for i in main.size():
		if String(main[i]["id"]) == id:
			return i + 1
	return 0

## Where a stop's home beacon stands: explicit, or the corridor-side edge of
## its region (the side facing the gate the corridor is growing from).
static func chart_start(st: Dictionary) -> Vector2:
	if st.has("start"):
		return st["start"]
	var region: Dictionary = REGIONS[String(st["region"])]
	var c: Vector2 = region_anchor(region)
	if String(region.get("shape", "circle")) == "capsule":
		return Vector2(region["a"]) - (Vector2(region["b"]) - Vector2(region["a"])).normalized() * 260.0
	return c - c.normalized() * float(region["radius"]) * 0.98

static func chart_objective_text(st: Dictionary) -> String:
	var o: Dictionary = st["objective"]
	match String(o["type"]):
		"discover":
			var d: Dictionary = DISCOVERIES[String(o["id"])]
			var verb: String = {"signal": "Tune", "character": "Answer", "artifact": "Recover"}.get(String(d["kind"]), "Find")
			return "%s the %s" % [verb, String(d["title"])]
		"survive":
			return "Hold the lane for %s" % format_time(float(o["seconds"]))
		"elite":
			return "Destroy the %s" % String(ENEMIES[String(o["enemy"])]["name"])
		"boss":
			return "Defeat The Silence"
	return ""

# ============================================================== star splitter visions
## Other Star Splitter Visions series, as published on the Visions site (SSV
## sites/visions/src/content/series/*.json @ b35d7d8f298c). Tagline, label and
## description are verbatim. "signal_space" describes the game's adaptation,
## which is noncanonical for the series.
const VISIONS_SERIES: Dictionary = {
	"vikings_2026": {"title": "Vikings 2026!", "label": "Temporal Comedy", "accent": Color("baff00"), "cover": "vikings_2026",
		"tagline": "Actual Vikings. Modern New York. A city full of systems they never agreed to.",
		"description": "When ninth-century Vikings arrive in present-day New York, the city's underfunded Department of Temporal Integration has a process for them. It is less prepared for their opinions. Housing, work, money, and new friendships become a fight to build an ordinary life without surrendering who they are.",
		"release": "Issue 01 · released August 22, 2026",
		"explorer": "bjorn", "discovery": "vis_dti_beacon",
		"signal_space": "A second time slip carries Bjorn and Gunnar out of New York and into the Reach, ticket G-53 still in hand. Bjorn flies; Gunnar comes alongside when the shield wall goes up."},
	"stardust_station": {"title": "Stardust Station", "label": "Orbital Workplace Sitcom", "accent": Color("ffce5c"), "cover": "stardust_station",
		"tagline": "The coworkers are the reactor.",
		"description": "A routine inspection traps the crew of Stardust Station in the West Corridor. Nobody can leave, everybody has something to say, and a supposedly ordinary workday turns into a test of how well these coworkers really know one another.",
		"release": "Issue 01: Mandatory Proximity · released August 29, 2026",
		"explorer": "jax_orien", "discovery": "vis_stardust_dock",
		"signal_space": "The whole station slips into the Silver Wrecks mid-inspection. Jax Orien takes the maintenance shuttle out; the crew answers when he calls an all-hands meeting."},
	"backyard_rockets": {"title": "Backyard Rockets", "label": "Desert Science Fiction", "accent": Color("e58a2b"), "cover": "backyard_rockets",
		"tagline": "Build another way.",
		"description": "Arvin, Lucia, and Milo run Launch-Shop, a mobile workshop in the Mojave where salvaged aerospace parts become homemade rockets and working relays. Every launch helps desert communities move water and information without Tethergrid—and makes the crew harder for the company to ignore.",
		"release": "Issues 01–02: Combined Edition · released August 29, 2026",
		"explorer": "lucia", "discovery": "vis_ochre_relay",
		"signal_space": "OCHRE-9 lifts off from the Mojave and comes down on the Thunderbreak Shelf. Lucia flies it and keeps building the network: relays nobody can switch off."},
	"sunforge_outlaw": {"title": "Sunforge Outlaw", "label": "Speculative Frontier", "accent": Color("ff9b3d"), "cover": "sunforge_outlaw",
		"tagline": "Heat. Pursuit. A life outside the law.",
		"description": "A frontier story of pursuit, defiance, and survival under a relentless sun. The first story is in development.",
		"release": "Issue 01 preview · in development",
		"explorer": "brandon_mack", "discovery": "vis_sunforge",
		"signal_space": "A star burning close enough to forge, and a drifter standing in its light. The game reveals nothing of his story beyond the published cover."},
}

# ============================================================== field guide
## Visual classification: every thing you meet belongs to one category with a
## fixed colour family and icon. Enemies are always warm with a red threat rim;
## pickups are small, bright and cool; discoveries are tall landmarks.
const CATEGORY_ORDER: Array[String] = ["hostile", "elite", "xp", "supply", "cache", "signal", "explorer", "visions", "artifact", "fragment", "anomaly", "echo", "resonator", "rift", "camp", "gate"]
const CATEGORIES: Dictionary = {
	"hostile": {"name": "HOSTILE", "group": "THREATS", "color": Color("ff4a4a"),
		"what": "Raider ships and things of the hush. Always ringed in red.",
		"why": "They hurt on contact or by firing. Your weapons fire on their own — cleared ships drop XP shards."},
	"elite": {"name": "ELITE / BOSS", "group": "THREATS", "color": Color("ffb03a"),
		"what": "Big ships with a thick red-and-gold ring and a health bar.",
		"why": "Dangerous but rich: they drop piles of shards. The Silence is the boss that ends an expedition."},
	"xp": {"name": "XP SHARD", "group": "PICKUPS", "color": Color("6ff6ff"),
		"what": "Small spinning diamonds (cyan, violet, gold = bigger).",
		"why": "Fly over them. Fill the top bar to LEVEL UP and pick a new weapon or ship system."},
	"supply": {"name": "SUPPLIES", "group": "PICKUPS", "color": Color("7dffb2"),
		"what": "Green cross = repair cell. Blue horseshoe = magnet.",
		"why": "Repair restores hull. A magnet pulls every shard on screen to you."},
	"cache": {"name": "SUPPLY CACHE", "group": "PICKUPS", "color": Color("7dffb2"),
		"what": "Green crates in the field (red ones appear only in Fracture).",
		"why": "Fly into one: repairs and shards. Red Fracture caches give a free level-up."},
	"signal": {"name": "MUSIC SIGNAL", "group": "DISCOVERIES", "color": Color("ff5fb0"),
		"what": "Tall columns of light broadcasting a Star Splitter Records project.",
		"why": "Hold still in the ring to tune it: attunes that project's FORCE (new weapons in level-ups) and files a real track in your Archive. Tune 3 to call out The Silence."},
	"explorer": {"name": "EXPLORER", "group": "DISCOVERIES", "color": Color("ffd75e"),
		"what": "Distress calls and beacons from Rex Fleet crews.",
		"why": "Answer one to unlock a new playable explorer with their own ship, trait and ability."},
	"artifact": {"name": "ARTIFACT", "group": "DISCOVERIES", "color": Color("b48cff"),
		"what": "Recovered tech, often hidden until Resonance or Fracture.",
		"why": "Permanent rewards: perks for every future expedition, a new Force, or a new explorer."},
	"fragment": {"name": "LOG FRAGMENT", "group": "DISCOVERIES", "color": Color("c9d3e6"),
		"what": "Logs, recorders and buoys.",
		"why": "Quick to read. Pieces of the mystery of the hush, kept in the Archive."},
	"visions": {"name": "VISIONS CROSSOVER", "group": "DISCOVERIES", "color": Color("ffce5c"),
		"what": "Landmarks from other Star Splitter Visions series that slipped into Signal Space: an intake beacon, an orbital station, a homemade rocket, a burning star.",
		"why": "Each one brings a guest explorer from that series, playable from your next expedition, and opens their page in the Archive."},
	"anomaly": {"name": "ANOMALY", "group": "DISCOVERIES", "color": Color("4fe0d0"),
		"what": "Strange space: wells and folds.",
		"why": "Unusual effects for this run — a free choice, or a shortcut across the map."},
	"echo": {"name": "ECHO TRANSMISSION", "group": "FIELD SITES", "color": Color("ff8fb0"),
		"what": "A timed broadcast with a countdown.",
		"why": "Reach it before it fades: free level-up, Resonance and bonus Signal."},
	"resonator": {"name": "RESONATOR", "group": "FIELD SITES", "color": Color("71cda0"),
		"what": "Green pylons that hum.",
		"why": "Boosts Resonance (stronger weapons, hidden sites appear) and repairs a little."},
	"rift": {"name": "PHASE RIFT", "group": "FIELD SITES", "color": Color("ff4f7b"),
		"what": "A torn red star in space.",
		"why": "A gamble: drains Resonance toward Fracture, but spills shards."},
	"camp": {"name": "RAIDER CAMP", "group": "FIELD SITES", "color": Color("d0743c"),
		"what": "A fortified raider nest with turrets.",
		"why": "Clear the defenders to loot it."},
	"gate": {"name": "THE GATE", "group": "FIELD SITES", "color": Color("68ecff"),
		"what": "The big ring where you started.",
		"why": "Your way home (keep everything) — and where you choose to face The Silence."},
}

## Category for a point of interest kind (pass the POI's data to tell
## Visions crossovers apart from Rex Fleet contacts).
static func poi_category(kind: String, data: Dictionary = {}) -> String:
	if data.has("crossover"):
		return "visions"
	match kind:
		"signal":
			return "signal"
		"character":
			return "explorer"
		"artifact":
			return "artifact"
		"fragment":
			return "fragment"
		"anomaly", "mirror", "mirror_pair":
			return "anomaly"
		"cache", "fracture_cache":
			return "cache"
		"echo":
			return "echo"
		"resonator":
			return "resonator"
		"rift":
			return "rift"
		"camp":
			return "camp"
	return ""

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
