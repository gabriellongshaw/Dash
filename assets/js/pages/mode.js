import { profile } from '../core/profile.js';
import { detectTouch } from '../core/theme.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';
import { initGraphics } from '../core/graphics.js';
import { initAudio } from '../core/audio.js';
import { MODES, getMode, setMode } from '../core/mode.js';
import { resolveLook, resolveWorld } from '../core/cosmetics.js';
import { ClassicPreview, ThirdPreview } from '../components/modepreview.js';

document.addEventListener('DOMContentLoaded', () => {
  detectTouch();
  initGraphics();
  initPageFadeIn();
  profile.init();
  initAudio(1);

  const cards = [...document.querySelectorAll('.mode-card')];
  const keyHints = document.getElementById('key-hints');
  const startBtn = document.getElementById('start-btn');

  const showMode = mode => {
    cards.forEach(card => {
      const on = card.dataset.mode === mode;
      card.classList.toggle('active', on);
      card.setAttribute('aria-checked', String(on));
      card.tabIndex = on ? 0 : -1;
    });
    keyHints.dataset.mode = mode;
  };

  const showBest = () => {
    const { best, bestThird } = profile.state;
    const scores = { classic: best, third: bestThird };
    document.querySelectorAll('[data-best]').forEach(el => {
      const score = scores[el.dataset.best];
      el.textContent = score > 0 ? `Best ${score}` : 'No runs yet';
    });
  };

  const choose = mode => {
    if (!MODES.includes(mode)) return;
    setMode(mode);
    showMode(mode);
  };

  cards.forEach(card => {
    card.addEventListener('click', () => choose(card.dataset.mode));
    card.addEventListener('keydown', e => {
      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      const next = cards[(cards.indexOf(card) + step + cards.length) % cards.length];
      choose(next.dataset.mode);
      next.focus();
    });
  });

  startBtn.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(startBtn.getAttribute('href'));
  });
  document.getElementById('back-btn').addEventListener('click', () => navigateTo('../'));

  const hooks = {
    best: 0,
    getLook: () => resolveLook(profile.state.equipped),
    getWorld: () => resolveWorld(profile.state.equipped.world),
    onScore() {},
    onOver() {}
  };
  const previews = [
    new ClassicPreview(document.querySelector('[data-preview="classic"]'), hooks),
    new ThirdPreview(document.querySelector('[data-preview="third"]'), hooks)
  ];
  let resizeTimer = 0;
  const refit = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => previews.forEach(p => p.resize()), 120);
  };
  window.addEventListener('resize', refit);
  profile.subscribe(() => {
    const world = resolveWorld(profile.state.equipped.world);
    const look = resolveLook(profile.state.equipped);
    previews.forEach(p => {
      p.setWorld(world);
      p.setLook(look);
    });
  });

  profile.subscribe(showBest);
  showBest();
  showMode(getMode());
});