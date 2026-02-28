// Client -> Server events
export const C2S = {
  JOIN_REQUEST: "join-request",
  OPERATOR_START: "operator-start",
  OPERATOR_RESET: "operator-reset",
  OPERATOR_RESTART_MATCH: "operator-restart-match",
  DEBUG_ADD_USERS: "debug-add-users",
  DEBUG_TOGGLE_NAMECHECK: "debug-toggle-namecheck",
  REMOVE_PLAYER: "remove-player",
  ROUND_RESULT: "round-result",
  WINNER_DETECTED: "winner-detected",
} as const;

// Server -> Client events
export const S2C = {
  JOIN_ACCEPTED: "join-accepted",
  JOIN_REJECTED: "join-rejected",
  PLAYER_JOINED: "player-joined",
  PLAYER_LIST: "player-list",
  GAME_START: "game-start",
  ROUND_START: "round-start",
  ROUND_COMPLETE: "round-complete",
  WINNER: "winner",
  GAME_RESET: "game-reset",
  GAME_STATE_SYNC: "game-state-sync",
  NAME_CHECK_STATUS: "name-check-status",
} as const;
