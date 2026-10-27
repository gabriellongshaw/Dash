const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const reducedMotion = reduced;

function restartAnimations(el) {
  const nodes = [el, ...el.querySelectorAll('*')];
  nodes.forEach(node => {
    node.style.animation = 'none';
  });
  void el.offsetWidth;
  nodes.forEach(node => {
    node.style.animation = '';
  });
}

export function showEl(el) {
  clearTimeout(el.hideTimer);
  el.classList.remove('closing', 'hidden');
  restartAnimations(el);
}

export function hideEl(el, ms = 180) {
  clearTimeout(el.hideTimer);
  if (el.classList.contains('hidden')) return;
  if (reduced()) {
    el.classList.remove('closing');
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('closing');
  void el.offsetWidth;
  el.classList.add('closing');
  el.hideTimer = setTimeout(() => {
    el.classList.add('hidden');
    el.classList.remove('closing');
  }, ms);
}

const SHOW_MS = 340;
const COLLAPSE = ['height', 'paddingTop', 'paddingBottom', 'marginTop', 'marginBottom'];

const measure = el => {
  const style = getComputedStyle(el);
  return Object.fromEntries(COLLAPSE.map(key => [key, style[key]]));
};

export function setShown(el, show) {
  const animating = !!el.shownAnim;
  const now = animating ? el.shownTarget : !el.classList.contains('hidden');
  if (now === show) return;
  el.shownTarget = show;
  if (reduced()) {
    if (animating) el.shownAnim.cancel();
    el.shownAnim = null;
    el.classList.toggle('hidden', !show);
    return;
  }
  const wasHidden = el.classList.contains('hidden');
  const start = wasHidden ? null : measure(el);
  const startOpacity = wasHidden ? '0' : getComputedStyle(el).opacity;
  if (animating) el.shownAnim.cancel();
  const flat = Object.fromEntries(COLLAPSE.map(key => [key, '0px']));
  const run = () => {
    const full = show ? measure(el) : flat;
    const anim = el.animate(
      [
        { ...(start || flat), opacity: startOpacity, transform: wasHidden ? 'translateY(-8px)' : 'translateY(0)' },
        { ...full, opacity: show ? '1' : '0', transform: show ? 'translateY(0)' : 'translateY(-8px)' }
      ],
      { duration: SHOW_MS, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' }
    );
    el.shownAnim = anim;
    anim.onfinish = () => {
      if (el.shownAnim !== anim) return;
      el.shownAnim = null;
      el.style.overflow = '';
      if (!show) el.classList.add('hidden');
    };
  };
  el.style.overflow = 'hidden';
  if (!show) {
    run();
    return;
  }
  el.classList.remove('hidden');
  const frame = requestAnimationFrame(run);
  el.shownAnim = { cancel: () => cancelAnimationFrame(frame) };
}

export function reveal(el) {
  el.classList.remove('reveal');
  void el.offsetWidth;
  el.classList.add('reveal');
}

export function exitRow(el, ms = 260) {
  if (reduced()) return Promise.resolve();
  el.style.setProperty('--h', `${el.offsetHeight}px`);
  void el.offsetWidth;
  el.classList.add('leaving');
  return new Promise(resolve => setTimeout(resolve, ms));
}

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