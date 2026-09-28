// Velg spillere ved å trykke i en sirkel (som grimen), brukt av elevene til nattvalg og nominasjonsforslag.
import { h } from '../app/dom.js';

export function pickCircle({ seats, selected = [], me = null, allowSelf = true, disabled = () => false, onToggle, center = null, size = 84 }) {
  const n = Math.max(1, seats.length);
  const tok = Math.min(26, (257 / n) * 0.7).toFixed(2);
  return h('div', { class: 'grim pick-grim', style: `--tok:min(${size}px, ${tok}cqw)` },
    h('div', { class: 'grim-ring', 'aria-hidden': 'true' }),
    h('div', { class: 'grim-center' }, h('div', { class: 'center-text' }, center)),
    seats.map((x, i) => {
      const a = (-90 + (360 / n) * i) * (Math.PI / 180);
      const on = selected.includes(x.id);
      const off = (!allowSelf && x.id === me) || disabled(x);
      return h('div', { class: 'grim-slot', style: `left:${(50 + 40 * Math.cos(a)).toFixed(2)}%;top:${(50 + 40 * Math.sin(a)).toFixed(2)}%` },
        h('button', {
          type: 'button', class: 'token pick-token' + (on ? ' on' : '') + (x.alive ? '' : ' dead') + (x.id === me ? ' me' : ''),
          disabled: off, 'aria-pressed': on ? 'true' : 'false', 'aria-label': x.names.join(' + '),
          onclick: () => onToggle(x.id),
        },
        h('span', { class: 'token-disc' },
          h('span', { class: 'token-char' }, on ? '✓' : x.traveller ? x.traveller.icon : x.names.map((s) => s[0]).join('')),
          x.alive ? null : h('span', { class: 'token-shroud', 'aria-hidden': 'true' }, '†')),
        h('span', { class: 'token-label' }, x.names.join(' + '))));
    }));
}
