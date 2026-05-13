"use client";

import { useEffect, useRef, useState } from "react";
import { Player } from "@/types";
import { getEmoji } from "@/lib/emojis";

interface PlayerListProps {
  players: Player[];
}

/**
 * Player list with smooth auto-scroll when the list is taller than its
 * container. We render the players twice back-to-back so the scroll position
 * can loop seamlessly with no visible jump.
 */
export default function PlayerList({ players }: PlayerListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  // Measure whether the (single-pass) content actually overflows the container.
  // We need the single-pass height for cycle math, so we measure the first half
  // of the duplicated content.
  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    const measure = () => {
      // Inner contains two copies stacked; first copy height = inner.scrollHeight / 2
      const singleHeight = inner.scrollHeight / 2;
      setShouldScroll(singleHeight > container.clientHeight + 4);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [players.length]);

  // Drive the scroll position with requestAnimationFrame so it's perfectly
  // smooth and pauses cleanly when not needed.
  useEffect(() => {
    if (!shouldScroll) return;
    const inner = innerRef.current;
    if (!inner) return;

    const PIXELS_PER_SECOND = 35; // gentle, readable speed
    let raf = 0;
    let lastTs = performance.now();
    let offset = 0;

    const tick = (ts: number) => {
      const dt = ts - lastTs;
      lastTs = ts;
      offset += (PIXELS_PER_SECOND * dt) / 1000;

      const singleHeight = inner.scrollHeight / 2;
      if (offset >= singleHeight) offset -= singleHeight;
      inner.style.transform = `translateY(${-offset}px)`;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shouldScroll]);

  // When auto-scroll is off, reset transform so layout is normal.
  useEffect(() => {
    if (!shouldScroll && innerRef.current) {
      innerRef.current.style.transform = "translateY(0)";
    }
  }, [shouldScroll]);

  const renderRows = (keyPrefix: string) =>
    players.map((player, index) => (
      <div
        key={`${keyPrefix}-${player.id}`}
        className="flex items-center gap-5 bg-white/5 rounded-2xl px-6 py-4 backdrop-blur-sm border border-white/10 animate-fade-in"
        style={{ animationDelay: `${Math.min(index, 20) * 30}ms` }}
      >
        <span className="text-6xl shrink-0">{getEmoji(player.emoji)}</span>
        <span className="text-white text-4xl font-bold truncate">
          {player.name}
        </span>
      </div>
    ));

  return (
    <div
      ref={containerRef}
      className="h-full overflow-hidden relative"
      style={{ contain: "paint" }}
    >
      <div
        ref={innerRef}
        className="grid grid-cols-3 gap-4 will-change-transform"
      >
        {renderRows("a")}
        {/* Duplicate as siblings so the marquee loops seamlessly */}
        {shouldScroll && renderRows("b")}
      </div>
    </div>
  );
}
