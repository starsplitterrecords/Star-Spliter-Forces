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
    fragment = "<title>Star Splitter Forces</title>\n" + styles + "\n" + body
    open(os.path.join(OUT, "index.html"), "w").write(fragment)
    print("written", OUT)

if __name__ == "__main__":
    main()
