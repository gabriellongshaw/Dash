import { profile } from '../core/profile.js';
import { mountAccount, showToast, signInFlow } from '../components/account.js';
import { detectTouch } from '../core/theme.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';
import { exitRow, reducedMotion, setCoins, setShown } from '../core/motion.js';
import { initGraphics } from '../core/graphics.js';
import { initAudio, audio } from '../core/audio.js';
import { mountSound } from '../components/sound.js';
import { button, messageFor } from '../components/ui.js';

const $ = id => document.getElementById(id);

const FILTERS = ['all', 'poll', 'feedback', 'suggestion'];
const LABELS = { poll: 'Poll', feedback: 'Feedback', suggestion: 'Suggestion' };
const TITLES = { poll: 'Ask a question', feedback: 'What did you think?', suggestion: 'What should we add?' };
const EMPTY = {
  all: 'Nothing here yet. Check back soon.',
  poll: 'No polls right now.',
  feedback: 'No feedback yet. Be the first to share some.',
  suggestion: 'No suggestions yet. Got an idea? Share it.'
};
const LIMITS = { title: 80, body: 600, option: 60, minOptions: 2, maxOptions: 6 };

const CROSS =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
const CHECK =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
const PLUS =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>';

function make(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function ago(at) {
  const mins = Math.floor(Math.max(0, Date.now() - at) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function tween(el, to, suffix) {
  const from = Number(el.dataset.v || 0);
  el.dataset.v = String(to);
  cancelAnimationFrame(el.tweenFrame);
  if (reducedMotion() || from === to) {
    el.textContent = `${to}${suffix}`;
    return;
  }
  const start = performance.now();
  const step = now => {
    const t = Math.min(1, (now - start) / 480);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = `${Math.round(from + (to - from) * eased)}${suffix}`;
    if (t < 1) el.tweenFrame = requestAnimationFrame(step);
  };
  el.tweenFrame = requestAnimationFrame(step);
}

function tick(el) {
  el.classList.remove('tick');
  void el.offsetWidth;
  el.classList.add('tick');
}

document.addEventListener('DOMContentLoaded', () => {
  detectTouch();
  initGraphics();
  initPageFadeIn();
  profile.init();
  initAudio(1);
  mountSound(document.querySelector('.shop-bar-right'), { first: true });
  mountAccount($('account'));

  const note = $('note');
  const tabs = $('tabs');
  const composer = $('composer');
  const list = $('list');
  let data = { admin: false, posts: [] };
  let filter = 'all';
  let loaded = false;
  let failed = false;
  let loading = false;
  let again = false;
  let busy = false;
  let loadedKey = null;
  let composerSig = '';
  let draft = null;
  const seen = new Set();

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

  function paintOptions(box, post, animate) {
    Array.from(box.children).forEach((btn, i) => {
      const option = post.options[i];
      const share = post.total ? (option.votes / post.total) * 100 : 0;
      const chosen = post.mine.vote === i;
      btn.classList.toggle('chosen', chosen);
      btn.setAttribute('aria-pressed', String(chosen));
      btn.disabled = post.closed;
      btn.querySelector('.poll-fill').style.transform = `scaleX(${share / 100})`;
      const pct = btn.querySelector('.poll-pct');
      if (!post.total) {
        pct.dataset.v = '0';
        pct.textContent = '';
      } else if (animate) tween(pct, Math.round(share), '%');
      else {
        pct.dataset.v = String(Math.round(share));
        pct.textContent = `${Math.round(share)}%`;
      }
    });
  }

  async function castVote(post, index, repaint) {
    if (!profile.social) {
      audio.sfx('error');
      showToast('Sign in to vote.');
      return;
    }
    if (post.closed || post.mine.vote === index || busy) return;
    const before = JSON.parse(JSON.stringify(post));
    if (post.mine.vote !== null) {
      post.options[post.mine.vote].votes--;
      post.total--;
    }
    post.options[index].votes++;
    post.total++;
    post.mine.vote = index;
    audio.sfx('claim');
    repaint(true);
    busy = true;
    try {
      const out = await profile.api('vote', { id: post.id, option: index });
      Object.assign(post, out.post);
    } catch (e) {
      Object.assign(post, before);
      audio.sfx('error');
      showToast(messageFor(e));
    } finally {
      busy = false;
      repaint(true);
    }
  }

  function pollOptions(post, repaint) {
    const box = make('div', 'poll-options');
    post.options.forEach((option, i) => {
      const btn = make('button', 'poll-option');
      btn.type = 'button';
      const fill = make('span', 'poll-fill');
      fill.setAttribute('aria-hidden', 'true');
      const check = make('span', 'poll-check');
      check.innerHTML = CHECK;
      const main = make('span', 'poll-main');
      main.append(check, make('span', 'poll-label', option.text));
      btn.append(fill, main, make('span', 'poll-pct'));
      btn.addEventListener('click', () => castVote(post, i, repaint));
      box.appendChild(btn);
    });
    return box;
  }

  function postCard(post, index) {
    const card = make('article', `poll-card ${post.kind}`);
    card.style.setProperty('--n', Math.min(index, 8));
    const fresh = !seen.has(post.id);
    if (!fresh) card.classList.add('static');
    seen.add(post.id);
    const head = make('div', 'poll-head');
    head.appendChild(make('span', 'poll-kind', LABELS[post.kind]));
    if (post.closed) head.appendChild(make('span', 'poll-state', 'Closed'));
    head.appendChild(make('span', 'poll-time', ago(post.at)));
    card.appendChild(head);
    card.appendChild(make('h2', 'poll-title', post.title));
    if (post.author) card.appendChild(make('span', 'poll-author', `by ${post.author}`));
    if (post.body) card.appendChild(make('p', 'poll-body', post.body));
    if (post.kind === 'poll') {
      const count = make('span', 'poll-count');
      let options = null;
      let last = -1;
      const repaint = animate => {
        paintOptions(options, post, animate);
        count.textContent = `${post.total} ${post.total === 1 ? 'vote' : 'votes'}`;
        if (last !== -1 && last !== post.total) tick(count);
        last = post.total;
      };
      options = pollOptions(post, repaint);
      card.append(options, count);
      if (fresh && !reducedMotion()) requestAnimationFrame(() => requestAnimationFrame(() => repaint(true)));
      else repaint(false);
    }
    const mod = data.admin && post.kind === 'poll';
    if (mod || post.canDelete) {
      const actions = make('div', 'poll-actions');
      if (mod) {
        const group = make('div', 'poll-actions-group');
        group.appendChild(
          button(post.closed ? 'Reopen poll' : 'Close poll', 'secondary-button', async () => {
            const ok = await act(() => profile.api('setClosed', { id: post.id, closed: !post.closed }), post.closed ? 'Poll reopened.' : 'Poll closed.');
            if (ok) load();
          })
        );
        actions.appendChild(group);
      }
      if (post.canDelete) {
        actions.appendChild(
          button('Delete', 'tertiary-button danger', async () => {
            if (!confirm(`Delete "${post.title}"?`)) return;
            const ok = await act(() => profile.api('deletePost', { id: post.id }), 'Deleted.');
            if (!ok) return;
            seen.delete(post.id);
            data = { ...data, posts: data.posts.filter(item => item.id !== post.id) };
            await exitRow(card);
            card.remove();
            if (!visible().length) renderList();
          })
        );
      }
      card.appendChild(actions);
    }
    return card;
  }

  const visible = () => data.posts.filter(post => filter === 'all' || post.kind === filter);

  function skeleton() {
    for (let i = 0; i < 2; i++) {
      const card = make('div', 'poll-card skeleton');
      card.style.setProperty('--n', i);
      ['poll-sk-head', 'poll-sk-title', 'poll-sk-row', 'poll-sk-row'].forEach(name => card.appendChild(make('span', name)));
      list.appendChild(card);
    }
  }

  function renderList() {
    list.innerHTML = '';
    if (!loaded) {
      if (failed || profile.session.status === 'unavailable') {
        list.appendChild(make('p', 'quest-empty', 'Could not load polls.'));
        if (failed) list.appendChild(button('Try again', 'tertiary-button', () => load()));
      } else skeleton();
      return;
    }
    const posts = visible();
    if (!posts.length) {
      const empty = make('p', 'quest-empty reveal', EMPTY[filter]);
      list.appendChild(empty);
      return;
    }
    posts.forEach((post, i) => list.appendChild(postCard(post, i)));
  }

  function setFilter(next) {
    if (next === filter) return;
    filter = next;
    tabs.style.setProperty('--i', FILTERS.indexOf(next));
    tabs.querySelectorAll('.tab').forEach(tab => {
      const on = tab.dataset.filter === next;
      tab.classList.toggle('active', on);
      tab.setAttribute('aria-selected', String(on));
    });
    seen.clear();
    renderList();
  }

  function optionRow(rows, box, add, animate) {
    const row = make('div', `poll-option-row${animate ? ' entering' : ''}`);
    const input = make('input', 'friend-input');
    input.type = 'text';
    input.maxLength = LIMITS.option;
    input.autocomplete = 'off';
    const drop = make('button', 'round-button');
    drop.type = 'button';
    drop.innerHTML = CROSS;
    drop.setAttribute('aria-label', 'Remove option');
    const entry = { row, input, drop };
    const refresh = () => {
      rows.forEach((item, i) => {
        item.input.placeholder = `Option ${i + 1}`;
        item.input.setAttribute('aria-label', `Option ${i + 1}`);
        item.drop.classList.toggle('hidden', rows.length <= LIMITS.minOptions);
      });
      setShown(add, rows.length < LIMITS.maxOptions);
    };
    drop.addEventListener('click', async () => {
      if (rows.length <= LIMITS.minOptions) return;
      rows.splice(rows.indexOf(entry), 1);
      refresh();
      await exitRow(row);
      row.remove();
    });
    row.append(input, drop);
    rows.push(entry);
    box.insertBefore(row, add);
    refresh();
    return entry;
  }

  function buildComposer() {
    composer.innerHTML = '';
    const social = profile.social;
    setShown(composer, social);
    if (!social) return;
    const kinds = data.admin ? ['poll', 'feedback', 'suggestion'] : ['feedback', 'suggestion'];
    const named = data.admin || !!profile.state.username;
    const toggle = make('button', 'secondary-button poll-compose-toggle');
    toggle.type = 'button';
    const toggleLabel = make('span', '', 'New post');
    const icon = make('span', 'poll-compose-icon');
    icon.innerHTML = PLUS;
    toggle.append(icon, toggleLabel);
    const panel = make('div', 'friend-card poll-composer hidden');
    let kind = kinds[0];
    if (!named) {
      panel.append(
        make('p', 'friend-title', 'Choose a username first'),
        make('p', 'friend-hint', 'Posts show your username, so pick one in your profile before posting.'),
        button('Open profile', 'button', () => navigateTo('../profile/'))
      );
    } else {
      const kindTabs = make('div', 'tabs poll-kind-tabs');
      kindTabs.style.setProperty('--count', kinds.length);
      kindTabs.appendChild(make('span', 'tab-pill'));
      const title = make('input', 'friend-input');
      const body = make('textarea', 'friend-input poll-text');
      const optionsBox = make('div', 'poll-options-edit hidden');
      const rows = [];
      const add = button('Add option', 'tertiary-button', () => optionRow(rows, optionsBox, add, true).input.focus());
      optionsBox.appendChild(add);
      const sync = initial => {
        title.placeholder = TITLES[kind];
        title.setAttribute('aria-label', TITLES[kind]);
        if (initial) optionsBox.classList.toggle('hidden', kind !== 'poll');
        else setShown(optionsBox, kind === 'poll');
        kindTabs.style.setProperty('--i', kinds.indexOf(kind));
        kindTabs.querySelectorAll('.tab').forEach(tab => {
          tab.classList.toggle('active', tab.dataset.kind === kind);
          tab.setAttribute('aria-selected', String(tab.dataset.kind === kind));
        });
      };
      kinds.forEach(name => {
        const tab = make('button', 'tab', name === 'suggestion' ? 'Suggestion' : LABELS[name]);
        tab.type = 'button';
        tab.dataset.kind = name;
        tab.setAttribute('role', 'tab');
        tab.addEventListener('click', () => {
          kind = name;
          sync();
        });
        kindTabs.appendChild(tab);
      });
      title.type = 'text';
      title.maxLength = LIMITS.title;
      title.autocomplete = 'off';
      body.maxLength = LIMITS.body;
      body.rows = 4;
      body.placeholder = 'Details (optional)';
      body.setAttribute('aria-label', 'Details');
      optionRow(rows, optionsBox, add, false);
      optionRow(rows, optionsBox, add, false);
      if (draft) {
        title.value = draft.title;
        body.value = draft.body;
      }
      title.addEventListener('input', () => {
        draft = { title: title.value, body: body.value };
      });
      body.addEventListener('input', () => {
        draft = { title: title.value, body: body.value };
      });
      const submit = button('Post', 'button', async () => {
        const payload = { kind, title: title.value, body: body.value, options: kind === 'poll' ? rows.map(item => item.input.value) : [] };
        if (!payload.title.trim()) {
          audio.sfx('error');
          showToast('Add a title.');
          return;
        }
        if (kind === 'poll' && payload.options.filter(value => value.trim()).length < LIMITS.minOptions) {
          audio.sfx('error');
          showToast('Polls need at least 2 options.');
          return;
        }
        const ok = await act(() => profile.api('createPost', payload), 'Posted.', 'claim');
        if (!ok) return;
        draft = null;
        title.value = '';
        body.value = '';
        rows.forEach(item => {
          item.input.value = '';
        });
        open(false);
        setFilter(kind);
        load();
      });
      const hint = make('p', 'friend-hint', data.admin ? 'Only you can post polls.' : 'Posts are public and show your username.');
      const actions = make('div', 'poll-actions');
      const group = make('div', 'poll-actions-group');
      group.appendChild(submit);
      actions.appendChild(group);
      panel.append(kindTabs, title, body, optionsBox, hint, actions);
      sync(true);
    }
    let opened = false;
    const open = on => {
      opened = on;
      toggle.classList.toggle('on', on);
      toggleLabel.textContent = on ? 'Cancel' : 'New post';
      setShown(panel, on);
    };
    toggle.addEventListener('click', () => open(!opened));
    composer.append(toggle, panel);
  }

  function renderComposer() {
    const sig = `${profile.social}:${data.admin}:${!!profile.state.username}`;
    if (sig === composerSig) return;
    composerSig = sig;
    buildComposer();
  }

  async function load() {
    if (loading) {
      again = true;
      return;
    }
    if (!profile.canView) return;
    loading = true;
    do {
      again = false;
      try {
        data = await profile.api('listPosts');
        loaded = true;
        failed = false;
      } catch {
        failed = !loaded;
        if (loaded) showToast('Could not refresh polls.');
      }
      renderList();
      renderComposer();
    } while (again);
    loading = false;
  }

  function render() {
    setShown(note, profile.session.status === 'out');
    setCoins($('wallet'), profile.state.coins);
    if (loaded) renderComposer();
  }

  const keyOf = () => (profile.canView ? (profile.social ? profile.state.uid : 'guest') : null);

  profile.subscribe(() => {
    render();
    const key = keyOf();
    if (!key || profile.session.syncing || key === loadedKey) return;
    loadedKey = key;
    load();
  });

  tabs.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => setFilter(tab.dataset.filter));
  });

  $('note-signin').addEventListener('click', () => signInFlow());
  $('back-btn').addEventListener('click', () => navigateTo('../'));

  document.querySelectorAll('.button, .secondary-button, .leave-button').forEach(el => {
    el.addEventListener('touchstart', () => el.classList.add('hover'), { passive: true });
    const remove = () => el.classList.remove('hover');
    el.addEventListener('touchend', remove, { passive: true });
    el.addEventListener('touchcancel', remove, { passive: true });
  });

  render();
  renderList();
});