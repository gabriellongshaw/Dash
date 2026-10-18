const BPM = 124;
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
  C: { bass: 36, pad: [55, 60, 64, 71], comp: [60, 64, 67, 72] },
  G: { bass: 43, pad: [55, 59, 62, 69], comp: [59, 62, 67, 71] },
  Am: { bass: 45, pad: [55, 60, 64, 69], comp: [60, 64, 69, 72] },
  F: { bass: 41, pad: [53, 57, 60, 64], comp: [57, 60, 65, 69] }
};

const SCORE = [
  ['C', 'E5 - - G5 - - C6 - - B5 - G5 - - - -'],
  ['G', 'D6 - - B5 - - G5 - - A5 - B5 - - - -'],
  ['Am', 'C6 - - E6 - - D6 - - C6 - A5 - - - -'],
  ['F', 'A5 - - G5 - - F5 - - E5 - D5 - - - .'],
  ['C', 'E5 - - G5 - - C6 - - E6 - D6 - C6 - -'],
  ['G', 'D6 - - B5 - - G5 - - B5 - D6 - - - -'],
  ['F', 'A5 - - C6 - - F6 - - E6 - C6 - A5 - -'],
  ['G', 'G5 - B5 - D6 - - - G6 - - - . . . .'],
  ['Am', 'E6 - - - C6 - - A5 - - - C6 - - - -'],
  ['F', 'A5 - - - C6 - - F6 - - - E6 - - - -'],
  ['C', 'G5 - - E5 - - G5 - - C6 - - E6 - - -'],
  ['G', 'D6 - - B5 - - G5 - - D6 - - B5 - A5 -'],
  ['Am', 'C6 - E6 - A6 - - - G6 - E6 - C6 - . .'],
  ['F', 'A5 - C6 - F6 - - - E6 - C6 - A5 - . .'],
  ['G', 'B5 - D6 - G6 - - - F6 - D6 - B5 - . .'],
  ['C', 'C6 - - - - - - - G5 - - - E5 - D5 -']
];

export const TOTAL_STEPS = SCORE.length * STEPS_PER_BAR;

const KICKS = new Set([0, 8, 11]);
const CLAPS = new Set([4, 12]);
const BASS = [
  [0, 0, 3],
  [3, 12, 2],
  [6, 0, 2],
  [8, 7, 3],
  [11, 12, 2],
  [14, 7, 2]
];
const COMP = [2, 6, 10, 14];
const SHAKE = [0.5, 0.2, 0.36, 0.2, 0.5, 0.2, 0.36, 0.26, 0.5, 0.2, 0.36, 0.2, 0.5, 0.2, 0.42, 0.3];

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

const human = () => 0.92 + Math.random() * 0.16;

export function createInstruments(ctx, noise) {
  const rate = ctx.sampleRate;
  const reverb = ctx.createConvolver();
  const length = Math.floor(rate * 1.3);
  const impulse = ctx.createBuffer(2, length, rate);
  for (let c = 0; c < 2; c++) {
    const data = impulse.getChannelData(c);
    let low = 0;
    for (let i = 0; i < length; i++) {
      low += (Math.random() * 2 - 1 - low) * 0.45;
      data[i] = low * Math.pow(1 - i / length, 2.6);
    }
  }
  reverb.buffer = impulse;
  const wet = ctx.createGain();
  wet.gain.value = 0.5;
  reverb.connect(wet);
  let attached = null;

  const sends = {};
  const level = { mallet: 0.34, pad: 0.5, pluck: 0.3, clap: 0.55, bass: 0, drum: 0 };
  for (const key of Object.keys(level)) {
    sends[key] = ctx.createGain();
    sends[key].gain.value = level[key];
    if (level[key] > 0) sends[key].connect(reverb);
  }

  function attach(bus) {
    if (attached === bus) return;
    if (attached) wet.disconnect();
    wet.connect(bus);
    attached = bus;
  }

  function out(node, bus, kind) {
    node.connect(bus);
    if (level[kind] > 0) node.connect(sends[kind]);
  }

  function ring(bus, kind, { type = 'sine', hz, t, vol, decay, attack = 0.003, detune = 0 }) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, t);
    if (detune) osc.detune.value = detune;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + attack);
    gain.gain.setTargetAtTime(0, t + attack, decay / 4);
    osc.connect(gain);
    out(gain, bus, kind);
    osc.start(t);
    osc.stop(t + decay * 1.6 + attack);
  }

  function mallet(bus, { hz, t, vol, bright = 0 }) {
    ring(bus, 'mallet', { hz, t, vol, decay: 0.5 });
    ring(bus, 'mallet', { hz: hz * 4, t, vol: vol * 0.28, decay: 0.11 });
    ring(bus, 'mallet', { type: 'triangle', hz: hz * 2, t, vol: vol * 0.16, decay: 0.2 });
    if (bright) ring(bus, 'mallet', { hz: hz * 2, t, vol: vol * bright, decay: 0.7 });
  }

  function pad(bus, { notes, t, dur, vol }) {
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.linearRampToValueAtTime(1700, t + dur * 0.5);
    filter.frequency.linearRampToValueAtTime(1000, t + dur);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.3);
    gain.gain.setValueAtTime(vol, t + dur - 0.35);
    gain.gain.linearRampToValueAtTime(0, t + dur + 0.1);
    notes.forEach(note => {
      [['triangle', -6], ['sine', 6]].forEach(([type, detune]) => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq(note), t);
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(t);
        osc.stop(t + dur + 0.15);
      });
    });
    filter.connect(gain);
    out(gain, bus, 'pad');
  }

  function bass(bus, { hz, t, dur, vol }) {
    const decay = dur * 0.9;
    ring(bus, 'bass', { type: 'triangle', hz, t, vol, decay, attack: 0.006 });
    ring(bus, 'bass', { hz: hz * 2, t, vol: vol * 0.35, decay: decay * 0.7, attack: 0.006 });
  }

  function pluck(bus, { hz, t, vol }) {
    ring(bus, 'pluck', { type: 'triangle', hz, t, vol, decay: 0.24, attack: 0.004 });
    ring(bus, 'pluck', { hz: hz * 2, t, vol: vol * 0.25, decay: 0.08, attack: 0.004 });
  }

  function kick(bus, t, vol) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(135, t);
    osc.frequency.exponentialRampToValueAtTime(46, t + 0.1);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    out(gain, bus, 'drum');
    osc.start(t);
    osc.stop(t + 0.22);
  }

  function noiseHit(bus, kind, t, { type, freq: f, q = 0.8, dur, vol }) {
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = noise;
    filter.type = type;
    filter.frequency.value = f;
    filter.Q.value = q;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain);
    out(gain, bus, kind);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  function clap(bus, t, vol) {
    noiseHit(bus, 'clap', t, { type: 'bandpass', freq: 1700, q: 0.9, dur: 0.11, vol });
    noiseHit(bus, 'clap', t + 0.011, { type: 'bandpass', freq: 2100, q: 0.9, dur: 0.09, vol: vol * 0.7 });
    ring(bus, 'drum', { hz: 190, t, vol: vol * 0.45, decay: 0.07 });
  }

  function shake(bus, t, vol) {
    noiseHit(bus, 'drum', t, { type: 'highpass', freq: 6200, dur: 0.045, vol });
  }

  return { attach, mallet, pad, bass, pluck, kick, clap, shake };
}

export function scheduleStep(inst, bus, step, t) {
  inst.attach(bus);
  const bar = Math.floor(step / STEPS_PER_BAR);
  const pos = step % STEPS_PER_BAR;
  const [name] = SCORE[bar];
  const chord = CHORDS[name];
  const second = bar >= 8;
  const last = bar % 8 === 7;

  if (pos === 0) {
    inst.pad(bus, { notes: chord.pad, t, dur: STEPS_PER_BAR * STEP_SECONDS, vol: second ? 0.05 : 0.04 });
  }

  for (const e of LEADS[bar]) {
    if (e.at === pos) {
      inst.mallet(bus, { hz: freq(e.midi), t: t + Math.random() * 0.006, vol: 0.2 * human(), bright: second ? 0.45 : 0.12 });
    }
  }

  for (const [at, lift, len] of BASS) {
    if (at === pos) inst.bass(bus, { hz: freq(chord.bass + lift), t, dur: len * STEP_SECONDS, vol: 0.3 * human() });
  }

  if (COMP.includes(pos)) {
    const tone = chord.comp[(COMP.indexOf(pos) + (second ? 1 : 0)) % chord.comp.length];
    inst.pluck(bus, { hz: freq(tone), t, vol: (second ? 0.07 : 0.05) * human() });
  }

  if (KICKS.has(pos)) inst.kick(bus, t, 0.46);
  if (CLAPS.has(pos) || (last && (pos === 14 || pos === 15))) inst.clap(bus, t, 0.17);
  inst.shake(bus, t, 0.09 * SHAKE[pos] * human());
}