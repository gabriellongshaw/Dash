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
const LIMITS = { title: 80, body: 600, option: 60, minOptions: 2, maxOptions: 6, reply: 300 };

const CROSS =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
const CHECK =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
const BUBBLE =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.6A8 8 0 1 1 21 12Z"/></svg>';
const CHEVRON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const EYE =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const UNDO =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';
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
  const threads = new Map();
  const voterViews = new Map();
  const editing = new Map();
  let pendingVote = Promise.resolve();

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
    const view = voterViews.get(post.id);
    if (view && view.sync) view.sync(index);
    busy = true;
    try {
      const request = profile.api('vote', { id: post.id, option: index });
      pendingVote = request.catch(() => {});
      const out = await request;
      Object.assign(post, out.post);
    } catch (e) {
      Object.assign(post, before);
      audio.sfx('error');
      showToast(messageFor(e));
    } finally {
      busy = false;
      repaint(true);
      if (view && view.reconcile) view.reconcile();
    }
  }

  async function undoVote(post, repaint) {
    if (post.closed || post.mine.vote === null || busy) return;
    const before = JSON.parse(JSON.stringify(post));
    post.options[post.mine.vote].votes--;
    post.total--;
    post.mine.vote = null;
    audio.sfx('claim');
    repaint(true);
    const view = voterViews.get(post.id);
    if (view && view.sync) view.sync(null);
    busy = true;
    try {
      const request = profile.api('unvote', { id: post.id });
      pendingVote = request.catch(() => {});
      const out = await request;
      Object.assign(post, out.post);
      showToast('Vote removed.');
    } catch (e) {
      Object.assign(post, before);
      audio.sfx('error');
      showToast(messageFor(e));
    } finally {
      busy = false;
      repaint(true);
      if (view && view.reconcile) view.reconcile();
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
      btn.addEventListener('click', () => (post.mine.vote === i ? undoVote(post, repaint) : castVote(post, i, repaint)));
      box.appendChild(btn);
    });
    return box;
  }

  function editForm(post, done) {
    const draft = editing.get(post.id);
    const form = make('div', 'poll-edit');
    const title = make('input', 'friend-input');
    title.type = 'text';
    title.maxLength = LIMITS.title;
    title.autocomplete = 'off';
    title.value = draft.title;
    title.setAttribute('aria-label', 'Title');
    title.addEventListener('input', () => {
      draft.title = title.value;
    });
    const text = make('textarea', 'friend-input poll-text');
    text.maxLength = LIMITS.body;
    text.rows = 4;
    text.value = draft.body;
    text.placeholder = 'Details (optional)';
    text.setAttribute('aria-label', 'Details');
    text.addEventListener('input', () => {
      draft.body = text.value;
    });
    form.append(title, text);
    if (post.kind === 'poll') {
      const box = make('div', 'poll-options-edit');
      draft.options.forEach((value, i) => {
        const input = make('input', 'friend-input');
        input.type = 'text';
        input.maxLength = LIMITS.option;
        input.autocomplete = 'off';
        input.value = value;
        input.setAttribute('aria-label', `Option ${i + 1}`);
        input.addEventListener('input', () => {
          draft.options[i] = input.value;
        });
        box.appendChild(input);
      });
      form.append(box, make('p', 'friend-hint', 'Fix wording only. Each option keeps its votes, so do not change what it means.'));
    }
    const group = make('div', 'poll-actions-group');
    group.append(
      button('Cancel', 'secondary-button', () => {
        editing.delete(post.id);
        done(false);
      }),
      button('Save', 'button', async () => {
        if (!draft.title.trim()) {
          audio.sfx('error');
          showToast('Add a title.');
          return;
        }
        if (post.kind === 'poll' && draft.options.some(value => !value.trim())) {
          audio.sfx('error');
          showToast('Options cannot be empty.');
          return;
        }
        let out = null;
        const ok = await act(
          async () => {
            out = await profile.api('editPost', { id: post.id, title: draft.title, body: draft.body, options: draft.options });
            return out;
          },
          'Saved.',
          'claim'
        );
        if (!ok) return;
        Object.assign(post, out.post);
        editing.delete(post.id);
        done(true);
      })
    );
    const actions = make('div', 'poll-actions');
    actions.appendChild(group);
    form.appendChild(actions);
    return form;
  }

  function toggleButton(icon, label) {
    const el = make('button', 'poll-toggle');
    el.type = 'button';
    const ico = make('span', 'poll-toggle-icon');
    ico.innerHTML = icon;
    const text = make('span', 'poll-toggle-label', label);
    const chevron = make('span', 'poll-chevron');
    chevron.innerHTML = CHEVRON;
    el.append(ico, text, chevron);
    return { el, text };
  }

  function votersSection(post) {
    const view = voterViews.get(post.id) || { open: false, failed: false, data: null, token: 0 };
    voterViews.set(post.id, view);
    const { el: toggle } = toggleButton(EYE, 'Who voted');
    toggle.classList.add('poll-voters-toggle');
    const panel = make('div', 'poll-panel');
    const inner = make('div', 'poll-voters');
    panel.appendChild(inner);
    if (!view.open) panel.classList.add('hidden');
    toggle.setAttribute('aria-expanded', String(view.open));

    function paint() {
      inner.innerHTML = '';
      inner.appendChild(make('p', 'friend-hint', 'Only you can see who voted.'));
      if (view.failed) {
        inner.append(make('p', 'friend-hint', 'Could not load voters.'), button('Try again', 'tertiary-button', () => fetchVoters()));
        return;
      }
      if (!view.data) {
        inner.appendChild(make('p', 'friend-hint', 'Loading…'));
        return;
      }
      view.data.options.forEach(group => {
        const block = make('div', 'poll-voter-group');
        block.appendChild(make('p', 'poll-voter-title', `${group.text} · ${group.voters.length}`));
        if (group.voters.length) {
          const names = make('div', 'poll-voter-names');
          group.voters.forEach(voter => {
            const chip = make('span', 'poll-voter', voter.name);
            if (voter.at) chip.title = new Date(voter.at).toLocaleString();
            names.appendChild(chip);
          });
          block.appendChild(names);
        }
        inner.appendChild(block);
      });
      if (view.data.listed < view.data.total) inner.appendChild(make('p', 'friend-hint', `Showing the first ${view.data.listed} of ${view.data.total} votes.`));
    }

    async function fetchVoters() {
      const token = ++view.token;
      view.failed = false;
      if (!view.data) paint();
      await pendingVote;
      let next = null;
      try {
        next = await profile.api('listVoters', { id: post.id });
      } catch {
        if (token === view.token && !view.data) view.failed = true;
      }
      if (token !== view.token) return;
      if (next) view.data = next;
      paint();
    }

    view.sync = choice => {
      view.token++;
      view.failed = false;
      const data = view.data;
      let own = null;
      if (data) {
        data.options.forEach(group => {
          const at = group.voters.findIndex(voter => voter.mine);
          if (at !== -1) own = group.voters.splice(at, 1)[0];
        });
      }
      if (!own) view.data = null;
      else {
        data.total--;
        data.listed--;
        if (choice !== null) {
          own.at = Date.now();
          data.options[choice].voters.push(own);
          data.total++;
          data.listed++;
        }
      }
      if (view.open) paint();
    };

    view.reconcile = () => {
      if (view.open) fetchVoters();
    };

    toggle.addEventListener('click', () => {
      view.open = !view.open;
      toggle.setAttribute('aria-expanded', String(view.open));
      if (view.open) {
        paint();
        fetchVoters();
      }
      setShown(panel, view.open);
    });
    paint();
    if (view.open && !view.data) fetchVoters();
    return { toggle, panel };
  }

  function repliesSection(post) {
    const t = threads.get(post.id) || { open: false, loaded: false, loading: false, failed: false, list: [], draft: '', enter: null };
    threads.set(post.id, t);
    const { el: toggle, text: toggleText } = toggleButton(BUBBLE, '');
    toggle.classList.add('poll-replies-toggle');
    const panel = make('div', 'poll-panel');
    const inner = make('div', 'poll-thread');
    const listBox = make('div', 'poll-reply-list');
    const compose = make('div', 'poll-reply-compose');
    inner.append(listBox, compose);
    panel.appendChild(inner);
    if (!t.open) panel.classList.add('hidden');
    toggle.setAttribute('aria-expanded', String(t.open));

    const paintToggle = () => {
      toggleText.textContent = post.replies ? `${post.replies} ${post.replies === 1 ? 'reply' : 'replies'}` : 'Reply';
    };

    function replyRow(reply) {
      const row = make('div', `poll-reply${reply.owner ? ' owner' : ''}${t.enter === reply.id ? ' entering' : ''}`);
      const head = make('div', 'poll-reply-meta');
      head.appendChild(make('span', 'poll-reply-author', reply.author || 'Player'));
      if (reply.owner) head.appendChild(make('span', 'poll-owner', 'Creator'));
      head.appendChild(make('span', 'poll-time', ago(reply.at)));
      row.append(head, make('p', 'poll-reply-body', reply.body));
      if (reply.canDelete) {
        row.appendChild(
          button('Delete', 'poll-tool danger poll-reply-delete', async () => {
            if (!confirm('Delete this reply?')) return;
            let out = null;
            const ok = await act(async () => {
              out = await profile.api('deleteReply', { id: post.id, replyId: reply.id });
              return out;
            }, 'Deleted.');
            if (!ok) return;
            t.list = t.list.filter(item => item.id !== reply.id);
            post.replies = out.replies;
            paintToggle();
            await exitRow(row);
            row.remove();
            if (!t.list.length) paintList();
          })
        );
      }
      return row;
    }

    function paintList() {
      listBox.innerHTML = '';
      if (t.failed) {
        listBox.append(make('p', 'friend-hint', 'Could not load replies.'), button('Try again', 'tertiary-button', () => loadThread()));
      } else if (t.loading && !t.loaded) listBox.appendChild(make('p', 'friend-hint', 'Loading replies…'));
      else if (!t.list.length) listBox.appendChild(make('p', 'friend-hint', 'No replies yet.'));
      else t.list.forEach(reply => listBox.appendChild(replyRow(reply)));
      t.enter = null;
    }

    t.paint = () => {
      paintList();
      paintToggle();
    };

    async function loadThread() {
      t.loading = true;
      t.failed = false;
      t.paint();
      try {
        const out = await profile.api('listReplies', { id: post.id });
        t.list = out.replies;
        t.loaded = true;
        post.replies = t.list.length;
      } catch {
        t.failed = true;
      }
      t.loading = false;
      t.paint();
    }

    const named = data.admin || !!profile.state.username;
    if (!profile.social) {
      compose.append(make('p', 'friend-hint', 'Sign in with Google to reply.'), button('Sign in', 'tertiary-button', () => signInFlow()));
    } else if (!named) {
      compose.append(make('p', 'friend-hint', 'Choose a username in your profile to reply.'), button('Open profile', 'tertiary-button', () => navigateTo('../profile/')));
    } else {
      const input = make('textarea', 'friend-input poll-text poll-reply-input');
      input.maxLength = LIMITS.reply;
      input.rows = 2;
      input.placeholder = 'Write a reply…';
      input.setAttribute('aria-label', 'Reply');
      input.value = t.draft;
      input.addEventListener('input', () => {
        t.draft = input.value;
      });
      const send = button('Reply', 'button', async () => {
        if (!input.value.trim()) {
          audio.sfx('error');
          showToast('Write a reply first.');
          return;
        }
        let out = null;
        const ok = await act(
          async () => {
            out = await profile.api('createReply', { id: post.id, body: input.value });
            return out;
          },
          'Replied.',
          'claim'
        );
        if (!ok) return;
        t.draft = '';
        input.value = '';
        post.replies = out.replies;
        if (t.loaded) {
          t.list.push(out.reply);
          t.enter = out.reply.id;
          t.paint();
        } else loadThread();
      });
      compose.append(input, send, make('p', 'friend-hint', 'Replies are public and show your username.'));
    }

    toggle.addEventListener('click', () => {
      t.open = !t.open;
      toggle.setAttribute('aria-expanded', String(t.open));
      setShown(panel, t.open);
      if (t.open && !t.loading) loadThread();
    });
    t.paint();
    if (t.open && !t.loading && (!t.loaded || t.list.length !== post.replies)) loadThread();
    return { toggle, panel };
  }

  function postCard(post, index) {
    const card = make('article', `poll-card ${post.kind}`);
    card.style.setProperty('--n', Math.min(index, 8));
    const fresh = !seen.has(post.id);
    if (!fresh) card.classList.add('static');
    seen.add(post.id);

    const head = make('div', 'poll-head');
    const time = make('span', 'poll-time');
    const stamp = () => {
      time.textContent = post.editedAt ? `${ago(post.at)} · edited` : ago(post.at);
    };
    stamp();
    head.appendChild(make('span', 'poll-kind', LABELS[post.kind]));
    if (post.closed) head.appendChild(make('span', 'poll-state', 'Closed'));
    head.appendChild(time);

    const content = make('div', 'poll-content');
    const viewBox = make('div', 'poll-view');
    const editBox = make('div', 'poll-edit-wrap');
    content.append(viewBox, editBox);

    function renderView(first) {
      viewBox.innerHTML = '';
      viewBox.appendChild(make('h2', 'poll-title', post.title));
      if (post.author) viewBox.appendChild(make('span', 'poll-author', `by ${post.author}`));
      if (post.body) viewBox.appendChild(make('p', 'poll-body', post.body));
      if (post.kind === 'poll') {
        const foot = make('div', 'poll-foot');
        const count = make('span', 'poll-count');
        const undo = button('', 'poll-undo', () => undoVote(post, repaint));
        undo.innerHTML = `${UNDO}<span>Undo vote</span>`;
        let options = null;
        let last = -1;
        const repaint = animate => {
          paintOptions(options, post, animate);
          count.textContent = `${post.total} ${post.total === 1 ? 'vote' : 'votes'}`;
          const show = post.mine.vote !== null && !post.closed;
          if (animate) setShown(undo, show);
          else undo.classList.toggle('hidden', !show);
          if (last !== -1 && last !== post.total) tick(count);
          last = post.total;
        };
        options = pollOptions(post, repaint);
        foot.append(count, undo);
        viewBox.append(options, foot);
        if (first && fresh && !reducedMotion()) requestAnimationFrame(() => requestAnimationFrame(() => repaint(true)));
        else repaint(false);
      }
      const mod = data.admin && post.kind === 'poll';
      if (mod || post.canEdit || post.canDelete) {
        const tools = make('div', 'poll-tools');
        if (post.canEdit) tools.appendChild(button('Edit', 'poll-tool', () => openEditor()));
        if (mod) {
          tools.appendChild(
            button(post.closed ? 'Reopen poll' : 'Close poll', 'poll-tool', async () => {
              const ok = await act(() => profile.api('setClosed', { id: post.id, closed: !post.closed }), post.closed ? 'Poll reopened.' : 'Poll closed.');
              if (ok) load();
            })
          );
        }
        if (post.canDelete) {
          tools.appendChild(
            button('Delete', 'poll-tool danger', async () => {
              if (!confirm(`Delete "${post.title}"?`)) return;
              const ok = await act(() => profile.api('deletePost', { id: post.id }), 'Deleted.');
              if (!ok) return;
              seen.delete(post.id);
              threads.delete(post.id);
              voterViews.delete(post.id);
              editing.delete(post.id);
              data = { ...data, posts: data.posts.filter(item => item.id !== post.id) };
              await exitRow(card);
              card.remove();
              if (!visible().length) renderList();
            })
          );
        }
        viewBox.appendChild(tools);
      }
    }

    function openEditor() {
      editing.set(post.id, { title: post.title, body: post.body, options: post.options.map(option => option.text) });
      editBox.replaceChildren(editForm(post, close));
      setShown(viewBox, false);
      setShown(editBox, true);
    }

    function close(saved) {
      if (saved) {
        stamp();
        renderView(false);
      }
      setShown(editBox, false);
      setShown(viewBox, true);
    }

    renderView(true);
    if (editing.has(post.id)) {
      editBox.appendChild(editForm(post, close));
      viewBox.classList.add('hidden');
    } else editBox.classList.add('hidden');

    const meta = make('div', 'poll-meta');
    const bar = make('div', 'poll-bar');
    const replies = repliesSection(post);
    bar.appendChild(replies.toggle);
    const voters = data.admin && post.kind === 'poll' ? votersSection(post) : null;
    if (voters) bar.appendChild(voters.toggle);
    meta.appendChild(bar);
    if (voters) meta.appendChild(voters.panel);
    meta.appendChild(replies.panel);

    card.append(head, content, meta);
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