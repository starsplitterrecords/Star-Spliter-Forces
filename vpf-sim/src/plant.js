// Plant layer (spec §6): actuators, chiller stub, hydraulics, light thermal.
// One call = one fixed physics step. Reads state.inputs (script) and
// state.cmd (controllers); writes everything else. No DOM.

import { lagAlpha, valveFraction, seriesConductance, conductanceToResistance } from './util.js';
import { stepValve, stepVfd } from './actuators.js';
import { coil, mix, segmentTau } from './thermal.js';

export function initPlantState(cfg, d, chillerModel) {
  const T0 = cfg.chiller.lwtSetpoint_F;
  const n = cfg.ahu.count;
  return {
    inputs: {
      pumpEnable: false,
      pumpTrip: false,
      chillerReset: false,
      ahu: Array.from({ length: n }, () => ({ enabled: false, demand: 0, override: null })),
    },
    cmd: {
      pumpSpeed: cfg.pump.minSpeed,
      bypassPos: 0,
      ahuValve: new Array(n).fill(0),
    },
    pump: { enabled: false, tripped: false, speedCmd: 0, speed: 0 },
    bypass: { pos: 0, moving: false },
    ahus: Array.from({ length: n }, () => ({
      pos: 0,
      moving: false,
      q: 0,
      delivered: 0,
      potential: 0,
      dT: 0,
      tRet: T0,
    })),
    chiller: chillerModel.init(cfg, d),
    hyd: {
      q: 0,
      qSS: 0,
      qBypass: 0,
      qDist: 0,
      dpSys: 0,
      dp1: 0,
      dp2: 0,
      dpMain: 0,
      dpHeader: 0,
      pumpHead: 0,
      conductance: { chiller: 0, bypass: 0, branches: new Array(n).fill(0) },
    },
    temp: { tLv: T0, tSupAhu: T0, tRetMix: T0, tEnt: T0 },
  };
}

export function stepPlant(s, cfg, d, chillerModel, network, dt) {
  const inp = s.inputs;

  // --- 1. Actuators ---------------------------------------------------------
  const p = s.pump;
  p.enabled = !!inp.pumpEnable;
  if (inp.pumpTrip) p.tripped = true;
  else if (p.tripped && !inp.pumpTrip) p.tripped = false; // reset clears the trip
  p.speedCmd = s.cmd.pumpSpeed;
  stepVfd(p, cfg.pump, dt);

  const bc = cfg.bypass;
  stepValve(s.bypass, s.cmd.bypassPos, bc.stroke_s, bc.deadband, dt);

  const cBranches = s.hyd.conductance.branches;
  for (let i = 0; i < d.ahus.length; i++) {
    const a = d.ahus[i];
    const u = s.ahus[i];
    const ov = inp.ahu[i].override;
    const cmd = ov !== null && ov !== undefined ? ov : s.cmd.ahuValve[i];
    stepValve(u, cmd, a.stroke_s, a.deadband, dt);
    const cv = a.cvMax * valveFraction(u.pos, a.valveChar, a.rangeability, a.leakage);
    cBranches[i] = seriesConductance(conductanceToResistance(cv), a.rCoil);
  }

  // --- 2. Chiller hydraulic face -------------------------------------------
  if (inp.chillerReset) {
    s.chiller.tripped = false;
    inp.chillerReset = false;
  }
  const chOut = chillerModel.step(s.chiller, { loadTons: s.chiller.loadTons }, cfg, d, dt);
  const c = s.hyd.conductance;
  c.chiller = chOut.conductance_total;
  c.bypass = d.cvBypass * valveFraction(s.bypass.pos, bc.char, bc.rangeability, bc.leakage);

  // --- 3. Hydraulics: steady target, inertia lag, split --------------------
  const h = s.hyd;
  h.qSS = network.steadyFlow(p.speed, c);
  h.q += (h.qSS - h.q) * lagAlpha(dt, cfg.hydraulics.flowTau_s);
  if (h.q < 1e-9) h.q = 0;
  const sp = network.split(h.q, p.speed, c);
  h.qBypass = sp.qBypass;
  h.qDist = sp.qDist;
  h.dpSys = sp.dpSys;
  h.dp1 = sp.dpChiller;
  h.dp2 = sp.dpBranch;
  h.dpMain = sp.dpMain;
  h.dpHeader = sp.dpHeader;
  h.pumpHead = sp.pumpHead;

  // --- 4. Thermal ------------------------------------------------------------
  const tc = cfg.thermal;
  const T = s.temp;
  const tauSup = segmentTau(tc.supplyTau_s, sp.qDist, d.distDesignFlow, tc.maxTauStretch);
  T.tSupAhu += (T.tLv - T.tSupAhu) * lagAlpha(dt, tauSup);

  const streams = [[sp.qBypass, T.tLv]];
  for (let i = 0; i < d.ahus.length; i++) {
    const u = s.ahus[i];
    const ai = inp.ahu[i];
    u.q = sp.qBranches[i];
    const r = coil(d.ahus[i], u.q, ai.enabled, ai.demand, T.tSupAhu);
    u.delivered = r.delivered;
    u.potential = r.potential;
    u.dT = r.dT;
    u.tRet = r.tRet;
    streams.push([u.q, u.tRet]);
  }
  T.tRetMix = mix(streams, T.tRetMix);
  const tauRet = segmentTau(tc.returnTau_s, h.q, d.chillerDesignFlow, tc.maxTauStretch);
  T.tEnt += (T.tRetMix - T.tEnt) * lagAlpha(dt, tauRet);

  const th = chillerModel.outlet(s.chiller, { q: h.q, tEnt: T.tEnt }, cfg, d, dt);
  T.tLv = th.T_lv;
}

/** Flat snapshot of the plant for history/detectors. */
export function samplePlant(s, d) {
  const out = {
    pump_speed: s.pump.speed,
    pump_head: s.hyd.pumpHead,
    q_pump: s.hyd.q,
    q_chiller: s.hyd.q,
    q_bypass: s.hyd.qBypass,
    q_dist: s.hyd.qDist,
    byp_pos: s.bypass.pos,
    dp1: s.hyd.dp1,
    dp2: s.hyd.dp2,
    dp_sys: s.hyd.dpSys,
    t_lv: s.temp.tLv,
    t_sup_ahu: s.temp.tSupAhu,
    t_ret: s.temp.tRetMix,
    t_ent: s.temp.tEnt,
    sys_dt: s.temp.tEnt - s.temp.tLv,
    chiller_load: s.chiller.loadTons,
    chiller_c: s.hyd.conductance.chiller,
    n_running: s.chiller.nRunning,
    low_flow: s.chiller.lowFlow ? 1 : 0,
  };
  for (let i = 0; i < d.ahus.length; i++) {
    const u = s.ahus[i];
    out[`ahu${i}_valve`] = u.pos;
    out[`ahu${i}_q`] = u.q;
    out[`ahu${i}_delivered`] = u.delivered;
    out[`ahu${i}_demand`] = s.inputs.ahu[i].demand * d.ahus[i].designTons;
  }
  return out;
}

export function plantChannels(d) {
  return Object.keys(samplePlant(fakeState(d), d));
}

function fakeState(d) {
  const n = d.ahus.length;
  return {
    pump: {},
    hyd: { conductance: {} },
    bypass: {},
    temp: {},
    chiller: {},
    inputs: { ahu: Array.from({ length: n }, () => ({ demand: 0 })) },
    ahus: Array.from({ length: n }, () => ({})),
  };
}
