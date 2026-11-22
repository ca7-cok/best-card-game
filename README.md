[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/ca7-cok/best-card-game/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/ca7-cok/best-card-game/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

# AETHERFALL — Sigil Duel

An original, offline, turn-based card duel. You are the Sigilkeeper; across
the table sits **Vex, the Hollow Sigil**, an AI opponent whose hand is open
and whose intent is announced before it acts — so every move it makes can be
read and countered.

## How to play

- **Energy:** each turn you gain energy (3 on turn one, +1 a turn, up to 10).
  Spend it to play cards from your hand.
- **Suits** are told apart by colour *and* shape: Flame ▲ red, Tide ● blue,
  Gale ◆ green, Stone ■ amber, Star ✦ violet.
- **Resonance:** the second card of a suit you play in one turn gains a
  bonus — damage, shield, healing, a draw or energy, depending on the card.
- **Triad:** play three different suits in one turn to draw a card at once.
- **Win** by reducing Vex to 0 life; **lose** if your own life reaches 0.
  Your score is the damage you dealt plus the life you have left.

Twelve original card types (24-card deck, two copies each) mix damage,
shields, healing, draws and energy tricks: Ember Slash, Flame Surge, Spark,
Tide Ward, Healing Spring, Gale Dart, Thorn Volley, Stone Fist, Quake,
Channel, Mirror Sigil and Nova. Vex plans each turn — *defend* when hurt,
*finish* when it smells a kill, *attack* otherwise — and tells you which.

## Run it

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome. No network, no build step, no account.

```sh
cd game && python3 -m http.server 8080
# open http://localhost:8080
```

Keys: **1–8** play a card · **Enter** end turn · **R** restart · **M** mute.
Mouse works for everything too. Sound is synthesised with WebAudio — no
audio files.

Deterministic screenshot scenes: `?shot=start|play|win|loss&seed=1` stages
the title screen, a mid-game table, the win screen and the loss screen from
a fixed seed (see `shots.json`).

## Layout

- `game/index.html` — the table
- `game/css/table.css` — the arena, overlays and floating numbers
- `game/css/cards.css` — the cards
- `game/js/game.js` — the rules engine (pure logic, no DOM)
- `game/js/cards.js` — the card catalogue and suits
- `game/js/deck.js` — deck, hand and discard pile
- `game/js/ai.js` — Vex: intent planning and card choice
- `game/js/render.js` — DOM rendering and animations
- `game/js/audio.js` — synthesised sound effects
- `game/js/shots.js` — deterministic screenshot scenes
- `game/js/rng.js` — seeded random numbers
- `game/js/main.js` — bootstrap, input and Vex's turn
- `main.ts` — the make.fun entry program (Node 22, standard library only);
  it copies `game/` and `screenshots/` to `MAKEFUN_OUTPUT_DIR` and writes
  `dossier.json` with `vendor/makefun-game.ts`
- `screenshots/` — four real renders of the game's own code

Built by an AI agent for make.fun's
[best-card-game-20261122-1826](https://make.fun/bounty/best-card-game-20261122-1826)
bounty. MIT licensed.
