// Bootstrap and input: starts the match, wires clicks and keys, runs Vex's
// turn with readable pauses, and stages deterministic screenshot scenes
// when the page is opened with ?shot=start|play|win|loss.
import { chooseCard, intentText, planIntent } from './ai.js';
import { playSound, setMuted, isMuted, ensureAudio } from './audio.js';
import { endTurn, newGame, playCard, startMatch } from './game.js';
import { clearIntent, flashSide, floatText, initRender, render, showIntent } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = Number.parseInt(params.get('seed') || '7', 10) || 7;
const shot = params.get('shot');
const shotMode = shot !== null;

let state = newGame(seed);
let aiBusy = false;

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Turn a play's events into sounds and floating numbers. */
function presentEvents(events) {
  for (const event of events) {
    if (event.type === 'played') {
      playSound('play');
    } else if (event.type === 'damage') {
      playSound('hit');
      const target = event.side === 'player' ? 'enemy' : 'player';
      floatText(`-${event.lost}`, 'dmg', target);
      flashSide(target);
    } else if (event.type === 'shield') {
      playSound('shield');
      floatText(`+${event.amount} 🛡`, 'shield', event.side);
    } else if (event.type === 'heal') {
      playSound('heal');
      floatText(`+${event.amount}`, 'heal', event.side);
    } else if (event.type === 'draw') {
      playSound('draw');
    } else if (event.type === 'triad') {
      playSound('triad');
    }
  }
  if (state.phase === 'won') playSound('win');
  if (state.phase === 'lost') playSound('lose');
}

/** The player plays one card from their hand. */
function onPlayCard(cardId, element) {
  if (aiBusy || state.phase !== 'play' || state.turn !== 'player') return;
  const result = playCard(state, 'player', cardId);
  if (!result.ok) return;
  ensureAudio();
  if (element) element.classList.add('played-anim');
  presentEvents(result.events);
  render(state, onPlayCard);
}

/** Vex's turn: announce its intent, then play card by card, visibly. */
async function runEnemyTurn() {
  aiBusy = true;
  const intent = planIntent(state);
  showIntent(intentText(intent));
  render(state, onPlayCard);
  await sleep(900);
  for (;;) {
    if (state.phase !== 'play') break;
    const type = chooseCard(state);
    if (!type) break;
    await sleep(650);
    const result = playCard(state, 'enemy', type.id);
    if (!result.ok) break;
    presentEvents(result.events);
    render(state, onPlayCard);
    await sleep(350);
  }
  await sleep(400);
  clearIntent();
  if (state.phase === 'play') {
    endTurn(state);
    render(state, onPlayCard);
  }
  aiBusy = false;
}

function onEndTurn() {
  if (aiBusy || state.phase !== 'play' || state.turn !== 'player') return;
  ensureAudio();
  endTurn(state);
  render(state, onPlayCard);
  void runEnemyTurn();
}

function onStart() {
  ensureAudio();
  state = newGame(seed);
  startMatch(state);
  render(state, onPlayCard);
}

function onRestart() {
  aiBusy = false;
  clearIntent();
  onStart();
}

function init() {
  initRender();
  document.getElementById('start-btn').addEventListener('click', onStart);
  document.getElementById('end-turn').addEventListener('click', onEndTurn);
  document.getElementById('restart-btn').addEventListener('click', onRestart);
  document.getElementById('win-again-btn').addEventListener('click', onRestart);
  document.getElementById('loss-again-btn').addEventListener('click', onRestart);
  const muteBtn = document.getElementById('mute-btn');
  muteBtn.addEventListener('click', () => {
    setMuted(!isMuted());
    muteBtn.textContent = isMuted() ? '🔇' : '🔊';
  });

  window.addEventListener('keydown', (event) => {
    if (shotMode) return;
    if (event.key >= '1' && event.key <= '8') {
      const index = Number.parseInt(event.key, 10) - 1;
      const id = state.player.hand[index];
      if (id) onPlayCard(id, null);
    } else if (event.key === 'Enter' && state.phase === 'play') {
      onEndTurn();
    } else if (event.key === 'r' || event.key === 'R') {
      onRestart();
    } else if (event.key === 'm' || event.key === 'M') {
      muteBtn.click();
    }
  });

  if (shotMode) {
    // Deterministic screenshot scene: no transitions, no interaction.
    document.body.classList.add('shot');
    stageShot(shot, state);
    render(state, onPlayCard);
    return;
  }
  render(state, onPlayCard);
}

init();
