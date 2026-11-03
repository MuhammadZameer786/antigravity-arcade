# 🧩 Neon Matrix Blocks // Cyberpunk Tetromino Puzzle

> High-voltage falling tetromino block puzzle powered by the Super Rotation System (SRS), glowing neon polyominoes, hard drops, laser line clears, and procedural Web Audio synthwave.

---

## 🎮 Play Now

Open [index.html](file:///Users/zameer/Documents/antigravity/games/neon-blocks/index.html) directly in any modern browser, or launch it via the [Antigravity Arcade Hub](file:///Users/zameer/Documents/antigravity/index.html).

---

## 🕹️ Controls

### Keyboard Controls
| Action | Key(s) | Description |
| :--- | :--- | :--- |
| **Move Left / Right** | `←` / `→` or `A` / `D` | Shift block sideways with DAS auto-repeat |
| **Rotate Clockwise** | `↑` or `W` or `X` | Standard SRS 90° clockwise rotation |
| **Rotate Counter-Clockwise** | `Z` or `Ctrl` | Standard SRS 90° counter-clockwise rotation |
| **Soft Drop** | `↓` or `S` | Accelerated falling (+1 pt / cell) |
| **Hard Drop** | `Space` | Instant impact lock with laser shockwave (+2 pts / cell) |
| **Hold Piece** | `C` or `Shift` | Swap active piece with hold chamber |
| **Pause / Resume** | `P` or `Esc` | Suspend / resume matrix cycle |
| **Toggle Audio** | `M` | Mute / unmute synthesizer BGM & SFX |
| **Toggle Scanlines** | `C` (when paused/menu) | Toggle retro CRT scanline overlay |
| **Quick Restart** | `R` | Instantly reset the current matrix run |

### Mobile Touch Controls
On touchscreen devices, an arcade virtual keypad is automatically surfaced:
- `HOLD`: Swap piece with hold slot.
- `↺ CCW` / `↻ CW`: Rotate piece counter-clockwise / clockwise.
- `⚡ DROP`: Instant hard drop.
- `◀ LEFT` / `▼ DOWN` / `RIGHT ▶`: Precision movement and soft drop.

---

## ⚡ Game Modes

1. **⚡ Marathon Mode**:
   - Classic 15-level progression.
   - Clears 10 lines per level to advance.
   - Gravity and speed escalate as levels rise.

2. **⏱️ Sprint (40 Lines)**:
   - Race against the millisecond clock to clear 40 lines as fast as humanly possible.
   - Records personal best finish time to browser `localStorage`.

3. **🔥 Ultra (2 Minute Blitz)**:
   - High-score battle with a 120-second countdown timer.
   - Maximize Tetrises, T-Spins, combos, and Back-to-Back clears before time expires.

4. **⚔️ Online Versus (Prototype)**:
   - Two devices, one room code, last matrix standing wins. Needs the [arcade server](../../README.md#option-3-arcade-server-for-online-play).
   - Both players draw the same pieces, and speed rises every 30 seconds.
   - Clears send garbage rows: Double 1, Triple 2, Tetris 4, T-Spin 2 per line, Back-to-Back +1, combos up to +4, Perfect Clear +10.
   - Clears cancel incoming garbage first. Whatever's left rises when your next piece locks without a clear.
   - There's no pausing. Keeping the game hidden for 15 seconds forfeits the match, and a dropped player has 20 seconds to reconnect.

---

## 🎯 Scoring & Advanced Mechanics

- **Single Line**: `100 × Level`
- **Double Line**: `300 × Level`
- **Triple Line**: `500 × Level`
- **TETRIS (Quad Clear)**: `800 × Level` (or `1,200 × Level` with Back-to-Back bonus!)
- **T-Spin Single**: `800 × Level`
- **T-Spin Double**: `1,200 × Level`
- **T-Spin Triple**: `1,600 × Level`
- **Back-to-Back (B2B)**: Clearing consecutive difficult clears (Tetris or T-Spin) grants a **1.5x multiplier** and activates the glowing neon pink B2B badge.
- **Combo Chain**: Consecutive line clears stack combo multipliers (`50 × combo × level`).
- **Perfect Clear (All Clear)**: If a line clear completely cleans the 10×20 board, a massive `3,500 × Level` bonus is awarded.

---

## 🔬 Technical Features

- **Esports Standard SRS (Super Rotation System)**:
  - 5-test wall kick table for `[J, L, S, T, Z]` and dedicated kick table for `[I]`.
  - Enables wall kicks, floor kicks, tucks, and authentic T-Spins.
- **7-Bag Randomizer**:
  - Uses Fisher-Yates shuffle algorithms to guarantee balanced piece distribution without droughts.
- **Lock Delay & Reset**:
  - 500ms grace period on floor contact, reset up to 15 times on move/rotation.
- **Ghost Piece Hologram**:
  - Live projection showing the exact drop coordinate with neon wireframe styling.
- **Procedural Web Audio Engine**:
  - Zero external `.mp3` or `.wav` dependencies.
  - Multi-track procedural synthwave track with four-on-the-floor kick, hi-hats, snare, 16th-note rolling bassline, and lead arpeggios.
  - Frequency modulated cyber sound effects for movements, hard drops, line clears, and alarms.
- **Visual FX**:
  - Background digital matrix rain canvas.
  - Laser sweep line clear beam with particle burst explosion.
  - Hard drop screen shake and radial shockwave rings.
  - Upper danger alert banner with pulsing heartbeat SFX when blocks exceed row 16.
