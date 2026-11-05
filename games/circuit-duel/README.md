# 🔌 CIRCUIT DUEL // Neon Dots & Boxes

> A turn-based duel for two, built with pure vanilla HTML5 Canvas and procedural Web Audio. Play the computer, pass one phone around, or play a friend online with a room code.

---

## 🎮 How to Play

Open the [Arcade Hub](../../index.html) and launch **Circuit Duel**, or open [index.html](index.html) directly.

1. Players take turns drawing **one line** between two neighboring nodes on a 6 × 6 grid of nodes.
2. Drawing the **fourth side** of a cell claims it, and you **move again**. Close several cells in a row to keep going.
3. Normal cells are worth 1 point. Three **cores** are worth more: two are worth 2 and one is worth 3.
4. The board holds 29 points, so the first player to **15** wins and a game can never be a draw.

When you pick a line, any cell it would leave with three sides glows red. That cell is a free point for your opponent.

---

## 🕹️ Modes

| Mode | Players | Notes |
| :--- | :--- | :--- |
| **Vs Computer** | 1 | Easy, Normal or Hard. You and the computer take turns going first. |
| **Pass & Play** | 2 on one device | Players take turns going first. |
| **Online Duel** | 2 on two devices | Needs the arcade server. One player creates a room, the other joins with its 4-letter code. |

### Computer levels

- **Easy** often misses free cells and sometimes hands them over.
- **Normal** always takes free cells, never gives one away while it has another choice, and gives away as little as possible once it has to.
- **Hard** plays like Normal until 18 lines are left, then works out the best possible move by checking every way the game could finish. That includes deliberately leaving you two cells to keep control of a long chain.

### Online rules

- Both devices get the same board, and the server picks who goes first.
- Each move has a **30-second clock**. If yours runs out, your device draws a line for you.
- Keeping the game hidden for 15 seconds, or leaving, counts as a loss. A dropped player has 20 seconds to reconnect.

To play online, start the server and open the game from it on both devices:

```bash
cd server
npm install
npm start
```

---

## ⌨️ Controls

| Action | Mouse | Touch | Keyboard |
| :--- | :--- | :--- | :--- |
| **Draw a line** | Click it | Tap it to select, tap again to draw | Arrows to pick, `Enter` or `Space` to draw |
| **Menu / pause** | ⏸ button | ⏸ button | `P` or `Esc` |
| **Sound** | 🔊 button | 🔊 button | `M` |

Taps need a second touch because a near miss can hand your opponent a whole chain of cells.

---

## 🛠️ Technical Notes

- **One rules engine for everything**: the computer, local play and online play all use the same `Board` class. Lines and cells are stored in typed arrays.
- **Online play sends only moves**: each device keeps the full board. Moves carry their move number, so a repeated or early message can't put the two boards out of step. Because the seed fixes the cores and the first player, both boards always match.
- **Server-confirmed results**: the losing device reports the loss to the room server, which announces the result to both players. This is the same flow as Neon Blocks versus and the Gravity Flipper race.
- **Hard computer**: below 18 empty lines, a memoized search covers every remaining set of lines (at most 2^18 positions) and takes well under 50 ms.
- **Static board layer**: cells, lines and nodes are redrawn into an offscreen canvas only when a move is made. Each frame then adds just the highlights and sparks.
- Records are saved in `localStorage` (`circuit_duel_cpu`, `circuit_duel_online`, `circuit_duel_level`).
