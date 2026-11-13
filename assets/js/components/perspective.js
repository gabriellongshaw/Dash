import { clamp, mixColor, parseColor, toCss } from '../core/utils.js';
import { LANE_W } from './lanes.js';
import { drawProp, propsFor } from './roadside.js';
import { shade, texture } from './textures.js';

export const NEAR = 8;
export const FAR = 2800;

const FADE = 1100;
const PROP_FADE = 1100;
const ROAD_FAR = 80000;
const SLEEPER = 38;
const ROAD_HALF = LANE_W * 1.5;
const PROP_ROWS = [
  { off: 150, gap: 190, salt: 977 },
  { off: 48, gap: 130, salt: 0 }
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

function box(ctx, v, c, x0, x1, y0, y1, z0, z1) {
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
    texture(ctx, 'brushed', ax0, ay1, ka * 0.3, 0.5);
  } else if (v.x > x1) {
    ctx.beginPath();
    ctx.moveTo(ax1, ay1);
    ctx.lineTo(bx1, by1);
    ctx.lineTo(bx1, by0);
    ctx.lineTo(ax1, ay0);
    ctx.closePath();
    ctx.fill();
    shade(ctx, ax1, 0, bx1, 0, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.32)');
    texture(ctx, 'brushed', ax1, ay1, ka * 0.3, 0.5);
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
    texture(ctx, 'grain', ax0, ay1, ka * 0.3, 0.5);
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
  texture(ctx, 'grain', ax0, ay1, ka * 0.3, 0.55);
  face.x = ax0;
  face.y = ay1;
  face.w = ax1 - ax0;
  face.h = ay0 - ay1;
  return true;
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

  const set = v.props || propsFor(null);
  const o = { r: 0, c: '', n: v.night, t: v.time, snow: false };
  for (const row of PROP_ROWS) {
    const first = row.gap - (v.scroll % row.gap);
    const base = Math.floor(v.scroll / row.gap) + 1;
    for (let j = Math.floor((FAR - first) / row.gap); j >= 0; j--) {
      const z = first + j * row.gap;
      if (z < 50) continue;
      const k = v.F / z;
      const alpha = clamp((FAR - z) / PROP_FADE, 0, 1);
      for (let side = -1; side <= 1; side += 2) {
        const hsh = hash((base + j) * 2 + (side > 0 ? 1 : 0) + row.salt);
        const x = side * (ROAD_HALF + row.off + (hsh % 41));
        const sx = v.cx + (x - v.x) * k;
        if (sx < -160 * k - 60 || sx > v.w + 160 * k + 60) continue;
        o.r = ((hsh >>> 8) % 1000) / 1000;
        ctx.save();
        ctx.translate(sx, v.hy + v.eye * k);
        ctx.scale(k, k);
        ctx.globalAlpha = alpha;
        drawProp(ctx, set[(hsh >>> 3) % set.length], o);
        ctx.restore();
      }
    }
  }
  ctx.globalAlpha = 1;
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
  const x = v.cx + ((o.x0 + o.x1) / 2 - v.x) * k;
  const y = v.hy + (v.eye - lift) * k;
  const r = radius * k;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-o.spin);
  ctx.fillStyle = v.pal.hazardDark;
  ctx.beginPath();
  if (o.kind === 'saw') {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a + 0.2) * r * 0.7, Math.sin(a + 0.2) * r * 0.7);
      ctx.lineTo(Math.cos(a + 0.42) * r * 0.7, Math.sin(a + 0.42) * r * 0.7);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = v.pal.hazard;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.66, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = v.pal.hazard;
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = v.pal.hazardDark;
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.9, -r * 0.3);
      ctx.lineTo(r * 0.9, r * 0.3);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.fillStyle = v.pal.hazardLight;
  ctx.globalAlpha *= 0.6;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function barrel(ctx, v, o, radius, lift) {
  const z = Math.max(o.z + o.d / 2, NEAR);
  const k = v.F / z;
  const x = v.cx + ((o.x0 + o.x1) / 2 - v.x) * k;
  const y = v.hy + (v.eye - lift) * k;
  const hw = ((o.x1 - o.x0) / 2) * k;
  const r = radius * k;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x - hw, y - r, hw * 2, r * 2, Math.min(r * 0.45, hw));
  ctx.clip();
  ctx.fillStyle = v.pal.hazard;
  ctx.fillRect(x - hw, y - r, hw * 2, r * 2);
  ctx.fillStyle = v.pal.hazardDark;
  const bands = 6;
  for (let i = 0; i < bands; i++) {
    const a = o.spin + (i / bands) * Math.PI * 2;
    const c = Math.cos(a % (Math.PI * 2));
    if (c <= 0) continue;
    const t = r * 0.2 * c;
    ctx.fillRect(x - hw, y + Math.sin(a) * r - t / 2, hw * 2, t);
  }
  const g = ctx.createLinearGradient(0, y - r, 0, y + r);
  g.addColorStop(0, 'rgba(255,255,255,0.28)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = g;
  ctx.fillRect(x - hw, y - r, hw * 2, r * 2);
  ctx.restore();
  ctx.strokeStyle = v.pal.hazardDark;
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.roundRect(x - hw, y - r, hw * 2, r * 2, Math.min(r * 0.45, hw));
  ctx.stroke();
}

function spikes(ctx, v, o) {
  box(ctx, v, v.hazard, o.x0, o.x1, 0, 4, o.z, o.z + o.d);
  ctx.fillStyle = v.pal.hazard;
  for (const t of [0.75, 0.25]) {
    const z = o.z + o.d * t;
    if (z <= NEAR) continue;
    const k = v.F / z;
    const base = v.hy + v.eye * k;
    const apex = v.hy + (v.eye - 24) * k;
    ctx.beginPath();
    for (let a = o.a; a <= o.b; a++) {
      for (let i = -1; i <= 1; i++) {
        const x = v.cx + (a * LANE_W + i * LANE_W * 0.28 - v.x) * k;
        ctx.moveTo(x - 9 * k, base);
        ctx.lineTo(x, apex);
        ctx.lineTo(x + 9 * k, base);
      }
    }
    ctx.fill();
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
  if (o.kind === 'drone') {
    x0 = m - 20;
    x1 = m + 20;
  } else if (o.kind === 'missile') {
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
  ctx.fillStyle = o.kind === 'drone' || o.kind === 'gate' || o.kind === 'missile' ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.3)';
  ground(ctx, v, x0 - 3, x1 + 3, o.z - 3, o.z + o.d + 3);
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
  switch (o.kind) {
    case 'crate':
    case 'wall':
      if (box(ctx, v, v.hazard, o.x0, o.x1, o.y0, o.y1, o.z, z1)) {
        const { x, y, w, h } = face;
        ctx.strokeStyle = pal.hazardDark;
        ctx.lineWidth = clamp(w * 0.03, 1, 6);
        ctx.strokeRect(x + w * 0.08, y + h * 0.08, w * 0.84, h * 0.84);
        ctx.beginPath();
        ctx.moveTo(x + w * 0.08, y + h * 0.08);
        ctx.lineTo(x + w * 0.92, y + h * 0.92);
        ctx.moveTo(x + w * 0.92, y + h * 0.08);
        ctx.lineTo(x + w * 0.08, y + h * 0.92);
        ctx.stroke();
        ctx.fillStyle = pal.hazardLight;
        ctx.globalAlpha *= 0.35;
        ctx.fillRect(x, y, w, Math.max(2, h * 0.07));
        ctx.globalAlpha /= 0.35;
        ctx.fillStyle = pal.hazardDark;
        const rv = Math.max(1.5, w * 0.035);
        for (const [cx, cy] of [[0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]]) {
          ctx.beginPath();
          ctx.arc(x + w * cx, y + h * cy, rv, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = pal.hazardDark;
        ctx.lineWidth = Math.max(1, w * 0.012);
        ctx.strokeRect(x, y, w, h);
      }
      break;
    case 'gate':
      if (box(ctx, v, v.gate, o.x0, o.x1, o.y0, o.y1, o.z, z1)) tape(ctx, v, (face.h * 20) / (o.y1 - o.y0), pal.hazardDark, pal.hazardLight);
      break;
    case 'spikes':
      spikes(ctx, v, o);
      break;
    case 'train': {
      const drewFront = box(ctx, v, v.train, o.x0, o.x1, o.y0, o.y1, o.z, z1);
      trainSide(ctx, v, o, z1);
      if (drewFront) {
        const { x, y, w, h } = face;
        ctx.fillStyle = pal.hazardLight;
        ctx.fillRect(x + w * 0.12, y + h * 0.14, w * 0.33, h * 0.27);
        ctx.fillRect(x + w * 0.55, y + h * 0.14, w * 0.33, h * 0.27);
        ctx.fillStyle = pal.hazard;
        ctx.fillRect(x, y + h * 0.58, w, h * 0.1);
        ctx.fillStyle = '#fff4b8';
        ctx.beginPath();
        ctx.arc(x + w * 0.22, y + h * 0.84, w * 0.07, 0, Math.PI * 2);
        ctx.arc(x + w * 0.78, y + h * 0.84, w * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = Math.max(1, w * 0.02);
        ctx.strokeRect(x, y, w, h);
      }
      break;
    }
    case 'drone': {
      const m = (o.x0 + o.x1) / 2;
      if (box(ctx, v, v.hazard, m - 20, m + 20, o.y0, o.y1, o.z, z1)) {
        ctx.fillStyle = pal.hazardLight;
        ctx.fillRect(face.x + face.w * 0.2, face.y + face.h * 0.3, face.w * 0.18, face.h * 0.34);
        ctx.fillRect(face.x + face.w * 0.62, face.y + face.h * 0.3, face.w * 0.18, face.h * 0.34);
      }
      box(ctx, v, v.gate, m - 32, m + 32, o.y1, o.y1 + 3, o.z + o.d * 0.3, o.z + o.d * 0.7);
      break;
    }
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
  const bob = Math.sin(v.time * 3 + ph * 2) * 1.5;
  const x = v.cx + (c.x - v.x) * k;
  const y = v.hy + (v.eye - c.up - bob) * k;
  const gy = v.hy + v.eye * k;
  const fade = clamp((FAR - c.z) / FADE, 0, 1) * v.fade;
  const spin = Math.abs(Math.cos(v.time * 4 + ph));
  const r = 13 * k;
  ctx.globalAlpha = fade * clamp(0.32 - c.up / 400, 0.1, 0.32);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, gy, r * 0.8, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  const w = Math.max(r * 0.3, r * (0.25 + spin * 0.75));
  ctx.globalAlpha = fade * 0.22;
  ctx.fillStyle = v.pal.coin;
  ctx.beginPath();
  ctx.ellipse(x, y, w * 1.7, r * 1.7, 0, 0, Math.PI * 2);
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