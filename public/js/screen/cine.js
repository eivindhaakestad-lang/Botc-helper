// Overgang mellom dag og natt på storskjermen: byen i silhuett, sol og måne,
// vinduer som tennes eller slukkes, og klokketårnet som slår dagens nummer.
// Legges over alt annet (utenfor #screen) så vanlige oppdateringer ikke avbryter den.

import { sfx } from '../live/sound.js';

let town = null;
function townSvg() {
  if (town) return town;
  // Fast «tilfeldig» by (samme hver gang)
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const W = 1600;
  const base = 400;
  let houses = '';
  let wins = '';
  let x = -20;
  let wi = 0;
  while (x < W + 20) {
    const w = 70 + rnd() * 90;
    const hgt = 70 + rnd() * 110;
    const cx = x + w / 2;
    if (Math.abs(cx - W / 2) < 110) { x += w * 0.6; continue; } // plass til tårnet
    const roof = rnd() < 0.6 ? 'gable' : 'flat';
    const top = base - hgt;
    houses += roof === 'gable'
      ? `<path d="M${x.toFixed(0)} ${base} V${top.toFixed(0)} L${cx.toFixed(0)} ${(top - 30 - rnd() * 25).toFixed(0)} L${(x + w).toFixed(0)} ${top.toFixed(0)} V${base} Z"/>`
      : `<rect x="${x.toFixed(0)}" y="${top.toFixed(0)}" width="${w.toFixed(0)}" height="${hgt.toFixed(0)}"/>`;
    if (rnd() < 0.35) houses += `<rect x="${(x + w * 0.7).toFixed(0)}" y="${(top - 38).toFixed(0)}" width="12" height="40"/>`;
    const rows = Math.max(1, Math.floor(hgt / 45));
    const cols = Math.max(1, Math.floor(w / 38));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rnd() < 0.45) continue;
        const wx = x + 12 + c * ((w - 24) / cols) + 4;
        const wy = top + 18 + r * 42;
        wins += `<rect class="win" style="--d:${(wi++ % 17) * 0.09 + rnd() * 0.5}s" x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="13" height="18" rx="2"/>`;
      }
    }
    x += w + rnd() * 8;
  }
  // Klokketårnet
  const tx = W / 2;
  const tower = `<path d="M${tx - 70} ${base} V175 H${tx - 58} V120 H${tx + 58} V175 H${tx + 70} V${base} Z"/>`
    + `<path d="M${tx - 66} 122 L${tx} 20 L${tx + 66} 122 Z"/><rect x="${tx - 3}" y="2" width="6" height="22"/>`;
  const clock = `<circle class="clock-face" cx="${tx}" cy="165" r="34"/>`
    + `<line class="clock-hand" x1="${tx}" y1="165" x2="${tx}" y2="140"/><line class="clock-hand" x1="${tx}" y1="165" x2="${tx + 17}" y2="165"/>`;
  const towerWins = `<rect class="win" style="--d:1.2s" x="${tx - 12}" y="235" width="24" height="36" rx="12"/><rect class="win" style="--d:1.5s" x="${tx - 12}" y="300" width="24" height="36" rx="12"/>`;
  town = `<svg class="cine-town" viewBox="0 0 ${W} ${base}" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><g class="town-shape">${houses}${tower}</g>${clock}<g class="wins">${wins}${towerWins}</g></svg>`;
  return town;
}

let active = null;
export function playPhaseCine(type, number, label) {
  if (type !== 'night' && type !== 'day') return;
  if (active) { active.remove(); active = null; }
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div');
  el.className = `cine cine-${type}${reduced ? ' reduced' : ''}`;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="cine-sky sky-from"></div><div class="cine-sky sky-to"></div><div class="cine-stars"></div>`
    + `<div class="cine-sun"></div><div class="cine-moon"></div>${townSvg()}`
    + `<div class="cine-title display"></div>`;
  el.querySelector('.cine-title').textContent = label;
  document.body.appendChild(el);
  active = el;
  // Klokketårnet slår nummeret på natten/dagen
  sfx.toll(Math.max(1, number), type === 'night' ? 1.2 : 1.6);
  const total = reduced ? 2500 : 5200 + Math.min(12, number) * 250;
  setTimeout(() => el.classList.add('out'), total - 900);
  setTimeout(() => { el.remove(); if (active === el) active = null; }, total);
}

// ——— Grim reveal: grimoiren slås opp med lyn, lysstråler og gnister ———
export const REVEAL_CINE_MS = 5600;
export function playRevealCine(title, sub) {
  if (active) { active.remove(); active = null; }
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div');
  el.className = 'cine cine-reveal' + (reduced ? ' reduced' : '');
  el.setAttribute('aria-hidden', 'true');
  let sparks = '';
  for (let i = 0; i < 36; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    sparks += `<span class="spark" style="--x:${(Math.abs(x) * 100).toFixed(1)}%;--d:${(1.4 + (i % 9) * 0.22).toFixed(2)}s;--s:${(0.6 + (i % 5) * 0.25).toFixed(2)}"></span>`;
  }
  el.innerHTML = '<div class="rv-flash"></div><div class="rv-rays"></div>'
    + '<div class="rv-book"><div class="rv-page rv-left"></div><div class="rv-page rv-right"></div><div class="rv-glow"></div></div>'
    + `<div class="rv-sparks">${sparks}</div><div class="rv-title display"></div><div class="rv-sub"></div>`;
  el.querySelector('.rv-title').textContent = title;
  el.querySelector('.rv-sub').textContent = sub || '';
  document.body.appendChild(el);
  active = el;
  sfx.boom();
  setTimeout(() => sfx.gong(), 700);
  setTimeout(() => sfx.reveal(), 1500);
  setTimeout(() => sfx.toll(3), 2300);
  const total = reduced ? 2500 : REVEAL_CINE_MS;
  setTimeout(() => el.classList.add('out'), total - 900);
  setTimeout(() => { el.remove(); if (active === el) active = null; }, total);
}

// ——— Nattvær på storskjermen: skyer som driver over (CSS-transform) og regn (lett canvas) ———
let rainRaf = 0;
function startRain(canvas) {
  const ctx = canvas.getContext('2d');
  let w = 0; let h = 0; let drops = [];
  const resize = () => {
    // Halv oppløsning: regn trenger ikke skarpe piksler, og det sparer svake projektor-PC-er
    w = canvas.width = Math.round(window.innerWidth / 2);
    h = canvas.height = Math.round(window.innerHeight / 2);
    const n = Math.round((w * h) / 2250);
    drops = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, z: 0.4 + Math.random() * 0.6 }));
  };
  resize();
  window.addEventListener('resize', resize);
  let last = performance.now();
  const step = (now) => {
    if (!canvas.isConnected) { window.removeEventListener('resize', resize); rainRaf = 0; return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    for (const far of [true, false]) {
      ctx.strokeStyle = far ? 'rgba(170,190,240,0.22)' : 'rgba(200,215,255,0.38)';
      ctx.lineWidth = far ? 0.6 : 0.9;
      ctx.beginPath();
      for (const d of drops) {
        if ((d.z < 0.7) !== far) continue;
        const v = 350 * d.z;
        d.y += v * dt;
        d.x += v * 0.14 * dt;
        if (d.y > h + 15) { d.y = -15; d.x = Math.random() * (w + 50) - 50; }
        const len = 5 + 9 * d.z;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - len * 0.14, d.y - len);
      }
      ctx.stroke();
    }
    rainRaf = requestAnimationFrame(step);
  };
  cancelAnimationFrame(rainRaf);
  rainRaf = requestAnimationFrame(step);
}

export function syncNightWeather(on) {
  let el = document.getElementById('night-weather');
  if (!on) { if (el && !el.classList.contains('leaving')) { el.classList.add('leaving'); setTimeout(() => el.remove(), 1600); } return; }
  if (el && !el.classList.contains('leaving')) return;
  if (el) el.remove();
  el = document.createElement('div');
  el.id = 'night-weather';
  el.className = 'night-weather';
  el.setAttribute('aria-hidden', 'true');
  const clouds = [
    { top: 2, w: 46, dur: 140, delay: -20, op: 0.55 },
    { top: 14, w: 34, dur: 105, delay: -70, op: 0.4 },
    { top: 6, w: 58, dur: 180, delay: -120, op: 0.5 },
    { top: 30, w: 30, dur: 120, delay: -40, op: 0.28 },
    { top: 52, w: 42, dur: 160, delay: -95, op: 0.22 },
    { top: 70, w: 36, dur: 130, delay: -10, op: 0.2 },
  ];
  el.innerHTML = clouds.map((c) => `<div class="cloud" style="top:${c.top}%;width:${c.w}vw;--dur:${c.dur}s;--delay:${c.delay}s;--op:${c.op}"></div>`).join('')
    + '<canvas class="rain-canvas"></canvas>';
  document.body.prepend(el);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) startRain(el.querySelector('canvas'));
}
