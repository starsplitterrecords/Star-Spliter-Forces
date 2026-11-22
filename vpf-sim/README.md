# VPF Modular Chiller Simulator

Training simulator for variable-primary-flow modular chiller plants. Spec:
`SPEC_phase1.md` (kept outside the repo). The final deliverable is one offline
HTML file. This folder holds the headless engine and its tests.

Status: **M1 done** (engine, hydraulics, chiller stub, headless tests).
Next: M2 (BMS controllers, scheduler, sensors).

## Run

```
npm test          # Node 18+; no dependencies
npm run smoke     # prints operating points for the default sizes
```

## Layout

| File | Layer |
|---|---|
| `src/engine.js` | `createSim()`: fixed 0.1 s step, layer pipeline, 1 s history, snapshot/restore |
| `src/plant.js` | one physics step: actuators → chiller → hydraulics → thermal |
| `src/network.js` | `network` interface; phase 1 single-loop, closed-form solve |
| `src/chiller.js` | `chillerModel` interface; phase 1 stub (holders, parked valves, ceil staging) |
| `src/thermal.js` | coil saturation, mixing, segment lags |
| `src/actuators.js` | valve stroke and deadband, VFD accel/decel and trip coast |
| `src/config.js` | defaults (illustrative sizes) and derived solver coefficients |
| `src/history.js` | ring buffer, one Float64Array per channel |

Rules the code relies on:
- `state.inputs` is written only by the script layer, and `state.cmd` only by
  controllers. The plant writes everything else.
- Every layer keeps its mutable state in `sim.state`, which is plain JSON and
  includes the RNG. That's what makes snapshot/restore and Scenario → Sandbox
  hand-over exact.

## Modelling decisions in M1 (for review)

1. **Branches see DP2.** The distribution mains (`R_pipe`) are in series with
   the AHU bank, so DP2 = ΔP_sys − R_pipe·Q_dist² is also what the AHUs get.
   The spec formula `Q_i = sqrt(ΔP_sys/R_i)` would make DP2 a reading no AHU
   experiences.
2. **Closed-form hydraulics.** Every element is quadratic, so the loop solves
   exactly with no bisection. Phase 3's node network goes behind the same
   `network` interface.
3. **Coil "demand_cap" means design coil capacity.** Delivered cooling =
   min(flow-saturated capacity, demand × overcool limit, air-temperature limit).
   Capacity also scales with (T_air − T_supply), so warm supply water reduces
   it. The AHU loop (M2) will drive valves on delivered vs demand.
4. **Holders always hold.** The min-bypass holder modules (highest-numbered by
   default) keep their position whether or not they run. Running modules stage
   from module 1 and open to 100 %. All other modules sit at the parked
   position.
5. **Staging stub additions.** The spec rule `ceil(load/capacity)` uses a 60 s
   filtered load, plus 5 % stage-down hysteresis to stop chatter. A
   flow-proven interlock stops a module starting while flow is below minimum.
   An optional low-flow trip has a 10 s debounce and latches until
   `inputs.chillerReset`.
6. **Equal-percentage valves shut off** via (R^x − 1)/(R − 1), with a separate
   small leakage term so dead-head solves stay finite.
7. **Temperature lags stretch at low flow** (tau ∝ 1/Q, capped at 10×) and hold
   at zero flow.

Default sizes (6 × 144 gpm / 60 t modules, 10 psi module ΔP, 40 psi shutoff
pump, 10 psi DP2 design) are placeholders pending §16.4.
