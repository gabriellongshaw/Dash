import { rand, seeded } from '../core/utils.js';

const PERIOD = 1600;

function buildSkyline() {
  const next = seeded(7);
  const list = [];
  let x = 0;
  while (x < PERIOD) {
    const w = 40 + next() * 70;
    list.push({ x, w: Math.min(w, PERIOD - x), h: 60 + next() * 130 });
    x += w + next() * 12;
  }
  return list;
}

export class World {
  constructor() {
    this.buildings = buildSkyline();
    this.farX = 0;
    this.midX = 0;
    this.nearX = 0;
    this.clouds = [];
    this.streaks = [];
  }

  resize(ctx, w, h, g, palette) {
    this.w = w;
    this.h = h;
    this.g = g;
    this.p = palette;
    const sky = ctx.createLinearGradient(0, 0, 0, g);
    sky.addColorStop(0, palette.skyTop);
    sky.addColorStop(1, palette.skyBottom);
    this.sky = sky;
    const cloudCount = Math.ceil(w / 260) + 1;
    this.clouds = [];
    for (let i = 0; i < cloudCount; i++) {
      this.clouds.push({ x: rand(0, w), y: rand(g * 0.08, g * 0.42), s: rand(0.7, 1.3) });
    }
    this.streaks = [];
    for (let i = 0; i < 12; i++) {
      this.streaks.push({ x: rand(0, w), y: rand(g * 0.15, g - 10), len: rand(40, 110) });
    }
  }

  update(dt, speed) {
    this.farX += speed * 0.06 * dt;
    this.midX += speed * 0.18 * dt;
    this.nearX += speed * dt;
    for (const c of this.clouds) {
      c.x -= (6 + speed * 0.02) * dt;
      if (c.x < -140) c.x = this.w + rand(20, 120);
    }
    for (const s of this.streaks) {
      s.x -= speed * 1.5 * dt;
      if (s.x + s.len < 0) {
        s.x = this.w + rand(0, 200);
        s.y = rand(this.g * 0.15, this.g - 10);
      }
    }
  }

  draw(ctx, speed) {
    const { w, h, g, p } = this;

    ctx.fillStyle = this.sky;
    ctx.fillRect(-30, -30, w + 60, g + 30);

    ctx.fillStyle = p.sun;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(w * 0.8, g * 0.3, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = p.cloud;
    ctx.beginPath();
    for (const c of this.clouds) {
      ctx.roundRect(c.x, c.y, 80 * c.s, 18 * c.s, 9 * c.s);
      ctx.roundRect(c.x + 16 * c.s, c.y - 10 * c.s, 44 * c.s, 20 * c.s, 10 * c.s);
    }
    ctx.fill();

    ctx.fillStyle = p.far;
    const offset = this.farX % PERIOD;
    for (let base = -offset; base < w; base += PERIOD) {
      for (const b of this.buildings) {
        const x = base + b.x;
        if (x > w) break;
        if (x + b.w < 0) continue;
        ctx.fillRect(x, g - b.h, b.w, b.h + 2);
      }
    }

    ctx.fillStyle = p.mid;
    ctx.beginPath();
    ctx.moveTo(-10, g + 2);
    for (let x = -10; x <= w + 10; x += 10) {
      const t = x + this.midX;
      ctx.lineTo(x, g - 34 - Math.sin(t * 0.006) * 18 - Math.sin(t * 0.013 + 1) * 10);
    }
    ctx.lineTo(w + 10, g + 2);
    ctx.closePath();
    ctx.fill();

    if (speed > 420) {
      ctx.globalAlpha = Math.min(0.22, (speed - 420) / 340 * 0.22);
      ctx.fillStyle = p.far;
      for (const s of this.streaks) ctx.fillRect(s.x, s.y, s.len, 2);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = p.ground;
    ctx.fillRect(-30, g, w + 60, h - g + 30);
    ctx.fillStyle = p.groundLine;
    ctx.fillRect(-30, g, w + 60, 3);

    ctx.globalAlpha = 0.3;
    const o1 = this.nearX % 90;
    for (let x = -o1; x < w; x += 90) ctx.fillRect(x, g + 22, 34, 3);
    if (g + 46 < h) {
      const o2 = (this.nearX + 45) % 90;
      for (let x = -o2; x < w; x += 90) ctx.fillRect(x, g + 46, 20, 3);
    }
    ctx.globalAlpha = 1;
  }
}
