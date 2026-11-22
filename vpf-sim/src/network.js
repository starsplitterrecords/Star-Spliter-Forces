// `network` interface (spec §12).
//
// Phase 1: a fixed single primary loop
//   pump → chiller → plant header piping → supply header
//        ├─ system bypass ───────────────────────────────┐
//        └─ distribution mains (R_pipe) → N AHU branches ─┴→ return header → pump
//
// Every element is quadratic (ΔP = R·Q²), so the loop reduces to one
// equivalent resistance and the steady flow is closed-form. Phase 3 replaces
// this object with a node/edge solver exposing the same two methods.
//
// Interface:
//   steadyFlow(speed, c)  → steady total flow for the current conductances
//   split(q, speed, c)    → all branch flows and pressures for a given total flow
//   pumpHead(speed, q)    → pump curve
// where c = { chiller, bypass, branches: [] } are conductances (gpm/√psi).
//
// DP2 is taken as the ΔP across the AHU branches, i.e. ΔP_sys − R_pipe·Q_dist²
// (spec §6.4). Branches see DP2, which keeps DP2 physically meaningful as
// "what the AHUs actually get".

import { conductanceToResistance, resistanceToConductance } from './util.js';

export function createSingleLoopNetwork(d) {
  const { H0, Kp, rHeader, rMain } = d;

  function pumpHead(speed, q) {
    return H0 * speed * speed - Kp * q * q;
  }

  function reduce(c) {
    let cBr = 0;
    for (const x of c.branches) cBr += x;
    // Distribution leg: mains in series with the parallel branch bank.
    const cDist = cBr > 0 ? resistanceToConductance(rMain + 1 / (cBr * cBr)) : 0;
    const cPar = c.bypass + cDist; // bypass ∥ distribution
    const rLoop =
      conductanceToResistance(c.chiller) + rHeader + conductanceToResistance(cPar);
    return { cBr, cDist, cPar, rLoop };
  }

  function steadyFlow(speed, c) {
    if (speed <= 0) return 0;
    const { rLoop } = reduce(c);
    if (rLoop === Infinity) return 0;
    // H0·n² − Kp·Q² = rLoop·Q²
    return speed * Math.sqrt(H0 / (Kp + rLoop));
  }

  function split(q, speed, c) {
    const { cBr, cDist, cPar } = reduce(c);
    const dpSys = cPar > 0 ? (q / cPar) ** 2 : 0; // supply→return header ΔP
    const sq = Math.sqrt(dpSys);
    const qBypass = c.bypass * sq;
    const qDist = q - qBypass; // exact mass balance at the header tee
    const dpBranch = cBr > 0 ? (qDist / cBr) ** 2 : dpSys;
    const sb = Math.sqrt(dpBranch);
    const qBranches = c.branches.map((x) => x * sb);
    return {
      q,
      qBypass,
      qDist,
      qBranches,
      dpSys,
      dpBranch, // true DP2
      dpMain: rMain * qDist * qDist,
      dpChiller: c.chiller > 0 ? (q / c.chiller) ** 2 : 0, // true DP1
      dpHeader: rHeader * q * q,
      pumpHead: pumpHead(speed, q),
      cDist,
    };
  }

  return { kind: 'single-loop', pumpHead, steadyFlow, split };
}
