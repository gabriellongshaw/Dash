export const KINDS = ['poll', 'feedback', 'suggestion'];

export const LIMITS = {
  title: 80,
  body: 600,
  option: 60,
  minOptions: 2,
  maxOptions: 6,
  listed: 50,
  perDay: 3,
  live: 10
};

const DAY_MS = 24 * 60 * 60 * 1000;
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
  return !!user && !user.anon && user.verified === true && user.provider === 'google.com' && typeof user.email === 'string' && typeof email === 'string' && email !== '' && user.email.toLowerCase() === email.toLowerCase();
}

const whole = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export function createPolls({ db, load, Fail, now }) {
  const posts = () => db.collection('dashPolls');
  const postRef = id => db.doc(`dashPolls/${id}`);
  const voteRef = (id, uid) => db.doc(`dashPolls/${id}/votes/${uid}`);

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
      author: typeof data.author === 'string' ? data.author : null,
      by: typeof data.by === 'string' ? data.by : null,
      options,
      counts,
      closed: data.closed === true,
      at: whole(data.at)
    };
  };

  const shape = (post, user, vote = null) => ({
    id: post.id,
    kind: post.kind,
    title: post.title,
    body: post.body,
    author: post.author,
    closed: post.closed,
    at: post.at,
    options: post.options.map((text, i) => ({ text, votes: post.counts[i] })),
    total: post.counts.reduce((sum, n) => sum + n, 0),
    canDelete: !!user.admin || (post.kind !== 'poll' && post.by === user.uid),
    mine: { vote: Number.isInteger(vote) && vote < post.options.length ? vote : null }
  });

  const needId = body => {
    if (!validId(body.id)) throw new Fail(400, 'id');
    return body.id;
  };

  return {
    async listPosts(user) {
      const snap = await posts().orderBy('at', 'desc').limit(LIMITS.listed).get();
      const docs = snap.docs.map(doc => read(doc.id, doc.data()));
      const voting = user.anon ? [] : docs.filter(post => post.kind === 'poll');
      const mine = voting.length ? await db.getAll(...voting.map(post => voteRef(post.id, user.uid))) : [];
      const votes = new Map(voting.map((post, i) => [post.id, mine[i].exists ? mine[i].data().option : null]));
      return { admin: !!user.admin, posts: docs.map(post => shape(post, user, votes.get(post.id) ?? null)) };
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
        if (before === choice) return { post: shape(post, user, choice) };
        const counts = [...post.counts];
        if (Number.isInteger(before) && before >= 0 && before < counts.length && counts[before] > 0) counts[before]--;
        counts[choice]++;
        tx.set(voteRef(id, user.uid), { option: choice, at: now() });
        tx.update(postRef(id), { counts });
        return { post: shape({ ...post, counts }, user, choice) };
      });
    },

    async createPost(user, body) {
      const post = cleanPost(body);
      if (!post) throw new Fail(400, 'post');
      if (post.kind === 'poll' && !user.admin) throw new Fail(403, 'admin');
      let author = null;
      if (post.kind !== 'poll') {
        const me = await db.runTransaction(tx => load(tx, user.uid));
        author = me.username ? `@${me.username}` : user.admin ? 'Gabriel' : null;
        if (!author) throw new Fail(409, 'no-username');
        if (!user.admin) {
          const own = await posts().where('by', '==', user.uid).limit(LIMITS.live + 1).get();
          if (own.docs.length >= LIMITS.live) throw new Fail(409, 'limit');
          if (own.docs.filter(doc => whole(doc.data().at) > now() - DAY_MS).length >= LIMITS.perDay) throw new Fail(429, 'rate');
        }
      }
      const ref = posts().doc();
      const doc = { ...post, author, counts: post.options.map(() => 0), closed: false, at: now(), by: user.uid };
      await ref.set(doc);
      return { post: shape(read(ref.id, doc), user) };
    },

    async setClosed(user, body) {
      if (!user.admin) throw new Fail(403, 'admin');
      const id = needId(body);
      const closed = !!body.closed;
      const snap = await postRef(id).get();
      if (!snap.exists) throw new Fail(404, 'no-post');
      if (read(id, snap.data()).kind !== 'poll') throw new Fail(400, 'kind');
      await postRef(id).update({ closed });
      return { ok: true, closed };
    },

    async deletePost(user, body) {
      const id = needId(body);
      const snap = await postRef(id).get();
      if (!snap.exists) return { ok: true };
      const post = read(id, snap.data());
      if (!user.admin && (post.kind === 'poll' || post.by !== user.uid)) throw new Fail(403, 'forbidden');
      await db.recursiveDelete(postRef(id));
      return { ok: true };
    }
  };
}