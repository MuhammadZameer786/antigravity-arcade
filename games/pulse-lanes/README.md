# 🎵 PULSE LANES // Neon Rhythm

> A four-lane rhythm game built with pure vanilla HTML5 Canvas and Web Audio. Every track is synthesized live in your browser, so there are no audio files to load.

---

## 🎮 How to Play

Open the [Arcade Hub](../../index.html) and launch **Pulse Lanes**, or open [index.html](index.html) directly.

1. Notes ride down four lanes toward the line at the bottom. Hit each one as it crosses the line.
2. **Long notes** have a tail. Keep holding until the tail reaches the line.
3. The notes follow the song's melody, so hitting them plays the tune. A miss cuts the melody out for a moment.
4. Misses drain your **energy**. If it runs out, the song ends early.

| Timing | Window | Points |
| :--- | :--- | :--- |
| **PERFECT** | within 45 ms | 300 |
| **GREAT** | within 90 ms | 200 |
| **GOOD** | within 135 ms | 100 |
| **MISS** | later, or a press well before the note | 0 |

Finishing a long note scores 150 more. Your combo raises a multiplier to x2 at 10, x3 at 30 and x4 at 60. Accuracy sets the grade: **S** from 95%, **A** from 90%, **B** from 80% and **C** from 70%.

---

## 🕹️ Modes

| Mode | Notes |
| :--- | :--- |
| **Tracks** | Six tracks from 100 to 148 BPM, each on Easy, Normal or Hard. Your best grade and accuracy are saved for each. |
| **Daily Track** | A new track every day, the same for everyone on that date. |
| **Endless** | Sections keep coming. Every cycle the tempo rises, the key changes and the melodies get busier, until your energy runs out. |

Tap a track to hear a loop of it, and tap it again to play.

---

## ⌨️ Controls

| Action | Keyboard | Touch | Mouse |
| :--- | :--- | :--- | :--- |
| **Lanes 1–4** | `D` `F` `J` `K`, or `←` `↓` `↑` `→` | Tap the four columns of the screen | Click a lane |
| **Pause** | `P` or `Esc` | ⏸ button | ⏸ button |
| **Sound** | `M` | 🔊 button | 🔊 button |

On a phone, the screen splits into four equal columns, so you can play upright or sideways with two thumbs.

---

## ⏱️ Timing and Calibration

Headphones and speakers add a delay between the game making a sound and you hearing it. Bluetooth headphones can add a lot.

- **Settings → Calibrate by tapping** plays a click track. Tap along by ear, and your taps set the **audio offset**.
- You can also nudge the offset by hand, in 5 ms steps.
- After a song, if your hits leaned early or late on average, the results screen offers to adjust the offset for you.
- **Note speed** changes how long notes are on screen, from 2.4 seconds at speed 1 down to 0.7 seconds at speed 9.

---

## 🛠️ Technical Notes

- **One clock for sound and play**: songs are scheduled ahead on the Web Audio clock, and every hit is judged against that same clock using the key press or touch's own timestamp. A slow frame can't cost you a hit, and the reported output delay is taken off automatically.
- **Songs from a seed**: [music.js](music.js) builds each song as an intro, verse, build, two drops with a break between them, and an outro. It writes the chord progression, drums, bass, pads and a repeating two-bar melody with variations. The same seed always makes the same song.
- **Charts from the melody**: each difficulty keeps more of the melody. Easy uses quarter notes, Normal eighths and Hard sixteenths, and Normal and Hard add double notes on the drops. Higher notes sit further right. The music is identical on every difficulty.
- **Playable by construction**: the chart writer never asks for the same lane again faster than the difficulty allows, and never overlaps a long note.
- **Live synthesis**: kick, snare, clap, hats, crash, riser, bass, pads, lead and pluck are all built from oscillators, filtered noise and envelopes. The pads pump against the kick in the drops, and the lead has a dotted-eighth echo.
- Records are saved in `localStorage` (`pulse_lanes_records`, `pulse_lanes_daily`, `pulse_lanes_endless`, `pulse_lanes_settings`, `pulse_lanes_highscore`).
