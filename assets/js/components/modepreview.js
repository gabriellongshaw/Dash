import { Game } from './game.js';
import { ThirdPersonGame } from './thirdperson.js';
import { LANE_W } from './lanes.js';
import { jumpTime } from './runner.js';
import { overlaps } from '../core/utils.js';

const SPEED = 290;
const GAP = 400;
const HALF_AIR = (SPEED * jumpTime()) / 2;
const CLASSIC_PLAN = ['crate', 'gate', 'spikes', 'crate', 'spikes', 'gate'];
const THIRD_PLAN = ['crate', 'pair', 'gate', 'spikes', 'pair', 'crate', 'gate'];

function plan(spawner, list, state) {
  if (spawner.intro.length) return;
  spawner.intro.push(list[state.next++ % list.length]);
}

function settle(spawner) {
  if (spawner.nextAt > GAP) spawner.nextAt = GAP;
}

export class ClassicPreview extends Game {
  constructor(canvas, hooks) {
    super(canvas, { ...hooks, fill: true });
    this.script = { next: 0 };
    this.state = 'playing';
    this.speed = SPEED;
    plan(this.spawner, CLASSIC_PLAN, this.script);
    this.spawner.spawn(SPEED, 0, this.viewW);
  }

  frame(now) {
    if (this.stopped) return;
    super.frame(now);
    if (this.reducedMotion && this.time > 1.4) this.stopped = true;
  }

  autopilot() {
    const r = this.runner;
    let slide = false;
    for (const o of this.spawner.obstacles) {
      if (o.kind === 'gate') {
        if (o.x < r.x + 62 && o.x + o.w > r.x - 14) slide = true;
      } else if (!o.jumped && r.grounded) {
        const ahead = o.x + o.w / 2 - (r.x + 17);
        if (ahead > 0 && ahead <= HALF_AIR) {
          o.jumped = true;
          r.jump();
          this.emitDust(8, -3, -0.2, 40, 120);
        }
      }
    }
    r.setSlide(slide);
  }

  tick(h) {
    const r = this.runner;
    this.dist += SPEED * h;
    this.world.update(h, SPEED);
    this.autopilot();
    let low = false;
    for (const o of this.spawner.obstacles) {
      if (o.kind === 'gate' && o.x < r.x + 46 && o.x + o.w > r.x) low = true;
    }
    r.update(h, SPEED, low);
    this.spawner.update(h, SPEED, 0, this.viewW);
    plan(this.spawner, CLASSIC_PLAN, this.script);
    settle(this.spawner);
    if (r.slid) this.emitDust(6, -3, -1.8, 40, 110, 8);
    if (r.landed) this.emitDust(8, -3, -0.15, 60, 160);
    this.dustClock += h;
    this.sparkClock += h;
    if (r.grounded && r.sliding) {
      if (this.sparkClock > 0.035) {
        this.sparkClock = 0;
        this.emitSpark();
      }
    } else if (r.grounded && this.dustClock > 0.06) {
      this.dustClock = 0;
      this.emitDust(1, -2.4, -0.8, 20, 70);
    }
    const rb = r.box();
    for (const c of this.spawner.coins) {
      if (c.taken) continue;
      const cb = { x: c.x - c.r, y: this.groundY - c.up - c.r, w: c.r * 2, h: c.r * 2 };
      if (overlaps({ x: rb.x - 6, y: rb.y - 6, w: rb.w + 12, h: rb.h + 12 }, cb)) {
        c.taken = true;
        this.particles.emit(c.x, this.groundY - c.up, 8, {
          s0: 40, s1: 160, l0: 0.25, l1: 0.5, z0: 2, z1: 4, color: this.palette.coin
        });
      }
    }
  }
}

export class ThirdPreview extends ThirdPersonGame {
  constructor(canvas, hooks) {
    super(canvas, { ...hooks, fill: true });
    this.script = { next: 0 };
    this.state = 'playing';
    this.speed = SPEED;
    plan(this.spawner, THIRD_PLAN, this.script);
    this.spawner.spawn(SPEED, 0, 560);
  }

  frame(now) {
    if (this.stopped) return;
    super.frame(now);
    if (this.reducedMotion && this.time > 1.4) this.stopped = true;
  }

  autopilot() {
    const r = this.runner;
    let near = null;
    for (const o of this.spawner.obstacles) {
      if (o.z + o.d > -12 && (!near || o.z < near.z)) near = o;
    }
    let slide = false;
    for (const o of this.spawner.obstacles) {
      if (o.kind === 'gate' && o.z < 46 && o.z + o.d > -6 && this.across(o)) slide = true;
    }
    this.slideHeld = slide;
    if (!near) return;
    const group = this.spawner.obstacles.filter(o => Math.abs(o.z - near.z) < 8);
    if (near.kind === 'gate') return;
    const blocked = [false, false, false];
    for (const o of group) for (let a = o.a; a <= o.b; a++) blocked[a + 1] = true;
    if (group.length > 1 && blocked[this.lane + 1] && near.z < SPEED * 0.5) {
      const free = [-1, 0, 1].filter(a => !blocked[a + 1]).sort((a, b) => Math.abs(a - this.lane) - Math.abs(b - this.lane));
      if (free.length) this.lane += Math.sign(free[0] - this.lane);
      return;
    }
    if (group.length === 1 && blocked[this.lane + 1] && !near.jumped && r.grounded && near.z + near.d / 2 <= HALF_AIR) {
      near.jumped = true;
      r.jump();
    }
  }

  tick(h) {
    const r = this.runner;
    this.dist += SPEED * h;
    this.scroll += SPEED * h;
    this.world.update(h, SPEED);
    this.autopilot();
    this.x += (this.lane * LANE_W - this.x) * Math.min(1, 22 * h);
    r.setSlide(this.slideHeld);
    let low = false;
    for (const o of this.spawner.obstacles) {
      if (o.kind === 'gate' && o.z < 46 && o.z + o.d > 0 && this.across(o)) low = true;
    }
    r.update(h, SPEED, low);
    this.spawner.update(h, SPEED, 0);
    plan(this.spawner, THIRD_PLAN, this.script);
    settle(this.spawner);
    const box = r.box();
    const lo = -(box.y + box.h);
    const hi = -box.y;
    for (const c of this.spawner.coins) {
      if (c.taken || Math.abs(c.z) > 22 || Math.abs(c.x - this.x) > LANE_W * 0.5) continue;
      if (c.up < lo - 8 || c.up > hi + 8) continue;
      c.taken = true;
      this.particles.emit(this.viewW / 2 + (c.x - this.camX()) * this.scale(), this.feetY() - c.up * this.scale(), 8, {
        s0: 40, s1: 160, l0: 0.25, l1: 0.5, z0: 2, z1: 4, color: this.palette.coin
      });
    }
  }
}