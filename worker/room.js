// Ett spillrom (Cloudflare Durable Object).
//
// Rommet holder BARE det elever og storskjerm skal se:
//   - offentlig tilstand (fase, plasser, levende/døde, kunngjøring)
//   - per plass: rollekort og innboks med kort Storytelleren har sendt
//   - toppliste for drømmespillet i natt
// Grimoiren og hendelsesloggen blir liggende i Storytellerens nettleser.
// Rommet slettes når Storytelleren lukker det, eller etter 12 timer uten aktivitet.

const IDLE_MS = 12 * 60 * 60 * 1000;
const MAX_INBOX = 80;
const MAX_CHAT = 200;
const CHAT_LEN = 500;

function token() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function str(v, max) {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function send(ws, obj) {
  try { ws.send(JSON.stringify(obj)); } catch { /* lukket */ }
}

function cleanPublic(p) {
  if (!p || typeof p !== 'object') return null;
  const phase = p.phase && typeof p.phase === 'object' ? { type: str(p.phase.type, 12), number: Number(p.phase.number) || 0 } : { type: 'setup', number: 0 };
  const seats = Array.isArray(p.seats) ? p.seats.slice(0, 30).map((x) => ({
    id: str(x.id, 80),
    names: Array.isArray(x.names) ? x.names.slice(0, 3).map((n) => str(n, 40)) : [],
    alive: x.alive !== false,
    ghostVote: x.ghostVote !== false,
    ...(x.traveller && typeof x.traveller === 'object' ? { traveller: { name: str(x.traveller.name, 40), icon: str(x.traveller.icon, 16) } } : {}),
  })) : [];
  const out = {
    title: str(p.title, 80),
    lang: p.lang === 'en' ? 'en' : 'no',
    phase,
    seats,
    announcement: str(p.announcement, 600),
    dream: p.dream !== false,
    decoys: p.decoys !== false,
    winner: p.winner === 'good' || p.winner === 'evil' ? p.winner : null,
    chat: p.chat === 'off' ? 'off' : 'always',
    rolesOut: p.rolesOut !== false,
    script: p.script && Array.isArray(p.script.roles) ? {
      name: str(p.script.name, 80),
      roles: p.script.roles.slice(0, 60).map((r) => ({ id: str(r.id, 40), name: str(r.name, 40), team: str(r.team, 12), icon: str(r.icon, 16), text: str(r.text, 500) })),
    } : null,
    dawnPending: !!p.dawnPending,
  };
  if (phase.type === 'day' && p.day && typeof p.day === 'object') {
    const ids = (a) => (Array.isArray(a) ? a.slice(0, 30).map((x) => str(x, 80)) : []);
    out.day = {
      need: Number(p.day.need) || 0,
      nominations: (Array.isArray(p.day.nominations) ? p.day.nominations.slice(0, 30) : []).map((n) => ({
        id: str(n.id, 80), nominatorId: str(n.nominatorId, 80), nomineeId: str(n.nomineeId, 80), votes: Number(n.votes) || 0, voters: ids(n.voters),
      })),
      block: p.day.block ? { nomineeId: str(p.day.block.nomineeId, 80), votes: Number(p.day.block.votes) || 0 } : null,
      tie: !!p.day.tie,
      executed: p.day.executed ? str(p.day.executed, 80) : null,
      shots: (Array.isArray(p.day.shots) ? p.day.shots.slice(-10) : []).map((x) => ({ id: str(x.id, 40), from: str(x.from, 80), to: str(x.to, 80), hit: !!x.hit })),
    };
  }
  if (phase.type === 'ended' && Array.isArray(p.reveal)) {
    out.reveal = p.reveal.slice(0, 30).map((r) => ({
      seatId: str(r.seatId, 80), character: str(r.character, 40), team: str(r.team, 12),
      alignment: r.alignment === 'evil' ? 'evil' : 'good', shown: r.shown ? str(r.shown, 40) : null, icon: str(r.icon, 16),
    }));
  }
  return out;
}

// Bureaucrat/Thief: noen stemmer teller 3 eller negativt
function cleanWeights(w) {
  const out = {};
  if (!w || typeof w !== 'object') return out;
  for (const [k, v] of Object.entries(w).slice(0, 30)) { const n = Math.round(Number(v)); if (n && n >= -3 && n <= 3 && n !== 1) out[str(k, 80)] = n; }
  return out;
}

function cleanCard(c) {
  if (!c || typeof c !== 'object' || !c.id) return null;
  const card = { id: str(c.id, 120), kind: c.kind === 'choice' ? 'choice' : 'info', text: str(c.text, 3000), status: 'new', sentAt: Date.now() };
  if (c.grim && Array.isArray(c.grim.seats)) {
    // Spy: strukturert grimoire (sendes bare til Spy-eleven)
    card.grim = {
      night: Number(c.grim.night) || 0,
      seats: c.grim.seats.slice(0, 30).map((x) => ({
        name: str(x.name, 60), character: str(x.character, 40), icon: str(x.icon, 16), team: str(x.team, 12), alive: x.alive !== false,
        shown: x.shown ? str(x.shown, 40) : null, reminders: (Array.isArray(x.reminders) ? x.reminders.slice(0, 4) : []).map((r) => str(r, 30)),
      })),
    };
  }
  if (card.kind === 'choice') {
    const ch = c.choice || {};
    card.choice = { count: Math.max(1, Math.min(3, Number(ch.count) || 1)), allowSelf: !!ch.allowSelf };
  }
  return card;
}

export class Room {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.room = undefined;
    this.board = undefined;
    this.seats = {};
    this.chats = {};
    // Ping/pong uten å vekke rommet (sparer kvote på Cloudflare).
    if (typeof WebSocketRequestResponsePair !== 'undefined' && state.setWebSocketAutoResponse) {
      state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}'));
    }
  }

  // ——— lagring ———
  async load() {
    if (this.room !== undefined) return;
    this.room = (await this.state.storage.get('room')) || null;
    this.board = (await this.state.storage.get('board')) || { scores: {} };
  }
  async seat(id) {
    if (!this.seats[id]) this.seats[id] = (await this.state.storage.get('seat:' + id)) || { roleCard: null, inbox: [] };
    return this.seats[id];
  }
  // Chat: én tråd per par. «st|s1» er eleven og Storytelleren, «s1|s2» er to naboer.
  async chat(key) {
    if (!this.chats[key]) this.chats[key] = (await this.state.storage.get('chat:' + key)) || [];
    return this.chats[key];
  }
  async addChat(key, from, text) {
    const list = await this.chat(key);
    const msg = { id: token().slice(0, 12), from, text, at: Date.now() };
    list.push(msg);
    if (list.length > MAX_CHAT) list.splice(0, list.length - MAX_CHAT);
    await this.state.storage.put('chat:' + key, list);
    if (!(this.room.chatKeys || []).includes(key)) { this.room.chatKeys = [...(this.room.chatKeys || []), key]; await this.saveRoom(); }
    return msg;
  }
  neighbours(seatId) {
    const seats = this.room.public.seats;
    const n = seats.length;
    const i = seats.findIndex((x) => x.id === seatId);
    if (i < 0 || n < 2) return [];
    return [...new Set([seats[(i - 1 + n) % n].id, seats[(i + 1) % n].id])].filter((x) => x !== seatId);
  }
  // Hvisking til naboene er lov hele tiden, også om natten. Storytelleren kan slå det av.
  neighbourChatOpen() {
    return this.room.public.chat !== 'off';
  }
  async chatsFor(seatId) {
    const out = {};
    for (const key of this.room.chatKeys || []) {
      const [a, b] = key.split('|');
      if (a === seatId || b === seatId) out[key] = await this.chat(key);
    }
    return out;
  }
  async saveSeat(id) { await this.state.storage.put('seat:' + id, this.seats[id]); }
  async saveRoom() {
    this.room.lastActivity = Date.now();
    await this.state.storage.put('room', this.room);
  }
  async touchAlarm() {
    try { await this.state.storage.setAlarm(Date.now() + IDLE_MS); } catch { /* */ }
  }

  // ——— HTTP ———
  async fetch(request) {
    const url = new URL(request.url);
    await this.load();
    if (url.pathname.endsWith('/init') && request.method === 'POST') {
      const body = await request.json();
      return this.init(body);
    }
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
    const meta = this.authorize(url);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    await this.accept(server, meta);
    return new Response(null, { status: 101, webSocket: client });
  }

  async init({ code, stToken }) {
    if (this.room) return new Response('exists', { status: 409 });
    this.room = {
      code: str(code, 10), stToken: str(stToken, 64), createdAt: Date.now(), lastActivity: Date.now(),
      locked: false, claims: {}, hands: [],
      public: { title: '', lang: 'no', phase: { type: 'setup', number: 0 }, seats: [], announcement: '', dream: true, decoys: true, winner: null },
    };
    this.board = { scores: {} };
    await this.saveRoom();
    await this.touchAlarm();
    return new Response('ok');
  }

  authorize(url) {
    const role = url.searchParams.get('role');
    if (!this.room) return { role: 'none', error: 'noroom' };
    if (role === 'st') return url.searchParams.get('token') === this.room.stToken ? { role: 'st' } : { role: 'none', error: 'auth' };
    if (role === 'screen') return { role: 'screen' };
    return { role: 'player', seatId: null };
  }

  async accept(ws, meta) {
    const tag = ['st', 'screen', 'player'].includes(meta.role) ? meta.role : 'none';
    this.state.acceptWebSocket(ws, [tag]);
    ws.serializeAttachment({ role: meta.role, seatId: null });
    if (meta.error) {
      send(ws, { t: 'error', code: meta.error });
      try { ws.close(4000 + (meta.error === 'auth' ? 3 : 4), meta.error); } catch { /* */ }
      return;
    }
    if (meta.role === 'st') send(ws, await this.helloForSt());
    else send(ws, this.publicMsg());
    if (meta.role === 'screen' || meta.role === 'player') send(ws, this.boardMsg());
  }

  // ——— utsendinger ———
  claimedCount() {
    const out = {};
    for (const [id, list] of Object.entries(this.room.claims)) out[id] = list.length;
    return out;
  }
  sockets(tag) {
    return this.state.getWebSockets(tag).filter((ws) => ws.readyState === undefined || ws.readyState === 1);
  }
  playersOf(seatId, except = null) {
    return this.sockets('player').filter((ws) => ws !== except && (ws.deserializeAttachment() || {}).seatId === seatId);
  }
  onlineCount(except = null) {
    const out = {};
    for (const ws of this.sockets('player')) {
      if (ws === except) continue;
      const a = ws.deserializeAttachment() || {};
      if (a.seatId) out[a.seatId] = (out[a.seatId] || 0) + 1;
    }
    return out;
  }
  publicMsg() {
    return { t: 'public', room: { code: this.room.code, locked: this.room.locked }, public: this.room.public, claimed: this.claimedCount(), hands: this.room.hands || [], vote: this.room.vote || null, timer: this.room.timer || null, dreamReveal: this.room.dreamReveal || 0, now: Date.now() };
  }
  boardMsg() {
    const names = Object.fromEntries(this.room.public.seats.map((x) => [x.id, x.names.join(' + ')]));
    const list = Object.entries(this.board.scores).map(([seatId, score]) => ({ seatId, name: names[seatId] || '?', score }))
      .sort((a, b) => b.score - a.score).slice(0, 15);
    return { t: 'board', open: this.dreamOpen(), board: list };
  }
  // Drømmespillet er åpent før spillet starter og om natten. Rekordene gjelder hele spillrunden.
  dreamOpen() {
    const p = this.room.public;
    return (p.phase.type === 'night' || p.phase.type === 'setup') && p.dream !== false;
  }
  handsAllowed() {
    const t = this.room.public.phase.type;
    return t === 'setup' || t === 'day';
  }
  broadcastVote() {
    this.broadcastPublic();
    this.toSt({ t: 'vote', vote: this.room.vote || null, now: Date.now() });
  }
  // Når viseren når en plass, er stemmen låst (litt slingringsmonn for nettverket).
  voteLocked(v, seatId) {
    const c = v && v.clock;
    if (!c) return false;
    const i = c.order.indexOf(seatId);
    if (i < 0) return false;
    return Date.now() > c.startAt + i * c.stepMs + 250;
  }
  validVoters(list) {
    const ok = new Set(this.room.public.seats.map((x) => x.id));
    return [...new Set((Array.isArray(list) ? list : []).map((x) => str(x, 80)).filter((x) => ok.has(x)))];
  }
  broadcastHands() {
    this.broadcastPublic();
    this.toSt({ t: 'hands', hands: this.room.hands || [] });
  }
  broadcastPublic() {
    const m = this.publicMsg();
    for (const ws of [...this.sockets('player'), ...this.sockets('screen')]) send(ws, m);
  }
  broadcastBoard() {
    const m = this.boardMsg();
    for (const ws of [...this.sockets('player'), ...this.sockets('screen'), ...this.sockets('st')]) send(ws, m);
  }
  toSt(obj) {
    for (const ws of this.sockets('st')) send(ws, obj);
  }
  pushPresence(except = null) {
    this.toSt({ t: 'presence', claimed: this.claimedCount(), online: this.onlineCount(except) });
  }
  async helloForSt() {
    const cards = {};
    for (const s of this.room.public.seats) {
      const seat = await this.seat(s.id);
      cards[s.id] = seat.inbox.map((c) => ({ id: c.id, status: c.status, response: c.response || null }));
    }
    const chats = {};
    for (const key of this.room.chatKeys || []) chats[key] = await this.chat(key);
    return { t: 'hello', chats, room: { code: this.room.code, locked: this.room.locked }, claimed: this.claimedCount(), online: this.onlineCount(), cards, hands: this.room.hands || [], vote: this.room.vote || null };
  }
  async youMsg(seatId, tok) {
    const seat = await this.seat(seatId);
    return { t: 'you', seatId, token: tok, roleCard: seat.roleCard, inbox: seat.inbox, chats: await this.chatsFor(seatId) };
  }

  // ——— meldinger ———
  // Falske vekkinger: når noen får et kort om natten, får tilfeldige andre et likt kort
  // som bare sier «ingenting skjer». Da kan ikke sidemannen se hvem som faktisk ble vekket.
  maybeDecoys(exceptSeat) {
    const p = this.room.public;
    if (p.phase.type !== 'night' || p.decoys === false) return;
    const now = Date.now();
    this.decoyAt = this.decoyAt || {};
    for (const seat of p.seats) {
      if (seat.id === exceptSeat || !(this.room.claims[seat.id] || []).length) continue;
      if (now - (this.decoyAt[seat.id] || 0) < 45000 || Math.random() > 0.35) continue;
      this.decoyAt[seat.id] = now;
      for (const ws of this.playersOf(seat.id)) send(ws, { t: 'decoy', id: 'decoy-' + now + '-' + seat.id });
    }
  }

  async webSocketMessage(ws, raw) {
    await this.load();
    if (!this.room) { send(ws, { t: 'error', code: 'noroom' }); try { ws.close(4004, 'noroom'); } catch { /* */ } return; }
    let msg;
    try { msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)); } catch { return; }
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'ping') { send(ws, { t: 'pong' }); return; }
    const meta = ws.deserializeAttachment() || {};
    if (meta.role === 'st') await this.onSt(ws, msg);
    else if (meta.role === 'player') await this.onPlayer(ws, meta, msg);
  }

  async webSocketClose(ws, code, reason) {
    try { ws.close(code, reason); } catch { /* */ }
    await this.load();
    if (!this.room) return;
    const meta = ws.deserializeAttachment() || {};
    if (meta.role === 'player' && meta.seatId) this.pushPresence(ws);
  }

  async webSocketError(ws) {
    await this.webSocketClose(ws, 1011, 'error');
  }

  async onSt(ws, msg) {
    const r = this.room;
    switch (msg.t) {
      case 'sync': {
        const pub = cleanPublic(msg.public);
        if (!pub) return;
        const before = r.public.phase;
        r.public = pub;
        const phaseChanged = before.type !== pub.phase.type || before.number !== pub.phase.number;
        if (phaseChanged && (r.hands || []).length) { r.hands = []; this.toSt({ t: 'hands', hands: [] }); }
        if (phaseChanged && r.vote) { r.vote = null; this.toSt({ t: 'vote', vote: null, now: Date.now() }); }
        if (phaseChanged) { r.timer = null; r.dreamReveal = 0; }
        await this.saveRoom();
        for (const [seatId, card] of Object.entries(msg.roleCards || {})) {
          if (!r.public.seats.some((x) => x.id === seatId)) continue;
          const seat = await this.seat(seatId);
          const next = card ? { character: str(card.character, 40), team: str(card.team, 12), icon: str(card.icon, 16), text: str(card.text, 2000) } : null;
          if (JSON.stringify(seat.roleCard) !== JSON.stringify(next)) {
            seat.roleCard = next;
            await this.saveSeat(seatId);
            for (const p of this.playersOf(seatId)) send(p, { t: 'role', roleCard: next });
          }
        }
        this.broadcastPublic();
        if (phaseChanged) this.broadcastBoard();
        await this.touchAlarm();
        break;
      }
      case 'card': {
        const card = cleanCard(msg.card);
        const seatId = str(msg.seatId, 80);
        if (!card || !r.public.seats.some((x) => x.id === seatId)) { send(ws, { t: 'cardFail', cardId: msg.card && msg.card.id, seatId }); return; }
        const seat = await this.seat(seatId);
        const i = seat.inbox.findIndex((c) => c.id === card.id);
        if (i >= 0) seat.inbox[i] = card; else seat.inbox.push(card);
        if (seat.inbox.length > MAX_INBOX) seat.inbox = seat.inbox.slice(-MAX_INBOX);
        await this.saveSeat(seatId);
        const targets = this.playersOf(seatId);
        for (const p of targets) send(p, { t: 'card', card });
        send(ws, { t: 'cardOk', cardId: card.id, seatId, delivered: targets.length });
        this.maybeDecoys(seatId);
        break;
      }
      case 'lock':
        r.locked = !!msg.locked;
        await this.saveRoom();
        this.broadcastPublic();
        send(ws, { t: 'room', room: { code: r.code, locked: r.locked } });
        break;
      case 'hand': {
        const seatId = str(msg.seatId, 80);
        r.hands = (r.hands || []).filter((x) => x !== seatId);
        await this.saveRoom();
        this.broadcastHands();
        break;
      }
      case 'voteOpen': {
        const v = msg.vote || {};
        r.vote = {
          id: str(v.id, 80), nominatorId: str(v.nominatorId, 80), nomineeId: str(v.nomineeId, 80),
          need: Number(v.need) || 0, open: true, voters: this.validVoters(v.voters),
          tieAt: Number(v.tieAt) > 0 ? Number(v.tieAt) : null, blockId: v.blockId ? str(v.blockId, 80) : null,
          weights: cleanWeights(v.weights),
        };
        await this.saveRoom();
        this.broadcastVote();
        break;
      }
      case 'chat': {
        const seatId = str(msg.seatId, 80);
        const text = str(msg.text, CHAT_LEN).trim();
        if (!text || !r.public.seats.some((x) => x.id === seatId)) return;
        const key = 'st|' + seatId;
        const m = await this.addChat(key, 'st', text);
        for (const p of this.playersOf(seatId)) send(p, { t: 'chat', key, msg: m });
        this.toSt({ t: 'chat', key, msg: m });
        break;
      }
      case 'dreamReveal':
        r.dreamReveal = Math.max(0, Math.min(3, Number(msg.step) || 0));
        await this.saveRoom();
        this.broadcastPublic();
        this.toSt({ t: 'dreamReveal', step: r.dreamReveal });
        break;
      case 'voteClock': {
        // Viseren starter om 3 sekunder og går én plass per stepMs, i rekkefølgen Storytelleren sender.
        if (!r.vote || !r.vote.open) return;
        const order = this.validVoters(msg.order);
        if (!order.length) return;
        const stepMs = Math.max(500, Math.min(6000, Number(msg.stepMs) || 2000));
        r.vote.clock = { order, stepMs, startAt: Date.now() + 3000 };
        await this.saveRoom();
        this.broadcastVote();
        break;
      }
      case 'timer': {
        const ms = Number(msg.durationMs) || 0;
        r.timer = ms > 0 ? { endsAt: Date.now() + Math.min(ms, 3 * 3600000), durationMs: Math.min(ms, 3 * 3600000), label: str(msg.label, 60) } : null;
        await this.saveRoom();
        this.broadcastPublic();
        break;
      }
      case 'voteSet':
        if (!r.vote) return;
        r.vote.voters = this.validVoters(msg.voters);
        await this.saveRoom();
        this.broadcastVote();
        break;
      case 'voteClose':
        if (!r.vote) return;
        r.vote.open = false;
        await this.saveRoom();
        this.broadcastVote();
        break;
      case 'voteClear':
        r.vote = null;
        await this.saveRoom();
        this.broadcastVote();
        break;
      case 'handsClear':
        r.hands = [];
        await this.saveRoom();
        this.broadcastHands();
        break;
      case 'release': {
        const seatId = str(msg.seatId, 80);
        delete r.claims[seatId];
        r.hands = (r.hands || []).filter((x) => x !== seatId);
        await this.saveRoom();
        for (const p of this.playersOf(seatId)) {
          send(p, { t: 'released' });
          p.serializeAttachment({ role: 'player', seatId: null });
        }
        this.broadcastPublic();
        this.pushPresence();
        break;
      }
      case 'close': {
        for (const p of [...this.sockets('player'), ...this.sockets('screen')]) { send(p, { t: 'closed' }); try { p.close(4010, 'closed'); } catch { /* */ } }
        await this.state.storage.deleteAll();
        try { await this.state.storage.deleteAlarm(); } catch { /* */ }
        this.room = null;
        this.seats = {};
        this.chats = {};
        send(ws, { t: 'closed' });
        break;
      }
      default:
        break;
    }
  }

  async onPlayer(ws, meta, msg) {
    const r = this.room;
    switch (msg.t) {
      case 'claim': {
        const seatId = str(msg.seatId, 80);
        const seatPub = r.public.seats.find((x) => x.id === seatId);
        if (!seatPub) { send(ws, { t: 'error', code: 'noseat' }); return; }
        const list = r.claims[seatId] || [];
        // Låst rom: bare en ledig Traveller-plass (elev som kommer sent) kan fortsatt velges.
        if (r.locked && !(seatPub.traveller && !list.length)) { send(ws, { t: 'error', code: 'locked' }); return; }
        if (list.length >= Math.max(1, seatPub.names.length)) { send(ws, { t: 'error', code: 'taken' }); return; }
        const tok = token();
        r.claims[seatId] = [...list, tok];
        await this.saveRoom();
        ws.serializeAttachment({ role: 'player', seatId });
        send(ws, await this.youMsg(seatId, tok));
        this.broadcastPublic();
        this.pushPresence();
        break;
      }
      case 'resume': {
        const seatId = str(msg.seatId, 80);
        if (!(r.claims[seatId] || []).includes(msg.token)) { send(ws, { t: 'error', code: 'badtoken' }); return; }
        ws.serializeAttachment({ role: 'player', seatId });
        send(ws, await this.youMsg(seatId, msg.token));
        this.pushPresence();
        break;
      }
      case 'ack':
      case 'choose': {
        const seatId = meta.seatId;
        if (!seatId) return;
        const seat = await this.seat(seatId);
        const card = seat.inbox.find((c) => c.id === msg.cardId);
        if (!card) return;
        if (msg.t === 'ack') {
          if (card.status === 'new') card.status = 'read';
          await this.saveSeat(seatId);
          this.toSt({ t: 'ack', seatId, cardId: card.id });
        } else {
          const valid = new Set(r.public.seats.map((x) => x.id));
          const choice = (Array.isArray(msg.choice) ? msg.choice : []).map((x) => str(x, 80)).filter((x) => valid.has(x));
          if (!card.choice || !choice.length || choice.length > card.choice.count) { send(ws, { t: 'error', code: 'choice' }); return; }
          card.status = 'answered';
          card.response = choice;
          await this.saveSeat(seatId);
          this.toSt({ t: 'choice', seatId, cardId: card.id, choice });
        }
        for (const p of this.playersOf(seatId)) send(p, { t: 'card', card });
        break;
      }
      case 'chat': {
        // Eleven skriver til Storytelleren eller til en nabo. Storytelleren kan lese alle trådene.
        const seatId = meta.seatId;
        if (!seatId) return;
        const text = str(msg.text, CHAT_LEN).trim();
        if (!text) return;
        const to = str(msg.to, 80);
        let key;
        let targets = [];
        if (to === 'st') key = 'st|' + seatId;
        else {
          if (!this.neighbours(seatId).includes(to)) { send(ws, { t: 'error', code: 'chatnotneighbour' }); return; }
          if (!this.neighbourChatOpen()) { send(ws, { t: 'error', code: 'chatclosed' }); return; }
          key = [seatId, to].sort().join('|');
          targets = this.playersOf(to);
        }
        const m = await this.addChat(key, seatId, text);
        for (const p of [...this.playersOf(seatId), ...targets]) send(p, { t: 'chat', key, msg: m });
        this.toSt({ t: 'chat', key, msg: m });
        break;
      }
      case 'voteCast': {
        // Eleven stemmer på egen PC. Døde kan bare stemme hvis de har ghost vote igjen.
        const seatId = meta.seatId;
        const v = r.vote;
        if (!seatId || !v || !v.open || (msg.voteId && msg.voteId !== v.id)) return;
        const seat = r.public.seats.find((x) => x.id === seatId);
        if (!seat) return;
        if (msg.up && !seat.alive && !seat.ghostVote) { send(ws, { t: 'error', code: 'noghost' }); return; }
        if (this.voteLocked(v, seatId)) { send(ws, { t: 'error', code: 'votelocked' }); return; }
        v.voters = v.voters.filter((x) => x !== seatId);
        if (msg.up) v.voters.push(seatId);
        await this.saveRoom();
        this.broadcastVote();
        break;
      }
      case 'hand': {
        // Rekk opp / ta ned hånden. Ny håndsopprekning havner alltid nederst i køen.
        const seatId = meta.seatId;
        if (!seatId) return;
        const hands = (r.hands || []).filter((x) => x !== seatId);
        if (msg.up && this.handsAllowed()) hands.push(seatId);
        r.hands = hands;
        await this.saveRoom();
        this.broadcastHands();
        break;
      }
      case 'score': {
        const seatId = meta.seatId;
        if (!seatId || !this.dreamOpen()) return;
        const score = Math.max(0, Math.min(99999, Math.floor(Number(msg.score) || 0)));
        if (score > (this.board.scores[seatId] || 0)) {
          this.board.scores[seatId] = score;
          await this.state.storage.put('board', this.board);
          this.broadcastBoard();
        }
        break;
      }
      default:
        break;
    }
  }

  async alarm() {
    await this.load();
    if (!this.room) return;
    if (Date.now() - (this.room.lastActivity || 0) < IDLE_MS - 60000) { await this.touchAlarm(); return; }
    for (const ws of this.state.getWebSockets()) { send(ws, { t: 'closed' }); try { ws.close(4010, 'expired'); } catch { /* */ } }
    await this.state.storage.deleteAll();
    this.room = null;
    this.seats = {};
    this.chats = {};
  }
}
