import { loadFirebase } from './firebase.js';

const ALL_TIME = 'dashBoard';
const WEEKS = 'dashWeeks';
const PAGE = 25;

const whole = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export function shortName(full) {
  const parts = typeof full === 'string' ? full.replace(/[\u0000-\u001f\u007f]/g, '').trim().split(/\s+/).filter(Boolean) : [];
  if (!parts.length) return 'Player';
  const first = parts[0].slice(0, 16);
  if (parts.length === 1) return first;
  return `${first} ${[...parts[parts.length - 1]][0].toUpperCase()}.`;
}

function collectionFor(cloud, scope) {
  const { collection } = cloud.fsMod;
  return scope === 'all' ? collection(cloud.db, ALL_TIME) : collection(cloud.db, WEEKS, scope, 'entries');
}

function entryRef(cloud, scope, uid) {
  const { doc } = cloud.fsMod;
  return scope === 'all' ? doc(cloud.db, ALL_TIME, uid) : doc(cloud.db, WEEKS, scope, 'entries', uid);
}

export async function submitEntry(scope, uid, name, score) {
  if (!uid || whole(score) <= 0) return;
  const cloud = await loadFirebase();
  await cloud.fsMod.setDoc(entryRef(cloud, scope, uid), {
    name: shortName(name),
    score: whole(score),
    updatedAt: cloud.fsMod.serverTimestamp()
  });
}

export async function removeEntries(uid, week) {
  if (!uid) return;
  const cloud = await loadFirebase();
  const { deleteDoc } = cloud.fsMod;
  await Promise.allSettled([deleteDoc(entryRef(cloud, 'all', uid)), deleteDoc(entryRef(cloud, week, uid))]);
}

export async function fetchBoard(scope) {
  const cloud = await loadFirebase();
  const { query, orderBy, limit, getDocs } = cloud.fsMod;
  const snap = await getDocs(query(collectionFor(cloud, scope), orderBy('score', 'desc'), limit(PAGE)));
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: typeof data.name === 'string' && data.name ? data.name.slice(0, 24) : 'Player',
      score: whole(data.score)
    };
  });
}

export async function fetchRank(scope, score) {
  const cloud = await loadFirebase();
  const { query, where, getCountFromServer } = cloud.fsMod;
  const snap = await getCountFromServer(query(collectionFor(cloud, scope), where('score', '>', whole(score))));
  return snap.data().count + 1;
}