import { Runner } from './runner.js';
import { World } from './world.js';

const cards = new Map();

function setup(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return null;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

export function createScene(theme, dark, cycle) {
  const world = new World();
  world.setTheme(theme, dark);
  if (cycle) world.cycle = cycle;
  return world;
}

export function drawRunnerTo(canvas, palette, look, { scale = 1, time = 0, clock = 0.6, scene = null, sceneScale = 0.7 } = {}) {
  const view = setup(canvas);
  if (!view) return;
  const { ctx, w, h } = view;
  const baseY = h * 0.84;
  if (scene) {
    const lw = w / sceneScale;
    const lh = h / sceneScale;
    if (scene.w !== lw || scene.h !== lh) scene.resize(lw, lh, baseY / sceneScale);
    ctx.save();
    ctx.scale(sceneScale, sceneScale);
    scene.draw(ctx, 260);
    ctx.restore();
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

export function drawWorldTo(canvas, theme, dark) {
  const view = setup(canvas);
  if (!view) return;
  const { ctx, w, h } = view;
  const id = theme.id + (dark ? ':d' : ':l');
  let world = cards.get(id);
  if (!world) {
    world = createScene(theme, dark);
    world.dist = 2200;
    world.refresh();
    cards.set(id, world);
  }
  const scale = w / 220;
  const lh = h / scale;
  if (world.w !== 220 || world.h !== lh) world.resize(220, lh, lh * 0.74);
  ctx.save();
  ctx.scale(scale, scale);
  world.draw(ctx, 0);
  ctx.restore();
}