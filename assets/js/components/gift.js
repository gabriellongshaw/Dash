import { profile } from '../core/profile.js';
import { SKINS, CHARACTERS, HATS, WORLDS, findItem } from '../core/cosmetics.js';
import { audio } from '../core/audio.js';
import { reducedMotion } from '../core/motion.js';
import { showToast } from './account.js';
import { MAX_GIFT_COINS, button, messageFor } from './ui.js';

const QUICK_COINS = [50, 100, 250, 500];
const GROUPS = [
  ['Colours', SKINS],
  ['Characters', CHARACTERS],
  ['Hats', HATS],
  ['Worlds', WORLDS]
];

export function openGift(person, onSent) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const modal = document.createElement('div');
  modal.className = 'modal gift-modal';
  const title = document.createElement('h2');
  title.textContent = `Gift to @${person.username}`;
  const balance = document.createElement('p');
  balance.className = 'modal-note';

  let coins = 0;
  const quick = document.createElement('div');
  quick.className = 'gift-quick';
  const custom = document.createElement('input');
  custom.className = 'friend-input';
  custom.type = 'number';
  custom.inputMode = 'numeric';
  custom.min = '0';
  custom.max = String(MAX_GIFT_COINS);
  custom.placeholder = 'Coins';
  custom.setAttribute('aria-label', 'Coins to send');
  const chips = QUICK_COINS.map(amount => {
    const chip = button(String(amount), 'gift-chip', () => {
      coins = coins === amount ? 0 : amount;
      custom.value = coins ? String(coins) : '';
      update();
    });
    quick.appendChild(chip);
    return [amount, chip];
  });

  const select = document.createElement('select');
  select.className = 'friend-input';
  select.setAttribute('aria-label', 'Item to send');
  const none = document.createElement('option');
  none.value = '';
  none.textContent = 'No item';
  select.appendChild(none);
  GROUPS.forEach(([label, list]) => {
    const group = document.createElement('optgroup');
    group.label = label;
    list
      .filter(item => item.price > 0)
      .forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.name} · ${item.price} coins`;
        group.appendChild(option);
      });
    select.appendChild(group);
  });

  const total = document.createElement('p');
  total.className = 'gift-total';
  let busy = false;
  const send = button('Send gift', 'button', async () => {
    if (busy) return;
    busy = true;
    send.blur();
    try {
      await profile.api('gift', { uid: person.uid, coins, item: select.value || null });
      showToast(`Gift sent to @${person.username}.`);
      audio.sfx('gift');
      close();
      if (onSent) onSent();
    } catch (e) {
      audio.sfx('error');
      showToast(messageFor(e));
    } finally {
      busy = false;
    }
  });
  const close = () => {
    if (overlay.classList.contains('closing')) return;
    if (reducedMotion()) {
      overlay.remove();
      return;
    }
    overlay.classList.add('closing');
    setTimeout(() => overlay.remove(), 200);
  };
  const cancel = button('Cancel', 'secondary-button', close);

  function cost() {
    const item = select.value ? findItem(select.value) : null;
    return coins + (item ? item.price : 0);
  }

  function update() {
    chips.forEach(([amount, chip]) => chip.classList.toggle('active', amount === coins));
    const spend = cost();
    const have = profile.state.coins;
    balance.textContent = `You have ${have} coins`;
    total.textContent = spend ? `Total: ${spend} coins` : 'Choose coins or an item';
    send.disabled = spend === 0 || spend > have;
    if (spend > have) total.textContent = `Total: ${spend} coins. You need ${spend - have} more.`;
  }

  custom.addEventListener('input', () => {
    const value = Math.floor(Number(custom.value));
    coins = Number.isFinite(value) ? Math.min(Math.max(value, 0), MAX_GIFT_COINS) : 0;
    update();
  });
  select.addEventListener('change', update);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  modal.append(title, balance, quick, custom, select, total, send, cancel);
  overlay.appendChild(modal);
  document.querySelector('.page').appendChild(overlay);
  update();
}