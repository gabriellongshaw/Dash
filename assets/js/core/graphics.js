const KEY = 'dash:graphics';
const VERDICT_KEY = 'dash:graphics-auto';
const MODES = ['auto', 'on', 'off'];
const SLOW_MS = 22;
const TTL = 20 * 60 * 1000;
const LOW_BATTERY = 0.2;
const MIN_GAPS = 20;

const listeners = new Set();

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

let mode = MODES.includes(read(KEY)) ? read(KEY) : 'auto';
let slow = Date.now() - (Number(read(VERDICT_KEY)) || 0) < TTL;
let lowBattery = false;
let started = false;

function weakDevice() {
  const nav = navigator;
  if (nav.connection && nav.connection.saveData) return true;
  if (window.matchMedia('(prefers-reduced-transparency: reduce)').matches) return true;
  if (nav.deviceMemory && nav.deviceMemory <= 2) return true;
  if (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2) return true;
  return false;
}

function blurOn() {
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return !slow && !lowBattery && !weakDevice();
}

function apply() {
  document.documentElement.classList.toggle('no-blur', !blurOn());
  listeners.forEach(fn => fn());
}

function measure(duration) {
  if (document.hidden) return;
  const gaps = [];
  const begin = performance.now();
  let last = 0;
  let frame = 0;

  const stop = () => {
    cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', stop);
  };

  const tick = now => {
    if (last) gaps.push(now - last);
    last = now;
    if (now - begin < duration) {
      frame = requestAnimationFrame(tick);
      return;
    }
    stop();
    const sample = gaps.slice(4).sort((a, b) => a - b);
    if (sample.length < MIN_GAPS || mode !== 'auto') return;
    if (sample[Math.floor(sample.length / 2)] > SLOW_MS) {
      const changed = !slow;
      slow = true;
      write(VERDICT_KEY, String(Date.now()));
      if (changed) apply();
    }
  };

  document.addEventListener('visibilitychange', stop);
  frame = requestAnimationFrame(tick);
}

function canJudge() {
  return mode === 'auto';
}

function watchBattery() {
  if (typeof navigator.getBattery !== 'function') return;
  navigator
    .getBattery()
    .then(battery => {
      const update = () => {
        const next = !battery.charging && battery.level <= LOW_BATTERY;
        if (next === lowBattery) return;
        lowBattery = next;
        apply();
      };
      battery.addEventListener('chargingchange', update);
      battery.addEventListener('levelchange', update);
      update();
    })
    .catch(() => {});
}

function watch() {
  if (!canJudge()) return;
  setTimeout(() => {
    if (canJudge()) measure(1400);
  }, 700);
  document.addEventListener(
    'scroll',
    () => {
      if (canJudge()) measure(1200);
    },
    { capture: true, passive: true, once: true }
  );
}

export const graphics = {
  get mode() {
    return mode;
  },
  get blur() {
    return blurOn();
  },
  setMode(next) {
    if (!MODES.includes(next) || next === mode) return;
    mode = next;
    write(KEY, next);
    if (next === 'auto') {
      slow = false;
      try {
        localStorage.removeItem(VERDICT_KEY);
      } catch {}
    }
    apply();
    if (next === 'auto') watch();
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
};

apply();

export function initGraphics() {
  if (started) return;
  started = true;
  apply();
  watchBattery();
  watch();
}