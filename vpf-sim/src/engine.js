// Simulation engine (spec §5). Headless; the UI drives it with run()/step().
//
//   const sim = createSim(configOverrides, { layers: [bms, script, ...] });
//   sim.run(600);             // advance 600 s of sim time
//   sim.history.series('q_chiller');
//
// Per step: each layer's step(sim, dt) runs in order (script writes inputs,
// BMS writes commands — added in M2/M4), then the plant advances one fixed
// dt. History is sampled every history.interval_s of sim time.
//
// All mutable run state lives in sim.state (plain JSON, including the RNG),
// so snapshot()/restore() reproduce runs exactly and Scenario → Sandbox can
// hand over state with no step change.

import { makeConfig, derive } from './config.js';
import { chillerStub } from './chiller.js';
import { createSingleLoopNetwork } from './network.js';
import { initPlantState, stepPlant, samplePlant, plantChannels } from './plant.js';
import { History } from './history.js';
import { deepClone } from './util.js';

export function createSim(overrides = {}, opts = {}) {
  const chillerModel = opts.chillerModel || chillerStub;
  const networkFactory = opts.networkFactory || createSingleLoopNetwork;
  const layers = opts.layers || [];

  const sim = {
    cfg: null,
    d: null,
    network: null,
    chillerModel,
    layers,
    state: null,
    history: null,
    sampleExtras: [], // functions (sim) → {channel: value}, e.g. sensed values in M2

    /** Replace the config, keeping plant state (sandbox live edits). */
    setConfig(cfg) {
      sim.cfg = cfg;
      sim.d = derive(cfg);
      sim.network = networkFactory(sim.d);
      sim.stepsPerSample = Math.max(1, Math.round(cfg.history.interval_s / cfg.dt));
    },

    reset() {
      const cfg = sim.cfg;
      sim.state = {
        t: 0,
        steps: 0,
        rng: cfg.seed >>> 0,
        ...initPlantState(cfg, sim.d, chillerModel),
      };
      for (const l of layers) if (l.reset) l.reset(sim);
      sim.history = new History(sim.channels(), Math.ceil(cfg.history.capacity_s / cfg.history.interval_s) + 1);
      sim.record();
    },

    channels() {
      const ch = plantChannels(sim.d);
      for (const f of sim.sampleExtras) ch.push(...Object.keys(f(sim)));
      return ch;
    },

    sample() {
      const out = samplePlant(sim.state, sim.d);
      for (const f of sim.sampleExtras) Object.assign(out, f(sim));
      return out;
    },

    record() {
      sim.history.push(sim.state.t, sim.sample());
    },

    step() {
      const s = sim.state;
      const dt = sim.cfg.dt;
      for (const l of layers) l.step(sim, dt);
      stepPlant(s, sim.cfg, sim.d, chillerModel, sim.network, dt);
      s.steps++;
      s.t = s.steps * dt; // integer step count avoids float drift in the clock
      if (s.steps % sim.stepsPerSample === 0) sim.record();
      for (const l of layers) if (l.afterStep) l.afterStep(sim, dt);
    },

    run(seconds, onStep) {
      const n = Math.round(seconds / sim.cfg.dt);
      for (let k = 0; k < n; k++) {
        sim.step();
        if (onStep) onStep(sim);
      }
    },

    snapshot() {
      return { cfg: deepClone(sim.cfg), state: deepClone(sim.state) };
    },

    restore(snap) {
      sim.setConfig(deepClone(snap.cfg));
      sim.state = deepClone(snap.state);
    },
  };

  sim.setConfig(makeConfig(overrides));
  sim.reset();
  return sim;
}
