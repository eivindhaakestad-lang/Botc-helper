// Elevenes sauer: katalog (farger, ansikter, frisyrer, hatter, sko, kapper, vinger, spor, kjæledyr,
// rammer og dødsanimasjoner) og tegning som SVG.
// Samme tegning brukes i «lag sauen din», butikken, grimen (alle sirkler) og drømmespillet.
// Alt er egne, enkle tegninger – ingen bilder lastes fra nettet.
//
// Et utseende («look») er bare ID-er: { color, face, hair, hat, shoes, cape, wings, trail, pet, border, deathfx }.
// Mesterkrona (den som leder drømmetoppen) er ikke noe man kjøper – den legges på når man leder.
//
// Sauen kan også ha en tilstand som grimen bestemmer (ikke noe eleven velger):
//   mood: 'sleep' (natt), 'surprised' (noen døde), 'nervous' (nominert), 'cheer' (vant), 'sad' (tapte)
//   ghost: død (spøkelseshale i stedet for bein)

import { h } from '../app/dom.js';

export const INK = '#2b2533';
const f = (n) => Math.round(n * 10) / 10;
const N = (no, en) => ({ no, en });

// ——— katalog ———
// Prisene er regnet ut fra drømmespillet: ca. 500–650 mynter per spilletime.
// Billig: kjøpes første time. Dyrest: ca. 6–8 timer sparing.
const color = (id, name, price, wool, shade, face, fx = {}) => ({ id, name, price, wool, shade, face, ...fx });
export const COLORS = [
  // Basisfarger: enkle og dempede, uten effekter
  color('white', N('Hvit', 'White'), 0, '#efece6', '#c6bfb3', '#f4dccd'),
  color('grey', N('Grå', 'Grey'), 0, '#b9b7bd', '#8a878f', '#f1d8ca'),
  color('charcoal', N('Mørkegrå', 'Charcoal'), 0, '#5d5a63', '#3b3940', '#ecd2c3'),
  color('brown', N('Brun', 'Brown'), 0, '#93725a', '#6a5040', '#f2d7c5'),
  color('beige', N('Beige', 'Beige'), 0, '#ddd0b8', '#ae9f83', '#f4dccd'),
  color('dustyrose', N('Støvrosa', 'Dusty rose'), 0, '#d2aeb4', '#a6828a', '#f5dbcf'),
  color('dove', N('Dueblå', 'Dove blue'), 0, '#a7b6c6', '#7c8b9b', '#f2d9cc'),
  color('sage', N('Salvie', 'Sage'), 0, '#adbba2', '#829078', '#f2d9cc'),
  color('mustard', N('Sennep', 'Mustard'), 0, '#cdb878', '#a08d50', '#f4dbc9'),
  color('lavender', N('Lavendel', 'Lavender'), 0, '#b8b0cf', '#8d85a6', '#f3d9cd'),
  color('terracotta', N('Terrakotta', 'Terracotta'), 0, '#c69a83', '#99715d', '#f4d9c8'),
  color('brick', N('Murstein', 'Brick'), 0, '#b17d77', '#855a55', '#f4d8cb'),
  // Luksusfarger: alle skinner (en glans som glir over ulla), mange er animert
  color('silver', N('Sølv', 'Silver'), 400, 'url(#w)', '#7d8797', '#f1dccf', { grad: ['#ffffff', '#cfd5de', '#8e98a8'], sparkle: true }),
  color('rosegold', N('Rosegull', 'Rose gold'), 600, 'url(#w)', '#a96a57', '#f7dccd', { grad: ['#ffe9e1', '#efb8a6', '#c27d68'], sparkle: true }),
  color('pearl', N('Perlemor', 'Mother of pearl'), 900, 'url(#w)', '#a8a2bf', '#f6e0d6', { anim: [['#fff6fb', '#eef8ff', '#f4fff6', '#fff6fb'], ['#f3d9f0', '#d6e8fb', '#d8f5e4', '#f3d9f0'], ['#c9b6e4', '#a9c8ec', '#a8dcc1', '#c9b6e4']], dur: 7 }),
  color('neon', N('Neon', 'Neon'), 1200, 'url(#w)', '#0b9c66', '#f4dccd', { anim: [['#e6fff2', '#fff0fb', '#e6fff2'], ['#4dffa6', '#ff5fd8', '#4dffa6'], ['#10c97e', '#c41ca8', '#10c97e']], dur: 4, glow: true }),
  color('midnight', N('Midnatt', 'Midnight'), 1500, 'url(#w)', '#11143a', '#efd5c6', { grad: ['#4b50ad', '#2c3074', '#191c48'], stars: true }),
  color('lava', N('Lava', 'Lava'), 1900, 'url(#w)', '#5a0e05', '#f6d8c8', { anim: [['#ffd34d', '#ff9b2e', '#ffd34d'], ['#ff5a1f', '#e0301a', '#ff5a1f'], ['#7a1406', '#4a0a03', '#7a1406']], dur: 2.6, embers: true }),
  color('ice', N('Is', 'Ice'), 2200, 'url(#w)', '#6aa9c9', '#f3e1db', { grad: ['#ffffff', '#d6f3ff', '#9fd8f2'], frost: true, sparkle: true }),
  color('gold', N('Gull', 'Gold'), 2600, 'url(#w)', '#a8760a', '#fbe6bf', { grad: ['#fff6c2', '#f6c945', '#c08410'], sparkle: true, glints: true }),
  color('holo', N('Holografisk', 'Holographic'), 3000, 'url(#w)', '#8a86b8', '#f6e0d6', { anim: [['#ffd6f5', '#d6f0ff', '#e2ffd6', '#fff3c4', '#ffd6f5'], ['#c7b8ff', '#9fe8ff', '#b8ffcf', '#ffe08a', '#c7b8ff'], ['#9d8cff', '#5fc8ff', '#6ee8a8', '#ffb84d', '#9d8cff']], dur: 5, sparkle: true }),
  color('rainbow', N('Regnbue', 'Rainbow'), 3400, 'url(#w)', '#6d4ba6', '#f8dccd', { rainbow: true }),
  color('galaxy', N('Galakse', 'Galaxy'), 4000, 'url(#w)', '#120a2c', '#efd3c8', { galaxy: true, stars: true }),
  color('diamond', N('Diamant', 'Diamond'), 4800, 'url(#w)', '#5aa9c9', '#f3e3dc', { grad: ['#ffffff', '#d4f6ff', '#8fd3ef'], diamond: true, sparkle: true, glints: true }),
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
  hat('tophat', N('Flosshatt', 'Top hat'), 600, () => `<rect x="43" y="4" width="34" height="25" rx="2" fill="#24212b"/><rect x="43" y="20" width="34" height="6" fill="#c0392b"/>` + line('M47 7 L47 18', 2, '#ffffff22') + `<ellipse cx="60" cy="29.5" rx="31" ry="5.6" fill="#1c1a22"/>`),
  hat('viking', N('Vikinghjelm', 'Viking helmet'), 800, () => `<path d="M35 27 Q19 27 18 13 Q26 19 39 18 Z" fill="#f2e6c8" stroke="#c4b083" stroke-width="1.2"/><path d="M85 27 Q101 27 102 13 Q94 19 81 18 Z" fill="#f2e6c8" stroke="#c4b083" stroke-width="1.2"/><path d="M33 32 Q33 7 60 7 Q87 7 87 32 Z" fill="#a3acb6" stroke="#6c757d" stroke-width="1.4"/><rect x="56" y="7.5" width="8" height="24" fill="#858e98"/><rect x="31" y="27" width="58" height="7" rx="3" fill="#858e98"/>` + [38, 48, 72, 82].map((x) => `<circle cx="${x}" cy="30.5" r="1.4" fill="#e5e9ed"/>`).join('')),
  hat('witch', N('Heksehatt', 'Witch hat'), 1000, () => `<path d="M41 29 L65 1 Q70 -1 72 4 L80 29 Z" fill="#5b347f"/><path d="M43.5 25 L79 25 L80.4 29.5 L42 29.5 Z" fill="#2c1a40"/><rect x="57" y="23.6" width="7" height="7" rx="1" fill="none" stroke="#f4c542" stroke-width="1.6"/><ellipse cx="60" cy="30" rx="41" ry="7" fill="#4a2a6b"/>`),
  hat('horns', N('Djevlehorn', 'Devil horns'), 1200, () => `<path d="M38 26 Q29 13 39 5 Q38 15 47 20 Z" fill="#d2342f" stroke="#8e1f1f" stroke-width="1.2"/><path d="M82 26 Q91 13 81 5 Q82 15 73 20 Z" fill="#d2342f" stroke="#8e1f1f" stroke-width="1.2"/>`),
  hat('halo', N('Glorie', 'Halo'), 1200, () => `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="2.4s" repeatCount="indefinite"/><ellipse cx="60" cy="7" rx="23" ry="5.2" fill="none" stroke="#ffe680" stroke-width="8" opacity="0.35"/><ellipse cx="60" cy="7" rx="23" ry="5.2" fill="none" stroke="#ffd23f" stroke-width="3.6"/></g>`),
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

const DECOR_SPOTS = [[18, 24, 7], [102, 22, 6], [8, 60, 6], [112, 52, 5], [17, 94, 5.5], [103, 94, 5], [31, 10, 4.5], [89, 10, 4.5]];
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
    return `<g opacity="0.8" fill="none">${cols.map((c, i) => `<path d="M${12 + i * 3.4} 100 A${48 - i * 3.4} ${48 - i * 3.4} 0 0 1 ${108 - i * 3.4} 100" stroke="${c}" stroke-width="3.6"/>`).join('')}</g>`;
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


// ——— rammer rundt sauen i grimen (sirkelen) ———
// css: ringen tegnes med CSS (glans som roterer osv.), svg: pynt rundt (blomster, hjerter, flammer …)
const ringPos = (n, r = 45, start = -90) => Array.from({ length: n }, (_, i) => { const a = ((start + (360 / n) * i) * Math.PI) / 180; return [f(50 + r * Math.cos(a)), f(50 + r * Math.sin(a)), f((start + (360 / n) * i) + 90)]; });
const spin = (dur, rev = false) => `<animateTransform attributeName="transform" type="rotate" from="${rev ? 360 : 0} 50 50" to="${rev ? 0 : 360} 50 50" dur="${dur}s" repeatCount="indefinite"/>`;
const FRAME_SVG = {
  flowers: () => `<g>${spin(40)}<circle cx="50" cy="50" r="45" fill="none" stroke="#4f9a45" stroke-width="2.2"/>${ringPos(12).map(([x, y], i) => { const col = ['#ff8fb1', '#ffffff', '#c39bff', '#ffd23f'][i % 4]; let p = ''; for (let k = 0; k < 5; k++) { const a = (Math.PI * 2 * k) / 5; p += `<circle cx="${f(x + Math.cos(a) * 2.9)}" cy="${f(y + Math.sin(a) * 2.9)}" r="2.6" fill="${col}"/>`; } return p + `<circle cx="${x}" cy="${y}" r="1.9" fill="#f4b400"/>`; }).join('')}</g>`,
  hearts: () => `<g>${spin(14)}${ringPos(10).map(([x, y], i) => `<path d="${heartPath(+x, +y, 7.5)}" fill="${['#ff4d7d', '#ff8fb1'][i % 2]}"/>`).join('')}</g>`,
  stars: () => `<g>${spin(10, true)}${ringPos(9).map(([x, y], i) => `<path d="${sparkle(+x, +y, 4.6)}" fill="${['#ffd23f', '#ffffff', '#ffe98a'][i % 3]}"><animate attributeName="opacity" values="1;0.35;1" dur="1.6s" begin="${(i * 0.18).toFixed(2)}s" repeatCount="indefinite"/></path>`).join('')}</g>`,
  ice: () => `<circle cx="50" cy="50" r="45" fill="none" stroke="#bfefff" stroke-width="3" opacity="0.85"/>${ringPos(12).map(([x, y, rot], i) => `<g transform="rotate(${rot} ${x} ${y})" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"><path d="M${x} ${f(y - 5)} L${x} ${f(+y + 5)} M${f(x - 4.3)} ${f(y - 2.5)} L${f(+x + 4.3)} ${f(+y + 2.5)} M${f(x - 4.3)} ${f(+y + 2.5)} L${f(+x + 4.3)} ${f(y - 2.5)}"/><animate attributeName="opacity" values="1;0.4;1" dur="${2 + (i % 3) * 0.5}s" repeatCount="indefinite"/></g>`).join('')}`,
  fire: () => {
    const flames = (off, col1, col2) => ringPos(16, 44, -90 + off).map(([x, y, rot]) => `<g transform="rotate(${rot} ${x} ${y})"><path d="M${x} ${f(y - 8)} Q${f(+x + 4.5)} ${f(y - 1)} ${x} ${f(+y + 3.5)} Q${f(x - 4.5)} ${f(y - 1)} ${x} ${f(y - 8)} Z" fill="${col1}"/><path d="M${x} ${f(y - 4)} Q${f(+x + 2.2)} ${f(y - 0.2)} ${x} ${f(+y + 2.5)} Q${f(x - 2.2)} ${f(y - 0.2)} ${x} ${f(y - 4)} Z" fill="${col2}"/></g>`).join('');
    return `<circle cx="50" cy="50" r="44" fill="none" stroke="#ff7a1a" stroke-width="3"/><g>${flames(0, '#ff6a1a', '#ffd34d')}<animate attributeName="opacity" values="1;0.25;1" dur="0.7s" repeatCount="indefinite"/></g><g>${flames(11.25, '#ff3b1f', '#ffb02e')}<animate attributeName="opacity" values="0.25;1;0.25" dur="0.7s" repeatCount="indefinite"/></g>`;
  },
  lightning: () => `<circle cx="50" cy="50" r="45" fill="none" stroke="#7fd4ff" stroke-width="2.4"/>${ringPos(6, 45, -60).map(([x, y, rot], i) => `<g transform="rotate(${rot} ${x} ${y})"><path d="M${f(x - 1.5)} ${f(y - 9)} L${f(+x + 3)} ${f(y - 1.5)} L${f(x - 0.5)} ${f(y - 1)} L${f(+x + 2)} ${f(+y + 8)} L${f(x - 3.5)} ${f(+y + 0.5)} L${f(+x + 0.5)} ${y} Z" fill="#fff36b" stroke="#ffb800" stroke-width="0.6"/><animate attributeName="opacity" values="1;0;1;1;0;1" keyTimes="0;0.1;0.2;0.6;0.65;1" dur="${1.4 + i * 0.23}s" repeatCount="indefinite"/></g>`).join('')}`,
  galaxy: () => `<g>${spin(30)}${ringPos(14, 45).map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 0.9 : 1.6}" fill="#fff"><animate attributeName="opacity" values="1;0.2;1" dur="${1.4 + (i % 4) * 0.4}s" repeatCount="indefinite"/></circle>`).join('')}</g>`,
  demon: () => ringPos(10, 46).map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="1.3" fill="#ffb02e"><animate attributeName="opacity" values="0;1;0" dur="${1.2 + (i % 4) * 0.3}s" begin="${(i * 0.15).toFixed(2)}s" repeatCount="indefinite"/></circle>`).join(''),
};
const frameDef = (id, name, price, svg = false) => ({ id, name, price, svg });
export const BORDERS = [
  frameDef('wood', N('Treramme', 'Wooden frame'), 250),
  frameDef('silver', N('Sølvring', 'Silver ring'), 500),
  frameDef('flowers', N('Blomsterring', 'Flower ring'), 800, true),
  frameDef('hearts', N('Hjerteramme', 'Heart ring'), 1000, true),
  frameDef('gold', N('Gullring', 'Gold ring'), 1400),
  frameDef('neon', N('Neonring', 'Neon ring'), 1700),
  frameDef('stars', N('Stjernebane', 'Star orbit'), 2000, true),
  frameDef('ice', N('Isring', 'Ice ring'), 2300, true),
  frameDef('fire', N('Ildring', 'Ring of fire'), 2800, true),
  frameDef('demon', N('Demonring', 'Demon ring'), 3000, true),
  frameDef('lightning', N('Lynring', 'Lightning ring'), 3200, true),
  frameDef('rainbow', N('Regnbuering', 'Rainbow ring'), 3600),
  frameDef('galaxy', N('Galaksevirvel', 'Galaxy swirl'), 4200, true),
];

// ——— ullfrisyrer: endrer formen på ulla på hodet ———
const hairDef = (id, name, price) => ({ id, name, price });
export const HAIRS = [
  hairDef('bun', N('Topp-dott', 'Top knot'), 400),
  hairDef('afro', N('Afro', 'Afro'), 500),
  hairDef('pigtails', N('Musefletter', 'Pigtails'), 650),
  hairDef('curls', N('Superkrøller', 'Super curls'), 750),
  hairDef('mohawk', N('Hanekam', 'Mohawk'), 950),
  hairDef('spikes', N('Piggsveis', 'Spiky hair'), 1150),
];

// ——— kapper: henger bak sauen (flagrer i drømmespillet) ———
const capeDef = (id, name, price, a, b, fx = {}) => ({ id, name, price, a, b, ...fx });
export const CAPES = [
  capeDef('hero', N('Superheltkappe', 'Superhero cape'), 600, '#e0312f', '#9e1b1b'),
  capeDef('vampire', N('Vampyrkappe', 'Vampire cape'), 1100, '#1d1724', '#0d0a12', { lining: '#c0182b', collar: true }),
  capeDef('star', N('Stjernekappe', 'Star cape'), 1600, '#3b3f9e', '#151744', { stars: true }),
  capeDef('royal', N('Kongekappe', 'Royal cape'), 2200, '#7a35b8', '#45196e', { trim: true }),
  capeDef('fire', N('Ildkappe', 'Fire cape'), 2800, '#ff8a1f', '#c2260f', { flames: true }),
];

// ——— vinger: sitter på ryggen og slår med vingene ———
const wingDef = (id, name, price, rate) => ({ id, name, price, rate });
export const WINGS = [
  wingDef('bat', N('Flaggermusvinger', 'Bat wings'), 1200, 0.45),
  wingDef('angel', N('Englevinger', 'Angel wings'), 1500, 1.1),
  wingDef('butterfly', N('Sommerfuglvinger', 'Butterfly wings'), 1900, 0.75),
  wingDef('fairy', N('Feevinger', 'Fairy wings'), 2400, 0.32),
  wingDef('dragon', N('Drakevinger', 'Dragon wings'), 3200, 1.3),
];

// ——— dødsanimasjoner: hvordan sauen dør på storskjermen (tegnes i deathfx.js) ———
const fxDef = (id, name, price, icon) => ({ id, name, price, icon });
export const DEATHFX = [
  fxDef('puff', N('Ullpuff', 'Wool puff'), 500, '💨'),
  fxDef('leaves', N('Løvvirvel', 'Leaf swirl'), 800, '🍂'),
  fxDef('confetti', N('Konfettikanon', 'Confetti cannon'), 1100, '🎉'),
  fxDef('lightning', N('Lynnedslag', 'Lightning strike'), 1600, '⚡'),
  fxDef('ufo', N('UFO-bortføring', 'UFO abduction'), 2500, '🛸'),
  fxDef('vortex', N('Sort hull', 'Black hole'), 3500, '🌀'),
];

export const CATS = [
  { key: 'color', icon: '🎨', name: N('Farger', 'Colors'), list: COLORS },
  { key: 'face', icon: '😀', name: N('Ansikter', 'Faces'), list: FACES },
  { key: 'hair', icon: '💇', name: N('Frisyrer', 'Hairstyles'), list: HAIRS },
  { key: 'hat', icon: '🎩', name: N('Hatter', 'Hats'), list: HATS },
  { key: 'shoes', icon: '👟', name: N('Sko', 'Shoes'), list: SHOES },
  { key: 'cape', icon: '🦸', name: N('Kapper', 'Capes'), list: CAPES },
  { key: 'wings', icon: '🦋', name: N('Vinger', 'Wings'), list: WINGS },
  { key: 'trail', icon: '✨', name: N('Spor', 'Trails'), list: TRAILS },
  { key: 'pet', icon: '🐾', name: N('Kjæledyr', 'Pets'), list: PETS },
  { key: 'border', icon: '⭕', name: N('Rammer', 'Frames'), list: BORDERS },
  { key: 'deathfx', icon: '💥', name: N('Dødsanimasjon', 'Death effect'), list: DEATHFX },
];
const BY = Object.fromEntries(CATS.map((c) => [c.key, Object.fromEntries(c.list.map((x) => [x.id, x]))]));
export function item(cat, id) { return (BY[cat] || {})[id] || null; }
export const FREE_COLORS = COLORS.filter((x) => !x.price).map((x) => x.id);
export const FREE_FACES = FACES.filter((x) => !x.price).map((x) => x.id);
export const LOOK_KEYS = CATS.map((c) => c.key);
// Kategorier man kan «ta av» (farge og ansikt må man alltid ha)
export const REMOVABLE = LOOK_KEYS.filter((k) => k !== 'color' && k !== 'face');

// Bare kjente ID-er slipper gjennom (resten blir standard / ingenting)
export function normLook(l) {
  const o = l && typeof l === 'object' ? l : {};
  const out = {};
  for (const k of LOOK_KEYS) out[k] = BY[k][o[k]] ? o[k] : k === 'color' ? 'white' : k === 'face' ? 'happy' : '';
  return out;
}
export function randomLook() {
  const out = normLook({});
  out.color = FREE_COLORS[Math.floor(Math.random() * FREE_COLORS.length)];
  out.face = FREE_FACES[Math.floor(Math.random() * FREE_FACES.length)];
  return out;
}

// ——— tegning ———
function animStops(lists, dur) {
  return lists.map((vals, i) => `<stop offset="${i / (lists.length - 1)}" stop-color="${vals[0]}"><animate attributeName="stop-color" values="${vals.join(';')}" dur="${dur}s" repeatCount="indefinite"/></stop>`).join('');
}
function woolDefs(c) {
  if (c.anim) return `<linearGradient id="w" x1="0" y1="0" x2="0.5" y2="1">${animStops(c.anim, c.dur || 6)}</linearGradient>`;
  if (c.rainbow) {
    const cols = ['#ff6b6b', '#ffb84d', '#ffe55c', '#6ee08a', '#63b3ff', '#b07bff', '#ff6b6b'];
    const rot = (i) => [...cols.slice(i), ...cols.slice(1, i + 1)].join(';');
    return `<linearGradient id="w" x1="0" y1="0" x2="1" y2="1">${[0, 0.5, 1].map((o, i) => `<stop offset="${o}" stop-color="${cols[i * 2]}"><animate attributeName="stop-color" values="${rot(i * 2)}" dur="6s" repeatCount="indefinite"/></stop>`).join('')}</linearGradient>`;
  }
  if (c.galaxy) return `<radialGradient id="w" cx="0.4" cy="0.35" r="0.8">${animStops([['#8a5ae6', '#c25ae6', '#5a7ae6', '#8a5ae6'], ['#3a2580', '#5a1f7a', '#1f3a80', '#3a2580'], ['#160c38', '#1a0a30', '#0c1638', '#160c38']], 8)}</radialGradient>`;
  if (c.grad) return `<linearGradient id="w" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${c.grad[0]}"/><stop offset="0.55" stop-color="${c.grad[1]}"/><stop offset="1" stop-color="${c.grad[2]}"/></linearGradient>`;
  return '';
}
const GOLD_DEF = '<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4b8"/><stop offset="0.5" stop-color="#f6c945"/><stop offset="1" stop-color="#c48a14"/></linearGradient>';
const SWEEP_DEF = '<linearGradient id="sw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>';
const GLOW_DEF = '<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';

function bumps(cx, cy, rx, ry, n, r, start = 0) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = ((start + (360 / n) * i) * Math.PI) / 180;
    s += `<circle cx="${f(cx + rx * Math.cos(a))}" cy="${f(cy + ry * Math.sin(a))}" r="${r}"/>`;
  }
  return s;
}
function cloudShapes(cx, cy, rx, ry, n, r, start = 0) {
  return bumps(cx, cy, rx, ry, n, r, start) + `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
}
// Glans som glir over ulla (bare luksusfarger). id må være unik i dokumentet.
function sweep(id, shapes, x, y, w, hh, delay = 0) {
  return `<clipPath id="${id}">${shapes}</clipPath><g clip-path="url(#${id})"><g transform="rotate(24 ${f(x + w / 2)} ${f(y + hh / 2)})"><rect x="${f(x - 60)}" y="${f(y - 40)}" width="${f(w * 0.32)}" height="${f(hh + 80)}" fill="url(#sw)"><animate attributeName="x" values="${f(x - 60)};${f(x + w + 30)};${f(x + w + 30)}" keyTimes="0;0.5;1" dur="3.4s" begin="${delay}s" repeatCount="indefinite"/></rect></g></g>`;
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
  if (c.embers) {
    s += [[0.25, 0.7], [0.55, 0.8], [0.75, 0.6], [0.4, 0.5]].map(([px, py], i) => `<circle cx="${f(x0 + w * px)}" cy="${f(y0 + hh * py)}" r="1.6" fill="#ffd34d"><animate attributeName="cy" values="${f(y0 + hh * py)};${f(y0 + hh * py - 18)}" dur="${1.6 + i * 0.3}s" begin="${i * 0.4}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="${1.6 + i * 0.3}s" begin="${i * 0.4}s" repeatCount="indefinite"/></circle>`).join('');
  }
  if (c.frost) {
    s += [[0.2, 0.3], [0.7, 0.25], [0.45, 0.65], [0.82, 0.62]].map(([px, py], i) => { const x = f(x0 + w * px); const y = f(y0 + hh * py); return `<g stroke="#ffffff" stroke-width="0.9" opacity="0.8"><path d="M${x - 3} ${y} L${x + 3} ${y} M${x} ${y - 3} L${x} ${y + 3} M${x - 2.1} ${y - 2.1} L${x + 2.1} ${y + 2.1} M${x - 2.1} ${y + 2.1} L${x + 2.1} ${y - 2.1}"/><animate attributeName="opacity" values="0.9;0.3;0.9" dur="${2.4 + i * 0.4}s" repeatCount="indefinite"/></g>`; }).join('');
  }
  if (c.glints) {
    s += [[0.3, 0.18, 5.4], [0.7, 0.55, 4.6]].map(([px, py, r], i) => `<path d="${sparkle(f(x0 + w * px), f(y0 + hh * py), r)}" fill="#fff"><animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.6;0.8;1" dur="2.6s" begin="${i * 1.3}s" repeatCount="indefinite"/></path>`).join('');
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

// ——— tilstander: ansikt og små tegn over hodet ———
// Ansiktene tegnes i samme koordinater som FACES (øyne på (51,58) og (69,58)).
const MOOD_FACE = {
  sleep: () => line('M46.5 58 Q51 62.6 55.5 58', 2.5) + line('M64.5 58 Q69 62.6 73.5 58', 2.5) + `<ellipse cx="60" cy="73.4" rx="2.4" ry="1.9" fill="${INK}"/>` + cheeks(0.5),
  surprised: () => `<ellipse cx="51" cy="57.5" rx="5.4" ry="6.4" fill="#fff" stroke="${INK}" stroke-width="1.7"/><ellipse cx="69" cy="57.5" rx="5.4" ry="6.4" fill="#fff" stroke="${INK}" stroke-width="1.7"/><circle cx="51" cy="58.2" r="2.3" fill="${INK}"/><circle cx="69" cy="58.2" r="2.3" fill="${INK}"/>`
    + line('M44.5 47.6 Q50 43.4 55.5 47', 2.3) + line('M64.5 47 Q70 43.4 75.5 47.6', 2.3) + `<ellipse cx="60" cy="74.2" rx="4.4" ry="5.6" fill="${INK}"/><ellipse cx="60" cy="76.6" rx="2.6" ry="1.8" fill="#f07a8f"/>`,
  nervous: () => eye(51, 58.6, 3, 3.7) + eye(69, 58.6, 3, 3.7) + line('M45 52.6 Q49.5 49 55.4 50.6', 2.1) + line('M75 52.6 Q70.5 49 64.6 50.6', 2.1)
    + line('M52 73.2 Q54.5 70.4 57 73.2 Q59.5 76 62 73.2 Q64.5 70.4 67 73.2 Q68.4 74.8 69 74.2', 2.1) + cheeks(0.35, '#9ad0ff'),
  cheer: () => line('M45.6 60.4 Q51 53.2 56.4 60.4', 2.8) + line('M63.6 60.4 Q69 53.2 74.4 60.4', 2.8)
    + `<path d="M49.4 67.6 Q60 87 70.6 67.6 Z" fill="${INK}"/><path d="M52 68.3 L68 68.3 L67 71.2 L53 71.2 Z" fill="#fff"/><ellipse cx="60" cy="79.6" rx="4.6" ry="2.7" fill="#f07a8f"/>` + cheeks(0.8),
  sad: () => eye(51, 60) + eye(69, 60) + line('M45.4 54.4 Q50 51 55.6 52.6', 2.1) + line('M74.6 54.4 Q70 51 64.4 52.6', 2.1) + line('M53.4 76.4 Q60 70.6 66.6 76.4', 2.3),
};
const outlined = (d, w, c = '#fff') => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f(w + 2.4)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
function zee(x, y, s, delay) {
  const d = `M${x} ${y} h${s} l${-s} ${s} h${s}`;
  return `<g opacity="0"><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.7;1" dur="2.7s" begin="${delay}s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="-3 8;4 -6" dur="2.7s" begin="${delay}s" repeatCount="indefinite"/>${outlined(d, f(s * 0.24))}</g>`;
}
function sweatDrop(x, y, s, delay) {
  return `<g><animateTransform attributeName="transform" type="translate" values="0 -2;0 13" dur="1.15s" begin="${delay}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;1;0" keyTimes="0;0.65;1" dur="1.15s" begin="${delay}s" repeatCount="indefinite"/>`
    + `<path d="M${x} ${f(y - s)} Q${f(x + s * 0.8)} ${f(y + s * 0.25)} ${x} ${f(y + s * 0.62)} Q${f(x - s * 0.8)} ${f(y + s * 0.25)} ${x} ${f(y - s)} Z" fill="#8fd8ff" stroke="#2d79b0" stroke-width="1"/><circle cx="${f(x - s * 0.22)}" cy="${f(y + s * 0.05)}" r="${f(s * 0.17)}" fill="#fff"/></g>`;
}
function moodProps(mood) {
  if (mood === 'sleep') return zee(76, 36, 6.5, 0) + zee(84, 22, 8, 0.9) + zee(80, 8, 9, 1.8);
  if (mood === 'nervous') return sweatDrop(86, 42, 6.4, 0) + sweatDrop(33, 47, 5, 0.55) + sweatDrop(80, 30, 4.4, 0.3);
  if (mood === 'surprised') {
    return '<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -2.5;0 0" dur="0.5s" repeatCount="indefinite"/>'
      + `<path d="M97 20 L105 20 L102.6 38 L99.4 38 Z" fill="#ffd23f" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="101" cy="44" r="3.2" fill="#ffd23f" stroke="${INK}" stroke-width="1.8"/></g>`
      + [[86, 14, 30], [34, 14, -30], [60, 6, 0]].map(([x, y, r]) => `<path d="M${x} ${y} l0 -6" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" transform="rotate(${r} ${x} ${y})"/>`).join('');
  }
  if (mood === 'cheer') {
    return [[12, 26, 5.4, 0], [108, 30, 5, 0.4], [18, 82, 4.4, 0.8], [104, 84, 4.6, 0.2], [60, 2, 4, 0.6]].map(([x, y, r, d]) => `<path d="${sparkle(x, y, r)}" fill="#ffe56b" stroke="#c98a00" stroke-width="0.6"><animate attributeName="opacity" values="0;1;0" dur="1.1s" begin="${d}s" repeatCount="indefinite"/></path>`).join('');
  }
  if (mood === 'sad') {
    // En tåre som triller nedover kinnet
    return '<g><animateTransform attributeName="transform" type="translate" values="0 0;-1 16" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.75;1" dur="1.6s" repeatCount="indefinite"/>'
      + '<path d="M46 63 Q43.4 68.4 46 70.2 Q48.6 68.4 46 63 Z" fill="#7fc4ff" stroke="#2d79b0" stroke-width="0.8"/></g>';
  }
  return '';
}

// ——— ullfrisyrer: formen på ulla på hodet (bak, sky, lugg og pynt foran) ———
const curl = (x, y, r, col) => `<path d="M${f(x - r)} ${y} a${r} ${r} 0 1 1 ${r} ${r} a${f(r * 0.55)} ${f(r * 0.55)} 0 1 1 ${f(-r * 0.5)} ${f(-r * 0.6)}" fill="none" stroke="${col}" stroke-width="1.3" stroke-linecap="round"/>`;
const bow = (x, y) => `<path d="M${x} ${y} l-6.4 -4.4 v8.8 Z M${x} ${y} l6.4 -4.4 v8.8 Z" fill="#ff5fa2" stroke="#b93676" stroke-width="0.9" stroke-linejoin="round"/><circle cx="${x}" cy="${y}" r="2.1" fill="#ff9cc9" stroke="#b93676" stroke-width="0.6"/>`;
const circles = (pts, attrs) => `<g ${attrs}>${pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`;
function hairWool(look, c) {
  const W = c.wool;
  const S = c.shade;
  const fill = `fill="${W}" stroke="${S}" stroke-width="1.4"`;
  const base = {
    back: '', front: '', ears: [19, 101], area: [20, 8, 80, 80], sweepBox: [17, 6, 86, 84],
    cloud: cloud(c, 60, 48, 31, 29, 12, 12, 15), clip: cloudShapes(60, 48, 31, 29, 12, 12, 15),
    fringe: circles([[45.5, 40, 8], [54.5, 36, 8.4], [65, 36, 8.4], [74, 40, 8]], fill),
  };
  switch (look.hair) {
    case 'afro': {
      // Stor og rund: bredere enn hodet, med små krøller i ulla
      const dots = [[22, 30], [30, 16], [44, 8], [76, 8], [90, 16], [98, 30], [16, 48], [104, 48], [20, 66], [100, 66]].map(([x, y]) => curl(x, y, 2.6, S)).join('');
      return { ...base, ears: [13, 107], area: [10, 2, 100, 86], sweepBox: [6, 0, 108, 92],
        cloud: cloud(c, 60, 45, 41, 32, 18, 12, 0), clip: cloudShapes(60, 45, 41, 32, 18, 12, 0), front: dots,
        fringe: circles([[41, 41, 8.4], [50, 36, 9], [60, 34, 9.2], [70, 36, 9], [79, 41, 8.4]], fill) };
    }
    case 'mohawk': {
      // Barbert på sidene, høy kam på toppen med fargede tupper
      const crest = 'M45 40 L46.4 12 L52 24 L54.6 0.5 L60 17 L65.4 0.5 L68 24 L73.6 12 L75 40 Z';
      const tips = 'M46 20.4 L46.4 12 L50.6 21 Z M53.6 10 L54.6 0.5 L57.6 11 Z M62.4 11 L65.4 0.5 L66.4 10 Z M69.4 21 L73.6 12 L74 20.4 Z';
      return { ...base, back: `<path d="${crest}" fill="${W}" stroke="${S}" stroke-width="1.8" stroke-linejoin="round"/><path d="${tips}" fill="#ff3fa4" stroke="${S}" stroke-width="1" stroke-linejoin="round"/>`,
        cloud: cloud(c, 60, 52, 26, 23, 12, 8.6, 15), clip: cloudShapes(60, 52, 26, 23, 12, 8.6, 15) + `<path d="${crest}"/>`, sweepBox: [24, 0, 72, 86], area: [26, 10, 68, 76],
        fringe: circles([[49, 39, 6.6], [56, 36, 7], [64, 36, 7], [71, 39, 6.6]], fill) };
    }
    case 'curls': {
      const fr = [[44, 40], [52, 35.6], [60, 34], [68, 35.6], [76, 40]];
      return { ...base, cloud: cloud(c, 60, 47, 32, 30, 18, 9.5, 0), clip: cloudShapes(60, 47, 32, 30, 18, 9.5, 0),
        front: [[30, 40], [36, 25], [47, 16], [60, 12.5], [73, 16], [84, 25], [90, 40], [26, 56], [94, 56]].map(([x, y]) => curl(x, y, 3.2, S)).join(''),
        fringe: circles(fr.map(([x, y]) => [x, y, 6.7]), fill) + fr.map(([x, y]) => curl(x, y - 0.6, 2.5, S)).join('') };
    }
    case 'bun':
      return { ...base, front: `<circle cx="60" cy="11.4" r="10.6" fill="${W}" stroke="${S}" stroke-width="1.6"/><path d="M53.4 9.6 Q60 4.4 66.6 9.6" fill="none" stroke="${S}" stroke-width="1.1" opacity="0.6"/><rect x="49" y="18.4" width="22" height="5.6" rx="2.8" fill="#ff5fa2" stroke="#b93676" stroke-width="0.9"/>` };
    case 'pigtails':
      return { ...base, front: circles([[18, 28, 9], [12.4, 39, 8], [15.6, 49, 6.6], [102, 28, 9], [107.6, 39, 8], [104.4, 49, 6.6]], `fill="${W}" stroke="${S}" stroke-width="1.5"`) + bow(27, 26) + bow(93, 26) };
    case 'spikes': {
      let sp = '';
      for (const a of [192, 214, 236, 258, 282, 304, 326, 348]) {
        const r = (d) => (d * Math.PI) / 180;
        const tx = f(60 + 56 * Math.cos(r(a))); const ty = f(50 + 50 * Math.sin(r(a)));
        const lx = f(60 + 27 * Math.cos(r(a - 13))); const ly = f(50 + 25 * Math.sin(r(a - 13)));
        const rx = f(60 + 27 * Math.cos(r(a + 13))); const ry = f(50 + 25 * Math.sin(r(a + 13)));
        sp += `<path d="M${lx} ${ly} L${tx} ${ty} L${rx} ${ry} Z"/>`;
      }
      return { ...base, back: `<g fill="${W}" stroke="${S}" stroke-width="1.6" stroke-linejoin="round">${sp}</g>` };
    }
    default:
      return base;
  }
}

// ——— kapper (forfra: kantene flagrer på hver side bak sauen) ———
function capeDefs(cp) {
  return cp ? `<linearGradient id="cpg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cp.a}"/><stop offset="1" stop-color="${cp.b}"/></linearGradient>` : '';
}
// (Alt holdes innenfor sirkelen sauen vises i, så kappa synes på sidene av kroppen.)
function capeBack(cp) {
  const p1 = 'M43 79 Q16 79 8 91 Q7 100 15 104 Q14 110 26 110 Q40 108 52 112 L68 112 Q80 108 94 110 Q106 110 105 104 Q113 100 112 91 Q104 79 77 79 Z';
  const p2 = 'M43 79 Q19 81 11 92 Q11 101 18 104 Q18 109 28 109 Q41 107 52 111 L68 111 Q79 107 92 109 Q102 109 102 104 Q109 101 109 92 Q101 81 77 79 Z';
  const edge1 = 'M8 91 Q7 100 15 104 Q14 110 26 110 M94 110 Q106 110 105 104 Q113 100 112 91';
  const edge2 = 'M11 92 Q11 101 18 104 Q18 109 28 109 M92 109 Q102 109 102 104 Q109 101 109 92';
  const wave = (a, b) => `<animate attributeName="d" values="${a};${b};${a}" dur="2.4s" repeatCount="indefinite"/>`;
  let s = '';
  if (cp.collar) {
    // Høy, spiss krage som stikker opp bak hodet
    s += `<path d="M42 86 L11 31 Q17 53 32 66 Z" fill="${cp.a}" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/><path d="M40 81 L16 39 Q20 55 32 64 Z" fill="${cp.lining}"/>`
      + `<path d="M78 86 L109 31 Q103 53 88 66 Z" fill="${cp.a}" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/><path d="M80 81 L104 39 Q100 55 88 64 Z" fill="${cp.lining}"/>`;
  }
  s += `<path d="${p1}" fill="url(#cpg)" stroke="${cp.b}" stroke-width="1.3" stroke-linejoin="round">${wave(p1, p2)}</path>`;
  if (cp.lining) s += `<path d="M44 84 Q22 86 15 94 Q16 102 26 106 L94 106 Q104 102 105 94 Q98 86 76 84 Z" fill="${cp.lining}" opacity="0.9"/>`;
  if (cp.id === 'hero') s += line('M30 86 Q18 92 15 101', 1.6, '#ff7a6b') + line('M90 86 Q102 92 105 101', 1.6, '#ff7a6b');
  if (cp.trim) {
    s += `<path d="${edge1}" fill="none" stroke="#fffaf0" stroke-width="5.4" stroke-linecap="round">${wave(edge1, edge2)}</path>`
      + [[9, 95], [12, 102], [20, 107], [100, 107], [108, 102], [111, 95]].map(([x, y]) => `<path d="M${x} ${y - 1.4} l1.1 2.6 l-2.2 0 Z" fill="#1a1420"/>`).join('');
  }
  if (cp.stars) {
    s += [[14, 93, 2.6], [21, 101, 2], [19, 88, 1.6], [106, 93, 2.6], [99, 101, 2], [101, 88, 1.6], [26, 107, 1.4], [94, 107, 1.4]]
      .map(([x, y, r], i) => `<path d="${sparkle(x, y, r * 1.6)}" fill="#fff6c2"><animate attributeName="opacity" values="1;0.25;1" dur="${1.4 + (i % 3) * 0.5}s" repeatCount="indefinite"/></path>`).join('');
  }
  if (cp.flames) {
    s += [[10, 97], [17, 105], [27, 109], [93, 109], [103, 105], [110, 97]].map(([x, y], i) => `<g opacity="0.95"><animate attributeName="opacity" values="1;0.45;1" dur="${0.5 + (i % 3) * 0.17}s" repeatCount="indefinite"/>${P.flame(x, y, 6)}</g>`).join('');
  }
  return s;
}

// ——— vinger: én vinge i lokale koordinater (roten i 0,0, vingen peker opp og ut til venstre) ———
const WING_SHAPE = {
  bat: () => '<path d="M0 0 L-6 -38 L-45 -61 Q-39 -48 -45 -37 Q-35 -38 -33 -27 Q-25 -30 -21 -18 Q-12 -20 0 0 Z" fill="#40305a" stroke="#1f1530" stroke-width="1.7" stroke-linejoin="round"/>'
    + line('M-6 -38 L-45 -37', 1.3, '#1f1530') + line('M-6 -38 L-33 -27', 1.3, '#1f1530') + line('M-6 -38 L-21 -18', 1.3, '#1f1530') + '<path d="M-6 -38 l-1 -7 l5 4 Z" fill="#1f1530"/>',
  angel: () => '<path d="M0 0 Q-10 -46 -40 -69 Q-49 -53 -43 -43 Q-51 -35 -43 -27 Q-49 -17 -37 -11 Q-39 -2 -25 0 Q-12 4 0 0 Z" fill="#fdfbff" stroke="#b9b1d0" stroke-width="1.5" stroke-linejoin="round"/>'
    + ['M-37 -60 Q-29 -50 -33 -41', 'M-40 -41 Q-30 -35 -34 -27', 'M-38 -25 Q-28 -19 -30 -11', 'M-31 -9 Q-21 -7 -19 0', 'M-22 -50 Q-16 -36 -18 -24'].map((d) => line(d, 1.2, '#cfc8e2')).join(''),
  butterfly: () => '<path d="M0 0 Q-6 -52 -36 -63 Q-53 -61 -47 -41 Q-41 -20 -6 -6 Z" fill="url(#wgb)" stroke="#2a1840" stroke-width="2" stroke-linejoin="round"/>'
    + '<path d="M0 0 Q-30 -4 -41 10 Q-42 27 -23 23 Q-8 19 0 2 Z" fill="url(#wgb2)" stroke="#2a1840" stroke-width="2" stroke-linejoin="round"/>'
    + line('M-4 -6 Q-22 -30 -38 -52', 1.1, '#2a1840') + line('M-4 -4 Q-26 -20 -44 -38', 1.1, '#2a1840') + line('M-2 2 Q-18 8 -32 16', 1.1, '#2a1840')
    + '<circle cx="-40" cy="-51" r="3.2" fill="#fff"/><circle cx="-31" cy="-58" r="2.1" fill="#fff"/><circle cx="-45" cy="-42" r="1.8" fill="#fff"/><circle cx="-30" cy="13" r="2.6" fill="#fff"/>',
  fairy: () => '<path d="M0 0 Q-14 -58 -36 -71 Q-43 -61 -31 -37 Q-19 -14 0 0 Z" fill="#c8f4ff" fill-opacity="0.55" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/>'
    + '<path d="M0 0 Q-34 -12 -47 -2 Q-41 9 -25 7 Q-11 5 0 0 Z" fill="#ffd6fb" fill-opacity="0.55" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/>'
    + line('M-2 -4 Q-18 -32 -34 -64', 0.9, '#ffffff') + line('M-3 -1 Q-24 -4 -42 -1', 0.9, '#ffffff')
    + [[-30, -52, 3, 0], [-20, -26, 2.4, 0.5], [-38, 2, 2.4, 0.9]].map(([x, y, r, d]) => `<path d="${sparkle(x, y, r)}" fill="#fff"><animate attributeName="opacity" values="0;1;0" dur="1.2s" begin="${d}s" repeatCount="indefinite"/></path>`).join(''),
  dragon: () => '<path d="M0 0 L-4 -44 L-47 -67 L-40 -55 L-51 -47 L-38 -42 L-45 -30 L-30 -28 L-33 -15 L-18 -13 Z" fill="#2f9e6a" stroke="#14553a" stroke-width="1.8" stroke-linejoin="round"/>'
    + '<path d="M-6 -38 L-38 -54 L-36 -44 L-30 -32 L-20 -18 Z" fill="#5fd39a" opacity="0.45"/>'
    + line('M-4 -44 L-40 -55', 1.5, '#14553a') + line('M-4 -44 L-38 -42', 1.5, '#14553a') + line('M-4 -44 L-30 -28', 1.5, '#14553a') + line('M-4 -44 L-18 -13', 1.5, '#14553a')
    + '<path d="M-4 -44 q-3 -7 3 -9 q-1 4 1 9 Z" fill="#f4e3b0" stroke="#14553a" stroke-width="0.8"/>'
    + [-12, -22, -32].map((y) => `<path d="M-2 ${y} l5 -4 l-1 6 Z" fill="#f4e3b0" stroke="#14553a" stroke-width="0.6"/>`).join(''),
};
const WING_DEFS = '<linearGradient id="wgb" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#ffb02e"/><stop offset="0.5" stop-color="#ff5fb8"/><stop offset="1" stop-color="#7a5cff"/></linearGradient>'
  + '<linearGradient id="wgb2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5fb8"/><stop offset="1" stop-color="#ffd23f"/></linearGradient>';
function wingsBack(wg) {
  const shape = WING_SHAPE[wg.id]();
  const flap = (delay) => `<animateTransform attributeName="transform" type="rotate" values="12;-12;12" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="${wg.rate}s" begin="${delay}s" repeatCount="indefinite"/>`;
  return `<g transform="translate(42 92)"><g>${flap(0)}${shape}</g></g><g transform="translate(78 92) scale(-1 1)"><g>${flap(0)}${shape}</g></g>`;
}

// ——— begge hovene i været når laget vinner (grim reveal) ———
// Tegnes foran hodet med hvit kant, så de synes godt på storskjermen.
function raisedLeg(c, sh, mirror = false, delay = 0) {
  const hoofCol = sh && sh.canvas ? sh.canvas.c : INK;
  const band = sh && sh.canvas ? sh.canvas.s : null;
  // Skulder (80,97) → hov (101,30). Beinet smalner mot hoven og har en ullerme nederst.
  const leg = 'M86.1 98.9 L73.9 95.1 L96.6 28.6 L105.4 31.4 Z';
  const g = '<g>'
    + `<animateTransform attributeName="transform" type="rotate" values="-10 80 97;9 80 97;-10 80 97" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="0.8s" begin="${delay}s" repeatCount="indefinite"/>`
    + '<circle cx="101" cy="25" r="16" fill="#fff6a8" opacity="0.6"><animate attributeName="r" values="13;21;13" dur="0.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.75;0.3;0.75" dur="0.8s" repeatCount="indefinite"/></circle>'
    + `<path d="${leg}" fill="${c.face}" stroke="#fff" stroke-width="4.4" stroke-linejoin="round"/>`
    + `<path d="${leg}" fill="${c.face}" stroke="${c.shade}" stroke-width="1.4" stroke-linejoin="round"/>`
    + `<g fill="${c.wool}" stroke="#fff" stroke-width="3.4"><circle cx="81.6" cy="92" r="10.6"/><circle cx="85" cy="82" r="9.6"/><circle cx="88.2" cy="72.6" r="8.4"/></g>`
    + `<g fill="${c.wool}" stroke="${c.shade}" stroke-width="1.3"><circle cx="81.6" cy="92" r="10.6"/><circle cx="85" cy="82" r="9.6"/><circle cx="88.2" cy="72.6" r="8.4"/></g>`
    + `<circle cx="84" cy="86" r="8" fill="${c.wool}"/><circle cx="86.6" cy="77.4" r="6.6" fill="${c.wool}"/>`
    + '<g transform="translate(101.6 27.4) rotate(17.4)">'
    + `<path d="M-9.5 3.6 L-9.5 -5.6 Q-9.5 -11.8 -3.2 -11.8 L3.2 -11.8 Q9.5 -11.8 9.5 -5.6 L9.5 3.6 Z" fill="${hoofCol}" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/>`
    + (band ? `<rect x="-9.5" y="-1.2" width="19" height="3" fill="${band}"/>` : '<path d="M0 -11 L0 -2.4" stroke="#fff" stroke-width="1.7" opacity="0.75"/>')
    + '</g>'
    + outlined('M112 12 q6 6 4.2 14.6', 2.2) + outlined('M90 8.6 q-6 3.6 -6.8 12.4', 2.2)
    + '</g>';
  return mirror ? `<g transform="translate(120 0) scale(-1 1)">${g}</g>` : g;
}

// ——— spøkelse: ulla ender i en bølgende hale i stedet for bein ———
// (Spøkelset tegnes 6 enheter høyere enn en vanlig sau – det svever – så halen får plass nederst.)
function ghostBody(c) {
  const hem = 'M-27 -6 L-27 12 Q-22.5 21 -18 13.8 Q-13.5 21 -9 13.8 Q-4.5 21 0 13.8 Q4.5 21 9 13.8 Q13.5 21 18 13.8 Q22.5 21 27 12 L27 -6 Z';
  let top = '';
  for (let i = 0; i < 7; i++) {
    const a = ((196 + (148 / 6) * i) * Math.PI) / 180;
    top += `<circle cx="${f(60 + 26 * Math.cos(a))}" cy="${f(99 + 9 * Math.sin(a))}" r="10.5"/>`;
  }
  return `<g transform="translate(60 102)"><g><animateTransform attributeName="transform" type="skewX" values="-10;10;-10" dur="2.6s" repeatCount="indefinite"/><path d="${hem}" fill="${c.wool}" stroke="${c.shade}" stroke-width="1.6" stroke-linejoin="round"/></g></g>`
    + `<g fill="${c.wool}" stroke="${c.shade}" stroke-width="1.6">${top}</g><ellipse cx="60" cy="100.5" rx="27.4" ry="7.4" fill="${c.wool}"/>`;
}

// Selve hodet (ører, ull, ansikt, lugg, uttrykk og hatt) i koordinater 0–120
function headParts(look, c, champion, st = {}) {
  const fc = item('face', look.face) || FACES[0];
  const ht = look.hat ? item('hat', look.hat) : null;
  const hw = hairWool(look, c);
  const mood = st.mood && MOOD_FACE[st.mood] ? st.mood : '';
  const droop = mood === 'sad' ? 44 : mood === 'sleep' ? 33 : mood === 'surprised' ? 2 : mood === 'cheer' ? 12 : 22;
  const ear = (x, rot) => `<g transform="rotate(${rot} ${x} 57)"><ellipse cx="${x}" cy="57" rx="12.5" ry="6.4" fill="${c.face}" stroke="${c.shade}" stroke-width="1"/><ellipse cx="${x}" cy="57" rx="7.6" ry="3.2" fill="#f3a6b8" opacity="0.85"/></g>`;
  const glow = c.glow ? ' filter="url(#glow)"' : '';
  const [sx, sy, sw, sh] = hw.sweepBox;
  return ear(hw.ears[0], -droop) + ear(hw.ears[1], droop)
    + hw.back
    + `<g${glow}>${hw.cloud}</g>`
    + (c.price ? sweep('sh', hw.clip, sx, sy, sw, sh, 0) : '')
    + woolFx(c, hw.area)
    + hw.front
    + `<ellipse cx="60" cy="63" rx="23.6" ry="24.6" fill="${c.face}"/>`
    + hw.fringe
    // Ansiktsuttrykket tegnes litt større, så det synes også i små sirkler
    + `<g transform="translate(60 63) scale(1.14) translate(-60 -62)"><ellipse cx="60" cy="67.4" rx="2.6" ry="1.8" fill="${INK}" opacity="0.75"/>${mood ? MOOD_FACE[mood]() : fc.draw(c)}</g>`
    + (champion ? championCrown() : ht ? ht.draw(c) : '')
    + moodProps(mood);
}

function bodyAndLegs(look, c, st = {}) {
  const sh = look.shoes ? item('shoes', look.shoes) : null;
  const leg = (x) => `<rect x="${f(x - 4.3)}" y="102.5" width="8.6" height="13" rx="3.6" fill="${c.face}" stroke="${c.shade}" stroke-width="0.9"/>`;
  const hoof = (x) => `<rect x="${f(x - 5)}" y="111.4" width="10" height="6.4" rx="3" fill="${INK}"/>`;
  if (st.ghost) {
    return `<g${c.glow ? ' filter="url(#glow)"' : ''}>${ghostBody(c)}</g>` + woolFx(c, [30, 88, 60, 26]);
  }
  return `<g${c.glow ? ' filter="url(#glow)"' : ''}>${cloud(c, 60, 101, 26, 11, 10, 11, 0)}</g>`
    + (c.price ? sweep('sb', cloudShapes(60, 101, 26, 11, 10, 11, 0), 23, 79, 74, 44, 0.5) : '')
    + woolFx(c, [30, 88, 60, 30])
    + leg(50.8) + leg(69.6)
    + (sh ? sh.draw(c) : hoof(50.8) + hoof(69.6));
}

function svgDoc(vb, defs, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><defs>${defs}</defs>${body}</svg>`;
}

// view: 'head' = hele sauen forfra (hode, kropp, sko, kjæledyr, spor) – brukes i sirkler og butikk
//       'body' = løpende sau fra siden uten bein (drømmespillet tegner beina, kappa og vingene selv)
// mood/ghost: tilstanden grimen gir sauen (se toppen av fila)
export function sheepSvg(lookIn, { view = 'head', champion = false, mood = '', ghost = false } = {}) {
  const look = normLook(lookIn);
  const c = item('color', look.color);
  const st = { mood, ghost };
  const cp = look.cape ? item('cape', look.cape) : null;
  const wg = look.wings ? item('wings', look.wings) : null;
  const defs = woolDefs(c) + GOLD_DEF + (c.price ? SWEEP_DEF : '') + (c.glow ? GLOW_DEF : '') + capeDefs(cp) + (wg ? WING_DEFS : '');
  if (view === 'body') {
    const s = 0.76;
    const body = `<g${c.glow ? ' filter="url(#glow)"' : ''}><circle cx="27" cy="60" r="9" fill="${c.wool}" stroke="${c.shade}" stroke-width="1.6"/>${cloud(c, 66, 64, 32, 17, 12, 12, 0)}</g>`
      + (c.price ? sweep('sv', cloudShapes(66, 64, 32, 17, 12, 12, 0), 18, 35, 96, 60, 0.3) : '')
      + woolFx(c, [30, 44, 72, 40])
      + `<g transform="translate(${f(118 - 60 * s)} ${f(42 - 55 * s)}) scale(${s})">${headParts(look, c, champion, st)}</g>`;
    return svgDoc('0 0 166 112', defs, body);
  }
  const tr = look.trail ? item('trail', look.trail) : null;
  const pt = look.pet ? item('pet', look.pet) : null;
  const sh = look.shoes ? item('shoes', look.shoes) : null;
  const sheep = (wg ? wingsBack(wg) : '')
    + (cp ? capeBack(cp) : '')
    + bodyAndLegs(look, c, st)
    + headParts(look, c, champion, st)
    + (pt ? `<g transform="translate(63 61) scale(0.45)">${pt.draw()}</g>` : '')
    // Jubel: begge hovene i været, tegnet helt øverst så de aldri forsvinner bak noe
    + (mood === 'cheer' ? raisedLeg(c, sh, true, 0.37) + raisedLeg(c, sh, false, 0) : '');
  const body = (tr ? trailDecor(tr) : '') + (ghost ? `<g transform="translate(0 -6)">${sheep}</g>` : sheep);
  return svgDoc('0 0 120 120', defs, body);
}

// Kappe og vinge sett fra siden (drømmespillet flagrer med dem selv)
export function capeSideSvg(id) {
  const cp = item('cape', id);
  if (!cp) return '';
  let s = `<path d="M77 3 Q50 -1 4 8 Q11 16 4 24 Q12 31 5 39 Q40 35 75 17 Z" fill="url(#cpg)" stroke="${cp.b}" stroke-width="1.4" stroke-linejoin="round"/>`;
  if (cp.lining) s += `<path d="M74 6 Q48 4 12 11 Q40 20 72 14 Z" fill="${cp.lining}" opacity="0.9"/>`;
  if (cp.trim) s += line('M4 8 Q11 16 4 24 Q12 31 5 39', 4.4, '#fffaf0');
  if (cp.stars) s += [[20, 18], [36, 24], [50, 14], [28, 30], [62, 18]].map(([x, y]) => `<path d="${sparkle(x, y, 2.8)}" fill="#fff6c2"/>`).join('');
  if (cp.flames) s += [[6, 10], [6, 24], [7, 36]].map(([x, y]) => P.flame(x, y, 5)).join('');
  if (cp.collar) s += `<path d="M77 3 L66 -1 L70 9 Z" fill="${cp.lining}"/>`;
  return svgDoc('0 -2 80 44', capeDefs(cp), s);
}
export function wingSideSvg(id) {
  const wg = item('wings', id);
  return wg ? svgDoc('-52 -74 58 102', WING_DEFS, WING_SHAPE[wg.id]()) : '';
}

// Lykt for døde: tent så lenge spøkelset har ghost vote igjen, slukket når den er brukt
function lanternSvg(lit) {
  const defs = lit ? '<radialGradient id="lg" cx="0.5" cy="0.55" r="0.6"><stop offset="0" stop-color="#fffbe0"/><stop offset="0.45" stop-color="#ffd24d"/><stop offset="1" stop-color="#e87a12"/></radialGradient><radialGradient id="lh" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffd76a" stop-opacity="0.85"/><stop offset="1" stop-color="#ffd76a" stop-opacity="0"/></radialGradient>' : '';
  return svgDoc('0 0 40 56', defs,
    (lit ? '<circle cx="20" cy="31" r="20" fill="url(#lh)"><animate attributeName="opacity" values="0.75;1;0.85;1;0.75" dur="1.8s" repeatCount="indefinite"/></circle>' : '')
    + '<path d="M14 10 Q20 1 26 10" fill="none" stroke="#3a3326" stroke-width="2.6" stroke-linecap="round"/>'
    + '<rect x="10.5" y="9" width="19" height="6.4" rx="2" fill="#6b5634" stroke="#2c2416" stroke-width="1.1"/>'
    + `<path d="M12 15.4 L28 15.4 L30.4 42 L9.6 42 Z" fill="${lit ? 'url(#lg)' : '#2b3040'}" stroke="#2c2416" stroke-width="1.5"/>`
    + (lit ? '<path d="M20 22 Q25.4 29.6 20 37 Q14.6 29.6 20 22 Z" fill="#fff"><animate attributeName="d" values="M20 22 Q25.4 29.6 20 37 Q14.6 29.6 20 22 Z;M20 19.6 Q24.6 29.6 20 37 Q15.4 29.6 20 19.6 Z;M20 22 Q25.4 29.6 20 37 Q14.6 29.6 20 22 Z" dur="0.9s" repeatCount="indefinite"/></path>'
      : '<path d="M14 20 L17 18" stroke="#6b7590" stroke-width="1.4" stroke-linecap="round"/><path d="M20 37 Q18 33 20.4 30" fill="none" stroke="#4a5266" stroke-width="1.3" stroke-linecap="round"/>')
    + '<path d="M20 15.4 L20 42 M11 28.6 L29 28.6" stroke="#2c2416" stroke-width="1.2" opacity="0.75"/>'
    + '<rect x="8" y="42" width="24" height="6.4" rx="2" fill="#6b5634" stroke="#2c2416" stroke-width="1.1"/>');
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
  const key = [opts.view || 'head', opts.champion ? 1 : 0, opts.mood || '', opts.ghost ? 1 : 0, JSON.stringify(normLook(look))].join('|');
  let u = urlCache.get(key);
  if (!u) {
    u = svgUrl(sheepSvg(look, opts));
    if (urlCache.size > 600) urlCache.clear();
    urlCache.set(key, u);
  }
  return u;
}
function cachedUrl(key, make) {
  if (!urlCache.has(key)) urlCache.set(key, svgUrl(make()));
  return urlCache.get(key);
}
export function petUrl(id) { return cachedUrl('pet|' + id, () => petSvg(id)); }
export function capeSideUrl(id) { return cachedUrl('capeside|' + id, () => capeSideSvg(id)); }
export function wingSideUrl(id) { return cachedUrl('wingside|' + id, () => wingSideSvg(id)); }
export function lanternUrl(lit) { return cachedUrl('lantern|' + (lit ? 1 : 0), () => lanternSvg(lit)); }

// st: { mood, ghost } – tilstanden grimen gir sauen. Klassene brukes til bevegelse i CSS.
export function sheepImg(look, { view = 'head', champion = false, cls = 'sheep-img', title = '', mood = '', ghost = false } = {}) {
  const extra = (mood ? ' mood-' + mood : '') + (ghost ? ' ghost' : '');
  return h('img', { class: cls + extra, src: sheepUrl(look, { view, champion, mood, ghost }), alt: '', title: title || undefined, draggable: 'false', decoding: 'async' });
}

// Lykta ved siden av et spøkelse (tent = har ghost vote igjen)
export function ghostLantern(lit) {
  return h('span', { class: 'ghost-lantern ' + (lit ? 'lit' : 'out'), 'aria-hidden': 'true' }, h('img', { src: lanternUrl(lit), alt: '', draggable: 'false' }));
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
// Alle sauene i rommet (brukes av storskjermen, f.eks. sauen som løper over landskapet)
export function allLooks() { return Object.values(reg.looks).filter(Boolean); }
// Sauen til en plass, eller null hvis eleven ikke har laget sau ennå. st = { mood, ghost }
export function seatSheep(id, cls = 'token-sheep', st = {}) {
  const l = reg.looks[id];
  if (!l) return null;
  return sheepImg(l, { champion: reg.champion === id, cls, ...st });
}
export function seatSheepUrl(id, st = {}) {
  const l = reg.looks[id];
  return l ? sheepUrl(l, { champion: reg.champion === id, ...st }) : '';
}
// Innholdet i en sirkel med sau: sauen, rammen og (for døde) lykta. Null hvis plassen ikke har sau.
// night: sauene sover (spøkelser sover ikke). lantern: vis lykta (der ghost vote betyr noe).
export function sheepDisc(seat, { night = false, mood = '', lantern = true, cls = 'token-sheep' } = {}) {
  if (!reg.looks[seat.id]) return null;
  const ghost = seat.alive === false;
  const m = mood || (night && !ghost ? 'sleep' : '');
  return [clipSheep(seatSheep(seat.id, cls, { mood: m, ghost })), seatFrame(seat.id), ghost && lantern ? ghostLantern(!!seat.ghostVote) : null];
}
// Sauen klippes til sirkelen (vinger, hatter, kjæledyr osv. stikker ikke ut på utsiden av rammen)
export function clipSheep(img) {
  return img ? h('span', { class: 'sheep-clip' }, img) : null;
}

export function frameUrl(id) {
  const key = 'frame|' + id;
  if (!urlCache.has(key)) urlCache.set(key, svgUrl(svgDoc('0 0 100 100', '', FRAME_SVG[id] ? FRAME_SVG[id]() : '')));
  return urlCache.get(key);
}
// Rammen som legges rundt sirkelen (span med CSS-ring og ev. SVG-pynt)
export function frameEl(id) {
  const b = item('border', id);
  if (!b) return null;
  return h('span', { class: 'sheep-frame fr-' + b.id, 'aria-hidden': 'true' }, b.svg ? h('img', { class: 'fr-img', src: frameUrl(b.id), alt: '', draggable: 'false' }) : null);
}
export function seatFrame(id) {
  const l = reg.looks[id];
  return l && l.border ? frameEl(l.border) : null;
}

export function itemName(it, lang) { return it ? (it.name[lang] || it.name.no) : ''; }
