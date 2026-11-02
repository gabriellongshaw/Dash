const KEY = 'dash:mode';

export const MODES = ['classic', 'third'];

export function getMode() {
  try {
    const value = localStorage.getItem(KEY);
    return MODES.includes(value) ? value : 'classic';
  } catch {
    return 'classic';
  }
}

export function setMode(mode) {
  if (!MODES.includes(mode)) return;
  try {
    localStorage.setItem(KEY, mode);
  } catch {}
}