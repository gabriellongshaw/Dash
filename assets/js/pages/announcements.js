import { profile } from '../core/profile.js';
import { mountAccount, showToast } from '../components/account.js';
import { detectTouch } from '../core/theme.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';
import { exitRow, setCoins, setShown } from '../core/motion.js';
import { initGraphics } from '../core/graphics.js';
import { initAudio, audio } from '../core/audio.js';
import { mountSound } from '../components/sound.js';
import { button, messageFor } from '../components/ui.js';

const $ = id => document.getElementById(id);

const FILTERS = ['all', 'update', 'event', 'fix', 'news'];
const TAGS = ['update', 'event', 'fix', 'news'];
const LABELS = { update: 'Update', event: 'Event', fix: 'Fix', news: 'News' };
const EMPTY = {
  all: 'No announcements yet. Check back soon.',
  update: 'No updates yet.',
  event: 'No events right now.',
  fix: 'No fixes posted yet.',
  news: 'No news yet.'
};
const LIMITS = { title: 80, body: 1500 };

const PLUS =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>';
const PIN =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"/><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3Z"/></svg>';

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

  const tabs = $('tabs');
  const composer = $('composer');
  const list = $('list');
  let data = { admin: false, items: [] };
  let filter = 'all';
  let loaded = false;
  let failed = false;
  let loading = false;
  let again = false;
  let busy = false;
  let loadedKey = null;
  let composerSig = '';
  const seen = new Set();

  tabs.style.setProperty('--count', FILTERS.length);

  async function act(fn, success, sound) {
    if (busy) return false;
    busy = true;
    try {
      const out = await fn();
      if (success) showToast(success);
      if (sound) audio.sfx(sound);
      return out === undefined ? true : out;
    } catch (e) {
      audio.sfx('error');
      showToast(messageFor(e));
      return false;
    } finally {
      busy = false;
    }
  }

  function buildForm(initial, submitLabel, onSubmit, onCancel) {
    const form = make('div', 'ann-form');
    let tag = initial.tag;
    let pinned = initial.pinned;
    const tagTabs = make('div', 'tabs poll-kind-tabs ann-kind-tabs');
    tagTabs.style.setProperty('--count', TAGS.length);
    tagTabs.appendChild(make('span', 'tab-pill'));
    const syncTags = () => {
      tagTabs.style.setProperty('--i', TAGS.indexOf(tag));
      tagTabs.querySelectorAll('.tab').forEach(item => {
        const on = item.dataset.tag === tag;
        item.classList.toggle('active', on);
        item.setAttribute('aria-selected', String(on));
      });
    };
    TAGS.forEach(name => {
      const item = make('button', 'tab', LABELS[name]);
      item.type = 'button';
      item.dataset.tag = name;
      item.setAttribute('role', 'tab');
      item.addEventListener('click', () => {
        tag = name;
        syncTags();
      });
      tagTabs.appendChild(item);
    });
    const title = make('input', 'friend-input');
    title.type = 'text';
    title.maxLength = LIMITS.title;
    title.autocomplete = 'off';
    title.placeholder = 'Headline';
    title.setAttribute('aria-label', 'Headline');
    title.value = initial.title;
    const body = make('textarea', 'friend-input poll-text');
    body.maxLength = LIMITS.body;
    body.rows = 6;
    body.placeholder = 'What is new?';
    body.setAttribute('aria-label', 'Details');
    body.value = initial.body;
    const pin = make('button', 'ann-pin');
    pin.type = 'button';
    pin.innerHTML = `${PIN}<span>Pin to top</span>`;
    const syncPin = () => {
      pin.classList.toggle('on', pinned);
      pin.setAttribute('aria-pressed', String(pinned));
    };
    pin.addEventListener('click', () => {
      pinned = !pinned;
      syncPin();
    });
    const actions = make('div', 'poll-actions');
    const group = make('div', 'poll-actions-group');
    group.appendChild(
      button(submitLabel, 'button', () => {
        if (!title.value.trim()) {
          audio.sfx('error');
          showToast('Add a headline.');
          return;
        }
        onSubmit({ tag, title: title.value, body: body.value, pinned });
      })
    );
    if (onCancel) group.appendChild(button('Cancel', 'tertiary-button', onCancel));
    actions.appendChild(group);
    form.append(tagTabs, title, body, pin, actions);
    syncTags();
    syncPin();
    return {
      el: form,
      reset() {
      title.value = '';
      body.value = '';
      pinned = false;
      tag = 'update';
      syncTags();
      syncPin();
    } };
  }

  function card(item, index) {
    const el = make('article', `poll-card ann ann-${item.tag}`);
    el.style.setProperty('--n', Math.min(index, 8));
    if (seen.has(item.id)) el.classList.add('static');
    seen.add(item.id);

    const head = make('div', 'poll-head');
    head.appendChild(make('span', `poll-kind ann-tag ann-tag-${item.tag}`, LABELS[item.tag]));
    if (item.pinned) {
      const badge = make('span', 'poll-state ann-pinned');
      badge.innerHTML = PIN;
      badge.appendChild(make('span', '', 'Pinned'));
      head.appendChild(badge);
    }
    head.appendChild(make('span', 'poll-time', item.editedAt ? `${ago(item.at)} · edited` : ago(item.at)));

    const view = make('div', 'poll-view');
    const edit = make('div', 'poll-edit-wrap hidden');

    function renderView() {
      view.innerHTML = '';
      view.appendChild(make('h2', 'poll-title', item.title));
      if (item.body) view.appendChild(make('p', 'poll-body', item.body));
      if (!data.admin) return;
      const tools = make('div', 'poll-tools');
      tools.appendChild(
        button('Edit', 'poll-tool', () => {
          const form = buildForm(item, 'Save', async payload => {
            const out = await act(() => profile.api('editAnnouncement', { id: item.id, ...payload }), 'Saved.', 'claim');
            if (!out) return;
            Object.assign(item, out.item);
            load();
          }, () => {
            setShown(edit, false);
            setShown(view, true);
          });
          edit.replaceChildren(form.el);
          setShown(view, false);
          setShown(edit, true);
        })
      );
      tools.appendChild(
        button(item.pinned ? 'Unpin' : 'Pin', 'poll-tool', async () => {
          const out = await act(() => profile.api('editAnnouncement', { id: item.id, tag: item.tag, title: item.title, body: item.body, pinned: !item.pinned }), item.pinned ? 'Unpinned.' : 'Pinned.');
          if (out) load();
        })
      );
      tools.appendChild(
        button('Delete', 'poll-tool danger', async () => {
          if (!confirm(`Delete "${item.title}"?`)) return;
          const ok = await act(() => profile.api('deleteAnnouncement', { id: item.id }), 'Deleted.');
          if (!ok) return;
          seen.delete(item.id);
          data = { ...data, items: data.items.filter(other => other.id !== item.id) };
          await exitRow(el);
          el.remove();
          if (!visible().length) renderList();
        })
      );
      view.appendChild(tools);
    }

    renderView();
    el.append(head, view, edit);
    return el;
  }

  const visible = () => data.items.filter(item => filter === 'all' || item.tag === filter);

  function skeleton() {
    for (let i = 0; i < 2; i++) {
      const el = make('div', 'poll-card skeleton');
      el.append(make('span', 'poll-sk-head'), make('span', 'poll-sk-title'), make('span', 'poll-sk-row'));
      list.appendChild(el);
    }
  }

  function renderList() {
    list.innerHTML = '';
    if (!loaded) {
      if (failed || profile.session.status === 'unavailable') {
        list.appendChild(make('p', 'quest-empty', 'Could not load announcements.'));
        if (failed) list.appendChild(button('Try again', 'tertiary-button', () => load()));
      } else skeleton();
      return;
    }
    const items = visible();
    if (!items.length) {
      list.appendChild(make('p', 'quest-empty reveal', EMPTY[filter]));
      return;
    }
    items.forEach((item, i) => list.appendChild(card(item, i)));
  }

  function buildComposer() {
    composer.innerHTML = '';
    const allowed = profile.social && data.admin;
    setShown(composer, !!allowed);
    if (!allowed) return;
    const toggle = make('button', 'secondary-button poll-compose-toggle');
    toggle.type = 'button';
    const label = make('span', '', 'New announcement');
    const icon = make('span', 'poll-compose-icon');
    icon.innerHTML = PLUS;
    toggle.append(icon, label);
    const panel = make('div', 'friend-card poll-composer hidden');
    const form = buildForm({ tag: 'update', title: '', body: '', pinned: false }, 'Post', async payload => {
      const out = await act(() => profile.api('createAnnouncement', payload), 'Posted.', 'claim');
      if (!out) return;
      form.reset();
      open(false);
      seen.delete(out.item && out.item.id);
      if (filter !== 'all' && filter !== payload.tag) setFilter(payload.tag);
      load();
    });
    panel.appendChild(form.el);
    let opened = false;
    const open = on => {
      opened = on;
      toggle.classList.toggle('on', on);
      label.textContent = on ? 'Cancel' : 'New announcement';
      setShown(panel, on);
    };
    toggle.addEventListener('click', () => open(!opened));
    composer.append(toggle, panel);
  }

  function renderComposer() {
    const sig = `${profile.social}:${data.admin}`;
    if (sig === composerSig) return;
    composerSig = sig;
    buildComposer();
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
        data = await profile.api('listAnnouncements');
        loaded = true;
        failed = false;
      } catch {
        failed = !loaded;
        if (loaded) showToast('Could not refresh announcements.');
      }
      renderList();
      renderComposer();
    } while (again);
    loading = false;
  }

  const keyOf = () => (profile.canView ? (profile.social ? profile.state.uid : 'guest') : null);

  profile.subscribe(() => {
    setCoins($('wallet'), profile.state.coins);
    if (loaded) renderComposer();
    const key = keyOf();
    if (!key || profile.session.syncing || key === loadedKey) return;
    loadedKey = key;
    load();
  });

  tabs.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => setFilter(tab.dataset.filter));
  });

  $('back-btn').addEventListener('click', () => navigateTo('../'));

  document.querySelectorAll('.button, .secondary-button, .leave-button').forEach(el => {
    el.addEventListener('touchstart', () => el.classList.add('hover'), { passive: true });
    const remove = () => el.classList.remove('hover');
    el.addEventListener('touchend', remove, { passive: true });
    el.addEventListener('touchcancel', remove, { passive: true });
  });

  setCoins($('wallet'), profile.state.coins);
  renderList();
});