import { profile } from '../core/profile.js';
import { mountAccount, showToast, signInFlow } from '../components/account.js';
import { detectTouch } from '../core/theme.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';
import { exitRow, setCoins, setShown } from '../core/motion.js';
import { initGraphics } from '../core/graphics.js';
import { initAudio, audio } from '../core/audio.js';
import { mountSound } from '../components/sound.js';
import { button, messageFor } from '../components/ui.js';

const $ = id => document.getElementById(id);

const KINDS = ['poll', 'feedback', 'suggestion'];
const LABELS = { poll: 'Poll', feedback: 'Feedback', suggestion: 'Suggestion' };
const PLACEHOLDERS = { feedback: 'Your feedback', suggestion: 'Your suggestion' };
const LIMITS = { title: 80, body: 600, option: 60, reply: 500, minOptions: 2, maxOptions: 6 };

const CROSS =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

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

document.addEventListener('DOMContentLoaded', () => {
  detectTouch();
  initGraphics();
  initPageFadeIn();
  profile.init();
  initAudio(1);
  mountSound(document.querySelector('.shop-bar-right'), { first: true });
  mountAccount($('account'));

  const note = $('note');
  const composer = $('composer');
  const list = $('list');
  let data = { admin: false, posts: [] };
  let loaded = false;
  let failed = false;
  let loading = false;
  let again = false;
  let busy = false;
  let loadedKey = null;
  let composerBuilt = false;
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

  function paintOptions(box, post) {
    Array.from(box.children).forEach((btn, i) => {
      const option = post.options[i];
      const share = post.total ? (option.votes / post.total) * 100 : 0;
      const chosen = post.mine.vote === i;
      btn.classList.toggle('chosen', chosen);
      btn.setAttribute('aria-pressed', String(chosen));
      btn.disabled = post.closed;
      btn.querySelector('.poll-fill').style.width = `${share}%`;
      btn.querySelector('.poll-pct').textContent = post.total ? `${Math.round(share)}%` : '';
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
    repaint();
    busy = true;
    try {
      const out = await profile.api('vote', { id: post.id, option: index });
      Object.assign(post, out.post);
      audio.sfx('claim');
    } catch (e) {
      Object.assign(post, before);
      audio.sfx('error');
      showToast(messageFor(e));
    } finally {
      busy = false;
      repaint();
    }
  }

  function pollOptions(post, repaint) {
    const box = make('div', 'poll-options');
    post.options.forEach((option, i) => {
      const btn = make('button', 'poll-option');
      btn.type = 'button';
      const fill = make('span', 'poll-fill');
      fill.setAttribute('aria-hidden', 'true');
      btn.append(fill, make('span', 'poll-label', option.text), make('span', 'poll-pct'));
      btn.addEventListener('click', () => castVote(post, i, repaint));
      box.appendChild(btn);
    });
    return box;
  }

  function replyForm(post) {
    const form = make('div', 'poll-reply');
    const input = make('textarea', 'friend-input poll-text');
    input.maxLength = LIMITS.reply;
    input.rows = 3;
    input.value = post.mine.reply || '';
    input.placeholder = profile.social ? PLACEHOLDERS[post.kind] : 'Sign in to reply';
    input.disabled = !profile.social || post.closed;
    input.setAttribute('aria-label', PLACEHOLDERS[post.kind]);
    const row = make('div', 'poll-reply-row');
    row.appendChild(make('span', 'friend-sub', post.closed ? 'Closed' : 'Only Gabriel sees replies.'));
    if (profile.social && !post.closed) {
      const label = () => (input.value.trim() ? (post.mine.reply ? 'Update' : 'Send') : post.mine.reply ? 'Remove' : 'Send');
      const send = button(label(), 'button small', async () => {
        const text = input.value.trim();
        if (!text && !post.mine.reply) {
          audio.sfx('error');
          showToast('Write something first.');
          return;
        }
        const ok = await act(
          async () => {
            const out = await profile.api('reply', { id: post.id, text });
            Object.assign(post, out.post);
          },
          text ? 'Thanks, sent.' : 'Reply removed.',
          'claim'
        );
        if (!ok) return;
        input.value = post.mine.reply || '';
        send.textContent = label();
      });
      input.addEventListener('input', () => {
        send.textContent = label();
      });
      row.appendChild(send);
    }
    form.append(input, row);
    return form;
  }

  function fillReplies(box, replies) {
    box.innerHTML = '';
    if (!replies.length) {
      box.appendChild(make('p', 'quest-empty', 'No replies yet.'));
      return;
    }
    replies.forEach(reply => {
      const item = make('div', 'poll-reply-item');
      const head = make('div', 'poll-reply-head');
      head.append(make('span', 'poll-reply-name', reply.name), make('span', 'poll-time', ago(reply.at)));
      item.append(head, make('p', 'poll-reply-text', reply.text));
      box.appendChild(item);
    });
  }

  function postCard(post, index) {
    const card = make('article', 'poll-card');
    card.style.setProperty('--n', index);
    if (seen.has(post.id)) card.classList.add('static');
    seen.add(post.id);
    const head = make('div', 'poll-head');
    head.appendChild(make('span', 'poll-kind', LABELS[post.kind]));
    if (post.closed) head.appendChild(make('span', 'poll-state', 'Closed'));
    head.appendChild(make('span', 'poll-time', ago(post.at)));
    card.append(head, make('h2', 'poll-title', post.title));
    if (post.body) card.appendChild(make('p', 'poll-body', post.body));
    const foot = make('div', 'poll-foot');
    const count = make('span', 'poll-count');
    let options = null;
    const repaint = () => {
      if (!options) return;
      paintOptions(options, post);
      count.textContent = `${post.total} ${post.total === 1 ? 'vote' : 'votes'}`;
    };
    if (post.kind === 'poll') {
      options = pollOptions(post, repaint);
      card.appendChild(options);
      foot.appendChild(count);
      repaint();
    } else {
      card.appendChild(replyForm(post));
    }
    if (data.admin) {
      const actions = make('div', 'poll-foot-actions');
      const repliesBox = make('div', 'poll-replies hidden');
      if (post.kind !== 'poll') {
        const toggle = button(`Replies (${post.replies || 0})`, 'tertiary-button', async () => {
          if (!repliesBox.classList.contains('hidden')) {
            setShown(repliesBox, false);
            return;
          }
          try {
            const out = await profile.api('listReplies', { id: post.id });
            fillReplies(repliesBox, out.replies);
            setShown(repliesBox, true);
          } catch (e) {
            showToast(messageFor(e));
          }
        });
        actions.appendChild(toggle);
      }
      const close = button(post.closed ? 'Reopen' : 'Close', 'tertiary-button', async () => {
        const ok = await act(() => profile.api('setClosed', { id: post.id, closed: !post.closed }), post.closed ? 'Reopened.' : 'Closed.');
        if (ok) load();
      });
      const remove = button('', 'round-button', async () => {
        if (!confirm(`Delete "${post.title}"?`)) return;
        const ok = await act(() => profile.api('deletePost', { id: post.id }), 'Deleted.');
        if (!ok) return;
        seen.delete(post.id);
        data = { ...data, posts: data.posts.filter(item => item.id !== post.id) };
        await exitRow(card);
        card.remove();
        if (!data.posts.length) renderList();
      });
      remove.setAttribute('aria-label', `Delete ${post.title}`);
      remove.innerHTML = CROSS;
      actions.append(close, remove);
      foot.appendChild(actions);
      card.append(foot, repliesBox);
    } else if (post.kind === 'poll') {
      card.appendChild(foot);
    }
    return card;
  }

  function renderList() {
    list.innerHTML = '';
    if (!loaded) {
      const text = failed || profile.session.status === 'unavailable' ? 'Could not load polls.' : 'Loading';
      list.appendChild(make('p', 'quest-empty', text));
      if (failed) list.appendChild(button('Try again', 'tertiary-button', () => load()));
      return;
    }
    if (!data.posts.length) {
      list.appendChild(make('p', 'quest-empty', data.admin ? 'No posts yet. Create one above.' : 'Nothing here yet. Check back soon.'));
      return;
    }
    data.posts.forEach((post, i) => list.appendChild(postCard(post, i)));
  }

  function optionRow(rows, box, add, value) {
    const row = make('div', 'poll-option-row');
    const input = make('input', 'friend-input');
    input.type = 'text';
    input.maxLength = LIMITS.option;
    input.value = value || '';
    input.placeholder = `Option ${rows.length + 1}`;
    input.autocomplete = 'off';
    input.setAttribute('aria-label', `Option ${rows.length + 1}`);
    const drop = make('button', 'round-button');
    drop.type = 'button';
    drop.innerHTML = CROSS;
    drop.setAttribute('aria-label', 'Remove option');
    const entry = { row, input, drop };
    const refresh = () => {
      rows.forEach((item, i) => {
        item.input.placeholder = `Option ${i + 1}`;
        item.drop.classList.toggle('hidden', rows.length <= LIMITS.minOptions);
      });
      add.classList.toggle('hidden', rows.length >= LIMITS.maxOptions);
    };
    drop.addEventListener('click', () => {
      rows.splice(rows.indexOf(entry), 1);
      row.remove();
      refresh();
    });
    row.append(input, drop);
    rows.push(entry);
    box.insertBefore(row, add);
    refresh();
    return entry;
  }

  function buildComposer() {
    composerBuilt = true;
    composer.innerHTML = '';
    const card = make('div', 'friend-card poll-composer');
    let kind = 'poll';
    const kinds = make('div', 'gift-quick');
    const chips = KINDS.map(name => {
      const chip = button(LABELS[name], `gift-chip${name === kind ? ' active' : ''}`, () => {
        kind = name;
        chips.forEach(item => {
          item.classList.toggle('active', item === chip);
          item.setAttribute('aria-pressed', String(item === chip));
        });
        optionsBox.classList.toggle('hidden', kind !== 'poll');
      });
      chip.setAttribute('aria-pressed', String(name === kind));
      return chip;
    });
    chips.forEach(chip => kinds.appendChild(chip));
    const title = make('input', 'friend-input');
    title.type = 'text';
    title.maxLength = LIMITS.title;
    title.placeholder = 'Title';
    title.autocomplete = 'off';
    title.setAttribute('aria-label', 'Title');
    const body = make('textarea', 'friend-input poll-text');
    body.maxLength = LIMITS.body;
    body.rows = 3;
    body.placeholder = 'Details (optional)';
    body.setAttribute('aria-label', 'Details');
    const optionsBox = make('div', 'poll-options-edit');
    const rows = [];
    const add = button('Add option', 'tertiary-button', () => {
      optionRow(rows, optionsBox, add).input.focus();
    });
    optionsBox.appendChild(add);
    optionRow(rows, optionsBox, add);
    optionRow(rows, optionsBox, add);
    const submit = button('Post', 'button small', async () => {
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
      title.value = '';
      body.value = '';
      rows.forEach(item => {
        item.input.value = '';
      });
      load();
    });
    const footer = make('div', 'poll-reply-row');
    footer.append(make('span', 'friend-sub', 'Only you can post.'), submit);
    card.append(make('p', 'friend-title', 'New post'), kinds, title, body, optionsBox, footer);
    composer.appendChild(card);
  }

  function renderComposer() {
    if (data.admin && !composerBuilt) buildComposer();
    setShown(composer, data.admin);
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
  }

  const keyOf = () => (profile.canView ? (profile.social ? profile.state.uid : 'guest') : null);

  profile.subscribe(() => {
    render();
    const key = keyOf();
    if (!key || profile.session.syncing || key === loadedKey) return;
    loadedKey = key;
    load();
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