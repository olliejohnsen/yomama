/**
 * battleService.js
 * Pure battle game logic for the Socket.io server.
 * No I/O dependencies — only receives data, returns results.
 */

const CRIT_KEYWORDS = ['fat', 'ugly', 'stupid', 'old', 'poor', 'nasty', 'dumb', 'smell'];
const BASE_DAMAGE_MIN = 10;
const BASE_DAMAGE_RANGE = 20;
const CRIT_MULTIPLIER = 1.5;
const RANDOM_CRIT_CHANCE = 0.1;

/**
 * Calculate damage from a joke, including crit detection.
 * @param {string} joke
 * @returns {{ damage: number, isCrit: boolean }}
 */
function calculateDamage(joke) {
  const base = Math.floor(Math.random() * BASE_DAMAGE_RANGE) + BASE_DAMAGE_MIN;
  const hasKeyword = CRIT_KEYWORDS.some(kw => joke.toLowerCase().includes(kw));
  const randomCrit = Math.random() < RANDOM_CRIT_CHANCE;
  const isCrit = hasKeyword || randomCrit;
  return {
    damage: isCrit ? Math.floor(base * CRIT_MULTIPLIER) : base,
    isCrit,
  };
}

/**
 * Create a new battle object for two matched players.
 * @param {{ id: string, region: string }} playerA - First player (started waiting)
 * @param {{ id: string, region: string }} playerB - Second player (joined)
 * @returns {object} battle state
 */
function createBattle(playerA, playerB) {
  const id = `battle_${playerA.id}_${playerB.id}`;
  return {
    id,
    status: 'active',
    turn: playerA.id,
    players: [
      { id: playerA.id, region: playerA.region, hp: 100 },
      { id: playerB.id, region: playerB.region, hp: 100 },
    ],
  };
}

/**
 * Apply a joke to the battle state, mutating the target player's HP.
 * Returns { damage, isCrit, isFinished, winnerId }.
 * @param {object} battle - Mutable battle object from activeBattles
 * @param {string} attackerId
 * @param {string} joke
 * @returns {{ damage: number, isCrit: boolean, isFinished: boolean, winnerId: string|null }}
 */
function applyJoke(battle, attackerId, joke) {
  const { damage, isCrit } = calculateDamage(joke);
  const target = battle.players.find(p => p.id !== attackerId);

  target.hp = Math.max(0, target.hp - damage);
  battle.turn = target.id;

  const isFinished = target.hp <= 0;
  if (isFinished) battle.status = 'finished';

  return { damage, isCrit, isFinished, winnerId: isFinished ? attackerId : null };
}

module.exports = { calculateDamage, createBattle, applyJoke };
