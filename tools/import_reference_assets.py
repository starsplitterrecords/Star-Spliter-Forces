#!/usr/bin/env python3
"""Source-to-game asset pipeline for Star Splitter Forces.

Reads assets/reference/manifest.json, which lists canonical source assets
(repository, path, pinned commit, approval status, intended game use) and the
game-ready outputs to derive from each. For every entry it:

  1. locates the source file in a local clone of the named repository,
  2. verifies the clone is at the pinned commit and records the source SHA-256,
  3. refuses entries whose status does not permit game use,
  4. derives outputs (resize / cover-crop / fit) into the game repo,
  5. writes assets/reference/provenance.json (source -> output, hashes,
     commit, status, review flags),
  6. renders a readability contact sheet at real mobile display sizes
     (assets/reference/contact_sheet.png) for human review.

Source files are only ever read, never modified.

Usage:
  python3 tools/import_reference_assets.py --sources <dir containing repo clones>
  python3 tools/import_reference_assets.py --sources ... --check   # verify only

Statuses (manifest "status"):
  released          published on an official Star Splitter site/release
  approved          explicitly approved production asset
  pending_review    usable for internal builds; flagged for owner review
  keeper            a RexPrompt Reference Keeper reference (owner direction
                    2026-11-22: keeper art may be used in the game)
  approved_draft    a RexPrompt approved production draft (production/drafts;
                    same direction); never shown ahead of its issue's stages
  draft / unknown   NOT imported
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys

from PIL import Image, ImageDraw

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
MANIFEST = os.path.join(ROOT, "assets", "reference", "manifest.json")
PROVENANCE = os.path.join(ROOT, "assets", "reference", "provenance.json")
CONTACT = os.path.join(ROOT, "assets", "reference", "contact_sheet.png")
IMPORTABLE = {"released", "approved", "pending_review", "keeper", "approved_draft"}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def repo_head(repo_dir):
    try:
        return subprocess.run(["git", "-C", repo_dir, "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    except Exception:
        return ""


def derive(src_img, spec):
    w, h = spec["size"]
    fit = spec.get("fit", "cover")
    img = src_img.convert("RGBA")
    if "crop" in spec:  # normalised crop box [x0, y0, x1, y1] in 0..1
        x0, y0, x1, y1 = spec["crop"]
        img = img.crop((int(x0 * img.width), int(y0 * img.height), int(x1 * img.width), int(y1 * img.height)))
    if fit == "cover":
        scale = max(w / img.width, h / img.height)
        img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)
        left = (img.width - w) // 2
        top = int((img.height - h) * spec.get("anchor_y", 0.5))
        img = img.crop((left, top, left + w, top + h))
    else:  # contain
        img.thumbnail((w, h), Image.LANCZOS)
        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        canvas.paste(img, ((w - img.width) // 2, (h - img.height) // 2))
        img = canvas
    return img


def contact_sheet(rows):
    """Each row: (label, output path, display size in px at 1280x720 design)."""
    pad, line = 16, 22
    width = 1280
    y = pad
    placed = []
    x = pad
    row_h = 0
    for label, path, disp in rows:
        dw, dh = disp
        if x + dw + pad > width:
            x = pad
            y += row_h + line + pad
            row_h = 0
        placed.append((label, path, x, y, dw, dh))
        x += dw + pad
        row_h = max(row_h, dh)
    height = y + row_h + line + pad
    sheet = Image.new("RGB", (width, height), (7, 10, 21))
    draw = ImageDraw.Draw(sheet)
    for label, path, px, py, dw, dh in placed:
        im = Image.open(os.path.join(ROOT, path)).convert("RGBA")
        im = im.resize((dw, dh), Image.LANCZOS)
        sheet.paste(im, (px, py), im)
        draw.text((px, py + dh + 4), label[:28], fill=(200, 215, 240))
    sheet.save(CONTACT)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sources", required=True, help="directory containing clones named after their repositories")
    ap.add_argument("--check", action="store_true", help="verify sources and hashes without writing outputs")
    args = ap.parse_args()
    with open(MANIFEST) as f:
        manifest = json.load(f)
    provenance = {"generated_by": "tools/import_reference_assets.py", "entries": []}
    sheet_rows = []
    problems = 0
    for e in manifest["assets"]:
        repo_dir = os.path.join(args.sources, e["repo"])
        src = os.path.join(repo_dir, e["path"])
        record = {k: e[k] for k in ("id", "repo", "path", "commit", "status", "use") if k in e}
        if e["status"] not in IMPORTABLE:
            record["skipped"] = "status %s is not importable" % e["status"]
            provenance["entries"].append(record)
            continue
        if not os.path.exists(src):
            print("MISSING", e["id"], src)
            problems += 1
            record["error"] = "source missing"
            provenance["entries"].append(record)
            continue
        head = repo_head(repo_dir)
        if e.get("commit") and head and not head.startswith(e["commit"]):
            print("WARNING %s: clone at %s, manifest pinned %s" % (e["id"], head[:12], e["commit"]))
            record["clone_commit"] = head
        record["source_sha256"] = sha256(src)
        record["review_required"] = e["status"] == "pending_review"
        img = Image.open(src)
        record["source_size"] = [img.width, img.height]
        outs = []
        for spec in e["outputs"]:
            out_path = os.path.join(ROOT, spec["out"])
            if not args.check:
                os.makedirs(os.path.dirname(out_path), exist_ok=True)
                derive(img, spec).save(out_path, optimize=True)
            outs.append({"out": spec["out"], "size": spec["size"], "sha256": sha256(out_path) if os.path.exists(out_path) else ""})
            if "display" in spec:
                sheet_rows.append((e["id"], spec["out"], tuple(spec["display"])))
        record["outputs"] = outs
        provenance["entries"].append(record)
    if not args.check:
        with open(PROVENANCE, "w") as f:
            json.dump(provenance, f, indent=2)
        if sheet_rows:
            contact_sheet(sheet_rows)
    flagged = sum(1 for r in provenance["entries"] if r.get("review_required"))
    print("assets: %d  imported: %d  flagged for owner review: %d  problems: %d" % (
        len(manifest["assets"]), sum(1 for r in provenance["entries"] if "outputs" in r), flagged, problems))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
