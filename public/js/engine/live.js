// Hva som publiseres til live-rommet. Bare det elevene og storskjermen skal se:
// ingen roller (før spillet er slutt), ingen påminnelser, ingen notater.

import { charInfo } from './characters.js';
import { seatName, actingId } from './state.js';
import { msg, summary, TEAM_LABEL } from './text.js';
import { nominationsToday, onTheBlock, voteThreshold } from './day.js';
import { tipFor } from './tips.js';

export function publicProjection(s, { dream = true, decoys = true, chat = 'always', rolesOut = false, nomProps = true, weather = true } = {}) {
  const phaseMsgs = s.messages.filter((m) => m.kind === 'public' && m.phase && m.phase.type === s.phase.type && m.phase.number === s.phase.number);
  const ended = s.phase.type === 'ended';
  const out = {
    title: [s.meta.className, s.meta.groupName].filter(Boolean).join(' · '),
    lang: s.lang,
    phase: { type: s.phase.type, number: s.phase.number },
    // Travellers er offentlige: alle vet hvem som er Beggar, Thief osv. (men ikke hvilket lag de er på).
    seats: s.seats.map((x) => {
      const info = charInfo(x.characterId);
      const o = { id: x.id, names: x.names.slice(), alive: x.alive, ghostVote: x.ghostVote };
      if (info.team === 'traveller') o.traveller = { name: info.name, icon: info.icon };
      return o;
    }),
    announcement: phaseMsgs.length ? phaseMsgs[phaseMsgs.length - 1].text : '',
    dawnPending: false,
    dream, decoys, chat, nomProps: nomProps !== false, weather: weather !== false,
    // Scriptet er offentlig: alle roller med beskrivelse, sortert etter team.
    script: {
      name: s.script.name || '',
      roles: [...new Set([...s.script.characters, ...s.seats.map((x) => x.characterId).filter((id) => charInfo(id).team === 'traveller')])]
        .map((id) => { const info = charInfo(id); return { id, name: info.name, team: info.team, icon: info.icon, text: summary(id, s.lang, info) }; })
        .filter((r) => ['townsfolk', 'outsider', 'minion', 'demon', 'traveller'].includes(r.team)),
    },
    // Rollene deles ut når Storytelleren trykker «Send ut roller», og alltid når spillet er i gang.
    rolesOut: !!rolesOut || s.phase.type !== 'setup',
    winner: s.winner || null,
  };
  // Nattens dødsfall er hemmelige til Storytelleren kunngjør dem om morgenen:
  // om natten og på dagen før «Kunngjør natten» vises de som levende.
  const hideNight = s.phase.type === 'night' || (s.phase.type === 'day' && s.dawnHidden);
  if (hideNight) {
    const tonight = new Set(s.deaths.filter((d) => !d.revived && d.phase && d.phase.type === 'night' && d.phase.number === s.phase.number).map((d) => d.seatId));
    out.seats = out.seats.map((x) => (tonight.has(x.id) ? { ...x, alive: true, ghostVote: true } : x));
  }
  if (s.phase.type === 'day' && s.dawnHidden) {
    out.announcement = '';
    out.dawnPending = true;
  }
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
      shots: (s.shots || []).filter((x) => x.day === s.phase.number).map((x) => ({ id: x.id, from: x.from, to: x.to, hit: x.hit })),
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
      return { seatId: x.id, character: info.name, team: info.team, alignment: x.alignment, shown, icon: info.icon };
    });
  }
  return out;
}

// Rollekortet hver elev ser (Drunk ser sin falske rolle). Oppdateres ved starpass o.l.
export function roleCardsFor(s) {
  const out = {};
  for (const seat of s.seats) {
    // Har eleven fått en ny rolle som ikke er fortalt ennå, vises den gamle rollen.
    const shownId = seat.newRole && !seat.newRole.told && seat.newRole.from ? seat.newRole.from : actingId(seat);
    const info = charInfo(shownId);
    const labels = TEAM_LABEL[s.lang] || TEAM_LABEL.no;
    // En Traveller får vite hvilket lag de er på.
    const team = info.team === 'traveller' ? `${labels.traveller} – ${s.lang === 'en' ? (seat.alignment === 'evil' ? 'evil' : 'good') : (seat.alignment === 'evil' ? 'ond' : 'god')}` : labels[info.team] || info.team;
    out[seat.id] = {
      character: info.name,
      team: info.team,
      icon: info.icon,
      // Vekkes rollen av Storytelleren om natten? (brukes til å gi færre tomme «falske» meldinger)
      wakes: info.def ? !!(info.def.first || info.def.other) || info.team === 'minion' || info.team === 'demon' : true,
      text: msg(s.lang, s.style, 'roleCard', { char: info.name, team, summary: summary(shownId, s.lang, info) }),
      tip: tipFor(shownId, s.lang),
    };
  }
  return out;
}

export { seatName };
