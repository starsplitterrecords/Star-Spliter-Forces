// `chillerModel` interface (spec §12), phase 1 stub (spec §7).
//
//   init(cfg, d)                      → chiller state (plain JSON)
//   step(ch, inputs, cfg, d, dt)      → { conductance_total, q_min, ... }
//        inputs: { loadTons }   (measured chiller load from the previous step)
//        moves module valves toward their targets and returns the hydraulic face
//   outlet(ch, inputs, cfg, d, dt)    → { T_lv, loadTons, capacityTons, ... }
//        inputs: { q, tEnt }
//        the thermal face. Phase 2 swaps in LWT staging and mixes unconditioned
//        holder-module water into T_lv here (see mixLeaving).
//
// Assumptions (spec §16.1, §16.3, to confirm):
//  - Modules are parallel flow paths; chiller conductance = Σ module Cv.
//  - No module starts while flow is below minimum (flow-proven interlock); a
//    low-flow trip (if enabled) needs the condition to persist lowFlowTripDelay_s.
//    A trip latches until inputs.chillerReset.
//  - Holders are a fixed set of modules that always hold the internal minimum
//    bypass, whether or not they are running. Running modules are staged from
//    the other end and open to 100 %. Everyone else sits at the parked position.

import { clamp, lagAlpha, valveFraction, valvePositionForFraction, WATER_K, BTUH_PER_TON } from './util.js';

export function holderTargets(cfg) {
  const ch = cfg.chiller;
  const n = ch.nModules;
  let order;
  if (Array.isArray(ch.holders)) order = ch.holders.slice();
  else if (ch.holders === 'lowest') order = [...Array(n).keys()];
  else order = [...Array(n).keys()].reverse();

  const m = clamp(ch.minBypassModules, 0, n);
  const targets = new Map(); // module index → position
  let remaining = m;
  for (const idx of order) {
    if (remaining <= 1e-9) break;
    const frac = Math.min(1, remaining);
    const pos = valvePositionForFraction(frac, ch.moduleValveChar, ch.moduleValveRangeability);
    targets.set(idx, Math.max(pos, ch.parkedPos));
    remaining -= frac;
  }
  return targets;
}

function stagingOrder(cfg) {
  const n = cfg.chiller.nModules;
  const idx = [...Array(n).keys()];
  return cfg.chiller.stagingOrder === 'highest' ? idx.reverse() : idx;
}

/** Stub staging rule: ceil(load / module capacity) with stage-down hysteresis. */
export function stubRunningCount(loadTons, current, cfg) {
  const { moduleTons, nModules, stagingHysteresis } = cfg.chiller;
  const want = Math.ceil(loadTons / moduleTons - 1e-9);
  let n = current;
  if (want > n) n = want;
  else if (loadTons < (n - 1 - stagingHysteresis) * moduleTons) n = want;
  return clamp(n, 0, nModules);
}

export function moduleTargets(nRunning, cfg) {
  const ch = cfg.chiller;
  const pos = new Array(ch.nModules).fill(ch.parkedPos);
  for (const [i, p] of holderTargets(cfg)) pos[i] = p;
  const order = stagingOrder(cfg);
  for (let k = 0; k < nRunning; k++) pos[order[k]] = 1;
  return pos;
}

export const chillerStub = {
  kind: 'stub',

  init(cfg) {
    const ch = cfg.chiller;
    const target = moduleTargets(0, cfg);
    return {
      loadFiltered: 0,
      nRunning: 0,
      modules: target.map((p, i) => ({ pos: p, target: p, running: false, holder: false, index: i })),
      conductance: 0,
      lowFlow: false,
      lowFlowTimer: 0,
      tripped: false,
      T_lv: ch.lwtSetpoint_F,
      loadTons: 0,
    };
  },

  step(chs, inputs, cfg, d, dt) {
    const ch = cfg.chiller;
    chs.loadFiltered += (inputs.loadTons - chs.loadFiltered) * lagAlpha(dt, ch.stagingLoadTau_s);
    if (chs.tripped) chs.nRunning = 0;
    else {
      const want = stubRunningCount(chs.loadFiltered, chs.nRunning, cfg);
      // Flow-proven interlock: no new module starts while flow is below minimum.
      chs.nRunning = want > chs.nRunning && chs.lowFlow ? chs.nRunning : want;
    }

    const target = moduleTargets(chs.nRunning, cfg);
    const holders = holderTargets(cfg);
    const order = stagingOrder(cfg);
    const running = new Set(order.slice(0, chs.nRunning));
    const rate = ch.moduleValveStroke_s > 0 ? dt / ch.moduleValveStroke_s : 1;

    let c = 0;
    for (let i = 0; i < ch.nModules; i++) {
      const m = chs.modules[i];
      m.target = target[i];
      m.running = running.has(i);
      m.holder = holders.has(i);
      const err = m.target - m.pos;
      m.pos += clamp(err, -rate, rate);
      c += d.cvModule * valveFraction(m.pos, ch.moduleValveChar, ch.moduleValveRangeability, 0);
    }
    chs.conductance = c;
    return { conductance_total: c, q_min: d.minFlow, nRunning: chs.nRunning };
  },

  outlet(chs, inputs, cfg, d, dt) {
    const ch = cfg.chiller;
    const capacityTons = chs.tripped ? 0 : ch.nModules * ch.moduleTons;
    const q = inputs.q;
    let T = ch.lwtSetpoint_F;
    if (q > 1e-6) {
      const needTons = (WATER_K * q * (inputs.tEnt - T)) / BTUH_PER_TON;
      if (needTons > capacityTons) {
        // Out of capacity: leaving temperature rises.
        T = inputs.tEnt - (capacityTons * BTUH_PER_TON) / (WATER_K * q);
      }
    } else {
      T = chs.T_lv; // no flow: hold
    }
    T = mixLeaving(T, chs, inputs, cfg);
    const loadTons = q > 1e-6 ? Math.max(0, (WATER_K * q * (inputs.tEnt - T)) / BTUH_PER_TON) : 0;
    chs.T_lv = T;
    chs.loadTons = loadTons;
    chs.lowFlow = q < d.minFlow;
    chs.lowFlowTimer = chs.lowFlow && chs.nRunning > 0 ? chs.lowFlowTimer + dt : 0;
    if (ch.tripOnLowFlow && chs.lowFlowTimer >= ch.lowFlowTripDelay_s) chs.tripped = true;
    return { T_lv: T, loadTons, capacityTons, lowFlow: chs.lowFlow };
  },
};

/**
 * Phase 2 hook: water through idle holder/parked modules is unconditioned and
 * mixes into the leaving header. Phase 1 assumes ideal LWT, so this is identity.
 */
export function mixLeaving(T_conditioned /*, chs, inputs, cfg */) {
  return T_conditioned;
}

/** Equivalent chiller flow for a DP1 value, using the chiller's current curve. */
export function dp1ToGpm(dp1, conductance) {
  return conductance * Math.sqrt(Math.max(0, dp1));
}

export function gpmToDp1(q, conductance) {
  return conductance > 0 ? (q / conductance) ** 2 : Infinity;
}
