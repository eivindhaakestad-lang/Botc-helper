// Dødsanimasjoner (kjøpes i Saueboden): det som skjer med sauen på storskjermen når den dør.
// Alt er CSS-animasjoner på små <span>-er, så de er billige å tegne også på en treg projektor-PC.
//
// Verten (token på storskjermen, forhåndsvisningen i butikken) får klassene «dying fx-<id>»,
// og inneholder to sauebilder: .fx-target (den levende sauen som forsvinner) og .fx-ghost
// (spøkelset som dukker opp til slutt). --dt (negativ) lar animasjonen fortsette der den var
// hvis skjermen tegnes på nytt midt i.

import { h } from '../app/dom.js';
import { sfx } from './sound.js';

export const DEATH_MS = 3200;

// «Tilfeldige» tall som er like hver gang, så animasjonen ikke hopper ved ny tegning
const rnd = (i, k = 1) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
const p = (cls, style, text = null) => h('span', { class: cls, style }, text);

const BOLT = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 200" preserveAspectRatio="none"><path d="M24 0 L8 86 L20 88 L4 200 L36 70 L22 68 L34 0 Z" fill="#fff9c4" stroke="#ffd600" stroke-width="3" stroke-linejoin="round"/></svg>');
const UFO = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><ellipse cx="60" cy="24" rx="24" ry="20" fill="#bfefff" stroke="#3a6b80" stroke-width="2.4" opacity="0.92"/><ellipse cx="54" cy="16" rx="7" ry="4" fill="#fff" opacity="0.8"/><ellipse cx="60" cy="38" rx="56" ry="15" fill="#9aa6b8" stroke="#3a4250" stroke-width="2.4"/><ellipse cx="60" cy="34" rx="44" ry="7" fill="#c7d0dc"/><circle cx="24" cy="40" r="4" fill="#7dff8a"/><circle cx="44" cy="45" r="4" fill="#ffe14d"/><circle cx="66" cy="46" r="4" fill="#ff6bd6"/><circle cx="88" cy="43" r="4" fill="#7dd8ff"/><circle cx="102" cy="38" r="3.4" fill="#7dff8a"/></svg>');

const ANVIL = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"><path d="M4 8 H70 C82 8 92 12 98 20 C86 22 76 22 70 26 V34 C70 40 62 42 58 44 L62 52 H78 V58 H22 V52 H38 L42 44 C36 42 30 38 30 32 V26 C20 24 10 18 4 8 Z" fill="#4a4f5a" stroke="#22252b" stroke-width="3" stroke-linejoin="round"/><path d="M8 10 H70 C80 10 88 13 93 18" fill="none" stroke="#9aa2b0" stroke-width="3"/><text x="50" y="22" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="11" fill="#cfd5de">10T</text></svg>');

export function deathFxEl(id) {
  const parts = [];
  if (id === 'puff') {
    for (let i = 0; i < 16; i++) {
      parts.push(p('fx-p fx-wool', `--a:${Math.round((360 / 16) * i + rnd(i) * 16)}deg;--r:${(0.75 + rnd(i, 2) * 0.55).toFixed(2)};--s:${(0.2 + rnd(i, 3) * 0.16).toFixed(2)};--d:${Math.round(rnd(i, 4) * 120)}ms`));
    }
    parts.push(p('fx-word', null, 'POFF!'));
  } else if (id === 'leaves') {
    const cols = ['#f08a2b', '#e0533a', '#f4c542', '#8bc34a', '#c0582a'];
    for (let i = 0; i < 16; i++) {
      parts.push(p('fx-p fx-leaf', `--a:${Math.round((360 / 16) * i)}deg;--c:${cols[i % cols.length]};--s:${(0.13 + rnd(i, 2) * 0.08).toFixed(2)};--d:${Math.round(rnd(i, 3) * 260)}ms`));
    }
  } else if (id === 'confetti') {
    const cols = ['#ffd23f', '#ff5c8a', '#5edc7a', '#63b3ff', '#b07bff', '#ff9b2e', '#ffffff'];
    for (let i = 0; i < 32; i++) {
      const a = rnd(i) * Math.PI - Math.PI; // oppover
      const r = 0.7 + rnd(i, 2) * 1.1;
      parts.push(p('fx-p fx-conf', `--x:${(Math.cos(a) * r).toFixed(2)};--y:${(Math.sin(a) * r - 0.2).toFixed(2)};--c:${cols[i % cols.length]};--rot:${Math.round(rnd(i, 3) * 900 - 450)}deg;--d:${Math.round(rnd(i, 4) * 100)}ms`));
    }
    parts.push(p('fx-word fx-tada', null, '🎉'));
  } else if (id === 'lightning') {
    parts.push(p('fx-flash'), h('span', { class: 'fx-bolt', style: `background-image:url("${BOLT}")` }));
    for (let i = 0; i < 7; i++) parts.push(p('fx-p fx-smoke', `--x:${(rnd(i) - 0.5).toFixed(2)};--s:${(0.22 + rnd(i, 2) * 0.18).toFixed(2)};--d:${Math.round(300 + rnd(i, 3) * 500)}ms`));
  } else if (id === 'ufo') {
    parts.push(p('fx-beam'), h('span', { class: 'fx-saucer', style: `background-image:url("${UFO}")` }));
    for (let i = 0; i < 8; i++) parts.push(p('fx-p fx-spark', `--x:${(rnd(i) - 0.5).toFixed(2)};--d:${Math.round(700 + rnd(i, 2) * 900)}ms`));
  } else if (id === 'vortex') {
    parts.push(p('fx-hole'), p('fx-hole fx-hole-2'));
    for (let i = 0; i < 14; i++) parts.push(p('fx-p fx-star', `--a:${Math.round((360 / 14) * i)}deg;--r:${(1 + rnd(i) * 0.6).toFixed(2)};--d:${Math.round(rnd(i, 2) * 700)}ms`));
  } else if (id === 'bubble') {
    parts.push(p('fx-orb'));
    for (let i = 0; i < 12; i++) { const a = (Math.PI * 2 * i) / 12; parts.push(p('fx-p fx-drop', `--x:${(Math.cos(a) * (0.45 + rnd(i) * 0.3)).toFixed(2)};--y:${(Math.sin(a) * (0.45 + rnd(i, 2) * 0.3)).toFixed(2)}`)); }
  } else if (id === 'melt') {
    parts.push(p('fx-puddle'));
    for (let i = 0; i < 5; i++) parts.push(p('fx-p fx-drip', `--x:${((i - 2) * 0.17 + (rnd(i) - 0.5) * 0.06).toFixed(2)};--d:${Math.round(rnd(i, 2) * 500)}ms`));
  } else if (id === 'fireworks') {
    const bursts = [[-0.55, -0.75, 150], [0.6, -0.55, 550], [0.05, -1.15, 950]];
    const cols = [['#ffd23f', '#ff9b2e'], ['#63b3ff', '#b07bff'], ['#ff5c8a', '#5edc7a']];
    bursts.forEach(([bx, by, d], k) => {
      for (let i = 0; i < 14; i++) parts.push(p('fx-p fx-fw', `--bx:${bx};--by:${by};--a:${Math.round((360 / 14) * i + k * 9)}deg;--c:${cols[k][i % 2]};--d:${d}ms`));
      parts.push(p('fx-p fx-fw-flash', `--bx:${bx};--by:${by};--d:${d}ms`));
    });
  } else if (id === 'anvil') {
    parts.push(h('span', { class: 'fx-weight', style: `background-image:url("${ANVIL}")` }));
    for (let i = 0; i < 10; i++) parts.push(p('fx-p fx-dust', `--x:${(i < 5 ? -1 : 1) * (0.35 + rnd(i) * 0.8)};--y:${(-rnd(i, 2) * 0.35).toFixed(2)};--s:${(0.16 + rnd(i, 3) * 0.14).toFixed(2)}`));
    for (let i = 0; i < 3; i++) parts.push(p('fx-p fx-dizzy', `--a:${i * 120}deg`, '★'));
    parts.push(p('fx-word', null, 'BONK!'));
  } else if (id === 'meteor') {
    parts.push(p('fx-crater'));
    for (let i = 0; i < 14; i++) { const a = -Math.PI * (0.05 + rnd(i) * 0.9); parts.push(p('fx-p fx-rock', `--x:${(Math.cos(a) * (0.8 + rnd(i, 2) * 0.9)).toFixed(2)};--y:${(Math.sin(a) * (0.7 + rnd(i, 3) * 0.8)).toFixed(2)};--s:${(0.07 + rnd(i, 4) * 0.08).toFixed(2)};--rot:${Math.round(rnd(i, 5) * 720 - 360)}deg`)); }
    for (let i = 0; i < 7; i++) parts.push(p('fx-p fx-smoke', `--x:${(rnd(i, 6) - 0.5).toFixed(2)};--s:${(0.3 + rnd(i, 7) * 0.2).toFixed(2)};--d:${Math.round(750 + rnd(i, 8) * 500)}ms`));
  } else if (id === 'rocket') {
    parts.push(p('fx-flame'));
    for (let i = 0; i < 12; i++) parts.push(p('fx-p fx-cloud', `--x:${((i % 2 ? 1 : -1) * (0.5 + rnd(i) * 1.1)).toFixed(2)};--s:${(0.25 + rnd(i, 2) * 0.25).toFixed(2)};--d:${Math.round(rnd(i, 3) * 300)}ms`));
  } else if (id === 'dragon') {
    const cols = ['#ffd23f', '#ff9b2e', '#ff5a1f', '#ffe9a0'];
    for (let i = 0; i < 18; i++) parts.push(p('fx-p fx-flamebit', `--x:${(rnd(i) - 0.5).toFixed(2)};--c:${cols[i % cols.length]};--s:${(0.14 + rnd(i, 2) * 0.14).toFixed(2)};--d:${Math.round(950 + rnd(i, 3) * 800)}ms`));
    parts.push(p('fx-ash'));
    for (let i = 0; i < 6; i++) parts.push(p('fx-p fx-smoke', `--x:${(rnd(i, 4) - 0.5).toFixed(2)};--s:${(0.25 + rnd(i, 5) * 0.2).toFixed(2)};--d:${Math.round(1800 + rnd(i, 6) * 500)}ms`));
  } else {
    return null;
  }
  return h('span', { class: 'death-fx', 'aria-hidden': 'true' }, parts);
}

// ——— lyder (spilles av på storskjermen, og i Saueboden når man prøver) ———
const FX_SOUND = {
  puff: () => setTimeout(() => sfx.poof(), 450),
  leaves: () => sfx.rustle(),
  confetti: () => setTimeout(() => sfx.confetti(), 380),
  lightning: () => sfx.zap(),
  ufo: () => sfx.ufo(),
  vortex: () => sfx.vortex(),
  bubble: () => { sfx.blub(); setTimeout(() => sfx.pop(), 1950); },
  melt: () => sfx.melt(),
  fireworks: () => { sfx.firework(0); sfx.firework(0.4); sfx.firework(0.8); },
  anvil: () => { sfx.whistle(); sfx.clank(0.64); },
  meteor: () => sfx.meteor(),
  rocket: () => sfx.rocket(),
  dragon: () => sfx.dragon(),
};
/** Spiller lyden for en dødsanimasjon. Returnerer false hvis den ikke har egen lyd (da brukes standardlyden). */
export function playDeathSound(id) {
  if (!FX_SOUND[id]) return false;
  FX_SOUND[id]();
  return true;
}

// ——— de store animasjonene som går utenfor sirkelen (rakett, meteor, drage) ———
export const BIG_FX = new Set(['rocket', 'meteor', 'dragon']);
export { bigDeathFx } from './bigdeath.js';
