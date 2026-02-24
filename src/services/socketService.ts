/**
 * SocketService
 * Manages the Socket.io client connection lifecycle and provides a clean API
 * for emitting events and registering listeners.
 */

import { io, Socket } from 'socket.io-client';
import type { BattleState, Player } from './gameService';

const SOCKET_SERVER_URL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001'
    : 'http://localhost:3001';

export interface MatchFoundPayload {
  id: string;
  players: Player[];
  turn: string;
}

export interface BattleUpdatePayload {
  battle: BattleState;
  lastJoke: string;
  attackerId: string;
  damage: number;
  isCrit: boolean;
}

export interface BattleFinishedPayload {
  winnerId: string;
}

export interface SocketServiceCallbacks {
  onMatchFound: (data: MatchFoundPayload) => void;
  onBattleUpdate: (data: BattleUpdatePayload) => void;
  onBattleFinished: (data: BattleFinishedPayload) => void;
}

export class SocketService {
  private socket: Socket | null = null;

  connect(callbacks: SocketServiceCallbacks): Socket {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_SERVER_URL);

    this.socket.on('match_found', callbacks.onMatchFound);
    this.socket.on('battle_update', callbacks.onBattleUpdate);
    this.socket.on('battle_finished', callbacks.onBattleFinished);

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  findMatch(region: string): void {
    this.socket?.emit('find_match', region);
  }

  submitJoke(battleId: string, joke: string): void {
    this.socket?.emit('joke_generated', { battleId, joke });
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
