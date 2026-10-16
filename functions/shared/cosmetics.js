import { WORLDS } from './worlds.js';

export { WORLDS };

export const SKINS = [
  { id: 'skin:emerald', name: 'Emerald', price: 0, runner: null, runnerDark: null, visor: null, scarf: null },
  { id: 'skin:sky', name: 'Sky', price: 60, runner: '#38bdf8', runnerDark: '#0369a1', visor: '#0c2a3d', scarf: '#fde68a' },
  { id: 'skin:violet', name: 'Violet', price: 60, runner: '#a78bfa', runnerDark: '#6d28d9', visor: '#1e1b4b', scarf: '#f9a8d4' },
  { id: 'skin:sunset', name: 'Sunset', price: 120, runner: '#fb923c', runnerDark: '#c2410c', visor: '#431407', scarf: '#fde047' },
  { id: 'skin:bubblegum', name: 'Bubblegum', price: 120, runner: '#f472b6', runnerDark: '#be185d', visor: '#500724', scarf: '#bae6fd' },
  { id: 'skin:graphite', name: 'Graphite', price: 200, runner: '#475569', runnerDark: '#1e293b', visor: '#34d399', scarf: '#34d399' },
  { id: 'skin:crimson', name: 'Crimson', price: 80, runner: '#ef4444', runnerDark: '#991b1b', visor: '#2a0a0a', scarf: '#fde68a' },
  { id: 'skin:aqua', name: 'Aqua', price: 80, runner: '#2dd4bf', runnerDark: '#0f766e', visor: '#042f2e', scarf: '#fef08a' },
  { id: 'skin:lime', name: 'Lime', price: 100, runner: '#a3e635', runnerDark: '#4d7c0f', visor: '#1a2e05', scarf: '#f0abfc' },
  { id: 'skin:cocoa', name: 'Cocoa', price: 140, runner: '#a16207', runnerDark: '#451a03', visor: '#1c0f03', scarf: '#fdba74' },
  { id: 'skin:midnight', name: 'Midnight', price: 160, runner: '#1e3a8a', runnerDark: '#172554', visor: '#93c5fd', scarf: '#93c5fd' },
  { id: 'skin:ice', name: 'Ice', price: 220, runner: '#bae6fd', runnerDark: '#38bdf8', visor: '#0c4a6e', scarf: '#ffffff' },
  { id: 'skin:gold', name: 'Gold', price: 400, runner: '#facc15', runnerDark: '#a16207', visor: '#422006', scarf: '#ffffff' },
  { id: 'skin:prism', name: 'Prism', price: 700, runner: '#a78bfa', runnerDark: '#6d28d9', visor: '#1e1b4b', scarf: '#ffffff', rainbow: true }
];

export const HATS = [
  { id: 'hat:none', name: 'None', price: 0 },
  { id: 'hat:sprout', name: 'Sprout', price: 60 },
  { id: 'hat:beanie', name: 'Beanie', price: 50 },
  { id: 'hat:cap', name: 'Cap', price: 50 },
  { id: 'hat:party', name: 'Party', price: 120 },
  { id: 'hat:catears', name: 'Cat ears', price: 100 },
  { id: 'hat:headphones', name: 'Headphones', price: 150 },
  { id: 'hat:chef', name: 'Chef', price: 150 },
  { id: 'hat:halo', name: 'Halo', price: 200 },
  { id: 'hat:tophat', name: 'Top hat', price: 200 },
  { id: 'hat:cowboy', name: 'Cowboy', price: 200 },
  { id: 'hat:viking', name: 'Viking', price: 250 },
  { id: 'hat:wizard', name: 'Wizard', price: 300 },
  { id: 'hat:pirate', name: 'Pirate', price: 300 },
  { id: 'hat:flames', name: 'Flames', price: 450 },
  { id: 'hat:crown', name: 'Crown', price: 500 }
];

export const CHARACTERS = [
  { id: 'char:bot', name: 'Bot', price: 0 },
  { id: 'char:slime', name: 'Slime', price: 150 },
  { id: 'char:frog', name: 'Frog', price: 200 },
  { id: 'char:ninja', name: 'Ninja', price: 250 },
  { id: 'char:fox', name: 'Fox', price: 300 },
  { id: 'char:cat', name: 'Cat', price: 300 },
  { id: 'char:ghost', name: 'Ghost', price: 350 },
  { id: 'char:dino', name: 'Dino', price: 400 },
  { id: 'char:alien', name: 'Alien', price: 400 },
  { id: 'char:astronaut', name: 'Astronaut', price: 450 },
  { id: 'char:penguin', name: 'Penguin', price: 500 }
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