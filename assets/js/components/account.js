import { profile } from '../core/profile.js';

let toastEl = null;
let toastTimer = 0;

export function showToast(text) {
  if (!text) return;
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = text;
  toastEl.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 3800);
}

function messageFor(e) {
  const code = (e && e.code) || '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return '';
  if (code === 'auth/unauthorized-domain') return 'This domain is not authorised for sign-in yet.';
  if (code === 'auth/operation-not-allowed') return 'Google sign-in is not enabled yet.';
  if (code === 'auth/network-request-failed') return 'Network error. Try again.';
  if (code === 'dash/not-ready') return 'Still connecting. Try again in a moment.';
  return 'Sign-in failed. Try again.';
}

export async function signInFlow() {
  try {
    await profile.signIn();
  } catch (e) {
    showToast(messageFor(e));
  }
}

const GOOGLE_ICON =
  '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';

export function mountAccount(el) {
  let lastError = null;

  function render() {
    const { status, syncing, error } = profile.session;
    const { uid, name, photo } = profile.state;
    el.innerHTML = '';
    el.classList.toggle('hidden', status === 'unavailable' && !uid);

    if (status === 'in' || (status === 'unavailable' && uid)) {
      const chip = document.createElement('button');
      chip.className = 'account-chip';
      chip.setAttribute('aria-label', 'Account');
      const avatar = document.createElement(photo ? 'img' : 'span');
      avatar.className = 'account-avatar';
      if (photo) {
        avatar.src = photo;
        avatar.alt = '';
        avatar.referrerPolicy = 'no-referrer';
      } else {
        avatar.textContent = (name || '?').charAt(0).toUpperCase();
      }
      const label = document.createElement('span');
      label.className = 'account-name';
      label.textContent = syncing ? 'Syncing' : (name || 'Account').split(' ')[0];
      chip.append(avatar, label);
      const menu = document.createElement('div');
      menu.className = 'account-menu hidden';
      const out = document.createElement('button');
      out.className = 'account-menu-item';
      out.textContent = 'Sign out';
      out.addEventListener('click', async e => {
        e.stopPropagation();
        menu.classList.add('hidden');
        try {
          await profile.signOut();
        } catch {
          showToast('Could not sign out. Try again.');
        }
      });
      menu.appendChild(out);
      chip.addEventListener('click', e => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
      });
      el.append(chip, menu);
    } else {
      const btn = document.createElement('button');
      btn.className = 'secondary-button account-btn';
      btn.disabled = status === 'loading';
      btn.innerHTML = GOOGLE_ICON + '<span class="account-btn-label">Sign in</span>';
      btn.addEventListener('click', () => {
        btn.blur();
        signInFlow();
      });
      el.appendChild(btn);
    }

    if (error && error !== lastError) {
      showToast(error === 'rules' ? 'Cloud saves are not set up yet. Progress is saved on this device.' : 'Could not reach cloud saves. Progress is saved on this device.');
    }
    lastError = error;
  }

  document.addEventListener('click', () => {
    const menu = el.querySelector('.account-menu');
    if (menu) menu.classList.add('hidden');
  });

  profile.subscribe(render);
  render();
}
