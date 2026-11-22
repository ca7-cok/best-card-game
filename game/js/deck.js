// Deck, hand and discard pile: pure data, no DOM.
import { buildDeckList, cardType } from './cards.js';
import { shuffle } from './rng.js';

export const HAND_LIMIT = 8;

/** A fresh shuffled deck of card ids. */
export function newDeck(rng) {
  return shuffle(buildDeckList(), rng);
}

/**
 * Draw `count` cards from `pile.deck` into `pile.hand`, reshuffling the
 * discard pile when the deck runs out. Returns the drawn card ids.
 */
export function drawCards(pile, count, rng) {
  const drawn = [];
  for (let i = 0; i < count; i += 1) {
    if (pile.hand.length >= HAND_LIMIT) break;
    if (pile.deck.length === 0) {
      if (pile.discard.length === 0) break;
      pile.deck = shuffle(pile.discard, rng);
      pile.discard = [];
    }
    const id = pile.deck.pop();
    pile.hand.push(id);
    drawn.push(id);
  }
  return drawn;
}

/** Remove one copy of `id` from the hand; true when it was there. */
export function takeFromHand(pile, id) {
  const index = pile.hand.indexOf(id);
  if (index === -1) return false;
  pile.hand.splice(index, 1);
  return true;
}

/** Human-readable hand, e.g. "Ember Slash, Spark". */
export function handNames(pile) {
  return pile.hand.map((id) => cardType(id).name);
}
