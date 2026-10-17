import { audio } from '../core/audio.js';

const ON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

const OFF =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/><path d="m16 9 5 6"/><path d="m21 9-5 6"/></svg>';

export function mountSound(parent, { className = 'sound-btn', first = false } = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.dataset.silent = '';
  const render = () => {
    const on = audio.enabled;
    btn.innerHTML = on ? ON : OFF;
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Mute sound' : 'Turn sound on');
    btn.title = on ? 'Mute sound' : 'Turn sound on';
  };
  btn.addEventListener('click', () => {
    btn.blur();
    audio.toggleAll();
  });
  audio.subscribe(render);
  render();
  if (first) parent.prepend(btn);
  else parent.appendChild(btn);
  return btn;
}