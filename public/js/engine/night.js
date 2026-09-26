// Nattassistent: bygger nattkøen fra tilstanden og lager modell (felt, hint, varsler),
// forslag (sann/falsk info) og resultat (meldinger + effekter) for hvert steg.
// Motoren bestemmer aldri selv – den foreslår, og Storytelleren bekrefter.

import { charInfo, nightOrder } from './characters.js';
import { st } from './sttext.js';
import { msg, TEAM_PLURAL } from './text.js';
import { pick, shuffle } from './rng.js';
import {
  seatName, getSeat, actingId, seatTeam, compromised, livingNeighbours, redHerringSeat, seatIndex,
} from './state.js';

const CONDITIONS = {
  executedToday: (s) => !!executedYesterday(s),
  diedTonight: (s, seat) => s.deaths.some((d) => d.seatId === seat.id && d.phase.type === 'night' && d.phase.number === s.phase.number && !d.revived),
  notNewDemon: (s, seat) => !(seat.characterSince && seat.characterSince.type === 'night' && seat.characterSince.number === s.phase.number),
};

export function executedYesterday(s) {
  const e = s.executions.filter((x) => x.day === s.phase.number - 1 && x.died && x.seatId);
  return e.length ? getSeat(s, e[e.length - 1].seatId) : null;
}

function statusOf(s, key, autoSkip) {
  const p = s.progress[key];
  if (p && p.status !== 'pending') return p.status;
  return autoSkip ? 'auto' : 'pending';
}

export function nightQueue(s) {
  if (s.phase.type !== 'night') return [];
  const n = s.phase.number;
  const first = n === 1;
  const acting = [...new Set(s.seats.map(actingId).filter(Boolean))];
  const order = nightOrder(first, acting);
  const minions = s.seats.filter((x) => seatTeam(x) === 'minion');
  const demons = s.seats.filter((x) => seatTeam(x) === 'demon');
  const steps = [];
  for (const id of order) {
    if (id === 'minioninfo' || id === 'demoninfo') {
      if (!first || s.seats.length < 7 || !demons.length) continue;
      if (id === 'minioninfo' && !minions.length) continue;
      const key = `n${n}:${id}`;
      steps.push({ key, kind: id, characterId: id, seatId: null, seatIds: (id === 'minioninfo' ? minions : demons).map((x) => x.id), def: {}, autoSkip: false });
      continue;
    }
    for (const seat of s.seats) {
      if (actingId(seat) !== id) continue;
      // Ny rolle (Scarlet Woman ble Demon i dag): fortell det rett før rollens første steg i natt.
      const nr = seat.newRole;
      if (nr && seat.alive && (!nr.told || nr.toldNight === n) && !steps.some((x) => x.kind === 'newRole' && x.seatId === seat.id)) {
        steps.push({ key: `n${n}:newrole:${seat.id}`, kind: 'newRole', characterId: nr.from || seat.characterId, seatId: seat.id, def: {}, autoSkip: false });
      }
      const info = charInfo(id);
      let nd = info.def ? (first ? info.def.first : info.def.other) : { kind: 'manual' };
      if (!nd) continue;
      if (nd.when && CONDITIONS[nd.when] && !CONDITIONS[nd.when](s, seat)) continue;
      const autoSkip = !seat.alive && !nd.whenDead;
      steps.push({ key: `n${n}:${id}:${seat.id}`, kind: nd.kind, characterId: id, seatId: seat.id, def: nd, autoSkip });
    }
  }
  for (const seat of s.seats) {
    const nr = seat.newRole;
    if (nr && seat.alive && (!nr.told || nr.toldNight === n) && !steps.some((x) => x.kind === 'newRole' && x.seatId === seat.id)) {
      steps.push({ key: `n${n}:newrole:${seat.id}`, kind: 'newRole', characterId: nr.from || seat.characterId, seatId: seat.id, def: {}, autoSkip: false });
    }
  }
  steps.forEach((x, i) => { x.index = i; x.status = statusOf(s, x.key, x.autoSkip); });
  return steps;
}

// ——— hjelpere ———
const nm = (s, id) => seatName(getSeat(s, id));
const cname = (id) => (id ? charInfo(id).name : '?');
const others = (s, selfId) => s.seats.filter((x) => x.id !== selfId);
const scriptTeam = (s, team) => s.script.characters.filter((id) => charInfo(id).team === team);
const inPlayTeam = (s, team) => s.seats.filter((x) => seatTeam(x) === team);
const hasChar = (s, id) => s.seats.some((x) => x.characterId === id);
const isEvil = (seat) => seat.alignment === 'evil';
const regs = (seat) => (charInfo(seat.characterId).def && charInfo(seat.characterId).def.registers) || [];
const uniq = (a) => [...new Set(a.filter(Boolean))];
const allScriptChars = (s) => uniq([...s.script.characters, ...s.seats.map((x) => x.characterId)]);

function evilModes(seat) {
  const r = regs(seat);
  const t = isEvil(seat);
  const canGood = t && r.includes('good');
  const canEvil = !t && r.includes('evil');
  return { t, min: canGood ? false : t, max: canEvil ? true : t };
}

function sortBySeat(s, ids) {
  return ids.slice().sort((a, b) => seatIndex(s, a) - seatIndex(s, b));
}

function otherNumber(trueN, max) {
  const opts = [];
  for (let i = 0; i <= max; i++) if (i !== trueN) opts.push(i);
  return pick(opts);
}

function falseChar(s, trueId) {
  return pick(allScriptChars(s).filter((id) => id !== trueId && charInfo(id).team !== 'traveller'));
}

// ——— stegtyper ———
const KINDS = {
  pingPair: {
    info: true,
    suggest(s, step, falseInfo) {
      const self = step.seatId;
      const team = step.def.team;
      if (!falseInfo) {
        const cands = inPlayTeam(s, team).filter((x) => x.id !== self);
        if (cands.length) {
          const c = pick(cands);
          const b = pick(others(s, self).filter((x) => x.id !== c.id));
          return { character: c.characterId, a: c.id, b: b && b.id };
        }
        if (step.def.allowNone) return { character: '__none' };
      }
      const [a, b] = shuffle(others(s, self));
      return { character: pick(scriptTeam(s, team)), a: a && a.id, b: b && b.id };
    },
    model(s, step, input, lang, m) {
      const team = step.def.team;
      const opts = uniq([...scriptTeam(s, team), ...inPlayTeam(s, team).map((x) => x.characterId)]);
      m.fields.push({ name: 'character', type: 'character', label: st(lang, 'fCharacter'), options: opts, none: step.def.allowNone ? st(lang, 'fNone', { team: TEAM_PLURAL[lang][team] }) : null });
      if (input.character !== '__none') {
        m.fields.push({ name: 'a', type: 'player', label: st(lang, 'fPlayerA') });
        m.fields.push({ name: 'b', type: 'player', label: st(lang, 'fPlayerB') });
      }
      const inPlay = inPlayTeam(s, team);
      m.hints.push(inPlay.length
        ? st(lang, 'hInPlay', { list: inPlay.map((x) => `${cname(x.characterId)} – ${seatName(x)}`).join(', ') })
        : st(lang, 'hNoneInPlay', { team: TEAM_PLURAL[lang][team] }));
      if ((team === 'townsfolk' || team === 'outsider') && hasChar(s, 'spy')) m.hints.push(st(lang, 'hSpyMay'));
      if (team === 'minion' && hasChar(s, 'recluse')) m.hints.push(st(lang, 'hRecluseMay'));
      if (input.character === '__none') m.truth = inPlay.length === 0;
      else if (input.character && input.a) {
        const a = getSeat(s, input.a);
        const b = input.b ? getSeat(s, input.b) : null;
        m.truth = !!((a && a.characterId === input.character) || (b && b.characterId === input.character));
      }
      if (input.a && input.a === input.b) m.warnings.push('⚠ A = B');
      if (input.a === step.seatId || input.b === step.seatId) m.warnings.push(st(lang, 'hTargetSelf'));
    },
    resolve(s, step, input, lang, style) {
      const team = step.def.team;
      if (input.character === '__none') return { messages: [{ seatId: step.seatId, text: msg(lang, style, 'pingNone', { teamPlural: TEAM_PLURAL[lang][team] }) }] };
      if (!input.character || !input.a || !input.b) return { incomplete: true };
      const [x, y] = sortBySeat(s, [input.a, input.b]);
      return { messages: [{ seatId: step.seatId, text: msg(lang, style, 'ping', { a: nm(s, x), b: nm(s, y), char: cname(input.character) }) }] };
    },
  },

  chef: {
    info: true,
    calc(s) {
      const n = s.seats.length;
      const count = (mode) => {
        let c = 0;
        for (let i = 0; i < n; i++) if (evilModes(s.seats[i])[mode] && evilModes(s.seats[(i + 1) % n])[mode]) c++;
        return c;
      };
      return { n: count('t'), min: count('min'), max: count('max') };
    },
    suggest(s, step, falseInfo) {
      const c = KINDS.chef.calc(s);
      return { n: falseInfo ? otherNumber(c.n, Math.max(2, c.n + 1)) : c.n };
    },
    model(s, step, input, lang, m) {
      const c = KINDS.chef.calc(s);
      m.fields.push({ name: 'n', type: 'number', label: st(lang, 'fNumber'), min: 0, max: Math.max(3, s.seats.length) });
      m.hints.push(st(lang, 'hRange', c));
      if (input.n !== undefined && input.n !== null) m.truth = input.n >= c.min && input.n <= c.max;
    },
    resolve(s, step, input, lang, style) {
      if (input.n === undefined || input.n === null || input.n === '') return { incomplete: true };
      return { messages: [{ seatId: step.seatId, text: msg(lang, style, 'chef', { n: input.n }) }] };
    },
  },

  empath: {
    info: true,
    calc(s, step) {
      const nb = uniq(livingNeighbours(s, step.seatId).map((x) => x && x.id)).map((id) => getSeat(s, id));
      const count = (mode) => nb.filter((x) => evilModes(x)[mode]).length;
      return { nb, n: count('t'), min: count('min'), max: count('max') };
    },
    suggest(s, step, falseInfo) {
      const c = KINDS.empath.calc(s, step);
      return { n: falseInfo ? otherNumber(c.n, Math.max(1, c.nb.length)) : c.n };
    },
    model(s, step, input, lang, m) {
      const c = KINDS.empath.calc(s, step);
      m.fields.push({ name: 'n', type: 'number', label: st(lang, 'fNumber'), min: 0, max: 2 });
      if (c.nb.length) m.hints.push(st(lang, 'hNeighbours', { a: seatName(c.nb[0]), b: seatName(c.nb[c.nb.length - 1]) }));
      m.hints.push(st(lang, 'hRange', c));
      if (input.n !== undefined && input.n !== null) m.truth = input.n >= c.min && input.n <= c.max;
    },
    resolve(s, step, input, lang, style) {
      if (input.n === undefined || input.n === null || input.n === '') return { incomplete: true };
      return { messages: [{ seatId: step.seatId, text: msg(lang, style, 'empath', { n: input.n }) }] };
    },
  },

  fortune: {
    info: true,
    truth(s, input) {
      const picks = [input.p1, input.p2].filter(Boolean).map((id) => getSeat(s, id));
      const rh = redHerringSeat(s);
      if (picks.some((x) => seatTeam(x) === 'demon')) return { yes: true, why: 'whyDemon' };
      if (rh && picks.some((x) => x.id === rh.id)) return { yes: true, why: 'whyRedHerring' };
      if (picks.some((x) => regs(x).includes('demon'))) return { yes: false, why: 'whyRecluse', maybe: true };
      return { yes: false };
    },
    suggest() { return { p1: null, p2: null, answer: null }; },
    derive(s, step, input, touched, comp) {
      if (!touched.answer && input.p1 && input.p2) {
        const t = KINDS.fortune.truth(s, input);
        return { ...input, answer: comp.any ? !t.yes : t.yes };
      }
      return input;
    },
    model(s, step, input, lang, m) {
      m.fields.push({ name: 'p1', type: 'player', label: st(lang, 'fPick1') });
      m.fields.push({ name: 'p2', type: 'player', label: st(lang, 'fPick2') });
      m.fields.push({ name: 'answer', type: 'yesno', label: st(lang, 'fAnswer') });
      const rh = redHerringSeat(s);
      if (rh) m.hints.push(`Red herring: ${seatName(rh)}`);
      if (input.p1 && input.p2) {
        const t = KINDS.fortune.truth(s, input);
        m.hints.push(st(lang, 'hFortuneTrue', { yes: t.yes, why: t.why ? st(lang, t.why) : '' }));
        if (input.answer !== null && input.answer !== undefined) m.truth = input.answer === t.yes || !!t.maybe;
      }
    },
    resolve(s, step, input, lang, style) {
      if (!input.p1 || !input.p2 || input.answer === null || input.answer === undefined) return { incomplete: true };
      return { messages: [{ seatId: step.seatId, text: msg(lang, style, 'fortune', { a: nm(s, input.p1), b: nm(s, input.p2), yes: !!input.answer }) }] };
    },
  },

  poison: {
    effect: true,
    suggest() { return { target: null, ack: false }; },
    model(s, step, input, lang, m) {
      m.fields.push({ name: 'target', type: 'player', label: st(lang, 'fTarget') });
      m.fields.push({ name: 'ack', type: 'toggle', label: st(lang, 'fAck') });
      if (input.target) m.effects.push(st(lang, 'effPoison', { name: nm(s, input.target) }));
    },
    resolve(s, step, input, lang, style, comp) {
      if (!input.target) return { incomplete: true };
      const effects = comp.any ? [] : [
        { t: 'removeReminder', kind: 'poisoned', sourceSeatId: step.seatId },
        { t: 'addReminder', seatId: input.target, reminder: { kind: 'poisoned', label: 'Poisoned', sourceSeatId: step.seatId, expires: 'dusk' } },
      ];
      const messages = input.ack ? [{ seatId: step.seatId, text: msg(lang, style, 'ackPoison', { a: nm(s, input.target) }) }] : [];
      return { effects, messages };
    },
  },

  protect: {
    effect: true,
    suggest() { return { target: null, ack: false }; },
    model(s, step, input, lang, m) {
      m.fields.push({ name: 'target', type: 'player', label: st(lang, 'fTarget') });
      m.fields.push({ name: 'ack', type: 'toggle', label: st(lang, 'fAck') });
      if (input.target) m.effects.push(st(lang, 'effProtect', { name: nm(s, input.target) }));
      if (input.target === step.seatId) m.warnings.push(st(lang, 'hTargetSelf'));
    },
    resolve(s, step, input, lang, style) {
      if (!input.target) return { incomplete: true };
      const effects = [{ t: 'addReminder', seatId: input.target, reminder: { kind: 'safe', label: 'Safe', sourceSeatId: step.seatId, expires: 'dawn' } }];
      const messages = input.ack ? [{ seatId: step.seatId, text: msg(lang, style, 'ackProtect', { a: nm(s, input.target) }) }] : [];
      return { effects, messages };
    },
  },

  master: {
    effect: true,
    suggest() { return { target: null, ack: false }; },
    model(s, step, input, lang, m) {
      m.fields.push({ name: 'target', type: 'player', label: st(lang, 'fTarget') });
      m.fields.push({ name: 'ack', type: 'toggle', label: st(lang, 'fAck') });
      if (input.target) m.effects.push(st(lang, 'effMaster', { name: nm(s, input.target) }));
      if (input.target === step.seatId) m.warnings.push(st(lang, 'hTargetSelf'));
    },
    resolve(s, step, input, lang, style) {
      if (!input.target) return { incomplete: true };
      const effects = [
        { t: 'removeReminder', kind: 'master', sourceSeatId: step.seatId },
        { t: 'addReminder', seatId: input.target, reminder: { kind: 'master', label: 'Master', sourceSeatId: step.seatId } },
      ];
      const messages = input.ack ? [{ seatId: step.seatId, text: msg(lang, style, 'ackMaster', { a: nm(s, input.target) }) }] : [];
      return { effects, messages };
    },
  },

  demonKill: {
    effect: true,
    analyse(s, step, targetId, comp) {
      if (!targetId) return null;
      if (comp.any) return { outcome: 'none', why: 'whyImpCompromised' };
      if (targetId === step.seatId) return { outcome: 'starpass' };
      const t = getSeat(s, targetId);
      if (!t.alive) return { outcome: 'none', why: 'whyAlreadyDead' };
      const safe = t.reminders.some((r) => r.kind === 'safe' && (!r.sourceSeatId || !compromised(s, getSeat(s, r.sourceSeatId)).any));
      if (safe) return { outcome: 'none', why: 'whySafe' };
      const tc = compromised(s, t).any;
      if (t.characterId === 'soldier' && !tc) return { outcome: 'none', why: 'whySoldier' };
      if (t.characterId === 'mayor' && !tc) return { outcome: 'dies', mayor: true };
      return { outcome: 'dies' };
    },
    defaultNewImp(s, step) {
      const minions = s.seats.filter((x) => x.alive && seatTeam(x) === 'minion');
      const sw = minions.find((x) => x.characterId === 'scarletwoman');
      return (sw || pick(minions) || {}).id || null;
    },
    suggest() { return { target: null, outcome: null, other: null, newImp: null, ack: false }; },
    derive(s, step, input, touched, comp) {
      const out = { ...input };
      if (!touched.outcome && input.target) {
        const a = KINDS.demonKill.analyse(s, step, input.target, comp);
        if (a) out.outcome = a.outcome;
      }
      if (out.outcome === 'starpass' && !out.newImp) out.newImp = KINDS.demonKill.defaultNewImp(s, step);
      return out;
    },
    model(s, step, input, lang, m, comp) {
      m.fields.push({ name: 'target', type: 'player', label: st(lang, 'fTarget') });
      const tn = input.target ? nm(s, input.target) : '…';
      m.fields.push({ name: 'outcome', type: 'choice', label: st(lang, 'fOutcome'), options: [
        { value: 'dies', label: st(lang, 'oDies', { name: tn }) },
        { value: 'none', label: st(lang, 'oNone') },
        { value: 'other', label: st(lang, 'oOther') },
        { value: 'starpass', label: st(lang, 'oStarpass') },
      ] });
      if (input.outcome === 'other') m.fields.push({ name: 'other', type: 'player', label: st(lang, 'fOther') });
      if (input.outcome === 'starpass') m.fields.push({ name: 'newImp', type: 'player', label: st(lang, 'fNewImp'), filter: 'aliveMinions' });
      m.fields.push({ name: 'ack', type: 'toggle', label: st(lang, 'fAck') });
      const a = KINDS.demonKill.analyse(s, step, input.target, comp);
      if (a) {
        if (a.outcome === 'none' && a.why) m.hints.push(st(lang, 'hNoDeath', { why: st(lang, a.why) }));
        if (a.outcome === 'starpass') m.hints.push(st(lang, 'hStarpass'));
        if (a.mayor) m.hints.push(st(lang, 'hMayor'));
        if (input.outcome) m.truth = input.outcome === a.outcome || (a.mayor && input.outcome === 'other');
      }
      if (input.outcome === 'dies' && input.target) m.effects.push(st(lang, 'effDies', { name: nm(s, input.target) }));
      if (input.outcome === 'other' && input.other) m.effects.push(st(lang, 'effDies', { name: nm(s, input.other) }));
      if (input.outcome === 'starpass') {
        m.effects.push(st(lang, 'effDies', { name: nm(s, step.seatId) }));
        if (input.newImp) m.effects.push(st(lang, 'effNewImp', { name: nm(s, input.newImp) }));
      }
      if (input.target && !getSeat(s, input.target).alive) m.warnings.push(st(lang, 'hTargetDead'));
    },
    resolve(s, step, input, lang, style) {
      if (!input.target || !input.outcome) return { incomplete: true };
      const effects = [];
      const messages = [];
      if (input.outcome === 'dies') effects.push({ t: 'kill', seatId: input.target, cause: 'demon' });
      if (input.outcome === 'other') {
        if (!input.other) return { incomplete: true };
        effects.push({ t: 'kill', seatId: input.other, cause: 'demon' });
      }
      if (input.outcome === 'starpass') {
        if (!input.newImp) return { incomplete: true };
        effects.push({ t: 'kill', seatId: step.seatId, cause: 'starpass' });
        effects.push({ t: 'setCharacter', seatId: input.newImp, characterId: step.characterId });
        messages.push({ seatId: input.newImp, text: msg(lang, style, 'becameDemon', { char: cname(step.characterId) }) });
      }
      if (input.ack) messages.unshift({ seatId: step.seatId, text: msg(lang, style, 'ackKill', { a: nm(s, input.target) }) });
      return { effects, messages };
    },
  },

  ravenkeeper: {
    info: true,
    suggest() { return { target: null, character: null }; },
    derive(s, step, input, touched, comp) {
      if (!touched.character && input.target) {
        const t = getSeat(s, input.target);
        return { ...input, character: comp.any ? falseChar(s, t.characterId) : t.characterId };
      }
      return input;
    },
    model(s, step, input, lang, m) {
      m.fields.push({ name: 'target', type: 'player', label: st(lang, 'fTarget') });
      m.fields.push({ name: 'character', type: 'character', label: st(lang, 'fCharacter'), options: allScriptChars(s) });
      if (input.target) {
        const t = getSeat(s, input.target);
        m.hints.push(st(lang, 'hTrueChar', { char: cname(t.characterId) }));
        if (regs(t).length) m.hints.push(st(lang, 'hRegisters', { char: cname(t.characterId) }));
        if (input.character) m.truth = input.character === t.characterId || regs(t).length > 0;
      }
    },
    resolve(s, step, input, lang, style) {
      if (!input.target || !input.character) return { incomplete: true };
      return { messages: [{ seatId: step.seatId, text: msg(lang, style, 'ravenkeeper', { a: nm(s, input.target), char: cname(input.character) }) }] };
    },
  },

  undertaker: {
    info: true,
    suggest(s, step, falseInfo) {
      const ex = executedYesterday(s);
      if (!ex) return { character: null };
      return { character: falseInfo ? falseChar(s, ex.characterId) : ex.characterId };
    },
    model(s, step, input, lang, m) {
      const ex = executedYesterday(s);
      if (!ex) { m.hints.push(st(lang, 'hNoExecution')); return; }
      m.fields.push({ name: 'character', type: 'character', label: `${st(lang, 'fCharacter')} – ${seatName(ex)}`, options: allScriptChars(s) });
      m.hints.push(st(lang, 'hTrueChar', { char: cname(ex.characterId) }));
      if (regs(ex).length) m.hints.push(st(lang, 'hRegisters', { char: cname(ex.characterId) }));
      if (input.character) m.truth = input.character === ex.characterId || regs(ex).length > 0;
    },
    resolve(s, step, input, lang, style) {
      const ex = executedYesterday(s);
      if (!ex || !input.character) return { incomplete: true };
      return { messages: [{ seatId: step.seatId, text: msg(lang, style, 'undertaker', { a: seatName(ex), char: cname(input.character) }) }] };
    },
  },

  grimoire: {
    info: true,
    listing(s, lang) {
      return s.seats.map((x, i) => {
        const drunkShown = x.shownCharacterId && x.shownCharacterId !== x.characterId ? ` (${lang === 'no' ? 'tror' : 'thinks'}: ${cname(x.shownCharacterId)})` : '';
        const rem = x.reminders.filter((r) => r.label).map((r) => r.label);
        return `${i + 1}. ${seatName(x)} – ${cname(x.characterId)}${drunkShown}${x.alive ? '' : ' †'}${rem.length ? ' [' + rem.join(', ') + ']' : ''}`;
      }).join('\n');
    },
    suggest() { return {}; },
    model() {},
    resolve(s, step, input, lang, style) {
      return { messages: [{ seatId: step.seatId, text: msg(lang, style, 'grimoire', { list: KINDS.grimoire.listing(s, lang) }) }] };
    },
  },

  minioninfo: {
    suggest() { return {}; },
    model(s, step, input, lang, m) {
      m.title = st(lang, 'minionInfoTitle');
      m.instruction = st(lang, 'minionInfoDo');
    },
    resolve(s, step, input, lang, style) {
      const demons = s.seats.filter((x) => seatTeam(x) === 'demon');
      const minions = s.seats.filter((x) => seatTeam(x) === 'minion');
      return {
        messages: minions.map((mn) => ({
          seatId: mn.id,
          text: msg(lang, style, 'minionInfo', { demon: demons.map(seatName).join(' / '), others: minions.filter((o) => o.id !== mn.id).map(seatName) }),
        })),
      };
    },
  },

  demoninfo: {
    suggest(s) { return { bluffs: (s.bluffs || []).slice(0, 3) }; },
    model(s, step, input, lang, m) {
      m.title = st(lang, 'demonInfoTitle');
      m.instruction = st(lang, 'demonInfoDo');
      const good = s.script.characters.filter((id) => ['townsfolk', 'outsider'].includes(charInfo(id).team));
      m.fields.push({ name: 'bluffs', type: 'bluffs', label: st(lang, 'fBluffs'), options: good });
      const inPlay = s.seats.map((x) => x.characterId);
      (input.bluffs || []).forEach((id) => { if (inPlay.includes(id)) m.warnings.push(st(lang, 'vBluffInPlay', { char: cname(id) })); });
    },
    resolve(s, step, input, lang, style) {
      const bluffs = (input.bluffs || []).filter(Boolean);
      const demons = s.seats.filter((x) => seatTeam(x) === 'demon');
      const minions = s.seats.filter((x) => seatTeam(x) === 'minion');
      return {
        effects: [{ t: 'setBluffs', bluffs }],
        messages: demons.map((d) => ({ seatId: d.id, text: msg(lang, style, 'demonInfo', { minions: minions.map(seatName), bluffs: bluffs.map(cname) }) })),
      };
    },
  },

  newRole: {
    suggest() { return {}; },
    model(s, step, input, lang, m) {
      const seat = getSeat(s, step.seatId);
      const from = seat.newRole && seat.newRole.from ? cname(seat.newRole.from) : '?';
      m.title = `${from} → ${cname(seat.characterId)}`;
      m.instruction = st(lang, 'newRoleDo', { name: seatName(seat), from, char: cname(seat.characterId) });
    },
    resolve(s, step, input, lang, style) {
      const seat = getSeat(s, step.seatId);
      const info = charInfo(seat.characterId);
      const text = info.team === 'demon' ? msg(lang, style, 'becameDemon', { char: info.name }) : msg(lang, style, 'becameDemon', { char: info.name }).replace(/^🔥[^.]*\./, `🎭 ${info.name}.`);
      return { messages: [{ seatId: seat.id, text }], effects: [{ t: 'roleTold', seatId: seat.id }] };
    },
  },
  manual: {
    suggest() { return { text: '' }; },
    model(s, step, input, lang, m) {
      m.instruction = st(lang, 'manualDo', { char: cname(step.characterId) });
      const info = charInfo(step.characterId);
      if (info.ability) m.hints.push(info.ability);
      m.fields.push({ name: 'text', type: 'text', label: st(lang, 'fText') });
    },
    resolve(s, step, input) {
      return { messages: input.text ? [{ seatId: step.seatId, text: input.text }] : [] };
    },
  },
};

const INSTRUCTION = {
  pingPair: (lang, p, step) => st(lang, 'pingDo', { ...p, team: step.def.team.charAt(0).toUpperCase() + step.def.team.slice(1) }),
  chef: (lang, p) => st(lang, 'chefDo', p),
  empath: (lang, p) => st(lang, 'empathDo', p),
  fortune: (lang, p) => st(lang, 'fortuneDo', p),
  poison: (lang, p) => st(lang, 'poisonDo', p),
  protect: (lang, p) => st(lang, 'protectDo', p),
  master: (lang, p) => st(lang, 'masterDo', p),
  demonKill: (lang, p) => st(lang, 'killDo', p),
  ravenkeeper: (lang, p) => st(lang, 'ravenDo', p),
  undertaker: (lang, p) => st(lang, 'undertakerDo', p),
  grimoire: (lang, p) => st(lang, 'grimoireDo', p),
};

// Hvilke tidligere steg kan påvirke et senere steg samme natt (hybrid night order).
const AFFECTS = {
  poison: ['pingPair', 'chef', 'empath', 'fortune', 'ravenkeeper', 'undertaker', 'grimoire', 'protect', 'demonKill', 'master'],
  protect: ['demonKill'],
  demonKill: ['ravenkeeper', 'empath', 'fortune', 'undertaker', 'grimoire'],
};

function kindOf(step) {
  return KINDS[step.kind] ? step.kind : 'manual';
}

function compOf(s, step) {
  const seat = step.seatId ? getSeat(s, step.seatId) : null;
  return seat ? compromised(s, seat) : { drunk: false, poisoned: false, any: false };
}

export function defaultInput(s, step) {
  const K = KINDS[kindOf(step)];
  const comp = compOf(s, step);
  return K.suggest(s, step, comp.any && !!K.info);
}

export function suggestInput(s, step, falseInfo) {
  return KINDS[kindOf(step)].suggest(s, step, falseInfo);
}

export function deriveInput(s, step, input, touched = {}) {
  const K = KINDS[kindOf(step)];
  return K.derive ? K.derive(s, step, input, touched, compOf(s, step)) : input;
}

export function stepModel(s, step, input = {}, lang = 'no', queue = null) {
  const K = KINDS[kindOf(step)];
  const seat = step.seatId ? getSeat(s, step.seatId) : null;
  const comp = compOf(s, step);
  const name = seat ? seatName(seat) : (step.seatIds || []).map((id) => nm(s, id)).join(', ');
  const m = {
    title: cname(step.characterId),
    seatName: name,
    instruction: INSTRUCTION[step.kind] ? INSTRUCTION[step.kind](lang, { name }, step) : '',
    hints: [], warnings: [], fields: [], effects: [],
    truth: null, comp, isInfo: !!K.info,
  };
  if (seat) {
    if (comp.drunk && K.info) m.warnings.push(st(lang, 'hDrunk', { name }));
    else if (comp.poisoned && K.info) m.warnings.push(st(lang, 'hPoisoned', { name }));
    else if (comp.any && K.effect) m.warnings.push(st(lang, 'hCompromisedEffect', { name, why: st(lang, comp.drunk ? 'whyDrunk' : 'whyPoisoned') }));
  }
  K.model(s, step, input, lang, m, comp);
  const q = queue || nightQueue(s);
  for (const other of q) {
    if (other.index >= step.index) break;
    if (other.status === 'pending' && (AFFECTS[other.kind] || []).includes(step.kind)) m.warnings.push(st(lang, 'hPending', { char: cname(other.characterId) }));
  }
  if (s.progress[step.key] && s.progress[step.key].status === 'done') m.warnings.push(st(lang, 'hAlreadyDone'));
  return m;
}

export function resolveStep(s, step, input = {}, lang = 'no', style = 'short') {
  const K = KINDS[kindOf(step)];
  const r = K.resolve(s, step, input, lang, style, compOf(s, step)) || {};
  return { messages: r.messages || [], effects: r.effects || [], incomplete: !!r.incomplete };
}

export function grimoireText(s, lang) {
  return KINDS.grimoire.listing(s, lang);
}


// ——— live: be spilleren om et valg ———
const CHOICE = {
  poison: { count: 1, fields: ['target'], key: 'choosePoison', allowSelf: true },
  protect: { count: 1, fields: ['target'], key: 'chooseProtect', allowSelf: false },
  master: { count: 1, fields: ['target'], key: 'chooseMaster', allowSelf: false },
  demonKill: { count: 1, fields: ['target'], key: 'chooseKill', allowSelf: true },
  fortune: { count: 2, fields: ['p1', 'p2'], key: 'chooseFortune', allowSelf: true },
  ravenkeeper: { count: 1, fields: ['target'], key: 'chooseRaven', allowSelf: true },
};

export function choiceRequest(s, step, lang = s.lang, style = s.style) {
  const c = CHOICE[step.kind];
  if (!c || !step.seatId) return null;
  // Ikke be om valg før eleven har fått vite den nye rollen (f.eks. Scarlet Woman som ble Demon).
  const seat = getSeat(s, step.seatId);
  if (seat && seat.newRole && !seat.newRole.told) return null;
  return {
    cardId: 'choice:' + step.key, seatId: step.seatId, fields: c.fields,
    card: { id: 'choice:' + step.key, kind: 'choice', text: msg(lang, style, c.key), choice: { count: c.count, allowSelf: c.allowSelf } },
  };
}

// Gjør om et svar fra spilleren til feltverdier i nattsteget.
export function choiceToInput(step, choice) {
  const c = CHOICE[step.kind];
  if (!c || !Array.isArray(choice)) return {};
  const out = {};
  c.fields.forEach((f, i) => { if (choice[i]) out[f] = choice[i]; });
  return out;
}
