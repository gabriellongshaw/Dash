# Dash

A fast, modern 2D endless runner. Jump, slide, double jump and collect coins while the speed keeps climbing.

## How to Play

Run as far as you can. Crates, spikes and tall towers need a jump; low-flying drones need a slide. Coins add 5 points each, and distance adds the rest. Obstacles get more varied and the pace picks up the further you go.

**Desktop:** `Space` / `↑` / `W` to jump (press again in the air to double jump), hold `↓` / `S` to slide (hold in the air to fast-fall), `P` / `Esc` to pause.

**Touch:** tap the screen or the jump button to jump, hold the slide button to slide.

Your best score is saved in the browser.

## Running Locally

The game uses ES modules, so serve the folder over HTTP (for example `python3 -m http.server`) rather than opening `index.html` directly.

## Structure

- `index.html` — home screen with an animated background
- `play/` — the game page
- `assets/js/core/` — theme, storage, transitions, utilities
- `assets/js/components/` — game engine, runner, obstacles, world, particles
- `assets/js/pages/` — page entry points

## Credits

Created by [Gabriel Longshaw](https://www.gabriellongshaw.co.uk)
