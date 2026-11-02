# ⚡ NEON RUNNER

> An 80s Synthwave / Cyberpunk Endless Runner game built with pure vanilla HTML5 Canvas and Web Audio API.

---

## 🎮 How to Play

### Option 1: Direct File
Simply double-click or open [index.html](file:///Users/zameer/Documents/antigravity/index.html) in any modern web browser (Chrome, Edge, Safari, Firefox).

### Option 2: Local HTTP Server (Optional)
Run using Python's built-in web server:
```bash
python3 -m http.server 8000
```
Then navigate to `http://localhost:8000` in your browser.

---

## ⌨️ Controls

| Action | Keyboard | Touch / Mobile |
| :--- | :--- | :--- |
| **Jump / Double Jump** | `Space`, `↑`, `W` | **JUMP** Button (or tap right side) |
| **Slide / Fast Fall** | `↓`, `S` | **SLIDE** Button (or tap left side) |
| **Hyper Overdrive** | `Shift`, `E`, `X` | **DASH** Button |
| **Pause / Resume** | `P`, `Esc` | Pause Button (top right) |
| **Mute / Unmute** | `M` | Audio Button (top right) |
| **Quick Restart** | `R` | Restart Button on Game Over |

---

## 🌟 Game Features

- **Procedural Synthwave Audio**: Built-in 16-step arpeggiated bassline, synth leads, and procedural sound effects using the Web Audio API (no external sound files required).
- **Aesthetic Visuals**:
  - Outrun-style glowing sun with horizon slices.
  - Multi-layer cyberpunk parallax skyline.
  - 3D retro perspective grid floor with velocity lines.
  - Cyberpunk runner avatar with fluid stride animations, glowing visor, and neon trail after-images.
  - Dynamic bloom and neon particle bursts.
- **Power-ups & Hazards**:
  - **Energy Shards**: Boost score and charge your Overdrive meter.
  - **Spikes & Lasers**: High laser barriers require sliding under; ground spikes require jumping over.
  - **Flying Drones**: Pulse lasers hovering at mid-height.
  - **Cyber Shield**: Grants 1-hit protection against collisions.
  - **Hyper Overdrive**: When the meter hits 100%, activate hyper speed to become invincible, crush all obstacles, and magnetically vacuum all nearby shards!
- **Local High Score**: Automatically records your personal best score in your browser's `localStorage`.
