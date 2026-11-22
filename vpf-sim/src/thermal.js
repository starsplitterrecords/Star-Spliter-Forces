// Light thermal model (spec §6.3). Pure functions.
//
// Coil capacity at water flow Q, for design air-side conditions:
//   potential = drive · designTons · (1 − e^(−k·Q/Qd)) / (1 − e^(−k))
// where drive = (T_air − T_sup)/(T_air − T_sup,design), so warm supply water
// (chiller out of capacity) cuts what the coils can do.
// Delivered cooling is the smallest of:
//   - potential (what the coil can do with this flow),
//   - demand · designTons · overcoolLimit (the air side can only be overcooled so far),
//   - Q·500·(T_air − T_sup) (return water cannot get warmer than entering air).
// So flow beyond what the load needs raises Q without raising delivered
// cooling: coil ΔT falls (low ΔT syndrome).

import { WATER_K, BTUH_PER_TON } from './util.js';

export function coilPotentialTons(a, q, tSup = a.designSupply_F) {
  const k = a.k;
  const drive = Math.max(0, (a.enteringAir_F - tSup) / (a.enteringAir_F - a.designSupply_F));
  return (drive * a.designTons * (1 - Math.exp((-k * q) / a.designFlow_gpm))) / (1 - Math.exp(-k));
}

/** Flow at which the coil's potential equals `tons` at design supply temperature. */
export function coilFlowForTons(a, tons) {
  const k = a.k;
  const y = (tons / a.designTons) * (1 - Math.exp(-k));
  if (y >= 1) return Infinity;
  return (-a.designFlow_gpm / k) * Math.log(1 - y);
}

export function coil(a, q, enabled, demand, tSup) {
  if (!enabled || q <= 1e-6) {
    return { delivered: 0, potential: q > 0 ? coilPotentialTons(a, q, tSup) : 0, dT: 0, tRet: tSup };
  }
  const potential = coilPotentialTons(a, q, tSup);
  const airLimit = Math.max(0, (q * WATER_K * (a.enteringAir_F - tSup)) / BTUH_PER_TON);
  const demandLimit = Math.max(0, demand) * a.designTons * a.overcoolLimit;
  const delivered = Math.min(potential, airLimit, demandLimit);
  const dT = (delivered * BTUH_PER_TON) / (WATER_K * q);
  return { delivered, potential, dT, tRet: tSup + dT };
}

/** Flow-weighted mix. streams: [[q, T], ...]. Returns `fallback` if no flow. */
export function mix(streams, fallback) {
  let qs = 0;
  let qt = 0;
  for (const [q, T] of streams) {
    if (q > 0) {
      qs += q;
      qt += q * T;
    }
  }
  return qs > 1e-9 ? qt / qs : fallback;
}

/**
 * Lag factor for a pipe segment: tau is given at design flow and stretches
 * as flow drops (transport time ∝ 1/Q), capped. Phase 3 replaces this with a
 * real transport delay.
 */
export function segmentTau(tauDesign, q, qDesign, maxStretch) {
  if (q <= 1e-6) return Infinity; // no flow → temperature holds
  return tauDesign * Math.min(maxStretch, Math.max(1, qDesign / q));
}
