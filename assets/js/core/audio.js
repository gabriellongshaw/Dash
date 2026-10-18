import { STEP_SECONDS, TOTAL_STEPS, createInstruments, scheduleStep } from './music.js';

const KEY = 'dash:sound';
const CLOCK_KEY = 'dash:music-clock';
const LOOKAHEAD = 0.18;
const TICK_MS = 30;

const listeners = new Set();
const lastPlayed = {};
let ctx = null;
let master = null;
let musicBus = null;
let sfxBus = null;
let noise = null;
let inst = null;
let wantLevel = 0;
let level = 0;
let timer = 0;
let step = 0;
let nextTime = 0;
let playing = false;
let unlockBound = false;
let unlocked = false;
let uiBound = false;

function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return { music: !raw || raw.music !== false, sfx: !raw || raw.sfx !== false };
  } catch {
    return { music: true, sfx: true };
  }
}

function findHost() {
  try {
    if (window.parent !== window && window.parent.__dashAudio) return window.parent.__dashAudio;
  } catch {}
  return null;
}

const host = findHost();

export const hosted = host !== null;

let settings = loadSettings();

function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {}
}

function emit() {
  listeners.forEach(fn => fn());
}

function ensure() {
  if (ctx) return ctx;
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return null;
  ctx = new Context();
  ctx.onstatechange = onState;
  if (ctx.state === 'running') unlocked = true;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.ratio.value = 6;
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(limiter).connect(ctx.destination);
  musicBus = ctx.createGain();
  musicBus.gain.value = 0;
  musicBus.connect(master);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.7;
  sfxBus.connect(master);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  inst = createInstruments(ctx, noise);
  return ctx;
}

function clockStart() {
  const now = Date.now();
  try {
    const stored = Number(localStorage.getItem(CLOCK_KEY));
    if (Number.isFinite(stored) && stored > 0 && stored <= now) return stored;
    localStorage.setItem(CLOCK_KEY, String(now));
  } catch {}
  return now;
}

function pump() {
  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    scheduleStep(inst, musicBus, step, nextTime);
    nextTime += STEP_SECONDS;
    step = (step + 1) % TOTAL_STEPS;
  }
}

function fade(target, seconds) {
  const t = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(t);
  musicBus.gain.setValueAtTime(musicBus.gain.value, t);
  musicBus.gain.linearRampToValueAtTime(target, t + seconds);
}

function beginMusic() {
  if (playing || !ctx || ctx.state !== 'running' || !settings.music || !wantLevel || document.hidden) return;
  const loopSeconds = TOTAL_STEPS * STEP_SECONDS;
  const elapsed = (((Date.now() - clockStart()) / 1000) % loopSeconds + loopSeconds) % loopSeconds;
  const exact = elapsed / STEP_SECONDS;
  step = Math.ceil(exact) % TOTAL_STEPS;
  nextTime = ctx.currentTime + 0.06 + (Math.ceil(exact) - exact) * STEP_SECONDS;
  playing = true;
  level = wantLevel;
  musicBus.gain.cancelScheduledValues(ctx.currentTime);
  musicBus.gain.setValueAtTime(0, ctx.currentTime);
  fade(level * 0.55, 0.5);
  pump();
  timer = setInterval(pump, TICK_MS);
}

function endMusic(seconds = 0.25) {
  if (!playing) return;
  playing = false;
  clearInterval(timer);
  fade(0, seconds);
}

function tryStart() {
  if (!wantLevel || !settings.music) return;
  const c = ensure();
  if (!c) return;
  if (c.state === 'running') {
    beginMusic();
    return;
  }
  c.resume().then(beginMusic, () => {});
}

function onState() {
  if (ctx.state === 'running') {
    unlocked = true;
    tryStart();
  } else endMusic(0);
}

function prime(c) {
  const src = c.createBufferSource();
  src.buffer = c.createBuffer(1, 1, c.sampleRate);
  src.connect(c.destination);
  src.start(0);
}

function unlock() {
  const c = ensure();
  if (!c) return;
  if (!unlocked) prime(c);
  if (c.state === 'running') tryStart();
  else c.resume().then(tryStart, () => {});
}

const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'];

function bindUnlock() {
  if (unlockBound) return;
  unlockBound = true;
  UNLOCK_EVENTS.forEach(type => window.addEventListener(type, unlock, true));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) endMusic(0.1);
    else tryStart();
  });
  window.addEventListener('pageshow', e => {
    if (e.persisted) tryStart();
  });
}

function blip(bus, { type = 'square', from, to, dur, vol, t = ctx.currentTime, attack = 0.004 }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to && to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(bus);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

function swoosh(bus, { from, to, dur, vol, q = 1.2, t = ctx.currentTime }) {
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = noise;
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + dur * 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter).connect(gain).connect(bus);
  src.start(t, Math.random() * 0.4);
  src.stop(t + dur + 0.03);
}

const NOTES = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5, G6: 1568 };

function run(notes, { gap, dur, vol, type = 'square' }) {
  const t = ctx.currentTime;
  notes.forEach((name, i) => blip(sfxBus, { type, from: NOTES[name], dur, vol, t: t + i * gap }));
}

const EFFECTS = {
  jump: () => blip(sfxBus, { from: 280, to: 640, dur: 0.14, vol: 0.2 }),
  double: () => {
    blip(sfxBus, { from: 420, to: 900, dur: 0.12, vol: 0.18 });
    blip(sfxBus, { from: 640, to: 1300, dur: 0.14, vol: 0.14, t: ctx.currentTime + 0.07 });
  },
  slide: () => swoosh(sfxBus, { from: 2400, to: 500, dur: 0.22, vol: 0.28 }),
  coin: () => {
    blip(sfxBus, { from: 988, dur: 0.07, vol: 0.14 });
    blip(sfxBus, { from: 1319, dur: 0.18, vol: 0.14, t: ctx.currentTime + 0.06 });
  },
  hit: () => {
    swoosh(sfxBus, { from: 1800, to: 120, dur: 0.45, vol: 0.5, q: 0.7 });
    blip(sfxBus, { type: 'sawtooth', from: 260, to: 45, dur: 0.45, vol: 0.28 });
  },
  best: () => run(['C5', 'E5', 'G5', 'C6', 'E6'], { gap: 0.085, dur: 0.18, vol: 0.14 }),
  click: () => blip(sfxBus, { type: 'triangle', from: 700, to: 520, dur: 0.05, vol: 0.18 }),
  toggle: () => blip(sfxBus, { type: 'triangle', from: 520, to: 780, dur: 0.08, vol: 0.18 }),
  equip: () => run(['G5', 'C6'], { gap: 0.06, dur: 0.1, vol: 0.13, type: 'triangle' }),
  buy: () => run(['E5', 'G5', 'C6', 'E6'], { gap: 0.07, dur: 0.16, vol: 0.13 }),
  claim: () => run(['C5', 'G5', 'C6', 'G6'], { gap: 0.07, dur: 0.16, vol: 0.13 }),
  gift: () => run(['G5', 'B5', 'E6', 'G6', 'E6', 'G6'], { gap: 0.06, dur: 0.14, vol: 0.12, type: 'triangle' }),
  request: () => run(['E5', 'A5'], { gap: 0.09, dur: 0.14, vol: 0.13, type: 'triangle' }),
  error: () => blip(sfxBus, { type: 'sawtooth', from: 180, to: 110, dur: 0.22, vol: 0.16 })
};

const MIN_GAP = { coin: 0.04, click: 0.03, jump: 0.05, double: 0.05 };

const local = {
  get settings() {
    return settings;
  },

  get enabled() {
    return settings.music || settings.sfx;
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  set(next) {
    settings = { ...settings, ...next };
    saveSettings();
    if (!settings.music) endMusic(0.2);
    else tryStart();
    emit();
  },

  sfx(name) {
    if (!settings.sfx || !EFFECTS[name]) return;
    const c = ensure();
    if (!c) return;
    if (c.state !== 'running') {
      c.resume().catch(() => {});
      return;
    }
    const now = c.currentTime;
    if (now - (lastPlayed[name] || 0) < (MIN_GAP[name] || 0)) return;
    lastPlayed[name] = now;
    EFFECTS[name]();
  },

  music(volume) {
    wantLevel = volume;
    bindUnlock();
    if (playing && ctx) {
      level = volume;
      fade(level * 0.55, 0.4);
    } else tryStart();
  },

  duck(volume) {
    wantLevel = volume;
    if (playing && ctx) fade(volume * 0.55, 0.3);
  },

  fadeOut(seconds = 0.18) {
    endMusic(seconds);
  },

  unlock
};

function wrapHost() {
  return Object.create(host, {
    subscribe: {
      value(fn) {
        const off = host.subscribe(fn);
        window.addEventListener('pagehide', off, { once: true });
        return off;
      }
    }
  });
}

export const audio = host ? wrapHost() : local;

if (host) UNLOCK_EVENTS.forEach(type => window.addEventListener(type, () => host.unlock(), true));

export function initAudio(volume = 1) {
  audio.music(volume);
  if (uiBound) return;
  uiBound = true;
  document.addEventListener(
    'click',
    e => {
      const el = e.target.closest && e.target.closest('button, a, [role="tab"], .item-card');
      if (!el || el.disabled || el.dataset.silent !== undefined) return;
      audio.sfx('click');
    },
    true
  );
}