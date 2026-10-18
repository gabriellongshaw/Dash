import { audio, hosted } from './audio.js';

export function initPageFadeIn() {
  requestAnimationFrame(() => {
    document.body.style.opacity = '1';
  });
  window.addEventListener('pageshow', e => {
    if (e.persisted) {
      document.body.classList.remove('leaving');
      document.body.style.opacity = '1';
      document.getAnimations().forEach(a => {
        if (a.animationName) {
          a.cancel();
          a.play();
        }
      });
    }
  });
}

export function navigateTo(url) {
  document.body.classList.add('leaving');
  document.body.style.opacity = '0';
  if (!hosted) audio.fadeOut(0.18);
  setTimeout(() => {
    window.location.href = url;
  }, 200);
}