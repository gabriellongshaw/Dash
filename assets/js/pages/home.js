import { World } from '../components/world.js';
import { Runner } from '../components/runner.js';
import { fitStage } from '../components/stage.js';
import { mountAccount } from '../components/account.js';
import { profile } from '../core/profile.js';
import { resolveLook, resolveWorld } from '../core/cosmetics.js';
import { readPalette, onThemeChange, detectTouch, isDark } from '../core/theme.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';
import { clamp } from '../core/utils.js';

document.addEventListener('DOMContentLoaded', () => {
  detectTouch();
  initPageFadeIn();
  profile.init();
  mountAccount(document.getElementById('account'));

  const bestEl = document.getElementById('home-best');
  const showStats = () => {
    const { best, coins } = profile.state;
    bestEl.textContent = best > 0 || coins > 0 ? `Best ${best} · ${coins} coins` : '';
  };
  profile.subscribe(showStats);
  showStats();

  const canvas = document.getElementById('home-canvas');
  const ctx = canvas.getContext('2d');
  const world = new World();
  world.bindSky(mode => {
    document.documentElement.dataset.sky = mode;
  });
  let theme = resolveWorld(profile.state.equipped.world);
  world.setTheme(theme, isDark());
  profile.subscribe(() => {
    const next = resolveWorld(profile.state.equipped.world);
    if (next === theme) return;
    theme = next;
    world.setTheme(theme, isDark());
  });
  const runner = new Runner();
  const speed = 220;
  let view;
  let palette;
  let time = 0;
  let last = performance.now();

  function resize() {
    view = fitStage(canvas);
    palette = readPalette();
    world.resize(view.viewW, view.viewH, view.groundY);
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
    runner.draw(ctx, palette, speed, time, resolveLook(profile.state.equipped));
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  onThemeChange(() => {
    resize();
    world.setTheme(theme, isDark());
  });
  requestAnimationFrame(frame);

  document.querySelectorAll('#play-btn, #shop-btn').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(link.getAttribute('href'));
    });
    link.addEventListener('touchstart', () => link.classList.add('hover'), { passive: true });
    link.addEventListener('touchend', () => link.classList.remove('hover'), { passive: true });
    link.addEventListener('touchcancel', () => link.classList.remove('hover'), { passive: true });
  });
});