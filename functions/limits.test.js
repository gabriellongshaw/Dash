import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRun, cleanRun, maxMeters, runScore } from './limits.js';
import { importGuest, sanitize } from './profile.js';

function simulate(seconds) {
  let dist = 0;
  const h = 1 / 90;
  for (let t = 0; t < seconds; t += h) {
    const speed = Math.min(860, 300 + dist * 0.011);
    dist += speed * h;
  }
  return Math.floor(dist / 30);
}

test('maxMeters matches the game speed model', () => {
  for (const s of [5, 30, 60, 100, 300]) {
    const sim = simulate(s);
    assert.ok(Math.abs(maxMeters(s) - sim) <= sim * 0.02 + 2, `${s}s: ${maxMeters(s)} vs ${sim}`);
  }
});

test('an honest run passes', () => {
  const run = cleanRun({ runId: 'a', meters: 400, coins: 20, jumps: 40, doubles: 8, slides: 12, dodged: 50 });
  assert.equal(checkRun(run, 42), null);
  assert.equal(runScore(run), 500);
});

test('forged runs are rejected', () => {
  const base = { runId: 'a', meters: 400, coins: 20, jumps: 40, doubles: 8, slides: 12, dodged: 50 };
  assert.equal(checkRun(cleanRun({ ...base, meters: 99999 }), 42), 'distance');
  assert.equal(checkRun(cleanRun({ ...base, coins: 9999 }), 42), 'coins');
  assert.equal(checkRun(cleanRun({ ...base, dodged: 9999 }), 42), 'dodged');
  assert.equal(checkRun(cleanRun({ ...base, jumps: 9999 }), 42), 'actions');
  assert.equal(checkRun(cleanRun({ ...base, doubles: 41 }), 42), 'doubles');
  assert.equal(checkRun(cleanRun(base), 0.5), 'too-short');
  assert.equal(cleanRun({ ...base, coins: -1 }), null);
  assert.equal(cleanRun({ ...base, meters: 'x' }), null);
});

test('guest import is capped', () => {
  const out = importGuest({ coins: 99999, owned: ['skin:gold', 'skin:prism', 'hat:cap', 'skin:sky', 'bogus'] });
  assert.equal(out.coins, 300);
  const spent = out.owned.reduce((n, id) => n + { 'skin:gold': 400, 'skin:prism': 700, 'hat:cap': 50, 'skin:sky': 60 }[id], 0);
  assert.ok(spent <= 300);
  assert.ok(!out.owned.includes('bogus'));
});

test('sanitize drops unknown items and bad numbers', () => {
  const p = sanitize({ coins: -5, owned: ['skin:gold', 'nope'], best: 'x' });
  assert.equal(p.coins, 0);
  assert.equal(p.best, 0);
  assert.ok(p.owned.includes('skin:gold') && !p.owned.includes('nope'));
});