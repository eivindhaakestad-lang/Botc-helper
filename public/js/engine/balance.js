// Balansemåler for Storytelleren: en grov tommelfingerregel for hvilket lag som leder.
// 0 = de gode leder klart, 100 = de onde leder klart. Bare til Storytelleren.

import { seatTeam, compromised } from './state.js';
import { voteThreshold } from './day.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function balance(s, initial, infoStats = { info: 0, falseInfo: 0 }) {
  const players = s.seats.filter((x) => seatTeam(x) !== 'traveller');
  const alive = players.filter((x) => x.alive);
  const good = alive.filter((x) => x.alignment !== 'evil').length;
  const evil = alive.length - good;
  const startPlayers = (initial ? initial.seats : s.seats).filter((x) => seatTeam(x) !== 'traveller');
  const startEvil = startPlayers.filter((x) => x.alignment === 'evil').length / Math.max(1, startPlayers.length);
  const demons = players.filter((x) => seatTeam(x) === 'demon');
  const demonAlive = demons.some((x) => x.alive);
  const demonIds = new Set(demons.map((x) => x.id));
  const noms = s.nominations.filter((n) => demonIds.has(n.nomineeId));
  const maxVotes = noms.reduce((a, n) => Math.max(a, n.votes || 0), 0);
  const need = voteThreshold(s);

  let score = 50;
  const parts = {};
  parts.numbers = clamp(((evil / Math.max(1, alive.length)) - startEvil) * 150, -30, 30);
  // Få informasjoner sier lite: vektes opp etter hvert som flere har fått info
  parts.info = infoStats.info ? clamp(((infoStats.falseInfo / infoStats.info) - 0.25) * 60, -20, 20) * Math.min(1, infoStats.info / 5) : 0;
  parts.demon = !demonAlive ? -45 : noms.length ? (maxVotes >= need - 1 ? -15 : -7) : 0;
  parts.final = demonAlive && alive.length <= 4 ? 15 : 0;
  score += parts.numbers + parts.info + parts.demon + parts.final;
  score = Math.round(clamp(score, 5, 95));

  return {
    score,
    lean: score < 42 ? 'good' : score > 58 ? 'evil' : 'even',
    alive: alive.length, good, evil,
    info: infoStats.info, falseInfo: infoStats.falseInfo,
    demonAlive, demonNoms: noms.length, demonMaxVotes: maxVotes,
    daysToFinal: Math.max(0, Math.ceil((alive.length - 3) / 2)),
    poisoned: s.seats.filter((x) => x.alive && compromised(s, x).poisoned).map((x) => x.id),
    parts,
  };
}
