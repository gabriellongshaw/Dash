import { pick, rand, randInt } from '../core/utils.js';
import { BODY_LIFT, jumpHeight, jumpTime } from './runner.js';

const SPIKE_W = 26;
const SPIKE_H = 28;
const GATE_W = 40;
const GATE_CLEARANCE = 36;
const GATE_TOP = -800;
const WALL_W = 30;
const WALL_H = 124;
const DRONE_W = 50;
const DRONE_H = 22;
const DRONE_LIFT = 34;
const DRONE_HIGH = 92;
const ROLLER_R = 17;
const ROLLER_EXTRA = 130;

function tape(ctx, x, y, w, h, a, b) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = a;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = b;
  for (let i = -h; i < w + h; i += 14) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + 7, y + h);
    ctx.lineTo(x + i + 7 + h, y);
    ctx.lineTo(x + i + h, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

class Crate {
  constructor(x, w, h, hint = null) {
    this.kind = h >= 100 ? 'wall' : 'crate';
    this.x = x;
    this.w = w;
    this.h = h;
    this.hint = hint;
  }

  box(g) {
    return { x: this.x + 3, y: g - this.h + 3, w: this.w - 6, h: this.h - 3 };
  }

  draw(ctx, p, g) {
    ctx.fillStyle = p.hazard;
    ctx.beginPath();
    ctx.roundRect(this.x, g - this.h, this.w, this.h, 6);
    ctx.fill();
    if (this.kind === 'wall') {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(this.x, g - this.h, this.w, this.h, 6);
      ctx.clip();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = p.hazardDark;
      for (let y = g - this.h + 8; y < g; y += 26) {
        ctx.beginPath();
        ctx.moveTo(this.x, y + 14);
        ctx.lineTo(this.x + this.w / 2, y);
        ctx.lineTo(this.x + this.w, y + 14);
        ctx.lineTo(this.x + this.w, y + 22);
        ctx.lineTo(this.x + this.w / 2, y + 8);
        ctx.lineTo(this.x, y + 22);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = p.hazardLight;
    ctx.beginPath();
    ctx.roundRect(this.x + 5, g - this.h + 5, this.w - 10, 5, 2.5);
    ctx.fill();
    if (this.kind === 'crate' && this.h > 40) {
      ctx.strokeStyle = p.hazardDark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(this.x + 8, g - this.h + 16, this.w - 16, this.h - 26, 3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

class Gate {
  constructor(x, hint = null) {
    this.kind = 'gate';
    this.x = x;
    this.w = GATE_W;
    this.h = 0;
    this.hint = hint;
  }

  box(g) {
    const bottom = g - GATE_CLEARANCE;
    return { x: this.x + 3, y: GATE_TOP, w: this.w - 6, h: bottom - GATE_TOP };
  }

  draw(ctx, p, g, time) {
    const bottom = g - GATE_CLEARANCE;
    ctx.fillStyle = p.hazardDark;
    ctx.beginPath();
    ctx.roundRect(this.x, GATE_TOP, this.w, bottom - GATE_TOP, [0, 0, 8, 8]);
    ctx.fill();
    ctx.fillStyle = p.hazard;
    ctx.beginPath();
    ctx.roundRect(this.x + 5, GATE_TOP, this.w - 10, bottom - GATE_TOP - 4, [0, 0, 5, 5]);
    ctx.fill();
    tape(ctx, this.x, bottom - 24, this.w, 24, p.hazardDark, p.hazardLight);
    ctx.globalAlpha = 0.55 + Math.sin(time * 8) * 0.25;
    ctx.fillStyle = p.hazardLight;
    ctx.fillRect(this.x + 8, bottom + 1, this.w - 16, 3);
    ctx.globalAlpha = 1;
  }
}

class Spikes {
  constructor(x, count) {
    this.kind = 'spikes';
    this.x = x;
    this.count = count;
    this.w = count * SPIKE_W;
    this.h = SPIKE_H;
    this.hint = null;
  }

  box(g) {
    return { x: this.x + 4, y: g - this.h * 0.65, w: this.w - 8, h: this.h * 0.65 };
  }

  draw(ctx, p, g) {
    ctx.fillStyle = p.hazard;
    ctx.beginPath();
    for (let i = 0; i < this.count; i++) {
      const sx = this.x + i * SPIKE_W;
      ctx.moveTo(sx, g);
      ctx.lineTo(sx + SPIKE_W / 2, g - SPIKE_H);
      ctx.lineTo(sx + SPIKE_W, g);
    }
    ctx.fill();
    ctx.fillStyle = p.hazardDark;
    ctx.fillRect(this.x, g - 4, this.w, 4);
  }
}

class Drone {
  constructor(x, bob = false) {
    this.kind = 'drone';
    this.x = x;
    this.w = DRONE_W;
    this.h = DRONE_H;
    this.bob = bob;
    this.t = rand(0, 6);
    this.hint = null;
  }

  tick(dt) {
    this.t += dt;
  }

  lift() {
    return this.bob ? DRONE_LIFT + ((Math.sin(this.t * 3) + 1) / 2) * (DRONE_HIGH - DRONE_LIFT) : DRONE_LIFT;
  }

  box(g) {
    const top = g - this.lift() - this.h;
    return { x: this.x + 4, y: top + 4, w: this.w - 8, h: this.h - 6 };
  }

  draw(ctx, p, g, time) {
    const top = g - this.lift() - this.h + (this.bob ? 0 : Math.sin(time * 6 + this.x * 0.02) * 2);
    const cx = this.x + this.w / 2;
    const blade = 18 + Math.cos(time * 40) * 8;
    ctx.fillStyle = p.hazardDark;
    ctx.fillRect(cx - 1.5, top - 1, 3, 7);
    ctx.fillRect(cx - blade, top - 4, blade * 2, 3);
    ctx.fillStyle = p.hazard;
    ctx.beginPath();
    ctx.roundRect(this.x, top + 5, this.w, this.h - 5, 10);
    ctx.fill();
    ctx.fillStyle = p.hazardLight;
    ctx.beginPath();
    ctx.arc(this.x + 15, top + 15, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.hazardDark;
    ctx.fillRect(this.x + this.w - 14, top + 13, 8, 3);
    if (this.bob) {
      ctx.globalAlpha = 0.35 + Math.sin(time * 9) * 0.25;
      ctx.fillStyle = p.hazardLight;
      ctx.fillRect(this.x + this.w - 14, top + 13, 8, 3);
      ctx.globalAlpha = 1;
    }
  }
}

class Roller {
  constructor(x) {
    this.kind = 'roller';
    this.x = x;
    this.w = ROLLER_R * 2;
    this.h = ROLLER_R * 2;
    this.spin = 0;
    this.hint = null;
  }

  tick(dt) {
    this.x -= ROLLER_EXTRA * dt;
    this.spin += dt * 9;
  }

  box(g) {
    return { x: this.x + 5, y: g - this.h + 5, w: this.w - 10, h: this.h - 5 };
  }

  draw(ctx, p, g) {
    ctx.save();
    ctx.translate(this.x + ROLLER_R, g - ROLLER_R);
    ctx.rotate(-this.spin);
    ctx.fillStyle = p.hazard;
    ctx.beginPath();
    ctx.arc(0, 0, ROLLER_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.hazardDark;
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(ROLLER_R - 2, -5);
      ctx.lineTo(ROLLER_R - 2, 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = p.hazardLight;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Coin {
  constructor(x, up) {
    this.x = x;
    this.up = up;
    this.r = 10;
    this.taken = false;
  }

  draw(ctx, p, g, time) {
    const squeeze = Math.abs(Math.cos(time * 4 + this.x * 0.01)) * 0.55 + 0.45;
    ctx.save();
    ctx.translate(this.x, g - this.up);
    ctx.scale(squeeze, 1);
    ctx.fillStyle = p.coin;
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.coinDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.r - 3.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

const builders = {
  crate(s, x0, speed) {
    const w = randInt(36, 46);
    const h = pick([34, 44, 56]);
    s.obstacles.push(new Crate(x0, w, h));
    s.jumpCoins(x0 + w / 2, speed);
    return w;
  },
  double(s, x0, speed) {
    const w = randInt(28, 34);
    const h = pick([34, 40]);
    s.obstacles.push(new Crate(x0, w, h), new Crate(x0 + w + 16, w, h));
    s.jumpCoins(x0 + w + 8, speed);
    return w * 2 + 16;
  },
  spikes(s, x0, speed) {
    const count = randInt(2, 3);
    s.obstacles.push(new Spikes(x0, count));
    s.jumpCoins(x0 + (count * SPIKE_W) / 2, speed);
    return count * SPIKE_W;
  },
  wall(s, x0, speed) {
    s.obstacles.push(new Crate(x0, WALL_W, WALL_H, s.hint('wall')));
    s.ladderCoins(x0 + WALL_W / 2, speed, WALL_H);
    return WALL_W;
  },
  gate(s, x0) {
    s.obstacles.push(new Gate(x0, s.hint('gate')));
    s.lowCoins(x0 - 14, 4);
    return GATE_W;
  },
  combo(s, x0, speed) {
    const w = randInt(36, 44);
    const h = pick([34, 44]);
    const gap = speed * 0.9 + 80;
    s.obstacles.push(new Crate(x0, w, h), new Gate(x0 + w + gap, s.hint('gate')));
    s.jumpCoins(x0 + w / 2, speed);
    return w + gap + GATE_W;
  },
  wallGate(s, x0, speed) {
    const gap = speed * 1.05 + 90;
    s.obstacles.push(new Crate(x0, WALL_W, WALL_H, s.hint('wall')), new Gate(x0 + WALL_W + gap, s.hint('gate')));
    s.ladderCoins(x0 + WALL_W / 2, speed, WALL_H);
    return WALL_W + gap + GATE_W;
  },
  drone(s, x0) {
    s.obstacles.push(new Drone(x0));
    s.lowCoins(x0 + 8, 3);
    return DRONE_W;
  },
  bobDrone(s, x0) {
    s.obstacles.push(new Drone(x0, true));
    return DRONE_W;
  },
  roller(s, x0) {
    s.obstacles.push(new Roller(x0));
    return ROLLER_R * 2;
  },
  triple(s, x0, speed) {
    const w = randInt(28, 32);
    const h = pick([30, 36]);
    const gap = speed * 0.62 + 50;
    for (let i = 0; i < 3; i++) s.obstacles.push(new Crate(x0 + i * (w + gap), w, h));
    return w * 3 + gap * 2;
  },
  wideSpikes(s, x0, speed) {
    const count = randInt(4, 5);
    s.obstacles.push(new Spikes(x0, count));
    s.jumpCoins(x0 + (count * SPIKE_W) / 2, speed);
    return count * SPIKE_W;
  },
  droneCrate(s, x0, speed) {
    const w = randInt(36, 44);
    const gap = speed * 0.9 + 80;
    s.obstacles.push(new Drone(x0), new Crate(x0 + DRONE_W + gap, w, pick([34, 44])));
    return DRONE_W + gap + w;
  },
  crateDrone(s, x0, speed) {
    const w = randInt(36, 44);
    const gap = speed * 0.9 + 80;
    s.obstacles.push(new Crate(x0, w, pick([34, 44])), new Drone(x0 + w + gap));
    s.jumpCoins(x0 + w / 2, speed);
    return w + gap + DRONE_W;
  },
  wallDrone(s, x0, speed) {
    const gap = speed * 1.05 + 90;
    s.obstacles.push(new Crate(x0, WALL_W, WALL_H, s.hint('wall')), new Drone(x0 + WALL_W + gap, Math.random() < 0.5));
    s.ladderCoins(x0 + WALL_W / 2, speed, WALL_H);
    return WALL_W + gap + DRONE_W;
  },
  spikeDrone(s, x0, speed) {
    const gap = speed * 0.9 + 80;
    s.obstacles.push(new Spikes(x0, 2), new Drone(x0 + SPIKE_W * 2 + gap));
    s.jumpCoins(x0 + SPIKE_W, speed);
    return SPIKE_W * 2 + gap + DRONE_W;
  },
  gauntlet(s, x0, speed) {
    const gap = speed * 0.85 + 70;
    const parts = ['crate', 'spikes', 'drone', 'gate', 'double'];
    let x = x0;
    for (let i = 0; i < 3; i++) x += builders[pick(parts)](s, x, speed) + gap;
    return x - x0 - gap;
  },
  coins(s, x0) {
    const count = randInt(5, 8);
    s.lowCoins(x0, count);
    return count * 28;
  }
};

const POOLS = [
  ['crate', 'crate', 'crate', 'double', 'spikes', 'spikes', 'gate', 'gate', 'wall', 'wall', 'drone', 'drone', 'coins'],
  ['crate', 'crate', 'double', 'double', 'spikes', 'spikes', 'gate', 'gate', 'gate', 'wall', 'wall', 'wall', 'drone', 'drone', 'combo', 'droneCrate', 'coins'],
  ['crate', 'double', 'double', 'spikes', 'spikes', 'gate', 'gate', 'wall', 'wall', 'drone', 'bobDrone', 'combo', 'combo', 'wallGate', 'wallGate', 'droneCrate', 'crateDrone', 'triple', 'roller', 'coins'],
  ['double', 'spikes', 'wideSpikes', 'gate', 'gate', 'wall', 'wall', 'bobDrone', 'bobDrone', 'combo', 'wallGate', 'wallGate', 'droneCrate', 'crateDrone', 'wallDrone', 'spikeDrone', 'triple', 'triple', 'roller', 'roller', 'coins'],
  ['wideSpikes', 'wideSpikes', 'gate', 'wall', 'bobDrone', 'bobDrone', 'wallGate', 'wallGate', 'crateDrone', 'wallDrone', 'wallDrone', 'spikeDrone', 'triple', 'triple', 'roller', 'roller', 'gauntlet', 'gauntlet', 'gauntlet']
];

const TIERS = [3000, 12000, 28000, 60000];
const SPACING = [1, 1, 0.96, 0.92, 0.88];

const HINTS = {
  gate: 'Hold to slide',
  wall: 'Double jump'
};

export const tierOf = dist => TIERS.filter(limit => dist >= limit).length;

export class Spawner {
  constructor() {
    this.reset(false);
  }

  reset(hints) {
    this.obstacles = [];
    this.coins = [];
    this.travel = 0;
    this.nextAt = 150;
    this.hints = hints;
    this.hinted = {};
    this.intro = hints ? ['crate', 'gate', 'wall'] : [];
  }

  hint(kind) {
    if (!this.hints || this.hinted[kind]) return null;
    this.hinted[kind] = true;
    return HINTS[kind];
  }

  jumpCoins(cx, speed) {
    if (Math.random() > 0.85) return;
    const T = jumpTime();
    const n = 6;
    for (let i = 0; i < n; i++) {
      const t = T * (0.1 + (0.8 * i) / (n - 1));
      this.coins.push(new Coin(cx + speed * (t - T / 2), BODY_LIFT + jumpHeight(t)));
    }
  }

  ladderCoins(cx, speed, wallH) {
    if (Math.random() > 0.85) return;
    const n = 6;
    const span = speed * 0.7;
    const peak = wallH + 34;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      this.coins.push(new Coin(cx + (t - 0.5) * span, 40 + (peak - 40) * Math.sin(Math.PI * t)));
    }
  }

  lowCoins(x, count) {
    if (Math.random() > 0.7) return;
    for (let i = 0; i < count; i++) this.coins.push(new Coin(x + i * 26, 16));
  }

  update(dt, speed, dist, viewW) {
    const dx = speed * dt;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.x -= dx;
      if (o.tick) o.tick(dt);
      if (o.x + o.w < -80) this.obstacles.splice(i, 1);
    }
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.x -= dx;
      if (c.taken || c.x < -40) this.coins.splice(i, 1);
    }
    this.travel += dx;
    if (this.travel >= this.nextAt) this.spawn(speed, dist, viewW);
  }

  spawn(speed, dist, viewW) {
    const tier = tierOf(dist);
    const kind = this.intro.length ? this.intro.shift() : pick(POOLS[tier]);
    const width = builders[kind](this, viewW + 60, speed);
    this.travel = 0;
    this.nextAt = width + speed * rand(0.8, 1.25) * SPACING[tier] + 90;
  }

  draw(ctx, p, g, time, viewW) {
    for (const c of this.coins) c.draw(ctx, p, g, time);
    for (const o of this.obstacles) o.draw(ctx, p, g, time);
    ctx.font = '700 14px ProductSansRegular, system-ui, sans-serif';
    ctx.fillStyle = p.hazardDark;
    for (const o of this.obstacles) {
      if (!o.hint || o.x > viewW || o.x + o.w < 0) continue;
      ctx.globalAlpha = 0.7 + Math.sin(time * 5) * 0.3;
      if (o.kind === 'gate') {
        ctx.textAlign = 'right';
        ctx.fillText(o.hint + ' ↓', o.x - 12, g - 60);
      } else {
        ctx.textAlign = 'center';
        ctx.fillText(o.hint + ' ↑↑', o.x + o.w / 2, g - o.h - 14);
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}