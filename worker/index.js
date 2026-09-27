// Cloudflare Worker: statiske filer fra ./public + API for live-rom.
//   POST /api/rooms                      → oppretter rom, gir { code, stToken }
//   GET  /api/rooms/CODE/ws?role=…       → WebSocket til rommet (st | screen | player)

import { Room } from './room.js';

export { Room };

const ST_KEY = '3131';

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function roomCode() {
  const b = new Uint8Array(5);
  crypto.getRandomValues(b);
  return [...b].map((x) => ALPHA[x % ALPHA.length]).join('');
}

function secret() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      // Bare Storytelleren (med passordet) kan opprette rom.
      if (request.headers.get('X-Botc-Key') !== ST_KEY) return Response.json({ error: 'key' }, { status: 403 });
      for (let i = 0; i < 6; i++) {
        const code = roomCode();
        const stToken = secret();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        const res = await stub.fetch(new Request('https://room/init', { method: 'POST', body: JSON.stringify({ code, stToken }) }));
        if (res.status === 200) return Response.json({ code, stToken }, { headers: { 'Cache-Control': 'no-store' } });
      }
      return Response.json({ error: 'busy' }, { status: 503 });
    }

    const m = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{4,8})\/ws$/);
    if (m) {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
      return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(request);
    }

    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
