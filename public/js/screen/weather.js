// Vær på storskjermen. Natt: tilfeldig regn, skyer og måne (full eller halv) – eller alt samtidig.
// Dag: sol, av og til skyer, og en ørn (som i drømmespillet) som flyr forbi nå og da.
// Bare transform/opacity-animasjoner og et lett canvas for regnet. Ligger bak alt innhold.

const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// Samme vær hele natten/dagen, også om skjermen lastes på nytt
function sceneFor(key, type) {
  const sk = 'botc-sky-' + key;
  try { const v = JSON.parse(sessionStorage.getItem(sk) || 'null'); if (v && v.type === type) return v; } catch { /* */ }
  let sc;
  if (type === 'night') {
    sc = { type, clouds: Math.random() < 0.55, rain: Math.random() < 0.4, moon: Math.random() < 0.6 ? (Math.random() < 0.5 ? 'full' : 'half') : null };
    if (!sc.clouds && !sc.rain && !sc.moon) sc.moon = Math.random() < 0.5 ? 'full' : 'half';
    if (Math.random() < 0.12) sc = { type, clouds: true, rain: true, moon: Math.random() < 0.5 ? 'full' : 'half' }; // alt på en gang
  } else {
    sc = { type, sun: true, clouds: Math.random() < 0.45 };
  }
  try { sessionStorage.setItem(sk, JSON.stringify(sc)); } catch { /* */ }
  return sc;
}

// ——— regn (halv oppløsning, ett strøk per lag) ———
function startRain(canvas) {
  const ctx = canvas.getContext('2d');
  let w = 0; let h = 0; let drops = [];
  const resize = () => {
    w = canvas.width = Math.round(window.innerWidth / 2);
    h = canvas.height = Math.round(window.innerHeight / 2);
    const n = Math.round((w * h) / 2250);
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
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function cloudsHtml(day) {
  const list = day
    ? [{ top: 4, w: 30, dur: 170, delay: -30, op: 0.9 }, { top: 18, w: 22, dur: 140, delay: -100, op: 0.75 }, { top: 62, w: 26, dur: 190, delay: -60, op: 0.6 }]
    : [{ top: 2, w: 46, dur: 140, delay: -20, op: 0.55 }, { top: 14, w: 34, dur: 105, delay: -70, op: 0.4 }, { top: 6, w: 58, dur: 180, delay: -120, op: 0.5 },
      { top: 30, w: 30, dur: 120, delay: -40, op: 0.28 }, { top: 52, w: 42, dur: 160, delay: -95, op: 0.22 }, { top: 70, w: 36, dur: 130, delay: -10, op: 0.2 }];
  return list.map((c) => `<div class="cloud${day ? ' day-cloud' : ''}" style="top:${c.top}%;width:${c.w}vw;--dur:${c.dur}s;--delay:${c.delay}s;--op:${c.op}"></div>`).join('');
}

// Ørnen fra drømmespillet, som SVG med vinger som slår
const EAGLE = `<svg viewBox="-34 -22 64 36" class="eagle-svg"><g fill="#6b4a2b">
<path class="wing wing-back" d="M2 0 Q12 -8 22 -2 L6 5 Z"/>
<ellipse cx="0" cy="2" rx="16" ry="7"/><path d="M14 0 L26 -4 L26 8 Z"/>
<path class="wing wing-front" d="M-4 0 Q-16 -6 -28 0 L-6 5 Z"/></g>
<circle cx="-17" cy="0" r="6" fill="#f2eee6"/><path d="M-22 -2 L-29 1 L-22 3 Z" fill="#f1c877"/><circle cx="-18" cy="-2" r="1.4" fill="#16121f"/></svg>`;

let birdTimer = null;
function scheduleBird(sky, first = false) {
  clearTimeout(birdTimer);
  const wait = first ? 6000 + Math.random() * 10000 : 25000 + Math.random() * 40000;
  birdTimer = setTimeout(() => {
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
  }, wait);
}

let currentKey = null;
export function syncWeather(phase, enabled, code) {
  const type = phase && (phase.type === 'night' || phase.type === 'day') ? phase.type : null;
  const key = type && enabled ? `${code}-${type}${phase.number}` : null;
  if (key === currentKey) return;
  currentKey = key;
  const old = document.getElementById('sky');
  if (old) { old.id = ''; old.classList.add('leaving'); setTimeout(() => old.remove(), 1600); }
  clearTimeout(birdTimer);
  if (!key) return;
  const sc = sceneFor(key, type);
  const el = document.createElement('div');
  el.id = 'sky';
  el.className = 'sky sky-' + type;
  el.setAttribute('aria-hidden', 'true');
  el.dataset.scene = JSON.stringify(sc);
  let html = '';
  if (type === 'night') {
    if (sc.moon) html += `<div class="moon moon-${sc.moon}"><div class="moon-glow"></div><div class="moon-disc"><i></i><i></i><i></i></div></div>`;
    if (sc.clouds) html += cloudsHtml(false);
    if (sc.rain) html += '<canvas class="rain-canvas"></canvas>';
  } else {
    html += '<div class="sun"><div class="sun-rays"></div><div class="sun-disc"></div></div>';
    if (sc.clouds) html += cloudsHtml(true);
  }
  el.innerHTML = html;
  document.body.prepend(el);
  if (sc.rain && !reduced()) startRain(el.querySelector('canvas'));
  if (type === 'day' && !reduced()) scheduleBird(el, true);
}
