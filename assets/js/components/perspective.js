import { clamp, mixColor, parseColor, toCss } from '../core/utils.js';
import { LANE_W } from './lanes.js';
import { drawProp, propsFor, tone } from './roadside.js';
import { shade, texture } from './textures.js';

export const NEAR = 8;
export const FAR = 2800;

const FADE = 1100;
const PROP_FADE = 1100;
const ROAD_FAR = 80000;
const SLEEPER = 38;
const ROAD_HALF = LANE_W * 1.5;
const PROP_SCALE = 1.7;
const PROP_HALF = 46 * PROP_SCALE;
const BUILD_GAP = 30;
const PROP_ROWS = [
  { off: 0, gap: 110, salt: 0 },
  { off: 70, gap: 130, salt: 977 },
  { off: 170, gap: 160, salt: 311 },
  { off: 290, gap: 200, salt: 733 }
];
const STRIPE = 100;
const DASH = 60;

const face = { x: 0, y: 0, w: 0, h: 0 };

export function makeView() {
  return { fade: 1, w: 0, h: 0, cx: 0, hy: 0, F: 1, eye: 38, x: 0, p: null, pal: null, hazard: null, pylon: null, props: null, night: 0, time: 0, scroll: 0, speed: 0, reduced: false };
}

export function makeColors(pal, p) {
  return {
    hazard: { front: pal.hazard, top: pal.hazardLight, side: pal.hazardDark },
    gate: { front: pal.hazardDark, top: pal.hazard, side: pal.hazardDark },
    train: { front: pal.hazardDark, top: pal.hazardLight, side: pal.hazard },
    pylon: { front: p.far, top: p.far, side: p.mid }
  };
}

function ground(ctx, v, x0, x1, za, zb) {
  const ka = v.F / Math.max(za, NEAR);
  const kb = v.F / zb;
  const ya = v.hy + v.eye * ka;
  const yb = v.hy + v.eye * kb;
  ctx.beginPath();
  ctx.moveTo(v.cx + (x0 - v.x) * ka, ya);
  ctx.lineTo(v.cx + (x1 - v.x) * ka, ya);
  ctx.lineTo(v.cx + (x1 - v.x) * kb, yb);
  ctx.lineTo(v.cx + (x0 - v.x) * kb, yb);
  ctx.closePath();
  ctx.fill();
}

function box(ctx, v, c, x0, x1, y0, y1, z0, z1, flat = false) {
  if (z1 <= NEAR) return false;
  const ka = v.F / Math.max(z0, NEAR);
  const kb = v.F / z1;
  const ax0 = v.cx + (x0 - v.x) * ka;
  const ax1 = v.cx + (x1 - v.x) * ka;
  const ay0 = v.hy + (v.eye - y0) * ka;
  const ay1 = v.hy + (v.eye - y1) * ka;
  const bx0 = v.cx + (x0 - v.x) * kb;
  const bx1 = v.cx + (x1 - v.x) * kb;
  const by0 = v.hy + (v.eye - y0) * kb;
  const by1 = v.hy + (v.eye - y1) * kb;
  ctx.fillStyle = c.side;
  if (v.x < x0) {
    ctx.beginPath();
    ctx.moveTo(ax0, ay1);
    ctx.lineTo(bx0, by1);
    ctx.lineTo(bx0, by0);
    ctx.lineTo(ax0, ay0);
    ctx.closePath();
    ctx.fill();
    shade(ctx, ax0, 0, bx0, 0, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.32)');
    if (!flat) texture(ctx, 'brushed', ax0, ay1, ka * 0.3, 0.5);
  } else if (v.x > x1) {
    ctx.beginPath();
    ctx.moveTo(ax1, ay1);
    ctx.lineTo(bx1, by1);
    ctx.lineTo(bx1, by0);
    ctx.lineTo(ax1, ay0);
    ctx.closePath();
    ctx.fill();
    shade(ctx, ax1, 0, bx1, 0, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.32)');
    if (!flat) texture(ctx, 'brushed', ax1, ay1, ka * 0.3, 0.5);
  }
  if (v.eye > y1) {
    ctx.fillStyle = c.top;
    ctx.beginPath();
    ctx.moveTo(ax0, ay1);
    ctx.lineTo(ax1, ay1);
    ctx.lineTo(bx1, by1);
    ctx.lineTo(bx0, by1);
    ctx.closePath();
    ctx.fill();
    shade(ctx, 0, ay1, 0, by1, 'rgba(255,255,255,0.14)', 'rgba(0,0,0,0.12)');
    if (!flat) texture(ctx, 'grain', ax0, ay1, ka * 0.3, 0.5);
  } else if (v.eye < y0) {
    ctx.beginPath();
    ctx.moveTo(ax0, ay0);
    ctx.lineTo(ax1, ay0);
    ctx.lineTo(bx1, by0);
    ctx.lineTo(bx0, by0);
    ctx.closePath();
    ctx.fillStyle = c.side;
    ctx.fill();
  }
  if (z0 < NEAR) return false;
  ctx.fillStyle = c.front;
  ctx.fillRect(ax0, ay1, ax1 - ax0, ay0 - ay1);
  ctx.beginPath();
  ctx.rect(ax0, ay1, ax1 - ax0, ay0 - ay1);
  shade(ctx, 0, ay1, 0, ay0, 'rgba(255,255,255,0.16)', 'rgba(0,0,0,0.22)');
  if (!flat) texture(ctx, 'grain', ax0, ay1, ka * 0.3, 0.55);
  face.x = ax0;
  face.y = ay1;
  face.w = ax1 - ax0;
  face.h = ay0 - ay1;
  return true;
}

function sideWall(ctx, v) {
  const { p } = v;
  const H = 22;
  for (let side = -1; side <= 1; side += 2) {
    const xi = side * (ROAD_HALF + 8);
    const xo = side * (ROAD_HALF + 16);
    ctx.fillStyle = p.mid;
    sideQuad(ctx, v, xi, 0, H, NEAR, FAR);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fill();
    ctx.fillStyle = p.groundLine;
    ctx.globalAlpha = 0.55;
    sideQuad(ctx, v, xi, H * 0.55, H * 0.7, NEAR, FAR);
    ctx.fill();
    ctx.globalAlpha = 1;
    const shift = v.scroll % 64;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (let z = -shift; z < FAR; z += 64) {
      if (z + 5 <= NEAR) continue;
      sideQuad(ctx, v, xi, 0, H, Math.max(z, NEAR), z + 5);
      ctx.fill();
    }
    const a = sidePoint(v, xi, H, NEAR);
    const b = sidePoint(v, xo, H, NEAR);
    const c = sidePoint(v, xo, H, FAR);
    const d = sidePoint(v, xi, H, FAR);
    ctx.fillStyle = p.far;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.lineTo(d[0], d[1]);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawRoad(ctx, v) {
  const { p, w, h, hy } = v;
  const day = 1 - clamp(v.night * 1.4, 0, 1);
  const dirt = toCss(mixColor(parseColor(p.ground), parseColor(p.mid), day * 0.55));
  ctx.fillStyle = dirt;
  ctx.fillRect(-30, hy, w + 60, h - hy + 30);
  ctx.fillStyle = p.groundLine;
  ctx.fillRect(-30, hy, w + 60, 2);

  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ground(ctx, v, -ROAD_HALF, ROAD_HALF, NEAR, ROAD_FAR);

  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  const shift = v.scroll % (STRIPE * 2);
  for (let z = -shift; z < FAR; z += STRIPE * 2) {
    if (z + STRIPE <= NEAR) continue;
    ground(ctx, v, -ROAD_HALF, ROAD_HALF, Math.max(z, NEAR), z + STRIPE);
  }

  ctx.fillStyle = '#000';
  ctx.globalAlpha = 0.2;
  const tie = v.scroll % SLEEPER;
  for (let z = -tie; z < FAR; z += SLEEPER) {
    if (z + 7 <= NEAR) continue;
    for (let a = -1; a <= 1; a++) ground(ctx, v, a * LANE_W - LANE_W * 0.39, a * LANE_W + LANE_W * 0.39, Math.max(z, NEAR), z + 7);
  }
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.5;
  for (let a = -1; a <= 1; a++) {
    ground(ctx, v, a * LANE_W - LANE_W * 0.22, a * LANE_W - LANE_W * 0.178, NEAR, ROAD_FAR);
    ground(ctx, v, a * LANE_W + LANE_W * 0.178, a * LANE_W + LANE_W * 0.22, NEAR, ROAD_FAR);
  }
  ctx.fillStyle = p.groundLine;
  ctx.globalAlpha = 0.5;
  ground(ctx, v, -LANE_W / 2 - 1, -LANE_W / 2 + 1, NEAR, ROAD_FAR);
  ground(ctx, v, LANE_W / 2 - 1, LANE_W / 2 + 1, NEAR, ROAD_FAR);
  ctx.globalAlpha = 0.9;
  ground(ctx, v, -ROAD_HALF - 4, -ROAD_HALF, NEAR, ROAD_FAR);
  ground(ctx, v, ROAD_HALF, ROAD_HALF + 4, NEAR, ROAD_FAR);
  ctx.globalAlpha = 1;

  const hazeH = (v.eye * v.F) / 700;
  const haze = ctx.createLinearGradient(0, hy, 0, hy + hazeH);
  const fogRgb = mixColor(parseColor(dirt), parseColor(p.skyBottom), 0.4 + 0.6 * (1 - day));
  const fog = [1, 0.82, 0.55, 0.3, 0.14, 0.05, 0];
  for (let i = 0; i < fog.length; i++) {
    const c = fogRgb.slice();
    c[3] = fog[i];
    haze.addColorStop(i / (fog.length - 1), toCss(c));
  }
  ctx.fillStyle = haze;
  ctx.fillRect(-30, hy, w + 60, hazeH);

  sideWall(ctx, v);

  const set = v.props || propsFor(null);
  const o = { r: 0, c: '', n: v.night, t: v.time, snow: false };
  const list = [];
  for (const row of PROP_ROWS) {
    const first = row.gap - (v.scroll % row.gap);
    const base = Math.floor(v.scroll / row.gap) + 1;
    for (let j = Math.floor((FAR - first) / row.gap); j >= 0; j--) {
      const z = first + j * row.gap;
      if (z < 60) continue;
      const k = v.F / z;
      for (let side = -1; side <= 1; side += 2) {
        const hsh = hash((base + j) * 2 + (side > 0 ? 1 : 0) + row.salt);
        const entry = set[(hsh >>> 3) % set.length];
        const inner = ROAD_HALF + BUILD_GAP + row.off + (hsh % 41);
        if (entry[0] === 'building') {
          list.push({ z, side, hsh, entry, inner, k, tall: true });
          continue;
        }
        const x = side * (inner + PROP_HALF);
        const sx = v.cx + (x - v.x) * k;
        if (sx < -160 * k * PROP_SCALE - 60 || sx > v.w + 160 * k * PROP_SCALE + 60) continue;
        list.push({ z, k, sx, hsh, entry });
      }
    }
  }
  list.sort((a, b) => b.z - a.z);
  for (const it of list) {
    o.r = ((it.hsh >>> 8) % 1000) / 1000;
    ctx.globalAlpha = clamp((FAR - it.z) / PROP_FADE, 0, 1);
    if (it.tall) {
      o.c = it.entry[1][Math.floor(o.r * 997) % it.entry[1].length];
      tower(ctx, v, it, o);
      continue;
    }
    ctx.save();
    ctx.translate(it.sx, v.hy + v.eye * it.k);
    ctx.scale(it.k * PROP_SCALE, it.k * PROP_SCALE);
    drawProp(ctx, it.entry, o);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function tower(ctx, v, it, o) {
  const w = 90 + o.r * 80;
  const d = 80 + (((it.hsh >>> 12) % 1000) / 1000) * 70;
  const h = 300 + (((it.hsh >>> 4) % 1000) / 1000) * 520;
  const xa = it.side > 0 ? it.inner : -(it.inner + w);
  const xb = xa + w;
  const za = it.z - d / 2;
  const zb = it.z + d / 2;
  if (za < NEAR + 20) return;
  const c = { front: tone(o.c, v.night), side: tone(o.c, v.night + 0.3), top: tone(o.c, v.night * 0.5) };
  const ok = box(ctx, v, c, xa, xb, 0, h, za, zb, true);
  const night = v.night > 0.35;
  const cols = Math.max(2, Math.floor(w / 22));
  const rows = Math.floor(h / 26);
  const lit = (i, j) => (i * 7 + j * 13 + it.hsh) % 5 > 1;
  const color = night ? '#fde68a' : 'rgba(255,255,255,0.55)';
  const was = ctx.globalAlpha;
  if (ok && face.w > 10) {
    const { x, y, w: fw, h: fh } = face;
    const cw = fw / cols;
    const rh = fh / rows;
    ctx.fillStyle = color;
    ctx.globalAlpha = was * (night ? 0.9 : 0.6);
    ctx.beginPath();
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (!lit(i, j)) continue;
        ctx.rect(x + cw * (i + 0.22), y + rh * (j + 0.25), cw * 0.56, rh * 0.5);
      }
    }
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.globalAlpha = was;
    ctx.fillRect(x, y, fw, Math.max(2, fh * 0.012));
  }
  const xe = v.x < xa ? xa : v.x > xb ? xb : null;
  if (xe !== null && za < 1300) {
    const nz = Math.max(2, Math.floor(d / 22));
    const dz = d / nz;
    ctx.fillStyle = color;
    ctx.globalAlpha = was * (night ? 0.85 : 0.45);
    ctx.beginPath();
    for (let i = 0; i < nz; i++) {
      for (let j = 0; j < rows; j++) {
        if (!lit(i + 3, j)) continue;
        const p0 = sidePoint(v, xe, (j + 0.25) * 26, za + dz * (i + 0.22));
        const p1 = sidePoint(v, xe, (j + 0.75) * 26, za + dz * (i + 0.22));
        const p2 = sidePoint(v, xe, (j + 0.75) * 26, za + dz * (i + 0.78));
        const p3 = sidePoint(v, xe, (j + 0.25) * 26, za + dz * (i + 0.78));
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.lineTo(p3[0], p3[1]);
        ctx.closePath();
      }
    }
    ctx.fill();
  }
  ctx.globalAlpha = was;
}

function hash(n) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}

function tape(ctx, v, band, a, b) {
  const sw = Math.max(4, band);
  const y = face.y + face.h - band;
  ctx.save();
  ctx.beginPath();
  ctx.rect(face.x, y, face.w, band);
  ctx.clip();
  ctx.fillStyle = a;
  ctx.fillRect(face.x, y, face.w, band);
  ctx.fillStyle = b;
  for (let x = face.x - band; x < face.x + face.w; x += sw * 2) {
    ctx.beginPath();
    ctx.moveTo(x, y + band);
    ctx.lineTo(x + sw, y + band);
    ctx.lineTo(x + sw + band, y);
    ctx.lineTo(x + band, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function disc(ctx, v, o, radius, lift) {
  const z = Math.max(o.z + o.d / 2, NEAR);
  const k = v.F / z;
  const m = (o.x0 + o.x1) / 2;
  const x = v.cx + (m - v.x) * k;
  const y = v.hy + (v.eye - lift) * k;
  const gy = v.hy + v.eye * k;
  const r = radius * k;
  const dx = clamp((m - v.x) * 0.05, -4, 4) * k;
  const dy = -4 * k;
  const pal = v.pal;

  ctx.fillStyle = pal.hazardDark;
  ctx.fillRect(x - r * 0.1, y, r * 0.2, gy - y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x - r * 0.45, gy - r * 0.12, r * 0.9, r * 0.12);

  const teeth = (cx, cy, tint) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-o.spin);
    ctx.fillStyle = tint;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a + 0.2) * r * 0.7, Math.sin(a + 0.2) * r * 0.7);
      ctx.lineTo(Math.cos(a + 0.42) * r * 0.7, Math.sin(a + 0.42) * r * 0.7);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  const was = ctx.globalAlpha;
  ctx.globalAlpha = was * 0.55;
  teeth(x - dx, y - dy, '#000');
  ctx.globalAlpha = was;
  ctx.fillStyle = pal.hazardDark;
  ctx.beginPath();
  ctx.arc(x - dx * 0.5, y - dy * 0.5, r * 0.7, 0, Math.PI * 2);
  ctx.fill();
  teeth(x, y, pal.hazardDark);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-o.spin);
  ctx.fillStyle = pal.hazard;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.66, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = pal.hazardDark;
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = pal.hazardDark;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.arc(r * 0.3, 0, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = pal.hazardLight;
  ctx.globalAlpha = was * 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = was * 0.35;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.58, Math.PI * 1.1, Math.PI * 1.45);
  ctx.stroke();
  ctx.globalAlpha = was;
}

function barrel(ctx, v, o, radius, lift) {
  const z = Math.max(o.z + o.d / 2, NEAR);
  const k = v.F / z;
  const m = (o.x0 + o.x1) / 2;
  const x = v.cx + (m - v.x) * k;
  const y = v.hy + (v.eye - lift) * k;
  const hw = ((o.x1 - o.x0) / 2) * k;
  const r = radius * k;
  const pal = v.pal;
  const side = v.x < m ? -1 : 1;
  const cap = Math.min(r * 0.3, hw * 0.5);
  const rr = Math.min(r * 0.45, hw);
  const was = ctx.globalAlpha;

  ctx.fillStyle = pal.hazardDark;
  ctx.beginPath();
  ctx.ellipse(x + side * hw, y, cap, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.hazard;
  ctx.beginPath();
  ctx.ellipse(x + side * hw, y, cap * 0.55, r * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x - hw, y - r, hw * 2, r * 2, rr);
  ctx.clip();
  ctx.fillStyle = pal.hazard;
  ctx.fillRect(x - hw, y - r, hw * 2, r * 2);
  const bands = 5;
  const turn = o.spin % (Math.PI * 2);
  for (let i = 0; i < bands; i++) {
    const a = turn + (i / bands) * Math.PI * 2;
    const c = Math.cos(a);
    if (c <= 0) continue;
    const half = (Math.PI / bands) * 0.5;
    const top = y + Math.sin(a - half) * r;
    const bot = y + Math.sin(a + half) * r;
    ctx.fillStyle = pal.hazardDark;
    ctx.fillRect(x - hw, top, hw * 2, Math.max(1, bot - top));
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x - hw, top, hw * 2, Math.max(1, (bot - top) * 0.25));
  }
  const g = ctx.createLinearGradient(0, y - r, 0, y + r);
  g.addColorStop(0, 'rgba(255,255,255,0.32)');
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(x - hw, y - r, hw * 2, r * 2);
  ctx.restore();
  ctx.strokeStyle = pal.hazardDark;
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.roundRect(x - hw, y - r, hw * 2, r * 2, rr);
  ctx.stroke();
  ctx.globalAlpha = was;
}

function spikes(ctx, v, o) {
  box(ctx, v, v.hazard, o.x0, o.x1, 0, 4, o.z, o.z + o.d);
  const pal = v.pal;
  const HW = 9;
  const SH = 24;
  for (const t of [0.75, 0.25]) {
    const zc = o.z + o.d * t;
    const z0 = zc - HW;
    const z1 = zc + HW;
    if (z0 <= NEAR) continue;
    for (let a = o.a; a <= o.b; a++) {
      for (let i = -1; i <= 1; i++) {
        const xc = a * LANE_W + i * LANE_W * 0.28;
        const nl = sidePoint(v, xc - HW, 4, z0);
        const nr = sidePoint(v, xc + HW, 4, z0);
        const fl = sidePoint(v, xc - HW, 4, z1);
        const fr = sidePoint(v, xc + HW, 4, z1);
        const ap = sidePoint(v, xc, SH, zc);
        const left = v.x < xc;
        ctx.fillStyle = pal.hazardDark;
        ctx.beginPath();
        if (left) {
          ctx.moveTo(nl[0], nl[1]);
          ctx.lineTo(fl[0], fl[1]);
        } else {
          ctx.moveTo(nr[0], nr[1]);
          ctx.lineTo(fr[0], fr[1]);
        }
        ctx.lineTo(ap[0], ap[1]);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = pal.hazard;
        ctx.beginPath();
        ctx.moveTo(nl[0], nl[1]);
        ctx.lineTo(nr[0], nr[1]);
        ctx.lineTo(ap[0], ap[1]);
        ctx.closePath();
        ctx.fill();
        const g = ctx.createLinearGradient(0, ap[1], 0, nl[1]);
        g.addColorStop(0, 'rgba(255,255,255,0.45)');
        g.addColorStop(1, 'rgba(0,0,0,0.2)');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = pal.hazardDark;
        ctx.lineWidth = Math.max(0.6, (nr[0] - nl[0]) * 0.05);
        ctx.stroke();
      }
    }
  }
}

function warn(ctx, v, o) {
  const k = v.F / FAR;
  const x = v.cx + ((o.x0 + o.x1) / 2 - v.x) * k;
  const y = v.hy + 38;
  ctx.globalAlpha = 0.55 + Math.sin(v.time * 14) * 0.35;
  ctx.fillStyle = v.pal.hazard;
  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x + 12, y + 9);
  ctx.lineTo(x - 12, y + 9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = v.pal.hazardLight;
  ctx.fillRect(x - 1.5, y - 4, 3, 7);
  ctx.fillRect(x - 1.5, y + 5, 3, 2);
  ctx.globalAlpha = 1;
}

function shadow(ctx, v, o) {
  const m = (o.x0 + o.x1) / 2;
  let x0 = o.x0;
  let x1 = o.x1;
  if (o.kind === 'missile') {
    x0 = m - 9;
    x1 = m + 9;
  } else if (o.kind === 'saw' || o.kind === 'roller') {
    const z = Math.max(o.z + o.d / 2, NEAR);
    const k = v.F / z;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(v.cx + (m - v.x) * k, v.hy + v.eye * k, 22 * k, 6 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const dark = o.kind === 'drone' || o.kind === 'gate' || o.kind === 'missile' ? 0.1 : 0.2;
  ctx.fillStyle = `rgba(0,0,0,${dark})`;
  ground(ctx, v, x0 - 8, x1 + 8, o.z - 8, o.z + o.d + 8);
  ground(ctx, v, x0 - 3, x1 + 3, o.z - 3, o.z + o.d + 3);
}

const MARKED = { crate: 1, wall: 1, spikes: 1, saw: 1, roller: 1, field: 1, drone: 0 };

function marks(ctx, v, o) {
  if (!MARKED[o.kind]) return;
  const pal = v.pal;
  const base = ctx.globalAlpha;
  const x0 = o.kind === 'saw' || o.kind === 'roller' ? (o.x0 + o.x1) / 2 - 20 : o.x0;
  const x1 = o.kind === 'saw' || o.kind === 'roller' ? (o.x0 + o.x1) / 2 + 20 : o.x1;
  const za = Math.max(o.z - 2, NEAR);
  const zb = o.z + o.d + 2;
  if (zb > NEAR) {
    const ka = v.F / za;
    const kb = v.F / zb;
    ctx.strokeStyle = pal.hazard;
    ctx.globalAlpha = base * 0.7;
    ctx.lineWidth = Math.max(1, 2.2 * ka);
    ctx.beginPath();
    ctx.moveTo(v.cx + (x0 - v.x) * ka, v.hy + v.eye * ka);
    ctx.lineTo(v.cx + (x1 - v.x) * ka, v.hy + v.eye * ka);
    ctx.lineTo(v.cx + (x1 - v.x) * kb, v.hy + v.eye * kb);
    ctx.lineTo(v.cx + (x0 - v.x) * kb, v.hy + v.eye * kb);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.strokeStyle = pal.hazard;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let j = 0; j < 3; j++) {
    const zc = o.z - 14 - j * 18;
    if (zc <= NEAR) continue;
    const k = v.F / zc;
    const kb = v.F / (zc + 9);
    ctx.globalAlpha = base * (0.6 - j * 0.17);
    ctx.lineWidth = Math.max(1, 3.4 * k);
    const a0 = o.kind === 'saw' || o.kind === 'roller' ? Math.round(o.a) : o.a;
    const a1 = o.kind === 'saw' || o.kind === 'roller' ? Math.round(o.a) : o.b;
    for (let a = a0; a <= a1; a++) {
      const xc = a * LANE_W;
      const y = v.hy + v.eye * k;
      const yb = v.hy + v.eye * kb;
      ctx.beginPath();
      ctx.moveTo(v.cx + (xc - 17 - v.x) * kb, yb);
      ctx.lineTo(v.cx + (xc - v.x) * k, y);
      ctx.lineTo(v.cx + (xc + 17 - v.x) * kb, yb);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.globalAlpha = base;
}

const CAR = 120;

function sidePoint(v, xe, y, z) {
  const k = v.F / Math.max(z, NEAR);
  return [v.cx + (xe - v.x) * k, v.hy + (v.eye - y) * k];
}

function sideQuad(ctx, v, xe, y0, y1, za, zb) {
  const a = sidePoint(v, xe, y0, za);
  const b = sidePoint(v, xe, y1, za);
  const c = sidePoint(v, xe, y1, zb);
  const d = sidePoint(v, xe, y0, zb);
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(c[0], c[1]);
  ctx.lineTo(d[0], d[1]);
  ctx.closePath();
}

function trainSide(ctx, v, o, z1) {
  const xe = v.x < o.x0 ? o.x0 : v.x > o.x1 ? o.x1 : null;
  if (xe === null) return;
  const pal = v.pal;
  const h = o.y1 - o.y0;
  const cars = Math.max(1, Math.round((z1 - o.z) / CAR));
  const len = (z1 - o.z) / cars;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  sideQuad(ctx, v, xe, o.y0 + h * 0.08, o.y0 + h * 0.2, Math.max(o.z, NEAR), z1);
  ctx.fill();
  ctx.fillStyle = pal.hazardLight;
  sideQuad(ctx, v, xe, o.y0 + h * 0.34, o.y0 + h * 0.4, Math.max(o.z, NEAR), z1);
  ctx.fill();
  for (let i = 0; i < cars; i++) {
    const a = o.z + i * len;
    const b = a + len;
    if (b <= NEAR) continue;
    for (let w = 0; w < 3; w++) {
      const wa = a + len * (0.12 + w * 0.27);
      const wb = wa + len * 0.2;
      if (wb <= NEAR) continue;
      ctx.fillStyle = 'rgba(20,28,40,0.85)';
      sideQuad(ctx, v, xe, o.y0 + h * 0.52, o.y0 + h * 0.82, Math.max(wa, NEAR), wb);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      sideQuad(ctx, v, xe, o.y0 + h * 0.7, o.y0 + h * 0.82, Math.max(wa, NEAR), wb);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    sideQuad(ctx, v, xe, o.y0, o.y1, Math.max(a - 0.8, NEAR), a + 0.8);
    ctx.fill();
  }
}

function wallFace(ctx, pal) {
  const { x, y, w, h } = face;
  const lw = clamp(w * 0.03, 1, 6);
  const rows = 6;
  ctx.fillStyle = pal.hazardDark;
  ctx.globalAlpha *= 0.22;
  for (let r = 0; r < rows; r += 2) ctx.fillRect(x, y + (h / rows) * r, w, h / rows - lw);
  ctx.globalAlpha /= 0.22;
  ctx.strokeStyle = pal.hazardDark;
  ctx.lineWidth = lw;
  ctx.beginPath();
  for (let r = 1; r < rows; r++) {
    ctx.moveTo(x, y + (h / rows) * r);
    ctx.lineTo(x + w, y + (h / rows) * r);
    const off = r % 2 ? 0.25 : 0.75;
    ctx.moveTo(x + w * off, y + (h / rows) * r);
    ctx.lineTo(x + w * off, y + (h / rows) * (r + 1));
  }
  ctx.stroke();
  const sw = Math.max(4, h * 0.05);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, sw * 2);
  ctx.clip();
  ctx.fillStyle = pal.hazardDark;
  ctx.fillRect(x, y, w, sw * 2);
  ctx.fillStyle = pal.hazardLight;
  for (let sx = x - sw * 2; sx < x + w; sx += sw * 2) {
    ctx.beginPath();
    ctx.moveTo(sx, y + sw * 2);
    ctx.lineTo(sx + sw, y + sw * 2);
    ctx.lineTo(sx + sw * 3, y);
    ctx.lineTo(sx + sw * 2, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = pal.hazardDark;
  ctx.lineWidth = Math.max(1, w * 0.025);
  ctx.strokeRect(x, y, w, h);
}

function barrierFace(ctx, v, pal) {
  const { x, y, w, h } = face;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = pal.hazardLight;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = pal.hazardDark;
  const sw = Math.max(4, h * 0.3);
  for (let sx = x - h; sx < x + w; sx += sw * 2) {
    ctx.beginPath();
    ctx.moveTo(sx, y + h);
    ctx.lineTo(sx + sw, y + h);
    ctx.lineTo(sx + sw + h, y);
    ctx.lineTo(sx + h, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = pal.hazardDark;
  ctx.fillRect(x, y, w, Math.max(2, h * 0.16));
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x, y + h * 0.16, w, Math.max(1, h * 0.04));
  ctx.strokeStyle = pal.hazardDark;
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.strokeRect(x, y, w, h);
}

function signFace(ctx, v, pal, band) {
  const { x, y, w, h } = face;
  tape(ctx, v, band, pal.hazardDark, pal.hazardLight);
  const ph = h - band;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(x + w * 0.05, y + ph * 0.12, w * 0.9, ph * 0.76);
  ctx.strokeStyle = pal.hazardLight;
  ctx.globalAlpha *= 0.7;
  ctx.lineWidth = Math.max(1, w * 0.015);
  ctx.strokeRect(x + w * 0.05, y + ph * 0.12, w * 0.9, ph * 0.76);
  ctx.globalAlpha /= 0.7;
  const cx = x + w / 2;
  const cy = y + ph * 0.5;
  const t = Math.min(ph * 0.26, w * 0.14);
  ctx.fillStyle = pal.hazardLight;
  ctx.beginPath();
  ctx.moveTo(cx - t, cy - t * 0.7);
  ctx.lineTo(cx + t, cy - t * 0.7);
  ctx.lineTo(cx, cy + t * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = pal.hazard;
  for (const lx of [0.1, 0.9]) {
    ctx.beginPath();
    ctx.arc(x + w * lx, y + ph * 0.5, Math.max(1.5, w * 0.018), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = pal.hazardDark;
  ctx.lineWidth = Math.max(1, w * 0.02);
  ctx.strokeRect(x, y, w, h);
}

function posts(ctx, v, o, height, za, zb) {
  const c = { front: v.pal.hazardDark, top: v.pal.hazard, side: v.pal.hazardDark };
  for (const [xa, xb] of [[o.x0, o.x0 + 7], [o.x1 - 7, o.x1]]) {
    box(ctx, v, c, xa - 2, xb + 2, 0, 3, za - 2, zb + 2);
    box(ctx, v, c, xa, xb, 3, height, za, zb);
  }
}

export function drawObstacle(ctx, v, o) {
  if (o.z >= FAR) {
    if (o.kind === 'missile') warn(ctx, v, o);
    return;
  }
  if (o.z + o.d <= NEAR) return;
  ctx.globalAlpha = clamp((FAR - o.z) / FADE, 0, 1) * v.fade;
  const pal = v.pal;
  const z1 = o.z + o.d;
  shadow(ctx, v, o);
  marks(ctx, v, o);
  switch (o.kind) {
    case 'crate':
      if (box(ctx, v, v.hazard, o.x0, o.x1, o.y0, o.y1, o.z, z1)) barrierFace(ctx, v, pal);
      break;
    case 'wall':
      if (box(ctx, v, v.hazard, o.x0, o.x1, o.y0, o.y1, o.z, z1)) wallFace(ctx, pal);
      break;
    case 'gate':
      posts(ctx, v, o, o.y0 + 8, o.z + o.d * 0.38, o.z + o.d * 0.62);
      if (box(ctx, v, v.gate, o.x0, o.x1, o.y0, o.y1, o.z, z1)) signFace(ctx, v, pal, (face.h * 22) / (o.y1 - o.y0));
      break;
    case 'spikes':
      spikes(ctx, v, o);
      break;
    case 'train': {
      const drewFront = box(ctx, v, v.train, o.x0, o.x1, o.y0, o.y1, o.z, z1);
      trainSide(ctx, v, o, z1);
      if (drewFront) {
        const { x, y, w, h } = face;
        ctx.fillStyle = pal.hazard;
        ctx.fillRect(x, y + h * 0.5, w, h * 0.12);
        ctx.fillStyle = 'rgba(20,28,40,0.9)';
        ctx.beginPath();
        ctx.roundRect(x + w * 0.1, y + h * 0.1, w * 0.8, h * 0.34, w * 0.04);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.16, y + h * 0.42);
        ctx.lineTo(x + w * 0.34, y + h * 0.12);
        ctx.lineTo(x + w * 0.46, y + h * 0.12);
        ctx.lineTo(x + w * 0.28, y + h * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = pal.hazardDark;
        ctx.fillRect(x + w * 0.485, y + h * 0.1, w * 0.03, h * 0.34);
        ctx.fillStyle = pal.hazardLight;
        ctx.fillRect(x + w * 0.38, y + h * 0.02, w * 0.24, h * 0.05);
        ctx.fillStyle = pal.hazardLight;
        ctx.fillRect(x + w * 0.4, y + h * 0.68, w * 0.2, h * 0.1);
        ctx.fillStyle = '#fff4b8';
        ctx.beginPath();
        ctx.arc(x + w * 0.2, y + h * 0.78, w * 0.07, 0, Math.PI * 2);
        ctx.arc(x + w * 0.8, y + h * 0.78, w * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha *= 0.3;
        ctx.beginPath();
        ctx.arc(x + w * 0.2, y + h * 0.78, w * 0.12, 0, Math.PI * 2);
        ctx.arc(x + w * 0.8, y + h * 0.78, w * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha /= 0.3;
        const sw = Math.max(3, h * 0.05);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y + h * 0.9, w, h * 0.1);
        ctx.clip();
        ctx.fillStyle = pal.hazardLight;
        for (let sx = x - h * 0.1; sx < x + w; sx += sw * 2) {
          ctx.beginPath();
          ctx.moveTo(sx, y + h);
          ctx.lineTo(sx + sw, y + h);
          ctx.lineTo(sx + sw + h * 0.1, y + h * 0.9);
          ctx.lineTo(sx + h * 0.1, y + h * 0.9);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = Math.max(1, w * 0.02);
        ctx.strokeRect(x, y, w, h);
      }
      break;
    }
    case 'drone':
      posts(ctx, v, o, o.bob ? 112 : o.y1 + 10, o.z + o.d * 0.4, o.z + o.d * 0.6);
      if (box(ctx, v, v.gate, o.x0, o.x1, o.y0, o.y1, o.z + o.d * 0.12, o.z + o.d * 0.88)) tape(ctx, v, face.h, pal.hazardDark, pal.hazardLight);
      break;
    case 'saw':
      disc(ctx, v, o, 22, 20);
      break;
    case 'roller':
      barrel(ctx, v, o, 17, 17);
      break;
    case 'missile': {
      const m = (o.x0 + o.x1) / 2;
      box(ctx, v, v.hazard, m - 9, m + 9, o.y0, o.y1, o.z, z1);
      ctx.globalAlpha *= 0.8;
      box(ctx, v, { front: pal.hazardLight, top: pal.hazardLight, side: pal.hazardLight }, m - 5, m + 5, o.y0 + 3, o.y1 - 3, z1, z1 + 26 + Math.sin(v.time * 50) * 8);
      break;
    }
    case 'field':
      ctx.globalAlpha *= 0.75;
      box(ctx, v, { front: pal.hazardLight, top: pal.hazardLight, side: pal.hazard }, o.x0, o.x1, 0, o.y1, o.z, z1);
      ctx.globalAlpha = clamp((FAR - o.z) / FADE, 0, 1) * v.fade;
      box(ctx, v, v.hazard, o.x0, o.x0 + 8, 0, 40, o.z, z1);
      box(ctx, v, v.hazard, o.x1 - 8, o.x1, 0, 40, o.z, z1);
      break;
  }
  ctx.globalAlpha = 1;
}

export function drawCoin(ctx, v, c) {
  if (c.z >= FAR || c.z <= NEAR) return;
  const k = v.F / c.z;
  const ph = c.ph || 0;
  const bob = Math.sin(v.time * 2 + ph * 0.3) * 0.6;
  const x = v.cx + (c.x - v.x) * k;
  const y = v.hy + (v.eye - c.up - bob) * k;
  const gy = v.hy + v.eye * k;
  const fade = clamp((FAR - c.z) / FADE, 0, 1) * v.fade;
  const spin = 0.6 + 0.4 * Math.abs(Math.cos(v.time * 1.5 + ph * 0.2));
  const r = 13 * k;
  ctx.globalAlpha = fade * clamp(0.32 - c.up / 400, 0.1, 0.32);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, gy, r * 0.8, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  const w = r * (0.25 + spin * 0.75);
  ctx.globalAlpha = fade * 0.14;
  ctx.fillStyle = v.pal.coin;
  ctx.beginPath();
  ctx.ellipse(x, y, w * 1.35, r * 1.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = fade;
  ctx.fillStyle = v.pal.coinDark;
  ctx.beginPath();
  ctx.ellipse(x, y, w, r, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(x - w, y - r, x + w, y + r);
  g.addColorStop(0, '#fff3b0');
  g.addColorStop(0.5, v.pal.coin);
  g.addColorStop(1, v.pal.coinDark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.84, r * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = v.pal.coinDark;
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.58, r * 0.6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = v.pal.coinDark;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.32);
  ctx.lineTo(x + w * 0.26, y);
  ctx.lineTo(x, y + r * 0.32);
  ctx.lineTo(x - w * 0.26, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = fade * 0.7 * spin;
  ctx.beginPath();
  ctx.ellipse(x - w * 0.45, y - r * 0.5, w * 0.12, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawRush(ctx, v, speed) {
  if (v.reduced || speed < 420) return;
  const strength = Math.min(0.2, ((speed - 420) / 340) * 0.2);
  const maxR = Math.hypot(v.w, v.h) * 0.6;
  ctx.strokeStyle = v.p.sun;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = strength;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + (i % 3) * 0.2;
    const t = (v.time * 1.4 + i * 0.37) % 1;
    const r0 = maxR * (0.45 + t * 0.4);
    const r1 = r0 + maxR * 0.12 * t;
    ctx.moveTo(v.cx + Math.cos(a) * r0, v.hy + Math.sin(a) * r0);
    ctx.lineTo(v.cx + Math.cos(a) * r1, v.hy + Math.sin(a) * r1);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}