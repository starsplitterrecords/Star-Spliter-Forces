class_name AudioDirector
extends Node

var phase: float = 0.0
var intensity: float = 0.0
var boss_mode: bool = false
var enabled: bool = true
var force_id: String = "pulse_width_codex"
var performance_state: String = "DRIFT"
var beat: int = 0
var bar: int = 0
var beat_clock: float = 0.0
var bpm: float = 126.0

func set_force(id: String) -> void:
	force_id = id

func set_state(state: String) -> void:
	performance_state = state

func set_intensity(value: float) -> void:
	intensity = clampf(value, 0.0, 1.0)

func set_boss(active: bool) -> void:
	boss_mode = active

func _process(delta: float) -> void:
	var state_speed: float = 1.0
	if performance_state == "RESONANCE":
		state_speed = 1.025
	elif performance_state == "FRACTURE":
		state_speed = 0.975
	phase = fmod(phase + delta * (1.0 + intensity * 0.12) * state_speed, 4.0)
	beat_clock += delta
	var beat_length: float = 60.0 / bpm
	while beat_clock >= beat_length:
		beat_clock -= beat_length
		beat = (beat + 1) % 4
		if beat == 0:
			bar += 1

func musical_snapshot() -> Dictionary:
	return {
		"force": force_id,
		"state": performance_state,
		"intensity": intensity,
		"boss": boss_mode,
		"beat": beat,
		"bar": bar,
		"bpm": bpm
	}
