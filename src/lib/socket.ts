"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    socket = io({
      autoConnect: true,
      transports: ["websocket", "polling"],
      path: `${basePath}/socket.io/`,
      // Keep trying forever — the display is a kiosk that must self-heal after
      // the machine sleeps / network blips without anyone refreshing it.
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
      timeout: 8000,
    });

    // Background tabs get their timers throttled, so socket.io's own reconnect
    // loop can stall after the machine wakes. Nudge it whenever the tab becomes
    // visible again, the network comes back, or the window regains focus.
    if (typeof window !== "undefined") {
      const s = socket;
      const nudge = () => {
        if (s.disconnected) s.connect();
      };
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") nudge();
      });
      window.addEventListener("online", nudge);
      window.addEventListener("focus", nudge);
      window.addEventListener("pageshow", nudge);
    }
  }
  return socket;
}
