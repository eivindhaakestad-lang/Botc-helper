// Lommeboka til eleven: mynter, kjøpte ting og sauen.
// Lagres bare på elevens egen PC (localStorage) og følger eleven fra spill til spill på samme PC/nettleser.
// En enkel sjekksum gjør at det ikke holder å endre tallet i nettleseren – da nullstilles mynter og kjøp.
// (En elev med utviklerverktøy og mye tålmodighet kan fortsatt jukse; det er prisen for å slippe innlogging.)
//
// Dagens tilbud: én tilfeldig ting eleven ikke har, 30 % billigere hele dagen.
// Bytt inn: en kjøpt ting kan selges tilbake for halve prisen.

import { CATS, LOOK_KEYS, item, normLook, randomLook } from '../live/sheep.js';

const KEY = 'botc-sheep-v1';
const SALT = 'blodklokke|ull|v1';
const SALT2 = 'blodklokke|ull|v2';
export const DEAL_OFF = 0.3;

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  let h2 = 5381;
  for (let i = str.length - 1; i >= 0; i--) h2 = (Math.imul(h2, 33) ^ str.charCodeAt(i)) >>> 0;
  return (h >>> 0).toString(36) + '.' + h2.toString(36);
}
// sig: den gamle sjekksummen (beholdes så eldre versjoner av siden fortsatt godtar lommeboka)
// sig2: dekker også dagens tilbud
const sigOf = (d) => hash(`${SALT}|${d.coins}|${d.earned}|${(d.owned || []).join(',')}`);
const sig2Of = (d) => hash(`${SALT2}|${d.coins}|${d.earned}|${(d.owned || []).join(',')}|${d.deal ? d.deal.day + ':' + d.deal.key : ''}`);

function fresh() {
  return { v: 1, coins: 0, earned: 0, owned: [], look: randomLook(), created: false, rewards: {}, deal: null };
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
// Tilbudet velges ut fra dato og hvor mye eleven har tjent (likt hver gang siden lastes samme dag)
function pickDeal(d, day) {
  const all = CATS.flatMap((c) => c.list.filter((x) => x.price > 0 && !d.owned.includes(c.key + ':' + x.id)).map((x) => c.key + ':' + x.id));
  if (!all.length) return null;
  const n = parseInt(hash(`${day}|${d.earned}`).split('.')[1], 36);
  return all[n % all.length];
}

function read() {
  let d = null;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && raw.v === 1) {
      d = { ...fresh(), ...raw };
      if (raw.sig !== sigOf(raw)) { d.coins = 0; d.earned = 0; d.owned = []; d.deal = null; d.tampered = true; }
      else if (raw.sig2 !== sig2Of(raw)) d.deal = null; // tilbudet regnes ut på nytt
    }
  } catch { /* */ }
  if (!d) d = fresh();
  d.coins = Math.max(0, Math.floor(Number(d.coins) || 0));
  d.owned = Array.isArray(d.owned) ? d.owned.filter((x) => typeof x === 'string') : [];
  const day = today();
  if (!d.deal || typeof d.deal !== 'object' || d.deal.day !== day) d.deal = { day, key: pickDeal(d, day) };
  d.look = onlyOwned(d, normLook(d.look));
  return d;
}
function write(d) {
  d.sig = sigOf(d);
  d.sig2 = sig2Of(d);
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
function priceIn(d, cat, id) {
  const it = item(cat, id);
  if (!it) return 0;
  return d.deal && d.deal.key === cat + ':' + id ? Math.round((it.price * (1 - DEAL_OFF)) / 10) * 10 : it.price;
}

// Alle endringer leser først på nytt fra lagringen (to faner skal ikke overskrive hverandre)
export const wallet = {
  get data() { return read(); },
  get coins() { return read().coins; },
  get look() { return read().look; },
  get created() { return read().created; },
  get tampered() { return !!read().tampered; },
  // Dagens tilbud: { cat, id, item, price, was } eller null
  get deal() {
    const d = read();
    if (!d.deal || !d.deal.key) return null;
    const [cat, id] = d.deal.key.split(':');
    const it = item(cat, id);
    return it ? { cat, id, item: it, price: priceIn(d, cat, id), was: it.price, owned: ownsIn(d, cat, id) } : null;
  },
  priceOf(cat, id) { return priceIn(read(), cat, id); },
  isDeal(cat, id) { const d = read(); return !!(d.deal && d.deal.key === cat + ':' + id); },
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
    const price = priceIn(d, cat, id);
    if (d.coins < price) return { ok: false, why: 'coins', missing: price - d.coins };
    d.coins -= price;
    d.owned.push(cat + ':' + id);
    d.look = onlyOwned(d, { ...d.look, [cat]: id });
    d.created = true;
    write(d);
    return { ok: true, price };
  },
  // Bytt inn: halve (vanlige) prisen tilbake, tingen forsvinner fra garderoben
  sellValue(cat, id) { const it = item(cat, id); return it && it.price ? Math.floor(it.price / 2) : 0; },
  sell(cat, id) {
    const d = read();
    const it = item(cat, id);
    const key = cat + ':' + id;
    if (!it || !it.price || !d.owned.includes(key)) return { ok: false };
    const value = Math.floor(it.price / 2);
    d.owned = d.owned.filter((x) => x !== key);
    d.coins += value;
    d.look = onlyOwned(d, d.look);
    write(d);
    return { ok: true, value };
  },
  earn(n) {
    const add = Math.max(0, Math.min(5000, Math.floor(Number(n) || 0)));
    const d = read();
    const before = d.coins;
    if (add) { d.coins += add; d.earned += add; write(d); }
    return { before, after: d.coins, add };
  },
  // Juksekoden (se main.js): gir mynter uten taket på 5000 som vanlig opptjening har
  grant(n) {
    const add = Math.max(0, Math.floor(Number(n) || 0));
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
