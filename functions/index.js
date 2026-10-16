import { randomUUID } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { findItem } from './shared/cosmetics.js';
import { allQuests, applyRun, isClaimed, markClaimed, progressOf, rollQuests } from './shared/quests.js';
import { REGION, checkRun, cleanRun, runScore } from './limits.js';
import { defaults, importGuest, sanitize, view } from './profile.js';

initializeApp();
const db = getFirestore();

const options = { region: REGION, maxInstances: 10 };

const profileRef = uid => db.doc(`dashProfiles/${uid}`);
const runRef = uid => db.doc(`dashRuns/${uid}`);
const allTimeRef = uid => db.doc(`dashBoard/${uid}`);
const weekRef = (week, uid) => db.doc(`dashWeeks/${week}/entries/${uid}`);

function need(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'sign-in');
  return request.auth.uid;
}

function shortName(full) {
  const parts = typeof full === 'string' ? full.replace(/[\u0000-\u001f\u007f]/g, '').trim().split(/\s+/).filter(Boolean) : [];
  if (!parts.length) return 'Player';
  const first = parts[0].slice(0, 16);
  if (parts.length === 1) return first;
  return `${first} ${[...parts[parts.length - 1]][0].toUpperCase()}.`;
}

const entry = (name, score) => ({ name: shortName(name), score, updatedAt: FieldValue.serverTimestamp() });

async function loadProfile(tx, uid) {
  const snap = await tx.get(profileRef(uid));
  if (!snap.exists) throw new HttpsError('failed-precondition', 'no-profile');
  return sanitize(snap.data());
}

export const syncProfile = onCall(options, async request => {
  const uid = need(request);
  const name = request.auth.token.name || null;
  const guest = request.data && request.data.guest;
  const result = await db.runTransaction(async tx => {
    const ref = profileRef(uid);
    const snap = await tx.get(ref);
    const raw = snap.exists ? snap.data() : null;
    const profile = sanitize(raw);
    if (raw && raw.imported === true) return profile;
    const gift = guest ? importGuest(guest) : { coins: 0, owned: [] };
    profile.coins += gift.coins;
    profile.owned = [...new Set([...profile.owned, ...gift.owned])];
    const data = {
      coins: profile.coins,
      best: profile.best,
      runs: profile.runs,
      owned: profile.owned,
      equipped: profile.equipped,
      quests: profile.quests,
      publicBoard: profile.publicBoard,
      imported: true,
      name: shortName(name),
      updatedAt: FieldValue.serverTimestamp()
    };
    if (snap.exists) tx.update(ref, data);
    else tx.set(ref, { ...defaults(), ...data });
    return profile;
  });
  if (result.publicBoard) {
    const week = rollQuests(result.quests);
    const writes = [];
    if (result.best > 0) writes.push(allTimeRef(uid).set(entry(name, result.best)));
    if (week.w.score > 0) writes.push(weekRef(week.week, uid).set(entry(name, week.w.score)));
    await Promise.allSettled(writes);
  }
  return view(result);
});

export const startRun = onCall(options, async request => {
  const uid = need(request);
  const id = randomUUID();
  await runRef(uid).set({ id, startedAt: FieldValue.serverTimestamp() });
  return { runId: id };
});

export const submitRun = onCall(options, async request => {
  const uid = need(request);
  const name = request.auth.token.name || null;
  const run = cleanRun(request.data);
  if (!run) throw new HttpsError('invalid-argument', 'run');
  const out = await db.runTransaction(async tx => {
    const [runSnap, profile] = await Promise.all([tx.get(runRef(uid)), loadProfile(tx, uid)]);
    if (!runSnap.exists || runSnap.get('id') !== run.runId) return { profile, rejected: 'no-run', board: null };
    tx.delete(runRef(uid));
    const elapsed = (Date.now() - runSnap.get('startedAt').toMillis()) / 1000;
    const problem = checkRun(run, elapsed);
    if (problem) return { profile, rejected: problem, board: null };
    const score = runScore(run);
    const prevWeek = rollQuests(profile.quests).w.score;
    const quests = applyRun(profile.quests, { ...run, score });
    const next = {
      ...profile,
      coins: profile.coins + run.coins,
      runs: profile.runs + 1,
      best: Math.max(profile.best, score),
      quests
    };
    tx.update(profileRef(uid), {
      coins: next.coins,
      runs: next.runs,
      best: next.best,
      quests,
      updatedAt: FieldValue.serverTimestamp()
    });
    return {
      profile: next,
      rejected: null,
      board: { best: score > profile.best ? score : 0, week: score > prevWeek ? score : 0, weekId: quests.week }
    };
  });
  if (out.board && out.profile.publicBoard) {
    const writes = [];
    if (out.board.best) writes.push(allTimeRef(uid).set(entry(name, out.board.best)));
    if (out.board.week) writes.push(weekRef(out.board.weekId, uid).set(entry(name, out.board.week)));
    await Promise.allSettled(writes);
  }
  return { rejected: out.rejected, profile: view(out.profile) };
});

export const claimQuest = onCall(options, async request => {
  const uid = need(request);
  const id = request.data && request.data.id;
  if (typeof id !== 'string') throw new HttpsError('invalid-argument', 'id');
  return db.runTransaction(async tx => {
    const profile = await loadProfile(tx, uid);
    const quest = allQuests(profile.quests).find(item => item.id === id);
    if (!quest) throw new HttpsError('not-found', 'unknown');
    if (isClaimed(profile.quests, quest)) return { reward: 0, profile: view(profile) };
    if (progressOf(profile.quests, quest) < quest.target) throw new HttpsError('failed-precondition', 'progress');
    const next = { ...profile, coins: profile.coins + quest.reward, quests: markClaimed(profile.quests, quest) };
    tx.update(profileRef(uid), { coins: next.coins, quests: next.quests, updatedAt: FieldValue.serverTimestamp() });
    return { reward: quest.reward, profile: view(next) };
  });
});

export const buyItem = onCall(options, async request => {
  const uid = need(request);
  const id = request.data && request.data.id;
  const item = typeof id === 'string' ? findItem(id) : null;
  if (!item) throw new HttpsError('not-found', 'unknown');
  return db.runTransaction(async tx => {
    const profile = await loadProfile(tx, uid);
    if (profile.owned.includes(id)) return { profile: view(profile) };
    if (profile.coins < item.price) throw new HttpsError('failed-precondition', 'coins');
    const next = { ...profile, coins: profile.coins - item.price, owned: [...profile.owned, id] };
    tx.update(profileRef(uid), { coins: next.coins, owned: next.owned, updatedAt: FieldValue.serverTimestamp() });
    return { profile: view(next) };
  });
});

export const setPublicBoard = onCall(options, async request => {
  const uid = need(request);
  const name = request.auth.token.name || null;
  const on = !!(request.data && request.data.on);
  const profile = await db.runTransaction(async tx => {
    const current = await loadProfile(tx, uid);
    tx.update(profileRef(uid), { publicBoard: on, updatedAt: FieldValue.serverTimestamp() });
    return { ...current, publicBoard: on };
  });
  const week = rollQuests(profile.quests);
  const writes = [];
  if (on) {
    if (profile.best > 0) writes.push(allTimeRef(uid).set(entry(name, profile.best)));
    if (week.w.score > 0) writes.push(weekRef(week.week, uid).set(entry(name, week.w.score)));
  } else {
    writes.push(allTimeRef(uid).delete(), weekRef(week.week, uid).delete());
  }
  await Promise.allSettled(writes);
  return { profile: view(profile) };
});