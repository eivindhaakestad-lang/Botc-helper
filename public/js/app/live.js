// Storytellerens kobling til live-rommet. Grimoiren blir liggende her;
// rommet får bare offentlig tilstand, rollekort og kortene du sender.

import { LiveClient, createRoom } from '../live/client.js';
import { store } from './store.js';
import { render } from './core.js';
import { toast } from './dom.js';
import { t } from './i18n.js';
import { publicProjection, roleCardsFor } from '../engine/live.js';
import { seatName, getSeat } from '../engine/state.js';
import { clockInfo } from '../live/voteclock.js';

export const live = {
  client: null,
  status: 'off', // off | connecting | open | reconnecting | dead | closed
  room: null,
  claimed: {},
  online: {},
  board: null,
  hands: [],
  vote: null,
  chats: {}, // trådnøkkel → meldinger
  offset: 0, // servertid − lokal tid
  lastSync: '',
  error: null,
};

function L() {
  return store.game && store.game.live;
}

export function liveAvailable() {
  return location.protocol === 'http:' || location.protocol === 'https:';
}

export async function startLive() {
  live.error = null;
  try {
    const { code, stToken } = await createRoom();
    store.game.live = { code, stToken, acks: {}, responses: {}, sent: {}, settings: { dream: true, decoys: true, chat: 'always' } };
    store.saveGame();
    connectLive();
  } catch {
    live.error = 'create';
    render();
  }
}

export function connectLive() {
  const l = L();
  if (!l || live.client) return;
  live.status = 'connecting';
  live.client = new LiveClient({
    code: l.code,
    params: { role: 'st', token: l.stToken },
    onMessage,
    onStatus: (st) => { live.status = st; render(); },
    onOpen: () => { live.lastSync = ''; syncLive(); },
  });
}

export function disconnectLive() {
  if (live.client) live.client.close();
  Object.assign(live, { client: null, status: 'off', room: null, claimed: {}, online: {}, board: null, hands: [], vote: null, chats: {}, lastSync: '', error: null });
}

export function closeRoom() {
  if (live.client && live.status === 'open') live.client.send({ t: 'close' });
  setTimeout(disconnectLive, 150);
  if (store.game) { delete store.game.live; store.saveGame(); }
}

function onMessage(m) {
  const l = L();
  if (!l) return;
  switch (m.t) {
    case 'hello':
      live.room = m.room;
      live.claimed = m.claimed || {};
      live.online = m.online || {};
      live.hands = m.hands || [];
      live.vote = m.vote || null;
      live.chats = m.chats || {};
      scheduleAutoFinish();
      for (const [seatId, cards] of Object.entries(m.cards || {})) {
        for (const c of cards) {
          l.sent[c.id] = true;
          if (c.status === 'read' || c.status === 'answered') l.acks[c.id] = true;
          if (c.response && !l.responses[c.id]) l.responses[c.id] = { seatId, choice: c.response, at: Date.now() };
        }
      }
      store.saveGame();
      break;
    case 'presence':
      live.claimed = m.claimed || {};
      live.online = m.online || {};
      render();
      break;
    case 'room':
      live.room = m.room;
      render();
      break;
    case 'cardOk':
      l.sent[m.cardId] = true;
      store.saveGame();
      break;
    case 'ack':
      l.acks[m.cardId] = true;
      store.saveGame();
      break;
    case 'choice': {
      l.acks[m.cardId] = true;
      l.responses[m.cardId] = { seatId: m.seatId, choice: m.choice, at: Date.now() };
      store.saveGame();
      const s = store.state();
      const who = seatName(getSeat(s, m.seatId));
      toast(t('choiceArrived', { name: who, list: m.choice.map((id) => seatName(getSeat(s, id))).join(' + ') }));
      break;
    }
    case 'board':
      live.board = m;
      render();
      break;
    case 'hands':
      live.hands = m.hands || [];
      render();
      break;
    case 'vote':
      if (m.now) live.offset = m.now - Date.now();
      live.vote = m.vote || null;
      scheduleAutoFinish();
      render();
      break;
    case 'chat': {
      const list = live.chats[m.key] || (live.chats[m.key] = []);
      if (!list.some((x) => x.id === m.msg.id)) list.push(m.msg);
      if (m.key.startsWith('st|') && m.msg.from !== 'st') {
        const s = store.state();
        const g = s && getSeat(s, m.msg.from);
        toast('💬 ' + (g ? seatName(g) : '?') + ': ' + m.msg.text.slice(0, 80));
      }
      render();
      break;
    }
    case 'error':
      if (m.code === 'noroom' || m.code === 'auth') { live.error = m.code; render(); }
      break;
    default:
      break;
  }
}

export function syncLive() {
  const l = L();
  if (!l || !live.client || live.status !== 'open') return;
  const s = store.state();
  if (!s) return;
  const pub = publicProjection(s, l.settings || {});
  // Før rollene er sendt ut, får elevene ingen rollekort.
  const cards = pub.rolesOut ? roleCardsFor(s) : Object.fromEntries(s.seats.map((x) => [x.id, null]));
  const payload = JSON.stringify([pub, cards]);
  if (payload === live.lastSync) return;
  live.lastSync = payload;
  live.client.send({ t: 'sync', public: pub, roleCards: cards });
}

export function liveOpen() {
  return !!(L() && live.status === 'open');
}

export function seatOnline(seatId) {
  return (live.online[seatId] || 0) > 0;
}

export function sendCard(seatId, card) {
  if (!liveOpen()) return false;
  live.client.send({ t: 'card', seatId, card });
  L().sent[card.id] = 'pending';
  store.saveGame();
  return true;
}

export function cardState(id) {
  const l = L();
  if (!l) return null;
  if (l.responses[id]) return 'answered';
  if (l.acks[id]) return 'read';
  if (l.sent[id]) return 'sent';
  return null;
}

export function setLiveSetting(key, value) {
  const l = L();
  if (!l) return;
  l.settings = { ...(l.settings || {}), [key]: value };
  store.saveGame();
}

export function sendRoles(on = true) {
  setLiveSetting('rolesOut', on);
  syncLive();
}

export function setLocked(locked) {
  if (liveOpen()) live.client.send({ t: 'lock', locked });
}

export function releaseSeat(seatId) {
  if (liveOpen()) live.client.send({ t: 'release', seatId });
}


// ——— håndsopprekning ———
export function lowerHand(seatId) {
  if (!liveOpen()) return;
  live.hands = live.hands.filter((x) => x !== seatId);
  live.client.send({ t: 'hand', seatId });
}

export function clearHands() {
  if (!liveOpen()) return;
  live.hands = [];
  live.client.send({ t: 'handsClear' });
}

// ——— avstemning på elevenes PC-er ———
export function openVote(nom, need) {
  if (!liveOpen()) return;
  live.client.send({ t: 'voteOpen', vote: { id: nom.id, nominatorId: nom.nominatorId, nomineeId: nom.nomineeId, need, voters: nom.voters || [] } });
}

export function setVoteVoters(voters) {
  if (!liveOpen() || !live.vote) return;
  live.vote = { ...live.vote, voters };
  live.client.send({ t: 'voteSet', voters });
}

export function closeVote() {
  if (!liveOpen() || !live.vote) return;
  live.vote = { ...live.vote, open: false };
  live.client.send({ t: 'voteClose' });
}

// ——— avstemningsklokka ———
// Offisiell rekkefølge: viseren starter hos spilleren etter den nominerte (med klokka)
// og ender hos den nominerte. Innstillingen «nominator» starter hos den som nominerer.
export function clockOrder(s, nom) {
  const ids = s.seats.map((x) => x.id);
  const n = ids.length;
  const settings = (L() && L().settings) || {};
  const start = settings.clockStart === 'nominator'
    ? Math.max(0, ids.indexOf(nom.nominatorId))
    : (ids.indexOf(nom.nomineeId) + 1) % n;
  return ids.map((_, i) => ids[(start + i) % n]);
}

export function startClock(s, nom) {
  if (!liveOpen() || !live.vote || live.vote.id !== nom.id || !live.vote.open) return;
  const settings = L().settings || {};
  live.client.send({ t: 'voteClock', order: clockOrder(s, nom), stepMs: Number(settings.clockStep) || 2000 });
}

// Når viseren har gått rundt, lagres stemmene og avstemningen lukkes av seg selv.
let finishTimer = null;
function scheduleAutoFinish() {
  clearTimeout(finishTimer);
  const v = live.vote;
  const info = v && v.open ? clockInfo(v, live.offset) : null;
  if (!info) return;
  const ms = info.endsAt - (Date.now() + live.offset) + 700;
  finishTimer = setTimeout(() => {
    const cur = live.vote;
    if (!cur || cur.id !== v.id || !cur.open || !store.game) return;
    const s = store.state();
    const nom = s && s.nominations && s.nominations.find((x) => x.id === cur.id);
    if (nom) {
      store.dispatch({ type: 'VOTE', sk: 'vote:' + nom.id, nominationId: nom.id, voters: cur.voters, log: `${t('votes')}: ${seatName(getSeat(s, nom.nomineeId))} ${cur.voters.length}` });
      toast(t('clockDone', { name: seatName(getSeat(s, nom.nomineeId)), n: cur.voters.length }));
    }
    closeVote();
    render();
  }, Math.max(0, ms));
}

// ——— timer på storskjermen ———
export function sendTimer(ms, label = '') {
  if (!liveOpen()) return;
  live.client.send({ t: 'timer', durationMs: ms || 0, label });
}

// ——— chat ———
export function sendChat(seatId, text) {
  const tx = String(text || '').trim();
  if (!liveOpen() || !tx) return false;
  live.client.send({ t: 'chat', seatId, text: tx.slice(0, 500) });
  return true;
}

// Uleste meldinger til deg (bare tråder mellom elev og Storyteller teller).
export function chatUnread(key) {
  const l = L();
  const list = live.chats[key] || [];
  const read = (l && l.chatRead && l.chatRead[key]) || 0;
  return list.slice(read).filter((m) => m.from !== 'st').length;
}
export function markChatRead(key) {
  const l = L();
  if (!l) return;
  const n = (live.chats[key] || []).length;
  l.chatRead = { ...(l.chatRead || {}), [key]: n };
  store.saveGame();
}
export function totalChatUnread() {
  return Object.keys(live.chats).filter((k) => k.startsWith('st|')).reduce((a, k) => a + chatUnread(k), 0);
}
