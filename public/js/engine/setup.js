// Sammensetning, tilfeldig rollefordeling, setup-forslag og validering.

import { charInfo, teamAlignment } from './characters.js';
import { shuffle, pick } from './rng.js';
import { st } from './sttext.js';
import { msg, summary, TEAM_LABEL } from './text.js';

// [Regel] Anbefalt sammensetning for 5–15 spillere.
const TABLE = {
  5: [3, 0, 1, 1], 6: [3, 1, 1, 1], 7: [5, 0, 1, 1], 8: [5, 1, 1, 1], 9: [5, 2, 1, 1],
  10: [7, 0, 2, 1], 11: [7, 1, 2, 1], 12: [7, 2, 2, 1], 13: [9, 0, 3, 1], 14: [9, 1, 3, 1], 15: [9, 2, 3, 1],
};

export function baseComposition(n) {
  const k = Math.min(15, Math.max(5, n));
  const [townsfolk, outsider, minion, demon] = TABLE[k];
  const c = { townsfolk, outsider, minion, demon };
  // Utenfor 5–15: juster townsfolk slik at summen blir riktig.
  c.townsfolk += n - k;
  return c;
}

export function expectedComposition(n, characterIds) {
  const c = baseComposition(n);
  for (const id of characterIds) {
    const mod = charInfo(id).def && charInfo(id).def.setupModifier;
    if (mod) for (const [team, d] of Object.entries(mod)) c[team] = Math.max(0, (c[team] || 0) + d);
  }
  return c;
}

export function countTeams(characterIds) {
  const c = { townsfolk: 0, outsider: 0, minion: 0, demon: 0, traveller: 0 };
  for (const id of characterIds) if (id) c[charInfo(id).team] = (c[charInfo(id).team] || 0) + 1;
  return c;
}

export function tagAllows(tags, id) {
  if (!id || !tags || !tags.length) return true;
  const team = charInfo(id).team;
  if (tags.includes('noDemon') && team === 'demon') return false;
  if (tags.includes('noEvil') && (team === 'demon' || team === 'minion')) return false;
  if (tags.includes('simpleRole') && !(team === 'townsfolk' || (charInfo(id).def && charInfo(id).def.drunkLike))) return false;
  return true;
}

// seats: [{id, tags}] · locks: {seatId: characterId} · include: [ids] (må være med) · exclude: [ids]
export function randomizeRoles({ seats, script, locks = {}, include = [], exclude = [], lang = 'no' }) {
  const n = seats.length;
  const warnings = [];
  const pool = script.characters.filter((id) => !exclude.includes(id));
  const bag = [];
  const add = (id) => { if (id && !bag.includes(id)) bag.push(id); };
  Object.values(locks).forEach(add);
  include.forEach(add);

  const teamOf = (id) => charInfo(id).team;
  const fill = (team, want) => {
    const have = bag.filter((id) => teamOf(id) === team).length;
    const avail = shuffle(pool.filter((id) => teamOf(id) === team && !bag.includes(id)));
    const need = Math.max(0, want - have);
    avail.slice(0, need).forEach(add);
    if (avail.length < need) warnings.push(st(lang, 'rWarnFew', { team, have: have + avail.length, want }));
  };

  const base = baseComposition(n);
  fill('demon', base.demon);
  fill('minion', base.minion);
  const target = expectedComposition(n, bag);
  fill('outsider', target.outsider);
  fill('townsfolk', target.townsfolk);

  if (bag.length > n) warnings.push(st(lang, 'rWarnTooMany'));
  // Fyll opp hvis scriptet er for lite (sjelden)
  if (bag.length < n) shuffle(pool.filter((id) => !bag.includes(id))).slice(0, n - bag.length).forEach(add);

  // Fordel: låste først, deretter tilfeldig med hensyn til elevmerker.
  const assignment = {};
  const lockedChars = new Set();
  for (const seat of seats) {
    if (locks[seat.id]) { assignment[seat.id] = locks[seat.id]; lockedChars.add(locks[seat.id]); }
  }
  const freeSeats = seats.filter((x) => !locks[x.id]);
  const freeChars = shuffle(bag.filter((id) => !lockedChars.has(id))).slice(0, freeSeats.length);
  // Mest begrensede seter først
  const order = shuffle(freeSeats).sort((a, b) => (b.tags || []).length - (a.tags || []).length);
  const used = new Array(freeChars.length).fill(false);
  const result = {};
  let steps = 0;
  const dfs = (k) => {
    if (k === order.length) return true;
    if (++steps > 50000) return false;
    const seat = order[k];
    for (let i = 0; i < freeChars.length; i++) {
      if (used[i] || !tagAllows(seat.tags, freeChars[i])) continue;
      used[i] = true; result[seat.id] = freeChars[i];
      if (dfs(k + 1)) return true;
      used[i] = false; delete result[seat.id];
    }
    return false;
  };
  if (!dfs(0)) {
    warnings.push(st(lang, 'rWarnTags'));
    const rest = freeChars.slice();
    order.forEach((seat) => { result[seat.id] = rest.shift() || null; });
  }
  Object.assign(assignment, result);
  return { assignment, bag, warnings };
}

// Forslag til Drunk sin falske rolle: Townsfolk på scriptet som ikke er i spill.
export function suggestDrunkShown(script, inPlay, avoid = []) {
  const opts = script.characters.filter((id) => charInfo(id).team === 'townsfolk' && !inPlay.includes(id) && !avoid.includes(id));
  return pick(opts) || null;
}

// Demon bluffs: tre gode roller som ikke er i spill (Townsfolk foretrekkes), ikke Drunk sin falske rolle.
export function suggestBluffs(script, inPlay, avoid = []) {
  const notIn = (id) => !inPlay.includes(id) && !avoid.includes(id);
  const tf = shuffle(script.characters.filter((id) => charInfo(id).team === 'townsfolk' && notIn(id)));
  const out = shuffle(script.characters.filter((id) => charInfo(id).team === 'outsider' && notIn(id) && !(charInfo(id).def && charInfo(id).def.drunkLike)));
  return [...tf, ...out].slice(0, 3);
}

// Red herring: en god spiller, helst ikke Fortune Telleren selv.
export function suggestRedHerring(seats, ftSeatId) {
  const good = seats.filter((x) => x.characterId && teamAlignment(charInfo(x.characterId).team) === 'good');
  const others = good.filter((x) => x.id !== ftSeatId);
  const p = pick(others.length ? others : good);
  return p ? p.id : null;
}

function seatLabel(seat) {
  return seat.names.join(' + ');
}

// Validering før start. Returnerer [{level:'ok'|'warn'|'info', text}]
export function validateSetup({ seats, script, bluffs = [], lang = 'no' }) {
  const out = [];
  const n = seats.length;
  const ids = seats.map((x) => x.characterId).filter(Boolean);
  out.push({ level: n >= 5 && n <= 15 ? 'ok' : 'warn', code: 'vPlayers', text: st(lang, n >= 5 && n <= 15 ? 'vPlayers' : 'vPlayersRange', { n }) });

  const want = expectedComposition(n, ids);
  const have = countTeams(ids);
  let compOk = true;
  for (const team of ['townsfolk', 'outsider', 'minion', 'demon']) {
    const ok = have[team] === want[team];
    if (!ok) compOk = false;
    out.push({ level: ok ? 'ok' : 'warn', code: 'vTeam', text: st(lang, ok ? 'vTeamOk' : 'vTeam', { have: have[team], want: want[team], team: team.charAt(0).toUpperCase() + team.slice(1) }) });
  }
  if (!compOk) out.push({ level: 'warn', code: 'vComposition', text: st(lang, 'vComposition') });

  const seen = new Set();
  for (const seat of seats) {
    if (!seat.characterId) { out.push({ level: 'warn', code: 'vMissingChar', text: st(lang, 'vMissingChar', { name: seatLabel(seat) }) }); continue; }
    const info = charInfo(seat.characterId);
    if (seen.has(seat.characterId)) out.push({ level: 'warn', code: 'vDuplicate', text: st(lang, 'vDuplicate', { char: info.name }) });
    seen.add(seat.characterId);
    if (!script.characters.includes(seat.characterId)) out.push({ level: 'warn', code: 'vNotOnScript', text: st(lang, 'vNotOnScript', { char: info.name }) });
    for (const tag of seat.tags || []) {
      if (!tagAllows([tag], seat.characterId)) out.push({ level: 'warn', code: 'vTag', text: st(lang, 'vTag', { name: seatLabel(seat), tag: st(lang, 'tag' + tag), char: info.name }) });
    }
    if (!info.modeled) out.push({ level: 'info', code: 'vUnmodeled', text: st(lang, 'vUnmodeled', { char: info.name }) });
    else if (info.setup && !(info.def.setupModifier || info.def.setup)) out.push({ level: 'info', code: 'vSetupMod', text: st(lang, 'vSetupMod', { char: info.name }) });
    if (!info.modeled && info.setup) out.push({ level: 'warn', code: 'vSetupMod', text: st(lang, 'vSetupMod', { char: info.name }) });
    if (info.def && info.def.drunkLike) {
      if (!seat.shownCharacterId) out.push({ level: 'warn', code: 'vDrunkMissing', text: st(lang, 'vDrunkMissing') });
      else if (ids.includes(seat.shownCharacterId)) out.push({ level: 'warn', code: 'vDrunkInPlay', text: st(lang, 'vDrunkInPlay', { char: charInfo(seat.shownCharacterId).name }) });
    }
    const acting = info.def && info.def.drunkLike ? seat.shownCharacterId : seat.characterId;
    const aInfo = acting ? charInfo(acting) : null;
    if (aInfo && aInfo.def && aInfo.def.setup === 'redHerring') {
      const rh = seats.find((x) => (x.reminders || []).some((r) => r.kind === 'redherring'));
      if (!rh) out.push({ level: 'warn', code: 'vRedHerringMissing', text: st(lang, 'vRedHerringMissing') });
      else if (rh.characterId && teamAlignment(charInfo(rh.characterId).team) !== 'good') out.push({ level: 'warn', code: 'vRedHerringEvil', text: st(lang, 'vRedHerringEvil') });
    }
  }
  if (ids.some((id) => charInfo(id).team === 'demon')) {
    const b = bluffs.filter(Boolean);
    out.push({ level: b.length === 3 ? 'ok' : 'warn', code: 'vBluffs', text: st(lang, 'vBluffs', { n: b.length }) });
    for (const id of b) {
      if (ids.includes(id)) out.push({ level: 'warn', code: 'vBluffInPlay', text: st(lang, 'vBluffInPlay', { char: charInfo(id).name }) });
      if (teamAlignment(charInfo(id).team) !== 'good') out.push({ level: 'warn', code: 'vBluffEvil', text: st(lang, 'vBluffEvil', { char: charInfo(id).name }) });
    }
  }
  return out;
}

// Rollekort-meldinger til alle spillere (Drunk får sin falske rolle).
export function roleCardMessages(seats, lang, style) {
  return seats.map((seat) => {
    const info = charInfo(seat.characterId);
    const shownId = info.def && info.def.drunkLike && seat.shownCharacterId ? seat.shownCharacterId : seat.characterId;
    const shown = charInfo(shownId);
    return {
      kind: 'private',
      seatId: seat.id,
      tag: 'roleCard',
      text: msg(lang, style, 'roleCard', { char: shown.name, team: TEAM_LABEL[lang][shown.team] || shown.team, summary: summary(shownId, lang, shown) }),
    };
  });
}

