// Dag: nominasjoner, stemmer, henrettelse, dagsevner og vinnersjekk.
// Alt returneres som forslag – Storytelleren bekrefter.

import { charInfo } from './characters.js';
import { st } from './sttext.js';
import { msg } from './text.js';
import { seatName, getSeat, seatTeam, compromised, aliveSeats, hasNoAbility } from './state.js';

const regs = (seat) => (charInfo(seat.characterId).def && charInfo(seat.characterId).def.registers) || [];

export function nominationsToday(s) {
  return s.nominations.filter((n) => n.day === s.phase.number);
}

export function voteThreshold(s) {
  return Math.ceil(aliveSeats(s).length / 2);
}

// Hvem er «på blokka»: flest stemmer ≥ terskel; uavgjort = ingen.
export function onTheBlock(s) {
  const need = voteThreshold(s);
  let best = null;
  let tie = false;
  for (const n of nominationsToday(s)) {
    if (n.votes < need) continue;
    if (!best || n.votes > best.votes) { best = n; tie = false; } else if (n.votes === best.votes) tie = true;
  }
  return { nomination: tie ? null : best, tie, need, votes: best ? best.votes : 0 };
}

// Hvor mange stemmer en nominasjon trenger, gitt de andre nominasjonene i dag.
// Er noen allerede på blokka med 4, gir 4 uavgjort (ingen dør) og 5 tar over blokka.
export function voteTarget(s, nominationId) {
  const threshold = voteThreshold(s);
  let top = 0;
  let holders = [];
  for (const n of nominationsToday(s)) {
    if (n.id === nominationId || n.votes < threshold) continue;
    if (n.votes > top) { top = n.votes; holders = [n.nomineeId]; } else if (n.votes === top) holders.push(n.nomineeId);
  }
  if (!top) return { threshold, need: threshold, tieAt: null, blockId: null };
  return { threshold, need: top + 1, tieAt: top, blockId: holders.length === 1 ? holders[0] : null };
}

export function nominationWarnings(s, nominatorId, nomineeId, lang) {
  const out = [];
  const today = nominationsToday(s);
  const nr = nominatorId && getSeat(s, nominatorId);
  const ne = nomineeId && getSeat(s, nomineeId);
  if (nr && !nr.alive) out.push(st(lang, 'dDeadNominator'));
  if (nr && today.some((n) => n.nominatorId === nominatorId)) out.push(st(lang, 'dAlreadyNominated', { name: seatName(nr) }));
  if (ne && today.some((n) => n.nomineeId === nomineeId)) out.push(st(lang, 'dAlreadyNominee', { name: seatName(ne) }));
  return out;
}

// Virgin: første nominasjon. Nominator er Townsfolk → henrettes umiddelbart.
export function virginCheck(s, nominatorId, nomineeId, lang) {
  const ne = getSeat(s, nomineeId);
  const nr = getSeat(s, nominatorId);
  if (!ne || !nr || ne.characterId !== 'virgin' || hasNoAbility(ne)) return null;
  const effects = [{ t: 'addReminder', seatId: ne.id, reminder: { kind: 'noability', label: 'No ability', sourceSeatId: ne.id } }];
  const works = !compromised(s, ne).any;
  const isTF = seatTeam(nr) === 'townsfolk';
  const spy = regs(nr).includes('townsfolk');
  return {
    effects,
    trigger: works && isTF,
    maybe: works && !isTF && spy,
    text: works && isTF ? st(lang, 'dVirgin', { name: seatName(nr) }) : spy && works ? st(lang, 'dVirginSpy') : null,
  };
}

export function voteWarnings(s, voters, lang) {
  const out = [];
  for (const id of voters) {
    const seat = getSeat(s, id);
    if (!seat) continue;
    if (!seat.alive && !seat.ghostVote) out.push(st(lang, 'dNoGhost', { name: seatName(seat) }));
    if (seat.characterId === 'butler' && !compromised(s, seat).any) {
      const master = s.seats.find((x) => x.reminders.some((r) => r.kind === 'master' && r.sourceSeatId === seat.id));
      if (master && !voters.includes(master.id)) out.push(st(lang, 'dButler', { name: seatName(seat) }));
    }
  }
  return out;
}

// Slayer: treffer Demon (eller kanskje Recluse).
export function slayerCheck(s, slayerId, targetId, lang) {
  const sl = getSeat(s, slayerId);
  const t = getSeat(s, targetId);
  if (!sl || !t) return null;
  const works = sl.characterId === 'slayer' && sl.alive && !hasNoAbility(sl) && !compromised(s, sl).any;
  const hit = works && t.alive && seatTeam(t) === 'demon';
  const maybe = works && t.alive && regs(t).includes('demon');
  return {
    hit, maybe,
    text: hit ? st(lang, 'dSlayerHit', { name: seatName(t) }) : maybe ? st(lang, 'dSlayerRecluse') : st(lang, 'dSlayerMiss'),
    effects: [{ t: 'addReminder', seatId: sl.id, reminder: { kind: 'noability', label: 'No ability', sourceSeatId: sl.id } }],
  };
}

// Etter dødsfall: Saint, Scarlet Woman og vinnersjekk.
// aliveBefore: antall levende før dødsfallene. killed: seatIds som døde.
export function postDeathChecks(s, killed, aliveBefore, cause, lang, style) {
  const out = [];
  for (const id of killed) {
    const seat = getSeat(s, id);
    if (!seat) continue;
    if (cause === 'execution' && seat.characterId === 'saint' && !compromised(s, seat).any) {
      out.push({ type: 'win', winner: 'evil', text: st(lang, 'dSaint') });
    }
    if (seatTeam(seat) === 'demon' && cause !== 'starpass') {
      const swAny = s.seats.find((x) => x.alive && x.characterId === 'scarletwoman');
      const sw = swAny && !compromised(s, swAny).any ? swAny : null;
      if (swAny && !sw && aliveBefore >= 5) out.push({ type: 'info', text: st(lang, 'dSWCompromised', { name: seatName(swAny) }) });
      if (sw && aliveBefore >= 5) {
        out.push({
          type: 'sw', seatId: sw.id,
          text: st(lang, 'dSW', { n: aliveBefore, name: seatName(sw) }),
          effects: [{ t: 'setCharacter', seatId: sw.id, characterId: seat.characterId, from: 'scarletwoman', tellAtNight: true }],
          messages: [],
        });
      }
    }
  }
  if (!out.some((x) => x.type === 'sw')) {
    const w = checkWin(s, lang);
    if (w && !out.some((x) => x.type === 'win')) out.push(w);
  }
  return out;
}

export function checkWin(s, lang) {
  const alive = aliveSeats(s);
  const demonsAlive = s.seats.filter((x) => x.alive && seatTeam(x) === 'demon');
  if (!demonsAlive.length) return { type: 'win', winner: 'good', text: st(lang, 'dGoodWins') };
  if (alive.length <= 2) return { type: 'win', winner: 'evil', text: st(lang, 'dEvilWins') };
  return null;
}

// Ved slutten av dagen: Mayor-seier hvis tre lever og ingen ble henrettet.
export function mayorCheck(s, lang) {
  const alive = aliveSeats(s);
  const executedToday = s.executions.some((e) => e.day === s.phase.number && e.seatId);
  const mayor = s.seats.find((x) => x.alive && x.characterId === 'mayor' && !compromised(s, x).any);
  if (mayor && alive.length === 3 && !executedToday) return { type: 'win', winner: 'good', text: st(lang, 'dMayorWin') };
  return null;
}

export function dawnMessage(s, lang, style) {
  const dead = s.deaths.filter((d) => d.phase.type === 'night' && d.phase.number === s.phase.number && !d.revived).map((d) => seatName(getSeat(s, d.seatId)));
  return { kind: 'public', text: dead.length ? msg(lang, style, 'dawnDeaths', { names: dead }) : msg(lang, style, 'dawnNone') };
}
