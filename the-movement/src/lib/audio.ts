// Tiny original WebAudio sound effects (synthesized; no external assets). Never autoplays:
// the AudioContext is created lazily after a user gesture.
type Sfx = 'dispatch' | 'milestone' | 'zealot' | 'outpost' | 'news' | 'victory' | 'schism' | 'upgrade' | 'click';

let ctx: AudioContext | null = null;
let enabled = true;
let musicOn = false;
let musicNodes: { osc: OscillatorNode[]; gain: GainNode } | null = null;

export function setSound(on: boolean) {
  enabled = on;
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.08) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

const PATTERNS: Record<Sfx, [number, number, number, OscillatorType?][]> = {
  click: [[660, 0, 0.05, 'triangle']],
  dispatch: [[392, 0, 0.12, 'triangle'], [523, 0.08, 0.12, 'triangle'], [784, 0.16, 0.2, 'triangle']],
  milestone: [[523, 0, 0.15], [659, 0.1, 0.15], [784, 0.2, 0.3]],
  zealot: [[880, 0, 0.08, 'square'], [1175, 0.07, 0.12, 'square']],
  outpost: [[262, 0, 0.3, 'sawtooth'], [392, 0.1, 0.4, 'triangle']],
  news: [[740, 0, 0.06, 'square'], [740, 0.09, 0.06, 'square']],
  victory: [[523, 0, 0.2], [659, 0.15, 0.2], [784, 0.3, 0.2], [1047, 0.45, 0.6]],
  schism: [[311, 0, 0.25, 'sawtooth'], [294, 0.18, 0.35, 'sawtooth']],
  upgrade: [[587, 0, 0.1, 'triangle'], [880, 0.09, 0.18, 'triangle']],
};

export function play(s: Sfx) {
  if (!enabled) return;
  for (const [f, st, d, t] of PATTERNS[s]) tone(f, st, d, t ?? 'sine', s === 'click' ? 0.04 : 0.07);
}

/** Optional ambient drone "music" — only after explicit user opt-in. */
export function setMusic(on: boolean) {
  musicOn = on;
  const c = ac();
  if (!c) return;
  if (on && !musicNodes) {
    const gain = c.createGain();
    gain.gain.value = 0.015;
    gain.connect(c.destination);
    const osc = [110, 165, 220.5].map((f) => {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(gain);
      o.start();
      return o;
    });
    musicNodes = { osc, gain };
  } else if (!on && musicNodes) {
    musicNodes.osc.forEach((o) => o.stop());
    musicNodes.gain.disconnect();
    musicNodes = null;
  }
}

export function isMusicOn() {
  return musicOn;
}
