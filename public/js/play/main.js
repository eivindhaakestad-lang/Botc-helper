// Elevvisningen: velg plass, se rollen din, motta kort fra Storytelleren, svar på valg
// og spill drømmespillet om natten. Viser aldri noe hemmelig uten at eleven holder inne / trykker.

import { h, toast } from '../app/dom.js';
import { LiveClient } from '../live/client.js';
import { DreamGame } from './dream.js';
import { revealCircle } from '../live/reveal.js';
import { voteCircle, tickVoteCircle, lockAt } from '../live/voteclock.js';
import { sfx, enableSound, disableSound, soundEnabled } from '../live/sound.js';
import { applyTheme } from '../live/theme.js';

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
    town: 'Byen', alive: 'lever', dead: 'død', ghost: 'ghost vote', board: 'Drømmetoppliste', noScores: 'Ingen har hoppet over hinder ennå.',
    sheep: 'Hinder', best: 'Din rekord', start: 'Trykk eller mellomrom for å hoppe', woke: 'Du våknet!', sheepCounted: 'hinder', eagle: '🦅 Ørn! Ikke hopp – løp under!', again: 'Trykk for å prøve igjen', paused: 'Pause',
    morning: 'Solen står opp – drømmen er over.', you: 'Du', answered: 'Svar sendt', winnerGood: 'Det gode laget vinner!', winnerEvil: 'Det onde laget vinner!',
    reveal: 'Rollene var', leave: 'Bytt plass', revealTitle: 'Grim reveal', revealWait: 'Storytelleren avslører rollene …',
    beforeGame: 'Før spillet', raiseHand: '✋ Rekk opp hånden', lowerHand: 'Ta ned hånden', handPos: 'Hånden din er oppe – du er nr. {n}', handQueue: 'Talerekkefølge',
    voteTitle: '{a} nominerte {b}', voteYes: '✋ Jeg stemmer for å henrette', voteUndo: '✓ Du stemmer – trykk for å angre', voteOpen: 'Stem nå!',
    voteClosed: 'Avstemningen er lukket', voteCount: '{n} av {need} stemmer trengs', ghostWarn: 'Du er død: dette bruker din ene ghost vote.',
    noGhost: 'Du har brukt ghost vote-en din og kan ikke stemme.', onBlock: 'På blokka: {name} ({n} stemmer)', nomsToday: 'Nominasjoner i dag', executedToday: 'Henrettet i dag: {name}',
    nominator: 'nominerer', nominee: 'nominert', startsIn: 'Viseren starter om', handAt: 'Viseren er hos', voteBefore: 'Stem før viseren når deg!',
    lockedYes: '🔒 Stemmen din er låst: du stemte for', lockedNo: '🔒 Viseren har passert deg: du stemte ikke', votelocked: 'For sent – viseren har passert deg.',
    timer: 'Tid', timeUp: 'Tiden er ute!', sound: 'Lyd',
    lastMsg: 'Hold inne for å se siste melding', noMsgYet: 'Du har ikke fått melding ennå.', chat: 'Chat', chatSt: 'Storyteller',
    chatPlaceholder: 'Skriv til {name} …', chatSend: 'Send', chatEmpty: 'Ingen meldinger ennå.', chatStHelp: 'Bare Storytelleren ser dette.',
    chatNbHelp: 'Bare {name} og Storytelleren ser dette.', chatClosed: 'Naboprat er stengt akkurat nå.', chatnotneighbour: 'Du kan bare skrive til naboene dine.', chatclosed: 'Naboprat er stengt akkurat nå.',
    newChat: 'Ny melding fra {name}', dawnPending: 'Byen våkner … Storytelleren forteller snart hva som skjedde i natt.', rolesOut: 'Rollene er delt ut! Hold inne for å se din.',
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
    town: 'The town', alive: 'alive', dead: 'dead', ghost: 'ghost vote', board: 'Dream leaderboard', noScores: 'Nobody has cleared an obstacle yet.',
    sheep: 'Obstacles', best: 'Your best', start: 'Tap or press space to jump', woke: 'You woke up!', sheepCounted: 'obstacles', eagle: '🦅 Eagle! Don’t jump – run under it!', again: 'Tap to try again', paused: 'Paused',
    morning: 'The sun rises – the dream is over.', you: 'You', answered: 'Choice sent', winnerGood: 'Good wins!', winnerEvil: 'Evil wins!',
    reveal: 'The characters were', leave: 'Change seat', revealTitle: 'Grim reveal', revealWait: 'The Storyteller is revealing the characters …',
    beforeGame: 'Before the game', raiseHand: '✋ Raise your hand', lowerHand: 'Lower your hand', handPos: 'Your hand is up – you are no. {n}', handQueue: 'Speaking order',
    voteTitle: '{a} nominated {b}', voteYes: '✋ I vote to execute', voteUndo: '✓ You are voting – tap to undo', voteOpen: 'Vote now!',
    voteClosed: 'The vote is closed', voteCount: '{n} of {need} votes needed', ghostWarn: 'You are dead: this uses your one ghost vote.',
    noGhost: 'You have used your ghost vote and cannot vote.', onBlock: 'On the block: {name} ({n} votes)', nomsToday: 'Nominations today', executedToday: 'Executed today: {name}',
    nominator: 'nominates', nominee: 'nominated', startsIn: 'The hand starts in', handAt: 'The hand is at', voteBefore: 'Vote before the hand reaches you!',
    lockedYes: '🔒 Your vote is locked: you voted yes', lockedNo: '🔒 The hand has passed you: you did not vote', votelocked: 'Too late – the hand has passed you.',
    timer: 'Time', timeUp: 'Time is up!', sound: 'Sound',
    lastMsg: 'Press and hold to see your latest message', noMsgYet: 'You have not received a message yet.', chat: 'Chat', chatSt: 'Storyteller',
    chatPlaceholder: 'Write to {name} …', chatSend: 'Send', chatEmpty: 'No messages yet.', chatStHelp: 'Only the Storyteller sees this.',
    chatNbHelp: 'Only {name} and the Storyteller see this.', chatClosed: 'Neighbour chat is closed right now.', chatnotneighbour: 'You can only write to your neighbours.', chatclosed: 'Neighbour chat is closed right now.',
    newChat: 'New message from {name}', dawnPending: 'The town wakes up … The Storyteller will soon tell what happened last night.', rolesOut: 'Characters are out! Press and hold to see yours.',
  },
};

const P = {
  code: null, client: null, status: 'connecting', error: null,
  pub: null, room: null, claimed: {},
  me: null, roleCard: null, inbox: [], board: null,
  view: 'home', overlay: [], shown: {}, choiceSel: {}, revealMsg: null,
  dream: null, decoyTimers: [], hands: [], vote: null, timer: null, offset: 0,
  chats: {}, chatTab: 'st', chatDraft: {},
};

const lang = () => (P.pub && P.pub.lang === 'en' ? 'en' : 'no');
const T = (k, p) => { let s = TXT[lang()][k] || TXT.no[k] || k; if (p) s = s.replace(/\{(\w+)\}/g, (_, x) => p[x]); return s; };
const credKey = () => 'botc-seat-' + P.code;
function loadCred() { try { return JSON.parse(localStorage.getItem(credKey()) || 'null'); } catch { return null; } }
function saveCred(c) { try { if (c) localStorage.setItem(credKey(), JSON.stringify(c)); else localStorage.removeItem(credKey()); } catch { /* */ } }
const seatName = (id) => { const s = P.pub && P.pub.seats.find((x) => x.id === id); return s ? s.names.join(' + ') : '?'; };
const isNight = () => P.pub && P.pub.phase.type === 'night';
// Drømmespillet er åpent før spillet starter og om natten.
const dreamPhase = () => !!(P.pub && (P.pub.phase.type === 'night' || P.pub.phase.type === 'setup') && P.pub.dream !== false);
const myBest = () => { const b = P.board && P.me && P.board.board.find((x) => x.seatId === P.me.seatId); return b ? b.score : 0; };

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
      const wasHidden = !!(P.pub && P.pub.rolesOut === false);
      P.pub = m.public;
      P.room = m.room;
      P.claimed = m.claimed || {};
      P.hands = m.hands || [];
      const pv = P.vote;
      if (wasHidden && P.pub.rolesOut !== false && P.me) { toast('🎭 ' + T('rolesOut')); sfx.reveal(); }
      P.vote = m.vote || null;
      P.timer = m.timer || null;
      if (m.now) P.offset = m.now - Date.now();
      if (P.vote && P.vote.open && (!pv || pv.id !== P.vote.id || !pv.open)) sfx.gavel();
      const ph = P.pub.phase;
      if (before && P.view === 'dream' && !dreamPhase()) { closeDream(); toast(T('morning')); }
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
      P.chats = m.chats || {};
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
    case 'chat': {
      const list = P.chats[m.key] || (P.chats[m.key] = []);
      if (!list.some((x) => x.id === m.msg.id)) list.push(m.msg);
      if (P.me && m.msg.from !== P.me.seatId) {
        const who = m.msg.from === 'st' ? T('chatSt') : seatName(m.msg.from);
        if (!(P.view === 'home' && chatKeyFor(P.chatTab) === m.key && document.getElementById('chat-log'))) toast('💬 ' + T('newChat', { name: who }));
        sfx.pop();
      }
      break;
    }
    case 'decoy':
      if (isNight() && P.me) P.overlay.push({ id: m.id, decoy: true });
      break;
    case 'board':
      P.board = m;
      if (P.dream) P.dream.best = Math.max(P.dream.best, myBest());
      break;
    case 'released':
      saveCred(null); P.me = null; P.roleCard = null; P.inbox = []; P.overlay = []; P.error = 'released';
      break;
    case 'error':
      if (m.code === 'badtoken') { saveCred(null); P.me = null; }
      else if (m.code === 'noghost') toast(T('noGhost'), 'warn');
      else if (m.code === 'votelocked') toast(T('votelocked'), 'warn');
      else if (m.code === 'chatnotneighbour' || m.code === 'chatclosed') toast(T(m.code), 'warn');
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
  if (!dreamPhase()) return;
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
  if (ph.type === 'day') return h('div', { class: 'phase-hero day' }, h('span', { class: 'display big' }, `☀️ ${T('day')} ${ph.number}`),
    P.pub.dawnPending ? h('p', { class: 'strong dawn-wait' }, T('dawnPending')) : P.pub.announcement ? h('p', { class: 'strong announce-play' }, P.pub.announcement) : null,
    h('p', { class: 'muted' }, T('daySub')));
  if (ph.type === 'ended') return h('div', { class: 'phase-hero ended' }, h('span', { class: 'display big' }, '🏁 ' + T('ended')), P.pub.winner ? h('p', { class: 'strong' }, T(P.pub.winner === 'good' ? 'winnerGood' : 'winnerEvil')) : null);
  return h('div', { class: 'phase-hero' }, h('span', { class: 'display big' }, '✦ ' + (P.pub.title || 'Botc Helper')), h('p', { class: 'muted' }, T('setup')));
}

function boardView() {
  const b = P.board;
  return h('div', { class: 'panel' },
    h('h3', { class: 'section-title' }, '🏃 ' + T('board')),
    b && b.board.length
      ? h('ol', { class: 'board' }, b.board.map((x) => h('li', { class: P.me && x.seatId === P.me.seatId ? 'me' : '' }, h('span', { class: 'grow' }, x.name), h('span', { class: 'strong' }, String(x.score)))))
      : h('p', { class: 'muted small' }, T('noScores')));
}

// ——— siste melding (alle har boksen, så ingen ser hvem som har fått noe) ———
function lastMessageView() {
  const last = P.inbox.filter((c) => c.kind !== 'choice').slice(-1)[0];
  return holdReveal(T('lastMsg'), h('p', { class: 'card-text' + (last ? '' : ' muted') }, last ? last.text : T('noMsgYet')), 'msg-hold');
}

// ——— chat ———
function neighbours() {
  const seats = P.pub.seats;
  const n = seats.length;
  const i = seats.findIndex((x) => x.id === P.me.seatId);
  if (i < 0 || n < 2) return [];
  return [...new Set([seats[(i - 1 + n) % n].id, seats[(i + 1) % n].id])].filter((x) => x !== P.me.seatId);
}
function chatKeyFor(tab) {
  if (!P.me) return '';
  return tab === 'st' ? 'st|' + P.me.seatId : [P.me.seatId, tab].sort().join('|');
}
function neighbourChatOpen() {
  return P.pub.chat !== 'off';
}
const readKey = () => 'botc-chatread-' + P.code + '-' + (P.me ? P.me.seatId : '');
function chatRead() { try { return JSON.parse(localStorage.getItem(readKey()) || '{}'); } catch { return {}; } }
function setChatRead(key, n) { try { const r = chatRead(); r[key] = n; localStorage.setItem(readKey(), JSON.stringify(r)); } catch { /* */ } }
function unread(key) {
  const list = P.chats[key] || [];
  const read = chatRead()[key] || 0;
  return list.slice(read).filter((m) => m.from !== P.me.seatId).length;
}

function chatView() {
  const nbs = P.pub.chat === 'off' ? [] : neighbours();
  if (P.chatTab !== 'st' && !nbs.includes(P.chatTab)) P.chatTab = 'st';
  const tab = P.chatTab;
  const key = chatKeyFor(tab);
  const list = P.chats[key] || [];
  setChatRead(key, list.length);
  const isSt = tab === 'st';
  const closed = !isSt && !neighbourChatOpen();
  const who = isSt ? T('chatSt') : seatName(tab);
  const send = () => {
    const text = (P.chatDraft[key] || '').trim();
    if (!text) return;
    P.client.send({ t: 'chat', to: tab, text: text.slice(0, 500) });
    P.chatDraft[key] = '';
    render();
  };
  queueMicrotask(() => { const el = document.getElementById('chat-log'); if (el) el.scrollTop = el.scrollHeight; });
  return h('div', { class: 'panel chat-box' },
    h('h3', { class: 'section-title' }, '💬 ' + T('chat')),
    h('div', { class: 'segmented chat-tabs' }, ['st', ...nbs].map((id) => {
      const n = unread(chatKeyFor(id));
      return h('button', { type: 'button', class: 'seg' + (id === tab ? ' active' : ''), onclick: () => { P.chatTab = id; render(); } },
        id === 'st' ? '🕯 ' + T('chatSt') : seatName(id), n && id !== tab ? h('span', { class: 'badge' }, String(n)) : null);
    })),
    h('p', { class: 'muted small' }, isSt ? T('chatStHelp') : T('chatNbHelp', { name: who })),
    h('div', { class: 'chat-log', id: 'chat-log' },
      list.length ? list.map((m) => h('div', { class: 'chat-msg' + (m.from === P.me.seatId ? ' mine' : m.from === 'st' ? ' st' : '') },
        h('span', { class: 'chat-meta' }, (m.from === P.me.seatId ? T('you') : m.from === 'st' ? T('chatSt') : seatName(m.from)) + ' · ' + new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })),
        h('span', { class: 'chat-text' }, m.text))) : h('p', { class: 'muted small center' }, T('chatEmpty'))),
    closed ? h('p', { class: 'small warn-text' }, T('chatClosed')) : h('form', { class: 'chat-form', onsubmit: (e) => { e.preventDefault(); send(); } },
      h('textarea', {
        id: 'chat-input', class: 'input', rows: 2, maxlength: 500, placeholder: T('chatPlaceholder', { name: who }), value: P.chatDraft[key] || '',
        oninput: (e) => { P.chatDraft[key] = e.target.value; },
        onkeydown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } },
      }),
      h('button', { class: 'btn primary', type: 'submit' }, T('chatSend'))));
}

function blockId() {
  const d = P.pub && P.pub.phase.type === 'day' && P.pub.day;
  return d && d.block && !d.executed ? d.block.nomineeId : null;
}

function townView() {
  return h('div', { class: 'panel' },
    h('h3', { class: 'section-title' }, T('town')),
    h('ol', { class: 'town' }, P.pub.seats.map((x) => h('li', { class: (x.alive ? '' : 'dead') + (P.me && x.id === P.me.seatId ? ' me' : '') + (blockId() === x.id ? ' on-block' : '') },
      h('span', { class: 'grow' }, (blockId() === x.id ? '💀 ' : '') + x.names.join(' + ')),
      h('span', { class: 'muted small' }, x.alive ? T('alive') : `† ${x.ghostVote ? '● ' + T('ghost') : ''}`)))));
}

function handView() {
  const t = P.pub.phase.type;
  if (!P.me || !(t === 'setup' || t === 'day')) return null;
  const pos = P.hands.indexOf(P.me.seatId);
  const up = pos >= 0;
  return h('div', { class: 'panel hand-panel' + (up ? ' up' : '') },
    h('button', { class: 'btn big hand-btn' + (up ? '' : ' primary'), onclick: () => P.client.send({ t: 'hand', up: !up }) }, up ? T('lowerHand') : T('raiseHand')),
    up ? h('p', { class: 'strong center' }, T('handPos', { n: pos + 1 })) : null,
    P.hands.length ? h('div', { class: 'stack tight' },
      h('span', { class: 'label' }, T('handQueue')),
      h('ol', { class: 'hand-queue' }, P.hands.map((id) => h('li', { class: id === P.me.seatId ? 'me' : '' }, seatName(id))))) : null);
}

function myLocked(v) {
  if (!v || !v.clock || !P.me) return false;
  const at = lockAt(v, P.me.seatId);
  return at !== null && Date.now() + P.offset >= at;
}

function voteView() {
  const v = P.vote;
  if (!v || !P.me || P.pub.phase.type !== 'day') return null;
  const me = P.pub.seats.find((x) => x.id === P.me.seatId);
  const mine = v.voters.includes(P.me.seatId);
  const cant = me && !me.alive && !me.ghostVote && !mine;
  const locked = myLocked(v);
  const vtext = { nominator: T('nominator'), nominee: T('nominee'), startsIn: T('startsIn'), handAt: T('handAt'), closed: T('voteClosed'), voteNow: T('voteOpen') };
  return h('div', { class: 'vote-card' + (v.open ? ' open' : '') + (v.clock ? ' clock' : '') },
    h('p', { class: 'eyebrow' }, v.open ? (v.clock ? '🕐 ' + T('voteBefore') : '🗳 ' + T('voteOpen')) : T('voteClosed')),
    h('p', { class: 'display vote-title vote-who' }, h('span', { class: 'vc-nominator' }, seatName(v.nominatorId)), h('span', { class: 'vcs-arrow' }, ' ➜ '), h('span', { class: 'vc-nominee' }, seatName(v.nomineeId))),
    h('p', { class: 'vote-num' }, h('span', { class: 'big-num' }, String(v.voters.length)), ' ', T('voteCount', { n: '', need: v.need }).replace(/^\s*/, '')),
    v.open
      ? (cant ? h('p', { class: 'warn-text' }, T('noGhost'))
        : locked ? h('p', { class: 'strong locked-msg' + (mine ? ' yes' : '') }, mine ? T('lockedYes') : T('lockedNo'))
          : h('button', { class: 'btn big vote-btn' + (mine ? ' on' : ' primary'), onclick: () => P.client.send({ t: 'voteCast', voteId: v.id, up: !mine }) }, mine ? T('voteUndo') : T('voteYes')))
      : null,
    v.open && !locked && me && !me.alive && me.ghostVote && !mine ? h('p', { class: 'muted small' }, T('ghostWarn')) : null,
    v.clock ? voteCircle({ seats: P.pub.seats, vote: v, text: vtext, me: P.me.seatId, size: 64 }) : null,
    v.voters.length ? h('p', { class: 'muted small' }, '✋ ' + v.voters.map(seatName).join(', ')) : null);
}

// Timer fra Storytelleren
const fmtTime = (x) => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`;
function timerLeft() {
  return P.timer ? Math.max(0, Math.ceil((P.timer.endsAt - (Date.now() + P.offset)) / 1000)) : null;
}
function timerView() {
  const left = timerLeft();
  if (left === null) return null;
  return h('div', { class: 'timer-card small-timer' + (left <= 10 ? ' urgent' : '') + (left === 0 ? ' up' : '') },
    h('span', { class: 'label' }, '⏳ ' + (P.timer.label || T('timer'))),
    h('span', { class: 'display timer-big', id: 'play-timer' }, left === 0 ? T('timeUp') : fmtTime(left)));
}

// Viser, låsing og timer oppdateres jevnlig uten full ny tegning.
const tk = { locked: null, done: null, timerSec: null, voteId: null };
setInterval(() => {
  const root = document.getElementById('play');
  if (!root || !P.pub) return;
  const v = P.vote;
  if (v && v.clock && P.pub.phase.type === 'day') {
    const vtext = { startsIn: T('startsIn'), handAt: T('handAt'), closed: T('voteClosed'), voteNow: T('voteOpen') };
    const info = tickVoteCircle(root, v, P.offset, vtext);
    if (tk.voteId !== v.id) Object.assign(tk, { voteId: v.id, locked: myLocked(v), done: info && info.done });
    const l = myLocked(v);
    if (l !== tk.locked) { tk.locked = l; if (l) sfx.lock(); render(); }
    if (info && info.done && !tk.done) { tk.done = true; sfx.bell(); }
  }
  const left = timerLeft();
  const el = document.getElementById('play-timer');
  if (left !== null) {
    if (el) {
      el.textContent = left === 0 ? T('timeUp') : fmtTime(left);
      const card = el.closest('.timer-card');
      if (card) { card.classList.toggle('urgent', left <= 10); card.classList.toggle('up', left === 0); }
    }
    if (left === 0 && tk.timerSec > 0) sfx.bell();
    tk.timerSec = left;
  } else tk.timerSec = null;
}, 100);

function dayView() {
  const d = P.pub.day;
  if (!d || !d.nominations.length) return null;
  return h('div', { class: 'panel' },
    h('h3', { class: 'section-title' }, T('nomsToday')),
    h('ol', { class: 'town' }, d.nominations.map((n) => h('li', { class: d.block && d.block.nomineeId === n.nomineeId ? 'me' : '' },
      h('span', { class: 'grow' }, `${seatName(n.nominatorId)} → ${seatName(n.nomineeId)}`),
      h('span', { class: 'strong' }, `${n.votes} / ${d.need}`)))),
    d.block ? h('p', { class: 'strong block-line' }, '💀 ' + T('onBlock', { name: seatName(d.block.nomineeId), n: d.block.votes })) : null,
    d.executed && d.executed !== 'none' ? h('p', { class: 'muted' }, T('executedToday', { name: seatName(d.executed) })) : null);
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
    timerView(),
    voteView(),
    P.pub.rolesOut === false ? null : h('div', { class: 'hold-row' },
      P.roleCard
        ? holdReveal(T('holdRole'), h('div', null, h('p', { class: 'display role-name team-' + P.roleCard.team }, P.roleCard.character), h('p', { class: 'card-text' }, P.roleCard.text)), 'role-hold')
        : h('p', { class: 'muted' }, T('noRole')),
      lastMessageView()),
    handView(),
    dreamPhase() ? h('button', { class: 'btn primary big dream-btn', onclick: openDream }, '💤 ' + T('playDream')) : null,
    dreamPhase() ? boardView() : null,
    dayView(),
    chatView(),
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

function dreamLabel() {
  return P.pub.phase.type === 'night' ? `🌙 ${T('night')} ${P.pub.phase.number}` : `✦ ${T('beforeGame')}`;
}

function dreamView() {
  const wrap = h('div', { class: 'dream-view' },
    h('div', { class: 'row between' },
      h('button', { class: 'btn ghost', onclick: () => { closeDream(); render(); } }, '← ' + T('back')),
      h('span', { id: 'dream-phase', class: 'display' }, dreamLabel())),
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

function soundToggle() {
  const on = soundEnabled();
  return h('button', { class: 'btn small ghost sound-btn', title: T('sound'), 'aria-pressed': on ? 'true' : 'false', onclick: () => { if (on) disableSound(); else { enableSound(); sfx.pop(); } render(); } }, on ? '🔊' : '🔇');
}

function render() {
  const root = document.getElementById('play');
  applyTheme(P.pub && P.me ? P.pub.phase.type : 'none');
  let main;
  if (!P.code) main = codeEntry();
  else if (P.error === 'closed' || P.error === 'noroom') main = h('p', { class: 'callout' }, T(P.error));
  else if (!P.pub) main = h('p', { class: 'muted center' }, T('connecting'));
  else if (P.pub.phase.type === 'ended') main = revealView();
  else if (!P.me) main = seatPicker();
  else if (P.view === 'dream' && dreamPhase()) main = dreamView();
  else main = homeView();
  const keepDream = P.view === 'dream' && P.dream && document.getElementById('dream-canvas');
  if (keepDream && P.me && dreamPhase()) {
    // Ikke tegn spillet på nytt – bare oppdater toppliste, fase og overlegg.
    const b = root.querySelector('.dream-view .panel');
    if (b) b.replaceWith(boardView());
    const lbl = document.getElementById('dream-phase');
    if (lbl) lbl.textContent = dreamLabel();
    root.querySelector('.overlay-slot').replaceChildren(overlayView() || '');
    root.querySelector('.conn').replaceChildren(connView());
    return;
  }
  const act = document.activeElement;
  const refocus = act && act.id === 'chat-input' ? act.selectionStart : null;
  root.replaceChildren(
    h('header', { class: 'play-top' },
      h('span', { class: 'brand-name' }, '✦ Botc Helper'),
      P.code ? h('span', { class: 'room-code display' }, P.code) : null,
      h('span', { class: 'conn' }, connView()),
      soundToggle()),
    h('main', { class: 'play-main' + (P.view === 'dream' && dreamPhase() ? ' wide' : '') }, main),
    h('div', { class: 'overlay-slot' }, P.me ? overlayView() || '' : ''));
  if (refocus !== null) {
    const el = document.getElementById('chat-input');
    if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(refocus, refocus); } catch { /* */ } }
  }
  if (P.view === 'dream' && dreamPhase() && P.me) {
    if (P.dream) P.dream.destroy();
    const canvas = document.getElementById('dream-canvas');
    const text = TXT[lang()];
    P.dream = new DreamGame(canvas, { text, best: myBest(), onGameOver: (score) => P.client.send({ t: 'score', score }) });
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
