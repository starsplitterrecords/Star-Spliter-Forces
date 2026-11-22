#!/usr/bin/env python3
"""Imports RexPrompt "shelves" (the per-show data the prompt assembler reads)
into data/shelves/<series>.json for the game.

The game works the way the assembler does: one set of game code, each story
realm a data package. This tool copies, per series:
  - characters: name, role, visual anchor, and the FIRST ISSUE they appear in
  - settings:   name, description, first issue (by the pages' setting lines)
  - factions, regions, lighting, mood: the design language of each realm
  - issues:     per issue, the places and characters that first appear there
It never copies dialogue or page summaries (story beats stay out of the game
data). Everything carries a source tier so Review mode can show it.

Only the main series are imported (spin-offs and Academy titles are future
runway). Reveal order rule: content from issue N is only used by stages that
come after the stages built from issue N-1.

Usage:
  python3 tools/sync_shelves.py <path to RexPrompt clone>
"""
import base64
import gzip
import json
import os
import re
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
OUT_DIR = os.path.join(ROOT, "data", "shelves")

# seriesId -> (tier of issue 1, released issue numbers on Star Splitter Visions)
SERIES = {
    "rex-fleet": {"released": [1]},
    "shattering": {"released": []},
    "forces-of-darkness-llc": {"released": []},
    "backyard-rockets": {"released": [1, 2]},
    "azure-reach": {"released": [1]},
    "stardust-station": {"released": [1]},
    "vikings-2026": {"released": [1]},
    "low-tide-signal": {"released": []},
    "sunforge-outlaw": {"released": []},
    "echoes-forgotten-war": {"released": []},
}


def load(path):
    if path.endswith(".gzb64"):
        return json.loads(gzip.decompress(base64.b64decode(open(path).read())))
    return json.load(open(path, encoding="utf-8"))


def records(data):
    """Page/scene records from any of the assembler's file shapes."""
    if isinstance(data, list):
        return [r for r in data if isinstance(r, dict)]
    if isinstance(data, dict):
        for k in ("pages", "scenes", "strips", "items", "covers"):
            if isinstance(data.get(k), list):
                return [r for r in data[k] if isinstance(r, dict)]
        vals = list(data.values())
        if vals and all(isinstance(v, dict) for v in vals):
            return vals
    return []


def shelf(base, name):
    p = os.path.join(base, name + ".json")
    if not os.path.exists(p):
        return {}
    d = load(p)
    if isinstance(d, dict) and isinstance(d.get(name), (dict, list)):
        d = d[name]
    if isinstance(d, list):
        return {str(i.get("id", i.get("name", n))): i for n, i in enumerate(d) if isinstance(i, dict)}
    return {k: v for k, v in d.items() if isinstance(v, dict)}


def issue_number(entry, rec_id, default):
    m = re.search(r"Issue (\d+)", entry.get("issueLabel", "") or "")
    if m:
        return int(m.group(1))
    m = re.search(r"[_-][IE]0?(\d+)", rec_id or "")
    if m:
        return int(m.group(1))
    return default


def scene_files(rp, entry):
    base = os.path.join(rp, entry.get("basePath", ""))
    files = []
    for key in ("scenesFile",):
        if entry.get(key):
            files.append(entry[key])
    files += entry.get("scenesFiles", []) or []
    for ov in entry.get("sceneOverlays", []) or []:
        files.append(ov["file"])
    for iss in entry.get("issues", []) or []:
        files += iss.get("scenesFiles", []) or []
    asm = os.path.join(base, "assembler.json")
    if os.path.exists(asm):
        files += load(asm).get("scenesFiles", [])
    out = []
    for f in files:
        p = os.path.join(base, f)
        if os.path.exists(p) and p not in out:
            out.append(p)
    return base, out


def place_names(setting_text):
    # "AURIC BAZAAR — REFUGEE BERTH AND CIVIC DOCK — NIGHT" -> ["Auric Bazaar"]
    # "Ext. Rift Space / Int. Ashfang Marauder" -> ["Rift Space", "Ashfang Marauder"]
    first = re.split(r"\s+[—–-]\s+", setting_text or "")[0].strip()
    out = []
    for part in first.split("/"):
        part = re.sub(r"^(int|ext)\.\s*", "", part.strip(), flags=re.I).strip(" .")
        if not part:
            continue
        part = part.title() if part.isupper() or part.islower() else part
        out.append(part)
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    rp = sys.argv[1]
    shows = load(os.path.join(rp, "data", "shows.json"))
    shows = shows if isinstance(shows, list) else shows.get("shows", [])
    os.makedirs(OUT_DIR, exist_ok=True)
    keeper = load(os.path.join(rp, "production", "references", "reference-keeper-manifest.json"))["references"]
    keeper = keeper if isinstance(keeper, list) else list(keeper.values())
    summary = []
    for sid, conf in SERIES.items():
        entries = [s for s in shows if s.get("seriesId") == sid]
        if not entries:
            continue
        base0 = os.path.join(rp, entries[0].get("basePath", ""))
        chars = shelf(base0, "characters")
        sets = shelf(base0, "settings")
        handle_to_id = {str(c.get("handle", "")).lower(): cid for cid, c in chars.items() if c.get("handle")}
        name_to_id = {str(c.get("name", "")).lower(): cid for cid, c in chars.items()}
        first_char = {}
        first_place = {}
        issues = {}
        for n, entry in enumerate(entries, start=1):
            _, files = scene_files(rp, entry)
            for f in files:
                for r in records(load(f)):
                    rid = str(r.get("id", ""))
                    if "COVER" in rid.upper() or "EDITOR" in rid.upper():
                        continue
                    iss = issue_number(entry, rid, n)
                    bucket = issues.setdefault(iss, {"places": [], "characters": []})
                    pns = place_names(r.get("settingText") or "")
                    if not pns and r.get("setting"):
                        pns = [str(sets.get(r["setting"], {}).get("name", r["setting"]))]
                    for pn in pns:
                        if pn not in first_place:
                            first_place[pn] = iss
                            bucket["places"].append(pn)
                    cast = [c.get("handle", "") for c in r.get("charactersInline", []) or []]
                    cast += [str(c) for c in r.get("characters", []) or []]
                    for h in cast:
                        cid = handle_to_id.get(str(h).lower()) or (h if h in chars else None) or name_to_id.get(str(h).lower())
                        if cid and cid not in first_char:
                            first_char[cid] = iss
                            bucket["characters"].append(cid)
        released = set(conf["released"])

        def tier(i):
            if i is None:
                return "working"
            return "released" if i in released else "draft"

        out = {
            "series": sid,
            "name": entries[0].get("seriesName", sid),
            "source": "RexPrompt " + entries[0].get("basePath", ""),
            "released_issues": sorted(released),
            "issues": {str(k): v for k, v in sorted(issues.items())},
            "characters": {},
            "settings": {},
            "factions": {k: {"name": v.get("name", k), "text": v.get("text", v.get("description", ""))} for k, v in shelf(base0, "factions").items()},
            "regions": {k: {"name": v.get("name", k), "text": v.get("environment", v.get("text", "")), "tone": v.get("tone", "")} for k, v in shelf(base0, "regions").items()},
            "lighting": {k: v.get("description", "") for k, v in shelf(base0, "lighting").items()},
            "mood": {k: v.get("keywords", []) for k, v in shelf(base0, "mood").items()},
            "keeper": [{"name": k.get("name"), "type": k.get("type"), "image": k.get("image")} for k in keeper if k.get("seriesId") == sid],
        }
        for cid, c in chars.items():
            notes = str(c.get("notes", "")).lower()
            if "functional" in notes or "ensemble" in notes or "lettered" in notes or "non-diegetic" in str(c.get("visualAnchor", "")).lower():
                continue  # crowd roles and lettering ("Guest 2", "Everyone", captions), not characters
            if not c.get("visualAnchor") and re.match(r"^(guest|crew|staffer|parent|child|father|everyone|vip guest|sponsor)", str(c.get("name", "")), re.I):
                continue
            fi = first_char.get(cid)
            out["characters"][cid] = {"name": c.get("name", cid), "role": c.get("role", ""), "visual": c.get("visualAnchor", ""),
                                      "first_issue": fi, "tier": tier(fi)}
        for key, s in sets.items():
            nm = s.get("name", key)
            fi = None
            low = str(nm).lower()
            for pn, i in first_place.items():
                if pn.lower() == low or low in pn.lower() or pn.lower() in low:
                    fi = i if fi is None else min(fi, i)
            out["settings"][key] = {"name": nm, "text": s.get("text", s.get("description", "")), "first_issue": fi, "tier": tier(fi)}
        with open(os.path.join(OUT_DIR, sid + ".json"), "w", encoding="utf-8") as fh:
            json.dump(out, fh, indent=1, ensure_ascii=False)
            fh.write("\n")
        summary.append("%-24s chars %3d (%3d placed)  settings %3d  issues %s  keeper %d" % (
            sid, len(chars), len(first_char), len(sets), ",".join(str(k) for k in sorted(issues)), len(out["keeper"])))
    print("\n".join(summary))


if __name__ == "__main__":
    main()
