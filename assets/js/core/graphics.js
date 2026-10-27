const KEY = 'dash:graphics';
const VERDICT_KEY = 'dash:graphics-verdict';
const MODES = ['auto', 'on', 'off'];
const LEVELS = ['full', 'lite', 'off'];
const LAYERS = {
  full: [0.2, 0.36, 0.47, 0.85, 1.44, 2.07, 2.88, 3.83, 4.95, 6.75],
  lite: [0.85, 2.88, 6.75]
};
const TTL = 30 * 60 * 1000;
const AWAY = 60 * 1000;
const LOW_BATTERY = 0.2;
const CAPPED_MS = 26;
const MIN_FRAMES = 12;
const BASE_MS = 360;
const PROBE_MS = 480;
const MASK = 'linear-gradient(to bottom, #000 40%, transparent)';

const listeners = new Set();
const pending = new Set();

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

function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

function loadVerdict() {
  try {
    const saved = JSON.parse(read(VERDICT_KEY));
    if (saved && LEVELS.includes(saved.level) && Date.now() - saved.at < TTL) return saved.level;
  } catch {}
  return null;
}

let mode = MODES.includes(read(KEY)) ? read(KEY) : 'auto';
let verdict = loadVerdict();
let baseline = 0;
let lowBattery = false;
let started = false;
let probing = false;
let hiddenAt = 0;
let watching = false;
let lastScroll = 0;
let cooldown = 0;

remove('dash:graphics-auto');

function constrained() {
  const connection = navigator.connection;
  if (connection && connection.saveData) return true;
  return window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
}

function hint() {
  const memory = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  if (memory <= 2 || cores <= 2) return 'off';
  if (memory <= 4 || cores <= 4) return 'lite';
  return 'full';
}

function level() {
  if (mode === 'on') return 'full';
  if (mode === 'off') return 'off';
  if (lowBattery || constrained()) return 'off';
  return verdict || hint();
}

function apply() {
  const next = level();
  const root = document.documentElement;
  root.classList.toggle('no-blur', next === 'off');
  root.classList.toggle('lite-blur', next === 'lite');
  listeners.forEach(fn => fn());
}

function setVerdict(next) {
  verdict = next;
  write(VERDICT_KEY, JSON.stringify({ level: next, at: Date.now() }));
  apply();
}

function resetVerdict() {
  verdict = null;
  remove(VERDICT_KEY);
  apply();
}

function pick(values, share) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))];
}

function healthy(gaps, base) {
  if (gaps.length < MIN_FRAMES) return false;
  return pick(gaps, 0.5) <= base * 1.3 + 1 && pick(gaps, 0.9) <= base * 1.7 + 2;
}

function interrupt() {
  pending.forEach(fn => fn());
}

function sample(duration, step) {
  return new Promise(resolve => {
    const gaps = [];
    let last = 0;
    let begin = 0;
    let frame = 0;

    const end = result => {
      cancelAnimationFrame(frame);
      pending.delete(abort);
      resolve(result);
    };
    const abort = () => end(null);
    pending.add(abort);

    const tick = now => {
      if (!begin) begin = now;
      if (last) gaps.push(now - last);
      last = now;
      step(now);
      if (now - begin >= duration) {
        end(gaps.slice(3));
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  });
}

function buildStage() {
  const root = document.createElement('div');
  root.setAttribute('aria-hidden', 'true');
  root.style.cssText =
    'position:fixed;top:0;left:0;right:0;height:96px;z-index:2147483647;pointer-events:none;opacity:0.02;overflow:hidden';
  const field = document.createElement('div');
  field.style.cssText =
    'position:absolute;top:0;left:0;width:200%;height:100%;will-change:transform;background:repeating-linear-gradient(90deg,var(--bg,#808080) 0 12px,color-mix(in srgb,var(--bg,#808080) 88%,#808080) 12px 24px)';
  const glass = document.createElement('div');
  glass.style.cssText = 'position:absolute;inset:0';
  root.append(field, glass);
  document.body.appendChild(root);
  return { root, field, glass };
}

function fillGlass(glass, name) {
  glass.replaceChildren(
    ...LAYERS[name].map(px => {
      const layer = document.createElement('i');
      layer.style.cssText = `position:absolute;inset:0;-webkit-backdrop-filter:blur(${px}px);backdrop-filter:blur(${px}px);-webkit-mask-image:${MASK};mask-image:${MASK}`;
      return layer;
    })
  );
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function measureBase(move) {
  let best = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const gaps = await sample(BASE_MS, move);
    if (!gaps) return null;
    const median = gaps.length < MIN_FRAMES ? Infinity : pick(gaps, 0.5);
    if (best === null || median < best) best = median;
    if (best <= CAPPED_MS) break;
    await wait(1200);
  }
  return best;
}

async function probe() {
  if (probing || mode !== 'auto' || document.hidden || !document.body) return false;
  probing = true;
  const stage = buildStage();
  const move = now => {
    stage.field.style.transform = `translate3d(${-((now / 6) % 24)}px,0,0)`;
  };
  try {
    const base = await measureBase(move);
    if (base === null) return false;
    if (base > CAPPED_MS) {
      setVerdict('off');
      return true;
    }
    baseline = base;
    for (const name of ['full', 'lite']) {
      fillGlass(stage.glass, name);
      const gaps = await sample(PROBE_MS, move);
      if (!gaps) return false;
      if (healthy(gaps, base)) {
        setVerdict(name);
        return true;
      }
    }
    setVerdict('off');
    return true;
  } finally {
    stage.root.remove();
    probing = false;
  }
}

function schedule(delay, tries = 3) {
  setTimeout(async () => {
    if (mode !== 'auto' || verdict) return;
    const done = await probe();
    if (!done && tries > 1) schedule(4000, tries - 1);
  }, delay);
}

function judge(gaps) {
  if (gaps.length < 10) return;
  const limit = Math.max((baseline || 16.7) * 1.6, 24);
  const slow = gaps.filter(gap => gap > limit).length;
  if (slow / gaps.length <= 0.3) return;
  const next = LEVELS[LEVELS.indexOf(level()) + 1];
  if (next) setVerdict(next);
}

function onScroll() {
  lastScroll = performance.now();
  if (watching || probing || mode !== 'auto' || level() === 'off' || lastScroll < cooldown) return;
  watching = true;
  const begin = lastScroll;
  const gaps = [];
  let last = 0;

  const tick = now => {
    if (last) gaps.push(now - last);
    last = now;
    if (now - lastScroll < 160 && now - begin < 1500 && !document.hidden) {
      requestAnimationFrame(tick);
      return;
    }
    watching = false;
    cooldown = now + 3000;
    judge(gaps.slice(1));
  };
  requestAnimationFrame(tick);
}

function onVisibility() {
  if (document.hidden) {
    hiddenAt = Date.now();
    interrupt();
    return;
  }
  if (mode === 'auto' && hiddenAt && Date.now() - hiddenAt > AWAY) {
    resetVerdict();
    schedule(600);
  }
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

function watchEnvironment() {
  window.matchMedia('(prefers-reduced-transparency: reduce)').addEventListener?.('change', apply);
  navigator.connection?.addEventListener?.('change', apply);
}

export const graphics = {
  get mode() {
    return mode;
  },
  get level() {
    return level();
  },
  get blur() {
    return level() !== 'off';
  },
  setMode(next) {
    if (!MODES.includes(next) || next === mode) return;
    mode = next;
    write(KEY, next);
    if (next === 'auto') {
      resetVerdict();
      schedule(300);
      return;
    }
    apply();
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
  watchEnvironment();
  ['pointerdown', 'keydown', 'touchstart'].forEach(type =>
    document.addEventListener(type, interrupt, { capture: true, passive: true })
  );
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
  if (mode !== 'auto' || verdict) return;
  if (document.readyState === 'complete') schedule(900);
  else window.addEventListener('load', () => schedule(900), { once: true });
}