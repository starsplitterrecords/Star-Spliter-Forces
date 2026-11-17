class_name InputSetup
extends RefCounted
## Registers every gameplay/menu action at runtime so keyboard, gamepad and
## touch share one vocabulary. Called once by the Profile autoload.

const ACTIONS: Dictionary = {
	"move_left": [KEY_A, KEY_LEFT],
	"move_right": [KEY_D, KEY_RIGHT],
	"move_up": [KEY_W, KEY_UP],
	"move_down": [KEY_S, KEY_DOWN],
	"ability": [KEY_SPACE, KEY_SHIFT],
	"pause": [KEY_ESCAPE, KEY_P],
	"map": [KEY_M, KEY_TAB],
	"choose_1": [KEY_1],
	"choose_2": [KEY_2],
	"choose_3": [KEY_3],
	"choose_4": [KEY_4],
	"reroll": [KEY_R],
	"interact": [KEY_E, KEY_ENTER],
}

const PAD_BUTTONS: Dictionary = {
	"ability": [JOY_BUTTON_A, JOY_BUTTON_RIGHT_SHOULDER],
	"pause": [JOY_BUTTON_START],
	"map": [JOY_BUTTON_BACK],
	"reroll": [JOY_BUTTON_X],
	"interact": [JOY_BUTTON_B, JOY_BUTTON_Y],
}

const PAD_AXES: Dictionary = {
	"move_left": [JOY_AXIS_LEFT_X, -1.0],
	"move_right": [JOY_AXIS_LEFT_X, 1.0],
	"move_up": [JOY_AXIS_LEFT_Y, -1.0],
	"move_down": [JOY_AXIS_LEFT_Y, 1.0],
}

static func ensure_actions() -> void:
	for action: String in ACTIONS.keys():
		if not InputMap.has_action(action):
			InputMap.add_action(action, 0.2)
		for key: int in ACTIONS[action]:
			var ev: InputEventKey = InputEventKey.new()
			ev.physical_keycode = key as Key
			if not InputMap.action_has_event(action, ev):
				InputMap.action_add_event(action, ev)
	for action: String in PAD_BUTTONS.keys():
		for button: int in PAD_BUTTONS[action]:
			var jb: InputEventJoypadButton = InputEventJoypadButton.new()
			jb.button_index = button as JoyButton
			if not InputMap.action_has_event(action, jb):
				InputMap.action_add_event(action, jb)
	for action: String in PAD_AXES.keys():
		var spec: Array = PAD_AXES[action]
		var jm: InputEventJoypadMotion = InputEventJoypadMotion.new()
		jm.axis = int(spec[0]) as JoyAxis
		jm.axis_value = float(spec[1])
		if not InputMap.action_has_event(action, jm):
			InputMap.action_add_event(action, jm)
	# D-pad doubles as movement for menu-less play.
	var dpad: Dictionary = {"move_left": JOY_BUTTON_DPAD_LEFT, "move_right": JOY_BUTTON_DPAD_RIGHT, "move_up": JOY_BUTTON_DPAD_UP, "move_down": JOY_BUTTON_DPAD_DOWN}
	for action: String in dpad.keys():
		var db: InputEventJoypadButton = InputEventJoypadButton.new()
		db.button_index = int(dpad[action]) as JoyButton
		if not InputMap.action_has_event(action, db):
			InputMap.action_add_event(action, db)

static func move_vector() -> Vector2:
	return Input.get_vector("move_left", "move_right", "move_up", "move_down", 0.18)
