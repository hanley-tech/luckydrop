"use client";

import { useMemo } from "react";
import { BALL_EMOJIS } from "@/lib/emojis";
import { useTheme } from "@/lib/theme";
import { EmojiId } from "@/types";

interface EmojiPickerProps {
  selected: EmojiId | null;
  onSelect: (emoji: EmojiId) => void;
}

export default function EmojiPicker({ selected, onSelect }: EmojiPickerProps) {
  // The active theme's featured emojis come first, in the theme's order
  const { featuredEmojis } = useTheme();
  const items = useMemo(() => {
    const featured = featuredEmojis
      .map((id) => BALL_EMOJIS.find((e) => e.id === id))
      .filter((e): e is (typeof BALL_EMOJIS)[number] => !!e);
    return [...featured, ...BALL_EMOJIS.filter((e) => !featuredEmojis.includes(e.id))];
  }, [featuredEmojis]);

  return (
    <div className="grid grid-cols-6 gap-2 justify-items-center max-h-[40vh] overflow-y-auto p-1">
      {items.map((item) => {
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
