#!/usr/bin/env python3
"""Writes Rex Fleet Chapters IV-IX (data/realms/rf_ch*.json) from a short
curated table. Every place first appears in the chapter's issue(s) on the
RexPrompt rex-fleet shelf (data/shelves/rex-fleet.json); no plot is used.
Re-run after editing the table."""
import json, os
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
def V(x, y): return "@v2:%s,%s" % (float(x), float(y))
def C(h): h = h.lstrip('#'); return "@c:" + (h + "ff" if len(h) == 6 else h)
SLOTS = [(-3000, -1600), (-2600, 1800), (-300, -2500), (300, 1500), (2700, -1300), (3300, 2200), (4700, -2900)]
SRC = "Rex Fleet (RexPrompt shelf, first appears in Issue %s; approved draft)"
CAST_SRC = "Rex Fleet Issue 01 cast (portrait: Issue 03 approved draft cast page)"

CHAPTERS = [
 {"id": 4, "numeral": "IV", "name": "The Crown Ring", "dest": "rf_crown_ring", "issue": 3, "after": "r3_silence", "bg": "080a14", "seed": 4404,
  "sub": "Rex Fleet, Issue 03 territory: Auric from the inside.",
  "regions": [
   ("luxury_ring", "AURIC LUXURY RING", "pools", "e8c97a", "A once-expensive concourse, now a shelter."),
   ("veil_market", "VEIL MARKET", "belt", "d0a060", "Stalls, broker rooms, route boards."),
   ("auric_dock", "AURIC DOCK", "corridor", "c8a46a", "Berths stacked three deep."),
   ("admiralty_tribunal", "ADMIRALTY TRIBUNAL", "gate", "8fb8ff", "A hearing space built to make hierarchy legible."),
   ("broken_oath", "BROKEN OATH", "wreck", "e0402a", "A Shard captain's ship."),
   ("auric_archive", "AURIC ARCHIVE", "pools", "b8d0ff", "Records booths, dim and busy.")],
  "contacts": {"sera_dain": ("Councilor Sera Dain", "The Verge", "Elected for Auric's overcrowded working districts.", "naomi_sol", "reroll", 1),
               "janet_keating": ("Admiral Janet Keating", "The Fleet", "Fleet Admiralty: the hard-line voice.", "ella_venn", "armor", 0.5),
               "oren_pike": ("Oren Pike", "The Shards", "Captain of the Broken Oath.", "tessa_banks", "armor", 0.5)},
  "stages": [
   ("iv_ring", "Crown Ring", "luxury_ring", "discover", "The ring is full of people who used to live elsewhere.", ["sera_dain"], "bazaar"),
   ("iv_market", "Veil Market", "veil_market", "discover", "Every route has a price here.", [], "bazaar"),
   ("iv_dock", "Dock Watch", "auric_dock", "survive", "Hold the dock for three minutes.", [], None),
   ("iv_tribunal", "The Tribunal", "admiralty_tribunal", "discover", "The Admiralty sits in judgement.", ["janet_keating"], "station"),
   ("iv_oath", "Broken Oath", "broken_oath", "discover", "A Shard captain keeps his own counsel.", ["oren_pike"], "freighter"),
   ("iv_archive", "The Archive", "auric_archive", "discover", "Records that do not agree with each other.", [], "station")]},
 {"id": 5, "numeral": "V", "name": "Tal Corvus", "dest": "rf_tal_corvus", "issue": 4, "after": "iv_silence", "bg": "0a0a10", "seed": 5505,
  "sub": "Rex Fleet, Issue 04 territory: the warrens and the spire.",
  "regions": [
   ("tal_warrens", "TAL CORVUS WARRENS", "wreck", "c87a5a", "Damp industrial passages, lived in."),
   ("evac_queue", "EVACUATION QUEUE", "corridor", "8fd3ff", "A line of ships that does not move fast enough."),
   ("bastion_spire", "BASTION SPIRE", "gate", "e0e0f0", "A spire above the warrens."),
   ("tal_gantry", "DOCK GANTRY", "belt", "a8a0c0", "Cranes and cradles over Tal Corvus."),
   ("third_window", "THIRD-WINDOW ROUTE", "corridor", "9fffe0", "A route that only opens on the third window."),
   ("relic_court", "RELIC COURT", "pools", "ffd98a", "A monumental Core chamber.")],
  "contacts": {"richard_secundo": ("Dr. Richard Secundo", "The Shards", "Tal Corvus physician.", "tessa_banks", "hp", 10),
               "paul_secundo": ("Paul Secundo", "The Shards", "Engineering apprentice, nineteen.", "tessa_banks", "pickup", 0.08),
               "soren_kerr": ("Admiral Soren Kerr", "The Fleet", "Fleet Admiralty: restraint.", "ella_venn", "speed", 0.03)},
  "stages": [
   ("v_warrens", "The Warrens", "tal_warrens", "discover", "A physician and his son, still working.", ["richard_secundo", "paul_secundo"], "freighter"),
   ("v_queue", "The Queue", "evac_queue", "survive", "Keep the evacuation queue moving for three minutes.", [], None),
   ("v_spire", "Bastion Spire", "bastion_spire", "discover", "A spire that sees the whole system.", [], "station"),
   ("v_window", "Third Window", "third_window", "discover", "Wait for the third window.", [], "rocket"),
   ("v_court", "Relic Court", "relic_court", "discover", "The Core, deliberating.", ["soren_kerr"], "station")]},
 {"id": 6, "numeral": "VI", "name": "Shardfall", "dest": "rf_shardfall", "issue": 5, "issue_end": 6, "after": "v_silence", "bg": "100608", "seed": 6606,
  "sub": "Rex Fleet, Issues 05-06 territory: rift space and the Shard citadel.",
  "regions": [
   ("rift_space", "RIFT SPACE", "crystal", "b48cff", "Space with seams in it."),
   ("shardfall_citadel", "SHARDFALL CITADEL", "wreck", "e0402a", "Pale industrial structure, red markings."),
   ("arena_vault", "ARENA VAULT", "gate", "ff6a5a", "A vast circular Shard chamber."),
   ("auric_gate_vi", "AURIC GATE", "gate", "ff9a3a", "Ember-orange pylons and timing boards.")],
  "contacts": {"erin_deka": ("Lieutenant Erin Deka", "The Fleet", "Recurring operational officer.", "ella_venn", "pickup", 0.08)},
  "stages": [
   ("vi_rift", "Rift Space", "rift_space", "discover", "Something in the rift keeps time badly.", [], "sunforge"),
   ("vi_citadel", "The Citadel", "shardfall_citadel", "discover", "The Shards' own stronghold.", ["erin_deka"], "freighter"),
   ("vi_hold", "Rift Watch", "rift_space", "survive", "Hold the rift's edge for three minutes.", [], None),
   ("vi_vault", "Arena Vault", "arena_vault", "discover", "Where Shard politics happen out loud.", [], "station"),
   ("vi_gate", "Auric Gate", "auric_gate_vi", "discover", "The gate's timing boards disagree.", [], "station")]},
 {"id": 7, "numeral": "VII", "name": "The Lattice", "dest": "rf_lattice", "issue": 7, "issue_end": 8, "after": "vi_silence", "bg": "06080e", "seed": 7707,
  "sub": "Rex Fleet, Issues 07-08 territory: the Lattice and the calm corridor.",
  "regions": [
   ("the_lattice", "THE LATTICE", "crystal", "9fe8ff", "Reciprocal-field geometry, luminous nodes."),
   ("survey_ship", "SURVEY SHIP", "pools", "bfe9ff", "A survey crew watching the corridors."),
   ("calm_corridor", "CALM CORRIDOR", "corridor", "7fffd4", "The one corridor that stays still."),
   ("receiving_berth", "RECEIVING BERTH", "belt", "e0c88a", "Where refugees are received."),
   ("vault_ring", "SHARDFALL ARENA VAULT", "gate", "ff6a5a", "The vault, again, from outside.")],
  "contacts": {},
  "stages": [
   ("vii_lattice", "The Lattice", "the_lattice", "discover", "Corridors that bend when you look at them.", [], "sunforge"),
   ("vii_survey", "Survey Ship", "survey_ship", "discover", "Someone is measuring the bends.", [], "station"),
   ("vii_calm", "Calm Corridor", "calm_corridor", "survive", "Hold the calm corridor for three minutes.", [], None),
   ("vii_berth", "Receiving Berth", "receiving_berth", "discover", "Everyone who made it through.", [], "dock"),
   ("vii_vault", "Outside the Vault", "vault_ring", "discover", "The vault's lights, from the corridor.", [], "freighter")]},
 {"id": 8, "numeral": "VIII", "name": "Shatterforge", "dest": "rf_shatterforge", "issue": 9, "issue_end": 10, "after": "vii_silence", "bg": "120806", "seed": 8808,
  "sub": "Rex Fleet, Issues 09-10 territory: the forge and its spires.",
  "regions": [
   ("shatterforge_spire", "SHATTERFORGE SPIRE", "bloom", "ff8a3a", "Ember furnaces and vent trunks."),
   ("dock_spires", "DOCK SPIRES", "belt", "c8a8a0", "Spires bristling with berths."),
   ("evac_bays", "EVAC BAYS", "corridor", "8fd3ff", "Bays built for leaving."),
   ("forge_canyon", "FORGE CANYON", "wreck", "e05a2a", "A canyon of slag and bridges."),
   ("dock_mouth", "DOCK MOUTH", "gate", "ffb07a", "The way in and out of the forge.")],
  "contacts": {},
  "stages": [
   ("viii_spire", "The Forge", "shatterforge_spire", "discover", "The Shards make their blades here.", [], "sunforge"),
   ("viii_docks", "Dock Spires", "dock_spires", "discover", "Every berth is taken.", [], "dock"),
   ("viii_bays", "Evac Bays", "evac_bays", "survive", "Keep the bays open for three minutes.", [], None),
   ("viii_ashfang", "Ashfang Again", "forge_canyon", "elite", "The Ashfang, in the canyon. Arrives at 2:00.", [], None),
   ("viii_mouth", "Dock Mouth", "dock_mouth", "discover", "The forge's front door.", [], "station")]},
 {"id": 9, "numeral": "IX", "name": "The Auric Gate", "dest": "rf_auric_gate", "issue": 11, "issue_end": 12, "after": "viii_silence", "bg": "0e0806", "seed": 9909,
  "sub": "Rex Fleet, Issues 11-12 territory: the gate.",
  "regions": [
   ("gate_approach", "GATE APPROACH", "corridor", "ffb07a", "Every lane leads here."),
   ("gate_midspace", "GATE MIDSPACE", "crystal", "ff9a3a", "Between the pylons."),
   ("assembly_orbit", "SHARD ASSEMBLY ORBIT", "wreck", "e0402a", "Working Shard vessels, many of them."),
   ("gate_lane", "GATE LANE", "corridor", "ffd98a", "The lane through."),
   ("the_auric_gate", "THE AURIC GATE", "gate", "ff7a2a", "Ember-orange pylons, stability rims.")],
  "contacts": {},
  "stages": [
   ("ix_approach", "Gate Approach", "gate_approach", "discover", "Everyone is heading for the gate.", [], "station"),
   ("ix_orbit", "Assembly Orbit", "assembly_orbit", "discover", "The Shards, assembled.", [], "freighter"),
   ("ix_midspace", "Midspace", "gate_midspace", "survive", "Hold midspace for three minutes.", [], None),
   ("ix_lane", "Gate Lane", "gate_lane", "discover", "The lane through.", [], "rocket"),
   ("ix_gate", "The Auric Gate", "the_auric_gate", "discover", "The gate itself.", [], "sunforge")]},
]

for ch in CHAPTERS:
    issues = "%02d" % ch["issue"] + ("-%02d" % ch["issue_end"] if ch.get("issue_end") else "")
    regions, disc, places, stages = {}, {}, {}, []
    for k, (rid, name, props, col, blurb) in enumerate(ch["regions"]):
        x, y = SLOTS[k]
        threat = 1 if k == 0 else (3 if k >= 4 else 2)
        r = {"name": name, "color": C(col), "floor": C("0a0c16"), "props": props, "density": 0.8,
             "music": ["region_basin", "region_corridor", "region_wrecks", "region_gate", "region_bloom", "region_shelf"][k % 6],
             "enemies": {"skiff": 0.9, "ram_cutter": 0.5, "rail_picket": 0.3 + 0.1 * (ch["id"] - 4), "gunship": 0.1 * threat, "echo_mote": 0.3},
             "blurb": blurb, "threat": threat}
        if props == "corridor":
            r.update({"shape": "capsule", "a": V(x - 1300, y), "b": V(x + 1300, y + 400), "radius": 480.0})
        else:
            r.update({"shape": "circle", "center": V(x, y), "radius": 850.0})
        regions[rid] = r
        places[rid] = {"name": name.title().replace("'S", "'s"), "series": "Rex Fleet", "text": blurb, "source": SRC % issues}
    n = 0
    for (sid, name, rid, kind, line, contacts, landmark) in ch["stages"]:
        n += 1
        st = {"id": sid, "chapter": ch["id"], "name": name, "place": places[rid]["name"], "region": rid, "new_title": name.upper(), "new": line, "brief": line, "grants": {}}
        if kind == "discover":
            did = "d_" + sid
            d = {"kind": "character", "region": rid, "offset": V(0, 0), "title": name.upper(), "color": regions[rid]["color"], "place": rid, "text": line}
            if landmark:
                d["landmark"] = landmark
            if contacts:
                d["contacts"] = contacts
            disc[did] = d
            st.update({"power": 70 + 8 * n + 6 * (ch["id"] - 4), "prize": "Crew" if contacts else "Place", "icon": "visions" if contacts else "signal",
                       "objective": {"type": "discover", "id": did}, "discoveries": [did],
                       "reward": (["Crew: " + ", ".join(ch["contacts"][c][0] for c in contacts)] if contacts else []) + ["Place: " + places[rid]["name"]]})
        elif kind == "survive":
            st.update({"prize": "+150 Signal", "icon": "hostile", "objective": {"type": "survive", "seconds": 180.0}, "discoveries": [], "reward": ["+150 Signal"], "grants": {"signal": 150}})
        elif kind == "elite":
            st.update({"prize": "+200 Signal", "icon": "elite", "objective": {"type": "elite", "enemy": "ashfang_marauder", "at": 120.0}, "discoveries": [], "reward": ["+200 Signal"], "grants": {"signal": 200}})
        stages.append(st)
    final = ch["id"] == 9
    stages.append({"id": "%s_silence" % ch["numeral"].lower(), "chapter": ch["id"], "name": "The Silence" if not final else "Through the Gate", "place": ch["name"],
                   "start": V(-800, 600), "prize": "+%d Signal" % (300 + 30 * (ch["id"] - 4)), "icon": "elite",
                   "objective": {"type": "boss", "at": 420.0, "hp": 0.6 + 0.02 * (ch["id"] - 4) if not final else 0.7}, "discoveries": [],
                   "new_title": "THE SILENCE" if not final else "THE LAST GATE", "new": "It followed the music this far. Arrives at 7:00.",
                   "brief": "Something wants it quiet.", "reward": ["+%d Signal" % (300 + 30 * (ch["id"] - 4)), "Chapter %s complete" % ch["numeral"]] + (["The main Rex Fleet path complete"] if final else []),
                   "grants": {"signal": 300 + 30 * (ch["id"] - 4)}})
    contacts = {cid: {"name": v[0], "faction": v[1], "role": v[2], "portrait": cid, "captain": v[3], "perk": {"kind": v[4], "value": v[5]}} for cid, v in ch["contacts"].items()}
    chapter = {"id": ch["id"], "name": ch["name"], "numeral": ch["numeral"], "destination": ch["dest"], "subtitle": ch["sub"], "after": ch["after"], "issue": ch["issue"]}
    if ch.get("issue_end"):
        chapter["issue_end"] = ch["issue_end"]
    realm = {"id": ch["dest"], "chapter": chapter,
             "destination": {"name": ch["name"], "desc": ch["sub"], "half_size": V(6000, 4200), "gate": V(-5000, 0), "goal_signals": 0, "story_only": True,
                             "climax_time": 1260.0, "background": C(ch["bg"]), "drift_name": "OPEN SPACE", "biome": "space", "regions": list(regions.keys()),
                             "completion_unlocks": [], "seed": ch["seed"]},
             "tier": "approved_draft", "source": "RexPrompt rex-fleet shelf; places first appear in Issue %s; cast from %s" % (issues, CAST_SRC),
             "regions": regions, "discoveries": disc, "contacts": contacts, "places": places, "stages": stages}
    with open(os.path.join(ROOT, "data", "realms", ch["dest"] + ".json"), "w", encoding="utf-8") as f:
        json.dump(realm, f, indent=1, ensure_ascii=False)
    print("wrote", ch["dest"], len(stages), "stages")
