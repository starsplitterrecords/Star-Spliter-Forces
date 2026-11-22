// Default plant configuration and derivation of solver coefficients.
//
// The config object is plain JSON (exportable/importable). Anything the
// solver needs that follows from it lives in `derive(cfg)`, which is
// recomputed whenever the config changes. Sizes are ILLUSTRATIVE
// placeholders (spec §16.4), to be replaced with representative values.

import { deepMerge } from './util.js';

export const DEFAULTS = {
  seed: 12345,
  dt: 0.1, // s, fixed physics step
  history: { interval_s: 1, capacity_s: 8 * 3600 },

  hydraulics: {
    flowTau_s: 4, // first-order lag on total flow (fluid inertia)
  },

  pump: {
    // H = H0·n² − Kp·Q². Defined by two points on the full-speed curve.
    shutoffHead_psi: 40,
    designFlow_gpm: null, // null → chiller design flow (modules × module flow)
    designHead_psi: 32,
    minSpeed: 0.3, // fraction; enforced by the VFD whenever enabled
    accel_s: 30, // 0 → 100 % speed
    decel_s: 30, // 100 → 0 % speed
    coastTau_s: 3, // speed decay after a trip
  },

  chiller: {
    nModules: 6,
    moduleFlow_gpm: 144, // design flow per module (10 °F ΔT, 60 tons)
    moduleDp_psi: 10, // module ΔP at design flow, valve 100 % open
    moduleTons: 60,
    moduleValveChar: 'linear',
    moduleValveRangeability: 50,
    moduleValveStroke_s: 30,
    parkedPos: 0.2, // valve position of non-running modules
    minBypassModules: 1.0, // internal min bypass, in modules' worth of flow
    holders: 'highest', // 'highest' | 'lowest' | [module indices, 0-based, in fill order]
    stagingOrder: 'lowest', // which modules start first: 'lowest' | 'highest'
    stagingLoadTau_s: 60, // filter on measured load used by the stub's staging
    stagingHysteresis: 0.05, // stage down only below (n−1−h)·capacity
    minFlow_gpm: null, // null → one module's design flow
    tripOnLowFlow: false,
    lowFlowTripDelay_s: 10, // low flow must persist this long to trip
    lwtSetpoint_F: 44,
  },

  bypass: {
    // Cv = sizeModules · moduleFlow / sqrt(dpRef). Default: one module's worth
    // plus 25 % margin at the design distribution ΔP.
    sizeModules: 1.25,
    dpRef_psi: null, // null → distribution.dp2Design_psi
    char: 'linear',
    rangeability: 50,
    stroke_s: 60,
    deadband: 0, // fraction of stroke
    leakage: 0.0005,
  },

  distribution: {
    designFlow_gpm: null, // null → chiller design flow
    headerLossAtDesign_psi: 2, // plant-room piping in series with chiller
    mainLossAtDesign_psi: 8, // supply+return mains to the remote end (R_pipe)
    dp2Design_psi: 10, // ΔP available across the AHU branches at design
  },

  ahu: {
    count: 6,
    defaults: {
      designFlow_gpm: 144,
      designTons: 60,
      coilDp_psi: 5, // coil + branch piping ΔP at design flow
      valveDp_psi: 3, // valve ΔP at design flow, 100 % open (sets Cv)
      valveChar: 'equal_percentage',
      rangeability: 50,
      stroke_s: 90,
      deadband: 0,
      leakage: 0.0005,
      k: 3, // coil saturation constant (spec §6.3)
      enteringAir_F: 78, // return water cannot exceed this
      designSupply_F: 44, // supply temp the design capacity is rated at
      overcoolLimit: 1.3, // delivered can overshoot demand by this factor
    },
    units: [], // per-AHU partial overrides, by index
  },

  thermal: {
    supplyTau_s: 15, // plant → AHUs, at design flow (longer at low flow)
    returnTau_s: 20, // AHUs → chiller, at design flow
    maxTauStretch: 10, // cap on lag stretching at low flow
  },
};

export function makeConfig(overrides = {}) {
  return deepMerge(DEFAULTS, overrides);
}

/** Per-AHU config with defaults applied. */
export function ahuConfigs(cfg) {
  const out = [];
  for (let i = 0; i < cfg.ahu.count; i++) {
    out.push({ ...cfg.ahu.defaults, ...(cfg.ahu.units[i] || {}) });
  }
  return out;
}

/** Solver coefficients derived from the config. Recompute on any change. */
export function derive(cfg) {
  const ch = cfg.chiller;
  const chillerDesignFlow = ch.nModules * ch.moduleFlow_gpm;
  const distFlow = cfg.distribution.designFlow_gpm ?? chillerDesignFlow;
  const pumpFlow = cfg.pump.designFlow_gpm ?? chillerDesignFlow;

  const H0 = cfg.pump.shutoffHead_psi;
  const Kp = (H0 - cfg.pump.designHead_psi) / (pumpFlow * pumpFlow);
  if (!(Kp > 0)) throw new Error('pump: designHead must be below shutoffHead');

  const dpRef = cfg.bypass.dpRef_psi ?? cfg.distribution.dp2Design_psi;

  const ahus = ahuConfigs(cfg).map((a) => ({
    ...a,
    cvMax: a.designFlow_gpm / Math.sqrt(a.valveDp_psi),
    rCoil: a.coilDp_psi / (a.designFlow_gpm * a.designFlow_gpm),
  }));

  return {
    chillerDesignFlow,
    cvModule: ch.moduleFlow_gpm / Math.sqrt(ch.moduleDp_psi),
    minFlow: ch.minFlow_gpm ?? ch.moduleFlow_gpm,
    H0,
    Kp,
    pumpMaxFlow: Math.sqrt(H0 / Kp),
    rHeader: cfg.distribution.headerLossAtDesign_psi / (distFlow * distFlow),
    rMain: cfg.distribution.mainLossAtDesign_psi / (distFlow * distFlow),
    distDesignFlow: distFlow,
    cvBypass: (cfg.bypass.sizeModules * ch.moduleFlow_gpm) / Math.sqrt(dpRef),
    ahus,
  };
}
