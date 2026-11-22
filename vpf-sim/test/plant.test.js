import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim } from '../src/engine.js';
import { makeConfig, derive } from '../src/config.js';
import { createSingleLoopNetwork } from '../src/network.js';
import { holderTargets, moduleTargets, stubRunningCount, dp1ToGpm, gpmToDp1 } from '../src/chiller.js';
import { runningSim, chaosLayer } from './helpers.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} expected ${b}, got ${a}`);
const rel = (a, b, r, msg) => close(a, b, Math.abs(b) * r, msg);

// --- §14 Pump curve --------------------------------------------------------

test('pump curve: shutoff head and max flow match the configured curve; affinity laws hold', () => {
  const cfg = makeConfig();
  const d = derive(cfg);
  const net = createSingleLoopNetwork(d);
  close(net.pumpHead(1, 0), cfg.pump.shutoffHead_psi, 1e-12, 'shutoff head');
  close(net.pumpHead(1, d.chillerDesignFlow), cfg.pump.designHead_psi, 1e-9, 'design point');
  close(net.pumpHead(1, d.pumpMaxFlow), 0, 1e-9, 'zero head at max flow');
  close(net.pumpHead(0.5, 0), cfg.pump.shutoffHead_psi * 0.25, 1e-12, 'head ∝ n²');

  // Fixed system: flow ∝ speed.
  const c = { chiller: 200, bypass: 30, branches: [40, 40, 40, 40, 40, 40] };
  const q1 = net.steadyFlow(1, c);
  rel(net.steadyFlow(0.6, c), 0.6 * q1, 1e-12, 'flow ∝ n');
});

test('network: steady flow satisfies pump head = Σ loop losses', () => {
  const d = derive(makeConfig());
  const net = createSingleLoopNetwork(d);
  for (const c of [
    { chiller: 273, bypass: 0, branches: [50, 50, 50, 50, 50, 50] },
    { chiller: 91, bypass: 57, branches: [5, 0, 12, 0, 0, 1] },
    { chiller: 120, bypass: 0.03, branches: [0.02, 0.02, 0.02, 0.02, 0.02, 0.02] }, // near dead-head
  ]) {
    const q = net.steadyFlow(0.8, c);
    const sp = net.split(q, 0.8, c);
    rel(sp.pumpHead, sp.dpChiller + sp.dpHeader + sp.dpSys, 1e-9, 'head balance');
    rel(sp.dpSys, sp.dpMain + sp.dpBranch, 1e-9, 'distribution: main + branches');
    rel(sp.qBypass, c.bypass * Math.sqrt(sp.dpSys), 1e-9, 'bypass on dpSys');
  }
});

// --- §14 Mass balance ------------------------------------------------------

test('mass balance: Q_pump = ΣQ_branch + Q_bypass within 0.1 % every step (randomised run)', () => {
  const sim = createSim({ seed: 7 }, { layers: [chaosLayer(15)] });
  let checked = 0;
  sim.run(3 * 3600, (s) => {
    const st = s.state;
    let qb = 0;
    for (const u of st.ahus) qb += u.q;
    const err = Math.abs(st.hyd.q - (qb + st.hyd.qBypass));
    assert.ok(err <= 1e-3 * Math.max(st.hyd.q, 1), `t=${st.t}: imbalance ${err} gpm`);
    for (const u of st.ahus) assert.ok(u.q >= 0 && Number.isFinite(u.q));
    assert.ok(st.hyd.qBypass >= 0);
    checked++;
  });
  assert.equal(checked, 3 * 36000);
});

test('chiller conductance = Σ module conductances', () => {
  const sim = runningSim({}, { demand: 0.55 });
  sim.run(1200);
  const { cfg, d, state } = sim;
  let c = 0;
  for (const m of state.chiller.modules) c += d.cvModule * m.pos; // linear module valves
  rel(state.hyd.conductance.chiller, c, 1e-12);
  rel(state.hyd.dp1, (state.hyd.q / c) ** 2, 1e-9, 'DP1 from total flow and total conductance');
  assert.equal(cfg.chiller.moduleValveChar, 'linear');
});

// --- Chiller stub ------------------------------------------------------------

test('min-bypass holders: fewest modules, highest-numbered by default', () => {
  const at = (m, extra = {}) => {
    const cfg = makeConfig({ chiller: { minBypassModules: m, ...extra } });
    return Object.fromEntries(holderTargets(cfg));
  };
  assert.deepEqual(at(1.0), { 5: 1 });
  const h15 = at(1.5);
  assert.equal(h15[5], 1);
  close(h15[4], 0.5, 1e-12, 'second holder at the fraction needed');
  assert.deepEqual(at(2.0), { 5: 1, 4: 1 });
  // A small remainder never drops a holder below the parked position.
  close(at(1.1)[4], 0.2, 1e-12);
  assert.deepEqual(at(1.0, { holders: [2] }), { 2: 1 }, 'configurable holder');
  assert.deepEqual(at(1.0, { holders: 'lowest' }), { 0: 1 });

  const cfg = makeConfig();
  assert.deepEqual(moduleTargets(0, cfg), [0.2, 0.2, 0.2, 0.2, 0.2, 1]);
  assert.deepEqual(moduleTargets(2, cfg), [1, 1, 0.2, 0.2, 0.2, 1]);
  assert.deepEqual(moduleTargets(6, cfg), [1, 1, 1, 1, 1, 1]);
});

test('stub staging: ceil(load / module tons), stage-down hysteresis, clamped', () => {
  const cfg = makeConfig();
  assert.equal(stubRunningCount(0, 0, cfg), 0);
  assert.equal(stubRunningCount(59, 0, cfg), 1);
  assert.equal(stubRunningCount(61, 1, cfg), 2);
  assert.equal(stubRunningCount(59, 2, cfg), 2, 'inside hysteresis band: hold');
  assert.equal(stubRunningCount(56, 2, cfg), 1, 'below band: stage down');
  assert.equal(stubRunningCount(9999, 3, cfg), 6);
});

test('module valves travel at their stroke time, so staging does not step the flow', () => {
  const sim = runningSim({}, { demand: 1 });
  sim.run(120);
  const before = sim.state.chiller.modules.map((m) => m.pos);
  assert.ok(sim.state.chiller.nRunning > 0);
  sim.step();
  const after = sim.state.chiller.modules.map((m) => m.pos);
  for (let i = 0; i < before.length; i++) assert.ok(Math.abs(after[i] - before[i]) <= 0.1 / 30 + 1e-12);
});

test('low-flow flag below min flow; optional trip', () => {
  const sim = runningSim({}, { demand: 0.2, speed: 0.3, valve: 0.05 });
  sim.run(300);
  assert.ok(sim.state.hyd.q < sim.d.minFlow, `q=${sim.state.hyd.q}`);
  assert.equal(sim.state.chiller.lowFlow, true);

  const ok = runningSim({}, { demand: 1 });
  ok.run(600);
  assert.equal(ok.state.chiller.lowFlow, false);

  const trip = runningSim({ chiller: { tripOnLowFlow: true } }, { demand: 0.5 });
  trip.run(600);
  assert.equal(trip.state.chiller.tripped, false);
  trip.state.cmd.pumpSpeed = 0.3;
  trip.state.cmd.ahuValve.fill(0.05);
  trip.run(300);
  assert.equal(trip.state.chiller.tripped, true);
  assert.equal(trip.state.chiller.nRunning, 0);
  trip.state.inputs.chillerReset = true;
  trip.step();
  assert.equal(trip.state.chiller.tripped, false, 'reset clears the latch');
});

test('DP1 ↔ gpm equivalence uses the chiller curve', () => {
  const d = derive(makeConfig());
  const cAll = 6 * d.cvModule;
  close(dp1ToGpm(10, cAll), 864, 1e-9, 'all modules open: design flow at design DP');
  close(gpmToDp1(864, cAll), 10, 1e-9);
});

// --- Thermal / energy ----------------------------------------------------

test('steady state: chiller load equals Σ AHU delivered (within capacity and at the limit)', () => {
  const part = runningSim({}, { demand: 0.6, valve: 0.6, speed: 0.8 });
  part.run(1800);
  let dp = 0;
  for (const u of part.state.ahus) dp += u.delivered;
  assert.ok(part.state.chiller.loadTons < 300);
  rel(part.state.chiller.loadTons, dp, 0.005, 'energy balance, part load');
  close(part.state.temp.tLv, 44, 1e-9, 'LWT at setpoint within capacity');

  // Full speed, valves wide open: coils overcool past 360 t; the chiller runs
  // out of capacity, LWT floats up until the coils' delivered load matches.
  const sim = runningSim({}, { demand: 1, valve: 1, speed: 1 });
  sim.run(1800);
  const s = sim.state;
  let delivered = 0;
  for (const u of s.ahus) delivered += u.delivered;
  rel(s.chiller.loadTons, delivered, 0.005, 'energy balance');
  // Full speed, valves wide open: a little over design flow → ΔT a little under 10 °F.
  assert.ok(s.hyd.q > 864 && s.hyd.q < 1000, `q=${s.hyd.q}`);
  const dT = s.temp.tEnt - s.temp.tLv;
  assert.ok(dT > 8.5 && dT < 10, `ΔT=${dT}`);
  assert.equal(s.chiller.nRunning, 6);
  assert.ok(s.temp.tLv > 44 && s.temp.tLv < 45, `LWT floats slightly: ${s.temp.tLv}`);
});

test('bypass flow mixes supply water into the return and lowers ΔT', () => {
  const noByp = runningSim({}, { demand: 0.5, valve: 0.6, speed: 0.7, bypass: 0 });
  const withByp = runningSim({}, { demand: 0.5, valve: 0.6, speed: 0.7, bypass: 1 });
  noByp.run(1800);
  withByp.run(1800);
  const dT = (x) => x.state.temp.tEnt - x.state.temp.tLv;
  assert.ok(withByp.state.hyd.qBypass > 100);
  assert.ok(dT(withByp) < dT(noByp) * 0.8, `${dT(withByp)} vs ${dT(noByp)}`);
});

test('flow inertia: total flow follows a step with the configured time constant', () => {
  const sim = runningSim({ hydraulics: { flowTau_s: 4 }, pump: { accel_s: 0 } }, { speed: 1 });
  for (const u of sim.state.ahus) u.pos = 1; // valves already open
  for (const a of sim.state.inputs.ahu) a.enabled = false; // no load → no staging, fixed system curve
  sim.step(); // VFD jumps to 100 % on the first step (accel_s = 0)
  const qss = sim.state.hyd.qSS;
  sim.run(4 - 0.1);
  rel(sim.state.hyd.q, qss * (1 - Math.exp(-1)), 0.01, '63 % after one tau');
});

test('dead-head: everything shut, pump holds shutoff head with near-zero flow', () => {
  const sim = runningSim({}, { speed: 1, valve: 0, bypass: 0 });
  sim.run(600);
  assert.ok(sim.state.hyd.q < 10, `q=${sim.state.hyd.q}`);
  close(sim.state.hyd.pumpHead, 40, 0.1);
});

// --- §14 Determinism ---------------------------------------------------------

test('determinism: same config and seed give identical histories', () => {
  const run = () => {
    const sim = createSim({ seed: 99 }, { layers: [chaosLayer(10)] });
    sim.run(1800);
    return JSON.stringify(sim.history.toJSON());
  };
  assert.equal(run(), run());
  const other = createSim({ seed: 100 }, { layers: [chaosLayer(10)] });
  other.run(1800);
  assert.notEqual(JSON.stringify(other.history.toJSON()), run(), 'different seed → different run');
});

test('snapshot/restore: resuming from a snapshot continues identically (no step change)', () => {
  const a = createSim({ seed: 3 }, { layers: [chaosLayer(10)] });
  a.run(600);
  const snap = a.snapshot();
  const sampleAtSnap = a.sample();

  const b = createSim({}, { layers: [chaosLayer(10)] });
  b.restore(snap);
  assert.deepEqual(b.sample(), sampleAtSnap, 'state identical at the hand-over');
  a.run(300);
  b.run(300);
  assert.deepEqual(b.sample(), a.sample());
});

test('history samples at 1 s and holds at least 2 sim-hours', () => {
  const sim = runningSim();
  sim.run(10);
  assert.equal(sim.history.length, 11);
  assert.deepEqual(Array.from(sim.history.series('t')), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(sim.history.capacity >= 7200);
});
