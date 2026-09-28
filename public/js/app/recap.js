// Storytellerens styring av «Slik gikk det egentlig» (gjennomgangen etter spillet).
import { store } from './store.js';
import { buildRecap, recapSteps, recapPublic } from '../engine/recap.js';

let cache = null;
export function getRecap() {
  const g = store.game;
  if (!g) return null;
  const s = store.state();
  const key = g.events.length + '|' + (s && s.lang);
  if (!cache || cache.key !== key || cache.initial !== g.initial) cache = { key, initial: g.initial, recap: buildRecap(g.initial, g.events, s ? s.lang : 'no') };
  return cache.recap;
}

export function recapCtl() {
  const g = store.game;
  if (!g) return { on: false, pos: 0, hidden: {}, edits: {} };
  if (!g.recap) g.recap = { on: false, pos: 0, hidden: {}, edits: {} };
  return g.recap;
}

export function recapStepList() {
  const r = getRecap();
  return r ? recapSteps(r, recapCtl()) : [];
}

export function setRecap(patch) {
  const c = recapCtl();
  Object.assign(c, patch);
  const n = recapStepList().length;
  c.pos = Math.max(0, Math.min(Math.max(0, n - 1), c.pos || 0));
  store.saveGame();
}

export function recapGo(delta) {
  const c = recapCtl();
  setRecap({ pos: (c.pos || 0) + delta });
}

// Hopp til tittelkortet til neste kapittel
export function recapNextChapter() {
  const steps = recapStepList();
  const c = recapCtl();
  const cur = steps[c.pos];
  const i = steps.findIndex((x, k) => k > c.pos && !x.item && (!cur || x.ch !== cur.ch));
  setRecap({ pos: i < 0 ? steps.length - 1 : i });
}

export function recapForPublic() {
  const c = recapCtl();
  if (!c.on) return null;
  const r = getRecap();
  return r ? recapPublic(r, c, c.pos) : null;
}
