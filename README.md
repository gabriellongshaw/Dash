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

## Running Locally

The game uses ES modules, so serve the folder over HTTP (for example `python3 -m http.server`) rather than opening `index.html` directly.

## Structure

- `index.html` — home screen with an animated background
- `play/` — the game page
- `shop/` — the shop page
- `assets/js/core/` — theme, profile (guest and cloud saves), Firebase loader, cosmetics, worlds, utilities
- `assets/js/components/` — game engine, runner, characters, hats, obstacles, world, particles, account UI
- `assets/js/pages/` — page entry points

## Credits

Created by [Gabriel Longshaw](https://www.gabriellongshaw.co.uk)