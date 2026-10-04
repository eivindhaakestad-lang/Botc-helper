// Lommeboka til eleven: mynter, kjøpte ting og sauen.
// Lagres bare på elevens egen PC (localStorage) og følger eleven fra spill til spill på samme PC/nettleser.
// En enkel sjekksum gjør at det ikke holder å endre tallet i nettleseren – da nullstilles mynter og kjøp.
// (En elev med utviklerverktøy og mye tålmodighet kan fortsatt jukse; det er prisen for å slippe innlogging.)

import { item, normLook, randomLook } from '../live/sheep.js';

const KEY = 'botc-sheep-v1';
const SALT = 'blodklokke|ull|v1';
const LOOK_KEYS = ['color', 'face', 'hat', 'shoes', 'trail', 'pet'];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  let h2 = 5381;
  for (let i = str.length - 1; i >= 0; i--) h2 = (Math.imul(h2, 33) ^ str.charCodeAt(i)) >>> 0;
  return (h >>> 0).toString(36) + '.' + h2.toString(36);
}
const sigOf = (d) => hash(`${SALT}|${d.coins}|${d.earned}|${(d.owned || []).join(',')}`);

function fresh() {
  return { v: 1, coins: 0, earned: 0, owned: [], look: randomLook(), created: false, rewards: {} };
}

function read() {
  let d = null;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && raw.v === 1) {
      d = { ...fresh(), ...raw };
      if (raw.sig !== sigOf(raw)) { d.coins = 0; d.earned = 0; d.owned = []; d.tampered = true; }
    }
  } catch { /* */ }
  if (!d) d = fresh();
  d.coins = Math.max(0, Math.floor(Number(d.coins) || 0));
  d.owned = Array.isArray(d.owned) ? d.owned.filter((x) => typeof x === 'string') : [];
  d.look = onlyOwned(d, normLook(d.look));
  return d;
}
function write(d) {
  d.sig = sigOf(d);
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* */ }
}

function ownsIn(d, cat, id) {
  if (!id) return true;
  const it = item(cat, id);
  if (!it) return false;
  return !it.price || d.owned.includes(cat + ':' + id);
}
function onlyOwned(d, look) {
  const out = { ...look };
  for (const k of LOOK_KEYS) {
    if (!ownsIn(d, k, out[k])) out[k] = k === 'color' ? 'white' : k === 'face' ? 'happy' : '';
  }
  return out;
}

// Alle endringer leser først på nytt fra lagringen (to faner skal ikke overskrive hverandre)
export const wallet = {
  get data() { return read(); },
  get coins() { return read().coins; },
  get look() { return read().look; },
  get created() { return read().created; },
  get tampered() { return !!read().tampered; },
  owns(cat, id) { return ownsIn(read(), cat, id); },
  setLook(look) {
    const d = read();
    d.look = onlyOwned(d, normLook({ ...d.look, ...look }));
    d.created = true;
    write(d);
    return d.look;
  },
  // Kjøp: trekker mynter, legger tingen i garderoben og tar den på
  buy(cat, id) {
    const d = read();
    const it = item(cat, id);
    if (!it) return { ok: false, why: 'unknown' };
    if (ownsIn(d, cat, id)) return { ok: true, already: true };
    if (d.coins < it.price) return { ok: false, why: 'coins', missing: it.price - d.coins };
    d.coins -= it.price;
    d.owned.push(cat + ':' + id);
    d.look = onlyOwned(d, { ...d.look, [cat]: id });
    d.created = true;
    write(d);
    return { ok: true };
  },
  earn(n) {
    const add = Math.max(0, Math.min(5000, Math.floor(Number(n) || 0)));
    const d = read();
    const before = d.coins;
    if (add) { d.coins += add; d.earned += add; write(d); }
    return { before, after: d.coins, add };
  },
  // Bonus én gang per spill (romkode) og type
  reward(code, kind, n) {
    const d = read();
    const got = d.rewards[code] || [];
    if (got.includes(kind)) return null;
    d.rewards[code] = [...got, kind];
    const codes = Object.keys(d.rewards);
    if (codes.length > 40) for (const c of codes.slice(0, codes.length - 40)) delete d.rewards[c];
    write(d);
    return this.earn(n);
  },
};
