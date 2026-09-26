// Spilltilstand som hendelseslogg. Tilstanden regnes alltid ut som
//   replay(initial, events)
// Det gir angre/gjør om, lagring og (senere) live-synk med samme mekanisme.
//
// Hendelser kan ha en «supersede key» (sk). Da gjelder bare den siste hendelsen med samme nøkkel.
// Slik kan et nattsteg eller en avstemning rettes i etterkant uten at effektene dobles.

import { charInfo, teamAlignment } from './characters.js';
import { uid } from './rng.js';

export const SCHEMA_VERSION = 1;

export function seatName(seat) {
  return seat ? seat.names.join(' + ') : '?';
}

export function createGame({ seats, script, lang = 'no', style = 'short', bluffs = [], meta = {}, messages = [] }) {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: uid('g_'),
    createdAt: Date.now(),
    meta,
    script: { id: script.id, name: script.name, characters: script.characters.slice(), custom: script.custom || {} },
    lang,
    style,
    seats: seats.map((s) => ({
      id: s.id,
      names: s.names.slice(),
      studentIds: (s.studentIds || []).slice(),
      tags: (s.tags || []).slice(),
      characterId: s.characterId,
      shownCharacterId: s.shownCharacterId || null,
      alignment: s.alignment || teamAlignment(charInfo(s.characterId).team),
      alive: true,
      ghostVote: true,
      reminders: (s.reminders || []).map((r) => ({ id: r.id || uid('r_'), ...r })),
      characterSince: null,
    })),
    bluffs: bluffs.slice(),
    phase: { type: 'setup', number: 0 },
    progress: {},
    deaths: [],
    executions: [],
    nominations: [],
    messages: messages.map((m, i) => ({ id: m.id || 'setup#' + i, phase: { type: 'setup', number: 0 }, ...m })),
    notes: [],
    log: [],
    winner: null,
    revealed: [],
    announced: null,
  };
}

function clone(x) {
  return typeof structuredClone === 'function' ? structuredClone(x) : JSON.parse(JSON.stringify(x));
}

export function replay(initial, events) {
  const s = clone(initial);
  const last = new Map();
  events.forEach((ev, i) => { if (ev.sk) last.set(ev.sk, i); });
  events.forEach((ev, i) => {
    if (ev.sk && last.get(ev.sk) !== i) return;
    applyEvent(s, ev);
  });
  return s;
}

function findSeat(s, id) {
  return s.seats.find((x) => x.id === id);
}

function matchReminder(r, e) {
  if (e.reminderId) return r.id === e.reminderId;
  if (e.kind && r.kind !== e.kind) return false;
  if (e.sourceSeatId !== undefined && r.sourceSeatId !== e.sourceSeatId) return false;
  return !!e.kind;
}

export function applyEffect(s, e, phase) {
  const seat = e.seatId ? findSeat(s, e.seatId) : null;
  switch (e.t) {
    case 'kill':
      if (seat && seat.alive) {
        seat.alive = false;
        s.deaths.push({ seatId: seat.id, phase: { ...phase }, cause: e.cause || null });
      }
      break;
    case 'revive':
      if (seat && !seat.alive) {
        seat.alive = true;
        seat.ghostVote = true;
        for (let i = s.deaths.length - 1; i >= 0; i--) {
          if (s.deaths[i].seatId === seat.id && !s.deaths[i].revived) { s.deaths[i].revived = true; break; }
        }
      }
      break;
    case 'addReminder':
      if (seat) seat.reminders.push({ id: e.reminder.id || uid('r_'), ...e.reminder, at: { ...phase } });
      break;
    case 'removeReminder':
      if (seat) seat.reminders = seat.reminders.filter((r) => !matchReminder(r, e));
      else if (e.kind) for (const x of s.seats) x.reminders = x.reminders.filter((r) => !matchReminder(r, e));
      break;
    case 'setCharacter':
      if (seat) {
        seat.characterId = e.characterId;
        seat.shownCharacterId = e.shownCharacterId || null;
        seat.alignment = e.alignment || teamAlignment(charInfo(e.characterId).team);
        seat.characterSince = { ...phase };
      }
      break;
    case 'setAlignment':
      if (seat) seat.alignment = e.alignment;
      break;
    case 'ghostVote':
      if (seat) seat.ghostVote = !!e.value;
      break;
    case 'setBluffs':
      s.bluffs = e.bluffs.slice();
      break;
    default:
      break;
  }
}

function pushMessages(s, ev, list, phase) {
  (list || []).forEach((m, i) => {
    s.messages.push({ id: (ev.id || uid('m_')) + '#' + i, phase: { ...phase }, kind: 'private', ...m });
  });
}

export function applyEvent(s, ev) {
  const phase = ev.phase || s.phase;
  switch (ev.type) {
    case 'NIGHT_START': {
      if (s.phase.type === 'night') break;
      const number = s.phase.type === 'setup' ? 1 : s.phase.number + 1;
      for (const seat of s.seats) seat.reminders = seat.reminders.filter((r) => r.expires !== 'dusk');
      s.phase = { type: 'night', number };
      break;
    }
    case 'DAY_START': {
      if (s.phase.type !== 'night') break;
      for (const seat of s.seats) seat.reminders = seat.reminders.filter((r) => r.expires !== 'dawn');
      s.phase = { type: 'day', number: s.phase.number };
      pushMessages(s, ev, ev.messages, s.phase);
      break;
    }
    case 'STEP': {
      s.progress[ev.key] = { status: ev.status, input: ev.input || null };
      if (ev.status === 'done') {
        (ev.effects || []).forEach((e) => applyEffect(s, e, phase));
        pushMessages(s, { id: 'step:' + ev.key }, ev.messages, phase);
      }
      break;
    }
    case 'EFFECTS':
      (ev.effects || []).forEach((e) => applyEffect(s, e, phase));
      pushMessages(s, ev, ev.messages, phase);
      break;
    case 'NOMINATE':
      s.nominations.push({ id: ev.nominationId, day: phase.number, nominatorId: ev.nominatorId, nomineeId: ev.nomineeId, voters: [], votes: 0 });
      (ev.effects || []).forEach((e) => applyEffect(s, e, phase));
      pushMessages(s, ev, ev.messages, phase);
      break;
    case 'VOTE': {
      const nom = s.nominations.find((n) => n.id === ev.nominationId);
      if (!nom) break;
      nom.voters = ev.voters.slice();
      nom.votes = ev.voters.length;
      for (const id of ev.voters) {
        const seat = findSeat(s, id);
        if (seat && !seat.alive) seat.ghostVote = false;
      }
      break;
    }
    case 'NOMINATION_REMOVE':
      s.nominations = s.nominations.filter((n) => n.id !== ev.nominationId);
      break;
    case 'EXECUTE': {
      const seat = ev.seatId ? findSeat(s, ev.seatId) : null;
      const died = !!(seat && seat.alive && !ev.noDeath);
      s.executions.push({ day: phase.number, seatId: ev.seatId || null, died });
      if (died) applyEffect(s, { t: 'kill', seatId: seat.id, cause: 'execution' }, phase);
      (ev.effects || []).forEach((e) => applyEffect(s, e, phase));
      pushMessages(s, ev, ev.messages, phase);
      break;
    }
    case 'NOTE':
      s.notes.push({ id: ev.noteId, text: ev.text, phase: { ...phase }, ts: ev.ts || 0 });
      break;
    case 'NOTE_DELETE':
      s.notes = s.notes.filter((n) => n.id !== ev.noteId);
      break;
    case 'MESSAGE':
      pushMessages(s, ev, [ev.message], phase);
      break;
    case 'MESSAGE_EDIT': {
      const m = s.messages.find((x) => x.id === ev.messageId);
      if (m) m.text = ev.text;
      break;
    }
    case 'SETTINGS':
      if (ev.lang) s.lang = ev.lang;
      if (ev.style) s.style = ev.style;
      break;
    case 'GAME_END':
      s.winner = ev.winner || null;
      s.phase = { type: 'ended', number: s.phase.number, from: s.phase.type };
      s.revealed = [];
      s.announced = null;
      pushMessages(s, ev, ev.messages, s.phase);
      break;
    case 'REVEAL':
      s.revealed = [...new Set([...(s.revealed || []), ...(ev.seatIds || [])])];
      break;
    case 'HIDE':
      s.revealed = (s.revealed || []).filter((id) => !(ev.seatIds || []).includes(id));
      break;
    case 'ANNOUNCE':
      s.announced = ev.winner || null;
      if (ev.winner) s.winner = ev.winner;
      pushMessages(s, ev, ev.messages, s.phase);
      break;
    default:
      break;
  }
  if (ev.log) s.log.push({ phase: { ...s.phase }, text: ev.log });
}

// ——— Spørringer brukt av natt/dag-logikken ———

export function getSeat(s, id) {
  return findSeat(s, id);
}

export function actingId(seat) {
  return seat.shownCharacterId && isDrunkLike(seat) ? seat.shownCharacterId : seat.characterId;
}

export function isDrunkLike(seat) {
  const info = charInfo(seat.characterId);
  return !!(info.def && info.def.drunkLike);
}

export function seatTeam(seat) {
  return charInfo(seat.characterId).team;
}

export function aliveSeats(s) {
  return s.seats.filter((x) => x.alive && seatTeam(x) !== 'traveller');
}

export function isPoisoned(s, seat) {
  return seat.reminders.some((r) => {
    if (r.kind !== 'poisoned') return false;
    if (!r.sourceSeatId) return true;
    const src = findSeat(s, r.sourceSeatId);
    return !!(src && src.alive);
  });
}

export function compromised(s, seat) {
  const drunk = isDrunkLike(seat) || seat.reminders.some((r) => r.kind === 'drunk');
  const poisoned = isPoisoned(s, seat);
  return { drunk, poisoned, any: drunk || poisoned };
}

export function seatIndex(s, id) {
  return s.seats.findIndex((x) => x.id === id);
}

// Nærmeste levende nabo på hver side (hopper over døde). Returnerer [venstre, høyre] (kan være like).
export function livingNeighbours(s, id) {
  const n = s.seats.length;
  const i = seatIndex(s, id);
  const find = (dir) => {
    for (let k = 1; k < n; k++) {
      const seat = s.seats[(i + dir * k + n * k) % n];
      if (seat.alive && seat.id !== id) return seat;
    }
    return null;
  };
  return [find(-1), find(1)];
}

export function seatsWithTeam(s, team) {
  return s.seats.filter((x) => seatTeam(x) === team);
}

export function redHerringSeat(s) {
  return s.seats.find((x) => x.reminders.some((r) => r.kind === 'redherring')) || null;
}

export function hasNoAbility(seat) {
  return seat.reminders.some((r) => r.kind === 'noability');
}
