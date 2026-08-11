class_name GameRun
extends Node2D

signal finished(result: Dictionary)

var player: ForcePlayer
var weapons: WeaponSystem
var audio: AudioDirector
var elapsed: float=0.0
var kills: int=0
var level: int=1
var xp: int=0
var xp_need: int=12
var spawn_clock: float=0.0
var encounter_clock: float=28.0
var boss_spawned: bool=false
var paused_for_choice: bool=false
var ended: bool=false
var quick_test_mode: bool=false
var hud_layer: CanvasLayer
var hp_label: Label
var time_label: Label
var level_label: Label
var state_label: Label
var force_label: Label
var objective_label: Label
var resonance_bar: ProgressBar
var xp_bar: ProgressBar
var choice_panel: PanelContainer
var joystick_center: Vector2=Vector2.ZERO
var joystick_vector: Vector2=Vector2.ZERO
var touch_id: int=-1
var mines: Array=[]
var character_id: String="ilyra_venn"
var active_force: String="pulse_width_codex"
var rng: RandomNumberGenerator=RandomNumberGenerator.new()
var run_length: float=1200.0
var resonance: float=50.0
var force_state: String="DRIFT"
var last_state: String="DRIFT"
var debug_invulnerable: bool=false
var flash_message: String=""
var flash_clock: float=0.0
var discoveries: Array=[]
var discovery_nodes: Array=[]
var expedition_goal: int=2
var extraction_ready: bool=false

const DISCOVERIES: Array=[
	{"id":"rc_echo_01","title":"GREEN ECHO","project":"Resonant Currents","track":"Resonant Currents — Field Transmission I","force":"resonant_currents","description":"A delayed signal repeating through empty space."},
	{"id":"rex_beacon_01","title":"THUNDERBREAK BEACON","project":"Star Splitter Rex","track":"Star Splitter Rex — Kinetic Transmission","force":"star_splitter_rex","description":"A propulsion signature buried in the wreck field."},
	{"id":"gdu_trace_01","title":"NIGHT TRACE","project":"Ghost Driver Unit","track":"Ghost Driver Unit — Night Trace","force":"ghost_driver_unit","description":"A moving transmission that seems to stay just ahead."}
]

func setup(id:String,quick_test:bool=false)->void:
	character_id=id;quick_test_mode=quick_test;active_force=String(GameData.CHARACTERS[id].starting_force)
	if quick_test_mode:run_length=90.0;encounter_clock=10.0

func _ready()->void:
	process_mode=Node.PROCESS_MODE_PAUSABLE;rng.randomize();build_world();build_player();build_hud();audio=AudioDirector.new();add_child(audio);audio.set_force(active_force);set_force_state("DRIFT");seed_discoveries()

func build_world()->void:queue_redraw()

func build_player()->void:
	player=ForcePlayer.new();add_child(player);player.configure(character_id);player.died.connect(on_player_died)
	var camera:Camera2D=Camera2D.new();camera.enabled=true;camera.position_smoothing_enabled=true;camera.position_smoothing_speed=6.0;player.add_child(camera)
	weapons=WeaponSystem.new();add_child(weapons);weapons.setup(player,self,String(GameData.CHARACTERS[character_id].starting_weapon));xp_need=GameData.xp_required(level)

func build_hud()->void:
	hud_layer=CanvasLayer.new();hud_layer.process_mode=Node.PROCESS_MODE_ALWAYS;add_child(hud_layer);var root:Control=Control.new();root.process_mode=Node.PROCESS_MODE_ALWAYS;root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT);hud_layer.add_child(root)
	var top:HBoxContainer=HBoxContainer.new();top.position=Vector2(24,18);top.size=Vector2(1232,38);top.add_theme_constant_override("separation",22);root.add_child(top)
	hp_label=Label.new();hp_label.custom_minimum_size=Vector2(310,30);top.add_child(hp_label);time_label=Label.new();time_label.custom_minimum_size=Vector2(180,30);time_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER;top.add_child(time_label);level_label=Label.new();level_label.custom_minimum_size=Vector2(250,30);level_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT;top.add_child(level_label)
	xp_bar=ProgressBar.new();xp_bar.position=Vector2(24,58);xp_bar.size=Vector2(1232,10);xp_bar.show_percentage=false;root.add_child(xp_bar)
	state_label=Label.new();state_label.position=Vector2(24,78);state_label.size=Vector2(330,28);state_label.add_theme_font_size_override("font_size",18);root.add_child(state_label);force_label=Label.new();force_label.position=Vector2(900,78);force_label.size=Vector2(356,28);force_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT;force_label.modulate=Color(1,1,1,0.65);root.add_child(force_label)
	resonance_bar=ProgressBar.new();resonance_bar.position=Vector2(365,83);resonance_bar.size=Vector2(520,12);resonance_bar.min_value=0;resonance_bar.max_value=100;resonance_bar.show_percentage=false;root.add_child(resonance_bar)
	objective_label=Label.new();objective_label.position=Vector2(24,112);objective_label.size=Vector2(900,52);objective_label.add_theme_font_size_override("font_size",17);objective_label.modulate=Color("a8f7ff");root.add_child(objective_label)
	var hint:Label=Label.new();hint.text="EXPLORE distant rings • DEBUG: 1 level  2 encounter  3 state  4 signal  5 climax  6 invuln  7 purge";hint.position=Vector2(24,680);hint.modulate=Color(1,1,1,0.42);root.add_child(hint)
	choice_panel=PanelContainer.new();choice_panel.process_mode=Node.PROCESS_MODE_ALWAYS;choice_panel.visible=false;choice_panel.position=Vector2(290,175);choice_panel.size=Vector2(700,370);choice_panel.mouse_filter=Control.MOUSE_FILTER_STOP;root.add_child(choice_panel)

func seed_discoveries()->void:
	var positions:Array=[Vector2(850,-420),Vector2(-1120,-760),Vector2(1450,820)]
	for i in range(DISCOVERIES.size()):spawn_discovery(DISCOVERIES[i],positions[i])

func spawn_discovery(data:Dictionary,pos:Vector2)->void:
	var node:DiscoveryNode=DiscoveryNode.new();node.configure(data);node.position=pos;node.discovered.connect(on_discovery_claimed);add_child(node);discovery_nodes.append(node)

func _process(delta:float)->void:
	if ended or paused_for_choice:return
	elapsed+=delta;flash_clock=maxf(0.0,flash_clock-delta);update_performance_state(delta)
	var keyboard:Vector2=Vector2.ZERO;keyboard.x=float(Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT))-float(Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT));keyboard.y=float(Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN))-float(Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP));keyboard=keyboard.limit_length(1.0);player.move_input=joystick_vector if joystick_vector.length()>0.05 else keyboard
	spawn_clock-=delta;encounter_clock-=delta
	if spawn_clock<=0.0:
		var pressure:float=0.72 if force_state=="RESONANCE" else (1.12 if force_state=="FRACTURE" else 0.88);spawn_clock=(0.42 if quick_test_mode else 1.35)/pressure
		if live_enemies().size()<desired_population():spawn_enemy(pick_enemy_kind())
	if encounter_clock<=0.0:encounter_clock=18.0 if quick_test_mode else rng.randf_range(38.0,58.0);spawn_patrol_encounter()
	check_discoveries()
	if quick_test_mode and elapsed>=72.0 and not boss_spawned:spawn_boss()
	if quick_test_mode and elapsed>=run_length and not has_boss():end_run(discoveries.size()>=expedition_goal)
	audio.set_intensity(clampf(0.28+float(live_enemies().size())/90.0+resonance/300.0,0.0,0.82));update_collisions(delta);update_mines(delta);update_hud();queue_redraw()

func desired_population()->int:
	var base:int=14 if quick_test_mode else 10;var growth:int=int(elapsed/20.0)*3 if quick_test_mode else int(elapsed/150.0);return mini(52,base+growth)

func spawn_patrol_encounter()->void:
	var center:Vector2=player.position+Vector2.from_angle(rng.randf_range(0.0,TAU))*rng.randf_range(420.0,620.0);var amount:int=4 if force_state=="RESONANCE" else (7 if force_state=="FRACTURE" else 5)
	for i in amount:spawn_enemy_at("static_wisp" if i%3==0 else "scrap_hound",center+Vector2.from_angle(float(i)/float(amount)*TAU)*70.0)
	flash_message="PATROL DETECTED";flash_clock=1.2

func update_performance_state(delta:float)->void:
	resonance=move_toward(resonance,52.0,delta*0.22);var next_state:String="DRIFT";next_state="RESONANCE" if resonance>=70.0 else ("FRACTURE" if resonance<=30.0 else "DRIFT")
	if next_state!=force_state:set_force_state(next_state)

func set_force_state(state:String)->void:
	last_state=force_state;force_state=state
	if player:player.set_force_state(state)
	if audio:audio.set_state(state)
	if last_state!=force_state:flash_message=force_state;flash_clock=1.0

func add_resonance(amount:float)->void:resonance=clampf(resonance+amount,0.0,100.0)
func pick_enemy_kind()->String:
	var r:float=rng.randf();return "scrap_hound" if r<(0.32 if force_state=="FRACTURE" else 0.42) else ("carrier" if elapsed>180.0 and r<0.54 else "static_wisp")
func spawn_enemy(kind:String)->void:spawn_enemy_at(kind,player.position+Vector2.from_angle(rng.randf_range(0.0,TAU))*rng.randf_range(520.0,700.0))
func spawn_enemy_at(kind:String,pos:Vector2)->void:
	if live_enemies().size()>70 and kind not in ["elite_null","the_silence"]:return
	var enemy:ForceEnemy=ForceEnemy.new();add_child(enemy);enemy.position=pos;enemy.configure(kind,player,1.0+minf(0.8,elapsed/1200.0));enemy.died.connect(on_enemy_died)
func spawn_boss()->void:
	if has_boss():return
	boss_spawned=true;spawn_enemy("the_silence")
	if audio:audio.set_boss(true)
	flash_message="THE SILENCE — EXTRACTION BLOCKED";flash_clock=1.8
func live_enemies()->Array:
	var out:Array=[]
	for child in get_children():
		if child is ForceEnemy:out.append(child)
	return out
func nearest_enemy(pos:Vector2):
	var best=null;var best_d:float=INF
	for enemy in live_enemies():
		var d:float=pos.distance_squared_to(enemy.position)
		if d<best_d:best_d=d;best=enemy
	return best
func spawn_projectile(pos:Vector2,vel:Vector2,damage:float,life:float,radius:float,color:Color,pierce:int=0)->void:
	var p:ForceProjectile=ForceProjectile.new();add_child(p);p.setup(pos,vel,damage,life,radius,color,pierce)
func spawn_mine(pos:Vector2,damage:float,radius:float)->void:mines.append({"pos":pos,"timer":1.15,"damage":damage,"radius":radius})
func update_mines(delta:float)->void:
	for i in range(mines.size()-1,-1,-1):
		mines[i].timer=float(mines[i].timer)-delta
		if float(mines[i].timer)<=0.0:
			for enemy in live_enemies():
				if Vector2(mines[i].pos).distance_to(enemy.position)<float(mines[i].radius)+enemy.radius:enemy.take_damage(float(mines[i].damage))
			mines.remove_at(i)

func check_discoveries()->void:
	for node in discovery_nodes.duplicate():
		if not is_instance_valid(node):discovery_nodes.erase(node);continue
		var distance:float=player.position.distance_to(node.position)
		if distance<240.0 and distance>58.0:flash_message="SIGNAL NEARBY — %dm" % int(distance);flash_clock=0.15
		if distance<=58.0:node.claim()

func on_discovery_claimed(node:DiscoveryNode)->void:
	var data:Dictionary={"id":node.discovery_id,"title":node.title,"project":node.project,"track":node.track,"force":node.force_id,"description":node.description};discoveries.append(data);discovery_nodes.erase(node)
	if node.force_id!="":active_force=node.force_id
	if audio:audio.set_force(active_force)
	flash_message="DISCOVERED: %s\n%s" % [node.project,node.track];flash_clock=3.0;add_resonance(8.0);extraction_ready=discoveries.size()>=expedition_goal

func update_collisions(_delta:float)->void:
	var enemies:Array=live_enemies()
	for enemy in enemies:
		if enemy.position.distance_to(player.position)<enemy.radius+18.0 and enemy.contact_clock<=0.0:
			if not debug_invulnerable and player.hurt(enemy.contact_damage):enemy.contact_clock=0.9;add_resonance(-10.0)
	for child in get_children():
		if child is ForceProjectile:
			var p:ForceProjectile=child
			for enemy in enemies:
				if not is_instance_valid(enemy) or p.hit_ids.has(enemy.get_instance_id()):continue
				if p.position.distance_to(enemy.position)<p.radius+enemy.radius:
					p.hit_ids[enemy.get_instance_id()]=true;enemy.take_damage(p.damage)
					if p.pierce<=0:p.queue_free();break
					p.pierce-=1
	for child in get_children():
		if child is ForcePickup:
			var gem:ForcePickup=child;var d:float=gem.position.distance_to(player.position)
			if d<player.pickup_range*2.2:gem.velocity=gem.position.direction_to(player.position)*minf(500.0,160.0+(player.pickup_range*2.2-d)*3.0)
			if d<24.0:gain_xp(gem.xp_value);add_resonance(0.2);gem.queue_free()

func on_enemy_died(enemy:ForceEnemy,xp_value:int)->void:
	kills+=1;add_resonance(0.55 if not enemy.elite else 3.0);var gem:ForcePickup=ForcePickup.new();gem.position=enemy.position;gem.xp_value=xp_value;add_child(gem)
	if enemy.boss:end_run(discoveries.size()>=expedition_goal)
func gain_xp(value:int)->void:
	var awarded_xp:int=value*4 if quick_test_mode else value;xp+=awarded_xp
	while xp>=xp_need:xp-=xp_need;level+=1;xp_need=GameData.xp_required(level);show_level_choices();break
func debug_level_up()->void:xp=xp_need;gain_xp(0)
func show_level_choices()->void:
	var options:Array=weapons.choices();if options.is_empty():return
	paused_for_choice=true;player.move_input=Vector2.ZERO;choice_panel.visible=true
	for child in choice_panel.get_children():child.queue_free()
	var box:VBoxContainer=VBoxContainer.new();box.process_mode=Node.PROCESS_MODE_ALWAYS;box.add_theme_constant_override("separation",12);choice_panel.add_child(box)
	var title:Label=Label.new();title.process_mode=Node.PROCESS_MODE_ALWAYS;title.text="CHOOSE WHAT TO CARRY FORWARD";title.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER;title.add_theme_font_size_override("font_size",22);box.add_child(title)
	for option in options:
		var button:Button=Button.new();button.process_mode=Node.PROCESS_MODE_ALWAYS;button.mouse_filter=Control.MOUSE_FILTER_STOP
		var data:Dictionary=GameData.PASSIVES[option.id] if option.passive else GameData.WEAPONS[option.id];var origin:String="SYSTEM" if option.passive else String(GameData.FORCES.get(data.get("force",""),{}).get("name","UNKNOWN FORCE"));button.text="%s  •  %s\n%s" % [data.name,origin,data.desc];button.custom_minimum_size=Vector2(660,78);button.pressed.connect(choose_upgrade.bind(option));box.add_child(button)
	get_tree().paused=true
func choose_upgrade(option:Dictionary)->void:
	weapons.add_upgrade(String(option.id),bool(option.passive));choice_panel.visible=false;paused_for_choice=false;get_tree().paused=false;flash_message="INTEGRATED";flash_clock=0.8
func has_boss()->bool:
	for enemy in live_enemies():
		if enemy.boss:return true
	return false
func end_run(victory:bool)->void:
	if ended:return
	ended=true;get_tree().paused=false;finished.emit({"victory":victory,"time":elapsed,"kills":kills,"level":level,"character":character_id,"state":force_state,"resonance":resonance,"discoveries":discoveries})
func on_player_died()->void:end_run(false)
func update_hud()->void:
	hp_label.text="ILYRA  %d / %d" % [int(player.hp),int(player.max_hp)];time_label.text="EXPEDITION  %s" % GameData.format_time(elapsed);level_label.text="LV %d   •   %d CLEARED" % [level,kills];xp_bar.max_value=xp_need;xp_bar.value=xp;state_label.text="%s  %d%%" % [force_state,int(resonance)];force_label.text="FORCE: %s" % String(GameData.FORCES.get(active_force,{}).get("name",active_force));resonance_bar.value=resonance;objective_label.text="DISCOVERIES %d/%d%s" % [discoveries.size(),expedition_goal,"  •  CLIMAX AVAILABLE" if extraction_ready else "  •  Follow distant signal rings"]

func _unhandled_input(event:InputEvent)->void:
	if event is InputEventScreenTouch:
		if event.pressed and event.position.x<520.0 and touch_id==-1:touch_id=event.index;joystick_center=event.position;joystick_vector=Vector2.ZERO
		elif not event.pressed and event.index==touch_id:touch_id=-1;joystick_vector=Vector2.ZERO
	elif event is InputEventScreenDrag and event.index==touch_id:joystick_vector=(event.position-joystick_center).limit_length(90.0)/90.0
	elif event is InputEventKey and event.pressed and not event.echo:
		if event.keycode==KEY_1:debug_level_up()
		elif event.keycode==KEY_2:spawn_patrol_encounter()
		elif event.keycode==KEY_3:set_force_state("FRACTURE" if force_state=="DRIFT" else ("RESONANCE" if force_state=="FRACTURE" else "DRIFT"));resonance=15.0 if force_state=="FRACTURE" else (85.0 if force_state=="RESONANCE" else 50.0)
		elif event.keycode==KEY_4:
			for node in discovery_nodes:
				if is_instance_valid(node):node.position=player.position+Vector2(110,0);break
		elif event.keycode==KEY_5:spawn_boss()
		elif event.keycode==KEY_6:debug_invulnerable=not debug_invulnerable;flash_message="INVULNERABLE" if debug_invulnerable else "VULNERABLE";flash_clock=1.0
		elif event.keycode==KEY_7:
			for enemy in live_enemies():enemy.take_damage(99999.0)

func _draw()->void:
	var center:Vector2=player.position if player else Vector2.ZERO;var grid_color:Color=Color(0.08,0.16,0.21,0.30)
	for x in range(int(center.x)-900,int(center.x)+901,120):draw_line(Vector2(x,center.y-620),Vector2(x,center.y+620),grid_color,1.0)
	for y in range(int(center.y)-620,int(center.y)+621,120):draw_line(Vector2(center.x-900,y),Vector2(center.x+900,y),grid_color,1.0)
	for mine in mines:draw_circle(Vector2(mine.pos),10.0,Color("ff4ed6"));draw_arc(Vector2(mine.pos),float(mine.radius),0,TAU,32,Color(1,0.3,0.8,0.22),2.0)
	if player and flash_clock>0.0:draw_string(ThemeDB.fallback_font,player.position+Vector2(-190,-150),flash_message,HORIZONTAL_ALIGNMENT_CENTER,380,22,Color(0.86,0.98,1,clampf(flash_clock,0.0,1.0)))
