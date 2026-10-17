import { profile } from '../core/profile.js';
import { dailyQuests, weeklyQuests, progressOf, isClaimed, isReady, msUntilReset } from '../core/quests.js';
import { mountAccount, showToast, signInFlow } from '../components/account.js';
import { detectTouch } from '../core/theme.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';
import { setCoins } from '../core/motion.js';

const $ = id => document.getElementById(id);

const CHECK =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

function formatTime(ms) {
  const mins = Math.ceil(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const rest = mins % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${rest}m`;
  return `${Math.max(1, rest)}m`;
}

document.addEventListener('DOMContentLoaded', () => {
  detectTouch();
  initPageFadeIn();
  profile.init();
  mountAccount($('account'));

  const list = $('quest-list');
  const tabs = $('tabs');
  const note = $('note');
  const wallet = $('wallet');
  let scope = 'd';
  let animate = true;
  let busy = false;

  function questsForScope(q) {
    return scope === 'd' ? dailyQuests(q.day) : weeklyQuests(q.week);
  }

  function renderMeta() {
    const q = profile.state.quests;
    const quests = questsForScope(q);
    const claimed = quests.filter(item => isClaimed(q, item)).length;
    $('meta-left').textContent = `${claimed} of ${quests.length} claimed`;
    $('meta-right').textContent = `Resets in ${formatTime(msUntilReset(scope))}`;
  }

  function render() {
    const q = profile.state.quests;
    setCoins(wallet, profile.state.coins);
    note.classList.toggle('hidden', profile.session.status !== 'out');
    renderMeta();
    list.innerHTML = '';
    questsForScope(q).forEach((quest, index) => {
      const progress = Math.min(progressOf(q, quest), quest.target);
      const claimed = isClaimed(q, quest);
      const ready = isReady(q, quest);

      const card = document.createElement('div');
      card.className = 'quest-card' + (ready ? ' ready' : '') + (claimed ? ' claimed' : '');
      if (animate) card.style.setProperty('--n', index);
      else card.style.animation = 'none';

      const main = document.createElement('div');
      main.className = 'quest-main';
      const title = document.createElement('span');
      title.className = 'quest-title';
      title.textContent = quest.title;
      const bar = document.createElement('div');
      bar.className = 'quest-bar';
      const fill = document.createElement('span');
      fill.style.width = `${(progress / quest.target) * 100}%`;
      if (animate) fill.classList.add('grow');
      bar.appendChild(fill);
      const count = document.createElement('span');
      count.className = 'quest-count';
      count.textContent = `${progress} / ${quest.target}`;
      main.append(title, bar, count);

      const side = document.createElement('div');
      side.className = 'quest-side';
      const reward = document.createElement('span');
      reward.className = 'quest-reward';
      const dot = document.createElement('span');
      dot.className = 'coin-dot';
      reward.append(dot, String(quest.reward));
      side.appendChild(reward);
      if (claimed) {
        const done = document.createElement('span');
        done.className = 'quest-done';
        done.innerHTML = CHECK + 'Claimed';
        side.appendChild(done);
      } else if (ready) {
        const btn = document.createElement('button');
        btn.className = 'button small';
        btn.textContent = 'Claim';
        btn.addEventListener('click', () => claim(quest.id, btn));
        side.appendChild(btn);
      }

      card.append(main, side);
      list.appendChild(card);
    });
    animate = false;
  }

  async function claim(id, btn) {
    btn.blur();
    if (busy) return;
    busy = true;
    btn.disabled = true;
    const result = await profile.claimQuest(id);
    busy = false;
    if (result.ok) {
      if (result.reward > 0) showToast(`+${result.reward} coins`);
    } else {
      showToast(result.reason === 'offline' ? 'Could not reach cloud saves. Try again.' : 'Quest is not complete yet.');
      render();
    }
  }

  const tabButtons = [...document.querySelectorAll('.tab')];
  tabButtons.forEach(tab => {
    tab.addEventListener('click', () => {
      if (scope === tab.dataset.scope) return;
      scope = tab.dataset.scope;
      tabs.style.setProperty('--i', scope === 'd' ? 0 : 1);
      tabButtons.forEach(t => {
        const active = t === tab;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', active);
      });
      animate = true;
      render();
    });
  });

  $('note-signin').addEventListener('click', () => signInFlow());
  $('back-btn').addEventListener('click', () => navigateTo('../'));

  profile.subscribe(render);

  setInterval(() => {
    profile.refreshQuests();
    renderMeta();
  }, 30000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      profile.refreshQuests();
      render();
    }
  });

  document.querySelectorAll('.button, .leave-button').forEach(el => {
    el.addEventListener('touchstart', () => el.classList.add('hover'), { passive: true });
    const remove = () => el.classList.remove('hover');
    el.addEventListener('touchend', remove, { passive: true });
    el.addEventListener('touchcancel', remove, { passive: true });
  });

  profile.refreshQuests();
  render();
});