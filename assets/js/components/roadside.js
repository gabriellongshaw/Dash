import { parseColor, tintColor, toCss } from '../core/utils.js';

const TAU = Math.PI * 2;
const cache = new Map();

function tone(c, night) {
  const key = `${c}|${Math.round(night * 16)}`;
  let out = cache.get(key);
  if (!out) {
    out = toCss(tintColor(parseColor(c), [8, 14, 34, 1], night * 0.55));
    if (cache.size > 600) cache.clear();
    cache.set(key, out);
  }
  return out;
}

function blob(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fill();
}

const KINDS = {
  building(ctx, o) {
    const w = 36 + o.r * 26;
    const h = 90 + o.r * 110;
    ctx.fillStyle = tone(o.c, o.n);
    ctx.fillRect(-w / 2, -h, w, h);
    ctx.fillStyle = tone('#000000', o.n * 0.2 + 0.6);
    ctx.globalAlpha = 0.18;
    ctx.fillRect(w / 2 - 7, -h, 7, h);
    ctx.globalAlpha = 1;
    const lit = o.n > 0.35 ? '#fde68a' : tone('#ffffff', o.n);
    ctx.fillStyle = lit;
    ctx.globalAlpha = o.n > 0.35 ? 0.9 : 0.4;
    for (let y = 10; y < h - 8; y += 14) {
      for (let x = -w / 2 + 6; x < w / 2 - 12; x += 11) {
        if (((x * 7 + y * 3 + o.r * 50) | 0) % 3 === 0) continue;
        ctx.fillRect(x, -h + y, 6, 7);
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = tone(o.c, o.n + 0.15);
    ctx.fillRect(-w / 2 - 2, -h - 3, w + 4, 4);
  },
  lamp(ctx, o) {
    ctx.strokeStyle = tone('#475569', o.n);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -82);
    ctx.quadraticCurveTo(0, -92, -12, -92);
    ctx.stroke();
    const glow = o.n > 0.3;
    if (glow) {
      ctx.fillStyle = o.c;
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(-13, -90, 20, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = glow ? o.c : tone('#e5e7eb', o.n);
    ctx.beginPath();
    ctx.ellipse(-13, -90, 6, 3.6, 0, 0, TAU);
    ctx.fill();
  },
  cactus(ctx, o) {
    const h = 55 + o.r * 40;
    ctx.fillStyle = tone(o.c, o.n);
    ctx.beginPath();
    ctx.roundRect(-6, -h, 12, h, 6);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-20, -h * 0.62, 6, h * 0.3, 3);
    ctx.roundRect(-20, -h * 0.4, 20, 6, 3);
    ctx.roundRect(14, -h * 0.74, 6, h * 0.34, 3);
    ctx.roundRect(0, -h * 0.46, 20, 6, 3);
    ctx.fill();
    ctx.fillStyle = tone('#ffffff', o.n);
    ctx.globalAlpha = 0.18;
    ctx.fillRect(-2, -h + 4, 2, h - 8);
    ctx.globalAlpha = 1;
  },
  rock(ctx, o) {
    const w = 26 + o.r * 24;
    const h = 24 + o.r * 26;
    ctx.fillStyle = tone(o.c, o.n);
    blob(ctx, [-w, 0, -w * 0.7, -h * 0.7, -w * 0.2, -h, w * 0.4, -h * 0.85, w * 0.9, -h * 0.3, w, 0]);
    ctx.fillStyle = tone('#000000', o.n);
    ctx.globalAlpha = 0.2;
    blob(ctx, [w * 0.2, 0, w * 0.4, -h * 0.85, w * 0.9, -h * 0.3, w, 0]);
    ctx.globalAlpha = 1;
  },
  mesa(ctx, o) {
    const w = 30 + o.r * 20;
    const h = 70 + o.r * 60;
    const bands = 4;
    for (let i = 0; i < bands; i++) {
      const y0 = -h + (h / bands) * i;
      const inset = i === 0 ? 2 : i === bands - 1 ? -3 : 0;
      ctx.fillStyle = tone(o.c, o.n + (i % 2) * 0.08);
      if (i % 2) ctx.globalAlpha = 0.86;
      ctx.fillRect(-w / 2 + inset, y0, w - inset * 2, h / bands + 0.5);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = tone('#000000', o.n);
    ctx.globalAlpha = 0.16;
    ctx.fillRect(w / 2 - 8, -h, 8, h);
    ctx.globalAlpha = 1;
  },
  pine(ctx, o) {
    const h = 80 + o.r * 50;
    ctx.fillStyle = tone('#5b3a1f', o.n);
    ctx.fillRect(-3, -14, 6, 14);
    for (let i = 0; i < 3; i++) {
      const y = -10 - i * h * 0.26;
      const w = (30 - i * 7) * (0.8 + o.r * 0.3);
      ctx.fillStyle = tone(o.c, o.n + i * 0.04);
      blob(ctx, [-w, y, 0, y - h * 0.42, w, y]);
      if (o.snow) {
        ctx.fillStyle = tone('#ffffff', o.n);
        blob(ctx, [-w * 0.55, y - h * 0.18, 0, y - h * 0.42, w * 0.55, y - h * 0.18]);
      }
    }
  },
  tree(ctx, o) {
    const h = 50 + o.r * 30;
    ctx.fillStyle = tone('#6b4423', o.n);
    ctx.fillRect(-4, -h * 0.6, 8, h * 0.6);
    ctx.fillStyle = tone(o.c, o.n);
    ctx.beginPath();
    ctx.arc(0, -h * 0.8, 24, 0, TAU);
    ctx.arc(-15, -h * 0.62, 17, 0, TAU);
    ctx.arc(15, -h * 0.62, 17, 0, TAU);
    ctx.fill();
    ctx.fillStyle = tone('#ffffff', o.n);
    ctx.globalAlpha = 0.14;
    ctx.beginPath();
    ctx.arc(-6, -h * 0.9, 12, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  },
  deadtree(ctx, o) {
    ctx.strokeStyle = tone(o.c, o.n);
    ctx.lineCap = 'round';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-4, -34, 2, -64);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-1, -34);
    ctx.lineTo(-18, -52);
    ctx.moveTo(1, -48);
    ctx.lineTo(16, -66);
    ctx.moveTo(2, -62);
    ctx.lineTo(-6, -80);
    ctx.stroke();
  },
  palm(ctx, o) {
    const h = 80 + o.r * 30;
    const lean = (o.r - 0.5) * 16;
    ctx.strokeStyle = tone('#8b5e34', o.n);
    ctx.lineCap = 'round';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(lean * 0.2, -h * 0.5, lean, -h);
    ctx.stroke();
    ctx.strokeStyle = tone(o.c, o.n);
    ctx.lineWidth = 5;
    const sway = Math.sin(o.t * 1.6 + o.r * 6) * 3;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI + (i / 4) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(lean, -h);
      ctx.quadraticCurveTo(lean + Math.cos(a) * 18, -h - 16 + sway * 0.4, lean + Math.cos(a) * 34, -h + 10 + Math.abs(Math.sin(a)) * -6 + sway);
      ctx.stroke();
    }
  },
  buoy(ctx, o) {
    ctx.fillStyle = tone('#64748b', o.n);
    ctx.fillRect(-2, -70, 4, 70);
    ctx.fillStyle = tone(o.c, o.n);
    ctx.beginPath();
    ctx.arc(0, -36, 16, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = tone('#ffffff', o.n);
    ctx.fillRect(-16, -42, 32, 6);
    ctx.fillStyle = tone(o.c, o.n);
    ctx.fillRect(-16, -36, 32, 8);
    ctx.fillStyle = o.n > 0.3 ? '#fde68a' : tone('#fde68a', o.n);
    ctx.beginPath();
    ctx.arc(0, -75, 4, 0, TAU);
    ctx.fill();
  },
  lollipop(ctx, o) {
    ctx.fillStyle = tone('#f8fafc', o.n);
    ctx.fillRect(-2.5, -70, 5, 70);
    ctx.fillStyle = tone(o.c, o.n);
    ctx.beginPath();
    ctx.arc(0, -82, 22, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = tone('#ffffff', o.n);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -82, 6, 0, TAU * 0.85);
    ctx.arc(0, -82, 14, 0, TAU * 0.85);
    ctx.stroke();
  },
  cane(ctx, o) {
    ctx.lineCap = 'round';
    ctx.lineWidth = 9;
    ctx.strokeStyle = tone('#ffffff', o.n);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -64);
    ctx.arc(-12, -64, 12, 0, -Math.PI, true);
    ctx.stroke();
    ctx.strokeStyle = tone(o.c, o.n);
    ctx.lineWidth = 9;
    ctx.setLineDash([7, 9]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -64);
    ctx.arc(-12, -64, 12, 0, -Math.PI, true);
    ctx.stroke();
    ctx.setLineDash([]);
  },
  spire(ctx, o) {
    const h = 80 + o.r * 70;
    const w = 20 + o.r * 12;
    ctx.fillStyle = tone(o.c, o.n);
    blob(ctx, [-w, 0, -w * 0.5, -h * 0.55, -w * 0.1, -h, w * 0.3, -h * 0.6, w, 0]);
    ctx.fillStyle = tone('#000000', o.n);
    ctx.globalAlpha = 0.25;
    blob(ctx, [w * 0.1, 0, -w * 0.1, -h, w * 0.3, -h * 0.6, w, 0]);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 2.4;
    ctx.globalAlpha = 0.65 + Math.sin(o.t * 3 + o.r * 9) * 0.3;
    ctx.beginPath();
    ctx.moveTo(-w * 0.4, -4);
    ctx.lineTo(-w * 0.1, -h * 0.3);
    ctx.lineTo(-w * 0.25, -h * 0.55);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
  asteroid(ctx, o) {
    const bob = Math.sin(o.t * 1.2 + o.r * 8) * 5;
    const w = 20 + o.r * 18;
    ctx.save();
    ctx.translate(0, -50 - o.r * 50 + bob);
    ctx.rotate(o.t * 0.15 + o.r * 5);
    ctx.fillStyle = tone(o.c, o.n);
    blob(ctx, [-w, 2, -w * 0.6, -w * 0.8, w * 0.2, -w, w * 0.9, -w * 0.3, w * 0.8, w * 0.6, -w * 0.2, w * 0.9]);
    ctx.fillStyle = tone('#000000', o.n);
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.arc(-w * 0.2, -w * 0.1, w * 0.25, 0, TAU);
    ctx.arc(w * 0.35, w * 0.25, w * 0.16, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  },
  crystal(ctx, o) {
    const n = 3;
    for (let i = 0; i < n; i++) {
      const h = (40 + o.r * 40) * (i === 1 ? 1.45 : 0.85);
      const x = (i - 1) * 13;
      const w = 8 + (i === 1 ? 4 : 0);
      ctx.fillStyle = tone(o.c, o.n);
      ctx.globalAlpha = 0.92;
      blob(ctx, [x - w, 0, x - w * 0.8, -h * 0.7, x, -h, x + w * 0.8, -h * 0.7, x + w, 0]);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.3;
      blob(ctx, [x - w, 0, x - w * 0.8, -h * 0.7, x, -h, x - 1, -h * 0.3]);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = o.c;
    ctx.globalAlpha = 0.12 + (o.n > 0.3 ? 0.14 : 0);
    ctx.beginPath();
    ctx.ellipse(0, -30, 34, 40, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  },
  neon(ctx, o) {
    const h = 90 + o.r * 90;
    const w = 24;
    ctx.fillStyle = tone('#0b1020', o.n * 0.3);
    ctx.fillRect(-w / 2, -h, w, h);
    ctx.shadowColor = o.c;
    ctx.shadowBlur = 8;
    ctx.fillStyle = o.c;
    ctx.fillRect(-w / 2, -h, 3, h);
    ctx.fillRect(w / 2 - 3, -h, 3, h);
    for (let y = 18; y < h - 10; y += 22) {
      if (((y + o.r * 40) | 0) % 2) ctx.fillRect(-w / 2 + 3, -h + y, w - 6, 3);
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = o.c;
    ctx.globalAlpha = 0.9 - (Math.sin(o.t * 6 + o.r * 20) > 0.92 ? 0.6 : 0);
    ctx.fillRect(-w / 2 - 3, -h - 4, w + 6, 4);
    ctx.globalAlpha = 1;
  },
  code(ctx, o) {
    const h = 80 + o.r * 110;
    ctx.fillStyle = tone('#041a0c', o.n * 0.2);
    ctx.fillRect(-10, -h, 20, h);
    ctx.fillStyle = o.c;
    for (let y = 0; y < h; y += 9) {
      const on = Math.sin(o.t * 4 + y * 0.3 + o.r * 30) > -0.2;
      ctx.globalAlpha = on ? 0.35 + ((y * 7 + o.r * 90) % 5) * 0.12 : 0.1;
      ctx.fillRect(-7, -h + y, 5, 6);
      ctx.fillRect(1, -h + y + 3, 5, 6);
    }
    ctx.globalAlpha = 1;
  },
  flowers(ctx, o) {
    for (let i = -2; i <= 2; i++) {
      const h = 36 + ((i * 17 + o.r * 40) % 18);
      ctx.strokeStyle = tone('#4d7c0f', o.n);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(i * 6, 0);
      ctx.lineTo(i * 6 + i, -h);
      ctx.stroke();
      ctx.fillStyle = tone(o.c, o.n);
      ctx.beginPath();
      ctx.ellipse(i * 6 + i, -h - 6, 3.4, 9, 0, 0, TAU);
      ctx.fill();
    }
  },
  acacia(ctx, o) {
    const h = 60 + o.r * 30;
    ctx.strokeStyle = tone('#6b4423', o.n);
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-5, -h * 0.5, 0, -h);
    ctx.stroke();
    ctx.fillStyle = tone(o.c, o.n);
    ctx.beginPath();
    ctx.ellipse(0, -h - 4, 34, 10, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = tone('#ffffff', o.n);
    ctx.beginPath();
    ctx.ellipse(-6, -h - 7, 20, 4, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  },
  ice(ctx, o) {
    const w = 20 + o.r * 16;
    const h = 30 + o.r * 26;
    ctx.fillStyle = tone(o.c, o.n);
    ctx.globalAlpha = 0.9;
    blob(ctx, [-w, 0, -w * 0.7, -h * 0.8, -w * 0.1, -h, w * 0.6, -h * 0.7, w, 0]);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.35;
    blob(ctx, [-w * 0.7, -h * 0.1, -w * 0.5, -h * 0.7, -w * 0.1, -h * 0.9, -w * 0.15, -h * 0.2]);
    ctx.globalAlpha = 1;
  },
  pylon(ctx, o) {
    const h = 120 + o.r * 40;
    ctx.strokeStyle = tone('#475569', o.n);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(0, -h);
    ctx.lineTo(16, 0);
    ctx.moveTo(-11, -h * 0.3);
    ctx.lineTo(11, -h * 0.3);
    ctx.moveTo(-6, -h * 0.62);
    ctx.lineTo(6, -h * 0.62);
    ctx.moveTo(-26, -h * 0.82);
    ctx.lineTo(26, -h * 0.82);
    ctx.stroke();
    if (Math.sin(o.t * 5 + o.r * 30) > 0.8) {
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(26, -h * 0.82);
      ctx.lineTo(34, -h * 0.55);
      ctx.lineTo(28, -h * 0.5);
      ctx.lineTo(38, -h * 0.2);
      ctx.stroke();
    }
  }
};

const SETS = {
  'world:skyline': [['building', ['#6fb89a', '#8fc9b0', '#5aa387']], ['lamp', ['#fde68a']], ['building', ['#79c2a4', '#4f9c80']]],
  'world:desert': [['cactus', ['#4d8f3a', '#5da04a']], ['rock', ['#b8864b', '#a37440']], ['cactus', ['#4d8f3a']], ['mesa', ['#d98f4e']]],
  'world:arctic': [['pine', ['#2f6f5e', '#3b8070'], { snow: true }], ['ice', ['#a5e8f7', '#7dd3fc']], ['pine', ['#2f6f5e'], { snow: true }]],
  'world:neon': [['neon', ['#22d3ee', '#f472b6', '#a78bfa']], ['lamp', ['#f472b6']], ['neon', ['#22d3ee', '#facc15']]],
  'world:volcano': [['spire', ['#3b2320', '#4a2b27']], ['rock', ['#4a2b27']], ['spire', ['#2f1b1a']]],
  'world:forest': [['pine', ['#1f6f3a', '#2b8a47']], ['tree', ['#2e9a4d', '#3fae5c']], ['tree', ['#237a40']], ['flowers', ['#f472b6', '#fde047']]],
  'world:ocean': [['palm', ['#22a06b', '#2dbd7e']], ['buoy', ['#ef4444', '#f97316']], ['palm', ['#1f9a63']]],
  'world:candy': [['lollipop', ['#f472b6', '#60a5fa', '#a78bfa', '#fb923c']], ['cane', ['#ef4444', '#ec4899']], ['lollipop', ['#34d399', '#facc15']]],
  'world:space': [['asteroid', ['#6b7280', '#7c6f8a', '#5b6475']], ['crystal', ['#a78bfa', '#60a5fa']], ['asteroid', ['#6b7280']]],
  'world:sunset': [['palm', ['#1f8a6a', '#0f766e']], ['lamp', ['#fbbf24']], ['palm', ['#157a5c']], ['building', ['#7c3a62', '#a14a6c']]],
  'world:canyon': [['mesa', ['#c2693a', '#b45a30']], ['rock', ['#9a5530']], ['cactus', ['#4d8f3a']], ['mesa', ['#d9824a']]],
  'world:swamp': [['deadtree', ['#4a3b2a', '#3b2f22']], ['tree', ['#4a7a3a', '#3f6a30']], ['deadtree', ['#3b2f22']], ['flowers', ['#a3e635', '#65a30d']]],
  'world:matrix': [['code', ['#22c55e', '#4ade80', '#16a34a']], ['building', ['#0b3d1e', '#0f5a2c']], ['code', ['#22c55e']]],
  'world:lavender': [['flowers', ['#a78bfa', '#c084fc', '#e879f9']], ['tree', ['#9d7be0', '#b794f4']], ['flowers', ['#a78bfa']], ['lamp', ['#f0abfc']]],
  'world:storm': [['pylon', ['#475569']], ['rock', ['#475569', '#334155']], ['pylon', ['#475569']], ['spire', ['#334155']]],
  'world:savanna': [['acacia', ['#5f8a2c', '#6b9a34']], ['rock', ['#a8844a']], ['acacia', ['#557a28']], ['mesa', ['#b8893f']]],
  'world:crystal': [['crystal', ['#38bdf8', '#a78bfa', '#f472b6', '#34d399']], ['crystal', ['#38bdf8', '#a78bfa']], ['rock', ['#334155']]]
};

export const propsFor = id => SETS[id] || SETS['world:skyline'];

export function drawProp(ctx, entry, o) {
  const [kind, colors, opts] = entry;
  const draw = KINDS[kind];
  if (!draw) return;
  o.c = colors[Math.floor(o.r * 997) % colors.length];
  o.snow = !!(opts && opts.snow);
  draw(ctx, o);
}