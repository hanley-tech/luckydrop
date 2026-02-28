"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { C2S, S2C } from "@/lib/socketEvents";
import { GameState, Player } from "@/types";
import { getEmoji } from "@/lib/emojis";
import ControlPanel from "@/components/operator/ControlPanel";
import DebugTools from "@/components/operator/DebugTools";

const defaultGameState: GameState = {
  phase: "lobby",
  players: [],
  activePlayers: [],
  round: 0,
  winner: null,
  nameCheckEnabled: false,
};

export default function OperatorPage() {
  const [gameState, setGameState] = useState<GameState>(defaultGameState);

  useEffect(() => {
    const socket = getSocket();

    socket.on(S2C.GAME_STATE_SYNC, (state: GameState) => {
      setGameState(state);
    });

    socket.on(S2C.PLAYER_LIST, (data: { players: Player[] }) => {
      setGameState((prev) => ({
        ...prev,
        players: data.players,
        activePlayers: data.players.filter((p) => !p.eliminated),
      }));
    });

    socket.on(S2C.PLAYER_JOINED, (data: { player: Player }) => {
      setGameState((prev) => ({
        ...prev,
        players: [...prev.players, data.player],
        activePlayers: [...prev.players, data.player].filter((p) => !p.eliminated),
      }));
    });

    socket.on(S2C.GAME_START, (data: { players: Player[] }) => {
      setGameState((prev) => ({ ...prev, phase: "dropping", round: 1, activePlayers: data.players }));
    });

    socket.on(S2C.ROUND_START, (data: { players: Player[]; roundNumber: number }) => {
      setGameState((prev) => ({
        ...prev,
        phase: "dropping",
        round: data.roundNumber,
      }));
    });

    socket.on(S2C.WINNER, (data: { player: Player; roundNumber: number }) => {
      setGameState((prev) => ({ ...prev, phase: "winner", winner: data.player }));
    });

    socket.on(S2C.GAME_RESET, () => {
      setGameState(defaultGameState);
    });

    socket.on(
      S2C.NAME_CHECK_STATUS,
      (data: { enabled: boolean }) => {
        setGameState((prev) => ({
          ...prev,
          nameCheckEnabled: data.enabled,
        }));
      }
    );

    return () => {
      socket.off(S2C.GAME_STATE_SYNC);
      socket.off(S2C.PLAYER_LIST);
      socket.off(S2C.PLAYER_JOINED);
      socket.off(S2C.GAME_START);
      socket.off(S2C.ROUND_START);
      socket.off(S2C.WINNER);
      socket.off(S2C.GAME_RESET);
      socket.off(S2C.NAME_CHECK_STATUS);
    };
  }, []);

  const handleStart = () => {
    const socket = getSocket();
    socket.emit(C2S.OPERATOR_START);
  };

  const handleReset = () => {
    const socket = getSocket();
    socket.emit(C2S.OPERATOR_RESET);
  };

  const handleRestartMatch = () => {
    const socket = getSocket();
    socket.emit(C2S.OPERATOR_RESTART_MATCH);
  };

  const handleAddDebugUsers = () => {
    const socket = getSocket();
    socket.emit(C2S.DEBUG_ADD_USERS, { count: 40 });
  };

  const handleToggleNameCheck = (enabled: boolean) => {
    const socket = getSocket();
    socket.emit(C2S.DEBUG_TOGGLE_NAMECHECK, { enabled });
  };

  const handleRemovePlayer = (playerId: string) => {
    const socket = getSocket();
    socket.emit(C2S.REMOVE_PLAYER, { playerId });
  };

  return (
    <div className="min-h-screen bg-[#0F172A] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl font-black text-white">
          Operator Panel
        </h1>

        <ControlPanel
          gameState={gameState}
          onStart={handleStart}
          onReset={handleReset}
          onRestartMatch={handleRestartMatch}
        />

        <DebugTools
          nameCheckEnabled={gameState.nameCheckEnabled}
          onAddDebugUsers={handleAddDebugUsers}
          onToggleNameCheck={handleToggleNameCheck}
        />

        {/* Player list */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">
            Players ({gameState.players.length})
          </h2>
          {gameState.players.length === 0 ? (
            <p className="text-slate-500 text-lg">
              No players have joined yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {gameState.players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                    player.eliminated
                      ? "bg-slate-900/50 opacity-50"
                      : "bg-slate-900"
                  }`}
                >
                  <span className="text-lg shrink-0">{getEmoji(player.emoji)}</span>
                  <span className="text-white font-medium">
                    {player.name}
                  </span>
                  {player.isDebugUser && (
                    <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                      DEBUG
                    </span>
                  )}
                  {player.eliminated && (
                    <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                      Eliminated R{player.eliminatedRound}
                    </span>
                  )}
                  <button
                    onClick={() => handleRemovePlayer(player.id)}
                    className="ml-auto text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 px-2 py-1 rounded transition-colors shrink-0"
                    title={`Remove ${player.name}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
