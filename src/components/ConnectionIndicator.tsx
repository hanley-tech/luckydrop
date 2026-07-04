"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";

/**
 * Small fixed connectivity badge. Shows a subtle green dot when connected and a
 * prominent pulsing "Reconnecting…" pill when the socket drops, so an idle
 * kiosk display makes it obvious it needs attention (it also auto-reconnects).
 */
export default function ConnectionIndicator({
  corner = "bottom-left",
}: {
  corner?: "bottom-left" | "top-left" | "top-right";
}) {
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const s = getSocket();
    setConnected(s.connected);
    const on = () => setConnected(true);
    const off = () => setConnected(false);
    s.on("connect", on);
    s.on("disconnect", off);
    s.io.on("reconnect", on);
    return () => {
      s.off("connect", on);
      s.off("disconnect", off);
      s.io.off("reconnect", on);
    };
  }, []);

  const pos =
    corner === "top-left"
      ? "top-4 left-4"
      : corner === "top-right"
      ? "top-4 right-4"
      : "bottom-4 left-4";

  if (connected) {
    return (
      <div className={`fixed ${pos} z-50 flex items-center gap-2 pointer-events-none`}>
        <span className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.6)]" />
      </div>
    );
  }

  return (
    <div
      className={`fixed ${pos} z-50 flex items-center gap-3 rounded-full bg-red-600/90 backdrop-blur-sm px-5 py-2.5 border border-red-300/40 shadow-lg`}
    >
      <span className="w-3 h-3 rounded-full bg-white animate-ping" />
      <span className="text-white font-bold text-lg tracking-wide">
        Reconnecting…
      </span>
    </div>
  );
}
