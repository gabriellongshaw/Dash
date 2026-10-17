const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function bump(el) {
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

export function setCoins(el, value) {
  const text = String(value);
  if (el.textContent === text) return;
  const seen = el.dataset.seen === '1';
  el.textContent = text;
  el.dataset.seen = '1';
  const pill = el.closest('.coin-pill');
  if (seen && pill) bump(pill);
}

export function countTo(el, to, { duration = 700, suffix = '' } = {}) {
  cancelAnimationFrame(el.countFrame);
  if (reduced() || !(to > 0)) {
    el.textContent = `${to}${suffix}`;
    return;
  }
  const start = performance.now();
  const step = now => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = `${Math.round(to * eased)}${suffix}`;
    if (t < 1) el.countFrame = requestAnimationFrame(step);
  };
  el.countFrame = requestAnimationFrame(step);
}