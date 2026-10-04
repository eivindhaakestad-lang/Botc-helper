// Grim reveal: sirkelen med bare navn til Storytelleren avslører rollene én og én.
// Brukes av både storskjermen og elevvisningen.
//
// celebrate = { at, winners }: når vinneren kunngjøres hopper og jubler vinnerlagets sauer,
// mens taperne ser lei seg ut en liten stund.

import { h } from '../app/dom.js';
import { seatSheep, seatLook, seatFrame, clipSheep } from './sheep.js';

export const CHEER_MS = 10000;
export const SAD_MS = 5500;

const seen = new Set();

function charClass(name) {
  if (name.length > 12) return ' xlong';
  return Math.max(...name.split(' ').map((w) => w.length)) > 8 ? ' long' : '';
}

export function revealCircle({ seats, reveal = [], winner = null, text, size = 130, me = null, celebrate = null }) {
  const n = Math.max(1, seats.length);
  const map = Object.fromEntries(reveal.map((r) => [r.seatId, r]));
  const tok = Math.min(26, (257 / n) * 0.7).toFixed(2);
  const since = celebrate && winner && celebrate.at ? Date.now() - celebrate.at : Infinity;
  const winners = new Set((celebrate && celebrate.winners) || []);
  const moodOf = (id) => (winners.has(id) ? (since < CHEER_MS ? 'cheer' : '') : winners.size && since < SAD_MS ? 'sad' : '');
  return h('div', { class: 'grim reveal-grim ended', style: `--tok:min(${size}px, ${tok}cqw)` },
    h('div', { class: 'grim-ring', 'aria-hidden': 'true' }),
    h('div', { class: 'grim-center' },
      winner
        ? h('div', { class: 'winner-banner ' + winner, role: 'status' },
          h('span', { class: 'winner-icon', 'aria-hidden': 'true' }, '🏆'),
          h('span', { class: 'display winner-text' }, winner === 'good' ? text.good : text.evil))
        : h('div', { class: 'center-text' },
          h('span', { class: 'display reveal-title' }, text.title),
          h('span', { class: 'center-stat muted' }, `${reveal.length} / ${seats.length}`))),
    seats.map((seat, i) => {
      const a = (-90 + (360 / n) * i) * (Math.PI / 180);
      const left = 50 + 40 * Math.cos(a);
      const top = 50 + 40 * Math.sin(a);
      const r = map[seat.id];
      const fresh = r && !seen.has(seat.id);
      if (r) seen.add(seat.id); else seen.delete(seat.id);
      const mood = moodOf(seat.id);
      const st = { mood, ghost: !seat.alive };
      return h('div', { class: 'grim-slot', style: `left:${left.toFixed(2)}%;top:${top.toFixed(2)}%;--i:${i}` },
        h('div', { class: 'token reveal-token' + (r ? ` revealed team-${r.team}${fresh ? ' flip-in' : ''}` : ' face-down') + (seat.alive ? '' : ' rv-dead') + (me === seat.id ? ' me' : '') + (mood ? ' ' + mood : '') },
          h('span', { class: 'token-disc' },
            r && r.icon ? h('span', { class: 'token-icon', 'aria-hidden': 'true' }, r.icon) : null,
            r ? h('span', { class: 'token-char' + charClass(r.character) }, r.character) : seatLook(seat.id) ? [clipSheep(seatSheep(seat.id, 'token-sheep', st)), seatFrame(seat.id)] : h('span', { class: 'token-back', 'aria-hidden': 'true' }, '✦'),
            r && r.shown ? h('span', { class: 'token-shown' }, r.shown) : null,
            r && seatLook(seat.id) ? h('span', { class: 'sheep-badge' }, seatSheep(seat.id, 'mini-sheep', st)) : null),
          seat.alive ? null : h('span', { class: 'rv-skull', title: '†' }, '💀'),
          h('span', { class: 'token-label' }, seat.names.join(' + '))));
    }));
}
