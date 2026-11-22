// Fixed-capacity ring buffer of samples, one Float64Array per channel.

export class History {
  constructor(channels, capacity) {
    this.channels = channels.slice();
    this.capacity = capacity;
    this.t = new Float64Array(capacity);
    this.data = Object.fromEntries(channels.map((c) => [c, new Float64Array(capacity)]));
    this.count = 0; // total samples ever pushed
  }

  push(t, sample) {
    const i = this.count % this.capacity;
    this.t[i] = t;
    for (const c of this.channels) this.data[c][i] = sample[c] ?? NaN;
    this.count++;
  }

  get length() {
    return Math.min(this.count, this.capacity);
  }

  /** Oldest-first copy of a channel (or 't'), optionally the last n samples. */
  series(channel, n = this.length) {
    const len = Math.min(n, this.length);
    const src = channel === 't' ? this.t : this.data[channel];
    if (!src) throw new Error(`unknown history channel: ${channel}`);
    const out = new Float64Array(len);
    const start = this.count - len;
    for (let k = 0; k < len; k++) out[k] = src[(start + k) % this.capacity];
    return out;
  }

  latest(channel) {
    if (this.count === 0) return undefined;
    const src = channel === 't' ? this.t : this.data[channel];
    return src[(this.count - 1) % this.capacity];
  }

  toJSON() {
    const out = { t: Array.from(this.series('t')) };
    for (const c of this.channels) out[c] = Array.from(this.series(c));
    return out;
  }
}
