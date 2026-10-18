const BASE_SPEED = 300;
const EARLY_RATE = 0.011;
const EARLY_END = 50000;
const MID_RATE = 0.0011;
const MID_END = 150000;
const EARLY_SPEED = BASE_SPEED + EARLY_END * EARLY_RATE;
const MAX_SPEED = EARLY_SPEED + (MID_END - EARLY_END) * MID_RATE;
const EARLY_SECONDS = Math.log(EARLY_SPEED / BASE_SPEED) / EARLY_RATE;
const MID_SECONDS = EARLY_SECONDS + Math.log(MAX_SPEED / EARLY_SPEED) / MID_RATE;

export const speedAt = dist => {
  if (dist <= EARLY_END) return BASE_SPEED + dist * EARLY_RATE;
  if (dist <= MID_END) return EARLY_SPEED + (dist - EARLY_END) * MID_RATE;
  return MAX_SPEED;
};

export const distanceAt = seconds => {
  const t = Math.max(0, seconds);
  if (t <= EARLY_SECONDS) return (BASE_SPEED / EARLY_RATE) * (Math.exp(EARLY_RATE * t) - 1);
  if (t <= MID_SECONDS) return EARLY_END + (EARLY_SPEED / MID_RATE) * (Math.exp(MID_RATE * (t - EARLY_SECONDS)) - 1);
  return MID_END + MAX_SPEED * (t - MID_SECONDS);
};