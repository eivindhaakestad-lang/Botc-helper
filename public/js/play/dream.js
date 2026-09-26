// Drømmespillet: en enkel løper i Chrome-dino-stil.
// Hopp over hindrene: hvert hinder du kommer forbi, gir ett poeng.
// Fra ca. 30 poeng kommer det også ørner. De flyr i hodehøyde – da må du IKKE hoppe:
// hopper du når ørnen er nær, stuper den og tar deg.

const W = 720;
const H = 260;
const GROUND = 214;
const GRAVITY = 2500;
const JUMP_V = -860;
const CUT_V = -330;
const EAGLE_FROM = 30;
const EAGLE_TOP = GROUND - 80; // ørnen flyr like over hodet når du løper
const EAGLE_H = 30;

export class DreamGame {
  constructor(canvas, { onGameOver, onScore, text, best = 0 }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onGameOver = onGameOver || (() => {});
    this.onScore = onScore || (() => {});
    this.text = text;
    this.state = 'ready';
    this.best = best;
    this.stars = Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * (GROUND - 60), r: Math.random() * 1.4 + 0.4, p: Math.random() * 6 }));
    this.hills = [0, 260, 520].map((x) => ({ x, w: 260 + Math.random() * 120, h: 30 + Math.random() * 30 }));
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

  reset() {
    this.sheep = { x: 92, y: GROUND, vy: 0, onGround: true, legT: 0 };
    this.fences = [];
    this.eagleWarned = false;
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
    if (this.wasRunning) { this.state = 'running'; this.countdown = 3; }
    else this.state = this.pausedFrom || 'ready';
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

  update(dt) {
    if (this.state !== 'running') return;
    if (this.countdown > 0) { this.countdown -= dt; return; }
    this.time += dt;
    this.speed = Math.min(920, 360 + this.time * 9);
    const sh = this.sheep;
    sh.vy += GRAVITY * dt;
    sh.y += sh.vy * dt;
    if (sh.y >= GROUND) { sh.y = GROUND; sh.vy = 0; sh.onGround = true; }
    sh.legT += dt * (sh.onGround ? this.speed / 40 : 0);
    for (const hl of this.hills) { hl.x -= this.speed * 0.15 * dt; if (hl.x + hl.w < 0) { hl.x = W + Math.random() * 80; hl.w = 260 + Math.random() * 120; hl.h = 30 + Math.random() * 30; } }
    this.nextGap -= this.speed * dt;
    if (this.nextGap <= 0) {
      // Ørn: fra ca. 30 poeng, stadig oftere, men aldri to rett etter hverandre
      const lastEagle = this.fences.length && this.fences[this.fences.length - 1].eagle;
      const eagleChance = this.score + this.fences.length >= EAGLE_FROM ? Math.min(0.5, 0.3 + (this.score - EAGLE_FROM) / 100) : 0;
      if (!lastEagle && Math.random() < eagleChance) {
        this.fences.push({ x: W + 10, w: 54, h: EAGLE_H, y: EAGLE_TOP, eagle: true, flap: Math.random() * 6, passed: false });
        if (!this.eagleWarned) { this.eagleWarned = true; this.eagleMsg = 1.8; }
      } else {
        const tall = Math.random() < Math.min(0.55, 0.15 + this.time / 90);
        const double = this.time > 25 && Math.random() < 0.22;
        const w = double ? 44 : 18 + Math.random() * 14;
        const h = tall ? 54 + Math.random() * 12 : 32 + Math.random() * 14;
        this.fences.push({ x: W + 10, w, h, passed: false });
      }
      this.nextGap = this.speed * (0.75 + Math.random() * 0.95) + 120;
    }
    if (this.eagleMsg > 0) this.eagleMsg -= dt;
    for (const f of this.fences) {
      f.x -= this.speed * (f.eagle ? 1.12 : 1) * dt;
      if (f.eagle) {
        f.flap += dt * 12;
        const near = !f.passed && f.x - sh.x < 240 && f.x + f.w > sh.x - 24;
        const target = near && !sh.onGround ? sh.y - 40 : EAGLE_TOP;
        const step = (near && !sh.onGround ? 1100 : 260) * dt;
        f.y += Math.max(-step, Math.min(step, target - f.y));
      }
      if (!f.passed && f.x + f.w < sh.x - 20) { f.passed = true; this.score++; this.onScore(this.score); }
    }
    this.fences = this.fences.filter((f) => f.x + f.w > -20);
    // kollisjon (litt romslig)
    const box = { x: sh.x - 20, y: sh.y - 34, w: 40, h: 30 };
    for (const f of this.fences) {
      const hit = f.eagle
        ? box.x < f.x + f.w - 8 && box.x + box.w > f.x + 8 && box.y < f.y + f.h - 4 && box.y + box.h > f.y + 4
        : box.x < f.x + f.w - 4 && box.x + box.w > f.x + 4 && box.y + box.h > GROUND - f.h + 4;
      if (hit) {
        this.state = 'over';
        this.overAt = performance.now();
        this.best = Math.max(this.best, this.score);
        this.onGameOver(this.score);
        break;
      }
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
    // gjerder
    for (const f of this.fences) { if (f.eagle) this.drawEagle(f); else this.drawFence(f); }
    this.drawSheep();
    // tekst
    c.fillStyle = '#efe9f5';
    c.font = '700 22px "Alegreya Sans", system-ui, sans-serif';
    c.textAlign = 'left';
    c.fillText(`🏃 ${this.text.sheep}: ${this.score}`, 16, 32);
    c.font = '16px "Alegreya Sans", system-ui, sans-serif';
    c.fillStyle = '#a99fba';
    c.fillText(`${this.text.best}: ${Math.max(this.best, this.score)}`, 16, 54);
    c.textAlign = 'center';
    if (this.state === 'ready') this.banner(this.text.start);
    if (this.state === 'over') this.banner(`${this.text.woke} ${this.score} ${this.text.sheepCounted}`, this.text.again);
    if (this.state === 'paused') this.banner(this.text.paused);
    if (this.state === 'running' && this.countdown > 0) this.banner(String(Math.ceil(this.countdown)));
    else if (this.state === 'running' && this.eagleMsg > 0 && this.text.eagle) {
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

  drawSheep() {
    const c = this.ctx;
    const { x, y } = this.sheep;
    const bob = this.sheep.onGround ? Math.sin(this.sheep.legT) * 1.5 : 0;
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
