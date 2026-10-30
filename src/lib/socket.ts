"use client";

import { io, Socket } from "socket.io-client";
import type { Lang, ThemeId } from "@/types";
import { S2C } from "@/lib/socketEvents";

let socket: Socket | null = null;

// ---------------------------------------------------------------------------
// Server-owned display prefs (language + theme), recorded from the moment the
// socket exists. The server sends its full state only once, on connect, so a
// hook that subscribes later (e.g. after a lazy import) would otherwise miss
// it and sit on the default. Recorded via onAny, which pages' blanket
// socket.off(EVENT) cleanups cannot remove.
// ---------------------------------------------------------------------------

export interface ServerPrefs {
  lang?: Lang;
  theme?: ThemeId;
}

const prefs: ServerPrefs = {};
const prefListeners = new Set<(p: ServerPrefs) => void>();
const PREF_EVENTS = new Set<string>([S2C.GAME_STATE_SYNC, S2C.LANG_CHANGED, S2C.THEME_CHANGED]);

function recordPrefs(event: string, data: unknown): void {
  if (!PREF_EVENTS.has(event) || !data || typeof data !== "object") return;
  const d = data as ServerPrefs;
  if (d.lang) prefs.lang = d.lang;
  if (d.theme) prefs.theme = d.theme;
  for (const cb of prefListeners) cb({ ...prefs });
}

/** Subscribe to the server's language/theme. Replays the latest known values
 *  immediately, so late subscribers never miss the connect-time sync. */
export function subscribeServerPrefs(cb: (p: ServerPrefs) => void): () => void {
  getSocket(); // make sure recording has started
  prefListeners.add(cb);
  if (prefs.lang || prefs.theme) cb({ ...prefs });
  return () => {
    prefListeners.delete(cb);
  };
}

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
    socket.onAny(recordPrefs);

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
