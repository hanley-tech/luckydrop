export type EmojiId = string; // any emoji id from the BALL_EMOJIS list

export type LevelId = "classic" | "cannon" | "tray";

export interface Player {
  id: string;
  name: string;
  emoji: EmojiId;
  socketId: string;
  isDebugUser: boolean;
  eliminated: boolean;
  eliminatedRound: number | null;
  /** Settle order in the round of elimination (0 = first ball to come to rest).
   *  Used as a tiebreaker so same-round losers display in a deterministic,
   *  non-alphabetical order. */
  eliminatedOrder: number | null;
}

export type GamePhase = "lobby" | "dropping" | "recycling" | "winner";

export interface GameState {
  phase: GamePhase;
  players: Player[];
  activePlayers: Player[];
  round: number;
  winner: Player | null;
  nameCheckEnabled: boolean;
  levelId: LevelId;
}

export interface JoinRequest {
  name: string;
  emoji: EmojiId;
}

export interface RoundResult {
  advancedIds: string[];
  eliminatedIds: string[];
  roundNumber: number;
}
