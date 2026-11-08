import { clamp, pick, rand, randInt } from '../core/utils.js';
import { BODY_LIFT, jumpHeight, jumpTime } from './runner.js';
import { spacingOf, tierOf } from './obstacles.js';

export const LANE_W = 82;
export const SPAWN_Z = 1500;

const HALF = LANE_W * 0.46;
const TRAIN_HALF = LANE_W * 0.4;
const CRATE_D = 34;
const BARRIER_D = 28;
const WALL_D = 26;
const WALL_H = 124;
const SPIKE_H = 18;
const SPIKE_D = 30;
const GATE_D = 28;
const TRAIN_H = 128;
const COIN_GAP = 34;
const COIN_UP = 24;
const GATE_CLEARANCE = 36;
const GATE_TOP = 150;
const DRONE_D = 36;
const DRONE_H = 18;
const DRONE_LIFT = 34;
const DRONE_HIGH = 92;
const ROLLER_EXTRA = 130;
const SAW_EXTRA_BASE = 30;
const SAW_EXTRA_RATE = 0.28;
const SAW_BASE_SPEED = 300;
const SAW_SPIN = 14;
const SAW_SPIN_RATE = 0.06;
const MISSILE_D = 46;
const MISSILE_EXTRA = 320;
const MISSILE_WARN = 0.75;

const lane = () => randInt(-1, 1);
const arrival = (z, speed, extra = 0) => z / (speed + extra);
const atTime = (t, speed, extra = 0) => t * (speed + extra);
const sawExtra = speed => SAW_EXTRA_BASE + Math.max(0, speed - SAW_BASE_SPEED) * SAW_EXTRA_RATE;

function piece(kind, a, b, y0, y1, d, extra = {}) {
  const half = extra.half || HALF;
  return { kind, a, b, x0: a * LANE_W - half, x1: b * LANE_W + half, y0, y1, d, z: 0, passed: false, main: true, closing: 0, ...extra };
}

const crateOf = (a, b, d, h) => piece('crate', a, b, 0, h, d);

const builders = {
  crate(s, z, speed) {
    const a = lane();
    s.add(crateOf(a, a, CRATE_D, pick([34, 44])), z);
    s.jumpCoins(a, z + CRATE_D / 2, speed);
    return CRATE_D;
  },
  pair(s, z) {
    const open = lane();
    const h = pick([34, 44]);
    let first = true;
    for (let a = -1; a <= 1; a++) {
      if (a === open) continue;
      s.add(crateOf(a, a, CRATE_D, h), z, first);
      first = false;
    }
    s.coinLine(open, z, 5);
    return CRATE_D;
  },
  barrier(s, z, speed) {
    s.add(crateOf(-1, 1, BARRIER_D, pick([34, 44])), z);
    s.jumpCoins(0, z + BARRIER_D / 2, speed);
    return BARRIER_D;
  },
  double(s, z, speed) {
    const a = lane();
    s.add(piece('wall', a, a, 0, WALL_H, WALL_D), z);
    s.ladderCoins(a, z + WALL_D / 2, speed);
    return WALL_D;
  },
  wall(s, z, speed) {
    const open = lane();
    let first = true;
    let ladder = null;
    for (let a = -1; a <= 1; a++) {
      if (a === open) continue;
      s.add(piece('wall', a, a, 0, WALL_H, WALL_D), z, first);
      if (first) ladder = a;
      first = false;
    }
    s.ladderCoins(ladder, z + WALL_D / 2, speed);
    return WALL_D;
  },
  spikes(s, z, speed) {
    const a = lane();
    s.add(piece('spikes', a, a, 0, SPIKE_H, SPIKE_D), z);
    s.jumpCoins(a, z + SPIKE_D / 2, speed);
    return SPIKE_D;
  },
  wideSpikes(s, z, speed) {
    s.add(piece('spikes', -1, 1, 0, SPIKE_H, SPIKE_D), z);
    s.jumpCoins(0, z + SPIKE_D / 2, speed);
    return SPIKE_D;
  },
  gate(s, z) {
    const full = Math.random() < 0.5;
    const a = full ? -1 : lane();
    s.add(piece('gate', a, full ? 1 : a, GATE_CLEARANCE, GATE_TOP, GATE_D), z);
    return GATE_D;
  },
  drone(s, z) {
    const a = lane();
    s.add(drone(a, false), z);
    s.coinLine(a, z + DRONE_D, 3);
    return DRONE_D;
  },
  bobDrone(s, z) {
    s.add(drone(lane(), true), z);
    return DRONE_D;
  },
  combo(s, z, speed) {
    const gap = speed * 0.9 + 80;
    s.add(crateOf(-1, 1, BARRIER_D, pick([34, 44])), z);
    s.add(piece('gate', -1, 1, GATE_CLEARANCE, GATE_TOP, GATE_D), z + BARRIER_D + gap);
    s.jumpCoins(0, z + BARRIER_D / 2, speed);
    return BARRIER_D + gap + GATE_D;
  },
  wallGate(s, z, speed) {
    const gap = speed * 1.05 + 90;
    builders.wall(s, z, speed);
    s.add(piece('gate', -1, 1, GATE_CLEARANCE, GATE_TOP, GATE_D), z + WALL_D + gap);
    return WALL_D + gap + GATE_D;
  },
  triple(s, z, speed) {
    const a = lane();
    const d = randInt(28, 32);
    const h = pick([30, 36]);
    const gap = speed * 0.62 + 50;
    for (let i = 0; i < 3; i++) s.add(crateOf(a, a, d, h), z + i * (d + gap));
    return d * 3 + gap * 2;
  },
  roller(s, z) {
    const a = lane();
    s.add(piece('roller', a, a, 0, 34, 34, { half: 18, closing: ROLLER_EXTRA, spin: 0, tick(dt) { this.spin += dt * 9; } }), z);
    return 34;
  },
  saw(s, z, speed) {
    s.add(saw(lane(), speed), z);
    return 34;
  },
  sawPair(s, z, speed) {
    const open = lane();
    let first = true;
    for (let a = -1; a <= 1; a++) {
      if (a === open) continue;
      s.add(saw(a, speed), z, first);
      first = false;
    }
    return 34;
  },
  missile(s, z, speed) {
    const offset = (speed + MISSILE_EXTRA) * MISSILE_WARN;
    s.add(missile(lane()), z + offset);
    return offset + MISSILE_D;
  },
  field(s, z, speed) {
    const span = randInt(60, 100);
    s.add(piece('field', -1, 1, 0, 22, span), z);
    s.jumpCoins(0, z + span / 2, speed);
    return span;
  },
  crateDrone(s, z, speed) {
    const a = lane();
    const gap = speed * 0.9 + 80;
    s.add(crateOf(a, a, CRATE_D, pick([34, 44])), z);
    s.add(drone(a, false), z + CRATE_D + gap);
    s.jumpCoins(a, z + CRATE_D / 2, speed);
    return CRATE_D + gap + DRONE_D;
  },
  droneCrate(s, z, speed) {
    const a = lane();
    const gap = speed * 0.9 + 80;
    s.add(drone(a, false), z);
    s.add(crateOf(a, a, CRATE_D, pick([34, 44])), z + DRONE_D + gap);
    return DRONE_D + gap + CRATE_D;
  },
  spikeDrone(s, z, speed) {
    const a = lane();
    const gap = speed * 0.9 + 80;
    s.add(piece('spikes', a, a, 0, SPIKE_H, SPIKE_D), z);
    s.add(drone(a, false), z + SPIKE_D + gap);
    s.jumpCoins(a, z + SPIKE_D / 2, speed);
    return SPIKE_D + gap + DRONE_D;
  },
  wallDrone(s, z, speed) {
    const gap = speed * 1.05 + 90;
    builders.wall(s, z, speed);
    s.add(drone(lane(), Math.random() < 0.5), z + WALL_D + gap);
    return WALL_D + gap + DRONE_D;
  },
  fieldGate(s, z) {
    const span = randInt(60, 90);
    const gap = 300 + span;
    s.add(piece('field', -1, 1, 0, 22, span), z);
    s.add(piece('gate', -1, 1, GATE_CLEARANCE, GATE_TOP, GATE_D), z + span + gap);
    return span + gap + GATE_D;
  },
  fieldDrone(s, z) {
    const span = randInt(60, 90);
    const gap = 300 + span;
    s.add(piece('field', -1, 1, 0, 22, span), z);
    s.add(drone(lane(), false), z + span + gap);
    return span + gap + DRONE_D;
  },
  sawGate(s, z, speed) {
    const extra = sawExtra(speed);
    const gz = atTime(arrival(z, speed, extra) + 0.95, speed);
    s.add(saw(lane(), speed), z);
    s.add(piece('gate', -1, 1, GATE_CLEARANCE, GATE_TOP, GATE_D), gz);
    return gz - z + GATE_D;
  },
  missileCrate(s, z, speed) {
    const a = lane();
    const mz = atTime(arrival(z, speed) + 0.95, speed, MISSILE_EXTRA);
    s.add(crateOf(a, a, CRATE_D, pick([34, 44])), z);
    s.add(missile(lane()), mz);
    s.jumpCoins(a, z + CRATE_D / 2, speed);
    return mz - z + MISSILE_D;
  },
  missileSpikes(s, z, speed) {
    const a = lane();
    const mz = atTime(arrival(z, speed) + 0.95, speed, MISSILE_EXTRA);
    s.add(piece('spikes', a, a, 0, SPIKE_H, SPIKE_D), z);
    s.add(missile(lane()), mz);
    s.jumpCoins(a, z + SPIKE_D / 2, speed);
    return mz - z + MISSILE_D;
  },
  gauntlet(s, z, speed) {
    const gap = speed * 0.85 + 70;
    const parts = ['crate', 'spikes', 'drone', 'gate', 'pair', 'barrier'];
    let at = z;
    for (let i = 0; i < 3; i++) at += builders[pick(parts)](s, at, speed) + gap;
    return at - z - gap;
  },
  marathon(s, z, speed) {
    const gap = speed * 0.72 + 60;
    const parts = ['crate', 'spikes', 'drone', 'gate', 'pair', 'barrier', 'field'];
    const count = randInt(4, 5);
    let at = z;
    for (let i = 0; i < count; i++) at += builders[pick(parts)](s, at, speed) + gap;
    return at - z - gap;
  },
  coins(s, z) {
    const count = randInt(8, 14);
    const a = lane();
    s.coinLine(a, z, count);
    return count * COIN_GAP;
  },
  snake(s, z) {
    const count = randInt(12, 18);
    let a = lane();
    let at = 0;
    for (let i = 0; i < count; i++) {
      s.coin(a, z + at, COIN_UP);
      at += COIN_GAP;
      if (i % 5 === 4 && i < count - 1) {
        const next = a === 0 ? pick([-1, 1]) : 0;
        for (let j = 1; j <= 2; j++) {
          s.coin(a + ((next - a) * j) / 3, z + at, COIN_UP);
          at += COIN_GAP;
        }
        a = next;
      }
    }
    return at;
  },
  train(s, z) {
    const a = lane();
    const d = randInt(240, 420);
    s.add(piece('train', a, a, 0, TRAIN_H, d, { half: TRAIN_HALF, closing: Math.random() < 0.4 ? 110 : 0 }), z);
    return d;
  },
  trainPair(s, z) {
    const open = lane();
    const d = randInt(240, 380);
    let first = true;
    for (let a = -1; a <= 1; a++) {
      if (a === open) continue;
      s.add(piece('train', a, a, 0, TRAIN_H, d, { half: TRAIN_HALF }), z, first);
      first = false;
    }
    s.coinLine(open, z, Math.floor(d / COIN_GAP));
    return d;
  }
};

function drone(a, bob) {
  return piece('drone', a, a, DRONE_LIFT, DRONE_LIFT + DRONE_H, DRONE_D, {
    half: 22,
    bob,
    t: rand(0, 6),
    tick(dt) {
      this.t += dt;
      if (!this.bob) return;
      this.y0 = DRONE_LIFT + ((Math.sin(this.t * 3) + 1) / 2) * (DRONE_HIGH - DRONE_LIFT);
      this.y1 = this.y0 + DRONE_H;
    }
  });
}

function saw(a, speed) {
  const extra = sawExtra(speed);
  return piece('saw', a, a, 0, 38, 34, {
    half: 22,
    closing: extra,
    spin: rand(0, 6),
    tick(dt) {
      this.spin += dt * (SAW_SPIN + extra * SAW_SPIN_RATE);
    }
  });
}

function missile(a) {
  const low = Math.random() < 0.5;
  const y0 = low ? 8 : 26;
  return piece('missile', a, a, y0, y0 + 16, MISSILE_D, { half: 12, closing: MISSILE_EXTRA });
}

const POOLS = [
  ['crate', 'crate', 'crate', 'pair', 'spikes', 'spikes', 'gate', 'gate', 'wall', 'drone', 'barrier', 'coins', 'snake'],
  ['crate', 'crate', 'pair', 'pair', 'spikes', 'spikes', 'gate', 'gate', 'gate', 'wall', 'wall', 'drone', 'drone', 'combo', 'droneCrate', 'barrier', 'coins', 'train', 'snake'],
  ['crate', 'pair', 'spikes', 'gate', 'gate', 'wall', 'wall', 'double', 'drone', 'bobDrone', 'combo', 'combo', 'wallGate', 'wallGate', 'droneCrate', 'crateDrone', 'triple', 'roller', 'saw', 'saw', 'coins', 'train', 'trainPair', 'snake'],
  ['pair', 'spikes', 'wideSpikes', 'gate', 'gate', 'wall', 'wall', 'double', 'bobDrone', 'bobDrone', 'combo', 'wallGate', 'wallGate', 'droneCrate', 'crateDrone', 'wallDrone', 'spikeDrone', 'triple', 'triple', 'roller', 'roller', 'saw', 'saw', 'missile', 'missile', 'field', 'coins', 'train', 'trainPair', 'snake'],
  ['wideSpikes', 'wideSpikes', 'gate', 'wall', 'bobDrone', 'bobDrone', 'wallGate', 'wallGate', 'crateDrone', 'wallDrone', 'wallDrone', 'spikeDrone', 'triple', 'triple', 'roller', 'roller', 'gauntlet', 'gauntlet', 'gauntlet', 'saw', 'missile', 'missile', 'field', 'sawPair', 'fieldGate', 'train', 'trainPair'],
  ['wideSpikes', 'bobDrone', 'bobDrone', 'wallGate', 'wallGate', 'crateDrone', 'wallDrone', 'spikeDrone', 'triple', 'roller', 'gauntlet', 'gauntlet', 'missile', 'missile', 'field', 'sawPair', 'sawGate', 'fieldGate', 'fieldDrone', 'missileCrate', 'missileSpikes', 'train', 'trainPair'],
  ['wideSpikes', 'bobDrone', 'wallGate', 'wallDrone', 'spikeDrone', 'triple', 'gauntlet', 'gauntlet', 'marathon', 'marathon', 'missile', 'sawPair', 'sawGate', 'fieldGate', 'fieldDrone', 'missileCrate', 'missileSpikes', 'train', 'trainPair'],
  ['wallDrone', 'spikeDrone', 'triple', 'gauntlet', 'marathon', 'marathon', 'marathon', 'sawPair', 'sawGate', 'fieldGate', 'fieldDrone', 'missileCrate', 'missileSpikes', 'train', 'trainPair']
];

export class LaneSpawner {
  constructor() {
    this.cull = -60;
    this.reset();
  }

  reset() {
    this.obstacles = [];
    this.coins = [];
    this.travel = 0;
    this.nextAt = 150;
    this.intro = [];
  }

  add(o, z, main = true) {
    o.z = z;
    o.main = main;
    this.obstacles.push(o);
    return o;
  }

  coin(a, z, up) {
    this.coins.push({ x: a * LANE_W, z, up, taken: false });
  }

  coinLine(a, z, count) {
    if (Math.random() > 0.85) return;
    for (let i = 0; i < count; i++) this.coin(a, z + i * COIN_GAP, COIN_UP);
  }

  jumpCoins(a, zc, speed) {
    if (Math.random() > 0.85) return;
    const T = jumpTime();
    const n = 6;
    for (let i = 0; i < n; i++) {
      const t = T * (0.1 + (0.8 * i) / (n - 1));
      this.coin(a, zc + speed * (t - T / 2), BODY_LIFT + jumpHeight(t));
    }
  }

  ladderCoins(a, zc, speed) {
    if (Math.random() > 0.85) return;
    const n = 6;
    const span = speed * 0.7;
    const peak = WALL_H + 34;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      this.coin(a, zc + (t - 0.5) * span, 40 + (peak - 40) * Math.sin(Math.PI * t));
    }
  }

  update(dt, speed, dist) {
    const dz = speed * dt;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.z -= dz + o.closing * dt;
      if (o.tick) o.tick(dt);
      if (o.z + o.d < this.cull) this.obstacles.splice(i, 1);
    }
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.z -= dz;
      if (c.taken || c.z < this.cull) this.coins.splice(i, 1);
    }
    this.travel += dz;
    if (this.travel >= this.nextAt) this.spawn(speed, dist, SPAWN_Z);
  }

  guide(first, coins, z, width) {
    if (this.coins.length > coins || Math.random() > 0.75) return;
    const blocked = [false, false, false];
    for (const o of this.obstacles.slice(first)) for (let a = o.a; a <= o.b; a++) blocked[a + 1] = true;
    const free = [-1, 0, 1].filter(a => !blocked[a + 1]);
    if (!free.length) return;
    const a = pick(free);
    const count = clamp(Math.floor(Math.min(width, 420) / COIN_GAP) + 3, 5, 14);
    for (let i = 0; i < count; i++) this.coin(a, z - 3 * COIN_GAP + i * COIN_GAP, COIN_UP);
  }

  spawn(speed, dist, z) {
    const kind = this.intro.length ? this.intro.shift() : pick(POOLS[tierOf(dist)]);
    const first = this.obstacles.length;
    const coins = this.coins.length;
    const width = builders[kind](this, z, speed);
    this.guide(first, coins, z, width);
    this.travel = 0;
    this.nextAt = width + speed * rand(0.8, 1.25) * spacingOf(dist) + 90;
  }
}