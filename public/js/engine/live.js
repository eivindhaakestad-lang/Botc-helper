// Hva som publiseres til live-rommet. Bare det elevene og storskjermen skal se:
// ingen roller (før spillet er slutt), ingen påminnelser, ingen notater.

import { charInfo } from './characters.js';
import { seatName, actingId } from './state.js';
import { msg, summary, TEAM_LABEL } from './text.js';
import { nominationsToday, onTheBlock, voteThreshold } from './day.js';

export function publicProjection(s, { dream = true, decoys = true, chat = 'day' } = {}) {
  const phaseMsgs = s.messages.filter((m) => m.kind === 'public' && m.phase && m.phase.type === s.phase.type && m.phase.number === s.phase.number);
  const ended = s.phase.type === 'ended';
  const out = {
    title: [s.meta.className, s.meta.groupName].filter(Boolean).join(' · '),
    lang: s.lang,
    phase: { type: s.phase.type, number: s.phase.number },
    seats: s.seats.map((x) => ({ id: x.id, names: x.names.slice(), alive: x.alive, ghostVote: x.ghostVote })),
    announcement: phaseMsgs.length ? phaseMsgs[phaseMsgs.length - 1].text : '',
    dream, decoys, chat,
    winner: s.winner || null,
  };
  if (s.phase.type === 'day') {
    // Nominasjoner og stemmetall er offentlige – alle ser dem ved bordet uansett.
    const block = onTheBlock(s);
    const ex = s.executions.filter((e) => e.day === s.phase.number).slice(-1)[0];
    out.day = {
      need: voteThreshold(s),
      nominations: nominationsToday(s).map((n) => ({ id: n.id, nominatorId: n.nominatorId, nomineeId: n.nomineeId, votes: n.votes, voters: n.voters.slice() })),
      block: block.nomination ? { nomineeId: block.nomination.nomineeId, votes: block.votes } : null,
      tie: !!block.tie,
      executed: ex ? ex.seatId || 'none' : null,
    };
  }
  if (ended) {
    // Grim reveal: bare navn til Storytelleren avslører rollene, og vinneren først når den er annonsert.
    const rev = new Set(s.revealed || []);
    out.announcement = '';
    out.winner = s.announced || null;
    out.reveal = s.seats.filter((x) => rev.has(x.id)).map((x) => {
      const info = charInfo(x.characterId);
      const shown = actingId(x) !== x.characterId ? charInfo(actingId(x)).name : null;
      return { seatId: x.id, character: info.name, team: info.team, alignment: x.alignment, shown };
    });
  }
  return out;
}

// Rollekortet hver elev ser (Drunk ser sin falske rolle). Oppdateres ved starpass o.l.
export function roleCardsFor(s) {
  const out = {};
  for (const seat of s.seats) {
    const shownId = actingId(seat);
    const info = charInfo(shownId);
    out[seat.id] = {
      character: info.name,
      team: info.team,
      text: msg(s.lang, s.style, 'roleCard', { char: info.name, team: (TEAM_LABEL[s.lang] || TEAM_LABEL.no)[info.team] || info.team, summary: summary(shownId, s.lang, info) }),
    };
  }
  return out;
}

export { seatName };
