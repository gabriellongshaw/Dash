# Dash

A fast, modern 2D endless runner. Jump, slide, double jump, collect coins and spend them in the shop.

## How to Play

Run as far as you can. Coins add 5 points each, and distance adds the rest. The jump is a short hop, so coin arcs follow the real jump path and are easy to collect.

- **Crates and spikes:** jump over them.
- **Tall walls:** too high for one jump, so you must double jump.
- **Ceiling gates:** unjumpable, so you must slide underneath.
- **Drones:** hover low, so slide under them or jump over. Some bob up and down.
- **Rollers:** fast-moving wheels that arrive sooner than they look.

The game gets harder as you go: speed climbs, gaps tighten and new obstacle combinations appear at higher distances, ending in back-to-back gauntlets.

**Desktop:** `Space` / `↑` / `W` to jump (press again in the air to double jump), hold `↓` / `S` to slide (hold in the air to fast-fall), `P` / `Esc` to pause.

**Touch:** tap the screen or the jump button to jump, hold the slide button to slide.

## Shop and Accounts

Coins from every run go into your wallet. Spend them in the shop on colours, characters, hats and worlds.

- **Colours:** 14 colours, including an animated rainbow Prism.
- **Characters:** Bot, Slime, Frog, Ninja, Fox, Cat, Ghost, Dino, Alien, Astronaut and Penguin. Every character can be combined with any colour and hat.
- **Hats:** 15 hats, from a sprout to flames.
- **Worlds:** Skyline, Desert, Arctic, Neon, Volcano, Forest, Ocean, Candy and Space. Each has its own scenery, weather and obstacle colours.

Backgrounds adapt as you run: the sky moves through day, dusk and night, stars and auroras fade in, and the score text switches colour to stay readable. A world starts at day in light mode and at night in dark mode.

Progress is saved on the device as a guest. Signing in with Google saves it to the cloud so it follows you across devices. Any guest progress is merged into the account on first sign-in.

## Quests

Quests are a second way to earn coins. Open **Quests** from the home screen.

- **Daily:** three quests that reset at UTC midnight, worth 25, 45 and 75 coins as they get harder.
- **Weekly:** two bigger quests that reset on Monday, worth 125 to 250 coins each.
- Quests are picked from a pool (collect coins, run a distance, score in one run, dodge obstacles, jump, double jump, slide and more). The same date always gives the same quests.
- Progress counts automatically as you play. Tap **Claim** when a bar is full. A badge on the home screen and a note after each run show when something is ready.
- Guests keep quests on the device. Signed-in players save them to the cloud, and a quest can only be claimed once across devices.

## Leaderboard

Open **Leaderboard** from the home screen to see the top 25 runners **This week** and **All time**, ranked by best score. Anyone can view it. Signing in puts your best score on it, and your rank is shown if you are outside the top 25.

Players appear as their first name and last initial. Signed-in players can hide themselves from the leaderboard at any time with the button under the list, which also removes their entries.

### Server side

Signed-in progress is controlled by Cloud Functions, so coins, items, quests and scores cannot be edited from the browser. Firestore rules block every client write except equipping items you own.

- `startRun` marks the start of a run on the server clock.
- `submitRun` checks the run against the time that really passed (distance, coins, obstacles, jumps) and then adds coins, quest progress and leaderboard entries. The score is worked out on the server.
- `claimQuest`, `buyItem` and `setPublicBoard` do their own checks on the server.
- `syncProfile` creates or loads the profile at sign-in. A guest's coins and items are imported once, capped at 300 coins and 300 coins' worth of items.

Limits live in `functions/limits.js`. Guest progress stays on the device and can be edited, but it cannot be turned into account coins beyond the import cap.

The game runs in the browser, so a very careful cheater can still send a run that is just inside the limits. They cannot beat real time, so the gain is capped to what a perfect player could earn.

Quests and weeks reset at UTC midnight.

### Deploying

Cloud Functions need the Firebase Blaze plan. Usage for a game this size stays inside the free monthly quota (2 million invocations), and a budget alert can be set in Google Cloud.

```
npm install -g firebase-tools
firebase login
cd functions && npm install && cd ..
firebase deploy --only firestore:rules,functions
```

`functions/shared` is copied from `assets/js/core` by `functions/sync-shared.mjs` on every deploy, so quest and item changes reach the server automatically.

## Running Locally

The game uses ES modules, so serve the folder over HTTP (for example `python3 -m http.server`) rather than opening `index.html` directly.

## Structure

- `index.html` — home screen with an animated background
- `play/` — the game page
- `shop/` — the shop page
- `quests/` — daily and weekly quests
- `leaderboard/` — weekly and all-time rankings
- `functions/` — Cloud Functions that validate runs and own coins, items, quests and scores
- `firestore.rules` — Firestore security rules
- `assets/js/core/` — theme, profile (guest and cloud saves), Firebase loader, cosmetics, worlds, quests, leaderboard, utilities
- `assets/js/components/` — game engine, runner, characters, hats, obstacles, world, particles, account UI
- `assets/js/pages/` — page entry points

## Credits

Created by [Gabriel Longshaw](https://www.gabriellongshaw.co.uk)