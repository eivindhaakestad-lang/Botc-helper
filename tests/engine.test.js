import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TROUBLE_BREWING } from '../public/js/engine/defs.js';
import { charInfo, nightOrder } from '../public/js/engine/characters.js';
import { baseComposition, expectedComposition, randomizeRoles, validateSetup, suggestBluffs, roleCardMessages, tagAllows } from '../public/js/engine/setup.js';
import { createGame, replay, livingNeighbours, compromised } from '../public/js/engine/state.js';
import { nightQueue, stepModel, resolveStep, defaultInput, deriveInput } from '../public/js/engine/night.js';
import { onTheBlock, postDeathChecks, virginCheck, dawnMessage, voteThreshold } from '../public/js/engine/day.js';
import { parseScript } from '../public/js/engine/script.js';

const NAMES = ['Markus', 'Frida', 'Tarjei', 'Emil', 'Nora', 'Ida', 'Jonas', 'Sara', 'Ole', 'Ella'];

function makeGame(chars, opts = {}) {
  const seats = chars.map((c, i) => ({ id: 's' + i, names: [NAMES[i]], characterId: c, shownCharacterId: null, reminders: [] }));
  if (opts.drunkShown) seats.find((x) => x.characterId === 'drunk').shownCharacterId = opts.drunkShown;
  if (opts.redHerring !== undefined) seats[opts.redHerring].reminders.push({ kind: 'redherring', label: 'Red herring', sourceSeatId: null });
  return createGame({ seats, script: TROUBLE_BREWING, bluffs: opts.bluffs || ['chef', 'mayor', 'saint'], lang: 'no', style: 'short' });
}

function runStep(g, events, key, input) {
  const s = replay(g, events);
  const step = nightQueue(s).find((x) => x.key === key);
  assert.ok(step, 'fant ikke steg ' + key + ' i ' + nightQueue(s).map((x) => x.key).join(','));
  const r = resolveStep(s, step, input, s.lang, s.style);
  assert.equal(r.incomplete, false, 'ufullstendig: ' + key);
  events.push({ type: 'STEP', sk: 'step:' + key, key, status: 'done', input, effects: r.effects, messages: r.messages, phase: s.phase });
  return r;
}

test('sammensetning følger tabellen og Baron gir +2 Outsiders', () => {
  assert.deepEqual(baseComposition(10), { townsfolk: 7, outsider: 0, minion: 2, demon: 1 });
  assert.deepEqual(baseComposition(7), { townsfolk: 5, outsider: 0, minion: 1, demon: 1 });
  assert.deepEqual(baseComposition(15), { townsfolk: 9, outsider: 2, minion: 3, demon: 1 });
  assert.deepEqual(expectedComposition(10, ['baron']), { townsfolk: 5, outsider: 2, minion: 2, demon: 1 });
});

test('trekking gir riktig sammensetning, respekterer låser og elevmerker', () => {
  for (let run = 0; run < 200; run++) {
    const seats = NAMES.map((n, i) => ({ id: 's' + i, tags: i < 3 ? ['noEvil'] : i === 3 ? ['simpleRole'] : [] }));
    const { assignment, bag, warnings } = randomizeRoles({ seats, script: TROUBLE_BREWING, locks: { s9: 'empath' } });
    assert.equal(assignment.s9, 'empath');
    const ids = Object.values(assignment);
    assert.equal(new Set(ids).size, 10, 'ingen duplikater');
    const want = expectedComposition(10, ids);
    const have = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
    ids.forEach((id) => have[charInfo(id).team]++);
    assert.deepEqual(have, { ...want });
    for (let i = 0; i < 3; i++) assert.ok(tagAllows(['noEvil'], assignment['s' + i]), 'noEvil brutt');
    assert.ok(tagAllows(['simpleRole'], assignment.s3), 'simpleRole brutt');
    assert.equal(warnings.length, 0);
    assert.equal(bag.length, 10);
  }
});

test('night order følger offisiell rekkefølge', () => {
  assert.deepEqual(
    nightOrder(true, TROUBLE_BREWING.characters),
    ['minioninfo', 'demoninfo', 'poisoner', 'washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneteller', 'butler', 'spy'],
  );
  assert.deepEqual(
    nightOrder(false, TROUBLE_BREWING.characters),
    ['poisoner', 'monk', 'scarletwoman', 'imp', 'ravenkeeper', 'empath', 'fortuneteller', 'undertaker', 'butler', 'spy'],
  );
});

test('validering fanger Drunk, red herring og bluffs', () => {
  const seats = ['washerwoman', 'drunk', 'fortuneteller', 'chef', 'empath', 'monk', 'baron', 'imp', 'poisoner', 'saint']
    .map((c, i) => ({ id: 's' + i, names: [NAMES[i]], characterId: c, reminders: [] }));
  const v = validateSetup({ seats, script: TROUBLE_BREWING, bluffs: ['empath'], lang: 'no' });
  const warn = v.filter((x) => x.level === 'warn').map((x) => x.text).join(' | ');
  assert.match(warn, /Drunk mangler/);
  assert.match(warn, /red herring/);
  assert.match(warn, /1 av 3/);
  assert.match(warn, /Bluff Empath er i spill/);
});

test('første natt: kø, minion/demon-info, info-roller og forgiftning', () => {
  //            0 Markus     1 Frida   2 Tarjei        3 Emil  4 Nora    5 Ida   6 Jonas     7 Sara  8 Ole     9 Ella
  const chars = ['washerwoman', 'drunk', 'fortuneteller', 'chef', 'empath', 'monk', 'poisoner', 'imp', 'spy', 'butler'];
  const g = makeGame(chars, { drunkShown: 'librarian', redHerring: 0 });
  const ev = [{ type: 'NIGHT_START' }];
  let s = replay(g, ev);
  const q = nightQueue(s);
  assert.deepEqual(q.map((x) => x.characterId), ['minioninfo', 'demoninfo', 'poisoner', 'washerwoman', 'librarian', 'chef', 'empath', 'fortuneteller', 'butler', 'spy']);
  // Drunk (Frida) handler som Librarian og får falsk info
  const lib = q.find((x) => x.characterId === 'librarian');
  assert.equal(lib.seatId, 's1');
  assert.ok(stepModel(s, lib, {}, 'no', q).warnings.some((w) => /Drunk/.test(w)));

  const mi = runStep(g, ev, 'n1:minioninfo', {});
  assert.equal(mi.messages.length, 2);
  assert.match(mi.messages[0].text, /Demonen er Sara/);
  const di = runStep(g, ev, 'n1:demoninfo', { bluffs: ['investigator', 'mayor', 'soldier'] });
  assert.match(di.messages[0].text, /Jonas og Ole/);
  assert.match(di.messages[0].text, /Investigator, Mayor og Soldier/);

  // Empath (Nora, s4): naboer Emil (god) og Ida (god) → 0. Poisoner forgifter Empath.
  s = replay(g, ev);
  let emp = nightQueue(s).find((x) => x.characterId === 'empath');
  assert.ok(stepModel(s, emp, {}, 'no').warnings.some((w) => /Poisoner er ikke ferdig/.test(w)));
  assert.equal(defaultInput(s, emp).n, 0);
  runStep(g, ev, 'n1:poisoner:s6', { target: 's4', ack: true });
  s = replay(g, ev);
  assert.ok(compromised(s, s.seats[4]).poisoned);
  emp = nightQueue(s).find((x) => x.characterId === 'empath');
  const empIn = defaultInput(s, emp);
  assert.notEqual(empIn.n, 0, 'forgiftet Empath skal få falskt forslag');
  const m = stepModel(s, emp, empIn, 'no');
  assert.equal(m.truth, false);

  // Chef (Emil, s3): onde Jonas(6), Sara(7), Ole(8) på rad → 2 par. Spy kan registrere som god → 1–2.
  const chef = nightQueue(s).find((x) => x.characterId === 'chef');
  assert.equal(defaultInput(s, chef).n, 2);
  assert.match(stepModel(s, chef, { n: 2 }, 'no').hints.join(' '), /kan være 1–2/);

  // Fortune Teller: red herring Markus gir JA
  const ft = nightQueue(s).find((x) => x.characterId === 'fortuneteller');
  const ftIn = deriveInput(s, ft, { p1: 's0', p2: 's3', answer: null }, {});
  assert.equal(ftIn.answer, true);
  const ftr = resolveStep(s, ft, ftIn, 'no', 'short');
  assert.match(ftr.messages[0].text, /JA/);

  // Washerwoman: meldingen sorterer spillerne etter plass
  const ww = runStep(g, ev, 'n1:washerwoman:s0', { character: 'empath', a: 's4', b: 's2' });
  assert.equal(ww.messages[0].text, '🕵️ Enten Tarjei eller Nora er Empath.');

  // Spy ser grimoiren
  s = replay(g, ev);
  const spy = nightQueue(s).find((x) => x.characterId === 'spy');
  const spyR = resolveStep(s, spy, {}, 'no', 'short');
  assert.match(spyR.messages[0].text, /Frida – Drunk \(tror: Librarian\)/);
  assert.match(spyR.messages[0].text, /Nora – Empath \[Poisoned\]/);
});

test('natt 2: Imp dreper Ravenkeeper, Monk beskytter, Soldier overlever, gift går ut i skumringen', () => {
  const chars = ['ravenkeeper', 'soldier', 'monk', 'empath', 'undertaker', 'mayor', 'poisoner', 'imp', 'scarletwoman', 'saint'];
  const g = makeGame(chars);
  const ev = [{ type: 'NIGHT_START' }];
  runStep(g, ev, 'n1:poisoner:s6', { target: 's3' });
  ev.push({ type: 'DAY_START', messages: [] });
  let s = replay(g, ev);
  assert.ok(compromised(s, s.seats[3]).poisoned, 'forgiftet om dagen');
  ev.push({ type: 'EXECUTE', seatId: 's9', sk: 'exec:1' }); // Saint henrettes
  s = replay(g, ev);
  const post = postDeathChecks(s, ['s9'], 10, 'execution', 'no', 'short');
  assert.ok(post.some((x) => x.type === 'win' && x.winner === 'evil'));

  ev.push({ type: 'NIGHT_START' });
  s = replay(g, ev);
  assert.equal(compromised(s, s.seats[3]).poisoned, false, 'giften går ut i skumringen');
  let q = nightQueue(s);
  assert.deepEqual(q.map((x) => x.characterId), ['poisoner', 'monk', 'imp', 'empath', 'undertaker']);

  runStep(g, ev, 'n2:monk:s2', { target: 's5' });
  s = replay(g, ev);
  let imp = nightQueue(s).find((x) => x.characterId === 'imp');
  assert.equal(deriveInput(s, imp, { target: 's5' }, {}).outcome, 'none', 'Monk beskytter Mayor');
  assert.equal(deriveInput(s, imp, { target: 's1' }, {}).outcome, 'none', 'Soldier');
  assert.equal(deriveInput(s, imp, { target: 's7' }, {}).outcome, 'starpass');
  assert.equal(deriveInput(s, imp, { target: 's7' }, {}).newImp, 's8', 'Scarlet Woman foreslås');
  runStep(g, ev, 'n2:imp:s7', { target: 's0', outcome: 'dies' });
  s = replay(g, ev);
  q = nightQueue(s);
  assert.ok(q.some((x) => x.characterId === 'ravenkeeper' && x.status === 'pending'), 'Ravenkeeper vekkes');
  const rk = q.find((x) => x.characterId === 'ravenkeeper');
  const rkIn = deriveInput(s, rk, { target: 's7' }, {});
  assert.equal(rkIn.character, 'imp');
  // Undertaker får vite at Saint ble henrettet
  const ut = q.find((x) => x.characterId === 'undertaker');
  const utr = resolveStep(s, ut, defaultInput(s, ut), 'no', 'short');
  assert.equal(utr.messages[0].text, '⚰️ Ella, som ble henrettet i dag, var Saint.');
  // Empath hopper over døde naboer: s3 naboer er s2 (Monk) og s4 (Undertaker)
  assert.deepEqual(livingNeighbours(s, 's3').map((x) => x.id), ['s2', 's4']);

  ev.push({ type: 'DAY_START', messages: [dawnMessage(s, 'no', 'short')] });
  s = replay(g, ev);
  assert.match(s.messages.at(-1).text, /I natt døde: Markus/);
});

test('rette et nattsteg overskriver effektene (supersede) og angre fungerer', () => {
  const chars = ['washerwoman', 'soldier', 'monk', 'empath', 'undertaker', 'mayor', 'poisoner', 'imp', 'scarletwoman', 'chef'];
  const g = makeGame(chars);
  const ev = [{ type: 'NIGHT_START' }, { type: 'DAY_START' }, { type: 'NIGHT_START' }];
  runStep(g, ev, 'n2:imp:s7', { target: 's0', outcome: 'dies' });
  runStep(g, ev, 'n2:imp:s7', { target: 's3', outcome: 'dies' });
  let s = replay(g, ev);
  assert.equal(s.seats[0].alive, true, 'første valg er overskrevet');
  assert.equal(s.seats[3].alive, false);
  ev.pop();
  s = replay(g, ev);
  assert.equal(s.seats[0].alive, false, 'angre gir tilbake første valg');
  assert.equal(s.seats[3].alive, true);
});

test('starpass: Imp dør, Minion blir Imp og dreper ikke samme natt', () => {
  const chars = ['washerwoman', 'soldier', 'monk', 'empath', 'undertaker', 'mayor', 'poisoner', 'imp', 'scarletwoman', 'chef'];
  const g = makeGame(chars);
  const ev = [{ type: 'NIGHT_START' }, { type: 'DAY_START' }, { type: 'NIGHT_START' }];
  const r = runStep(g, ev, 'n2:imp:s7', { target: 's7', outcome: 'starpass', newImp: 's6' });
  assert.match(r.messages[0].text, /Du er nå Imp/);
  const s = replay(g, ev);
  assert.equal(s.seats[7].alive, false);
  assert.equal(s.seats[6].characterId, 'imp');
  assert.equal(nightQueue(s).filter((x) => x.characterId === 'imp' && x.seatId === 's6').length, 0);
  assert.equal(postDeathChecks(s, ['s7'], 10, 'starpass', 'no', 'short').length, 0, 'ingen seier – ny Imp lever');
});

test('Scarlet Woman blir Demon når Demon henrettes med 5+ levende', () => {
  const chars = ['washerwoman', 'soldier', 'monk', 'empath', 'undertaker', 'mayor', 'poisoner', 'imp', 'scarletwoman', 'chef'];
  const g = makeGame(chars);
  const ev = [{ type: 'NIGHT_START' }, { type: 'DAY_START' }, { type: 'EXECUTE', seatId: 's7', sk: 'exec:1' }];
  const s = replay(g, ev);
  const post = postDeathChecks(s, ['s7'], 10, 'execution', 'no', 'short');
  assert.equal(post[0].type, 'sw');
  assert.equal(post.length, 1, 'ingen seier for godt når SW tar over');
});

test('Virgin, stemmeterskel og blokka', () => {
  const chars = ['virgin', 'soldier', 'monk', 'empath', 'undertaker', 'mayor', 'spy', 'imp', 'scarletwoman', 'chef'];
  const g = makeGame(chars);
  const ev = [{ type: 'NIGHT_START' }, { type: 'DAY_START' }];
  let s = replay(g, ev);
  assert.equal(virginCheck(s, 's3', 's0', 'no').trigger, true);
  assert.equal(virginCheck(s, 's6', 's0', 'no').trigger, false);
  assert.equal(virginCheck(s, 's6', 's0', 'no').maybe, true, 'Spy kan registrere som Townsfolk');
  assert.equal(voteThreshold(s), 5);
  ev.push({ type: 'NOMINATE', nominationId: 'a', nominatorId: 's1', nomineeId: 's7' });
  ev.push({ type: 'VOTE', sk: 'vote:a', nominationId: 'a', voters: ['s0', 's1', 's2', 's3', 's4'] });
  ev.push({ type: 'NOMINATE', nominationId: 'b', nominatorId: 's2', nomineeId: 's6' });
  ev.push({ type: 'VOTE', sk: 'vote:b', nominationId: 'b', voters: ['s0', 's1', 's2', 's3', 's4'] });
  s = replay(g, ev);
  const b = onTheBlock(s);
  assert.equal(b.tie, true);
  assert.equal(b.nomination, null);
});

test('rollekort: Drunk får den falske rollen', () => {
  const seats = [{ id: 's0', names: ['Markus', 'Frida'], characterId: 'drunk', shownCharacterId: 'chef' }];
  const [m] = roleCardMessages(seats, 'no', 'short');
  assert.match(m.text, /Rollen din: Chef \(Townsfolk – god\)/);
  const bl = suggestBluffs(TROUBLE_BREWING, ['chef', 'imp'], ['empath']);
  assert.equal(bl.length, 3);
  assert.ok(!bl.includes('chef') && !bl.includes('empath') && !bl.includes('drunk'));
});

test('script-import: offisielt format, gamle ID-er, homebrew og navneliste', () => {
  const json = JSON.stringify([{ id: '_meta', name: 'Løkpai', author: 'Eivind' }, 'washerwoman', { id: 'fortune_teller' }, 'imp',
    { id: 'hjemmebrygg', name: 'Vaktmester', team: 'townsfolk', ability: 'Test', firstNight: 40, otherNight: 0 }]);
  const r = parseScript(json);
  assert.equal(r.script.name, 'Løkpai');
  assert.deepEqual(r.script.characters, ['washerwoman', 'fortuneteller', 'imp', 'hjemmebrygg']);
  assert.equal(r.script.custom.hjemmebrygg.team, 'townsfolk');
  const r2 = parseScript('Washerwoman\nFortune Teller, Imp\nUkjent');
  assert.deepEqual(r2.script.characters, ['washerwoman', 'fortuneteller', 'imp']);
  assert.deepEqual(r2.unknown, ['Ukjent']);
});

test('grim reveal: publiserer bare avslørte roller og annonsert vinner', async () => {
  const { publicProjection } = await import('../public/js/engine/live.js');
  const chars = ['washerwoman', 'drunk', 'monk', 'empath', 'undertaker', 'mayor', 'poisoner', 'imp', 'scarletwoman', 'chef'];
  const g = makeGame(chars, { drunkShown: 'librarian' });
  const ev = [{ type: 'NIGHT_START' }, { type: 'DAY_START' }, { type: 'GAME_END', winner: 'good' }];
  let p = publicProjection(replay(g, ev));
  assert.equal(p.phase.type, 'ended');
  assert.deepEqual(p.reveal, []);
  assert.equal(p.winner, null, 'vinner vises ikke før den er annonsert');
  ev.push({ type: 'REVEAL', seatIds: ['s1', 's7'] });
  p = publicProjection(replay(g, ev));
  assert.deepEqual(p.reveal.map((r) => [r.seatId, r.character, r.shown]), [['s1', 'Drunk', 'Librarian'], ['s7', 'Imp', null]]);
  ev.push({ type: 'HIDE', seatIds: ['s7'] });
  ev.push({ type: 'ANNOUNCE', winner: 'evil' });
  p = publicProjection(replay(g, ev));
  assert.deepEqual(p.reveal.map((r) => r.seatId), ['s1']);
  assert.equal(p.winner, 'evil');
  assert.equal(p.announcement, '');
  ev.pop();
  assert.equal(publicProjection(replay(g, ev)).winner, null, 'angre fjerner annonseringen');
});

test('daggry: nattens dødsfall er skjult for elevene til Storytelleren kunngjør dem', async () => {
  const { publicProjection } = await import('../public/js/engine/live.js');
  const chars = ['washerwoman', 'drunk', 'monk', 'empath', 'undertaker', 'mayor', 'poisoner', 'imp', 'scarletwoman', 'chef'];
  const g = makeGame(chars, { drunkShown: 'librarian' });
  const ev = [{ type: 'NIGHT_START' }, { type: 'DAY_START' }, { type: 'DAWN_REVEAL' }, { type: 'NIGHT_START' },
    { type: 'EFFECTS', effects: [{ t: 'kill', seatId: 's3', cause: 'demon' }] }];
  assert.equal(publicProjection(replay(g, ev)).seats.find((x) => x.id === 's3').alive, true, 'demonens drap vises ikke om natten');
  ev.push({ type: 'DAY_START', messages: [{ kind: 'public', text: 'Tarjei døde i natt' }] });
  let p = publicProjection(replay(g, ev));
  assert.equal(p.dawnPending, true);
  assert.equal(p.seats.find((x) => x.id === 's3').alive, true, 'Tarjei ser levende ut før kunngjøringen');
  assert.equal(p.announcement, '');
  ev.push({ type: 'DAWN_REVEAL' });
  p = publicProjection(replay(g, ev));
  assert.equal(p.dawnPending, false);
  assert.equal(p.seats.find((x) => x.id === 's3').alive, false);
  assert.equal(p.announcement, 'Tarjei døde i natt');
});

test('stemmemål: med noen på blokka gir likt antall uavgjort og ett mer tar over', async () => {
  const { voteTarget } = await import('../public/js/engine/day.js');
  const chars = ['washerwoman', 'drunk', 'monk', 'empath', 'undertaker', 'mayor', 'poisoner', 'imp', 'scarletwoman', 'chef'];
  const g = makeGame(chars, { drunkShown: 'librarian' });
  const ev = [{ type: 'NIGHT_START' }, { type: 'DAY_START' }, { type: 'DAWN_REVEAL' },
    { type: 'NOMINATE', nominationId: 'n1', nominatorId: 's0', nomineeId: 's1' },
    { type: 'NOMINATE', nominationId: 'n2', nominatorId: 's2', nomineeId: 's3' }];
  let s = replay(g, ev);
  assert.deepEqual(voteTarget(s, 'n2'), { threshold: 5, need: 5, tieAt: null, blockId: null });
  ev.push({ type: 'VOTE', sk: 'vote:n1', nominationId: 'n1', voters: ['s0', 's1', 's2', 's4', 's5', 's6'] });
  s = replay(g, ev);
  assert.deepEqual(voteTarget(s, 'n2'), { threshold: 5, need: 7, tieAt: 6, blockId: 's1' });
  assert.equal(voteTarget(s, 'n1').need, 5, 'egen nominasjon teller ikke mot seg selv');
});

test('Scarlet Woman: forgiftet SW blir ikke Demon, og appen sier fra', async () => {
  const chars = ['washerwoman', 'empath', 'monk', 'chef', 'soldier', 'imp', 'scarletwoman', 'poisoner'];
  const g = makeGame(chars);
  const ev = [{ type: 'NIGHT_START' }, { type: 'DAY_START' }, { type: 'DAWN_REVEAL' }, { type: 'EXECUTE', sk: 'exec:1', seatId: 's5' }];
  let s = replay(g, ev);
  const ok = postDeathChecks(s, ['s5'], 8, 'execution', 'no', 'short');
  assert.equal(ok[0].type, 'sw');
  ev.push({ type: 'EFFECTS', effects: ok[0].effects, messages: ok[0].messages }, { type: 'NIGHT_START' });
  s = replay(g, ev);
  const { roleCardsFor } = await import('../public/js/engine/live.js');
  assert.equal(roleCardsFor(s).s6.character, 'Scarlet Woman', 'eleven ser fortsatt Scarlet Woman før natten');
  const q = nightQueue(s);
  const keys = q.map((x) => x.key);
  assert.ok(keys.indexOf('n2:newrole:s6') >= 0 && keys.indexOf('n2:newrole:s6') + 1 === keys.indexOf('n2:imp:s6'), 'SW får vite det rett før Imp-steget: ' + keys.join(','));
  assert.deepEqual(q.filter((x) => x.characterId === 'imp').map((x) => [x.seatId, x.autoSkip]), [['s5', true], ['s6', false]], 'den døde Imp hoppes over, SW våkner som Imp');
  const r = runStep(g, ev, 'n2:newrole:s6', {});
  assert.match(r.messages[0].text, /Imp/);
  s = replay(g, ev);
  assert.equal(roleCardsFor(s).s6.character, 'Imp', 'etter steget ser eleven Imp');
  assert.ok(nightQueue(s).some((x) => x.key === 'n2:newrole:s6'), 'steget blir stående som ferdig i natt');
  ev.push({ type: 'DAY_START' }, { type: 'NIGHT_START' });
  assert.ok(!nightQueue(replay(g, ev)).some((x) => x.kind === 'newRole'), 'ikke igjen neste natt');
  const g2 = makeGame(chars);
  const ev2 = [{ type: 'NIGHT_START' }, { type: 'EFFECTS', effects: [{ t: 'addReminder', seatId: 's6', reminder: { kind: 'poisoned', label: 'Poisoned', expires: 'dusk' } }] }, { type: 'DAY_START' }, { type: 'EXECUTE', sk: 'exec:1', seatId: 's5' }];
  const bad = postDeathChecks(replay(g2, ev2), ['s5'], 8, 'execution', 'no', 'short');
  assert.equal(bad[0].type, 'info');
  assert.equal(bad[1].type, 'win');
});

test('Scarlet Woman: ingen valgforespørsel før hun har fått vite at hun er Demon', async () => {
  const { choiceRequest } = await import('../public/js/engine/night.js');
  const g = makeGame(['washerwoman', 'empath', 'monk', 'chef', 'soldier', 'imp', 'scarletwoman', 'poisoner']);
  const ev = [{ type: 'NIGHT_START' }, { type: 'DAY_START' }, { type: 'EXECUTE', sk: 'exec:1', seatId: 's5' },
    { type: 'EFFECTS', effects: [{ t: 'setCharacter', seatId: 's6', characterId: 'imp', from: 'scarletwoman', tellAtNight: true }] }, { type: 'NIGHT_START' }];
  let s = replay(g, ev);
  assert.equal(choiceRequest(s, nightQueue(s).find((x) => x.key === 'n2:imp:s6')), null);
  runStep(g, ev, 'n2:newrole:s6', {});
  s = replay(g, ev);
  assert.ok(choiceRequest(s, nightQueue(s).find((x) => x.key === 'n2:imp:s6')));
});

test('Travellers: legges til, teller ikke i «to igjen», Bureaucrat ×3 og Thief negativt', async () => {
  const { voteWeights } = await import('../public/js/engine/state.js');
  const { exileThreshold, checkWin } = await import('../public/js/engine/day.js');
  const g = makeGame(['washerwoman', 'empath', 'monk', 'chef', 'soldier', 'imp', 'scarletwoman']);
  const ev = [{ type: 'NIGHT_START' }, { type: 'DAY_START' }, { type: 'DAWN_REVEAL' },
    { type: 'ADD_TRAVELLER', seat: { id: 't1', names: ['Ida'], characterId: 'bureaucrat', alignment: 'evil' }, afterSeatId: 's2' },
    { type: 'ADD_TRAVELLER', seat: { id: 't2', names: ['Ole'], characterId: 'thief', alignment: 'good' }, afterSeatId: 's5' }];
  let s = replay(g, ev);
  assert.deepEqual(s.seats.map((x) => x.id), ['s0', 's1', 's2', 't1', 's3', 's4', 's5', 't2', 's6']);
  assert.equal(voteThreshold(s), 5, 'Travellers teller med i terskelen (9 levende)');
  assert.equal(exileThreshold(s), 5);
  ev.push({ type: 'NIGHT_START' });
  s = replay(g, ev);
  const keys = nightQueue(s).map((x) => x.key);
  assert.ok(keys.indexOf('n2:bureaucrat:t1') >= 0 && keys.indexOf('n2:bureaucrat:t1') < keys.indexOf('n2:imp:s5'), keys.join(','));
  runStep(g, ev, 'n2:bureaucrat:t1', { target: 's0' });
  runStep(g, ev, 'n2:thief:t2', { target: 's1' });
  ev.push({ type: 'DAY_START' }, { type: 'NOMINATE', nominationId: 'n1', nominatorId: 's2', nomineeId: 's3' },
    { type: 'VOTE', sk: 'vote:n1', nominationId: 'n1', voters: ['s0', 's1', 's2'] });
  s = replay(g, ev);
  assert.deepEqual(voteWeights(s), { s0: 3, s1: -1 });
  assert.equal(s.nominations[0].votes, 3, '3 − 1 + 1');
  // Neste natt forsvinner vektene
  ev.push({ type: 'NIGHT_START' });
  assert.deepEqual(voteWeights(replay(g, ev)), {});
  // To igjen (uten Travellers) gir ond seier
  const g2 = makeGame(['washerwoman', 'empath', 'monk', 'chef', 'soldier', 'imp', 'scarletwoman']);
  const kill = (ids) => ({ type: 'EFFECTS', effects: ids.map((id) => ({ t: 'kill', seatId: id })) });
  const s2 = replay(g2, [{ type: 'NIGHT_START' }, { type: 'DAY_START' }, { type: 'ADD_TRAVELLER', seat: { id: 't1', names: ['Ida'], characterId: 'beggar', alignment: 'good' } }, kill(['s0', 's1', 's2', 's3', 's6'])]);
  assert.equal(checkWin(s2, 'no').winner, 'evil');
});

test('gjennomgang: viser forgiftet, demondrap, feil info og henrettelse uten å avsløre hvem som gjorde det', async () => {
  const { buildRecap, recapSteps, recapPublic } = await import('../public/js/engine/recap.js');
  const chars = ['empath', 'soldier', 'monk', 'drunk', 'undertaker', 'mayor', 'poisoner', 'imp', 'chef', 'saint'];
  const g = makeGame(chars, { drunkShown: 'washerwoman' });
  const ev = [{ type: 'NIGHT_START' }];
  runStep(g, ev, 'n1:poisoner:s6', { target: 's0' });
  // Empath (forgiftet) får et galt tall: naboene s9 og s1 er gode, men får 1
  runStep(g, ev, 'n1:empath:s0', { n: 1 });
  ev.push({ type: 'DAY_START', messages: [] });
  ev.push({ type: 'EXECUTE', seatId: 's4', sk: 'exec:1' });
  ev.push({ type: 'NIGHT_START' });
  runStep(g, ev, 'n2:monk:s2', { target: 's5' });
  runStep(g, ev, 'n2:imp:s7', { target: 's5', outcome: 'none' });
  const r = buildRecap(g, ev, 'no');
  const all = r.chapters.flatMap((c) => c.items.map((x) => `${c.key}:${x.kind}:${x.seatIds.join('+')}`));
  assert.ok(all.includes('setup:drunk:s3'));
  assert.ok(all.includes('night1:poisoned:s0'));
  assert.ok(all.includes('night1:falseInfo:s0'), all.join(' | '));
  assert.ok(all.includes('day1:executed:s4'));
  assert.ok(all.includes('night2:protected:s5'));
  assert.ok(all.includes('night2:survived:s5'));
  const text = r.chapters.flatMap((c) => c.items.map((x) => x.text)).join(' ');
  assert.doesNotMatch(text, /Jonas|Sara/, 'nevner ikke Poisoner (Jonas) eller Imp (Sara)');
  assert.match(text, /Markus fikk feil informasjon \(forgiftet\)/);
  // Storytelleren kan skjule et punkt og overstyre teksten
  const ctl = { hidden: { [r.chapters[0].items[0].id]: true }, edits: {} };
  const steps = recapSteps(r, ctl);
  assert.equal(steps[0].ch.key, 'night1', 'skjult oppsettkapittel faller bort');
  ctl.edits[r.chapters[1].items[0].id] = 'Noen ble forgiftet';
  const pub = recapPublic(r, ctl, 1);
  assert.equal(pub.items[0].text, 'Noen ble forgiftet');
  assert.equal(pub.title, 'Natt 1');
});

test('vinnerlaget publiseres først når vinneren er annonsert (for myntbonusen)', async () => {
  const { publicProjection } = await import('../public/js/engine/live.js');
  const g = makeGame(['empath', 'soldier', 'monk', 'chef', 'undertaker', 'mayor', 'poisoner', 'imp']);
  const ev = [{ type: 'NIGHT_START' }, { type: 'GAME_END', winner: 'good' }];
  let p = publicProjection(replay(g, ev));
  assert.equal(p.winners, undefined, 'ikke før annonsering');
  ev.push({ type: 'ANNOUNCE', winner: 'evil' });
  p = publicProjection(replay(g, ev), { shop: false });
  assert.deepEqual(p.winners, ['s6', 's7']);
  assert.equal(p.shop, false);
});

test('sauekatalogen: ukjente ting renses bort, og alle tegninger lager gyldig SVG', async () => {
  const { normLook, sheepSvg, CATS } = await import('../public/js/live/sheep.js');
  // Krona kan ikke kjøpes (den er forbeholdt drømmemesteren)
  assert.deepEqual(normLook({ color: 'gold', face: 'nope', hat: 'crown', pet: '<x>', border: 'fire' }), { color: 'gold', face: 'happy', hat: '', shoes: '', trail: '', pet: '', border: 'fire' });
  for (const cat of CATS) {
    for (const it of cat.list) {
      for (const view of ['head', 'body']) {
        const svg = sheepSvg({ [cat.key]: it.id }, { view, champion: cat.key === 'hat' });
        assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), `${cat.key}:${it.id}`);
        assert.ok(!/undefined|NaN/.test(svg), `ingen undefined/NaN i ${cat.key}:${it.id} (${view})`);
      }
    }
  }
});
