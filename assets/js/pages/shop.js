import { profile } from '../core/profile.js';
import { SKINS, CHARACTERS, HATS, WORLDS, findItem, resolveLook, resolveWorld } from '../core/cosmetics.js';
import { readPalette, onThemeChange, detectTouch, isDark } from '../core/theme.js';
import { drawRunnerTo, drawWorldTo, createScene, measureCanvas } from '../components/preview.js';
import { mountAccount, showToast, signInFlow } from '../components/account.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';
import { setCoins } from '../core/motion.js';
import { initGraphics } from '../core/graphics.js';
import { initAudio, audio } from '../core/audio.js';
import { mountSound } from '../components/sound.js';

const $ = id => document.getElementById(id);

const KINDS = ['skin', 'char', 'hat', 'world'];
const LISTS = { skin: SKINS, char: CHARACTERS, hat: HATS, world: WORLDS };

document.addEventListener('DOMContentLoaded', () => {
  detectTouch();
  initGraphics();
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

  const panes = {};
  const paneOf = () => panes[kind];
  let drawToken = 0;
  let cardSize = null;

  function drawCard(card, k, base, size) {
    const item = findItem(card.dataset.id);
    const canvas = card.querySelector('canvas');
    if (k === 'world') {
      drawWorldTo(canvas, item, isDark(), size);
      return;
    }
    const look = { ...base, hat: 'hat:none' };
    if (k === 'skin') look.skin = item;
    else if (k === 'char') look.char = item.id;
    else look.hat = item.id;
    drawRunnerTo(canvas, palette, look, { scale: 1, size });
  }

  function markDirty() {
    for (const k in panes) panes[k].dirty = true;
  }

  function paintPane(pane, shouldContinue, schedule) {
    pane.dirty = false;
    const base = lookFor();
    const cards = [...pane.el.querySelectorAll('.item-card')];
    let i = 0;
    const step = () => {
      if (!shouldContinue()) return;
      const end = Math.min(i + 5, cards.length);
      for (; i < end; i++) drawCard(cards[i], pane.kind, base, cardSize);
      if (i < cards.length) schedule(step);
    };
    step();
  }

  function drawCards() {
    const pane = paneOf();
    if (!pane || !pane.dirty) return;
    const first = pane.el.querySelector('.item-canvas');
    if (!cardSize) cardSize = measureCanvas(first);
    const token = ++drawToken;
    paintPane(pane, () => token === drawToken && paneOf() === pane, requestAnimationFrame);
  }

  function buildPane(k) {
    const el = document.createElement('div');
    el.className = 'item-pane';
    LISTS[k].forEach((item, index) => {
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
        const k = item.id.split(':')[0];
        const before = selected[k];
        selected[k] = item.id;
        if (k === 'world' && before !== item.id) setScene();
        markDirty();
        refresh();
      });
      el.appendChild(card);
    });
    grid.appendChild(el);
    return { el, kind: k, dirty: true };
  }

  function renderGrid() {
    for (const k in panes) panes[k].el.hidden = k !== kind;
    if (!panes[kind]) panes[kind] = buildPane(kind);
    panes[kind].el.hidden = false;
    grid.dataset.kind = kind;
    refresh();
  }

  function prebuildNext() {
    const k = KINDS.find(x => !panes[x]);
    if (!k) return;
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 300));
    idle(() => {
      if (!panes[k]) {
        const pane = buildPane(k);
        pane.el.hidden = k !== kind;
        panes[k] = pane;
        if (cardSize) paintPane(pane, () => true, idle);
      }
      prebuildNext();
    });
  }

  function refresh() {
    const pane = paneOf();
    if (!pane || grid.dataset.kind !== kind) return;
    const { coins, equipped } = profile.state;
    setCoins($('wallet'), coins);
    pane.el.querySelectorAll('.item-card').forEach(card => {
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
    if (profile.equip(item.id)) audio.sfx(bought ? 'buy' : 'equip');
    else {
      audio.sfx('error');
      showToast('Could not reach cloud saves. Try again.');
    }
    busy = false;
  });

  const tabButtons = [...document.querySelectorAll('.tab')];
  let renderToken = 0;
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
      const token = ++renderToken;
      requestAnimationFrame(() =>
        setTimeout(() => {
          if (token === renderToken) renderGrid();
        }, 0)
      );
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
    markDirty();
    refresh();
  });

  onThemeChange(() => {
    palette = readPalette();
    setScene();
    markDirty();
    drawCards();
  });

  document.querySelectorAll('.button, .secondary-button, .leave-button').forEach(el => {
    el.addEventListener('touchstart', () => el.classList.add('hover'), { passive: true });
    const remove = () => el.classList.remove('hover');
    el.addEventListener('touchend', remove, { passive: true });
    el.addEventListener('touchcancel', remove, { passive: true });
  });

  window.addEventListener('resize', () => {
    cardSize = null;
    markDirty();
    drawCards();
  });

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
  prebuildNext();
});