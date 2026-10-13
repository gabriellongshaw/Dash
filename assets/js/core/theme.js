const VARS = {
  skyTop: '--sky-top',
  skyBottom: '--sky-bottom',
  sun: '--sun',
  cloud: '--cloud',
  far: '--far',
  mid: '--mid',
  ground: '--ground',
  groundLine: '--ground-line',
  dust: '--dust',
  runner: '--runner',
  runnerDark: '--runner-dark',
  visor: '--visor',
  scarf: '--scarf',
  hazard: '--hazard',
  hazardDark: '--hazard-dark',
  hazardLight: '--hazard-light',
  coin: '--coin',
  coinDark: '--coin-dark'
};

export function readPalette() {
  const style = getComputedStyle(document.documentElement);
  const palette = {};
  for (const key in VARS) palette[key] = style.getPropertyValue(VARS[key]).trim();
  return palette;
}

export function onThemeChange(callback) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    requestAnimationFrame(callback);
  });
}

export function detectTouch() {
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
    document.body.classList.add('touch');
  }
}
