// De store dødsanimasjonene som går utenfor sirkelen: rakettferd, meteornedslag og drage.
// Tegnes i et eget lag over hele skjermen (uavhengig av at storskjermen tegnes på nytt),
// og er tidsstyrt mot DEATH_MS (3,2 s) slik at de passer med animasjonen inne i sirkelen.

const T = 3200;

const DRAGON = `<svg viewBox="0 0 240 140" aria-hidden="true">
<defs><linearGradient id="bdg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a32b38"/><stop offset="1" stop-color="#5a1220"/></linearGradient></defs>
<g><path d="M112 64 L66 6 L90 20 L98 2 L112 24 L126 8 L130 42 Z" fill="#4a0f1a"/><animateTransform attributeName="transform" type="rotate" values="0 116 64;30 116 64;0 116 64" dur="0.55s" repeatCount="indefinite"/></g>
<path d="M82 78 C58 86 38 70 22 76 C10 80 8 92 18 94 C12 86 24 84 32 88 C50 96 72 96 92 88 Z" fill="url(#bdg)"/>
<path d="M16 93 L2 86 L9 101 Z" fill="#5a1220"/>
<path d="M100 95 l-4 17 l9 0 M136 95 l2 17 l9 0" stroke="#5a1220" stroke-width="7" stroke-linecap="round" fill="none"/>
<ellipse cx="120" cy="80" rx="42" ry="21" fill="url(#bdg)"/>
<path d="M90 89 C106 99 134 99 152 88" fill="none" stroke="#e9b27a" stroke-width="7" stroke-linecap="round"/>
<path d="M96 61 l6 -9 l4 9 l6 -10 l4 10 l6 -9 l4 9" fill="#e9b27a"/>
<path d="M150 72 C168 64 172 52 186 50 L200 50 C210 50 222 56 229 62 L214 66 L227 72 C216 77 204 77 196 72 C188 72 178 82 158 93 Z" fill="url(#bdg)"/>
<path d="M190 51 L184 35 L197 48 Z M201 50 L203 36 L208 52 Z" fill="#e9b27a"/>
<circle cx="206" cy="57" r="2.8" fill="#ffd54a"/><circle cx="206.6" cy="57" r="1.1" fill="#1a0a00"/>
<g><path d="M122 66 L98 0 L120 18 L132 -2 L142 22 L166 8 L152 46 Z" fill="#7a1f2b" stroke="#4a0f1a" stroke-width="2" stroke-linejoin="round"/><path d="M122 66 L120 18 M122 66 L142 22 M122 66 L166 8" stroke="#4a0f1a" stroke-width="2"/><animateTransform attributeName="transform" type="rotate" values="0 124 66;34 124 66;0 124 66" dur="0.55s" repeatCount="indefinite"/></g>
</svg>`;

const ROCKET = `<svg viewBox="0 0 40 96" aria-hidden="true">
<path d="M20 2 C31 14 33 34 31 62 H9 C7 34 9 14 20 2 Z" fill="#eef1f6" stroke="#5a6273" stroke-width="2.4"/>
<path d="M20 2 C26 8 29 15 30 22 H10 C11 15 14 8 20 2 Z" fill="#e0303c"/>
<circle cx="20" cy="36" r="6" fill="#7dd8ff" stroke="#5a6273" stroke-width="2.4"/>
<path d="M9 48 L1 66 L9 62 Z M31 48 L39 66 L31 62 Z" fill="#e0303c" stroke="#5a6273" stroke-width="2" stroke-linejoin="round"/>
<rect x="12" y="62" width="16" height="5" rx="1.5" fill="#8a93a3"/>
</svg>`;

function layer() {
  let el = document.getElementById('bigfx');
  if (!el) {
    el = document.createElement('div');
    el.id = 'bigfx';
    el.className = 'bigfx';
    el.setAttribute('aria-hidden', 'true');
    document.body.append(el);
  }
  return el;
}
function add(cls, html = '') {
  const el = document.createElement('div');
  el.className = cls;
  if (html) el.innerHTML = html;
  layer().append(el);
  setTimeout(() => el.remove(), T + 400);
  return el;
}
const px = (x, y) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;

/** Starter den store delen av animasjonen rundt elementet `anchor` (sirkelen til sauen). */
export function bigDeathFx(id, anchor) {
  if (!anchor || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = anchor.getBoundingClientRect();
  if (!r.width) return;
  const c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  const tok = r.width;
  if (id === 'rocket') rocket(c, tok, anchor);
  else if (id === 'meteor') meteor(c, tok);
  else if (id === 'dragon') dragon(c, tok);
}

// Sauen fester en rakett og skytes rett opp og ut av skjermen, med en røyksøyle etter seg.
function rocket(c, tok, anchor) {
  const img = anchor.querySelector('.fx-target');
  const w = tok * 0.95;
  const el = add('bd-rocket', `${img ? `<img class="bd-rocket-sheep" src="${img.src}" alt="">` : ''}<span class="bd-rocket-body">${ROCKET}</span><span class="bd-rocket-flame"></span>`);
  el.style.width = w + 'px';
  const top = -tok * 2.6;
  el.animate([
    { transform: px(c.x - w / 2, c.y - w * 0.55), opacity: 0 },
    { transform: px(c.x - w / 2, c.y - w * 0.55), opacity: 0, offset: 0.19 },
    { transform: px(c.x - w / 2, c.y - w * 0.6), opacity: 1, offset: 0.2, easing: 'cubic-bezier(.6, 0, 1, .7)' },
    { transform: px(c.x - w / 2 + 6, c.y - w * 0.6 - (c.y - top) * 0.25), opacity: 1, offset: 0.33, easing: 'cubic-bezier(.3, .3, .8, .9)' },
    { transform: px(c.x - w / 2 - 4, top), opacity: 1, offset: 0.55 },
    { transform: px(c.x - w / 2 - 4, top), opacity: 0, offset: 0.56 },
    { transform: px(c.x - w / 2, top), opacity: 0 },
  ], { duration: T, fill: 'forwards' });
  const tw = tok * 0.42;
  const trail = add('bd-trail');
  trail.style.cssText = `left:${(c.x - tw / 2).toFixed(1)}px;top:0;width:${tw.toFixed(1)}px;height:${(c.y + tok * 0.1).toFixed(1)}px`;
  trail.animate([
    { transform: 'scaleY(0)', opacity: 0 },
    { transform: 'scaleY(0)', opacity: 0, offset: 0.2 },
    { transform: 'scaleY(0.3)', opacity: 0.9, offset: 0.33 },
    { transform: 'scaleY(1)', opacity: 0.85, offset: 0.55 },
    { transform: 'scaleY(1) scaleX(2.2)', opacity: 0 },
  ].map((k) => ({ easing: 'ease-in', ...k })), { duration: T, fill: 'forwards' });
  const star = add('bd-twinkle', '✨');
  star.style.left = c.x + 'px';
  star.animate([
    { opacity: 0, transform: 'translate(-50%, 0) scale(0.2)' },
    { opacity: 0, transform: 'translate(-50%, 0) scale(0.2)', offset: 0.55 },
    { opacity: 1, transform: 'translate(-50%, 0) scale(1.4) rotate(20deg)', offset: 0.62 },
    { opacity: 0, transform: 'translate(-50%, 0) scale(0.6) rotate(60deg)', offset: 0.82 },
    { opacity: 0 },
  ], { duration: T, fill: 'forwards' });
}

// En glødende meteor kommer fra et hjørne av skjermen, smeller ned og sender en sjokkbølge over skjermen.
function meteor(c, tok) {
  const fromRight = c.x < innerWidth / 2;
  const sx = fromRight ? innerWidth + tok * 1.5 : -tok * 1.5;
  const sy = -tok * 1.5;
  const ang = Math.atan2(c.y - sy, c.x - sx) * (180 / Math.PI);
  const size = Math.max(36, tok * 0.5);
  const el = add('bd-meteor', '<span class="bd-meteor-tail"></span><span class="bd-meteor-rock"></span>');
  el.style.width = el.style.height = size + 'px';
  const at = (x, y) => `${px(x - size / 2, y - size / 2)} rotate(${ang.toFixed(1)}deg)`;
  el.animate([
    { transform: at(sx, sy), opacity: 1, easing: 'cubic-bezier(.5, 0, 1, .6)' },
    { transform: at(c.x, c.y), opacity: 1, offset: 0.219 },
    { transform: at(c.x, c.y), opacity: 0, offset: 0.23 },
    { transform: at(c.x, c.y), opacity: 0 },
  ], { duration: T, fill: 'forwards' });
  const flash = add('bd-flash');
  const fs = tok * 14;
  flash.style.cssText = `left:${(c.x - fs / 2).toFixed(1)}px;top:${(c.y - fs / 2).toFixed(1)}px;width:${fs.toFixed(1)}px;height:${fs.toFixed(1)}px`;
  flash.animate([{ opacity: 0 }, { opacity: 0, offset: 0.215 }, { opacity: 0.8, offset: 0.23 }, { opacity: 0, offset: 0.42 }, { opacity: 0 }], { duration: T, fill: 'forwards' });
  const ring = add('bd-ring');
  const rs = tok;
  ring.style.cssText = `left:${(c.x - rs / 2).toFixed(1)}px;top:${(c.y - rs / 2).toFixed(1)}px;width:${rs}px;height:${rs}px`;
  const grow = (Math.hypot(innerWidth, innerHeight) * 1.4) / rs;
  ring.animate([
    { transform: 'scale(0.2)', opacity: 0 },
    { transform: 'scale(0.2)', opacity: 0, offset: 0.22 },
    { transform: 'scale(0.6)', opacity: 0.9, offset: 0.24, easing: 'cubic-bezier(.2, .7, .4, 1)' },
    { transform: `scale(${(grow * 0.55).toFixed(1)})`, opacity: 0.45, offset: 0.48 },
    { transform: `scale(${grow.toFixed(1)})`, opacity: 0, offset: 0.8 },
    { transform: `scale(${grow.toFixed(1)})`, opacity: 0 },
  ], { duration: T, fill: 'forwards' });
  // Ristingen legges på overlegget (ikke på storskjermen selv), så ingenting annet på siden flytter seg
  layer().animate([
    { transform: 'none' }, { transform: 'none', offset: 0.22 },
    { transform: 'translate(-7px, 4px)', offset: 0.24 }, { transform: 'translate(6px, -5px)', offset: 0.26 },
    { transform: 'translate(-4px, -3px)', offset: 0.28 }, { transform: 'translate(3px, 3px)', offset: 0.3 },
    { transform: 'none', offset: 0.33 }, { transform: 'none' },
  ], { duration: T });
}

// En drage flyr inn fra den andre siden av skjermen, stopper over sauen og spruter ild, og flyr videre.
function dragon(c, tok) {
  const dir = c.x > innerWidth / 2 ? 1 : -1; // 1 = flyr mot høyre
  const W = Math.max(200, Math.min(520, tok * 3.6));
  const H = (W * 140) / 240;
  const mx = c.x - dir * tok * 0.95;
  const my = c.y - tok * 1.75;
  const hx = mx - (dir > 0 ? 0.95 * W : 0.05 * W);
  const hy = my - 0.5 * H;
  const flip = dir > 0 ? '' : ' scaleX(-1)';
  const startX = dir > 0 ? -W - 60 : innerWidth + 60;
  const endX = dir > 0 ? innerWidth + 60 : -W - 60;
  const el = add('bd-dragon', DRAGON);
  el.style.width = W + 'px';
  el.style.height = H + 'px';
  const at = (x, y, rot = 0) => `${px(x, y)}${flip} rotate(${rot}deg)`;
  el.animate([
    { transform: at(startX, hy - H * 0.5, -6), opacity: 1 },
    { transform: at((startX + hx) / 2, hy - H * 0.15, 4), offset: 0.16 },
    { transform: at(hx, hy, 0), offset: 0.3 },
    { transform: at(hx, hy - 6, -2), offset: 0.4 },
    { transform: at(hx, hy + 6, 2), offset: 0.5 },
    { transform: at(hx + dir * 14, hy - 8, -4), offset: 0.58 },
    { transform: at((hx + endX) / 2, hy - H * 0.6, -10), offset: 0.76 },
    { transform: at(endX, hy - H * 1.1, -12), opacity: 1, offset: 0.92 },
    { transform: at(endX, hy - H * 1.1, -12), opacity: 0 },
  ].map((k) => ({ easing: 'ease-in-out', ...k })), { duration: T, fill: 'forwards' });
  // Ildstrålen fra munnen ned til sauen
  const len = Math.hypot(c.x - mx, c.y - my);
  const ang = Math.atan2(c.y - my, c.x - mx) * (180 / Math.PI);
  const fh = tok * 0.42;
  const fire = add('bd-fire');
  fire.style.cssText = `left:${mx.toFixed(1)}px;top:${(my - fh / 2).toFixed(1)}px;width:${(len + tok * 0.2).toFixed(1)}px;height:${fh.toFixed(1)}px`;
  const rot = `rotate(${ang.toFixed(1)}deg)`;
  fire.animate([
    { transform: `${rot} scaleX(0)`, opacity: 0 },
    { transform: `${rot} scaleX(0)`, opacity: 0, offset: 0.3 },
    { transform: `${rot} scaleX(1) scaleY(0.8)`, opacity: 1, offset: 0.34 },
    { transform: `${rot} scaleX(1) scaleY(1.25)`, opacity: 1, offset: 0.4 },
    { transform: `${rot} scaleX(1.03) scaleY(0.9)`, opacity: 1, offset: 0.46 },
    { transform: `${rot} scaleX(1) scaleY(1.2)`, opacity: 1, offset: 0.52 },
    { transform: `${rot} scaleX(1) scaleY(0.6)`, opacity: 0, offset: 0.6 },
    { transform: `${rot} scaleX(0)`, opacity: 0 },
  ], { duration: T, fill: 'forwards' });
}
