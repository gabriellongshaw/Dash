let grain = null;
let brushed = null;

function make(w, h, paint) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d'), w, h);
  return c;
}

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function grainCanvas() {
  return make(96, 96, (g, w, h) => {
    const r = seeded(7);
    for (let i = 0; i < 520; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.45)';
      const s = r() < 0.15 ? 2 : 1;
      g.fillRect(Math.floor(r() * w), Math.floor(r() * h), s, s);
    }
  });
}

function brushedCanvas() {
  return make(96, 48, (g, w, h) => {
    const r = seeded(31);
    for (let y = 0; y < h; y++) {
      g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
      g.fillRect(0, y, w, 1);
    }
    for (let i = 0; i < 70; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
      g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 6 + Math.floor(r() * 18), 1);
    }
  });
}

const patterns = new WeakMap();

function patternFor(ctx, name) {
  if (!grain) {
    grain = grainCanvas();
    brushed = brushedCanvas();
  }
  const src = name === 'brushed' ? brushed : grain;
  if (!src) return null;
  let map = patterns.get(ctx);
  if (!map) {
    map = {};
    patterns.set(ctx, map);
  }
  if (!map[name]) map[name] = ctx.createPattern(src, 'repeat');
  return map[name];
}

export function texture(ctx, name, ox, oy, scale, alpha) {
  const pat = patternFor(ctx, name);
  if (!pat || !(scale > 0.001)) return;
  scale = Math.min(scale, 0.7);
  if (pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix().translate(ox, oy).scale(scale));
  const was = ctx.globalAlpha;
  ctx.globalAlpha = was * alpha;
  ctx.fillStyle = pat;
  ctx.fill();
  ctx.globalAlpha = was;
}

export function shade(ctx, x0, y0, x1, y1, from, to) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  const was = ctx.fillStyle;
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = was;
}