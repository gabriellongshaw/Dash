const SUM_STATS = ['coins', 'runs', 'dodged', 'jumps', 'doubles', 'slides', 'distance'];
const MAX_STATS = ['meters', 'score', 'runCoins'];
const CAP = 10000000;

const DAILY_REWARDS = [25, 45, 75];

const DAILY_POOL = [
  { key: 'coins', stat: 'coins', text: n => `Collect ${n} coins`, tiers: [25, 50, 90] },
  { key: 'meters', stat: 'meters', text: n => `Run ${n} m in one run`, tiers: [250, 500, 900] },
  { key: 'score', stat: 'score', text: n => `Score ${n} in one run`, tiers: [150, 300, 600] },
  { key: 'runs', stat: 'runs', text: n => `Play ${n} runs`, tiers: [3, 5, 8] },
  { key: 'dodged', stat: 'dodged', text: n => `Dodge ${n} obstacles`, tiers: [25, 50, 90] },
  { key: 'jumps', stat: 'jumps', text: n => `Jump ${n} times`, tiers: [40, 80, 140] },
  { key: 'doubles', stat: 'doubles', text: n => `Double jump ${n} times`, tiers: [10, 20, 35] },
  { key: 'slides', stat: 'slides', text: n => `Slide ${n} times`, tiers: [10, 20, 35] },
  { key: 'runCoins', stat: 'runCoins', text: n => `Collect ${n} coins in one run`, tiers: [8, 15, 25] }
];

const WEEKLY_POOL = [
  { key: 'coins', stat: 'coins', text: n => `Collect ${n} coins`, target: 300, reward: 150 },
  { key: 'distance', stat: 'distance', text: n => `Run ${n} m in total`, target: 4000, reward: 175 },
  { key: 'runs', stat: 'runs', text: n => `Play ${n} runs`, target: 25, reward: 125 },
  { key: 'dodged', stat: 'dodged', text: n => `Dodge ${n} obstacles`, target: 400, reward: 175 },
  { key: 'doubles', stat: 'doubles', text: n => `Double jump ${n} times`, target: 120, reward: 150 },
  { key: 'score', stat: 'score', text: n => `Score ${n} in one run`, target: 1000, reward: 250 }
];

const pad = n => String(n).padStart(2, '0');
const whole = v => (Number.isFinite(v) && v > 0 ? Math.min(CAP, Math.floor(v)) : 0);

export function dayKey(now = new Date()) {
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
}

export function weekKey(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-W${pad(week)}`;
}

export const FIRST_WEEK = '2026-W42';

export function weekBoardScore(quests, best) {
  const own = quests.w.score;
  return quests.week === FIRST_WEEK ? Math.max(own, whole(best)) : own;
}

export function msUntilReset(scope, now = new Date()) {
  const days = scope === 'd' ? 1 : 7 - ((now.getUTCDay() + 6) % 7);
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days);
  return Math.max(0, next - now);
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(list, rand) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dailyQuests(day) {
  const rand = rng(hash('d:' + day));
  return shuffled(DAILY_POOL, rand)
    .slice(0, 3)
    .map((q, i) => ({
      id: `d:${q.key}:${i}`,
      scope: 'd',
      stat: q.stat,
      target: q.tiers[i],
      reward: DAILY_REWARDS[i],
      title: q.text(q.tiers[i])
    }));
}

export function weeklyQuests(week) {
  const rand = rng(hash('w:' + week));
  return shuffled(WEEKLY_POOL, rand)
    .slice(0, 2)
    .map(q => ({
      id: `w:${q.key}`,
      scope: 'w',
      stat: q.stat,
      target: q.target,
      reward: q.reward,
      title: q.text(q.target)
    }));
}

const emptyStats = () => Object.fromEntries([...SUM_STATS, ...MAX_STATS].map(k => [k, 0]));

export function freshQuests(now = new Date()) {
  return { day: dayKey(now), d: emptyStats(), dc: [], week: weekKey(now), w: emptyStats(), wc: [] };
}

function cleanStats(raw) {
  const out = emptyStats();
  if (raw && typeof raw === 'object') for (const k of Object.keys(out)) out[k] = whole(raw[k]);
  return out;
}

function cleanIds(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(id => typeof id === 'string' && /^[dw]:[A-Za-z]{1,12}(:\d)?$/.test(id)))].slice(0, 12);
}

export function rollQuests(q, now = new Date()) {
  const day = dayKey(now);
  const week = weekKey(now);
  if (q.day === day && q.week === week) return q;
  return {
    day,
    d: q.day === day ? q.d : emptyStats(),
    dc: q.day === day ? q.dc : [],
    week,
    w: q.week === week ? q.w : emptyStats(),
    wc: q.week === week ? q.wc : []
  };
}

export function cleanQuests(raw, now = new Date()) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const q = {
    day: typeof data.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.day) ? data.day : '',
    d: cleanStats(data.d),
    dc: cleanIds(data.dc),
    week: typeof data.week === 'string' && /^\d{4}-W\d{2}$/.test(data.week) ? data.week : '',
    w: cleanStats(data.w),
    wc: cleanIds(data.wc)
  };
  return rollQuests(q, now);
}

export function applyRun(quests, run, now = new Date()) {
  const q = rollQuests(quests, now);
  const add = (stats, key, n) => ({ ...stats, [key]: whole(stats[key] + whole(n)) });
  const take = stats => {
    let s = stats;
    s = add(s, 'coins', run.coins);
    s = add(s, 'runs', 1);
    s = add(s, 'dodged', run.dodged);
    s = add(s, 'jumps', run.jumps);
    s = add(s, 'doubles', run.doubles);
    s = add(s, 'slides', run.slides);
    s = add(s, 'distance', run.meters);
    return {
      ...s,
      meters: Math.max(s.meters, whole(run.meters)),
      score: Math.max(s.score, whole(run.score)),
      runCoins: Math.max(s.runCoins, whole(run.coins))
    };
  };
  return { ...q, d: take(q.d), w: take(q.w) };
}

function combineStats(a, b, sum) {
  const out = emptyStats();
  for (const k of SUM_STATS) out[k] = sum ? whole(a[k] + b[k]) : Math.max(a[k], b[k]);
  for (const k of MAX_STATS) out[k] = Math.max(a[k], b[k]);
  return out;
}

const union = (a, b) => [...new Set([...a, ...b])];

export function mergeQuests(a, b, now = new Date()) {
  const x = rollQuests(a, now);
  const y = rollQuests(b, now);
  return {
    day: x.day,
    d: combineStats(x.d, y.d, true),
    dc: union(x.dc, y.dc),
    week: x.week,
    w: combineStats(x.w, y.w, true),
    wc: union(x.wc, y.wc)
  };
}

export function reconcileQuests(a, b, now = new Date()) {
  const x = rollQuests(a, now);
  const y = rollQuests(b, now);
  return {
    day: x.day,
    d: combineStats(x.d, y.d, false),
    dc: union(x.dc, y.dc),
    week: x.week,
    w: combineStats(x.w, y.w, false),
    wc: union(x.wc, y.wc)
  };
}

export function allQuests(q) {
  return [...dailyQuests(q.day), ...weeklyQuests(q.week)];
}

export function progressOf(q, quest) {
  return (quest.scope === 'd' ? q.d : q.w)[quest.stat] || 0;
}

export function isClaimed(q, quest) {
  return (quest.scope === 'd' ? q.dc : q.wc).includes(quest.id);
}

export function isReady(q, quest) {
  return !isClaimed(q, quest) && progressOf(q, quest) >= quest.target;
}

export function markClaimed(q, quest) {
  return quest.scope === 'd' ? { ...q, dc: union(q.dc, [quest.id]) } : { ...q, wc: union(q.wc, [quest.id]) };
}

export function readyCount(q) {
  return allQuests(q).filter(quest => isReady(q, quest)).length;
}