// Grimoire-sirkel: plasser rundt en ring, med klokka fra toppen.

import { h } from './dom.js';
import { charInfo } from '../engine/characters.js';
import { teamClass } from './ui.js';

export function grimCircle({ seats, token, center, cls = '' }) {
  const n = Math.max(1, seats.length);
  const size = Math.min(26, (257 / n) * 0.7).toFixed(2);
  return h('div', { class: 'grim ' + cls, style: `--tok:min(96px, ${size}cqw)` },
    h('div', { class: 'grim-ring', 'aria-hidden': 'true' }),
    center ? h('div', { class: 'grim-center' }, center) : null,
    seats.map((seat, i) => {
      const a = (-90 + (360 / n) * i) * (Math.PI / 180);
      const r = 40;
      const left = 50 + r * Math.cos(a);
      const top = 50 + r * Math.sin(a);
      return h('div', { class: 'grim-slot', 'data-seat': seat.id, style: `left:${left.toFixed(2)}%;top:${top.toFixed(2)}%` }, token(seat, i));
    }));
}

// Et rolle-token (sirkel) med navn under.
export function roleToken({ characterId, shownId, label, sub, dead, active, onClick, reminders = [], ghost = null, index = null, alignment = null, hand = null }) {
  const info = characterId ? charInfo(characterId) : null;
  const team = info ? info.team : 'none';
  const flipped = info && alignment && ((alignment === 'evil') !== (team === 'minion' || team === 'demon'));
  const tag = onClick ? 'button' : 'div';
  return h(tag, {
    class: `token ${info ? teamClass(team) : 'team-none'}${dead ? ' dead' : ''}${active ? ' active' : ''}${flipped ? ' flipped' : ''}`,
    onclick: onClick || undefined, type: onClick ? 'button' : undefined,
    'aria-label': [label, info ? info.name : '', dead ? '†' : ''].filter(Boolean).join(', '),
  },
  h('span', { class: 'token-disc' },
    index !== null ? h('span', { class: 'token-num' }, String(index + 1)) : null,
    h('span', { class: 'token-char' + (info && info.name.length > 12 ? ' xlong' : info && Math.max(...info.name.split(' ').map((w) => w.length)) > 8 ? ' long' : '') }, info ? info.name : '?'),
    shownId ? h('span', { class: 'token-shown' }, charInfo(shownId).name) : null,
    dead ? h('span', { class: 'token-shroud', 'aria-hidden': 'true' }, '†') : null,
    hand ? h('span', { class: 'hand-badge', title: '✋' }, '✋' + hand) : null),
  h('span', { class: 'token-label' }, label,
    ghost !== null ? h('span', { class: 'ghost-vote' + (ghost ? ' has' : ''), title: ghost ? 'Ghost vote' : '' }, ghost ? '●' : '○') : null),
  sub ? h('span', { class: 'token-sub' }, sub) : null,
  reminders.length ? h('span', { class: 'token-rem' }, reminders.map((r) => h('span', { class: 'rem rem-' + (r.kind || 'custom') }, r.label))) : null);
}
