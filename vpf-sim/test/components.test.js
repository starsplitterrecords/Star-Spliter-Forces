import test from 'node:test';
import assert from 'node:assert/strict';
import { valveFraction, valvePositionForFraction, VALVE_CHARS } from '../src/util.js';
import { History } from '../src/history.js';
import { stepValve, stepVfd } from '../src/actuators.js';
import { coil, coilPotentialTons, coilFlowForTons, mix } from '../src/thermal.js';
import { makeConfig, derive } from '../src/config.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} expected ${b}, got ${a}`);

test('valve characteristics: endpoints, monotone, invertible', () => {
  for (const c of VALVE_CHARS) {
    close(valveFraction(0, c), 0, 1e-12, `${c} @0`);
    close(valveFraction(1, c), 1, 1e-12, `${c} @1`);
    let prev = -1;
    for (let x = 0; x <= 1.0001; x += 0.05) {
      const f = valveFraction(x, c);
      assert.ok(f > prev, `${c} monotone at ${x}`);
      prev = f;
      close(valvePositionForFraction(f, c), Math.min(x, 1), 1e-9, `${c} inverse at ${x}`);
    }
  }
  // Equal-percentage is strongly non-linear: ~12 % of Cv at half travel (R = 50).
  close(valveFraction(0.5, 'equal_percentage', 50), 0.124, 0.002);
  // Leakage floor.
  close(valveFraction(0, 'linear', 50, 0.001), 0.001, 1e-12);
});

test('valve actuator: full stroke takes stroke_s; deadband holds small moves', () => {
  const v = { pos: 0, moving: false };
  let t = 0;
  while (v.pos < 1) {
    stepValve(v, 1, 90, 0, 0.1);
    t += 0.1;
  }
  close(t, 90, 0.11, 'stroke time');

  const w = { pos: 0.5, moving: false };
  stepValve(w, 0.52, 60, 0.05, 0.1);
  assert.equal(w.pos, 0.5, 'inside deadband: no move');
  for (let k = 0; k < 100; k++) stepValve(w, 0.6, 60, 0.05, 0.1);
  close(w.pos, 0.6, 1e-12, 'outside deadband: travels all the way to command');
});

test('VFD: accel and decel ramps are independent; min speed when enabled; trip coasts', () => {
  const pc = { minSpeed: 0.3, accel_s: 20, decel_s: 60, coastTau_s: 3 };
  const p = { enabled: true, tripped: false, speedCmd: 0, speed: 0 };
  for (let k = 0; k < 1000; k++) stepVfd(p, pc, 0.1);
  close(p.speed, 0.3, 1e-9, 'held at min speed with 0 % command');

  p.speedCmd = 1;
  let t = 0;
  while (p.speed < 1 - 1e-9) {
    stepVfd(p, pc, 0.1);
    t += 0.1;
  }
  close(t, 0.7 * 20, 0.11, 'accel 30→100 %');

  p.enabled = false;
  t = 0;
  while (p.speed > 1e-9) {
    stepVfd(p, pc, 0.1);
    t += 0.1;
  }
  close(t, 60, 0.11, 'decel 100→0 %');

  p.enabled = true;
  p.speed = 1;
  p.tripped = true;
  for (let k = 0; k < 30; k++) stepVfd(p, pc, 0.1);
  close(p.speed, Math.exp(-1), 0.01, 'coasts with tau 3 s, ignoring decel ramp');
});

test('coil: design point, saturation, low ΔT when overflowing', () => {
  const d = derive(makeConfig());
  const a = d.ahus[0];
  close(coilPotentialTons(a, a.designFlow_gpm), a.designTons, 1e-9, 'potential at design flow');
  close(coilPotentialTons(a, coilFlowForTons(a, 30)), 30, 1e-9, 'inverse');

  const atDesign = coil(a, 144, true, 1, 44);
  close(atDesign.delivered, 60, 1e-9);
  close(atDesign.dT, 10, 1e-9, 'design ΔT 10 °F');

  // Double the flow at the same demand: delivered capped by overcool limit, ΔT drops.
  const over = coil(a, 288, true, 1, 44);
  assert.ok(over.delivered <= 60 * a.overcoolLimit + 1e-9);
  assert.ok(over.dT < 10 * 0.7, `low ΔT expected, got ${over.dT}`);

  // Return water never warmer than entering air.
  const trickle = coil(a, 3, true, 1, 44);
  assert.ok(trickle.tRet <= a.enteringAir_F + 1e-9);

  // Fan off: no cooling, water passes through unchanged.
  const off = coil(a, 144, false, 1, 44);
  assert.equal(off.delivered, 0);
  assert.equal(off.tRet, 44);
});

test('mix: flow-weighted, falls back when there is no flow', () => {
  close(mix([[100, 40], [300, 60]], 0), 55, 1e-12);
  assert.equal(mix([[0, 40]], 51), 51);
});

test('history ring buffer wraps and returns oldest-first', () => {
  const h = new History(['x'], 5);
  for (let i = 0; i < 8; i++) h.push(i, { x: i * 10 });
  assert.equal(h.length, 5);
  assert.deepEqual(Array.from(h.series('t')), [3, 4, 5, 6, 7]);
  assert.deepEqual(Array.from(h.series('x', 2)), [60, 70]);
  assert.equal(h.latest('x'), 70);
});
