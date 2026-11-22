// Shared helpers. Pure functions, no DOM.
// Units throughout: gpm, psi, °F, tons. 1 psi = 2.31 ft of water.

export const PSI_TO_FT = 2.31;
export const BTUH_PER_TON = 12000;
export const WATER_K = 500; // BTU/h per (gpm·°F), water

export function clamp(x, lo, hi) {
  return x < lo ? lo : x > hi ? hi : x;
}

/** Exact discretisation of a first-order lag: fraction to move this step. */
export function lagAlpha(dt, tau) {
  return tau > 0 ? 1 - Math.exp(-dt / tau) : 1;
}

/**
 * Deterministic RNG (mulberry32). The generator state is a single uint32
 * kept in the sim state object, so snapshot/restore reproduces runs exactly.
 */
export function rngNext(holder) {
  let a = (holder.rng = (holder.rng + 0x6d2b79f5) >>> 0);
  a = Math.imul(a ^ (a >>> 15), a | 1);
  a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}

/** Standard normal from the same stream (Box-Muller, one value per call). */
export function rngGauss(holder) {
  const u = Math.max(rngNext(holder), 1e-12);
  const v = rngNext(holder);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ---------------------------------------------------------------------------
// Valve characteristics. pos and the returned fraction are both 0..1.
// Fraction = Cv(pos)/Cv_max. Equal-percentage uses (R^x − 1)/(R − 1) so it
// shuts off at 0 instead of leaking 1/R. A separate leakage term keeps the
// hydraulic solve finite when everything is shut (dead-head).
// ---------------------------------------------------------------------------

export const VALVE_CHARS = ['linear', 'equal_percentage', 'quick_opening'];

export function valveFraction(pos, char = 'linear', rangeability = 50, leakage = 0) {
  const x = clamp(pos, 0, 1);
  let f;
  switch (char) {
    case 'equal_percentage':
      f = (Math.pow(rangeability, x) - 1) / (rangeability - 1);
      break;
    case 'quick_opening':
      f = Math.sqrt(x);
      break;
    case 'linear':
      f = x;
      break;
    default:
      throw new Error(`unknown valve characteristic: ${char}`);
  }
  return leakage + (1 - leakage) * f;
}

/** Position that gives the requested Cv fraction (ignores leakage). */
export function valvePositionForFraction(f, char = 'linear', rangeability = 50) {
  const y = clamp(f, 0, 1);
  switch (char) {
    case 'equal_percentage':
      return Math.log(1 + y * (rangeability - 1)) / Math.log(rangeability);
    case 'quick_opening':
      return y * y;
    case 'linear':
      return y;
    default:
      throw new Error(`unknown valve characteristic: ${char}`);
  }
}

// Hydraulic element algebra. Every element obeys Q = C·sqrt(ΔP)
// (C in gpm/sqrt(psi), i.e. Cv for water). Resistance R = 1/C², ΔP = R·Q².

export function conductanceToResistance(c) {
  return c > 0 ? 1 / (c * c) : Infinity;
}

export function resistanceToConductance(r) {
  return r === Infinity ? 0 : r > 0 ? 1 / Math.sqrt(r) : Infinity;
}

/** Conductance of elements in series, given their resistances. */
export function seriesConductance(...resistances) {
  let r = 0;
  for (const x of resistances) r += x;
  return resistanceToConductance(r);
}

export function deepClone(x) {
  return JSON.parse(JSON.stringify(x));
}

export function isPlainObject(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

/** Recursive merge; arrays and scalars in `over` replace those in `base`. */
export function deepMerge(base, over) {
  if (over === undefined) return deepClone(base);
  if (!isPlainObject(base) || !isPlainObject(over)) return deepClone(over);
  const out = deepClone(base);
  for (const k of Object.keys(over)) {
    out[k] = k in out ? deepMerge(out[k], over[k]) : deepClone(over[k]);
  }
  return out;
}
