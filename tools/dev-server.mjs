// Lokal utviklingsserver uten avhengigheter: serverer public/ og kjører samme Room-klasse
// som Cloudflare, med en enkel WebSocket-implementasjon og en falsk Durable Object-kontekst.
// Bruk: node tools/dev-server.mjs [port]   →  http://localhost:8787
import http from 'node:http';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Room } from '../worker/room.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const port = Number(process.argv[2]) || 8787;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff': 'font/woff', '.json': 'application/json', '.txt': 'text/plain' };

// ——— falsk Durable Object-kontekst ———
function fakeState() {
  const data = new Map();
  const sockets = [];
  return {
    storage: {
      async get(k) { return data.has(k) ? structuredClone(data.get(k)) : undefined; },
      async put(k, v) { data.set(k, structuredClone(v)); },
      async delete(k) { data.delete(k); },
      async deleteAll() { data.clear(); },
      async setAlarm() {},
      async deleteAlarm() {},
    },
    acceptWebSocket(ws, tags) { sockets.push({ ws, tags }); ws._state = this; },
    getWebSockets(tag) { return sockets.filter((x) => (!tag || x.tags.includes(tag)) && x.ws.readyState === 1).map((x) => x.ws); },
    _sockets: sockets,
  };
}
const rooms = new Map(); // code -> { room, state }
function getRoom(code) {
  if (!rooms.has(code)) {
    const state = fakeState();
    rooms.set(code, { room: new Room(state, {}), state });
  }
  return rooms.get(code);
}

// ——— minimal WebSocket (RFC 6455, bare tekst) ———
class NodeWS {
  constructor(socket) {
    this.socket = socket;
    this.readyState = 1;
    this.attachment = null;
    this.buf = Buffer.alloc(0);
    this.onmessage = null;
    this.onclose = null;
    socket.on('data', (d) => this.onData(d));
    socket.on('close', () => this.finish(1006, ''));
    socket.on('error', () => this.finish(1006, ''));
  }
  serializeAttachment(v) { this.attachment = structuredClone(v); }
  deserializeAttachment() { return this.attachment ? structuredClone(this.attachment) : null; }
  send(text) {
    if (this.readyState !== 1) throw new Error('closed');
    const payload = Buffer.from(String(text));
    let header;
    if (payload.length < 126) header = Buffer.from([0x81, payload.length]);
    else if (payload.length < 65536) { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 126; header.writeUInt16BE(payload.length, 2); }
    else { header = Buffer.alloc(10); header[0] = 0x81; header[1] = 127; header.writeBigUInt64BE(BigInt(payload.length), 2); }
    this.socket.write(Buffer.concat([header, payload]));
  }
  close(code = 1000, reason = '') {
    if (this.readyState !== 1) return;
    const r = Buffer.from(String(reason).slice(0, 100));
    const p = Buffer.alloc(2 + r.length);
    p.writeUInt16BE(code, 0);
    r.copy(p, 2);
    try { this.socket.write(Buffer.concat([Buffer.from([0x88, p.length]), p])); } catch { /* */ }
    this.readyState = 3;
    setTimeout(() => this.socket.destroy(), 50);
  }
  finish(code, reason) {
    if (this.readyState === 3 && this._closedNotified) return;
    this.readyState = 3;
    if (!this._closedNotified) { this._closedNotified = true; if (this.onclose) this.onclose(code, reason); }
  }
  onData(d) {
    this.buf = Buffer.concat([this.buf, d]);
    while (this.buf.length >= 2) {
      const op = this.buf[0] & 0x0f;
      let len = this.buf[1] & 0x7f;
      let off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      const masked = (this.buf[1] & 0x80) !== 0;
      const need = off + (masked ? 4 : 0) + len;
      if (this.buf.length < need) return;
      let payload = this.buf.subarray(off + (masked ? 4 : 0), need);
      if (masked) {
        const mask = this.buf.subarray(off, off + 4);
        payload = Buffer.from(payload.map((b, i) => b ^ mask[i % 4]));
      }
      this.buf = this.buf.subarray(need);
      if (op === 0x1 && this.onmessage) this.onmessage(payload.toString('utf8'));
      else if (op === 0x8) { this.close(1000, ''); this.finish(1000, ''); }
      else if (op === 0x9) this.socket.write(Buffer.concat([Buffer.from([0x8a, payload.length]), payload]));
    }
  }
}

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rand = (n, a) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (x) => a[x % a.length]).join('');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/rooms' && req.method === 'POST') {
    if (req.headers['x-botc-key'] !== '3131') { res.writeHead(403, { 'Content-Type': 'application/json' }); res.end('{"error":"key"}'); return; }
    const code = rand(5, ALPHA);
    const stToken = rand(32, '0123456789abcdef');
    const r = await getRoom(code).room.init({ code, stToken });
    res.writeHead(r.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code, stToken }));
    return;
  }
  let path = decodeURIComponent(url.pathname);
  if (path.endsWith('/')) path += 'index.html';
  else if (!extname(path)) path += '.html'; // som Cloudflare: /play → play.html
  const file = join(pub, path);
  if (!file.startsWith(pub)) { res.writeHead(403); res.end(); return; }
  try {
    const st = await stat(file);
    if (!st.isFile()) throw new Error('dir');
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});

server.on('upgrade', async (req, socket) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const m = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{4,8})\/ws$/);
  if (!m) { socket.destroy(); return; }
  const accept = createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  const ws = new NodeWS(socket);
  const { room } = getRoom(m[1]);
  await room.load();
  const safe = (p) => Promise.resolve(p).catch((e) => console.error('room error:', e));
  ws.onmessage = (text) => safe(room.webSocketMessage(ws, text));
  ws.onclose = (code, reason) => safe(room.webSocketClose(ws, code, reason, false));
  await safe(room.accept(ws, room.authorize(url)));
});

server.listen(port, () => console.log(`Botc Helper dev: http://localhost:${port}`));
