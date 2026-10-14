import { loadFirebase } from './firebase.js';
import { findItem, kindOf } from './cosmetics.js';

const KEY = 'dash:profile';
const LEGACY_BEST = 'dash:best';
const COLLECTION = 'dashProfiles';

const listeners = new Set();
const session = { status: 'loading', syncing: false, error: null };
let cloud = null;
let cloudReady = false;
let started = false;

const defaults = () => ({
  coins: 0,
  best: 0,
  runs: 0,
  owned: ['skin:emerald', 'hat:none', 'char:bot', 'world:skyline'],
  equipped: { skin: 'skin:emerald', hat: 'hat:none', char: 'char:bot', world: 'world:skyline' }
});

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
    equipped
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
    uid: (raw && raw.uid) || null,
    name: (raw && raw.name) || null,
    photo: (raw && raw.photo) || null
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

async function sync(user) {
  const { runTransaction, doc, serverTimestamp } = cloud.fsMod;
  const ref = doc(cloud.db, COLLECTION, user.uid);
  const guest = state.uid ? null : state;
  const result = await runTransaction(cloud.db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      const base = guest ? sanitize(guest) : defaults();
      tx.set(ref, { ...base, name: user.displayName || null, updatedAt: serverTimestamp() });
      return base;
    }
    const remote = sanitize(snap.data());
    if (!guest) return remote;
    const local = sanitize(guest);
    const merged = {
      coins: remote.coins + local.coins,
      best: Math.max(remote.best, local.best),
      runs: remote.runs + local.runs,
      owned: [...new Set([...remote.owned, ...local.owned])],
      equipped: remote.equipped
    };
    tx.update(ref, {
      coins: merged.coins,
      best: merged.best,
      runs: merged.runs,
      owned: merged.owned,
      updatedAt: serverTimestamp()
    });
    return merged;
  });
  state = { ...result, uid: user.uid, name: user.displayName || null, photo: user.photoURL || null };
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

  recordRun({ coins, score }) {
    const prevBest = state.best;
    state = {
      ...state,
      coins: state.coins + coins,
      runs: state.runs + 1,
      best: Math.max(state.best, score)
    };
    persist();
    emit();
    if (cloudReady && state.uid) {
      const { updateDoc, increment, serverTimestamp } = cloud.fsMod;
      const data = { coins: increment(coins), runs: increment(1), updatedAt: serverTimestamp() };
      if (score > prevBest) data.best = score;
      updateDoc(docRef(), data).catch(() => {});
    }
  },

  async buy(id) {
    const item = findItem(id);
    if (!item) return { ok: false, reason: 'unknown' };
    if (state.owned.includes(id)) return { ok: true };
    if (state.coins < item.price) return { ok: false, reason: 'coins' };
    if (cloudReady && state.uid) {
      const { runTransaction, arrayUnion, serverTimestamp } = cloud.fsMod;
      try {
        const coins = await runTransaction(cloud.db, async tx => {
          const snap = await tx.get(docRef());
          const data = snap.data() || {};
          if ((data.owned || []).includes(id)) return whole(data.coins);
          if (whole(data.coins) < item.price) throw new Error('coins');
          tx.update(docRef(), {
            coins: whole(data.coins) - item.price,
            owned: arrayUnion(id),
            updatedAt: serverTimestamp()
          });
          return whole(data.coins) - item.price;
        });
        state = { ...state, coins, owned: [...new Set([...state.owned, id])] };
      } catch (e) {
        return { ok: false, reason: e && e.message === 'coins' ? 'coins' : 'offline' };
      }
    } else {
      state = { ...state, coins: state.coins - item.price, owned: [...state.owned, id] };
    }
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