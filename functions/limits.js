export const REGION = 'europe-west2';

export const BASE_SPEED = 300;
export const MAX_SPEED = 860;
export const SPEED_GAIN = 0.011;
export const PX_PER_METER = 30;

export const LEAD_SECONDS = 4;
export const SPEED_SLACK = 1.12;
export const MAX_RUN_SECONDS = 3600;
export const MIN_RUN_SECONDS = 2;

export const COINS_BASE = 10;
export const COINS_PER_METER = 0.4;
export const DODGED_BASE = 5;
export const DODGED_PER_METER = 0.2;
export const ACTIONS_BASE = 6;
export const ACTIONS_PER_SECOND = 6;

export const GUEST_COIN_CAP = 300;
export const GUEST_ITEM_CAP = 300;

export function maxMeters(seconds) {
  const rampEnd = Math.log(MAX_SPEED / BASE_SPEED) / SPEED_GAIN;
  const t = Math.max(0, seconds);
  let px;
  if (t <= rampEnd) {
    px = (BASE_SPEED / SPEED_GAIN) * (Math.exp(SPEED_GAIN * t) - 1);
  } else {
    px = ((MAX_SPEED - BASE_SPEED) / SPEED_GAIN) + MAX_SPEED * (t - rampEnd);
  }
  return Math.floor(px / PX_PER_METER);
}

const whole = v => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);

export function cleanRun(data) {
  const src = data && typeof data === 'object' ? data : {};
  const run = {
    runId: typeof src.runId === 'string' ? src.runId.slice(0, 64) : '',
    meters: whole(src.meters),
    coins: whole(src.coins),
    jumps: whole(src.jumps),
    doubles: whole(src.doubles),
    slides: whole(src.slides),
    dodged: whole(src.dodged)
  };
  for (const key of Object.keys(run)) if (run[key] === null) return null;
  return run.runId ? run : null;
}

export function checkRun(run, elapsed) {
  if (elapsed < MIN_RUN_SECONDS) return 'too-short';
  if (elapsed > MAX_RUN_SECONDS) return 'too-long';
  const seconds = elapsed + LEAD_SECONDS;
  const meters = Math.floor(maxMeters(seconds) * SPEED_SLACK) + 1;
  if (run.meters > meters) return 'distance';
  if (run.coins > COINS_BASE + run.meters * COINS_PER_METER) return 'coins';
  if (run.dodged > DODGED_BASE + run.meters * DODGED_PER_METER) return 'dodged';
  const actions = ACTIONS_BASE + seconds * ACTIONS_PER_SECOND;
  if (run.jumps > actions || run.slides > actions) return 'actions';
  if (run.doubles > run.jumps) return 'doubles';
  return null;
}

export const runScore = run => run.meters + run.coins * 5;