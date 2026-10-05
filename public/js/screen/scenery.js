// Landskapet nederst på storskjermen: åser, en landsby med klokketårn og en eik i utkanten.
// Ligger helt bakerst, lavt nede, så det ser ut som grimen svever over landsbyen.
// Følger årstidene (sommer, høst, vinter, vår) og er mørkere om natten med lys i vinduene.

// Årstider (dag.måned): sommer 21.5–15.9, høst 16.9–15.11, vinter 16.11–20.3, vår 21.3–20.5
export function seasonFor(date = new Date()) {
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  if (md >= 521 && md <= 915) return 'summer';
  if (md >= 916 && md <= 1115) return 'autumn';
  if (md >= 321 && md <= 520) return 'spring';
  return 'winter';
}
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

const PAL = {
  summer: { far: '#9cc58a', mid: '#7db067', front: '#6aa357', wall: '#efe2c8', wall2: '#e3cfa8', roof: '#b5523b', roof2: '#8f5a3c', tower: '#cbb690', leaves: ['#4f8f3a', '#5fa047', '#6db152'], trunk: '#6b4a2b' },
  autumn: { far: '#cdb070', mid: '#bb8a45', front: '#a96f38', wall: '#ecdcbc', wall2: '#dcc39a', roof: '#9e3f2a', roof2: '#7a4a30', tower: '#c4ab84', leaves: ['#d9662b', '#e8a23a', '#c0392b', '#f2c14e'], trunk: '#5e4027' },
  winter: { far: '#dfe6ee', mid: '#d3dce7', front: '#eef3f8', wall: '#d6cbb6', wall2: '#c7b99e', roof: '#7c4a3a', roof2: '#5e4a40', tower: '#b2a58e', leaves: [], trunk: '#4e3d31' },
  spring: { far: '#b7da93', mid: '#99cd6d', front: '#86c25b', wall: '#f1e6cf', wall2: '#e6d4b0', roof: '#c0603f', roof2: '#96603f', tower: '#d0bc96', leaves: ['#78c257', '#8fd46a', '#69b04c'], trunk: '#6b4a2b' },
};

// Om natten blandes fargene mot mørk blå
function mix(hex, to, t) {
  const a = parseInt(hex.slice(1), 16); const b = parseInt(to.slice(1), 16);
  const c = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return '#' + ((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1);
}

function palette(season, night) {
  const p = PAL[season] || PAL.summer;
  if (!night) return { ...p, win: '#4a5870', glow: 0 };
  const k = season === 'winter' ? 0.55 : 0.64; // snø lyser litt i mørket
  const d = (x) => mix(x, '#0b1430', k);
  return { far: d(p.far), mid: d(p.mid), front: d(p.front), wall: d(p.wall), wall2: d(p.wall2), roof: d(p.roof), roof2: d(p.roof2), tower: d(p.tower), leaves: p.leaves.map(d), trunk: d(p.trunk), win: '#ffd36b', glow: 1 };
}

// Fast «tilfeldighet», så landsbyen ser lik ut hver gang
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }

// Åsene (strekkes i full bredde)
export function hillsSvg(season, night) {
  const c = palette(season, night);
  return `<svg class="land-hills" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
<path d="M0 92 C120 52 230 70 330 84 C450 100 520 50 650 58 C760 64 860 96 1000 70 L1000 200 L0 200 Z" fill="${c.far}"/>
<path d="M0 130 C160 104 300 118 420 112 C560 104 640 86 780 100 C880 110 950 120 1000 112 L1000 200 L0 200 Z" fill="${c.mid}"/>
</svg>`;
}

// Bakken helt foran (dekker foten av husene): blomster om våren, løv om høsten, snø om vinteren
export function frontSvg(season, night) {
  const c = palette(season, night);
  const r = rng(29);
  let deco = '';
  if (season === 'spring' || season === 'summer') {
    const cols = season === 'spring' ? ['#ffffff', '#ffd23f', '#ff8fb1', '#c39bff'] : ['#ffffff', '#ffd23f'];
    const n = season === 'spring' ? 90 : 30;
    for (let i = 0; i < n; i++) {
      const x = r() * 1000; const y = 36 + r() * 60;
      deco += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1.6 + r() * 1.6).toFixed(1)}" fill="${night ? mix(cols[i % cols.length], '#0b1430', 0.55) : cols[i % cols.length]}"/>`;
    }
  } else if (season === 'autumn') {
    const cols = ['#d9662b', '#e8a23a', '#c0392b', '#f2c14e'];
    for (let i = 0; i < 70; i++) {
      const x = r() * 1000; const y = 34 + r() * 62;
      deco += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="3.4" ry="1.7" transform="rotate(${Math.round(r() * 180)} ${x.toFixed(0)} ${y.toFixed(0)})" fill="${night ? mix(cols[i % 4], '#0b1430', 0.6) : cols[i % 4]}"/>`;
    }
  } else {
    // Små blå skygger i snøen
    for (let i = 0; i < 16; i++) {
      const x = r() * 1000; const y = 40 + r() * 50;
      deco += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(20 + r() * 40).toFixed(0)}" ry="3" fill="${night ? '#4a5878' : '#c9d6e6'}" opacity="0.6"/>`;
    }
  }
  return `<svg class="land-front" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
<path d="M0 30 C150 18 300 26 450 22 C620 16 760 30 1000 20 L1000 100 L0 100 Z" fill="${c.front}"/>${deco}</svg>`;
}

// Landsbyen med klokketårnet i midten og en eik i utkanten
export function villageSvg(season, night) {
  const c = palette(season, night);
  const r = rng(11);
  const base = 236;
  const snow = season === 'winter';
  const snowCol = night ? '#a9b6cc' : '#f7faff';
  let back = '';
  let houses = '';
  let wins = '';
  const house = (x, w, hh, gable, behind) => {
    const top = base - hh;
    const wall = behind ? c.wall2 : c.wall;
    const roof = behind ? c.roof2 : c.roof;
    let s = `<rect x="${x}" y="${top}" width="${w}" height="${hh}" fill="${wall}"/>`;
    if (gable) {
      const peak = top - 26 - r() * 14;
      s += `<path d="M${x - 6} ${top + 2} L${x + w / 2} ${peak.toFixed(0)} L${x + w + 6} ${top + 2} Z" fill="${roof}"/>`;
      if (snow) s += `<path d="M${x - 6} ${top + 2} L${x + w / 2} ${peak.toFixed(0)} L${x + w + 6} ${top + 2} L${x + w - 4} ${top + 2} L${x + w / 2} ${(peak + 8).toFixed(0)} L${x + 4} ${top + 2} Z" fill="${snowCol}"/>`;
    } else {
      s += `<rect x="${x - 4}" y="${top - 8}" width="${w + 8}" height="9" fill="${roof}"/>`;
      if (snow) s += `<rect x="${x - 4}" y="${top - 11}" width="${w + 8}" height="5" rx="2" fill="${snowCol}"/>`;
    }
    if (r() < 0.5) s += `<rect x="${x + w * 0.68}" y="${top - 34}" width="8" height="26" fill="${roof}"/>`;
    // vinduer (tent om natten)
    const cols = Math.max(1, Math.floor(w / 26));
    for (let i = 0; i < cols; i++) {
      if (r() < 0.25) continue;
      const wx = x + (w / cols) * i + (w / cols) / 2 - 5;
      const wy = top + hh * 0.3;
      if (c.glow && r() < 0.85) wins += `<circle cx="${wx + 5}" cy="${wy + 7}" r="13" fill="#ffcf5a" opacity="0.22"/>`;
      wins += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="10" height="14" rx="1.5" fill="${c.win}" opacity="${c.glow ? 0.95 : 0.7}"/>`;
    }
    return s;
  };
  // bakre rad (litt mindre og mørkere), så fremre rad
  let x = 40;
  while (x < 860) { const w = 44 + r() * 30; back += house(Math.round(x), Math.round(w), Math.round(40 + r() * 26), r() < 0.7, true); x += w + 18 + r() * 30; }
  x = 10;
  while (x < 880) {
    const w = 52 + r() * 40;
    if (Math.abs(x + w / 2 - 450) < 70) { x += 40; continue; } // plass til tårnet
    houses += house(Math.round(x), Math.round(w), Math.round(50 + r() * 34), r() < 0.65, false);
    x += w + 10 + r() * 22;
  }
  // klokketårnet
  const tx = 450;
  let tower = `<rect x="${tx - 30}" y="70" width="60" height="${base - 70}" fill="${c.tower}"/><path d="M${tx - 38} 74 L${tx} 6 L${tx + 38} 74 Z" fill="${c.roof}"/>`
    + `<rect x="${tx - 2}" y="-6" width="4" height="16" fill="${c.roof2}"/>`
    + `<circle cx="${tx}" cy="104" r="17" fill="${c.wall}" stroke="${c.roof2}" stroke-width="3"/><path d="M${tx} 104 L${tx} 92 M${tx} 104 L${tx + 9} 104" stroke="${c.roof2}" stroke-width="2.6" stroke-linecap="round"/>`
    + `<rect x="${tx - 9}" y="150" width="18" height="28" rx="9" fill="${c.win}" opacity="${c.glow ? 0.9 : 0.6}"/>`;
  if (snow) tower += `<path d="M${tx - 38} 74 L${tx} 6 L${tx + 38} 74 L${tx + 28} 74 L${tx} 18 L${tx - 28} 74 Z" fill="${snowCol}"/>`;
  if (c.glow) tower = `<circle cx="${tx}" cy="104" r="34" fill="#ffe08a" opacity="0.18"/>` + tower;
  return `<svg class="land-village" viewBox="-30 -10 960 250" aria-hidden="true">${back}${tower}${houses}${wins}${oakSvg(season, night, 830, base)}</svg>`;
}

function oakSvg(season, night, x, base) {
  const c = palette(season, night);
  const trunk = `<path d="M${x - 9} ${base} Q${x - 6} ${base - 50} ${x - 4} ${base - 92} L${x + 6} ${base - 92} Q${x + 7} ${base - 50} ${x + 11} ${base} Z" fill="${c.trunk}"/>`;
  const branch = (d, w) => `<path d="${d}" fill="none" stroke="${c.trunk}" stroke-width="${w}" stroke-linecap="round"/>`;
  const branches = branch(`M${x} ${base - 80} Q${x - 30} ${base - 110} ${x - 52} ${base - 120}`, 6) + branch(`M${x + 2} ${base - 84} Q${x + 30} ${base - 112} ${x + 50} ${base - 116}`, 6)
    + branch(`M${x} ${base - 90} Q${x - 4} ${base - 130} ${x + 4} ${base - 150}`, 5) + branch(`M${x - 30} ${base - 108} Q${x - 44} ${base - 136} ${x - 40} ${base - 148}`, 3)
    + branch(`M${x + 28} ${base - 110} Q${x + 46} ${base - 132} ${x + 42} ${base - 146}`, 3);
  if (season === 'winter') {
    // Bar eik med litt snø på greinene
    const snowCol = night ? '#a9b6cc' : '#f7faff';
    return trunk + branches + branch(`M${x - 40} ${base - 118} Q${x - 30} ${base - 116} ${x - 22} ${base - 108}`, 2.4).replaceAll(c.trunk, snowCol) + branch(`M${x + 24} ${base - 110} Q${x + 34} ${base - 114} ${x + 44} ${base - 116}`, 2.4).replaceAll(c.trunk, snowCol);
  }
  const r = rng(5);
  const blobs = [[x - 40, base - 120, 34], [x + 38, base - 118, 34], [x, base - 146, 40], [x - 14, base - 110, 32], [x + 20, base - 104, 30], [x - 60, base - 98, 22], [x + 58, base - 96, 22]];
  let crown = '';
  blobs.forEach(([bx, by, br], i) => { crown += `<circle cx="${bx}" cy="${by}" r="${br}" fill="${c.leaves[i % c.leaves.length]}"/>`; });
  // lysere flekker i kronen
  for (let i = 0; i < 14; i++) crown += `<circle cx="${(x - 60 + r() * 120).toFixed(0)}" cy="${(base - 170 + r() * 80).toFixed(0)}" r="${(6 + r() * 8).toFixed(0)}" fill="${c.leaves[(i + 1) % c.leaves.length]}" opacity="0.8"/>`;
  return trunk + branches + crown;
}
