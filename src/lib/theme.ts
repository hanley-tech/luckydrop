"use client";

// ---------------------------------------------------------------------------
// Visual themes — palette + backdrop for the board canvas, the lobby demo and
// the DOM chrome around them.
//
// Same ownership model as language (see i18n.ts): the server holds the choice
// in GameState, the operator sets it, every view follows. The last value seen
// is cached in localStorage so a reload paints the right theme before the
// socket sync arrives.
//
// Canvas code reads the palette via getTheme() every frame, so a switch takes
// effect on the next frame; sprite/board caches key on the theme id.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { creepster } from "@/lib/fonts";

import type { ThemeId } from "@/types";
export type { ThemeId };

export const DEFAULT_THEME: ThemeId = "neon";
export const THEME_ORDER: ThemeId[] = ["neon", "halloween"];
const STORAGE_KEY = "luckydrop.theme";
/** Fired on window when the theme changes (audio.ts listens). */
export const THEME_EVENT = "luckydrop:themechange";
const EVENT = THEME_EVENT;

export interface Theme {
  id: ThemeId;
  /** Label shown on the operator toggle (not localised — it's a name). */
  label: string;

  // --- board canvas ---
  bgTop: string;
  bgBottom: string;
  /** "grid" = scrolling neon grid; "spooky" = moon, bats and drifting fog. */
  backdrop: "grid" | "spooky";
  grid: string;
  gridAccent: string;
  pegCore: string;
  pegGlow: string;
  divider: string;
  dividerGlow: string;
  /** WIN zone — must be a #rrggbb hex (alpha variants are derived from it). */
  winBorder: string;
  winGlow: string;
  winFill: string;
  bouncyPeg: string;
  bouncyPegGlow: string;
  platform: string;
  platformEdge: string;
  platformGlow: string;
  /** Cannonball — "r,g,b" so the trail gradient can vary alpha. */
  projectileRgb: string;
  ballCoreInner: string;
  ballCoreOuter: string;
  /** Overlay that dims the board while recycling. */
  dim: string;

  // --- DOM chrome ---
  pageBg: string;
  sidebarBg: string;
  /** Primary button + input focus ring on the phone. */
  buttonBg: string;
  /** Gradient for the highlighted half of the title and the round number. */
  accentGradient: string;
  titleGradient: string;
  winnerBg: string;
  winnerGlow: string;
  confetti: string[];
  /** Emoji thrown as confetti on the winner screen (alongside paper bits). */
  confettiEmojis?: string[];
  /** Emoji ids floated to the front of the phone picker. */
  featuredEmojis: string[];
  /** Emoji the lobby demo's dummy ball wears. */
  demoEmoji: string;

  // --- art (paths under public/, basePath is added at load time) ---
  /** Painted backdrop drawn behind the board (cover-fit, darkened). */
  boardImage?: string;
  /** Full-screen backdrop behind the lobby and winner screens. */
  pageImage?: string;
  /** Emoji id drawn as each peg instead of a glowing dot. */
  pegEmoji?: string;
  /** Image hung in the top corners of the board and lobby. */
  cornerImage?: string;
  /** CSS font-family for big display titles (DOM and canvas). */
  displayFont?: string;
  /** Sound pack folder under public/sounds/ (unset = the default pack). */
  soundDir?: string;
  /** Multiplier on music volume, to level a pack mastered quieter than the
   *  default one (Halloween is ~-12.5 LUFS vs neon's ~-8). */
  musicGain?: number;
}

export const THEMES: Record<ThemeId, Theme> = {
  neon: {
    id: "neon",
    label: "Neon",
    bgTop: "#05060f",
    bgBottom: "#0a0a1c",
    backdrop: "grid",
    grid: "rgba(46,128,224,0.16)",
    gridAccent: "rgba(56,196,255,0.28)",
    pegCore: "#cdf3ff",
    pegGlow: "rgba(56,196,255,0.9)",
    divider: "#1e8bff",
    dividerGlow: "rgba(30,139,255,0.7)",
    winBorder: "#ff3ea5",
    winGlow: "rgba(255,64,160,0.85)",
    winFill: "rgba(255,62,165,0.12)",
    bouncyPeg: "#ff2bd6",
    bouncyPegGlow: "rgba(255,43,214,0.6)",
    platform: "#ffd54a",
    platformEdge: "#7a5a00",
    platformGlow: "rgba(255,213,74,0.6)",
    projectileRgb: "255,122,24",
    ballCoreInner: "rgba(20,24,40,0.92)",
    ballCoreOuter: "rgba(6,8,18,0.96)",
    dim: "rgba(5,6,15,0.55)",

    pageBg: "#0F172A",
    sidebarBg: "#0B1120",
    buttonBg: "#2563eb",
    accentGradient: "linear-gradient(to right, #facc15, #f97316)",
    titleGradient: "linear-gradient(to bottom, #fde047, #ca8a04)",
    winnerBg: "#05060f",
    winnerGlow: "#FFD700",
    confetti: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#ff3ea5"],
    featuredEmojis: [],
    demoEmoji: "rocket",
  },
  halloween: {
    id: "halloween",
    label: "Halloween 🎃",
    bgTop: "#0b0414",
    bgBottom: "#1a0a1f",
    backdrop: "spooky",
    grid: "rgba(140,60,200,0.10)",
    gridAccent: "rgba(255,120,20,0.18)",
    pegCore: "#ffe2b8",
    pegGlow: "rgba(255,122,20,0.9)",
    divider: "#8b3dff",
    dividerGlow: "rgba(139,61,255,0.75)",
    winBorder: "#7dff3a",
    winGlow: "rgba(125,255,58,0.85)",
    winFill: "rgba(125,255,58,0.12)",
    bouncyPeg: "#b44dff",
    bouncyPegGlow: "rgba(180,77,255,0.65)",
    platform: "#ff8a1f",
    platformEdge: "#5a2600",
    platformGlow: "rgba(255,138,31,0.6)",
    projectileRgb: "125,255,58",
    ballCoreInner: "rgba(30,14,40,0.92)",
    ballCoreOuter: "rgba(10,4,16,0.96)",
    dim: "rgba(11,4,20,0.6)",

    pageBg: "#140a1c",
    sidebarBg: "#0e0614",
    buttonBg: "#ea580c",
    accentGradient: "linear-gradient(to right, #ff9a1f, #ff5a00)",
    titleGradient: "linear-gradient(to bottom, #ffb347, #ff5a00)",
    winnerBg: "#0b0414",
    winnerGlow: "#ff7a1a",
    confetti: ["#ff7a1a", "#ffb347", "#8b3dff", "#7dff3a", "#f5f5f5", "#2a0f3a"],
    confettiEmojis: ["\u{1F383}", "\u{1F987}", "\u{1F47B}", "\u{1F36C}", "\u{1F577}\u{FE0F}"],
    featuredEmojis: [
      "pumpkin", "ghost", "bat", "skull", "spider", "zombie",
      "vampire", "wizard", "devil", "candy", "crystal", "moon",
    ],
    demoEmoji: "pumpkin",

    // AI-generated (gpt-image-2) plates; web.png is Twemoji (CC-BY 4.0)
    boardImage: "/themes/halloween/board.jpg",
    pageImage: "/themes/halloween/lobby.jpg",
    pegEmoji: "pumpkin",
    cornerImage: "/themes/halloween/web.svg",
    displayFont: creepster.style.fontFamily,
    soundDir: "halloween",
    musicGain: 1.4,
  },
};

// --- art loading -------------------------------------------------------------

/** Public path with the deploy sub-path prepended (for <img>/CSS url()). */
export function assetUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}`;
}

const imageCache = new Map<string, HTMLImageElement>();

/** Loaded theme image, or null until it has arrived (load kicks off on first
 *  call). Canvas callers include the loaded state in their cache keys. */
export function getThemeImage(path: string): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  let img = imageCache.get(path);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.src = assetUrl(path);
    imageCache.set(path, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

// --- store ------------------------------------------------------------------

let current: ThemeId = DEFAULT_THEME;
let hydrated = false;

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && v in THEMES;
}

/** Current theme. Safe to call during SSR and every frame (cheap). */
export function getTheme(): Theme {
  if (typeof window !== "undefined" && !hydrated) {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    current = isThemeId(saved) ? saved : DEFAULT_THEME;
    hydrated = true;
  }
  return THEMES[current];
}

export function setTheme(id: ThemeId): void {
  current = id;
  hydrated = true;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
  }
}

// --- React ------------------------------------------------------------------

/** Renders the default on the server and the stored choice after mount, so
 *  hydration markup matches (same approach as useLang). */
export function useTheme(): Theme {
  const [id, setId] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    setId(getTheme().id);
    const onChange = (e: Event) =>
      setId((e as CustomEvent<ThemeId>).detail ?? getTheme().id);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  return THEMES[id];
}

/** Follow the server-owned theme (set only from the operator panel). */
export function useServerTheme(): void {
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    // Replays the latest value on subscribe — see subscribeServerPrefs
    import("@/lib/socket").then(({ subscribeServerPrefs }) => {
      if (cancelled) return;
      unsubscribe = subscribeServerPrefs(({ theme }) => {
        if (isThemeId(theme) && theme !== getTheme().id) setTheme(theme);
      });
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);
}
