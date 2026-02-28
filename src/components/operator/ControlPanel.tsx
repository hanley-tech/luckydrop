"use client";

import { GameState } from "@/types";

interface ControlPanelProps {
  gameState: GameState;
  onStart: () => void;
  onReset: () => void;
  onRestartMatch: () => void;
}

export default function ControlPanel({
  gameState,
  onStart,
  onReset,
  onRestartMatch,
}: ControlPanelProps) {
  const { phase, players, activePlayers, round } = gameState;
  const canStart = phase === "lobby" && players.length > 0;
  const canRestart = phase !== "lobby";

  return (
    <div className="bg-slate-800 rounded-xl p-6 space-y-6 border border-slate-700">
      <h2 className="text-2xl font-bold text-white">Game Control</h2>

      {/* Status display */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-400 uppercase tracking-wide">
            Phase
          </p>
          <p className="text-xl font-bold text-white capitalize mt-1">
            {phase}
          </p>
        </div>
        <div className="bg-slate-900 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-400 uppercase tracking-wide">
            Round
          </p>
          <p className="text-xl font-bold text-white mt-1">{round}</p>
        </div>
        <div className="bg-slate-900 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-400 uppercase tracking-wide">
            Players
          </p>
          <p className="text-xl font-bold text-white mt-1">
            {activePlayers.length} / {players.length}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          onClick={onStart}
          disabled={!canStart}
          className={`flex-1 py-4 px-6 rounded-xl text-xl font-bold transition-all ${
            canStart
              ? "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30 active:scale-95"
              : "bg-slate-700 text-slate-500 cursor-not-allowed"
          }`}
        >
          Start Game
        </button>
        <button
          onClick={onRestartMatch}
          disabled={!canRestart}
          className={`flex-1 py-4 px-6 rounded-xl text-xl font-bold transition-all ${
            canRestart
              ? "bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg shadow-yellow-600/30 active:scale-95"
              : "bg-slate-700 text-slate-500 cursor-not-allowed"
          }`}
        >
          Restart Match
        </button>
        <button
          onClick={onReset}
          className="flex-1 py-4 px-6 rounded-xl text-xl font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 active:scale-95 transition-all"
        >
          Reset All
        </button>
      </div>
      <p className="text-sm text-slate-400">
        <span className="text-yellow-400 font-semibold">Restart Match</span> — back to lobby, keep all players. {" "}
        <span className="text-red-400 font-semibold">Reset All</span> — clears everything including players.
      </p>
    </div>
  );
}
