import { profile } from '../core/profile.js';
import { SKINS, HATS, findItem, resolveLook } from '../core/cosmetics.js';
import { readPalette, onThemeChange, detectTouch } from '../core/theme.js';
import { drawRunnerTo } from '../components/preview.js';
import { mountAccount, showToast, signInFlow } from '../components/account.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';

const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  detectTouch();
  initPageFadeIn();
  profile.init();
  mountAccount($('account'));

  const grid = $('item-grid');
  const actionBtn = $('action-btn');
  const previewCanvas = $('preview-canvas');
  const note = $('shop-note');
  let palette = readPalette();
  let kind = 'skin';
  let busy = false;
  const selected = { ...profile.state.equipped };

  const lookFor = () => resolveLook(selected);
  const listFor = k => (k === 'skin' ? SKINS : HATS);

  function tagFor(item) {
    const { equipped } = profile.state;
    if (equipped.skin === item.id || equipped.hat === item.id) return 'Equipped';
    if (profile.owns(item.id)) return 'Owned';
    return null;
  }

  function drawCards() {
    const cards = grid.querySelectorAll('.item-card');
    cards.forEach(card => {
      const item = findItem(card.dataset.id);
      const canvas = card.querySelector('canvas');
      const look = item.id.startsWith('skin:')
        ? { skin: item, hat: 'hat:none' }
        : { skin: lookFor().skin, hat: item.id };
      drawRunnerTo(canvas, palette, look, { scale: 1 });
    });
  }

  function renderGrid() {
    grid.innerHTML = '';
    for (const item of listFor(kind)) {
      const card = document.createElement('button');
      card.className = 'item-card';
      card.dataset.id = item.id;
      const canvas = document.createElement('canvas');
      canvas.className = 'item-canvas';
      const name = document.createElement('span');
      name.className = 'item-name';
      name.textContent = item.name;
      const tag = document.createElement('span');
      tag.className = 'item-tag';
      card.append(canvas, name, tag);
      card.addEventListener('click', () => {
        selected[kind] = item.id;
        refresh();
      });
      grid.appendChild(card);
    }
    refresh();
  }

  function refresh() {
    const { coins, equipped } = profile.state;
    $('wallet').textContent = coins;
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
    const item = findItem(selected[kind]);
    $('preview-name').textContent = findItem(selected.skin).name + (selected.hat !== 'hat:none' ? ' · ' + findItem(selected.hat).name : '');
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
    if (!profile.owns(item.id)) {
      const result = await profile.buy(item.id);
      if (!result.ok) {
        showToast(result.reason === 'offline' ? 'Could not reach cloud saves. Try again.' : 'Not enough coins.');
        busy = false;
        refresh();
        return;
      }
    }
    profile.equip(item.id);
    busy = false;
  });

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      kind = tab.dataset.kind;
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
      renderGrid();
    });
  });

  $('note-signin').addEventListener('click', () => signInFlow());
  $('back-btn').addEventListener('click', () => navigateTo('../'));

  profile.subscribe(() => {
    const { equipped } = profile.state;
    if (!profile.owns(selected.skin)) selected.skin = equipped.skin;
    if (!profile.owns(selected.hat)) selected.hat = equipped.hat;
    refresh();
  });

  onThemeChange(() => {
    palette = readPalette();
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
    time += Math.min((now - last) / 1000, 0.05);
    last = now;
    drawRunnerTo(previewCanvas, palette, lookFor(), { scale: 2.4, time, clock: time * 11, ground: true });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  renderGrid();
});
