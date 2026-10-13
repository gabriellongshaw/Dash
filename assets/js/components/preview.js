import { Runner } from './runner.js';

export function drawRunnerTo(canvas, palette, look, { scale = 1, time = 0, clock = 0.6, ground = false } = {}) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const baseY = h * 0.84;
  if (ground) {
    ctx.fillStyle = palette.ground;
    ctx.fillRect(0, baseY, w, h - baseY);
    ctx.fillStyle = palette.groundLine;
    ctx.fillRect(0, baseY, w, 2);
  }
  const runner = new Runner();
  runner.reset(0, 0);
  runner.clock = clock;
  ctx.save();
  ctx.translate(w / 2 - 17 * scale, baseY);
  ctx.scale(scale, scale);
  runner.draw(ctx, palette, 260, time, look);
  ctx.restore();
}
