// Elevenes sauer: katalog (farger, ansikter, hatter, sko, spor, kjæledyr) og tegning som SVG.
// Samme tegning brukes i «lag sauen din», butikken, grimen (alle sirkler) og drømmespillet.
// Alt er egne, enkle tegninger – ingen bilder lastes fra nettet.
//
// Et utseende («look») er bare ID-er: { color, face, hat, shoes, trail, pet }.
// Mesterkrona (den som leder drømmetoppen) er ikke noe man kjøper – den legges på når man leder.

import { h } from '../app/dom.js';

export const INK = '#2b2533';
const f = (n) => Math.round(n * 10) / 10;
const N = (no, en) => ({ no, en });

// ——— katalog ———
// Prisene er regnet ut fra drømmespillet: ca. 500–650 mynter per spilletime.
// Billig: kjøpes første time. Dyrest: ca. 6–8 timer sparing.
const color = (id, name, price, wool, shade, face, fx = {}) => ({ id, name, price, wool, shade, face, ...fx });
export const COLORS = [
  color('white', N('Hvit', 'White'), 0, '#f6f3ec', '#cfc6b6', '#f7dccb'),
  color('cream', N('Krem', 'Cream'), 0, '#f4e2bf', '#d2b582', '#f7dccb'),
  color('grey', N('Grå', 'Grey'), 0, '#c3c0cb', '#8f8b9b', '#f2d6c6'),
  color('black', N('Svart', 'Black'), 0, '#4a4554', '#26222c', '#ecd0bf'),
  color('brown', N('Brun', 'Brown'), 0, '#a87a52', '#734d2e', '#f4d8c4'),
  color('pink', N('Rosa', 'Pink'), 0, '#f7bfd4', '#d985a6', '#f9ddd0'),
  color('sky', N('Lyseblå', 'Light blue'), 0, '#acd6f6', '#6fa2cf', '#f5dccd'),
  color('mint', N('Mint', 'Mint'), 0, '#b2ead2', '#72bf9d', '#f5dccd'),
  color('yellow', N('Gul', 'Yellow'), 0, '#f8de75', '#cfa936', '#f8dfc9'),
  color('purple', N('Lilla', 'Purple'), 0, '#c9a9ee', '#9370c7', '#f5dacd'),
  color('orange', N('Oransje', 'Orange'), 0, '#f7b072', '#d27b35', '#f8ddc9'),
  color('red', N('Rød', 'Red'), 0, '#ec6f72', '#b83d42', '#f8d9cc'),
  // Luksusfarger
  color('silver', N('Sølv', 'Silver'), 300, 'url(#w)', '#868e9c', '#f1dccf', { grad: ['#ffffff', '#d5dae2', '#9ea7b5'], shine: true }),
  color('rose', N('Rosegull', 'Rose gold'), 450, 'url(#w)', '#b07060', '#f7dccd', { grad: ['#fde3da', '#eab3a2', '#c4826e'], shine: true }),
  color('midnight', N('Midnatt', 'Midnight'), 800, 'url(#w)', '#14173a', '#efd5c6', { grad: ['#454aa0', '#2c3074', '#1b1e4d'], stars: true }),
  color('neon', N('Neon', 'Neon'), 1000, 'url(#w)', '#0e9e6a', '#f4dccd', { grad: ['#d2ffe8', '#5effb0', '#14d488'], glow: true }),
  color('gold', N('Gull', 'Gold'), 2000, 'url(#w)', '#a8760a', '#fbe6bf', { grad: ['#fff4b8', '#f6c945', '#c48a14'], shine: true, sparkle: true }),
  color('rainbow', N('Regnbue', 'Rainbow'), 3000, 'url(#w)', '#7b55b0', '#f8dccd', { rainbow: true }),
  color('galaxy', N('Galakse', 'Galaxy'), 3800, 'url(#w)', '#120a2c', '#efd3c8', { galaxy: true, stars: true }),
  color('diamond', N('Diamant', 'Diamond'), 4500, 'url(#w)', '#5aa9c9', '#f3e3dc', { grad: ['#ffffff', '#cdf3ff', '#86cdea'], diamond: true, sparkle: true }),
];

// Øyne sitter på (51,58) og (69,58), nese/munn rundt (60,67–74) i hodet (koordinater 0–120).
const eye = (x, y, rx = 3.4, ry = 4.2) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${INK}"/><circle cx="${f(x + rx * 0.32)}" cy="${f(y - ry * 0.4)}" r="${f(rx * 0.36)}" fill="#fff"/>`;
const line = (d, w = 2.2, c = INK) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const cheeks = (o = 0.5, c = '#f28aa0') => `<circle cx="43.5" cy="66" r="3.6" fill="${c}" opacity="${o}"/><circle cx="76.5" cy="66" r="3.6" fill="${c}" opacity="${o}"/>`;
const heartPath = (x, y, s) => `M${f(x)} ${f(y + s * 0.38)} C${f(x - s * 0.55)} ${f(y - s * 0.05)} ${f(x - s * 0.3)} ${f(y - s * 0.55)} ${f(x)} ${f(y - s * 0.2)} C${f(x + s * 0.3)} ${f(y - s * 0.55)} ${f(x + s * 0.55)} ${f(y - s * 0.05)} ${f(x)} ${f(y + s * 0.38)} Z`;
const star5 = (x, y, r, k = 0.45) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (Math.PI / 5) * i;
    const rr = i % 2 ? r * k : r;
    d += `${i ? 'L' : 'M'}${f(x + rr * Math.cos(a))} ${f(y + rr * Math.sin(a))} `;
  }
  return d + 'Z';
};
const sparkle = (x, y, s) => `M${f(x)} ${f(y - s)} Q${f(x)} ${f(y)} ${f(x + s)} ${f(y)} Q${f(x)} ${f(y)} ${f(x)} ${f(y + s)} Q${f(x)} ${f(y)} ${f(x - s)} ${f(y)} Q${f(x)} ${f(y)} ${f(x)} ${f(y - s)} Z`;

const face = (id, name, price, draw) => ({ id, name, price, draw });
export const FACES = [
  face('happy', N('Glad', 'Happy'), 0, () => eye(51, 58) + eye(69, 58) + line('M53 71 Q60 78 67 71') + cheeks()),
  face('smile', N('Fornøyd', 'Content'), 0, () => line('M47.5 59 Q51 54.5 54.5 59') + line('M65.5 59 Q69 54.5 72.5 59') + line('M54.5 71 Q60 75.5 65.5 71') + cheeks(0.6)),
  face('grin', N('Flir', 'Grin'), 0, () => eye(51, 57.5) + eye(69, 57.5) + `<path d="M51 69 Q60 84 69 69 Z" fill="${INK}"/><path d="M53 69.6 L67 69.6 L66 72.4 L54 72.4 Z" fill="#fff"/><ellipse cx="60" cy="77.4" rx="4" ry="2.3" fill="#f07a8f"/>` + cheeks(0.45)),
  face('wink', N('Blunk', 'Wink'), 0, () => eye(51, 58) + line('M65.5 59 Q69 55 72.5 59') + line('M53 71 Q61 77.5 68 70') + cheeks(0.55)),
  face('wow', N('Overrasket', 'Surprised'), 0, () => eye(51, 58, 4.4, 5.2) + eye(69, 58, 4.4, 5.2) + `<ellipse cx="60" cy="73.5" rx="3.2" ry="4" fill="${INK}"/>` + line('M46.5 49.5 Q51 46.5 55.5 49.5', 1.8) + line('M64.5 49.5 Q69 46.5 73.5 49.5', 1.8)),
  face('sleepy', N('Søvnig', 'Sleepy'), 0, () => line('M47.5 58 Q51 61.5 54.5 58') + line('M65.5 58 Q69 61.5 72.5 58') + `<circle cx="60" cy="72.5" r="2.3" fill="${INK}"/>` + line('M80 40 L86 40 L80 46 L86 46', 1.6) + line('M88 30 L92 30 L88 34 L92 34', 1.3)),
  face('shy', N('Sjenert', 'Shy'), 0, () => `<circle cx="51" cy="60" r="2.6" fill="${INK}"/><circle cx="69" cy="60" r="2.6" fill="${INK}"/>` + `<ellipse cx="43.5" cy="66.5" rx="5" ry="3.1" fill="#f27e98" opacity="0.75"/><ellipse cx="76.5" cy="66.5" rx="5" ry="3.1" fill="#f27e98" opacity="0.75"/>` + line('M55.5 72 Q57.8 70.4 60 72 Q62.2 73.6 64.5 72', 1.8)),
  face('determined', N('Bestemt', 'Determined'), 0, () => eye(51, 58.5) + eye(69, 58.5) + line('M45.5 51.5 L55.5 54.5', 2.5) + line('M74.5 51.5 L64.5 54.5', 2.5) + line('M55 72.5 L65 72.5')),
  face('silly', N('Tøysete', 'Silly'), 0, () => eye(51, 57.5, 4.5, 5.2) + eye(69, 59, 2.4, 2.8) + line('M53 70 Q60 76.5 67 70') + `<path d="M57 72.6 Q60 81 63 72.6 Z" fill="#f07a8f" stroke="${INK}" stroke-width="1"/>`),
  face('smug', N('Kul', 'Smug'), 0, (c) => eye(51, 58) + eye(69, 58) + `<rect x="46" y="52.6" width="10" height="5.4" fill="${c.face}"/><rect x="64" y="52.6" width="10" height="5.4" fill="${c.face}"/>` + line('M46.8 58 L55.2 58', 1.9) + line('M64.8 58 L73.2 58', 1.9) + line('M54 72.5 Q60.5 74.5 66.5 69.5')),
  face('sad', N('Lei seg', 'Sad'), 0, () => eye(51, 59) + eye(69, 59) + line('M46 53 L55.5 50.5', 1.9) + line('M74 53 L64.5 50.5', 1.9) + line('M54 75 Q60 70 66 75') + `<path d="M46.5 63 Q44.6 67 46.5 68.4 Q48.4 67 46.5 63 Z" fill="#7fc4ff"/>`),
  face('angry', N('Sint', 'Angry'), 0, () => `<ellipse cx="51" cy="59" rx="3.4" ry="3.3" fill="${INK}"/><ellipse cx="69" cy="59" rx="3.4" ry="3.3" fill="${INK}"/>` + line('M45.5 50.5 L55.5 55', 2.7) + line('M74.5 50.5 L64.5 55', 2.7) + line('M54 74.5 Q60 70.5 66 74.5') + cheeks(0.35, '#e0535b')),
  // Kulere ansiktsuttrykk (kjøpes)
  face('shades', N('Solbriller', 'Sunglasses'), 200, () => `<rect x="42.5" y="52.5" width="16" height="10.5" rx="4.5" fill="#121018"/><rect x="61.5" y="52.5" width="16" height="10.5" rx="4.5" fill="#121018"/>` + line('M58.5 56 Q60 54.6 61.5 56', 2, '#121018') + line('M45.5 55 L50 55', 1.6, '#ffffff99') + line('M64.5 55 L69 55', 1.6, '#ffffff99') + line('M54 71.5 Q61 76 67 70.5')),
  face('hearts', N('Hjerteøyne', 'Heart eyes'), 250, () => `<path d="${heartPath(51, 58, 11)}" fill="#ff3d6e"/><path d="${heartPath(69, 58, 11)}" fill="#ff3d6e"/>` + `<path d="M52 69.5 Q60 81 68 69.5 Z" fill="${INK}"/><ellipse cx="60" cy="75.8" rx="3.6" ry="2" fill="#f07a8f"/>` + cheeks(0.6)),
  face('stars', N('Stjerneøyne', 'Star eyes'), 400, () => `<path d="${star5(51, 58, 6.4)}" fill="#ffd23f" stroke="#d99a00" stroke-width="0.8"/><path d="${star5(69, 58, 6.4)}" fill="#ffd23f" stroke="#d99a00" stroke-width="0.8"/>` + `<path d="M51 69.5 Q60 83 69 69.5 Z" fill="${INK}"/><path d="M53 70 L67 70 L66 72.6 L54 72.6 Z" fill="#fff"/>`),
  face('monocle', N('Monokkel', 'Monocle'), 500, () => eye(51, 58) + eye(69, 58) + `<circle cx="69" cy="58" r="6.8" fill="#cfe9ff55" stroke="#d8a630" stroke-width="1.9"/>` + line('M75 62 Q81 74 76 86', 1, '#d8a630') + `<path d="M60 68.6 Q54 65.4 48.5 69.6 Q51.5 73 55.6 71 Q58 70.2 60 70 Q62 70.2 64.4 71 Q68.5 73 71.5 69.6 Q66 65.4 60 68.6 Z" fill="#5a3b23"/>`),
  face('pirate', N('Pirat', 'Pirate'), 600, () => eye(51, 58) + line('M41 47 L69 57', 1.8, '#121018') + line('M69 57 L81 53', 1.8, '#121018') + `<ellipse cx="69" cy="58.5" rx="6.2" ry="5.6" fill="#121018"/>` + `<path d="M52 69.5 Q60 80.5 68 69.5 Z" fill="${INK}"/><rect x="61.6" y="69.6" width="3.4" height="3.2" rx="0.6" fill="#f4c542"/>`),
  face('ninja', N('Ninja', 'Ninja'), 800, () => `<rect x="37" y="51.5" width="46" height="14" rx="6.5" fill="#22202a"/>` + `<path d="M83 55 L95 49 L93 58 Z" fill="#d23c3c"/><path d="M83 59 L96 60 L90 66 Z" fill="#b52f2f"/>` + `<ellipse cx="51" cy="58.4" rx="4.6" ry="2.8" fill="#fff"/><ellipse cx="69" cy="58.4" rx="4.6" ry="2.8" fill="#fff"/><circle cx="52" cy="58.4" r="1.9" fill="${INK}"/><circle cx="70" cy="58.4" r="1.9" fill="${INK}"/>` + line('M45.5 52 L55.5 54.4', 2.2, '#000') + line('M74.5 52 L64.5 54.4', 2.2, '#000')),
  face('vampire', N('Vampyr', 'Vampire'), 1000, () => `<ellipse cx="51" cy="58" rx="3.4" ry="4" fill="#c0182b"/><ellipse cx="69" cy="58" rx="3.4" ry="4" fill="#c0182b"/><circle cx="52.2" cy="56.4" r="1.2" fill="#fff"/><circle cx="70.2" cy="56.4" r="1.2" fill="#fff"/>` + line('M45.5 51 L55.5 54', 2.3) + line('M74.5 51 L64.5 54', 2.3) + line('M52 71 Q60 75 68 71', 2) + `<path d="M55 71.8 L57 77.4 L59 72.6 Z" fill="#fff" stroke="${INK}" stroke-width="0.6"/><path d="M61 72.6 L63 77.4 L65 71.8 Z" fill="#fff" stroke="${INK}" stroke-width="0.6"/>`),
  face('robot', N('Robot', 'Robot'), 1300, () => `<rect x="39.5" y="51.5" width="41" height="12.5" rx="6" fill="#1d2230" stroke="#8a93a8" stroke-width="1.5"/>` + `<rect x="44" y="55.6" width="11" height="4" rx="2" fill="#3ff0ff"><animate attributeName="x" values="44;65;44" dur="2.2s" repeatCount="indefinite"/></rect>` + `<rect x="51.5" y="68.6" width="17" height="7" rx="2" fill="#8a93a8"/>` + line('M55.8 68.8 L55.8 75.4', 1, '#1d2230') + line('M60 68.8 L60 75.4', 1, '#1d2230') + line('M64.2 68.8 L64.2 75.4', 1, '#1d2230')),
  face('demon', N('Demonøyne', 'Demon eyes'), 1800, () => `<circle cx="51" cy="58" r="7" fill="#ff2a2a" opacity="0.35"><animate attributeName="opacity" values="0.2;0.55;0.2" dur="1.6s" repeatCount="indefinite"/></circle><circle cx="69" cy="58" r="7" fill="#ff2a2a" opacity="0.35"><animate attributeName="opacity" values="0.2;0.55;0.2" dur="1.6s" repeatCount="indefinite"/></circle>` + `<ellipse cx="51" cy="58" rx="3.6" ry="3" fill="#ff3b30"/><ellipse cx="69" cy="58" rx="3.6" ry="3" fill="#ff3b30"/><ellipse cx="51" cy="58" rx="1" ry="2.6" fill="#2a0000"/><ellipse cx="69" cy="58" rx="1" ry="2.6" fill="#2a0000"/>` + line('M45 50 L55.5 54.5', 2.6) + line('M75 50 L64.5 54.5', 2.6) + `<path d="M49.5 68.8 Q60 83 70.5 68.8 Q60 74 49.5 68.8 Z" fill="${INK}"/>` + line('M52 70 L54 72.4 L56 70.7 L58 73 L60 71 L62 73 L64 70.7 L66 72.4 L68 70', 1.2, '#fff')),
  face('laser', N('Laserblikk', 'Laser eyes'), 2500, () => `<g><animate attributeName="opacity" values="1;0.55;1;0.8;1" dur="0.9s" repeatCount="indefinite"/>` + line('M51 58 L14 104', 3.4, '#ff2a2a') + line('M69 58 L106 104', 3.4, '#ff2a2a') + line('M51 58 L14 104', 1.2, '#fff6') + line('M69 58 L106 104', 1.2, '#fff6') + '</g>' + `<circle cx="51" cy="58" r="5.2" fill="#ff5a4a"/><circle cx="69" cy="58" r="5.2" fill="#ff5a4a"/><circle cx="51" cy="58" r="2.2" fill="#fff"/><circle cx="69" cy="58" r="2.2" fill="#fff"/>` + line('M45 51 L55.5 54.5', 2.5) + line('M75 51 L64.5 54.5', 2.5) + line('M55 72.5 L65 72.5', 2.3)),
];

// Hatter sitter oppå ullhodet (toppen av ulla er rundt y = 8)
const hat = (id, name, price, draw) => ({ id, name, price, draw });
export const HATS = [
  hat('beanie', N('Lue', 'Beanie'), 100, () => `<path d="M30 33 Q30 6 60 6 Q90 6 90 33 Z" fill="#e2504a"/>` + [40, 50, 60, 70, 80].map((x) => line(`M${x} ${x === 60 ? 8 : 10} L${x} 30`, 1.6, '#c23c37')).join('') + `<rect x="27" y="27" width="66" height="11" rx="5.5" fill="#b8332e"/><circle cx="60" cy="6.5" r="6.5" fill="#fff" stroke="#e6e0e0" stroke-width="1"/>`),
  hat('cap', N('Caps', 'Cap'), 150, () => `<path d="M31 31 Q31 7 60 7 Q89 7 89 31 Z" fill="#2f6fd6"/>` + line('M60 7.5 L60 30', 1.3, '#255bb2') + `<circle cx="60" cy="7.5" r="2.6" fill="#255bb2"/><path d="M29 29 Q60 39 95 27 Q100 33 93 36.5 Q60 46 27 35.5 Z" fill="#1f4f9e"/><circle cx="60" cy="20" r="5.6" fill="#fff"/><path d="${star5(60, 20.4, 4)}" fill="#f4c542"/>`),
  hat('flowers', N('Blomsterkrans', 'Flower crown'), 250, () => {
    const pts = [[30, 26], [39, 18], [49, 13], [60, 11], [71, 13], [81, 18], [90, 26]];
    const cols = ['#ff8fb1', '#ffffff', '#c39bff', '#ffd23f', '#ff8fb1', '#ffffff', '#c39bff'];
    let s = line('M28 28 Q60 2 92 28', 3, '#4f9a45');
    pts.forEach(([x, y], i) => {
      for (let k = 0; k < 5; k++) { const a = (Math.PI * 2 * k) / 5; s += `<circle cx="${f(x + Math.cos(a) * 3.6)}" cy="${f(y + Math.sin(a) * 3.6)}" r="3.2" fill="${cols[i]}" stroke="#0001" stroke-width="0.5"/>`; }
      s += `<circle cx="${x}" cy="${y}" r="2.4" fill="#f4b400"/>`;
    });
    return s;
  }),
  hat('chef', N('Kokkelue', 'Chef hat'), 350, () => `<g fill="#fff" stroke="#dedad4" stroke-width="1.2"><circle cx="44" cy="19" r="10"/><circle cx="56" cy="13" r="12"/><circle cx="68" cy="13" r="12"/><circle cx="78" cy="20" r="9"/></g><rect x="40" y="14" width="40" height="12" fill="#fff"/><rect x="36" y="23" width="48" height="11" rx="2" fill="#fff" stroke="#dedad4" stroke-width="1.2"/>`),
  hat('cowboy', N('Cowboyhatt', 'Cowboy hat'), 450, () => `<path d="M38 28 Q35 7 50 9 Q60 15 70 9 Q85 7 82 28 Z" fill="#a0693a"/><rect x="38" y="22" width="44" height="6" fill="#5a3518"/><ellipse cx="60" cy="29.5" rx="45" ry="7.5" fill="#8b5a2b"/><path d="M17 27 Q60 40 103 27" fill="none" stroke="#6f441f" stroke-width="1.4"/>`),
  hat('tophat', N('Flosshatt', 'Top hat'), 600, () => `<rect x="42" y="1" width="36" height="28" rx="2" fill="#24212b"/><rect x="42" y="20" width="36" height="6" fill="#c0392b"/>` + line('M46 4 L46 18', 2, '#ffffff22') + `<ellipse cx="60" cy="29.5" rx="31" ry="5.6" fill="#1c1a22"/>`),
  hat('viking', N('Vikinghjelm', 'Viking helmet'), 800, () => `<path d="M35 25 Q17 21 12 3 Q24 13 39 16 Z" fill="#f2e6c8" stroke="#c4b083" stroke-width="1.2"/><path d="M85 25 Q103 21 108 3 Q96 13 81 16 Z" fill="#f2e6c8" stroke="#c4b083" stroke-width="1.2"/><path d="M33 32 Q33 7 60 7 Q87 7 87 32 Z" fill="#a3acb6" stroke="#6c757d" stroke-width="1.4"/><rect x="56" y="7.5" width="8" height="24" fill="#858e98"/><rect x="31" y="27" width="58" height="7" rx="3" fill="#858e98"/>` + [38, 48, 72, 82].map((x) => `<circle cx="${x}" cy="30.5" r="1.4" fill="#e5e9ed"/>`).join('')),
  hat('witch', N('Heksehatt', 'Witch hat'), 1000, () => `<path d="M41 29 L65 1 Q70 -1 72 4 L80 29 Z" fill="#5b347f"/><path d="M43.5 25 L79 25 L80.4 29.5 L42 29.5 Z" fill="#2c1a40"/><rect x="57" y="23.6" width="7" height="7" rx="1" fill="none" stroke="#f4c542" stroke-width="1.6"/><ellipse cx="60" cy="30" rx="41" ry="7" fill="#4a2a6b"/>`),
  hat('horns', N('Djevlehorn', 'Devil horns'), 1200, () => `<path d="M38 26 Q28 10 37 1 Q37 13 47 20 Z" fill="#d2342f" stroke="#8e1f1f" stroke-width="1.2"/><path d="M82 26 Q92 10 83 1 Q83 13 73 20 Z" fill="#d2342f" stroke="#8e1f1f" stroke-width="1.2"/>`),
  hat('halo', N('Glorie', 'Halo'), 1200, () => `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="2.4s" repeatCount="indefinite"/><ellipse cx="60" cy="7" rx="23" ry="5.2" fill="none" stroke="#ffe680" stroke-width="8" opacity="0.35"/><ellipse cx="60" cy="7" rx="23" ry="5.2" fill="none" stroke="#ffd23f" stroke-width="3.6"/></g>`),
  hat('crown', N('Krone', 'Crown'), 3000, () => `<path d="M38 29 L40 10 L50 20 L60 5 L70 20 L80 10 L82 29 Z" fill="url(#gold)" stroke="#a8760a" stroke-width="1.3"/><rect x="38" y="25" width="44" height="6" rx="1.5" fill="#d9a520" stroke="#a8760a" stroke-width="1"/>` + [[50, 28, '#e0303f'], [60, 28, '#2f7de0'], [70, 28, '#e0303f']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="2.1" fill="${c}"/>`).join('')),
];

const shoe = (id, name, price, draw, canvas) => ({ id, name, price, draw, canvas });
// Skoene tegnes på de to forbeina (x ≈ 50 og 70) nederst i hode-visningen.
const bothFeet = (fn) => fn(50.8) + fn(69.6);
export const SHOES = [
  shoe('sneakers', N('Joggesko', 'Sneakers'), 100, () => bothFeet((x) => `<path d="M${x - 6} 117 L${x - 6} 111 Q${x - 6} 108.6 ${x - 3.6} 108.6 L${x + 2} 108.6 Q${x + 7} 110 ${x + 7} 114.4 L${x + 7} 117 Z" fill="#fff" stroke="#c9c4cf" stroke-width="0.8"/><rect x="${x - 6}" y="115" width="13" height="2.6" rx="1" fill="#e14b4b"/>` + line(`M${x - 2.5} 110.6 L${x + 1.5} 112.4`, 1.1, '#e14b4b')), { c: '#ffffff', s: '#e14b4b' }),
  shoe('boots', N('Gummistøvler', 'Rain boots'), 200, () => bothFeet((x) => `<rect x="${x - 5.6}" y="102" width="11.2" height="15.4" rx="3" fill="#f4c430" stroke="#c99a17" stroke-width="0.8"/><rect x="${x - 5.6}" y="114.6" width="11.2" height="3" rx="1.2" fill="#c99a17"/>`), { c: '#f4c430', s: '#c99a17', tall: true }),
  shoe('clogs', N('Tresko', 'Clogs'), 300, () => bothFeet((x) => `<path d="M${x - 6} 117.4 L${x - 6} 111 Q${x - 6} 108 ${x - 2} 108 L${x + 2} 108 Q${x + 7.5} 108.6 ${x + 7.5} 113.4 L${x + 7.5} 117.4 Z" fill="#d9a35b" stroke="#a8743a" stroke-width="1"/>` + line(`M${x - 4} 111.6 L${x + 4} 111.6`, 0.8, '#a8743a')), { c: '#d9a35b', s: '#a8743a' }),
  shoe('cowboots', N('Cowboystøvler', 'Cowboy boots'), 450, () => bothFeet((x) => `<path d="M${x - 5.5} 102 L${x + 5} 102 L${x + 5} 111 Q${x + 8.5} 112 ${x + 8.5} 116 L${x + 8.5} 117.4 L${x - 5.5} 117.4 Z" fill="#8b5a2b" stroke="#5a3518" stroke-width="0.9"/><path d="${star5(x, 107, 2.4)}" fill="#f4c542"/>`), { c: '#8b5a2b', s: '#f4c542', tall: true }),
  shoe('skates', N('Rulleskøyter', 'Roller skates'), 800, () => bothFeet((x) => `<rect x="${x - 6}" y="104" width="12" height="11" rx="3.4" fill="#ff7eb6" stroke="#d94f8e" stroke-width="0.8"/><rect x="${x - 6.6}" y="113.6" width="13.2" height="2.6" rx="1" fill="#7b4bd1"/><circle cx="${x - 3.6}" cy="118" r="1.9" fill="#ffd23f"/><circle cx="${x + 3.6}" cy="118" r="1.9" fill="#ffd23f"/>`), { c: '#ff7eb6', s: '#ffd23f', wheels: true }),
  shoe('goldshoes', N('Gullsko', 'Golden shoes'), 1800, () => bothFeet((x) => `<path d="M${x - 6} 117.4 L${x - 6} 110.6 Q${x - 6} 108.4 ${x - 3.4} 108.4 L${x + 2.4} 108.4 Q${x + 7.6} 109.6 ${x + 7.6} 114.4 L${x + 7.6} 117.4 Z" fill="url(#gold)" stroke="#a8760a" stroke-width="0.9"/><path d="${sparkle(x + 4.6, 107, 2.4)}" fill="#fff"/>`), { c: '#f6c945', s: '#fff4b8' }),
];

// ——— små figurer til spor (både i grimen og som partikler i drømmespillet) ———
const P = {
  heart: (x, y, s, c = '#ff5c8a') => `<path d="${heartPath(x, y, s)}" fill="${c}"/>`,
  star: (x, y, s, c = '#ffd23f') => `<path d="${sparkle(x, y, s)}" fill="${c}"/>`,
  note: (x, y, s, c = '#8fd3ff') => `<ellipse cx="${x}" cy="${y}" rx="${f(s * 0.38)}" ry="${f(s * 0.27)}" transform="rotate(-20 ${x} ${y})" fill="${c}"/>` + line(`M${f(x + s * 0.33)} ${f(y - 0.1)} L${f(x + s * 0.33)} ${f(y - s)} Q${f(x + s * 0.7)} ${f(y - s * 0.8)} ${f(x + s * 0.8)} ${f(y - s * 0.5)}`, f(Math.max(1, s * 0.12)), c),
  bubble: (x, y, s) => `<circle cx="${x}" cy="${y}" r="${s}" fill="#bfe6ff33" stroke="#bfe6ff" stroke-width="${f(Math.max(0.8, s * 0.14))}"/><path d="M${f(x - s * 0.5)} ${f(y - s * 0.15)} Q${f(x - s * 0.45)} ${f(y - s * 0.5)} ${f(x - s * 0.1)} ${f(y - s * 0.55)}" fill="none" stroke="#fff" stroke-width="${f(Math.max(0.6, s * 0.12))}" stroke-linecap="round"/>`,
  leaf: (x, y, s, c = '#f08a2b') => `<path d="M${f(x - s)} ${y} Q${x} ${f(y - s * 0.75)} ${f(x + s)} ${y} Q${x} ${f(y + s * 0.75)} ${f(x - s)} ${y} Z" fill="${c}" transform="rotate(${Math.round((x * 7 + y * 3) % 70) - 35} ${x} ${y})"/>`,
  flame: (x, y, s) => `<path d="M${x} ${f(y - s)} Q${f(x + s * 0.75)} ${f(y - s * 0.05)} ${x} ${f(y + s * 0.6)} Q${f(x - s * 0.75)} ${f(y - s * 0.05)} ${x} ${f(y - s)} Z" fill="#ff7a1a"/><path d="M${x} ${f(y - s * 0.35)} Q${f(x + s * 0.38)} ${f(y + s * 0.1)} ${x} ${f(y + s * 0.45)} Q${f(x - s * 0.38)} ${f(y + s * 0.1)} ${x} ${f(y - s * 0.35)} Z" fill="#ffd23f"/>`,
  ghost: (x, y, s) => `<path d="M${f(x - s * 0.7)} ${f(y + s * 0.7)} L${f(x - s * 0.7)} ${y} Q${f(x - s * 0.7)} ${f(y - s * 0.9)} ${x} ${f(y - s * 0.9)} Q${f(x + s * 0.7)} ${f(y - s * 0.9)} ${f(x + s * 0.7)} ${y} L${f(x + s * 0.7)} ${f(y + s * 0.7)} L${f(x + s * 0.35)} ${f(y + s * 0.45)} L${x} ${f(y + s * 0.7)} L${f(x - s * 0.35)} ${f(y + s * 0.45)} Z" fill="#f4f2ff" opacity="0.9"/><circle cx="${f(x - s * 0.25)}" cy="${f(y - s * 0.15)}" r="${f(s * 0.12)}" fill="${INK}"/><circle cx="${f(x + s * 0.25)}" cy="${f(y - s * 0.15)}" r="${f(s * 0.12)}" fill="${INK}"/>`,
  coin: (x, y, s) => `<circle cx="${x}" cy="${y}" r="${s}" fill="#f6c945" stroke="#b8860b" stroke-width="${f(Math.max(0.8, s * 0.16))}"/><circle cx="${x}" cy="${y}" r="${f(s * 0.62)}" fill="none" stroke="#d9a520" stroke-width="${f(Math.max(0.6, s * 0.1))}"/><path d="M${f(x - s * 0.35)} ${f(y - s * 0.3)} L${f(x - s * 0.1)} ${f(y - s * 0.55)}" stroke="#fff" stroke-width="${f(Math.max(0.6, s * 0.14))}" stroke-linecap="round"/>`,
  dust: (x, y, s) => `<circle cx="${x}" cy="${y}" r="${f(s * 0.35)}" fill="#c9a6ff"/><circle cx="${f(x + s * 0.8)}" cy="${f(y + s * 0.5)}" r="${f(s * 0.22)}" fill="#7fc4ff"/><path d="${sparkle(f(x - s * 0.5), f(y + s * 0.6), f(s * 0.55))}" fill="#fff"/>`,
};

const DECOR_SPOTS = [[12, 18, 7], [106, 16, 6], [7, 60, 6], [113, 52, 5], [16, 96, 5.5], [104, 96, 5], [26, 6, 4.5], [94, 6, 4.5]];
const trail = (id, name, price, kind, colors) => ({ id, name, price, kind, colors });
export const TRAILS = [
  trail('bubbles', N('Bobler', 'Bubbles'), 300, 'bubble'),
  trail('leaves', N('Høstløv', 'Autumn leaves'), 300, 'leaf', ['#f08a2b', '#e0533a', '#f4c542']),
  trail('hearts', N('Hjerter', 'Hearts'), 450, 'heart', ['#ff5c8a', '#ff8fb1', '#e0303f']),
  trail('notes', N('Noter', 'Music notes'), 550, 'note', ['#8fd3ff', '#c39bff', '#ffd23f']),
  trail('stars', N('Stjerner', 'Stars'), 700, 'star', ['#ffd23f', '#fff6c2', '#ffb627']),
  trail('fire', N('Ild', 'Fire'), 1300, 'flame'),
  trail('ghosts', N('Spøkelser', 'Ghosts'), 1800, 'ghost'),
  trail('rainbow', N('Regnbue', 'Rainbow'), 2500, 'rainbow'),
  trail('coins', N('Mynter', 'Coins'), 3000, 'coin'),
  trail('galaxy', N('Stjernestøv', 'Stardust'), 3800, 'dust'),
];

function trailDecor(t) {
  if (t.kind === 'rainbow') {
    const cols = ['#ff5e5e', '#ffb03b', '#ffe14d', '#5edc7a', '#5ea8ff', '#a36bff'];
    return `<g opacity="0.8" fill="none">${cols.map((c, i) => `<path d="M${6 + i * 3.4} 104 A${54 - i * 3.4} ${54 - i * 3.4} 0 0 1 ${114 - i * 3.4} 104" stroke="${c}" stroke-width="3.6"/>`).join('')}</g>`;
  }
  return DECOR_SPOTS.map(([x, y, s], i) => {
    const c = t.colors ? t.colors[i % t.colors.length] : undefined;
    return P[t.kind](x, y, s, c);
  }).join('');
}

// ——— kjæledyr (egne tegninger, 0–100) ———
const petEye = (x, y, r = 3.6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${f(x + r * 0.35)}" cy="${f(y - r * 0.35)}" r="${f(r * 0.38)}" fill="#fff"/>`;
const pet = (id, name, price, fly, draw) => ({ id, name, price, fly, draw });
export const PETS = [
  pet('chick', N('Kylling', 'Chick'), 600, false, () => `<path d="M50 22 Q46 12 52 10 Q50 16 56 18" fill="#ffd84d"/><circle cx="50" cy="56" r="30" fill="#ffd84d"/><ellipse cx="30" cy="60" rx="9" ry="13" fill="#f6c12e" transform="rotate(20 30 60)"/>` + petEye(41, 50) + petEye(59, 50) + `<path d="M44 58 L56 58 L50 66 Z" fill="#f08a2b"/>` + line('M40 86 L40 94 M36 95 L44 95 M60 86 L60 94 M56 95 L64 95', 3, '#f08a2b')),
  pet('frog', N('Frosk', 'Frog'), 700, false, () => `<ellipse cx="50" cy="64" rx="34" ry="24" fill="#6cc24a"/><circle cx="33" cy="40" r="12" fill="#6cc24a"/><circle cx="67" cy="40" r="12" fill="#6cc24a"/><circle cx="33" cy="40" r="8" fill="#fff"/><circle cx="67" cy="40" r="8" fill="#fff"/>` + petEye(34, 41, 4) + petEye(66, 41, 4) + line('M36 64 Q50 74 64 64', 2.6, '#2f6b22') + `<circle cx="28" cy="62" r="4" fill="#f28aa0" opacity="0.6"/><circle cx="72" cy="62" r="4" fill="#f28aa0" opacity="0.6"/><ellipse cx="50" cy="72" rx="16" ry="8" fill="#a6e08a"/>`),
  pet('cat', N('Katt', 'Cat'), 1000, false, () => line('M74 80 Q92 74 88 56', 7, '#f0a04b') + `<ellipse cx="50" cy="74" rx="25" ry="18" fill="#f0a04b"/><path d="M30 34 L32 12 L46 26 Z" fill="#f0a04b"/><path d="M70 34 L68 12 L54 26 Z" fill="#f0a04b"/><path d="M33 29 L34 18 L42 26 Z" fill="#f7b9c5"/><path d="M67 29 L66 18 L58 26 Z" fill="#f7b9c5"/><circle cx="50" cy="44" r="22" fill="#f6ad5c"/>` + petEye(42, 42) + petEye(58, 42) + `<path d="M47 50 L53 50 L50 53.5 Z" fill="#e0607e"/>` + line('M50 53.5 Q46 58 42 55 M50 53.5 Q54 58 58 55', 1.6) + line('M24 47 L38 49 M24 53 L38 52 M76 47 L62 49 M76 53 L62 52', 1.1, '#7a4a1f')),
  pet('dog', N('Hund', 'Dog'), 1000, false, () => `<ellipse cx="50" cy="74" rx="26" ry="18" fill="#b07a4a"/><circle cx="50" cy="44" r="22" fill="#c48a56"/><ellipse cx="27" cy="44" rx="8" ry="17" fill="#7a4f2c" transform="rotate(14 27 44)"/><ellipse cx="73" cy="44" rx="8" ry="17" fill="#7a4f2c" transform="rotate(-14 73 44)"/><ellipse cx="50" cy="54" rx="12" ry="9" fill="#ead2b4"/>` + petEye(42, 40) + petEye(58, 40) + `<ellipse cx="50" cy="50" rx="4.4" ry="3.2" fill="${INK}"/><path d="M47 58 Q50 66 53 58 Z" fill="#f07a8f"/>`),
  pet('owl', N('Ugle', 'Owl'), 1500, true, () => `<ellipse cx="50" cy="56" rx="30" ry="34" fill="#8b6b4a"/><path d="M26 30 L30 14 L40 26 Z" fill="#8b6b4a"/><path d="M74 30 L70 14 L60 26 Z" fill="#8b6b4a"/><ellipse cx="50" cy="66" rx="18" ry="20" fill="#d9bf98"/><circle cx="38" cy="42" r="11" fill="#fff" stroke="#f0a04b" stroke-width="3"/><circle cx="62" cy="42" r="11" fill="#fff" stroke="#f0a04b" stroke-width="3"/>` + petEye(38, 43, 4.6) + petEye(62, 43, 4.6) + `<path d="M46 52 L54 52 L50 60 Z" fill="#f0a04b"/><ellipse cx="22" cy="62" rx="7" ry="16" fill="#6e5236"/><ellipse cx="78" cy="62" rx="7" ry="16" fill="#6e5236"/>`),
  pet('bat', N('Flaggermus', 'Bat'), 1500, true, () => `<path d="M38 52 Q22 30 4 40 Q12 46 10 54 Q18 50 22 58 Q28 52 38 60 Z" fill="#3a3150"/><path d="M62 52 Q78 30 96 40 Q88 46 90 54 Q82 50 78 58 Q72 52 62 60 Z" fill="#3a3150"/><path d="M40 40 L38 24 L48 34 Z" fill="#4a3f63"/><path d="M60 40 L62 24 L52 34 Z" fill="#4a3f63"/><circle cx="50" cy="52" r="15" fill="#4a3f63"/><circle cx="44.5" cy="49" r="3.4" fill="#fff"/><circle cx="55.5" cy="49" r="3.4" fill="#fff"/><circle cx="45" cy="49.6" r="1.7" fill="${INK}"/><circle cx="56" cy="49.6" r="1.7" fill="${INK}"/><path d="M46 57 L48 61 L50 57 M50 57 L52 61 L54 57" fill="#fff"/>`),
  pet('raven', N('Ravn', 'Raven'), 2000, true, () => `<path d="M20 70 L6 82 L24 78 Z" fill="#14121a"/><ellipse cx="46" cy="62" rx="27" ry="21" fill="#1c1a24"/><path d="M30 56 Q46 46 62 60 Q46 72 30 66 Z" fill="#2b2836"/><circle cx="64" cy="40" r="16" fill="#1c1a24"/><path d="M78 38 L94 43 L78 47 Z" fill="#7a7684"/><circle cx="68" cy="36" r="4" fill="#fff"/><circle cx="69" cy="36" r="2.2" fill="#14121a"/>` + line('M42 82 L40 94 M54 82 L56 94', 2.6, '#7a7684')),
  pet('ghost', N('Spøkelse', 'Ghost'), 2500, true, () => `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -4;0 0" dur="2s" repeatCount="indefinite"/><path d="M22 88 L22 46 Q22 14 50 14 Q78 14 78 46 L78 88 L68 80 L59 88 L50 80 L41 88 L32 80 Z" fill="#f7f6ff" stroke="#d9d6ee" stroke-width="1.5"/><ellipse cx="40" cy="44" rx="4.4" ry="6" fill="${INK}"/><ellipse cx="60" cy="44" rx="4.4" ry="6" fill="${INK}"/><ellipse cx="50" cy="60" rx="5" ry="6.4" fill="${INK}"/><circle cx="33" cy="54" r="4" fill="#f28aa0" opacity="0.5"/><circle cx="67" cy="54" r="4" fill="#f28aa0" opacity="0.5"/></g>`),
  pet('unicorn', N('Enhjørning', 'Unicorn'), 3500, false, () => `<path d="M30 92 Q26 60 40 46 L36 30 Q50 18 66 24 Q84 30 86 50 Q88 62 78 66 Q70 68 64 60 L60 92 Z" fill="#ffffff" stroke="#e2dcef" stroke-width="1.5"/><path d="M56 22 L66 2 L64 24 Z" fill="#ffd23f" stroke="#d99a00" stroke-width="1"/>` + ['#ff5e5e', '#ffb03b', '#5edc7a', '#5ea8ff', '#a36bff'].map((c, i) => `<path d="M${42 - i * 3} ${30 + i * 9} Q${28 - i * 3} ${36 + i * 9} ${30 - i * 2} ${48 + i * 9}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`).join('') + petEye(68, 38, 3.4) + `<circle cx="80" cy="56" r="2" fill="#c9b8e6"/><circle cx="72" cy="50" r="4" fill="#f7b9c5" opacity="0.6"/>`),
  pet('dragon', N('Minidrage', 'Baby dragon'), 4500, true, () => `<path d="M22 70 Q6 66 8 52 Q14 62 26 62 Z" fill="#3fa05a"/><path d="M40 46 Q22 16 6 26 Q18 32 16 44 Q26 40 34 52 Z" fill="#8b5cd6"/><path d="M60 46 Q78 16 94 26 Q82 32 84 44 Q74 40 66 52 Z" fill="#8b5cd6"/><ellipse cx="50" cy="66" rx="22" ry="20" fill="#4cbb6c"/><ellipse cx="50" cy="72" rx="12" ry="12" fill="#c7f0b0"/><circle cx="50" cy="40" r="17" fill="#4cbb6c"/><path d="M38 28 L36 16 L44 25 Z" fill="#f4e3b0"/><path d="M62 28 L64 16 L56 25 Z" fill="#f4e3b0"/>` + petEye(44, 38) + petEye(56, 38) + `<ellipse cx="50" cy="47" rx="7" ry="4" fill="#3fa05a"/><circle cx="47" cy="46.4" r="1" fill="${INK}"/><circle cx="53" cy="46.4" r="1" fill="${INK}"/><path d="M57 50 Q66 52 70 46 Q68 54 74 56 Q64 58 57 52 Z" fill="#ff7a1a"><animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite"/></path>`),
];

export const CATS = [
  { key: 'color', icon: '🎨', name: N('Farger', 'Colors'), list: COLORS },
  { key: 'face', icon: '😀', name: N('Ansikter', 'Faces'), list: FACES },
  { key: 'hat', icon: '🎩', name: N('Hatter', 'Hats'), list: HATS },
  { key: 'shoes', icon: '👟', name: N('Sko', 'Shoes'), list: SHOES },
  { key: 'trail', icon: '✨', name: N('Spor', 'Trails'), list: TRAILS },
  { key: 'pet', icon: '🐾', name: N('Kjæledyr', 'Pets'), list: PETS },
];
const BY = Object.fromEntries(CATS.map((c) => [c.key, Object.fromEntries(c.list.map((x) => [x.id, x]))]));
export function item(cat, id) { return (BY[cat] || {})[id] || null; }
export const FREE_COLORS = COLORS.filter((x) => !x.price).map((x) => x.id);
export const FREE_FACES = FACES.filter((x) => !x.price).map((x) => x.id);

// Bare kjente ID-er slipper gjennom (resten blir standard / ingenting)
export function normLook(l) {
  const o = l && typeof l === 'object' ? l : {};
  const pick = (cat, def) => (BY[cat][o[cat]] ? o[cat] : def);
  return { color: pick('color', 'white'), face: pick('face', 'happy'), hat: pick('hat', ''), shoes: pick('shoes', ''), trail: pick('trail', ''), pet: pick('pet', '') };
}
export function randomLook() {
  return { color: FREE_COLORS[Math.floor(Math.random() * FREE_COLORS.length)], face: FREE_FACES[Math.floor(Math.random() * FREE_FACES.length)], hat: '', shoes: '', trail: '', pet: '' };
}

// ——— tegning ———
function woolDefs(c) {
  if (c.rainbow) {
    const cols = ['#ff6b6b', '#ffb84d', '#ffe55c', '#6ee08a', '#63b3ff', '#b07bff', '#ff6b6b'];
    const rot = (i) => [...cols.slice(i), ...cols.slice(1, i + 1)].join(';');
    return `<linearGradient id="w" x1="0" y1="0" x2="1" y2="1">${[0, 0.5, 1].map((o, i) => `<stop offset="${o}" stop-color="${cols[i * 2]}"><animate attributeName="stop-color" values="${rot(i * 2)}" dur="6s" repeatCount="indefinite"/></stop>`).join('')}</linearGradient>`;
  }
  if (c.galaxy) return '<radialGradient id="w" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stop-color="#7a4fd6"/><stop offset="0.55" stop-color="#3a2580"/><stop offset="1" stop-color="#160c38"/></radialGradient>';
  if (c.grad) return `<linearGradient id="w" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${c.grad[0]}"/><stop offset="0.55" stop-color="${c.grad[1]}"/><stop offset="1" stop-color="${c.grad[2]}"/></linearGradient>`;
  return '';
}
const GOLD_DEF = '<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4b8"/><stop offset="0.5" stop-color="#f6c945"/><stop offset="1" stop-color="#c48a14"/></linearGradient>';
const GLOW_DEF = '<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';

function bumps(cx, cy, rx, ry, n, r, start = 0) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = ((start + (360 / n) * i) * Math.PI) / 180;
    s += `<circle cx="${f(cx + rx * Math.cos(a))}" cy="${f(cy + ry * Math.sin(a))}" r="${r}"/>`;
  }
  return s;
}
// Ullsky: klumper med kant + et fyll i midten som skjuler de indre kantene
function cloud(c, cx, cy, rx, ry, n, r, start = 0) {
  return `<g fill="${c.wool}" stroke="${c.shade}" stroke-width="1.6">${bumps(cx, cy, rx, ry, n, r, start)}</g><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c.wool}"/>`;
}
// Effekter oppå ulla (glans, stjerner, gnister, diamantfasetter)
function woolFx(c, area) {
  const [x0, y0, w, hh] = area;
  let s = '';
  if (c.shine) s += `<ellipse cx="${f(x0 + w * 0.32)}" cy="${f(y0 + hh * 0.26)}" rx="${f(w * 0.16)}" ry="${f(hh * 0.09)}" fill="#fff" opacity="0.55" transform="rotate(-25 ${f(x0 + w * 0.32)} ${f(y0 + hh * 0.26)})"/>`;
  if (c.stars) {
    const pts = [[0.25, 0.3], [0.6, 0.2], [0.8, 0.45], [0.35, 0.62], [0.7, 0.75], [0.18, 0.5], [0.5, 0.42]];
    s += pts.map(([px, py], i) => `<circle cx="${f(x0 + w * px)}" cy="${f(y0 + hh * py)}" r="${i % 3 ? 0.9 : 1.4}" fill="#fff"><animate attributeName="opacity" values="1;0.2;1" dur="${2 + (i % 3) * 0.7}s" begin="${i * 0.3}s" repeatCount="indefinite"/></circle>`).join('');
  }
  if (c.diamond) {
    s += `<g fill="#fff" opacity="0.45"><path d="M${f(x0 + w * 0.2)} ${f(y0 + hh * 0.3)} l${f(w * 0.12)} ${f(-hh * 0.12)} l${f(w * 0.08)} ${f(hh * 0.2)} Z"/><path d="M${f(x0 + w * 0.62)} ${f(y0 + hh * 0.22)} l${f(w * 0.14)} ${f(hh * 0.06)} l${f(-w * 0.06)} ${f(hh * 0.16)} Z"/><path d="M${f(x0 + w * 0.45)} ${f(y0 + hh * 0.6)} l${f(w * 0.1)} ${f(-hh * 0.1)} l${f(w * 0.06)} ${f(hh * 0.14)} Z"/></g>`;
  }
  if (c.sparkle) {
    const pts = [[0.22, 0.2, 4], [0.78, 0.32, 3.4], [0.5, 0.72, 3]];
    s += pts.map(([px, py, r], i) => `<path d="${sparkle(f(x0 + w * px), f(y0 + hh * py), r)}" fill="#fff"><animate attributeName="opacity" values="0;1;0" dur="1.8s" begin="${i * 0.6}s" repeatCount="indefinite"/></path>`).join('');
  }
  return s;
}

function championCrown() {
  const sp = [[30, 10, 4.6, 0], [90, 8, 4, 0.5], [60, -1, 3.6, 1], [22, 30, 3, 1.4], [98, 28, 3.2, 0.9]];
  return '<g>'
    + '<ellipse cx="60" cy="18" rx="34" ry="16" fill="#ffd84d" opacity="0.35"><animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite"/></ellipse>'
    + '<animateTransform attributeName="transform" type="translate" values="0 0;0 -1.6;0 0" dur="2.6s" repeatCount="indefinite"/>'
    + `<path d="M33 31 L35 9 L45.5 19 L52.5 3 L60 15 L67.5 3 L74.5 19 L85 9 L87 31 Z" fill="url(#gold)" stroke="#9c6c06" stroke-width="1.4" stroke-linejoin="round"/>`
    + '<rect x="32" y="26" width="56" height="8" rx="2" fill="#e8b326" stroke="#9c6c06" stroke-width="1.2"/>'
    + [[35, 9], [52.5, 3], [67.5, 3], [85, 9]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#fffaf0" stroke="#d9c9a0" stroke-width="0.6"/>`).join('')
    + '<path d="M60 16.5 L64.5 22 L60 27.5 L55.5 22 Z" fill="#e0303f" stroke="#8e1020" stroke-width="0.8"/>'
    + '<circle cx="45" cy="30" r="2.6" fill="#2f7de0"/><circle cx="75" cy="30" r="2.6" fill="#2f7de0"/><circle cx="60" cy="30" r="2.2" fill="#3fbf6a"/>'
    + '<path d="M38 13 L41 25" stroke="#fff" stroke-width="1.6" opacity="0.6" stroke-linecap="round"/>'
    + sp.map(([x, y, r, d]) => `<path d="${sparkle(x, y, r)}" fill="#fff"><animate attributeName="opacity" values="0;1;0" dur="1.6s" begin="${d}s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" values="0 ${x} ${y};90 ${x} ${y}" dur="1.6s" begin="${d}s" repeatCount="indefinite"/></path>`).join('')
    + '</g>';
}

// Selve hodet (ører, ull, ansikt, lugg, uttrykk og hatt) i koordinater 0–120
function headParts(look, c, champion) {
  const fc = item('face', look.face) || FACES[0];
  const ht = look.hat ? item('hat', look.hat) : null;
  const ear = (x, rot) => `<g transform="rotate(${rot} ${x} 57)"><ellipse cx="${x}" cy="57" rx="12.5" ry="6.4" fill="${c.face}" stroke="${c.shade}" stroke-width="1"/><ellipse cx="${x}" cy="57" rx="7.6" ry="3.2" fill="#f3a6b8" opacity="0.85"/></g>`;
  const glow = c.glow ? ' filter="url(#glow)"' : '';
  return ear(19, -22) + ear(101, 22)
    + `<g${glow}>${cloud(c, 60, 48, 31, 29, 12, 12, 15)}</g>`
    + woolFx(c, [20, 8, 80, 80])
    + `<ellipse cx="60" cy="63" rx="23.6" ry="24.6" fill="${c.face}"/>`
    + `<g fill="${c.wool}" stroke="${c.shade}" stroke-width="1.4"><circle cx="45.5" cy="40" r="8"/><circle cx="54.5" cy="36" r="8.4"/><circle cx="65" cy="36" r="8.4"/><circle cx="74" cy="40" r="8"/></g>`
    // Ansiktsuttrykket tegnes litt større, så det synes også i små sirkler
    + `<g transform="translate(60 63) scale(1.14) translate(-60 -62)"><ellipse cx="60" cy="67.4" rx="2.6" ry="1.8" fill="${INK}" opacity="0.75"/>${fc.draw(c)}</g>`
    + (champion ? championCrown() : ht ? ht.draw(c) : '');
}

function bodyAndLegs(look, c) {
  const sh = look.shoes ? item('shoes', look.shoes) : null;
  const leg = (x) => `<rect x="${f(x - 4.3)}" y="102.5" width="8.6" height="13" rx="3.6" fill="${c.face}" stroke="${c.shade}" stroke-width="0.9"/>`;
  const hoof = (x) => `<rect x="${f(x - 5)}" y="111.4" width="10" height="6.4" rx="3" fill="${INK}"/>`;
  return `<g${c.glow ? ' filter="url(#glow)"' : ''}>${cloud(c, 60, 101, 26, 11, 10, 11, 0)}</g>`
    + woolFx(c, [30, 88, 60, 30])
    + leg(50.8) + leg(69.6)
    + (sh ? sh.draw(c) : hoof(50.8) + hoof(69.6));
}

function svgDoc(vb, defs, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><defs>${defs}</defs>${body}</svg>`;
}

// view: 'head' = hele sauen forfra (hode, kropp, sko, kjæledyr, spor) – brukes i sirkler og butikk
//       'body' = løpende sau fra siden uten bein (drømmespillet tegner beina selv)
export function sheepSvg(lookIn, { view = 'head', champion = false } = {}) {
  const look = normLook(lookIn);
  const c = item('color', look.color);
  const defs = woolDefs(c) + GOLD_DEF + (c.glow ? GLOW_DEF : '');
  if (view === 'body') {
    const s = 0.76;
    const body = `<g${c.glow ? ' filter="url(#glow)"' : ''}><circle cx="27" cy="60" r="9" fill="${c.wool}" stroke="${c.shade}" stroke-width="1.6"/>${cloud(c, 66, 64, 32, 17, 12, 12, 0)}</g>`
      + woolFx(c, [30, 44, 72, 40])
      + `<g transform="translate(${f(118 - 60 * s)} ${f(42 - 55 * s)}) scale(${s})">${headParts(look, c, champion)}</g>`;
    return svgDoc('0 0 166 112', defs, body);
  }
  const tr = look.trail ? item('trail', look.trail) : null;
  const pt = look.pet ? item('pet', look.pet) : null;
  const body = (tr ? trailDecor(tr) : '')
    + bodyAndLegs(look, c)
    + headParts(look, c, champion)
    + (pt ? `<g transform="translate(74 70) scale(0.48)">${pt.draw()}</g>` : '');
  return svgDoc('0 0 120 120', defs, body);
}

export function petSvg(id) {
  const pt = item('pet', id);
  return pt ? svgDoc('0 0 100 100', '', pt.draw()) : '';
}
export function particleSvg(kind, colorIdx = 0) {
  const t = TRAILS.find((x) => x.kind === kind);
  const c = t && t.colors ? t.colors[colorIdx % t.colors.length] : undefined;
  return svgDoc('0 0 24 24', '', P[kind] ? P[kind](12, 12, 9, c) : '');
}

const urlCache = new Map();
export function svgUrl(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
export function sheepUrl(look, opts = {}) {
  const key = (opts.view || 'head') + '|' + (opts.champion ? 1 : 0) + '|' + JSON.stringify(normLook(look));
  let u = urlCache.get(key);
  if (!u) {
    u = svgUrl(sheepSvg(look, opts));
    if (urlCache.size > 400) urlCache.clear();
    urlCache.set(key, u);
  }
  return u;
}
export function petUrl(id) {
  const key = 'pet|' + id;
  if (!urlCache.has(key)) urlCache.set(key, svgUrl(petSvg(id)));
  return urlCache.get(key);
}

export function sheepImg(look, { view = 'head', champion = false, cls = 'sheep-img', title = '' } = {}) {
  return h('img', { class: cls, src: sheepUrl(look, { view, champion }), alt: '', title: title || undefined, draggable: 'false', decoding: 'async' });
}

// ——— hvem har hvilken sau (oppdateres fra rommet) ———
const reg = { looks: {}, champion: null };
export function setLooks(map) { reg.looks = map && typeof map === 'object' ? map : {}; }
export function setChampionFromBoard(board) {
  const top = board && Array.isArray(board.board) ? board.board[0] : null;
  reg.champion = top && top.score > 0 ? top.seatId : null;
}
export function championSeat() { return reg.champion; }
export function seatLook(id) { return reg.looks[id] || null; }
// Sauen til en plass, eller null hvis eleven ikke har laget sau ennå
export function seatSheep(id, cls = 'token-sheep') {
  const l = reg.looks[id];
  if (!l) return null;
  return sheepImg(l, { champion: reg.champion === id, cls });
}

export function itemName(it, lang) { return it ? (it.name[lang] || it.name.no) : ''; }
