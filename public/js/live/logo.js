// Logoen: «Eivinds Blood on the Clocktower-assistent».
// Et emblem (urskive med blodmåne, klokketårn og en bloddråpe) og et ordmerke.
// Brukes på startsiden, i toppfeltet, på elevsiden, lasteskjermen og storskjermen.

export const LOGO_TEXT = {
  no: 'Eivinds Blood on the Clocktower-assistent',
  en: "Eivind's Blood on the Clocktower Assistant",
};
const WORDS = {
  no: { top: 'Eivinds', sub: 'assistent' },
  en: { top: "Eivind's", sub: 'Assistant' },
};

let uid = 0;
const f = (n) => +n.toFixed(2);

function ticks() {
  let s = '';
  for (let i = 0; i < 60; i++) {
    const a = (i * 6 * Math.PI) / 180;
    const major = i % 5 === 0;
    const r1 = major ? 80 : 84.5;
    const r2 = 89;
    s += `<line x1="${f(Math.sin(a) * r1)}" y1="${f(-Math.cos(a) * r1)}" x2="${f(Math.sin(a) * r2)}" y2="${f(-Math.cos(a) * r2)}" stroke-width="${major ? 2.4 : 0.9}"/>`;
  }
  return s;
}
const TICKS = ticks();

const STARS = [[-52, -30, 1.5], [-40, -54, 1.1], [48, -44, 1.3], [58, -16, 1], [-60, -8, 1], [30, -62, 1.1], [-22, -66, 0.9], [62, 8, 0.9], [-64, 16, 1.2], [42, -6, 0.8]];

/** Emblemet som SVG-tekst. anim: urviseren går rundt, stjernene blinker og en dråpe faller. */
export function emblemSvg({ anim = false, cls = '' } = {}) {
  const n = ++uid;
  const id = (k) => `lg${n}-${k}`;
  const stars = STARS.map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#f6e7c1">${anim ? `<animate attributeName="opacity" values="1;0.25;1" dur="${(1.6 + (i % 4) * 0.55).toFixed(2)}s" begin="${(i * 0.23).toFixed(2)}s" repeatCount="indefinite"/>` : ''}</circle>`).join('');
  const minute = anim
    ? `<line x1="0" y1="18" x2="0" y2="10.5" stroke="#1a1020" stroke-width="1.3" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 0 18" to="360 0 18" dur="1.6s" repeatCount="indefinite"/></line>`
    : `<line x1="0" y1="18" x2="0" y2="10.5" stroke="#1a1020" stroke-width="1.3" stroke-linecap="round" transform="rotate(330 0 18)"/>`;
  const hour = anim
    ? `<line x1="0" y1="18" x2="0" y2="13" stroke="#1a1020" stroke-width="1.7" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 0 18" to="360 0 18" dur="19.2s" repeatCount="indefinite"/></line>`
    : `<line x1="0" y1="18" x2="0" y2="13" stroke="#1a1020" stroke-width="1.7" stroke-linecap="round" transform="rotate(357 0 18)"/>`;
  const drop = 'M0 92 C2.6 98 6.2 102.6 6.2 107 A6.2 6.2 0 0 1 -6.2 107 C-6.2 102.6 -2.6 98 0 92 Z';
  const falling = anim
    ? `<path d="M0 0 C1.4 3 3 5 3 7 A3 3 0 0 1 -3 7 C-3 5 -1.4 3 0 0Z" fill="url(#${id('blood')})" opacity="0"><animateTransform attributeName="transform" type="translate" values="0 108; 0 108; 0 134" keyTimes="0;0.55;1" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.5;0.6;1" dur="2.4s" repeatCount="indefinite"/></path>`
    : '';
  return `<svg class="logo-emblem${cls ? ' ' + cls : ''}" viewBox="-100 -100 200 216" overflow="visible" aria-hidden="true" focusable="false">
<defs>
<radialGradient id="${id('sky')}" cx="0" cy="-20" r="90" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3b2236"/><stop offset="0.55" stop-color="#1d1530"/><stop offset="1" stop-color="#0c0914"/></radialGradient>
<radialGradient id="${id('moon')}" cx="-8" cy="-34" r="38" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff8a6e"/><stop offset="0.45" stop-color="#d42a33"/><stop offset="1" stop-color="#6d0912"/></radialGradient>
<radialGradient id="${id('halo')}" cx="0" cy="-22" r="52" gradientUnits="userSpaceOnUse"><stop offset="0.5" stop-color="#e0303c" stop-opacity="0.45"/><stop offset="1" stop-color="#e0303c" stop-opacity="0"/></radialGradient>
<linearGradient id="${id('brass')}" x1="0" y1="-95" x2="0" y2="95" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fbe3a2"/><stop offset="0.45" stop-color="#d8a64f"/><stop offset="1" stop-color="#8a6424"/></linearGradient>
<linearGradient id="${id('blood')}" x1="0" y1="92" x2="0" y2="114" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8e0a16"/><stop offset="0.6" stop-color="#d1202d"/><stop offset="1" stop-color="#ff5a64"/></linearGradient>
<clipPath id="${id('disc')}"><circle r="77"/></clipPath>
</defs>
<circle r="97" fill="none" stroke="#8e0a16" stroke-width="1.2" opacity="0.9"/>
<circle r="93.5" fill="#17111f"/>
<g stroke="url(#${id('brass')})" stroke-linecap="round">${TICKS}</g>
<circle r="92" fill="none" stroke="url(#${id('brass')})" stroke-width="2.6"/>
<circle r="78" fill="none" stroke="url(#${id('brass')})" stroke-width="1.3"/>
<g clip-path="url(#${id('disc')})">
<circle r="77" fill="url(#${id('sky')})"/>
<circle cx="0" cy="-22" r="52" fill="url(#${id('halo')})"/>
${stars}
<circle cx="0" cy="-22" r="30" fill="url(#${id('moon')})"/>
<g fill="#5a0610" opacity="0.35"><circle cx="-12" cy="-30" r="4.5"/><circle cx="13" cy="-12" r="3.2"/><circle cx="16" cy="-36" r="2.4"/><circle cx="-16" cy="-8" r="2"/></g>
<path d="M-80 52 C-55 40 -30 46 -10 50 C15 54 40 38 80 46 V90 H-80Z" fill="#241b33"/>
<path d="M-80 66 C-50 58 -20 64 0 66 C25 68 50 58 80 62 V90 H-80Z" fill="#130f1c"/>
<g fill="#0e0b15" stroke="url(#${id('brass')})" stroke-width="1.1" stroke-linejoin="round">
<path d="M-64 80 V56 L-54 46 L-44 56 V80Z"/>
<path d="M-42 80 V62 L-35 55 L-28 62 V80Z"/>
<path d="M30 80 V60 L39 51 L48 60 V80Z"/>
<path d="M50 80 V64 L57 57 L64 64 V80Z"/>
</g>
<g fill="#ffcf6b"><rect x="-56" y="62" width="4" height="5" rx="0.6"/><rect x="37" y="66" width="4" height="5" rx="0.6"/><rect x="-37" y="67" width="3" height="4" rx="0.5"/></g>
<g fill="#0e0b15" stroke="url(#${id('brass')})" stroke-width="1.4" stroke-linejoin="round">
<path d="M-13 82 V-2 H13 V82Z"/>
<path d="M-16 -2 V-8 H16 V-2Z"/>
<path d="M-10 -8 V-30 H10 V-8Z"/>
<path d="M-13 -30 V-35 H13 V-30Z"/>
<path d="M-12 -35 L0 -76 L12 -35Z"/>
</g>
<path d="M-5 -11 V-21 A5 5 0 0 1 5 -21 V-11Z" fill="#ffcf6b" opacity="0.9"/>
<path d="M-2.6 -13.5 A2.6 2.6 0 0 1 2.6 -13.5 L3.2 -12 H-3.2Z" fill="#0e0b15"/>
<line x1="0" y1="-76" x2="0" y2="-86" stroke="url(#${id('brass')})" stroke-width="1.4"/>
<circle cx="0" cy="-81" r="1.9" fill="#fbe3a2"/>
<g fill="#ffcf6b"><rect x="-7" y="38" width="4" height="6" rx="0.6"/><rect x="3" y="38" width="4" height="6" rx="0.6"/></g>
<path d="M-5 82 V66 A5 5 0 0 1 5 66 V82Z" fill="#ffcf6b" opacity="0.75"/>
</g>
<circle cx="0" cy="18" r="9.2" fill="#f3e3bd" stroke="url(#${id('brass')})" stroke-width="1.4"/>
<g stroke="#5a4426" stroke-width="0.9"><line x1="0" y1="10.6" x2="0" y2="12.4"/><line x1="0" y1="23.6" x2="0" y2="25.4"/><line x1="-7.4" y1="18" x2="-5.6" y2="18"/><line x1="5.6" y1="18" x2="7.4" y2="18"/></g>
${hour}${minute}
<circle cx="0" cy="18" r="1.2" fill="#1a1020"/>
<path d="${drop}" fill="url(#${id('blood')})"/>
<ellipse cx="-2" cy="105" rx="1.4" ry="2.2" fill="#ffb3b8" opacity="0.6"/>
${falling}
</svg>`;
}

/**
 * Logoen som DOM-element.
 * variant: 'stack' (emblem over ordmerket, sentrert) eller 'inline' (lite emblem + ordmerke på én linje)
 */
export function logoEl({ variant = 'stack', lang = 'no', anim = false, cls = '' } = {}) {
  const w = WORDS[lang === 'en' ? 'en' : 'no'];
  const el = document.createElement('div');
  el.className = `logo logo-${variant}${anim ? ' logo-anim' : ''}${cls ? ' ' + cls : ''}`;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', LOGO_TEXT[lang === 'en' ? 'en' : 'no']);
  const word = variant === 'inline'
    ? `<span class="lw-top">${w.top} · ${w.sub}</span><span class="lw-main"><span class="lw-blood">Blood</span> on the <span class="lw-clock">Clocktower</span></span>`
    : `<span class="lw-top">${w.top}</span><span class="lw-main"><span class="lw-l1"><span class="lw-blood">Blood</span> on the</span><span class="lw-clock">Clocktower</span></span><span class="lw-sub">${w.sub}</span>`;
  el.innerHTML = emblemSvg({ anim }) + `<span class="logo-word" aria-hidden="true">${word}</span>`;
  return el;
}
