// Elevvisningen: velg plass, se rollen din, motta kort fra Storytelleren, svar på valg
// og spill drømmespillet om natten. Viser aldri noe hemmelig uten at eleven holder inne / trykker.

import { h, toast } from '../app/dom.js';
import { LiveClient } from '../live/client.js';
import { DreamGame } from './dream.js';
import { revealCircle } from '../live/reveal.js';

const TXT = {
  no: {
    title: 'Botc Helper', enterCode: 'Skriv inn romkoden fra tavla', join: 'Bli med', connecting: 'Kobler til …', reconnecting: 'Mistet forbindelsen – prøver igjen …',
    pickSeat: 'Trykk på navnet ditt', taken: 'Tatt', locked: 'Rommet er låst. Spør Storytelleren.', seatTaken: 'Plassen er allerede tatt.', noseat: 'Fant ikke plassen.',
    released: 'Storytelleren frigjorde plassen din. Velg på nytt.', closed: 'Spillet er avsluttet. Takk for nå!', noroom: 'Fant ikke rommet. Sjekk koden.',
    setup: 'Venter på at spillet starter …', night: 'Natt', day: 'Dag', ended: 'Spillet er slutt', nightSub: 'Byen sover. Storytelleren vekker deg hvis du skal gjøre noe.',
    daySub: 'Diskuter, nominer og stem.', holdRole: 'Hold inne for å se rollen din', roleHidden: 'Rollen din er skjult', noRole: 'Du har ikke fått rolle ennå.',
    playDream: 'Spill drømmespill', dreamClosed: 'Drømmespillet åpner når natten kommer.', back: 'Tilbake',
    messages: 'Mine meldinger', noMessages: 'Ingen meldinger ennå.', holdRead: 'Hold inne for å lese', tapShow: 'Trykk for å vise', hide: 'Skjul',
    wake: 'Storytelleren vekker deg', read: 'Jeg har lest', send: 'Send valg', chooseN: 'Velg {n}', decoy: '🌙 Ingenting skjer. Du sover videre.', ok: 'OK',
    town: 'Byen', alive: 'lever', dead: 'død', ghost: 'ghost vote', board: 'Drømmetoppliste – natt', noScores: 'Ingen har talt sauer ennå.',
    sheep: 'Sauer', best: 'Rekord i natt', start: 'Trykk eller mellomrom for å hoppe', woke: 'Du våknet!', sheepCounted: 'sauer', again: 'Trykk for å prøve igjen', paused: 'Pause',
    morning: 'Solen står opp – drømmen er over.', you: 'Du', answered: 'Svar sendt', winnerGood: 'Det gode laget vinner!', winnerEvil: 'Det onde laget vinner!',
    reveal: 'Rollene var', leave: 'Bytt plass', revealTitle: 'Grim reveal', revealWait: 'Storytelleren avslører rollene …',
  },
  en: {
    title: 'Botc Helper', enterCode: 'Type the room code from the board', join: 'Join', connecting: 'Connecting …', reconnecting: 'Lost connection – retrying …',
    pickSeat: 'Tap your name', taken: 'Taken', locked: 'The room is locked. Ask the Storyteller.', seatTaken: 'That seat is already taken.', noseat: 'Seat not found.',
    released: 'The Storyteller released your seat. Pick again.', closed: 'The game has ended. Thanks for playing!', noroom: 'Room not found. Check the code.',
    setup: 'Waiting for the game to start …', night: 'Night', day: 'Day', ended: 'Game over', nightSub: 'The town sleeps. The Storyteller wakes you if you have something to do.',
    daySub: 'Discuss, nominate and vote.', holdRole: 'Press and hold to see your character', roleHidden: 'Your character is hidden', noRole: 'You have no character yet.',
    playDream: 'Play the dream game', dreamClosed: 'The dream game opens when night falls.', back: 'Back',
    messages: 'My messages', noMessages: 'No messages yet.', holdRead: 'Press and hold to read', tapShow: 'Tap to show', hide: 'Hide',
    wake: 'The Storyteller wakes you', read: 'I have read it', send: 'Send choice', chooseN: 'Choose {n}', decoy: '🌙 Nothing happens. You keep sleeping.', ok: 'OK',
    town: 'The town', alive: 'alive', dead: 'dead', ghost: 'ghost vote', board: 'Dream leaderboard – night', noScores: 'Nobody has counted sheep yet.',
    sheep: 'Sheep', best: 'Best tonight', start: 'Tap or press space to jump', woke: 'You woke up!', sheepCounted: 'sheep', again: 'Tap to try again', paused: 'Paused',
    morning: 'The sun rises – the dream is over.', you: 'You', answered: 'Choice sent', winnerGood: 'Good wins!', winnerEvil: 'Evil wins!',
    reveal: 'The characters were', leave: 'Change seat', revealTitle: 'Grim reveal', revealWait: 'The Storyteller is revealing the characters …',
  },
};

const P = {
  code: null, client: null, status: 'connecting', error: null,
  pub: null, room: null, claimed: {},
  me: null, roleCard: null, inbox: [], board: null,
  view: 'home', overlay: [], shown: {}, choiceSel: {}, revealMsg: null,
  dream: null, decoyTimers: [],
};

const lang = () => (P.pub && P.pub.lang === 'en' ? 'en' : 'no');
const T = (k, p) => { let s = TXT[lang()][k] || TXT.no[k] || k; if (p) s = s.replace(/\{(\w+)\}/g, (_, x) => p[x]); return s; };
const credKey = () => 'botc-seat-' + P.code;
function loadCred() { try { return JSON.parse(localStorage.getItem(credKey()) || 'null'); } catch { return null; } }
function saveCred(c) { try { if (c) localStorage.setItem(credKey(), JSON.stringify(c)); else localStorage.removeItem(credKey()); } catch { /* */ } }
const seatName = (id) => { const s = P.pub && P.pub.seats.find((x) => x.id === id); return s ? s.names.join(' + ') : '?'; };
const isNight = () => P.pub && P.pub.phase.type === 'night';

// ——— tilkobling ———
function connect(code) {
  P.code = code.toUpperCase();
  history.replaceState(null, '', '?room=' + P.code);
  P.client = new LiveClient({
    code: P.code,
    params: { role: 'player' },
    onOpen: () => { const c = loadCred(); if (c) P.client.send({ t: 'resume', seatId: c.seatId, token: c.token }); },
    onStatus: (s) => { P.status = s; render(); },
    onMessage,
  });
  render();
}

function onMessage(m) {
  switch (m.t) {
    case 'public': {
      const before = P.pub && P.pub.phase;
      P.pub = m.public;
      P.room = m.room;
      P.claimed = m.claimed || {};
      const ph = P.pub.phase;
      if (before && before.type === 'night' && ph.type !== 'night' && P.view === 'dream') { closeDream(); toast(T('morning')); }
      if (ph.type === 'night' && (!before || before.type !== 'night' || before.number !== ph.number)) planDecoys(ph.number);
      if (ph.type !== 'night') { clearDecoys(); P.overlay = P.overlay.filter((c) => !c.decoy); }
      if (ph.type === 'ended') { P.overlay = []; closeDream(); }
      break;
    }
    case 'you':
      P.me = { seatId: m.seatId, token: m.token };
      saveCred(P.me);
      P.roleCard = m.roleCard;
      P.inbox = m.inbox || [];
      P.overlay = P.inbox.filter((c) => c.status === 'new');
      P.error = null;
      if (isNight()) planDecoys(P.pub.phase.number);
      break;
    case 'role':
      P.roleCard = m.roleCard;
      break;
    case 'card': {
      const i = P.inbox.findIndex((c) => c.id === m.card.id);
      if (i >= 0) P.inbox[i] = m.card; else P.inbox.push(m.card);
      if (m.card.status === 'new' && !P.overlay.some((c) => c.id === m.card.id)) { P.overlay.push(m.card); P.shown[m.card.id] = false; }
      else if (m.card.status !== 'new') P.overlay = P.overlay.filter((c) => c.id !== m.card.id);
      break;
    }
    case 'decoy':
      if (isNight() && P.me) P.overlay.push({ id: m.id, decoy: true });
      break;
    case 'board':
      P.board = m;
      break;
    case 'released':
      saveCred(null); P.me = null; P.roleCard = null; P.inbox = []; P.overlay = []; P.error = 'released';
      break;
    case 'error':
      if (m.code === 'badtoken') { saveCred(null); P.me = null; }
      else P.error = { locked: 'locked', taken: 'seatTaken', noseat: 'noseat', noroom: 'noroom', auth: 'noroom' }[m.code] || null;
      break;
    case 'closed':
      saveCred(null); P.error = 'closed'; P.me = null; closeDream();
      break;
    default:
      break;
  }
  syncPause();
  render();
}

// ——— falske vekkinger ———
function clearDecoys() {
  P.decoyTimers.forEach(clearTimeout);
  P.decoyTimers = [];
}
function planDecoys(night) {
  clearDecoys();
  if (!P.pub || P.pub.decoys === false || !P.me) return;
  const key = `botc-decoy-${P.code}-${night}`;
  let done = 0;
  try { done = Number(localStorage.getItem(key) || 0); } catch { /* */ }
  const want = 1 + (Math.random() < 0.5 ? 1 : 0);
  const times = [25000 + Math.random() * 70000, 110000 + Math.random() * 120000].slice(0, want);
  times.slice(done).forEach((ms) => {
    P.decoyTimers.push(setTimeout(function fire() {
      if (!isNight() || !P.me) return;
      if (P.overlay.length) { P.decoyTimers.push(setTimeout(fire, 6000)); return; }
      P.overlay.push({ id: 'decoy-local-' + Date.now(), decoy: true });
      try { localStorage.setItem(key, String(++done)); } catch { /* */ }
      syncPause();
      render();
    }, ms));
  });
}

// ——— drømmespill ———
function openDream() {
  if (!isNight() || !P.pub || P.pub.dream === false) return;
  P.view = 'dream';
  render();
}
function closeDream() {
  if (P.dream) { P.dream.destroy(); P.dream = null; }
  if (P.view === 'dream') P.view = 'home';
}
function syncPause() {
  if (!P.dream) return;
  if (P.overlay.length) P.dream.pause(); else P.dream.resume();
}

// ——— handlinger på kort ———
function finishCard(card) {
  P.overlay = P.overlay.filter((c) => c.id !== card.id);
  syncPause();
  render();
}
function ack(card) {
  if (!card.decoy) P.client.send({ t: 'ack', cardId: card.id });
  finishCard(card);
}
function choose(card) {
  const sel = P.choiceSel[card.id] || [];
  if (!sel.length) return;
  P.client.send({ t: 'choose', cardId: card.id, choice: sel });
  toast(T('answered'));
  finishCard(card);
}

// Hold-for-å-vise: innholdet vises bare mens eleven holder inne.
function holdReveal(label, content, cls = '') {
  const box = h('div', { class: 'hold ' + cls, tabindex: '0', role: 'button', 'aria-label': label });
  const cover = h('div', { class: 'hold-cover' }, '👁 ' + label);
  const body = h('div', { class: 'hold-body' }, content);
  box.append(cover, body);
  const show = (e) => { if (e) e.preventDefault(); box.classList.add('open'); };
  const hide = () => box.classList.remove('open');
  box.addEventListener('pointerdown', show);
  box.addEventListener('pointerup', hide);
  box.addEventListener('pointerleave', hide);
  box.addEventListener('pointercancel', hide);
  box.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') show(e); });
  box.addEventListener('keyup', hide);
  box.addEventListener('contextmenu', (e) => e.preventDefault());
  return box;
}

// ——— visninger ———
function overlayView() {
  const card = P.overlay[0];
  if (!card) return null;
  let body;
  if (card.decoy) {
    body = [holdReveal(T('holdRead'), h('p', { class: 'card-text' }, T('decoy'))), h('button', { class: 'btn primary big', onclick: () => ack(card) }, T('ok'))];
  } else if (card.kind === 'choice') {
    const open = P.shown[card.id];
    const sel = P.choiceSel[card.id] || [];
    const count = card.choice ? card.choice.count : 1;
    const toggle = (id) => {
      const cur = P.choiceSel[card.id] || [];
      P.choiceSel[card.id] = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-count);
      render();
    };
    body = open
      ? [h('p', { class: 'card-text' }, card.text),
        h('p', { class: 'muted small' }, T('chooseN', { n: count })),
        h('div', { class: 'pick-grid' }, P.pub.seats.filter((x) => card.choice.allowSelf || x.id !== P.me.seatId).map((x) => h('button', {
          class: 'pick' + (sel.includes(x.id) ? ' on' : '') + (x.alive ? '' : ' dead'), onclick: () => toggle(x.id), 'aria-pressed': sel.includes(x.id) ? 'true' : 'false',
        }, x.names.join(' + ') + (x.alive ? '' : ' †')))),
        h('div', { class: 'row gap wrap' },
          h('button', { class: 'btn ghost', onclick: () => { P.shown[card.id] = false; render(); } }, T('hide')),
          h('button', { class: 'btn primary big', disabled: sel.length !== count, onclick: () => choose(card) }, T('send')))]
      : [h('button', { class: 'hold-cover big-cover', onclick: () => { P.shown[card.id] = true; render(); } }, '👁 ' + T('tapShow'))];
  } else {
    body = [holdReveal(T('holdRead'), h('p', { class: 'card-text' }, card.text)), h('button', { class: 'btn primary big', onclick: () => ack(card) }, '✓ ' + T('read'))];
  }
  return h('div', { class: 'wake-overlay' },
    h('div', { class: 'wake-card' },
      h('p', { class: 'eyebrow' }, '📜 ' + T('wake')),
      h('div', { class: 'stack' }, body)));
}

function phaseBanner() {
  const ph = P.pub.phase;
  if (ph.type === 'night') return h('div', { class: 'phase-hero night' }, h('span', { class: 'display big' }, `🌙 ${T('night')} ${ph.number}`), h('p', { class: 'muted' }, T('nightSub')));
  if (ph.type === 'day') return h('div', { class: 'phase-hero day' }, h('span', { class: 'display big' }, `☀️ ${T('day')} ${ph.number}`), h('p', { class: 'muted' }, T('daySub')));
  if (ph.type === 'ended') return h('div', { class: 'phase-hero ended' }, h('span', { class: 'display big' }, '🏁 ' + T('ended')), P.pub.winner ? h('p', { class: 'strong' }, T(P.pub.winner === 'good' ? 'winnerGood' : 'winnerEvil')) : null);
  return h('div', { class: 'phase-hero' }, h('span', { class: 'display big' }, '✦ ' + (P.pub.title || 'Botc Helper')), h('p', { class: 'muted' }, T('setup')));
}

function boardView() {
  const b = P.board;
  return h('div', { class: 'panel' },
    h('h3', { class: 'section-title' }, `${T('board')} ${b && b.night ? b.night : ''}`),
    b && b.board.length
      ? h('ol', { class: 'board' }, b.board.map((x) => h('li', { class: P.me && x.seatId === P.me.seatId ? 'me' : '' }, h('span', { class: 'grow' }, x.name), h('span', { class: 'strong' }, String(x.score)))))
      : h('p', { class: 'muted small' }, T('noScores')));
}

function townView() {
  return h('div', { class: 'panel' },
    h('h3', { class: 'section-title' }, T('town')),
    h('ol', { class: 'town' }, P.pub.seats.map((x) => h('li', { class: (x.alive ? '' : 'dead') + (P.me && x.id === P.me.seatId ? ' me' : '') },
      h('span', { class: 'grow' }, x.names.join(' + ')),
      h('span', { class: 'muted small' }, x.alive ? T('alive') : `† ${x.ghostVote ? '● ' + T('ghost') : ''}`)))));
}

function revealView() {
  return h('div', { class: 'play-reveal' },
    revealCircle({ seats: P.pub.seats, reveal: P.pub.reveal || [], winner: P.pub.winner, me: P.me && P.me.seatId, size: 96,
      text: { title: T('revealTitle'), good: T('winnerGood'), evil: T('winnerEvil') } }),
    P.pub.winner ? null : h('p', { class: 'muted center' }, T('revealWait')));
}

function homeView() {
  if (P.pub.phase.type === 'ended') return revealView();
  const me = P.pub.seats.find((x) => x.id === P.me.seatId);
  return h('div', { class: 'play-home' },
    phaseBanner(),
    P.roleCard
      ? holdReveal(T('holdRole'), h('div', null, h('p', { class: 'display role-name team-' + P.roleCard.team }, P.roleCard.character), h('p', { class: 'card-text' }, P.roleCard.text)), 'role-hold')
      : h('p', { class: 'muted' }, T('noRole')),
    isNight() && P.pub.dream !== false ? h('button', { class: 'btn primary big dream-btn', onclick: openDream }, '🐑 ' + T('playDream')) : null,
    isNight() && P.pub.dream !== false ? boardView() : null,
    h('div', { class: 'panel' },
      h('h3', { class: 'section-title' }, T('messages')),
      P.inbox.length
        ? h('ol', { class: 'inbox' }, P.inbox.slice().reverse().map((c) => h('li', null,
          c.kind === 'choice'
            ? h('p', { class: 'muted small' }, c.status === 'answered' ? `✉ ${T('answered')}: ${(c.response || []).map(seatName).join(' + ')}` : '…')
            : holdReveal(T('holdRead'), h('p', { class: 'card-text' }, c.text), 'small-hold'))))
        : h('p', { class: 'muted small' }, T('noMessages'))),
    townView(),
    me ? h('p', { class: 'muted small center' }, `${T('you')}: ${me.names.join(' + ')}`) : null);
}

function dreamView() {
  const wrap = h('div', { class: 'dream-view' },
    h('div', { class: 'row between' },
      h('button', { class: 'btn ghost', onclick: () => { closeDream(); render(); } }, '← ' + T('back')),
      h('span', { class: 'display' }, `🌙 ${T('night')} ${P.pub.phase.number}`)),
    h('canvas', { id: 'dream-canvas', class: 'dream-canvas', 'aria-label': T('playDream') }),
    boardView());
  return wrap;
}

function seatPicker() {
  return h('div', { class: 'stack' },
    h('h2', { class: 'section-title center' }, T('pickSeat')),
    P.error ? h('p', { class: 'callout warn' }, T(P.error)) : null,
    h('div', { class: 'pick-grid' }, P.pub.seats.map((x) => {
      const full = (P.claimed[x.id] || 0) >= Math.max(1, x.names.length);
      return h('button', { class: 'pick big' + (full ? ' taken' : ''), disabled: full, onclick: () => { P.error = null; P.client.send({ t: 'claim', seatId: x.id }); } },
        x.names.join(' + '), full ? h('span', { class: 'muted small' }, ' · ' + T('taken')) : null);
    })));
}

function codeEntry() {
  return h('form', {
    class: 'stack code-form',
    onsubmit: (e) => { e.preventDefault(); const v = e.target.querySelector('input').value.trim(); if (v) connect(v); },
  },
  h('label', { class: 'label', for: 'room-code' }, T('enterCode')),
  h('input', { id: 'room-code', class: 'input code-input', autocomplete: 'off', autocapitalize: 'characters', maxlength: 8, placeholder: 'ABCDE' }),
  h('button', { class: 'btn primary big', type: 'submit' }, T('join')));
}

function render() {
  const root = document.getElementById('play');
  let main;
  if (!P.code) main = codeEntry();
  else if (P.error === 'closed' || P.error === 'noroom') main = h('p', { class: 'callout' }, T(P.error));
  else if (!P.pub) main = h('p', { class: 'muted center' }, T('connecting'));
  else if (P.pub.phase.type === 'ended') main = revealView();
  else if (!P.me) main = seatPicker();
  else if (P.view === 'dream' && isNight()) main = dreamView();
  else main = homeView();
  const keepDream = P.view === 'dream' && P.dream && document.getElementById('dream-canvas');
  if (keepDream && P.me && isNight()) {
    // Ikke tegn spillet på nytt – bare oppdater toppliste og overlegg.
    const b = root.querySelector('.dream-view .panel');
    if (b) b.replaceWith(boardView());
    root.querySelector('.overlay-slot').replaceChildren(overlayView() || '');
    root.querySelector('.conn').replaceChildren(connView());
    return;
  }
  root.replaceChildren(
    h('header', { class: 'play-top' },
      h('span', { class: 'brand-name' }, '✦ Botc Helper'),
      P.code ? h('span', { class: 'room-code display' }, P.code) : null,
      h('span', { class: 'conn' }, connView())),
    h('main', { class: 'play-main' + (P.view === 'dream' && isNight() ? ' wide' : '') }, main),
    h('div', { class: 'overlay-slot' }, P.me ? overlayView() || '' : ''));
  if (P.view === 'dream' && isNight() && P.me) {
    if (P.dream) P.dream.destroy();
    const canvas = document.getElementById('dream-canvas');
    const text = TXT[lang()];
    P.dream = new DreamGame(canvas, { text, onGameOver: (score) => P.client.send({ t: 'score', score }) });
    syncPause();
  }
}

function connView() {
  if (!P.code) return '';
  if (P.status === 'open') return h('span', { class: 'dot on', title: 'online' });
  return h('span', { class: 'small warn-text' }, P.status === 'dead' ? '' : T('reconnecting'));
}

// Liten feilsøkingskrok (viser bare elevens egen tilstand).
window.botcPlay = { dreamState: () => (P.dream ? P.dream.state : null), overlay: () => P.overlay.length };

const code = new URLSearchParams(location.search).get('room');
render();
if (code) connect(code);
