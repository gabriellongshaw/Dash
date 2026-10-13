import { World } from '../components/world.js';
import { Runner } from '../components/runner.js';
import { fitStage } from '../components/stage.js';
import { readPalette, onThemeChange, detectTouch } from '../core/theme.js';
import { getBest } from '../core/storage.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';
import { clamp } from '../core/utils.js';

document.addEventListener('DOMContentLoaded', () => {
  detectTouch();
  initPageFadeIn();

  const best = getBest();
  document.getElementById('home-best').textContent = best > 0 ? `Best ${best}` : '';

  const canvas = document.getElementById('home-canvas');
  const ctx = canvas.getContext('2d');
  const world = new World();
  const runner = new Runner();
  const speed = 220;
  let view;
  let palette;
  let time = 0;
  let last = performance.now();

  function resize() {
    view = fitStage(canvas);
    palette = readPalette();
    world.resize(ctx, view.viewW, view.viewH, view.groundY, palette);
    runner.reset(clamp(view.viewW * 0.18, 70, 170), view.groundY);
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;
    world.update(dt, speed);
    runner.update(dt, speed);
    ctx.setTransform(view.pxScale, 0, 0, view.pxScale, 0, 0);
    world.draw(ctx, speed);
    runner.draw(ctx, palette, speed, time);
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  onThemeChange(resize);
  requestAnimationFrame(frame);

  const play = document.getElementById('play-btn');
  play.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(play.getAttribute('href'));
  });
  play.addEventListener('touchstart', () => play.classList.add('hover'), { passive: true });
  play.addEventListener('touchend', () => play.classList.remove('hover'), { passive: true });
  play.addEventListener('touchcancel', () => play.classList.remove('hover'), { passive: true });
});
