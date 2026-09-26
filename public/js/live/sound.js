// Lyder laget i nettleseren (Web Audio) – ingen lydfiler, ingen nedlasting.
// Nettlesere krever et klikk før lyd kan spilles, derfor enableSound() fra en knapp.

let ctx = null;
let enabled = false;
let master = null;

export function enableSound() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
    }
    ctx.resume();
    enabled = true;
  } catch { enabled = false; }
  return enabled;
}

export function disableSound() { enabled = false; }
export function soundEnabled() { return enabled && !!ctx; }

function tone(freq, dur, { type = 'sine', gain = 0.2, attack = 0.005, delay = 0, slideTo = null, release = null } = {}) {
  if (!soundEnabled()) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + (release || dur));
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + (release || dur) + 0.05);
}

function noise(dur, { gain = 0.2, delay = 0, freq = 1200, q = 1, type = 'bandpass' } = {}) {
  if (!soundEnabled()) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

// Metallisk klokke: inharmoniske deltoner med lang utklinging.
function bellAt(base, delay = 0, gain = 0.22, length = 2.6) {
  [[1, 1], [2.76, 0.5], [5.4, 0.28], [8.93, 0.14], [0.5, 0.35]].forEach(([m, a]) => tone(base * m, length, { gain: gain * a, delay, attack: 0.002, release: length * (m > 3 ? 0.5 : 1) }));
}

export const sfx = {
  tick() { tone(2200, 0.03, { type: 'square', gain: 0.05 }); noise(0.03, { gain: 0.15, freq: 3000, q: 4 }); },
  tock() { tone(1300, 0.04, { type: 'square', gain: 0.05 }); noise(0.04, { gain: 0.15, freq: 1800, q: 4 }); },
  countdown() { tone(880, 0.12, { type: 'triangle', gain: 0.18 }); },
  go() { tone(1320, 0.3, { type: 'triangle', gain: 0.2 }); },
  bell() { bellAt(660); bellAt(660, 0.9, 0.16); },
  gong() { [[55, 0.35], [110, 0.25], [164, 0.12], [233, 0.08]].forEach(([f, g]) => tone(f, 5, { gain: g, attack: 0.02, release: 5 })); noise(1.2, { gain: 0.05, freq: 300, q: 0.7 }); },
  sunrise() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 1.6, { type: 'sine', gain: 0.12, delay: i * 0.12, release: 1.6 })); bellAt(1568, 0.7, 0.08, 2); },
  gavel() { [0, 0.22].forEach((d) => { tone(140, 0.18, { gain: 0.35, delay: d, slideTo: 70 }); noise(0.08, { gain: 0.4, delay: d, freq: 900, q: 1.2 }); }); },
  pop() { tone(500, 0.12, { type: 'sine', gain: 0.18, slideTo: 1100 }); },
  lock() { noise(0.05, { gain: 0.25, freq: 2500, q: 6 }); tone(300, 0.08, { type: 'square', gain: 0.04 }); },
  boom() { tone(90, 2.2, { gain: 0.5, slideTo: 35, release: 2.2 }); noise(1.5, { gain: 0.25, freq: 200, q: 0.5, type: 'lowpass' }); },
  fanfare() { [[392, 0], [523, 0.18], [659, 0.36], [784, 0.54], [1047, 0.8]].forEach(([f, d]) => { tone(f, 0.9, { type: 'sawtooth', gain: 0.06, delay: d }); tone(f * 2, 0.9, { type: 'sine', gain: 0.05, delay: d }); }); bellAt(1047, 1.1, 0.1); },
  reveal() { tone(220, 0.6, { type: 'sine', gain: 0.2, slideTo: 660 }); bellAt(1320, 0.45, 0.07, 1.4); },
};
