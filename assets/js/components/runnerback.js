import { clamp, lerp, parseColor, tintColor, toCss } from '../core/utils.js';
import { drawHat, hatSpec } from './hats.js';

const TAU = Math.PI * 2;
const HIP = -16;
const SHOULDER = -27;
const TORSO_TOP = -30;
const FLIP_TIME = 0.42;

const mix = (c, to, t) => toCss(tintColor(parseColor(c), to, t));
const lighten = (c, t) => mix(c, [255, 255, 255, 1], t);
const darken = (c, t) => mix(c, [0, 0, 0, 1], t);
const ease = t => 1 - (1 - t) * (1 - t);

export function skinColors(p, look, time) {
  const skin = look.skin || {};
  const hue = (time * 90) % 360;
  return {
    body: skin.rainbow ? `hsl(${hue} 85% 58%)` : skin.runner || p.runner,
    dark: skin.rainbow ? `hsl(${hue} 75% 38%)` : skin.runnerDark || p.runnerDark,
    visor: skin.visor || p.visor,
    scarf: skin.rainbow ? `hsl(${(hue + 140) % 360} 90% 70%)` : skin.scarf || p.scarf
  };
}

function pill(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function dot(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function tri(ctx, x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
}

function stroke(ctx, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

// Every character is built from the same rig and then dressed with the things
// you can see from behind: ears, tails, antennae, packs and so on.
const SPECS = {
  'char:bot': {
    hw: 12.5,
    hh: 11,
    round: 0.38,
    headBehind(ctx, g) {
      ctx.fillStyle = g.c.dark;
      pill(ctx, -g.hw - 3.4, -4.5, 4.2, 9, 1.8);
      ctx.fill();
      pill(ctx, g.hw - 0.8, -4.5, 4.2, 9, 1.8);
      ctx.fill();
    },
    headOver(ctx, g) {
      stroke(ctx, g.c.dark, 1.4);
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(0, -g.hh + 2);
      ctx.lineTo(0, g.hh - 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = g.c.scarf;
      ctx.globalAlpha = 0.65 + Math.sin(g.time * 6) * 0.35;
      dot(ctx, 0, -g.hh + 5.5, 1.9);
      ctx.globalAlpha = 1;
      if (!g.hat) {
        stroke(ctx, g.c.dark, 2);
        ctx.beginPath();
        ctx.moveTo(0, -g.hh + 0.5);
        ctx.lineTo(0, -g.hh - 5);
        ctx.stroke();
        ctx.fillStyle = g.c.scarf;
        dot(ctx, 0, -g.hh - 6, 2.5);
      }
    },
    pack(ctx, g) {
      ctx.fillStyle = g.c.dark;
      pill(ctx, -7, -8, 14, 13, 3);
      ctx.fill();
      ctx.fillStyle = g.c.scarf;
      ctx.globalAlpha = 0.55 + Math.sin(g.time * 5) * 0.35;
      for (let i = 0; i < 3; i++) {
        pill(ctx, -4.5, -5 + i * 3.6, 9, 1.8, 0.9);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  },

  'char:ninja': {
    hw: 12.5,
    hh: 11.5,
    headOver(ctx, g) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0, g.hw, g.hh, 0, 0, TAU);
      ctx.clip();
      ctx.fillStyle = g.c.scarf;
      ctx.fillRect(-g.hw, -3.5, g.hw * 2, 6);
      ctx.restore();
      const t = g.time * 14;
      stroke(ctx, g.c.scarf, 3.4);
      for (const [dir, ph] of [[-1, 0], [1, 1.6]]) {
        ctx.beginPath();
        ctx.moveTo(dir * 1.5, 0);
        ctx.quadraticCurveTo(dir * (6 + g.k * 4), 4 + Math.sin(t + ph) * 2, dir * (10 + g.k * 7), 10 + Math.sin(t + ph + 1) * 3.5);
        ctx.stroke();
      }
      ctx.fillStyle = g.c.scarf;
      dot(ctx, 0, -0.5, 3.2);
    },
    pack(ctx, g) {
      stroke(ctx, g.c.dark, 3.4);
      ctx.beginPath();
      ctx.moveTo(-9, 7);
      ctx.lineTo(7, -12);
      ctx.stroke();
      stroke(ctx, g.c.scarf, 3);
      ctx.beginPath();
      ctx.moveTo(7, -12);
      ctx.lineTo(10, -16);
      ctx.stroke();
    }
  },

  'char:slime': { blob: 'slime' },
  'char:ghost': { blob: 'ghost' },
  'char:snowman': { blob: 'snowman' },

  'char:fox': {
    hw: 12,
    hh: 11.5,
    headBehind(ctx, g) {
      if (g.hat) return;
      ctx.fillStyle = g.c.body;
      tri(ctx, -g.hw + 0.5, -g.hh + 4, -g.hw + 3, -g.hh - 12, -g.hw + 11, -g.hh + 1);
      tri(ctx, g.hw - 0.5, -g.hh + 4, g.hw - 3, -g.hh - 12, g.hw - 11, -g.hh + 1);
      ctx.fillStyle = g.c.dark;
      ctx.globalAlpha = 0.45;
      tri(ctx, -g.hw + 3, -g.hh + 2, -g.hw + 4.2, -g.hh - 7, -g.hw + 8.5, -g.hh + 1);
      tri(ctx, g.hw - 3, -g.hh + 2, g.hw - 4.2, -g.hh - 7, g.hw - 8.5, -g.hh + 1);
      ctx.globalAlpha = 1;
    },
    tail(ctx, g) {
      const sw = Math.sin(g.time * 9) * 5;
      ctx.save();
      ctx.translate(sw * 0.5, 4);
      ctx.rotate(sw * 0.03);
      ctx.fillStyle = g.c.body;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7.5, 11, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = g.c.dark;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.ellipse(0, -3, 3.5, 7, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 7.5, 5.6, 4.8, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  },

  'char:astronaut': {
    hw: 13,
    hh: 12.5,
    headOver(ctx, g) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0, g.hw, g.hh, 0, 0, TAU);
      ctx.clip();
      ctx.fillStyle = g.c.dark;
      ctx.fillRect(-g.hw, g.hh - 4.5, g.hw * 2, 5);
      ctx.restore();
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.ellipse(-5, -5, 4, 2.2, -0.5, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (!g.hat) {
        stroke(ctx, g.c.dark, 2);
        ctx.beginPath();
        ctx.moveTo(-3, -g.hh + 0.5);
        ctx.lineTo(-3, -g.hh - 7);
        ctx.stroke();
        ctx.fillStyle = g.c.scarf;
        dot(ctx, -3, -g.hh - 8.5, 3);
      }
    },
    pack(ctx, g) {
      ctx.fillStyle = g.c.dark;
      pill(ctx, -10, -10, 20, 19, 4.5);
      ctx.fill();
      ctx.fillStyle = lighten(g.c.dark, 0.22);
      pill(ctx, -7, -7, 14, 7, 2.5);
      ctx.fill();
      ctx.fillStyle = g.c.scarf;
      pill(ctx, -6, 2, 5, 3.2, 1.2);
      ctx.fill();
      ctx.globalAlpha = 0.55 + Math.sin(g.time * 5) * 0.4;
      dot(ctx, 5.2, 3.6, 1.8);
      ctx.globalAlpha = 1;
    }
  },

  'char:frog': {
    hw: 14,
    hh: 10.5,
    headBehind(ctx, g) {
      for (const s of [-1, 1]) {
        ctx.fillStyle = g.c.body;
        dot(ctx, s * 8, -g.hh + 1.5, 5.8);
        ctx.fillStyle = lighten(g.c.body, 0.3);
        dot(ctx, s * 8, -g.hh - 0.4, 2.4);
      }
    },
    headOver(ctx, g) {
      ctx.fillStyle = g.c.dark;
      ctx.globalAlpha = 0.3;
      for (const [x, y, r] of [[-5, 0, 2.6], [4, -2, 2.2], [7, 3.5, 1.8]]) {
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.3, r, 0, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    pack(ctx, g) {
      ctx.fillStyle = g.c.dark;
      ctx.globalAlpha = 0.28;
      for (const [x, y, r] of [[-4, -4, 2.8], [4, 1, 2.4], [-3, 4, 1.8]]) dot(ctx, x, y, r);
      ctx.globalAlpha = 1;
    }
  },

  'char:cat': {
    hw: 12.5,
    hh: 11.5,
    headBehind(ctx, g) {
      if (g.hat) return;
      ctx.fillStyle = g.c.body;
      tri(ctx, -g.hw + 1, -g.hh + 3, -g.hw + 3.5, -g.hh - 10, -g.hw + 11, -g.hh + 1);
      tri(ctx, g.hw - 1, -g.hh + 3, g.hw - 3.5, -g.hh - 10, g.hw - 11, -g.hh + 1);
    },
    headOver(ctx, g) {
      ctx.fillStyle = g.c.dark;
      ctx.globalAlpha = 0.25;
      for (let i = -1; i <= 1; i++) ctx.fillRect(i * 5 - 1.2, -g.hh + 1, 2.4, 5);
      ctx.globalAlpha = 1;
    },
    tail(ctx, g) {
      const s = Math.sin(g.time * 9);
      stroke(ctx, g.c.body, 5);
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.bezierCurveTo(9 + s * 3, 3, 13 + s * 4, -7, 7 + s * 5, -15);
      ctx.stroke();
      stroke(ctx, g.c.dark, 5);
      ctx.beginPath();
      ctx.moveTo(8 + s * 4.6, -12.5);
      ctx.lineTo(7 + s * 5, -15);
      ctx.stroke();
    }
  },

  'char:dino': {
    hw: 12.5,
    hh: 11.5,
    headOver(ctx, g) {
      if (g.hat) return;
      ctx.fillStyle = g.c.dark;
      tri(ctx, -4.5, -g.hh + 2, 0, -g.hh - 7, 4.5, -g.hh + 2);
    },
    pack(ctx, g) {
      stroke(ctx, g.c.dark, 2.6);
      for (let i = 0; i < 3; i++) {
        const y = -9 + i * 6;
        ctx.beginPath();
        ctx.moveTo(-5.5, y + 3);
        ctx.lineTo(0, y - 2.2);
        ctx.lineTo(5.5, y + 3);
        ctx.stroke();
      }
    },
    tail(ctx, g) {
      const sw = Math.sin(g.time * 8) * 5;
      ctx.fillStyle = g.c.body;
      tri(ctx, -7, 0, 7, 0, sw, 15);
      ctx.fillStyle = g.c.dark;
      ctx.globalAlpha = 0.3;
      tri(ctx, -2.5, 3, 2.5, 3, sw * 0.9, 12);
      ctx.globalAlpha = 1;
    }
  },

  'char:alien': {
    hw: 14.5,
    hh: 12.5,
    tw: 20,
    headBehind(ctx, g) {
      if (g.hat) return;
      for (const s of [-1, 1]) {
        const bob = Math.sin(g.time * 6 + s) * 2;
        stroke(ctx, g.c.dark, 2);
        ctx.beginPath();
        ctx.moveTo(s * 5, -g.hh + 1);
        ctx.quadraticCurveTo(s * 7, -g.hh - 6, s * 10 + bob, -g.hh - 11);
        ctx.stroke();
        ctx.fillStyle = g.c.scarf;
        dot(ctx, s * 10 + bob, -g.hh - 12, 3);
      }
    },
    headOver(ctx, g) {
      ctx.fillStyle = g.c.dark;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.ellipse(0, 1, 4.5, 6, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  'char:penguin': {
    hw: 14,
    hh: 11.5,
    paint: c => ({ head: c.dark, torso: c.dark, arm: c.body, leg: '#fb923c', shoe: '#fb923c' }),
    wing: true,
    headOver(ctx, g) {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.14;
      ctx.beginPath();
      ctx.ellipse(-4, -4.5, 5, 2.4, -0.4, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    },
    tail(ctx, g) {
      const s = Math.sin(g.time * 14) * 2;
      ctx.fillStyle = g.c.dark;
      tri(ctx, -4.5, 0, 4.5, 0, s, 7);
    }
  },

  'char:duck': {
    hw: 14,
    hh: 12,
    paint: c => ({ head: c.body, torso: c.body, arm: c.body, leg: '#fb923c', shoe: '#fb923c' }),
    wing: true,
    headOver(ctx, g) {
      if (g.hat) return;
      stroke(ctx, g.c.body, 3);
      ctx.beginPath();
      ctx.moveTo(-1, -g.hh + 1);
      ctx.quadraticCurveTo(-4, -g.hh - 6, 2, -g.hh - 7);
      ctx.stroke();
    },
    tail(ctx, g) {
      const s = Math.sin(g.time * 12) * 1.5;
      ctx.fillStyle = g.c.body;
      tri(ctx, -7, 2, -4.5 + s, -5, -1.5, 2);
      tri(ctx, 1.5, 2, 4.5 - s, -5, 7, 2);
      ctx.fillStyle = g.c.dark;
      ctx.globalAlpha = 0.3;
      tri(ctx, -1.5, 2, 0, -6, 1.5, 2);
      ctx.globalAlpha = 1;
    }
  },

  'char:pig': {
    hw: 13.5,
    hh: 11.5,
    paint: c => ({ head: c.body, torso: c.body, arm: c.body, leg: c.dark, shoe: c.dark }),
    headBehind(ctx, g) {
      if (g.hat) return;
      ctx.fillStyle = g.c.dark;
      const flap = Math.sin(g.time * 10) * 1.2;
      tri(ctx, -10.5, -g.hh + 4, -9 - flap, -g.hh - 7, -3, -g.hh + 1);
      tri(ctx, 10.5, -g.hh + 4, 9 + flap, -g.hh - 7, 3, -g.hh + 1);
    },
    tail(ctx, g) {
      stroke(ctx, g.c.dark, 2.4);
      const w = Math.sin(g.time * 10) * 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.bezierCurveTo(5 + w, 4, 6 + w, -3, 1, -3);
      ctx.bezierCurveTo(-2, -3, -1, 0, 1.5, -0.5);
      ctx.stroke();
    }
  },

  'char:bear': {
    hw: 13.5,
    hh: 11.5,
    headBehind(ctx, g) {
      if (g.hat) return;
      ctx.fillStyle = g.c.body;
      for (const s of [-1, 1]) dot(ctx, s * 9, -g.hh + 1.6, 5.6);
      ctx.fillStyle = g.c.dark;
      ctx.globalAlpha = 0.35;
      for (const s of [-1, 1]) dot(ctx, s * 9, -g.hh + 1.6, 3);
      ctx.globalAlpha = 1;
    },
    tail(ctx, g) {
      ctx.fillStyle = g.c.body;
      dot(ctx, 0, 3.5, 4.6);
      ctx.fillStyle = g.c.dark;
      ctx.globalAlpha = 0.3;
      dot(ctx, 0, 4.5, 2.4);
      ctx.globalAlpha = 1;
    }
  },

  'char:bunny': {
    hw: 13.5,
    hh: 11.5,
    headBehind(ctx, g) {
      if (g.hat) return;
      const flop = Math.sin(g.time * 6) * 0.07 + g.lean * 0.1;
      for (const [x, a] of [[-5.5, -0.2], [5.5, 0.2]]) {
        ctx.save();
        ctx.translate(x, -g.hh + 3);
        ctx.rotate(a + flop - g.air * 0.25 * Math.sign(a));
        ctx.fillStyle = g.c.body;
        ctx.beginPath();
        ctx.ellipse(0, -11, 4.8, 12.5, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fbcfe8';
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.ellipse(0, -10, 1.6, 8.5, 0, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    },
    tail(ctx, g) {
      ctx.fillStyle = '#ffffff';
      dot(ctx, Math.sin(g.time * 12) * 1.5, 4, 5.6);
      ctx.fillStyle = '#cbd5e1';
      ctx.globalAlpha = 0.5;
      dot(ctx, 1, 6, 2.8);
      ctx.globalAlpha = 1;
    }
  },

  'char:panda': {
    hw: 13.5,
    hh: 11.5,
    paint: c => ({ head: '#f8fafc', torso: '#f8fafc', arm: c.dark, leg: c.dark, shoe: c.dark }),
    headBehind(ctx, g) {
      if (g.hat) return;
      ctx.fillStyle = g.c.dark;
      for (const s of [-1, 1]) dot(ctx, s * 9.5, -g.hh + 1.6, 5.4);
    },
    pack(ctx, g) {
      ctx.fillStyle = g.c.dark;
      pill(ctx, -11, -15, 22, 6.5, [6, 6, 1, 1]);
      ctx.fill();
    }
  },

  'char:owl': {
    hw: 14.5,
    hh: 12,
    wing: true,
    paint: c => ({ head: c.body, torso: c.body, arm: c.dark, leg: '#fb923c', shoe: '#fb923c' }),
    headBehind(ctx, g) {
      if (g.hat) return;
      ctx.fillStyle = g.c.dark;
      tri(ctx, -g.hw + 1.5, -g.hh + 5, -g.hw + 3, -g.hh - 8, -g.hw + 10, -g.hh + 1);
      tri(ctx, g.hw - 1.5, -g.hh + 5, g.hw - 3, -g.hh - 8, g.hw - 10, -g.hh + 1);
    },
    pack(ctx, g) {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.22;
      for (let r = 0; r < 3; r++) {
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.arc(i * 5.5 + (r % 2) * 2.7, -9 + r * 5.2, 2.6, 0, Math.PI);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
    tail(ctx, g) {
      ctx.fillStyle = g.c.dark;
      for (const a of [-0.45, 0, 0.45]) {
        ctx.save();
        ctx.translate(0, 0);
        ctx.rotate(a + Math.sin(g.time * 12) * 0.05);
        ctx.beginPath();
        ctx.ellipse(0, 6.5, 2.6, 6.5, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  },

  'char:cyclops': {
    hw: 13,
    hh: 12,
    headBehind(ctx, g) {
      if (g.hat) return;
      ctx.fillStyle = g.c.dark;
      tri(ctx, -10, -g.hh + 4, -6.5, -g.hh - 7, -2, -g.hh + 1);
      tri(ctx, 10, -g.hh + 4, 6.5, -g.hh - 7, 2, -g.hh + 1);
    },
    headOver(ctx, g) {
      ctx.fillStyle = g.c.dark;
      ctx.globalAlpha = 0.22;
      pill(ctx, -4.5, -2, 9, 7, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
};

const BASE = { hw: 12.5, hh: 11.5, round: 1, tw: 22, legs: true, wing: false };

const defaultPaint = c => ({ head: c.body, torso: c.body, arm: c.body, leg: c.dark, shoe: c.scarf });

// Each hand and leg is placed from a few numbers rather than a skeleton, so the
// run cycle, jump and roll can be blended together smoothly.
function armPose(side, za, g) {
  const sx = side * (g.tw / 2 - 0.5);
  const sy = SHOULDER;
  const u = (za + 1) / 2;
  let ex = sx + side * lerp(8.5, 6.5, u);
  let ey = sy + lerp(9, 7.5, u);
  let hx = sx + side * lerp(6.5, -0.5, u);
  let hy = sy + lerp(14.5, 4.5, u);

  if (g.air > 0) {
    const f = clamp((g.fall + 1) / 2, 0, 1);
    const jx = side * lerp(10.5, 16, f);
    const jy = lerp(-12, -1.5, f);
    ex = lerp(ex, sx + side * 8.5, g.air);
    ey = lerp(ey, sy + lerp(-2, 1.5, f), g.air);
    hx = lerp(hx, sx + jx, g.air);
    hy = lerp(hy, sy + jy, g.air);
  }
  if (g.roll > 0) {
    ex = lerp(ex, sx + side * 9, g.roll);
    ey = lerp(ey, sy + 4, g.roll);
    hx = lerp(hx, sx + side * 3, g.roll);
    hy = lerp(hy, sy + 8, g.roll);
  }
  if (g.lean !== 0) {
    // the arm on the outside of the turn flings out
    const out = clamp(side * g.lean, 0, 1) * (1 - g.roll);
    hx += side * out * 4.5;
    hy -= out * 5;
    ex += side * out * 2;
  }
  return { sx, sy, ex, ey, hx, hy };
}

function drawArm(ctx, side, za, g, color) {
  const a = armPose(side, za, g);
  if (g.spec.wing) {
    const dx = a.hx - a.sx;
    const dy = a.hy - a.sy;
    const len = Math.hypot(dx, dy);
    ctx.save();
    ctx.translate(a.sx, a.sy);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(len * 0.45, 0, len * 0.62 + 1.5, 4.4, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    return;
  }
  stroke(ctx, color, 5.8);
  ctx.beginPath();
  ctx.moveTo(a.sx, a.sy);
  ctx.lineTo(a.ex, a.ey);
  ctx.lineTo(a.hx, a.hy);
  ctx.stroke();
  ctx.fillStyle = lighten(color, 0.14);
  dot(ctx, a.hx, a.hy, 3.5);
}

function legPose(side, p, g) {
  const z = Math.cos(p);
  const lift = Math.max(0, -Math.sin(p));
  let fx = side * (5.6 + lift * 1.3);
  let fy = -lift * 10.5 - Math.max(0, z) * 3;
  if (g.air > 0) {
    const f = clamp(g.fall, 0, 1);
    const ax = side * lerp(4.6, 8.5, f);
    const ay = -lerp(side < 0 ? 6 : 11.5, 4, f);
    fx = lerp(fx, ax, g.air);
    fy = lerp(fy, ay, g.air);
  }
  if (g.roll > 0) {
    fx = lerp(fx, side * 7, g.roll);
    fy = lerp(fy, -2.5, g.roll);
  }
  return { fx, fy, z, lift: Math.max(0, -fy) / 10.5 };
}

function drawLeg(ctx, side, leg, hipY, g, c) {
  const hx = side * 5.6;
  const mx = (hx + leg.fx) / 2 + side * Math.min(3.5, leg.lift * 3);
  const my = (hipY + leg.fy) / 2;
  stroke(ctx, c.leg, 7.6);
  ctx.beginPath();
  ctx.moveTo(hx, hipY + 2);
  ctx.quadraticCurveTo(mx, my, leg.fx, leg.fy - 3.4);
  ctx.stroke();
  const s = 1 - leg.z * 0.05;
  const sh = 6.4 + leg.lift * 1.6;
  ctx.fillStyle = c.shoe;
  pill(ctx, leg.fx - 5.2 * s, leg.fy - sh, 10.4 * s, sh, [3.6, 3.6, 2, 2]);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.9;
  pill(ctx, leg.fx - 5.2 * s, leg.fy - 2.4 - leg.lift * 2, 10.4 * s, 2.4 + leg.lift * 2, 1.2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function headPath(ctx, hw, hh, round) {
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, hw * 2, hh * 2, lerp(3, Math.min(hw, hh), round));
}

function drawBlob(ctx, kind, g) {
  const { c } = g;
  const hop = Math.abs(Math.sin(g.phase));
  const run = 1 - g.air;
  let top = -34;
  if (kind === 'slime') {
    const sy = 1 + (hop - 0.5) * 0.16 * run + g.air * -g.fall * 0.08;
    const sx = 2 - sy;
    const y = -hop * 6 * run - g.air * 3;
    ctx.save();
    ctx.translate(0, y);
    ctx.scale(sx, sy);
    const wob = Math.sin(g.time * 2) * 1.2;
    ctx.fillStyle = c.body;
    pill(ctx, -16, -33 + wob, 32, 33 - wob, [16, 16, 7, 7]);
    ctx.fill();
    ctx.fillStyle = c.dark;
    ctx.globalAlpha = 0.28;
    pill(ctx, -16, -6, 32, 6, [0, 0, 7, 7]);
    ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-7, -25 + wob, 4.5, 2.8, -0.5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.2;
    for (const [x, yy, r] of [[5, -14, 3.2], [-4, -8, 2], [8, -22, 1.8]]) dot(ctx, x, yy, r);
    ctx.globalAlpha = 1;
    ctx.restore();
    top = -33 * sy + y + wob;
  } else if (kind === 'ghost') {
    const y = -7 - Math.sin(g.time * 5) * 2 - g.air * 2;
    ctx.save();
    ctx.translate(0, y);
    ctx.rotate(Math.sin(g.phase) * 0.04);
    const w = 28;
    ctx.fillStyle = c.body;
    pill(ctx, -w / 2, -38, w, 30, [14, 14, 0, 0]);
    ctx.fill();
    const n = 3;
    const sw = w / n;
    ctx.beginPath();
    ctx.moveTo(w / 2, -9);
    ctx.lineTo(w / 2, -8);
    for (let i = 0; i < n; i++) {
      const x1 = w / 2 - i * sw;
      const wob = Math.sin(g.time * 10 + i * 2) * 2.4;
      ctx.quadraticCurveTo(x1 - sw / 2, 0 + wob * 0.6, x1 - sw, -8);
    }
    ctx.lineTo(-w / 2, -9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.22;
    pill(ctx, -w / 2 + 5, -34, w - 14, 4, 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    for (const side of [-1, 1]) {
      const za = side < 0 ? Math.cos(g.phase) : -Math.cos(g.phase);
      ctx.fillStyle = lighten(c.body, 0.1);
      ctx.beginPath();
      ctx.ellipse(side * (w / 2 + 1), -17 + za * -2.5 - g.air * 6, 3.4, 5.4, side * 0.3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    top = -38 + y;
  } else {
    const sy = 1 + (hop - 0.5) * 0.08 * run;
    const y = -hop * 3 * run - g.air * 2;
    ctx.save();
    ctx.translate(0, y);
    ctx.scale(2 - sy, sy);
    const sw = Math.sin(g.phase) * 0.06;
    ctx.rotate(sw);
    for (const side of [-1, 1]) {
      const za = side < 0 ? Math.cos(g.phase) : -Math.cos(g.phase);
      const u = (za + 1) / 2;
      const air = g.air;
      const ox = side * lerp(13, 15, air);
      const oy = lerp(-16 - u * 6, -26, air);
      const tx = side * lerp(21 + (1 - u) * 3, 24, air);
      const ty = lerp(-22 - u * 8, -34, air);
      stroke(ctx, '#78350f', 2.6);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(tx, ty);
      ctx.moveTo((ox + tx) / 2, (oy + ty) / 2);
      ctx.lineTo(tx - side * 1, ty - 4.5);
      ctx.stroke();
    }
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, -11, 13.5, 11.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.ellipse(0, -4, 12, 4.5, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, -32, 11, 10.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(0, -26, 10, 3.6, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    const t = g.time * 14;
    ctx.fillStyle = c.scarf;
    pill(ctx, -11.5, -23.5, 23, 5, 2.5);
    ctx.fill();
    stroke(ctx, c.scarf, 4);
    for (const [dir, ph] of [[-1, 0], [1, 1.4]]) {
      ctx.beginPath();
      ctx.moveTo(dir * 3, -20);
      ctx.quadraticCurveTo(dir * (8 + g.k * 3), -15 + Math.sin(t + ph) * 1.5, dir * (11 + g.k * 6), -9 + Math.sin(t + ph + 1) * 3);
      ctx.stroke();
    }
    ctx.restore();
    top = -42.5 * sy + y;
  }
  return top;
}

export function drawRunnerBack(r, ctx, pal, speed, time, look = {}, lean = 0) {
  const c = skinColors(pal, look, time);
  const spec = { ...BASE, ...(SPECS[look.char] || SPECS['char:bot']) };
  const hat = !!look.hat && look.hat !== 'hat:none';
  const roll = clamp(r.vis, 0, 1.1);
  const air = clamp(r.airK, 0, 1) * (1 - Math.min(1, roll));
  const fall = clamp(r.vy / 800, -1, 1);
  const phase = r.clock;
  const k = Math.min(1, speed / 700);
  const g = { c, spec, time, phase, k, lean, air, fall, roll, hat, hw: spec.hw, hh: spec.hh, tw: spec.tw };
  const colors = (spec.paint || defaultPaint)(c);

  const run = 1 - air;
  const bob = 3 * Math.cos(phase) ** 2 * run * (1 - roll);
  const sway = Math.sin(phase) * 1.3 * run * (1 - roll);
  const tilt = Math.sin(phase) * 0.06 * run * (1 - roll) + lean * 0.08;
  const sx = (1 + r.squash * 0.45) * (1 + roll * 0.1);
  const sy = (1 - r.squash * 0.45) * lerp(1, 0.58, Math.min(1, roll));

  ctx.save();
  ctx.rotate(lean * 0.3);
  ctx.scale(sx, sy);
  if (r.flip >= 0) {
    const a = ease(clamp(r.flip / FLIP_TIME, 0, 1)) * TAU;
    ctx.translate(0, -24);
    ctx.rotate(a);
    ctx.translate(0, 24);
  }

  if (spec.blob) {
    const top = drawBlob(ctx, spec.blob, g);
    if (hat) {
      const info = hatSpec(look.hat);
      ctx.save();
      ctx.translate(0, top + 3.5);
      const s = spec.blob === 'snowman' ? 0.9 : 1.15;
      ctx.scale(s, s);
      drawHat(ctx, look.hat, { time, pose: 0, body: c.body, dark: c.dark, back: true, reach: info.reach });
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  const hipY = HIP - bob;
  const legs = [
    { side: -1, ...legPose(-1, phase, g) },
    { side: 1, ...legPose(1, phase + Math.PI, g) }
  ];
  legs.sort((a, b) => b.z - a.z);
  const arms = [
    { side: -1, za: -Math.cos(phase) },
    { side: 1, za: Math.cos(phase) }
  ];
  const far = a => a.za > 0.15 && air < 0.5 && roll < 0.5;

  for (const leg of legs) drawLeg(ctx, leg.side, leg, hipY, g, colors);

  ctx.save();
  ctx.translate(sway, -bob);
  ctx.translate(0, HIP);
  ctx.rotate(tilt);
  ctx.translate(0, -HIP);

  for (const a of arms) if (far(a)) drawArm(ctx, a.side, a.za, g, colors.arm);

  // torso
  const tw = spec.tw;
  ctx.fillStyle = colors.torso;
  pill(ctx, -tw / 2, TORSO_TOP, tw, 15.5, [7.5, 7.5, 4, 4]);
  ctx.fill();
  ctx.save();
  pill(ctx, -tw / 2, TORSO_TOP, tw, 15.5, [7.5, 7.5, 4, 4]);
  ctx.clip();
  ctx.fillStyle = darken(colors.torso, 0.18);
  ctx.globalAlpha = 0.6;
  ctx.fillRect(-tw / 2, -19.5, tw, 5);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#000';
  ctx.fillRect(-tw / 2, TORSO_TOP + 7, tw, 9);
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#fff';
  ctx.fillRect(-tw / 2 + 3, TORSO_TOP + 2, 3, 6);
  ctx.restore();
  ctx.globalAlpha = 1;

  if (spec.tail) {
    ctx.save();
    ctx.translate(0, HIP - 1);
    spec.tail(ctx, g);
    ctx.restore();
  }
  if (spec.pack) {
    ctx.save();
    ctx.translate(0, -22.5);
    spec.pack(ctx, g);
    ctx.restore();
  }

  // head
  const nod = Math.sin(phase * 2 - 0.8) * 0.7 * run;
  const headY = -37.5 - 1.6 * air * -Math.min(0, fall) + roll * 6 + nod;
  ctx.save();
  ctx.translate(-sway * 0.5, headY);
  ctx.rotate(-tilt * 1.6 + lean * 0.14);
  if (spec.headBehind) spec.headBehind(ctx, g);
  ctx.fillStyle = colors.head;
  headPath(ctx, spec.hw, spec.hh, spec.round);
  ctx.fill();
  ctx.save();
  headPath(ctx, spec.hw, spec.hh, spec.round);
  ctx.clip();
  ctx.fillStyle = '#000';
  ctx.globalAlpha = 0.1;
  ctx.fillRect(-spec.hw, spec.hh * 0.25, spec.hw * 2, spec.hh);
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-spec.hw * 0.4, -spec.hh * 0.55, 4.4, 2.2, -0.45, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
  if (spec.headOver) spec.headOver(ctx, g);
  if (hat) {
    ctx.save();
    ctx.translate(0, -spec.hh + 3.5);
    const s = clamp(spec.hw / 12.5, 0.9, 1.2);
    ctx.scale(s, s);
    drawHat(ctx, look.hat, { time, pose: 0, body: c.body, dark: c.dark, back: true });
    ctx.restore();
  }
  ctx.restore();

  for (const a of arms) if (!far(a)) drawArm(ctx, a.side, a.za, g, colors.arm);

  ctx.restore();
  ctx.restore();
}