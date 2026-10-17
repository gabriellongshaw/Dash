import { profile } from '../core/profile.js';
import { SKINS, CHARACTERS, HATS, WORLDS, findItem } from '../core/cosmetics.js';
import { mountAccount, showToast, signInFlow } from '../components/account.js';
import { makeAvatar } from '../components/avatar.js';
import { detectTouch } from '../core/theme.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';
import { setCoins } from '../core/motion.js';

const $ = id => document.getElementById(id);

const MAX_GIFT_COINS = 1000;
const QUICK_COINS = [50, 100, 250, 500];
const GROUPS = [
  ['Colours', SKINS],
  ['Characters', CHARACTERS],
  ['Hats', HATS],
  ['Worlds', WORLDS]
];

const MESSAGES = {
  taken: 'That username is taken.',
  username: 'Use 3 to 16 letters, numbers or underscores.',
  cooldown: 'You can only change your username once a day.',
  'no-user': 'No player has that username.',
  self: 'That is your own username.',
  already: 'You are already friends.',
  pending: 'You already sent them a request.',
  full: 'Your friends list is full.',
  'target-full': 'Their friends list is full.',
  'too-many': 'You have too many pending requests.',
  'target-busy': 'They have too many pending requests.',
  'no-username': 'Choose a username first.',
  coins: 'Not enough coins.',
  owned: 'They already own that item.',
  'not-friends': 'You are not friends yet.',
  amount: `Gifts can be up to ${MAX_GIFT_COINS} coins.`,
  empty: 'Choose coins or an item to send.'
};

const messageFor = e => MESSAGES[e && e.code] || `Something went wrong${e && e.code ? ` (${e.code})` : ''}. Try again.`;

function button(label, className, onClick) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.textContent = label;
  el.addEventListener('click', onClick);
  return el;
}

function describeGift(gift) {
  const parts = [];
  if (gift.coins) parts.push(`${gift.coins} coins`);
  const item = gift.item ? findItem(gift.item) : null;
  if (item) parts.push(item.name);
  return parts.join(' and ');
}

document.addEventListener('DOMContentLoaded', () => {
  detectTouch();
  initPageFadeIn();
  profile.init();
  mountAccount($('account'));

  const note = $('note');
  const content = $('content');
  const socialBox = $('social');
  const me = $('me');
  const addForm = $('add-form');
  const addInput = $('add-input');
  const addBtn = $('add-btn');
  let data = { friends: [], incoming: [], outgoing: [], gifts: [] };
  let loaded = false;
  let loading = false;
  let editing = false;
  let busy = false;

  async function act(fn, success) {
    if (busy) return false;
    busy = true;
    try {
      const out = await fn();
      if (success) showToast(typeof success === 'function' ? success(out) : success);
      return true;
    } catch (e) {
      showToast(messageFor(e));
      return false;
    } finally {
      busy = false;
    }
  }

  async function load() {
    if (loading || !profile.social) return;
    loading = true;
    try {
      data = await profile.api('social');
      loaded = true;
    } catch {
      showToast('Could not load friends. Try again.');
    }
    loading = false;
    render();
  }

  function renderMe() {
    const { username, photoOn } = profile.state;
    const photo = photoOn ? profile.state.photo : null;
    me.innerHTML = '';
    if (!username || editing) {
      const title = document.createElement('p');
      title.className = 'friend-title';
      title.textContent = username ? 'Change username' : 'Choose a username';
      const hint = document.createElement('p');
      hint.className = 'friend-hint';
      hint.textContent = username
        ? 'You can change it once a day.'
        : 'Friends find you by it, and it shows on the leaderboard instead of your name.';
      const form = document.createElement('form');
      form.className = 'friend-form';
      form.autocomplete = 'off';
      const input = document.createElement('input');
      input.className = 'friend-input';
      input.type = 'text';
      input.maxLength = 16;
      input.placeholder = 'Username';
      input.value = username || '';
      input.autocapitalize = 'none';
      input.spellcheck = false;
      input.setAttribute('aria-label', 'Username');
      const save = document.createElement('button');
      save.type = 'submit';
      save.className = 'button small';
      save.textContent = 'Save';
      form.append(input, save);
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const value = input.value.trim();
        if (value === username) {
          editing = false;
          render();
          return;
        }
        const ok = await act(() => profile.api('setUsername', { username: value }), 'Username saved.');
        if (ok) {
          editing = false;
          load();
        }
      });
      me.append(title, hint, form);
      if (username) me.appendChild(button('Cancel', 'tertiary-button', () => {
        editing = false;
        render();
      }));
      return;
    }
    const row = document.createElement('div');
    row.className = 'friend-row plain';
    const names = document.createElement('div');
    names.className = 'friend-names';
    const handle = document.createElement('span');
    handle.className = 'friend-handle';
    handle.textContent = `@${username}`;
    const best = document.createElement('span');
    best.className = 'friend-sub';
    best.textContent = `Best ${profile.state.best}`;
    names.append(handle, best);
    row.append(makeAvatar({ uid: profile.state.uid, username, photo }, 'lg'), names, button('Edit', 'tertiary-button', () => {
      editing = true;
      render();
    }));
    me.appendChild(row);
    if (profile.state.photo) {
      const toggle = button(photoOn ? 'Hide my photo from friends' : 'Show my photo to friends', 'tertiary-button', () => {
        toggle.blur();
        act(() => profile.api('setPhoto', { on: !photoOn }));
      });
      me.appendChild(toggle);
    }
  }

  function personRow(person, index, actions) {
    const row = document.createElement('div');
    row.className = 'friend-row';
    row.style.setProperty('--n', index);
    const names = document.createElement('div');
    names.className = 'friend-names';
    const handle = document.createElement('span');
    handle.className = 'friend-handle';
    handle.textContent = `@${person.username}`;
    const sub = document.createElement('span');
    sub.className = 'friend-sub';
    sub.textContent = `Best ${person.best}`;
    names.append(handle, sub);
    const side = document.createElement('div');
    side.className = 'friend-actions';
    actions.forEach(el => side.appendChild(el));
    row.append(makeAvatar(person), names, side);
    return row;
  }

  function renderInbox() {
    const box = $('inbox');
    box.innerHTML = '';
    if (!data.gifts.length) return;
    const card = document.createElement('div');
    card.className = 'friend-card gifts';
    data.gifts.forEach(gift => {
      const line = document.createElement('p');
      line.className = 'friend-gift';
      line.textContent = `@${gift.from} sent you ${describeGift(gift)}.`;
      card.appendChild(line);
    });
    card.appendChild(button('Got it', 'secondary-button small', async () => {
      data = { ...data, gifts: [] };
      renderInbox();
      try {
        await profile.api('seenGifts');
      } catch {}
    }));
    box.appendChild(card);
  }

  function renderRequests() {
    const section = $('requests-section');
    const list = $('requests');
    list.innerHTML = '';
    const total = data.incoming.length + data.outgoing.length;
    section.classList.toggle('hidden', total === 0);
    let index = 0;
    data.incoming.forEach(person => {
      const accept = button('Accept', 'button small', () =>
        act(() => profile.api('respond', { uid: person.uid, accept: true }), `You and @${person.username} are friends.`).then(ok => ok && load())
      );
      const decline = button('Decline', 'tertiary-button', () =>
        act(() => profile.api('respond', { uid: person.uid, accept: false })).then(ok => ok && load())
      );
      list.appendChild(personRow(person, index++, [accept, decline]));
    });
    data.outgoing.forEach(person => {
      const tag = document.createElement('span');
      tag.className = 'friend-sub';
      tag.textContent = 'Sent';
      const cancel = button('Cancel', 'tertiary-button', () =>
        act(() => profile.api('removeFriend', { uid: person.uid })).then(ok => ok && load())
      );
      list.appendChild(personRow(person, index++, [tag, cancel]));
    });
  }

  function renderFriends() {
    const list = $('friends');
    list.innerHTML = '';
    $('friend-count').textContent = data.friends.length ? String(data.friends.length) : '';
    if (!data.friends.length) {
      const empty = document.createElement('p');
      empty.className = 'quest-empty';
      empty.textContent = loaded ? 'No friends yet. Add someone by their username.' : 'Loading';
      list.appendChild(empty);
      return;
    }
    data.friends.forEach((person, index) => {
      const gift = button('Gift', 'secondary-button small', () => openGift(person));
      const remove = button('Remove', 'tertiary-button', () => {
        if (!confirm(`Remove @${person.username} from your friends?`)) return;
        act(() => profile.api('removeFriend', { uid: person.uid }), 'Friend removed.').then(ok => ok && load());
      });
      list.appendChild(personRow(person, index, [gift, remove]));
    });
  }

  function render() {
    const status = profile.session.status;
    const signedIn = status === 'in' && !!profile.state.uid;
    note.classList.toggle('hidden', status !== 'out');
    content.classList.toggle('hidden', !signedIn);
    setCoins($('wallet'), profile.state.coins);
    if (!signedIn) return;
    renderMe();
    socialBox.classList.toggle('hidden', !profile.state.username);
    if (!profile.state.username) return;
    renderInbox();
    renderRequests();
    renderFriends();
  }

  function openGift(person) {
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
    const send = button('Send gift', 'button', async () => {
      send.blur();
      const item = select.value || null;
      const ok = await act(
        () => profile.api('gift', { uid: person.uid, coins, item }),
        () => `Gift sent to @${person.username}.`
      );
      if (ok) overlay.remove();
    });
    const cancel = button('Cancel', 'secondary-button', () => overlay.remove());

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
      if (e.target === overlay) overlay.remove();
    });

    modal.append(title, balance, quick, custom, select, total, send, cancel);
    overlay.appendChild(modal);
    document.querySelector('.page').appendChild(overlay);
    update();
  }

  addForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = addInput.value.trim().replace(/^@/, '');
    if (!name) return;
    addBtn.blur();
    const ok = await act(() => profile.api('request', { username: name }), out => (out.accepted ? 'You are now friends.' : 'Friend request sent.'));
    if (ok) {
      addInput.value = '';
      load();
    }
  });

  $('note-signin').addEventListener('click', () => signInFlow());
  $('back-btn').addEventListener('click', () => navigateTo('../'));

  let wasReady = false;
  profile.subscribe(() => {
    render();
    const ready = profile.social && !profile.session.syncing;
    if (ready && !wasReady) load();
    wasReady = ready;
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && profile.social) load();
  });

  document.querySelectorAll('.button, .secondary-button, .leave-button').forEach(el => {
    el.addEventListener('touchstart', () => el.classList.add('hover'), { passive: true });
    const remove = () => el.classList.remove('hover');
    el.addEventListener('touchend', remove, { passive: true });
    el.addEventListener('touchcancel', remove, { passive: true });
  });

  render();
});