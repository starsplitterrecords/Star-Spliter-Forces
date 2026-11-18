// Drives Hexapod Skies in headless Chromium. Usage: SP=<dir with node_modules/three> node gameplay.test.cjs /abs/path/index.html
const { chromium } = require('playwright');
const SP = process.env.SP;
let fails = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${info}`); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 480, height: 320 } });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ path: SP + '/deps/node_modules/three/build/three.module.min.js', contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('file://' + process.argv[2]);
  await page.waitForFunction(() => window.__hexapod?.game.state === 'title', null, { timeout: 60000 });
  const H = (fn, arg) => page.evaluate(fn, arg);
  const until = (fn, ms = 30000, arg) => page.waitForFunction(fn, arg, { timeout: ms, polling: 50 }).then(() => true, () => false);
  const start = async (hab, mount) => { await H(([h, m]) => { const x = __hexapod; x.sel.hab = h; x.sel.mount = m; x.startRun(); x.player.invuln = 999; x.world.birds.forEach((b) => (b.attackT = 999)); }, [hab, mount]); };

  // --- flight: hover by default, hold W to fly
  await start('pond', 'dragonfly');
  await page.waitForTimeout(600);
  check('hovers when idle', await H(() => __hexapod.player.speed < 1));
  await page.keyboard.down('KeyW');
  check('holding W flies', await until(() => __hexapod.player.speed > 12));
  await page.keyboard.up('KeyW');
  check('releasing W slows to a hover', await until(() => __hexapod.player.speed < 2.5));

  // --- dragonfly lock-on swoop catches a mosquito
  await H(() => { const x = __hexapod, p = x.world.prey.find((p) => p.kind === 'mosquito' && p.alive); x.player.pos.set(0, 10, 0); x.player.vel.set(0, 0, 0); p.home.set(0, 10, 18); p.pos.set(0, 10, 18); p.vel.set(0, 0, 0); x.player.aimYaw = x.player.yaw = 0; x.player.aimPitch = x.player.pitch = 0; window.__target = p; });
  check('hex locks onto prey ahead', await until(() => __hexapod.player.lock && __hexapod.player.lock.type === 'prey'));
  await page.keyboard.press('Space');
  check('swoop catches it', await until(() => !window.__target.alive, 15000), JSON.stringify(await H(() => __hexapod.game.obj.map((o) => o.count))));

  // --- skim
  await H(() => { const x = __hexapod; x.player.pos.set(0, 1, -30); x.player.vel.set(0, 0, 25); x.player.aimYaw = x.player.yaw = 0; x.player.aimPitch = x.player.pitch = -0.05; });
  await page.keyboard.down('KeyW');
  const skimmed = await until(() => __hexapod.game.obj[1].count >= 1, 20000);
  await page.keyboard.up('KeyW');
  check('skimming the pond counts', skimmed);

  // --- honeybee: pollen, delivery, wasp
  await start('meadow', 'honeybee');
  await H(() => { const x = __hexapod, f = x.world.flowers.find((f) => f.kind === 'poppy'); window.__f = f; });
  await H(() => { const x = __hexapod; x.player.pos.copy(window.__f.head); x.player.vel.set(0, 0, 0); });
  check('bee gathers pollen while hovering in a flower', await until(() => __hexapod.player.cargo >= 3, 20000));
  await H(() => { const x = __hexapod; x.player.pos.copy(x.world.nestEntrance); x.player.vel.set(0, 0, 0); });
  check('pollen delivered at the nest', await until(() => __hexapod.player.cargo === 0 && __hexapod.game.obj[0].count >= 3, 20000));
  await H(() => { const x = __hexapod, w = x.world.wasps[0]; x.player.pos.set(0, 20, 0); x.player.aimYaw = x.player.yaw = 0; x.player.aimPitch = x.player.pitch = 0; w.pos.set(0, 20, 12); w.state = 'patrol'; w.aggroCD = 99; w.home.set(0, 20, 12); window.__w = w; });
  for (let i = 0; i < 3 && (await H(() => window.__w.alive)); i++) {
    await H(() => { const x = __hexapod; x.player.pos.set(0, 20, 0); x.player.vel.set(0, 0, 0); window.__w.pos.set(0, 20, 12); window.__w.stun = 0; x.player.strikeCD = 0; });
    await until(() => __hexapod.player.lock && __hexapod.player.lock.type === 'wasp', 5000);
    await page.keyboard.press('Space'); await until(() => __hexapod.player.swoopT <= 0, 10000);
  }
  check('bee stings a wasp away', !(await H(() => window.__w.alive)), JSON.stringify(await H(() => __hexapod.game.obj.map((o) => o.count))));
  check('bee cannot eat gnats', await H(() => __hexapod.player.mount.eats.length === 0));

  // --- hawk-moth: hover to sip
  await start('garden', 'hawkmoth');
  await H(() => { const x = __hexapod, f = x.world.flowers.find((f) => f.kind === 'moonflower'); x.player.pos.copy(f.head); x.player.vel.set(0, 0, 0); });
  check('moth sips nectar by hovering', await until(() => __hexapod.game.obj[0].count >= 1, 20000));

  // --- ladybird eats aphids via swoop
  await start('hedgerow', 'ladybird');
  await H(() => { const x = __hexapod, p = x.world.prey.find((p) => p.kind === 'aphid' && p.alive); window.__a = p; const d = new x.player.pos.constructor(0, 0, -12); x.player.pos.copy(p.pos).add(d); x.player.vel.set(0, 0, 0); x.player.aimYaw = x.player.yaw = 0; x.player.aimPitch = x.player.pitch = 0; });
  await until(() => __hexapod.player.lock && __hexapod.player.lock.ref === window.__a, 8000);
  await page.keyboard.press('Space');
  check('ladybird swoops onto an aphid', await until(() => !window.__a.alive, 15000));

  // --- bird dive dodged when hiding low
  await start('meadow', 'hawkmoth');
  await H(() => { const x = __hexapod, b = x.world.birds[0]; const p = x.player.pos; p.y = x.world.height(p.x, p.z) + 2; b.attackT = 0; });
  check('dodging a dive counts', await until(() => __hexapod.game.obj[1].count >= 1, 60000));

  // --- win flow and results
  await H(() => { const x = __hexapod; x.game.obj.forEach((o) => { o.count = o.target - 1; }); });
  await H(() => { const x = __hexapod; x.game.obj[1].count = x.game.obj[1].target; x.game.obj[1].done = true; const f = x.world.flowers.find((f) => !x.game.nectarSeen.has(f.idx)); x.player.pos.copy(f.head); x.player.vel.set(0, 0, 0); });
  check('finishing objectives ends in a win', await until(() => __hexapod.game.state === 'end', 60000));
  await page.waitForTimeout(600);
  check('results screen shows', (await page.textContent('#resTitle')) === 'Habitat mastered');
  await page.click('#menuBtn');
  check('back to title', await until(() => __hexapod.game.state === 'title'));
  check('no page errors', errs.length === 0, errs.join(' | '));
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
