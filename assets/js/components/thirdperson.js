import { Runner } from './runner.js';
import { World } from './world.js';
import { LaneSpawner, LANE_W } from './lanes.js';
import { Particles } from './particles.js';
import { drawCoin, drawObstacle, drawRoad, drawRush, makeColors, makeView } from './perspective.js';
import { fitStage } from './stage.js';
import { readPalette, isDark } from '../core/theme.js';
import { clamp } from '../core/utils.js';
import { audio } from '../core/audio.js';
import { speedAt } from '../core/difficulty.js';

const STEP = 1 / 90;
const HALF = 12;
const REACH = 12;
const SHIFT = 15;
const SLIDE_TIME = 0.55;
const EYE = 112;
const FOCAL = 0.9;
const TALL = 1.15;
const HORIZON = 0.45;
const FEET = 0.78;
const RUNNER_H = 340;
const FOLLOW = 0.3;
const LOOK = 0.6;
const START_Z = 800;

export class ThirdPersonGame {
  constructor(canvas, hooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
    this.best = hooks.best || 0;
    this.world = new World();
    this.world.bindSky(mode => {
      document.documentElement.dataset.sky = mode;
    });
    this.theme = hooks.getWorld ? hooks.getWorld() : null;
    this.palette = this.buildPalette();
    if (this.theme) this.world.setTheme(this.theme, isDark());
    this.runner = new Runner();
    this.spawner = new LaneSpawner();
    this.particles = new Particles();
    this.view = makeView();
    this.queue = [];
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.view.reduced = this.reducedMotion;
    this.look = hooks.getLook ? hooks.getLook() : {};
    this.time = 0;
    this.shake = 0;
    this.flash = 0;
    this.speed = 0;
    this.coast = 0;
    this.scroll = 0;
    this.last = 0;
    this.state = 'ready';
    this.lane = 0;
    this.x = 0;
    this.eye = EYE;
    this.back = 300;
    this.slideHeld = false;
    this.slideTimer = 0;
    this.frame = this.frame.bind(this);
    this.resize();
    this.reset();
    requestAnimationFrame(t => {
      this.last = t;
      this.frame(t);
    });
  }

  resize() {
    const fit = fitStage(this.canvas);
    const v = this.view;
    this.viewW = fit.viewW;
    this.viewH = fit.viewH;
    this.pxScale = fit.pxScale;
    v.w = fit.viewW;
    v.h = fit.viewH;
    v.cx = fit.viewW / 2;
    v.hy = Math.round(fit.viewH * HORIZON);
    v.F = Math.min(fit.viewW * FOCAL, fit.viewH * TALL);
    this.back = (RUNNER_H * v.F) / fit.viewH;
    this.spawner.cull = -this.back + 10;
    this.world.resize(v.w, v.h, v.hy);
    this.world.streaks = [];
  }

  buildPalette() {
    return { ...readPalette(), ...((this.theme && this.theme.hazard) || {}) };
  }

  paint() {
    this.view.pal = this.palette;
    Object.assign(this.view, makeColors(this.palette, this.world.p));
  }

  setPalette() {
    this.palette = this.buildPalette();
    this.world.setTheme(this.theme || this.world.theme, isDark());
  }

  setWorld(theme) {
    if (!theme || theme === this.theme) return;
    this.theme = theme;
    this.palette = this.buildPalette();
    this.world.setTheme(theme, isDark());
  }

  setLook(look) {
    this.look = look;
  }

  reset() {
    this.dist = 0;
    this.coins = 0;
    this.slides = 0;
    this.dodged = 0;
    this.score = -1;
    this.speed = speedAt(0);
    this.coast = 0;
    this.shake = 0;
    this.flash = 0;
    this.lane = 0;
    this.x = 0;
    this.slideHeld = false;
    this.slideTimer = 0;
    this.particles.clear();
    this.world.restart();
    this.spawner.reset();
    this.runner.reset(-17, 0);
    this.state = 'ready';
    this.emitScore();
  }

  start() {
    this.reset();
    this.spawner.spawn(this.speed, 0, START_Z);
    this.state = 'playing';
  }

  pause() {
    if (this.state !== 'playing') return false;
    this.state = 'paused';
    this.slideHeld = false;
    this.slideTimer = 0;
    this.runner.setSlide(false);
    return true;
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.runner.setSlide(false);
  }

  jump() {
    if (this.state !== 'playing') return;
    const result = this.runner.jump();
    if (result === 'jump') audio.sfx('jump');
    else if (result === 'double') audio.sfx('double');
  }

  slide(down, timed = false) {
    if (this.state !== 'playing' && this.state !== 'ready') return;
    if (timed) this.slideTimer = SLIDE_TIME;
    else this.slideHeld = down;
  }

  move(dir) {
    if (this.state !== 'playing') return;
    const next = clamp(this.lane + dir, -1, 1);
    if (next === this.lane) return;
    this.lane = next;
    audio.sfx('lane');
  }

  emitScore() {
    const score = Math.floor(this.dist / 30) + this.coins * 5;
    if (score !== this.score) {
      this.score = score;
      this.hooks.onScore(score, this.coins);
    }
  }

  die() {
    this.state = 'over';
    audio.sfx('hit');
    this.runner.alive = false;
    this.coast = this.speed;
    this.shake = this.reducedMotion ? 0 : 1;
    this.flash = this.reducedMotion ? 0 : 0.6;
    this.particles.emit(this.viewW / 2 + (this.x - this.camX()) * this.scale(), this.feetY() - 20, 28, {
      s0: 120,
      s1: 420,
      l0: 0.5,
      l1: 1,
      z0: 3,
      z1: 8,
      gravity: 900,
      color: this.palette.hazard
    });
    try {
      navigator.vibrate?.(40);
    } catch {}
    const score = this.score;
    const isBest = score > this.best;
    if (isBest) this.best = score;
    this.hooks.onOver({
      score,
      coins: this.coins,
      meters: Math.floor(this.dist / 30),
      best: this.best,
      isBest,
      jumps: this.runner.jumpCount,
      doubles: this.runner.doubleCount,
      slides: this.slides,
      dodged: this.dodged
    });
  }

  camX() {
    return this.x * LOOK;
  }

  scale() {
    return this.view.F / this.back;
  }

  feetY() {
    const v = this.view;
    return v.hy + (this.eye * v.F) / this.back;
  }

  across(o) {
    return this.x + HALF > o.x0 && this.x - HALF < o.x1;
  }

  hits(o, lo, hi) {
    if (o.z > REACH || o.z + o.d < -REACH || !this.across(o)) return false;
    return lo < o.y1 && hi > o.y0;
  }

  tick(h) {
    const runner = this.runner;
    if (this.state === 'ready') {
      this.world.update(h, 150);
      this.scroll += 150 * h;
      runner.update(h, 150);
      return;
    }
    if (this.state === 'over') {
      this.coast -= this.coast * Math.min(1, 6 * h);
      this.world.update(h, this.coast);
      this.scroll += this.coast * h;
      return;
    }
    if (this.state !== 'playing') return;

    this.speed = speedAt(this.dist);
    this.dist += this.speed * h;
    this.scroll += this.speed * h;
    this.world.update(h, this.speed);
    this.x += (this.lane * LANE_W - this.x) * Math.min(1, SHIFT * h);
    this.world.farX = this.x * 0.12;
    this.world.midX = this.x * 0.35;

    this.slideTimer = Math.max(0, this.slideTimer - h);
    runner.setSlide(this.slideHeld || this.slideTimer > 0);
    let low = false;
    for (const o of this.spawner.obstacles) {
      if (o.kind === 'gate' && o.z < 46 && o.z + o.d > 0 && this.across(o)) {
        low = true;
        break;
      }
    }
    runner.update(h, this.speed, low);
    this.spawner.update(h, this.speed, this.dist);
    if (runner.slid) {
      audio.sfx('slide');
      this.slides++;
    }

    const box = runner.box();
    const lo = -(box.y + box.h);
    const hi = -box.y;
    for (const o of this.spawner.obstacles) {
      if (this.hits(o, lo, hi)) {
        this.die();
        return;
      }
    }
    for (const o of this.spawner.obstacles) {
      if (!o.passed && o.z + o.d < -REACH) {
        o.passed = true;
        if (o.main) this.dodged++;
      }
    }
    for (const c of this.spawner.coins) {
      if (c.taken || Math.abs(c.z) > 22 || Math.abs(c.x - this.x) > LANE_W * 0.5) continue;
      if (c.up < lo - 8 || c.up > hi + 8) continue;
      c.taken = true;
      this.coins++;
      audio.sfx('coin');
      this.particles.emit(this.viewW / 2 + (c.x - this.camX()) * this.scale(), this.feetY() - c.up * this.scale(), 8, {
        s0: 40,
        s1: 160,
        l0: 0.25,
        l1: 0.5,
        z0: 2,
        z1: 4,
        color: this.palette.coin
      });
    }
    this.emitScore();
  }

  frame(now) {
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    if (this.state !== 'paused') {
      this.time += dt;
      const steps = Math.max(1, Math.ceil(dt / STEP));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) this.tick(h);
      this.particles.update(dt);
      this.shake = Math.max(0, this.shake - dt * 2.5);
      this.flash = Math.max(0, this.flash - dt * 2);
      const runner = this.runner;
      const target = EYE + Math.max(0, -runner.y) * FOLLOW;
      this.eye += (target - this.eye) * Math.min(1, 10 * dt);
    }
    this.draw();
    requestAnimationFrame(this.frame);
  }

  draw() {
    const ctx = this.ctx;
    const v = this.view;
    ctx.setTransform(this.pxScale, 0, 0, this.pxScale, 0, 0);
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake * 10, (Math.random() - 0.5) * this.shake * 10);
    }
    const speed = this.state === 'over' ? this.coast : this.state === 'ready' ? 150 : this.speed;
    v.p = this.world.p;
    v.x = this.camX();
    v.eye = this.eye;
    v.time = this.time;
    v.scroll = this.scroll;
    this.paint();
    this.world.draw(ctx, 0);
    drawRoad(ctx, v);
    const list = this.spawner.obstacles;
    const coins = this.spawner.coins;
    const queue = this.queue;
    queue.length = 0;
    for (const o of list) queue.push(o);
    for (const c of coins) if (!c.taken) queue.push(c);
    if (this.runner.alive || this.state === 'over') queue.push(this.runner);
    queue.sort((a, b) => (b === this.runner ? 0 : b.z) - (a === this.runner ? 0 : a.z));
    const back = this.back;
    for (const item of queue) {
      if (item === this.runner) {
        this.drawRunner(ctx, speed);
        continue;
      }
      item.z += back;
      if (item.kind) drawObstacle(ctx, v, item);
      else drawCoin(ctx, v, item);
      item.z -= back;
    }
    drawRush(ctx, v, speed);
    this.particles.draw(ctx);
    if (this.flash > 0) {
      ctx.globalAlpha = this.flash;
      ctx.fillStyle = this.palette.hazard;
      ctx.fillRect(-30, -30, v.w + 60, v.h + 60);
      ctx.globalAlpha = 1;
    }
  }

  drawRunner(ctx, speed) {
    if (!this.runner.alive) return;
    const v = this.view;
    const k = this.scale();
    const x = v.cx + (this.x - this.camX()) * k;
    const y = this.feetY();
    const lift = Math.max(0, -this.runner.y);
    ctx.save();
    ctx.globalAlpha = Math.max(0.08, 0.3 - lift / 600);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y, 20 * k * (1 - Math.min(0.4, lift / 400)), 5 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k * (this.x - this.lane * LANE_W > 3 ? -1 : 1), k);
    this.runner.draw(ctx, this.palette, speed, this.time, this.look);
    ctx.restore();
  }
}