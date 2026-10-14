import { lerp } from '../core/utils.js';

const TAU = Math.PI * 2;

export const TRAITS = {
  'char:bot': { legs: true, scarf: (h, pose) => -h / 2 + lerp(13, 8, pose) },
  'char:ninja': { legs: true, scarf: (h, pose) => -h / 2 + lerp(7, 5, pose) },
  'char:slime': { legs: false, scarf: null },
  'char:fox': { legs: true, scarf: null },
  'char:ghost': { legs: false, scarf: null },
  'char:astronaut': { legs: true, scarf: null }
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
  }
};

export function drawCharacter(ctx, id, g) {
  (drawers[id] || drawers['char:bot'])(ctx, g);
}