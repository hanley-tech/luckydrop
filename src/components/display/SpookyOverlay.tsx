"use client";

import { useTheme } from "@/lib/theme";

/**
 * Halloween critters for DOM screens (lobby, winner, phone). Pure CSS
 * animation, pointer-events off; renders nothing for other themes.
 *
 * Bats are SVG with separately hinged wings: three nested layers do the
 * crossing (left %), the swooping climb/dive (translateY) and the wing
 * beat (rotate about the shoulder), so they read as flying, not floating.
 */
const BATS = [
  { top: "10%", size: 7, dur: 9, delay: 0, dir: "r", swoop: 5.5, flap: 0.22 },
  { top: "22%", size: 4.5, dur: 12, delay: 4, dir: "l", swoop: 4.2, flap: 0.18 },
  { top: "5%", size: 3.5, dur: 7.5, delay: 2, dir: "l", swoop: 3.6, flap: 0.16 },
  { top: "30%", size: 5.5, dur: 10.5, delay: 7, dir: "r", swoop: 4.8, flap: 0.2 },
  { top: "14%", size: 3, dur: 8.5, delay: 5.5, dir: "r", swoop: 3.2, flap: 0.15 },
];

const GHOSTS = [
  { top: "45%", size: 5, dur: 26, delay: 2, dir: "r" },
  { top: "66%", size: 3.5, dur: 31, delay: 12, dir: "l" },
];

function Bat({ flap }: { flap: number }) {
  const wing = (side: "l" | "r") => ({
    transformBox: "view-box" as const,
    transformOrigin: "50px 30px",
    animation: `bat-wing-${side} ${flap}s ease-in-out infinite alternate`,
  });
  return (
    <svg viewBox="0 0 100 60" width="1em" height="0.6em" style={{ overflow: "visible" }}>
      <defs>
        <filter id="bat-rim" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.6" floodColor="#b77dff" floodOpacity="0.9" />
        </filter>
      </defs>
      <g fill="#14061c" filter="url(#bat-rim)">
        {/* left wing: scalloped membrane hinged at the shoulder */}
        <path
          style={wing("l")}
          d="M50 30 C42 20 30 14 4 18 C10 24 12 30 10 36 C16 32 22 33 25 38 C29 33 35 33 38 38 C40 34 45 33 50 34 Z"
        />
        <path
          style={wing("r")}
          d="M50 30 C58 20 70 14 96 18 C90 24 88 30 90 36 C84 32 78 33 75 38 C71 33 65 33 62 38 C60 34 55 33 50 34 Z"
        />
        {/* body + head with ears */}
        <ellipse cx="50" cy="34" rx="5.5" ry="9" />
        <path d="M44.5 27 L45.5 18 L48.5 24 L51.5 24 L54.5 18 L55.5 27 Z" />
      </g>
      <circle cx="48" cy="26.5" r="1.1" fill="#ff8a1f" />
      <circle cx="52" cy="26.5" r="1.1" fill="#ff8a1f" />
    </svg>
  );
}

/** `behind` puts critters under the page content (parent needs `isolate`). */
export default function SpookyOverlay({
  scale = 1,
  behind = false,
}: {
  scale?: number;
  behind?: boolean;
}) {
  const theme = useTheme();
  if (theme.backdrop !== "spooky") return null;
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${behind ? "-z-10" : "z-[5]"}`}
      aria-hidden
    >
      {BATS.map((b, i) => (
        <span
          key={`bat-${i}`}
          className="absolute spooky-offscreen"
          style={{
            top: b.top,
            fontSize: `calc(${b.size}rem * ${scale})`,
            animation: `spooky-fly-${b.dir} ${b.dur}s linear ${b.delay}s infinite`,
          }}
        >
          <span
            className="inline-block"
            style={{ animation: `bat-swoop ${b.swoop}s ease-in-out ${b.delay}s infinite` }}
          >
            <Bat flap={b.flap} />
          </span>
        </span>
      ))}
      {GHOSTS.map((g, i) => (
        <span
          key={`ghost-${i}`}
          className="absolute spooky-offscreen"
          style={{
            top: g.top,
            fontSize: `calc(${g.size}rem * ${scale})`,
            animation: `spooky-fly-${g.dir} ${g.dur}s linear ${g.delay}s infinite`,
            opacity: 0.55,
          }}
        >
          <span className="inline-block spooky-wobble">{"\u{1F47B}"}</span>
        </span>
      ))}
    </div>
  );
}
