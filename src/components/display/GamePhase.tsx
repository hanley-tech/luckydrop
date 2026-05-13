"use client";

import { useState, useCallback, useRef, useEffect } from "react";

import { Player, LevelId } from "@/types";
import { getEmoji } from "@/lib/emojis";
import { announceBallInCenter } from "@/lib/audio";
import PlinkoCanvas from "@/components/game/PlinkoCanvas";

interface GamePhaseProps {
  players: Player[];
  round: number;
  phase: "dropping" | "recycling";
  levelId: LevelId;
  onRoundResult: (advancedIds: string[], eliminatedIds: string[]) => void;
}

/** Sidebar list that shows as many players as fit, with "...N more" overflow */
function SidebarList({
  players,
  landedStatus,
  type,
}: {
  players: Player[];
  landedStatus?: Record<string, "center" | "missed">;
  type: "remaining" | "eliminated";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(players.length);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const containerHeight = el.clientHeight;
      // Each row is roughly 96px at 4K. Reserve 64px for "...N more" row.
      const rowHeight = 96;
      const overflowRowHeight = 64;
      const maxRows = Math.max(1, Math.floor((containerHeight - overflowRowHeight) / rowHeight));
      setVisibleCount(players.length <= maxRows + 1 ? players.length : maxRows);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [players.length]);

  const visible = players.slice(0, visibleCount);
  const hiddenCount = players.length - visibleCount;

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden px-2 py-2">
      <div className="space-y-1.5">
        {visible.map((p) => {
          let rowClass = "bg-white/5";
          let nameClass = "text-white";

          if (type === "remaining" && landedStatus) {
            const status = landedStatus[p.id];
            if (status === "center") {
              rowClass = "bg-green-500/15 border border-green-500/30";
              nameClass = "text-green-300";
            } else if (status === "missed") {
              rowClass = "bg-yellow-500/10 border border-yellow-500/20";
              nameClass = "text-yellow-200/80";
            }
          } else if (type === "eliminated") {
            rowClass = "bg-white/5 opacity-60";
            nameClass = "text-white/70";
          }

          return (
            <div key={p.id} className={`flex items-center gap-5 px-5 py-4 rounded-lg ${rowClass}`}>
              <span className="text-6xl shrink-0">{getEmoji(p.emoji)}</span>
              <span className={`text-5xl font-bold truncate ${nameClass}`}>{p.name}</span>
              {type === "eliminated" && p.eliminatedRound && (
                <span className="text-red-400/70 text-2xl ml-auto shrink-0">R{p.eliminatedRound}</span>
              )}
            </div>
          );
        })}
        {hiddenCount > 0 && (
          <div className="flex items-center justify-center px-3 py-2 rounded-lg bg-white/5">
            <span className="text-3xl font-semibold text-slate-400">
              ...{hiddenCount} more
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GamePhase({
  players,
  round,
  phase,
  levelId,
  onRoundResult,
}: GamePhaseProps) {
  const activePlayers = players.filter((p) => !p.eliminated);
  // Sort eliminated by rank: later round of elimination = higher in the list.
  // Within the same round, the ball that settled *last* ranks higher (it stayed
  // in play longer that round).
  const eliminatedPlayers = players
    .filter((p) => p.eliminated)
    .sort((a, b) => {
      const roundDiff = (b.eliminatedRound ?? 0) - (a.eliminatedRound ?? 0);
      if (roundDiff !== 0) return roundDiff;
      return (b.eliminatedOrder ?? -1) - (a.eliminatedOrder ?? -1);
    });

  // Track real-time landed status: playerId -> "center" | "missed"
  // This is purely visual during the round — no one moves to eliminated until
  // the round fully settles and the server confirms it's not a retry.
  const [landedStatus, setLandedStatus] = useState<Record<string, "center" | "missed">>({});

  const handleBallLanded = useCallback((playerId: string, inCenter: boolean) => {
    if (inCenter) {
      const player = activePlayers.find((p) => p.id === playerId);
      announceBallInCenter(player?.name ?? "");
    }
    setLandedStatus((prev) => ({
      ...prev,
      [playerId]: inCenter ? "center" : "missed",
    }));
  }, [activePlayers]);

  // Clear landed status when round changes (new round starts), not when results are reported.
  // This keeps the green/yellow indicators visible until the next round begins,
  // giving a clear pause before eliminated players move to the right sidebar.
  const prevRoundRef = useRef(round);
  useEffect(() => {
    if (round !== prevRoundRef.current) {
      prevRoundRef.current = round;
      setLandedStatus({});
    }
  }, [round]);

  const handleRoundResult = useCallback((advancedIds: string[], eliminatedIds: string[]) => {
    onRoundResult(advancedIds, eliminatedIds);
  }, [onRoundResult]);

  return (
    <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden">
      {/* Fixed 16:9 layout fills the 3840x2160 DisplayFrame */}
      <div className="relative flex w-full h-full">
        {/* Left sidebar: ALL active players stay here for the entire round */}
        <div className="w-[15%] bg-[#0B1120] border-r border-white/10 flex flex-col overflow-hidden shrink-0">
          <div className="px-6 py-6 border-b border-white/10">
            <p className="text-2xl font-bold text-green-400 uppercase tracking-wider">
              Remaining
            </p>
            <p className="text-7xl font-black text-white">
              {activePlayers.length}
            </p>
          </div>
          <SidebarList
            players={activePlayers}
            landedStatus={landedStatus}
            type="remaining"
          />
        </div>

        {/* Center: Plinko board */}
        <div className="flex-1 relative bg-[#0F172A]">
          <PlinkoCanvas
            players={activePlayers}
            roundNumber={round}
            isRecycling={phase === "recycling"}
            levelId={levelId}
            onRoundResult={handleRoundResult}
            onBallLanded={handleBallLanded}
          />

          {/* Round indicator overlay */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-black/60 backdrop-blur-md rounded-3xl px-14 py-5 border border-white/10">
              <p className="text-7xl font-black text-white">
                Round{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  {round}
                </span>
              </p>
            </div>
          </div>

          {/* Recycling message overlay */}
          {phase === "recycling" && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-black/70 backdrop-blur-md rounded-3xl px-16 py-8 border border-yellow-500/30 animate-pulse">
                <p className="text-7xl font-bold text-yellow-400 text-center">
                  No winner! Dropping again...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: only previously eliminated players (from past rounds) */}
        <div className="w-[15%] bg-[#0B1120] border-l border-white/10 flex flex-col overflow-hidden shrink-0">
          <div className="px-6 py-6 border-b border-white/10">
            <p className="text-2xl font-bold text-red-400 uppercase tracking-wider">
              Eliminated
            </p>
            <p className="text-7xl font-black text-white">
              {eliminatedPlayers.length}
            </p>
          </div>
          <SidebarList
            players={eliminatedPlayers}
            type="eliminated"
          />
        </div>
      </div>
    </div>
  );
}
