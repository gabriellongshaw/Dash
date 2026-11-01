export const KINDS = ['poll', 'feedback', 'suggestion'];

export const LIMITS = {
  title: 80,
  body: 600,
  option: 60,
  minOptions: 2,
  maxOptions: 6,
  listed: 50,
  perDay: 3,
  live: 10,
  reply: 300,
  replies: 100,
  repliesPerDay: 20,
  voters: 500
};

const DAY_MS = 24 * 60 * 60 * 1000;
const POST_ID = /^[A-Za-z0-9]{20}$/;

export function cleanText(value, max, multiline = false) {
  if (typeof value !== 'string') return '';
  const flat = value.replace(/\r\n?/g, '\n').replace(multiline ? /[\u0000-\u0009\u000b-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g, ' ');
  const text = multiline ? flat.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n') : flat.replace(/\s+/g, ' ');
  return text.trim().slice(0, max);
}

export function cleanOptions(raw) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const text = cleanText(item, LIMITS.option);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

export function cleanPost(body) {
  const src = body && typeof body === 'object' ? body : {};
  if (!KINDS.includes(src.kind)) return null;
  const title = cleanText(src.title, LIMITS.title);
  if (!title) return null;
  const post = { kind: src.kind, title, body: cleanText(src.body, LIMITS.body, true), options: [] };
  if (src.kind !== 'poll') return post;
  post.options = cleanOptions(src.options);
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
  const repliesOf = id => postRef(id).collection('replies');
  const replyRef = (id, replyId) => db.doc(`dashPolls/${id}/replies/${replyId}`);
  const logRef = uid => db.doc(`dashReplyLog/${uid}`);

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
      at: whole(data.at),
      editedAt: whole(data.editedAt),
      replyCount: whole(data.replyCount)
    };
  };

  const canEdit = (post, user) => post.by === user.uid && (post.kind !== 'poll' || !!user.admin);
  const canRemoveReply = (post, reply, user) => !!user.admin || reply.by === user.uid || (post.kind !== 'poll' && post.by === user.uid);

  const shapeReply = (id, raw, post, user) => {
    const data = raw && typeof raw === 'object' ? raw : {};
    return {
      id,
      author: typeof data.author === 'string' ? data.author : null,
      body: typeof data.body === 'string' ? data.body : '',
      at: whole(data.at),
      owner: data.owner === true,
      canDelete: canRemoveReply(post, data, user)
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
    editedAt: post.editedAt,
    replies: post.replyCount,
    options: post.options.map((text, i) => ({ text, votes: post.counts[i] })),
    total: post.counts.reduce((sum, n) => sum + n, 0),
    canDelete: !!user.admin || (post.kind !== 'poll' && post.by === user.uid),
    canEdit: canEdit(post, user),
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

    async unvote(user, body) {
      const id = needId(body);
      return db.runTransaction(async tx => {
        const [postSnap, voteSnap] = await Promise.all([tx.get(postRef(id)), tx.get(voteRef(id, user.uid))]);
        if (!postSnap.exists) throw new Fail(404, 'no-post');
        const post = read(id, postSnap.data());
        if (post.kind !== 'poll') throw new Fail(400, 'kind');
        if (post.closed) throw new Fail(409, 'closed');
        if (!voteSnap.exists) return { post: shape(post, user, null) };
        const before = voteSnap.data().option;
        const counts = [...post.counts];
        if (Number.isInteger(before) && before >= 0 && before < counts.length && counts[before] > 0) counts[before]--;
        tx.delete(voteRef(id, user.uid));
        tx.update(postRef(id), { counts });
        return { post: shape({ ...post, counts }, user, null) };
      });
    },

    async listVoters(user, body) {
      if (!user.admin) throw new Fail(403, 'admin');
      const id = needId(body);
      const snap = await postRef(id).get();
      if (!snap.exists) throw new Fail(404, 'no-post');
      const post = read(id, snap.data());
      if (post.kind !== 'poll') throw new Fail(400, 'kind');
      const votes = await postRef(id).collection('votes').orderBy('at', 'asc').limit(LIMITS.voters).get();
      const rows = votes.docs.map(doc => ({ uid: doc.id, option: doc.data().option, at: whole(doc.data().at) }));
      const people = rows.length ? await db.getAll(...rows.map(row => db.doc(`dashProfiles/${row.uid}`))) : [];
      const groups = post.options.map(text => ({ text, voters: [] }));
      rows.forEach((row, i) => {
        if (!Number.isInteger(row.option) || row.option < 0 || row.option >= groups.length) return;
        const data = people[i].exists ? people[i].data() : {};
        const username = typeof data.username === 'string' && data.username ? `@${data.username}` : null;
        const display = typeof data.displayName === 'string' && data.displayName ? data.displayName : null;
        const name = username && display ? `${display} (${username})` : username || display || 'Unnamed player';
        groups[row.option].voters.push({ name, at: row.at, mine: row.uid === user.uid });
      });
      return { options: groups, total: post.counts.reduce((sum, n) => sum + n, 0), listed: rows.length };
    },

    async editPost(user, body) {
      const id = needId(body);
      const title = cleanText(body.title, LIMITS.title);
      if (!title) throw new Fail(400, 'post');
      const text = cleanText(body.body, LIMITS.body, true);
      return db.runTransaction(async tx => {
        const [postSnap, voteSnap] = await Promise.all([tx.get(postRef(id)), tx.get(voteRef(id, user.uid))]);
        if (!postSnap.exists) throw new Fail(404, 'no-post');
        const post = read(id, postSnap.data());
        if (!canEdit(post, user)) throw new Fail(403, 'not-yours');
        const change = { title, body: text, editedAt: now() };
        let options = post.options;
        if (post.kind === 'poll') {
          options = cleanOptions(body.options);
          if (options.length !== post.options.length) throw new Fail(400, 'post');
          change.options = options;
        }
        tx.update(postRef(id), change);
        const vote = post.kind === 'poll' && voteSnap.exists ? voteSnap.data().option : null;
        return { post: shape({ ...post, ...change, options }, user, vote) };
      });
    },

    async listReplies(user, body) {
      const id = needId(body);
      const [postSnap, snap] = await Promise.all([postRef(id).get(), repliesOf(id).orderBy('at', 'asc').limit(LIMITS.replies).get()]);
      if (!postSnap.exists) throw new Fail(404, 'no-post');
      const post = read(id, postSnap.data());
      return { replies: snap.docs.map(doc => shapeReply(doc.id, doc.data(), post, user)) };
    },

    async createReply(user, body) {
      const id = needId(body);
      const text = cleanText(body.body, LIMITS.reply, true);
      if (!text) throw new Fail(400, 'reply');
      const me = await db.runTransaction(tx => load(tx, user.uid));
      const author = me.username ? `@${me.username}` : user.admin ? 'Gabriel' : null;
      if (!author) throw new Fail(409, 'no-username');
      const ref = repliesOf(id).doc();
      return db.runTransaction(async tx => {
        const [postSnap, logSnap] = await Promise.all([tx.get(postRef(id)), user.admin ? Promise.resolve(null) : tx.get(logRef(user.uid))]);
        if (!postSnap.exists) throw new Fail(404, 'no-post');
        const post = read(id, postSnap.data());
        if (post.replyCount >= LIMITS.replies) throw new Fail(409, 'replies-full');
        if (logSnap) {
          const stored = logSnap.exists && Array.isArray(logSnap.data().times) ? logSnap.data().times : [];
          const times = stored.filter(time => Number.isFinite(time) && time > now() - DAY_MS);
          if (times.length >= LIMITS.repliesPerDay) throw new Fail(429, 'reply-rate');
          tx.set(logRef(user.uid), { times: [...times, now()] });
        }
        const doc = { body: text, author, by: user.uid, owner: !!user.admin, at: now() };
        tx.set(ref, doc);
        tx.update(postRef(id), { replyCount: post.replyCount + 1 });
        return { reply: shapeReply(ref.id, doc, post, user), replies: post.replyCount + 1 };
      });
    },

    async deleteReply(user, body) {
      const id = needId(body);
      if (!validId(body.replyId)) throw new Fail(400, 'id');
      return db.runTransaction(async tx => {
        const [postSnap, replySnap] = await Promise.all([tx.get(postRef(id)), tx.get(replyRef(id, body.replyId))]);
        if (!postSnap.exists) return { ok: true, replies: 0 };
        const post = read(id, postSnap.data());
        if (!replySnap.exists) return { ok: true, replies: post.replyCount };
        if (!canRemoveReply(post, replySnap.data(), user)) throw new Fail(403, 'forbidden');
        const replies = Math.max(0, post.replyCount - 1);
        tx.delete(replyRef(id, body.replyId));
        tx.update(postRef(id), { replyCount: replies });
        return { ok: true, replies };
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