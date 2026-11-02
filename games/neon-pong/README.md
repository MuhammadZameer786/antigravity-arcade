# 🏓 NEON PONG // Cyberpunk Curve Rally

> A fast-paced, high-velocity retro-futuristic Pong arcade game built with pure vanilla HTML5 Canvas and Web Audio API.

---

## 🎮 How to Play

### Option 1: Direct File
Open [index.html](file:///Users/zameer/Documents/antigravity/games/neon-pong/index.html) directly in any modern browser.

### Option 2: From the Arcade Hub
Open the master [Arcade Hub](../../index.html) and launch **Neon Pong**.

---

## 🕹️ Game Modes

1. **🤖 1-Player vs AI**:
   - Compete against an adaptive synthetic opponent with 4 distinct difficulty modes:
     - **Casual**: Relaxed reaction time, perfect for warming up.
     - **Cyber (Normal)**: Balanced trajectory tracking and momentum.
     - **Overlord (Hard)**: Bouncing trajectory prediction + aggressive edge slicing.
     - **Insane**: Instant path calculation, impossible reflexes, and maximum spin!
2. **👥 2-Player Local Versus**:
   - Same-keyboard or split-screen battle between two human players.

---

## ⌨️ Controls

| Player | Keyboard | Touch / Mobile |
| :--- | :--- | :--- |
| **Player 1 (Left - Cyan)** | `W` (Up), `S` (Down) | Drag vertically on **Left half** of screen |
| **Player 2 (Right - Pink)** | `↑` (Up), `↓` (Down) | Drag vertically on **Right half** of screen |
| **Pause / Resume** | `P`, `Esc` | Click `⏸` button |
| **Mute Audio** | `M` | Click `🔊` button |
| **Rematch** | `R` (on Game Over) | Click "Rematch" |

---

## 🌟 Game Mechanics & Features

- **Paddle Curve & Slice Physics**:
  - Hitting the ball near the paddle's upper or lower edges adds sharp deflection angles (up to 68°).
  - Paddle velocity is transferred to the ball as vertical momentum spin!
- **★ Hyper Smash ★**:
  - Strike the ball while moving your paddle at high speed right on the edge to trigger a **Hyper Smash**, blasting the ball at hyper speed with camera shake and a blazing neon trail!
- **Dynamic Ball Acceleration**:
  - Ball accelerates by 3% on every single paddle contact, turning long rallies into pulse-pounding reflex duels.
- **Rally Power-Ups**:
  - Once a rally reaches 4+ hits, power-up orbs spawn in the center court:
    - ⚡ **Turbo Ball**: Launches the ball with double velocity.
    - ⬡ **Paddle Expander**: Grows your paddle by 50% for 10 seconds.
    - ✦ **Multi-Ball**: Spawns an extra high-speed secondary ball into play!
- **Match Length Options**: Play First to 5, 7, or 11 points.
- **Built-in Procedural Audio**: Four-on-the-floor synth kicks, bassline rhythm, and resonant paddle ping tones that scale pitch based on hit position.
- **Local Record Tracking**: Longest rally streak is saved automatically in `localStorage`.
