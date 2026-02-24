/**
 * GameService
 * Encapsulates all game mechanics: damage calculation, crit detection,
 * battle state mutations, and win condition checks.
 */

export interface Player {
  id: string;
  region: string;
  hp: number;
  isBoss?: boolean;
}

export interface BattleState {
  id: string | null;
  status: 'idle' | 'searching' | 'active' | 'finished';
  players: Player[];
  turn: string | null;
  lastJoke: string;
  damageTaken: number;
  winnerId: string | null;
  isCrit?: boolean;
}

export interface DamageResult {
  damage: number;
  isCrit: boolean;
}

const CRIT_KEYWORDS = ['fat', 'ugly', 'stupid', 'old', 'poor', 'nasty', 'dumb', 'smell'];
const BASE_DAMAGE_MIN = 15;
const BASE_DAMAGE_RANGE = 20;
const CRIT_MULTIPLIER = 1.5;
const RANDOM_CRIT_CHANCE = 0.1;

export function calculateDamage(joke: string): DamageResult {
  const base = Math.floor(Math.random() * BASE_DAMAGE_RANGE) + BASE_DAMAGE_MIN;

  const hasKeyword = CRIT_KEYWORDS.some(keyword =>
    joke.toLowerCase().includes(keyword)
  );
  const randomCrit = Math.random() < RANDOM_CRIT_CHANCE;
  const isCrit = hasKeyword || randomCrit;

  const damage = isCrit ? Math.floor(base * CRIT_MULTIPLIER) : base;
  return { damage, isCrit };
}

export function applyDamageToState(prev: BattleState, attackerId: string, joke: string): BattleState {
  const { damage, isCrit } = calculateDamage(joke);

  const attackerIdx = prev.players.findIndex(p => p.id === attackerId);
  const defenderIdx = 1 - attackerIdx;
  const newPlayers = prev.players.map((p, i) =>
    i === defenderIdx
      ? { ...p, hp: Math.max(0, p.hp - damage) }
      : p
  );

  const isFinished = newPlayers[defenderIdx].hp <= 0;

  return {
    ...prev,
    players: newPlayers,
    turn: isFinished ? null : newPlayers[defenderIdx].id,
    lastJoke: joke,
    damageTaken: damage,
    status: isFinished ? 'finished' : 'active',
    winnerId: isFinished ? newPlayers[attackerIdx].id : null,
    isCrit,
  };
}

export function createInitialBattleState(): BattleState {
  return {
    id: null,
    status: 'idle',
    players: [],
    turn: null,
    lastJoke: '',
    damageTaken: 0,
    winnerId: null,
    isCrit: false,
  };
}

export function createLocalBattle(playerRegion: string, opponentRegion: string): BattleState {
  return {
    id: 'local',
    status: 'active',
    players: [
      { id: 'player1', region: playerRegion, hp: 100 },
      { id: 'boss', region: opponentRegion, hp: 100, isBoss: true },
    ],
    turn: 'player1',
    lastJoke: '',
    damageTaken: 0,
    winnerId: null,
    isCrit: false,
  };
}

export function isPlayerTurn(battle: BattleState, playerId: string): boolean {
  return battle.turn === playerId && battle.status === 'active';
}
