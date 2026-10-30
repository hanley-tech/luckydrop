export type EmojiId = string; // any emoji id from the BALL_EMOJIS list

export type LevelId = "classic" | "cannon" | "tray";

/** UI language. Owned by the server so the operator drives every screen. */
export type Lang = "zh" | "en";

/** Visual theme. Server-owned like Lang; palettes live in src/lib/theme.ts. */
export type ThemeId = "neon" | "halloween";

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

/** First round played on the narrowest win zone (a single slot). Rounds from
 *  here on are "the last round" — the board can't get any harder — so a
 *  nobody-made-it result here is what can trigger sudden death. */
export const FINAL_ROUND = 3;

export interface GameState {
  phase: GamePhase;
  players: Player[];
  activePlayers: Player[];
  round: number;
  winner: Player | null;
  nameCheckEnabled: boolean;
  levelId: LevelId;
  /** How many top places to celebrate as prize winners (podium size). */
  winnerCount: number;
  /** Language for every connected view; set from the operator panel. */
  lang: Lang;
  /** Visual theme for every connected view; set from the operator panel. */
  theme: ThemeId;
  /** Operator option: a no-winner final round goes to sudden death instead
   *  of an endless retry loop. */
  suddenDeathEnabled: boolean;
  /** True once this match has entered sudden death: misses redrop from the
   *  top straight away and the first ball into the win zone wins. */
  suddenDeath: boolean;
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
