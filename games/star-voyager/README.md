# 🚀 Star Voyager

> A 3D procedural space flight simulator and cosmic exploration game built with pure browser technologies (Three.js WebGL & Web Audio API synthesizer).

---

## 🎮 Play Now

- **Direct Browser Launch:** Open [index.html](file:///Users/zameer/Documents/antigravity/games/star-voyager/index.html) in any modern browser.
- **Arcade Hub:** Return to the master [Arcade Hub](../../index.html) to browse and launch games.

---

## 🕹️ Flight Controls

| Control | Keyboard Input | Action |
| :--- | :--- | :--- |
| **Pitch** | `W` / `S` or `↑` / `↓` | Elevators (nose down / pull up) |
| **Roll** | `A` / `D` or `←` / `→` | Wing bank and roll rotation |
| **Yaw** | `Q` / `E` | Rudder horizontal steering |
| **Throttle** | `Spacebar` / `↑` | Sub-light propulsion (0 – 120 km/s) |
| **Afterburner** | `Left Shift` | Ion Boost (up to 360 km/s) |
| **Plasma Lasers** | `Left Click` or `F` | Dual alternating wing cannons |
| **Hyperspace Warp** | `J` | Jump forward across cosmic sectors |
| **Camera View** | `C` | Toggle 3rd-Person Chase / 1st-Person Cockpit |
| **Sound Toggle** | `M` | Mute / Unmute dynamic synthesizer |
| **Pause** | `P` | Suspend flight simulation |

---

## 🌌 Simulation Features

1. **Deterministic 3D Procedural Universe:**
   - **Multi-Layered Starfield:** 4,500+ distant stars with twinkling color temperatures and infinite camera parallax.
   - **Dynamic Cosmic Dust:** High-speed particle streaks that scale with ship velocity and afterburners.
   - **Procedural Asteroid Fields:** Craggy icosahedron asteroids with unique vertex displacements, tumble rotations, and collision physics.
   - **Procedural Planets & Moons:** Real-time canvas-generated textures for gas giants with banded storm systems, planetary rings, and cratered moons.
   - **Modular Orbital Starbase:** A spinning space station with docking ring that recharges ship shields.

2. **Real-Time Targeting & 2D Nav Radar:**
   - Real-time 3D-to-screen target lock brackets that calculate range and asteroid structural integrity.
   - 360° circular cockpit radar displaying celestial bodies, asteroids, space stations, and mineral ore shards relative to ship heading.

3. **Mining & Plasma Destruction:**
   - Fire high-velocity plasma bolts to crack open asteroids.
   - Broken asteroids release glowing mineral crystals that are pulled in magnetically by the ship's automated tractor beam.

4. **Hyperspace FTL Jump:**
   - Charge the warp drive to enter hyperspace with expanding FOV and warp tunnel effects, jumping thousands of kilometers into a newly generated cosmic sector!

5. **Procedural Web Audio Synthesizer:**
   - Dynamic low-pass filtered engine hum modulated by velocity.
   - White-noise thruster afterburner sweeps.
   - Stereo panned plasma laser discharges.
   - Resonant asteroid explosion booms and crystal ore chimes.

---

## 🛠️ Architecture

- `index.html`: WebGL canvas, CRT vignette, and high-tech flight HUD.
- `style.css`: Cyberpunk space aesthetic with glassmorphic dashboards, radar orb, and responsive layout.
- `game.js`: Physics engine, quaternion orientation, Three.js world generation, and Web Audio synthesizer.
- `three.min.js`: Local Three.js build for 100% offline gameplay with CDN fallback.
