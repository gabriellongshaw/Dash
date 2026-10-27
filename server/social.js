import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import { findItem } from '../assets/js/core/cosmetics.js';
import { FIELDS, REQUEST_LEVELS, canSee, cleanPrivacy, levelsFor } from '../assets/js/core/privacy.js';

export const USERNAME = /^[a-z0-9_]{3,16}$/;

const RESERVED = new Set(['admin', 'administrator', 'dash', 'dev', 'developer', 'gabriel', 'moderator', 'mod', 'official', 'staff', 'support', 'system', 'owner']);
const MAX_FRIENDS = 50;
const MAX_PENDING = 30;
const MAX_FAVOURITES = 10;
const MAX_BLOCKED = 100;
const MAX_UID = 128;
const MAX_GIFT_COINS = 1000;
const NAME_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const GIFT_PAGE = 20;
const SEARCH_LIMIT = 12;
const SEARCH_FETCH = 15;
const MAX_DISPLAY_NAME = 24;
const MAX_PHOTO_CHARS = 30000;
const PHOTO_DATA = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;

const whole = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

const cleanPhoto = v => {
  try {
    return typeof v === 'string' && new URL(v).protocol === 'https:' ? v : null;
  } catch {
    return null;
  }
};

export function cleanDisplayName(value) {
  if (typeof value !== 'string') return null;
  const name = value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_DISPLAY_NAME);
  return name || null;
}

export function profileFixups(raw, photo) {
  if (!raw) return {};
  const fix = {};
  if (raw.photo !== photo) fix.photo = photo;
  if (typeof raw.username === 'string' && raw.username !== raw.username.toLowerCase()) fix.username = raw.username.toLowerCase();
  const name = cleanDisplayName(raw.displayName);
  const lower = name ? name.toLowerCase() : null;
  if ((raw.displayLower || null) !== lower) fix.displayLower = lower;
  return fix;
}

export function validPhoto(value) {
  if (typeof value !== 'string' || value.length > MAX_PHOTO_CHARS || !PHOTO_DATA.test(value)) return false;
  const bytes = Buffer.from(value.slice(value.indexOf(',') + 1), 'base64');
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export function pickPhoto(data) {
  const mode = ['google', 'custom', 'none'].includes(data.photoMode) ? data.photoMode : data.photoOn === false ? 'none' : 'google';
  if (mode === 'custom') return validPhoto(data.photoData) ? data.photoData : null;
  if (mode === 'google') return cleanPhoto(data.photo);
  return null;
}

export function createSocial({ db, profileRef, load, sanitize, view, Fail, publish, now }) {
  const nameRef = key => db.doc(`dashUsernames/${key}`);
  const entries = uid => db.collection(`dashFriends/${uid}/entries`);
  const entryRef = (uid, other) => db.doc(`dashFriends/${uid}/entries/${other}`);
  const gifts = uid => db.collection(`dashGifts/${uid}/items`);

  const card = (uid, snap, relation = null) => {
    const data = snap && snap.exists ? snap.data() : {};
    const privacy = cleanPrivacy(data.privacy);
    return {
      uid,
      username: typeof data.username === 'string' ? data.username.toLowerCase() : null,
      displayName: cleanDisplayName(data.displayName),
      searchable: data.searchable !== false,
      photo: canSee(privacy.photo, relation) ? pickPhoto(data) : null,
      best: canSee(privacy.stats, relation) ? whole(data.best) : null
    };
  };

  const countState = (docs, state) => docs.filter(doc => doc.data().state === state).length;

  async function cards(uids, relationOf = () => null) {
    if (!uids.length) return new Map();
    const snaps = await db.getAll(...uids.map(profileRef));
    return new Map(snaps.map((snap, i) => [uids[i], card(uids[i], snap, relationOf(uids[i]))]));
  }

  const validUid = value => typeof value === 'string' && value.length > 0 && value.length <= MAX_UID && !value.includes('/') && value !== '.' && value !== '..' && !/^__.*__$/.test(value);

  async function findUid(username) {
    const key = typeof username === 'string' ? username.trim().toLowerCase() : '';
    if (!USERNAME.test(key)) throw new Fail(400, 'username');
    const snap = await nameRef(key).get();
    if (!snap.exists) throw new Fail(404, 'no-user');
    return snap.data().uid;
  }

  return {
    async setUsername(user, body) {
      const name = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
      if (!USERNAME.test(name)) throw new Fail(400, 'username');
      const key = name;
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
        if (old && old.toLowerCase() === name) {
          tx.update(profileRef(user.uid), { username: name, updatedAt: FieldValue.serverTimestamp() });
          return { ...me, username: name };
        }
        if (old && now() - whole(raw.usernameAt) < NAME_COOLDOWN_MS) throw new Fail(429, 'cooldown');
        if (old) tx.delete(nameRef(old.toLowerCase()));
        tx.set(nameRef(key), { uid: user.uid });
        tx.update(profileRef(user.uid), { username: name, usernameAt: now(), updatedAt: FieldValue.serverTimestamp() });
        return { ...me, username: name };
      });
      await publish(user, profile);
      return { profile: view(profile) };
    },

    async setDisplayName(user, body) {
      const name = cleanDisplayName(body.displayName);
      return db.runTransaction(async tx => {
        const profile = await load(tx, user.uid);
        tx.update(profileRef(user.uid), { displayName: name, displayLower: name ? name.toLowerCase() : null, updatedAt: FieldValue.serverTimestamp() });
        return { profile: view({ ...profile, displayName: name }) };
      });
    },

    async setPhoto(user, body) {
      const mode = body.mode;
      if (!['google', 'custom', 'none'].includes(mode)) throw new Fail(400, 'photo');
      if (mode === 'custom' && !validPhoto(body.data)) throw new Fail(400, 'photo');
      return db.runTransaction(async tx => {
        const profile = await load(tx, user.uid);
        const change = { photoMode: mode, updatedAt: FieldValue.serverTimestamp() };
        if (mode === 'custom') change.photoData = body.data;
        tx.update(profileRef(user.uid), change);
        return { profile: view({ ...profile, photoMode: mode, photoData: mode === 'custom' ? body.data : profile.photoData }) };
      });
    },

    async setSearchable(user, body) {
      const on = !!body.on;
      return db.runTransaction(async tx => {
        const profile = await load(tx, user.uid);
        tx.update(profileRef(user.uid), { searchable: on, updatedAt: FieldValue.serverTimestamp() });
        return { profile: view({ ...profile, searchable: on }) };
      });
    },

    async search(user, body) {
      const q = typeof body.q === 'string' ? body.q.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase().replace(/^@/, '').slice(0, MAX_DISPLAY_NAME) : '';
      if (q.length < 2) return { results: [] };
      const end = `${q}\uf8ff`;
      const [byUser, byName, mine] = await Promise.all([
        db.collection('dashUsernames').where(FieldPath.documentId(), '>=', q).where(FieldPath.documentId(), '<', end).limit(SEARCH_FETCH).get(),
        db.collection('dashProfiles').where('displayLower', '>=', q).where('displayLower', '<', end).limit(SEARCH_FETCH).get(),
        entries(user.uid).get()
      ]);
      const states = new Map(mine.docs.map(doc => [doc.id, doc.data().state]));
      const found = [...new Set([...byUser.docs.map(doc => doc.data().uid), ...byName.docs.map(doc => doc.id)])].filter(uid => validUid(uid) && uid !== user.uid && states.get(uid) !== 'blocked');
      const theirs = found.length ? await db.getAll(...found.map(uid => entryRef(uid, user.uid))) : [];
      const uids = found.filter((uid, i) => !(theirs[i].exists && theirs[i].data().state === 'blocked'));
      const people = await cards(uids, uid => states.get(uid) || null);
      const rank = person => {
        const name = (person.displayName || '').toLowerCase();
        if (person.username === q || name === q) return 0;
        if (person.username.startsWith(q) || name.startsWith(q)) return 1;
        return 2;
      };
      const results = [...people.values()]
        .filter(person => person.username && person.searchable)
        .map(person => ({ uid: person.uid, username: person.username, displayName: person.displayName, photo: person.photo, best: person.best, state: states.get(person.uid) || null }))
        .sort((a, b) => rank(a) - rank(b) || a.username.localeCompare(b.username))
        .slice(0, SEARCH_LIMIT);
      return { results };
    },

    async social(user) {
      const [mine, unseen] = await Promise.all([entries(user.uid).get(), gifts(user.uid).where('seen', '==', false).limit(GIFT_PAGE).get()]);
      const uids = mine.docs.map(doc => doc.id);
      const states = new Map(mine.docs.map(doc => [doc.id, doc.data()]));
      const people = await cards(uids, uid => states.get(uid).state);
      const group = state =>
        mine.docs
          .filter(doc => doc.data().state === state)
          .map(doc => ({ ...people.get(doc.id), favourite: state === 'friend' && doc.data().favourite === true }))
          .filter(person => person.username)
          .sort((a, b) => Number(b.favourite) - Number(a.favourite) || a.username.localeCompare(b.username));
      const received = unseen.docs
        .map(doc => {
          const data = doc.data();
          return { id: doc.id, from: typeof data.fromName === 'string' ? data.fromName.toLowerCase() : 'someone', coins: whole(data.coins), item: typeof data.item === 'string' ? data.item : null, at: whole(data.at) };
        })
        .sort((a, b) => b.at - a.at);
      return { friends: group('friend'), incoming: group('in'), outgoing: group('out'), blocked: group('blocked').map(({ uid, username, displayName }) => ({ uid, username, displayName })), gifts: received };
    },

    async request(user, body) {
      const target = await findUid(body.username);
      if (target === user.uid) throw new Fail(400, 'self');
      const accepted = await db.runTransaction(async tx => {
        const [me, mineSnap, theirsSnap, existing, theirProfile] = await Promise.all([
          load(tx, user.uid),
          tx.get(entries(user.uid)),
          tx.get(entries(target)),
          tx.get(entryRef(user.uid, target)),
          tx.get(profileRef(target))
        ]);
        if (!me.username) throw new Fail(409, 'no-username');
        if (!theirProfile.exists) throw new Fail(404, 'no-user');
        const theirEntry = theirsSnap.docs.find(doc => doc.id === user.uid);
        if (theirEntry && theirEntry.data().state === 'blocked') throw new Fail(404, 'no-user');
        const state = existing.exists ? existing.data().state : null;
        if (state === 'blocked') throw new Fail(409, 'you-blocked');
        if (state === 'friend') throw new Fail(409, 'already');
        if (state === 'out') throw new Fail(409, 'pending');
        if (state !== 'in' && cleanPrivacy(theirProfile.data().privacy).requests === 'nobody') throw new Fail(403, 'requests-off');
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
      await db.runTransaction(async tx => {
        const [mine, theirs] = await Promise.all([tx.get(entryRef(user.uid, other)), tx.get(entryRef(other, user.uid))]);
        if (mine.exists && mine.data().state === 'blocked') return;
        if (mine.exists) tx.delete(entryRef(user.uid, other));
        if (theirs.exists && theirs.data().state !== 'blocked') tx.delete(entryRef(other, user.uid));
      });
      return { ok: true };
    },

    async favourite(user, body) {
      const other = typeof body.uid === 'string' ? body.uid : '';
      if (!validUid(other) || other === user.uid) throw new Fail(400, 'uid');
      const on = !!body.on;
      await db.runTransaction(async tx => {
        const [mine, all] = await Promise.all([tx.get(entryRef(user.uid, other)), tx.get(entries(user.uid))]);
        if (!mine.exists || mine.data().state !== 'friend') throw new Fail(403, 'not-friends');
        if (on && mine.data().favourite !== true && all.docs.filter(doc => doc.data().favourite === true).length >= MAX_FAVOURITES) throw new Fail(409, 'too-many-favourites');
        tx.update(entryRef(user.uid, other), { favourite: on });
      });
      return { ok: true, favourite: on };
    },

    async block(user, body) {
      const other = typeof body.uid === 'string' ? body.uid : '';
      if (!validUid(other) || other === user.uid) throw new Fail(400, 'uid');
      await db.runTransaction(async tx => {
        const [target, mine, theirs, all] = await Promise.all([
          tx.get(profileRef(other)),
          tx.get(entryRef(user.uid, other)),
          tx.get(entryRef(other, user.uid)),
          tx.get(entries(user.uid))
        ]);
        if (!target.exists) throw new Fail(404, 'no-user');
        const already = mine.exists && mine.data().state === 'blocked';
        if (!already && countState(all.docs, 'blocked') >= MAX_BLOCKED) throw new Fail(409, 'too-many-blocked');
        tx.set(entryRef(user.uid, other), { state: 'blocked', at: now() });
        if (theirs.exists && theirs.data().state !== 'blocked') tx.delete(entryRef(other, user.uid));
      });
      return { ok: true };
    },

    async unblock(user, body) {
      const other = typeof body.uid === 'string' ? body.uid : '';
      if (!validUid(other) || other === user.uid) throw new Fail(400, 'uid');
      await db.runTransaction(async tx => {
        const mine = await tx.get(entryRef(user.uid, other));
        if (mine.exists && mine.data().state === 'blocked') tx.delete(entryRef(user.uid, other));
      });
      return { ok: true };
    },

    async setPrivacy(user, body) {
      const change = {};
      for (const key of FIELDS) {
        if (body[key] === undefined) continue;
        if (!levelsFor(key).includes(body[key])) throw new Fail(400, 'privacy');
        change[key] = body[key];
      }
      if (body.requests !== undefined) {
        if (!REQUEST_LEVELS.includes(body.requests)) throw new Fail(400, 'privacy');
        change.requests = body.requests;
      }
      if (!Object.keys(change).length) throw new Fail(400, 'privacy');
      return db.runTransaction(async tx => {
        const profile = await load(tx, user.uid);
        const privacy = { ...profile.privacy, ...change };
        tx.update(profileRef(user.uid), { privacy, updatedAt: FieldValue.serverTimestamp() });
        return { profile: view({ ...profile, privacy }) };
      });
    },

    async viewProfile(user, body) {
      const target = validUid(body.uid) ? body.uid : await findUid(body.username);
      const self = target === user.uid;
      const guest = !!user.anon;
      const [snap, mine, theirs] = await Promise.all([
        profileRef(target).get(),
        self || guest ? null : entryRef(user.uid, target).get(),
        self ? null : entryRef(target, user.uid).get()
      ]);
      const raw = snap.exists ? snap.data() : null;
      const username = raw && typeof raw.username === 'string' ? raw.username.toLowerCase() : null;
      if (!raw || !username) throw new Fail(404, 'no-user');
      if (theirs && theirs.exists && theirs.data().state === 'blocked') throw new Fail(404, 'no-user');
      const entry = mine && mine.exists ? mine.data() : null;
      const relation = self ? 'self' : guest ? 'guest' : entry ? entry.state : null;
      const displayName = cleanDisplayName(raw.displayName);
      if (relation === 'blocked') return { person: { uid: target, username, displayName, relation, favourite: false, photo: null, canRequest: false, stats: null, look: null, locked: null, hidden: { photo: false, stats: false, look: false } } };
      const data = sanitize(raw);
      const privacy = data.privacy;
      const open = canSee(privacy.profile, relation);
      const see = field => open && canSee(privacy[field], relation);
      const stats = see('stats') ? { best: data.best, runs: data.runs, items: data.owned.length, friends: countState((await entries(target).get()).docs, 'friend') } : null;
      return {
        person: {
          uid: target,
          username,
          displayName,
          relation,
          favourite: relation === 'friend' && entry.favourite === true,
          photo: see('photo') ? pickPhoto(raw) : null,
          canRequest: self || guest ? false : privacy.requests !== 'nobody',
          stats,
          look: see('look') ? { equipped: data.equipped } : null,
          locked: open ? null : privacy.profile,
          hidden: { photo: !see('photo'), stats: !see('stats'), look: !see('look') }
        }
      };
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