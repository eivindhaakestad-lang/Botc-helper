// Vær og landskap på storskjermen, etter årstid.
// Natt: måne, skyer og regn (vinter: snø). Dag: sol, skyer, av og til regn, og en ørn som flyr forbi.
// Høst: blader som faller sakte. Vinter: snø (aldri regn). Vår: litt regn og en dempet regnbue noen dager.
// Landskapet (åser, landsby med klokketårn, eik) ligger nederst bak grimen, og om dagen løper
// en av sauene over bakken nå og da. Bare transform/opacity-animasjoner og lette canvas.

import { hillsSvg, frontSvg, villageSvg, seasonFor } from './scenery.js';
import { allLooks, sheepUrl } from '../live/sheep.js';

const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const chance = (p) => Math.random() < p;

// Sjansene for hvert vær etter årstid
const ODDS = {
  summer: { nightClouds: 0.35, nightRain: 0.12, dayClouds: 0.3, dayRain: 0.05 },
  autumn: { nightClouds: 0.6, nightRain: 0.4, dayClouds: 0.5, dayRain: 0.2, leaves: 0.55 },
  winter: { nightClouds: 0.65, nightRain: 0, dayClouds: 0.7, dayRain: 0, snow: 0.55 },
  spring: { nightClouds: 0.5, nightRain: 0.3, dayClouds: 0.45, dayRain: 0.25, rainbow: 0.35 },
};

// Samme vær hele natten/dagen, også om skjermen lastes på nytt
function sceneFor(key, type, season) {
  const sk = 'botc-sky-' + key;
  try { const v = JSON.parse(sessionStorage.getItem(sk) || 'null'); if (v && v.type === type && v.season === season) return v; } catch { /* */ }
  const o = ODDS[season] || ODDS.summer;
  let sc;
  if (type === 'night') {
    sc = { type, season, clouds: chance(o.nightClouds), rain: chance(o.nightRain), moon: chance(0.6) ? (chance(0.5) ? 'full' : 'half') : null };
    if (!sc.clouds && !sc.rain && !sc.moon) sc.moon = chance(0.5) ? 'full' : 'half';
    if (o.nightRain && chance(0.12)) sc = { ...sc, clouds: true, rain: true, moon: chance(0.5) ? 'full' : 'half' }; // alt på en gang
  } else {
    sc = { type, season, clouds: chance(o.dayClouds), rain: chance(o.dayRain) };
    sc.sun = !sc.rain || season === 'spring';
    if (sc.rain) sc.clouds = true;
  }
  sc.snow = !!o.snow && chance(o.snow);
  sc.leaves = !!o.leaves && chance(o.leaves);
  sc.rainbow = type === 'day' && !!o.rainbow && chance(sc.rain ? 0.6 : o.rainbow);
  if (sc.snow) sc.rain = false;
  try { sessionStorage.setItem(sk, JSON.stringify(sc)); } catch { /* */ }
  return sc;
}

// ——— regn (halv oppløsning, ett strøk per lag) ———
function startRain(canvas, day) {
  const ctx = canvas.getContext('2d');
  let w = 0; let h = 0; let drops = [];
  const resize = () => {
    w = canvas.width = Math.round(window.innerWidth / 2);
    h = canvas.height = Math.round(window.innerHeight / 2);
    const n = Math.round((w * h) / (day ? 3200 : 2250));
    drops = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, z: 0.4 + Math.random() * 0.6 }));
  };
  resize();
  window.addEventListener('resize', resize);
  let last = performance.now();
  const step = (now) => {
    if (!canvas.isConnected) { window.removeEventListener('resize', resize); return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    for (const far of [true, false]) {
      ctx.strokeStyle = day ? (far ? 'rgba(70,90,130,0.2)' : 'rgba(60,80,125,0.32)') : (far ? 'rgba(170,190,240,0.22)' : 'rgba(200,215,255,0.38)');
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
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ——— snø og høstblader som daler sakte ———
const LEAF_COLS = ['#d9662b', '#e8a23a', '#c0392b', '#f2c14e', '#b5482a'];
function startFall(canvas, kind, night) {
  const ctx = canvas.getContext('2d');
  const snow = kind === 'snow';
  let w = 0; let h = 0; let parts = [];
  const make = (init) => ({
    x: Math.random() * w, y: init ? Math.random() * h : -8, ph: Math.random() * 6.28,
    vy: snow ? 9 + Math.random() * 18 : 9 + Math.random() * 10, sw: snow ? 5 + Math.random() * 10 : 10 + Math.random() * 18,
    r: snow ? 0.6 + Math.random() * 1.7 : 2.6 + Math.random() * 2.4, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 1.6,
    c: LEAF_COLS[Math.floor(Math.random() * LEAF_COLS.length)],
  });
  const resize = () => {
    w = canvas.width = Math.round(window.innerWidth / 2);
    h = canvas.height = Math.round(window.innerHeight / 2);
    const n = snow ? Math.round((w * h) / 1500) : Math.max(10, Math.min(36, Math.round((w * h) / 9000)));
    parts = Array.from({ length: n }, () => make(true));
  };
  resize();
  window.addEventListener('resize', resize);
  let last = performance.now();
  const step = (now) => {
    if (!canvas.isConnected) { window.removeEventListener('resize', resize); return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    const t = now / 1000;
    last = now;
    ctx.clearRect(0, 0, w, h);
    if (snow) {
      ctx.fillStyle = night ? 'rgba(235,240,255,0.85)' : 'rgba(255,255,255,0.95)';
      ctx.beginPath();
    }
    for (const p of parts) {
      p.y += p.vy * dt;
      p.x += Math.cos(t * 0.9 + p.ph) * p.sw * dt;
      p.rot += p.vr * dt;
      if (p.y > h + 10) Object.assign(p, make(false));
      if (snow) { ctx.moveTo(p.x + p.r, p.y); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); continue; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot + Math.sin(t * 1.4 + p.ph) * 0.6);
      ctx.globalAlpha = night ? 0.55 : 0.9;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.moveTo(-p.r * 1.6, 0);
      ctx.quadraticCurveTo(0, -p.r * 1.1, p.r * 1.6, 0);
      ctx.quadraticCurveTo(0, p.r * 1.1, -p.r * 1.6, 0);
      ctx.fill();
      ctx.restore();
    }
    if (snow) ctx.fill();
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function cloudsHtml(day, grey) {
  const list = day
    ? [{ top: 4, w: 30, dur: 170, delay: -30, op: 0.9 }, { top: 18, w: 22, dur: 140, delay: -100, op: 0.75 }, { top: 40, w: 26, dur: 190, delay: -60, op: 0.6 }]
    : [{ top: 2, w: 46, dur: 140, delay: -20, op: 0.55 }, { top: 14, w: 34, dur: 105, delay: -70, op: 0.4 }, { top: 6, w: 58, dur: 180, delay: -120, op: 0.5 },
      { top: 30, w: 30, dur: 120, delay: -40, op: 0.28 }, { top: 52, w: 42, dur: 160, delay: -95, op: 0.22 }];
  const cls = day ? (grey ? ' grey-cloud' : ' day-cloud') : '';
  return list.map((c) => `<div class="cloud${cls}" style="top:${c.top}%;width:${c.w}vw;--dur:${c.dur}s;--delay:${c.delay}s;--op:${c.op}"></div>`).join('');
}

// Ørnen fra drømmespillet, som SVG med vinger som slår
const EAGLE = `<svg viewBox="-34 -22 64 36" class="eagle-svg"><g fill="#6b4a2b">
<path class="wing wing-back" d="M2 0 Q12 -8 22 -2 L6 5 Z"/>
<ellipse cx="0" cy="2" rx="16" ry="7"/><path d="M14 0 L26 -4 L26 8 Z"/>
<path class="wing wing-front" d="M-4 0 Q-16 -6 -28 0 L-6 5 Z"/></g>
<circle cx="-17" cy="0" r="6" fill="#f2eee6"/><path d="M-22 -2 L-29 1 L-22 3 Z" fill="#f1c877"/><circle cx="-18" cy="-2" r="1.4" fill="#16121f"/></svg>`;

const timers = [];
function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
function clearTimers() { timers.splice(0).forEach(clearTimeout); }

function scheduleBird(sky, first = false) {
  later(() => {
    if (!sky.isConnected || sky.classList.contains('leaving')) return;
    const b = document.createElement('div');
    b.className = 'bird';
    b.style.setProperty('--y', (8 + Math.random() * 30).toFixed(1) + 'vh');
    b.style.setProperty('--dur', (11 + Math.random() * 6).toFixed(1) + 's');
    b.style.setProperty('--size', (70 + Math.random() * 40).toFixed(0) + 'px');
    b.innerHTML = `<div class="bird-bob">${EAGLE}</div>`;
    b.addEventListener('animationend', (e) => { if (e.target === b) b.remove(); });
    sky.appendChild(b);
    scheduleBird(sky);
  }, first ? 6000 + Math.random() * 10000 : 25000 + Math.random() * 40000);
}

// En av elevenes sauer løper over bakken (fra venstre mot høyre, med bein som går)
function spawnRunner(land, dur, y) {
  const looks = allLooks();
  const look = looks.length ? looks[Math.floor(Math.random() * looks.length)] : { color: 'white', face: 'happy' };
  const r = document.createElement('div');
  r.className = 'runner';
  r.style.setProperty('--dur', dur.toFixed(1) + 's');
  r.style.setProperty('--y', y.toFixed(1) + 'vh');
  r.innerHTML = `<div class="runner-bob"><span class="runner-leg"></span><span class="runner-leg b"></span><img src="${sheepUrl(look, { view: 'body' })}" alt=""></div>`;
  r.addEventListener('animationend', (e) => { if (e.target === r) r.remove(); });
  land.appendChild(r);
}
function scheduleRunner(land, first = false) {
  later(() => {
    if (!land.isConnected || land.classList.contains('leaving')) return;
    spawnRunner(land, 9 + Math.random() * 5, 1.5 + Math.random() * 3);
    scheduleRunner(land);
  }, first ? 12000 + Math.random() * 12000 : 30000 + Math.random() * 40000);
}

// Landsbyen legges midt under grimen (kalles etter hver ny tegning av skjermen)
export function placeLand() {
  const land = document.getElementById('land');
  const grim = document.querySelector('#screen .screen-grim .grim');
  if (!land || !grim) return;
  const r = grim.getBoundingClientRect();
  land.style.setProperty('--land-x', (r.left + r.width / 2).toFixed(0) + 'px');
}

let currentKey = null;
export function syncWeather(phase, enabled, code, season = seasonFor()) {
  const type = phase && (phase.type === 'night' || phase.type === 'day') ? phase.type : null;
  const key = type ? `${code}-${type}${phase.number}-${season}-${enabled ? 1 : 0}` : null;
  document.documentElement.classList.remove('season-spring', 'season-summer', 'season-autumn', 'season-winter');
  if (type) document.documentElement.classList.add('season-' + season);
  if (key === currentKey) return;
  currentKey = key;
  for (const id of ['sky', 'land']) {
    const old = document.getElementById(id);
    if (old) { old.id = ''; old.classList.add('leaving'); setTimeout(() => old.remove(), 1600); }
  }
  clearTimers();
  if (!key) return;
  const night = type === 'night';
  const sc = sceneFor(`${code}-${type}${phase.number}-${season}`, type, season);

  // Landskapet (alltid, også når været er slått av)
  const land = document.createElement('div');
  land.id = 'land';
  land.className = `land land-${type} land-${season}`;
  land.setAttribute('aria-hidden', 'true');
  land.innerHTML = (enabled && sc.rainbow ? '<div class="rainbow"></div>' : '')
    + hillsSvg(season, night) + villageSvg(season, night) + frontSvg(season, night);
  document.body.prepend(land);
  placeLand();

  if (!enabled) return;
  const el = document.createElement('div');
  el.id = 'sky';
  el.className = `sky sky-${type} sky-${season}`;
  el.setAttribute('aria-hidden', 'true');
  el.dataset.scene = JSON.stringify(sc);
  let html = '';
  if (night) {
    if (sc.moon) html += `<div class="moon moon-${sc.moon}"><div class="moon-glow"></div><div class="moon-disc"><i></i><i></i><i></i></div></div>`;
    if (sc.clouds) html += cloudsHtml(false);
  } else {
    if (sc.sun) html += '<div class="sun"><div class="sun-rays"></div><div class="sun-disc"></div></div>';
    if (sc.clouds) html += cloudsHtml(true, sc.rain || season === 'winter');
  }
  if (sc.rain) html += '<canvas class="rain-canvas"></canvas>';
  if (sc.snow || sc.leaves) html += '<canvas class="fall-canvas"></canvas>';
  el.innerHTML = html;
  document.body.prepend(el);
  if (reduced()) return;
  if (sc.rain) startRain(el.querySelector('.rain-canvas'), !night);
  if (sc.snow || sc.leaves) startFall(el.querySelector('.fall-canvas'), sc.snow ? 'snow' : 'leaves', night);
  if (!night) { scheduleBird(el, true); scheduleRunner(land, true); }
}

// Fra tannhjulet: la en sau løpe over med en gang
export function runSheepNow() {
  const land = document.getElementById('land');
  if (land) spawnRunner(land, 10, 2.5);
}
