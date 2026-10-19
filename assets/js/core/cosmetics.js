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
  { id: 'skin:coral', name: 'Coral', price: 80, runner: '#fb7185', runnerDark: '#be123c', visor: '#4c0519', scarf: '#fde68a' },
  { id: 'skin:mint', name: 'Mint', price: 80, runner: '#6ee7b7', runnerDark: '#047857', visor: '#022c22', scarf: '#fef9c3' },
  { id: 'skin:lavender', name: 'Lavender', price: 80, runner: '#c4b5fd', runnerDark: '#7c3aed', visor: '#2e1065', scarf: '#fbcfe8' },
  { id: 'skin:peach', name: 'Peach', price: 80, runner: '#fdba74', runnerDark: '#ea580c', visor: '#431407', scarf: '#fff7ed' },
  { id: 'skin:sand', name: 'Sand', price: 60, runner: '#d6b98c', runnerDark: '#92704a', visor: '#3f2e1a', scarf: '#fef3c7' },
  { id: 'skin:slate', name: 'Slate', price: 100, runner: '#94a3b8', runnerDark: '#475569', visor: '#0f172a', scarf: '#38bdf8' },
  { id: 'skin:forest', name: 'Forest', price: 100, runner: '#15803d', runnerDark: '#14532d', visor: '#bbf7d0', scarf: '#bbf7d0' },
  { id: 'skin:ocean', name: 'Ocean', price: 100, runner: '#0284c7', runnerDark: '#075985', visor: '#e0f2fe', scarf: '#7dd3fc' },
  { id: 'skin:cherry', name: 'Cherry', price: 120, runner: '#be123c', runnerDark: '#881337', visor: '#fecdd3', scarf: '#fecdd3' },
  { id: 'skin:plum', name: 'Plum', price: 120, runner: '#7e22ce', runnerDark: '#4c1d95', visor: '#f5d0fe', scarf: '#e879f9' },
  { id: 'skin:ember', name: 'Ember', price: 120, runner: '#ea580c', runnerDark: '#7c2d12', visor: '#fef08a', scarf: '#fde047' },
  { id: 'skin:toxic', name: 'Toxic', price: 140, runner: '#84cc16', runnerDark: '#365314', visor: '#ecfccb', scarf: '#d9f99d' },
  { id: 'skin:snow', name: 'Snow', price: 140, runner: '#f1f5f9', runnerDark: '#94a3b8', visor: '#1e293b', scarf: '#38bdf8' },
  { id: 'skin:copper', name: 'Copper', price: 160, runner: '#c2410c', runnerDark: '#7c2d12', visor: '#fed7aa', scarf: '#fdba74' },
  { id: 'skin:silver', name: 'Silver', price: 180, runner: '#cbd5e1', runnerDark: '#64748b', visor: '#0f172a', scarf: '#ffffff' },
  { id: 'skin:electric', name: 'Electric', price: 200, runner: '#22d3ee', runnerDark: '#0e7490', visor: '#083344', scarf: '#fde047' },
  { id: 'skin:galaxy', name: 'Galaxy', price: 220, runner: '#6366f1', runnerDark: '#312e81', visor: '#e0e7ff', scarf: '#c4b5fd' },
  { id: 'skin:obsidian', name: 'Obsidian', price: 240, runner: '#1f2937', runnerDark: '#0b1020', visor: '#f472b6', scarf: '#f472b6' },
  { id: 'skin:rosegold', name: 'Rose gold', price: 260, runner: '#f0a8a0', runnerDark: '#b76e79', visor: '#4a1d24', scarf: '#fff1f2' },
  { id: 'skin:neonpink', name: 'Neon pink', price: 300, runner: '#ff2bd6', runnerDark: '#a21caf', visor: '#2a0a2e', scarf: '#22d3ee' },
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
  { id: 'hat:crown', name: 'Crown', price: 500 },
  { id: 'hat:bow', name: 'Bow', price: 60 },
  { id: 'hat:flower', name: 'Flower', price: 70 },
  { id: 'hat:bunny', name: 'Bunny ears', price: 90 },
  { id: 'hat:antennae', name: 'Antennae', price: 90 },
  { id: 'hat:propeller', name: 'Propeller', price: 110 },
  { id: 'hat:graduate', name: 'Graduate', price: 130 },
  { id: 'hat:horns', name: 'Horns', price: 130 },
  { id: 'hat:mushroom', name: 'Mushroom', price: 140 },
  { id: 'hat:fedora', name: 'Fedora', price: 160 },
  { id: 'hat:antlers', name: 'Antlers', price: 180 },
  { id: 'hat:santa', name: 'Santa', price: 200 },
  { id: 'hat:sombrero', name: 'Sombrero', price: 240 },
  { id: 'hat:knight', name: 'Knight', price: 320 },
  { id: 'hat:unicorn', name: 'Unicorn', price: 380 }
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
  { id: 'char:penguin', name: 'Penguin', price: 500 },
  { id: 'char:duck', name: 'Duck', price: 250 },
  { id: 'char:pig', name: 'Pig', price: 250 },
  { id: 'char:bear', name: 'Bear', price: 300 },
  { id: 'char:bunny', name: 'Bunny', price: 300 },
  { id: 'char:panda', name: 'Panda', price: 350 },
  { id: 'char:owl', name: 'Owl', price: 400 },
  { id: 'char:cyclops', name: 'Cyclops', price: 450 },
  { id: 'char:snowman', name: 'Snowman', price: 500 }
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