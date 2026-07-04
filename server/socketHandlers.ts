import { Server, Socket } from "socket.io";
import { GameStateManager } from "../src/lib/gameState";
import { C2S, S2C } from "../src/lib/socketEvents";
import { JoinRequest, EmojiId, LevelId } from "../src/types";

export function setupSocketHandlers(io: Server): void {
  const gameState = new GameStateManager();

  io.on("connection", (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Send current state to newly connected client
    socket.emit(S2C.GAME_STATE_SYNC, gameState.getState());

    // Join request from mobile
    socket.on(C2S.JOIN_REQUEST, async (data: JoinRequest) => {
      if (gameState.getPhase() !== "lobby") {
        socket.emit(S2C.JOIN_REJECTED, { reason: "Game already in progress" });
        return;
      }

      if (!data.name || data.name.trim().length < 1 || data.name.trim().length > 8) {
        socket.emit(S2C.JOIN_REJECTED, { reason: "Name must be 1-8 characters" });
        return;
      }

      // Check for duplicate name
      if (gameState.isNameTaken(data.name)) {
        socket.emit(S2C.JOIN_REJECTED, { reason: "That name is already taken. Try another!" });
        return;
      }

      const player = {
        id: socket.id,
        name: data.name.trim(),
        emoji: data.emoji as EmojiId,
        socketId: socket.id,
        isDebugUser: false,
        eliminated: false,
        eliminatedRound: null,
        eliminatedOrder: null,
      };

      if (gameState.addPlayer(player)) {
        socket.emit(S2C.JOIN_ACCEPTED, { player });
        io.emit(S2C.PLAYER_JOINED, { player });
        io.emit(S2C.PLAYER_LIST, { players: gameState.getState().players });
      } else {
        socket.emit(S2C.JOIN_REJECTED, { reason: "Could not join. Name may already be taken." });
      }
    });

    // Operator starts the game
    socket.on(C2S.OPERATOR_START, () => {
      const activePlayers = gameState.startGame();
      if (activePlayers) {
        io.emit(S2C.GAME_START, { players: activePlayers });
      }
    });

    // Operator resets the game (clears everything including players)
    socket.on(C2S.OPERATOR_RESET, () => {
      gameState.reset();
      io.emit(S2C.GAME_RESET, {});
      io.emit(S2C.GAME_STATE_SYNC, gameState.getState());
    });

    // Operator restarts the match (back to lobby, keep players)
    socket.on(C2S.OPERATOR_RESTART_MATCH, () => {
      gameState.restartMatch();
      io.emit(S2C.GAME_STATE_SYNC, gameState.getState());
    });

    // Operator picks the level for the next match (only valid in lobby)
    socket.on(C2S.OPERATOR_SET_LEVEL, (data: { levelId: LevelId }) => {
      if (!data?.levelId) return;
      gameState.setLevel(data.levelId);
      io.emit(S2C.LEVEL_CHANGED, { levelId: gameState.getState().levelId });
    });

    // Operator sets how many prize winners (podium size) for the next match
    socket.on(C2S.OPERATOR_SET_WINNER_COUNT, (data: { winnerCount: number }) => {
      if (typeof data?.winnerCount !== "number") return;
      gameState.setWinnerCount(data.winnerCount);
      io.emit(S2C.WINNER_COUNT_CHANGED, {
        winnerCount: gameState.getState().winnerCount,
      });
    });

    // Display reports round result
    socket.on(C2S.ROUND_RESULT, (data: { advancedIds: string[]; eliminatedIds: string[] }) => {
      const result = gameState.reportRoundResult(data.advancedIds, data.eliminatedIds);

      if (result.type === "winner") {
        // Emit ROUND_COMPLETE first so clients tag the final round's losers
        // with eliminatedRound + eliminatedOrder. WinnerPhase relies on this
        // to show 2nd–5th place.
        io.emit(S2C.ROUND_COMPLETE, {
          advanced: result.advanced,
          eliminated: result.eliminated,
          roundNumber: result.round,
        });
        io.emit(S2C.WINNER, {
          player: result.winner,
          roundNumber: result.round,
        });
      } else if (result.type === "next_round") {
        io.emit(S2C.ROUND_COMPLETE, {
          advanced: result.advanced,
          eliminated: result.eliminated,
          roundNumber: result.round,
        });
        setTimeout(() => {
          const next = gameState.startNextRound();
          io.emit(S2C.ROUND_START, {
            players: next.players,
            roundNumber: next.roundNumber,
          });
        }, 3000);
      } else {
        // retry - nobody hit center
        io.emit(S2C.ROUND_COMPLETE, {
          advanced: [],
          eliminated: [],
          roundNumber: result.round,
        });
        // After a pause for the recycling animation, switch back to dropping
        setTimeout(() => {
          const next = gameState.startNextRound();
          io.emit(S2C.ROUND_START, {
            players: next.players,
            roundNumber: next.roundNumber,
          });
        }, 3000);
      }
    });

    // Display reports winner directly
    socket.on(C2S.WINNER_DETECTED, (data: { playerId: string }) => {
      const state = gameState.getState();
      const winner = state.activePlayers.find((p) => p.id === data.playerId);
      if (winner) {
        io.emit(S2C.WINNER, { player: winner, roundNumber: state.round });
      }
    });

    // Debug: add test users
    socket.on(C2S.DEBUG_ADD_USERS, (data: { count: number }) => {
      gameState.addDebugUsers(data.count || 40);
      // Send full list instead of 40 individual PLAYER_JOINED events
      io.emit(S2C.PLAYER_LIST, { players: gameState.getState().players });
    });

    // Debug: toggle name check
    socket.on(C2S.DEBUG_TOGGLE_NAMECHECK, (data: { enabled: boolean }) => {
      gameState.setNameCheckEnabled(data.enabled);
      io.emit(S2C.NAME_CHECK_STATUS, { enabled: data.enabled });
    });

    // Operator removes a player
    socket.on(C2S.REMOVE_PLAYER, (data: { playerId: string }) => {
      gameState.removePlayerById(data.playerId);
      io.emit(S2C.PLAYER_LIST, { players: gameState.getState().players });
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
      // Don't remove players on disconnect — phones disconnect frequently
      // (screen lock, network switch, etc). Operator can remove manually.
    });
  });
}
