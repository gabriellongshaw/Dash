export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const rand = (a, b) => a + Math.random() * (b - a);

export const randInt = (a, b) => Math.floor(rand(a, b + 1));

export const pick = list => list[Math.floor(Math.random() * list.length)];

export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
