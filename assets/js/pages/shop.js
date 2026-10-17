import { profile } from '../core/profile.js';
import { SKINS, CHARACTERS, HATS, WORLDS, findItem, resolveLook, resolveWorld } from '../core/cosmetics.js';
import { readPalette, onThemeChange, detectTouch, isDark } from '../core/theme.js';
import { drawRunnerTo, drawWorldTo, createScene } from '../components/preview.js';
import { mountAccount, showToast, signInFlow } from '../components/account.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';
import { setCoins } from '../core/motion.js';
import { initAudio, audio } from '../core/audio.js';
import { mountSound } from '../components/sound.js';

const $ = id => document.getElementById(id);

const KINDS = ['skin', 'char', 'hat', 'world'];
const LISTS = { skin: SKINS, char: CHARACTERS, hat: HATS, world: WORLDS };

document.addEventListener('DOMContentLoaded', () => {
  detectTouch();
  initPageFadeIn();
  profile.init();
  initAudio(1);
  mountSound(document.querySelector('.shop-bar-right'), { first: true });
  mountAccount($('account'));

  const grid = $('item-grid');
  const actionBtn = $('action-btn');
  const previewCanvas = $('preview-canvas');
  const previewBox = $('shop-preview');
  const tabs = $('tabs');
  const note = $('shop-note');
  let palette = readPalette();
  let kind = 'skin';
  let busy = false;
  const selected = { ...profile.state.equipped };

  const lookFor = () => resolveLook(selected);
  const themeFor = () => resolveWorld(selected.world);

  let scene;

  function setScene() {
    scene = createScene(themeFor(), isDark(), 7000);
    scene.bindSky(mode => {
      previewBox.dataset.sky = mode;
    });
  }

  setScene();

  function drawCards() {
    const base = lookFor();
    grid.querySelectorAll('.item-card').forEach(card => {
      const item = findItem(card.dataset.id);
      const canvas = card.querySelector('canvas');
      if (kind === 'world') {
        drawWorldTo(canvas, item, isDark());
        return;
      }
      const look = { ...base, hat: 'hat:none' };
      if (kind === 'skin') look.skin = item;
      else if (kind === 'char') look.char = item.id;
      else look.hat = item.id;
      drawRunnerTo(canvas, palette, look, { scale: 1 });
    });
  }

  function renderGrid() {
    grid.innerHTML = '';
    LISTS[kind].forEach((item, index) => {
      const card = document.createElement('button');
      card.className = 'item-card';
      card.dataset.id = item.id;
      card.style.setProperty('--n', index);
      const canvas = document.createElement('canvas');
      canvas.className = 'item-canvas';
      const name = document.createElement('span');
      name.className = 'item-name';
      name.textContent = item.name;
      const tag = document.createElement('span');
      tag.className = 'item-tag';
      card.append(canvas, name, tag);
      card.addEventListener('click', () => {
        const before = selected[kind];
        selected[kind] = item.id;
        if (kind === 'world' && before !== item.id) setScene();
        refresh();
      });
      grid.appendChild(card);
    });
    refresh();
  }

  function refresh() {
    const { coins, equipped } = profile.state;
    setCoins($('wallet'), coins);
    grid.querySelectorAll('.item-card').forEach(card => {
      const item = findItem(card.dataset.id);
      const owned = profile.owns(item.id);
      const isEquipped = equipped[kind] === item.id;
      card.classList.toggle('selected', selected[kind] === item.id);
      card.classList.toggle('equipped', isEquipped);
      const tag = card.querySelector('.item-tag');
      tag.innerHTML = '';
      if (isEquipped) tag.textContent = 'Equipped';
      else if (owned) tag.textContent = 'Owned';
      else {
        const dot = document.createElement('span');
        dot.className = 'coin-dot';
        tag.append(dot, String(item.price));
      }
    });
    const parts = [];
    if (selected.char !== 'char:bot') parts.push(findItem(selected.char).name);
    parts.push(findItem(selected.skin).name);
    if (selected.hat !== 'hat:none') parts.push(findItem(selected.hat).name);
    $('preview-name').textContent = parts.join(' · ');
    $('preview-world').textContent = findItem(selected.world).name;
    const item = findItem(selected[kind]);
    const owned = profile.owns(item.id);
    actionBtn.disabled = false;
    if (equipped[kind] === item.id) {
      actionBtn.textContent = 'Equipped';
      actionBtn.disabled = true;
    } else if (owned) {
      actionBtn.textContent = 'Equip';
    } else if (coins >= item.price) {
      actionBtn.textContent = 'Buy for ' + item.price;
    } else {
      actionBtn.textContent = 'Need ' + (item.price - coins) + ' more coins';
      actionBtn.disabled = true;
    }
    note.classList.toggle('hidden', profile.session.status !== 'out');
    drawCards();
  }

  actionBtn.addEventListener('click', async () => {
    actionBtn.blur();
    if (busy) return;
    const item = findItem(selected[kind]);
    busy = true;
    const bought = !profile.owns(item.id);
    if (bought) {
      const result = await profile.buy(item.id);
      if (!result.ok) {
        audio.sfx('error');
        showToast(result.reason === 'offline' ? 'Could not reach cloud saves. Try again.' : 'Not enough coins.');
        busy = false;
        refresh();
        return;
      }
    }
    audio.sfx(bought ? 'buy' : 'equip');
    profile.equip(item.id);
    busy = false;
  });

  const tabButtons = [...document.querySelectorAll('.tab')];
  tabButtons.forEach(tab => {
    tab.addEventListener('click', () => {
      if (kind === tab.dataset.kind) return;
      kind = tab.dataset.kind;
      tabs.style.setProperty('--i', KINDS.indexOf(kind));
      tabButtons.forEach(t => {
        const active = t === tab;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', active);
      });
      renderGrid();
    });
  });

  $('note-signin').addEventListener('click', () => signInFlow());
  $('back-btn').addEventListener('click', () => navigateTo('../'));

  profile.subscribe(() => {
    const { equipped } = profile.state;
    let worldChanged = false;
    for (const k of KINDS) {
      if (!profile.owns(selected[k])) {
        selected[k] = equipped[k];
        if (k === 'world') worldChanged = true;
      }
    }
    if (worldChanged) setScene();
    refresh();
  });

  onThemeChange(() => {
    palette = readPalette();
    setScene();
    drawCards();
  });

  document.querySelectorAll('.button, .secondary-button, .leave-button').forEach(el => {
    el.addEventListener('touchstart', () => el.classList.add('hover'), { passive: true });
    const remove = () => el.classList.remove('hover');
    el.addEventListener('touchend', remove, { passive: true });
    el.addEventListener('touchcancel', remove, { passive: true });
  });

  window.addEventListener('resize', drawCards);

  let last = performance.now();
  let time = 0;
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    time += dt;
    last = now;
    scene.update(dt, 260);
    drawRunnerTo(previewCanvas, palette, lookFor(), { scale: 1.7, time, clock: time * 11, scene });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  renderGrid();
});