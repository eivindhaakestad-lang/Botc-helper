// Konvolutter på storskjermen: når en elev hvisker til en nabo, flyr en svak, gjennomsiktig
// konvolutt fra avsenderen til mottakeren (slik som i den offisielle appen).
// Storskjermen får bare hvem som sendte til hvem – aldri hva som står i meldingen.
// Meldinger til Storytelleren gir ingen konvolutt.

const FLY_MS = 1700;
const ENVELOPE = `<svg viewBox="0 0 48 34" aria-hidden="true">
<rect x="1.5" y="1.5" width="45" height="31" rx="4" fill="#f3e3bd" stroke="#8a6424" stroke-width="2"/>
<path d="M3 4 L24 20 L45 4" fill="none" stroke="#8a6424" stroke-width="2" stroke-linejoin="round"/>
<path d="M3 31 L18 16 M45 31 L30 16" fill="none" stroke="#b8935a" stroke-width="1.6"/>
<circle cx="24" cy="20" r="4.2" fill="#b3141f"/>
</svg>`;

function layer() {
  let el = document.getElementById('letters');
  if (!el) {
    el = document.createElement('div');
    el.id = 'letters';
    el.className = 'letters';
    el.setAttribute('aria-hidden', 'true');
    document.body.append(el);
  }
  return el;
}

function centerOf(seatId) {
  const slot = document.querySelector(`#screen .grim-slot[data-seat="${CSS.escape(seatId)}"]`);
  if (!slot) return null;
  const disc = slot.querySelector('.token-disc, .vc-token') || slot;
  const r = disc.getBoundingClientRect();
  if (!r.width) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, size: r.width };
}

export function flyLetter(from, to) {
  if (document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const a = centerOf(from);
  const b = centerOf(to);
  if (!a || !b) return;
  const el = document.createElement('div');
  el.className = 'letter';
  el.innerHTML = ENVELOPE;
  const w = Math.max(30, Math.min(64, a.size * 0.42));
  el.style.width = w + 'px';
  layer().append(el);
  // En liten bue: midtpunktet løftes vinkelrett på linja, bort fra sentrum av sirkelen
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const grim = document.querySelector('#screen .grim, #screen .vote-circle, #screen .screen-grim');
  const gr = grim ? grim.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const cx = gr.left + gr.width / 2;
  const cy = gr.top + gr.height / 2;
  let nx = -dy / len;
  let ny = dx / len;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
  const lift = Math.min(70, 18 + len * 0.22);
  const tilt = Math.max(-18, Math.min(18, dx / 12));
  const pos = (x, y) => `translate(${(x - w / 2).toFixed(1)}px, ${(y - w * 0.35).toFixed(1)}px)`;
  const anim = el.animate([
    { transform: `${pos(a.x, a.y)} scale(0.4) rotate(0deg)`, opacity: 0 },
    { transform: `${pos(a.x + dx * 0.12 + nx * lift * 0.5, a.y + dy * 0.12 + ny * lift * 0.5)} scale(0.9) rotate(${-tilt}deg)`, opacity: 0.42, offset: 0.18 },
    { transform: `${pos(mx + nx * lift, my + ny * lift)} scale(1) rotate(${tilt * 0.4}deg)`, opacity: 0.42, offset: 0.5 },
    { transform: `${pos(b.x - dx * 0.12 + nx * lift * 0.5, b.y - dy * 0.12 + ny * lift * 0.5)} scale(0.9) rotate(${tilt}deg)`, opacity: 0.38, offset: 0.82 },
    { transform: `${pos(b.x, b.y)} scale(0.4) rotate(0deg)`, opacity: 0 },
  ], { duration: FLY_MS, easing: 'cubic-bezier(.45, .05, .55, .95)', fill: 'forwards' });
  anim.onfinish = () => el.remove();
  setTimeout(() => el.remove(), FLY_MS + 500);
}
