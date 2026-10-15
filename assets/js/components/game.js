import { Runner } from './runner.js';
import { World } from './world.js';
import { Spawner } from './obstacles.js';
import { Particles } from './particles.js';
import { fitStage } from './stage.js';
import { readPalette, isDark } from '../core/theme.js';
import { clamp, overlaps } from '../core/utils.js';

const BASE_SPEED = 300;
const MAX_SPEED = 860;
const STEP = 1 / 90;

export class Game {
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
    this.spawner = new Spawner();
    this.particles = new Particles();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.look = hooks.getLook ? hooks.getLook() : {};
    this.time = 0;
    this.shake = 0;
    this.dustClock = 0;
    this.sparkClock = 0;
    this.speed = 0;
    this.coast = 0;
    this.last = 0;
    this.state = 'ready';
    this.frame = this.frame.bind(this);
    this.resize();
    this.reset();
    requestAnimationFrame(t => {
      this.last = t;
      this.frame(t);
    });
  }

  resize() {
    const view = fitStage(this.canvas);
    this.viewW = view.viewW;
    this.viewH = view.viewH;
    this.groundY = view.groundY;
    this.pxScale = view.pxScale;
    this.runner.x = clamp(this.viewW * 0.18, 70, 170);
    this.runner.groundY = this.groundY;
    if (this.runner.grounded) this.runner.y = this.groundY;
    this.world.resize(this.viewW, this.viewH, this.groundY);
  }

  buildPalette() {
    return { ...readPalette(), ...((this.theme && this.theme.hazard) || {}) };
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
    this.score = -1;
    this.speed = BASE_SPEED;
    this.coast = 0;
    this.shake = 0;
    this.particles.clear();
    this.world.restart();
    this.spawner.reset(false);
    this.runner.reset(this.runner.x, this.groundY);
    this.state = 'ready';
    this.emitScore();
  }

  start() {
    this.reset();
    this.spawner.reset(this.hooks.hints ? this.hooks.hints() : false);
    this.state = 'playing';
  }

  pause() {
    if (this.state !== 'playing') return false;
    this.state = 'paused';
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
    if (result === 'jump') {
      this.emitDust(8, -3, -0.2, 40, 120);
    } else if (result === 'double') {
      this.particles.emit(this.runner.x + 17, this.runner.y - 4, 10, {
        a0: 0,
        a1: Math.PI,
        s0: 60,
        s1: 160,
        l0: 0.3,
        l1: 0.5,
        z0: 2,
        z1: 4,
        color: this.bodyColor(),
        vx: -this.speed * 0.3
      });
    }
  }

  slide(down) {
    if (this.state === 'playing' || this.state === 'ready') this.runner.setSlide(down);
  }

  bodyColor() {
    const skin = this.look.skin;
    if (skin && skin.rainbow) return `hsl(${(this.time * 90) % 360} 85% 58%)`;
    return (skin && skin.runner) || this.palette.runner;
  }

  emitScore() {
    const score = Math.floor(this.dist / 30) + this.coins * 5;
    if (score !== this.score) {
      this.score = score;
      this.hooks.onScore(score, this.coins);
    }
  }

  emitDust(count, a0, a1, s0, s1, dx = 17) {
    this.particles.emit(this.runner.x + dx, this.groundY - 2, count, {
      a0,
      a1,
      s0,
      s1,
      l0: 0.25,
      l1: 0.5,
      z0: 2,
      z1: 4.5,
      color: this.world.p.dust,
      vx: -this.speed * 0.35
    });
  }

  emitSpark() {
    this.particles.emit(this.runner.x + 8, this.groundY - 3, 1, {
      a0: -2.9,
      a1: -2.0,
      s0: 60,
      s1: 150,
      l0: 0.15,
      l1: 0.32,
      z0: 1.5,
      z1: 3,
      color: (this.look.skin && this.look.skin.scarf) || this.palette.scarf,
      vx: -this.speed * 0.4
    });
  }

  die() {
    this.state = 'over';
    this.runner.alive = false;
    this.coast = this.speed;
    this.shake = this.reducedMotion ? 0 : 1;
    const cx = this.runner.x + 17;
    const cy = this.runner.y - 22;
    const burst = { s0: 120, s1: 420, l0: 0.5, l1: 1, z0: 3, z1: 8, gravity: 900 };
    this.particles.emit(cx, cy, 24, { ...burst, color: this.bodyColor() });
    this.particles.emit(cx, cy, 8, { ...burst, color: (this.look.skin && this.look.skin.scarf) || this.palette.scarf });
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
      isBest
    });
  }

  tick(h) {
    const runner = this.runner;
    if (this.state === 'ready') {
      this.world.update(h, 150);
      runner.update(h, 150);
      return;
    }
    if (this.state === 'over') {
      this.coast -= this.coast * Math.min(1, 6 * h);
      this.world.update(h, this.coast);
      return;
    }
    if (this.state !== 'playing') return;

    this.speed = Math.min(MAX_SPEED, BASE_SPEED + this.dist * 0.011);
    this.dist += this.speed * h;
    this.world.update(h, this.speed);

    let low = false;
    for (const o of this.spawner.obstacles) {
      if (o.kind === 'gate' && o.x < runner.x + 46 && o.x + o.w > runner.x) {
        low = true;
        break;
      }
    }
    runner.update(h, this.speed, low);
    this.spawner.update(h, this.speed, this.dist, this.viewW);

    if (runner.slid) this.emitDust(6, -3, -1.8, 40, 110, 8);
    if (runner.landed) this.emitDust(8, -3, -0.15, 60, 160);
    this.dustClock += h;
    this.sparkClock += h;
    if (runner.grounded && runner.sliding) {
      if (this.sparkClock > 0.035) {
        this.sparkClock = 0;
        this.emitSpark();
      }
    } else if (runner.grounded && this.dustClock > 0.06) {
      this.dustClock = 0;
      this.emitDust(1, -2.4, -0.8, 20, 70);
    }

    const rb = runner.box();
    for (const o of this.spawner.obstacles) {
      if (overlaps(rb, o.box(this.groundY))) {
        this.die();
        return;
      }
    }
    for (const c of this.spawner.coins) {
      if (c.taken) continue;
      const cb = { x: c.x - c.r, y: this.groundY - c.up - c.r, w: c.r * 2, h: c.r * 2 };
      if (overlaps({ x: rb.x - 6, y: rb.y - 6, w: rb.w + 12, h: rb.h + 12 }, cb)) {
        c.taken = true;
        this.coins++;
        this.particles.emit(c.x, this.groundY - c.up, 8, {
          s0: 40,
          s1: 160,
          l0: 0.25,
          l1: 0.5,
          z0: 2,
          z1: 4,
          color: this.palette.coin
        });
      }
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
    }
    this.draw();
    requestAnimationFrame(this.frame);
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.pxScale, 0, 0, this.pxScale, 0, 0);
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake * 10, (Math.random() - 0.5) * this.shake * 10);
    }
    const speed = this.state === 'over' ? this.coast : this.state === 'ready' ? 150 : this.speed;
    this.world.draw(ctx, speed);
    this.spawner.draw(ctx, this.palette, this.groundY, this.time, this.viewW);
    if (this.runner.alive) this.runner.draw(ctx, this.palette, speed, this.time, this.look);
    this.particles.draw(ctx);
  }
}