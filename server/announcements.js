import { createHash } from 'node:crypto';
import { cleanText } from './polls.js';

export const TAGS = ['update', 'event', 'fix', 'news'];

export const ANNOUNCEMENT_LIMITS = {
  title: 80,
  body: 1500,
  listed: 50,
  pinned: 3
};

const ID = /^[A-Za-z0-9]{20}$/;
const VERSION = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;

const releaseId = version => createHash('sha1').update(`release:${version}`).digest('hex').slice(0, 20);

const whole = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export function cleanAnnouncement(body) {
  const src = body && typeof body === 'object' ? body : {};
  const title = cleanText(src.title, ANNOUNCEMENT_LIMITS.title);
  if (!title) return null;
  return {
    tag: TAGS.includes(src.tag) ? src.tag : 'update',
    title,
    body: cleanText(src.body, ANNOUNCEMENT_LIMITS.body, true),
    pinned: src.pinned === true
  };
}

export function createAnnouncements({ db, Fail, now }) {
  const items = () => db.collection('dashAnnouncements');
  const itemRef = id => db.doc(`dashAnnouncements/${id}`);

  const shape = (id, raw) => {
    const data = raw && typeof raw === 'object' ? raw : {};
    return {
      id,
      tag: TAGS.includes(data.tag) ? data.tag : 'update',
      title: typeof data.title === 'string' ? data.title : '',
      body: typeof data.body === 'string' ? data.body : '',
      pinned: data.pinned === true,
      at: whole(data.at),
      editedAt: whole(data.editedAt)
    };
  };

  const needAdmin = user => {
    if (!user.admin) throw new Fail(403, 'admin');
  };

  const needId = body => {
    if (!body || typeof body.id !== 'string' || !ID.test(body.id)) throw new Fail(400, 'id');
    return body.id;
  };

  const order = list => [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at - a.at);

  const pinnedCount = async skip => {
    const snap = await items().where('pinned', '==', true).limit(ANNOUNCEMENT_LIMITS.pinned + 2).get();
    return snap.docs.filter(doc => doc.id !== skip).length;
  };

  return {
    async listAnnouncements(user) {
      const snap = await items().orderBy('at', 'desc').limit(ANNOUNCEMENT_LIMITS.listed).get();
      return { admin: !!user.admin, items: order(snap.docs.map(doc => shape(doc.id, doc.data()))) };
    },

    async createAnnouncement(user, body) {
      needAdmin(user);
      const post = cleanAnnouncement(body);
      if (!post) throw new Fail(400, 'announcement');
      if (post.pinned && (await pinnedCount(null)) >= ANNOUNCEMENT_LIMITS.pinned) throw new Fail(409, 'pinned-full');
      const ref = items().doc();
      const doc = { ...post, at: now() };
      await ref.set(doc);
      return { item: shape(ref.id, doc) };
    },

    async editAnnouncement(user, body) {
      needAdmin(user);
      const id = needId(body);
      const post = cleanAnnouncement(body);
      if (!post) throw new Fail(400, 'announcement');
      const snap = await itemRef(id).get();
      if (!snap.exists) throw new Fail(404, 'no-announcement');
      const before = shape(id, snap.data());
      if (post.pinned && !before.pinned && (await pinnedCount(id)) >= ANNOUNCEMENT_LIMITS.pinned) throw new Fail(409, 'pinned-full');
      const change = { ...post, editedAt: now() };
      await itemRef(id).update(change);
      return { item: shape(id, { ...snap.data(), ...change }) };
    },

    async publishRelease(body) {
      if (!body || typeof body.version !== 'string' || !VERSION.test(body.version)) throw new Fail(400, 'announcement');
      const post = cleanAnnouncement({ tag: 'update', title: body.title || `Dash ${body.version}`, body: body.body, pinned: false });
      if (!post) throw new Fail(400, 'announcement');
      const ref = itemRef(releaseId(body.version));
      const snap = await ref.get();
      if (snap.exists) return { item: shape(ref.id, snap.data()), existing: true };
      const doc = { ...post, at: now() };
      await ref.set(doc);
      return { item: shape(ref.id, doc), existing: false };
    },

    async deleteAnnouncement(user, body) {
      needAdmin(user);
      const id = needId(body);
      await itemRef(id).delete();
      return { ok: true };
    }
  };
}