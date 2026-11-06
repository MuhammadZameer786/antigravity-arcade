# 🕹️ Antigravity Arcade

> A collection of fast, lightweight pass-time mini-games built with pure vanilla HTML5 Canvas and Web Audio.

---

## 🚀 Quick Start

### Option 1: Direct File
Double-click or open [index.html](file:///Users/zameer/Documents/antigravity/index.html) in any browser to launch the **Arcade Hub**. From there, you can launch any game with one click!

You can also launch the games directly:
- **⚡ Neon Runner**: [games/neon-runner/index.html](file:///Users/zameer/Documents/antigravity/games/neon-runner/index.html)
- **🌀 Gravity Flipper**: [games/gravity-flipper/index.html](file:///Users/zameer/Documents/antigravity/games/gravity-flipper/index.html)
- **🏓 Neon Pong**: [games/neon-pong/index.html](file:///Users/zameer/Documents/antigravity/games/neon-pong/index.html)
- **🚀 Cyber Jetpack**: [games/cyber-jetpack/index.html](file:///Users/zameer/Documents/antigravity/games/cyber-jetpack/index.html)
- **🌌 Star Voyager**: [games/star-voyager/index.html](file:///Users/zameer/Documents/antigravity/games/star-voyager/index.html)
- **🧱 Quantum Breaker**: [games/quantum-breaker/index.html](file:///Users/zameer/Documents/antigravity/games/quantum-breaker/index.html)
- **⚡ Cyber Pinball**: [games/cyber-pinball/index.html](file:///Users/zameer/Documents/antigravity/games/cyber-pinball/index.html)
- **🐍 Cyber Snake**: [games/cyber-snake/index.html](file:///Users/zameer/Documents/antigravity/games/cyber-snake/index.html)
- **🧩 Neon Matrix Blocks**: [games/neon-blocks/index.html](file:///Users/zameer/Documents/antigravity/games/neon-blocks/index.html)
- **🎯 Vector Siege**: [games/vector-siege/index.html](file:///Users/zameer/Documents/antigravity/games/vector-siege/index.html)
- **🔌 Circuit Duel**: [games/circuit-duel/index.html](file:///Users/zameer/Documents/antigravity/games/circuit-duel/index.html)
- **🎵 Pulse Lanes**: [games/pulse-lanes/index.html](file:///Users/zameer/Documents/antigravity/games/pulse-lanes/index.html)

### Option 2: Local HTTP Server (Optional)
Run Python's built-in web server:
```bash
python3 -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

### Option 3: Arcade Server (For Online Play)
Neon Blocks versus, the Gravity Flipper race and Circuit Duel online need the room server, which also serves the arcade (requires Node 22+):
```bash
cd server
npm install
npm start
```
Then visit `http://localhost:8787`. It also prints an address that phones and tablets on the same Wi-Fi can open.

---

## 📁 Repository Structure

```text
antigravity/
├── index.html                  # 🕹️ Master Arcade Hub & Game Launcher
├── README.md                   # 📖 Workspace overview and guide
│
├── games/                      # 🎮 Standalone game projects
│   ├── neon-runner/            # ⚡ Neon Runner (Synthwave Endless Runner)
│   │   ├── index.html
│   │   ├── game.js
│   │   ├── style.css
│   │   └── README.md
│   │
│   ├── gravity-flipper/        # 🌀 Gravity Flipper (Quantum Inversion Runner)
│   │   ├── index.html
│   │   ├── game.js
│   │   ├── style.css
│   │   └── README.md
│   │
│   ├── neon-pong/              # 🏓 Neon Pong (1P AI + 2P Local Curve Rally)
│   │   ├── index.html
│   │   ├── game.js
│   │   ├── style.css
│   │   └── README.md
│   │
│   ├── cyber-jetpack/          # 🚀 Cyber Jetpack (Laser Flap Vector Thrust Runner)
│   │   ├── index.html
│   │   ├── game.js
│   │   ├── style.css
│   │   └── README.md
│   │
│   ├── star-voyager/           # 🌌 Star Voyager (3D Procedural Space Flight Simulator)
│   │   ├── index.html
│   │   ├── game.js
│   │   ├── style.css
│   │   ├── three.min.js
│   │   └── README.md
│   │
│   ├── quantum-breaker/        # 🧱 Quantum Breaker (Neon Multi-Ball Breakout)
│   │   ├── index.html
│   │   ├── game.js
│   │   ├── style.css
│   │   └── README.md
│   │
│   ├── cyber-pinball/          # ⚡ Cyber Pinball (Neon Matrix Overdrive Pinball)
│   │   ├── index.html
│   │   ├── game.js
│   │   ├── style.css
│   │   └── README.md
│   │
│   ├── cyber-snake/            # 🐍 Cyber Snake (Neon Grid Overdrive Snake)
│   │   ├── index.html
│   │   ├── game.js
│   │   ├── style.css
│   │   └── README.md
│   │
│   ├── neon-blocks/            # 🧩 Neon Matrix Blocks (Cyberpunk Tetromino Puzzle)
│   │   ├── index.html
│   │   ├── game.js
│   │   ├── style.css
│   │   └── README.md
│   │
│   ├── vector-siege/           # 🎯 Vector Siege (Twin-Stick Neon Arena Shooter)
│   │   ├── index.html
│   │   ├── game.js
│   │   ├── style.css
│   │   └── README.md
│   │
│   ├── circuit-duel/           # 🔌 Circuit Duel (Neon Dots & Boxes: CPU, Local, Online)
│   │   ├── index.html
│   │   ├── game.js
│   │   ├── style.css
│   │   └── README.md
│   │
│   └── pulse-lanes/            # 🎵 Pulse Lanes (4-Lane Rhythm Game with Live-Synth Tracks)
│       ├── index.html
│       ├── music.js
│       ├── game.js
│       ├── style.css
│       └── README.md
│
├── server/                     # 🛰️ Room-code WebSocket server for online play
│   ├── index.js
│   └── rooms.test.js
│
├── shared/
│   ├── arcade-daily.js         # 📅 Daily log: results and streak for the hub's Today panel
│   ├── arcade-room.js          # 🔌 Room client: codes, heartbeats, reconnecting
│   ├── arcade-lobby.js         # 🚪 Lobby screens: create, join, ready, rematch
│   └── arcade-lobby.css
│
└── templates/
    └── game-template/          # 📦 Ready-to-use template for new mini-games
        ├── index.html
        ├── game.js
        ├── style.css
        └── README.md
```

---

## 🎮 Installed Games

| Game | Category | Tech | Modes | Status | Play |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **⚡ [Neon Runner](file:///Users/zameer/Documents/antigravity/games/neon-runner/index.html)** | Synthwave Endless Runner | Canvas 2D + Web Audio | 1P | ✅ Ready | [Launch Game](file:///Users/zameer/Documents/antigravity/games/neon-runner/index.html) |
| **🌀 [Gravity Flipper](file:///Users/zameer/Documents/antigravity/games/gravity-flipper/index.html)** | Quantum Inversion Runner | Canvas 2D + Web Audio | 1P (Endless / Daily Run) / 2P Online Race (Prototype) | ✅ Ready | [Launch Game](file:///Users/zameer/Documents/antigravity/games/gravity-flipper/index.html) |
| **🏓 [Neon Pong](file:///Users/zameer/Documents/antigravity/games/neon-pong/index.html)** | Cyberpunk Curve Rally | Canvas 2D + Web Audio | 1P AI / 2P Local | ✅ Ready | [Launch Game](file:///Users/zameer/Documents/antigravity/games/neon-pong/index.html) |
| **🚀 [Cyber Jetpack](file:///Users/zameer/Documents/antigravity/games/cyber-jetpack/index.html)** | Laser Flap Vector Thrust Runner | Canvas 2D + Web Audio | 1P | ✅ Ready | [Launch Game](file:///Users/zameer/Documents/antigravity/games/cyber-jetpack/index.html) |
| **🌌 [Star Voyager](file:///Users/zameer/Documents/antigravity/games/star-voyager/index.html)** | 3D Procedural Space Flight Sim | Three.js 3D + Web Audio | 1P | ✅ Ready | [Launch Game](file:///Users/zameer/Documents/antigravity/games/star-voyager/index.html) |
| **🧱 [Quantum Breaker](file:///Users/zameer/Documents/antigravity/games/quantum-breaker/index.html)** | Neon Multi-Ball Matrix Arkanoid | Canvas 2D + Web Audio | 1P | ✅ Ready | [Launch Game](file:///Users/zameer/Documents/antigravity/games/quantum-breaker/index.html) |
| **⚡ [Cyber Pinball](file:///Users/zameer/Documents/antigravity/games/cyber-pinball/index.html)** | Neon Multi-Ball Matrix Pinball | Canvas 2D + Web Audio | 1P | ✅ Ready | [Launch Game](file:///Users/zameer/Documents/antigravity/games/cyber-pinball/index.html) |
| **🐍 [Cyber Snake](file:///Users/zameer/Documents/antigravity/games/cyber-snake/index.html)** | Neon Grid Overdrive Snake | Canvas 2D + Web Audio | 1P | ✅ Ready | [Launch Game](file:///Users/zameer/Documents/antigravity/games/cyber-snake/index.html) |
| **🧩 [Neon Matrix Blocks](file:///Users/zameer/Documents/antigravity/games/neon-blocks/index.html)** | Cyberpunk Tetromino Puzzle | Canvas 2D + Web Audio | 1P (Marathon/Sprint/Ultra/Daily) / 2P Online Versus (Prototype) | ✅ Ready | [Launch Game](file:///Users/zameer/Documents/antigravity/games/neon-blocks/index.html) |
| **🎯 [Vector Siege](file:///Users/zameer/Documents/antigravity/games/vector-siege/index.html)** | Twin-Stick Neon Arena Shooter | Canvas 2D + Web Audio | 1P (Endless / Daily Siege) | ✅ Ready | [Launch Game](file:///Users/zameer/Documents/antigravity/games/vector-siege/index.html) |
| **🔌 [Circuit Duel](file:///Users/zameer/Documents/antigravity/games/circuit-duel/index.html)** | Neon Dots & Boxes Strategy Duel | Canvas 2D + Web Audio | 1P vs CPU / 2P Local / 2P Online | ✅ Ready | [Launch Game](file:///Users/zameer/Documents/antigravity/games/circuit-duel/index.html) |
| **🎵 [Pulse Lanes](file:///Users/zameer/Documents/antigravity/games/pulse-lanes/index.html)** | 4-Lane Rhythm Game with Live-Synth Tracks | Canvas 2D + Web Audio | 1P Tracks / Daily / Endless | ✅ Ready | [Launch Game](file:///Users/zameer/Documents/antigravity/games/pulse-lanes/index.html) |

---

## 📅 Today Panel
The top of the Arcade Hub shows **today's four daily challenges**: Vector Siege's Daily Siege, Pulse Lanes' Daily Track, Neon Blocks' Daily (2 minutes, same pieces for everyone) and Gravity Flipper's Daily Run (same course for everyone). Each tile shows your best result for the day and opens the game with that daily ready to start. Playing at least one daily a day builds a **streak**, and a strip of dots shows the last seven days. New dailies arrive at midnight, local time.

Games seed their daily from `ArcadeDaily.seed(game)` and save finished daily runs with `ArcadeDaily.record()`, both from [shared/arcade-daily.js](shared/arcade-daily.js). The hub reads them back from `localStorage` (`arcade_daily_log`). To add another daily, call it when the run ends and add an entry to the `DAILIES` list in [index.html](index.html).

---

## 🛠️ Adding a New Game

### Method A: Just Ask Me!
Tell Antigravity what you'd like to play, for example:
- *"Let's build a classic Snake game with neon glow in `games/cyber-snake`"*
- *"Make a retro space shooter like Galaga in `games/space-shooter`"*
- *"Build a neon pinball machine with bumpers and ramps in `games/cyber-pinball`"*

### Method B: Duplicate the Starter Template
```bash
# 1. Copy the starter template
cp -r templates/game-template games/<your-game-name>

# 2. Add your game logic to games/<your-game-name>/game.js
# 3. Add a card link into the root index.html
```

---

## 🎨 Game Design Principles

All games in this arcade follow these lightweight principles:
1. **Zero External Dependencies**: Pure vanilla HTML5, CSS3, and JavaScript.
2. **Built-in Procedural Audio**: Sound effects and music synthesized live using the browser's `Web Audio API` (no missing audio assets or broken file paths).
3. **Responsive & Aspect-Locked**: Designed with clean canvas scaling for desktop, laptop, or mobile touch controls.
4. **Persistent High Scores**: Automatically saved to browser `localStorage`.
5. **Arcade Integration**: Includes a home button `🏠` to easily return to the Arcade Hub.
