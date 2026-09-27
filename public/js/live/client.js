// Felles WebSocket-klient for Storyteller, elev og storskjerm. Kobler til på nytt automatisk.

import { qrcode } from '../../vendor/qrcode.mjs';

export function liveUrl(code, params = {}) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/api/rooms/${encodeURIComponent(code)}/ws?${new URLSearchParams(params)}`;
}

export function joinUrl(code) {
  return `${location.origin}/play?room=${encodeURIComponent(code)}`;
}

export function screenUrl(code) {
  return `${location.origin}/screen?room=${encodeURIComponent(code)}`;
}

export async function createRoom(key = '') {
  const res = await fetch('/api/rooms', { method: 'POST', headers: { 'X-Botc-Key': key } });
  if (!res.ok) throw new Error('create ' + res.status);
  return res.json();
}

const FATAL = new Set([4003, 4004, 4010]);

export class LiveClient {
  constructor({ code, params, onMessage, onStatus, onOpen }) {
    this.code = code;
    this.params = params;
    this.onMessage = onMessage || (() => {});
    this.onStatus = onStatus || (() => {});
    this.onOpen = onOpen || (() => {});
    this.queue = [];
    this.delay = 500;
    this.stopped = false;
    this.status = 'connecting';
    this.connect();
    this.onVisible = () => { if (document.visibilityState === 'visible' && this.status !== 'open' && !this.stopped) this.reconnectNow(); };
    document.addEventListener('visibilitychange', this.onVisible);
  }

  setStatus(s) {
    this.status = s;
    this.onStatus(s);
  }

  connect() {
    clearTimeout(this.retryTimer);
    let ws;
    try { ws = new WebSocket(liveUrl(this.code, this.params)); } catch { this.retry(); return; }
    this.ws = ws;
    ws.onopen = () => {
      this.delay = 500;
      this.setStatus('open');
      this.onOpen();
      const q = this.queue;
      this.queue = [];
      q.forEach((m) => this.send(m));
      clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => {
        if (ws.readyState !== 1) return;
        this.awaitingPong = Date.now();
        ws.send('{"t":"ping"}');
        setTimeout(() => { if (this.awaitingPong && Date.now() - this.awaitingPong >= 9000 && this.ws === ws) { try { ws.close(); } catch { /* */ } } }, 10000);
      }, 30000);
    };
    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.t === 'pong') { this.awaitingPong = 0; return; }
      this.onMessage(msg);
    };
    ws.onclose = (e) => {
      clearInterval(this.pingTimer);
      if (this.ws !== ws) return;
      if (this.stopped) { this.setStatus('closed'); return; }
      if (FATAL.has(e.code)) { this.setStatus('dead'); return; }
      this.retry();
    };
  }

  retry() {
    if (this.stopped) return;
    this.setStatus('reconnecting');
    this.retryTimer = setTimeout(() => this.connect(), this.delay);
    this.delay = Math.min(8000, this.delay * 1.8);
  }

  reconnectNow() {
    this.delay = 500;
    try { if (this.ws) { this.ws.onclose = null; this.ws.close(); } } catch { /* */ }
    this.connect();
  }

  send(obj) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj));
    else if (this.queue.length < 200) this.queue.push(obj);
  }

  close() {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    clearInterval(this.pingTimer);
    document.removeEventListener('visibilitychange', this.onVisible);
    try { this.ws.close(1000, 'bye'); } catch { /* */ }
  }
}

// QR-kode som SVG (selvhostet bibliotek, MIT).
export function qrSvg(text, { size = 220, dark = '#15121c', light = '#ffffff' } = {}) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const q = 2;
  let path = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c + q},${r + q}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + q * 2} ${n + q * 2}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="QR"><rect width="100%" height="100%" fill="${light}"/><path d="${path}" fill="${dark}"/></svg>`;
}
