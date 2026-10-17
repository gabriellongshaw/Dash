import { Game } from '../components/game.js';
import { onThemeChange, detectTouch } from '../core/theme.js';
import { profile } from '../core/profile.js';
import { resolveLook, resolveWorld } from '../core/cosmetics.js';
import { signInFlow } from '../components/account.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';
import { countTo, hideEl, showEl } from '../core/motion.js';
import { initAudio, audio } from '../core/audio.js';
import { mountSound } from '../components/sound.js';

const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  detectTouch();
  initPageFadeIn();
  profile.init();
  initAudio(0.6);
  $('pause-btn').before(mountSound(document.querySelector('.hud-right'), { className: 'icon-button' }));

  const scoreEl = $('score');
  const bestEl = $('best');
  const coinsEl = $('coins');
  const hint = $('start-hint');
  const pauseOverlay = $('pause-overlay');
  const overOverlay = $('over-overlay');
  let overReady = false;
  let overTimer = 0;

  bestEl.textContent = `Best ${profile.state.best}`;

  const game = new Game($('game-canvas'), {
    best: profile.state.best,
    getLook: () => resolveLook(profile.state.equipped),
    getWorld: () => resolveWorld(profile.state.equipped.world),
    hints: () => profile.state.best === 0,
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
      profile.recordRun(result);
      bestEl.textContent = `Best ${profile.state.best}`;
      showQuestNote();
      audio.duck(0.2);
      $('over-note').classList.toggle('hidden', profile.session.status !== 'out');
      $('over-score').textContent = result.score;
      $('over-best').textContent = result.best;
      $('over-coins').textContent = result.coins;
      $('over-distance').textContent = `${result.meters} m`;
      $('over-badge').classList.toggle('hidden', !result.isBest);
      overReady = false;
      overTimer = setTimeout(() => {
        showEl(overOverlay);
        if (result.isBest) audio.sfx('best');
        overReady = true;
        countTo($('over-score'), result.score, { duration: 850 });
        countTo($('over-best'), result.best, { duration: 850 });
        countTo($('over-coins'), result.coins, { duration: 700 });
        countTo($('over-distance'), result.meters, { duration: 850, suffix: ' m' });
      }, 600);
    }
  });

  function showQuestNote() {
    const ready = profile.readyQuests();
    $('over-quests').classList.toggle('hidden', ready === 0);
    $('over-quests-text').textContent = ready === 1 ? '1 quest ready to claim.' : `${ready} quests ready to claim.`;
  }

  function startRun() {
    clearTimeout(overTimer);
    overReady = false;
    hint.classList.add('hidden');
    hideEl(pauseOverlay);
    hideEl(overOverlay);
    audio.duck(0.6);
    profile.beginRun();
    game.start();
  }

  function pauseGame() {
    if (game.pause()) {
      showEl(pauseOverlay);
      audio.duck(0.25);
    }
  }

  function resumeGame() {
    hideEl(pauseOverlay);
    audio.duck(0.6);
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
  $('over-shop-btn').addEventListener('click', () => navigateTo('../shop/'));
  $('over-signin').addEventListener('click', () => signInFlow());
  $('over-quests-btn').addEventListener('click', () => navigateTo('../quests/'));

  profile.subscribe(() => {
    game.setLook(resolveLook(profile.state.equipped));
    game.setWorld(resolveWorld(profile.state.equipped.world));
    game.best = Math.max(game.best, profile.state.best);
    if (game.state !== 'playing') bestEl.textContent = `Best ${profile.state.best}`;
    $('over-note').classList.toggle('hidden', profile.session.status !== 'out' || overOverlay.classList.contains('hidden'));
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