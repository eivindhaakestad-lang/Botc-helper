// Storskjermen (Town Square): plasser, levende/døde, fase, kunngjøringer,
// QR-kode for å bli med og drømmetopplisten om natten. Viser aldri roller før spillet er slutt.

import { h } from '../app/dom.js';
import { LiveClient, joinUrl, qrSvg } from '../live/client.js';
import { revealCircle } from '../live/reveal.js';

const TXT = {
  no: { join: 'Bli med: skann koden eller gå til', code: 'Romkode', setup: 'Venter på Storytelleren', night: 'Natt', day: 'Dag', ended: 'Spillet er slutt', alive: 'lever', votes: 'stemmer for å henrette', board: 'Drømmetoppliste', noScores: 'Tell sauer for å komme på lista!', good: 'Det gode laget vinner!', evil: 'Det onde laget vinner!', fullscreen: 'Fullskjerm', closed: 'Rommet er stengt.', noroom: 'Fant ikke rommet.', joined: 'inne', reveal: 'Grim reveal' },
  en: { join: 'Join: scan the code or go to', code: 'Room code', setup: 'Waiting for the Storyteller', night: 'Night', day: 'Day', ended: 'Game over', alive: 'alive', votes: 'votes to execute', board: 'Dream leaderboard', noScores: 'Count sheep to get on the list!', good: 'Good wins!', evil: 'Evil wins!', fullscreen: 'Fullscreen', closed: 'The room is closed.', noroom: 'Room not found.', joined: 'joined', reveal: 'Grim reveal' },
};

const S = { pub: null, room: null, claimed: {}, board: null, error: null, status: 'connecting' };
const T = (k) => (TXT[S.pub && S.pub.lang === 'en' ? 'en' : 'no'][k]);
const code = (new URLSearchParams(location.search).get('room') || '').toUpperCase();

function seatToken(seat, i, n) {
  const a = (-90 + (360 / n) * i) * (Math.PI / 180);
  const left = 50 + 40 * Math.cos(a);
  const top = 50 + 40 * Math.sin(a);
  const joined = (S.claimed[seat.id] || 0) > 0;
  const initials = seat.names.map((x) => x.slice(0, 1)).join('');
  return h('div', { class: 'grim-slot', style: `left:${left.toFixed(2)}%;top:${top.toFixed(2)}%` },
    h('div', { class: 'token screen-token' + (seat.alive ? '' : ' dead') + (joined ? ' joined' : '') },
      h('span', { class: 'token-disc' },
        h('span', { class: 'token-num' }, String(i + 1)),
        h('span', { class: 'token-char' }, initials),
        seat.alive ? null : h('span', { class: 'token-shroud', 'aria-hidden': 'true' }, '†')),
      h('span', { class: 'token-label' }, seat.names.join(' + '),
        seat.alive ? null : h('span', { class: 'ghost-vote' + (seat.ghostVote ? ' has' : '') }, seat.ghostVote ? '●' : '○'))));
}

function render() {
  const root = document.getElementById('screen');
  if (S.error) { root.replaceChildren(h('div', { class: 'screen-msg display' }, T(S.error) || S.error)); return; }
  if (!S.pub) { root.replaceChildren(h('div', { class: 'screen-msg display' }, '✦ Botc Helper')); return; }
  const p = S.pub;
  const ph = p.phase;
  if (ph.type === 'ended') {
    root.replaceChildren(h('div', { class: 'screen screen-reveal' },
      revealCircle({ seats: p.seats, reveal: p.reveal || [], winner: p.winner, size: 150, text: { title: T('reveal'), good: T('good'), evil: T('evil') } }),
      h('button', { class: 'btn ghost small fs-btn', onclick: () => { try { document.documentElement.requestFullscreen(); } catch { /* */ } } }, '⛶ ' + T('fullscreen'))));
    return;
  }
  const alive = p.seats.filter((x) => x.alive).length;
  const n = Math.max(1, p.seats.length);
  const joinedAll = p.seats.length > 0 && p.seats.every((x) => (S.claimed[x.id] || 0) > 0);
  const showJoin = !(S.room && S.room.locked) && (ph.type === 'setup' || !joinedAll);
  const phaseText = ph.type === 'night' ? `🌙 ${T('night')} ${ph.number}` : ph.type === 'day' ? `☀️ ${T('day')} ${ph.number}` : ph.type === 'ended' ? `🏁 ${T('ended')}` : `✦ ${p.title || 'Botc Helper'}`;
  const joinedN = p.seats.filter((x) => (S.claimed[x.id] || 0) > 0).length;
  const url = joinUrl(code);
  root.replaceChildren(
    h('div', { class: 'screen phase-' + ph.type },
      h('section', { class: 'screen-grim' },
        h('div', { class: 'grim ' + ph.type, style: `--tok:min(120px, ${Math.min(26, (257 / n) * 0.7).toFixed(2)}cqw)` },
          h('div', { class: 'grim-ring', 'aria-hidden': 'true' }),
          h('div', { class: 'grim-center' },
            h('div', { class: 'center-text' },
              h('span', { class: 'display screen-phase' }, phaseText),
              ph.type === 'day' || ph.type === 'night' ? h('span', { class: 'center-stat' }, `${alive} ${T('alive')} · ${Math.ceil(alive / 2)} ${T('votes')}`) : null,
              ph.type === 'setup' ? h('span', { class: 'center-stat' }, `${joinedN} / ${p.seats.length} ${T('joined')}`) : null,
              p.winner ? h('span', { class: 'display screen-winner ' + p.winner }, T(p.winner)) : null)),
          p.seats.map((seat, i) => seatToken(seat, i, n)))),
      h('aside', { class: 'screen-side' },
        p.announcement ? h('div', { class: 'announce' }, p.announcement) : null,
        showJoin ? h('div', { class: 'join-card' },
          h('div', { class: 'qr', html: qrSvg(url, { size: 240 }) }),
          h('p', { class: 'muted' }, T('join')),
          h('p', { class: 'join-url' }, url.replace(/^https?:\/\//, '')),
          h('p', { class: 'label' }, T('code')),
          h('p', { class: 'display big-code' }, code)) : null,
        ph.type === 'night' && p.dream !== false ? h('div', { class: 'panel' },
          h('h3', { class: 'section-title' }, '🐑 ' + T('board')),
          S.board && S.board.board.length
            ? h('ol', { class: 'board big' }, S.board.board.slice(0, 10).map((x) => h('li', null, h('span', { class: 'grow' }, x.name), h('span', { class: 'strong' }, String(x.score)))))
            : h('p', { class: 'muted' }, T('noScores'))) : null,
        h('button', { class: 'btn ghost small fs-btn', onclick: () => { try { document.documentElement.requestFullscreen(); } catch { /* */ } } }, '⛶ ' + T('fullscreen')))));
}

if (!code) {
  S.error = 'noroom';
  render();
} else {
  new LiveClient({
    code,
    params: { role: 'screen' },
    onStatus: (st) => { S.status = st; },
    onMessage: (m) => {
      if (m.t === 'public') { S.pub = m.public; S.room = m.room; S.claimed = m.claimed || {}; }
      else if (m.t === 'board') S.board = m;
      else if (m.t === 'closed') S.error = 'closed';
      else if (m.t === 'error' && m.code === 'noroom') S.error = 'noroom';
      render();
    },
  });
  render();
}
