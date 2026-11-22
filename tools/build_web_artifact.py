#!/usr/bin/env python3
"""Packages the Godot Web export (export/web) as a self-hosting page whose
large binaries are gzip+base64 embedded in JS chunk files, so it can be served
by hosts with per-file size limits. The page decompresses them in the browser
(DecompressionStream) and hands them to Godot through a fetch() shim.

  godot --headless --export-release Web export/web/index.html
  python3 tools/build_web_artifact.py            # -> export/web_artifact/
"""
import base64, gzip, json, os, re, shutil

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
SRC = os.path.join(ROOT, "export", "web")
OUT = os.path.join(ROOT, "export", "web_artifact")
CHUNK = 12 * 1024 * 1024  # characters per JS chunk

# Emscripten hands out WebGL object names from one global counter and pads every
# object table with nulls up to it, never reusing freed names. Godot's canvas
# renderer creates and frees GL buffers for every redrawn circle/polygon/arc,
# so those tables grew by ~16 MB of JS heap per minute and long sessions
# crashed the tab. Reuse freed names per table, as native GL drivers do.
GL_ID_ORIGINAL = "getNewId:table=>{var ret=GL.counter++;for(var i=table.length;i<ret;i++){table[i]=null}return ret}"
GL_ID_PATCHED = ("getNewId:table=>{var n=table.length,s=table.__h||1,h;"
    "for(h=s;h<n;h++){if(table[h]==null){table.__h=h+1;return h}}"
    "for(h=1;h<s&&h<n;h++){if(table[h]==null){table.__h=h+1;return h}}"
    "var ret=n>0?n:1;for(var i=n;i<ret;i++){table[i]=null}table.__h=ret+1;return ret}")


def patch_gl_ids(path):
    js = open(path).read()
    if GL_ID_PATCHED in js:
        return
    if GL_ID_ORIGINAL not in js:
        raise SystemExit("index.js: Emscripten getNewId changed; review the GL id reuse patch")
    open(path, "w").write(js.replace(GL_ID_ORIGINAL, GL_ID_PATCHED, 1))
    print("patched GL object id reuse in index.js")


def main():
    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(OUT)
    chunks = {}
    for name in ("index.wasm", "index.pck"):
        raw = open(os.path.join(SRC, name), "rb").read()
        b64 = base64.b64encode(gzip.compress(raw, 9)).decode()
        parts = []
        for i in range(0, len(b64), CHUNK):
            fn = "%s.gz.%d.js" % (name, len(parts))
            with open(os.path.join(OUT, fn), "w") as f:
                f.write("window.__ssfData=window.__ssfData||{};(window.__ssfData[%s]=window.__ssfData[%s]||[]).push(%s);" % (json.dumps(name), json.dumps(name), json.dumps(b64[i:i + CHUNK])))
            parts.append(fn)
        chunks[name] = parts
        print(name, len(raw), "->", len(b64), "chars in", len(parts), "chunk(s)")
    for f in ("index.js", "index.audio.worklet.js", "index.png", "index.icon.png", "index.apple-touch-icon.png"):
        if os.path.exists(os.path.join(SRC, f)):
            shutil.copy(os.path.join(SRC, f), OUT)
    patch_gl_ids(os.path.join(OUT, "index.js"))
    html = open(os.path.join(SRC, "index.html")).read()
    html = html.replace('"ensureCrossOriginIsolationHeaders":true', '"ensureCrossOriginIsolationHeaders":false')
    loader = """<script>
(function () {
	const CHUNKS = %s;
	window.__ssfData = window.__ssfData || {};
	const decoded = {};
	function loadScript(src) {
		return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => fail(new Error('Failed to load ' + src)); document.head.appendChild(s); });
	}
	async function decode(name) {
		for (const part of CHUNKS[name]) { await loadScript(part); }
		const b64 = window.__ssfData[name].join('');
		delete window.__ssfData[name];
		const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
		const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
		decoded[name] = await new Response(stream).arrayBuffer();
	}
	window.__ssfReady = decode('index.wasm').then(() => decode('index.pck'));
	const realFetch = window.fetch.bind(window);
	window.fetch = function (input, init) {
		const url = typeof input === 'string' ? input : input.url;
		for (const name of Object.keys(CHUNKS)) {
			if (url === name || url.endsWith('/' + name)) {
				return window.__ssfReady.then(() => new Response(decoded[name], { headers: { 'Content-Type': name.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream', 'Content-Length': String(decoded[name].byteLength) } }));
			}
		}
		return realFetch(input, init);
	};
	window.__ssfStart = (engine, cfg) => window.__ssfReady.then(() => engine.startGame(cfg));
}());
</script>
""" % json.dumps(chunks)
    html = html.replace('<script src="index.js"></script>', loader + '<script src="index.js"></script>')
    assert "window.__ssfStart" in html, "loader not injected"
    html = html.replace("engine.startGame({", "window.__ssfStart(engine, {")
    html = re.sub(r"<title>.*?</title>", "<title>Star Splitter Forces</title>", html)
    # Hosts that wrap pages in their own document skeleton get the head's
    # <style> and the body's markup only (title first).
    head = re.search(r"<head>(.*)</head>", html, re.S).group(1)
    body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
    styles = "".join(re.findall(r"<style>.*?</style>", head, re.S))
    # Hosts can lay bars over the page (the Claude app's header, mobile browser
    # chrome). Expose what is really visible so the game can keep its UI clear
    # of it: safe-area insets plus any part of the window the visual viewport
    # does not cover. Read from Godot via JavaScriptBridge (ScreenInsets).
    insets = """<div id="ssf-safe" style="position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)"></div>
<script>
(function () {
	// Phone-width layout and safe-area insets need a viewport tag; add one if
	// the host page has none (without it phones lay the page out 980px wide).
	if (!document.querySelector('meta[name="viewport"]')) {
		const m = document.createElement('meta');
		m.name = 'viewport';
		m.content = 'width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover';
		document.head.appendChild(m);
	}
}());
window.__ssfInsets = function () {
	const d = document.getElementById('ssf-safe');
	const cs = d ? getComputedStyle(d) : null;
	const vv = window.visualViewport;
	const t = (cs ? parseFloat(cs.paddingTop) || 0 : 0) + (vv ? Math.max(0, vv.offsetTop) : 0);
	const b = (cs ? parseFloat(cs.paddingBottom) || 0 : 0) + (vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0);
	const l = cs ? parseFloat(cs.paddingLeft) || 0 : 0;
	const r = cs ? parseFloat(cs.paddingRight) || 0 : 0;
	return JSON.stringify({t: t, b: b, l: l, r: r, w: window.innerWidth, h: window.innerHeight});
};
</script>
"""
    fragment = "<title>Star Splitter Forces</title>\n" + styles + "\n" + insets + body
    open(os.path.join(OUT, "index.html"), "w").write(fragment)
    # Everything the page needs besides index.html. Publish exactly this map;
    # chunk counts change as the game grows (a missing chunk = load failure).
    files = {f: "export/web_artifact/" + f for f in sorted(os.listdir(OUT)) if f not in ("index.html", "publish_files.json")}
    json.dump(files, open(os.path.join(OUT, "publish_files.json"), "w"), indent=1)
    print("publish files:", ", ".join(files))
    print("written", OUT)

if __name__ == "__main__":
    main()
