import { FieldValue } from 'firebase-admin/firestore';
import { findItem } from '../assets/js/core/cosmetics.js';

export const USERNAME = /^[A-Za-z0-9_]{3,16}$/;

const RESERVED = new Set(['admin', 'administrator', 'dash', 'dev', 'developer', 'gabriel', 'moderator', 'mod', 'official', 'staff', 'support', 'system', 'owner']);
const MAX_FRIENDS = 50;
const MAX_PENDING = 30;
const MAX_GIFT_COINS = 1000;
const NAME_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const GIFT_PAGE = 20;

const whole = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

const cleanPhoto = v => {
  try {
    return typeof v === 'string' && new URL(v).protocol === 'https:' ? v : null;
  } catch {
    return null;
  }
};

export function createSocial({ db, profileRef, load, sanitize, view, Fail, publish, now }) {
  const nameRef = key => db.doc(`dashUsernames/${key}`);
  const entries = uid => db.collection(`dashFriends/${uid}/entries`);
  const entryRef = (uid, other) => db.doc(`dashFriends/${uid}/entries/${other}`);
  const gifts = uid => db.collection(`dashGifts/${uid}/items`);

  const card = (uid, snap) => {
    const data = snap && snap.exists ? snap.data() : {};
    return {
      uid,
      username: typeof data.username === 'string' ? data.username : null,
      photo: data.photoOn !== false ? cleanPhoto(data.photo) : null,
      best: whole(data.best)
    };
  };

  const countState = (docs, state) => docs.filter(doc => doc.data().state === state).length;

  async function cards(uids) {
    if (!uids.length) return new Map();
    const snaps = await db.getAll(...uids.map(profileRef));
    return new Map(snaps.map((snap, i) => [uids[i], card(uids[i], snap)]));
  }

  async function findUid(username) {
    const key = typeof username === 'string' ? username.trim().toLowerCase() : '';
    if (!USERNAME.test(key)) throw new Fail(400, 'username');
    const snap = await nameRef(key).get();
    if (!snap.exists) throw new Fail(404, 'no-user');
    return snap.data().uid;
  }

  return {
    async setUsername(user, body) {
      const name = typeof body.username === 'string' ? body.username.trim() : '';
      if (!USERNAME.test(name)) throw new Fail(400, 'username');
      const key = name.toLowerCase();
      if (RESERVED.has(key)) throw new Fail(409, 'taken');
      const profile = await db.runTransaction(async tx => {
        const profileSnap = await tx.get(profileRef(user.uid));
        if (!profileSnap.exists) throw new Fail(409, 'no-profile');
        const keySnap = await tx.get(nameRef(key));
        if (keySnap.exists && keySnap.data().uid !== user.uid) throw new Fail(409, 'taken');
        const raw = profileSnap.data();
        const old = typeof raw.username === 'string' ? raw.username : null;
        const me = sanitize(raw);
        if (old === name) return me;
        if (old && now() - whole(raw.usernameAt) < NAME_COOLDOWN_MS) throw new Fail(429, 'cooldown');
        if (old) tx.delete(nameRef(old.toLowerCase()));
        tx.set(nameRef(key), { uid: user.uid });
        tx.update(profileRef(user.uid), { username: name, usernameAt: now(), updatedAt: FieldValue.serverTimestamp() });
        return { ...me, username: name };
      });
      await publish(user, profile);
      return { profile: view(profile) };
    },

    async setPhoto(user, body) {
      const on = !!body.on;
      return db.runTransaction(async tx => {
        const profile = await load(tx, user.uid);
        tx.update(profileRef(user.uid), { photoOn: on, updatedAt: FieldValue.serverTimestamp() });
        return { profile: view({ ...profile, photoOn: on }) };
      });
    },

    async social(user) {
      const [mine, unseen] = await Promise.all([entries(user.uid).get(), gifts(user.uid).where('seen', '==', false).limit(GIFT_PAGE).get()]);
      const uids = mine.docs.map(doc => doc.id);
      const people = await cards(uids);
      const group = state =>
        mine.docs
          .filter(doc => doc.data().state === state)
          .map(doc => people.get(doc.id))
          .filter(person => person && person.username)
          .sort((a, b) => a.username.localeCompare(b.username));
      const received = unseen.docs
        .map(doc => {
          const data = doc.data();
          return { id: doc.id, from: typeof data.fromName === 'string' ? data.fromName : 'Someone', coins: whole(data.coins), item: typeof data.item === 'string' ? data.item : null, at: whole(data.at) };
        })
        .sort((a, b) => b.at - a.at);
      return { friends: group('friend'), incoming: group('in'), outgoing: group('out'), gifts: received };
    },

    async request(user, body) {
      const target = await findUid(body.username);
      if (target === user.uid) throw new Fail(400, 'self');
      const accepted = await db.runTransaction(async tx => {
        const [me, mineSnap, theirsSnap, existing] = await Promise.all([
          load(tx, user.uid),
          tx.get(entries(user.uid)),
          tx.get(entries(target)),
          tx.get(entryRef(user.uid, target))
        ]);
        if (!me.username) throw new Fail(409, 'no-username');
        const state = existing.exists ? existing.data().state : null;
        if (state === 'friend') throw new Fail(409, 'already');
        if (state === 'out') throw new Fail(409, 'pending');
        const at = now();
        if (state === 'in') {
          if (countState(mineSnap.docs, 'friend') >= MAX_FRIENDS) throw new Fail(409, 'full');
          if (countState(theirsSnap.docs, 'friend') >= MAX_FRIENDS) throw new Fail(409, 'target-full');
          tx.set(entryRef(user.uid, target), { state: 'friend', at });
          tx.set(entryRef(target, user.uid), { state: 'friend', at });
          return true;
        }
        if (countState(mineSnap.docs, 'out') >= MAX_PENDING) throw new Fail(409, 'too-many');
        if (countState(theirsSnap.docs, 'in') >= MAX_PENDING) throw new Fail(409, 'target-busy');
        tx.set(entryRef(user.uid, target), { state: 'out', at });
        tx.set(entryRef(target, user.uid), { state: 'in', at });
        return false;
      });
      return { accepted };
    },

    async respond(user, body) {
      const other = typeof body.uid === 'string' ? body.uid : '';
      if (!other || other === user.uid) throw new Fail(400, 'uid');
      const accept = !!body.accept;
      await db.runTransaction(async tx => {
        const [existing, mineSnap, theirsSnap] = await Promise.all([tx.get(entryRef(user.uid, other)), tx.get(entries(user.uid)), tx.get(entries(other))]);
        if (!existing.exists || existing.data().state !== 'in') throw new Fail(404, 'no-request');
        if (!accept) {
          tx.delete(entryRef(user.uid, other));
          tx.delete(entryRef(other, user.uid));
          return;
        }
        if (countState(mineSnap.docs, 'friend') >= MAX_FRIENDS) throw new Fail(409, 'full');
        if (countState(theirsSnap.docs, 'friend') >= MAX_FRIENDS) throw new Fail(409, 'target-full');
        const at = now();
        tx.set(entryRef(user.uid, other), { state: 'friend', at });
        tx.set(entryRef(other, user.uid), { state: 'friend', at });
      });
      return { ok: true };
    },

    async removeFriend(user, body) {
      const other = typeof body.uid === 'string' ? body.uid : '';
      if (!other || other === user.uid) throw new Fail(400, 'uid');
      const batch = db.batch();
      batch.delete(entryRef(user.uid, other));
      batch.delete(entryRef(other, user.uid));
      await batch.commit();
      return { ok: true };
    },

    async gift(user, body) {
      const other = typeof body.uid === 'string' ? body.uid : '';
      if (!other || other === user.uid) throw new Fail(400, 'uid');
      const coins = body.coins === undefined || body.coins === null ? 0 : body.coins;
      if (!Number.isInteger(coins) || coins < 0 || coins > MAX_GIFT_COINS) throw new Fail(400, 'amount');
      const item = body.item === undefined || body.item === null ? null : findItem(body.item);
      if (body.item && (!item || item.price <= 0)) throw new Fail(400, 'item');
      if (!coins && !item) throw new Fail(400, 'empty');
      const cost = coins + (item ? item.price : 0);
      const profile = await db.runTransaction(async tx => {
        const [me, friendship, theirSnap] = await Promise.all([load(tx, user.uid), tx.get(entryRef(user.uid, other)), tx.get(profileRef(other))]);
        if (!me.username) throw new Fail(409, 'no-username');
        if (!friendship.exists || friendship.data().state !== 'friend') throw new Fail(403, 'not-friends');
        if (!theirSnap.exists) throw new Fail(404, 'no-user');
        const theirs = theirSnap.data();
        const theirOwned = Array.isArray(theirs.owned) ? theirs.owned : [];
        if (item && theirOwned.includes(item.id)) throw new Fail(409, 'owned');
        if (me.coins < cost) throw new Fail(409, 'coins');
        tx.update(profileRef(user.uid), { coins: me.coins - cost, updatedAt: FieldValue.serverTimestamp() });
        const change = { coins: whole(theirs.coins) + coins, updatedAt: FieldValue.serverTimestamp() };
        if (item) change.owned = [...theirOwned, item.id];
        tx.update(profileRef(other), change);
        tx.set(gifts(other).doc(), { from: user.uid, fromName: me.username, coins, item: item ? item.id : null, at: now(), seen: false });
        return { ...me, coins: me.coins - cost };
      });
      return { profile: view(profile) };
    },

    async seenGifts(user) {
      const snap = await gifts(user.uid).where('seen', '==', false).limit(GIFT_PAGE).get();
      if (snap.empty) return { ok: true };
      const batch = db.batch();
      snap.docs.forEach(doc => batch.update(doc.ref, { seen: true }));
      await batch.commit();
      return { ok: true };
    }
  };
}