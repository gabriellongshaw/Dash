import { rand } from '../core/utils.js';

const MAX = 240;

export class Particles {
  constructor() {
    this.list = [];
  }

  clear() {
    this.list.length = 0;
  }

  emit(x, y, count, o) {
    const a0 = o.a0 ?? 0;
    const a1 = o.a1 ?? Math.PI * 2;
    for (let i = 0; i < count; i++) {
      if (this.list.length >= MAX) return;
      const angle = rand(a0, a1);
      const speed = rand(o.s0, o.s1);
      this.list.push({
        x,
        y,
        vx: Math.cos(angle) * speed + (o.vx || 0),
        vy: Math.sin(angle) * speed,
        life: 0,
        max: rand(o.l0, o.l1),
        size: rand(o.z0, o.z1),
        color: o.color,
        gravity: o.gravity || 0
      });
    }
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life += dt;
      if (p.life >= p.max) {
        this.list.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      const t = 1 - p.life / p.max;
      ctx.globalAlpha = t;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size * (0.4 + t * 0.6)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}