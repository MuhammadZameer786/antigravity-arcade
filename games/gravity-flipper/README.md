# 🌀 GRAVITY FLIPPER

> A high-speed quantum inversion reflex runner built with pure vanilla HTML5 Canvas and Web Audio API.

---

## 🎮 How to Play

### Option 1: Direct File
Open [index.html](file:///Users/zameer/Documents/antigravity/games/gravity-flipper/index.html) directly in any modern browser.

### Option 2: From the Arcade Hub
Open the master [Arcade Hub](../../index.html) and click **"LAUNCH GAME"** on the Gravity Flipper card.

### Option 3: Daily Run
Pick **📅 DAILY RUN** on the start screen. The course comes from today's date, so everyone runs the same course all day, and every retry starts it again from the top.

- Your best score for the day is kept apart from your overall best, and the HUD's **TODAY** box shows it.
- It shows up in the Arcade Hub's **Today** panel and counts toward the daily streak. Opening it from there makes Daily Run the main button.
- **MODES** on the results screen goes back to the start screen to switch modes.
- Saved in `localStorage` as `gravity_flipper_daily`, and in the arcade's shared daily log.

### Option 4: Online Race (Prototype)
Open the game on two devices and pick **ONLINE RACE**. It uses the arcade's [room server](../../README.md#option-3-arcade-server-for-online-play). One player creates a room and the other joins with its 4-letter code.

- Both players run the same course at the same time. The last one still alive wins.
- The rival appears as a ghost, and the HUD's **RIVAL** box shows how far ahead or behind you are.
- There's no pausing. Keeping the game hidden for 15 seconds forfeits the race, and a dropped player has 20 seconds to reconnect.
- High scores aren't saved from races.

---

## ⌨️ Controls

| Action | Keyboard | Mouse / Touch |
| :--- | :--- | :--- |
| **Flip Gravity** | `Space`, `↑`, `↓`, `W`, `S` | **Click or Tap anywhere** |
| **Air Flip Rescue** | Press flip while airborne (1 charge) | Tap while airborne |
| **Pause / Resume** | `P`, `Esc` | Click Pause button |
| **Mute Audio** | `M` | Click Sound button |
| **Quick Restart** | `R` (on Game Over) | Click Retry Run |

---

## 🌟 Game Mechanics & Features

- **Quantum Inversion**: Flip gravity instantly between the floor and the ceiling.
- **Air Flip Charge**: You have 1 emergency mid-air flip charge to save yourself from mistimed leaps. Landing on any surface or collecting a Graviton Orb recharges it instantly.
- **Floating Energy Platforms**: Land on the top or bottom of floating platforms to navigate dangerous spike clusters.
- **Graviton Orbs (◆)**: Collect floating orbs to increase your score multiplier (up to **x8**) and recharge your air flip.
- **Warp Gates (🌀)**: High-speed portals that propel you forward, granting +600 points and warping space-time.
- **Dynamic Sectors**: Advance through sectors as your distance climbs:
  - **Sector 01**: Cyber Nexus (Cyan / Violet)
  - **Sector 02**: Plasma Core (Magenta / Yellow)
  - **Sector 03**: Solar Matrix (Amber / Orange)
  - **Sector 04**: Quantum Void (Emerald / Cyan)
  - **Sector 05**: Hyper Nebula (Electric Purple / Pink)
- **Procedural Synthesizer**: Built-in 4-on-the-floor synth drums, rolling bassline, crystal arpeggios, and responsive SFX (zero external audio files).
- **Persistent High Score**: Best scores are recorded automatically in `localStorage`.
