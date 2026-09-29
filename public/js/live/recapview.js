// «Slik gikk det egentlig» på storskjermen og hos elevene: sirkel med navn (ingen roller)
// og merker på dem det gjaldt, pluss lista over det som er vist i kapitlet så langt.
import { h } from '../app/dom.js';

// Hvilke plasser et punkt merker (et skudd merker bare den som ble skutt på)
function markedSeats(it) {
  return it.kind === 'shotHit' || it.kind === 'shotMiss' ? it.seatIds.slice(-1) : it.seatIds;
}

const flipped = new Set();
function charClass(name) {
  if (name.length > 12) return ' xlong';
  return Math.max(...name.split(' ').map((w) => w.length)) > 8 ? ' long' : '';
}

// reveal: rollene Storytelleren har avslørt (samme liste som grim reveal) – vises også under gjennomgangen
export function recapCircle({ seats, recap, size = 130, reveal = [] }) {
  const rev = Object.fromEntries((reveal || []).map((r) => [r.seatId, r]));
  const n = Math.max(1, seats.length);
  const tok = Math.min(26, (257 / n) * 0.7).toFixed(2);
  const dead = new Set(recap.dead || []);
  const items = recap.items || [];
  const newest = items[items.length - 1];
  const marks = {};
  for (const it of items) for (const id of markedSeats(it)) (marks[id] || (marks[id] = [])).push(it);
  return h('div', { class: 'grim recap-grim ' + (recap.type === 'night' ? 'night' : 'day'), style: `--tok:min(${size}px, ${tok}cqw)` },
    h('div', { class: 'grim-ring', 'aria-hidden': 'true' }),
    h('div', { class: 'grim-center' }, h('div', { class: 'center-text' },
      h('span', { class: 'display recap-chapter', key: recap.title }, (recap.type === 'night' ? '🌙 ' : recap.type === 'day' ? '☀️ ' : '✦ ') + recap.title),
      newest ? h('span', { class: 'recap-center-line', key: newest.id }, newest.icon + ' ' + newest.text) : null)),
    seats.map((seat, i) => {
      const a = (-90 + (360 / n) * i) * (Math.PI / 180);
      const m = marks[seat.id] || [];
      const isNew = newest && markedSeats(newest).includes(seat.id);
      return h('div', { class: 'grim-slot', style: `left:${(50 + 40 * Math.cos(a)).toFixed(2)}%;top:${(50 + 40 * Math.sin(a)).toFixed(2)}%` },
        (() => {
          const r = rev[seat.id];
          const fresh = r && !flipped.has(seat.id);
          if (r) flipped.add(seat.id); else flipped.delete(seat.id);
          return h('div', { class: 'token recap-token' + (r ? ` revealed team-${r.team}${fresh ? ' flip-in' : ''}` : '') + (dead.has(seat.id) ? ' rv-dead' : '') + (m.length ? ' marked' : '') + (isNew ? ' recap-new kind-' + newest.kind : '') },
          h('span', { class: 'token-disc' },
            r && r.icon ? h('span', { class: 'token-icon', 'aria-hidden': 'true' }, r.icon) : null,
            r ? h('span', { class: 'token-char' + charClass(r.character) }, r.character) : h('span', { class: 'token-char' }, seat.traveller ? seat.traveller.icon : seat.names.map((x) => x[0]).join('')),
            r && r.shown ? h('span', { class: 'token-shown' }, r.shown) : null),
          dead.has(seat.id) ? h('span', { class: 'rv-skull', title: '†' }, '💀') : null,
          m.length ? h('span', { class: 'recap-marks', 'aria-hidden': 'true' }, [...new Set(m.map((x) => x.icon))].join('')) : null,
          h('span', { class: 'token-label' }, seat.names.join(' + ')));
        })());
    }));
}

export function recapList(recap, { title } = {}) {
  const items = recap.items || [];
  return h('div', { class: 'panel recap-panel' },
    h('span', { class: 'label' }, title || ''),
    h('h3', { class: 'section-title' }, recap.title),
    items.length ? h('ol', { class: 'recap-feed' }, items.map((it, i) => h('li', { class: i === items.length - 1 ? 'newest' : '' },
      h('span', { class: 'recap-icon', 'aria-hidden': 'true' }, it.icon), h('span', null, it.text)))) : null,
    h('p', { class: 'muted small' }, `${recap.step} / ${recap.total}`));
}
