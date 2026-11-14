"""Kesefly notification sounds: short original tones, 44.1 kHz mono 16-bit WAV.

Usage: python scripts/make_sounds.py assets/sounds
Each sound is under 1.2 s. Envelopes avoid clicks (short attack, exponential decay).
"""
import math
import struct
import sys
import wave

OUT = sys.argv[1]
SR = 44100


def tone(freqs, dur, start=0.0, decay=5.0, amp=0.5, attack=0.006):
    """List of (time_offset, samples) for a note made of partials [(freq, weight), ...]."""
    n = int(dur * SR)
    out = []
    for i in range(n):
        t = i / SR
        env = min(1.0, t / attack) * math.exp(-decay * t)
        v = sum(w * math.sin(2 * math.pi * f * t) for f, w in freqs)
        out.append(v * env * amp)
    return start, out


def mix(parts, total):
    buf = [0.0] * int(total * SR)
    for start, samples in parts:
        o = int(start * SR)
        for i, s in enumerate(samples):
            if o + i < len(buf):
                buf[o + i] += s
    peak = max(1e-9, max(abs(x) for x in buf))
    return [x / peak * 0.85 for x in buf]


def save(name, samples):
    with wave.open(f'{OUT}/{name}.wav', 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, s)) * 32767)) for s in samples))


bell = lambda f: [(f, 1.0), (f * 2.0, 0.35), (f * 3.01, 0.15)]

# Chime: two soft bell notes, a fifth apart.
save('chime', mix([tone(bell(784), 0.9, 0.0, 4.5), tone(bell(1175), 0.9, 0.16, 4.5)], 1.1))
# Coin: two quick bright notes (rising).
save('coin', mix([tone([(1319, 1), (2638, 0.3)], 0.12, 0.0, 18), tone([(1976, 1), (3952, 0.3)], 0.5, 0.09, 7)], 0.6))
# Bell: one rich bell strike.
save('bell', mix([tone([(660, 1), (1320, 0.5), (1985, 0.3), (2640, 0.15)], 1.2, 0.0, 3.2)], 1.2))
# Pulse: three gentle low taps.
save('pulse', mix([tone([(523, 1), (1046, 0.2)], 0.18, k * 0.2, 14, 0.6) for k in range(3)], 0.75))
# Alert: three rising notes, for market events.
save('alert', mix([tone(bell(f), 0.35, k * 0.13, 8) for k, f in enumerate([880, 1109, 1319])], 0.8))
print('ok')
