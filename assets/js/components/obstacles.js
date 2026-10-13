import { pick, rand, randInt } from '../core/utils.js';

const SPIKE_W = 26;
const SPIKE_H = 28;
const DRONE_W = 50;
const DRONE_H = 22;
const DRONE_LIFT = 34;

class Crate {
  constructor(x, w, h) {
    this.kind = 'crate';
    this.x = x;
    this.w = w;
    this.h = h;
  }

  box(g) {
    return { x: this.x + 3, y: g - this.h + 3, w: this.w - 6, h: this.h - 3 };
  }

  draw(ctx, p, g) {
    ctx.fillStyle = p.hazard;
    ctx.beginPath();
    ctx.roundRect(this.x, g - this.h, this.w, this.h, 6);
    ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = p.hazardLight;
    ctx.beginPath();
    ctx.roundRect(this.x + 5, g - this.h + 5, this.w - 10, 5, 2.5);
    ctx.fill();
    if (this.h > 40) {
      ctx.strokeStyle = p.hazardDark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(this.x + 8, g - this.h + 16, this.w - 16, this.h - 26, 3);
      ctx.stroke();
    }
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
  constructor(x) {
    this.kind = 'drone';
    this.x = x;
    this.w = DRONE_W;
    this.h = DRONE_H;
  }

  box(g) {
    const top = g - DRONE_LIFT - this.h;
    return { x: this.x + 4, y: top + 4, w: this.w - 8, h: this.h - 6 };
  }

  draw(ctx, p, g, time) {
    const top = g - DRONE_LIFT - this.h + Math.sin(time * 6 + this.x * 0.02) * 2;
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

function arc(spawner, from, span, top, count = 5) {
  if (Math.random() > 0.6) return;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    spawner.coins.push(new Coin(from + span * t, top + Math.sin(t * Math.PI) * 26));
  }
}

const builders = {
  crate(s, x0) {
    const w = randInt(36, 46);
    const h = pick([34, 44, 56]);
    s.obstacles.push(new Crate(x0, w, h));
    arc(s, x0 - 34, w + 68, h + 34);
    return w;
  },
  double(s, x0) {
    const w = randInt(34, 40);
    const h = pick([34, 44]);
    s.obstacles.push(new Crate(x0, w, h), new Crate(x0 + w + 16, w, h));
    arc(s, x0 - 30, w * 2 + 76, h + 34);
    return w * 2 + 16;
  },
  tower(s, x0) {
    s.obstacles.push(new Crate(x0, 34, 88));
    arc(s, x0 - 34, 102, 118);
    return 34;
  },
  spikes(s, x0) {
    const count = randInt(2, 4);
    s.obstacles.push(new Spikes(x0, count));
    arc(s, x0 - 34, count * SPIKE_W + 68, SPIKE_H + 38);
    return count * SPIKE_W;
  },
  drone(s, x0) {
    s.obstacles.push(new Drone(x0));
    if (Math.random() < 0.6) {
      for (let i = 0; i < 4; i++) s.coins.push(new Coin(x0 - 10 + i * 24, 14));
    }
    return DRONE_W;
  },
  combo(s, x0, speed) {
    const w = randInt(36, 44);
    const h = pick([34, 44]);
    const gap = speed * 0.95 + 70;
    s.obstacles.push(new Crate(x0, w, h), new Drone(x0 + w + gap));
    arc(s, x0 - 30, w + 60, h + 34);
    return w + gap + DRONE_W;
  },
  coins(s, x0) {
    const count = randInt(5, 8);
    for (let i = 0; i < count; i++) s.coins.push(new Coin(x0 + i * 28, 16));
    return count * 28;
  }
};

const POOLS = [
  ['crate', 'crate', 'crate', 'crate', 'double', 'spikes', 'spikes', 'coins'],
  ['crate', 'crate', 'crate', 'double', 'double', 'spikes', 'spikes', 'drone', 'drone', 'tower', 'coins'],
  ['crate', 'crate', 'double', 'double', 'spikes', 'spikes', 'drone', 'drone', 'tower', 'combo', 'combo', 'coins']
];

export class Spawner {
  constructor() {
    this.reset();
  }

  reset() {
    this.obstacles = [];
    this.coins = [];
    this.travel = 0;
    this.nextAt = 150;
  }

  update(dt, speed, dist, viewW) {
    const dx = speed * dt;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.x -= dx;
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
    const tier = dist < 4000 ? 0 : dist < 14000 ? 1 : 2;
    const kind = pick(POOLS[tier]);
    const width = builders[kind](this, viewW + 60, speed);
    this.travel = 0;
    this.nextAt = width + speed * rand(0.8, 1.25) + 90;
  }

  draw(ctx, p, g, time) {
    for (const c of this.coins) c.draw(ctx, p, g, time);
    for (const o of this.obstacles) o.draw(ctx, p, g, time);
  }
}
