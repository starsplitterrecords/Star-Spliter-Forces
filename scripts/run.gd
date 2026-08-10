class_name GameRun
extends Node2D

signal finished(result: Dictionary)

var player: ForcePlayer
var weapons: WeaponSystem
var audio: AudioDirector
var elapsed := 0.0
var kills := 0
var level := 1
var xp := 0
var xp_need := 12
var spawn_clock := 0.0
var elite_clock := 45.0
var boss_spawned := false
var paused_for_choice := false
var ended := false
var quick_test_mode := false
var hud_layer: CanvasLayer
var hp_label: Label
var time_label: Label
var level_label: Label
var xp_bar: ProgressBar
var choice_panel: PanelContainer
var joystick_center := Vector2.ZERO
var joystick_vector := Vector2.ZERO
var touch_id := -1
var mines: Array = []
var character_id := "pulse_width_codex"
var rng := RandomNumberGenerator.new()
var run_length := GameData.RUN_LENGTH

func setup(id: String, quick_test: bool=false) -> void:
	character_id = id
	quick_test_mode = quick_test
	if quick_test_mode:
		run_length = 90.0
		elite_clock = 12.0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_PAUSABLE
	rng.randomize()
	build_world()
	build_player()
	build_hud()
	audio = AudioDirector.new(); add_child(audio)

func build_world() -> void:
	queue_redraw()

func build_player() -> void:
	player = ForcePlayer.new()
	add_child(player)
	player.configure(character_id)
	player.died.connect(on_player_died)
	var camera := Camera2D.new()
	camera.enabled = true
	camera.position = Vector2.ZERO
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 8.0
	player.add_child(camera)
	weapons = WeaponSystem.new()
	add_child(weapons)
	weapons.setup(player,self,String(GameData.CHARACTERS[character_id].starting_weapon))
	xp_need = GameData.xp_required(level)

func build_hud() -> void:
	hud_layer = CanvasLayer.new(); add_child(hud_layer)
	var root := Control.new(); root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); hud_layer.add_child(root)
	var top := HBoxContainer.new(); top.position=Vector2(24,18); top.size=Vector2(1232,38); top.add_theme_constant_override("separation",22); root.add_child(top)
	hp_label=Label.new(); hp_label.custom_minimum_size=Vector2(310,30); top.add_child(hp_label)
	time_label=Label.new(); time_label.custom_minimum_size=Vector2(180,30); time_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; top.add_child(time_label)
	level_label=Label.new(); level_label.custom_minimum_size=Vector2(250,30); level_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT; top.add_child(level_label)
	xp_bar=ProgressBar.new(); xp_bar.position=Vector2(24,58); xp_bar.size=Vector2(1232,12); xp_bar.show_percentage=false; root.add_child(xp_bar)
	var hint:=Label.new(); hint.text="WASD / arrows to move • P to pause • touch left side to steer"; hint.position=Vector2(24,680); hint.modulate=Color(1,1,1,0.5); root.add_child(hint)
	if quick_test_mode:
		var debug_label:=Label.new(); debug_label.text="QUICK TEST MODE — accelerated progression"; debug_label.position=Vector2(24,90); debug_label.modulate=Color("ffd75e"); root.add_child(debug_label)
	choice_panel=PanelContainer.new()
	choice_panel.process_mode = Node.PROCESS_MODE_ALWAYS
	choice_panel.visible=false
	choice_panel.position=Vector2(290,175)
	choice_panel.size=Vector2(700,370)
	root.add_child(choice_panel)

func _process(delta: float) -> void:
	if ended or paused_for_choice:
		return
	elapsed += delta
	var keyboard := Vector2.ZERO
	keyboard.x = float(Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT)) - float(Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT))
	keyboard.y = float(Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN)) - float(Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP))
	keyboard = keyboard.limit_length(1.0)
	player.move_input = joystick_vector if joystick_vector.length() > 0.05 else keyboard
	spawn_clock -= delta
	elite_clock -= delta
	if spawn_clock <= 0.0:
		var progress: float = elapsed / run_length
		spawn_clock = maxf(0.08, 0.58 - progress * 0.42) if quick_test_mode else maxf(0.09, 0.72 - elapsed*0.0009)
		var count: int = 1 + int(progress * 3.0) if quick_test_mode else 1 + int(elapsed/150.0)
		for i in count:
			spawn_enemy(pick_enemy_kind())
	var elite_cutoff: float = run_length - (18.0 if quick_test_mode else 55.0)
	if elite_clock<=0.0 and elapsed < elite_cutoff:
		elite_clock = 14.0 if quick_test_mode else maxf(32.0,58.0-elapsed*0.035)
		spawn_enemy("elite_null")
	var boss_lead: float = 18.0 if quick_test_mode else 45.0
	if elapsed >= run_length-boss_lead and not boss_spawned:
		boss_spawned=true; spawn_enemy("the_silence"); audio.set_boss(true)
	if elapsed >= run_length and boss_spawned and not has_boss():
		end_run(true)
	var overtime: float = 25.0 if quick_test_mode else 75.0
	if elapsed >= run_length+overtime:
		end_run(false)
	audio.set_intensity(elapsed/run_length)
	update_collisions(delta)
	update_mines(delta)
	update_hud()
	queue_redraw()

func pick_enemy_kind() -> String:
	var t: float = elapsed/run_length
	var r: float = rng.randf()
	if t > 0.45 and r < 0.16:
		return "carrier"
	if t > 0.16 and r < 0.42:
		return "scrap_hound"
	return "static_wisp"

func spawn_enemy(kind: String) -> void:
	if live_enemies().size() > 450 and kind not in ["elite_null", "the_silence"]:
		return
	var enemy:=ForceEnemy.new(); add_child(enemy)
	var a: float = rng.randf_range(0,TAU); var dist: float = rng.randf_range(520,700)
	enemy.position=player.position+Vector2.from_angle(a)*dist
	enemy.configure(kind,player,1.0+elapsed/run_length*1.15)
	enemy.died.connect(on_enemy_died)

func live_enemies() -> Array:
	var out:Array=[]
	for child in get_children():
		if child is ForceEnemy:
			out.append(child)
	return out

func nearest_enemy(pos: Vector2):
	var best=null; var best_d: float = INF
	for enemy in live_enemies():
		var d: float = pos.distance_squared_to(enemy.position)
		if d<best_d: best_d=d; best=enemy
	return best

func spawn_projectile(pos:Vector2,vel:Vector2,damage:float,life:float,radius:float,color:Color,pierce:int=0)->void:
	var p:=ForceProjectile.new(); add_child(p); p.setup(pos,vel,damage,life,radius,color,pierce)

func spawn_mine(pos:Vector2, damage:float, radius:float)->void:
	mines.append({"pos":pos,"timer":1.15,"damage":damage,"radius":radius,"flash":0.0})

func update_mines(delta:float)->void:
	for i in range(mines.size()-1,-1,-1):
		mines[i].timer=float(mines[i].timer)-delta
		if float(mines[i].timer)<=0.0:
			for enemy in live_enemies():
				if Vector2(mines[i].pos).distance_to(enemy.position) < float(mines[i].radius) + enemy.radius:
					enemy.take_damage(float(mines[i].damage))
			mines.remove_at(i)

func update_collisions(_delta:float)->void:
	var enemies:=live_enemies()
	for enemy in enemies:
		if enemy.position.distance_to(player.position) < enemy.radius + 18.0 and enemy.contact_clock <= 0.0:
			if player.hurt(enemy.contact_damage):
				enemy.contact_clock = 0.7
	for child in get_children():
		if child is ForceProjectile:
			var p:ForceProjectile=child
			for enemy in enemies:
				if not is_instance_valid(enemy) or p.hit_ids.has(enemy.get_instance_id()): continue
				if p.position.distance_to(enemy.position)<p.radius+enemy.radius:
					p.hit_ids[enemy.get_instance_id()]=true; enemy.take_damage(p.damage)
					if p.pierce <= 0:
						p.queue_free()
						break
					p.pierce -= 1
	for child in get_children():
		if child is ForcePickup:
			var gem:ForcePickup=child
			var d: float = gem.position.distance_to(player.position)
			if d<player.pickup_range*2.2:
				gem.velocity=gem.position.direction_to(player.position)*minf(560.0,180.0+(player.pickup_range*2.2-d)*4.0)
			if d<24.0:
				gain_xp(gem.xp_value); gem.queue_free()

func on_enemy_died(enemy:ForceEnemy,xp_value:int)->void:
	kills+=1
	var gem:=ForcePickup.new(); gem.position=enemy.position; gem.xp_value=xp_value; add_child(gem)
	if enemy.boss and elapsed>=run_length-2.0: end_run(true)

func gain_xp(value:int)->void:
	var awarded_xp: int = value * 4 if quick_test_mode else value
	xp += awarded_xp
	if xp>=xp_need:
		xp-=xp_need; level+=1; xp_need=GameData.xp_required(level); show_level_choices()

func show_level_choices()->void:
	var options:=weapons.choices()
	if options.is_empty():
		return
	paused_for_choice=true
	player.move_input = Vector2.ZERO
	choice_panel.visible=true
	get_tree().paused = true
	for child in choice_panel.get_children():
		child.queue_free()
	var box:=VBoxContainer.new(); box.add_theme_constant_override("separation",12); choice_panel.add_child(box)
	var title:=Label.new(); title.text="SIGNAL ACQUIRED — CHOOSE AN UPGRADE"; title.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; title.add_theme_font_size_override("font_size",22); box.add_child(title)
	for option in options:
		var button:=Button.new(); var data:Dictionary=GameData.PASSIVES[option.id] if option.passive else GameData.WEAPONS[option.id]
		button.text="%s  •  Rank %d\n%s" % [data.name,option.level,data.desc]; button.custom_minimum_size=Vector2(640,82)
		button.pressed.connect(choose_upgrade.bind(option.id,option.passive)); box.add_child(button)

func choose_upgrade(id:String,passive:bool)->void:
	weapons.add_upgrade(id,passive)
	choice_panel.visible=false
	paused_for_choice=false
	get_tree().paused = false

func update_hud()->void:
	hp_label.text="HULL  %d / %d" % [ceil(player.hp),ceil(player.max_hp)]
	time_label.text=GameData.format_time(elapsed)+"  /  "+GameData.format_time(run_length)
	level_label.text="LV %d   •   %d PURGED" % [level,kills]
	xp_bar.max_value=xp_need; xp_bar.value=xp

func has_boss() -> bool:
	for enemy in live_enemies():
		if enemy.boss:
			return true
	return false

func on_player_died() -> void:
	end_run(false)

func end_run(victory:bool)->void:
	if ended:
		return
	ended=true
	paused_for_choice=false
	get_tree().paused = false
	finished.emit({"victory":victory,"time":elapsed,"kills":kills,"level":level,"character":character_id})

func _unhandled_input(event:InputEvent)->void:
	if event is InputEventScreenTouch:
		if event.pressed and event.position.x<get_viewport_rect().size.x*0.55 and touch_id==-1:
			touch_id=event.index; joystick_center=event.position; joystick_vector=Vector2.ZERO
		elif not event.pressed and event.index==touch_id:
			touch_id=-1; joystick_vector=Vector2.ZERO; queue_redraw()
	elif event is InputEventScreenDrag and event.index==touch_id:
		joystick_vector=(event.position-joystick_center).limit_length(78.0)/78.0; queue_redraw()

func _draw()->void:
	var bg:=Color("090a16"); draw_rect(Rect2(-GameData.WORLD_HALF,GameData.WORLD_HALF*2.0),bg)
	for x in range(-1500,1501,100): draw_line(Vector2(x,-1000),Vector2(x,1000),Color(0.15,0.32,0.48,0.14),1.0)
	for y in range(-1000,1001,100): draw_line(Vector2(-1500,y),Vector2(1500,y),Color(0.15,0.32,0.48,0.14),1.0)
	for m in mines:
		draw_circle(to_local(Vector2(m.pos)),float(m.radius)*0.25,Color("ff5bd8")); draw_arc(to_local(Vector2(m.pos)),float(m.radius),0,TAU,28,Color(1,0.35,0.8,0.28),3.0)
