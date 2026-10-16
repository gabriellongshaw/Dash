import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const core = join(here, '..', 'assets', 'js', 'core');
const out = join(here, 'shared');
mkdirSync(out, { recursive: true });
for (const file of ['quests.js', 'cosmetics.js', 'worlds.js']) copyFileSync(join(core, file), join(out, file));