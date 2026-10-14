import { WORLDS } from './worlds.js';

export { WORLDS };

export const SKINS = [
  { id: 'skin:emerald', name: 'Emerald', price: 0, runner: null, runnerDark: null, visor: null, scarf: null },
  { id: 'skin:sky', name: 'Sky', price: 60, runner: '#38bdf8', runnerDark: '#0369a1', visor: '#0c2a3d', scarf: '#fde68a' },
  { id: 'skin:violet', name: 'Violet', price: 60, runner: '#a78bfa', runnerDark: '#6d28d9', visor: '#1e1b4b', scarf: '#f9a8d4' },
  { id: 'skin:sunset', name: 'Sunset', price: 120, runner: '#fb923c', runnerDark: '#c2410c', visor: '#431407', scarf: '#fde047' },
  { id: 'skin:bubblegum', name: 'Bubblegum', price: 120, runner: '#f472b6', runnerDark: '#be185d', visor: '#500724', scarf: '#bae6fd' },
  { id: 'skin:graphite', name: 'Graphite', price: 200, runner: '#475569', runnerDark: '#1e293b', visor: '#34d399', scarf: '#34d399' },
  { id: 'skin:gold', name: 'Gold', price: 400, runner: '#facc15', runnerDark: '#a16207', visor: '#422006', scarf: '#ffffff' }
];

export const HATS = [
  { id: 'hat:none', name: 'None', price: 0 },
  { id: 'hat:beanie', name: 'Beanie', price: 50 },
  { id: 'hat:cap', name: 'Cap', price: 50 },
  { id: 'hat:catears', name: 'Cat ears', price: 100 },
  { id: 'hat:headphones', name: 'Headphones', price: 150 },
  { id: 'hat:halo', name: 'Halo', price: 200 },
  { id: 'hat:tophat', name: 'Top hat', price: 200 },
  { id: 'hat:wizard', name: 'Wizard', price: 300 },
  { id: 'hat:crown', name: 'Crown', price: 500 }
];

export const CHARACTERS = [
  { id: 'char:bot', name: 'Bot', price: 0 },
  { id: 'char:slime', name: 'Slime', price: 150 },
  { id: 'char:ninja', name: 'Ninja', price: 250 },
  { id: 'char:fox', name: 'Fox', price: 300 },
  { id: 'char:ghost', name: 'Ghost', price: 350 },
  { id: 'char:astronaut', name: 'Astronaut', price: 450 }
];

export const ITEMS = [...SKINS, ...CHARACTERS, ...HATS, ...WORLDS];

export const findItem = id => ITEMS.find(item => item.id === id) || null;

export const kindOf = id => id.split(':')[0];

export function resolveLook(equipped) {
  return {
    skin: SKINS.find(s => s.id === equipped.skin) || SKINS[0],
    hat: HATS.some(h => h.id === equipped.hat) ? equipped.hat : 'hat:none',
    char: CHARACTERS.some(c => c.id === equipped.char) ? equipped.char : 'char:bot'
  };
}

export const resolveWorld = id => WORLDS.find(w => w.id === id) || WORLDS[0];