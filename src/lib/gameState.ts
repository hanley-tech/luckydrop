import { GamePhase, GameState, Player, EmojiId } from "@/types";
import { BALL_EMOJIS } from "@/lib/emojis";

const RANDOM_NAMES = [
  "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Hank",
  "Ivy", "Jack", "Karen", "Leo", "Mia", "Nick", "Olivia", "Pete",
  "Quinn", "Rose", "Sam", "Tina", "Uma", "Vic", "Wendy", "Xander",
  "Yara", "Zack", "Aria", "Blake", "Cora", "Dean", "Ella", "Finn",
  "Gina", "Hugo", "Iris", "Joel", "Kate", "Liam", "Nora", "Owen",
];

const EMOJI_IDS: EmojiId[] = BALL_EMOJIS.map((e) => e.id);

export class GameStateManager {
  private state: GameState;

  constructor() {
    this.state = {
      phase: "lobby",
      players: [],
      activePlayers: [],
      round: 0,
      winner: null,
      nameCheckEnabled: false,
    };
  }

  getState(): GameState {
    return { ...this.state };
  }

  getPhase(): GamePhase {
    return this.state.phase;
  }

  isNameCheckEnabled(): boolean {
    return this.state.nameCheckEnabled;
  }

  setNameCheckEnabled(enabled: boolean): void {
    this.state.nameCheckEnabled = enabled;
  }

  isNameTaken(name: string): boolean {
    const lower = name.trim().toLowerCase();
    return this.state.players.some((p) => p.name.toLowerCase() === lower);
  }

  addPlayer(player: Player): boolean {
    if (this.state.phase !== "lobby") return false;
    if (this.state.players.find((p) => p.id === player.id)) return false;
    if (this.isNameTaken(player.name)) return false;
    this.state.players.push(player);
    return true;
  }

  removePlayer(socketId: string): void {
    this.state.players = this.state.players.filter(
      (p) => p.socketId !== socketId
    );
    this.state.activePlayers = this.state.activePlayers.filter(
      (p) => p.socketId !== socketId
    );
  }

  removePlayerById(playerId: string): void {
    this.state.players = this.state.players.filter((p) => p.id !== playerId);
    this.state.activePlayers = this.state.activePlayers.filter((p) => p.id !== playerId);
  }

  startGame(): Player[] | null {
    if (this.state.phase !== "lobby") return null;
    if (this.state.players.length === 0) return null;
    this.state.phase = "dropping";
    this.state.round = 1;
    this.state.activePlayers = this.state.players.map((p) => ({
      ...p,
      eliminated: false,
      eliminatedRound: null,
    }));
    return this.state.activePlayers;
  }

  reportRoundResult(
    advancedIds: string[],
    eliminatedIds: string[]
  ): {
    type: "winner" | "next_round" | "retry";
    winner?: Player;
    advanced: Player[];
    eliminated: Player[];
    round: number;
  } {
    const advanced = this.state.activePlayers.filter((p) =>
      advancedIds.includes(p.id)
    );
    const eliminated = this.state.activePlayers.filter((p) =>
      eliminatedIds.includes(p.id)
    );

    const currentRound = this.state.round;

    if (advanced.length === 0) {
      // Nobody hit center - retry with same players, nobody eliminated
      this.state.phase = "recycling";
      return {
        type: "retry",
        advanced: [],
        eliminated: [],
        round: currentRound,
      };
    }

    // Mark eliminated players (only when someone actually advanced)
    for (const p of eliminated) {
      p.eliminated = true;
      p.eliminatedRound = this.state.round;
      const mainPlayer = this.state.players.find((mp) => mp.id === p.id);
      if (mainPlayer) {
        mainPlayer.eliminated = true;
        mainPlayer.eliminatedRound = this.state.round;
      }
    }

    if (advanced.length === 1) {
      this.state.phase = "winner";
      this.state.winner = advanced[0];
      return {
        type: "winner",
        winner: advanced[0],
        advanced,
        eliminated,
        round: currentRound,
      };
    } else {
      // Multiple advanced - next round with only advanced players
      this.state.phase = "recycling";
      this.state.activePlayers = advanced;
      this.state.round++;
      return {
        type: "next_round",
        advanced,
        eliminated,
        round: currentRound,
      };
    }
  }

  startNextRound(): { players: Player[]; roundNumber: number } {
    this.state.phase = "dropping";
    return {
      players: this.state.activePlayers,
      roundNumber: this.state.round,
    };
  }

  addDebugUsers(count: number): Player[] {
    const newPlayers: Player[] = [];
    const existingCount = this.state.players.length;
    for (let i = 0; i < count; i++) {
      const nameIndex = (existingCount + i) % RANDOM_NAMES.length;
      const suffix = existingCount + i >= RANDOM_NAMES.length
        ? `_${Math.floor((existingCount + i) / RANDOM_NAMES.length)}`
        : "";
      const player: Player = {
        id: `debug-${Date.now()}-${i}`,
        name: RANDOM_NAMES[nameIndex] + suffix,
        emoji: EMOJI_IDS[(existingCount + i) % EMOJI_IDS.length],
        socketId: `debug-socket-${i}`,
        isDebugUser: true,
        eliminated: false,
        eliminatedRound: null,
      };
      this.state.players.push(player);
      newPlayers.push(player);
    }
    return newPlayers;
  }

  /** Restart match: go back to lobby keeping all players but clearing elimination state. */
  restartMatch(): void {
    this.state.phase = "lobby";
    this.state.round = 0;
    this.state.winner = null;
    this.state.activePlayers = [];
    for (const p of this.state.players) {
      p.eliminated = false;
      p.eliminatedRound = null;
    }
  }

  reset(): void {
    this.state.phase = "lobby";
    this.state.players = [];
    this.state.activePlayers = [];
    this.state.round = 0;
    this.state.winner = null;
  }
}
