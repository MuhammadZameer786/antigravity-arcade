# 🐍 CYBER SNAKE // Neon Grid Overdrive

> A high-speed, futuristic cyberpunk snake arcade game built with pure vanilla HTML5 Canvas 2D and a procedural Web Audio API synthwave synthesizer.

---

## 🎮 How to Play

### Option 1: Direct File
Open [index.html](file:///Users/zameer/Documents/antigravity/games/cyber-snake/index.html) directly in any modern browser.

### Option 2: From the Master Arcade Hub
Open the master [Arcade Hub](../../index.html) and click **"LAUNCH GAME"** on the Cyber Snake card.

---

## ⌨️ Controls

| Action | Keyboard | Touchscreen / Mobile |
| :--- | :--- | :--- |
| **Steer Serpent** | `W`, `A`, `S`, `D` or Arrow Keys `↑`, `←`, `↓`, `→` | Virtual D-Pad / Swipe Gestures |
| **Overdrive Turbo Boost** | **Hold** `Space` | **Hold** `⚡ TURBO` button |
| **Pause / Resume** | `P` or `Esc` | Tap Pause button `⏸` |
| **Toggle Synthwave Audio** | `M` | Tap Sound button `🔊` |
| **Quick Restart** | `R` (on Game Over / Pause) | Tap Restart button |
| **Toggle Fullscreen** | Fullscreen Icon `⛶` | Tap Fullscreen Icon |

---

## 🌟 Game Modes

1. **⚡ Classic Grid (`arcade`)**:
   - Pure, unadulterated high-speed snake on a pristine neon matrix.
   - Choose between **Portal Wrap** (slither through borders seamlessly) or **Lethal Boundary** (solid laser walls).
2. **☣ Cyber Hazards (`hazards`)**:
   - Spawns energy pylons and paired quantum warp portals ($\alpha$ and $\beta$) across the grid.
   - Slither through Portal $\alpha$ to teleport out of Portal $\beta$ with particle bursts!
3. **⏱ Time Surge (`time`)**:
   - 60-second adrenaline run!
   - Every Data Bit adds $+3.5\text{s}$, and rare Crypto Cores add $+8.0\text{s}$.
   - Maximize score streaks before the countdown drops to zero.

---

## 💎 Cybernetics & Power-Ups

- **◆ Data Bit**:
  - The primary memory packet ($+100\text{ pts} \times \text{combo}$).
  - Extends snake length and instantly refills $+20\%$ Turbo boost energy.
- **★ Crypto Core**:
  - Rare golden hexagon with rotating containment rings.
  - Grants massive $+500\text{ pts} \times \text{combo}$, full boost charge, and emits a golden shockwave.
- **◈ Phase Shift**:
  - Holographic cloak allowing the serpent to pass through its own tail and obstacles safely for $6.5\text{ seconds}$.
- **⌛ Chrono Matrix (Slow-Mo)**:
  - Dilates time by $45\%$ for $6\text{ seconds}$ to navigate high-speed labyrinths with laser precision.
- **⚡ EMP Surge**:
  - Discharges an electric blast that trims dangerous tail length ($25\%$) back into bonus points!
- **▲ Overdrive Capsule**:
  - Fully charges turbo and activates an instant $2\times$ score multiplier for $8\text{ seconds}$.

---

## 🎨 Visual Features

- **Interpolated 60 FPS Slither Engine**: Logical discrete grid movements are smoothly interpolated on canvas for buttery-smooth visual motion without choppy teleportation jumps.
- **Aerodynamic Cyber Serpent Head**: Features directional rotation, twin headlights/visors casting ambient neon beam cones onto the grid, and glowing spine conduits.
- **Dynamic Neon Themes**:
  - ⚡ *Cyan Surge* (Electric Blue / Cyan)
  - 🌸 *Synth Magenta* (Neon Pink / Deep Purple)
  - 🧪 *Toxic Matrix* (Cyberpunk Acid Green)
  - ☀️ *Solar Flare* (Neon Amber / Solar Orange)
  - 🌈 *Chromatic Rainbow* (Continuously shifting spectral wave)
- **Authentic Retro CRT Scanlines**: Toggleable scanline shader and CRT curvature effect.

---

## 🔊 Procedural Web Audio Synthesizer

- **Synthwave BGM Engine**:
  - 130 BPM driving 4-on-the-floor bass drum kick.
  - Snappy noise-burst cyber snare and open/closed hi-hats.
  - Resonant low-pass filtered sawtooth bassline arpeggio in D Minor.
  - Melodic pentatonic shimmer lead.
  - **Dynamic Turbo Acceleration**: Engaging Turbo boosts BPM by $25\%$ and opens filter cutoffs for an adrenaline rush.
- **Procedural SFX**:
  - Distinctive chimes with pentatonic scaling on combo streaks.
  - Sparkle arpeggios on golden crypto collection.
  - Low-frequency bass rumble and filtered white noise explosion on collision.
  - 100% zero external audio files — lightweight and instant load.
