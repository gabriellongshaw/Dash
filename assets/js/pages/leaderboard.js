import { profile } from '../core/profile.js';
import { fetchBoard, fetchRank, shortName } from '../core/leaderboard.js';
import { msUntilReset, weekBoardScore } from '../core/quests.js';
import { mountAccount, signInFlow } from '../components/account.js';
import { detectTouch } from '../core/theme.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';
import { setCoins } from '../core/motion.js';
import { colourFor } from '../components/avatar.js';

const $ = id => document.getElementById(id);

const CACHE_MS = 30000;

function formatTime(ms) {
  const mins = Math.ceil(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${Math.max(1, mins % 60)}m`;
}

document.addEventListener('DOMContentLoaded', () => {
  detectTouch();
  initPageFadeIn();
  profile.init();
  mountAccount($('account'));

  const list = $('rank-list');
  const tabs = $('tabs');
  const note = $('note');
  const visibility = $('visibility-btn');
  let scope = 'week';
  let token = 0;
  const cache = {};
  let shown = '';

  const keyOf = name => (name === 'all' ? 'all' : profile.state.quests.week);
  const scoreOf = name => (name === 'all' ? profile.state.best : weekBoardScore(profile.state.quests, profile.state.best));
  const myScore = () => scoreOf(scope);

  function row(entry, rank, index, me) {
    const el = document.createElement('div');
    el.className = 'rank-row' + (rank <= 3 ? ` top-${rank}` : '') + (me ? ' me' : '');
    el.style.setProperty('--n', index);
    const pos = document.createElement('span');
    pos.className = 'rank-pos';
    pos.textContent = rank;
    const avatar = document.createElement('span');
    avatar.className = 'rank-avatar';
    avatar.style.background = colourFor(entry.id);
    avatar.textContent = entry.name.charAt(0).toUpperCase();
    const name = document.createElement('span');
    name.className = 'rank-name';
    name.textContent = entry.name;
    if (me) {
      const you = document.createElement('span');
      you.className = 'rank-you';
      you.textContent = 'You';
      name.appendChild(you);
    }
    const score = document.createElement('span');
    score.className = 'rank-score';
    score.textContent = entry.score;
    el.append(pos, avatar, name, score);
    return el;
  }

  function message(text, retry) {
    shown = '';
    list.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'quest-empty';
    p.textContent = text;
    list.appendChild(p);
    if (retry) {
      const btn = document.createElement('button');
      btn.className = 'tertiary-button';
      btn.textContent = 'Try again';
      btn.addEventListener('click', () => load(true));
      list.appendChild(btn);
    }
  }

  function skeleton() {
    shown = '';
    list.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const el = row({ id: String(i), name: '        ', score: '0000' }, i + 1, i, false);
      el.classList.add('skeleton');
      list.appendChild(el);
    }
  }

  function renderEntries(entries, myRank) {
    const uid = profile.state.uid;
    list.innerHTML = '';
    if (!entries.length) {
      message('No scores yet. Be the first!');
      return;
    }
    entries.forEach((entry, i) => list.appendChild(row(entry, i + 1, i, entry.id === uid)));
    const inList = uid && entries.some(entry => entry.id === uid);
    if (uid && !inList && myRank && profile.state.publicBoard && myScore() > 0) {
      const gap = document.createElement('div');
      gap.className = 'rank-gap';
      gap.textContent = '···';
      list.appendChild(gap);
      list.appendChild(row({ id: uid, name: shortName(profile.state.name), score: myScore() }, myRank, 0, true));
    }
  }

  async function pull(name) {
    const key = keyOf(name);
    const entries = await fetchBoard(key);
    const uid = profile.state.uid;
    const score = scoreOf(name);
    let rank = null;
    if (uid && profile.state.publicBoard && score > 0 && !entries.some(entry => entry.id === uid)) {
      try {
        rank = await fetchRank(key, score);
      } catch {}
    }
    return { entries, rank };
  }

  const signature = (key, result) => JSON.stringify([key, profile.state.uid, result.entries.map(entry => [entry.id, entry.score]), result.rank]);

  async function load(force, quiet) {
    const name = scope;
    const other = name === 'all' ? 'week' : 'all';
    const key = keyOf(name);
    const mine = ++token;
    const hit = cache[key];
    if (!force && hit && Date.now() - hit.at < CACHE_MS) {
      shown = signature(key, hit);
      renderEntries(hit.entries, hit.rank);
      return;
    }
    if (!quiet || !shown) skeleton();
    const at = Date.now();
    const otherKey = keyOf(other);
    pull(other).then(
      result => {
        cache[otherKey] = { at, ...result };
      },
      () => {}
    );
    try {
      const result = await pull(name);
      cache[key] = { at, ...result };
      if (mine !== token) return;
      const next = signature(key, result);
      if (quiet && next === shown) return;
      shown = next;
      renderEntries(result.entries, result.rank);
    } catch (e) {
      if (mine !== token) return;
      message(
        e && e.code === 'permission-denied' ? 'The leaderboard is not set up yet.' : 'Could not load the leaderboard.',
        !(e && e.code === 'permission-denied')
      );
    }
  }

  function reload() {
    Object.keys(cache).forEach(k => delete cache[k]);
    load(true, true);
  }

  function renderMeta() {
    $('meta-left').textContent = scope === 'all' ? 'Best score ever' : 'Best score this week';
    $('meta-right').textContent = scope === 'all' ? '' : `Resets in ${formatTime(msUntilReset('w'))}`;
  }

  function renderChrome() {
    const signedIn = profile.session.status === 'in';
    note.classList.toggle('hidden', profile.session.status !== 'out');
    setCoins($('wallet'), profile.state.coins);
    visibility.classList.toggle('hidden', !signedIn);
    visibility.textContent = profile.state.publicBoard ? 'Hide me from the leaderboard' : 'Show me on the leaderboard';
    renderMeta();
  }

  const tabButtons = [...document.querySelectorAll('.tab')];
  tabButtons.forEach(tab => {
    tab.addEventListener('click', () => {
      if (scope === tab.dataset.scope) return;
      scope = tab.dataset.scope;
      tabs.style.setProperty('--i', scope === 'week' ? 0 : 1);
      tabButtons.forEach(t => {
        const active = t === tab;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', active);
      });
      renderMeta();
      load(false);
    });
  });

  visibility.addEventListener('click', () => {
    visibility.blur();
    profile.setPublicBoard(!profile.state.publicBoard);
    Object.keys(cache).forEach(k => delete cache[k]);
    setTimeout(reload, 900);
  });

  $('note-signin').addEventListener('click', () => signInFlow());
  $('back-btn').addEventListener('click', () => navigateTo('../'));

  let lastUid = profile.state.uid;
  let wasSyncing = profile.session.syncing;
  profile.subscribe(() => {
    renderChrome();
    const syncing = profile.session.syncing;
    const synced = wasSyncing && !syncing;
    wasSyncing = syncing;
    if (profile.state.uid !== lastUid || synced) {
      lastUid = profile.state.uid;
      reload();
    }
  });

  window.addEventListener('pageshow', e => {
    if (e.persisted) reload();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) load(false);
  });

  document.querySelectorAll('.leave-button').forEach(el => {
    el.addEventListener('touchstart', () => el.classList.add('hover'), { passive: true });
    const remove = () => el.classList.remove('hover');
    el.addEventListener('touchend', remove, { passive: true });
    el.addEventListener('touchcancel', remove, { passive: true });
  });

  renderChrome();
  load(false);
});