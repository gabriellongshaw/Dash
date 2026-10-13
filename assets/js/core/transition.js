export function initPageFadeIn() {
  requestAnimationFrame(() => {
    document.body.style.opacity = '1';
  });
  window.addEventListener('pageshow', e => {
    if (e.persisted) document.body.style.opacity = '1';
  });
}

export function navigateTo(url) {
  document.body.style.opacity = '0';
  setTimeout(() => {
    window.location.href = url;
  }, 200);
}
