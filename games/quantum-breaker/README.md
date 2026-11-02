# 🧱 QUANTUM BREAKER // Neon Matrix Multi-Ball Arkanoid

> A fast-paced, high-velocity retro-futuristic Breakout / Brick Breaker arcade game built with pure vanilla HTML5 Canvas and Web Audio API.

---

## 🎮 How to Play

### Option 1: Direct File
Open [index.html](file:///Users/zameer/Documents/antigravity/games/quantum-breaker/index.html) directly in any modern browser.

### Option 2: From the Arcade Hub
Open the master [Arcade Hub](../../index.html) and launch **Quantum Breaker**.

---

## 🕹️ Game Overview

Quantum Breaker combines the addictive reflex action of classic Arkanoid and Breakout with explosive cyberpunk neon aesthetics, cascading multi-ball chain reactions, musical pentatonic brick chimes, and tactical powerup stacking.

Blast through handcrafted quantum sectors, manage dozens of simultaneous balls bouncing frantically across the matrix, mount dual plasma laser cannons, and shatter the high score!

---

## ⌨️ Controls

| Action | Desktop Keyboard | Mouse / Pointer | Touch / Mobile |
| :--- | :--- | :--- | :--- |
| **Move Paddle** | `←` / `→` or `A` / `D` | Move cursor horizontally | Drag finger horizontally |
| **Launch Ball** | `Space` or `↑` | Left Click | Tap screen |
| **Fire Laser Cannons** | `Space` or `↑` | Left Click | Tap screen |
| **Pause / Resume** | `P` or `Esc` | Click `⏸` button | Tap `⏸` button |
| **Toggle Audio & Synth** | `M` | Click `🔊` button | Tap `🔊` button |
| **Restart (Game Over)** | `R` | Click "Retry Matrix" | Tap "Retry Matrix" |

---

## ⚡ Power-Ups & Quantum Buffs

Bricks have a chance to drop glowing quantum capsules when shattered:

| Icon | Power-Up | Effect |
| :---: | :--- | :--- |
| `✦` | **Multi-Ball (Quantum Split)** | Instantly triples every active ball in play! Stack them to control 10+ balls at once. |
| `⚡` | **Dual Laser Cannons** | Mounts twin blasters to your paddle wings for 12 seconds to disintegrate bricks directly. |
| `↔` | **Quantum Expansion** | Widens your paddle beam by +50% for 15 seconds for effortless recovery. |
| `🔥` | **Plasma Pierce** | Balls ignite with white-hot fusion and tear through bricks without bouncing back for 8 seconds. |
| `⏱` | **Chrono Field** | Dilates time, slowing all balls down by 35% for 10 seconds. |
| `🛡️` | **Safety Grid** | Deploys an electric bottom floor barrier that absorbs up to 3 falling balls. |
| `♥` | **Shield Core (+1 Life)** | Repairs and restores +1 quantum shield core (up to 5 maximum). |

---

## 🧱 Brick Types & Architecture

1. **Standard Neon Bricks**: 1 hit. Tuned to musical pentatonic row pitches (C4 to E5) to create harmonic melodies as balls cascade.
2. **Armored Quantum Bricks (⬡)**: 2 to 3 hits. Reinforced energy shielding with visible integrity counter.
3. **Explosive Nova Bricks (💣)**: Detonates an 8-way radial blast wave that damages or obliterates adjacent bricks in chain reactions.
4. **Prismatic Shift Bricks (✦)**: Rare rainbow frequency bricks offering massive score (+500 pts) and guaranteed high-tier powerup drops!
5. **Indestructible Obelisks**: High-density quantum pillars used for high-angle rebound bank shots.

---

## 🌌 Sectors & Modes

- **Sector 01: Genesis Matrix** - Classic symmetric introductory lattice.
- **Sector 02: Cyber Bastion** - Armored perimeter defense with explosive core cells.
- **Sector 03: Quantum Diamond** - Rhombus energy geometry with high-velocity drop channels.
- **Sector 04: Singularity Core** - Unbreakable obelisks guarding high-value interior clusters.
- **Sector 05: Hyperflux Void** - Complex sinusoidal wave patterns with rapid accelerations.
- **Endless Void Mode (Sector 6+)** - Procedural infinite matrix with scaling brick density, armor tiers, and score multipliers!

---

## 🔊 Procedural Synth & Sound Design

- **Driving 4-on-the-Floor Synthwave Engine**: Real-time synthesized kick, hi-hat, snare, and arpeggiated bassline generated dynamically via Web Audio API.
- **Musical Row Chimes**: Each brick row is tuned to a distinct note in the pentatonic scale, with pitch subtly rising with your combo multiplier.
- **Completely Self-Contained**: No external sound assets or network requests required—plays instantly anywhere offline.
- **Local Record Tracking**: High scores, total bricks smashed, peak balls in play, and max combos are saved automatically in `localStorage`.
