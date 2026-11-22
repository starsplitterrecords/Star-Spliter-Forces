import { createSim } from '../src/engine.js';
import { rngNext } from '../src/util.js';

/** Sim with pump running and all AHUs enabled at the given demand. */
export function runningSim(overrides = {}, { demand = 1, speed = 1, valve = 1, bypass = 0 } = {}) {
  const sim = createSim(overrides);
  const s = sim.state;
  s.inputs.pumpEnable = true;
  s.cmd.pumpSpeed = speed;
  s.cmd.bypassPos = bypass;
  for (let i = 0; i < s.inputs.ahu.length; i++) {
    s.inputs.ahu[i].enabled = true;
    s.inputs.ahu[i].demand = demand;
    s.cmd.ahuValve[i] = valve;
  }
  return sim;
}

/**
 * A layer that randomly jerks every command and input around, using the sim's
 * own seeded RNG (so runs stay deterministic). Stands in for the BMS/script
 * layers in M1 tests. Like every layer, it keeps its own state in sim.state.
 */
export function chaosLayer(every_s = 20) {
  return {
    step(sim) {
      const s = sim.state;
      if (s.t + 1e-9 < (s.chaosNext ?? 0)) return;
      s.chaosNext = s.t + every_s;
      const r = () => rngNext(s);
      s.inputs.pumpEnable = r() > 0.1;
      s.cmd.pumpSpeed = r();
      s.cmd.bypassPos = r() > 0.3 ? r() : 0;
      for (let i = 0; i < s.inputs.ahu.length; i++) {
        s.inputs.ahu[i].enabled = r() > 0.15;
        s.inputs.ahu[i].demand = r() * 1.1;
        s.cmd.ahuValve[i] = r() > 0.2 ? r() : 0;
        s.inputs.ahu[i].override = r() > 0.9 ? 1 : null;
      }
    },
  };
}
