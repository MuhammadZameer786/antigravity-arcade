# ⚡ CYBER PINBALL // Neon Matrix Overdrive

> A retro-futuristic pinball table built with pure vanilla HTML5 Canvas and procedural Web Audio synthesis. Plays upright on phones and desktops.

## 🎮 How to Play

Open the [Arcade Hub](../../index.html) and launch **Cyber Pinball**, or open [index.html](index.html) directly.

## ⌨️ Controls

| Action | Keyboard | Touch / Mouse |
| :--- | :--- | :--- |
| **Left Flipper** | `A`, `Z` or `←` | Hold the left half of the screen |
| **Right Flipper** | `D`, `/` or `→` | Hold the right half of the screen |
| **Plunger** | Hold and release `Space` or `↓` | Hold the right half, let go to launch |
| **Nudge** | `X` (left), `N` (right) | Keyboard only |
| **Pause / Sound** | `P` / `M` | On-screen buttons |

## 🏆 Scoring

- **N-E-O lanes:** light all three to raise the multiplier, up to x6. The flippers shift the lit lanes.
- **C-Y-B targets:** knock all three down to light the lock.
- **Scoop:** while the lock is lit, each visit locks a ball. Three locks start 3-ball multiball.
- **Multiball:** orbit shots and the scoop score jackpots.
- **Orbits and spinner:** shoot either orbit for a bonus. The right one rips the spinner.
- **Ball save:** a ball lost in the first 10 seconds comes back once.

## 🔧 How It's Built

`game.js` has three parts: the audio synth, a `Table` class holding the geometry, physics and rules with no DOM access, and `PinballGame` for drawing, input and menus. Physics runs at a fixed 300 steps per second, so the ball can't pass through walls or flippers. Static artwork is drawn once to an offscreen canvas to keep phones smooth.
