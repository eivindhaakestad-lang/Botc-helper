// Dag/natt-tema: hele bakgrunnen toner over til gul om dagen og dyp blå om natten.

let current = null;
let timer = null;

export function applyTheme(phaseType) {
  const next = phaseType === 'day' ? 'day' : phaseType === 'night' ? 'night' : 'none';
  if (next === current) return;
  const body = document.documentElement;
  const animate = current !== null;
  current = next;
  if (animate) {
    body.classList.add('theme-anim');
    clearTimeout(timer);
    timer = setTimeout(() => body.classList.remove('theme-anim'), 2200);
  }
  body.classList.toggle('theme-day', next === 'day');
  body.classList.toggle('theme-night', next === 'night');
}
