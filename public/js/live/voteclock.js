// Avstemningsklokka: sirkelen med nominator → nominert, stemmer og en viser som går rundt.
// Eleven må stemme før viseren når dem; da låses stemmen. Brukes av storskjerm og elevvisning.

import { h } from '../app/dom.js';

// offset = servertid − lokal tid (ms)
export function clockInfo(vote, offset = 0) {
  const c = vote && vote.clock;
  if (!c) return null;
  const now = Date.now() + offset;
  const t = (now - c.startAt) / c.stepMs;
  const n = c.order.length;
  // Viseren står på order[k] ved t = k. Plassen låses når viseren kommer dit.
  const done = t >= n - 0.5;
  return {
    t,
    n,
    countdown: t < 0 ? Math.ceil((c.startAt - now) / 1000) : 0,
    step: t < 0 ? -1 : Math.min(n - 1, Math.floor(t)),
    done,
    current: t >= 0 && !done ? c.order[Math.min(n - 1, Math.floor(t))] : null,
    endsAt: c.startAt + (n - 0.5) * c.stepMs,
  };
}

// Tidspunktet (servertid) da denne plassen låses.
export function lockAt(vote, seatId) {
  const c = vote && vote.clock;
  if (!c) return null;
  const i = c.order.indexOf(seatId);
  return i < 0 ? null : c.startAt + i * c.stepMs;
}

function seatPos(i, n) {
  const a = (-90 + (360 / n) * i) * (Math.PI / 180);
  return [50 + 40 * Math.cos(a), 50 + 40 * Math.sin(a)];
}

export function voteCircle({ seats, vote, text, me = null, size = 110 }) {
  const n = Math.max(1, seats.length);
  const idx = Object.fromEntries(seats.map((x, i) => [x.id, i]));
  const name = (id) => { const s = seats[idx[id]]; return s ? s.names.join(' + ') : '?'; };
  const [ax, ay] = seatPos(idx[vote.nominatorId] ?? 0, n);
  const [bx, by] = seatPos(idx[vote.nomineeId] ?? 0, n);
  // Pila stopper litt før tokenene
  const dx = bx - ax; const dy = by - ay; const len = Math.hypot(dx, dy) || 1;
  const cut = 9;
  const x1 = ax + (dx / len) * cut; const y1 = ay + (dy / len) * cut;
  const x2 = bx - (dx / len) * cut; const y2 = by - (dy / len) * cut;
  const tok = Math.min(26, (257 / n) * 0.7).toFixed(2);
  const enough = vote.voters.length >= vote.need;
  const tie = !enough && vote.tieAt && vote.voters.length === vote.tieAt;
  return h('div', { class: 'grim vote-grim', style: `--tok:min(${size}px, ${tok}cqw)`, 'data-vote': vote.id },
    h('div', { class: 'grim-ring', 'aria-hidden': 'true' }),
    h('div', { class: 'vc-arrow', 'aria-hidden': 'true', html: `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><marker id="vc-head" markerWidth="4" markerHeight="4" refX="2.6" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4 z" fill="currentColor"/></marker></defs><line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" marker-end="url(#vc-head)"/></svg>` }),
    vote.clock ? h('div', { class: 'vc-hand-wrap', 'aria-hidden': 'true' }, h('div', { class: 'vc-hand' })) : null,
    h('div', { class: 'grim-center' },
      h('div', { class: 'center-text vc-center' },
        h('span', { class: 'vc-who' },
          h('span', { class: 'vc-nominator' }, name(vote.nominatorId)),
          h('span', { class: 'vc-arrow-txt' }, ' → '),
          h('span', { class: 'vc-nominee' }, name(vote.nomineeId))),
        h('span', { class: 'display vc-count' + (enough ? ' enough' : tie ? ' tie' : '') }, String(vote.voters.length), h('span', { class: 'vote-need' }, ` / ${vote.need}`)),
        vote.tieAt && text.tieLine ? h('span', { class: 'vc-tie' }, text.tieLine(vote, name).split(' · ').map((x) => h('span', { class: 'tie-row' }, x))) : null,
        h('span', { class: 'vc-status center-stat' }, vote.open ? (vote.clock ? '' : text.voteNow) : text.closed))),
    seats.map((seat, i) => {
      const [left, top] = seatPos(i, n);
      const voted = vote.voters.includes(seat.id);
      const role = seat.id === vote.nominatorId ? 'nominator' : seat.id === vote.nomineeId ? 'nominee' : '';
      const cant = !seat.alive && !seat.ghostVote;
      return h('div', { class: 'grim-slot', 'data-seat': seat.id, style: `left:${left.toFixed(2)}%;top:${top.toFixed(2)}%` },
        h('div', { class: `token vc-token ${role}${voted ? ' voted' : ''}${seat.alive ? '' : ' dead'}${cant ? ' cant' : ''}${me === seat.id ? ' me' : ''}` },
          h('span', { class: 'token-disc' },
            h('span', { class: 'token-char' }, voted ? '✋' : role === 'nominee' ? '⚖️' : seat.names.map((x) => x[0]).join('')),
            seat.alive ? null : h('span', { class: 'token-shroud', 'aria-hidden': 'true' }, '†'),
            vote.blockId === seat.id ? h('span', { class: 'block-badge' }, '💀') : null),
          h('span', { class: 'token-label' }, seat.names.join(' + ')),
          role ? h('span', { class: 'vc-role ' + role }, role === 'nominator' ? text.nominator : text.nominee) : null));
    }));
}

// Oppdaterer viser, låste plasser og status uten å tegne alt på nytt.
// Returnerer info som brukes til lyder.
export function tickVoteCircle(root, vote, offset, text) {
  const el = root && root.querySelector(`.vote-grim[data-vote="${vote.id}"]`);
  const info = clockInfo(vote, offset);
  if (!el || !info) return info;
  const seats = [...el.querySelectorAll('.grim-slot')].map((x) => x.dataset.seat);
  const n = seats.length;
  const order = vote.clock.order;
  const tt = Math.max(0, Math.min(order.length - 1, info.t));
  const k = Math.floor(tt);
  const from = seats.indexOf(order[k]);
  const angle = (360 / n) * (from + (tt - k));
  const hand = el.querySelector('.vc-hand-wrap');
  if (hand) hand.style.transform = `rotate(${angle}deg)`;
  order.forEach((id, j) => {
    const tok = el.querySelector(`.grim-slot[data-seat="${id}"] .vc-token`);
    if (!tok) return;
    tok.classList.toggle('locked', info.t >= j);
    tok.classList.toggle('current', info.current === id);
  });
  const st = el.querySelector('.vc-status');
  if (st) {
    const cur = info.current ? el.querySelector(`.grim-slot[data-seat="${info.current}"] .token-label`) : null;
    st.textContent = !vote.open ? text.closed : info.countdown > 0 ? `${text.startsIn} ${info.countdown}` : info.done ? text.closed : `${text.handAt} ${cur ? cur.textContent : ''}`;
  }
  return info;
}

// «4 = uavgjort med Markus (ingen dør) · 5 = Frida på blokka»
export function tieLine(vote, name, T) {
  if (!vote || !vote.tieAt) return '';
  const a = vote.blockId ? T('tieWith').replace('{tie}', vote.tieAt).replace('{block}', name(vote.blockId)) : T('tieStill').replace('{tie}', vote.tieAt);
  return a + ' · ' + T('needFor').replace('{need}', vote.need).replace('{name}', name(vote.nomineeId));
}
