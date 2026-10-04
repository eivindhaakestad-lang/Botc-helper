// Saueparaden på storskjermen: når Storytelleren låser rommet marsjerer sauene inn fra venstre
// langs bunnen av skjermen, én og én, og hopper opp på plassen sin i sirkelen.
// Sauene i sirkelen skjules (med et eget stilark, så det tåler at skjermen tegnes på nytt)
// til «sin» sau har landet.

import { sfx } from '../live/sound.js';

let running = null;

export function playParade(root) {
  if (running) running.stop();
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const grim = root && root.querySelector('.screen-grim .grim');
  const slots = root ? [...root.querySelectorAll('.screen-grim .grim-slot[data-seat]')].filter((el) => el.querySelector('.token-disc .sheep-clip > .token-sheep')) : [];
  if (!grim || !slots.length) return;

  const style = document.createElement('style');
  document.head.appendChild(style);
  const waiting = new Set(slots.map((el) => el.dataset.seat));
  const esc = (id) => (window.CSS && CSS.escape ? CSS.escape(id) : id);
  const sync = () => {
    style.textContent = [...waiting].map((id) => `#screen .grim-slot[data-seat="${esc(id)}"] .token-disc .sheep-clip > .token-sheep, #screen .grim-slot[data-seat="${esc(id)}"] .sheep-frame, #screen .grim-slot[data-seat="${esc(id)}"] .ghost-lantern { visibility: hidden; }`).join('\n');
  };
  sync();
  const layer = document.createElement('div');
  layer.className = 'parade-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  const timers = [];
  const stop = () => { timers.forEach(clearTimeout); layer.remove(); style.remove(); if (running && running.layer === layer) running = null; };
  running = { stop, layer };

  const gr = grim.getBoundingClientRect();
  const gx = gr.left + gr.width / 2;
  const W = window.innerWidth;
  const H = window.innerHeight;
  slots.forEach((el, i) => {
    const id = el.dataset.seat;
    const img = el.querySelector('.token-disc .sheep-clip > .token-sheep');
    const r = img.getBoundingClientRect();
    const w = r.width;
    const hgt = r.height;
    const m = document.createElement('div');
    m.className = 'parade-sheep';
    m.style.width = w + 'px';
    m.style.height = hgt + 'px';
    const pic = document.createElement('img');
    pic.src = img.src;
    pic.alt = '';
    m.appendChild(pic);
    layer.appendChild(m);
    const y0 = H - hgt * 1.1;
    const x0 = -w - 20;
    const x1 = gx - w / 2;
    const walkMs = 1300 + ((x1 - x0) / Math.max(1, W)) * 900;
    const delay = i * 320;
    const walk = m.animate([{ transform: `translate(${x0}px, ${y0}px)` }, { transform: `translate(${x1}px, ${y0}px)` }], { duration: walkMs, delay, easing: 'linear', fill: 'both' });
    walk.onfinish = () => {
      m.classList.add('hop');
      // Hopp i en bue opp til plassen
      const x2 = r.left;
      const y2 = r.top;
      const cx = (x1 + x2) / 2;
      const cy = Math.min(y0, y2) - Math.max(90, Math.abs(y0 - y2) * 0.35);
      const frames = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        const bx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
        const by = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y2;
        const sc = 1 + Math.sin(Math.PI * t) * 0.22;
        const rot = Math.sin(Math.PI * t) * (x2 > x1 ? 14 : -14);
        frames.push({ transform: `translate(${bx}px, ${by}px) scale(${sc}) rotate(${rot}deg)` });
      }
      const hop = m.animate(frames, { duration: 780, easing: 'cubic-bezier(.35,.1,.45,1)', fill: 'both' });
      hop.onfinish = () => {
        waiting.delete(id);
        sync();
        m.remove();
        const slot = document.querySelector(`#screen .grim-slot[data-seat="${esc(id)}"]`);
        if (slot) { slot.classList.add('parade-land'); timers.push(setTimeout(() => slot.classList.remove('parade-land'), 650)); }
        sfx.pop();
        if (i % 3 === 0) sfx.baa(0.85 + ((i * 37) % 30) / 100);
        if (!waiting.size) { timers.push(setTimeout(() => { sfx.reveal(); stop(); }, 400)); }
      };
    };
  });
  // Sikkerhetsnett: rydd opp uansett etter at alle skulle vært framme
  timers.push(setTimeout(stop, slots.length * 320 + 6000));
}
