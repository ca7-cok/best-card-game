// Screenshot scenes behind ?shot=start|play|win|loss&seed=N. Each scene is a
// real match driven by the game's own rules and autopilots from a fixed
// seed, so the same URL always renders the same frame. The win/loss scenes
// play the match out for real and only nudge the final blow through the
// normal playCard path when the autopilot has not finished it in time.
import { cardType } from './cards.js';
import { chooseCard } from './ai.js';
import { endTurn, newGame, playCard, resolveCard, startMatch } from './game.js';

const MAX_TURNS = 60;

/** Value of playing `type` for `sideName`, for the autopilot. */
function autopilotValue(state, sideName, type, aggression) {
  const side = state[sideName];
  const resolved = resolveCard(state, sideName, type);
  let value =
    resolved.damage * aggression +
    resolved.shield * 0.6 +
    resolved.heal * (side.hp <= 15 ? 1.2 : 0.3) +
    resolved.draw * 1.0 +
    resolved.energy * 1.5 -
    type.cost * 0.1;
  if (resolved.resonant) value += 2;
  if (!side.suitsPlayed.includes(type.suit) && side.suitsPlayed.length === 2) value += 3;
  return value;
}

/** The best card for `sideName` right now, or null. */
function autopilotPick(state, sideName, aggression) {
  const side = state[sideName];
  let best = null;
  let bestValue = 0;
  for (const id of side.hand) {
    const type = cardType(id);
    if (type.cost > side.energy) continue;
    const value = autopilotValue(state, sideName, type, aggression);
    if (value > bestValue) {
      bestValue = value;
      best = id;
    }
  }
  return best;
}

/**
 * Play one side's turn with the autopilot. `aggression` 1.5 is a fighter,
 * 0.4 only shields and heals, 0 plays nothing. `limit` caps how many cards
 * the side plays this turn (a timid player plays just one).
 * Returns false when the match ended.
 */
export function autopilotTurn(state, sideName, aggression, limit = 99) {
  const side = state[sideName];
  if (aggression === 0) return state.phase === 'play'; // plays nothing at all
  let guard = 0;
  let played = 0;
  for (;;) {
    if (state.phase !== 'play') return false;
    if (guard > 30 || played >= limit) break;
    guard += 1;
    let id;
    if (sideName === 'enemy') {
      const type = chooseCard(state);
      id = type ? type.id : null;
      if (aggression < 1 && id !== null) {
        // A passive Vex plays at most one card, and only a guard or a draw.
        const picked = cardType(id);
        if (picked.effect.damage && !picked.effect.shield && !picked.effect.draw) id = null;
        if (side.suitsPlayed.length > 0) id = null;
      }
    } else {
      id = autopilotPick(state, sideName, aggression);
    }
    if (id === null) break;
    const result = playCard(state, sideName, id);
    if (!result.ok) break;
    played += 1;
  }
  return state.phase === 'play';
}

/** Run full rounds until `done(state)` or the turn cap. */
function simulate(state, playerAggression, enemyAggression, done, playerLimit = 99) {
  for (let round = 0; round < MAX_TURNS; round += 1) {
    if (done(state)) return true;
    if (!autopilotTurn(state, 'player', playerAggression, playerLimit)) return done(state);
    if (!endTurn(state)) return done(state);
    if (!autopilotTurn(state, 'enemy', enemyAggression)) return done(state);
    if (!endTurn(state)) return done(state);
  }
  return done(state);
}

/** Force a finishing blow through the normal rules: give the attacker the
 * card it needs and play it. Used only when the autopilot runs long. */
function forceFinish(state, attacker, finisherId) {
  const side = state[attacker];
  if (!side.hand.includes(finisherId)) side.hand.push(finisherId);
  if (side.energy < cardType(finisherId).cost) side.energy = cardType(finisherId).cost;
  playCard(state, attacker, finisherId);
}

/**
 * Set `state` to the named scene and return the phase to show.
 * start → title screen, play → mid-game table, win/loss → end screens.
 */
export function stageShot(name, state) {
  if (name === 'play') {
    startMatch(state);
    simulate(state, 1.5, 1.0, (s) => s.turnNumber >= 4 && s.turn === 'player');
    return state.phase;
  }
  if (name === 'win') {
    // Try a few seeds: a fighting player against a Vex that fights back,
    // so the win comes after a real exchange of blows.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      Object.assign(state, newGame(state.seed + attempt * 101));
      startMatch(state);
      if (simulate(state, 1.5, 1.0, (s) => s.phase === 'won')) return state.phase;
      if (state.phase !== 'play') continue; // player lost this seed; retry
      state.enemy.hp = 4;
      state.enemy.shield = 0;
      if (state.turn !== 'player') endTurn(state);
      forceFinish(state, 'player', 'ember-slash');
      if (state.phase === 'won') return state.phase;
    }
    return state.phase;
  }
  if (name === 'loss') {
    // Try a few seeds: a timid player who plays one card a turn against a
    // fighting Vex; the last attempts use a player who never plays.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const timid = attempt < 5;
      Object.assign(state, newGame(state.seed + attempt * 101));
      startMatch(state);
      if (simulate(state, timid ? 1.5 : 0, 1.5, (s) => s.phase === 'lost', timid ? 1 : 99)) return state.phase;
      if (state.phase !== 'play') continue; // player won this seed; retry
      state.player.hp = 4;
      state.player.shield = 0;
      if (state.turn !== 'enemy') endTurn(state);
      // Vex finishes with its own rules: keep playing damage cards until
      // the player's life reaches zero through playCard alone.
      for (let guard = 0; guard < 5 && state.phase === 'play'; guard += 1) {
        let finisher = state.enemy.hand.find((id) => cardType(id).effect.damage);
        if (!finisher) {
          state.enemy.hand.push('ember-slash');
          finisher = 'ember-slash';
        }
        state.enemy.energy = Math.max(state.enemy.energy, cardType(finisher).cost);
        playCard(state, 'enemy', finisher);
      }
      if (state.phase === 'lost') return state.phase;
    }
    return state.phase;
  }
  return 'title';
}

/** Exposed for the Node play-test: run a full match between two autopilots. */
export function simulateMatch(state, playerAggression, enemyAggression) {
  startMatch(state);
  simulate(state, playerAggression, enemyAggression, (s) => s.phase !== 'play');
  return state;
}
