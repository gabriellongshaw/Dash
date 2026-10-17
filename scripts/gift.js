import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { findItem } from '../assets/js/core/cosmetics.js';

const MAX_COINS = 100000;

const USAGE = `Usage: node scripts/gift.js <email|uid> [--coins N] [--items id,id] [--key serviceAccount.json]

Gives a player coins and/or items. They must have signed in at least once.
The service account comes from --key or the FIREBASE_SERVICE_ACCOUNT variable.

Examples:
  node scripts/gift.js friend@gmail.com --coins 500
  node scripts/gift.js friend@gmail.com --items hat:crown,skin:prism
  node scripts/gift.js friend@gmail.com --coins 250 --items hat:halo --key key.json`;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parse(argv) {
  const out = { target: null, coins: 0, items: [], key: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--coins') out.coins = Number(argv[++i]);
    else if (arg === '--items') out.items = String(argv[++i] || '').split(',').map(id => id.trim()).filter(Boolean);
    else if (arg === '--key') out.key = argv[++i];
    else if (arg.startsWith('--')) fail(`Unknown option ${arg}\n\n${USAGE}`);
    else if (!out.target) out.target = arg;
    else fail(`Unexpected argument ${arg}\n\n${USAGE}`);
  }
  return out;
}

async function resolveUid(target) {
  if (!target.includes('@')) return target;
  try {
    return (await getAuth().getUserByEmail(target)).uid;
  } catch {
    return fail(`No account found for ${target}. They need to sign in to Dash once first.`);
  }
}

async function main() {
  const args = parse(process.argv.slice(2));
  if (!args.target) fail(USAGE);
  if (!Number.isInteger(args.coins) || args.coins < 0 || args.coins > MAX_COINS) fail(`--coins must be a whole number from 0 to ${MAX_COINS}.`);
  const unknown = args.items.filter(id => !findItem(id));
  if (unknown.length) fail(`Unknown items: ${unknown.join(', ')}`);
  if (!args.coins && !args.items.length) fail(`Nothing to give.\n\n${USAGE}`);

  const raw = args.key ? readFileSync(args.key, 'utf8') : process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) fail('No service account. Pass --key <file> or set FIREBASE_SERVICE_ACCOUNT.');
  initializeApp({ credential: cert(JSON.parse(raw)) });

  const uid = await resolveUid(args.target);
  const db = getFirestore();
  const ref = db.doc(`dashProfiles/${uid}`);
  const result = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const data = snap.data();
    const owned = Array.isArray(data.owned) ? data.owned : [];
    const added = [...new Set(args.items)].filter(id => !owned.includes(id));
    const coins = (Number.isFinite(data.coins) ? data.coins : 0) + args.coins;
    tx.update(ref, { coins, owned: [...owned, ...added], updatedAt: FieldValue.serverTimestamp() });
    return { coins, added, skipped: args.items.filter(id => !added.includes(id)) };
  });

  if (!result) fail(`No Dash profile for ${args.target}. They need to sign in to Dash once first.`);
  console.log(`Gave ${args.target} ${args.coins} coins. Balance is now ${result.coins}.`);
  if (result.added.length) console.log(`Added items: ${result.added.join(', ')}`);
  if (result.skipped.length) console.log(`Already owned: ${[...new Set(result.skipped)].join(', ')}`);
}

main().then(() => process.exit(0), e => fail(e && e.message ? e.message : String(e)));
