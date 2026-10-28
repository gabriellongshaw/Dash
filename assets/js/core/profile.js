import { loadFirebase } from './firebase.js';
import { holdPage, swapPage } from './motion.js';
import { cleanPrivacy, defaultPrivacy } from './privacy.js';
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

const PHOTO_MODES = ['google', 'custom', 'none'];
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
let lastSubmit = null;
let anonPending = false;

const defaults = () => ({
  coins: 0,
  best: 0,
  runs: 0,
  owned: ['skin:emerald', 'hat:none', 'char:bot', 'world:skyline'],
  equipped: { skin: 'skin:emerald', hat: 'hat:none', char: 'char:bot', world: 'world:skyline' },
  quests: freshQuests(),
  publicBoard: true,
  username: null,
  displayName: null,
  searchable: true,
  photoMode: 'google',
  photoData: null,
  privacy: defaultPrivacy()
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
    publicBoard: data.publicBoard !== false,
    username: typeof data.username === 'string' ? data.username.toLowerCase() : null,
    displayName: typeof data.displayName === 'string' && data.displayName ? data.displayName : null,
    searchable: data.searchable !== false,
    photoMode: PHOTO_MODES.includes(data.photoMode) ? data.photoMode : data.photoOn === false ? 'none' : 'google',
    photoData: typeof data.photoData === 'string' && data.photoData.startsWith('data:image/jpeg;base64,') ? data.photoData : null,
    privacy: cleanPrivacy(data.privacy)
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
    anon: !!(raw && raw.anon === true),
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
  return { ...defaults(), uid: null, anon: false, name: null, photo: null };
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

const accountOf = data => (data.uid && !data.anon ? data.uid : null);

async function sync(user) {
  const out = await call('syncProfile', {});
  return { ...sanitize(out.profile), uid: user.uid, anon: user.isAnonymous, name: cleanName(user.displayName), photo: cleanPhoto(user.photoURL) };
}

function startAnonymous() {
  if (anonPending || !cloud) return;
  anonPending = true;
  cloud.authMod
    .signInAnonymously(cloud.auth)
    .catch(e => {
      const code = e && e.code;
      session.error = code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation' ? 'anon' : 'offline';
      emit();
    })
    .finally(() => {
      anonPending = false;
    });
}

let inflight = null;

async function handleUser(user) {
  if (!user) {
    cloudReady = false;
    const leave = () => {
      if (state.uid) {
        state = guestState();
        persist();
      }
      session.status = 'out';
      session.syncing = false;
      emit();
    };
    if (accountOf(state)) await swapPage(leave);
    else leave();
    startAnonymous();
    return;
  }
  const key = `${user.uid}:${user.isAnonymous}`;
  if (inflight && inflight.key === key) return inflight.promise;
  const promise = runUser(user);
  inflight = { key, promise };
  try {
    await promise;
  } finally {
    if (inflight && inflight.promise === promise) inflight = null;
  }
}

async function runUser(user) {
  const status = user.isAnonymous ? 'out' : 'in';
  const hold = !user.isAnonymous && accountOf(state) !== user.uid ? holdPage() : null;
  session.syncing = true;
  session.error = null;
  if (!hold) {
    session.status = status;
    emit();
  }
  let next = null;
  try {
    next = await sync(user);
  } catch (e) {
    session.error = e && e.code === 'permission-denied' ? 'rules' : 'offline';
  }
  const settle = () => {
    session.status = status;
    cloudReady = !!next;
    if (next) {
      state = next;
      persist();
    }
    session.syncing = false;
    emit();
  };
  if (hold) await hold.release(settle);
  else if (next && accountOf(next) !== accountOf(state)) await swapPage(settle);
  else settle();
}

async function finishLink() {
  const user = cloud.auth.currentUser;
  if (!user) return;
  await user.getIdToken(true);
  await user.reload();
  await handleUser(cloud.auth.currentUser);
}

async function resolveClash(e) {
  const credential = cloud.authMod.GoogleAuthProvider.credentialFromError(e);
  if (!credential) throw e;
  await cloud.authMod.signInWithCredential(cloud.auth, credential);
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
    cloud.authMod
      .getRedirectResult(cloud.auth)
      .then(result => result && result.user && finishLink())
      .catch(e => {
        if (e && e.code === 'auth/credential-already-in-use') resolveClash(e).catch(() => {});
      });
    window.addEventListener('online', () => {
      if (!cloud.auth.currentUser) startAnonymous();
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
    const guest = auth.currentUser && auth.currentUser.isAnonymous ? auth.currentUser : null;
    try {
      if (guest) {
        await authMod.linkWithPopup(guest, provider);
        await finishLink();
      } else {
        await authMod.signInWithPopup(auth, provider);
      }
    } catch (e) {
      if (guest && e.code === 'auth/credential-already-in-use') {
        await resolveClash(e);
        return;
      }
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
        if (window.top !== window.self) {
          try {
            sessionStorage.setItem('dash:bare', '1');
            window.top.location.replace(window.location.href);
          } catch {}
          return;
        }
        if (guest) await authMod.linkWithRedirect(guest, provider);
        else await authMod.signInWithRedirect(auth, provider);
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
    lastSubmit = null;
    if (!cloudReady || !state.uid) return;
    runPromise = call('startRun').then(out => out.runId).catch(() => null);
  },

  recordRun(run) {
    const { coins, score } = run;
    if (!cloudReady || !state.uid) return;
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
    const uid = state.uid;
    let runId = null;
    lastSubmit = Promise.resolve(pending)
      .then(id => {
        if (!id) throw new Error('no-run');
        runId = id;
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
        return out.rejected ? null : runId;
      })
      .catch(() => {
        refresh();
        return null;
      });
  },

  get canDouble() {
    return cloudReady && !!state.uid && !!lastSubmit;
  },

  async doubleCoins() {
    const submit = lastSubmit;
    const id = submit ? await submit : null;
    if (!id) return { ok: false };
    try {
      const out = await call('doubleCoins', { runId: id });
      applyServer(out.profile);
      return { ok: true, coins: out.coins };
    } catch {
      await refresh();
      return { ok: false };
    }
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
    if (!cloudReady || !state.uid) return { ok: false, reason: 'offline' };
    try {
      const out = await call('claimQuest', { id });
      applyServer(out.profile);
      return { ok: true, reward: out.reward };
    } catch {
      await refresh();
      return { ok: false, reason: 'offline' };
    }
  },

  get avatar() {
    if (state.photoMode === 'custom') return state.photoData;
    if (state.photoMode === 'google') return state.photo;
    return null;
  },

  get social() {
    return cloudReady && !!state.uid && !state.anon;
  },

  get canView() {
    return cloudReady && !!state.uid;
  },

  async api(action, data) {
    if (!cloudReady || !state.uid) {
      const err = new Error('signed-out');
      err.code = 'signed-out';
      throw err;
    }
    const uid = state.uid;
    const out = await call(action, data);
    if (out.profile && state.uid === uid) applyServer(out.profile);
    return out;
  },

  setPublicBoard(on) {
    if (!cloudReady || !state.uid || state.anon) return;
    state = { ...state, publicBoard: !!on };
    persist();
    emit();
    call('setPublicBoard', { on: !!on })
      .then(out => applyServer(out.profile))
      .catch(() => refresh());
  },

  async buy(id) {
    const item = findItem(id);
    if (!item) return { ok: false, reason: 'unknown' };
    if (state.owned.includes(id)) return { ok: true };
    if (!cloudReady || !state.uid) return { ok: false, reason: 'offline' };
    try {
      const out = await call('buyItem', { id });
      applyServer(out.profile);
      return { ok: true };
    } catch (e) {
      if (e && e.code === 'coins') await refresh();
      return { ok: false, reason: e && e.code === 'coins' ? 'coins' : 'offline' };
    }
  },

  equip(id) {
    const item = findItem(id);
    if (!item || !state.owned.includes(id)) return false;
    if (!cloudReady || !state.uid) return false;
    const kind = kindOf(id);
    state = { ...state, equipped: { ...state.equipped, [kind]: id } };
    persist();
    emit();
    cloud.fsMod.updateDoc(docRef(), { ['equipped.' + kind]: id }).catch(() => refresh());
    return true;
  }
};