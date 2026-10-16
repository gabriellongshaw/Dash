import { findItem, kindOf } from './shared/cosmetics.js';
import { cleanQuests, freshQuests } from './shared/quests.js';
import { GUEST_COIN_CAP, GUEST_ITEM_CAP } from './limits.js';

export const whole = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export const defaults = () => ({
  coins: 0,
  best: 0,
  runs: 0,
  owned: ['skin:emerald', 'hat:none', 'char:bot', 'world:skyline'],
  equipped: { skin: 'skin:emerald', hat: 'hat:none', char: 'char:bot', world: 'world:skyline' },
  quests: freshQuests(),
  publicBoard: true
});

export function sanitize(raw) {
  const base = defaults();
  const data = raw && typeof raw === 'object' ? raw : {};
  const owned = new Set(base.owned);
  if (Array.isArray(data.owned)) data.owned.forEach(id => typeof id === 'string' && findItem(id) && owned.add(id));
  const equipped = { ...base.equipped };
  const eq = data.equipped || {};
  for (const kind of Object.keys(equipped)) {
    const id = eq[kind];
    if (typeof id === 'string' && owned.has(id) && kindOf(id) === kind) equipped[kind] = id;
  }
  return {
    coins: whole(data.coins),
    best: whole(data.best),
    runs: whole(data.runs),
    owned: [...owned],
    equipped,
    quests: cleanQuests(data.quests),
    publicBoard: data.publicBoard !== false
  };
}

export function importGuest(guest) {
  const src = guest && typeof guest === 'object' ? guest : {};
  const coins = Math.min(whole(src.coins), GUEST_COIN_CAP);
  const base = new Set(defaults().owned);
  const wanted = Array.isArray(src.owned) ? [...new Set(src.owned)] : [];
  const items = wanted
    .filter(id => typeof id === 'string' && !base.has(id))
    .map(id => findItem(id))
    .filter(Boolean)
    .sort((a, b) => a.price - b.price);
  let spent = 0;
  const owned = [];
  for (const item of items) {
    if (spent + item.price > GUEST_ITEM_CAP) continue;
    spent += item.price;
    owned.push(item.id);
  }
  return { coins, owned };
}

export const view = profile => ({
  coins: profile.coins,
  best: profile.best,
  runs: profile.runs,
  owned: profile.owned,
  equipped: profile.equipped,
  quests: profile.quests,
  publicBoard: profile.publicBoard
});