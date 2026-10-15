import { lerp } from '../core/utils.js';

const TAU = Math.PI * 2;

export const TRAITS = {
  'char:bot': { legs: true, scarf: (h, pose) => -h / 2 + lerp(13, 8, pose) },
  'char:ninja': { legs: true, scarf: (h, pose) => -h / 2 + lerp(7, 5, pose) },
  'char:slime': { legs: false, scarf: null },
  'char:fox': { legs: true, scarf: null },
  'char:ghost': { legs: false, scarf: null },
  'char:astronaut': { legs: true, scarf: null },
  'char:frog': { legs: true, scarf: null },
  'char:cat': { legs: true, scarf: null },
  'char:dino': { legs: true, scarf: null },
  'char:alien': { legs: true, scarf: null },
  'char:penguin': { legs: true, scarf: null }
};

export const traitsOf = id => TRAITS[id] || TRAITS['char:bot'];

function bodyPath(ctx, g, radius) {
  ctx.beginPath();
  ctx.roundRect(-g.w / 2, -g.h / 2, g.w, g.bodyH, radius);
}

function shine(ctx, g) {
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(-g.w / 2 + 5, -g.h / 2 + 4, g.w - 18, 4, 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function eye(ctx, x, y, r, pupil) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = pupil;
  ctx.beginPath();
  ctx.arc(x + r * 0.3, y + r * 0.1, r * 0.55, 0, TAU);
  ctx.fill();
}

const drawers = {
  'char:bot'(ctx, g) {
    const { w, h, pose } = g;
    ctx.fillStyle = g.body;
    bodyPath(ctx, g, lerp(11, 13, pose));
    ctx.fill();
    shine(ctx, g);
    const vw = 19;
    const vh = lerp(12, 9, pose);
    const vx = w / 2 - lerp(20, 22, pose);
    const vy = -h / 2 + lerp(9, 6, pose);
    ctx.fillStyle = g.visor;
    ctx.beginPath();
    ctx.roundRect(vx, vy, vw, vh, vh / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(vx + vw - 6.5, vy + vh * 0.4, lerp(2.2, 1.8, pose), 0, TAU);
    ctx.fill();
  },

  'char:slime'(ctx, g) {
    const { w, h, pose } = g;
    const wob = Math.sin(g.clock * 2) * 1.6 * (1 - pose);
    const r = lerp(17, 14, pose);
    ctx.fillStyle = g.body;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2 + wob, w, h - wob, [r, r, 6, 6]);
    ctx.fill();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = g.dark;
    ctx.beginPath();
    ctx.roundRect(-w / 2, h / 2 - 6, w, 6, [0, 0, 6, 6]);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-w / 2 + 8, -h / 2 + wob + 8, 4.5, 2.6, -0.5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    const ey = -h / 2 + wob + lerp(17, 13, pose);
    eye(ctx, w / 2 - 14, ey, 4.4, g.visor);
    eye(ctx, w / 2 - 4.5, ey, 4.4, g.visor);
  },

  'char:ninja'(ctx, g) {
    const { w, h, pose } = g;
    ctx.fillStyle = g.body;
    bodyPath(ctx, g, lerp(11, 13, pose));
    ctx.fill();
    ctx.save();
    bodyPath(ctx, g, lerp(11, 13, pose));
    ctx.clip();
    const band = -h / 2 + lerp(5, 3, pose);
    ctx.fillStyle = g.scarf;
    ctx.fillRect(-w / 2, band, w, 5);
    ctx.fillStyle = g.visor;
    ctx.fillRect(-w / 2, band + 7, w, lerp(10, 8, pose));
    ctx.restore();
    const ey = band + lerp(9.5, 8.5, pose);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(w / 2 - 17, ey, 7, 3.6, 1.8);
    ctx.roundRect(w / 2 - 8, ey, 7, 3.6, 1.8);
    ctx.fill();
  },

  'char:fox'(ctx, g) {
    const { w, h, pose } = g;
    const wag = Math.sin(g.time * 14) * 0.28;
    ctx.save();
    ctx.translate(-w / 2 + 2, -h / 2 + lerp(25, 17, pose));
    ctx.rotate(-0.55 + wag);
    ctx.fillStyle = g.body;
    ctx.beginPath();
    ctx.ellipse(-8, 0, 12, 6.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-16.5, 0, 4.5, 4.5, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    if (!g.hat) {
      const ears = [-w * 0.3, w * 0.1];
      for (const ex of ears) {
        ctx.fillStyle = g.body;
        ctx.beginPath();
        ctx.moveTo(ex - 2, -h / 2 + 4);
        ctx.lineTo(ex + 4, -h / 2 - 11);
        ctx.lineTo(ex + 11, -h / 2 + 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = g.dark;
        ctx.beginPath();
        ctx.moveTo(ex + 1.5, -h / 2 + 3);
        ctx.lineTo(ex + 4.5, -h / 2 - 6);
        ctx.lineTo(ex + 8, -h / 2 + 3);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.fillStyle = g.body;
    bodyPath(ctx, g, lerp(11, 13, pose));
    ctx.fill();
    shine(ctx, g);
    const my = -h / 2 + lerp(20, 15, pose);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(w / 2 - 6, my, 9, 6.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = g.visor;
    ctx.beginPath();
    ctx.arc(w / 2 - 1.5, my - 3, 2.6, 0, TAU);
    ctx.fill();
    const ey = -h / 2 + lerp(12, 8, pose);
    ctx.beginPath();
    ctx.arc(w / 2 - 12, ey, 2.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(w / 2 - 11.2, ey - 1, 0.9, 0, TAU);
    ctx.fill();
  },

  'char:ghost'(ctx, g) {
    const { w, h, pose } = g;
    const r = Math.min(w / 2, h * 0.55);
    const skirt = 8;
    ctx.fillStyle = g.body;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h - skirt, [r, r, 0, 0]);
    ctx.fill();
    const n = 3;
    const sw = w / n;
    const base = h / 2 - 5;
    ctx.beginPath();
    ctx.moveTo(w / 2, base - 4);
    ctx.lineTo(w / 2, base);
    for (let i = 0; i < n; i++) {
      const x1 = w / 2 - i * sw;
      const wob = Math.sin(g.time * 10 + i * 2) * 2.4;
      ctx.quadraticCurveTo(x1 - sw / 2, base + 7 + wob * 0.6, x1 - sw, base);
    }
    ctx.lineTo(-w / 2, base - 4);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 6, -h / 2 + 4, w - 20, 4, 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    const ey = -h / 2 + lerp(15, 10, pose);
    ctx.fillStyle = g.visor;
    ctx.beginPath();
    ctx.ellipse(w / 2 - 13, ey, 2.7, 3.8, 0, 0, TAU);
    ctx.ellipse(w / 2 - 5, ey, 2.7, 3.8, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w / 2 - 9, ey + 8, 2.4, 3, 0, 0, TAU);
    ctx.fill();
  },

  'char:astronaut'(ctx, g) {
    const { w, h, pose } = g;
    ctx.fillStyle = g.dark;
    ctx.beginPath();
    ctx.roundRect(-w / 2 - 6, -h / 2 + lerp(12, 8, pose), 10, lerp(18, 12, pose), 3);
    ctx.fill();
    if (!g.hat) {
      ctx.strokeStyle = g.dark;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-3, -h / 2 + 1);
      ctx.lineTo(-3, -h / 2 - 8);
      ctx.stroke();
      ctx.fillStyle = g.scarf;
      ctx.beginPath();
      ctx.arc(-3, -h / 2 - 9, 3, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = g.body;
    bodyPath(ctx, g, lerp(12, 13, pose));
    ctx.fill();
    shine(ctx, g);
    const vw = 24;
    const vh = lerp(17, 12, pose);
    const vx = w / 2 - lerp(27, 29, pose);
    const vy = -h / 2 + lerp(6, 4, pose);
    ctx.fillStyle = g.visor;
    ctx.beginPath();
    ctx.roundRect(vx, vy, vw, vh, Math.min(vh / 2, 8));
    ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(vx + 4, vy + 3, 8, 3, 1.5);
    ctx.fill();
    ctx.globalAlpha = 1;
  },
  'char:frog'(ctx, g) {
    const { w, h, pose } = g;
    ctx.fillStyle = g.body;
    bodyPath(ctx, g, lerp(13, 13, pose));
    ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(w / 2 - 12, -h / 2 + g.bodyH - 8, 12, 5.5, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    const ey = -h / 2 + lerp(3, 2, pose);
    eye(ctx, w / 2 - 17, ey, 6, g.visor);
    eye(ctx, w / 2 - 5, ey, 6, g.visor);
    ctx.strokeStyle = g.visor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(w / 2 - 10, -h / 2 + lerp(14, 11, pose), 8, 0.25, Math.PI - 0.25);
    ctx.stroke();
  },

  'char:cat'(ctx, g) {
    const { w, h, pose } = g;
    ctx.strokeStyle = g.body;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 3, -h / 2 + lerp(26, 18, pose));
    ctx.quadraticCurveTo(-w / 2 - 12, -h / 2 + 22 + Math.sin(g.time * 9) * 5, -w / 2 - 14, -h / 2 + 6 + Math.sin(g.time * 9 + 1) * 4);
    ctx.stroke();
    if (!g.hat) {
      for (const ex of [-w * 0.28, w * 0.08]) {
        ctx.fillStyle = g.body;
        ctx.beginPath();
        ctx.moveTo(ex - 1, -h / 2 + 4);
        ctx.lineTo(ex + 3, -h / 2 - 9);
        ctx.lineTo(ex + 11, -h / 2 + 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fda4af';
        ctx.beginPath();
        ctx.moveTo(ex + 2, -h / 2 + 3);
        ctx.lineTo(ex + 4, -h / 2 - 4);
        ctx.lineTo(ex + 8, -h / 2 + 3);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.fillStyle = g.body;
    bodyPath(ctx, g, lerp(12, 13, pose));
    ctx.fill();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = g.dark;
    for (let i = 0; i < 3; i++) ctx.fillRect(-w / 2 + 8 + i * 6, -h / 2, 2.5, 5);
    ctx.globalAlpha = 1;
    const ey = -h / 2 + lerp(12, 8, pose);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(w / 2 - 14, ey, 3.2, 4, 0, 0, TAU);
    ctx.ellipse(w / 2 - 5, ey, 3.2, 4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = g.visor;
    ctx.beginPath();
    ctx.ellipse(w / 2 - 14, ey, 1.2, 3.2, 0, 0, TAU);
    ctx.ellipse(w / 2 - 5, ey, 1.2, 3.2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fda4af';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 12, ey + 7);
    ctx.lineTo(w / 2 - 7, ey + 7);
    ctx.lineTo(w / 2 - 9.5, ey + 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 3, ey + 8);
    ctx.lineTo(w / 2 + 6, ey + 6);
    ctx.moveTo(w / 2 - 3, ey + 11);
    ctx.lineTo(w / 2 + 6, ey + 12);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },

  'char:dino'(ctx, g) {
    const { w, h, pose } = g;
    ctx.fillStyle = g.body;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 3, -h / 2 + lerp(14, 10, pose));
    ctx.lineTo(-w / 2 - 15, -h / 2 + lerp(26, 20, pose) + Math.sin(g.time * 8) * 3);
    ctx.lineTo(-w / 2 + 3, -h / 2 + lerp(28, 22, pose));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = g.dark;
    for (let i = 0; i < 3; i++) {
      const sx = -w / 2 + 6 + i * 8;
      ctx.beginPath();
      ctx.moveTo(sx, -h / 2 + 1);
      ctx.lineTo(sx + 4, -h / 2 - 7);
      ctx.lineTo(sx + 8, -h / 2 + 1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = g.body;
    bodyPath(ctx, g, lerp(11, 13, pose));
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(w / 2 - 6, -h / 2 + lerp(8, 5, pose), 12, lerp(15, 12, pose), 5);
    ctx.fill();
    shine(ctx, g);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(0, -h / 2 + g.bodyH - 7, 10, 4.5, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    eye(ctx, w / 2 - 8, -h / 2 + lerp(11, 8, pose), 3.6, g.visor);
    ctx.fillStyle = g.dark;
    ctx.beginPath();
    ctx.arc(w / 2 + 2, -h / 2 + lerp(13, 10, pose), 1.2, 0, TAU);
    ctx.fill();
  },

  'char:alien'(ctx, g) {
    const { w, h, pose } = g;
    if (!g.hat) {
      ctx.strokeStyle = g.dark;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (const ax of [-5, 6]) {
        const tilt = ax < 0 ? -4 : 4;
        ctx.beginPath();
        ctx.moveTo(ax, -h / 2 + 1);
        ctx.lineTo(ax + tilt, -h / 2 - 9);
        ctx.stroke();
        ctx.fillStyle = g.scarf;
        ctx.beginPath();
        ctx.arc(ax + tilt, -h / 2 - 10, 2.8, 0, TAU);
        ctx.fill();
      }
    }
    ctx.fillStyle = g.body;
    bodyPath(ctx, g, lerp(15, 13, pose));
    ctx.fill();
    shine(ctx, g);
    const ey = -h / 2 + lerp(14, 10, pose);
    ctx.fillStyle = g.visor;
    for (const ex of [w / 2 - 17, w / 2 - 6]) {
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(ex < w / 2 - 10 ? 0.35 : -0.35);
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.6, 7, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(w / 2 - 17, ey - 2.5, 1.2, 0, TAU);
    ctx.arc(w / 2 - 6, ey - 2.5, 1.2, 0, TAU);
    ctx.fill();
  },

  'char:penguin'(ctx, g) {
    const { w, h, pose, bodyH } = g;
    const top = -h / 2;
    ctx.fillStyle = g.dark;
    bodyPath(ctx, g, lerp(15, 13, pose));
    ctx.fill();

    ctx.save();
    bodyPath(ctx, g, lerp(15, 13, pose));
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(w / 2 - 11.5, top + bodyH * 0.54, lerp(9.5, 10, pose), bodyH * 0.42, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = g.body;
    ctx.beginPath();
    ctx.ellipse(-4, top + bodyH * 0.55, 4.6, lerp(10, 7.5, pose), 0.2 + Math.sin(g.time * 14) * 0.08, 0, TAU);
    ctx.fill();

    const ey = top + lerp(12, 8.5, pose);
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(w / 2 - 15, ey, 2.2, 0, TAU);
    ctx.arc(w / 2 - 8, ey, 2.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(w / 2 - 14.4, ey - 0.8, 0.7, 0, TAU);
    ctx.arc(w / 2 - 7.4, ey - 0.8, 0.7, 0, TAU);
    ctx.fill();

    const by = ey + 4.2;
    ctx.fillStyle = '#fb923c';
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 10.5, by);
    ctx.lineTo(w / 2 + 1.5, by + 1.4);
    ctx.lineTo(w / 2 - 10.5, by + 4.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
};

export function drawCharacter(ctx, id, g) {
  (drawers[id] || drawers['char:bot'])(ctx, g);
}