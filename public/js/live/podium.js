// Drømmemestere: pallen som avsløres én plass om gangen (3. → 2. → 1.) etter grim reveal.
import { h } from '../app/dom.js';

export function podium({ board, step, text }) {
  const top = (board || []).slice(0, 3);
  if (!top.length || !step) return null;
  const n = top.length;
  const shown = (i) => i >= n - step; // indeks 0 = vinner
  const order = n === 3 ? [1, 0, 2] : n === 2 ? [1, 0] : [0]; // 2. – 1. – 3. som på en pall
  const medal = ['🥇', '🥈', '🥉'];
  return h('div', { class: 'podium-wrap' },
    h('h2', { class: 'display podium-title' }, '🏃 ' + text.title),
    h('div', { class: 'podium' }, order.map((i) => {
      const e = top[i];
      const on = shown(i);
      return h('div', { class: `podium-col place-${i + 1}${on ? ' shown' : ''}` },
        h('div', { class: 'podium-who' },
          on ? [h('span', { class: 'podium-medal' }, medal[i]), h('span', { class: 'podium-name display' }, e.name), h('span', { class: 'podium-score' }, `${e.score} ${text.points}`)]
            : h('span', { class: 'podium-q' }, '?')),
        h('div', { class: 'podium-block display' }, String(i + 1)));
    })));
}
