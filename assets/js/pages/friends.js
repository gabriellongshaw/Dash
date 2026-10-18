import { profile } from '../core/profile.js';
import { findItem } from '../core/cosmetics.js';
import { mountAccount, showToast, signInFlow } from '../components/account.js';
import { makeAvatar } from '../components/avatar.js';
import { detectTouch } from '../core/theme.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';
import { exitRow, reducedMotion, reveal, setCoins } from '../core/motion.js';
import { initAudio, audio } from '../core/audio.js';
import { mountSound } from '../components/sound.js';
import { openGift } from '../components/gift.js';
import { button, messageFor } from '../components/ui.js';

const $ = id => document.getElementById(id);

const PENCIL =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

const STAR =
  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.2 6.4 20.2l1.1-6.2L3 9.6l6.2-.9Z"/></svg>';

const STAR_ON = STAR.replace('fill="none"', 'fill="currentColor"');

const profileUrl = person => `../profile/?u=${encodeURIComponent(person.username)}`;

const CROSS =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

const PHOTO_SIZE = 96;
const PHOTO_MAX_CHARS = 24000;

function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('image'));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        if (!side) {
          reject(new Error('image'));
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = PHOTO_SIZE;
        canvas.height = PHOTO_SIZE;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
        let quality = 0.85;
        let out = canvas.toDataURL('image/jpeg', quality);
        while (out.length > PHOTO_MAX_CHARS && quality > 0.3) {
          quality -= 0.1;
          out = canvas.toDataURL('image/jpeg', quality);
        }
        if (out.length > PHOTO_MAX_CHARS) reject(new Error('size'));
        else resolve(out);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
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
  initAudio(1);
  mountSound(document.querySelector('.shop-bar-right'), { first: true });
  mountAccount($('account'));

  const note = $('note');
  const content = $('content');
  const socialBox = $('social');
  const me = $('me');
  const addForm = $('add-form');
  const addInput = $('add-input');
  let data = { friends: [], incoming: [], outgoing: [], gifts: [] };
  let loaded = false;
  let loading = false;
  let editing = false;
  let busy = false;
  let draft = { name: '', user: '' };
  let wantEdit = new URLSearchParams(window.location.search).has('edit');
  const seen = new Set();
  const shown = { content: false, social: false, requests: false };

  function setEditing(next) {
    const apply = () => {
      editing = next;
      draft = { name: profile.state.displayName || '', user: profile.state.username || '' };
      render();
    };
    if (reducedMotion() || !me.firstChild) {
      apply();
      return;
    }
    me.classList.add('leaving');
    setTimeout(() => {
      me.classList.remove('leaving');
      apply();
      me.classList.add('entering');
      setTimeout(() => me.classList.remove('entering'), 480);
    }, 150);
  }

  async function act(fn, success, sound) {
    if (busy) return false;
    busy = true;
    try {
      const out = await fn();
      if (success) showToast(typeof success === 'function' ? success(out) : success);
      if (sound) audio.sfx(sound);
      return true;
    } catch (e) {
      audio.sfx('error');
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

  function field(labelText, input) {
    const wrap = document.createElement('label');
    wrap.className = 'friend-field';
    const label = document.createElement('span');
    label.className = 'friend-label';
    label.textContent = labelText;
    wrap.append(label, input);
    return wrap;
  }

  function textInput(value, placeholder, max, name) {
    const input = document.createElement('input');
    input.className = 'friend-input';
    input.type = 'text';
    input.maxLength = max;
    input.placeholder = placeholder;
    input.value = value || '';
    input.autocapitalize = 'none';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', name);
    return input;
  }

  function renderEditor() {
    const { username, displayName, photoMode } = profile.state;
    const title = document.createElement('p');
    title.className = 'friend-title';
    title.textContent = username ? 'Edit profile' : 'Set up your profile';
    me.appendChild(title);

    const photoRow = document.createElement('div');
    photoRow.className = 'friend-photo-row';
    photoRow.appendChild(makeAvatar({ uid: profile.state.uid, username: username || displayName || '?', photo: profile.avatar }, 'lg'));
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.className = 'hidden';
    picker.addEventListener('change', async () => {
      const file = picker.files && picker.files[0];
      picker.value = '';
      if (!file) return;
      let data;
      try {
        data = await resizePhoto(file);
      } catch {
        showToast('Could not read that image.');
        return;
      }
      act(() => profile.api('setPhoto', { mode: 'custom', data }), 'Photo updated.');
    });
    const choices = document.createElement('div');
    choices.className = 'friend-photo-actions';
    choices.appendChild(button('Upload photo', 'secondary-button small', () => picker.click()));
    if (profile.state.photo && photoMode !== 'google') {
      choices.appendChild(button('Use Google photo', 'tertiary-button', () => act(() => profile.api('setPhoto', { mode: 'google' }))));
    }
    if (photoMode !== 'none') {
      choices.appendChild(button('Remove photo', 'tertiary-button', () => act(() => profile.api('setPhoto', { mode: 'none' }))));
    }
    photoRow.append(choices, picker);
    me.appendChild(photoRow);

    const form = document.createElement('form');
    form.className = 'friend-editor';
    form.autocomplete = 'off';
    const searchToggle = button(`Show me in search: ${profile.state.searchable ? 'On' : 'Off'}`, 'tertiary-button', () => {
      searchToggle.blur();
      act(() => profile.api('setSearchable', { on: !profile.state.searchable }));
    });
    const nameInput = textInput(draft.name, 'Display name (optional)', 24, 'Display name');
    const userInput = textInput(draft.user, 'Username', 16, 'Username');
    nameInput.addEventListener('input', () => {
      draft.name = nameInput.value;
    });
    userInput.addEventListener('input', () => {
      userInput.value = userInput.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      draft.user = userInput.value;
    });
    const hint = document.createElement('p');
    hint.className = 'friend-hint';
    hint.textContent = 'Usernames are lowercase letters, numbers and underscores. You can change yours once a day.';
    const save = document.createElement('button');
    save.type = 'submit';
    save.className = 'button small';
    save.textContent = 'Save';
    const row = document.createElement('div');
    row.className = 'friend-form';
    row.appendChild(save);
    if (username) row.appendChild(button('Cancel', 'secondary-button small', () => setEditing(false)));
    form.append(field('Display name', nameInput), field('Username', userInput), hint, searchToggle, row);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const nextName = nameInput.value.trim().replace(/\s+/g, ' ');
      const nextUser = userInput.value.trim();
      let ok = true;
      if (nextUser !== (username || '')) ok = await act(() => profile.api('setUsername', { username: nextUser }));
      if (ok && nextName !== (displayName || '')) ok = await act(() => profile.api('setDisplayName', { displayName: nextName }));
      if (ok) {
        showToast('Profile saved.');
        setEditing(false);
        load();
      }
    });
    me.appendChild(form);
  }

  function renderMe() {
    const { username, displayName } = profile.state;
    me.innerHTML = '';
    if (!username || editing) {
      renderEditor();
      return;
    }
    const row = document.createElement('div');
    row.className = 'friend-row plain';
    const names = document.createElement('div');
    names.className = 'friend-names';
    const handle = document.createElement('span');
    handle.className = 'friend-handle';
    handle.textContent = displayName || `@${username}`;
    const best = document.createElement('span');
    best.className = 'friend-sub';
    best.textContent = displayName ? `@${username} · Best ${profile.state.best}` : `Best ${profile.state.best}`;
    names.append(handle, best);
    const edit = button('', 'round-button', () => setEditing(true));
    edit.setAttribute('aria-label', 'Edit profile');
    edit.innerHTML = PENCIL;
    row.append(makeAvatar({ uid: profile.state.uid, username, photo: profile.avatar }, 'lg'), names, edit);
    row.classList.add('link');
    row.addEventListener('click', e => {
      if (!e.target.closest('.round-button')) navigateTo('../profile/');
    });
    me.appendChild(row);
  }

  function personRow(person, index, actions, section) {
    const row = document.createElement('div');
    row.className = 'friend-row';
    row.style.setProperty('--n', index);
    const key = `${section}:${person.uid}`;
    row.dataset.key = key;
    if (seen.has(key)) row.classList.add('static');
    seen.add(key);
    const names = document.createElement('div');
    names.className = 'friend-names';
    const handle = document.createElement('span');
    handle.className = 'friend-handle';
    handle.textContent = person.displayName || `@${person.username}`;
    const sub = document.createElement('span');
    sub.className = 'friend-sub';
    const best = person.best === null || person.best === undefined ? '' : `Best ${person.best}`;
    sub.textContent = [person.displayName ? `@${person.username}` : '', best].filter(Boolean).join(' · ') || `@${person.username}`;
    names.append(handle, sub);
    row.classList.add('link');
    row.tabIndex = 0;
    row.setAttribute('role', 'link');
    row.setAttribute('aria-label', `Open ${person.displayName || '@' + person.username}'s profile`);
    row.addEventListener('click', e => {
      if (!e.target.closest('.friend-actions')) navigateTo(profileUrl(person));
    });
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target === row) navigateTo(profileUrl(person));
    });
    const side = document.createElement('div');
    side.className = 'friend-actions';
    actions.forEach(el => side.appendChild(el));
    row.append(makeAvatar(person), names, side);
    return row;
  }

  function renderInbox() {
    const box = $('inbox');
    const had = box.firstChild;
    box.innerHTML = '';
    if (!data.gifts.length) return;
    const card = document.createElement('div');
    card.className = 'friend-card gifts';
    if (!had) {
      card.classList.add('reveal');
      audio.sfx('gift');
    }
    data.gifts.forEach(gift => {
      const line = document.createElement('p');
      line.className = 'friend-gift';
      line.textContent = `@${gift.from} sent you ${describeGift(gift)}.`;
      card.appendChild(line);
    });
    card.appendChild(button('Got it', 'secondary-button small', async () => {
      data = { ...data, gifts: [] };
      await exitRow(card);
      renderInbox();
      try {
        await profile.api('seenGifts');
      } catch {}
    }));
    box.appendChild(card);
  }

  function leave(rowEl, promise, success, sound) {
    return act(() => promise(), success, sound).then(async ok => {
      if (!ok) return;
      const row = rowEl.closest('.friend-row');
      if (row) {
        seen.delete(row.dataset.key);
        await exitRow(row);
      }
      load();
    });
  }

  function renderRequests() {
    const section = $('requests-section');
    const list = $('requests');
    list.innerHTML = '';
    const total = data.incoming.length + data.outgoing.length;
    section.classList.toggle('hidden', total === 0);
    if (total && !shown.requests) reveal(section);
    shown.requests = total > 0;
    let index = 0;
    data.incoming.forEach(person => {
      const accept = button('Accept', 'button small', () =>
        leave(accept, () => profile.api('respond', { uid: person.uid, accept: true }), `You and @${person.username} are friends.`, 'claim')
      );
      const decline = button('Decline', 'tertiary-button', () => leave(decline, () => profile.api('respond', { uid: person.uid, accept: false })));
      list.appendChild(personRow(person, index++, [accept, decline], 'in'));
    });
    data.outgoing.forEach(person => {
      const tag = document.createElement('span');
      tag.className = 'friend-sub';
      tag.textContent = 'Sent';
      const cancel = button('Cancel', 'tertiary-button', () => leave(cancel, () => profile.api('removeFriend', { uid: person.uid })));
      list.appendChild(personRow(person, index++, [tag, cancel], 'out'));
    });
  }

  function renderFriends() {
    const list = $('friends');
    list.innerHTML = '';
    $('friend-count').textContent = data.friends.length ? String(data.friends.length) : '';
    if (!data.friends.length) {
      const empty = document.createElement('p');
      empty.className = 'quest-empty';
      empty.textContent = loaded ? 'No friends yet. Search above to find someone.' : 'Loading';
      list.appendChild(empty);
      return;
    }
    data.friends.forEach((person, index) => {
      const star = button('', `round-button star${person.favourite ? ' on' : ''}`, async () => {
        const ok = await act(() => profile.api('favourite', { uid: person.uid, on: !person.favourite }), person.favourite ? `@${person.username} removed from favourites.` : `@${person.username} added to favourites.`);
        if (ok) load();
      });
      star.setAttribute('aria-label', person.favourite ? `Unfavourite @${person.username}` : `Favourite @${person.username}`);
      star.setAttribute('aria-pressed', String(!!person.favourite));
      star.innerHTML = person.favourite ? STAR_ON : STAR;
      const gift = button('Gift', 'secondary-button small', () => openGift(person));
      const remove = button('', 'round-button', () => {
        if (!confirm(`Remove @${person.username} from your friends?`)) return;
        leave(remove, () => profile.api('removeFriend', { uid: person.uid }), 'Friend removed.');
      });
      remove.setAttribute('aria-label', `Remove @${person.username}`);
      remove.innerHTML = CROSS;
      list.appendChild(personRow(person, index, [star, gift, remove], 'friend'));
    });
  }

  function render() {
    const status = profile.session.status;
    const signedIn = status === 'in' && !!profile.state.uid;
    note.classList.toggle('hidden', status !== 'out');
    content.classList.toggle('hidden', !signedIn);
    if (signedIn && !shown.content) reveal(content);
    shown.content = signedIn;
    setCoins($('wallet'), profile.state.coins);
    if (!signedIn) return;
    if (wantEdit) {
      wantEdit = false;
      setEditing(true);
      return;
    }
    renderMe();
    const hasName = !!profile.state.username;
    socialBox.classList.toggle('hidden', !hasName);
    if (hasName && !shown.social) reveal(socialBox);
    shown.social = hasName;
    if (!profile.state.username) return;
    renderInbox();
    renderRequests();
    renderFriends();
  }

  const resultsBox = $('results');
  let results = [];
  let searched = '';
  let searchToken = 0;
  let searchTimer = 0;

  function resultRow(person, index) {
    const actions = [];
    const mark = text => {
      const tag = document.createElement('span');
      tag.className = 'friend-sub';
      tag.textContent = text;
      return tag;
    };
    if (person.state === 'friend') actions.push(mark('Friends'));
    else if (person.state === 'out') actions.push(mark('Sent'));
    else {
      const incoming = person.state === 'in';
      const add = button(incoming ? 'Accept' : 'Add', 'button small', async () => {
        const ok = incoming
          ? await act(() => profile.api('respond', { uid: person.uid, accept: true }), `You and @${person.username} are friends.`, 'claim')
          : await act(
              async () => {
                const out = await profile.api('request', { username: person.username });
                person.state = out.accepted ? 'friend' : 'out';
                return out;
              },
              out => (out.accepted ? 'You are now friends.' : 'Friend request sent.'),
              'request'
            );
        if (!ok) return;
        if (incoming) person.state = 'friend';
        renderResults();
        load();
      });
      actions.push(add);
    }
    return personRow(person, index, actions, 'search');
  }

  function renderResults() {
    resultsBox.innerHTML = '';
    const active = searched.length >= 2;
    resultsBox.classList.toggle('hidden', !active);
    if (!active) return;
    if (!results.length) {
      const empty = document.createElement('p');
      empty.className = 'quest-empty';
      empty.textContent = 'No players found.';
      resultsBox.appendChild(empty);
      return;
    }
    results.forEach((person, index) => resultsBox.appendChild(resultRow(person, index)));
  }

  async function runSearch(term) {
    const mine = ++searchToken;
    try {
      const out = await profile.api('search', { q: term });
      if (mine !== searchToken) return;
      Array.from(seen).filter(key => key.startsWith('search:')).forEach(key => seen.delete(key));
      results = out.results;
      searched = term;
      renderResults();
    } catch (e) {
      if (mine === searchToken) showToast(messageFor(e));
    }
  }

  function scheduleSearch(immediate) {
    clearTimeout(searchTimer);
    const term = addInput.value.trim();
    if (term.length < 2) {
      searchToken++;
      results = [];
      searched = '';
      renderResults();
      return;
    }
    searchTimer = setTimeout(() => runSearch(term), immediate ? 0 : 280);
  }

  addInput.addEventListener('input', () => scheduleSearch(false));
  addForm.addEventListener('submit', e => {
    e.preventDefault();
    addInput.blur();
    scheduleSearch(true);
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