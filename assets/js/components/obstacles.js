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
const SAW_R = 24;
const SAW_EXTRA_BASE = 30;
const SAW_EXTRA_RATE = 0.28;
const SAW_BASE_SPEED = 300;
const SAW_SPIN = 14;
const SAW_SPIN_RATE = 0.06;
const BOUNCER_R = 15;
const BOUNCER_EXTRA = 70;
const BOUNCER_PERIOD = 0.85;
const BOUNCER_HEIGHT = 64;
const MISSILE_W = 46;
const MISSILE_H = 16;
const MISSILE_EXTRA = 320;
const MISSILE_WARN = 0.75;
const FIELD_POST = 10;
const FIELD_H = 34;
const RUNNER_X = 110;

const arrival = (x, speed, extra = 0) => (x - RUNNER_X) / (speed + extra);
const atTime = (t, speed, extra = 0) => RUNNER_X + t * (speed + extra);

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

const sawExtra = speed => SAW_EXTRA_BASE + Math.max(0, speed - SAW_BASE_SPEED) * SAW_EXTRA_RATE;

class Saw {
  constructor(x, extra) {
    this.kind = 'saw';
    this.x = x;
    this.w = SAW_R * 2;
    this.h = SAW_R * 2 - 8;
    this.extra = extra;
    this.spin = rand(0, 6);
    this.hint = null;
  }

  tick(dt) {
    this.x -= this.extra * dt;
    this.spin += dt * (SAW_SPIN + this.extra * SAW_SPIN_RATE);
  }

  box(g) {
    return { x: this.x + 9, y: g - this.h + 4, w: this.w - 18, h: this.h - 4 };
  }

  draw(ctx, p, g) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x - 4, g - this.h - 6, this.w + 8, this.h + 6);
    ctx.clip();
    ctx.translate(this.x + SAW_R, g - SAW_R + 8);
    ctx.rotate(-this.spin);
    ctx.fillStyle = p.hazardDark;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * SAW_R, Math.sin(a) * SAW_R);
      ctx.lineTo(Math.cos(a + 0.2) * (SAW_R - 7), Math.sin(a + 0.2) * (SAW_R - 7));
      ctx.lineTo(Math.cos(a + 0.42) * (SAW_R - 7), Math.sin(a + 0.42) * (SAW_R - 7));
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.hazard;
    ctx.beginPath();
    ctx.arc(0, 0, SAW_R - 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.hazardLight;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Bouncer {
  constructor(x) {
    this.kind = 'bouncer';
    this.x = x;
    this.w = BOUNCER_R * 2;
    this.h = BOUNCER_R * 2;
    this.t = 0;
    this.spin = 0;
    this.hint = null;
  }

  tick(dt) {
    this.t += dt;
    this.spin += dt * 7;
    this.x -= BOUNCER_EXTRA * dt;
  }

  lift() {
    const u = (this.t / BOUNCER_PERIOD) % 1;
    return BOUNCER_HEIGHT * 4 * u * (1 - u);
  }

  box(g) {
    return { x: this.x + 4, y: g - this.lift() - this.h + 4, w: this.w - 8, h: this.h - 8 };
  }

  draw(ctx, p, g) {
    const lift = this.lift();
    const squash = lift < 6 ? 1 - (6 - lift) * 0.02 : 1;
    ctx.globalAlpha = 0.18 * (1 - lift / BOUNCER_HEIGHT);
    ctx.fillStyle = p.hazardDark;
    ctx.beginPath();
    ctx.ellipse(this.x + BOUNCER_R, g - 1, BOUNCER_R * (1 - (lift / BOUNCER_HEIGHT) * 0.4), 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(this.x + BOUNCER_R, g - lift - BOUNCER_R);
    ctx.scale(1 / squash, squash);
    ctx.rotate(this.spin);
    ctx.fillStyle = p.hazardDark;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * (BOUNCER_R + 5), Math.sin(a) * (BOUNCER_R + 5));
      ctx.lineTo(Math.cos(a + Math.PI / 8) * (BOUNCER_R - 2), Math.sin(a + Math.PI / 8) * (BOUNCER_R - 2));
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.hazard;
    ctx.beginPath();
    ctx.arc(0, 0, BOUNCER_R - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.hazardLight;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(-4, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Missile {
  constructor(x, low) {
    this.kind = 'missile';
    this.x = x;
    this.w = MISSILE_W;
    this.h = MISSILE_H;
    this.low = low;
    this.up = low ? 8 : 26;
    this.hint = null;
  }

  tick(dt) {
    this.x -= MISSILE_EXTRA * dt;
  }

  box(g) {
    return { x: this.x + 4, y: g - this.up - this.h + 3, w: this.w - 8, h: this.h - 5 };
  }

  draw(ctx, p, g, time) {
    const top = g - this.up - this.h;
    const flame = 8 + Math.sin(time * 50 + this.x) * 4;
    ctx.fillStyle = p.hazardLight;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(this.x + this.w - 2, top + 3);
    ctx.lineTo(this.x + this.w + flame, top + this.h / 2);
    ctx.lineTo(this.x + this.w - 2, top + this.h - 3);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.hazardDark;
    ctx.beginPath();
    ctx.moveTo(this.x + this.w - 10, top - 3);
    ctx.lineTo(this.x + this.w, top - 3);
    ctx.lineTo(this.x + this.w - 6, top + 4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.x + this.w - 10, top + this.h + 3);
    ctx.lineTo(this.x + this.w, top + this.h + 3);
    ctx.lineTo(this.x + this.w - 6, top + this.h - 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.hazard;
    ctx.beginPath();
    ctx.moveTo(this.x, top + this.h / 2);
    ctx.quadraticCurveTo(this.x + 8, top, this.x + 20, top);
    ctx.lineTo(this.x + this.w - 4, top);
    ctx.lineTo(this.x + this.w - 4, top + this.h);
    ctx.lineTo(this.x + 20, top + this.h);
    ctx.quadraticCurveTo(this.x + 8, top + this.h, this.x, top + this.h / 2);
    ctx.fill();
    ctx.fillStyle = p.hazardLight;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(this.x + 14, top + 3, 16, 3);
    ctx.globalAlpha = 1;
  }

  warn(ctx, p, g, time, viewW) {
    const y = g - this.up - this.h / 2;
    const x = viewW - 26;
    ctx.globalAlpha = 0.55 + Math.sin(time * 18) * 0.45;
    ctx.fillStyle = p.hazard;
    ctx.beginPath();
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x + 15, y + 11);
    ctx.lineTo(x - 15, y + 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.hazardLight;
    ctx.fillRect(x - 1.5, y - 7, 3, 9);
    ctx.fillRect(x - 1.5, y + 4, 3, 3);
    ctx.globalAlpha = 1;
  }
}

class Field {
  constructor(x, span) {
    this.kind = 'field';
    this.x = x;
    this.w = span;
    this.h = FIELD_H;
    this.hint = null;
  }

  box(g) {
    return { x: this.x + 3, y: g - FIELD_H + 2, w: this.w - 6, h: FIELD_H - 2 };
  }

  draw(ctx, p, g, time) {
    const inner = this.w - FIELD_POST * 2;
    ctx.globalAlpha = 0.16 + Math.sin(time * 16 + this.x * 0.05) * 0.05;
    ctx.fillStyle = p.hazard;
    ctx.fillRect(this.x + FIELD_POST, g - FIELD_H, inner, FIELD_H);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = p.hazardLight;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      const y0 = g - FIELD_H * (0.3 + k * 0.4);
      ctx.moveTo(this.x + FIELD_POST, y0);
      for (let x = 10; x < inner; x += 10) {
        ctx.lineTo(this.x + FIELD_POST + x, y0 + Math.sin(time * 30 + x * 0.7 + k * 2) * 6);
      }
      ctx.lineTo(this.x + this.w - FIELD_POST, y0);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.hazardDark;
    ctx.beginPath();
    ctx.roundRect(this.x, g - FIELD_H - 4, FIELD_POST, FIELD_H + 4, [4, 4, 0, 0]);
    ctx.roundRect(this.x + this.w - FIELD_POST, g - FIELD_H - 4, FIELD_POST, FIELD_H + 4, [4, 4, 0, 0]);
    ctx.fill();
    ctx.fillStyle = p.hazardLight;
    ctx.beginPath();
    ctx.arc(this.x + FIELD_POST / 2, g - FIELD_H - 1, 2.5, 0, Math.PI * 2);
    ctx.arc(this.x + this.w - FIELD_POST / 2, g - FIELD_H - 1, 2.5, 0, Math.PI * 2);
    ctx.fill();
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
  saw(s, x0, speed) {
    s.obstacles.push(new Saw(x0, sawExtra(speed)));
    return SAW_R * 2;
  },
  bouncer(s, x0) {
    s.obstacles.push(new Bouncer(x0));
    return BOUNCER_R * 2;
  },
  missile(s, x0, speed) {
    const offset = (speed + MISSILE_EXTRA) * MISSILE_WARN;
    s.obstacles.push(new Missile(x0 + offset, Math.random() < 0.5));
    return offset + MISSILE_W;
  },
  field(s, x0, speed) {
    const span = randInt(110, 170);
    s.obstacles.push(new Field(x0, span));
    s.jumpCoins(x0 + span / 2, speed);
    return span;
  },
  sawPair(s, x0, speed) {
    const gap = speed * 0.62 + 50;
    const extra = sawExtra(speed);
    s.obstacles.push(new Saw(x0, extra), new Saw(x0 + SAW_R * 2 + gap, extra));
    return SAW_R * 4 + gap;
  },
  sawGate(s, x0, speed) {
    const extra = sawExtra(speed);
    const x = atTime(arrival(x0, speed, extra) + 0.95, speed);
    s.obstacles.push(new Saw(x0, extra), new Gate(x, s.hint('gate')));
    return x - x0 + GATE_W;
  },
  fieldGate(s, x0, speed) {
    const span = randInt(110, 150);
    const gap = speed * 0.95 + 90;
    s.obstacles.push(new Field(x0, span), new Gate(x0 + span + gap, s.hint('gate')));
    return span + gap + GATE_W;
  },
  fieldDrone(s, x0, speed) {
    const span = randInt(110, 150);
    const gap = speed * 0.9 + 90;
    s.obstacles.push(new Field(x0, span), new Drone(x0 + span + gap));
    return span + gap + DRONE_W;
  },
  bouncerGate(s, x0, speed) {
    const t = arrival(x0, speed, BOUNCER_EXTRA);
    const x = atTime(t + 0.95, speed);
    s.obstacles.push(new Bouncer(x0), new Gate(x, s.hint('gate')));
    return x - x0 + GATE_W;
  },
  missileCrate(s, x0, speed) {
    const w = randInt(36, 44);
    const x = atTime(arrival(x0, speed) + 0.95, speed, MISSILE_EXTRA);
    s.obstacles.push(new Crate(x0, w, pick([34, 44])), new Missile(x, Math.random() < 0.5));
    s.jumpCoins(x0 + w / 2, speed);
    return x - x0 + MISSILE_W;
  },
  missileSpikes(s, x0, speed) {
    const x = atTime(arrival(x0, speed) + 0.95, speed, MISSILE_EXTRA);
    s.obstacles.push(new Spikes(x0, 2), new Missile(x, Math.random() < 0.5));
    s.jumpCoins(x0 + SPIKE_W, speed);
    return x - x0 + MISSILE_W;
  },
  marathon(s, x0, speed) {
    const gap = speed * 0.72 + 60;
    const parts = ['crate', 'spikes', 'drone', 'gate', 'double', 'field'];
    const count = randInt(4, 5);
    let x = x0;
    for (let i = 0; i < count; i++) x += builders[pick(parts)](s, x, speed) + gap;
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
  ['crate', 'double', 'double', 'spikes', 'spikes', 'gate', 'gate', 'wall', 'wall', 'drone', 'bobDrone', 'combo', 'combo', 'wallGate', 'wallGate', 'droneCrate', 'crateDrone', 'triple', 'roller', 'saw', 'saw', 'coins'],
  ['double', 'spikes', 'wideSpikes', 'gate', 'gate', 'wall', 'wall', 'bobDrone', 'bobDrone', 'combo', 'wallGate', 'wallGate', 'droneCrate', 'crateDrone', 'wallDrone', 'spikeDrone', 'triple', 'triple', 'roller', 'roller', 'saw', 'saw', 'missile', 'missile', 'field', 'coins'],
  ['wideSpikes', 'wideSpikes', 'gate', 'wall', 'bobDrone', 'bobDrone', 'wallGate', 'wallGate', 'crateDrone', 'wallDrone', 'wallDrone', 'spikeDrone', 'triple', 'triple', 'roller', 'roller', 'gauntlet', 'gauntlet', 'gauntlet', 'saw', 'missile', 'missile', 'field', 'bouncer', 'sawPair', 'fieldGate'],
  ['wideSpikes', 'bobDrone', 'bobDrone', 'wallGate', 'wallGate', 'crateDrone', 'wallDrone', 'spikeDrone', 'triple', 'roller', 'gauntlet', 'gauntlet', 'missile', 'missile', 'field', 'bouncer', 'bouncer', 'sawPair', 'sawGate', 'fieldGate', 'fieldDrone', 'missileCrate', 'missileSpikes', 'bouncerGate'],
  ['wideSpikes', 'bobDrone', 'wallGate', 'wallDrone', 'spikeDrone', 'triple', 'gauntlet', 'gauntlet', 'marathon', 'marathon', 'missile', 'bouncer', 'bouncer', 'sawPair', 'sawGate', 'fieldGate', 'fieldDrone', 'missileCrate', 'missileSpikes', 'bouncerGate'],
  ['wallDrone', 'spikeDrone', 'triple', 'gauntlet', 'marathon', 'marathon', 'marathon', 'bouncer', 'sawPair', 'sawGate', 'fieldGate', 'fieldDrone', 'missileCrate', 'missileSpikes', 'bouncerGate']
];

const TIERS = [3000, 12000, 28000, 60000, 100000, 150000, 210000];
const SPACING = [1, 1, 0.96, 0.92, 0.88, 0.82, 0.76, 0.72];
const SPACING_FLOOR = 0.6;
const SPACING_DECAY = 0.01;
const SPACING_STEP = 6000;

const HINTS = {
  gate: 'Hold to slide',
  wall: 'Double jump'
};

export const tierOf = dist => TIERS.filter(limit => dist >= limit).length;

export const spacingOf = dist => {
  const tier = tierOf(dist);
  if (tier < TIERS.length) return SPACING[tier];
  const steps = Math.floor((dist - TIERS[TIERS.length - 1]) / SPACING_STEP);
  return Math.max(SPACING_FLOOR, SPACING[tier] - steps * SPACING_DECAY);
};

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
    this.nextAt = width + speed * rand(0.8, 1.25) * spacingOf(dist) + 90;
  }

  draw(ctx, p, g, time, viewW) {
    for (const c of this.coins) c.draw(ctx, p, g, time);
    for (const o of this.obstacles) {
      o.draw(ctx, p, g, time);
      if (o.warn && o.x > viewW - 20) o.warn(ctx, p, g, time, viewW);
    }
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