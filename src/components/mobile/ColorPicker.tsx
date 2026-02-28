"use client";

import { BALL_EMOJIS } from "@/lib/emojis";
import { EmojiId } from "@/types";

interface EmojiPickerProps {
  selected: EmojiId | null;
  onSelect: (emoji: EmojiId) => void;
}

export default function EmojiPicker({ selected, onSelect }: EmojiPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-2 justify-items-center max-h-[40vh] overflow-y-auto p-1">
      {BALL_EMOJIS.map((item) => {
        const isSelected = selected === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-label={`Select ${item.name}`}
            className={`
              w-[52px] h-[52px] rounded-xl transition-all duration-150 flex items-center justify-center text-2xl
              focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50
              ${isSelected ? "ring-[3px] ring-white scale-110 shadow-lg bg-white/25" : "ring-1 ring-white/10 hover:scale-105 bg-white/5"}
            `}
          >
            {item.emoji}
          </button>
        );
      })}
    </div>
  );
}
