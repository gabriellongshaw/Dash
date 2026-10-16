import { loadFirebase } from './firebase.js';
import { findItem, kindOf } from './cosmetics.js';
import {
  freshQuests,
  cleanQuests,
  rollQuests,
  applyRun,
  reconcileQuests,
  allQuests,
  progressOf,
  isClaimed,
  markClaimed,
  readyCount
} from './quests.js';
import { submitEntry, removeEntries } from './leaderboard.js';

const KEY = 'dash:profile';
const LEGACY_BEST = 'dash:best';
const COLLECTION = 'dashProfiles';
const GUEST_CAP = 250;
const DAY_MS = 86400000;

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

function earnedFields(data, gain) {
  const today = Math.floor(Date.now() / DAY_MS);
  const earned = data && data.earnDay === today ? whole(data.earned) : 0;
  return gain > 0 ? { earnDay: today, earned: earned + gain } : {};
}

function guestValue(guest) {
  const base = new Set(defaults().owned);
  const items = guest.owned.filter(id => !base.has(id)).reduce((sum, id) => sum + (findItem(id) ? findItem(id).price : 0), 0);
  return Math.min(GUEST_CAP, guest.coins + items);
}

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

function publishScores() {
  if (!cloudReady || !state.uid || !state.publicBoard) return;
  const { uid, name, best } = state;
  const q = rollQuests(state.quests);
  submitEntry('all', uid, name, best).catch(() => {});
  submitEntry(q.week, uid, name, q.w.score).catch(() => {});
}

async function sync(user) {
  const { runTransaction, doc, serverTimestamp } = cloud.fsMod;
  const ref = doc(cloud.db, COLLECTION, user.uid);
  const guest = state.uid ? null : state;
  const gift = guest ? guestValue(guest) : 0;
  const result = await runTransaction(cloud.db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      const base = { ...defaults(), coins: gift };
      tx.set(ref, { ...base, name: cleanName(user.displayName), updatedAt: serverTimestamp() });
      return base;
    }
    const remote = sanitize(snap.data());
    if (gift <= 0) return remote;
    const coins = remote.coins + gift;
    tx.update(ref, { coins, ...earnedFields(snap.data(), gift), updatedAt: serverTimestamp() });
    return { ...remote, coins };
  });
  state = { ...result, uid: user.uid, name: cleanName(user.displayName), photo: cleanPhoto(user.photoURL) };
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
    publishScores();
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

  recordRun(run) {
    const { coins, score } = run;
    const prevBest = state.best;
    const prevWeekScore = rollQuests(state.quests).w.score;
    state = {
      ...state,
      coins: state.coins + coins,
      runs: state.runs + 1,
      best: Math.max(state.best, score),
      quests: applyRun(state.quests, run)
    };
    persist();
    emit();
    if (!cloudReady || !state.uid) return;
    const { runTransaction, serverTimestamp } = cloud.fsMod;
    const uid = state.uid;
    const ref = docRef();
    runTransaction(cloud.db, async tx => {
      const snap = await tx.get(ref);
      const remote = sanitize(snap.data());
      const quests = applyRun(remote.quests, run);
      const data = {
        coins: remote.coins + coins,
        runs: remote.runs + 1,
        quests,
        ...earnedFields(snap.data(), coins),
        updatedAt: serverTimestamp()
      };
      if (score > remote.best) data.best = score;
      tx.update(ref, data);
      return quests;
    })
      .then(quests => {
        if (state.uid === uid) {
          state = { ...state, quests: reconcileQuests(state.quests, quests) };
          persist();
          emit();
        }
        if (!state.publicBoard) return;
        if (score > prevBest) submitEntry('all', uid, state.name, score).catch(() => {});
        if (score > prevWeekScore) submitEntry(quests.week, uid, state.name, score).catch(() => {});
      })
      .catch(() => {});
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
      const { runTransaction, serverTimestamp } = cloud.fsMod;
      try {
        const out = await runTransaction(cloud.db, async tx => {
          const snap = await tx.get(docRef());
          const remote = sanitize(snap.data());
          const merged = reconcileQuests(remote.quests, local);
          if (isClaimed(merged, quest)) return { coins: remote.coins, quests: merged, paid: false };
          const quests = markClaimed(merged, quest);
          const coins = remote.coins + quest.reward;
          tx.update(docRef(), { coins, quests, ...earnedFields(snap.data(), quest.reward), updatedAt: serverTimestamp() });
          return { coins, quests, paid: true };
        });
        state = { ...state, coins: out.coins, quests: reconcileQuests(state.quests, out.quests) };
        persist();
        emit();
        return { ok: true, reward: out.paid ? quest.reward : 0 };
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
    cloud.fsMod.updateDoc(docRef(), { publicBoard: !!on }).catch(() => {});
    if (on) publishScores();
    else removeEntries(state.uid, rollQuests(state.quests).week).catch(() => {});
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
            lastBought: id,
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