// Prints a quick operating-point table so the default sizes can be eyeballed.
import { createSim } from '../src/engine.js';
const sim = createSim();
const s = sim.state;
s.inputs.pumpEnable = true;
s.cmd.pumpSpeed = 1;
const pct = [1, 0.75, 0.5, 0.25];
for (let i = 0; i < 6; i++) { s.inputs.ahu[i].enabled = true; s.inputs.ahu[i].demand = 1; }
const f = (x, n = 1) => x.toFixed(n).padStart(7);
console.log('   t   speed   Q_chi   Q_byp    DP1    DP2  dpSys   head  nRun   Tent  load   ahu0q  ahu0dT');
for (const [phase, valve, byp, spd] of [['full open', 1, 0, 1], ['valves 50%', 0.5, 0, 1], ['valves 20%, byp 100%', 0.2, 1, 0.6], ['valves 0, byp 100%', 0, 1, 0.5]]) {
  s.cmd.ahuValve.fill(valve); s.cmd.bypassPos = byp; s.cmd.pumpSpeed = spd;
  sim.run(900);
  const h = s.hyd;
  console.log(phase);
  console.log(f(s.t,0), f(s.pump.speed,2), f(h.q), f(h.qBypass), f(h.dp1), f(h.dp2), f(h.dpSys), f(h.pumpHead), f(s.chiller.nRunning,0), f(s.temp.tEnt), f(s.chiller.loadTons), f(s.ahus[0].q), f(s.ahus[0].dT));
}
console.log('derived', JSON.stringify({ ...sim.d, ahus: undefined }));
