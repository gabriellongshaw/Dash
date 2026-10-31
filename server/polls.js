import { FieldValue } from 'firebase-admin/firestore';

export const KINDS = ['poll', 'feedback', 'suggestion'];

export const LIMITS = {
  title: 80,
  body: 600,
  option: 60,
  reply: 500,
  minOptions: 2,
  maxOptions: 6,
  listed: 30,
  replies: 200
};

const POST_ID = /^[A-Za-z0-9]{20}$/;

export function cleanText(value, max, multiline = false) {
  if (typeof value !== 'string') return '';
  const flat = value.replace(/\r\n?/g, '\n').replace(multiline ? /[\u0000-\u0009\u000b-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g, ' ');
  const text = multiline ? flat.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n') : flat.replace(/\s+/g, ' ');
  return text.trim().slice(0, max);
}

export function cleanPost(body) {
  const src = body && typeof body === 'object' ? body : {};
  if (!KINDS.includes(src.kind)) return null;
  const title = cleanText(src.title, LIMITS.title);
  if (!title) return null;
  const post = { kind: src.kind, title, body: cleanText(src.body, LIMITS.body, true), options: [] };
  if (src.kind !== 'poll') return post;
  const seen = new Set();
  for (const raw of Array.isArray(src.options) ? src.options : []) {
    const text = cleanText(raw, LIMITS.option);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    post.options.push(text);
  }
  if (post.options.length < LIMITS.minOptions || post.options.length > LIMITS.maxOptions) return null;
  return post;
}

export function isAdmin(user, email) {
  return !!user && !user.anon && user.verified === true && user.provider === 'google.com' && typeof user.email === 'string' && typeof email === 'string' && user.email.toLowerCase() === email.toLowerCase();
}

const whole = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export function createPolls({ db, load, Fail, now }) {
  const posts = () => db.collection('dashPolls');
  const postRef = id => db.doc(`dashPolls/${id}`);
  const voteRef = (id, uid) => db.doc(`dashPolls/${id}/votes/${uid}`);
  const replyRef = (id, uid) => db.doc(`dashPolls/${id}/replies/${uid}`);

  const validId = value => typeof value === 'string' && POST_ID.test(value);

  const read = (id, raw) => {
    const data = raw && typeof raw === 'object' ? raw : {};
    const options = Array.isArray(data.options) ? data.options.filter(text => typeof text === 'string') : [];
    const counts = options.map((_, i) => whole(Array.isArray(data.counts) ? data.counts[i] : 0));
    return {
      id,
      kind: KINDS.includes(data.kind) ? data.kind : 'feedback',
      title: typeof data.title === 'string' ? data.title : '',
      body: typeof data.body === 'string' ? data.body : '',
      options,
      counts,
      closed: data.closed === true,
      replies: whole(data.replies),
      at: whole(data.at)
    };
  };

  const shape = (post, admin, vote = null, reply = null) => ({
    id: post.id,
    kind: post.kind,
    title: post.title,
    body: post.body,
    closed: post.closed,
    at: post.at,
    options: post.options.map((text, i) => ({ text, votes: post.counts[i] })),
    total: post.counts.reduce((sum, n) => sum + n, 0),
    replies: admin ? post.replies : null,
    mine: { vote: Number.isInteger(vote) && vote < post.options.length ? vote : null, reply: typeof reply === 'string' ? reply : null }
  });

  const needAdmin = user => {
    if (!user.admin) throw new Fail(403, 'admin');
  };

  const needId = body => {
    if (!validId(body.id)) throw new Fail(400, 'id');
    return body.id;
  };

  return {
    async listPosts(user) {
      const snap = await posts().orderBy('at', 'desc').limit(LIMITS.listed).get();
      const signed = !user.anon && snap.docs.length > 0;
      const mine = signed ? await db.getAll(...snap.docs.flatMap(doc => [voteRef(doc.id, user.uid), replyRef(doc.id, user.uid)])) : [];
      const list = snap.docs.map((doc, i) => {
        const vote = signed && mine[i * 2].exists ? mine[i * 2].data().option : null;
        const reply = signed && mine[i * 2 + 1].exists ? mine[i * 2 + 1].data().text : null;
        return shape(read(doc.id, doc.data()), !!user.admin, vote, reply);
      });
      return { admin: !!user.admin, posts: list };
    },

    async vote(user, body) {
      const id = needId(body);
      const choice = Number.isInteger(body.option) ? body.option : -1;
      return db.runTransaction(async tx => {
        const [postSnap, voteSnap] = await Promise.all([tx.get(postRef(id)), tx.get(voteRef(id, user.uid))]);
        if (!postSnap.exists) throw new Fail(404, 'no-post');
        const post = read(id, postSnap.data());
        if (post.kind !== 'poll') throw new Fail(400, 'kind');
        if (post.closed) throw new Fail(409, 'closed');
        if (choice < 0 || choice >= post.options.length) throw new Fail(400, 'option');
        const before = voteSnap.exists ? voteSnap.data().option : null;
        if (before === choice) return { post: shape(post, !!user.admin, choice) };
        const counts = [...post.counts];
        if (Number.isInteger(before) && before >= 0 && before < counts.length && counts[before] > 0) counts[before]--;
        counts[choice]++;
        tx.set(voteRef(id, user.uid), { option: choice, at: now() });
        tx.update(postRef(id), { counts });
        return { post: shape({ ...post, counts }, !!user.admin, choice) };
      });
    },

    async reply(user, body) {
      const id = needId(body);
      const text = cleanText(body.text, LIMITS.reply, true);
      return db.runTransaction(async tx => {
        const [postSnap, replySnap, me] = await Promise.all([tx.get(postRef(id)), tx.get(replyRef(id, user.uid)), load(tx, user.uid)]);
        if (!postSnap.exists) throw new Fail(404, 'no-post');
        const post = read(id, postSnap.data());
        if (post.kind === 'poll') throw new Fail(400, 'kind');
        if (post.closed) throw new Fail(409, 'closed');
        if (!text) {
          if (replySnap.exists) {
            tx.delete(replyRef(id, user.uid));
            tx.update(postRef(id), { replies: FieldValue.increment(-1) });
          }
          return { post: shape({ ...post, replies: Math.max(0, post.replies - (replySnap.exists ? 1 : 0)) }, !!user.admin, null, null) };
        }
        tx.set(replyRef(id, user.uid), { text, name: me.username ? `@${me.username}` : 'Player', uid: user.uid, at: now() });
        if (!replySnap.exists) tx.update(postRef(id), { replies: FieldValue.increment(1) });
        return { post: shape({ ...post, replies: post.replies + (replySnap.exists ? 0 : 1) }, !!user.admin, null, text) };
      });
    },

    async createPost(user, body) {
      needAdmin(user);
      const post = cleanPost(body);
      if (!post) throw new Fail(400, 'post');
      const ref = posts().doc();
      const doc = { ...post, counts: post.options.map(() => 0), closed: false, replies: 0, at: now(), by: user.uid };
      await ref.set(doc);
      return { post: shape(read(ref.id, doc), true) };
    },

    async setClosed(user, body) {
      needAdmin(user);
      const id = needId(body);
      const closed = !!body.closed;
      const snap = await postRef(id).get();
      if (!snap.exists) throw new Fail(404, 'no-post');
      await postRef(id).update({ closed });
      return { ok: true, closed };
    },

    async deletePost(user, body) {
      needAdmin(user);
      const id = needId(body);
      await db.recursiveDelete(postRef(id));
      return { ok: true };
    },

    async listReplies(user, body) {
      needAdmin(user);
      const id = needId(body);
      const snap = await postRef(id).collection('replies').orderBy('at', 'desc').limit(LIMITS.replies).get();
      return {
        replies: snap.docs.map(doc => {
          const data = doc.data();
          return { name: typeof data.name === 'string' ? data.name : 'Player', text: typeof data.text === 'string' ? data.text : '', at: whole(data.at) };
        })
      };
    }
  };
}