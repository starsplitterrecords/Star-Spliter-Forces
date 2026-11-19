// Automated playtest: bots fly every mount x habitat using player-like inputs (mouse deltas, held keys).
// Usage: SP=<dir with node_modules/three> node playtest.cjs /abs/path/index.html [out.json]
const { chromium } = require('playwright');
const fs = require('fs');
const SP = process.env.SP;
const MOUNTS = ['dragonfly', 'honeybee', 'hawkmoth', 'ladybird'];
const HABS = ['pond', 'meadow', 'garden', 'hedgerow'];
const BOTS = (process.env.BOTS || 'skilled,novice').split(',');
const SEEDS = +(process.env.SEEDS || 1);

// Runs inside the page. A bot only touches `input` (like a mouse and keyboard would) and reads what a player can see.
function installBot([kind, seed]) {
  const x = window.__hexapod, P = x.player, V = P.pos.constructor;
  let r = seed * 9301 + 49297; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const skilled = kind === 'skilled';
  const cfg = skilled ? { rate: 5.0, react: 0.15, noise: 0.03, strikeDelay: 0.1 } : { rate: 2.2, react: 0.45, noise: 0.12, strikeDelay: 0.5 };
  const st = { stuckT: 0, unstick: 0, t: 0, nextThink: 0, dYaw: 0, dPitch: 0, thrust: true, boost: false, lockedFor: 0, wander: null, hideT: 0 };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  x.game.bot = (dt) => {
    const inp = x.input, M = P.mount, w = x.world;
    st.t += dt; inp.lookX = inp.lookY = 0; inp.turnX = inp.turnY = 0; inp.back = false; inp.boost = false;
    // strike when the hex is gold (after a human-ish delay)
    if (P.lock && P.lock.d <= x.SWOOP_RANGE) st.lockedFor += dt; else st.lockedFor = 0;
    const wantsStrike = skilled ? st.lockedFor > cfg.strikeDelay : (st.lockedFor > cfg.strikeDelay && P.lock && P.lock.d < 14);
    if (wantsStrike && P.strikeCD <= 0 && P.swoopT <= 0) { inp.strike = true; st.lockedFor = -0.6; }
    if (st.t >= st.nextThink) {
      st.nextThink = st.t + cfg.react * (0.7 + rnd() * 0.6);
      let target = null, stopNear = 0;
      const birdThreat = w.birds.some((b) => b.state === 'warn' || (b.state === 'dive' && b.pos.distanceTo(P.pos) < 90));
      const wasp = w.wasps.find((q) => q.alive && q.state === 'chase' && q.pos.distanceTo(P.pos) < 25);
      const G = x.goalTarget();
      const o = x.game.obj.find((q) => !q.done);
      if (skilled && birdThreat) { // drop into the grass ahead
        const f = new V(Math.sin(P.yaw), 0, Math.cos(P.yaw)); target = P.pos.clone().addScaledVector(f, 25); target.y = w.height(target.x, target.z) + 2.5;
        if (w.water !== null && w.height(target.x, target.z) < w.water) { target.copy(P.pos).addScaledVector(new V(-f.z, 0, f.x), 30); target.y = P.pos.y; }
      } else if (skilled && wasp && !M.fights) { target = P.pos.clone().add(P.pos.clone().sub(wasp.pos).setY(0).normalize().multiplyScalar(40)); target.y = P.pos.y + 4; }
      else if (skilled && P.lock && P.lock.wanted && P.lock.d < 45) { target = P.lock.pos.clone(); stopNear = P.lock.type === 'flower' || P.lock.type === 'nest' ? 1.2 : 0; }
      else if (o && o.type === 'skim' && P.overWater) { const f = new V(Math.sin(P.yaw), 0, Math.cos(P.yaw)); target = P.pos.clone().addScaledVector(f, 30); target.y = w.water + 0.9; if (w.height(target.x, target.z) > w.water - 0.5) target.set(-P.pos.x * 0.3, w.water + 0.9, -P.pos.z * 0.3); }
      else if (G && G.pos) { target = G.pos.clone(); stopNear = (o && (o.type === 'deliver' || o.type === 'nectar')) ? 1.2 : 0; if (o && o.type === 'skim') { target.y = w.water + 0.8; } }
      else { // nothing to chase (e.g. dodge objective): patrol a loop near the middle
        if (!st.wander || st.wander.distanceTo(P.pos) < 10) { const a = rnd() * 6.28, rr = 40 + rnd() * 100; st.wander = new V(Math.cos(a) * rr, 0, Math.sin(a) * rr); st.wander.y = w.height(st.wander.x, st.wander.z) + 14; }
        target = st.wander;
      }
      if (o && o.type === 'skim' && !skilled && G && G.pos === null) target = null;
      // a person who is pinned against something steers away for a moment
      if (st.unstick > 0) { target = P.pos.clone().add(new V(Math.cos(st.unAng) * 20, 8, Math.sin(st.unAng) * 20)); }
      const to = target.clone().sub(P.pos), d = to.length();
      st.dYaw = Math.atan2(to.x, to.z) + (rnd() - 0.5) * cfg.noise * 2;
      st.dPitch = Math.atan2(to.y, Math.hypot(to.x, to.z)) + (rnd() - 0.5) * cfg.noise * 2;
      if (skilled && P.groundGap < 1.5 && st.dPitch < 0 && !(o && o.type === 'skim')) st.dPitch = 0.15;
      // flowers / nest: slow down and hover inside; otherwise keep flying
      st.thrust = !(stopNear && d < 3.5);
      if (!skilled && stopNear && d < 6) st.thrust = rnd() < 0.3;
      st.boost = skilled && d > 70 && P.stamina > 45 && !birdThreat;
      st.dist = d;
    }
    if (inp.thrust && P.speed < 3 && P.swoopT <= 0) st.stuckT += dt; else st.stuckT = 0;
    if (st.stuckT > (skilled ? 1 : 2.5)) { st.unstick = 1.2; st.unAng = rnd() * 6.28; st.stuckT = 0; st.nextThink = 0; }
    if (st.unstick > 0) st.unstick -= dt;
    // move the "mouse" toward the desired aim at a human turn rate
    const sens = 0.0022 * x.settings.sens;
    const ey = Math.max(-cfg.rate * dt, Math.min(cfg.rate * dt, wrap(st.dYaw - P.aimYaw)));
    const ep = Math.max(-cfg.rate * dt, Math.min(cfg.rate * dt, st.dPitch - P.aimPitch));
    inp.lookX = -ey / sens; inp.lookY = -ep / sens;
    inp.thrust = st.thrust; inp.boost = st.boost;
  };
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = [];
  const jobs = [];
  for (const bot of BOTS) for (const m of MOUNTS) for (const h of HABS) for (let s = 1; s <= SEEDS; s++) jobs.push({ bot, m, h, s });
  const worker = async () => {
    const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ path: SP + '/deps/node_modules/three/build/three.module.min.js', contentType: 'application/javascript' }));
    await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
    await page.goto('file://' + process.argv[2]);
    await page.waitForFunction(() => window.__hexapod?.game.state === 'title', null, { timeout: 60000 });
    while (jobs.length) {
      const j = jobs.shift(); const t0 = Date.now();
      await page.evaluate(([h, m]) => { const x = __hexapod; x.sel.hab = h; x.sel.mount = m; x.startRun(); x.game.headless = true; x.settings.sens = 1; }, [j.h, j.m]);
      await page.evaluate(installBot, [j.bot, j.s]);
      let state = 'play', snaps = [];
      for (let k = 0; k < 60 && state === 'play'; k++) {
        await page.evaluate(() => __hexapod.sim(5));
        const snap = await page.evaluate(() => { const x = __hexapod; return { t: Math.round(x.HABITATS[x.sel.hab].time - x.game.time), obj: x.game.obj.map((o) => o.count), hp: Math.round(x.player.health), state: x.game.state }; });
        snaps.push(snap); state = snap.state;
      }
      const res = await page.evaluate(() => { const x = __hexapod, g = x.game; return { reason: g.endReason || g.state, score: g.score, timeLeft: Math.round(g.time), hp: Math.round(x.player.health), obj: g.obj.map((o) => ({ label: o.label, count: o.count, target: o.target, doneAt: o.doneAt ?? null })), tele: g.tele }; });
      await page.evaluate(() => { __hexapod.game.bot = null; __hexapod.game.headless = false; });
      results.push({ ...j, ...res, curve: snaps.filter((_, i) => i % 3 === 2).map((s) => s.obj), wall: Date.now() - t0 });
      const r = results[results.length - 1];
      console.log(`${j.bot.padEnd(7)} ${j.m.padEnd(9)} ${j.h.padEnd(8)} ${r.reason.padEnd(6)} ${r.obj.map((o) => `${o.count}/${o.target}${o.doneAt != null ? '@' + o.doneAt : ''}`).join(' ').padEnd(22)} hp ${String(r.hp).padStart(3)} score ${r.score}  (${(r.wall / 1000).toFixed(0)}s)`);
    }
    if (errs.length) console.log('PAGE ERRORS', errs.slice(0, 3));
  };
  await Promise.all([worker(), worker(), worker()]);
  fs.writeFileSync(process.argv[3] || 'playtest.json', JSON.stringify(results, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
