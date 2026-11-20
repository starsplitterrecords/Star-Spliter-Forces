// Builds dist-standalone/the-movement.html: the whole game (engine, data, UI, CSS) in one file.
// Usage: node scripts/build-standalone.mjs
import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'dist-standalone');
fs.mkdirSync(out, { recursive: true });
execSync(`npx tailwindcss -i src/app/globals.css -o ${out}/app.css --minify`, { cwd: root, stdio: 'inherit' });
const r = await build({
  entryPoints: [path.join(root, 'standalone/entry.tsx')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  jsx: 'automatic',
  write: false,
  alias: { '@': path.join(root, 'src') },
  loader: { '.css': 'empty', '.json': 'json' },
  define: { 'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_STANDALONE': '"1"' },
  logLevel: 'warning',
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = fs.readFileSync(`${out}/app.css`, 'utf8');
// Full document for local use (double-click to play) ...
const shell = (inner) => `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n${inner.head}</head><body>${inner.body}</body></html>`;
const head = `<title>The Movement</title>\n<style>:root{color-scheme:dark}html,body{height:100%;background:#0b0d12;color:#eceef3}#root{height:100%}</style>\n<style>${css}</style>`;
const body = `<div id="root"></div><script>${js}</script>`;
const html = shell({ head, body });
// ... and a body-only fragment for hosts that wrap the page in their own skeleton.
fs.writeFileSync(`${out}/the-movement.fragment.html`, `${head}\n${body}`);
fs.writeFileSync(`${out}/the-movement.html`, html);
fs.rmSync(`${out}/app.css`);
console.log(`dist-standalone/the-movement.html ${(html.length / 1e6).toFixed(2)} MB`);
