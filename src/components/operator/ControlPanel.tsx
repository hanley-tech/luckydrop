"use client";

import { GameState, LevelId } from "@/types";
import { LEVELS, LEVEL_ORDER } from "@/components/game/levels";

interface ControlPanelProps {
  gameState: GameState;
  onStart: () => void;
  onReset: () => void;
  onRestartMatch: () => void;
  onSetLevel: (levelId: LevelId) => void;
  onSetWinnerCount: (count: number) => void;
}

const WINNER_COUNT_OPTIONS = [1, 2, 3, 4, 5];

export default function ControlPanel({
  gameState,
  onStart,
  onReset,
  onRestartMatch,
  onSetLevel,
  onSetWinnerCount,
}: ControlPanelProps) {
  const { phase, players, activePlayers, round, levelId, winnerCount } = gameState;
  const canStart = phase === "lobby" && players.length > 0;
  const canRestart = phase !== "lobby";
  const canChangeLevel = phase === "lobby";
  const activeLevel = LEVELS[levelId] ?? LEVELS.classic;

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

      {/* Level picker */}
      <div className="bg-slate-900 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm text-slate-400 uppercase tracking-wide">
            Level (next match)
          </label>
          <select
            value={levelId}
            onChange={(e) => onSetLevel(e.target.value as LevelId)}
            disabled={!canChangeLevel}
            className={`flex-1 max-w-sm bg-slate-800 text-white rounded-lg px-3 py-2 font-semibold border border-slate-600 ${
              canChangeLevel ? "cursor-pointer hover:border-slate-500" : "opacity-60 cursor-not-allowed"
            }`}
          >
            {LEVEL_ORDER.map((id) => (
              <option key={id} value={id}>
                {LEVELS[id].name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500">{activeLevel.description}</p>
        {!canChangeLevel && (
          <p className="text-xs text-yellow-400">
            Locked while a match is in progress. Restart match to switch levels.
          </p>
        )}
      </div>

      {/* Winner count (prizes) picker */}
      <div className="bg-slate-900 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm text-slate-400 uppercase tracking-wide">
            Prize winners
          </label>
          <div className="flex gap-2">
            {WINNER_COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => onSetWinnerCount(n)}
                disabled={!canChangeLevel}
                className={`w-12 py-2 rounded-lg font-bold border transition-all ${
                  winnerCount === n
                    ? "bg-pink-600 border-pink-400 text-white shadow-lg shadow-pink-600/30"
                    : "bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500"
                } ${canChangeLevel ? "cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">
          {winnerCount === 1
            ? "Single champion + 5 runners-up shown at the finish."
            : `Top ${winnerCount} on the podium + 5 runners-up shown at the finish.`}
        </p>
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
