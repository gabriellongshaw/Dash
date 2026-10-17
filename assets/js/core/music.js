const BPM = 138;
const STEPS_PER_BAR = 16;

export const STEP_SECONDS = 60 / BPM / 4;

const NOTE = /^([A-G])([#b]?)(\d)$/;
const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function midi(name) {
  const m = NOTE.exec(name);
  if (!m) return null;
  return 12 * (Number(m[3]) + 1) + SEMITONES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

const freq = m => 440 * Math.pow(2, (m - 69) / 12);

const CHORDS = {
  Am: [45, [0, 3, 7]],
  F: [41, [0, 4, 7]],
  C: [48, [0, 4, 7]],
  G: [43, [0, 4, 7]],
  Em: [40, [0, 3, 7]]
};

const SCORE = [
  ['Am', 'E5 - A5 - C6 - B5 A5'],
  ['F', 'A5 - F5 - A5 - C6 -'],
  ['C', 'E6 - D6 - C6 - G5 -'],
  ['G', 'D6 - B5 - G5 A5 B5 D6'],
  ['Am', 'E6 - C6 - A5 - C6 E6'],
  ['F', 'F6 - E6 - C6 - A5 -'],
  ['C', 'G5 - C6 - E6 - D6 C6'],
  ['G', 'B5 - D6 - G6 - . .'],
  ['F', 'A5 C6 F6 - E6 C6 A5 -'],
  ['G', 'B5 D6 G6 - F6 D6 B5 -'],
  ['Em', 'G5 B5 E6 - D6 B5 G5 -'],
  ['Am', 'A5 C6 E6 - C6 A5 E5 -'],
  ['F', 'F6 - E6 - C6 - A5 C6'],
  ['G', 'D6 - B5 - G5 - B5 D6'],
  ['C', 'E6 - G6 - E6 - C6 -'],
  ['G', 'D6 - . D6 E6 F6 G6 -']
];

export const TOTAL_STEPS = SCORE.length * STEPS_PER_BAR;

const KICKS = new Set([0, 8, 10]);
const SNARES = new Set([4, 12]);
const ARP = [0, 1, 2, 1];

function parseLead(text) {
  const events = [];
  text.split(' ').forEach((token, i) => {
    if (token === '-' && events.length) events[events.length - 1].len += 1;
    else if (token === '.' || token === '-') events.push({ at: i, midi: null, len: 1 });
    else events.push({ at: i, midi: midi(token), len: 1 });
  });
  return events.filter(e => e.midi !== null);
}

const LEADS = SCORE.map(([, lead]) => parseLead(lead));

export function createInstruments(ctx, noise) {
  const waves = {};

  function pulse(duty) {
    if (waves[duty]) return waves[duty];
    const size = 48;
    const real = new Float32Array(size + 1);
    const imag = new Float32Array(size + 1);
    for (let n = 1; n <= size; n++) {
      real[n] = (2 * Math.sin(2 * Math.PI * n * duty)) / (n * Math.PI);
      imag[n] = (2 * (1 - Math.cos(2 * Math.PI * n * duty))) / (n * Math.PI);
    }
    waves[duty] = ctx.createPeriodicWave(real, imag);
    return waves[duty];
  }

  function tone(bus, { type, duty, hz, t, dur, vol, attack = 0.006, release = 0.05 }) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (duty) osc.setPeriodicWave(pulse(duty));
    else osc.type = type;
    osc.frequency.setValueAtTime(hz, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + attack);
    gain.gain.setValueAtTime(vol, Math.max(t + attack, t + dur - release));
    gain.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(gain).connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function kick(bus, t) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain).connect(bus);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  function hiss(bus, t, { dur, hp, vol }) {
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = noise;
    filter.type = 'highpass';
    filter.frequency.value = hp;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  return { tone, kick, hiss };
}

export function scheduleStep(inst, bus, step, t) {
  const bar = Math.floor(step / STEPS_PER_BAR);
  const pos = step % STEPS_PER_BAR;
  const [name] = SCORE[bar];
  const [root, triad] = CHORDS[name];

  if (pos % 2 === 0) {
    const eighth = pos / 2;
    for (const e of LEADS[bar]) {
      if (e.at === eighth) {
        inst.tone(bus, { duty: 0.25, hz: freq(e.midi), t, dur: e.len * STEP_SECONDS * 2 * 0.94, vol: 0.1 });
      }
    }
    const lift = eighth === 2 || eighth === 5 ? 12 : eighth === 7 ? 7 : 0;
    inst.tone(bus, { type: 'triangle', hz: freq(root + lift), t, dur: STEP_SECONDS * 1.7, vol: 0.26, release: 0.04 });
    inst.hiss(bus, t, { dur: pos === 14 ? 0.12 : 0.035, hp: 7000, vol: pos === 14 ? 0.05 : 0.06 });
  }

  inst.tone(bus, { duty: 0.125, hz: freq(root + 24 + triad[ARP[pos % 4] % triad.length]), t, dur: STEP_SECONDS * 0.8, vol: 0.03, release: 0.02 });

  if (KICKS.has(pos)) inst.kick(bus, t);
  if (SNARES.has(pos)) {
    inst.hiss(bus, t, { dur: 0.13, hp: 1400, vol: 0.2 });
    inst.tone(bus, { type: 'triangle', hz: 190, t, dur: 0.08, vol: 0.12, release: 0.06 });
  }
}