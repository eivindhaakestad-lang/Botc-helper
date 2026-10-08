// Lyder laget i nettleseren (Web Audio) – ingen lydfiler, ingen nedlasting.
// Nettlesere krever et klikk før lyd kan spilles, derfor enableSound() fra en knapp.

let ctx = null;
let enabled = false;
let master = null;

function ensureCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
  }
  ctx.resume();
  return ctx;
}

export function enableSound() {
  try { ensureCtx(); enabled = true; } catch { enabled = false; }
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
  // Mynt som lander i lommeboka, og kjøp i Saueboden
  coin() { tone(1568, 0.09, { type: 'square', gain: 0.045 }); tone(2093, 0.14, { type: 'square', gain: 0.04, delay: 0.06 }); },
  buy() { [1047, 1319, 1568, 2093].forEach((fq, i) => tone(fq, 0.18, { type: 'triangle', gain: 0.1, delay: i * 0.07 })); bellAt(2093, 0.3, 0.06, 1.2); },
  // Kirkeklokka i tårnet: n dype slag
  toll(n = 1, start = 0) { for (let i = 0; i < Math.min(12, n); i++) { bellAt(196, start + i * 1.15, 0.22, 3.6); bellAt(98, start + i * 1.15, 0.14, 4); } },
  gong() { [[55, 0.35], [110, 0.25], [164, 0.12], [233, 0.08]].forEach(([f, g]) => tone(f, 5, { gain: g, attack: 0.02, release: 5 })); noise(1.2, { gain: 0.05, freq: 300, q: 0.7 }); },
  sunrise() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 1.6, { type: 'sine', gain: 0.12, delay: i * 0.12, release: 1.6 })); bellAt(1568, 0.7, 0.08, 2); },
  gavel() { [0, 0.22].forEach((d) => { tone(140, 0.18, { gain: 0.35, delay: d, slideTo: 70 }); noise(0.08, { gain: 0.4, delay: d, freq: 900, q: 1.2 }); }); },
  pop() { tone(500, 0.12, { type: 'sine', gain: 0.18, slideTo: 1100 }); },
  lock() { noise(0.05, { gain: 0.25, freq: 2500, q: 6 }); tone(300, 0.08, { type: 'square', gain: 0.04 }); },
  boom() { tone(90, 2.2, { gain: 0.5, slideTo: 35, release: 2.2 }); noise(1.5, { gain: 0.25, freq: 200, q: 0.5, type: 'lowpass' }); },
  fanfare() { [[392, 0], [523, 0.18], [659, 0.36], [784, 0.54], [1047, 0.8]].forEach(([f, d]) => { tone(f, 0.9, { type: 'sawtooth', gain: 0.06, delay: d }); tone(f * 2, 0.9, { type: 'sine', gain: 0.05, delay: d }); }); bellAt(1047, 1.1, 0.1); },
  whoosh() { noise(0.55, { gain: 0.35, freq: 1800, q: 0.9 }); tone(1200, 0.5, { type: 'triangle', gain: 0.05, slideTo: 300 }); },
  thunk() { tone(160, 0.18, { gain: 0.3, slideTo: 80 }); noise(0.12, { gain: 0.3, freq: 700, q: 1.5 }); tone(95, 0.9, { gain: 0.12, delay: 0.25, slideTo: 70 }); },
  hit() { noise(0.1, { gain: 0.45, freq: 2600, q: 2 }); tone(70, 2.6, { gain: 0.5, slideTo: 30, release: 2.6, delay: 0.05 }); noise(1.6, { gain: 0.25, freq: 220, q: 0.5, type: 'lowpass', delay: 0.05 }); bellAt(330, 0.7, 0.18, 3.2); },
  death() { tone(196, 1.4, { type: 'triangle', gain: 0.22, slideTo: 82, release: 1.4 }); noise(0.9, { gain: 0.22, freq: 180, q: 0.6, type: 'lowpass' }); bellAt(110, 0.35, 0.2, 3.4); },
  reveal() { tone(220, 0.6, { type: 'sine', gain: 0.2, slideTo: 660 }); bellAt(1320, 0.45, 0.07, 1.4); },
  // Sau som breker: sagtann med vibrato og «bæ-æ-æ»-skjelving
  baa(pitch = 1, delay = 0) { warble({ freq: 300 * pitch, to: 270 * pitch, dur: 0.62, vib: 7, vibDepth: 18 * pitch, trem: 22, tremDepth: 0.75, gain: 0.16, filter: 1100, q: 2.2, delay }); },
  // Dødsanimasjoner på storskjermen
  poof() { noise(0.4, { gain: 0.32, freq: 700, q: 0.6 }); tone(280, 0.2, { gain: 0.14, slideTo: 1100 }); },
  zap() { noise(0.09, { gain: 0.5, freq: 3400, q: 1.4 }); noise(0.3, { gain: 0.32, freq: 1800, q: 0.8, delay: 0.05 }); tone(62, 2.4, { gain: 0.45, slideTo: 28, release: 2.4, delay: 0.08 }); noise(1.8, { gain: 0.2, freq: 160, q: 0.4, type: 'lowpass', delay: 0.12 }); },
  ufo() { warble({ freq: 520, to: 980, dur: 1.9, vib: 9, vibDepth: 70, gain: 0.07, type: 'sine', filter: 3000, q: 0.5 }); warble({ freq: 980, to: 1500, dur: 0.6, vib: 14, vibDepth: 90, gain: 0.05, type: 'triangle', filter: 4000, q: 0.5, delay: 1.9 }); },
  vortex() { tone(420, 1.8, { type: 'sawtooth', gain: 0.05, slideTo: 38 }); noise(1.8, { gain: 0.22, freq: 420, q: 0.7 }); tone(55, 2, { gain: 0.25, release: 2, delay: 0.3 }); },
  blub() { tone(260, 0.18, { type: 'sine', gain: 0.14, slideTo: 620 }); tone(420, 0.14, { type: 'sine', gain: 0.08, slideTo: 900, delay: 0.12 }); },
  melt() { warble({ freq: 640, to: 150, dur: 1.6, vib: 5, vibDepth: 40, gain: 0.09, type: 'sine', filter: 1600, q: 0.4 }); [0.5, 0.9, 1.3].forEach((d) => tone(900, 0.08, { type: 'sine', gain: 0.07, slideTo: 380, delay: d })); },
  whistle() { tone(2100, 0.62, { type: 'sine', gain: 0.07, slideTo: 520 }); },
  clank(delay = 0) { noise(0.12, { gain: 0.45, freq: 2600, q: 2, delay }); bellAt(740, delay, 0.16, 1.1); tone(110, 0.4, { gain: 0.35, slideTo: 55, delay }); },
  rocket() { noise(0.7, { gain: 0.3, freq: 160, q: 0.5, type: 'lowpass' }); noise(1.3, { gain: 0.34, freq: 900, q: 0.5, delay: 0.62 }); tone(160, 1.3, { type: 'sawtooth', gain: 0.05, slideTo: 1100, delay: 0.62 }); },
  meteor() { noise(0.7, { gain: 0.28, freq: 2400, q: 0.7 }); tone(1800, 0.7, { type: 'triangle', gain: 0.05, slideTo: 180 }); tone(70, 2.8, { gain: 0.55, slideTo: 28, release: 2.8, delay: 0.7 }); noise(2, { gain: 0.38, freq: 240, q: 0.4, type: 'lowpass', delay: 0.7 }); },
  dragon() { warble({ freq: 150, to: 85, dur: 1.2, vib: 17, vibDepth: 28, trem: 28, tremDepth: 0.6, gain: 0.22, type: 'sawtooth', filter: 650, q: 1.4, delay: 0.3 }); noise(0.95, { gain: 0.32, freq: 650, q: 0.4, delay: 0.95 }); noise(0.95, { gain: 0.18, freq: 2400, q: 0.6, delay: 0.95 }); },
  rustle() { noise(0.9, { gain: 0.22, freq: 2600, q: 0.5 }); noise(0.9, { gain: 0.16, freq: 1400, q: 0.6, delay: 0.5 }); },
  confetti() { [0, 0.06, 0.12].forEach((d, i) => tone(600 + i * 250, 0.12, { gain: 0.12, delay: d, slideTo: 1400 })); [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.25, { type: 'triangle', gain: 0.08, delay: 0.25 + i * 0.08 })); },
  // Fyrverkeri (ny rekord i drømmespillet)
  firework(delay = 0) { tone(500, 0.5, { type: 'sine', gain: 0.05, slideTo: 1800, delay }); noise(0.5, { gain: 0.3, freq: 1500, q: 0.6, delay: delay + 0.5 }); noise(0.9, { gain: 0.12, freq: 4000, q: 2, delay: delay + 0.6 }); },
  magnet() { tone(180, 0.35, { type: 'square', gain: 0.05, slideTo: 720 }); tone(720, 0.3, { type: 'sine', gain: 0.08, delay: 0.3 }); },
};

// Tone med vibrato (tonehøyde) og skjelving (styrke) – brukes til brekende sau og UFO
function warble({ freq, to = freq, dur, vib = 6, vibDepth = 10, trem = 0, tremDepth = 0, gain = 0.15, type = 'sawtooth', filter = 1200, q = 1, delay = 0 }) {
  if (!soundEnabled()) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  o.frequency.linearRampToValueAtTime(to, t0 + dur);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = vib;
  const lg = ctx.createGain();
  lg.gain.value = vibDepth;
  lfo.connect(lg).connect(o.frequency);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filter;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.04);
  g.gain.setValueAtTime(gain, t0 + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  const nodes = [o, lfo];
  let out = g;
  if (trem) {
    // Skjelving: en ekstra forsterker som moduleres opp og ned
    const tg = ctx.createGain();
    tg.gain.value = 1 - tremDepth / 2;
    const tl = ctx.createOscillator();
    tl.frequency.value = trem;
    const td = ctx.createGain();
    td.gain.value = tremDepth / 2;
    tl.connect(td).connect(tg.gain);
    g.connect(tg);
    out = tg;
    nodes.push(tl);
  }
  o.connect(f).connect(g);
  out.connect(master);
  nodes.forEach((n) => { n.start(t0); n.stop(t0 + dur + 0.05); });
}


// ——— Stemningsmusikk: dyster, generativ nattmusikk (egen av/på, uavhengig av lydeffektene) ———
// D-moll: drone, langsomme akkorder (i – VI – iv – V), spredte spilledåse-toner med ekko og litt vind.
const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = [[62, 65, 69], [58, 62, 65], [55, 58, 62], [57, 61, 64]]; // Dm, Bb, Gm, A
const MELODY = [74, 77, 79, 81, 84, 86, 72, 69];
let music = null;

function buildMusic() {
  const c = ensureCtx();
  const out = c.createGain();
  out.gain.value = 0;
  out.connect(c.destination);
  // Ekko til melodien
  const delay = c.createDelay(2);
  delay.delayTime.value = 0.55;
  const fb = c.createGain();
  fb.gain.value = 0.42;
  const wet = c.createGain();
  wet.gain.value = 0.5;
  delay.connect(fb).connect(delay);
  delay.connect(wet).connect(out);
  // Drone
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 380;
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.05;
  lfoGain.gain.value = 160;
  lfo.connect(lfoGain).connect(lp.frequency);
  lfo.start();
  const droneGain = c.createGain();
  droneGain.gain.value = 0.07;
  lp.connect(droneGain).connect(out);
  const drones = [NOTE(38), NOTE(38) * 1.004, NOTE(45) * 0.998].map((f) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); return o; });
  // Vind
  const len = c.sampleRate * 4;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const wind = c.createBufferSource();
  wind.buffer = buf;
  wind.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 420;
  bp.Q.value = 0.6;
  const windGain = c.createGain();
  windGain.gain.value = 0.02;
  const wlfo = c.createOscillator();
  const wlfoGain = c.createGain();
  wlfo.frequency.value = 0.08;
  wlfoGain.gain.value = 0.015;
  wlfo.connect(wlfoGain).connect(windGain.gain);
  wlfo.start();
  wind.connect(bp).connect(windGain).connect(out);
  wind.start();
  const m = { out, delay, nodes: [lfo, wlfo, wind, ...drones], chord: 0, nextChord: 0, nextNote: 0, timer: null, playing: false };
  const pad = (freq, t0) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.035, t0 + 2.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 9);
    o.connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + 9.2);
  };
  const bell = (freq, t0) => {
    [[1, 0.035], [2.76, 0.012], [5.4, 0.006]].forEach(([k, a]) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.value = freq * k;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(a, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
      o.connect(g);
      g.connect(out);
      g.connect(delay);
      o.start(t0);
      o.stop(t0 + 2.5);
    });
  };
  m.tick = () => {
    const now = c.currentTime;
    if (now + 0.5 >= m.nextChord) {
      const t0 = Math.max(now, m.nextChord);
      CHORDS[m.chord % CHORDS.length].forEach((n) => pad(NOTE(n - 12), t0));
      m.chord += 1;
      m.nextChord = t0 + 8;
    }
    if (now + 0.5 >= m.nextNote) {
      const t0 = Math.max(now, m.nextNote);
      if (Math.random() < 0.7) bell(NOTE(MELODY[Math.floor(Math.random() * MELODY.length)]), t0);
      m.nextNote = t0 + 1.6 + Math.random() * 2.8;
    }
  };
  return m;
}

export function musicPlaying() { return !!(music && music.playing); }

export function playMusic() {
  try {
    if (!music) music = buildMusic();
    if (music.playing) return;
    const c = ensureCtx();
    music.playing = true;
    music.nextChord = c.currentTime + 0.2;
    music.nextNote = c.currentTime + 1.5;
    music.out.gain.cancelScheduledValues(c.currentTime);
    music.out.gain.setTargetAtTime(0.9, c.currentTime, 1.5);
    clearInterval(music.timer);
    music.timer = setInterval(music.tick, 250);
  } catch { /* ingen lyd tilgjengelig */ }
}

export function stopMusic() {
  if (!music || !music.playing) return;
  music.playing = false;
  music.out.gain.setTargetAtTime(0, ctx.currentTime, 1.2);
  clearInterval(music.timer);
}
