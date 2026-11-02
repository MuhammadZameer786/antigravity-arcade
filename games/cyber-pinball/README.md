# ⚡ CYBER PINBALL // Neon Matrix Overdrive

> A high-voltage, retro-futuristic pinball arcade table built with pure vanilla HTML5 Canvas and procedural Web Audio API synthesis.

---

## 🎮 How to Play

### Option 1: Direct File
Open [index.html](file:///Users/zameer/Documents/antigravity/games/cyber-pinball/index.html) directly in any modern browser.

### Option 2: From the Arcade Hub
Open the master [Arcade Hub](../../index.html) and launch **Cyber Pinball**.

---

## 🕹️ Game Overview

Cyber Pinball brings classic physical pinball mechanics into a pulsing cyberpunk universe. Experience realistic continuous-collision ball physics, dual main flippers plus an upper auxiliary flipper, two elevated neon ramps, an interactive power plunger, 3 glowing pop bumpers ("Cyber Cores"), slingshots, drop targets, and high-stakes **Multi-Ball Jackpots**!

---

## ⌨️ Controls

| Action | Desktop Keyboard | Mouse / Pointer | Touch / Mobile |
| :--- | :--- | :--- | :--- |
| **Left Flipper** | `A` or `Z` or `←` | Click left screen zone | Tap left screen zone |
| **Right & Upper Flippers** | `D` or `/` or `→` | Click right screen zone | Tap right screen zone |
| **Power Plunger** | Hold & release `Space` or `↓` | Hold & release Plunger | Hold & release Plunger button |
| **Nudge / Tilt** | `X` (left), `N` (right), `↑` / `Space` | Click Nudge buttons | Tap on-screen Nudge bar |
| **Pause / Resume** | `P` or `Esc` | Click `⏸` button | Tap `⏸` button |
| **Toggle Audio & Synth** | `M` | Click `🔊` button | Tap `🔊` button |
| **Toggle CRT Scanlines** | `C` | Click `📺` button | Tap `📺` button |

---

## ⚡ Missions & Scoring Protocols

### 1. 🌀 Ramps & Loops
- **Left Warp Loop Ramp**: Shoot the ball into the left entrance to loop around the top orbit and exit cleanly down the right inlane wireform. Stacks Ramp Combos (up to 5x: 30,000 to 150,000 pts)!
- **Right Matrix Ramp**: Steeper ramp leading into the upper matrix chamber and depositing to the left inlane. During Multi-ball, this is your primary **JACKPOT RAMP**!

### 2. 🎯 Drop Targets & Matrix Lock
- A bank of 3 **C-Y-B** drop targets lines the upper-left wall.
- Knocking down all 3 drop targets awards 50,000 pts and ignites the center **MATRIX SCOOP LOCK**!
- Shoot the ball into the pulsing center scoop while lit to lock a ball.

### 3. 🚨 3-Ball Multi-Ball & Jackpots
- Lock 3 balls into the Matrix Scoop to trigger **CYBER MULTI-BALL**!
- Emergency alert sirens sound and 3 chrome balls are simultaneously ejected with explosive spread onto the playfield!
- During Multi-ball:
  - 15-second multi-ball ball-save grace period.
  - Ramps ignite with flashing Jackpot indicators.
  - Hitting the Jackpot Ramp scores **500,000 JACKPOT**!
  - Hitting consecutive ramp shots scores **1,000,000 SUPER JACKPOT** with screen strobe and celebratory fanfares!

### 4. 💥 Pop Bumpers ("Cyber Cores")
- 3 high-voltage neon bumpers in the upper playfield.
- Explosive radial impulses propel the ball with dynamic shockwave rings and spark particles.
- Every 15 bumper hits ignites **SUPER BUMPERS** for 20 seconds (5,000 pts per hit)!

### 5. 🌀 Turbine Spinner
- Rip through the right orbit spinner to spin the turbine.
- Realistic angular inertia with fast ratcheting synth sound ticks awarding 500 pts per rotation.

### 6. 🛡️ Inlanes, Outlanes & Cyber-Save
- **One-Way Shooter Spring Gate**: A directional flap at the exit of the plunger lane swings open effortlessly when you launch the ball, then springs closed to prevent balls in play from accidentally falling back into the plunger lane.
- Left & Right Slingshots give electric bounce-back impulses across the table.
- Completing the 3 top rollover lanes increases table Bonus Multiplier (2x, 3x, 5x, 10x).
- Flippers cycle lit rollover lanes (lane change mechanic).
- The left outlane features a **CYBER-SAVE Kickback Coil** that blasts stray balls back up into play!

---

## 🏆 Scoring Summary

| Target | Base Points | Notes |
| :--- | :--- | :--- |
| **Pop Bumper Hit** | 1,000 | 5,000 during Super Bumpers |
| **Slingshot Kick** | 500 | Sharp electric diagonal impulse |
| **Drop Target** | 10,000 | Knocking all 3 lights Matrix Lock |
| **Rollover Lane** | 5,000 | Completing set advances multiplier |
| **Skill Shot** | 50,000 | Plunging directly into the lit target lane |
| **Left Warp Loop** | 30,000 - 150,000 | Scales with consecutive combo multiplier |
| **Matrix Scoop** | 15,000 - 50,000 | Locks ball when Matrix Lock is active |
| **Turbine Spin** | 500 / revolution | Scales with launch speed |
| **JACKPOT** | 500,000 | Scored on ramp during Multi-ball |
| **SUPER JACKPOT** | 1,000,000 | Scored on consecutive Multi-ball ramp hits |

---

## 🛠️ Technical Details

- **Canvas 2D Physics**: Substepped continuous integration (10 substeps per frame) ensuring high-velocity balls never tunnel or clip through walls, flippers, or bumpers.
- **Accurate Flipper Mechanics**: Tapered capsule geometry with rotational angular momentum transfer ($\vec{v} = \vec{\omega} \times \vec{r}$) for authentic cradles, traps, and tip shots.
- **Web Audio API**: 100% procedural synthesized audio with FM kick, snare, hi-hats, bassline, mechanical flipper clacks, coil solenoids, and jackpot fanfare chords. Zero external audio file dependencies.
- **Persistence**: High scores and agent records saved to browser `localStorage`.
- **Display**: Authentic retro Dot Matrix Display (DMD) header with animated tickers, multiplier status, lock indicators, and CRT scanlines.
