// Storytellerens kobling til live-rommet. Grimoiren blir liggende her;
// rommet får bare offentlig tilstand, rollekort og kortene du sender.

import { LiveClient, createRoom } from '../live/client.js';
import { store } from './store.js';
import { render } from './core.js';
import { toast } from './dom.js';
import { t } from './i18n.js';
import { publicProjection, roleCardsFor } from '../engine/live.js';
import { seatName, getSeat } from '../engine/state.js';

export const live = {
  client: null,
  status: 'off', // off | connecting | open | reconnecting | dead | closed
  room: null,
  claimed: {},
  online: {},
  board: null,
  hands: [],
  vote: null,
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
    store.game.live = { code, stToken, acks: {}, responses: {}, sent: {}, settings: { dream: true, decoys: true } };
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
  Object.assign(live, { client: null, status: 'off', room: null, claimed: {}, online: {}, board: null, hands: [], vote: null, lastSync: '', error: null });
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
      live.vote = m.vote || null;
      render();
      break;
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
  const cards = roleCardsFor(s);
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
