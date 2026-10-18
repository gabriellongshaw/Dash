import { createHmac, timingSafeEqual } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { findItem } from '../assets/js/core/cosmetics.js';
import { distanceAt } from '../assets/js/core/difficulty.js';
import { cleanPrivacy, defaultPrivacy } from '../assets/js/core/privacy.js';
import { createSocial, profileFixups } from '../server/social.js';
import { allQuests, applyRun, cleanQuests, freshQuests, isClaimed, markClaimed, progressOf, rollQuests, weekBoardScore } from '../assets/js/core/quests.js';

const ORIGINS = ['https://gabriellongshaw.co.uk', 'https://www.gabriellongshaw.co.uk'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const PX_PER_METER = 30;
const LEAD_SECONDS = 4;
const SPEED_SLACK = 1.12;
const MIN_RUN_SECONDS = 2;
const MAX_RUN_SECONDS = 3600;
const COINS_BASE = 10;
const COINS_PER_METER = 0.4;
const DODGED_BASE = 5;
const DODGED_PER_METER = 0.2;
const ACTIONS_BASE = 6;
const ACTIONS_PER_SECOND = 6;

const IMPORT_PER_RUN = 80;
const IMPORT_CAP = 5000;
const IMPORT_BEST_CAP = 5000;
const IMPORT_RUNS_CAP = 5000;

const PHOTO_MODES = ['google', 'custom', 'none'];

const DEFAULT_OWNED = ['skin:emerald', 'hat:none', 'char:bot', 'world:skyline'];

class Fail extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

const whole = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

const defaults = () => ({
  coins: 0,
  best: 0,
  vBest: 0,
  runs: 0,
  owned: [...DEFAULT_OWNED],
  equipped: { skin: 'skin:emerald', hat: 'hat:none', char: 'char:bot', world: 'world:skyline' },
  quests: freshQuests(),
  publicBoard: true,
  lastRun: 0,
  username: null,
  usernameAt: 0,
  displayName: null,
  searchable: true,
  photoMode: 'google',
  photoData: null,
  privacy: defaultPrivacy()
});

function sanitize(raw) {
  const base = defaults();
  const data = raw && typeof raw === 'object' ? raw : {};
  const owned = new Set(base.owned);
  if (Array.isArray(data.owned)) data.owned.forEach(id => typeof id === 'string' && findItem(id) && owned.add(id));
  const equipped = { ...base.equipped };
  const eq = data.equipped || {};
  for (const kind of Object.keys(equipped)) {
    const id = eq[kind];
    if (typeof id === 'string' && owned.has(id) && id.split(':')[0] === kind) equipped[kind] = id;
  }
  return {
    coins: whole(data.coins),
    best: whole(data.best),
    vBest: whole(data.vBest),
    runs: whole(data.runs),
    owned: [...owned],
    equipped,
    quests: cleanQuests(data.quests),
    publicBoard: data.publicBoard !== false,
    lastRun: whole(data.lastRun),
    username: typeof data.username === 'string' ? data.username.toLowerCase() : null,
    usernameAt: whole(data.usernameAt),
    displayName: typeof data.displayName === 'string' && data.displayName ? data.displayName : null,
    searchable: data.searchable !== false,
    photoMode: PHOTO_MODES.includes(data.photoMode) ? data.photoMode : data.photoOn === false ? 'none' : 'google',
    photoData: typeof data.photoData === 'string' && data.photoData ? data.photoData : null,
    privacy: cleanPrivacy(data.privacy)
  };
}

const view = p => ({
  coins: p.coins,
  best: p.best,
  runs: p.runs,
  owned: p.owned,
  equipped: p.equipped,
  quests: p.quests,
  publicBoard: p.publicBoard,
  username: p.username,
  displayName: p.displayName,
  searchable: p.searchable,
  photoMode: p.photoMode,
  photoData: p.photoData,
  privacy: p.privacy
});

const cleanPhoto = v => {
  try {
    return typeof v === 'string' && new URL(v).protocol === 'https:' ? v : null;
  } catch {
    return null;
  }
};

export function maxMeters(seconds) {
  return Math.floor(distanceAt(seconds) / PX_PER_METER);
}

export function cleanRun(data) {
  const src = data && typeof data === 'object' ? data : {};
  const read = v => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);
  const run = {
    meters: read(src.meters),
    coins: read(src.coins),
    jumps: read(src.jumps),
    doubles: read(src.doubles),
    slides: read(src.slides),
    dodged: read(src.dodged)
  };
  return Object.values(run).some(v => v === null) ? null : run;
}

export function checkRun(run, elapsed) {
  if (elapsed < MIN_RUN_SECONDS) return 'too-short';
  if (elapsed > MAX_RUN_SECONDS) return 'too-long';
  const seconds = elapsed + LEAD_SECONDS;
  if (run.meters > Math.floor(maxMeters(seconds) * SPEED_SLACK) + 1) return 'distance';
  if (run.coins > COINS_BASE + run.meters * COINS_PER_METER) return 'coins';
  if (run.dodged > DODGED_BASE + run.meters * DODGED_PER_METER) return 'dodged';
  const actions = ACTIONS_BASE + seconds * ACTIONS_PER_SECOND;
  if (run.jumps > actions || run.slides > actions) return 'actions';
  if (run.doubles > run.jumps) return 'doubles';
  return null;
}

export function importGuest(guest) {
  const src = guest && typeof guest === 'object' ? guest : {};
  const runs = Math.min(whole(src.runs), IMPORT_RUNS_CAP);
  const budget = Math.min(IMPORT_CAP, runs * IMPORT_PER_RUN);
  const known = new Set(DEFAULT_OWNED);
  const wanted = Array.isArray(src.owned) ? [...new Set(src.owned)] : [];
  const items = wanted
    .filter(id => typeof id === 'string' && !known.has(id))
    .map(id => findItem(id))
    .filter(Boolean)
    .sort((a, b) => a.price - b.price);
  let left = budget;
  const owned = [];
  for (const item of items) {
    if (item.price > left) continue;
    left -= item.price;
    owned.push(item.id);
  }
  return { coins: Math.min(whole(src.coins), left), owned, runs, best: Math.min(whole(src.best), IMPORT_BEST_CAP) };
}

const shortName = full => {
  const parts = typeof full === 'string' ? full.replace(/[\u0000-\u001f\u007f]/g, '').trim().split(/\s+/).filter(Boolean) : [];
  if (!parts.length) return 'Player';
  const first = parts[0].slice(0, 16);
  return parts.length === 1 ? first : `${first} ${[...parts[parts.length - 1]][0].toUpperCase()}.`;
};

export function createApi({ db, verify, secret, now = () => Date.now() }) {
  const profileRef = uid => db.doc(`dashProfiles/${uid}`);
  const allTimeRef = uid => db.doc(`dashBoard/${uid}`);
  const weekRef = (week, uid) => db.doc(`dashWeeks/${week}/entries/${uid}`);
  const entry = (name, score) => ({ name: shortName(name), score, updatedAt: FieldValue.serverTimestamp() });

  const sign = (uid, started) => createHmac('sha256', secret()).update(`${uid}.${started}`).digest('hex');

  function readToken(uid, token) {
    const parts = typeof token === 'string' ? token.split('.') : [];
    if (parts.length !== 3 || parts[0] !== uid) return null;
    const started = Number(parts[1]);
    if (!Number.isSafeInteger(started) || started > now() + 1000) return null;
    const want = Buffer.from(sign(uid, started));
    const got = Buffer.from(parts[2]);
    if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
    return started;
  }

  async function load(tx, uid) {
    const snap = await tx.get(profileRef(uid));
    if (!snap.exists) throw new Fail(409, 'no-profile');
    return sanitize(snap.data());
  }

  async function publish(user, profile) {
    if (!profile.publicBoard) return true;
    const week = rollQuests(profile.quests);
    const writes = [];
    if (profile.vBest > 0) writes.push(allTimeRef(user.uid).set(entry(profile.username || user.name, profile.vBest)));
    const weekScore = weekBoardScore(week, profile.vBest);
    if (weekScore > 0) writes.push(weekRef(week.week, user.uid).set(entry(profile.username || user.name, weekScore)));
    const results = await Promise.allSettled(writes);
    results.forEach(result => result.status === 'rejected' && console.error('board write failed', result.reason));
    return results.every(result => result.status === 'fulfilled');
  }

  const social = createSocial({ db, profileRef, load, sanitize, view, Fail, publish, now });

  const actions = {
    ...social,

    async syncProfile(user, body) {
      const profile = await db.runTransaction(async tx => {
        const ref = profileRef(user.uid);
        const snap = await tx.get(ref);
        const raw = snap.exists ? snap.data() : null;
        const current = sanitize(raw);
        const photo = cleanPhoto(user.photo);
        const fix = profileFixups(raw, photo);
        if (raw && raw.imported === true) {
          if (raw.legacyTrusted === true) {
            if (Object.keys(fix).length) tx.update(ref, fix);
            return current;
          }
          const vBest = Math.max(current.vBest, current.best);
          tx.update(ref, { vBest, legacyTrusted: true, ...fix, updatedAt: FieldValue.serverTimestamp() });
          return { ...current, vBest };
        }
        const gift = body.guest ? importGuest(body.guest) : { coins: 0, owned: [], runs: 0, best: 0 };
        const next = {
          ...current,
          coins: current.coins + gift.coins,
          owned: [...new Set([...current.owned, ...gift.owned])],
          runs: current.runs + gift.runs,
          best: Math.max(current.best, gift.best),
          vBest: raw ? Math.max(current.vBest, current.best) : current.vBest
        };
        const data = { ...next, imported: true, legacyTrusted: true, name: shortName(user.name), photo, ...fix, updatedAt: FieldValue.serverTimestamp() };
        if (snap.exists) tx.update(ref, data);
        else tx.set(ref, data);
        return next;
      });
      await publish(user, profile);
      return { profile: view(profile) };
    },

    async startRun(user) {
      const started = now();
      return { runId: `${user.uid}.${started}.${sign(user.uid, started)}` };
    },

    async submitRun(user, body) {
      const run = cleanRun(body);
      const started = readToken(user.uid, body.runId);
      if (!run || !started) throw new Fail(400, 'run');
      const out = await db.runTransaction(async tx => {
        const profile = await load(tx, user.uid);
        if (started <= profile.lastRun) return { profile, rejected: 'replay' };
        const problem = checkRun(run, (now() - started) / 1000);
        const base = { lastRun: started, updatedAt: FieldValue.serverTimestamp() };
        if (problem) {
          tx.update(profileRef(user.uid), base);
          return { profile, rejected: problem };
        }
        const score = run.meters + run.coins * 5;
        const quests = applyRun(profile.quests, { ...run, score });
        const next = {
          ...profile,
          coins: profile.coins + run.coins,
          runs: profile.runs + 1,
          best: Math.max(profile.best, score),
          vBest: Math.max(profile.vBest, score),
          quests
        };
        tx.update(profileRef(user.uid), {
          coins: next.coins,
          runs: next.runs,
          best: next.best,
          vBest: next.vBest,
          quests,
          ...base
        });
        return { profile: next, rejected: null };
      });
      if (!out.rejected && !(await publish(user, out.profile))) throw new Fail(503, 'board');
      return { rejected: out.rejected, profile: view(out.profile) };
    },

    async claimQuest(user, body) {
      if (typeof body.id !== 'string') throw new Fail(400, 'id');
      return db.runTransaction(async tx => {
        const profile = await load(tx, user.uid);
        const quest = allQuests(profile.quests).find(item => item.id === body.id);
        if (!quest) throw new Fail(404, 'unknown');
        if (isClaimed(profile.quests, quest)) return { reward: 0, profile: view(profile) };
        if (progressOf(profile.quests, quest) < quest.target) throw new Fail(409, 'progress');
        const next = { ...profile, coins: profile.coins + quest.reward, quests: markClaimed(profile.quests, quest) };
        tx.update(profileRef(user.uid), { coins: next.coins, quests: next.quests, updatedAt: FieldValue.serverTimestamp() });
        return { reward: quest.reward, profile: view(next) };
      });
    },

    async buyItem(user, body) {
      const item = typeof body.id === 'string' ? findItem(body.id) : null;
      if (!item) throw new Fail(404, 'unknown');
      return db.runTransaction(async tx => {
        const profile = await load(tx, user.uid);
        if (profile.owned.includes(item.id)) return { profile: view(profile) };
        if (profile.coins < item.price) throw new Fail(409, 'coins');
        const next = { ...profile, coins: profile.coins - item.price, owned: [...profile.owned, item.id] };
        tx.update(profileRef(user.uid), { coins: next.coins, owned: next.owned, updatedAt: FieldValue.serverTimestamp() });
        return { profile: view(next) };
      });
    },

    async setPublicBoard(user, body) {
      const on = !!body.on;
      const profile = await db.runTransaction(async tx => {
        const current = await load(tx, user.uid);
        tx.update(profileRef(user.uid), { publicBoard: on, updatedAt: FieldValue.serverTimestamp() });
        return { ...current, publicBoard: on };
      });
      if (on) await publish(user, profile);
      else {
        const week = rollQuests(profile.quests).week;
        await Promise.allSettled([allTimeRef(user.uid).delete(), weekRef(week, user.uid).delete()]);
      }
      return { profile: view(profile) };
    }
  };

  return async function handle(token, body) {
    const user = await verify(token);
    if (!user) throw new Fail(401, 'auth');
    const run = body && typeof body.action === 'string' ? actions[body.action] : null;
    if (!run) throw new Fail(400, 'action');
    return run(user, body);
  };
}

let handle = null;
let account = null;

function setup() {
  if (handle) return handle;
  account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  if (!getApps().length) initializeApp({ credential: cert(account) });
  handle = createApi({
    db: getFirestore(),
    secret: () => account.private_key,
    verify: async token => {
      try {
        const decoded = await getAuth().verifyIdToken(token);
        return { uid: decoded.uid, name: decoded.name || null, photo: decoded.picture || null };
      } catch {
        return null;
      }
    }
  });
  return handle;
}

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && (ORIGINS.includes(origin) || LOCAL.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    const out = await setup()(token, req.body && typeof req.body === 'object' ? req.body : {});
    return res.status(200).json(out);
  } catch (e) {
    if (e instanceof Fail) return res.status(e.status).json({ error: e.code });
    console.error(e);
    return res.status(500).json({ error: 'server' });
  }
}