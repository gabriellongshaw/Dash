import { Game } from '../components/game.js';
import { onThemeChange, detectTouch } from '../core/theme.js';
import { getBest, setBest } from '../core/storage.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';

const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  detectTouch();
  initPageFadeIn();

  const scoreEl = $('score');
  const bestEl = $('best');
  const coinsEl = $('coins');
  const hint = $('start-hint');
  const pauseOverlay = $('pause-overlay');
  const overOverlay = $('over-overlay');
  let overReady = false;
  let overTimer = 0;

  bestEl.textContent = `Best ${getBest()}`;

  const game = new Game($('game-canvas'), {
    best: getBest(),
    onScore(score, coins) {
      scoreEl.textContent = score;
      coinsEl.textContent = coins;
      if (score > 0) {
        scoreEl.classList.remove('bump');
        void scoreEl.offsetWidth;
        if (score % 50 === 0) scoreEl.classList.add('bump');
      }
    },
    onOver(result) {
      if (result.isBest) {
        setBest(result.best);
        bestEl.textContent = `Best ${result.best}`;
      }
      $('over-score').textContent = result.score;
      $('over-best').textContent = result.best;
      $('over-coins').textContent = result.coins;
      $('over-distance').textContent = `${result.meters} m`;
      $('over-badge').classList.toggle('hidden', !result.isBest);
      overReady = false;
      overTimer = setTimeout(() => {
        overOverlay.classList.remove('hidden');
        overReady = true;
      }, 600);
    }
  });

  function startRun() {
    clearTimeout(overTimer);
    overReady = false;
    hint.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    overOverlay.classList.add('hidden');
    game.start();
  }

  function pauseGame() {
    if (game.pause()) pauseOverlay.classList.remove('hidden');
  }

  function resumeGame() {
    pauseOverlay.classList.add('hidden');
    game.resume();
  }

  function action() {
    if (game.state === 'ready') startRun();
    else if (game.state === 'playing') game.jump();
    else if (game.state === 'over' && overReady) startRun();
  }

  $('game-canvas').addEventListener('pointerdown', e => {
    e.preventDefault();
    action();
  });

  window.addEventListener('keydown', e => {
    const jumpKey = e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW';
    const slideKey = e.code === 'ArrowDown' || e.code === 'KeyS';
    if (jumpKey || slideKey) e.preventDefault();
    if (e.repeat) return;
    if (jumpKey) {
      if (game.state === 'paused') resumeGame();
      else action();
    } else if (slideKey) {
      game.slide(true);
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      if (game.state === 'paused') resumeGame();
      else pauseGame();
    } else if (e.code === 'Enter' && game.state === 'over' && overReady) {
      startRun();
    }
  });

  window.addEventListener('keyup', e => {
    if (e.code === 'ArrowDown' || e.code === 'KeyS') game.slide(false);
  });

  const slideBtn = $('btn-slide');
  slideBtn.addEventListener('pointerdown', e => {
    e.preventDefault();
    slideBtn.setPointerCapture(e.pointerId);
    slideBtn.classList.add('held');
    game.slide(true);
  });
  const releaseSlide = () => {
    slideBtn.classList.remove('held');
    game.slide(false);
  };
  slideBtn.addEventListener('pointerup', releaseSlide);
  slideBtn.addEventListener('pointercancel', releaseSlide);

  $('btn-jump').addEventListener('pointerdown', e => {
    e.preventDefault();
    action();
  });

  $('pause-btn').addEventListener('click', e => {
    e.currentTarget.blur();
    if (game.state === 'paused') resumeGame();
    else pauseGame();
  });

  $('resume-btn').addEventListener('click', e => {
    e.currentTarget.blur();
    resumeGame();
  });

  $('again-btn').addEventListener('click', e => {
    e.currentTarget.blur();
    startRun();
  });

  ['menu-btn', 'quit-btn', 'over-menu-btn'].forEach(id => {
    $(id).addEventListener('click', () => navigateTo('../'));
  });

  document.querySelectorAll('.button, .secondary-button, .leave-button, .icon-button').forEach(el => {
    el.addEventListener('touchstart', () => el.classList.add('hover'), { passive: true });
    const remove = () => el.classList.remove('hover');
    el.addEventListener('touchend', remove, { passive: true });
    el.addEventListener('touchcancel', remove, { passive: true });
  });

  window.addEventListener('resize', () => game.resize());
  onThemeChange(() => game.setPalette());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseGame();
  });
  document.addEventListener('contextmenu', e => e.preventDefault());
});
