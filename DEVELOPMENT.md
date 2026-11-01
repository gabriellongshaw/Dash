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
- Anonymous accounts can play, earn, buy and claim quests. Leaderboards, usernames, friends and gifts need a Google sign-in, which also stops throwaway accounts from flooding them. The one exception is `viewProfile`, which guests may call so they can open profiles from the leaderboard. It is read-only, respects each player's Profile, Photo, Stats and Appearance settings (guests count as 'Everyone' but not 'Signed-in players'), and can't be rate limited by account since guest accounts are free to create. A blocked player can see the blocker's profile again by signing out and playing as a new guest.
- Firestore rules only let a player read their own profile and equip items they own.

The game runs in the browser, so no server can prove a run was played by a person. A bot that plays for real is still accepted, but nobody can earn faster than real time or set numbers directly. Limits are at the top of `api/game.js`.

## Friends data

Friend data lives in `dashUsernames`, `dashFriends` and `dashGifts`, which only the API reads and writes. The API code is in `server/social.js`. Leaderboard entries (`dashBoard` collections) are written only by the API and are publicly readable, so anything stored on them, such as a player's public photo, is visible to anyone.

## Polls and feedback

The polls page lists posts of three kinds: `poll`, `feedback` and `suggestion`. The API code is in `server/polls.js`, and the page is `polls/` with `assets/js/pages/polls.js`.

- **Who can post:** only the admin can create polls. Any player signed in with Google who has chosen a username can create feedback and suggestion posts. Guests (anonymous accounts) can only read, because `listPosts` and `listReplies` are the only polls actions in `ANON_ACTIONS` in `api/game.js`. To let guests post or vote, add `createPost`, `vote` or `createReply` there, but note that guest accounts are free to create so it makes spam and ballot stuffing easy.
- **Admin:** the API treats a caller as admin only when their Firebase token comes from Google sign-in, the email is verified and it matches the `ADMIN_EMAIL` environment variable. Add it in Vercel under Settings, Environment Variables, then redeploy. While it is unset nobody is admin. Nothing in the browser decides who is admin, the page only shows poll controls when the server says so.
- **Moderation:** the admin can delete any post or reply and close or reopen polls (`setClosed`). Authors can delete their own feedback and suggestion posts (`deletePost`). Posts are public, so delete anything inappropriate.
- **Editing:** `editPost` lets a player edit the title and details of their own feedback or suggestion, and lets the admin edit their own polls. For polls the option wording can be fixed but the number of options cannot change, so each vote stays with its option. Edited posts get an `editedAt` time and show "edited". The admin cannot edit other people's posts, only delete them.
- **Limits:** non-admin players can post 3 times in 24 hours and have 10 live posts at most. Titles are 80 characters, details 600, poll options 60 (2 to 6 per poll). The 50 newest posts are listed. Limits are at the top of `server/polls.js` and `assets/js/pages/polls.js`.
- **Voting:** `vote` needs a Google sign-in. Each account has one vote per poll, changeable or removable (`unvote`) while the poll is open.
- **Who voted:** `listVoters` is admin only and returns the names (username and display name) behind each option, up to 500 votes. `listPosts` only ever returns the caller's own vote, so voters are never sent to other players.
- **Replies:** stored in `dashPolls/{id}/replies`, with a `replyCount` kept on the post. `listReplies` is also in `ANON_ACTIONS` so guests can read threads. `createReply` needs a Google sign-in and a username (the admin shows as "Gabriel" if they have none, with a Creator badge). Replies are 300 characters, a post holds 100, and non-admins can send 20 in 24 hours, tracked in `dashReplyLog/{uid}`. `deleteReply` is allowed for the reply's author, the admin, and the author of a non-poll post.
- **Storage:** posts are in `dashPolls`, with votes in `dashPolls/{id}/votes` and replies in `dashPolls/{id}/replies`. Only the API reads and writes them (and `dashReplyLog`), so no Firestore rule changes are needed. User IDs are stored on posts and replies but never sent to browsers. Deleting a post also deletes its votes and replies.

## Sound

All music and effects are generated in the browser with the Web Audio API.

- **Autoplay:** Browsers only allow sound after a tap or key press, so music begins after the first tap or key press on a fresh visit or reload. Pages open inside a small wrapper (`shell.html`) that keeps the audio engine alive, so moving between pages never restarts the music or asks for another tap. The wrapper keeps the address bar and Back button in step with the page. If the wrapper can't be used (for example after the Google sign-in redirect fallback), the pages fall back to running on their own, as before. Music pauses while the tab is hidden.
- **Editing:** The tune is the `SCORE` list in `assets/js/core/music.js` and the effects are in `assets/js/core/audio.js`.

## Blur and performance

The header fade on the shop, quests, leaderboard, friends and profile pages uses ten stacked `backdrop-filter` layers, and the game's modal backdrop uses one more. These are heavy on weaker devices, so `assets/js/core/graphics.js` switches them off by adding `no-blur` to the root element.

- **Auto (default):** the frame-rate probe draws an invisible test strip (in the page's own background colour) at the top of the page. Blur is skipped on data saver, reduced transparency, or devices reporting 2 or fewer cores or 2 GB or less memory. It also measures the frame rate for a moment after load and again on the first scroll, on every page, and if the median frame takes longer than 22 ms (under about 45 fps, as in iOS Low Power Mode) blur goes off. That verdict lasts 20 minutes and is renewed whenever a page measures slow again, so switching Low Power Mode off brings blur back. Browsers that expose the battery (Chrome on Android) also turn blur off at 20% or less when not charging. Without blur the header fade is made denser so it still covers the content scrolling under it.
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

## First person mode

The home screen stores the chosen view in `localStorage` under `dash:mode` (`classic` or `first`, helpers in `assets/js/core/mode.js`). `assets/js/pages/game.js` reads it and creates either `Game` (side view) or `FirstPersonGame` (`assets/js/components/firstperson.js`). Both expose the same methods and hooks, so the page, HUD, quests and run submission are shared.

- `lanes.js` holds the lane obstacles, coin layouts and spawner. It reuses the tier and spacing curve from `obstacles.js`, so obstacle and coin density per metre matches the side view.
- `perspective.js` projects the track, obstacles and coins onto the 2D canvas. There is no 3D library.
- `firstperson.js` reuses `Runner` for jumping, double jumping and sliding, with height measured upwards from the ground.
- Distance, speed, scoring and the numbers sent in `submitRun` are the same as the side view, so the server checks in `api/game.js` apply unchanged and both views share one leaderboard. To give first person its own board, send a mode in `submitRun` and store it separately in `api/game.js`.

## Not found page

`404.html` sends visitors to the not-found page on gabriellongshaw.co.uk, the same as the other sites.

## Structure

- `index.html` — home screen with an animated background and quick links to quests, leaderboard and friends
- `play/` — the game page
- `privacy/` — privacy and advertising notice
- `shop/` — the shop page
- `quests/` — daily and weekly quests
- `friends/` — usernames, friends and gifting
- `polls/` — polls, feedback and suggestions
- `profile/` — player profiles, friend actions and your privacy settings
- `leaderboard/` — weekly and all-time rankings
- `assets/js/core/` — audio and music, difficulty curve, theme, profile (guest and cloud saves), Firebase loader, cosmetics, worlds, quests, leaderboard, utilities
- `server/` — friends, gifting, privacy, blocking and polls logic used by the API
- `api/` — Vercel API that validates runs and owns coins, items, quests and scores
- `assets/js/components/` — game engines (side view and first person), runner, characters, hats, obstacles, lanes, perspective renderer, world, particles, account UI
- `assets/js/pages/` — page entry points