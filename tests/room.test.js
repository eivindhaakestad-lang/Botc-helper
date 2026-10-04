import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../worker/room.js';

function fakeState() {
  const data = new Map();
  const sockets = [];
  return {
    storage: {
      async get(k) { return data.has(k) ? structuredClone(data.get(k)) : undefined; },
      async put(k, v) { data.set(k, structuredClone(v)); },
      async deleteAll() { data.clear(); },
      async setAlarm() {},
      async deleteAlarm() {},
    },
    acceptWebSocket(ws, tags) { sockets.push({ ws, tags }); },
    getWebSockets(tag) { return sockets.filter((x) => (!tag || x.tags.includes(tag)) && x.ws.readyState === 1).map((x) => x.ws); },
    data,
  };
}

function fakeWs() {
  return {
    readyState: 1, sent: [], att: null,
    send(t) { this.sent.push(JSON.parse(t)); },
    close() { this.readyState = 3; },
    serializeAttachment(v) { this.att = structuredClone(v); },
    deserializeAttachment() { return this.att; },
    last(type) { return [...this.sent].reverse().find((m) => m.t === type); },
  };
}

async function connect(room, role, token) {
  const ws = fakeWs();
  const url = new URL(`https://x/api/rooms/ABCDE/ws?role=${role}${token ? '&token=' + token : ''}`);
  await room.accept(ws, room.authorize(url));
  return ws;
}

const say = (room, ws, obj) => room.webSocketMessage(ws, JSON.stringify(obj));

const PUB = {
  title: '9A', lang: 'no', phase: { type: 'setup', number: 0 }, dream: true, decoys: false,
  seats: [
    { id: 's1', names: ['Markus'], alive: true, ghostVote: true },
    { id: 's2', names: ['Ole', 'Ella'], alive: true, ghostVote: true },
    { id: 's3', names: ['Nora'], alive: true, ghostVote: true },
  ],
};

test('rom: bare Storyteller med riktig token får styre', async () => {
  const room = new Room(fakeState(), {});
  await room.load();
  await room.init({ code: 'ABCDE', stToken: 'secret' });
  const bad = await connect(room, 'st', 'wrong');
  assert.equal(bad.sent[0].code, 'auth');
  assert.equal(bad.readyState, 3);
  const st = await connect(room, 'st', 'secret');
  assert.equal(st.sent[0].t, 'hello');
});

test('rom: claim, rollekort, kort, lest, valg og toppliste', async () => {
  const state = fakeState();
  const room = new Room(state, {});
  await room.load();
  await room.init({ code: 'ABCDE', stToken: 'secret' });
  const st = await connect(room, 'st', 'secret');
  const screen = await connect(room, 'screen');
  await say(room, st, { t: 'sync', public: PUB, roleCards: { s1: { character: 'Imp', team: 'demon', text: 'Du er Imp' }, s3: { character: 'Empath', team: 'townsfolk', text: 'Du er Empath' } } });
  assert.equal(screen.last('public').public.seats.length, 3);
  assert.equal(JSON.stringify(screen.sent).includes('Imp'), false, 'storskjermen får aldri roller');

  const p1 = await connect(room, 'player');
  await say(room, p1, { t: 'claim', seatId: 's1' });
  const you = p1.last('you');
  assert.equal(you.roleCard.character, 'Imp');
  assert.ok(you.token);
  // Andre elever ser ikke Markus sin rolle
  const p3 = await connect(room, 'player');
  await say(room, p3, { t: 'claim', seatId: 's3' });
  assert.equal(JSON.stringify(p3.sent).includes('Imp'), false);
  // Plassen er tatt
  const px = await connect(room, 'player');
  await say(room, px, { t: 'claim', seatId: 's1' });
  assert.equal(px.last('error').code, 'taken');
  // Par-plass kan ha to enheter
  const pa = await connect(room, 'player');
  const pb = await connect(room, 'player');
  await say(room, pa, { t: 'claim', seatId: 's2' });
  await say(room, pb, { t: 'claim', seatId: 's2' });
  assert.ok(pa.last('you') && pb.last('you'));
  assert.equal(st.last('presence').claimed.s2, 2);

  // Kort til Nora, lest
  await say(room, st, { t: 'card', seatId: 's3', card: { id: 'step:n1:empath:s3#0', kind: 'info', text: '💜 1' } });
  assert.equal(p3.last('card').card.text, '💜 1');
  assert.equal(p1.last('card'), undefined, 'andre får ikke kortet');
  await say(room, p3, { t: 'ack', cardId: 'step:n1:empath:s3#0' });
  assert.equal(st.last('ack').cardId, 'step:n1:empath:s3#0');

  // Nattvalg fra Imp
  await say(room, st, { t: 'sync', public: { ...PUB, phase: { type: 'night', number: 2 } }, roleCards: {} });
  await say(room, st, { t: 'card', seatId: 's1', card: { id: 'choice:n2:imp:s1', kind: 'choice', text: 'Velg', choice: { count: 1, allowSelf: true } } });
  await say(room, p1, { t: 'choose', cardId: 'choice:n2:imp:s1', choice: ['s3', 's2'] });
  assert.equal(p1.last('error').code, 'choice', 'for mange valg avvises');
  await say(room, p1, { t: 'choose', cardId: 'choice:n2:imp:s1', choice: ['s3'] });
  assert.deepEqual(st.last('choice').choice, ['s3']);

  // Gjenoppkobling med token gir tilbake innboksen
  const again = await connect(room, 'player');
  await say(room, again, { t: 'resume', seatId: 's1', token: you.token });
  assert.equal(again.last('you').inbox[0].status, 'answered');
  const hacker = await connect(room, 'player');
  await say(room, hacker, { t: 'resume', seatId: 's1', token: 'nope' });
  assert.equal(hacker.last('error').code, 'badtoken');

  // Toppliste bare om natten, beste score teller
  await say(room, p1, { t: 'score', score: 12 });
  await say(room, p3, { t: 'score', score: 30 });
  await say(room, p1, { t: 'score', score: 5 });
  const board = screen.last('board');
  assert.deepEqual(board.board.map((x) => [x.name, x.score]), [['Nora', 30], ['Markus', 12]]);
  await say(room, st, { t: 'sync', public: { ...PUB, phase: { type: 'day', number: 2 } }, roleCards: {} });
  await say(room, p1, { t: 'score', score: 99 });
  assert.equal(screen.last('board').open, false);
  assert.ok(!screen.last('board').board.some((x) => x.score === 99), 'ingen score om dagen');

  // Rekordene gjelder hele spillrunden
  await say(room, st, { t: 'sync', public: { ...PUB, phase: { type: 'night', number: 3 } }, roleCards: {} });
  assert.deepEqual(screen.last('board').board.map((x) => x.score), [30, 12]);

  // Låst rom
  await say(room, st, { t: 'release', seatId: 's3' });
  assert.equal(p3.last('released').t, 'released');
  await say(room, st, { t: 'lock', locked: true });
  const late = await connect(room, 'player');
  await say(room, late, { t: 'claim', seatId: 's3' });
  assert.equal(late.last('error').code, 'locked');

  // Lukk rommet sletter alt
  await say(room, st, { t: 'close' });
  assert.equal(state.data.size, 0);
  assert.equal(p1.last('closed').t, 'closed');
});

test('rom: falske vekkinger går bare til andre plasser om natten', async () => {
  const room = new Room(fakeState(), {});
  await room.load();
  await room.init({ code: 'ABCDE', stToken: 'secret' });
  const st = await connect(room, 'st', 'secret');
  await say(room, st, { t: 'sync', public: { ...PUB, decoys: true, phase: { type: 'night', number: 1 } }, roleCards: {} });
  const ps = {};
  for (const id of ['s1', 's2', 's3']) { ps[id] = await connect(room, 'player'); await say(room, ps[id], { t: 'claim', seatId: id }); }
  const orig = Math.random;
  Math.random = () => 0.1;
  await say(room, st, { t: 'card', seatId: 's1', card: { id: 'x', kind: 'info', text: 'hei' } });
  Math.random = orig;
  assert.equal(ps.s1.last('decoy'), undefined);
  assert.ok(ps.s2.last('decoy') && ps.s3.last('decoy'));
});

test('rom: drømmespill før start, håndsopprekning og avstemning', async () => {
  const room = new Room(fakeState(), {});
  await room.load();
  await room.init({ code: 'ABCDE', stToken: 'secret' });
  const st = await connect(room, 'st', 'secret');
  const screen = await connect(room, 'screen');
  await say(room, st, { t: 'sync', public: PUB, roleCards: {} });
  const ps = {};
  for (const id of ['s1', 's2', 's3']) { ps[id] = await connect(room, 'player'); await say(room, ps[id], { t: 'claim', seatId: id }); }

  // Drømmespill før spillet starter
  assert.equal(screen.last('board').open, true);
  await say(room, ps.s1, { t: 'score', score: 7 });
  assert.equal(screen.last('board').board[0].score, 7);

  // Hender i rekkefølge; ny håndsopprekning havner nederst
  await say(room, ps.s3, { t: 'hand', up: true });
  await say(room, ps.s1, { t: 'hand', up: true });
  await say(room, ps.s2, { t: 'hand', up: true });
  assert.deepEqual(screen.last('public').hands, ['s3', 's1', 's2']);
  await say(room, st, { t: 'hand', seatId: 's3' });
  assert.deepEqual(st.last('hands').hands, ['s1', 's2']);
  await say(room, ps.s3, { t: 'hand', up: true });
  assert.deepEqual(screen.last('public').hands, ['s1', 's2', 's3']);
  await say(room, ps.s1, { t: 'hand', up: false });
  assert.deepEqual(screen.last('public').hands, ['s2', 's3']);

  // Om natten: ingen hender, køen tømmes ved faseskifte
  await say(room, st, { t: 'sync', public: { ...PUB, phase: { type: 'night', number: 1 } }, roleCards: {} });
  assert.deepEqual(screen.last('public').hands, []);
  await say(room, ps.s1, { t: 'hand', up: true });
  assert.deepEqual(screen.last('public').hands, []);
  assert.equal(screen.last('board').board[0].score, 7, 'rekord fra før start beholdes');

  // Dag: avstemning på elevenes PC-er
  const dead = PUB.seats.map((x) => (x.id === 's3' ? { ...x, alive: false, ghostVote: false } : x));
  await say(room, st, { t: 'sync', public: { ...PUB, seats: dead, phase: { type: 'day', number: 1 } }, roleCards: {} });
  await say(room, ps.s1, { t: 'score', score: 50 });
  assert.equal(screen.last('board').board[0].score, 7, 'ingen drømmespill om dagen');
  await say(room, st, { t: 'voteOpen', vote: { id: 'n1', nominatorId: 's1', nomineeId: 's2', need: 2 } });
  await say(room, ps.s1, { t: 'voteCast', voteId: 'n1', up: true });
  await say(room, ps.s2, { t: 'voteCast', voteId: 'n1', up: true });
  await say(room, ps.s3, { t: 'voteCast', voteId: 'n1', up: true });
  assert.equal(ps.s3.last('error').code, 'noghost', 'død uten ghost vote kan ikke stemme');
  assert.deepEqual(screen.last('public').vote.voters, ['s1', 's2']);
  assert.deepEqual(st.last('vote').vote.voters, ['s1', 's2']);
  await say(room, ps.s2, { t: 'voteCast', voteId: 'n1', up: false });
  assert.deepEqual(st.last('vote').vote.voters, ['s1']);
  await say(room, st, { t: 'voteSet', voters: ['s1', 's2'] });
  await say(room, st, { t: 'voteClose' });
  assert.equal(screen.last('public').vote.open, false);
  await say(room, ps.s2, { t: 'voteCast', voteId: 'n1', up: false });
  assert.deepEqual(screen.last('public').vote.voters, ['s1', 's2'], 'lukket avstemning endres ikke');
  await say(room, st, { t: 'sync', public: { ...PUB, phase: { type: 'night', number: 2 } }, roleCards: {} });
  assert.equal(screen.last('public').vote, null, 'avstemningen forsvinner ved faseskifte');
});

test('rom: avstemningsklokka låser stemmer når viseren når plassen, og timer', async () => {
  const room = new Room(fakeState(), {});
  await room.load();
  await room.init({ code: 'ABCDE', stToken: 'secret' });
  const st = await connect(room, 'st', 'secret');
  const screen = await connect(room, 'screen');
  await say(room, st, { t: 'sync', public: { ...PUB, phase: { type: 'day', number: 1 } }, roleCards: {} });
  const ps = {};
  for (const id of ['s1', 's2', 's3']) { ps[id] = await connect(room, 'player'); await say(room, ps[id], { t: 'claim', seatId: id }); }
  await say(room, st, { t: 'voteOpen', vote: { id: 'n1', nominatorId: 's1', nomineeId: 's2', need: 2 } });
  await say(room, st, { t: 'voteClock', order: ['s3', 's1', 's2', 'bogus'], stepMs: 1000 });
  const clock = screen.last('public').vote.clock;
  assert.deepEqual(clock.order, ['s3', 's1', 's2']);
  assert.equal(clock.stepMs, 1000);
  assert.ok(typeof screen.last('public').now === 'number');
  const realNow = Date.now;
  try {
    // Før start kan alle stemme
    await say(room, ps.s3, { t: 'voteCast', voteId: 'n1', up: true });
    // Viseren har nådd s3 og s1, men ikke s2
    Date.now = () => clock.startAt + 1500;
    await say(room, ps.s1, { t: 'voteCast', voteId: 'n1', up: true });
    assert.equal(ps.s1.last('error').code, 'votelocked');
    await say(room, ps.s3, { t: 'voteCast', voteId: 'n1', up: false });
    assert.equal(ps.s3.last('error').code, 'votelocked', 'kan heller ikke angre etter låsing');
    await say(room, ps.s2, { t: 'voteCast', voteId: 'n1', up: true });
    assert.deepEqual(screen.last('public').vote.voters, ['s3', 's2']);
  } finally { Date.now = realNow; }

  await say(room, st, { t: 'timer', durationMs: 60000, label: 'Tid' });
  const tm = screen.last('public').timer;
  assert.equal(tm.durationMs, 60000);
  assert.ok(tm.endsAt > Date.now());
  await say(room, st, { t: 'timer', durationMs: 0 });
  assert.equal(screen.last('public').timer, null);
  await say(room, st, { t: 'timer', durationMs: 60000 });
  await say(room, st, { t: 'sync', public: { ...PUB, phase: { type: 'night', number: 2 } }, roleCards: {} });
  assert.equal(screen.last('public').timer, null, 'timeren forsvinner ved faseskifte');
});

test('rom: chat med Storytelleren og naboer, Storytelleren leser alt', async () => {
  const room = new Room(fakeState(), {});
  await room.load();
  await room.init({ code: 'ABCDE', stToken: 'secret' });
  const st = await connect(room, 'st', 'secret');
  const seats = [...PUB.seats, { id: 's4', names: ['Ida'], alive: true, ghostVote: true }];
  await say(room, st, { t: 'sync', public: { ...PUB, seats, phase: { type: 'day', number: 1 } }, roleCards: {} });
  const ps = {};
  for (const id of ['s1', 's2', 's3', 's4']) { ps[id] = await connect(room, 'player'); await say(room, ps[id], { t: 'claim', seatId: id }); }
  // Til Storytelleren
  await say(room, ps.s1, { t: 'chat', to: 'st', text: 'Hei ST' });
  assert.equal(st.last('chat').key, 'st|s1');
  assert.equal(ps.s2.last('chat'), undefined, 'andre ser ikke');
  await say(room, st, { t: 'chat', seatId: 's1', text: 'Hei Markus' });
  assert.equal(ps.s1.last('chat').msg.from, 'st');
  // Nabo: s1 sitter ved s2 og s4, ikke s3
  await say(room, ps.s1, { t: 'chat', to: 's2', text: 'Hei nabo' });
  assert.equal(ps.s2.last('chat').msg.text, 'Hei nabo');
  assert.equal(st.last('chat').key, 's1|s2', 'Storytelleren leser nabopraten');
  assert.equal(ps.s3.last('chat'), undefined);
  await say(room, ps.s1, { t: 'chat', to: 's3', text: 'Hemmelig' });
  assert.equal(ps.s1.last('error').code, 'chatnotneighbour');
  // Hvisking er lov om natten også
  await say(room, st, { t: 'sync', public: { ...PUB, seats, phase: { type: 'night', number: 2 } }, roleCards: {} });
  await say(room, ps.s1, { t: 'chat', to: 's4', text: 'psst' });
  assert.equal(ps.s4.last('chat').msg.text, 'psst');
  // Storytelleren kan slå av naboprat, men meldinger til Storytelleren går alltid
  await say(room, st, { t: 'sync', public: { ...PUB, seats, chat: 'off', phase: { type: 'night', number: 2 } }, roleCards: {} });
  await say(room, ps.s1, { t: 'chat', to: 's4', text: 'psst2' });
  assert.equal(ps.s1.last('error').code, 'chatclosed');
  await say(room, ps.s1, { t: 'chat', to: 'st', text: 'Natt' });
  assert.equal(st.last('chat').msg.text, 'Natt');
  // Gjenoppkobling gir historikken
  const again = await connect(room, 'player');
  await say(room, again, { t: 'resume', seatId: 's1', token: ps.s1.last('you').token });
  assert.deepEqual(Object.keys(again.last('you').chats).sort(), ['s1|s2', 's1|s4', 'st|s1']);
  assert.equal(again.last('you').chats['st|s1'].length, 3);
  const st2 = await connect(room, 'st', 'secret');
  assert.equal(Object.keys(st2.sent[0].chats).length, 3);
});

test('rom: låst rom slipper bare inn på ledig Traveller-plass, og stemmevekter lagres', async () => {
  const room = new Room(fakeState(), {});
  await room.load();
  await room.init({ code: 'ABCDE', stToken: 'secret' });
  const st = await connect(room, 'st', 'secret');
  const seats = [...PUB.seats, { id: 't1', names: ['Ida'], alive: true, ghostVote: true, traveller: { name: 'Thief', icon: '🦝' } }];
  await say(room, st, { t: 'sync', public: { ...PUB, seats, phase: { type: 'day', number: 1 } }, roleCards: {} });
  await say(room, st, { t: 'lock', locked: true });
  const a = await connect(room, 'player');
  await say(room, a, { t: 'claim', seatId: 's1' });
  assert.equal(a.last('error').code, 'locked');
  await say(room, a, { t: 'claim', seatId: 't1' });
  assert.ok(a.last('you'), 'Traveller-plassen kan tas selv om rommet er låst');
  const b = await connect(room, 'player');
  await say(room, b, { t: 'claim', seatId: 't1' });
  assert.equal(b.last('error').code, 'locked', 'men bare én gang');
  await say(room, st, { t: 'voteOpen', vote: { id: 'n1', nominatorId: 's1', nomineeId: 's2', need: 2, weights: { s3: 3, t1: -1, x: 'y', s1: 99 } } });
  assert.deepEqual(st.last('vote').vote.weights, { s3: 3, t1: -1 });
});

test('rom: drømmemestere avsløres steg for steg og nullstilles ved faseskifte', async () => {
  const room = new Room(fakeState(), {});
  await room.load();
  await room.init({ code: 'ABCDE', stToken: 'secret' });
  const st = await connect(room, 'st', 'secret');
  const screen = await connect(room, 'screen');
  await say(room, st, { t: 'sync', public: { ...PUB, phase: { type: 'ended', number: 2 }, reveal: [] }, roleCards: {} });
  await say(room, st, { t: 'dreamReveal', step: 2 });
  assert.equal(screen.last('public').dreamReveal, 2);
  await say(room, st, { t: 'dreamReveal', step: 9 });
  assert.equal(screen.last('public').dreamReveal, 3);
  await say(room, st, { t: 'sync', public: { ...PUB, phase: { type: 'setup', number: 0 } }, roleCards: {} });
  assert.equal(screen.last('public').dreamReveal, 0);
});

test('rom: roller som vekkes får sjeldnere falske vekkinger', async () => {
  const room = new Room(fakeState(), {});
  await room.load();
  await room.init({ code: 'ABCDE', stToken: 'secret' });
  const st = await connect(room, 'st', 'secret');
  await say(room, st, { t: 'sync', public: { ...PUB, decoys: true, phase: { type: 'night', number: 1 } }, roleCards: { s2: { character: 'Empath', team: 'townsfolk', wakes: true, text: '' }, s3: { character: 'Saint', team: 'outsider', wakes: false, text: '' } } });
  const ps = {};
  for (const id of ['s1', 's2', 's3']) { ps[id] = await connect(room, 'player'); await say(room, ps[id], { t: 'claim', seatId: id }); }
  const orig = Math.random;
  Math.random = () => 0.2; // over 0.12, under 0.35
  await say(room, st, { t: 'card', seatId: 's1', card: { id: 'x', kind: 'info', text: 'hei' } });
  Math.random = orig;
  assert.equal(ps.s2.last('decoy'), undefined, 'Empath (vekkes) får ikke');
  assert.ok(ps.s3.last('decoy'), 'Saint (vekkes ikke) får');
});

test('rom: nominasjonsforslag havner i håndskøen og kan slås av', async () => {
  const room = new Room(fakeState(), {});
  await room.load();
  await room.init({ code: 'ABCDE', stToken: 'secret' });
  const st = await connect(room, 'st', 'secret');
  const seats = PUB.seats.map((x) => (x.id === 's3' ? { ...x, alive: false } : x));
  await say(room, st, { t: 'sync', public: { ...PUB, seats, phase: { type: 'day', number: 1 } }, roleCards: {} });
  const ps = {};
  for (const id of ['s1', 's2', 's3']) { ps[id] = await connect(room, 'player'); await say(room, ps[id], { t: 'claim', seatId: id }); }
  await say(room, ps.s1, { t: 'nomPropose', nomineeId: 's2' });
  assert.deepEqual(st.last('hands').hands, ['s1']);
  assert.deepEqual(st.last('hands').proposals, { s1: 's2' });
  assert.equal(ps.s1.last('myProposal').nomineeId, 's2');
  await say(room, ps.s3, { t: 'nomPropose', nomineeId: 's1' });
  assert.equal(ps.s3.last('error').code, 'nomprop', 'døde kan ikke nominere');
  // Storytelleren godkjenner/fjerner fra køen → forslaget forsvinner
  await say(room, st, { t: 'hand', seatId: 's1' });
  assert.deepEqual(st.last('hands').proposals, {});
  assert.equal(ps.s1.last('myProposal').nomineeId, null);
  // Slått av
  await say(room, st, { t: 'sync', public: { ...PUB, seats, nomProps: false, phase: { type: 'day', number: 1 } }, roleCards: {} });
  await say(room, ps.s2, { t: 'nomPropose', nomineeId: 's1' });
  assert.equal(ps.s2.last('error').code, 'nomprop');
});

test('rom: elevenes sau (look) vises for alle, renses og fjernes når plassen frigjøres', async () => {
  const room = new Room(fakeState(), {});
  await room.load();
  await room.init({ code: 'ABCDE', stToken: 'secret' });
  const st = await connect(room, 'st', 'secret');
  const screen = await connect(room, 'screen');
  await say(room, st, { t: 'sync', public: PUB, roleCards: {} });
  const anon = await connect(room, 'player');
  await say(room, anon, { t: 'look', look: { color: 'gold' } });
  assert.deepEqual(screen.last('public').looks, {}, 'uten plass blir ingen sau lagret');
  const p1 = await connect(room, 'player');
  await say(room, p1, { t: 'claim', seatId: 's1' });
  await say(room, p1, { t: 'look', look: { color: 'gold', face: 'shades', hat: '<script>', pet: 'dragon', extra: 'x' } });
  const looks = screen.last('public').looks;
  assert.deepEqual(looks.s1, { color: 'gold', face: 'shades', hat: '', shoes: '', trail: '', pet: 'dragon' });
  assert.deepEqual(st.last('looks').looks.s1.color, 'gold');
  await say(room, st, { t: 'release', seatId: 's1' });
  assert.equal(screen.last('public').looks.s1, undefined);
});

test('rom: vinnerlaget og butikk-bryteren går gjennom til elevene', async () => {
  const room = new Room(fakeState(), {});
  await room.load();
  await room.init({ code: 'ABCDE', stToken: 'secret' });
  const st = await connect(room, 'st', 'secret');
  const screen = await connect(room, 'screen');
  await say(room, st, { t: 'sync', public: { ...PUB, phase: { type: 'ended', number: 2 }, shop: false, winners: ['s1', 's3'] }, roleCards: {} });
  const pub = screen.last('public').public;
  assert.equal(pub.shop, false);
  assert.deepEqual(pub.winners, ['s1', 's3']);
});
