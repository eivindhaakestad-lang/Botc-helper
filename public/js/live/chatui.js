// Felles byggeklosser for chatten: avatarer (elevens sau / Storytellerens emblem) og meldingsbobler.
// Brukes både på elevsiden og i Storyteller-appen.

import { h } from '../app/dom.js';
import { seatSheep, seatFrame, clipSheep } from './sheep.js';
import { emblemSvg } from './logo.js';

export const fmtTime = (at) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

function hue(str) { let x = 0; for (const c of String(str)) x = (x * 31 + c.charCodeAt(0)) % 360; return x; }

let stEmblem = null;
/** Avatar: Storytelleren får emblemet, elevene sauen sin (eller initialer hvis de ikke har laget sau ennå). */
export function chatAvatar(id, { name = '', ghost = false, size = 'sm', cls = '' } = {}) {
  const c = `chat-av av-${size}${cls ? ' ' + cls : ''}`;
  if (id === 'st') {
    stEmblem = stEmblem || emblemSvg();
    return h('span', { class: c + ' av-st', title: name || undefined, html: stEmblem });
  }
  const img = seatSheep(id, 'av-sheep', ghost ? { ghost: true } : {});
  if (img) return h('span', { class: c + (ghost ? ' av-ghost' : ''), title: name || undefined }, clipSheep(img), seatFrame(id));
  const ini = String(name || '?').split(/[\s+]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return h('span', { class: c + ' av-ini', style: `--h:${hue(id)}`, title: name || undefined }, ini || '?');
}

/** To overlappende avatarer (naboprat). */
export function pairAvatar(a, b, opts = {}) {
  return h('span', { class: 'chat-av-pair av-' + (opts.size || 'sm') }, chatAvatar(a, { ...opts, name: opts.nameA }), chatAvatar(b, { ...opts, name: opts.nameB }));
}

/**
 * Holder styr på hvilke meldinger som er vist før, så bare nye meldinger får «pop»-animasjon.
 * Første gang en tråd vises, regnes alt som allerede sett.
 */
export function freshTracker() {
  const seen = new Set();
  const primed = new Set();
  return (key, list) => {
    if (!primed.has(key)) { primed.add(key); for (const m of list) seen.add(m.id); }
    return (m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; };
  };
}

const GROUP_MS = 5 * 60 * 1000;
const DIVIDER_MS = 15 * 60 * 1000;

/**
 * Meldingsbobler. Meldinger fra samme avsender rett etter hverandre grupperes
 * (navnet vises på den første, avataren og klokkeslettet på den siste).
 * sideOf(m): 'mine' | 'left' | 'right'
 */
export function bubbles(list, { nameOf, sideOf, ghostOf = () => false, fresh = () => false, showNames = true }) {
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    const prev = list[i - 1];
    const next = list[i + 1];
    const divider = !prev || m.at - prev.at > DIVIDER_MS;
    if (divider) out.push(h('div', { class: 'chat-divider' }, h('span', null, fmtTime(m.at))));
    const first = divider || prev.from !== m.from || m.at - prev.at > GROUP_MS;
    const last = !next || next.from !== m.from || next.at - m.at > GROUP_MS;
    const side = sideOf(m);
    const cls = ['cb-row', side, first ? 'first' : '', last ? 'last' : '', m.from === 'st' ? 'from-st' : '', fresh(m) ? 'fresh' : ''].filter(Boolean).join(' ');
    out.push(h('div', { class: cls },
      last ? chatAvatar(m.from, { name: nameOf(m.from), ghost: ghostOf(m.from) }) : h('span', { class: 'chat-av av-sm av-spacer', 'aria-hidden': 'true' }),
      h('div', { class: 'cb' },
        first && showNames && side !== 'mine' ? h('span', { class: 'cb-name' }, nameOf(m.from)) : null,
        h('span', { class: 'cb-text' }, m.text),
        last ? h('span', { class: 'cb-time' }, fmtTime(m.at)) : null)));
  }
  return out;
}

/** Skrivefeltet: rundt felt som vokser med teksten og en rund send-knapp. */
export function composer({ id, value = '', placeholder = '', disabled = false, sendLabel = 'Send', onInput, onSend, stopKeys = false }) {
  const grow = (el) => { el.style.height = 'auto'; el.style.height = Math.min(140, el.scrollHeight) + 'px'; };
  const ta = h('textarea', {
    id, class: 'cc-input', rows: 1, maxlength: 500, placeholder, value,
    oninput: (e) => { grow(e.target); onInput(e.target.value); },
    onkeydown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } if (stopKeys) e.stopPropagation(); },
  });
  if (value) queueMicrotask(() => grow(ta));
  return h('form', { class: 'chat-compose', onsubmit: (e) => { e.preventDefault(); onSend(); } },
    ta,
    h('button', { class: 'cc-send', type: 'submit', disabled, 'aria-label': sendLabel, title: sendLabel,
      html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10.2 15 12 3.4 13.8z" fill="currentColor"/></svg>' }));
}
