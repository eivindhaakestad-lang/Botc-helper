// Ekte tilfeldighet via crypto.getRandomValues (finnes i nettleser, Cloudflare Workers og Node 20+).

export function randInt(n) {
  if (n <= 0) return 0;
  const max = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  let x;
  do { globalThis.crypto.getRandomValues(buf); x = buf[0]; } while (x >= max);
  return x % n;
}

export function pick(arr) {
  return arr.length ? arr[randInt(arr.length)] : undefined;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample(arr, k) {
  return shuffle(arr).slice(0, Math.max(0, k));
}

export function uid(prefix = '') {
  const buf = new Uint32Array(2);
  globalThis.crypto.getRandomValues(buf);
  return prefix + buf[0].toString(36) + buf[1].toString(36).slice(0, 4);
}
