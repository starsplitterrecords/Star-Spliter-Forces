extends Node
## Owns every sound in the game.
##
## Music: a set of tempo-locked loop layers (same length, same tempo) that are
## faded in/out according to region, Force attunement, Resonance state and
## combat intensity. Because every layer shares a clock, transitions always
## respect phrasing. Layers that are silent are stopped and rejoin at the
## master position, so mobile devices decode only what is audible.
##
## SFX: a small voice pool with per-sound rate limiting so 40 hits in a frame
## produce one satisfying sound rather than a wall of noise.
##
## Catalog playback: authorised Star Splitter masters dropped into
## res://audio/catalog/ are discovered at runtime via GameData.TRANSMISSIONS.

signal beat(index: int)
signal bar(index: int)

const SCORE_DIR: String = "res://audio/score/"
const SFX_DIR: String = "res://audio/sfx/"
const CATALOG_DIR: String = "res://audio/catalog/"
## Realm music slots: audio/realms/<realm id>/<slot>.ogg (slots: explore,
## boss). A file that exists plays in that realm instead of the placeholder
## score; no code change needed.
const REALM_DIR: String = "res://audio/realms/"
const REALM_SLOTS: Array[String] = ["explore", "boss"]
const BPM: float = 112.0
const BEATS_PER_BAR: int = 4
const FADE_SPEED: float = 0.65 # linear volume units per second

var music_layers: Dictionary = {} # name -> AudioStreamPlayer
var layer_targets: Dictionary = {} # name -> 0..1
var layer_levels: Dictionary = {} # name -> 0..1 (current)
var master_layer: String = ""
var loop_length: float = 0.0
var music_running: bool = false
var _clock: float = 0.0
var _last_beat: int = -1
var _last_bar: int = -1

var sfx_streams: Dictionary = {}
var sfx_players: Dictionary = {} # sfx name -> AudioStreamPlayer
var sfx_last_played: Dictionary = {}

var realm_player: AudioStreamPlayer
var realm_playing: String = ""
var catalog_player: AudioStreamPlayer
var catalog_track: String = ""
var duck: float = 1.0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_ensure_bus("Music")
	_ensure_bus("SFX")
	_load_score()
	_load_sfx()
	# One player per effect, stream assigned once. Reassigning streams on a
	# shared pool re-registers audio samples in web builds every play, which
	# grew browser memory without bound over long sessions.
	for sfx_name: String in sfx_streams.keys():
		var p: AudioStreamPlayer = AudioStreamPlayer.new()
		p.bus = "SFX"
		p.stream = sfx_streams[sfx_name]
		p.max_polyphony = 4
		add_child(p)
		sfx_players[sfx_name] = p
	realm_player = AudioStreamPlayer.new()
	realm_player.bus = "Music"
	add_child(realm_player)
	catalog_player = AudioStreamPlayer.new()
	catalog_player.bus = "Music"
	add_child(catalog_player)
	apply_volumes()

func _ensure_bus(bus_name: String) -> void:
	if AudioServer.get_bus_index(bus_name) != -1:
		return
	AudioServer.add_bus()
	var idx: int = AudioServer.bus_count - 1
	AudioServer.set_bus_name(idx, bus_name)
	AudioServer.set_bus_send(idx, "Master")

func apply_volumes() -> void:
	var profile: Node = get_node_or_null("/root/Profile")
	if profile == null or profile.data.is_empty():
		return
	_ensure_bus("Music")
	_ensure_bus("SFX")
	var music_v: float = float(profile.setting("music_volume"))
	var sfx_v: float = float(profile.setting("sfx_volume"))
	AudioServer.set_bus_volume_db(AudioServer.get_bus_index("Music"), linear_to_db(maxf(0.0001, music_v)))
	AudioServer.set_bus_volume_db(AudioServer.get_bus_index("SFX"), linear_to_db(maxf(0.0001, sfx_v)))

# ------------------------------------------------------------------ loading

func _load_score() -> void:
	for layer: String in GameData.SCORE_LAYERS:
		var path: String = SCORE_DIR + layer + ".ogg"
		if not ResourceLoader.exists(path):
			continue
		var stream: AudioStream = load(path)
		if stream is AudioStreamOggVorbis:
			(stream as AudioStreamOggVorbis).loop = true
		var p: AudioStreamPlayer = AudioStreamPlayer.new()
		p.stream = stream
		p.bus = "Music"
		p.volume_db = -80.0
		add_child(p)
		music_layers[layer] = p
		layer_targets[layer] = 0.0
		layer_levels[layer] = 0.0
		if master_layer == "":
			master_layer = layer
			loop_length = stream.get_length()

func _load_sfx() -> void:
	for sfx_name: String in GameData.SFX_NAMES:
		var path: String = SFX_DIR + sfx_name + ".ogg"
		if ResourceLoader.exists(path):
			sfx_streams[sfx_name] = load(path)

func has_score() -> bool:
	return not music_layers.is_empty()

# ------------------------------------------------------------------ music

## Sets the full mix target. Layers not mentioned fade to silence.
func set_mix(targets: Dictionary) -> void:
	for layer: String in layer_targets.keys():
		layer_targets[layer] = clampf(float(targets.get(layer, 0.0)), 0.0, 1.0)
	if not music_running:
		start_music()

func start_music() -> void:
	if music_layers.is_empty():
		return
	music_running = true
	_clock = 0.0
	var master: AudioStreamPlayer = music_layers[master_layer]
	master.play(0.0)

func stop_music() -> void:
	music_running = false
	for p: AudioStreamPlayer in music_layers.values():
		p.stop()
	for layer: String in layer_levels.keys():
		layer_levels[layer] = 0.0
		layer_targets[layer] = 0.0

func music_position() -> float:
	if not music_running or master_layer == "":
		return _clock
	var master: AudioStreamPlayer = music_layers[master_layer]
	if master.playing:
		return master.get_playback_position()
	return _clock

func beat_length() -> float:
	return 60.0 / BPM

## Seconds until the next bar downbeat — used to land big moments on the 1.
func time_to_next_bar() -> float:
	var bar_len: float = beat_length() * BEATS_PER_BAR
	return bar_len - fmod(music_position(), bar_len)

func beat_phase() -> float:
	return fmod(music_position(), beat_length()) / beat_length()

func _process(delta: float) -> void:
	_clock += delta
	if music_running and not music_layers.is_empty():
		var pos: float = music_position()
		var master: AudioStreamPlayer = music_layers[master_layer]
		# While a catalog track plays the score is paused; do not restart it.
		if catalog_track != "" and catalog_player.playing:
			return
		# The master always plays (possibly silent) to hold the clock.
		if not master.playing and not master.stream_paused:
			master.play(0.0)
		for layer: String in music_layers.keys():
			var p: AudioStreamPlayer = music_layers[layer]
			var target: float = float(layer_targets[layer])
			var level: float = move_toward(float(layer_levels[layer]), target, FADE_SPEED * delta)
			layer_levels[layer] = level
			var db: float = linear_to_db(maxf(0.0001, level * duck)) if level > 0.001 else -80.0
			# Only touch the player when the level really moves (web audio
			# crosses into JS on every volume change).
			if absf(db - p.volume_db) > 0.05:
				p.volume_db = db
			if layer == master_layer:
				continue
			if level > 0.001 and not p.playing and not p.stream_paused:
				p.play(fmod(pos + 0.02, maxf(0.1, loop_length)))
			elif level <= 0.001 and target <= 0.0 and p.playing:
				p.stop()
		var b: int = int(pos / beat_length())
		if b != _last_beat:
			_last_beat = b
			beat.emit(b)
			if b % BEATS_PER_BAR == 0:
				var bar_index: int = b / BEATS_PER_BAR
				if bar_index != _last_bar:
					_last_bar = bar_index
					bar.emit(bar_index)
	# Gentle duck recovery after stingers.
	duck = move_toward(duck, 1.0, delta * 0.6)

# ------------------------------------------------------------------ sfx

func play_sfx(sfx_name: String, pitch: float = 1.0, volume_db: float = 0.0, min_gap: float = 0.035) -> void:
	if not sfx_streams.has(sfx_name):
		return
	var now: float = Time.get_ticks_msec() / 1000.0
	if now - float(sfx_last_played.get(sfx_name, -10.0)) < min_gap:
		return
	sfx_last_played[sfx_name] = now
	var voice: AudioStreamPlayer = sfx_players[sfx_name]
	var ps: float = clampf(pitch, 0.25, 4.0)
	if not is_equal_approx(voice.pitch_scale, ps):
		voice.pitch_scale = ps
	if not is_equal_approx(voice.volume_db, volume_db):
		voice.volume_db = volume_db
	voice.play()

## Stingers duck the score briefly so the moment reads.
func stinger(sfx_name: String, volume_db: float = 0.0) -> void:
	duck = 0.45
	play_sfx(sfx_name, 1.0, volume_db, 0.2)

# ------------------------------------------------------------------ catalog

func catalog_path(transmission_id: String) -> String:
	var t: Dictionary = GameData.TRANSMISSIONS.get(transmission_id, {})
	var file: String = String(t.get("master_file", ""))
	if file == "":
		return ""
	var path: String = CATALOG_DIR + file
	return path if ResourceLoader.exists(path) else ""

func realm_path(realm_id: String, slot: String) -> String:
	var path: String = REALM_DIR + realm_id + "/" + slot + ".ogg"
	return path if ResourceLoader.exists(path) else ""

## Plays a realm's slot if its file exists (looping); returns false if not,
## leaving the placeholder score running.
func play_realm(realm_id: String, slot: String) -> bool:
	var path: String = realm_path(realm_id, slot)
	if path == "":
		return false
	if realm_playing == path and realm_player.playing:
		return true
	var st: AudioStream = load(path)
	if st is AudioStreamOggVorbis:
		(st as AudioStreamOggVorbis).loop = true
	realm_player.stream = st
	realm_player.play()
	realm_playing = path
	_set_music_paused(true)
	return true

func stop_realm() -> void:
	if realm_player and realm_player.playing:
		realm_player.stop()
		_set_music_paused(false)
	realm_playing = ""

func has_master(transmission_id: String) -> bool:
	return catalog_path(transmission_id) != ""

## Plays an authorised master if present; otherwise the Force motif layer as a
## clearly labelled in-game preview. Returns "master", "motif" or "".
func play_catalog(transmission_id: String) -> String:
	stop_catalog()
	var path: String = catalog_path(transmission_id)
	if path != "":
		catalog_player.stream = load(path)
		catalog_player.play()
		catalog_track = transmission_id
		_set_music_paused(true)
		return "master"
	var t: Dictionary = GameData.TRANSMISSIONS.get(transmission_id, {})
	var motif: String = String(GameData.FORCES.get(String(t.get("force", "")), {}).get("motif_layer", ""))
	if motif != "" and music_layers.has(motif):
		catalog_track = transmission_id
		var mix: Dictionary = {"menu": 0.35}
		mix[motif] = 1.0
		set_mix(mix)
		return "motif"
	return ""

func stop_catalog() -> void:
	if catalog_player and catalog_player.playing:
		catalog_player.stop()
	catalog_track = ""
	_set_music_paused(false)

func _set_music_paused(paused: bool) -> void:
	for p: AudioStreamPlayer in music_layers.values():
		p.stream_paused = paused
