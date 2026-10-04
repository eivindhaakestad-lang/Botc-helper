// Drømmespillet: en enkel løper i Chrome-dino-stil.
// Hopp over hindrene: hvert hinder du kommer forbi, gir ett poeng.
// Fra ca. 30 poeng kommer det også ørner. De flyr i hodehøyde – da må du IKKE hoppe:
// hopper du når ørnen er nær, stuper den og tar deg.
// Mynter svever i lufta innimellom (plukk dem for ekstra mynter – teller ikke på topplista),
// og magneten trekker dem til deg. Slår du din egen rekord, smeller det fyrverkeri.

import { sheepUrl, petUrl, svgUrl, particleSvg, item, capeSideUrl, wingSideUrl } from '../live/sheep.js';

const W = 720;
const H = 260;
const GROUND = 214;
const GRAVITY = 2500;
const JUMP_V = -860;
const CUT_V = -330;
const EAGLE_FROM = 30;
const EAGLE_TOP = GROUND - 80; // laveste høyde: like over hodet når du løper (kolliderer aldri da)
const EAGLE_HIGH = GROUND - 150; // høyeste høyde
const EAGLE_H = 30;
const FLY_Y = GROUND - 108; // superhopp-høyde (godt over alle gjerder, under poengteksten)
const POWER_CHANCE = 1 / 30;
const POWERS = ['rocket', 'shield', 'jet', 'slow', 'double', 'magnet'];
const COIN_R = 9;
const MAGNET_S = 15;
const FW_COLS = ['#ffd23f', '#ff5c8a', '#5edc7a', '#63b3ff', '#b07bff', '#ff9b2e', '#ffffff'];
const RAINBOW = ['#ff6b6b', '#ffb84d', '#ffe55c', '#6ee08a', '#63b3ff', '#b07bff'];

export class DreamGame {
  constructor(canvas, { onGameOver, onScore, onCoin, onPower, onRecord, text, best = 0, look = null, champion = false }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onGameOver = onGameOver || (() => {});
    this.onScore = onScore || (() => {});
    this.onCoin = onCoin || (() => {});
    this.onPower = onPower || (() => {});
    this.onRecord = onRecord || (() => {});
    this.text = text;
    this.state = 'ready';
    this.best = best;
    this.stars = Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * (GROUND - 60), r: Math.random() * 1.4 + 0.4, p: Math.random() * 6 }));
    this.hills = [0, 260, 520].map((x) => ({ x, w: 260 + Math.random() * 120, h: 30 + Math.random() * 30 }));
    this.trailParts = [];
    this.hist = [];
    this.setLook(look, champion);
    this.reset();
    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    this.onKey = this.onKey.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onDown = this.onDown.bind(this);
    this.onUp = this.onUp.bind(this);
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointerup', this.onUp);
    this.resize();
    this.raf = requestAnimationFrame(this.loop);
  }

  // Elevens egen sau: farge, ansikt, hatt (eller mesterkrone), sko, spor og kjæledyr
  setLook(look, champion = false) {
    this.sprite = null; this.petImg = null; this.trail = null; this.shoe = null; this.partImgs = []; this.capeImg = null; this.wingImg = null;
    if (!look) return;
    if (look.cape && item('cape', look.cape)) { const im = new Image(); im.src = capeSideUrl(look.cape); this.capeImg = im; }
    const wg = look.wings ? item('wings', look.wings) : null;
    if (wg) { const im = new Image(); im.src = wingSideUrl(wg.id); this.wingImg = im; this.wingRate = wg.rate; }
    const img = new Image();
    img.src = sheepUrl(look, { view: 'body', champion });
    this.sprite = img;
    const pt = look.pet ? item('pet', look.pet) : null;
    if (pt) { const p = new Image(); p.src = petUrl(pt.id); this.petImg = p; this.petFly = !!pt.fly; }
    const tr = look.trail ? item('trail', look.trail) : null;
    if (tr) {
      this.trail = tr;
      if (tr.kind !== 'rainbow' && tr.kind !== 'flame') {
        const n = tr.colors ? tr.colors.length : 1;
        this.partImgs = Array.from({ length: n }, (_, i) => { const im = new Image(); im.src = svgUrl(particleSvg(tr.kind, i)); return im; });
      }
    }
    this.shoe = look.shoes ? item('shoes', look.shoes) : null;
  }

  reset() {
    this.trailParts = [];
    this.hist = [];
    this.sheep = { x: 92, y: GROUND, vy: 0, onGround: true, legT: 0 };
    this.fences = [];
    this.eagleWarned = false;
    this.shield = 0; // udødelig etter melding (sekunder)
    // Powerups
    this.items = [];      // 🎁 som kan plukkes opp
    this.shots = [];      // raketter i lufta
    this.parts = [];      // partikler (eksplosjoner)
    this.rockets = 0;     // antall hinder som skal sprenges
    this.lives = 0;       // ekstra liv (skjold)
    this.fly = 0;         // hinder igjen å fly over
    this.slow = 0;        // sekunder med sakte tid
    this.double = 0;      // sekunder med dobbel poeng
    this.invuln = 0;      // kort udødelighet etter skjold/landing
    this.puMsg = null;    // { text, t }
    this.magnet = 0;      // sekunder med magnet
    this.coins = [];      // mynter i lufta
    this.coinCount = 0;   // mynter plukket denne runden
    this.coinGap = 3 + Math.floor(Math.random() * 4); // hinder til neste myntrekke
    this.fw = [];         // fyrverkeri
    this.best0 = this.best; // rekorden da runden startet
    this.recordDone = false;
    this.speed = 360;
    this.score = 0;
    this.nextGap = 420;
    this.time = 0;
    this.countdown = 0;
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = this.canvas.clientWidth || W;
    const cssH = cssW * (H / W);
    this.canvas.style.height = cssH + 'px';
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.scale = (cssW * dpr) / W;
  }

  // ——— styring ———
  press() {
    if (this.state === 'paused' || this.countdown > 0) return;
    if (this.state === 'ready' || this.state === 'over') {
      if (this.state === 'over' && performance.now() - this.overAt < 450) return;
      this.reset();
      this.state = 'running';
      this.jump();
      return;
    }
    this.jump();
  }
  jump() {
    if (this.fly > 0) return;
    if (this.sheep.onGround) { this.sheep.vy = JUMP_V; this.sheep.onGround = false; }
  }
  release() {
    if (this.sheep.vy < CUT_V) this.sheep.vy = CUT_V;
  }
  onKey(e) {
    if (this.destroyed || !this.canvas.isConnected) return;
    if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) {
      if (e.target && ['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName) && e.key === ' ' && e.target.tagName !== 'BUTTON') return;
      e.preventDefault();
      if (!e.repeat) this.press();
    }
  }
  onKeyUp(e) {
    if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) this.release();
  }
  onDown(e) {
    e.preventDefault();
    this.press();
  }
  onUp() {
    this.release();
  }

  pause() {
    if (this.state === 'running') { this.state = 'paused'; this.wasRunning = true; }
    else if (this.state !== 'paused') { this.wasRunning = false; this.pausedFrom = this.state; this.state = 'paused'; }
  }
  resume() {
    if (this.state !== 'paused') return;
    if (this.wasRunning) {
      this.state = 'running';
      this.countdown = 3;
      // Fikk du melding midt i en god runde (over 20 poeng)? Da er du udødelig i 4 sekunder etterpå.
      if (this.score > 20) this.shield = 4;
    }
    else this.state = this.pausedFrom || 'ready';
  }

  // Lagre en pågående runde (f.eks. når dagen kommer), så den kan fortsette neste natt.
  snapshot() {
    const running = this.state === 'running' || (this.state === 'paused' && this.wasRunning);
    if (!running) return null;
    const plain = (a) => a.map((x) => { const o = { ...x }; delete o.targeted; return o; });
    return {
      v: 1, sheep: { ...this.sheep }, fences: plain(this.fences), items: plain(this.items),
      rockets: this.rockets + this.shots.length, lives: this.lives, fly: this.fly, slow: this.slow, double: this.double,
      score: this.score, time: this.time, speed: this.speed, nextGap: this.nextGap, eagleWarned: this.eagleWarned,
      coins: plain(this.coins), coinCount: this.coinCount, magnet: this.magnet, coinGap: this.coinGap, best0: this.best0, recordDone: this.recordDone,
    };
  }
  restore(s) {
    if (!s || s.v !== 1) return;
    this.reset();
    Object.assign(this, {
      sheep: s.sheep, fences: s.fences || [], items: s.items || [], rockets: s.rockets || 0, lives: s.lives || 0, fly: s.fly || 0,
      slow: s.slow || 0, double: s.double || 0, score: s.score || 0, time: s.time || 0, speed: s.speed || 380, nextGap: s.nextGap || 420, eagleWarned: !!s.eagleWarned,
      coins: s.coins || [], coinCount: s.coinCount || 0, magnet: s.magnet || 0, coinGap: s.coinGap || 5, best0: s.best0 ?? this.best, recordDone: !!s.recordDone,
    });
    // Fortsett med nedtelling og noen sekunders beskyttelse
    this.state = 'running';
    this.countdown = 3;
    this.shield = 4;
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointerdown', this.onDown);
  }

  // ——— løkke ———
  loop(ts) {
    if (this.destroyed) return;
    const dt = Math.min(0.033, this.last ? (ts - this.last) / 1000 : 0);
    this.last = ts;
    this.update(dt);
    this.draw(ts / 1000);
    this.raf = requestAnimationFrame(this.loop);
  }

  addScore() {
    this.score += this.double > 0 ? 2 : 1;
    this.onScore(this.score);
    // Ny personlig rekord (bare når det finnes en rekord fra før): fyrverkeri!
    if (!this.recordDone && this.best0 > 0 && this.score > this.best0) {
      this.recordDone = true;
      this.launchFireworks();
      this.recordMsg = 3;
      this.onRecord();
    }
  }

  // ——— mynter i lufta ———
  // Små rekker eller buer mellom hindrene: noen på bakken, noen i en hoppebue, noen høyt oppe.
  spawnCoins(f) {
    const x0 = W + 10;
    const r = Math.random();
    const add = (x, y) => this.coins.push({ x, y, spin: Math.random() * 6 });
    if (f && f.eagle) {
      for (let k = 0; k < 4; k++) add(f.x + 4 + k * 26, GROUND - 22); // løp under ørnen
    } else if (r < 0.45 && f) {
      // Bue over gjerdet (hopp gjennom den)
      for (let k = -2; k <= 2; k++) add(f.x + f.w / 2 + k * 30, GROUND - 46 - 92 * (1 - (k / 2.6) ** 2));
    } else if (r < 0.8) {
      for (let k = 0; k < 4; k++) add(x0 + 110 + k * 28, GROUND - 22);
    } else {
      for (let k = 0; k < 3; k++) add(x0 + 120 + k * 30, GROUND - 128);
    }
  }

  launchFireworks() {
    for (let i = 0; i < 6; i++) {
      this.fw.push({ x: 140 + Math.random() * (W - 200), y: GROUND, vy: -430 - Math.random() * 110, top: 40 + Math.random() * 70, wait: i * 0.28, c: FW_COLS[i % FW_COLS.length], sparks: null, t: 0 });
    }
  }

  updateFireworks(dt) {
    for (const r of this.fw) {
      if (r.wait > 0) { r.wait -= dt; continue; }
      if (!r.sparks) {
        r.y += r.vy * dt;
        if (r.y <= r.top) {
          r.sparks = Array.from({ length: 34 }, (_, k) => { const a = (Math.PI * 2 * k) / 34; const v = 90 + Math.random() * 130; return { x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: Math.random() < 0.25 ? '#fff' : r.c }; });
        }
      } else {
        r.t += dt;
        for (const p of r.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 140 * dt; p.vx *= 0.985; }
      }
    }
    this.fw = this.fw.filter((r) => !r.sparks || r.t < 1.5);
  }

  givePower(kind) {
    const T = this.text || {};
    if (kind === 'rocket') this.rockets += 3;
    if (kind === 'shield') this.lives = 1;
    if (kind === 'jet') { this.fly = 10; this.sheep.vy = 0; this.sheep.onGround = false; }
    if (kind === 'slow') this.slow = 8;
    if (kind === 'double') this.double = 20;
    if (kind === 'magnet') { this.magnet = MAGNET_S; this.coinGap = Math.min(this.coinGap, 1); }
    this.onPower(kind);
    this.puMsg = { text: T['pu_' + kind] || kind, t: 2.2 };
    this.burst(this.sheep.x, this.sheep.y - 30, ['#f1c877', '#fff', '#6f90e2'], 18);
  }

  burst(x, y, colors, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 120 + Math.random() * 260;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: 0.6 + Math.random() * 0.5, c: colors[i % colors.length], s: 2 + Math.random() * 3 });
    }
  }

  breakObstacle(f) {
    f.broken = true;
    f.brokenT = 0;
    this.burst(f.x + f.w / 2, f.eagle ? f.y + f.h / 2 : GROUND - f.h / 2, f.eagle ? ['#6b4a2b', '#f2eee6', '#f1c877'] : ['#8a6a44', '#a8845a', '#f1c877', '#e27a4e'], 20);
  }

  update(dt) {
    if (this.state !== 'running') return;
    if (this.countdown > 0) { this.countdown -= dt; return; }
    this.time += dt;
    if (this.shield > 0) this.shield = Math.max(0, this.shield - dt);
    if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
    if (this.slow > 0) this.slow = Math.max(0, this.slow - dt);
    if (this.double > 0) this.double = Math.max(0, this.double - dt);
    if (this.magnet > 0) this.magnet = Math.max(0, this.magnet - dt);
    if (this.recordMsg > 0) this.recordMsg -= dt;
    if (this.puMsg) { this.puMsg.t -= dt; if (this.puMsg.t <= 0) this.puMsg = null; }
    if (this.fw.length) this.updateFireworks(dt);
    // Farten øker jevnt hele tiden (også etter 50 poeng), opp til et tak langt fram.
    this.speed = Math.min(1650, 380 + this.time * 12);
    // Sakte tid: hindrene går saktere, og farten glir tilbake det siste sekundet.
    const slowF = this.slow > 0 ? 0.6 + 0.4 * Math.max(0, 1 - this.slow) : 1;
    const spd = this.speed * slowF;
    const sh = this.sheep;
    if (this.fly > 0) {
      // Superhopp: rakett på ryggen, svever høyt over alt
      sh.y += (FLY_Y - sh.y) * Math.min(1, dt * 4);
      sh.vy = 0;
      sh.onGround = false;
      if (Math.random() < 0.6) this.parts.push({ x: sh.x - 30, y: sh.y - 6, vx: -200 - Math.random() * 120, vy: 40 + Math.random() * 60, life: 0.35, c: Math.random() < 0.5 ? '#f1c877' : '#e27a4e', s: 3 });
    } else {
      sh.vy += GRAVITY * dt;
      sh.y += sh.vy * dt;
      if (sh.y >= GROUND) { sh.y = GROUND; sh.vy = 0; sh.onGround = true; }
    }
    sh.legT += dt * (sh.onGround ? spd / 40 : 0);
    // Spor bak sauen
    if (this.trail) {
      const kind = this.trail.kind;
      if (kind === 'rainbow') {
        this.hist.unshift(sh.y);
        if (this.hist.length > 28) this.hist.length = 28;
      } else {
        this.trailT = (this.trailT || 0) + dt;
        const every = kind === 'flame' ? 0.022 : 0.075;
        while (this.trailT > every) {
          this.trailT -= every;
          this.trailParts.push({
            x: sh.x - 30 + Math.random() * 6, y: sh.y - 12 - Math.random() * 18,
            vx: -spd * 0.5 - 30 - Math.random() * 40, vy: (kind === 'flame' ? -60 : kind === 'bubble' ? -45 : -15) - Math.random() * 30,
            life: kind === 'flame' ? 0.4 : 0.95, max: kind === 'flame' ? 0.4 : 0.95, i: Math.floor(Math.random() * 6), rot: Math.random() * 6.28,
            s: kind === 'flame' ? 5 + Math.random() * 5 : 11 + Math.random() * 6,
          });
        }
      }
    }
    for (const p of this.trailParts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.rot += dt * 3; }
    if (this.trailParts.length) this.trailParts = this.trailParts.filter((p) => p.life > 0);
    for (const hl of this.hills) { hl.x -= spd * 0.15 * dt; if (hl.x + hl.w < 0) { hl.x = W + Math.random() * 80; hl.w = 260 + Math.random() * 120; hl.h = 30 + Math.random() * 30; } }
    this.nextGap -= spd * dt;
    if (this.nextGap <= 0) {
      // Ørn: fra ca. 30 poeng, men aldri to rett etter hverandre
      const lastEagle = this.fences.length && this.fences[this.fences.length - 1].eagle;
      const eagleChance = this.score + this.fences.length >= EAGLE_FROM ? Math.min(0.25, 0.14 + (this.score - EAGLE_FROM) / 400) : 0;
      if (!lastEagle && Math.random() < eagleChance) {
        const baseY = EAGLE_HIGH + Math.random() * (EAGLE_TOP - EAGLE_HIGH);
        this.fences.push({ x: W + 10, w: 54, h: EAGLE_H, y: baseY, baseY, eagle: true, flap: Math.random() * 6, passed: false });
        if (!this.eagleWarned) { this.eagleWarned = true; this.eagleMsg = 1.8; }
      } else {
        const tall = Math.random() < Math.min(0.55, 0.15 + this.time / 90);
        const double = this.time > 25 && Math.random() < Math.min(0.4, 0.22 + (this.time - 25) / 300);
        const w = double ? 44 : 18 + Math.random() * 14;
        const h = tall ? 54 + Math.random() * 12 : 32 + Math.random() * 14;
        this.fences.push({ x: W + 10, w, h, passed: false });
      }
      // Mynter: en liten rekke omtrent hvert 7.–13. hinder (oftere med magnet)
      if (--this.coinGap <= 0) {
        this.spawnCoins(this.fences[this.fences.length - 1]);
        this.coinGap = this.magnet > 0 ? 1 + Math.floor(Math.random() * 2) : 7 + Math.floor(Math.random() * 7);
      }
      // Avstanden krymper litt etter hvert, men aldri så mye at et hopp ikke rekker å lande.
      const tight = Math.max(0.75, 1.15 - this.time / 250);
      this.nextGap = this.speed * (0.75 + Math.random() * (tight - 0.2)) + 120;
      // Sjelden powerup (ca. 1 av 30 hinder), midt mellom to hinder
      if (Math.random() < POWER_CHANCE && this.fly <= 0) {
        this.items.push({ x: W + 10 + Math.min(this.nextGap / 2, 260), y: GROUND - 42, kind: POWERS[Math.floor(Math.random() * POWERS.length)], bob: Math.random() * 6 });
      }
    }
    if (this.eagleMsg > 0) this.eagleMsg -= dt;
    for (const f of this.fences) {
      f.x -= spd * (f.eagle ? 1.12 : 1) * dt;
      if (f.broken) f.brokenT += dt;
      if (f.eagle && !f.broken) {
        f.flap += dt * 12;
        const near = !f.passed && this.fly <= 0 && f.x - sh.x < 240 && f.x + f.w > sh.x - 24;
        const target = near && !sh.onGround ? sh.y - 40 : f.baseY;
        const step = (near && !sh.onGround ? 1100 : 260) * dt;
        f.y += Math.max(-step, Math.min(step, target - f.y));
      }
      if (!f.passed && f.x + f.w < sh.x - 20) {
        f.passed = true;
        this.addScore();
        if (this.fly > 0 && --this.fly === 0) this.invuln = Math.max(this.invuln, 1.2); // lander trygt
      }
    }
    this.fences = this.fences.filter((f) => f.x + f.w > -20);
    // Rakett: skyt mot neste hinder
    if (this.rockets > 0 && !this.shots.length) {
      const f = this.fences.find((x) => !x.broken && !x.passed && !x.targeted && x.x - sh.x < 340 && x.x > sh.x + 10);
      if (f) { f.targeted = true; this.rockets--; this.shots.push({ x: sh.x + 20, y: sh.y - 26, target: f }); }
    }
    for (const r of this.shots) {
      const f = r.target;
      const tx = f.x + f.w / 2;
      const ty = f.eagle ? f.y + f.h / 2 : GROUND - f.h / 2;
      const d = Math.hypot(tx - r.x, ty - r.y) || 1;
      const v = 1500 * dt;
      if (d <= v + 8) { r.done = true; this.breakObstacle(f); } else { r.x += ((tx - r.x) / d) * v; r.y += ((ty - r.y) / d) * v; r.ang = Math.atan2(ty - r.y, tx - r.x); }
      if (Math.random() < 0.7) this.parts.push({ x: r.x - 8, y: r.y, vx: -120, vy: (Math.random() - 0.5) * 60, life: 0.25, c: '#f1c877', s: 2 });
    }
    this.shots = this.shots.filter((r) => !r.done);
    // Powerups
    for (const it of this.items) {
      it.x -= spd * dt;
      it.bob += dt * 4;
      if (!it.taken && Math.abs(it.x - sh.x) < 34 && Math.abs((it.y + Math.sin(it.bob) * 4) - (sh.y - 20)) < 40) { it.taken = true; this.givePower(it.kind); }
    }
    this.items = this.items.filter((it) => !it.taken && it.x > -30);
    const cx = sh.x + 6;
    const cy = sh.y - 24;
    for (const co of this.coins) {
      co.x -= spd * dt;
      co.spin += dt * 7;
      if (this.magnet > 0) {
        const dx = cx - co.x; const dy = cy - co.y; const d = Math.hypot(dx, dy) || 1;
        if (d < 320) { const v = Math.min(d, (520 + (320 - d) * 3.2) * dt); co.x += (dx / d) * v; co.y += (dy / d) * v; }
      }
      if (!co.taken && Math.abs(co.x - cx) < 27 && Math.abs(co.y - cy) < 30) {
        co.taken = true;
        this.coinCount++;
        this.onCoin();
        for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2; this.parts.push({ x: co.x, y: co.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140 - 80, life: 0.35, c: i % 2 ? '#fff4b8' : '#f6c945', s: 2.5 }); }
      }
    }
    if (this.coins.length) this.coins = this.coins.filter((co) => !co.taken && co.x > -20);
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; p.life -= dt; }
    this.parts = this.parts.filter((p) => p.life > 0);
    // kollisjon (litt romslig)
    const box = { x: sh.x - 20, y: sh.y - 34, w: 40, h: 30 };
    for (const f of this.fences) {
      if (f.broken) continue;
      const hit = f.eagle
        ? box.x < f.x + f.w - 8 && box.x + box.w > f.x + 8 && box.y < f.y + f.h - 4 && box.y + box.h > f.y + 4
        : box.x < f.x + f.w - 4 && box.x + box.w > f.x + 4 && box.y + box.h > GROUND - f.h + 4;
      if (!hit) continue;
      if (this.fly > 0) { this.breakObstacle(f); continue; } // raketten brøyter seg gjennom
      if (this.shield > 0 || this.invuln > 0) continue; // udødelig: løper rett gjennom
      if (this.lives > 0) { this.lives--; this.invuln = 1; this.breakObstacle(f); continue; }
      this.state = 'over';
      this.overAt = performance.now();
      this.best = Math.max(this.best, this.score);
      this.onGameOver(this.score, this.coinCount, this.recordDone);
      break;
    }
  }

  draw(t) {
    const c = this.ctx;
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0f0d17');
    g.addColorStop(1, '#2a2340');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    for (const s of this.stars) {
      c.globalAlpha = 0.45 + 0.4 * Math.sin(t * 1.3 + s.p);
      c.fillStyle = '#efe9f5';
      c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    // måne
    c.fillStyle = '#f1c877';
    c.beginPath(); c.arc(640, 52, 24, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#16121f';
    c.beginPath(); c.arc(650, 46, 22, 0, Math.PI * 2); c.fill();
    // åser
    c.fillStyle = '#231d33';
    for (const hl of this.hills) { c.beginPath(); c.ellipse(hl.x + hl.w / 2, GROUND + 4, hl.w / 2, hl.h, 0, Math.PI, 0); c.fill(); }
    // bakke
    c.fillStyle = '#1b2a22';
    c.fillRect(0, GROUND, W, H - GROUND);
    c.fillStyle = '#2f4a3a';
    c.fillRect(0, GROUND, W, 3);
    if (this.slow > 0) { c.fillStyle = 'rgba(111, 144, 226, 0.12)'; c.fillRect(0, 0, W, H); }
    // gjerder og ørner (sprengte vises som vrak)
    for (const f of this.fences) { if (f.broken) this.drawBroken(f); else if (f.eagle) this.drawEagle(f); else this.drawFence(f); }
    if (this.fw.length) this.drawFireworks();
    for (const it of this.items) this.drawItem(it, t);
    for (const co of this.coins) this.drawCoin(co);
    for (const r of this.shots) this.drawShot(r);
    for (const p of this.parts) { c.globalAlpha = Math.max(0, Math.min(1, p.life * 2)); c.fillStyle = p.c; c.fillRect(p.x, p.y, p.s, p.s); }
    c.globalAlpha = 1;
    // Blinker mens den er udødelig (raskere de siste sekundene)
    const blinkRate = this.shield > 1.2 ? 8 : 16;
    const blinking = (this.shield > 0 && Math.floor(t * blinkRate) % 2 === 0) || (this.invuln > 0 && Math.floor(t * 14) % 2 === 0);
    this.drawTrail();
    this.drawPet(t);
    if (this.fly > 0) this.drawJet(t);
    if (this.magnet > 0) this.drawMagnet(t);
    if (!blinking) this.drawSheep(t);
    if (this.lives > 0) {
      const { x, y } = this.sheep;
      c.strokeStyle = `rgba(111, 170, 255, ${0.65 + 0.25 * Math.sin(t * 5)})`;
      c.lineWidth = 3;
      c.beginPath(); c.arc(x + 4, y - 20, 36, 0, Math.PI * 2); c.stroke();
      c.fillStyle = 'rgba(111, 170, 255, 0.12)';
      c.fill();
    }
    this.drawHud();
    if (this.shield > 0 && this.state === 'running' && this.countdown <= 0) {
      c.fillStyle = '#f1c877';
      c.font = '700 18px "Alegreya Sans", system-ui, sans-serif';
      c.textAlign = 'left';
      c.fillText(`🛡 ${Math.ceil(this.shield)}`, this.sheep.x - 16, this.sheep.y - 52);
    }
    // tekst
    c.fillStyle = '#efe9f5';
    c.font = '700 22px "Alegreya Sans", system-ui, sans-serif';
    c.textAlign = 'left';
    c.fillText(`🏃 ${this.text.sheep}: ${this.score}`, 16, 32);
    c.font = '16px "Alegreya Sans", system-ui, sans-serif';
    c.fillStyle = '#a99fba';
    c.fillText(`${this.text.best}: ${Math.max(this.best, this.score)}`, 16, 54);
    if (this.coinCount || this.coins.length || this.state === 'running') {
      c.fillStyle = '#f6c945';
      c.font = '700 17px "Alegreya Sans", system-ui, sans-serif';
      c.fillText(`🪙 ${this.coinCount}`, 16, 77);
    }
    c.textAlign = 'center';
    if (this.state === 'ready') this.banner(this.text.start);
    if (this.state === 'over') this.banner(`${this.text.woke} ${this.score} ${this.text.sheepCounted}`, this.text.again);
    if (this.state === 'paused') this.banner(this.text.paused);
    if (this.state === 'running' && this.countdown > 0) this.banner(String(Math.ceil(this.countdown)));
    else if (this.state === 'running' && this.recordMsg > 0 && this.text.newRecord) {
      c.fillStyle = '#ffe27a';
      c.font = '700 30px "Alegreya Sans", system-ui, sans-serif';
      c.fillText(this.text.newRecord, W / 2, 92 + Math.sin(t * 9) * 3);
    } else if (this.state === 'running' && this.puMsg) {
      c.fillStyle = '#f1c877';
      c.font = '700 22px "Alegreya Sans", system-ui, sans-serif';
      c.fillText(this.puMsg.text, W / 2, 84);
    } else if (this.state === 'running' && this.eagleMsg > 0 && this.text.eagle) {
      c.fillStyle = '#f1c877';
      c.font = '700 20px "Alegreya Sans", system-ui, sans-serif';
      c.fillText(this.text.eagle, W / 2, 84);
    }
  }

  banner(line1, line2) {
    const c = this.ctx;
    c.fillStyle = 'rgba(15, 13, 23, 0.72)';
    c.fillRect(0, 88, W, line2 ? 76 : 56);
    c.fillStyle = '#f1c877';
    c.font = '26px "IM Fell English SC", Georgia, serif';
    c.fillText(line1, W / 2, 124);
    if (line2) {
      c.fillStyle = '#efe9f5';
      c.font = '16px "Alegreya Sans", system-ui, sans-serif';
      c.fillText(line2, W / 2, 150);
    }
  }

  drawFence(f) {
    const c = this.ctx;
    const top = GROUND - f.h;
    c.fillStyle = '#8a6a44';
    c.fillRect(f.x, top, 6, f.h);
    c.fillRect(f.x + f.w - 6, top, 6, f.h);
    c.fillStyle = '#a8845a';
    c.fillRect(f.x - 2, top + 6, f.w + 4, 5);
    c.fillRect(f.x - 2, top + f.h * 0.55, f.w + 4, 5);
  }

  // ——— powerups: tegning ———
  drawHud() {
    const c = this.ctx;
    const tags = [];
    if (this.rockets > 0) tags.push(`🚀×${this.rockets}`);
    if (this.lives > 0) tags.push('🛡');
    if (this.fly > 0) tags.push(`🎆 ${this.fly}`);
    if (this.slow > 0) tags.push(`⏱ ${Math.ceil(this.slow)}`);
    if (this.double > 0) tags.push(`✨2× ${Math.ceil(this.double)}`);
    if (this.magnet > 0) tags.push(`🧲 ${Math.ceil(this.magnet)}`);
    if (!tags.length) return;
    c.font = '700 18px "Alegreya Sans", system-ui, sans-serif';
    c.textAlign = 'left';
    c.fillStyle = '#f1c877';
    c.fillText(tags.join('   '), 220, 32);
  }

  drawItem(it, t) {
    const c = this.ctx;
    const y = it.y + Math.sin(it.bob) * 4;
    const g = c.createRadialGradient(it.x, y, 2, it.x, y, 24);
    g.addColorStop(0, 'rgba(241, 200, 119, 0.9)');
    g.addColorStop(1, 'rgba(241, 200, 119, 0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(it.x, y, 24 + Math.sin(t * 6) * 2, 0, Math.PI * 2); c.fill();
    c.font = '24px system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('🎁', it.x, y + 1);
    c.textBaseline = 'alphabetic';
  }

  drawCoin(co) {
    const c = this.ctx;
    const w = Math.max(1.4, Math.abs(Math.cos(co.spin)) * COIN_R);
    const g = c.createRadialGradient(co.x - 3, co.y - 3, 1, co.x, co.y, COIN_R);
    g.addColorStop(0, '#fff6c2');
    g.addColorStop(0.55, '#f6c945');
    g.addColorStop(1, '#b8860b');
    c.fillStyle = 'rgba(255, 220, 90, 0.18)';
    c.beginPath(); c.arc(co.x, co.y, COIN_R + 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = g;
    c.strokeStyle = '#8a6206';
    c.lineWidth = 1.4;
    c.beginPath(); c.ellipse(co.x, co.y, w, COIN_R, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    if (w > 4) { c.strokeStyle = 'rgba(138, 98, 6, 0.6)'; c.beginPath(); c.ellipse(co.x, co.y, w * 0.6, COIN_R * 0.6, 0, 0, Math.PI * 2); c.stroke(); }
  }

  drawMagnet(t) {
    const c = this.ctx;
    const { x, y } = this.sheep;
    // Magnetfelt: ringer som pulserer ut fra sauen
    for (let k = 0; k < 3; k++) {
      const ph = (t * 1.4 + k / 3) % 1;
      c.strokeStyle = `rgba(255, 90, 90, ${0.35 * (1 - ph)})`;
      c.lineWidth = 2;
      c.beginPath(); c.arc(x + 6, y - 26, 30 + ph * 90, 0, Math.PI * 2); c.stroke();
    }
    // Liten hesteskomagnet over hodet
    const mx = x + 26; const my = y - 76 + Math.sin(t * 6) * 2;
    c.lineWidth = 6; c.lineCap = 'butt';
    c.strokeStyle = '#e0303f';
    c.beginPath(); c.arc(mx, my, 8, Math.PI, 0); c.stroke();
    c.beginPath(); c.moveTo(mx - 8, my); c.lineTo(mx - 8, my + 6); c.moveTo(mx + 8, my); c.lineTo(mx + 8, my + 6); c.stroke();
    c.strokeStyle = '#e5e9ef';
    c.beginPath(); c.moveTo(mx - 8, my + 6); c.lineTo(mx - 8, my + 10); c.moveTo(mx + 8, my + 6); c.lineTo(mx + 8, my + 10); c.stroke();
  }

  drawFireworks() {
    const c = this.ctx;
    for (const r of this.fw) {
      if (r.wait > 0) continue;
      if (!r.sparks) {
        c.fillStyle = '#fff4b8';
        c.beginPath(); c.arc(r.x, r.y, 2.6, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255, 210, 120, 0.5)';
        c.fillRect(r.x - 1, r.y + 3, 2, 14);
        continue;
      }
      const a = Math.max(0, 1 - r.t / 1.5);
      for (const p of r.sparks) {
        c.globalAlpha = a;
        c.fillStyle = p.c;
        c.beginPath(); c.arc(p.x, p.y, 3, 0, Math.PI * 2); c.fill();
        c.globalAlpha = a * 0.4;
        c.beginPath(); c.arc(p.x - p.vx * 0.035, p.y - p.vy * 0.035, 2.2, 0, Math.PI * 2); c.fill();
        c.globalAlpha = a * 0.2;
        c.beginPath(); c.arc(p.x - p.vx * 0.07, p.y - p.vy * 0.07, 1.6, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
    }
  }

  drawShot(r) {
    const c = this.ctx;
    c.save();
    c.translate(r.x, r.y);
    c.rotate(r.ang || 0);
    c.fillStyle = '#d9d4e2';
    c.fillRect(-10, -3, 16, 6);
    c.fillStyle = '#e0535b';
    c.beginPath(); c.moveTo(6, -3); c.lineTo(12, 0); c.lineTo(6, 3); c.closePath(); c.fill();
    c.fillStyle = '#f1c877';
    c.beginPath(); c.moveTo(-10, -3); c.lineTo(-17 - Math.random() * 5, 0); c.lineTo(-10, 3); c.closePath(); c.fill();
    c.restore();
  }

  drawBroken(f) {
    const c = this.ctx;
    const k = Math.min(1, f.brokenT * 3);
    if (f.eagle) {
      // Fjær som daler ned
      c.fillStyle = '#6b4a2b';
      for (let i = 0; i < 5; i++) {
        const fx = f.x + i * 11 + Math.sin(f.brokenT * 4 + i) * 6;
        const fy = f.y + f.brokenT * 60 + i * 5;
        c.save(); c.translate(fx, fy); c.rotate(Math.sin(f.brokenT * 3 + i)); c.fillRect(-5, -1.5, 10, 3); c.restore();
      }
      return;
    }
    // Sprengt gjerde: stubber og planker på bakken
    c.fillStyle = '#5e4a33';
    c.fillRect(f.x, GROUND - 10, 6, 10);
    c.fillRect(f.x + f.w - 6, GROUND - 7, 6, 7);
    c.fillStyle = '#8a6a44';
    c.save(); c.translate(f.x + f.w / 2, GROUND - 3); c.rotate(-0.25 * k); c.fillRect(-f.w / 2 - 4, -2, f.w + 8, 4); c.restore();
    c.save(); c.translate(f.x + f.w / 2 + 6, GROUND - 7); c.rotate(0.4 * k); c.fillRect(-f.w / 2, -2, f.w * 0.8, 4); c.restore();
    c.fillStyle = 'rgba(40, 30, 30, 0.5)';
    c.beginPath(); c.ellipse(f.x + f.w / 2, GROUND + 1, f.w * 0.9, 3, 0, 0, Math.PI * 2); c.fill();
  }

  drawJet(t) {
    const c = this.ctx;
    const { x, y } = this.sheep;
    // Stor rakett på ryggen
    c.fillStyle = '#c9c3d6';
    c.beginPath(); c.ellipse(x - 12, y - 30, 22, 9, -0.08, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e0535b';
    c.beginPath(); c.moveTo(x + 8, y - 36); c.lineTo(x + 20, y - 31); c.lineTo(x + 8, y - 25); c.closePath(); c.fill();
    c.fillRect(x - 34, y - 40, 8, 6); c.fillRect(x - 34, y - 26, 8, 6);
    const fl = 16 + Math.sin(t * 40) * 5;
    c.fillStyle = '#f1c877';
    c.beginPath(); c.moveTo(x - 34, y - 36); c.lineTo(x - 34 - fl, y - 30); c.lineTo(x - 34, y - 24); c.closePath(); c.fill();
    c.fillStyle = '#e27a4e';
    c.beginPath(); c.moveTo(x - 34, y - 33); c.lineTo(x - 34 - fl * 0.6, y - 30); c.lineTo(x - 34, y - 27); c.closePath(); c.fill();
  }

  drawEagle(f) {
    const c = this.ctx;
    const cx = f.x + f.w / 2;
    const cy = f.y + f.h / 2;
    const wing = Math.sin(f.flap) * 13;
    c.fillStyle = '#6b4a2b';
    // vinger
    c.beginPath();
    c.moveTo(cx - 4, cy); c.quadraticCurveTo(cx - 16, cy - 6 - wing, cx - 28, cy - wing); c.lineTo(cx - 6, cy + 5); c.closePath(); c.fill();
    c.beginPath();
    c.moveTo(cx + 2, cy); c.quadraticCurveTo(cx + 12, cy - 8 - wing, cx + 22, cy - 2 - wing); c.lineTo(cx + 6, cy + 5); c.closePath(); c.fill();
    // kropp og hale
    c.beginPath(); c.ellipse(cx, cy + 2, 16, 7, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(cx + 14, cy); c.lineTo(cx + 26, cy - 4); c.lineTo(cx + 26, cy + 8); c.closePath(); c.fill();
    // hvitt hode og gult nebb (flyr mot venstre)
    c.fillStyle = '#f2eee6';
    c.beginPath(); c.arc(cx - 17, cy, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f1c877';
    c.beginPath(); c.moveTo(cx - 22, cy - 2); c.lineTo(cx - 29, cy + 1); c.lineTo(cx - 22, cy + 3); c.closePath(); c.fill();
    c.fillStyle = '#16121f';
    c.beginPath(); c.arc(cx - 18, cy - 2, 1.4, 0, Math.PI * 2); c.fill();
  }

  drawTrail() {
    const c = this.ctx;
    if (this.trail && this.trail.kind === 'rainbow' && this.hist.length > 2 && this.state === 'running') {
      const x0 = this.sheep.x - 26;
      c.lineWidth = 3.4;
      c.lineCap = 'round';
      RAINBOW.forEach((col, k) => {
        c.strokeStyle = col;
        c.globalAlpha = 0.85;
        c.beginPath();
        this.hist.forEach((hy, i) => { const px = x0 - i * 7; const py = hy - 30 + k * 3.2; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
        c.stroke();
      });
      c.globalAlpha = 1;
    }
    for (const p of this.trailParts) {
      const a = Math.max(0, Math.min(1, p.life / p.max * 1.4));
      c.globalAlpha = a;
      if (this.trail && this.trail.kind === 'flame') {
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s);
        g.addColorStop(0, 'rgba(255, 236, 140, 0.95)');
        g.addColorStop(0.5, 'rgba(255, 122, 26, 0.8)');
        g.addColorStop(1, 'rgba(255, 60, 20, 0)');
        c.fillStyle = g;
        c.beginPath(); c.arc(p.x, p.y, p.s * (0.6 + a * 0.6), 0, Math.PI * 2); c.fill();
      } else {
        const im = this.partImgs[p.i % (this.partImgs.length || 1)];
        if (im && im.complete && im.naturalWidth) {
          c.save(); c.translate(p.x, p.y); c.rotate(this.trail && this.trail.kind === 'note' ? 0 : Math.sin(p.rot) * 0.5);
          c.drawImage(im, -p.s / 2, -p.s / 2, p.s, p.s); c.restore();
        }
      }
    }
    c.globalAlpha = 1;
  }

  drawPet(t) {
    const im = this.petImg;
    if (!im || !im.complete || !im.naturalWidth) return;
    const c = this.ctx;
    const sh = this.sheep;
    const run = this.state === 'running' && this.countdown <= 0;
    if (this.petFly) {
      this.petY = this.petY === undefined ? sh.y - 60 : this.petY + (sh.y - 60 - this.petY) * 0.08;
      c.drawImage(im, sh.x - 78 + Math.sin(t * 2) * 4, this.petY - 18 + Math.sin(t * 3) * 5, 34, 34);
    } else {
      const hop = run ? Math.abs(Math.sin(t * 9)) * 9 : 0;
      c.drawImage(im, sh.x - 74, GROUND - 32 - hop, 32, 32);
    }
  }

  // Kappe som flagrer bak sauen
  drawCape(t, bob) {
    const im = this.capeImg;
    if (!im || !im.complete || !im.naturalWidth) return;
    const c = this.ctx;
    const { x, y, vy } = this.sheep;
    const lift = Math.max(-0.35, Math.min(0.3, (vy || 0) / 2600));
    c.save();
    c.translate(x + 18, y - 44 + bob);
    c.rotate(-0.06 + lift + Math.sin(t * 9) * 0.07);
    c.scale(1, 1 + Math.sin(t * 12) * 0.08);
    c.drawImage(im, -74, -6, 78, 43);
    c.restore();
  }
  // Vinger: én bak sauen og én foran, som slår i takt
  drawWing(t, bob, front) {
    const im = this.wingImg;
    if (!im || !im.complete || !im.naturalWidth) return;
    const c = this.ctx;
    const { x, y } = this.sheep;
    const ang = Math.sin((t * Math.PI * 2) / (this.wingRate || 0.6)) * 0.45 - 0.15;
    const k = 0.62;
    c.save();
    c.translate(x + (front ? 2 : 8), y - 40 + bob);
    c.rotate(ang + (front ? 0 : -0.18));
    if (!front) c.globalAlpha = 0.75;
    c.drawImage(im, -52 * k, -74 * k, 58 * k, 102 * k);
    c.restore();
  }

  drawSheep(t = 0) {
    const c = this.ctx;
    const { x, y } = this.sheep;
    const bob = this.sheep.onGround ? Math.sin(this.sheep.legT) * 1.5 : 0;
    this.drawWing(t, bob, false);
    this.drawCape(t, bob);
    if (this.sprite && this.sprite.complete && this.sprite.naturalWidth) {
      // Bein (med sko) tegnes her, resten er sauen eleven har laget
      const swing = this.sheep.onGround ? Math.sin(this.sheep.legT * 2) * 5 : 4;
      c.strokeStyle = '#2b2533';
      c.lineWidth = 4;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x - 12, y - 10); c.lineTo(x - 12 - swing, y - 1);
      c.moveTo(x + 12, y - 10); c.lineTo(x + 12 + swing, y - 1);
      c.stroke();
      const sc = this.shoe && this.shoe.canvas;
      if (sc) {
        for (const fx of [x - 12 - swing, x + 12 + swing]) {
          const hgt = sc.tall ? 9 : 5;
          c.fillStyle = sc.c;
          c.beginPath(); c.roundRect ? c.roundRect(fx - 4.5, y - hgt, 11, hgt, 2) : c.rect(fx - 4.5, y - hgt, 11, hgt); c.fill();
          c.fillStyle = sc.s;
          c.fillRect(fx - 4.5, y - 2, 11, 2);
          if (sc.wheels) { c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(fx - 2, y + 1, 1.8, 0, Math.PI * 2); c.arc(fx + 4, y + 1, 1.8, 0, Math.PI * 2); c.fill(); }
        }
      }
      c.drawImage(this.sprite, x - 37, y - 60 + bob, 93, 62.7);
      this.drawWing(t, bob, true);
      return;
    }
    // bein
    c.strokeStyle = '#2b2533';
    c.lineWidth = 4;
    c.lineCap = 'round';
    const swing = this.sheep.onGround ? Math.sin(this.sheep.legT * 2) * 5 : 4;
    c.beginPath();
    c.moveTo(x - 10, y - 8); c.lineTo(x - 10 - swing, y);
    c.moveTo(x + 10, y - 8); c.lineTo(x + 10 + swing, y);
    c.stroke();
    // ull
    c.fillStyle = '#f2eee6';
    const puffs = [[-14, -18, 11], [0, -22, 13], [14, -18, 11], [-6, -12, 11], [8, -12, 11]];
    for (const [dx, dy, r] of puffs) { c.beginPath(); c.arc(x + dx, y + dy + bob, r, 0, Math.PI * 2); c.fill(); }
    // hode
    c.fillStyle = '#3a3242';
    c.beginPath(); c.ellipse(x + 24, y - 20 + bob, 9, 7, 0.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#efe9f5';
    c.beginPath(); c.arc(x + 27, y - 22 + bob, 1.8, 0, Math.PI * 2); c.fill();
    // nattlue
    c.fillStyle = '#6f90e2';
    c.beginPath(); c.moveTo(x + 17, y - 25 + bob); c.lineTo(x + 30, y - 27 + bob); c.lineTo(x + 20, y - 38 + bob); c.closePath(); c.fill();
    c.fillStyle = '#f1c877';
    c.beginPath(); c.arc(x + 20, y - 38 + bob, 2.5, 0, Math.PI * 2); c.fill();
  }
}
