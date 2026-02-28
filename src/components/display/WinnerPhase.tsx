"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Player } from "@/types";
import { getEmoji } from "@/lib/emojis";

interface WinnerPhaseProps {
  winner: Player;
}

export default function WinnerPhase({ winner }: WinnerPhaseProps) {
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

  const emoji = getEmoji(winner.emoji);

  return (
    <div className="w-full h-full bg-[#0F172A] flex flex-col items-center justify-center gap-16 relative overflow-hidden">
      {/* Animated background glow */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: "radial-gradient(circle at 50% 50%, #FFD700, transparent 70%)",
        }}
      />

      {/* Winner label */}
      <h1 className="text-[14rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 animate-bounce relative z-10 tracking-wider">
        WINNER!
      </h1>

      {/* Emoji */}
      <div className="text-[18rem] relative z-10">
        {emoji}
      </div>

      {/* Winner name */}
      <p className="text-[10rem] font-black text-white relative z-10 text-center px-8">
        {winner.name}
      </p>

      {/* Decorative ring */}
      <div
        className="absolute w-[1000px] h-[1000px] rounded-full border-2 border-yellow-400 opacity-10 animate-spin"
        style={{ animationDuration: "20s" }}
      />
    </div>
  );
}
