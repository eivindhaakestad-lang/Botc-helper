// «Lag sauen din», Saueboden (butikken) og myntregnet når en drømmerunde er ferdig.
// ctx = { T, lang, render, sendLook, open, champion, done }

import { h } from '../app/dom.js';
import { CATS, COLORS, FACES, item, itemName, sheepImg, sheepUrl, randomLook, frameEl } from '../live/sheep.js';
import { wallet } from './wallet.js';
import { sfx } from '../live/sound.js';

let draft = null; // sauen som lages (før «Ferdig»)
let tab = 'color';
let sel = null; // { cat, id } som prøves i butikken

export function resetWardrobe() { draft = null; sel = null; }

export function swatchBg(c) {
  if (c.rainbow) return 'linear-gradient(135deg,#ff6b6b,#ffb84d,#ffe55c,#6ee08a,#63b3ff,#b07bff)';
  if (c.galaxy) return 'radial-gradient(circle at 35% 30%, #7a4fd6, #3a2580 55%, #160c38)';
  if (c.grad) return `linear-gradient(135deg, ${c.grad.join(', ')})`;
  return c.wool;
}

const coinTxt = (n) => `🪙 ${n}`;

// ——— lag sauen din ———
function creatorStep(ctx, d) {
  if (!draft) draft = { ...wallet.look };
  const faces = FACES.filter((x) => wallet.owns('face', x.id));
  const i = Math.max(0, faces.findIndex((x) => x.id === draft.face));
  draft = { ...draft, face: faces[(i + d + faces.length) % faces.length].id };
  sfx.pop();
  ctx.render();
}
export function creatorKey(e, ctx) {
  if (e.key === 'ArrowLeft') { e.preventDefault(); creatorStep(ctx, -1); return true; }
  if (e.key === 'ArrowRight') { e.preventDefault(); creatorStep(ctx, 1); return true; }
  return false;
}

export function creatorView(ctx) {
  const { T, lang } = ctx;
  if (!draft) draft = { ...wallet.look };
  const faces = FACES.filter((x) => wallet.owns('face', x.id));
  const colors = COLORS.filter((x) => wallet.owns('color', x.id));
  const fc = item('face', draft.face);
  const first = !wallet.created;
  const done = () => {
    wallet.setLook(draft);
    draft = null;
    ctx.sendLook();
    sfx.reveal();
    ctx.done();
  };
  return h('div', { class: 'stack creator' },
    h('h2', { class: 'display center creator-title' }, first ? T('makeSheep') : T('editSheep')),
    h('p', { class: 'muted center' }, T('makeSheepHelp')),
    h('div', { class: 'creator-stage' },
      h('button', { class: 'arrow-btn', 'aria-label': T('prevFace'), onclick: () => creatorStep(ctx, -1) }, '◀'),
      h('div', { class: 'creator-sheep' }, sheepImg(draft, { cls: 'creator-img', champion: ctx.champion }), draft.border ? frameEl(draft.border) : null),
      h('button', { class: 'arrow-btn', 'aria-label': T('nextFace'), onclick: () => creatorStep(ctx, 1) }, '▶')),
    h('p', { class: 'center face-name' }, `${T('face')}: `, h('strong', null, itemName(fc, lang)), h('span', { class: 'muted small' }, `  (${faces.findIndex((x) => x.id === draft.face) + 1}/${faces.length})`)),
    h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': T('color') }, colors.map((c) => h('button', {
      class: 'swatch' + (draft.color === c.id ? ' on' : '') + (c.price ? ' lux' : ''), role: 'radio', 'aria-checked': draft.color === c.id ? 'true' : 'false',
      title: itemName(c, lang), 'aria-label': itemName(c, lang), style: `--sw:${swatchBg(c)}`,
      onclick: () => { draft = { ...draft, color: c.id }; sfx.pop(); ctx.render(); },
    }))),
    h('p', { class: 'center muted small' }, `${T('color')}: ${itemName(item('color', draft.color), lang)}`),
    h('div', { class: 'row gap wrap creator-actions' },
      h('button', { class: 'btn', onclick: () => { const r = randomLook(); const fs = faces.map((x) => x.id); draft = { ...draft, color: colors[Math.floor(Math.random() * colors.length)].id, face: fs.includes(r.face) ? r.face : fs[Math.floor(Math.random() * fs.length)] }; sfx.pop(); ctx.render(); } }, '🎲 ' + T('random')),
      h('button', { class: 'btn primary big', onclick: done }, '✓ ' + T('done'))),
    first ? null : h('p', { class: 'center muted small' }, T('moreInShop')));
}

// ——— Saueboden ———
function action(ctx, cat, id) {
  const it = item(cat, id);
  const owns = wallet.owns(cat, id);
  const look = wallet.look;
  const on = look[cat] === id;
  const removable = ['hat', 'shoes', 'trail', 'pet', 'border'].includes(cat);
  const { T } = ctx;
  if (owns && on) {
    return removable
      ? h('button', { class: 'btn big', onclick: () => { wallet.setLook({ [cat]: '' }); sel = null; ctx.sendLook(); sfx.pop(); ctx.render(); } }, '✕ ' + T('takeOff'))
      : h('span', { class: 'pill ok' }, '✓ ' + T('wearing'));
  }
  if (owns) {
    return h('button', { class: 'btn primary big', onclick: () => { wallet.setLook({ [cat]: id }); sel = null; ctx.sendLook(); sfx.pop(); ctx.render(); } }, '👕 ' + T('wear'));
  }
  const coins = wallet.coins;
  if (coins < it.price) return h('button', { class: 'btn big', disabled: true }, T('missing', { n: coinTxt(it.price - coins) }));
  return h('button', {
    class: 'btn primary big buy-btn',
    onclick: (e) => {
      const r = wallet.buy(cat, id);
      if (!r.ok) return;
      sel = null;
      ctx.sendLook();
      sfx.buy();
      confetti(e.currentTarget);
      ctx.render();
    },
  }, T('buyFor', { n: coinTxt(it.price) }));
}

export function shopView(ctx) {
  const { T, lang } = ctx;
  const look = wallet.look;
  const coins = wallet.coins;
  const cat = CATS.find((c) => c.key === tab) || CATS[0];
  const preview = sel ? { ...look, [sel.cat]: sel.id } : look;
  const selIt = sel ? item(sel.cat, sel.id) : null;
  if (!ctx.open) {
    return h('div', { class: 'stack shop' },
      h('div', { class: 'row between' }, ctx.back(), h('span', { class: 'display' }, '🛍 ' + T('shop'))),
      h('div', { class: 'panel center shop-closed' }, h('p', { class: 'display' }, '🌙'), h('p', null, T('shopClosedDay'))));
  }
  return h('div', { class: 'stack shop' },
    h('div', { class: 'row between' }, ctx.back(), h('span', { class: 'display' }, '🛍 ' + T('shop'))),
    h('div', { class: 'shop-head panel' },
      h('div', { class: 'shop-preview-wrap' }, sheepImg(preview, { cls: 'shop-preview', champion: ctx.champion }), preview.border ? frameEl(preview.border) : null),
      h('div', { class: 'stack tight grow' },
        h('span', { class: 'label' }, T('yourCoins')),
        h('span', { class: 'display shop-coins' }, coinTxt(coins)),
        selIt
          ? [h('span', { class: 'strong' }, itemName(selIt, lang)), h('div', { class: 'row gap wrap' }, action(ctx, sel.cat, sel.id), h('button', { class: 'btn ghost', onclick: () => { sel = null; ctx.render(); } }, T('cancel')))]
          : h('span', { class: 'muted small' }, T('shopHelp')),
        wallet.tampered ? h('span', { class: 'warn-text small' }, T('tampered')) : null)),
    h('div', { class: 'tabs shop-tabs', role: 'tablist' }, CATS.map((c) => h('button', {
      role: 'tab', class: 'tab' + (c.key === cat.key ? ' active' : ''), 'aria-selected': c.key === cat.key ? 'true' : 'false',
      onclick: () => { tab = c.key; ctx.render(); },
    }, `${c.icon} ${c.name[lang] || c.name.no}`))),
    h('div', { class: 'shop-grid' }, cat.list.map((it) => {
      const owns = wallet.owns(cat.key, it.id);
      const on = look[cat.key] === it.id;
      const isSel = sel && sel.cat === cat.key && sel.id === it.id;
      const tryLook = { ...look, [cat.key]: it.id };
      return h('button', {
        class: 'shop-item' + (isSel ? ' sel' : '') + (on ? ' on' : '') + (owns ? ' owned' : '') + (!owns && coins < it.price ? ' poor' : ''),
        onclick: () => { sel = isSel ? null : { cat: cat.key, id: it.id }; ctx.render(); },
        'aria-pressed': isSel ? 'true' : 'false',
      },
      cat.key === 'border'
        ? h('span', { class: 'shop-disc' }, h('img', { class: 'shop-disc-img', src: sheepUrl(tryLook), alt: '', decoding: 'async' }), frameEl(it.id))
        : h('img', { class: 'shop-item-img', src: sheepUrl(tryLook), alt: '', loading: 'lazy', decoding: 'async' }),
      h('span', { class: 'shop-item-name' }, itemName(it, lang)),
      h('span', { class: 'shop-item-price' + (on ? ' on' : owns ? ' owned' : '') }, on ? '✓ ' + T('wearing') : owns ? (it.price ? T('owned') : T('free')) : coinTxt(it.price)));
    })));
}

// ——— små effekter ———
function confetti(fromEl) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = fromEl ? fromEl.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const layer = document.createElement('div');
  layer.className = 'coin-fx';
  document.body.appendChild(layer);
  const cols = ['#ffd23f', '#ff5c8a', '#5edc7a', '#63b3ff', '#b07bff', '#fff'];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('span');
    p.className = 'confetti';
    p.style.left = r.left + r.width / 2 + 'px';
    p.style.top = r.top + r.height / 2 + 'px';
    p.style.background = cols[i % cols.length];
    layer.appendChild(p);
    const a = Math.random() * Math.PI * 2;
    const d = 60 + Math.random() * 120;
    p.animate([
      { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
      { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d - 40}px) rotate(${Math.random() * 720}deg)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d + 60}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
    ], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
  }
  setTimeout(() => layer.remove(), 1800);
}

export function setChip(v) {
  const el = document.querySelector('#wallet-chip .wallet-num');
  if (el) el.textContent = String(v);
}

// Poengene «renner» inn i lommeboka: +23 🪙 og mynter som flyr til mynt-telleren øverst.
export function coinBurst(res, fromEl, label = '') {
  if (!res || !res.add) return;
  const { before, after, add } = res;
  setChip(before);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chip = document.getElementById('wallet-chip');
  if (reduced || !chip) { setChip(after); sfx.coin(); return; }
  const r0 = fromEl ? fromEl.getBoundingClientRect() : { left: innerWidth / 2 - 60, top: innerHeight / 2 - 40, width: 120, height: 80 };
  const cx = r0.left + r0.width / 2;
  const cy = r0.top + r0.height / 2;
  const layer = document.createElement('div');
  layer.className = 'coin-fx';
  document.body.appendChild(layer);
  const big = document.createElement('div');
  big.className = 'coin-fx-big';
  big.innerHTML = `<span>+${add} 🪙</span>${label ? `<small>${label.replace(/[<>&]/g, '')}</small>` : ''}`;
  big.style.left = cx + 'px';
  big.style.top = cy + 'px';
  layer.appendChild(big);
  big.animate([
    { transform: 'translate(-50%,-50%) scale(0.4)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(1.15)', opacity: 1, offset: 0.2 },
    { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.75 },
    { transform: 'translate(-50%,-90%) scale(0.9)', opacity: 0 },
  ], { duration: 1900, easing: 'ease-out', fill: 'forwards' });
  const t = chip.getBoundingClientRect();
  const tx = t.left + t.width / 2;
  const ty = t.top + t.height / 2;
  const n = Math.min(24, Math.max(4, Math.round(add / 3)));
  let landed = 0;
  for (let i = 0; i < n; i++) {
    const c = document.createElement('span');
    c.className = 'coin-fx-coin';
    c.textContent = '🪙';
    const sx = cx + (Math.random() - 0.5) * 140;
    const sy = cy + (Math.random() - 0.5) * 70;
    c.style.left = sx + 'px';
    c.style.top = sy + 'px';
    layer.appendChild(c);
    const anim = c.animate([
      { transform: 'translate(-50%,-50%) scale(0.2)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.15)', opacity: 1, offset: 0.25 },
      { transform: `translate(calc(-50% + ${tx - sx}px), calc(-50% + ${ty - sy}px)) scale(0.55)`, opacity: 0.9 },
    ], { duration: 800, delay: 420 + i * 55, easing: 'cubic-bezier(.55,0,.35,1)', fill: 'forwards' });
    anim.onfinish = () => {
      c.remove();
      landed++;
      setChip(landed >= n ? after : Math.round(before + ((after - before) * landed) / n));
      chip.classList.remove('bump');
      void chip.offsetWidth;
      chip.classList.add('bump');
      if (landed % 2 === 1 || landed === n) sfx.coin();
    };
  }
  setTimeout(() => { layer.remove(); setChip(wallet.coins); }, 420 + n * 55 + 1900);
}
