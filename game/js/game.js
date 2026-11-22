// The rules engine of AETHERFALL: pure logic, no DOM, so it can be tested
// in Node and driven by the renderer, the AI and the screenshot stager alike.
import { SUITS, cardType, describeEffect } from './cards.js';
import { drawCards, newDeck, takeFromHand } from './deck.js';
import { createRng } from './rng.js';

export const MAX_HP = 30;
export const MAX_ENERGY = 10;
export const OPENING_HAND = 5;
export const DRAW_PER_TURN = 2;

/** A fresh match, waiting on the title screen. */
export function newGame(seed) {
  const rng = createRng(seed);
  const side = () => ({
    hp: MAX_HP,
    maxHp: MAX_HP,
    shield: 0,
    energy: 0,
    maxEnergy: 0,
    deck: newDeck(rng),
    hand: [],
    discard: [],
    suitsPlayed: [],
    triadAwarded: false,
    turnCount: 0,
  });
  return {
    rng,
    seed,
    phase: 'title', // title | play | won | lost
    turn: 'player',
    turnNumber: 0,
    player: side(),
    enemy: side(),
    log: [],
    lastEvents: [],
    winner: null,
  };
}

/** Deal opening hands and start the player's first turn. */
export function startMatch(state) {
  drawCards(state.player, OPENING_HAND, state.rng);
  drawCards(state.enemy, OPENING_HAND, state.rng);
  state.phase = 'play';
  state.turn = 'player';
  state.turnNumber = 1;
  beginTurn(state, 'player');
  log(state, 'The duel begins. Your move, Sigilkeeper.');
  return state;
}

/** Refill energy, draw, and reset the per-turn combo trackers. */
export function beginTurn(state, sideName) {
  const side = state[sideName];
  side.turnCount += 1;
  side.maxEnergy = Math.min(3 + (side.turnCount - 1), MAX_ENERGY);
  side.energy = side.maxEnergy;
  side.suitsPlayed = [];
  side.triadAwarded = false;
  if (side.turnCount > 1) drawCards(side, DRAW_PER_TURN, state.rng);
}

/** Resolve a card's numbers, including Resonance and Flame Surge's count. */
export function resolveCard(state, sideName, type) {
  const side = state[sideName];
  const resonant = side.suitsPlayed.includes(type.suit);
  const resolved = {
    damage: type.effect.damage || 0,
    shield: type.effect.shield || 0,
    heal: type.effect.heal || 0,
    draw: type.effect.draw || 0,
    energy: type.effect.energy || 0,
    hits: type.effect.hits || 1,
    breakShield: type.effect.breakShield || 0,
    resonant,
  };
  if (type.effect.perFlame) {
    const flames = side.suitsPlayed.filter((suit) => suit === 'flame').length;
    resolved.damage += type.effect.perFlame * flames;
  }
  if (resonant && type.resonance) {
    resolved.damage += type.resonance.damage || 0;
    resolved.shield += type.resonance.shield || 0;
    resolved.heal += type.resonance.heal || 0;
    resolved.draw += type.resonance.draw || 0;
    resolved.energy += type.resonance.energy || 0;
  }
  return resolved;
}

/** Shield soaks damage first; the rest hits life. Returns hp actually lost. */
export function applyDamage(state, targetName, amount) {
  const target = state[targetName];
  let remaining = amount;
  if (target.shield > 0) {
    const soaked = Math.min(target.shield, remaining);
    target.shield -= soaked;
    remaining -= soaked;
  }
  const lost = Math.min(target.hp, remaining);
  target.hp -= lost;
  return lost;
}

/**
 * Play one card from `sideName`'s hand. Returns { ok, events } — events are
 * plain objects the renderer and sound engine consume. Illegal plays return
 * ok:false with a reason and change nothing.
 */
export function playCard(state, sideName, cardId) {
  const side = state[sideName];
  const foe = state[sideName === 'player' ? 'enemy' : 'player'];
  const type = cardType(cardId);
  if (state.phase !== 'play') return { ok: false, reason: 'the match is over', events: [] };
  if (!type) return { ok: false, reason: 'unknown card', events: [] };
  if (!side.hand.includes(cardId)) return { ok: false, reason: 'not in hand', events: [] };
  if (side.energy < type.cost) return { ok: false, reason: 'not enough energy', events: [] };

  const resolved = resolveCard(state, sideName, type);
  side.energy -= type.cost;
  takeFromHand(side, cardId);
  side.discard.push(cardId);
  if (!side.suitsPlayed.includes(type.suit)) side.suitsPlayed.push(type.suit);

  const who = sideName === 'player' ? 'You' : 'Vex';
  const events = [{ type: 'played', side: sideName, card: type, resonant: resolved.resonant }];
  log(state, `${who} play${sideName === 'player' ? '' : 's'} ${type.name} — ${describeEffect(type, resolved)}${resolved.resonant ? ' (Resonance!)' : ''}.`);

  if (resolved.breakShield > 0 && foe.shield > 0) {
    const broken = Math.min(foe.shield, resolved.breakShield);
    foe.shield -= broken;
    events.push({ type: 'break', side: sideName, amount: broken });
    log(state, `Quake shatters ${broken} enemy shield.`);
  }
  for (let hit = 0; hit < resolved.hits; hit += 1) {
    if (resolved.damage > 0) {
      const lost = applyDamage(state, sideName === 'player' ? 'enemy' : 'player', resolved.damage);
      events.push({ type: 'damage', side: sideName, amount: resolved.damage, lost });
      if (lost > 0) log(state, `${foe === state.player ? 'You take' : 'Vex takes'} ${lost} damage.`);
    }
  }
  if (resolved.shield > 0) {
    side.shield += resolved.shield;
    events.push({ type: 'shield', side: sideName, amount: resolved.shield });
  }
  if (resolved.heal > 0) {
    const healed = Math.min(side.maxHp - side.hp, resolved.heal);
    side.hp += healed;
    events.push({ type: 'heal', side: sideName, amount: healed });
  }
  if (resolved.energy > 0) {
    side.energy = Math.min(side.maxEnergy + 2, side.energy + resolved.energy);
    events.push({ type: 'energy', side: sideName, amount: resolved.energy });
  }
  if (resolved.draw > 0) {
    const drawn = drawCards(side, resolved.draw, state.rng);
    events.push({ type: 'draw', side: sideName, amount: drawn.length });
  }
  if (!side.triadAwarded && side.suitsPlayed.length >= 3) {
    side.triadAwarded = true;
    const drawn = drawCards(side, 1, state.rng);
    events.push({ type: 'triad', side: sideName, amount: drawn.length });
    log(state, `${who} complete${sideName === 'player' ? '' : 's'} a Triad — three suits in one turn! Draw 1 card.`);
  }

  checkEnd(state);
  state.lastEvents = events;
  return { ok: true, events };
}

/** End the current side's turn and hand over to the other side. */
export function endTurn(state) {
  if (state.phase !== 'play') return false;
  state.turn = state.turn === 'player' ? 'enemy' : 'player';
  if (state.turn === 'player') state.turnNumber += 1;
  beginTurn(state, state.turn);
  log(state, state.turn === 'player' ? 'Your turn.' : "Vex's turn.");
  return true;
}

/** Set phase to won/lost when a life total reaches zero. */
export function checkEnd(state) {
  if (state.enemy.hp <= 0 && state.player.hp <= 0) {
    state.phase = 'won';
    state.winner = 'player';
    log(state, 'Both sigils shatter — but yours burns brighter. You win!');
  } else if (state.enemy.hp <= 0) {
    state.phase = 'won';
    state.winner = 'player';
    log(state, 'Vex’s sigil shatters. You win the duel!');
  } else if (state.player.hp <= 0) {
    state.phase = 'lost';
    state.winner = 'enemy';
    log(state, 'Your sigil shatters. Vex wins the duel.');
  }
}

/** Append a line to the match log, newest first, capped at 30 lines. */
export function log(state, text) {
  state.log.unshift(text);
  if (state.log.length > 30) state.log.length = 30;
}

/** The score shown on the table: damage dealt, plus life still standing. */
export function scoreOf(state, sideName) {
  const side = state[sideName];
  const foe = state[sideName === 'player' ? 'enemy' : 'player'];
  return (foe.maxHp - foe.hp) * 10 + Math.max(0, side.hp);
}

/** Suit glyph + colour for a suit id, for cards and the legend. */
export function suitInfo(suit) {
  return SUITS[suit];
}
