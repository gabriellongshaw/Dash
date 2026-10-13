const BEST_KEY = 'dash:best';

export function getBest() {
  try {
    return parseInt(localStorage.getItem(BEST_KEY), 10) || 0;
  } catch {
    return 0;
  }
}

export function setBest(value) {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch {}
}
