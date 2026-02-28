"use client";

interface DebugToolsProps {
  nameCheckEnabled: boolean;
  onAddDebugUsers: () => void;
  onToggleNameCheck: (enabled: boolean) => void;
}

export default function DebugTools({
  nameCheckEnabled,
  onAddDebugUsers,
  onToggleNameCheck,
}: DebugToolsProps) {
  return (
    <div className="bg-slate-800 rounded-xl p-6 space-y-6 border border-yellow-600/30">
      <h2 className="text-2xl font-bold text-yellow-400">Debug Tools</h2>

      <div className="space-y-4">
        {/* Add test users button */}
        <button
          onClick={onAddDebugUsers}
          className="w-full py-3 px-6 rounded-xl text-lg font-semibold bg-yellow-600 hover:bg-yellow-500 text-white transition-all active:scale-95"
        >
          Add 40 Test Users
        </button>

        {/* Name check toggle */}
        <div className="flex items-center justify-between bg-slate-900 rounded-lg p-4">
          <span className="text-lg text-white font-medium">Name Check</span>
          <button
            onClick={() => onToggleNameCheck(!nameCheckEnabled)}
            className={`relative w-16 h-8 rounded-full transition-colors ${
              nameCheckEnabled ? "bg-green-500" : "bg-slate-600"
            }`}
          >
            <span
              className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                nameCheckEnabled ? "left-9" : "left-1"
              }`}
            />
          </button>
          <span
            className={`text-sm font-bold ${
              nameCheckEnabled ? "text-green-400" : "text-slate-500"
            }`}
          >
            {nameCheckEnabled ? "ON" : "OFF"}
          </span>
        </div>
      </div>
    </div>
  );
}
