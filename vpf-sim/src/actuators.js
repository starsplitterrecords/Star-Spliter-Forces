// Actuators (spec §6.2). Mutate small plain state objects in place.

import { clamp, lagAlpha } from './util.js';

/**
 * Valve actuator: travels at 1/stroke per second toward the command.
 * Deadband/hysteresis: a stopped actuator only starts when the command is
 * more than `deadband` away; once moving it runs until it reaches the command.
 */
export function stepValve(v, cmd, stroke_s, deadband, dt, minPos = 0, maxPos = 1) {
  const target = clamp(cmd, minPos, maxPos);
  const err = target - v.pos;
  if (!v.moving && Math.abs(err) > deadband + 1e-12) v.moving = true;
  if (v.moving) {
    const rate = stroke_s > 0 ? dt / stroke_s : Infinity;
    if (Math.abs(err) <= rate) {
      v.pos = target;
      v.moving = false;
    } else {
      v.pos += Math.sign(err) * rate;
    }
  }
  return v.pos;
}

/**
 * VFD: separate accel/decel ramps (time for 0↔100 %). When enabled the drive
 * holds at least minSpeed. A trip bypasses the ramp and the pump coasts down.
 */
export function stepVfd(p, pumpCfg, dt) {
  if (p.tripped) {
    p.speed *= 1 - lagAlpha(dt, pumpCfg.coastTau_s);
    if (p.speed < 1e-4) p.speed = 0;
    return p.speed;
  }
  const target = p.enabled ? clamp(p.speedCmd, pumpCfg.minSpeed, 1) : 0;
  const err = target - p.speed;
  const up = pumpCfg.accel_s > 0 ? dt / pumpCfg.accel_s : Infinity;
  const down = pumpCfg.decel_s > 0 ? dt / pumpCfg.decel_s : Infinity;
  p.speed += clamp(err, -down, up);
  return p.speed;
}
