import { Game } from '../components/game.js';
import { onThemeChange, detectTouch } from '../core/theme.js';
import { profile } from '../core/profile.js';
import { resolveLook, resolveWorld } from '../core/cosmetics.js';
import { signInFlow } from '../components/account.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';
import { countTo, hideEl, showEl } from '../core/motion.js';
import { initGraphics } from '../core/graphics.js';
import { initAudio, audio } from '../core/audio.js';
import { mountSound } from '../components/sound.js';
import { ads } from '../core/ads.js';

const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  detectTouch();
  initGraphics();
  initPageFadeIn();
  profile.init();
  initAudio(0.6);
  ads.init();
  $('pause-btn').before(mountSound(document.querySelector('.hud-right'), { className: 'icon-button' }));

  const scoreEl = $('score');
  const bestEl = $('best');
  const coinsEl = $('coins');
  const hint = $('start-hint');
  const pauseOverlay = $('pause-overlay');
  const overOverlay = $('over-overlay');
  let overReady = false;
  let overTimer = 0;
  let overToken = 0;
  let restarts = 0;
  let skipAd = false;
  let adBusy = false;
  let showDouble = null;
  const doubleBtn = $('double-btn');

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
      offerDouble(result);
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

  function offerDouble(result) {
    overToken += 1;
    const token = overToken;
    showDouble = null;
    doubleBtn.classList.add('hidden');
    if (result.coins < 1 || !profile.canDouble) return;
    ads.reward({
      available(show) {
        if (token !== overToken) return;
        showDouble = show;
        $('double-text').textContent = `Watch an ad for +${result.coins}`;
        doubleBtn.classList.remove('hidden');
      },
      before: () => audio.duck(0),
      after: () => audio.duck(0.2),
      viewed() {
        skipAd = true;
        profile.doubleCoins().then(out => {
          if (out.ok && token === overToken) countTo($('over-coins'), result.coins + out.coins, { duration: 700 });
        });
      }
    });
  }

  function restart() {
    if (adBusy) return;
    restarts += 1;
    if (restarts < 2 || skipAd) {
      skipAd = false;
      startRun();
      return;
    }
    restarts = 0;
    adBusy = true;
    ads
      .interstitial({ before: () => audio.duck(0), after: () => audio.duck(0.2) })
      .then(() => {
        adBusy = false;
        startRun();
      });
  }

  function startRun() {
    clearTimeout(overTimer);
    overToken += 1;
    showDouble = null;
    doubleBtn.classList.add('hidden');
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

  const countdown = $('countdown');
  const countdownNum = $('countdown-num');
  const COUNT_FROM = 3;
  const COUNT_STEP = 800;
  let counting = false;
  let countTimer = 0;

  function stopCountdown() {
    clearTimeout(countTimer);
    counting = false;
    countdown.classList.add('hidden');
  }

  function resumeGame() {
    if (counting || game.state !== 'paused') return;
    hideEl(pauseOverlay);
    counting = true;
    countdown.classList.remove('hidden');
    let n = COUNT_FROM;
    const step = () => {
      if (n === 0) {
        stopCountdown();
        audio.duck(0.6);
        game.resume();
        return;
      }
      countdownNum.textContent = n;
      countdownNum.style.animation = 'none';
      void countdownNum.offsetWidth;
      countdownNum.style.animation = '';
      audio.sfx('click');
      n -= 1;
      countTimer = setTimeout(step, COUNT_STEP);
    };
    step();
  }

  function cancelCountdown() {
    stopCountdown();
    showEl(pauseOverlay);
  }

  function togglePause() {
    if (counting) cancelCountdown();
    else if (game.state === 'paused') resumeGame();
    else pauseGame();
  }

  function action() {
    if (game.state === 'ready') startRun();
    else if (game.state === 'playing') game.jump();
    else if (game.state === 'over' && overReady) restart();
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
      togglePause();
    } else if (e.code === 'Enter' && game.state === 'over' && overReady) {
      restart();
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
    togglePause();
  });

  $('resume-btn').addEventListener('click', e => {
    e.currentTarget.blur();
    resumeGame();
  });

  $('again-btn').addEventListener('click', e => {
    e.currentTarget.blur();
    restart();
  });

  doubleBtn.addEventListener('click', e => {
    e.currentTarget.blur();
    const show = showDouble;
    showDouble = null;
    doubleBtn.classList.add('hidden');
    if (show) show();
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
    if (!document.hidden) return;
    if (counting) cancelCountdown();
    else pauseGame();
  });
  document.addEventListener('contextmenu', e => e.preventDefault());
});