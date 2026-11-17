#!/usr/bin/env python3
"""Generates the ORIGINAL PLACEHOLDER score and sound effects for Star Splitter Forces.

Nothing here is a Star Splitter Records recording. The score is a tempo-locked
set of loop layers (112 BPM, 16 bars, D minor) that the AudioDirector mixes
adaptively. Each "force_*" layer is a short motif *inspired by* the documented
style of a project (dance build, dub skank, rock chug, cinematic hits,
orchestral ostinato, improvised analog lead, shoegaze wall) so the Force
system has an audible identity until authorised masters/stems are supplied.

Usage:  python3 tools/generate_audio.py            (writes audio/score, audio/sfx)
Requires numpy and ffmpeg (libvorbis).
"""
import os
import subprocess
import sys
import numpy as np

SR = 44100
BPM = 112.0
BEAT = 60.0 / BPM
BARS = 16
LOOP = BARS * 4 * BEAT
N = int(round(LOOP * SR))
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
RNG = np.random.default_rng(20261117)

# --------------------------------------------------------------- helpers

def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12.0)

def t_arr(dur):
    return np.arange(int(dur * SR)) / SR

def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.2):
    t = np.arange(n) / SR
    dur = n / SR
    e = np.ones(n) * s
    a = max(a, 1e-4)
    e[t < a] = t[t < a] / a
    dm = (t >= a) & (t < a + d)
    e[dm] = 1.0 - (1.0 - s) * (t[dm] - a) / max(d, 1e-4)
    rm = t > dur - r
    e[rm] *= np.clip((dur - t[rm]) / max(r, 1e-4), 0, 1)
    return e

def osc(kind, freq, n, phase=0.0, detune_cents=0.0):
    f = freq * 2 ** (detune_cents / 1200.0)
    if np.isscalar(f):
        ph = phase + f * np.arange(n) / SR
    else:
        ph = phase + np.cumsum(f) / SR
    ph = ph % 1.0
    if kind == "sine":
        return np.sin(2 * np.pi * ph)
    if kind == "saw":
        return 2.0 * ph - 1.0
    if kind == "square":
        return np.where(ph < 0.5, 1.0, -1.0)
    if kind == "tri":
        return 4.0 * np.abs(ph - 0.5) - 1.0
    raise ValueError(kind)

def supersaw(freq, n, voices=5, spread=14.0):
    out = np.zeros(n)
    for i in range(voices):
        c = (i - (voices - 1) / 2) * spread / max(1, (voices - 1) / 2)
        out += osc("saw", freq, n, RNG.random(), c)
    return out / voices

def fft_filter(x, lo=None, hi=None):
    """Zero-phase spectral filter with soft (1-pole-ish) slopes."""
    n = len(x)
    size = 1 << int(np.ceil(np.log2(n + 1)))
    X = np.fft.rfft(x, size)
    f = np.fft.rfftfreq(size, 1.0 / SR)
    g = np.ones_like(f)
    if hi is not None:
        g *= 1.0 / np.sqrt(1.0 + (f / hi) ** 4)
    if lo is not None:
        g *= 1.0 / np.sqrt(1.0 + (lo / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(X * g, size)[:n]

def reverb_ir(seconds=2.5, damp=4000.0):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    noise = RNG.standard_normal(n) * np.exp(-t * 6.9 / seconds)
    return fft_filter(noise, hi=damp) * 0.12

def convolve(x, ir):
    size = 1 << int(np.ceil(np.log2(len(x) + len(ir))))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)
    return y[: len(x) + len(ir) - 1]

def delay(x, seconds, feedback=0.45, taps=5, hi=3000.0):
    out = x.copy()
    d = int(seconds * SR)
    cur = x
    for i in range(1, taps + 1):
        cur = fft_filter(cur, hi=hi) * feedback
        pad = np.zeros(len(out))
        if i * d < len(out):
            pad[i * d:] = cur[: len(out) - i * d]
        out += pad
    return out

def place(buf, sig, start_s, gain=1.0):
    i = int(round(start_s * SR))
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain

def fold_loop(buf):
    """Wrap tails beyond the loop point back to the start for seamless loops."""
    out = buf[:N].copy()
    tail = buf[N:]
    while len(tail) > 0:
        k = min(N, len(tail))
        out[:k] += tail[:k]
        tail = tail[k:]
    return out

def normalize(x, peak=0.8):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak

def soft_clip(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive)

def write_ogg(path, x, quality=3):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2").tobytes()
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-",
           "-c:a", "libvorbis", "-q:a", str(quality), path]
    subprocess.run(cmd, input=pcm, check=True)

# --------------------------------------------------------------- harmony
# D minor. Bars 1-8: Dm Bb F C (2 bars each); bars 9-16: Dm Bb Gm A.
D, F, A, Bb, C, G, E = 50, 53, 57, 46, 48, 55, 52
CHORDS = [
    [50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55],
    [50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52],
]
ROOTS = [38, 34, 41, 36, 38, 34, 31, 33]
SCALE = [50, 52, 53, 55, 57, 58, 60, 62, 64, 65, 67, 69, 70, 72, 74]
PENTA = [50, 53, 55, 57, 60, 62, 65, 67, 69, 72, 74]

def chord_at(bar):
    return CHORDS[(bar // 2) % 8]

def root_at(bar):
    return ROOTS[(bar // 2) % 8]

def bar_t(bar, beat=0.0):
    return (bar * 4 + beat) * BEAT

def new_buf(extra=3.0):
    return np.zeros(N + int(extra * SR))

# --------------------------------------------------------------- instruments

def pad_note(freq, dur, bright=1800.0):
    n = int(dur * SR)
    s = supersaw(freq, n, 5, 10.0) + 0.5 * osc("sine", freq / 2, n)
    s = fft_filter(s, hi=bright)
    return s * env_adsr(n, 0.6, 0.4, 0.8, 0.9)

def pluck(freq, dur=0.35, bright=4000.0, kind="saw"):
    n = int(dur * SR)
    s = osc(kind, freq, n) + 0.3 * osc("square", freq * 2, n)
    t = np.arange(n) / SR
    s = fft_filter(s, hi=bright) * np.exp(-t * 9.0)
    return s * env_adsr(n, 0.002, 0.05, 0.6, 0.05)

def bell(freq, dur=1.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    mod = np.sin(2 * np.pi * freq * 3.5 * t) * 2.2 * np.exp(-t * 3.0)
    s = np.sin(2 * np.pi * freq * t + mod) * np.exp(-t * 2.5)
    return s * env_adsr(n, 0.003, 0.1, 0.8, 0.2)

def kick(dur=0.35):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    return soft_clip(s * 1.4)

def snare(dur=0.25):
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = fft_filter(RNG.standard_normal(n), lo=1200, hi=9000) * np.exp(-t * 18)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25)
    return noise * 0.7 + tone * 0.5

def hat(dur=0.06, open_=False):
    n = int((0.25 if open_ else dur) * SR)
    t = np.arange(n) / SR
    return fft_filter(RNG.standard_normal(n), lo=7000) * np.exp(-t * (14 if open_ else 70)) * 0.5

def tom(freq=90, dur=0.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 0.6 * np.exp(-t * 12))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5)
    s += fft_filter(RNG.standard_normal(n), hi=1500) * np.exp(-t * 20) * 0.3
    return s

def bass_note(freq, dur, kind="saw", bright=600.0):
    n = int(dur * SR)
    s = osc(kind, freq, n) * 0.7 + osc("sine", freq, n)
    return fft_filter(s, hi=bright) * env_adsr(n, 0.005, 0.08, 0.7, 0.05)

def dist_chord(freqs, dur, drive=4.0, bright=2600.0):
    n = int(dur * SR)
    s = np.zeros(n)
    for f in freqs:
        s += osc("saw", f, n, RNG.random(), RNG.uniform(-8, 8)) + osc("saw", f, n, RNG.random(), RNG.uniform(-8, 8))
    s = soft_clip(s * 0.4, drive)
    return fft_filter(s, lo=80, hi=bright) * env_adsr(n, 0.004, 0.05, 0.85, 0.06)

# --------------------------------------------------------------- score layers

def layer_bed():
    b = new_buf(4)
    for bar in range(0, BARS, 2):
        for m in chord_at(bar):
            place(b, pad_note(midi(m), 2 * 4 * BEAT + 0.6, 1500), bar_t(bar), 0.35)
        place(b, pad_note(midi(root_at(bar)), 2 * 4 * BEAT + 0.6, 500), bar_t(bar), 0.4)
    b = b + convolve(b, reverb_ir(3.0, 3000))[: len(b)] * 0.6
    return fold_loop(b)

def layer_menu():
    b = new_buf(5)
    for bar in range(0, BARS, 2):
        for m in chord_at(bar):
            place(b, pad_note(midi(m + 12), 2 * 4 * BEAT + 0.8, 1100), bar_t(bar), 0.22)
        notes = chord_at(bar) + [chord_at(bar)[0] + 12]
        for i in range(4):
            place(b, bell(midi(notes[i % 4] + 12), 2.2), bar_t(bar, i * 1.5), 0.18)
    b = delay(b, BEAT * 0.75, 0.35, 4, 2500)
    b = b + convolve(b, reverb_ir(3.5, 2500))[: len(b)] * 0.7
    return fold_loop(b)

def layer_pulse():
    b = new_buf(1)
    for bar in range(BARS):
        r = midi(root_at(bar))
        for i in range(8):
            g = 0.55 if i % 2 else 0.8
            place(b, bass_note(r, BEAT * 0.45, "saw", 420), bar_t(bar, i * 0.5), g)
        for q in range(4):
            place(b, kick(), bar_t(bar, q), 0.75)
    return fold_loop(b)

def layer_drive():
    b = new_buf(1)
    for bar in range(BARS):
        for i in range(16):
            place(b, hat(open_=(i % 8 == 6)), bar_t(bar, i * 0.25), 0.5 if i % 2 else 0.8)
        place(b, snare(), bar_t(bar, 1), 0.7)
        place(b, snare(), bar_t(bar, 3), 0.7)
        if bar % 4 == 3:
            for k in range(4):
                place(b, snare(0.15), bar_t(bar, 3 + k * 0.25), 0.35 + k * 0.1)
    return fold_loop(b)

def layer_boss():
    b = new_buf(3)
    riff = [0, 0, 12, 0, 1, 0, 10, 7]
    for bar in range(BARS):
        r = 26 if bar % 4 < 2 else 25
        for i, step in enumerate(riff):
            place(b, dist_chord([midi(r + step), midi(r + step + 7)], BEAT * 0.48, 5.0, 1800), bar_t(bar, i * 0.5), 0.5)
        place(b, tom(70), bar_t(bar, 0), 0.9)
        place(b, tom(55), bar_t(bar, 2.5), 0.7)
        if bar % 2 == 1:
            for m in [62, 63, 69]:
                place(b, pad_note(midi(m), 4 * BEAT, 2400), bar_t(bar), 0.18)
    b = b + convolve(b, reverb_ir(1.8, 3500))[: len(b)] * 0.3
    return fold_loop(b)

def layer_region_gate():
    b = new_buf(4)
    for bar in range(0, BARS, 2):
        for m in chord_at(bar):
            n = int(2 * 4 * BEAT * SR)
            t = np.arange(n) / SR
            s = osc("sine", midi(m + 24), n) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.5 * t))
            place(b, s * env_adsr(n, 1.0, 0.2, 0.8, 1.0), bar_t(bar), 0.25)
    b = b + convolve(b, reverb_ir(4.0, 6000))[: len(b)] * 0.8
    return fold_loop(b)

def layer_region_wrecks():
    b = new_buf(4)
    for bar in range(BARS):
        for _ in range(2):
            m = int(RNG.choice(chord_at(bar))) + int(RNG.choice([12, 24]))
            n = int(1.8 * SR)
            t = np.arange(n) / SR
            f = midi(m)
            s = (np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * f * 2.76 * t) + 0.4 * np.sin(2 * np.pi * f * 5.4 * t)) * np.exp(-t * 2.2)
            place(b, s, bar_t(bar, float(RNG.integers(0, 8)) * 0.5), 0.2)
        n2 = int(4 * BEAT * SR)
        drone = fft_filter(osc("saw", midi(26), n2) + osc("saw", midi(26), n2, 0.3, 7), hi=300)
        place(b, drone * env_adsr(n2, 0.5, 0.1, 0.9, 0.5), bar_t(bar), 0.18)
    b = delay(b, BEAT * 1.5, 0.4, 3, 2000)
    b = b + convolve(b, reverb_ir(3.0, 4000))[: len(b)] * 0.6
    return fold_loop(b)

def layer_region_shelf():
    b = new_buf(3)
    n = N
    rumble = fft_filter(RNG.standard_normal(n), hi=120) * 3.0
    b[:n] += rumble * 0.6
    for bar in range(BARS):
        for _ in range(3):
            m = int(RNG.integers(800, 4000))
            crack = fft_filter(RNG.standard_normal(m), lo=2000) * np.exp(-np.arange(m) / SR * 30)
            place(b, crack, bar_t(bar, float(RNG.random() * 4)), 0.25)
        place(b, pad_note(midi(38), 4 * BEAT, 300), bar_t(bar), 0.4)
    return fold_loop(b)

def layer_region_basin():
    b = new_buf(4)
    for bar in range(BARS):
        for i in range(3):
            m = int(RNG.choice(PENTA)) + 12
            n = int(0.5 * SR)
            t = np.arange(n) / SR
            f = midi(m) * (1 + 0.04 * np.exp(-t * 30))
            s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
            place(b, s, bar_t(bar, float(RNG.integers(0, 16)) * 0.25), 0.3)
    b = delay(b, BEAT * 0.75, 0.5, 5, 2500)
    b = b + convolve(b, reverb_ir(3.5, 3500))[: len(b)] * 0.7
    return fold_loop(b)

def layer_region_corridor():
    b = new_buf(2)
    for bar in range(BARS):
        ch = chord_at(bar)
        seq = [ch[0], ch[1], ch[2], ch[1] + 12, ch[2], ch[0] + 12, ch[1], ch[2] + 12]
        for i in range(16):
            cut = 900 + 1800 * (0.5 + 0.5 * np.sin(2 * np.pi * (bar * 16 + i) / 64.0))
            place(b, pluck(midi(seq[i % 8]), 0.2, cut, "square"), bar_t(bar, i * 0.25), 0.22)
    b = delay(b, BEAT * 0.75, 0.3, 3, 2000)
    return fold_loop(b)

def layer_region_bloom():
    b = new_buf(3)
    for bar in range(0, BARS, 2):
        for m in chord_at(bar):
            s = pad_note(midi(m + 12) * 1.012, 2 * 4 * BEAT, 2200) + pad_note(midi(m + 12) * 0.988, 2 * 4 * BEAT, 2200)
            s = np.round(s * 6) / 6  # bitcrush
            place(b, s, bar_t(bar), 0.14)
    for bar in range(BARS):
        if bar % 2 == 1:
            g = pluck(midi(int(RNG.choice(SCALE)) + 12), 0.08, 6000, "square")
            for k in range(6):
                place(b, g, bar_t(bar, 3 + k * 0.125), 0.2)
    return fold_loop(b)

def layer_force_codex():
    # Uplifting melodic-dance hook with supersaw lead and plucks.
    b = new_buf(3)
    hook = [(0, 69, 1.5), (1.5, 67, 0.5), (2, 65, 1), (3, 64, 1), (4, 65, 1.5), (5.5, 69, 0.5), (6, 72, 2),
            (8, 70, 1.5), (9.5, 69, 0.5), (10, 65, 1), (11, 62, 1), (12, 64, 1.5), (13.5, 65, 0.5), (14, 67, 2)]
    for half in range(2):
        for rep in range(2):
            base = half * 32 + rep * 16
            for (bt, m, ln) in hook:
                n = int(ln * BEAT * SR)
                s = fft_filter(supersaw(midi(m + 12), n, 7, 18), hi=5000) * env_adsr(n, 0.01, 0.1, 0.8, 0.12)
                place(b, s, (base + bt) * BEAT, 0.28)
    for bar in range(BARS):
        for i in range(8):
            ch = chord_at(bar)
            place(b, pluck(midi(ch[i % 3] + 12), 0.25, 3500), bar_t(bar, i * 0.5 + 0.5), 0.12)
    b = delay(b, BEAT * 0.75, 0.25, 3, 4000)
    b = b + convolve(b, reverb_ir(2.0, 5000))[: len(b)] * 0.5
    return fold_loop(b)

def layer_force_currents():
    # Dub: offbeat skank chords into a long tape echo, deep sub bass.
    b = new_buf(4)
    sk = new_buf(4)
    for bar in range(BARS):
        ch = chord_at(bar)
        for q in [1, 3]:
            s = sum(pluck(midi(m + 12), 0.18, 2500, "square") for m in ch)
            place(sk, s, bar_t(bar, q + 0.5), 0.25)
        r = midi(root_at(bar))
        place(b, bass_note(r, BEAT * 1.6, "sine", 200), bar_t(bar, 0), 0.9)
        place(b, bass_note(r * 1.5, BEAT * 0.8, "sine", 200), bar_t(bar, 2.5), 0.7)
    sk = delay(sk, BEAT * 0.75, 0.6, 7, 1800)
    b += sk
    b = b + convolve(b, reverb_ir(2.5, 2500))[: len(b)] * 0.4
    return fold_loop(b)

def layer_force_ghost():
    # Modern rock: chugging palm-muted power chords with accents.
    b = new_buf(2)
    for bar in range(BARS):
        r = root_at(bar) + 12
        for i in range(8):
            accent = i in (0, 3, 6)
            dur = BEAT * (0.45 if accent else 0.22)
            place(b, dist_chord([midi(r), midi(r + 7), midi(r + 12)], dur, 6.0, 3200 if accent else 1400), bar_t(bar, i * 0.5), 0.45 if accent else 0.3)
    return fold_loop(b)

def layer_force_rex():
    # Cinematic: taiko-like hits, brass stabs and a low string ostinato.
    b = new_buf(3)
    for bar in range(BARS):
        place(b, tom(65, 0.9), bar_t(bar, 0), 1.0)
        place(b, tom(80, 0.6), bar_t(bar, 1.5), 0.6)
        place(b, tom(65, 0.9), bar_t(bar, 2.75), 0.8)
        r = root_at(bar)
        for i in range(8):
            place(b, bass_note(midi(r + (0 if i % 2 == 0 else 12)), BEAT * 0.45, "saw", 900), bar_t(bar, i * 0.5), 0.25)
        if bar % 2 == 0:
            n = int(BEAT * 1.0 * SR)
            stab = sum(fft_filter(supersaw(midi(m), n, 3, 6), hi=2200) for m in chord_at(bar))
            place(b, stab * env_adsr(n, 0.02, 0.1, 0.7, 0.2), bar_t(bar, 3), 0.25)
    b = b + convolve(b, reverb_ir(2.2, 3000))[: len(b)] * 0.45
    return fold_loop(b)

def layer_force_orchestra():
    # Symphonic electronic: string ostinato + slow brass swells.
    b = new_buf(4)
    for bar in range(BARS):
        ch = chord_at(bar)
        pattern = [ch[0], ch[1], ch[2], ch[1]]
        for i in range(8):
            n = int(BEAT * 0.5 * SR)
            s = fft_filter(supersaw(midi(pattern[i % 4] + 12), n, 4, 8), hi=3000) * env_adsr(n, 0.03, 0.1, 0.7, 0.08)
            place(b, s, bar_t(bar, i * 0.5), 0.2)
        if bar % 4 == 0:
            for m in ch:
                n2 = int(4 * 4 * BEAT * SR)
                sw = fft_filter(osc("saw", midi(m - 12), n2) + osc("square", midi(m - 12), n2, 0.2), hi=1400)
                tt = np.arange(n2) / SR
                place(b, sw * np.sin(np.pi * tt / (n2 / SR)) ** 2, bar_t(bar), 0.12)
    b = b + convolve(b, reverb_ir(3.0, 4000))[: len(b)] * 0.6
    return fold_loop(b)

def layer_force_circuits():
    # Jamtronica: wandering analog lead with portamento, never quite repeating.
    b = new_buf(3)
    total_beats = BARS * 4
    t = 0.0
    m = 62
    while t < total_beats - 0.5:
        ln = float(RNG.choice([0.5, 0.5, 1.0, 1.5, 0.75]))
        target = int(RNG.choice(SCALE)) + 12
        n = int(ln * BEAT * SR)
        glide = np.linspace(midi(m), midi(target), n) if RNG.random() < 0.5 else np.full(n, midi(target))
        tt = np.arange(n) / SR
        wah = 800 + 1600 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.25 * (t * BEAT + tt)))
        s = osc("tri", glide, n) * 0.6 + osc("saw", glide, n) * 0.4
        s = fft_filter(s, hi=float(np.mean(wah))) * env_adsr(n, 0.02, 0.1, 0.8, 0.1)
        place(b, s, t * BEAT, 0.25)
        m = target
        t += ln
    b = delay(b, BEAT * 0.5, 0.4, 4, 2500)
    b = b + convolve(b, reverb_ir(2.5, 3000))[: len(b)] * 0.5
    return fold_loop(b)

def layer_force_collapse():
    # Shoegaze wall: detuned, distorted sustained chords drowned in reverb.
    b = new_buf(5)
    for bar in range(0, BARS, 2):
        s = dist_chord([midi(m) for m in chord_at(bar)] + [midi(chord_at(bar)[0] + 12)], 2 * 4 * BEAT, 3.0, 2200)
        n = len(s)
        tt = np.arange(n) / SR
        s *= 0.6 + 0.4 * np.sin(2 * np.pi * 5.5 * tt) ** 2
        place(b, s, bar_t(bar), 0.3)
    b = b + convolve(b, reverb_ir(5.0, 2500))[: len(b)] * 1.0
    return fold_loop(b)

def layer_state_resonance():
    b = new_buf(4)
    for bar in range(0, BARS, 2):
        for m in chord_at(bar):
            n = int(2 * 4 * BEAT * SR)
            tt = np.arange(n) / SR
            s = osc("sine", midi(m + 24), n) + 0.5 * osc("sine", midi(m + 31), n) + 0.3 * osc("sine", midi(m + 36), n, 0, 6)
            s *= 0.7 + 0.3 * np.sin(2 * np.pi * 3.0 * tt)
            place(b, s * env_adsr(n, 0.8, 0.2, 0.8, 0.8), bar_t(bar), 0.14)
    b = b + convolve(b, reverb_ir(4.0, 8000))[: len(b)] * 0.8
    return fold_loop(b)

def layer_state_fracture():
    b = new_buf(2)
    for bar in range(BARS):
        for _ in range(4):
            n = int(RNG.uniform(0.05, 0.3) * SR)
            g = RNG.standard_normal(n)
            g = np.round(fft_filter(g, lo=300, hi=6000) * 3) / 3
            reps = int(RNG.integers(1, 5))
            start = bar_t(bar, float(RNG.integers(0, 16)) * 0.25)
            for k in range(reps):
                place(b, g * np.linspace(1, 0.2, n), start + k * BEAT * 0.125, 0.18)
        if bar % 4 == 2:
            n2 = int(BEAT * 4 * SR)
            sw = fft_filter(RNG.standard_normal(n2), lo=500, hi=5000) * np.linspace(0, 1, n2) ** 3
            place(b, sw, bar_t(bar), 0.25)
    return fold_loop(b)

LAYERS = {
    "bed": layer_bed, "pulse": layer_pulse, "drive": layer_drive, "menu": layer_menu, "boss": layer_boss,
    "region_gate": layer_region_gate, "region_wrecks": layer_region_wrecks, "region_shelf": layer_region_shelf,
    "region_basin": layer_region_basin, "region_corridor": layer_region_corridor, "region_bloom": layer_region_bloom,
    "force_codex": layer_force_codex, "force_currents": layer_force_currents, "force_ghost": layer_force_ghost,
    "force_rex": layer_force_rex, "force_orchestra": layer_force_orchestra, "force_circuits": layer_force_circuits,
    "force_collapse": layer_force_collapse, "state_resonance": layer_state_resonance, "state_fracture": layer_state_fracture,
}
# Target loudness (RMS) per layer, so adaptive mixes stay balanced.
LEVELS = {"bed": 0.10, "pulse": 0.10, "drive": 0.07, "menu": 0.11, "boss": 0.13, "state_resonance": 0.07, "state_fracture": 0.05,
          "region_shelf": 0.07, "region_basin": 0.07}

def loudness_normalize(x, target):
    rms = np.sqrt(np.mean(x ** 2)) + 1e-9
    y = x * (target / rms)
    return np.where(np.abs(y) > 0.8, np.sign(y) * (0.8 + 0.18 * np.tanh((np.abs(y) - 0.8) / 0.18)), y)

# --------------------------------------------------------------- sfx

def sweep(f0, f1, dur, kind="sine", curve=2.0):
    n = int(dur * SR)
    tt = np.linspace(0, 1, n)
    f = f0 + (f1 - f0) * (tt ** curve if f1 > f0 else 1 - (1 - tt) ** curve)
    return osc(kind, f, n)

def decay(n, rate):
    return np.exp(-np.arange(n) / SR * rate)

def noise(dur, lo=None, hi=None):
    return fft_filter(RNG.standard_normal(int(dur * SR)), lo=lo, hi=hi)

def mixdown(parts):
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[: len(p)] += p
    return out

def arp(notes, step, dur_each, inst=bell, gain=0.5):
    out = np.zeros(int((step * len(notes) + dur_each) * SR))
    for i, m in enumerate(notes):
        place(out, inst(midi(m), dur_each), i * step, gain)
    return out

def sfx_all():
    s = {}
    n = int(0.07 * SR)
    s["shot"] = fft_filter(sweep(1400, 520, 0.07, "square"), hi=5000) * decay(n, 40) * 0.5
    s["shot_heavy"] = mixdown([sweep(300, 90, 0.18, "saw") * decay(int(0.18 * SR), 14) * 0.6, noise(0.12, 500, 4000) * decay(int(0.12 * SR), 30) * 0.4])
    s["hit"] = noise(0.04, 1500, 9000) * decay(int(0.04 * SR), 80) * 0.6
    s["kill"] = mixdown([sweep(700, 110, 0.14) * decay(int(0.14 * SR), 18), noise(0.1, 800, 6000) * decay(int(0.1 * SR), 35) * 0.5])
    s["kill_big"] = mixdown([sweep(180, 40, 0.7) * decay(int(0.7 * SR), 5) * 1.2, noise(0.6, 200, 3000) * decay(int(0.6 * SR), 7) * 0.6, arp([74, 81], 0.06, 0.5, bell, 0.25)])
    s["pickup"] = osc("sine", 1320, int(0.06 * SR)) * decay(int(0.06 * SR), 45) * 0.5 + osc("sine", 2640, int(0.06 * SR)) * decay(int(0.06 * SR), 70) * 0.2
    s["levelup"] = arp([62, 65, 69, 74, 77], 0.07, 0.8, bell, 0.45)
    s["choose"] = arp([69, 76], 0.06, 0.5, bell, 0.5)
    disc = mixdown([arp([62, 69, 74, 77, 81], 0.11, 1.6, bell, 0.35), pad_note(midi(62), 2.0, 2500) * 0.25, pad_note(midi(69), 2.0, 2500) * 0.2])
    s["discovery"] = disc + convolve(disc, reverb_ir(2.0, 5000))[: len(disc)] * 0.5
    s["hurt"] = soft_clip(mixdown([sweep(220, 60, 0.22, "saw") * decay(int(0.22 * SR), 12), noise(0.15, 100, 2500) * decay(int(0.15 * SR), 20)]), 3.0) * 0.7
    s["ability"] = fft_filter(sweep(200, 1600, 0.4, "saw", 1.5), hi=3500) * env_adsr(int(0.4 * SR), 0.05, 0.1, 0.8, 0.15) * 0.5 + noise(0.4, 2000) * np.linspace(0, 1, int(0.4 * SR)) * 0.2
    s["wave"] = sweep(120, 38, 0.32) * decay(int(0.32 * SR), 8) * 1.0
    s["lance"] = mixdown([fft_filter(sweep(2400, 300, 0.25, "saw"), hi=7000) * decay(int(0.25 * SR), 12) * 0.5, noise(0.2, 3000) * decay(int(0.2 * SR), 25) * 0.3])
    s["mine"] = mixdown([sweep(140, 45, 0.3) * decay(int(0.3 * SR), 10), noise(0.3, 80, 1800) * decay(int(0.3 * SR), 12) * 0.6])
    s["chord"] = dist_chord([midi(38), midi(45), midi(50)], 0.32, 6.0, 3000) * decay(int(0.32 * SR), 6) * 0.8
    drop = mixdown([sweep(90, 35, 1.0) * decay(int(1.0 * SR), 3) * 1.2, noise(0.8, 100, 6000) * decay(int(0.8 * SR), 5) * 0.5,
                    sum(pad_note(midi(m), 1.0, 4000) for m in [62, 66, 69]) * 0.25])
    s["drop"] = drop + convolve(drop, reverb_ir(1.5, 4000))[: len(drop)] * 0.4
    s["strike"] = mixdown([noise(0.12, 2500) * decay(int(0.12 * SR), 30) * 1.0, noise(0.8, 30, 300) * decay(int(0.8 * SR), 4) * 1.4])
    s["heal"] = arp([69, 74, 78], 0.05, 0.6, bell, 0.4)
    s["magnet"] = fft_filter(sweep(1800, 300, 0.35, "saw"), hi=4000) * decay(int(0.35 * SR), 6) * 0.35
    s["state_up"] = mixdown([arp([62, 69, 74, 81], 0.08, 1.0, bell, 0.3), noise(0.7, 4000) * np.linspace(0, 1, int(0.7 * SR)) * 0.1])
    s["state_down"] = np.round(arp([74, 70, 65, 61], 0.08, 0.8, bell, 0.35) * 5) / 5
    s["extract"] = fft_filter(sweep(100, 2400, 1.3, "saw", 2.5), hi=5000) * env_adsr(int(1.3 * SR), 0.2, 0.1, 0.9, 0.3) * 0.4
    boss = mixdown([sum(pad_note(midi(m), 2.6, 1200) for m in [38, 39, 45]) * 0.45, noise(2.6, 30, 200) * np.linspace(0, 1, int(2.6 * SR)) * 1.0])
    s["boss_appear"] = soft_clip(boss, 2.0)
    s["boss_phase"] = mixdown([tom(55, 1.0) * 1.2, noise(1.0, 200, 3000)[::-1] * np.linspace(0, 1, int(1.0 * SR)) ** 2 * 0.5])
    bd = mixdown([noise(2.4, 40, 2000) * decay(int(2.4 * SR), 2) * 1.0, sweep(160, 30, 1.5) * decay(int(1.5 * SR), 3), arp([62, 66, 69, 74, 78, 81], 0.12, 1.6, bell, 0.3)])
    s["boss_die"] = bd + convolve(bd, reverb_ir(2.5, 4000))[: len(bd)] * 0.4
    s["ui_click"] = osc("sine", 1800, int(0.025 * SR)) * decay(int(0.025 * SR), 120) * 0.4
    s["ui_back"] = osc("sine", 900, int(0.03 * SR)) * decay(int(0.03 * SR), 100) * 0.4
    s["harmony"] = arp([62, 66, 69, 73, 74, 78, 81, 85], 0.07, 1.2, bell, 0.28)
    s["enemy_shot"] = fft_filter(sweep(700, 300, 0.12, "tri"), hi=3000) * decay(int(0.12 * SR), 20) * 0.4
    s["victory"] = arp([62, 66, 69, 74, 78, 81, 86], 0.12, 1.4, bell, 0.35)
    s["defeat"] = arp([69, 65, 62, 57, 53, 50], 0.18, 1.2, bell, 0.35)
    s["ping"] = osc("sine", 1500, int(0.6 * SR)) * decay(int(0.6 * SR), 6) * 0.35 + osc("sine", 2250, int(0.6 * SR)) * decay(int(0.6 * SR), 10) * 0.1
    ev = mixdown([fft_filter(sweep(150, 1200, 0.8, "saw", 2.0), hi=4000) * env_adsr(int(0.8 * SR), 0.1, 0.1, 0.8, 0.2) * 0.4, np.pad(arp([74, 78, 81, 86], 0.07, 1.0, bell, 0.35), (int(0.6 * SR), 0))])
    s["evolve"] = ev
    return s

# --------------------------------------------------------------- main

def main():
    only = set(sys.argv[1:])
    score_dir = os.path.join(ROOT, "audio", "score")
    sfx_dir = os.path.join(ROOT, "audio", "sfx")
    for name, fn in LAYERS.items():
        if only and name not in only:
            continue
        x = fn()
        x = loudness_normalize(x, LEVELS.get(name, 0.085))
        write_ogg(os.path.join(score_dir, name + ".ogg"), x, 2)
        print("score", name, f"{len(x) / SR:.2f}s")
    if not only or "sfx" in only:
        for name, x in sfx_all().items():
            fade = min(len(x), int(0.01 * SR))
            x = x.copy()
            x[-fade:] *= np.linspace(1, 0, fade)
            write_ogg(os.path.join(sfx_dir, name + ".ogg"), normalize(x, 0.85), 4)
        print("sfx done")

if __name__ == "__main__":
    main()
