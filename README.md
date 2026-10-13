# Dash

A fast, modern 2D endless runner. Jump, slide, double jump, collect coins and spend them in the shop.

## How to Play

Run as far as you can. Coins add 5 points each, and distance adds the rest. The jump is a short hop, so coin arcs follow the real jump path and are easy to collect.

- **Crates and spikes:** jump over them.
- **Tall walls:** too high for one jump, so you must double jump.
- **Ceiling gates:** unjumpable, so you must slide underneath.

**Desktop:** `Space` / `↑` / `W` to jump (press again in the air to double jump), hold `↓` / `S` to slide (hold in the air to fast-fall), `P` / `Esc` to pause.

**Touch:** tap the screen or the jump button to jump, hold the slide button to slide.

## Shop and Accounts

Coins from every run go into your wallet. Spend them in the shop on character colours and hats.

Progress is saved on the device as a guest. Signing in with Google saves it to the cloud so it follows you across devices. Any guest progress is merged into the account on first sign-in.

## Firebase Setup

Cloud saves use the existing `othello-12803` Firebase project through a separately named app, so sign-in never touches the Othello or Connect Four sessions.

1. Authentication → Sign-in method → enable Google.
2. Authentication → Settings → Authorised domains → add `www.gabriellongshaw.co.uk` and `gabriellongshaw.github.io`.
3. Firestore → Rules → add:

```
match /dashProfiles/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

Without these steps the game still works fully as a guest.

## Running Locally

The game uses ES modules, so serve the folder over HTTP (for example `python3 -m http.server`) rather than opening `index.html` directly.

## Structure

- `index.html` — home screen with an animated background
- `play/` — the game page
- `shop/` — the shop page
- `assets/js/core/` — theme, profile (guest and cloud saves), Firebase loader, cosmetics, utilities
- `assets/js/components/` — game engine, runner, hats, obstacles, world, particles, account UI
- `assets/js/pages/` — page entry points

## Credits

Created by [Gabriel Longshaw](https://www.gabriellongshaw.co.uk)
