extends Node

var save: Dictionary = SaveManager.load_data()
var ui: Control
var current_run: GameRun
var selected_character: String = "ilyra_venn"

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	show_title()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_P and current_run and not current_run.paused_for_choice:
		get_tree().paused = not get_tree().paused

func clear_screen() -> void:
	if current_run and is_instance_valid(current_run):
		current_run.queue_free()
		current_run = null
	if ui and is_instance_valid(ui):
		ui.queue_free()
	ui = Control.new()
	ui.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(ui)
	var bg: ColorRect = ColorRect.new()
	bg.color = Color("080914")
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui.add_child(bg)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE

func add_heading(text:String, y:float, size:int=48)->Label:
	var label: Label = Label.new(); label.text=text; label.position=Vector2(80,y); label.size=Vector2(1120,80); label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; label.add_theme_font_size_override("font_size",size); label.modulate=Color("dffcff"); ui.add_child(label); return label

func add_button(text:String,y:float,callback:Callable,width:float=360.0)->Button:
	var b: Button = Button.new(); b.text=text; b.position=Vector2((1280-width)/2.0,y); b.size=Vector2(width,58); b.add_theme_font_size_override("font_size",20); b.pressed.connect(callback); ui.add_child(b); return b

func show_title()->void:
	clear_screen(); add_heading("STAR SPLITTER FORCES",70,54)
	var sub: Label = add_heading("EXPLORE THE SIGNAL",138,18); sub.modulate=Color("68ecff")
	add_button("BEGIN EXPEDITION",225,show_character_select)
	add_button("QUICK TEST — 90 SEC",295,start_quick_test)
	add_button("STAR SPLITTER ARCHIVE",365,show_archive)
	add_button("SETTINGS",435,show_settings)
	var thesis: Label = Label.new(); thesis.text="Current expedition: Ilyra Venn / Black Drift Reach / discoverable musical Forces"; thesis.position=Vector2(80,510); thesis.size=Vector2(1120,32); thesis.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; thesis.modulate=Color(1,1,1,0.62); ui.add_child(thesis)
	var stats: Label = Label.new(); stats.text="EXPEDITIONS %d    •    WINS %d    •    SIGNAL %d    •    DISCOVERIES %d" % [int(save.runs),int(save.wins),int(save.currency),Array(save.discovered_signals).size()]; stats.position=Vector2(80,550); stats.size=Vector2(1120,40); stats.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; stats.modulate=Color(1,1,1,0.45); ui.add_child(stats)
	var footer: Label = Label.new(); footer.text="Combat creates rhythm. Exploration reveals the catalog."; footer.position=Vector2(80,650); footer.size=Vector2(1120,30); footer.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; footer.modulate=Color(1,1,1,0.35); ui.add_child(footer)

func start_quick_test() -> void:
	start_run("ilyra_venn", true)

func show_character_select()->void:
	clear_screen(); add_heading("SELECT AN EXPLORER",55,42)
	var context: Label = add_heading("Choose a character, then decide how far off the safe route to travel.",112,17); context.modulate=Color(1,1,1,0.55)
	var unlocked: Array = save.unlocked_characters; var ids: Array = GameData.CHARACTERS.keys(); var y: float = 175.0
	for id in ids:
		var d: Dictionary = GameData.CHARACTERS[id]; var unlocked_now: bool = id in unlocked; var b: Button = Button.new(); b.position=Vector2(260,y); b.size=Vector2(760,115); b.disabled=not unlocked_now
		var lock_text: String = "" if unlocked_now else "  [DISCOVER TO UNLOCK]"; b.text="%s — %s\n%s%s" % [d.name,d.origin,d.tagline,lock_text]; b.add_theme_font_size_override("font_size",20); ui.add_child(b)
		if unlocked_now: b.pressed.connect(start_run.bind(String(id), false))
		y += 135.0
	add_button("BACK",590,show_title,240)

func start_run(id:String, quick_test:bool=false)->void:
	selected_character=id
	if ui: ui.queue_free(); ui=null
	current_run=GameRun.new(); current_run.setup(id,quick_test); add_child(current_run); current_run.finished.connect(on_run_finished)

func on_run_finished(result:Dictionary)->void:
	get_tree().paused=false; save.runs=int(save.runs)+1; save.best_time=maxf(float(save.best_time),float(result.time)); save.currency=int(save.currency)+int(result.kills/7)+int(result.level)*2
	var run_discoveries: Array = result.get("discoveries", [])
	for discovery in run_discoveries:
		var data: Dictionary = discovery
		var signal_id: String = String(data.get("id", "")); var project: String = String(data.get("project", "")); var track: String = String(data.get("track", "")); var force_id: String = String(data.get("force", ""))
		if signal_id != "" and not signal_id in save.discovered_signals: save.discovered_signals.append(signal_id)
		if project != "" and not project in save.discovered_projects: save.discovered_projects.append(project)
		if track != "" and not track in save.unlocked_tracks: save.unlocked_tracks.append(track)
		if force_id != "" and not force_id in save.discovered_forces: save.discovered_forces.append(force_id)
	if result.victory:
		save.wins=int(save.wins)+1; save.currency=int(save.currency)+60
	SaveManager.save_data(save)
	if current_run: current_run.queue_free(); current_run=null
	show_results(result)

func show_results(result:Dictionary)->void:
	clear_screen(); add_heading("EXPEDITION COMPLETE" if result.victory else "EXPEDITION ENDED",72,46)
	var discoveries: Array = result.get("discoveries", []); var discovery_text: String = "None — next run, follow the distant signals." if discoveries.is_empty() else "%d signal%s recovered" % [discoveries.size(), "" if discoveries.size()==1 else "s"]
	var summary: Label = Label.new(); summary.text="%s\nTIME  %s\nLEVEL  %d\nHOSTILES CLEARED  %d\nDISCOVERIES  %s\nFINAL STATE  %s\n\nThe Archive remembers what you found." % [GameData.CHARACTERS[result.character].name,GameData.format_time(result.time),int(result.level),int(result.kills),discovery_text,String(result.state)]; summary.position=Vector2(300,170); summary.size=Vector2(680,300); summary.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; summary.add_theme_font_size_override("font_size",20); ui.add_child(summary)
	add_button("VIEW ARCHIVE",490,show_archive); add_button("EXPLORE AGAIN",560,start_run.bind(String(result.character),false)); add_button("RETURN",630,show_title,240)

func show_archive()->void:
	clear_screen(); save.archive_reads=int(save.get("archive_reads",0))+1; SaveManager.save_data(save); add_heading("STAR SPLITTER ARCHIVE",55,42)
	var intro: Label = add_heading("A record collection assembled by exploration.",108,17); intro.modulate=Color(1,1,1,0.55)
	var tracks: Array=save.unlocked_tracks; var projects: Array=save.discovered_projects; var forces: Array=save.discovered_forces
	var left: Label=Label.new(); left.position=Vector2(115,175); left.size=Vector2(330,390); left.add_theme_font_size_override("font_size",18); left.text="PROJECTS\n\n" + ("No projects identified yet." if projects.is_empty() else "\n".join(projects)); ui.add_child(left)
	var middle: Label=Label.new(); middle.position=Vector2(475,175); middle.size=Vector2(330,390); middle.add_theme_font_size_override("font_size",18); middle.text="TRACKS / TRANSMISSIONS\n\n" + ("Follow signals in the field." if tracks.is_empty() else "\n".join(tracks)); ui.add_child(middle)
	var right: Label=Label.new(); right.position=Vector2(835,175); right.size=Vector2(330,390); right.add_theme_font_size_override("font_size",18); right.text="FORCES\n\n" + "\n".join(forces); ui.add_child(right)
	var note: Label=Label.new(); note.text="Future mastered tracks will be playable here. Discovery comes before promotion."; note.position=Vector2(140,565); note.size=Vector2(1000,35); note.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; note.modulate=Color("72f2ff"); ui.add_child(note)
	add_button("BACK",625,show_title,240)

func show_settings()->void:
	clear_screen(); add_heading("SETTINGS",90,42)
	var music:HSlider=HSlider.new(); music.min_value=0;music.max_value=1;music.step=0.05;music.value=float(save.settings.music);music.position=Vector2(420,230);music.size=Vector2(440,40);ui.add_child(music)
	var ml:Label=Label.new();ml.text="MUSIC INTENSITY";ml.position=Vector2(420,195);ui.add_child(ml)
	var sfx:HSlider=HSlider.new();sfx.min_value=0;sfx.max_value=1;sfx.step=0.05;sfx.value=float(save.settings.sfx);sfx.position=Vector2(420,330);sfx.size=Vector2(440,40);ui.add_child(sfx)
	var sl:Label=Label.new();sl.text="SFX LEVEL";sl.position=Vector2(420,295);ui.add_child(sl)
	var shake:CheckButton=CheckButton.new();shake.text="SCREEN SHAKE";shake.button_pressed=bool(save.settings.screen_shake);shake.position=Vector2(420,395);ui.add_child(shake)
	add_button("SAVE & BACK",520,save_settings.bind(music,sfx,shake))

func save_settings(music:HSlider,sfx:HSlider,shake:CheckButton)->void:
	save.settings.music=music.value;save.settings.sfx=sfx.value;save.settings.screen_shake=shake.button_pressed;SaveManager.save_data(save);show_title()
