const { chromium } = require('playwright');
const SP = process.env.SP;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await page.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ path: SP + '/deps/node_modules/three/build/three.module.min.js', contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.addInitScript(() => localStorage.setItem('hexapod-sel', JSON.stringify({hab:'meadow', mount:'honeybee'})));
  await page.goto('file://' + process.argv[2]);
  await page.waitForFunction(() => window.__hexapod?.game.state === 'title', null, { timeout: 60000 });
  await page.click('#startBtn');
  const hold = async (fn, ms) => { const end = Date.now()+ms; while (Date.now()<end) { await page.evaluate(fn); await page.waitForTimeout(50); } };
  // pollen: park inside a flower head
  await hold(() => { const h=__hexapod, f=h.world.flowers.find(f=>f.kind==='poppy'); h.player.pos.copy(f.head); h.player.speed=0; h.player.pitch=0; }, 2500);
  let r = await page.evaluate(() => ({ cargo: __hexapod.player.cargo, score: __hexapod.game.score }));
  console.log('after flower', r);
  // deliver
  await hold(() => { const h=__hexapod; h.player.pos.copy(h.world.nestEntrance); h.player.speed=0; }, 2500);
  r = await page.evaluate(() => ({ cargo: __hexapod.player.cargo, obj: __hexapod.game.obj.map(o=>o.count) }));
  console.log('after nest', r);
  // catch a gnat: put it at the mouth
  await page.evaluate(() => { const h=__hexapod, p=h.world.prey.find(p=>p.alive); p.pos.copy(h.player.pos).addScaledVector(h.player.fwd, 0.9); });
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ alive: __hexapod.world.prey.filter(p=>p.alive).length, combo: __hexapod.game.combo }));
  console.log('after catch', r);
  // wasp: put one ahead, strike repeatedly
  for (let i=0;i<4;i++) {
    await page.evaluate(() => { const h=__hexapod, w=h.world.wasps[0]; h.player.invuln=5; w.stun=0; w.pos.copy(h.player.pos).addScaledVector(h.player.fwd, 2); h.player.strikeCD=0; h.player.stamina=100; });
    await page.keyboard.press('Space'); await page.waitForTimeout(500);
  }
  r = await page.evaluate(() => ({ waspAlive: __hexapod.world.wasps[0].alive, hp: __hexapod.world.wasps[0].hp, obj: __hexapod.game.obj.map(o=>o.count) }));
  console.log('after wasp', r);
  // pause
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  console.log('paused:', await page.evaluate(() => __hexapod.game.state), await page.isVisible('#pause'));
  await page.click('#resumeBtn'); await page.waitForTimeout(200);
  // force objectives complete -> win
  await page.evaluate(() => { const h=__hexapod; h.game.obj.forEach(o=>o.count=o.target-1); h.world.flowers.forEach(f=>f.stock=f.max); h.player.cargo = 1; h.game.obj[1].count=h.game.obj[1].target; h.game.obj[1].done=true; });
  await hold(() => { const h=__hexapod; if (h.game.state==='play') { h.player.pos.copy(h.world.nestEntrance); h.player.speed=0; } }, 2000);
  await page.waitForFunction(() => __hexapod.game.state === 'end', null, { timeout: 120000 });
  await page.waitForTimeout(900);
  console.log('end visible:', await page.isVisible('#results'), await page.textContent('#resTitle'), (await page.textContent('#resTally')).slice(0,120));
  await page.screenshot({ path: SP + '/results.png' });
  // death path
  await page.click('#againBtn'); await page.waitForTimeout(300);
  await page.evaluate(() => { const h=__hexapod; h.player.invuln=0; h.player.health=5; });
  await page.evaluate(() => { const h=__hexapod, w=h.world.wasps[1]; w.alive=true; w.stun=0; w.hitCD=0; w.pos.copy(h.player.pos); });
  await page.waitForFunction(() => __hexapod.game.state === 'end', null, { timeout: 120000 });
  console.log('downed title:', await page.textContent('#resTitle'));
  await page.click('#menuBtn'); await page.waitForTimeout(300);
  console.log('back to title:', await page.evaluate(() => __hexapod.game.state), 'best:', await page.evaluate(() => localStorage.getItem('hexapod-best')));
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
