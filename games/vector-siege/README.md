# 🎯 VECTOR SIEGE // Neon Arena Shooter

> A twin-stick arena shooter built with pure vanilla HTML5 Canvas and procedural Web Audio. Hold the neon grid against wave after wave of geometric invaders.

---

## 🎮 How to Play

Open the [Arcade Hub](../../index.html) and launch **Vector Siege**, or open [index.html](index.html) directly.

You fly a small ship around a square arena. Firing is automatic: you only move and aim. Enemies arrive in waves, and each one is announced by a flashing marker a moment before it appears. Every fifth wave is a **Warden** boss.

---

## ⌨️ Controls

| Action | Keyboard & Mouse | Touch | Gamepad |
| :--- | :--- | :--- | :--- |
| **Move** | `W` `A` `S` `D` | Drag anywhere on the left half | Left stick |
| **Aim** | Mouse, or arrow keys | Drag anywhere on the right half | Right stick |
| **Fire** | Automatic | Automatic | Automatic |
| **Bomb** | `Space`, `B` or right-click | **BOMB** button at the bottom | `A`, `RB` or `RT` |
| **Pause** | `P` or `Esc` | ⏸ button | `Start` |
| **Sound** | `M` | 🔊 button | — |

When you aren't aiming by hand, the ship aims at the nearest enemy for you, and leads moving targets. On a phone you can play with just your left thumb.

---

## 👾 Enemies

| Enemy | First Wave | Behavior | Points |
| :--- | :--- | :--- | :--- |
| **Drone** (cyan diamond) | 1 | Drifts toward you | 100 |
| **Weaver** (green bowtie) | 2 | Zig-zags as it closes in | 150 |
| **Dart** (pink arrowhead) | 3 | Stops, lines up, then charges in a straight line | 200 |
| **Splitter** (yellow square) | 4 | Takes 3 hits and breaks into 3 fast fragments | 250 (+50 each fragment) |
| **Pulsar** (purple hexagon) | 6 | Takes 4 hits. If its fuse ring runs out, it bursts into a ring of bullets | 300 |
| **Warden** (boss) | 5, 10, 15… | Rotating shield plates block your shots. Fires bullet rings, then spirals below half health, and calls in drones | 5,000 |

Points are multiplied by your current multiplier.

---

## ✨ Scoring & Pickups

- **Shards**: destroyed enemies drop green shards that get pulled toward your ship when you're close. Every 20 shards raises your multiplier, up to **x10**. Losing a life halves your shard count.
- **Wave clear bonus**: 250 × the wave number.
- **Power-ups** (rare drops, always one from a Warden):
  - **S** Spread Shot: fires three bolts at once for 12 seconds
  - **R** Rapid Fire: nearly doubles your fire rate for 12 seconds
  - **◇** Shield: absorbs one hit
- **Bombs**: you start with 3 and can hold 5. A bomb destroys every enemy and bullet on the field and damages the Warden. You earn one every 30,000 points.
- **Extra lives**: you start with 3 and can hold 5. You earn one every 75,000 points.

Timed power-ups show as rings around your ship that shrink as they run out.

---

## 🗓️ Modes

- **Endless**: different waves every run. Your top 5 runs are saved.
- **Daily Siege**: the waves come from today's date, so every run today faces the same waves. Your best score for the day is saved, and new waves arrive tomorrow. It also appears in the Arcade Hub's **Today** panel and counts toward the daily streak.

---

## 🛠️ Technical Notes

- **Camera that fits any screen**: the arena is a fixed 1500 × 1500 world. The camera follows the ship and zooms so every screen, upright phone or wide monitor, shows about the same amount of arena. Arrows on the screen edge point at enemies you can't see yet.
- **Glow sprites**: each shape's neon glow is drawn once into a small offscreen canvas and stamped every frame, which keeps hundreds of enemies, bullets and sparks smooth on phones.
- **Fixed-step simulation** at 120 Hz with a coarse collision grid.
- **Seeded wave plans**: each wave is planned from the run's seed and the wave number only, which is what makes the Daily Siege repeatable.
- **Warping grid**: explosions send ripples through the background grid.
- **Procedural audio**: the music and every sound effect are synthesized live with the Web Audio API. The tempo rises with each wave, and a lead line comes in for Warden fights.
- **Reduced motion**: if your system asks for reduced motion, screen shake is off and grid ripples are softer.
- High scores are saved in `localStorage` (`vector_siege_highscore`, `vector_siege_records`, `vector_siege_daily`). Daily Siege results also go to the arcade's shared daily log (see [shared/arcade-daily.js](../../shared/arcade-daily.js)).
