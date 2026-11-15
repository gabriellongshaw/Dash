import { navigateTo } from '../core/transition.js';

let pending = null;

function loadVersion() {
  if (!pending) {
    pending = fetch(new URL('../../../version.json', import.meta.url), { cache: 'no-cache' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => (data && /^\d+\.\d+\.\d+$/.test(data.version) ? data.version : null))
      .catch(() => null);
  }
  return pending;
}

export async function mountVersion(parent, { href = '', inline = false } = {}) {
  if (!parent) return;
  const version = await loadVersion();
  if (!version || parent.querySelector('.version-tag')) return;
  const el = document.createElement(href ? 'a' : 'span');
  el.className = inline ? 'credits-link version-tag' : 'version-tag';
  el.textContent = inline ? `v${version}` : `Dash v${version}`;
  if (href) {
    el.href = href;
    el.addEventListener('click', event => {
      event.preventDefault();
      navigateTo(href);
    });
  }
  if (inline) {
    const parts = parent.querySelectorAll('p');
    const last = parts[parts.length - 1] || parent;
    last.append(' · ', el);
    return;
  }
  parent.appendChild(el);
}