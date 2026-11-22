// Vex, the AI opponent. Its policy is deliberately readable so a player can
// counter it: it announces an intent at the start of its turn, then plays
// greedily toward that intent. Open hands mean you always see what it holds.
import { cardType } from './cards.js';
import { resolveCard } from './game.js';

/**
 * What Vex plans to do this turn, shown on the table before it acts:
 *  - defend  — life is low, it will shield and heal
 *  - finish  — it can end the duel this turn, it will strike
 *  - attack  — otherwise, it presses damage
 */
export function planIntent(state) {
  const vex = state.enemy;
  const you = state.player;
  const lethal = affordableDamage(state, vex) >= you.hp + you.shield;
  if (lethal) return 'finish';
  if (vex.hp <= 12) return 'defend';
  return 'attack';
}

/** Total damage Vex could deal this turn with the energy it has. */
export function affordableDamage(state, vex) {
  let energy = vex.energy;
  let total = 0;
  const playable = vex.hand
    .map((id) => ({ id, type: cardType(id) }))
    .filter((entry) => (entry.type.effect.damage || 0) > 0)
    .sort((a, b) => b.type.cost - a.type.cost);
  const suits = [];
  for (const entry of playable) {
    if (energy < entry.type.cost) continue;
    energy -= entry.type.cost;
    const fake = { ...state, enemy: { ...vex, suitsPlayed: suits.slice() } };
    total += resolveCard(fake, 'enemy', entry.type).damage;
    suits.push(entry.type.suit);
  }
  return total;
}

/**
 * Pick the next card for Vex to play, or null when it should stop.
 * The ranking is the readable part: defend values shields and healing,
 * attack values damage per energy, and a card that completes a Resonance
 * or a Triad is always worth more — the same combos you chase.
 */
export function chooseCard(state) {
  const vex = state.enemy;
  const intent = planIntent(state);
  const options = vex.hand
    .map((id) => cardType(id))
    .filter((type) => type.cost <= vex.energy)
    .map((type) => ({ type, value: scoreCard(state, type, intent) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);
  return options.length > 0 ? options[0].type : null;
}

function scoreCard(state, type, intent) {
  const vex = state.enemy;
  const you = state.player;
  const resolved = resolveCard(state, 'enemy', type);
  let value = 0;
  const damageValue = resolved.damage * (you.shield > 0 ? 0.7 : 1);
  const shieldValue = resolved.shield * (vex.hp <= 12 ? 1.4 : 0.7);
  const healValue = resolved.heal * (vex.hp <= 15 ? 1.5 : 0.4);
  if (intent === 'defend') {
    value = shieldValue + healValue + damageValue * 0.4 + resolved.draw * 1.2 + resolved.energy * 1.5;
  } else if (intent === 'finish') {
    value = damageValue * 3 + resolved.energy * 2 + resolved.draw * 0.5;
  } else {
    value = damageValue + shieldValue * 0.5 + healValue * 0.3 + resolved.draw * 1.5 + resolved.energy * 1.8;
  }
  if (resolved.resonant) value += 2.5; // Resonance is always worth chasing
  if (!vex.suitsPlayed.includes(type.suit) && vex.suitsPlayed.length === 2) value += 3; // completes a Triad
  if (type.cost === 0) value += 0.5; // free cards are never wasted
  return value - type.cost * 0.15;
}

/** The intent banner text, so the player can read and counter Vex. */
export function intentText(intent) {
  if (intent === 'finish') return '⚠ Vex smells blood — a finishing blow is coming. Shield up!';
  if (intent === 'defend') return 'Vex falls back to guard — shields and healing ahead.';
  return 'Vex presses the attack — expect damage.';
}
