import { clamp } from '../core/utils.js';
import { LANE_W } from './lanes.js';

export const NEAR = 8;
export const FAR = 1600;

const FADE = 700;
const ROAD_HALF = LANE_W * 1.5;
const PYLON_GAP = 220;
const STRIPE = 100;
const DASH = 60;

const face = { x: 0, y: 0, w: 0, h: 0 };

export function makeView() {
  return { w: 0, h: 0, cx: 0, hy: 0, F: 1, eye: 38, x: 0, p: null, pal: null, hazard: null, pylon: null, time: 0, scroll: 0, speed: 0, reduced: false };
}

export function makeColors(pal, p) {
  return {
    hazard: { front: pal.hazard, top: pal.hazardLight, side: pal.hazardDark },
    gate: { front: pal.hazardDark, top: pal.hazard, side: pal.hazardDark },
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
  } else if (v.x > x1) {
    ctx.beginPath();
    ctx.moveTo(ax1, ay1);
    ctx.lineTo(bx1, by1);
    ctx.lineTo(bx1, by0);
    ctx.lineTo(ax1, ay0);
    ctx.closePath();
    ctx.fill();
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
  ctx.fillStyle = c.front;
  ctx.fillRect(ax0, ay1, ax1 - ax0, ay0 - ay1);
  face.x = ax0;
  face.y = ay1;
  face.w = ax1 - ax0;
  face.h = ay0 - ay1;
  return true;
}

export function drawRoad(ctx, v) {
  const { p, w, h, hy } = v;
  ctx.fillStyle = p.ground;
  ctx.fillRect(-30, hy, w + 60, h - hy + 30);
  ctx.fillStyle = p.groundLine;
  ctx.fillRect(-30, hy, w + 60, 2);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ground(ctx, v, -ROAD_HALF, ROAD_HALF, NEAR, FAR);

  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  const shift = v.scroll % (STRIPE * 2);
  for (let z = -shift; z < FAR; z += STRIPE * 2) {
    if (z + STRIPE <= NEAR) continue;
    ground(ctx, v, -ROAD_HALF, ROAD_HALF, Math.max(z, NEAR), z + STRIPE);
  }

  ctx.fillStyle = p.groundLine;
  ctx.globalAlpha = 0.45;
  const dash = v.scroll % (DASH * 2);
  for (let z = -dash; z < FAR; z += DASH * 2) {
    if (z + DASH <= NEAR) continue;
    const a = Math.max(z, NEAR);
    ground(ctx, v, -LANE_W / 2 - 1.5, -LANE_W / 2 + 1.5, a, z + DASH);
    ground(ctx, v, LANE_W / 2 - 1.5, LANE_W / 2 + 1.5, a, z + DASH);
  }
  ctx.globalAlpha = 0.9;
  ground(ctx, v, -ROAD_HALF - 4, -ROAD_HALF, NEAR, FAR);
  ground(ctx, v, ROAD_HALF, ROAD_HALF + 4, NEAR, FAR);
  ctx.globalAlpha = 1;

  const haze = ctx.createLinearGradient(0, hy, 0, hy + (h - hy) * 0.16);
  haze.addColorStop(0, p.skyBottom);
  haze.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = haze;
  ctx.fillRect(-30, hy, w + 60, (h - hy) * 0.16);
  ctx.globalAlpha = 1;

  const px = ROAD_HALF + 46;
  const first = PYLON_GAP - (v.scroll % PYLON_GAP);
  const count = Math.floor((FAR - first) / PYLON_GAP);
  for (let i = count; i >= 0; i--) {
    const z = first + i * PYLON_GAP;
    ctx.globalAlpha = clamp((FAR - z) / FADE, 0, 1);
    box(ctx, v, v.pylon, px - 8, px + 8, 0, 56, z, z + 16);
    box(ctx, v, v.pylon, -px - 8, -px + 8, 0, 56, z, z + 16);
  }
  ctx.globalAlpha = 1;
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

export function drawObstacle(ctx, v, o) {
  if (o.z >= FAR) {
    if (o.kind === 'missile') warn(ctx, v, o);
    return;
  }
  if (o.z + o.d <= NEAR) return;
  ctx.globalAlpha = clamp((FAR - o.z) / FADE, 0, 1);
  const pal = v.pal;
  const z1 = o.z + o.d;
  switch (o.kind) {
    case 'crate':
    case 'wall':
      if (box(ctx, v, v.hazard, o.x0, o.x1, o.y0, o.y1, o.z, z1)) {
        ctx.strokeStyle = pal.hazardDark;
        ctx.lineWidth = clamp(face.w * 0.03, 1, 6);
        ctx.strokeRect(face.x + face.w * 0.14, face.y + face.h * 0.18, face.w * 0.72, face.h * 0.64);
      }
      break;
    case 'gate':
      if (box(ctx, v, v.gate, o.x0, o.x1, o.y0, o.y1, o.z, z1)) tape(ctx, v, (face.h * 20) / (o.y1 - o.y0), pal.hazardDark, pal.hazardLight);
      break;
    case 'spikes':
      spikes(ctx, v, o);
      break;
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
      disc(ctx, v, o, 17, 17);
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
      ctx.globalAlpha = clamp((FAR - o.z) / FADE, 0, 1);
      box(ctx, v, v.hazard, o.x0, o.x0 + 8, 0, 40, o.z, z1);
      box(ctx, v, v.hazard, o.x1 - 8, o.x1, 0, 40, o.z, z1);
      break;
  }
  ctx.globalAlpha = 1;
}

export function drawCoin(ctx, v, c) {
  if (c.z >= FAR || c.z <= NEAR) return;
  const k = v.F / c.z;
  const x = v.cx + (c.x - v.x) * k;
  const y = v.hy + (v.eye - c.up) * k;
  const spin = Math.abs(Math.cos(v.time * 4 + c.z * 0.01));
  ctx.globalAlpha = clamp((FAR - c.z) / FADE, 0, 1);
  ctx.fillStyle = v.pal.coin;
  ctx.strokeStyle = v.pal.coinDark;
  ctx.lineWidth = Math.max(1, 2 * k);
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(2, 9 * k * (0.3 + spin * 0.7)), 9 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
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