import { profile } from '../core/profile.js';
import { ITEMS, resolveLook, resolveWorld } from '../core/cosmetics.js';
import { readPalette, onThemeChange, detectTouch, isDark } from '../core/theme.js';
import { drawRunnerTo, createScene } from '../components/preview.js';
import { mountAccount, showToast, signInFlow } from '../components/account.js';
import { makeAvatar } from '../components/avatar.js';
import { initPageFadeIn, navigateBack, navigateTo } from '../core/transition.js';
import { reveal, setCoins } from '../core/motion.js';
import { initAudio, audio } from '../core/audio.js';
import { mountSound } from '../components/sound.js';
import { openGift } from '../components/gift.js';
import { button, messageFor } from '../components/ui.js';

const $ = id => document.getElementById(id);

const LEVEL_LABELS = { everyone: 'Everyone', friends: 'Friends only', nobody: 'Only me' };
const REQUEST_LABELS = { everyone: 'Everyone', nobody: 'Nobody' };

const PRIVACY_ROWS = [
  { key: 'photo', title: 'Profile photo', desc: 'Who can see your photo', labels: LEVEL_LABELS },
  { key: 'stats', title: 'Stats', desc: 'Best score, runs, items and friend count', labels: LEVEL_LABELS },
  { key: 'look', title: 'Appearance', desc: 'Your character, colour and hat', labels: LEVEL_LABELS },
  { key: 'requests', title: 'Friend requests', desc: 'Who can send you a request', labels: REQUEST_LABELS }
];

const text = (tag, className, value) => {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = value;
  return el;
};

const number = value => Number(value || 0).toLocaleString('en-GB');

document.addEventListener('DOMContentLoaded', () => {
  detectTouch();
  initPageFadeIn();
  profile.init();
  initAudio(1);
  mountSound(document.querySelector('.shop-bar-right'), { first: true });
  mountAccount($('account'));

  const params = new URLSearchParams(window.location.search);
  const wantedName = (params.get('u') || '').trim().toLowerCase();
  const wantedId = (params.get('id') || '').trim();

  const note = $('note');
  const content = $('content');
  let person = null;
  let social = { blocked: [] };
  let status = 'loading';
  let loading = false;
  let busy = false;
  let shownContent = false;
  let palette = readPalette();
  let lookCanvas = null;
  let lookScene = null;

  const targetsSelf = () => (!wantedName && !wantedId) || (wantedName && wantedName === profile.state.username) || (wantedId && wantedId === profile.state.uid);

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

  let saving = Promise.resolve();

  function queued(fn, success) {
    const run = saving.then(async () => {
      try {
        await fn();
        if (success) showToast(success);
        return true;
      } catch (e) {
        audio.sfx('error');
        showToast(messageFor(e));
        return false;
      }
    });
    saving = run;
    return run;
  }

  async function load() {
    if (loading || !profile.social) return;
    if (targetsSelf() && !profile.state.username) {
      person = null;
      status = 'setup';
      render();
      return;
    }
    loading = true;
    const body = wantedId ? { uid: wantedId } : wantedName ? { username: wantedName } : { uid: profile.state.uid };
    try {
      const out = await profile.api('viewProfile', body);
      person = out.person;
      status = 'ready';
      if (person.relation === 'self') {
        try {
          social = await profile.api('social');
        } catch {}
      }
    } catch (e) {
      person = null;
      status = e && (e.code === 'no-user' || e.code === 'username') ? 'missing' : 'error';
    }
    loading = false;
    render();
  }

  const reload = () => load();

  function badge(label, className = '') {
    return text('span', `player-badge ${className}`.trim(), label);
  }

  function heroCard() {
    const card = document.createElement('div');
    card.className = 'friend-card player-hero';
    const self = person.relation === 'self';
    const photo = self ? profile.avatar : person.photo;
    card.appendChild(makeAvatar({ uid: person.uid, username: person.username, photo }, 'xl'));
    card.appendChild(text('h1', 'player-name', person.displayName || `@${person.username}`));
    if (person.displayName) card.appendChild(text('p', 'player-handle', `@${person.username}`));
    const badges = document.createElement('div');
    badges.className = 'player-badges';
    if (self) badges.appendChild(badge('You', 'accent'));
    if (person.relation === 'friend') badges.appendChild(badge('Friends', 'accent'));
    if (person.favourite) badges.appendChild(badge('★ Favourite', 'star'));
    if (person.relation === 'in') badges.appendChild(badge('Sent you a request'));
    if (person.relation === 'out') badges.appendChild(badge('Request sent'));
    if (person.relation === 'blocked') badges.appendChild(badge('Blocked'));
    if (badges.children.length) card.appendChild(badges);
    return card;
  }

  function statsGrid() {
    const stats = person.stats;
    const grid = document.createElement('div');
    grid.className = 'player-stats';
    const tiles = [
      ['Best score', number(stats.best)],
      ['Runs', number(stats.runs)],
      ['Items', `${stats.items} / ${ITEMS.length}`],
      ['Friends', number(stats.friends)]
    ];
    tiles.forEach(([label, value], index) => {
      const tile = document.createElement('div');
      tile.className = 'player-stat';
      tile.style.setProperty('--n', index);
      tile.append(text('span', 'player-stat-value', value), text('span', 'player-stat-label', label));
      grid.appendChild(tile);
    });
    return grid;
  }

  function lookCard() {
    const card = document.createElement('div');
    card.className = 'friend-card player-look';
    lookCanvas = document.createElement('canvas');
    lookCanvas.setAttribute('role', 'img');
    lookCanvas.setAttribute('aria-label', 'Character look');
    card.appendChild(lookCanvas);
    lookScene = createScene(resolveWorld(person.look.equipped.world), isDark(), 7000);
    requestAnimationFrame(drawLook);
    return card;
  }

  function drawLook() {
    if (!lookCanvas || !person || !person.look || !lookCanvas.isConnected) return;
    drawRunnerTo(lookCanvas, palette, resolveLook(person.look.equipped), { scale: 1.7, time: 0, clock: 0.6, scene: lookScene });
  }

  function privateNote() {
    const hidden = [];
    if (person.hidden.stats) hidden.push('stats');
    if (person.hidden.look) hidden.push('look');
    if (person.hidden.photo) hidden.push('photo');
    if (!hidden.length) return null;
    const list = hidden.length > 1 ? `${hidden.slice(0, -1).join(', ')} and ${hidden[hidden.length - 1]}` : hidden[0];
    return text('p', 'player-private', `This player keeps their ${list} private.`);
  }

  function confirmAction(question, fn, success, sound) {
    return () => {
      if (!window.confirm(question)) return;
      act(fn, success, sound).then(ok => ok && reload());
    };
  }

  function actionsRow() {
    const row = document.createElement('div');
    row.className = 'player-actions';
    const add = (label, className, onClick) => {
      const el = button(label, className, onClick);
      row.appendChild(el);
      return el;
    };
    const who = `@${person.username}`;
    const blockBtn = () =>
      add('Block', 'tertiary-button danger', confirmAction(`Block ${who}? They will be removed from your friends and won't be able to find you or send you requests.`, () => profile.api('block', { uid: person.uid }), `${who} blocked.`));

    switch (person.relation) {
      case 'friend': {
        const fav = add(person.favourite ? '★ Favourited' : '☆ Favourite', `secondary-button${person.favourite ? ' on' : ''}`, async () => {
          const next = !person.favourite;
          const ok = await act(() => profile.api('favourite', { uid: person.uid, on: next }), next ? `${who} added to favourites.` : `${who} removed from favourites.`);
          if (ok) reload();
        });
        fav.setAttribute('aria-pressed', String(!!person.favourite));
        add('Gift', 'button', () => openGift({ uid: person.uid, username: person.username }, reload));
        add('Unfriend', 'tertiary-button', confirmAction(`Remove ${who} from your friends?`, () => profile.api('removeFriend', { uid: person.uid }), 'Friend removed.'));
        blockBtn();
        break;
      }
      case 'in':
        add('Accept', 'button', async () => {
          const ok = await act(() => profile.api('respond', { uid: person.uid, accept: true }), `You and ${who} are friends.`, 'claim');
          if (ok) reload();
        });
        add('Decline', 'secondary-button', async () => {
          const ok = await act(() => profile.api('respond', { uid: person.uid, accept: false }));
          if (ok) reload();
        });
        blockBtn();
        break;
      case 'out':
        add('Cancel request', 'secondary-button', async () => {
          const ok = await act(() => profile.api('removeFriend', { uid: person.uid }), 'Request cancelled.');
          if (ok) reload();
        });
        blockBtn();
        break;
      case 'blocked':
        add('Unblock', 'button', async () => {
          const ok = await act(() => profile.api('unblock', { uid: person.uid }), `${who} unblocked.`);
          if (ok) reload();
        });
        break;
      case 'self':
        break;
      default: {
        const request = add(person.canRequest ? 'Add friend' : 'Not accepting requests', 'button', async () => {
          const ok = await act(
            () => profile.api('request', { username: person.username }),
            out => (out.accepted ? 'You are now friends.' : 'Friend request sent.'),
            'request'
          );
          if (ok) reload();
        });
        request.disabled = !person.canRequest;
        blockBtn();
      }
    }
    return row;
  }

  function switchRow(title, desc, on, onChange) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'setting-row';
    row.setAttribute('role', 'switch');
    row.setAttribute('aria-checked', String(on));
    const label = document.createElement('span');
    label.className = 'setting-text';
    label.append(text('span', 'setting-title', title), text('span', 'setting-desc', desc));
    const track = document.createElement('span');
    track.className = 'setting-switch';
    track.setAttribute('aria-hidden', 'true');
    row.append(label, track);
    row.addEventListener('click', () => {
      row.blur();
      onChange(!on);
    });
    return row;
  }

  function selectRow({ key, title, desc, labels }) {
    const row = document.createElement('label');
    row.className = 'setting-row';
    const label = document.createElement('span');
    label.className = 'setting-text';
    label.append(text('span', 'setting-title', title), text('span', 'setting-desc', desc));
    const select = document.createElement('select');
    select.className = 'setting-select';
    select.setAttribute('aria-label', title);
    Object.entries(labels).forEach(([value, name]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = name;
      select.appendChild(option);
    });
    select.value = profile.state.privacy[key];
    select.addEventListener('change', async () => {
      const ok = await queued(() => profile.api('setPrivacy', { [key]: select.value }), 'Saved.');
      if (!ok) select.value = profile.state.privacy[key];
    });
    row.append(label, select);
    return row;
  }

  function settingsCards() {
    const cards = [];
    const privacy = document.createElement('div');
    privacy.className = 'friend-card setting-card';
    privacy.appendChild(text('p', 'setting-heading', 'Privacy'));
    PRIVACY_ROWS.forEach(row => privacy.appendChild(selectRow(row)));
    privacy.appendChild(
      switchRow('Show me in search', 'Let players find you by name or username', profile.state.searchable, on => {
        queued(() => profile.api('setSearchable', { on }), 'Saved.');
      })
    );
    privacy.appendChild(
      switchRow('Show me on leaderboards', 'Your score appears with your first name and last initial', profile.state.publicBoard, on => {
        profile.setPublicBoard(on);
        showToast('Saved.');
      })
    );
    cards.push(privacy);

    const edit = document.createElement('div');
    edit.className = 'player-actions';
    edit.appendChild(button('Edit name, username and photo', 'secondary-button', () => navigateTo('../friends/?edit=1')));
    cards.push(edit);

    const blocked = document.createElement('div');
    blocked.className = 'friend-card setting-card';
    blocked.appendChild(text('p', 'setting-heading', 'Blocked players'));
    if (!social.blocked.length) blocked.appendChild(text('p', 'blocked-empty', "You haven't blocked anyone."));
    social.blocked.forEach(other => {
      const row = document.createElement('div');
      row.className = 'blocked-row';
      const names = document.createElement('div');
      names.className = 'friend-names';
      names.append(text('span', 'friend-handle', other.displayName || `@${other.username}`));
      if (other.displayName) names.appendChild(text('span', 'friend-sub', `@${other.username}`));
      const unblock = button('Unblock', 'secondary-button small', async () => {
        const ok = await act(() => profile.api('unblock', { uid: other.uid }), `@${other.username} unblocked.`);
        if (ok) reload();
      });
      row.append(makeAvatar({ uid: other.uid, username: other.username, photo: null }), names, unblock);
      blocked.appendChild(row);
    });
    cards.push(blocked);
    return cards;
  }

  function emptyState(message, label, onClick) {
    const box = document.createElement('div');
    box.className = 'player-empty';
    box.appendChild(text('p', 'quest-empty', message));
    if (label) box.appendChild(button(label, 'secondary-button', onClick));
    return box;
  }

  function render() {
    const signedIn = profile.session.status === 'in' && !!profile.state.uid;
    note.classList.toggle('hidden', profile.session.status !== 'out');
    content.classList.toggle('hidden', !signedIn);
    if (signedIn && !shownContent) reveal(content);
    shownContent = signedIn;
    setCoins($('wallet'), profile.state.coins);
    if (!signedIn) return;
    lookCanvas = null;
    content.innerHTML = '';
    if (status === 'loading') {
      content.appendChild(text('p', 'quest-empty', 'Loading'));
      return;
    }
    if (status === 'setup') {
      content.appendChild(emptyState('Choose a username to set up your profile.', 'Set up profile', () => navigateTo('../friends/?edit=1')));
      return;
    }
    if (status === 'missing') {
      content.appendChild(emptyState("This profile isn't available.", 'Back', () => navigateBack('../friends/')));
      return;
    }
    if (status === 'error' || !person) {
      content.appendChild(emptyState('Could not load this profile.', 'Try again', () => {
        status = 'loading';
        render();
        load();
      }));
      return;
    }
    content.appendChild(heroCard());
    if (person.relation !== 'blocked') {
      if (person.stats) content.appendChild(statsGrid());
      if (person.look) content.appendChild(lookCard());
      const hidden = privateNote();
      if (hidden) content.appendChild(hidden);
    }
    if (person.relation !== 'self') content.appendChild(actionsRow());
    else settingsCards().forEach(card => content.appendChild(card));
  }

  $('note-signin').addEventListener('click', () => signInFlow());
  $('back-btn').addEventListener('click', () => navigateBack(targetsSelf() ? '../' : '../friends/'));

  let wasReady = false;
  profile.subscribe(() => {
    const ready = profile.social && !profile.session.syncing;
    if (ready && !wasReady) load();
    else render();
    wasReady = ready;
  });

  onThemeChange(() => {
    palette = readPalette();
    if (person && person.look) {
      lookScene = createScene(resolveWorld(person.look.equipped.world), isDark(), 7000);
      drawLook();
    }
  });

  window.addEventListener('resize', drawLook);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && profile.social && status === 'ready') load();
  });

  document.querySelectorAll('.button, .secondary-button, .leave-button').forEach(el => {
    el.addEventListener('touchstart', () => el.classList.add('hover'), { passive: true });
    const remove = () => el.classList.remove('hover');
    el.addEventListener('touchend', remove, { passive: true });
    el.addEventListener('touchcancel', remove, { passive: true });
  });

  render();
});