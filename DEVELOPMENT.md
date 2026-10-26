# Developing Dash

Notes for running, deploying and changing the game.

## Running locally

The game uses ES modules, so serve the folder over HTTP (for example `python3 -m http.server`) rather than opening `index.html` directly.

## Setup

Vercel's Hobby plan and Firebase's Spark plan are both free and need no card.

1. In the Firebase console open Project settings, Service accounts, and choose Generate new private key. Keep the file private.
2. In Vercel add a new project from this repository. Under Environment Variables add `FIREBASE_SERVICE_ACCOUNT` and paste the whole contents of the key file. Deploy.
3. Set `API_URL` at the top of `assets/js/core/profile.js` to the deployed address, for example `https://dash-api.vercel.app/api/game`. If the game is served from a different domain than the two in `ORIGINS` in `api/game.js`, add it there.
4. In the Firebase console open Authentication, Sign-in method, and enable Anonymous next to Google. Guest accounts need it.

## Server checks

Coins, items, quests and scores for signed-in players are controlled by a small API in `api/game.js`, which runs on Vercel and talks to Firestore with the Admin SDK. The browser can no longer write any of them.

- A run is timed by the server. `startRun` hands out a signed token, and `submitRun` checks distance, coins, obstacles and jumps against the time that really passed before paying anything. Each token works once. The score is worked out on the server.
- Quest claims and shop purchases are checked against the server's own copy of the profile and prices.
- Leaderboard entries come only from runs the server accepted.
- Guests are anonymous Firebase accounts, so their coins, items and quests are on the server too. Nothing in the browser's storage is trusted: prices come from the server's own copy of `cosmetics.js`, a purchase or quest claim that the server has not confirmed does not happen, and the cached copy in the browser is replaced by the server's copy on every sync and after any rejected action.
- Anonymous accounts can play, earn, buy and claim quests. Leaderboards, usernames, friends and gifts need a Google sign-in, which also stops throwaway accounts from flooding them.
- Firestore rules only let a player read their own profile and equip items they own.

The game runs in the browser, so no server can prove a run was played by a person. A bot that plays for real is still accepted, but nobody can earn faster than real time or set numbers directly. Limits are at the top of `api/game.js`.

## Friends data

Friend data lives in `dashUsernames`, `dashFriends` and `dashGifts`, which only the API reads and writes. The API code is in `server/social.js`. Leaderboard entries (`dashBoard` collections) are written only by the API and are publicly readable, so anything stored on them, such as a player's public photo, is visible to anyone.

## Sound

All music and effects are generated in the browser with the Web Audio API.

- **Autoplay:** Browsers only allow sound after a tap or key press, so music begins after the first tap or key press on a fresh visit or reload. Pages open inside a small wrapper (`shell.html`) that keeps the audio engine alive, so moving between pages never restarts the music or asks for another tap. The wrapper keeps the address bar and Back button in step with the page. If the wrapper can't be used (for example after the Google sign-in redirect fallback), the pages fall back to running on their own, as before. Music pauses while the tab is hidden.
- **Editing:** The tune is the `SCORE` list in `assets/js/core/music.js` and the effects are in `assets/js/core/audio.js`.

## Blur and performance

The header fade on the shop, quests, leaderboard, friends and profile pages uses ten stacked `backdrop-filter` layers, and the game's modal backdrop uses one more. These are heavy on weaker devices, so `assets/js/core/graphics.js` switches them off by adding `no-blur` to the root element.

- **Auto (default):** blur is skipped on data saver, reduced transparency, or devices reporting 2 or fewer cores or 2 GB or less memory. It also measures the frame rate for a moment after load and again on the first scroll, on every page, and if the median frame takes longer than 22 ms (under about 45 fps, as in iOS Low Power Mode) blur goes off. That verdict lasts 20 minutes and is renewed whenever a page measures slow again, so switching Low Power Mode off brings blur back. Browsers that expose the battery (Chrome on Android) also turn blur off at 20% or less when not charging. Without blur the header fade is made denser so it still covers the content scrolling under it.
- **On and Off:** the Blur control in the settings menu overrides Auto. Choosing Auto again clears the saved verdict.
- **Styling:** the `.no-blur` rules sit next to the blur styles in `shop.css` and `modal.css`.

## Ads

Ads use Google AdSense's game ads (the Ad Placement API) and run only on the play page, from `assets/js/core/ads.js`.

- **Placements:** a full-screen ad when pressing Play again (every second restart, skipped right after a rewarded ad), and an optional rewarded button on the game-over screen that doubles that run's coins.
- **Turning on:** set `CLIENT` at the top of `ads.js` to the AdSense publisher ID (`ca-pub-...`). While it is empty no ad code loads at all. On localhost the ad tag runs in test mode, so test ads show without affecting the account.
- **Approval:** the site must be added and approved in AdSense, and game ads enabled for it. Until then the game plays normally and no ads appear. `ads.txt` has to be served from the root of the domain, which is the portfolio site.
- **Consent:** Google's own consent message for the UK, EEA and Switzerland is set up in the AdSense dashboard under Privacy and messaging. No code is needed.
- **Blocked or slow ads:** if the ad script is blocked or does not answer within two seconds, the game carries on without an ad.
- **Doubling coins:** `doubleCoins` in `api/game.js` pays the coins of the last accepted run once, matched to that run's signed token. The server cannot see whether the ad was watched, so the most anyone can gain from skipping the ad is the same coins again, once per run.
- **Content security policy:** the play page allows Google's ad hosts and inline scripts. If ads fail to show on the live site, check the browser console for blocked requests and add the host to the policy in `play/index.html`.

## Not found page

`404.html` sends visitors to the not-found page on gabriellongshaw.co.uk, the same as the other sites.

## Structure

- `index.html` — home screen with an animated background and quick links to quests, leaderboard and friends
- `play/` — the game page
- `privacy/` — privacy and advertising notice
- `shop/` — the shop page
- `quests/` — daily and weekly quests
- `friends/` — usernames, friends and gifting
- `profile/` — player profiles, friend actions and your privacy settings
- `leaderboard/` — weekly and all-time rankings
- `assets/js/core/` — audio and music, difficulty curve, theme, profile (guest and cloud saves), Firebase loader, cosmetics, worlds, quests, leaderboard, utilities
- `server/` — friends, gifting, privacy and blocking logic used by the API
- `api/` — Vercel API that validates runs and owns coins, items, quests and scores
- `assets/js/components/` — game engine, runner, characters, hats, obstacles, world, particles, account UI
- `assets/js/pages/` — page entry points