export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const lerp = (a, b, t) => a + (b - a) * t;

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

export function parseColor(str) {
  const s = str.trim();
  if (s[0] === '#') {
    const hex = s.length === 4 ? s.slice(1).replace(/./g, c => c + c) : s.slice(1);
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const m = s.match(/[\d.]+/g).map(Number);
  if (/^hsl/i.test(s)) {
    const sat = m[1] / 100;
    const light = m[2] / 100;
    const channel = n => {
      const k = (n + m[0] / 30) % 12;
      return (light - sat * Math.min(light, 1 - light) * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255;
    };
    return [channel(0), channel(8), channel(4), m.length > 3 ? m[3] : 1];
  }
  return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1];
}

export function mixColor(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)];
}

export function tintColor(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), a[3]];
}

export const toCss = c => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.round(c[3] * 1000) / 1000})`;

export const luminance = c => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;