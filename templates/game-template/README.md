# 🕹️ Antigravity Game Template

A lightweight starter template for creating vanilla HTML5 Canvas mini-games.

## Quick Start for New Games

1. Duplicate this directory to `games/<your-game-name>/`:
   ```bash
   cp -r templates/game-template games/<your-game-name>
   ```
2. Customize `index.html` (Title, instructions, HUD).
3. Implement your game mechanics in `game.js`:
   - `resetGameObjects()`: Spawn initial entities
   - `update(dt)`: Game logic & physics
   - `render()`: Canvas drawing
   - Update `this.storageKey` for persistent local high score tracking
4. Register the new game card in the root [index.html](../../index.html).
