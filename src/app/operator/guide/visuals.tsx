"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

// ---------------------------------------------------------------------------
// Visuals for the operator guide: screenshots, two animated diagrams and a
// tiny animated plinko. Pure SVG/CSS (keyframes in globals.css under
// "Operator guide"); all motion stops under prefers-reduced-motion.
// ---------------------------------------------------------------------------

function asset(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}`;
}

/** Fade + rise into view the first time it scrolls on screen. */
export function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`guide-reveal ${shown ? "guide-reveal-in" : ""}`}>
      {children}
    </div>
  );
}

/** A screenshot. `kind` picks the frame: a TV bezel or a phone. */
export function Shot({
  src,
  alt,
  caption,
  kind = "tv",
}: {
  src: string;
  alt: string;
  caption?: string;
  kind?: "tv" | "phone";
}) {
  return (
    <figure className="space-y-2">
      <div
        className={
          kind === "phone"
            ? "mx-auto max-w-[220px] overflow-hidden rounded-[1.75rem] border-[6px] border-slate-700 bg-black shadow-xl"
            : "overflow-hidden rounded-lg border-4 border-slate-700 bg-black shadow-xl"
        }
      >
        {/* Tap to open full size — big-screen shots are small on a phone */}
        <a href={asset(src)} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset(src)} alt={alt} loading="lazy" className="block h-auto w-full" />
        </a>
      </div>
      {caption && <figcaption className="text-center text-sm text-slate-400">{caption}</figcaption>}
    </figure>
  );
}

/** Two screenshots of the same view that crossfade back and forth. */
export function Crossfade({
  a,
  b,
  labelA,
  labelB,
  alt,
}: {
  a: string;
  b: string;
  labelA: string;
  labelB: string;
  alt: string;
}) {
  return (
    <figure className="space-y-2">
      <div className="relative overflow-hidden rounded-lg border-4 border-slate-700 bg-black shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset(a)} alt={`${alt} — ${labelA}`} loading="lazy" className="block h-auto w-full" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset(b)}
          alt={`${alt} — ${labelB}`}
          loading="lazy"
          className="guide-crossfade absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <figcaption className="flex justify-center gap-3 text-sm">
        <span className="guide-crossfade-a rounded-full bg-sky-500/20 px-3 py-1 text-sky-300">{labelA}</span>
        <span className="guide-crossfade-b rounded-full bg-orange-500/20 px-3 py-1 text-orange-300">{labelB}</span>
      </figcaption>
    </figure>
  );
}

// --- Diagram: how the three screens connect --------------------------------

export function ScreensDiagram({
  labels,
}: {
  labels: { server: string; display: string; phones: string; operator: string; wifi: string };
}) {
  // Data packets travel server -> each device along these paths
  const links = [
    { id: "to-tv", d: "M180 118 L180 78" },
    { id: "to-phones", d: "M160 152 L84 196" },
    { id: "to-op", d: "M200 152 L276 196" },
  ];
  return (
    <svg viewBox="0 0 360 290" className="w-full" role="img" aria-label={labels.wifi}>
      {links.map((l) => (
        <path key={l.id} id={l.id} d={l.d} className="guide-flow" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
      ))}
      {links.map((l, i) => (
        <circle key={`p-${l.id}`} r="4" fill="#f472b6">
          <animateMotion dur="1.6s" begin={`${i * 0.5}s`} repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear">
            <mpath href={`#${l.id}`} />
          </animateMotion>
        </circle>
      ))}

      {/* Big screen */}
      <rect x="110" y="14" width="140" height="64" rx="6" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
      <rect x="166" y="24" width="28" height="28" rx="2" fill="#fff" />
      <path d="M170 28h7v7h-7zM183 28h7v7h-7zM170 41h7v7h-7zM183 41h3v3h-3zM186 44h4v4h-4z" fill="#0f172a" />
      <rect x="158" y="78" width="44" height="5" rx="2" fill="#64748b" />
      <text x="180" y="70" textAnchor="middle" fontSize="9" fill="#94a3b8">LuckyDrop</text>

      {/* Server */}
      <rect x="138" y="118" width="84" height="34" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" className="guide-pulse" />
      <text x="180" y="140" textAnchor="middle" fontSize="12" fontWeight="700" fill="#e2e8f0">{labels.server}</text>

      {/* Player phones */}
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${34 + i * 26} ${196 + (i % 2) * 6})`}>
          <rect width="22" height="40" rx="4" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
          <text x="11" y="25" textAnchor="middle" fontSize="12">{["🐶", "🦊", "🎃"][i]}</text>
        </g>
      ))}

      {/* Operator phone */}
      <g transform="translate(262 196)">
        <rect width="30" height="50" rx="5" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
        <rect x="6" y="10" width="18" height="6" rx="2" fill="#16a34a" />
        <rect x="6" y="20" width="18" height="6" rx="2" fill="#ca8a04" />
        <rect x="6" y="30" width="18" height="6" rx="2" fill="#dc2626" />
      </g>

      <text x="290" y="48" textAnchor="start" fontSize="11" fill="#cbd5e1">{labels.display}</text>
      <text x="70" y="270" textAnchor="middle" fontSize="11" fill="#cbd5e1">{labels.phones}</text>
      <text x="277" y="270" textAnchor="middle" fontSize="11" fill="#cbd5e1">{labels.operator}</text>
      <text x="180" y="286" textAnchor="middle" fontSize="10" fill="#64748b">{labels.wifi}</text>
    </svg>
  );
}

// --- Diagram: how a match flows ----------------------------------------------

export function FlowDiagram({
  steps,
}: {
  steps: { icon: string; title: string; desc: string; loop?: string }[];
}) {
  const cycle = steps.length * 1.6; // seconds for the highlight to visit every step
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => (
        <li key={s.title}>
          <div
            className="guide-step flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-800 p-3"
            style={{ animationDuration: `${cycle}s`, animationDelay: `${i * 1.6}s` }}
          >
            <span className="text-3xl leading-none">{s.icon}</span>
            <div>
              <p className="font-bold text-white">{s.title}</p>
              <p className="text-sm text-slate-400">{s.desc}</p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className="flex items-center gap-2 py-1 pl-7 text-slate-500">
              <span className="guide-arrow">↓</span>
              {s.loop && <span className="text-xs text-amber-300">↺ {s.loop}</span>}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

// --- Animated mini plinko: in the WIN zone you advance, elsewhere you're out --

const PEG_ROWS = [50, 80, 110, 140, 170];

export function DropDemo({ labels }: { labels: { win: string; out: string; advance: string } }) {
  const balls = [
    {
      // lands in WIN
      path: "M150 8 L150 38 L136 64 L162 94 L140 124 L158 154 L150 184 L150 232",
      color: "#facc15",
      emoji: "🐶",
      end: [150, 232],
      win: true,
      begin: "0s",
    },
    {
      path: "M150 8 L150 38 L122 64 L98 94 L78 124 L60 154 L46 184 L42 232",
      color: "#f472b6",
      emoji: "🦊",
      end: [42, 232],
      win: false,
      begin: "1.2s",
    },
    {
      path: "M150 8 L150 38 L176 64 L204 94 L218 124 L238 154 L254 184 L258 232",
      color: "#a78bfa",
      emoji: "🐼",
      end: [258, 232],
      win: false,
      begin: "2.4s",
    },
  ];
  const DUR = "3.6s";
  return (
    <figure className="space-y-2">
      <svg viewBox="0 0 300 262" className="mx-auto w-full max-w-sm rounded-lg border-4 border-slate-700 bg-[#05060f]">
        {/* pegs */}
        {PEG_ROWS.map((y, r) =>
          Array.from({ length: r % 2 === 0 ? 7 : 6 }, (_, c) => {
            const x = r % 2 === 0 ? 30 + c * 40 : 50 + c * 40;
            return <circle key={`${r}-${c}`} cx={x} cy={y} r="3.5" fill="#7dd3fc" opacity="0.85" />;
          })
        )}
        {/* slots */}
        <rect x="128" y="200" width="44" height="62" fill="#ff3ea5" opacity="0.18" />
        {[86, 128, 172, 214].map((x) => (
          <rect key={x} x={x - 1.5} y="200" width="3" height="62" fill="#1e8bff" />
        ))}
        <text x="150" y="216" textAnchor="middle" fontSize="12" fontWeight="800" fill="#ff3ea5">
          {labels.win}
        </text>

        {balls.map((b, i) => (
          <g key={i}>
            <path id={`drop-${i}`} d={b.path} fill="none" />
            <g>
              <circle r="10" fill="#0b1020" stroke={b.color} strokeWidth="2.5" />
              <text textAnchor="middle" dy="4" fontSize="11">{b.emoji}</text>
              <animateMotion dur={DUR} begin={b.begin} repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.7;1" calcMode="linear">
                <mpath href={`#drop-${i}`} />
              </animateMotion>
              <animate attributeName="opacity" dur={DUR} begin={b.begin} repeatCount="indefinite" values="1;1;0;0" keyTimes="0;0.72;0.74;1" />
            </g>
            {/* landing burst: gold star ring for WIN, red pop for out */}
            <circle cx={b.end[0]} cy={b.end[1]} fill="none" stroke={b.win ? "#facc15" : "#ef4444"} strokeWidth="3" r="0">
              <animate attributeName="r" dur={DUR} begin={b.begin} repeatCount="indefinite" values="0;0;24;24" keyTimes="0;0.72;0.9;1" />
              <animate attributeName="opacity" dur={DUR} begin={b.begin} repeatCount="indefinite" values="0;0;1;0" keyTimes="0;0.72;0.75;0.95" />
            </circle>
            <text x={b.end[0]} y={b.end[1] - 18} textAnchor="middle" fontSize="11" fontWeight="700" fill={b.win ? "#facc15" : "#f87171"} opacity="0">
              {b.win ? labels.advance : labels.out}
              <animate attributeName="opacity" dur={DUR} begin={b.begin} repeatCount="indefinite" values="0;0;1;1;0" keyTimes="0;0.72;0.76;0.92;1" />
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
