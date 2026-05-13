"use client";

import { useEffect, useMemo } from "react";
import confetti from "canvas-confetti";
import { Player } from "@/types";
import { getEmoji } from "@/lib/emojis";

interface WinnerPhaseProps {
  winner: Player;
  players: Player[];
}

/**
 * Rank players for the leaderboard: winner first, then the later a player
 * was eliminated, the higher they rank. Same-round eliminations tiebreak by
 * settle order — the ball that came to rest *last* ranks higher (it stayed
 * in play longer that round).
 */
function rankPlayers(winner: Player, players: Player[]): Player[] {
  const others = players
    .filter((p) => p.id !== winner.id)
    .sort((a, b) => {
      const roundDiff = (b.eliminatedRound ?? 0) - (a.eliminatedRound ?? 0);
      if (roundDiff !== 0) return roundDiff;
      return (b.eliminatedOrder ?? -1) - (a.eliminatedOrder ?? -1);
    });
  return [winner, ...others];
}

const PLACE_ACCENTS = [
  // 2nd — silver
  "from-slate-200 to-slate-400",
  // 3rd — bronze
  "from-amber-500 to-amber-700",
  // 4th & 5th — muted
  "from-slate-400 to-slate-600",
  "from-slate-400 to-slate-600",
];

export default function WinnerPhase({ winner, players }: WinnerPhaseProps) {
  useEffect(() => {
    const duration = 5000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 80,
        origin: { x: 0, y: 0.6 },
        colors: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"],
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 80,
        origin: { x: 1, y: 0.6 },
        colors: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    confetti({
      particleCount: 300,
      spread: 160,
      origin: { x: 0.5, y: 0.4 },
      colors: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"],
    });

    frame();
  }, []);

  const ranking = useMemo(() => rankPlayers(winner, players), [winner, players]);
  const runnersUp = ranking.slice(1, 5);

  const emoji = getEmoji(winner.emoji);

  return (
    <div className="w-full h-full bg-[#0F172A] flex items-center justify-center relative overflow-hidden">
      {/* Animated background glow */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: "radial-gradient(circle at 50% 50%, #FFD700, transparent 70%)",
        }}
      />

      {/* Decorative ring behind everything */}
      <div
        className="absolute w-[1000px] h-[1000px] rounded-full border-2 border-yellow-400 opacity-10 animate-spin"
        style={{ animationDuration: "20s" }}
      />

      <div className="relative z-10 w-full h-full">
        {/* Winner — centered spotlight */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-10 px-12 pb-[18%]">
          <h1 className="text-[12rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 animate-bounce tracking-wider leading-none">
            WINNER!
          </h1>
          <div className="text-[14rem] leading-none">{emoji}</div>
          <p className="text-[7rem] font-black text-white text-center leading-tight">
            {winner.name}
          </p>
        </div>

        {/* Runners-up — pinned near bottom of screen */}
        {runnersUp.length > 0 && (
          <div className="absolute left-0 right-0 bottom-[6%] flex flex-col items-center gap-6">
            <p className="text-3xl font-bold uppercase tracking-[0.35em] text-slate-400">
              Runners-up
            </p>
            <div className="flex items-center gap-14">
              {runnersUp.map((p, idx) => {
                const accent = PLACE_ACCENTS[idx];
                const place = idx + 2;
                return (
                  <div key={p.id} className="flex items-center gap-4">
                    <span className={`text-5xl font-black bg-clip-text text-transparent bg-gradient-to-b ${accent}`}>
                      {place}
                    </span>
                    <span className="text-6xl">{getEmoji(p.emoji)}</span>
                    <span className="text-4xl font-semibold text-slate-100 max-w-[16rem] truncate">
                      {p.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
