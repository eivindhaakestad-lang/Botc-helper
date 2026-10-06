// Lasteskjermen elevene ser etter at de har trykket «Bli med».
// Den varer 5 sekunder og ser travel ut – men laster egentlig ingenting
// (tilkoblingen til rommet skjer i bakgrunnen samtidig).

import { logoEl } from '../live/logo.js';

export const INTRO_MS = 5000;

const STEPS = {
  no: [
    ['Kobler til klokketårnet', 'tower.link'],
    ['Verifiserer romkode', 'room.auth'],
    ['Henter grimoiren fra Storytelleren', 'grim.fetch'],
    ['Dekrypterer hviskinger', 'whisper.aes'],
    ['Kalibrerer månefase og tidevann', 'moon.phase'],
    ['Stemmer kirkeklokkene', 'bells.tune'],
    ['Teller sauer', 'sheep.count'],
    ['Gjemmer demonen blant innbyggerne', 'demon.hide'],
    ['Laster inn mistanke og paranoia', 'paranoia.load'],
    ['Tenner lyktene i landsbyen', 'village.lamps'],
  ],
  en: [
    ['Connecting to the clock tower', 'tower.link'],
    ['Verifying room code', 'room.auth'],
    ['Fetching the Grimoire from the Storyteller', 'grim.fetch'],
    ['Decrypting whispers', 'whisper.aes'],
    ['Calibrating moon phase and tides', 'moon.phase'],
    ['Tuning the church bells', 'bells.tune'],
    ['Counting sheep', 'sheep.count'],
    ['Hiding the Demon among the townsfolk', 'demon.hide'],
    ['Loading suspicion and paranoia', 'paranoia.load'],
    ['Lighting the village lamps', 'village.lamps'],
  ],
};
const WORD = {
  no: { step: 'Steg', ready: 'Klar! Velkommen til landsbyen', engine: 'Storyteller-motor', room: 'rom', done: 'ferdig' },
  en: { step: 'Step', ready: 'Ready! Welcome to the village', engine: 'Storyteller engine', room: 'room', done: 'done' },
};

// Når hvert steg starter (ms) – ujevnt, så det ser ut som ekte arbeid
const AT = [0, 360, 780, 1280, 1800, 2280, 2700, 3150, 3600, 3950];
const READY_AT = 4300;
const FADE_AT = 4650;
// Fremdrift: står litt fast innimellom og hopper så fram
const CURVE = [[0, 0], [300, 6], [700, 13], [1100, 17], [1400, 31], [1900, 36], [2200, 52], [2700, 58], [3000, 71], [3500, 77], [3800, 88], [4050, 93], [4300, 100]];

const HEX = '0123456789abcdef';
const rnd = (n) => Array.from({ length: n }, () => HEX[(Math.random() * 16) | 0]).join('');
const pct = (t) => {
  for (let i = 1; i < CURVE.length; i++) {
    const [t1, p1] = CURVE[i];
    const [t0, p0] = CURVE[i - 1];
    if (t <= t1) { const k = (t - t0) / (t1 - t0); return p0 + (p1 - p0) * (k * k * (3 - 2 * k)); }
  }
  return 100;
};

function detail(key, code) {
  switch (key) {
    case 'tower.link': return `wss ▸ ${(18 + Math.random() * 30) | 0} ms`;
    case 'room.auth': return `${code || '?????'} ▸ 0x${rnd(4)}`;
    case 'grim.fetch': return `${(40 + Math.random() * 90) | 0} kB ▸ sha ${rnd(6)}`;
    case 'whisper.aes': return `aes-256 ▸ ${rnd(4)}…${rnd(4)}`;
    case 'moon.phase': return `${(Math.random() * 0.99).toFixed(2)} ▸ ${Math.random() < 0.5 ? 'waxing' : 'waning'}`;
    case 'bells.tune': return `${[392, 440, 494, 523][(Math.random() * 4) | 0]} Hz ▸ ok`;
    case 'sheep.count': return `${(1000 + Math.random() * 8999) | 0} 🐑`;
    case 'demon.hide': return '████████';
    case 'paranoia.load': return `${(90 + Math.random() * 9) | 0} % ▸ stabil`;
    default: return `${(12 + Math.random() * 40) | 0} ▸ ok`;
  }
}

const SPIN = '<svg class="it-spin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="30 14" stroke-linecap="round"/></svg>';

function ringsSvg() {
  let ticks = '';
  for (let i = 0; i < 72; i++) {
    const a = (i * 5 * Math.PI) / 180;
    const r1 = i % 6 === 0 ? 74 : 77;
    ticks += `<line x1="${(Math.sin(a) * r1).toFixed(1)}" y1="${(-Math.cos(a) * r1).toFixed(1)}" x2="${(Math.sin(a) * 80).toFixed(1)}" y2="${(-Math.cos(a) * 80).toFixed(1)}"/>`;
  }
  const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
  let glyphs = '';
  for (let i = 0; i < 24; i++) {
    const a = (i * 15 * Math.PI) / 180;
    glyphs += `<text x="${(Math.sin(a) * 63).toFixed(1)}" y="${(-Math.cos(a) * 63 + 3).toFixed(1)}" transform="rotate(${i * 15} ${(Math.sin(a) * 63).toFixed(1)} ${(-Math.cos(a) * 63).toFixed(1)})">${runes[i]}</text>`;
  }
  return `<svg class="it-rings" viewBox="-100 -100 200 200" aria-hidden="true">
<circle r="92" class="ir-faint"/>
<g class="ir-a"><circle r="88" class="ir-dash"/></g>
<g class="ir-b">${ticks}</g>
<g class="ir-c">${glyphs}</g>
<circle r="52" class="ir-track"/>
<circle r="52" class="ir-prog" pathLength="100" stroke-dasharray="0 100" transform="rotate(-90)"/>
<g class="ir-d"><circle r="43" class="ir-seg"/></g>
<g class="ir-e"><path d="M0 -36 A36 36 0 0 1 31.2 18" class="ir-arc"/><path d="M0 36 A36 36 0 0 1 -31.2 -18" class="ir-arc"/></g>
<text class="ir-num" y="7">0</text><text class="ir-pct" y="20">%</text>
</svg>`;
}

/**
 * Viser lasteskjermen. Returnerer { done: Promise, finish() }.
 * getLang: funksjon som gir 'no' eller 'en' (språket kan bli kjent underveis).
 */
export function playIntro({ code = '', getLang = () => 'no' } = {}) {
  const L = () => (getLang() === 'en' ? 'en' : 'no');
  let lang = L();
  const root = document.createElement('div');
  root.className = 'intro';
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');
  const embers = Array.from({ length: 18 }, (_, i) => `<span class="it-ember" style="--x:${(Math.random() * 100).toFixed(1)}%;--d:${(3 + Math.random() * 4).toFixed(2)}s;--w:${(-Math.random() * 6).toFixed(2)}s;--s:${(0.5 + Math.random()).toFixed(2)}"></span>`).join('');
  root.innerHTML = `<div class="it-bg" aria-hidden="true"><div class="it-glow"></div>${embers}</div>
<div class="it-inner">
  <div class="it-logo"></div>
  <div class="it-core">${ringsSvg()}<ol class="it-tasks"></ol></div>
  <div class="it-bar" aria-hidden="true"><div class="it-fill"></div><div class="it-segs">${'<i></i>'.repeat(20)}</div></div>
  <p class="it-status"><span class="it-step"></span><span class="it-msg"></span></p>
  <p class="it-stream" aria-hidden="true"></p>
  <p class="it-foot"></p>
</div>`;
  root.querySelector('.it-logo').append(logoEl({ variant: 'stack', lang, anim: true }));
  document.body.append(root);
  document.body.classList.add('intro-open');

  const $ = (s) => root.querySelector(s);
  const tasks = $('.it-tasks');
  const num = $('.ir-num');
  const prog = $('.ir-prog');
  const fill = $('.it-fill');
  const segs = [...root.querySelectorAll('.it-segs i')];
  const stepEl = $('.it-step');
  const msgEl = $('.it-msg');
  const stream = $('.it-stream');
  const foot = $('.it-foot');
  foot.textContent = `${WORD[lang].engine} v3.${(Math.random() * 9) | 0}.${(10 + Math.random() * 89) | 0} · ${WORD[lang].room} ${code}`;

  const start = performance.now();
  let shown = -1;
  let ready = false;
  let raf = 0;
  let streamT = 0;
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  let ended = false;

  function addTask(i) {
    const prev = tasks.lastElementChild;
    if (prev) {
      prev.classList.add('ok');
      prev.querySelector('.it-ic').innerHTML = '✓';
      prev.querySelector('.it-det').textContent = detail(prev.dataset.key, code);
    }
    const [label, key] = STEPS[lang][i];
    const li = document.createElement('li');
    li.dataset.key = key;
    li.innerHTML = `<span class="it-ic">${SPIN}</span><span class="it-lbl"></span><span class="it-det">…</span>`;
    li.querySelector('.it-lbl').textContent = label;
    tasks.append(li);
    while (tasks.children.length > 4) tasks.firstElementChild.remove();
    stepEl.textContent = `${WORD[lang].step} ${i + 1}/${STEPS[lang].length}`;
    msgEl.textContent = label + '\u00a0…';
  }

  function frame(now) {
    const t = now - start;
    const l = L();
    if (l !== lang) lang = l;
    while (shown + 1 < AT.length && t >= AT[shown + 1]) addTask(++shown);
    const p = Math.min(100, pct(t) + (t < READY_AT ? Math.sin(t / 37) * 0.4 : 0));
    const pr = Math.max(0, Math.round(p));
    num.textContent = String(pr);
    prog.setAttribute('stroke-dasharray', `${p.toFixed(2)} 100`);
    fill.style.width = p.toFixed(2) + '%';
    const lit = Math.floor(p / 5);
    segs.forEach((s, i) => s.classList.toggle('on', i < lit));
    if (now - streamT > 70) {
      streamT = now;
      stream.textContent = Array.from({ length: 6 }, () => rnd(4)).join(' ') + '  ' + ['▖', '▘', '▝', '▗'][(t / 70 | 0) % 4];
    }
    if (!ready && t >= READY_AT) {
      ready = true;
      const last = tasks.lastElementChild;
      if (last) { last.classList.add('ok'); last.querySelector('.it-ic').innerHTML = '✓'; last.querySelector('.it-det').textContent = detail(last.dataset.key, code); }
      stepEl.textContent = '✓';
      msgEl.textContent = WORD[lang].ready;
      root.classList.add('ready');
    }
    if (t >= FADE_AT) root.classList.add('leaving');
    if (t >= INTRO_MS) { finish(); return; }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  function finish() {
    if (ended) return;
    ended = true;
    cancelAnimationFrame(raf);
    root.classList.add('leaving');
    document.body.classList.remove('intro-open');
    resolve();
    setTimeout(() => root.remove(), 400);
  }
  return { done, finish };
}
