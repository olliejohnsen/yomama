'use client';

/**
 * useBattle Hook
 * Orchestrates all services (game, socket, ollama, audio) into a single
 * battle state management hook consumed by BattleArena UI.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BattleState,
  createInitialBattleState,
  createLocalBattle,
  applyDamageToState,
} from '@/services/gameService';
import { generateJoke, isRefusal } from '@/services/ollamaService';
import { socketService } from '@/services/socketService';
import { audioService } from '@/services/audioService';

export type BattleMode = 'local' | 'multiplayer';

export interface JokeLogEntry {
  id: string;
  attackerRegion: string;
  targetRegion: string;
  joke: string;
  damage: number;
  isCrit: boolean;
}

export function useBattle() {
  const [mode, setMode] = useState<BattleMode>('local');
  const [battle, setBattle] = useState<BattleState>(createInitialBattleState());
  const [jokeLog, setJokeLog] = useState<JokeLogEntry[]>([]);
  const [jokeChoices, setJokeChoices] = useState<string[]>([]);
  // Streaming drafts for in-progress choice slots (index = slot 0/1/2)
  const [jokeChoiceDrafts, setJokeChoiceDrafts] = useState<string[]>(['', '', '']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [socketId, setSocketId] = useState<string | undefined>(undefined);

  const attackerRegionRef = useRef<string>('');
  // Synced ref so we can read current battle state outside setState callbacks
  const battleRef = useRef<BattleState>(battle);
  useEffect(() => { battleRef.current = battle; }, [battle]);

  const appendLog = useCallback((entry: Omit<JokeLogEntry, 'id'>) => {
    setJokeLog(prev => [{ ...entry, id: `${Date.now()}-${Math.random()}` }, ...prev]);
  }, []);

  // ---- Multiplayer Socket Setup ----
  useEffect(() => {
    if (mode !== 'multiplayer') return;

    const socket = socketService.connect({
      onMatchFound: (data) => {
        setBattle(prev => ({
          ...prev,
          id: data.id,
          status: 'active',
          players: data.players,
          turn: data.turn,
        }));
        setSocketId(socket.id);
      },
      onBattleUpdate: (data) => {
        setBattle(prev => ({
          ...prev,
          players: data.battle.players,
          turn: data.battle.turn,
          lastJoke: data.lastJoke,
          damageTaken: data.damage,
          isCrit: data.isCrit,
        }));
        audioService.play(data.isCrit ? 'crit' : 'hit');
        const attacker = data.battle.players.find((p: { id: string }) => p.id === data.attackerId);
        const target = data.battle.players.find((p: { id: string }) => p.id !== data.attackerId);
        if (attacker && target) {
          appendLog({
            attackerRegion: attacker.region,
            targetRegion: target.region,
            joke: data.lastJoke,
            damage: data.damage,
            isCrit: data.isCrit,
          });
        }
      },
      onBattleFinished: (data) => {
        setBattle(prev => ({ ...prev, status: 'finished', winnerId: data.winnerId }));
        audioService.play('win');
      },
    });

    setSocketId(socket.id);
    return () => { socketService.disconnect(); };
  }, [mode]);

  // ---- Sync mute state with audio service ----
  const toggleMute = useCallback(() => {
    setIsMuted(audioService.toggle());
  }, []);

  // ---- Apply a chosen joke to local battle state ----
  const applyLocalJoke = useCallback((joke: string) => {
    const prev = battleRef.current;
    const attacker = prev.players.find(p => p.id === prev.turn);
    const target = prev.players.find(p => p.id !== prev.turn);
    const next = applyDamageToState(prev, prev.turn!, joke);

    setBattle(next);
    audioService.play(next.isCrit ? 'crit' : next.status === 'finished' ? 'win' : 'hit');

    if (attacker && target) {
      appendLog({
        attackerRegion: attacker.region,
        targetRegion: target.region,
        joke,
        damage: next.damageTaken,
        isCrit: next.isCrit ?? false,
      });
    }
  }, [appendLog]);

  // ---- Player picks from joke choices ----
  const selectJoke = useCallback((joke: string) => {
    setJokeChoices([]);
    if (mode === 'multiplayer' && battleRef.current.id) {
      setBattle(prev => ({ ...prev, lastJoke: joke }));
      socketService.submitJoke(battleRef.current.id!, joke);
    } else {
      applyLocalJoke(joke);
    }
  }, [mode, applyLocalJoke]);

  // ---- Generate 3 joke choices for the player (parallel + streaming) ----
  const requestChoices = useCallback(async (targetRegion: string, attackerRegion?: string) => {
    setIsGenerating(true);
    setJokeChoices([]);
    setJokeChoiceDrafts(['', '', '']);
    setError(null);

    const attacker = attackerRegion ?? attackerRegionRef.current;

    const updateDraft = (slot: number, text: string) =>
      setJokeChoiceDrafts(prev => { const d = [...prev]; d[slot] = text; return d; });

    // Each slot streams independently and retries on refusal
    const generateSlot = async (slot: number) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        updateDraft(slot, '');
        try {
          const joke = await generateJoke({
            targetRegion,
            attackerRegion: attacker,
            onChunk: (partial) => updateDraft(slot, partial),
          });
          if (!isRefusal(joke) && joke.trim().length > 10) {
            setJokeChoices(prev => [...prev, joke.trim()]);
            updateDraft(slot, '');
            return;
          }
        } catch { /* retry */ }
      }
      updateDraft(slot, ''); // give up on this slot silently
    };

    try {
      // All 3 fire in parallel — each streams its own card
      await Promise.all([generateSlot(0), generateSlot(1), generateSlot(2)]);
    } catch {
      setError('Failed to generate roasts. Check your connection.');
    } finally {
      setIsGenerating(false);
      setJokeChoiceDrafts(['', '', '']);
    }
  }, []);

  // ---- Boss auto-fires a single joke (no choices) ----
  const bossFire = useCallback(async (targetRegion: string, bossRegion: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const joke = await generateJoke({
        targetRegion,
        attackerRegion: bossRegion,
        onChunk: (partial) => {
          setBattle(prev => ({ ...prev, lastJoke: partial }));
        },
      });
      applyLocalJoke(joke);
    } catch {
      setError('Boss failed to roast. Check your connection.');
    } finally {
      setIsGenerating(false);
    }
  }, [applyLocalJoke]);

  // ---- Auto boss turn in solo mode ----
  useEffect(() => {
    if (mode !== 'local') return;
    if (battle.status !== 'active') return;
    if (battle.turn !== 'boss') return;
    if (isGenerating) return;

    const boss = battle.players.find(p => p.id === 'boss');
    const player = battle.players.find(p => p.id === 'player1');
    if (!boss || !player) return;

    const timer = setTimeout(() => {
      bossFire(player.region, boss.region);
    }, 1200);

    return () => clearTimeout(timer);
  }, [battle.turn, battle.status, mode, isGenerating, bossFire]);

  // ---- Start local battle ----
  const startLocalBattle = useCallback((playerRegion: string, opponentRegion: string) => {
    attackerRegionRef.current = playerRegion;
    setBattle(createLocalBattle(playerRegion, opponentRegion));
    setJokeChoices([]);
  }, []);

  // ---- Find multiplayer match ----
  const findMatch = useCallback((playerRegion: string) => {
    attackerRegionRef.current = playerRegion;
    setBattle(prev => ({ ...prev, status: 'searching' }));
    socketService.findMatch(playerRegion);
  }, []);

  // ---- Reset everything ----
  const resetBattle = useCallback(() => {
    setBattle(createInitialBattleState());
    setJokeLog([]);
    setJokeChoices([]);
    setJokeChoiceDrafts(['', '', '']);
    setError(null);
    setIsGenerating(false);
  }, []);

  const switchMode = useCallback((newMode: BattleMode) => {
    socketService.disconnect();
    setMode(newMode);
    setBattle(createInitialBattleState());
    setJokeLog([]);
    setJokeChoices([]);
    setJokeChoiceDrafts(['', '', '']);
    setError(null);
    setIsGenerating(false);
  }, []);

  const localId = mode === 'multiplayer' ? socketId : 'player1';
  const currentPlayer = battle.players.find(p => p.id === localId);
  const opponent = battle.players.find(p => p.id !== localId);

  return {
    mode,
    battle,
    jokeLog,
    jokeChoices,
    jokeChoiceDrafts,
    isGenerating,
    error,
    isMuted,
    currentPlayer,
    opponent,
    switchMode,
    startLocalBattle,
    findMatch,
    requestChoices,
    selectJoke,
    resetBattle,
    toggleMute,
  };
}
