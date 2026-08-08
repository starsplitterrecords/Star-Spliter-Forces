extends Node

var save := SaveManager.load_data()
var ui: Control
var current_run: GameRun
var selected_character := "pulse_width_codex"

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	show_title()

func clear_screen() -> void:
	if current_run and is_instance_valid(current_run):
		current_run.queue_free()
		current_run = null
	if ui and is_instance_valid(ui):
		ui.queue_free()
	ui=Control.new()
	ui.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(ui)
	var bg:=ColorRect.new()
	bg.color=Color("080914")
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui.add_child(bg)
	bg.mouse_filter=Control.MOUSE_FILTER_IGNORE

func add_heading(text:String, y:float, size:int=48)->Label:
	var label:=Label.new()
	label.text=text
	label.position=Vector2(80,y)
	label.size=Vector2(1120,80)
	label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size",size)
	label.modulate=Color("dffcff")
	ui.add_child(label)
	return label

func add_button(text:String,y:float,callback:Callable,width:float=360.0)->Button:
	var b:=Button.new()
	b.text=text
	b.position=Vector2((1280-width)/2.0,y)
	b.size=Vector2(width,58)
	b.add_theme_font_size_override("font_size",20)
	b.pressed.connect(callback)
	ui.add_child(b)
	return b

func show_title()->void:
	clear_screen()
	add_heading("STAR SPLITTER FORCES",105,54)
	var sub:=add_heading("SURVIVE THE SIGNAL",174,18)
	sub.modulate=Color("68ecff")
	add_button("ENTER THE FIELD",285,show_character_select)
	add_button("SETTINGS",356,show_settings)
	var stats:=Label.new()
	stats.text="RUNS %d    •    WINS %d    •    SIGNAL %d" % [int(save.runs),int(save.wins),int(save.currency)]
	stats.position=Vector2(80,450)
	stats.size=Vector2(1120,40)
	stats.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	stats.modulate=Color(1,1,1,0.55)
	ui.add_child(stats)
	var footer:=Label.new()
	footer.text="An original Star Splitter Records game • Development build"
	footer.position=Vector2(80,650)
	footer.size=Vector2(1120,30)
	footer.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	footer.modulate=Color(1,1,1,0.35)
	ui.add_child(footer)

func show_character_select()->void:
	clear_screen()
	add_heading("SELECT A FORCE",70,42)
	var unlocked:Array=save.unlocked_characters
	var ids:=GameData.CHARACTERS.keys()
	var y:=175.0
	for id in ids:
		var d:Dictionary=GameData.CHARACTERS[id]
		var unlocked_now:=id in unlocked
		var b:=Button.new()
		b.position=Vector2(260,y)
		b.size=Vector2(760,115)
		b.disabled=not unlocked_now
		b.text="%s\n%s%s" % [d.name,d.tagline,"" if unlocked_now else "  [WIN ONCE TO UNLOCK]"]
		b.add_theme_font_size_override("font_size",20)
		ui.add_child(b)
		if unlocked_now:
			b.pressed.connect(start_run.bind(id))
		y+=135.0
	add_button("BACK",565,show_title,240)

func start_run(id:String)->void:
	selected_character=id
	if ui:
		ui.queue_free()
		ui = null
	current_run=GameRun.new()
	current_run.setup(id)
	add_child(current_run)
	current_run.finished.connect(on_run_finished)

func on_run_finished(result:Dictionary)->void:
	save.runs=int(save.runs)+1
	save.best_time=maxf(float(save.best_time),float(result.time))
	save.currency=int(save.currency)+int(result.kills/5)+int(result.level)*2
	if result.victory:
		save.wins=int(save.wins)+1
		save.currency=int(save.currency)+100
		if not "ghost_driver_unit" in save.unlocked_characters:
			save.unlocked_characters.append("ghost_driver_unit")
		if not "first_transmission" in save.unlocked_tracks:
			save.unlocked_tracks.append("first_transmission")
	SaveManager.save_data(save)
	if current_run:
		current_run.queue_free()
		current_run = null
	show_results(result)

func show_results(result:Dictionary)->void:
	clear_screen()
	add_heading("SIGNAL STABILIZED" if result.victory else "SIGNAL LOST",105,48)
	var summary:=Label.new()
	summary.text="%s\nTIME  %s\nLEVEL  %d\nPURGED  %d\n\n+%d SIGNAL" % [GameData.CHARACTERS[result.character].name,GameData.format_time(result.time),int(result.level),int(result.kills),int(result.kills/5)+int(result.level)*2+(100 if result.victory else 0)]
	summary.position=Vector2(390,215)
	summary.size=Vector2(500,230)
	summary.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	summary.add_theme_font_size_override("font_size",21)
	ui.add_child(summary)
	add_button("RUN AGAIN",490,start_run.bind(result.character))
	add_button("RETURN TO ARRAY",560,show_title)

func show_settings()->void:
	clear_screen()
	add_heading("SETTINGS",90,42)
	var music:=HSlider.new()
	music.min_value=0
	music.max_value=1
	music.step=0.05
	music.value=float(save.settings.music)
	music.position=Vector2(420,230)
	music.size=Vector2(440,40)
	ui.add_child(music)
	var ml:=Label.new()
	ml.text="MUSIC INTENSITY"
	ml.position=Vector2(420,195)
	ui.add_child(ml)
	var sfx:=HSlider.new()
	sfx.min_value=0
	sfx.max_value=1
	sfx.step=0.05
	sfx.value=float(save.settings.sfx)
	sfx.position=Vector2(420,330)
	sfx.size=Vector2(440,40)
	ui.add_child(sfx)
	var sl:=Label.new()
	sl.text="SFX LEVEL"
	sl.position=Vector2(420,295)
	ui.add_child(sl)
	var shake:=CheckButton.new()
	shake.text="SCREEN SHAKE"
	shake.button_pressed=bool(save.settings.screen_shake)
	shake.position=Vector2(420,395)
	ui.add_child(shake)
	add_button("SAVE & BACK", 520, save_settings.bind(music, sfx, shake))

func save_settings(music: HSlider, sfx: HSlider, shake: CheckButton) -> void:
	save.settings.music = music.value
	save.settings.sfx = sfx.value
	save.settings.screen_shake = shake.button_pressed
	SaveManager.save_data(save)
	show_title()
