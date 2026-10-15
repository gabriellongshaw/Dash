import { rand, clamp, seeded, parseColor, mixColor, tintColor, toCss, luminance } from '../core/utils.js';
import { WORLDS } from '../core/worlds.js';

const PERIOD = 1600;
const CYCLE = 24000;
const WARM = parseColor('#fb923c');
const KEYS = ['skyTop', 'skyBottom', 'sun', 'cloud', 'far', 'mid', 'ground', 'groundLine', 'dust', 'cap', 'glow', 'mote'];

const SHAPES = {
  city: { w0: 40, w1: 70, h0: 60, h1: 130, step: 1, gap: 12 },
  mesa: { w0: 70, w1: 60, h0: 70, h1: 70, step: 0.8, gap: 60 },
  peaks: { w0: 90, w1: 110, h0: 80, h1: 120, step: 0.55, gap: 20 },
  towers: { w0: 26, w1: 34, h0: 70, h1: 150, step: 1, gap: 14 },
  pines: { w0: 30, w1: 40, h0: 60, h1: 90, step: 0.7, gap: 12 },
  domes: { w0: 70, w1: 70, h0: 40, h1: 80, step: 0.6, gap: 20 },
  islands: { w0: 110, w1: 110, h0: 24, h1: 36, step: 0.9, gap: 60 },
  orbs: { w0: 60, w1: 90, h0: 20, h1: 90, step: 1.6, gap: 90 }
};

function buildFar(scenery, seed) {
  const next = seeded(seed);
  const cfg = SHAPES[scenery];
  const list = [];
  let x = 0;
  while (x < PERIOD) {
    const w = cfg.w0 + next() * cfg.w1;
    const h = cfg.h0 + next() * cfg.h1;
    const item = { x, w: scenery === 'city' ? Math.min(w, PERIOD - x) : w, h, a: 0.35 + next() * 0.3, lit: null };
    if (scenery === 'towers') {
      const cols = Math.max(2, Math.floor((w - 6) / 8));
      const rows = Math.floor((h - 10) / 11);
      item.cols = cols;
      item.lit = Array.from({ length: cols * rows }, () => next() > 0.55);
    }
    list.push(item);
    x += w * cfg.step + next() * cfg.gap;
  }
  return list;
}

function prepare(theme) {
  const out = { day: {}, night: {} };
  for (const side of ['day', 'night']) {
    const src = theme[side];
    for (const key of KEYS) {
      const fallback = key === 'cap' ? src.far : key === 'glow' ? src.groundLine : key === 'mote' ? 'rgba(255,255,255,0)' : null;
      out[side][key] = parseColor(src[key] || fallback);
    }
  }
  return out;
}

export class World {
  constructor() {
    this.w = 480;
    this.h = 420;
    this.g = 310;
    this.dist = 0;
    this.clock = 0;
    this.cycle = CYCLE;
    this.offset = 0;
    this.sky = 'light';
    this.onSky = null;
    this.farX = 0;
    this.midX = 0;
    this.nearX = 0;
    this.clouds = [];
    this.streaks = [];
    this.motes = [];
    this.stars = [];
    this.key = -1;
    this.setTheme(WORLDS[0], false);
  }

  setTheme(theme, dark) {
    this.theme = theme;
    this.colors = prepare(theme);
    this.far = buildFar(theme.scenery, theme.seed);
    this.offset = dark ? 0.5 : 0;
    this.key = -1;
    this.seedMotes();
    this.refresh();
  }

  restart() {
    this.dist = 0;
    this.key = -1;
    this.refresh();
  }

  resize(w, h, g) {
    this.w = w;
    this.h = h;
    this.g = g;
    const cloudCount = Math.ceil(w / 260) + 1;
    this.clouds = [];
    for (let i = 0; i < cloudCount; i++) {
      this.clouds.push({ x: rand(0, w), y: rand(g * 0.08, g * 0.42), s: rand(0.7, 1.3) });
    }
    this.streaks = [];
    for (let i = 0; i < 12; i++) {
      this.streaks.push({ x: rand(0, w), y: rand(g * 0.15, g - 10), len: rand(40, 110) });
    }
    this.stars = [];
    const starCount = Math.ceil(w / 12);
    for (let i = 0; i < starCount; i++) {
      this.stars.push({ x: rand(0, w), y: rand(4, g * 0.62), r: rand(0.6, 1.5), ph: rand(0, 6.28) });
    }
    this.seedMotes();
    this.refresh();
  }

  seedMotes() {
    this.motes = [];
    if (!this.theme.motes) return;
    const spacing = { sand: 40, comet: 110, firefly: 34 }[this.theme.motes] || 22;
    const count = Math.ceil(this.w / spacing);
    for (let i = 0; i < count; i++) {
      this.motes.push({
        x: rand(0, this.w),
        y: rand(0, this.g),
        v: rand(0.5, 1),
        r: rand(1, 2.4),
        ph: rand(0, 6.28)
      });
    }
  }

  night() {
    const c = (this.dist / this.cycle + this.offset) % 1;
    return 0.5 - 0.5 * Math.cos(c * Math.PI * 2);
  }

  refresh() {
    const s = this.night();
    const key = Math.round(s * 240);
    if (key === this.key) return;
    this.key = key;
    const q = key / 240;
    const dusk = 1 - Math.abs(2 * q - 1);
    const p = {};
    const raw = {};
    for (const name of KEYS) {
      let c = mixColor(this.colors.day[name], this.colors.night[name], q);
      if (name === 'skyBottom' || name === 'sun') c = tintColor(c, WARM, dusk * (name === 'sun' ? 0.25 : 0.1));
      raw[name] = c;
      p[name] = toCss(c);
    }
    p.skyMid = toCss(mixColor(raw.skyTop, raw.skyBottom, 0.33));
    this.p = p;
    this.s = q;
    const lum = luminance(mixColor(raw.skyTop, raw.skyBottom, 0.5));
    const next = lum < 0.45 ? 'dark' : lum > 0.55 ? 'light' : this.sky;
    if (next !== this.sky) {
      this.sky = next;
      if (this.onSky) this.onSky(next);
    }
  }

  bindSky(callback) {
    this.onSky = callback;
    callback(this.sky);
  }

  update(dt, speed) {
    this.clock += dt;
    this.dist += speed * dt;
    this.farX += speed * 0.06 * dt;
    this.midX += speed * 0.18 * dt;
    this.nearX += speed * dt;
    this.refresh();
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
    const kind = this.theme.motes;
    for (const m of this.motes) {
      if (kind === 'snow') {
        m.y += (24 + m.v * 40) * dt;
        m.x -= (speed * 0.2 + 10 + Math.sin(this.clock + m.ph) * 12) * dt;
        if (m.y > this.g || m.x < -10) {
          m.y = -6;
          m.x = rand(0, this.w + 40);
        }
      } else if (kind === 'ember') {
        m.y -= (30 + m.v * 60) * dt;
        m.x -= (speed * 0.15 + Math.sin(this.clock * 2 + m.ph) * 10) * dt;
        if (m.y < -6 || m.x < -10) {
          m.y = this.g - rand(0, 20);
          m.x = rand(0, this.w + 40);
        }
      } else if (kind === 'firefly') {
        m.x += (Math.sin(this.clock * 0.7 + m.ph) * 14 - speed * 0.12) * dt;
        m.y = clamp(m.y + Math.cos(this.clock * 0.9 + m.ph) * 8 * dt, this.g * 0.4, this.g - 10);
        if (m.x < -10) m.x = this.w + 10;
      } else if (kind === 'comet') {
        m.x -= (speed * 0.3 + 240 * m.v) * dt;
        m.y += 110 * m.v * dt;
        if (m.x < -30 || m.y > this.g * 0.7) {
          m.x = this.w + rand(0, this.w);
          m.y = rand(0, this.g * 0.3);
        }
      } else if (kind === 'sand') {
        m.x -= speed * (0.8 + m.v * 0.5) * dt;
        if (m.x < -30) {
          m.x = this.w + rand(0, 100);
          m.y = rand(this.g * 0.3, this.g - 8);
        }
      }
    }
  }

  drawFar(ctx) {
    const { w, g, p } = this;
    const scenery = this.theme.scenery;
    const glowAlpha = clamp((this.s - 0.2) / 0.5, 0, 1) * 0.8 + 0.15;
    const offset = this.farX % PERIOD;
    for (let base = -offset; base < w; base += PERIOD) {
      for (const b of this.far) {
        const x = base + b.x;
        if (x > w) break;
        if (x + b.w < 0) continue;
        ctx.fillStyle = p.far;
        if (scenery === 'city') {
          ctx.fillRect(x, g - b.h, b.w, b.h + 2);
        } else if (scenery === 'mesa') {
          ctx.beginPath();
          ctx.moveTo(x, g + 2);
          ctx.lineTo(x + b.w * 0.06, g - b.h * 0.55);
          ctx.lineTo(x + b.w * 0.14, g - b.h * 0.58);
          ctx.lineTo(x + b.w * 0.18, g - b.h);
          ctx.lineTo(x + b.w * 0.82, g - b.h);
          ctx.lineTo(x + b.w * 0.86, g - b.h * 0.6);
          ctx.lineTo(x + b.w * 0.94, g - b.h * 0.55);
          ctx.lineTo(x + b.w, g + 2);
          ctx.closePath();
          ctx.fill();
        } else if (scenery === 'peaks') {
          const ax = x + b.w * b.a;
          const top = g - b.h;
          ctx.beginPath();
          ctx.moveTo(x, g + 2);
          ctx.lineTo(ax, top);
          ctx.lineTo(x + b.w, g + 2);
          ctx.closePath();
          ctx.fill();
          const lx = ax + (x - ax) * 0.34;
          const rx = ax + (x + b.w - ax) * 0.34;
          const ly = top + (g + 2 - top) * 0.34;
          ctx.fillStyle = p.cap;
          ctx.beginPath();
          ctx.moveTo(ax, top);
          ctx.lineTo(lx, ly);
          ctx.lineTo(ax - (ax - lx) * 0.4, ly - b.h * 0.07);
          ctx.lineTo(ax + (rx - ax) * 0.15, ly + b.h * 0.03);
          ctx.lineTo(ax + (rx - ax) * 0.55, ly - b.h * 0.06);
          ctx.lineTo(rx, ly);
          ctx.closePath();
          ctx.fill();
        } else if (scenery === 'pines') {
          for (let j = 0; j < 3; j++) {
            const bottom = g + 2 - j * b.h * 0.26;
            const half = (b.w / 2) * (1 - j * 0.22);
            ctx.beginPath();
            ctx.moveTo(x + b.w / 2 - half, bottom);
            ctx.lineTo(x + b.w / 2, bottom - b.h * 0.5);
            ctx.lineTo(x + b.w / 2 + half, bottom);
            ctx.closePath();
            ctx.fill();
          }
        } else if (scenery === 'domes') {
          const cx = x + b.w / 2;
          ctx.beginPath();
          ctx.ellipse(cx, g + 2, b.w / 2, b.h, 0, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = p.cap;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.ellipse(cx - b.w * 0.12, g + 2 - b.h * 0.7, b.w * 0.14, b.h * 0.09, -0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } else if (scenery === 'islands') {
          const cx = x + b.w / 2;
          ctx.beginPath();
          ctx.ellipse(cx, g + 2, b.w / 2, b.h, 0, Math.PI, 0);
          ctx.fill();
          if (b.a > 0.5) {
            ctx.strokeStyle = p.far;
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx, g + 2 - b.h);
            ctx.quadraticCurveTo(cx + 3, g - b.h - 14, cx + 7, g - b.h - 26);
            ctx.stroke();
            for (const [dx, dy] of [[-12, 4], [-6, -4], [8, -3], [13, 5]]) {
              ctx.beginPath();
              ctx.moveTo(cx + 7, g - b.h - 26);
              ctx.quadraticCurveTo(cx + 7 + dx * 0.6, g - b.h - 33, cx + 7 + dx, g - b.h - 26 + dy);
              ctx.stroke();
            }
          }
        } else if (scenery === 'orbs') {
          const cx = x + b.w / 2;
          const cy = g - b.h * 1.6;
          const r = b.w / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = p.cap;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx, cy, r - 4, Math.PI * 1.05, Math.PI * 1.65);
          ctx.stroke();
          if (b.a > 0.5) {
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, r * 1.7, r * 0.3, -0.3, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else {
          ctx.fillRect(x, g - b.h, b.w, b.h + 2);
          ctx.fillStyle = p.glow;
          ctx.globalAlpha = glowAlpha;
          const rows = Math.floor(b.lit.length / b.cols);
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < b.cols; c++) {
              if (b.lit[r * b.cols + c]) ctx.fillRect(x + 4 + c * 8, g - b.h + 6 + r * 11, 4, 5);
            }
          }
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  drawMotes(ctx) {
    const kind = this.theme.motes;
    if (!kind) return;
    ctx.fillStyle = this.p.mote;
    ctx.strokeStyle = this.p.mote;
    ctx.lineWidth = 1.5;
    for (const m of this.motes) {
      if (kind === 'snow') {
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 'ember') {
        ctx.globalAlpha = 0.5 + Math.sin(this.clock * 8 + m.ph) * 0.4;
        ctx.fillRect(m.x, m.y, m.r, m.r);
        ctx.globalAlpha = 1;
      } else if (kind === 'firefly') {
        ctx.globalAlpha = 0.45 + Math.sin(this.clock * 3 + m.ph) * 0.45;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (kind === 'comet') {
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x + 22 + m.v * 14, m.y - 9 - m.v * 4);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x + 10 + m.v * 14, m.y);
        ctx.stroke();
      }
    }
  }

  draw(ctx, speed) {
    const { w, h, g, p, s } = this;
    const theme = this.theme;

    const sky = ctx.createLinearGradient(0, 0, 0, g);
    sky.addColorStop(0, p.skyTop);
    sky.addColorStop(1, p.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(-30, -30, w + 60, g + 30);

    const starAlpha = theme.starsAlways ? 0.85 : clamp((s - 0.45) / 0.35, 0, 1) * theme.stars;
    if (starAlpha > 0.02) {
      ctx.fillStyle = '#ffffff';
      for (const st of this.stars) {
        ctx.globalAlpha = starAlpha * (0.55 + Math.sin(this.clock * 2 + st.ph) * 0.35);
        ctx.fillRect(st.x, st.y, st.r, st.r);
      }
      ctx.globalAlpha = 1;
    }

    if (theme.aurora && s > 0.5) {
      const strength = clamp((s - 0.5) / 0.35, 0, 1) * 0.4;
      for (let k = 0; k < 2; k++) {
        const top = g * (0.14 + k * 0.1);
        const band = ctx.createLinearGradient(0, top - 20, 0, top + 70);
        band.addColorStop(0, 'rgba(52,211,153,0)');
        band.addColorStop(0.35, `rgba(${k ? '125,211,252' : '52,211,153'},${strength})`);
        band.addColorStop(1, 'rgba(52,211,153,0)');
        ctx.fillStyle = band;
        ctx.beginPath();
        ctx.moveTo(-10, top + 60);
        for (let x = -10; x <= w + 10; x += 16) {
          ctx.lineTo(x, top + Math.sin(x * 0.012 + this.clock * 0.4 + k * 2) * 16);
        }
        ctx.lineTo(w + 10, top + 60);
        ctx.closePath();
        ctx.fill();
      }
    }

    const sunY = g * (0.3 + 0.06 * s);
    ctx.fillStyle = p.sun;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(w * 0.8, sunY, 44, 0, Math.PI * 2);
    ctx.fill();
    if (theme.stripes) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = p.skyMid;
      ctx.globalAlpha = 1;
      for (let i = 0; i < 5; i++) ctx.fillRect(w * 0.8 - 46, sunY + 6 + i * 9, 92, 1.5 + i * 1.4);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = p.cloud;
    ctx.beginPath();
    for (const c of this.clouds) {
      ctx.roundRect(c.x, c.y, 80 * c.s, 18 * c.s, 9 * c.s);
      ctx.roundRect(c.x + 16 * c.s, c.y - 10 * c.s, 44 * c.s, 20 * c.s, 10 * c.s);
    }
    ctx.fill();

    this.drawFar(ctx);

    const [base, a1, a2, f1, f2] = theme.hills;
    ctx.fillStyle = p.mid;
    ctx.beginPath();
    ctx.moveTo(-10, g + 2);
    for (let x = -10; x <= w + 10; x += 10) {
      const t = x + this.midX;
      ctx.lineTo(x, g - base - Math.sin(t * f1) * a1 - Math.sin(t * f2 + 1) * a2);
    }
    ctx.lineTo(w + 10, g + 2);
    ctx.closePath();
    ctx.fill();

    this.drawMotes(ctx);

    if (speed > 420) {
      ctx.globalAlpha = Math.min(0.22, (speed - 420) / 340 * 0.22);
      ctx.fillStyle = p.far;
      for (const st of this.streaks) ctx.fillRect(st.x, st.y, st.len, 2);
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