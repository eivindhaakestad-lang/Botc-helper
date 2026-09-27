// Passordlås på «Nytt spill» (og på å opprette live-rom).
// Koden inneholder bare en hash av passordet, ikke selve passordet.
// Det riktige passordet huskes på denne maskinen etter første gang.

const HASH = 'cb5f53d1727abcbf7da0b3d6e3783c604cca3ee8d9235610c7c4800df74d448d';
const STORE = 'botc-st-key';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function storedKey() {
  try { return localStorage.getItem(STORE) || ''; } catch { return ''; }
}

export function isUnlocked() {
  return !!storedKey();
}

export async function tryUnlock(pw) {
  const ok = (await sha256('botc-helper:' + String(pw || '').trim())) === HASH;
  if (ok) { try { localStorage.setItem(STORE, String(pw).trim()); } catch { /* */ } }
  return ok;
}

export function lockAgain() {
  try { localStorage.removeItem(STORE); } catch { /* */ }
}
