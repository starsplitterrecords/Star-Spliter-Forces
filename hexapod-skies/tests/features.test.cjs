// Replayability features: twists, risk, daily, overtime, medals, journal, rares, variants, gear, races, migration.
// Usage: SP=<dir with node_modules/three> node features.test.cjs /abs/path/index.html
const { chromium } = require('playwright');
const SP = process.env.SP;
let fails = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${info}`); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ path: SP + '/deps/node_modules/three/build/three.module.min.js', contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.addInitScript(() => { if (!sessionStorage.getItem('init')) { localStorage.clear(); sessionStorage.setItem('init', '1'); } });
  await page.goto('file://' + process.argv[2]);
  await page.waitForFunction(() => window.__hexapod?.game.state === 'title', null, { timeout: 60000 });
  const H = (fn, arg) => page.evaluate(fn, arg);
  const start = (o) => H((o) => { const x = __hexapod; Object.assign(x.sel, { mode: 'run', twistOverride: null, risk: {} }, o); x.startRun(); x.game.headless = true; x.player.invuln = 1e9; }, o);
  const clearStage = () => H(() => { const x = __hexapod; x.game.obj.forEach((o) => { o.count = o.target - 1; }); const o = x.game.obj[0]; x.onEventProxy ? 0 : 0; o.count = o.target; o.done = true; x.game.obj.slice(1).forEach((q) => { q.count = q.target; q.done = true; }); });

  // twists all run cleanly
  for (const t of ['fair', 'breezy', 'heatwave', 'rain', 'swarm', 'dusk']) {
    await start({ hab: 'pond', mount: 'dragonfly', twistOverride: t });
    await H(() => __hexapod.sim(10));
    check(`twist ${t} runs`, await H(() => __hexapod.game.state === 'play' && __hexapod.run.twist), await H(() => __hexapod.run.twist));
  }
  await start({ hab: 'meadow', mount: 'honeybee', twistOverride: 'breezy' });
  const drift = await H(() => { const x = __hexapod; const p0 = x.player.pos.clone(); x.player.pos.y += 15; p0.y += 15; x.sim(4); return Math.hypot(x.player.pos.x - p0.x, x.player.pos.z - p0.z); });
  check('breezy pushes a hovering insect', drift > 3, drift.toFixed(1));
  await start({ hab: 'meadow', mount: 'dragonfly', twistOverride: 'rain' });
  check('rain slows a dragonfly', await H(() => __hexapod.run.fx.speed < 1));
  check('fresh layout each run', await H(() => { const x = __hexapod, a = x.world.seed; x.startRun(); return x.world.seed !== a; }));

  // risk dial
  await start({ hab: 'meadow', mount: 'dragonfly', risk: { birds: true, nolock: true } });
  check('risk multiplier', await H(() => __hexapod.run.mult === 1.6), String(await H(() => __hexapod.run.mult)));
  await H(() => __hexapod.sim(2));
  check('no lock-on with the risk on', await H(() => __hexapod.player.lock === null));

  // stages -> overtime -> results with medals
  await start({ hab: 'pond', mount: 'dragonfly', twistOverride: 'fair' });
  for (let s = 0; s < 3; s++) {
    await H(() => { const x = __hexapod, o = x.game.obj.find((q) => q.type === 'catch'); x.game.obj.forEach((q) => { if (q !== o) { q.count = q.target; q.done = true; } else q.count = q.target - 1; }); const p = x.world.prey.find((p) => p.alive && p.kind === o.kind); p.pos.copy(x.player.pos); x.sim(2); }); }
  check('clearing stage 3 starts overtime', await H(() => !!__hexapod.game.overtime && !!__hexapod.game.banked));
  await H(() => __hexapod.sim(4));
  check('overtime wave 1 begins', await H(() => __hexapod.game.overtime.wave === 1 && __hexapod.game.time <= 60));
  await H(() => { const x = __hexapod; x.game.headless = false; x.game.time = 0.01; x.game.headless = true; x.sim(0.1); });
  check('overtime timeout ends as a win', await H(() => __hexapod.game.state === 'end'));
  await page.waitForTimeout(600);
  check('results: habitat mastered', (await page.textContent('#resTitle')) === 'Habitat mastered');
  check('medals saved', await H(() => __hexapod.Prog.medalCount() >= 1), String(await H(() => __hexapod.Prog.medalCount())));
  await page.click('#menuBtn');

  // daily
  await H(() => { const x = __hexapod; x.sel.mode = 'daily'; x.startRun(); x.game.headless = true; x.endRun('time'); });
  check('daily record and streak', await H(() => { const d = JSON.parse(localStorage.getItem('hexapod-daily')); return Object.keys(d).length === 1; }));
  await page.waitForTimeout(500); await page.click('#menuBtn');

  // journal + rare sighting
  await start({ hab: 'garden', mount: 'hawkmoth', twistOverride: 'fair' });
  await H(() => { const x = __hexapod, f = x.world.flowers[0]; x.player.pos.copy(f.head); x.sim(1); });
  check('flying close adds journal entries', await H(() => Object.keys(__hexapod.Prog.journal()).length >= 1));
  await H(() => { const x = __hexapod; x.spawnRare(); x.player.pos.copy(x.game.rare.pos); x.sim(0.5); });
  check('rare sighting spotted and journaled', await H(() => __hexapod.game.rareSeen === 1 && !!__hexapod.Prog.journal().luna));

  // variants and gear
  check('variants start locked', await H(() => !(__hexapod.Prog.stars() >= 3)) && await H(() => __hexapod.MOUNTS.darter.unlock === 3));
  await H(() => localStorage.setItem('hexapod-best', JSON.stringify({ 'pond:dragonfly': { score: 1, stars: 3 }, 'meadow:dragonfly': { score: 1, stars: 3 }, 'garden:dragonfly': { score: 1, stars: 3 }, 'hedgerow:dragonfly': { score: 1, stars: 3 } })));
  for (const v of ['darter', 'bumblebee', 'elephant', 'spot22']) { await start({ hab: 'hedgerow', mount: v, twistOverride: 'fair' }); await H(() => __hexapod.sim(2)); }
  check('all four variants fly', await H(() => __hexapod.game.state === 'play' && __hexapod.player.mount.key === 'spot22'));
  check('22-spot grazes mildew', await H(() => __hexapod.game.obj[0].kind === 'mildew'));
  await H(() => { const x = __hexapod, p = x.world.prey.find((p) => p.alive && p.kind === 'mildew'); x.player.pos.copy(p.pos); x.sim(0.5); });
  check('mildew can be eaten', await H(() => __hexapod.game.obj[0].count >= 1));
  await H(() => { localStorage.setItem('hexapod-medals', JSON.stringify({ a: { untouched: true, swift: true, combo: true, freehand: true }, b: { untouched: true, swift: true, combo: true, freehand: true }, c: { untouched: true, swift: true, combo: true, freehand: true } })); __hexapod.endRun('time'); });
  await page.waitForTimeout(500); await page.click('#menuBtn');
  await page.click('#riderBtn');
  await page.click('#rOpts .chip[data-id="shell"]');
  check('rider gear equips', await H(() => JSON.parse(localStorage.getItem('hexapod-gear')).helmet === 'shell'));
  await page.click('#rClose');
  await page.click('#journalBtn');
  check('journal sheet lists entries', (await page.locator('#jList .jcard').count()) === 26);
  await page.click('#jClose');

  // ring race with ghost
  const race = async () => { await H(() => { const x = __hexapod; x.sel.mode = 'race'; x.sel.hab = 'pond'; x.sel.mount = 'dragonfly'; x.startRun(); x.game.headless = true; x.sim(3.5);
    for (const r of x.run.race.rings) { x.player.pos.copy(r.c); x.sim(0.4); } x.sim(2); }); };
  await race();
  check('race finishes', await H(() => __hexapod.game.state === 'end'));
  check('best time and ghost saved', await H(() => !!localStorage.getItem('hexapod-ghost:pond:dragonfly') && !!JSON.parse(localStorage.getItem('hexapod-race'))['pond:dragonfly']));
  await page.waitForTimeout(500); await page.click('#menuBtn');
  await H(() => { const x = __hexapod; x.sel.mode = 'race'; x.startRun(); x.game.headless = true; x.sim(4); });
  check('ghost flies in the next race', await H(() => !!__hexapod.run.race.ghost));
  await H(() => __hexapod.endRun('time')); await page.waitForTimeout(500); await page.click('#menuBtn');

  // migration: clear a leg, pick an upgrade, health carries
  await H(() => { const x = __hexapod; x.sel.mode = 'migration'; x.sel.mount = 'dragonfly'; x.sel.twistOverride = 'fair'; x.run.campaign = null; x.startRun(); x.game.headless = true; x.player.health = 60; x.setStage(1);
    x.game.obj.forEach((o) => { o.count = o.target - 1; }); const o = x.game.obj.find((q) => q.type === 'catch'); x.game.obj.forEach((q) => { if (q !== o) { q.count = q.target; q.done = true; } });
    const p = x.world.prey.find((p) => p.alive && p.kind === o.kind); p.pos.copy(x.player.pos); x.sim(4); });
  await page.waitForSelector('#upgrades:not([hidden])', { timeout: 5000 }).catch(() => {});
  check('upgrade choice after leg 1', await page.isVisible('#upgrades'));
  await page.click('#upCards .card');
  await page.waitForFunction(() => __hexapod.game.state === 'play', null, { timeout: 20000 });
  check('leg 2 in the meadow with health carried', await H(() => __hexapod.world.key === 'meadow' && __hexapod.player.health >= 84 && __hexapod.player.health <= 100), String(await H(() => [__hexapod.world.key, __hexapod.player.health])));

  check('no page errors', errs.length === 0, errs.slice(0, 4).join(' | '));
  await browser.close();
  console.log(fails ? `${fails} failed` : 'all passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
