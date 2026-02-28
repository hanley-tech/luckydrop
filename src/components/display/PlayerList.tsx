"use client";

import { Player } from "@/types";
import { getEmoji } from "@/lib/emojis";

interface PlayerListProps {
  players: Player[];
}

export default function PlayerList({ players }: PlayerListProps) {
  return (
    <div className="grid grid-cols-3 gap-8 max-h-[1400px] overflow-y-auto pr-2 scrollbar-thin">
      {players.map((player, index) => (
        <div
          key={player.id}
          className="flex items-center gap-6 bg-white/5 rounded-2xl px-10 py-7 backdrop-blur-sm border border-white/10 animate-fade-in"
          style={{ animationDelay: `${index * 30}ms` }}
        >
          <span className="text-8xl shrink-0">{getEmoji(player.emoji)}</span>
          <span className="text-white text-6xl font-bold truncate">
            {player.name}
          </span>
        </div>
      ))}
    </div>
  );
}
