// Regression test for Hexapod Skies. Runs the game on a fixed timestep (no dependence on frame rate),
// driving it with real keyboard and touch events.
// Usage: SP=<dir with node_modules/three> node gameplay.test.cjs /abs/path/index.html
const { chromium, devices } = require('playwright');
const SP = process.env.SP;
let fails = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${info}`); if (!ok) fails++; };

async function open(browser, ctxOpts) {
  const ctx = await browser.newContext(ctxOpts); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ path: SP + '/deps/node_modules/three/build/three.module.min.js', contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('file://' + process.argv[2]);
  await page.waitForFunction(() => window.__hexapod?.game.state === 'title', null, { timeout: 60000 });
  const H = (fn, arg) => page.evaluate(fn, arg);
  // advance the simulation until cond is true (or the time budget runs out)
  const simUntil = (cond, seconds = 30) => page.evaluate(([c, s]) => { const f = new Function('return ' + c); for (let t = 0; t < s; t += 0.25) { if (f()) return true; __hexapod.sim(0.25); } return f(); }, [cond, seconds]);
  const start = (hab, mount) => H(([h, m]) => { const x = __hexapod; x.sel.hab = h; x.sel.mount = m; x.sel.mode = 'run'; x.sel.twistOverride = 'fair'; x.sel.risk = {}; x.startRun(); x.game.headless = true; x.player.invuln = 999; x.world.birds.forEach((b) => (b.attackT = 999)); }, [hab, mount]);
  return { page, errs, H, simUntil, start };
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const { page, errs, H, simUntil, start } = await open(browser, { viewport: { width: 480, height: 320 } });

  // flight
  await start('pond', 'dragonfly');
  check('hovers when idle', await simUntil('false', 1) === false && await H(() => __hexapod.player.speed < 1));
  await page.keyboard.down('KeyW');
  check('holding W flies', await simUntil('__hexapod.player.speed > 12', 5));
  await page.keyboard.up('KeyW');
  check('releasing W slows to a hover', await simUntil('__hexapod.player.speed < 2.5', 6));

  // lock-on swoop
  await H(() => { const x = __hexapod, p = x.world.prey.find((p) => p.kind === 'mosquito' && p.alive); x.player.pos.set(0, 10, 0); x.player.vel.set(0, 0, 0); p.home.set(0, 10, 12); p.pos.set(0, 10, 12); p.vel.set(0, 0, 0); x.player.aimYaw = x.player.yaw = 0; x.player.aimPitch = x.player.pitch = 0; window.__t = p; x.world.prey.forEach((q) => { if (q !== p && q.alive && q.kind === 'mosquito') { q.alive = false; q.respawn = 99; q.m.root.visible = false; } }); });
  await simUntil('false', 0.25);
  check('hex locks onto prey ahead', await simUntil('__hexapod.player.lock && __hexapod.player.lock.ref === window.__t', 2));
  await page.keyboard.press('Space');
  check('close swoop catches it', await simUntil('!window.__t.alive', 3), JSON.stringify(await H(() => { const x = __hexapod, t = x.game.tele; return { strikes: t.strikes, swoops: t.swoops, hit: t.swoopHit, miss: t.swoopMiss, cs: t.catchSwoop, ct: t.catchTouch, d: window.__t.pos.distanceTo(x.player.pos), pp: x.player.pos.toArray().map(Math.round), st: x.player.stamina, cd: x.player.strikeCD, state: x.game.state, ending: x.game.ending, stage: x.game.stage }; })));
  check('a run has three stages', await H(() => __hexapod.game.stages.length === 3));

  // lock-on prefers the current objective
  await H(() => { const x = __hexapod; x.setStage(1); x.game.obj[1].count = x.game.obj[1].target; x.game.obj[1].done = true; const p = x.world.prey.find((p) => p.kind === 'mosquito' && !p.reserve); p.alive = true; p.m.root.visible = true; x.player.pos.set(0, 10, 0); x.player.aimYaw = x.player.yaw = 0; x.player.aimPitch = x.player.pitch = 0; p.home.set(0, 10, 14); p.pos.set(0, 10, 14); });
  check('muted hex on prey once the catch job is done', await simUntil('__hexapod.player.lock && __hexapod.player.lock.type === "prey" && __hexapod.player.lock.wanted === false', 3));

  // skim
  await H(() => { const x = __hexapod; x.player.pos.set(0, 1.5, -30); x.player.vel.set(0, 0, 25); x.player.aimYaw = x.player.yaw = 0; x.player.aimPitch = x.player.pitch = -0.04; });
  await page.keyboard.down('KeyW');
  check('skimming the pond counts', await simUntil('__hexapod.game.obj[0].count >= 1', 4));
  await page.keyboard.up('KeyW');

  // stems deflect instead of stopping you
  await H(() => { const x = __hexapod, c = x.world.cyl.find((c) => c.r < 1 && c.y1 - c.y0 > 12); window.__c = c; const y = (c.y0 + c.y1) / 2; x.player.pos.set(c.x + 0.3, y, c.z - 8); x.player.vel.set(0, 0, 0); x.player.aimYaw = x.player.yaw = 0; x.player.aimPitch = x.player.pitch = 0; });
  await page.keyboard.down('KeyW'); await simUntil('false', 2); await page.keyboard.up('KeyW');
  check('glances past a stem', await H(() => __hexapod.player.pos.z > window.__c.z + 1), JSON.stringify(await H(() => [__hexapod.player.pos.z - window.__c.z, __hexapod.player.speed])));

  // honeybee: pollen, delivery, wasp
  await start('meadow', 'honeybee');
  await H(() => { const x = __hexapod, f = x.world.flowers.find((f) => f.kind === 'poppy'); x.player.pos.copy(f.head); x.player.vel.set(0, 0, 0); });
  check('bee gathers pollen while hovering in a flower', await simUntil('__hexapod.player.cargo >= 3', 4));
  await H(() => { const x = __hexapod; x.player.pos.copy(x.world.nestEntrance); x.player.vel.set(0, 0, 0); });
  check('pollen delivered at the nest', await simUntil('__hexapod.player.cargo === 0 && __hexapod.game.obj[0].count >= 3', 4));
  await H(() => { const x = __hexapod; x.setStage(1); x.game.obj[0].count = x.game.obj[0].target; x.game.obj[0].done = true; const w = x.world.wasps[0]; window.__w = w; });
  for (let i = 0; i < 3 && (await H(() => window.__w.alive)); i++) {
    await H(() => { const x = __hexapod, w = window.__w; x.player.pos.set(0, 20, 0); x.player.vel.set(0, 0, 0); x.player.aimYaw = x.player.yaw = 0; x.player.aimPitch = x.player.pitch = 0; w.pos.set(0, 20, 10); w.vel.set(0, 0, 0); w.state = 'patrol'; w.aggroCD = 99; w.home.set(0, 20, 10); w.stun = 0; x.player.strikeCD = 0; x.player.stamina = 100; });
    await simUntil('__hexapod.player.lock && __hexapod.player.lock.type === "wasp"', 1);
    await page.keyboard.press('Space'); await simUntil('false', 1.5);
  }
  check('bee stings a wasp away', !(await H(() => window.__w.alive)));

  // hawk-moth sips by hovering
  await start('garden', 'hawkmoth');
  await H(() => { const x = __hexapod, f = x.world.flowers.find((f) => f.kind === 'moonflower'); x.player.pos.copy(f.head); x.player.vel.set(0, 0, 0); });
  check('moth sips nectar by hovering', await simUntil('__hexapod.game.obj[0].count >= 1', 3));

  // ladybird: every aphid in the hedgerow is reachable
  await start('hedgerow', 'ladybird');
  const unreachable = await H(() => { const w = __hexapod.world; return w.aphidSpots.filter((p) => w.sph.some((o) => o.r > 2 && p.distanceTo(o) < o.r + 0.6)).length; });
  check('no aphids buried in logs or rocks', unreachable === 0, String(unreachable));
  await H(() => { const x = __hexapod, p = x.world.prey.find((p) => p.kind === 'aphid' && p.alive); window.__a = p; x.world.prey.forEach((q) => { if (q !== p && q.alive && q.kind === 'aphid') { q.alive = false; q.respawn = 99; q.m.root.visible = false; } }); x.player.pos.copy(p.pos).add(new x.player.pos.constructor(0, 0, -12)); x.player.vel.set(0, 0, 0); x.player.aimYaw = x.player.yaw = 0; x.player.aimPitch = x.player.pitch = 0; });
  await simUntil('__hexapod.player.lock && __hexapod.player.lock.ref === window.__a', 2);
  await page.keyboard.press('Space');
  check('ladybird swoops onto an aphid', await simUntil('!window.__a.alive', 3));

  // swarm stage spawns extra prey
  await H(() => __hexapod.setStage(2));
  check('the final stage spawns an aphid colony', await H(() => __hexapod.world.prey.filter((p) => p.reserve && p.alive).length >= 14));

  // birds: hiding counts as a dodge
  await start('meadow', 'hawkmoth');
  await H(() => { const x = __hexapod; x.setStage(1); const p = x.player.pos; p.y = x.world.height(p.x, p.z) + 2; x.world.birds[0].attackT = 0; });
  check('hiding in the grass dodges a dive', await simUntil('__hexapod.game.obj[1].count >= 1', 15));

  // stages → win → results
  await H(() => { const x = __hexapod; x.setStage(2); x.game.obj.forEach((o) => { o.count = o.target - 1; }); x.game.obj[1].count = x.game.obj[1].target; x.game.obj[1].done = true; const f = x.world.flowers.find((f) => !x.game.nectarSeen.has(f.idx)); x.player.pos.copy(f.head); x.player.vel.set(0, 0, 0); });
  check('a fast clear offers overtime', await simUntil('__hexapod.game.state === "offer"', 8));
  await H(() => __hexapod.answerOffer(false));
  check('declining overtime ends the run', await H(() => __hexapod.game.state === 'end'));
  await H(() => { __hexapod.game.headless = false; });
  await page.waitForSelector('#results:not([hidden])', { timeout: 5000 });
  check('results screen shows', (await page.textContent('#resTitle')) === 'Habitat mastered');
  await page.$eval('#menuBtn', (b) => { b.scrollIntoView(); b.click(); });
  check('back to title', await H(() => __hexapod.game.state === 'title'));
  check('no page errors (desktop)', errs.length === 0, errs.join(' | '));

  // one-thumb touch control on a phone
  const m = await open(browser, { ...devices['iPhone 13'], deviceScaleFactor: 1 });
  await m.start('meadow', 'dragonfly');
  const ev = (type, x, y) => m.page.evaluate(([type, x, y]) => { const el = document.querySelector('#thumbZone'); el.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: true })); }, [type, x, y]);
  check('touch UI shows on a phone', await m.page.isVisible('#thumbZone'));
  await ev('pointerdown', 250, 600);
  check('thumb down = flying', await m.simUntil('__hexapod.player.speed > 10', 4));
  const p0 = await m.H(() => __hexapod.player.aimPitch);
  await ev('pointermove', 250, 545);
  await m.simUntil('false', 1);
  check('drag up = climb', (await m.H(() => __hexapod.player.aimPitch)) > p0 + 0.5);
  const y0 = await m.H(() => __hexapod.player.aimYaw);
  await ev('pointermove', 305, 600); await m.simUntil('false', 1);
  check('drag right = turn right', (await m.H(() => __hexapod.player.aimYaw)) < y0 - 0.5);
  await ev('pointermove', 340, 600); await m.simUntil('false', 0.3);
  check('push past the ring = boost', await m.H(() => __hexapod.input.boost === true));
  await ev('pointerup', 340, 600);
  check('lift = hover', await m.simUntil('__hexapod.player.speed < 2.5', 6));
  await m.H(() => { const x = __hexapod; x.player.strikeCD = 0; x.player.stamina = 100; x.game.tele.strikes = 0; });
  await m.page.evaluate(() => { const el = document.querySelector('#thumbZone'), o = { pointerId: 8, pointerType: 'touch', clientX: 200, clientY: 500, bubbles: true, cancelable: true }; el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', o)); });
  await m.simUntil('false', 0.1);
  check('tap = strike', await m.H(() => __hexapod.game.tele.strikes === 1));
  check('no page errors (phone)', m.errs.length === 0, m.errs.join(' | '));

  await browser.close();
  console.log(fails ? `${fails} failed` : 'all passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
