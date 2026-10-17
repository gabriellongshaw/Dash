import { loadFirebase } from './firebase.js';
import { findItem, kindOf } from './cosmetics.js';
import {
  freshQuests,
  cleanQuests,
  rollQuests,
  applyRun,
  allQuests,
  progressOf,
  isClaimed,
  markClaimed,
  readyCount
} from './quests.js';

const KEY = 'dash:profile';
const LEGACY_BEST = 'dash:best';
const COLLECTION = 'dashProfiles';
const API_URL = 'https://dash-gamma-cyan.vercel.app/api/game';

const listeners = new Set();
const session = { status: 'loading', syncing: false, error: null };
let cloud = null;
let cloudReady = false;
let started = false;
let runPromise = null;

const defaults = () => ({
  coins: 0,
  best: 0,
  runs: 0,
  owned: ['skin:emerald', 'hat:none', 'char:bot', 'world:skyline'],
  equipped: { skin: 'skin:emerald', hat: 'hat:none', char: 'char:bot', world: 'world:skyline' },
  quests: freshQuests(),
  publicBoard: true
});

const cleanName = v => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 60) : '') || null;

const cleanPhoto = v => {
  try {
    return typeof v === 'string' && new URL(v).protocol === 'https:' ? v : null;
  } catch {
    return null;
  }
};

const whole = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

function sanitize(raw) {
  const base = defaults();
  const data = raw && typeof raw === 'object' ? raw : {};
  const owned = new Set(base.owned);
  if (Array.isArray(data.owned)) data.owned.forEach(id => findItem(id) && owned.add(id));
  const equipped = { ...base.equipped };
  const eq = data.equipped || {};
  for (const kind of Object.keys(equipped)) {
    const id = eq[kind];
    if (typeof id === 'string' && owned.has(id) && kindOf(id) === kind) equipped[kind] = id;
  }
  return {
    coins: whole(data.coins),
    best: whole(data.best),
    runs: whole(data.runs),
    owned: [...owned],
    equipped,
    quests: cleanQuests(data.quests),
    publicBoard: data.publicBoard !== false
  };
}

function load() {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(KEY));
  } catch {}
  const base = sanitize(raw);
  if (!raw) {
    try {
      base.best = whole(parseInt(localStorage.getItem(LEGACY_BEST), 10));
    } catch {}
  }
  return {
    ...base,
    uid: raw && typeof raw.uid === 'string' ? raw.uid : null,
    name: cleanName(raw && raw.name),
    photo: cleanPhoto(raw && raw.photo)
  };
}

let state = load();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

function emit() {
  listeners.forEach(fn => fn());
}

function docRef() {
  return cloud.fsMod.doc(cloud.db, COLLECTION, state.uid);
}

function guestState() {
  return { ...defaults(), uid: null, name: null, photo: null };
}

async function call(action, data) {
  const user = cloud.auth.currentUser;
  if (!user) throw new Error('signed-out');
  const token = await user.getIdToken();
  const res = await fetch(API_URL, {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...data })
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(out.error || 'server');
    err.code = out.error || 'server';
    throw err;
  }
  return out;
}

function applyServer(remote) {
  state = { ...state, ...sanitize(remote) };
  persist();
  emit();
}

async function refresh() {
  if (!cloudReady || !state.uid) return;
  const uid = state.uid;
  try {
    const out = await call('syncProfile', {});
    if (state.uid === uid) applyServer(out.profile);
  } catch {}
}

async function sync(user) {
  const guest = state.uid ? null : { coins: state.coins, owned: state.owned, runs: state.runs, best: state.best };
  const out = await call('syncProfile', { guest });
  state = { ...sanitize(out.profile), uid: user.uid, name: cleanName(user.displayName), photo: cleanPhoto(user.photoURL) };
  persist();
}

async function handleUser(user) {
  if (!user || user.isAnonymous) {
    cloudReady = false;
    if (state.uid) {
      state = guestState();
      persist();
    }
    session.status = 'out';
    session.syncing = false;
    emit();
    return;
  }
  session.status = 'in';
  session.syncing = true;
  session.error = null;
  emit();
  try {
    await sync(user);
    cloudReady = true;
  } catch (e) {
    cloudReady = false;
    session.error = e && e.code === 'permission-denied' ? 'rules' : 'offline';
  }
  session.syncing = false;
  emit();
}

export const profile = {
  get state() {
    return state;
  },

  get session() {
    return session;
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  owns(id) {
    return state.owned.includes(id);
  },

  async init() {
    if (started) return;
    started = true;
    try {
      cloud = await loadFirebase();
    } catch {
      session.status = 'unavailable';
      emit();
      return;
    }
    cloud.authMod.onAuthStateChanged(cloud.auth, user => {
      handleUser(user);
    });
  },

  async signIn() {
    if (!cloud) {
      const err = new Error('not ready');
      err.code = 'dash/not-ready';
      throw err;
    }
    const { authMod, auth } = cloud;
    const provider = new authMod.GoogleAuthProvider();
    try {
      await authMod.signInWithPopup(auth, provider);
    } catch (e) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
        await authMod.signInWithRedirect(auth, provider);
        return;
      }
      throw e;
    }
  },

  async signOut() {
    if (!cloud) return;
    await cloud.authMod.signOut(cloud.auth);
  },

  beginRun() {
    runPromise = null;
    if (!cloudReady || !state.uid) return;
    runPromise = call('startRun').then(out => out.runId).catch(() => null);
  },

  recordRun(run) {
    const { coins, score } = run;
    state = {
      ...state,
      coins: state.coins + coins,
      runs: state.runs + 1,
      best: Math.max(state.best, score),
      quests: applyRun(state.quests, run)
    };
    persist();
    emit();
    const pending = runPromise;
    runPromise = null;
    if (!cloudReady || !state.uid) return;
    const uid = state.uid;
    Promise.resolve(pending)
      .then(runId => {
        if (!runId) throw new Error('no-run');
        return call('submitRun', {
          runId,
          meters: run.meters,
          coins: run.coins,
          jumps: run.jumps,
          doubles: run.doubles,
          slides: run.slides,
          dodged: run.dodged
        });
      })
      .then(out => {
        if (state.uid === uid) applyServer(out.profile);
      })
      .catch(() => refresh());
  },

  refreshQuests() {
    const rolled = rollQuests(state.quests);
    if (rolled === state.quests) return;
    state = { ...state, quests: rolled };
    persist();
    emit();
  },

  readyQuests() {
    return readyCount(rollQuests(state.quests));
  },

  async claimQuest(id) {
    const local = rollQuests(state.quests);
    const quest = allQuests(local).find(item => item.id === id);
    if (!quest) return { ok: false, reason: 'unknown' };
    if (isClaimed(local, quest)) return { ok: true, reward: 0 };
    if (progressOf(local, quest) < quest.target) return { ok: false, reason: 'progress' };
    if (cloudReady && state.uid) {
      try {
        const out = await call('claimQuest', { id });
        applyServer(out.profile);
        return { ok: true, reward: out.reward };
      } catch {
        return { ok: false, reason: 'offline' };
      }
    }
    state = { ...state, coins: state.coins + quest.reward, quests: markClaimed(local, quest) };
    persist();
    emit();
    return { ok: true, reward: quest.reward };
  },

  setPublicBoard(on) {
    state = { ...state, publicBoard: !!on };
    persist();
    emit();
    if (!cloudReady || !state.uid) return;
    call('setPublicBoard', { on: !!on })
      .then(out => applyServer(out.profile))
      .catch(() => refresh());
  },

  async buy(id) {
    const item = findItem(id);
    if (!item) return { ok: false, reason: 'unknown' };
    if (state.owned.includes(id)) return { ok: true };
    if (state.coins < item.price) return { ok: false, reason: 'coins' };
    if (cloudReady && state.uid) {
      try {
        const out = await call('buyItem', { id });
        applyServer(out.profile);
        return { ok: true };
      } catch (e) {
        return { ok: false, reason: e && e.code === 'coins' ? 'coins' : 'offline' };
      }
    }
    state = { ...state, coins: state.coins - item.price, owned: [...state.owned, id] };
    persist();
    emit();
    return { ok: true };
  },

  equip(id) {
    const item = findItem(id);
    if (!item || !state.owned.includes(id)) return false;
    const kind = kindOf(id);
    state = { ...state, equipped: { ...state.equipped, [kind]: id } };
    persist();
    emit();
    if (cloudReady && state.uid) {
      cloud.fsMod.updateDoc(docRef(), { ['equipped.' + kind]: id }).catch(() => {});
    }
    return true;
  }
};