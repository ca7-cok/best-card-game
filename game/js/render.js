// DOM rendering: turns the pure game state into the table, the hands, the
// log and the overlays, plus the slide/flip/float animations.
import { SUITS, cardType } from './cards.js';
import { scoreOf } from './game.js';

const $ = (id) => document.getElementById(id);

const els = {
  enemyHpFill: null, enemyHpText: null, enemyShield: null, enemyScore: null,
  playerHpFill: null, playerHpText: null, playerShield: null, playerScore: null,
  enemyHand: null, playerHand: null, energyPips: null, log: null,
  turnBanner: null, enemyIntent: null, resonanceNote: null, triadNote: null,
  playerDeck: null, playerDiscard: null,
  titleScreen: null, winScreen: null, lossScreen: null,
  winStats: null, lossStats: null, endTurn: null, floatLayer: null,
};

/** Cache element handles once the DOM exists. */
export function initRender() {
  for (const key of Object.keys(els)) els[key] = $(key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
  els.endTurn = $('end-turn');
  els.floatLayer = $('float-layer');
}

/** One card's DOM: cost gem, suit glyph, name, big numbers, effect text. */
export function createCardElement(type, options = {}) {
  const suit = SUITS[type.suit];
  const card = document.createElement('div');
  card.className = `card suit-${type.suit}`;
  card.dataset.cardId = type.id;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${type.name}, cost ${type.cost}, ${type.text}`);

  const cost = document.createElement('div');
  cost.className = 'card-cost';
  cost.textContent = type.cost;
  card.appendChild(cost);

  const glyph = document.createElement('div');
  glyph.className = 'card-suit';
  glyph.textContent = suit.glyph;
  card.appendChild(glyph);

  const name = document.createElement('div');
  name.className = 'card-name';
  name.textContent = type.name;
  card.appendChild(name);

  const numbers = document.createElement('div');
  numbers.className = 'card-numbers';
  const effect = type.effect;
  if (effect.damage) {
    const chip = document.createElement('span');
    chip.className = 'card-num dmg';
    chip.textContent = effect.hits > 1 ? `${effect.damage}×${effect.hits}` : effect.perFlame ? `${effect.damage}+` : `⚔ ${effect.damage}`;
    numbers.appendChild(chip);
  }
  if (effect.shield) {
    const chip = document.createElement('span');
    chip.className = 'card-num shield';
    chip.textContent = `🛡 ${effect.shield}`;
    numbers.appendChild(chip);
  }
  if (effect.heal) {
    const chip = document.createElement('span');
    chip.className = 'card-num heal';
    chip.textContent = `✚ ${effect.heal}`;
    numbers.appendChild(chip);
  }
  card.appendChild(numbers);

  const text = document.createElement('div');
  text.className = 'card-text';
  text.textContent = type.text;
  card.appendChild(text);

  const resonance = document.createElement('div');
  resonance.className = 'card-resonance';
  resonance.textContent = type.resonanceText;
  card.appendChild(resonance);

  if (options.keyIndex !== undefined) {
    const key = document.createElement('div');
    key.className = 'card-key';
    key.textContent = options.keyIndex + 1;
    card.appendChild(key);
  }
  return card;
}

/** Rebuild a hand row from card ids; `onPlay` is called for player clicks. */
function renderHand(container, ids, interactive, state, onPlay) {
  container.replaceChildren();
  ids.forEach((id, index) => {
    const type = cardType(id);
    const el = createCardElement(type, interactive ? { keyIndex: index } : {});
    if (interactive) {
      const affordable = state.player.energy >= type.cost;
      const resonant = state.player.suitsPlayed.includes(type.suit);
      el.classList.add(affordable ? 'playable' : 'unaffordable');
      if (resonant) el.classList.add('resonant-glow');
      el.addEventListener('click', () => onPlay(id, el));
    }
    container.appendChild(el);
  });
}

/** Full re-render of the table from state. */
export function render(state, onPlay) {
  const { player, enemy } = state;

  els.enemyHpFill.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
  els.enemyHpText.textContent = `${enemy.hp} / ${enemy.maxHp}`;
  els.enemyShield.textContent = enemy.shield;
  els.enemyScore.textContent = scoreOf(state, 'enemy');

  els.playerHpFill.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
  els.playerHpText.textContent = `${player.hp} / ${player.maxHp}`;
  els.playerShield.textContent = player.shield;
  els.playerScore.textContent = scoreOf(state, 'player');
  els.playerDeck.textContent = player.deck.length;
  els.playerDiscard.textContent = player.discard.length;

  els.energyPips.replaceChildren();
  for (let i = 0; i < player.maxEnergy; i += 1) {
    const pip = document.createElement('span');
    pip.className = `pip${i < player.energy ? ' full' : ''}`;
    els.energyPips.appendChild(pip);
  }

  const suits = player.suitsPlayed.map((suit) => `${SUITS[suit].glyph} ${SUITS[suit].name}`).join(' · ');
  els.resonanceNote.textContent = player.suitsPlayed.length > 0 ? `Suits this turn: ${suits}` : '';
  els.triadNote.textContent = player.triadAwarded ? '✦ Triad complete — drew a card!' : player.suitsPlayed.length === 2 ? 'One more suit for a Triad draw…' : '';

  els.turnBanner.textContent =
    state.phase === 'won' ? 'Victory!' :
    state.phase === 'lost' ? 'Defeat' :
    state.turn === 'player' ? 'Your turn' : "Vex's turn…";
  els.endTurn.disabled = state.phase !== 'play' || state.turn !== 'player';

  renderHand(els.enemyHand, enemy.hand, false, state, null);
  renderHand(els.playerHand, player.hand, true, state, onPlay);

  els.log.replaceChildren();
  state.log.slice(0, 8).forEach((line) => {
    const li = document.createElement('li');
    li.textContent = line;
    els.log.appendChild(li);
  });

  els.titleScreen.hidden = state.phase !== 'title';
  els.winScreen.hidden = state.phase !== 'won';
  els.lossScreen.hidden = state.phase !== 'lost';
  if (state.phase === 'won') {
    els.winStats.textContent = `Finished in ${state.turnNumber} turns · Score ${scoreOf(state, 'player')} · Vex dealt ${30 - state.player.hp} damage to you.`;
  }
  if (state.phase === 'lost') {
    els.lossStats.textContent = `Lasted ${state.turnNumber} turns · Score ${scoreOf(state, 'player')} · You dealt ${30 - state.enemy.hp} damage to Vex.`;
  }
}

/** Show Vex's announced intent on the table. */
export function showIntent(text) {
  els.enemyIntent.textContent = text;
}

/** Clear the intent banner when the turn changes. */
export function clearIntent() {
  els.enemyIntent.textContent = '';
}

/** A floating number over a fighter row: damage, healing or shield. */
export function floatText(text, kind, sideName) {
  const anchor = sideName === 'player' ? els.playerHpFill : els.enemyHpFill;
  const rect = anchor.getBoundingClientRect();
  const span = document.createElement('span');
  span.className = `float-num ${kind}`;
  span.textContent = text;
  span.style.left = `${rect.left + rect.width / 2 - 20}px`;
  span.style.top = `${rect.top - 10}px`;
  els.floatLayer.appendChild(span);
  window.setTimeout(() => span.remove(), 1200);
}

/** Brief red flash on a fighter row when it takes damage. */
export function flashSide(sideName) {
  const row = sideName === 'player' ? document.querySelector('.player-side .fighter') : document.querySelector('.enemy-side .fighter');
  if (!row) return;
  row.classList.remove('flash');
  void row.offsetWidth;
  row.classList.add('flash');
}
