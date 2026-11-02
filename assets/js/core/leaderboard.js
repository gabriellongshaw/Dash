import { loadFirebase } from './firebase.js';
import { FIRST_WEEK } from './quests.js';

const ALL_TIME = 'dashBoard';
const WEEKS = 'dashWeeks';
const ALL_TIME_THIRD = 'dashBoardThird';
const WEEKS_THIRD = 'dashWeeksThird';
const PAGE = 25;

const PHOTO_DATA = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;

const cleanPhoto = v => {
  if (typeof v !== 'string' || v.length > 30000) return null;
  if (PHOTO_DATA.test(v)) return v;
  try {
    return new URL(v).protocol === 'https:' ? v : null;
  } catch {
    return null;
  }
};

const whole = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export function shortName(full) {
  const parts = typeof full === 'string' ? full.replace(/[\u0000-\u001f\u007f]/g, '').trim().split(/\s+/).filter(Boolean) : [];
  if (!parts.length) return 'Player';
  const first = parts[0].slice(0, 16);
  if (parts.length === 1) return first;
  return `${first} ${[...parts[parts.length - 1]][0].toUpperCase()}.`;
}

function collectionFor(cloud, scope, mode) {
  const { collection } = cloud.fsMod;
  const third = mode === 'third';
  if (scope === 'all') return collection(cloud.db, third ? ALL_TIME_THIRD : ALL_TIME);
  return collection(cloud.db, third ? WEEKS_THIRD : WEEKS, scope, 'entries');
}

async function fetchRaw(scope, mode) {
  const cloud = await loadFirebase();
  const { query, orderBy, limit, getDocs } = cloud.fsMod;
  const snap = await getDocs(query(collectionFor(cloud, scope, mode), orderBy('score', 'desc'), limit(PAGE)));
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: typeof data.name === 'string' && data.name ? data.name.slice(0, 24) : 'Player',
      score: whole(data.score),
      photo: cleanPhoto(data.photo)
    };
  });
}

export async function fetchBoard(scope, mode) {
  if (scope !== FIRST_WEEK || mode === 'third') return fetchRaw(scope, mode);
  const [weekly, all] = await Promise.all([fetchRaw(scope, mode), fetchRaw('all', mode)]);
  const best = new Map();
  [...weekly, ...all].forEach(entry => {
    const have = best.get(entry.id);
    if (!have || entry.score > have.score) best.set(entry.id, entry);
  });
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, PAGE);
}

export async function fetchRank(scope, score, mode) {
  if (scope === FIRST_WEEK && mode !== 'third') scope = 'all';
  const cloud = await loadFirebase();
  const { query, where, getCountFromServer } = cloud.fsMod;
  const snap = await getCountFromServer(query(collectionFor(cloud, scope, mode), where('score', '>', whole(score))));
  return snap.data().count + 1;
}