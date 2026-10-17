import { loadFirebase } from './firebase.js';
import { FIRST_WEEK } from './quests.js';

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

async function fetchRaw(scope) {
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

export async function fetchBoard(scope) {
  if (scope !== FIRST_WEEK) return fetchRaw(scope);
  const [weekly, all] = await Promise.all([fetchRaw(scope), fetchRaw('all')]);
  const best = new Map();
  [...weekly, ...all].forEach(entry => {
    const have = best.get(entry.id);
    if (!have || entry.score > have.score) best.set(entry.id, entry);
  });
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, PAGE);
}

export async function fetchRank(scope, score) {
  if (scope === FIRST_WEEK) scope = 'all';
  const cloud = await loadFirebase();
  const { query, where, getCountFromServer } = cloud.fsMod;
  const snap = await getCountFromServer(query(collectionFor(cloud, scope), where('score', '>', whole(score))));
  return snap.data().count + 1;
}