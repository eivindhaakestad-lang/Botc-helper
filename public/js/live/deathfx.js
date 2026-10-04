// Dødsanimasjoner (kjøpes i Saueboden): det som skjer med sauen på storskjermen når den dør.
// Alt er CSS-animasjoner på små <span>-er, så de er billige å tegne også på en treg projektor-PC.
//
// Verten (token på storskjermen, forhåndsvisningen i butikken) får klassene «dying fx-<id>»,
// og inneholder to sauebilder: .fx-target (den levende sauen som forsvinner) og .fx-ghost
// (spøkelset som dukker opp til slutt). --dt (negativ) lar animasjonen fortsette der den var
// hvis skjermen tegnes på nytt midt i.

import { h } from '../app/dom.js';

export const DEATH_MS = 3200;

// «Tilfeldige» tall som er like hver gang, så animasjonen ikke hopper ved ny tegning
const rnd = (i, k = 1) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
const p = (cls, style, text = null) => h('span', { class: cls, style }, text);

const BOLT = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 200" preserveAspectRatio="none"><path d="M24 0 L8 86 L20 88 L4 200 L36 70 L22 68 L34 0 Z" fill="#fff9c4" stroke="#ffd600" stroke-width="3" stroke-linejoin="round"/></svg>');
const UFO = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><ellipse cx="60" cy="24" rx="24" ry="20" fill="#bfefff" stroke="#3a6b80" stroke-width="2.4" opacity="0.92"/><ellipse cx="54" cy="16" rx="7" ry="4" fill="#fff" opacity="0.8"/><ellipse cx="60" cy="38" rx="56" ry="15" fill="#9aa6b8" stroke="#3a4250" stroke-width="2.4"/><ellipse cx="60" cy="34" rx="44" ry="7" fill="#c7d0dc"/><circle cx="24" cy="40" r="4" fill="#7dff8a"/><circle cx="44" cy="45" r="4" fill="#ffe14d"/><circle cx="66" cy="46" r="4" fill="#ff6bd6"/><circle cx="88" cy="43" r="4" fill="#7dd8ff"/><circle cx="102" cy="38" r="3.4" fill="#7dff8a"/></svg>');

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
  } else {
    return null;
  }
  return h('span', { class: 'death-fx', 'aria-hidden': 'true' }, parts);
}
