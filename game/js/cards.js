// The card catalogue of AETHERFALL: every card is an original design.
// Suits are told apart by BOTH colour and shape, never by text alone:
//   flame  ▲  red     — raw damage
//   tide   ●  blue    — shields and healing
//   gale   ◆  green   — quick strikes that draw
//   stone  ■  amber   — heavy blows that break shields
//   star   ✦  violet  — rare aether tricks
//
// Resonance: the second (and later) card of a suit you play in one turn
// gains its resonance bonus. Triad: playing three different suits in one
// turn draws you a card at once. Combos are the heart of the game.
export const SUITS = {
  flame: { name: 'Flame', glyph: '▲', color: '#e5484d', dark: '#8f1d22' },
  tide: { name: 'Tide', glyph: '●', color: '#3e9bff', dark: '#144a7d' },
  gale: { name: 'Gale', glyph: '◆', color: '#46c98a', dark: '#14532f' },
  stone: { name: 'Stone', glyph: '■', color: '#f5a524', dark: '#7a4d05' },
  star: { name: 'Star', glyph: '✦', color: '#b07cff', dark: '#4c2a86' },
};

// effect: { damage, shield, heal, draw, energy, hits, breakShield, perFlame }
// resonance: the bonus the card gains when it is not the first of its suit
// played this turn. `text` is what the card shows; `resonanceText` its bonus.
export const CARD_TYPES = [
  {
    id: 'ember-slash', name: 'Ember Slash', suit: 'flame', cost: 2,
    effect: { damage: 5 },
    resonance: { damage: 2 },
    text: 'Deal 5 damage.',
    resonanceText: 'Resonance: +2 damage.',
  },
  {
    id: 'flame-surge', name: 'Flame Surge', suit: 'flame', cost: 3,
    effect: { damage: 3, perFlame: 2 },
    resonance: { damage: 2 },
    text: 'Deal 3 damage, +2 for each Flame played this turn.',
    resonanceText: 'Resonance: +2 damage.',
  },
  {
    id: 'spark', name: 'Spark', suit: 'flame', cost: 0,
    effect: { damage: 1 },
    resonance: { draw: 1 },
    text: 'Deal 1 damage. Free.',
    resonanceText: 'Resonance: draw 1 card.',
  },
  {
    id: 'tide-ward', name: 'Tide Ward', suit: 'tide', cost: 2,
    effect: { shield: 7 },
    resonance: { shield: 3 },
    text: 'Gain 7 shield.',
    resonanceText: 'Resonance: +3 shield.',
  },
  {
    id: 'healing-spring', name: 'Healing Spring', suit: 'tide', cost: 3,
    effect: { heal: 6, draw: 1 },
    resonance: { heal: 3 },
    text: 'Restore 6 life. Draw 1 card.',
    resonanceText: 'Resonance: +3 healing.',
  },
  {
    id: 'gale-dart', name: 'Gale Dart', suit: 'gale', cost: 1,
    effect: { damage: 2, draw: 1 },
    resonance: { damage: 2 },
    text: 'Deal 2 damage. Draw 1 card.',
    resonanceText: 'Resonance: +2 damage.',
  },
  {
    id: 'thorn-volley', name: 'Thorn Volley', suit: 'gale', cost: 2,
    effect: { damage: 2, hits: 2 },
    resonance: { damage: 2 },
    text: 'Deal 2 damage, twice.',
    resonanceText: 'Resonance: +2 damage per hit.',
  },
  {
    id: 'stone-fist', name: 'Stone Fist', suit: 'stone', cost: 3,
    effect: { damage: 6, shield: 2 },
    resonance: { damage: 2 },
    text: 'Deal 6 damage. Gain 2 shield.',
    resonanceText: 'Resonance: +2 damage.',
  },
  {
    id: 'quake', name: 'Quake', suit: 'stone', cost: 4,
    effect: { damage: 8, breakShield: 5 },
    resonance: { damage: 3 },
    text: 'Break 5 enemy shield, then deal 8 damage.',
    resonanceText: 'Resonance: +3 damage.',
  },
  {
    id: 'channel', name: 'Channel', suit: 'star', cost: 1,
    effect: { energy: 2 },
    resonance: { energy: 1 },
    text: 'Gain 2 energy this turn.',
    resonanceText: 'Resonance: +1 energy.',
  },
  {
    id: 'mirror-sigil', name: 'Mirror Sigil', suit: 'star', cost: 2,
    effect: { shield: 5, draw: 1 },
    resonance: { shield: 3 },
    text: 'Gain 5 shield. Draw 1 card.',
    resonanceText: 'Resonance: +3 shield.',
  },
  {
    id: 'nova', name: 'Nova', suit: 'star', cost: 5,
    effect: { damage: 10 },
    resonance: { damage: 4 },
    text: 'Deal 10 damage.',
    resonanceText: 'Resonance: +4 damage.',
  },
];

/** Look a card type up by id. */
export function cardType(id) {
  return CARD_TYPES.find((type) => type.id === id);
}

/** The 24-card deck: two copies of every type. */
export function buildDeckList() {
  const list = [];
  for (const type of CARD_TYPES) {
    list.push(type.id, type.id);
  }
  return list;
}

/** One-line summary of a card's effect, for the log and the AI. */
export function describeEffect(type, resolved) {
  const parts = [];
  if (resolved.damage) parts.push(`deals ${resolved.damage}`);
  if (resolved.shield) parts.push(`gains ${resolved.shield} shield`);
  if (resolved.heal) parts.push(`heals ${resolved.heal}`);
  if (resolved.draw) parts.push(`draws ${resolved.draw}`);
  if (resolved.energy) parts.push(`gains ${resolved.energy} energy`);
  return parts.join(', ') || 'does nothing';
}
