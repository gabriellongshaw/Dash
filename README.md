# Dash

A fast, modern 2D endless runner. Jump, slide, double jump, collect coins and spend them in the shop.

## How to Play

Run as far as you can. Coins add 5 points each, and distance adds the rest. The jump is a short hop, so coin arcs follow the real jump path and are easy to collect.

- **Crates and spikes:** jump over them.
- **Tall walls:** too high for one jump, so you must double jump.
- **Ceiling gates:** unjumpable, so you must slide underneath.
- **Drones:** hover low, so slide under them or jump over. Some bob up and down.
- **Rollers:** fast-moving wheels that arrive sooner than they look.
- **Buzzsaws:** spinning blades on the ground, so jump over them.
- **Bouncing orbs:** spiked balls that hop along the ground. Jump over them when low or slip underneath when they are high.
- **Missiles:** fast rockets announced by a warning triangle at the edge of the screen. Low ones must be jumped, higher ones can be slid under.
- **Force fields:** wide barriers between two pylons that need one long jump.

The game keeps getting harder as you go. Speed climbs until about 5,000 m, and from there the gaps between obstacles keep shrinking while longer back-to-back gauntlets and mixed combinations take over, up to about 9,400 m.

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

## Sound

Dash has an original theme and sound effects, all generated in the browser with the Web Audio API, so there are no audio files to load or license.

- **Theme:** A 16-bar loop at 138 BPM in the style of Geometry Dash and Subway Surfers. It has a four-on-the-floor kick, snare and hats, a rolling saw bass, fast arpeggios and a bright lead. The second half is a bigger drop with a supersaw lead and chord stabs, and each 8-bar phrase ends in a snare roll and a riser. A sidechain pump makes everything duck on each kick. It plays on every page and carries on from the same point when you move between pages. It plays quieter during a run and ducks further on pause and game over.
- **Effects:** Jump, double jump, slide, coin, crash, new best, buttons, buying, equipping, quest claims, gifts and friend requests.
- **Controls:** The speaker button opens sound settings with separate switches for music and sound effects, and the choices are remembered on the device.
- **Autoplay:** Browsers only allow sound after a tap or key press, so music begins after the first interaction on a page. Music pauses while the tab is hidden.
- **Editing:** The tune is the `SCORE` list in `assets/js/core/music.js` and the effects are in `assets/js/core/audio.js`.

## Quests

Quests are a second way to earn coins. Open **Quests** from the home screen.

- **Daily:** three quests that reset at local midnight, worth 25, 45 and 75 coins as they get harder.
- **Weekly:** two bigger quests that reset on Monday, worth 125 to 250 coins each.
- Quests are picked from a pool (collect coins, run a distance, score in one run, dodge obstacles, jump, double jump, slide and more). The same date always gives the same quests.
- Progress counts automatically as you play. Tap **Claim** when a bar is full. A badge on the home screen and a note after each run show when something is ready.
- Guests keep quests on the device. Signed-in players save them to the cloud, and a quest can only be claimed once across devices.

## Leaderboard

Open **Leaderboard** from the home screen to see the top 25 runners **This week** and **All time**, ranked by best score. Anyone can view it. Signing in puts your best score on it, and your rank is shown if you are outside the top 25.

Players appear as their first name and last initial. Signed-in players can hide themselves from the leaderboard at any time with the button under the list, which also removes their entries.

## Friends

Open **Friends** from the home screen. Everything here needs a signed-in account.

- **Username:** Pick a unique username of 3 to 16 lowercase letters, numbers or underscores. Capitals are turned into lowercase, and older usernames are lowercased the next time that player opens the game. It replaces your name on the leaderboard and can be changed once a day.
- **Display name:** An optional name of up to 24 characters that shows above your username on your friends' lists. Both are searchable.
- **Photo:** Use your Google photo, upload your own (it is cropped to a small square in the browser), or have none. Tap the pencil on your profile card to change it.
- **Adding friends:** Search by display name or username (the start of either, at least two letters) and tap Add on a result. You can switch **Show me in search** off in your profile editor to stay out of results. They accept or decline from their Friends page. If you both request each other you become friends straight away. Each player can have 50 friends and 30 pending requests.
- **Gifts:** Send a friend up to 1000 coins, an item, or both. The gift comes out of your coins, and an item costs its shop price. They cannot be sent to someone who already owns the item. The player sees what they were sent the next time they open Friends, and a badge on the home screen shows waiting requests and gifts.

Friend data lives in `dashUsernames`, `dashFriends` and `dashGifts`, which only the API reads and writes, so `firestore.rules` needs no changes. The API code is in `server/social.js`.

### Server checks

Coins, items, quests and scores for signed-in players are controlled by a small API in `api/game.js`, which runs on Vercel and talks to Firestore with the Admin SDK. The browser can no longer write any of them.

- A run is timed by the server. `startRun` hands out a signed token, and `submitRun` checks distance, coins, obstacles and jumps against the time that really passed before paying anything. Each token works once. The score is worked out on the server.
- Quest claims and shop purchases are checked against the server's own copy of the profile and prices.
- Leaderboard entries come only from runs the server accepted.
- A guest's progress is imported once when they first sign in. Their coins and the value of their items are accepted up to 80 coins per run played, capped at 5000. Their best score and run count are kept for display but never reach the leaderboard.
- Firestore rules only let a player read their own profile and equip items they own.

The game runs in the browser, so no server can prove a run was played by a person. A bot that plays for real is still accepted, but nobody can earn faster than real time or set numbers directly. Limits are at the top of `api/game.js`.

### Setup

Vercel's Hobby plan and Firebase's Spark plan are both free and need no card.

1. In the Firebase console open Project settings, Service accounts, and choose Generate new private key. Keep the file private.
2. In Vercel add a new project from this repository. Under Environment Variables add `FIREBASE_SERVICE_ACCOUNT` and paste the whole contents of the key file. Deploy.
3. Set `API_URL` at the top of `assets/js/core/profile.js` to the deployed address, for example `https://dash-api.vercel.app/api/game`. If the game is served from a different domain than the two in `ORIGINS` in `api/game.js`, add it there.
4. Copy `firestore.rules` into the Firebase console under Firestore Database, Rules, and publish. If the project is shared with other sites, merge the Dash blocks into your existing rules instead of replacing them.

### Gifting coins and items

Run `scripts/gift.js` on your own machine to give a player coins or items. It uses the service account key from Setup, so it never runs on the website and players cannot call it. The player must have signed in once, and they see the gift next time the game loads.

```
npm install
node scripts/gift.js friend@gmail.com --coins 500 --key serviceAccount.json
node scripts/gift.js friend@gmail.com --items hat:crown,skin:prism --key serviceAccount.json
```

Use an email or a Firebase uid. Item ids are the ones in `assets/js/core/cosmetics.js` and `assets/js/core/worlds.js`, such as `hat:crown`. Items a player already owns are skipped. Keep the key file out of git.

## Running Locally

The game uses ES modules, so serve the folder over HTTP (for example `python3 -m http.server`) rather than opening `index.html` directly.

## Structure

- `index.html` — home screen with an animated background and quick links to quests, leaderboard and friends
- `play/` — the game page
- `shop/` — the shop page
- `quests/` — daily and weekly quests
- `friends/` — usernames, friends and gifting
- `leaderboard/` — weekly and all-time rankings
- `assets/js/core/` — audio and music, difficulty curve, theme, profile (guest and cloud saves), Firebase loader, cosmetics, worlds, quests, leaderboard, utilities
- `server/` — friends and gifting logic used by the API
- `scripts/` — developer tools, such as gifting coins and items
- `api/` — Vercel API that validates runs and owns coins, items, quests and scores
- `firestore.rules` — Firestore security rules
- `assets/js/components/` — game engine, runner, characters, hats, obstacles, world, particles, account UI
- `assets/js/pages/` — page entry points

## Credits

Created by [Gabriel Longshaw](https://www.gabriellongshaw.co.uk)