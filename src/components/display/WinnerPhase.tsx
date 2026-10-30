"use client";

import { useEffect, useMemo } from "react";
import { useLang } from "@/lib/i18n";
import { assetUrl, useTheme, Theme } from "@/lib/theme";
import confetti from "canvas-confetti";
import { Player } from "@/types";
import { getEmoji } from "@/lib/emojis";
import SpookyOverlay from "./SpookyOverlay";

interface WinnerPhaseProps {
  winner: Player;
  players: Player[];
  /** How many top places to celebrate on the podium (1 = single champion). */
  winnerCount?: number;
}

/**
 * Rank players: winner first, then the later a player was eliminated the higher
 * they rank. Same-round eliminations tiebreak by settle order — the ball that
 * came to rest *last* ranks higher (it stayed in play longer that round).
 */
function rankPlayers(winner: Player, players: Player[]): Player[] {
  const others = players
    .filter((p) => p.id !== winner.id)
    .sort((a, b) => {
      const roundDiff = (b.eliminatedRound ?? 0) - (a.eliminatedRound ?? 0);
      if (roundDiff !== 0) return roundDiff;
      return (b.eliminatedOrder ?? -1) - (a.eliminatedOrder ?? -1);
    });
  return [winner, ...others];
}

// Gradient accents for places 1..5
const PLACE_ACCENTS = [
  "from-yellow-300 to-yellow-600", // 1st gold
  "from-slate-200 to-slate-400", // 2nd silver
  "from-amber-500 to-amber-700", // 3rd bronze
  "from-cyan-300 to-blue-500", // 4th
  "from-fuchsia-300 to-purple-500", // 5th
];

function RunnersUp({ players, startPlace }: { players: Player[]; startPlace: number }) {
  const { t } = useLang();
  if (players.length === 0) return null;
  return (
    <div className="absolute left-0 right-0 bottom-[5%] flex flex-col items-center gap-6">
      <p className="text-3xl font-bold uppercase tracking-[0.35em] text-slate-400">
        {t("winner.runnersUp")}
      </p>
      <div className="flex items-center justify-center gap-12 flex-wrap px-12">
        {players.map((p, idx) => {
          const place = startPlace + idx;
          return (
            <div key={p.id} className="flex items-center gap-4">
              <span className="text-5xl font-black text-slate-500">{place}</span>
              <span className="text-6xl">{getEmoji(p.emoji)}</span>
              <span className="text-4xl font-semibold text-slate-100 max-w-[16rem] truncate">
                {p.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WinnerPhase({ winner, players, winnerCount = 1 }: WinnerPhaseProps) {
  const { t } = useLang();
  const theme = useTheme();
  const podiumSize = Math.max(1, winnerCount);
  const confettiColors = theme.confetti;
  const confettiEmojis = theme.confettiEmojis;

  useEffect(() => {
    const duration = 7000;
    const end = Date.now() + duration;

    // Themed emoji confetti (🎃🦇👻…) thrown alongside the paper bits.
    // shapeFromText bakes at a scalar, so emoji bursts use that same scalar.
    const EMOJI_SCALAR = 3;
    const emojiShapes = (confettiEmojis ?? []).map((text) =>
      confetti.shapeFromText({ text, scalar: EMOJI_SCALAR })
    );
    const emojiBurst = (opts: confetti.Options) => {
      if (emojiShapes.length === 0) return;
      confetti({ ...opts, shapes: emojiShapes, scalar: EMOJI_SCALAR, flat: true });
    };

    // Continuous side cannons — default (square/circle) confetti tumbles in 3D
    // and a high start velocity + wide spread throws it across the screen.
    const frame = () => {
      confetti({
        particleCount: 9,
        angle: 60,
        spread: 115,
        startVelocity: 72,
        gravity: 0.9,
        ticks: 260,
        scalar: 1.15,
        origin: { x: 0, y: 0.8 },
        colors: confettiColors,
      });
      confetti({
        particleCount: 9,
        angle: 120,
        spread: 115,
        startVelocity: 72,
        gravity: 0.9,
        ticks: 260,
        scalar: 1.15,
        origin: { x: 1, y: 0.8 },
        colors: confettiColors,
      });
      if (Math.random() < 0.12) {
        emojiBurst({ particleCount: 1, angle: 60, spread: 70, startVelocity: 70, ticks: 320, origin: { x: 0, y: 0.8 } });
        emojiBurst({ particleCount: 1, angle: 120, spread: 70, startVelocity: 70, ticks: 320, origin: { x: 1, y: 0.8 } });
      }
      if (Date.now() < end) requestAnimationFrame(frame);
    };

    // Big opening blast that spreads wide from center
    confetti({
      particleCount: 360,
      spread: 180,
      startVelocity: 85,
      ticks: 300,
      scalar: 1.25,
      origin: { x: 0.5, y: 0.5 },
      colors: confettiColors,
    });
    confetti({
      particleCount: 160,
      spread: 360,
      startVelocity: 45,
      ticks: 320,
      scalar: 1.1,
      origin: { x: 0.5, y: 0.45 },
      colors: confettiColors,
    });
    emojiBurst({
      particleCount: 40,
      spread: 160,
      startVelocity: 70,
      ticks: 340,
      origin: { x: 0.5, y: 0.5 },
    });
    frame();
  }, [podiumSize, confettiColors, confettiEmojis]);

  const ranking = useMemo(() => rankPlayers(winner, players), [winner, players]);
  const podium = ranking.slice(0, podiumSize);
  const runnersUp = ranking.slice(podiumSize, podiumSize + 5);

  // ----- Single champion layout -----
  if (podium.length === 1) {
    const emoji = getEmoji(winner.emoji);
    return (
      <Shell theme={theme}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-10 px-12 pb-[18%]">
          <h1
            className="text-[12rem] font-black text-transparent bg-clip-text animate-bounce tracking-wider leading-none"
            style={{ backgroundImage: theme.titleGradient, fontFamily: theme.displayFont }}
          >
            {t("winner.title")}
          </h1>
          <div className="text-[14rem] leading-none">{emoji}</div>
          <p className="text-[7rem] font-black text-white text-center leading-tight">
            {winner.name}
          </p>
        </div>
        <RunnersUp players={runnersUp} startPlace={2} />
      </Shell>
    );
  }

  // ----- Multi-winner podium layout: champion alone on top, rest below -----
  const champion = podium[0];
  const rest = podium.slice(1);
  return (
    <Shell theme={theme}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-10 px-12 pb-[14%]">
        <h1
          className="text-[7rem] font-black text-transparent bg-clip-text tracking-wider leading-none"
          style={{ backgroundImage: theme.titleGradient, fontFamily: theme.displayFont }}
        >
          TOP {podiumSize}
        </h1>

        {/* Champion — own row */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-8xl font-black bg-clip-text text-transparent bg-gradient-to-b from-yellow-300 to-yellow-600 leading-none animate-bounce">
            1
          </span>
          <div className="text-[12rem] leading-none">{getEmoji(champion.emoji)}</div>
          <p className="text-7xl font-black text-white text-center max-w-[28rem] truncate">
            {champion.name}
          </p>
        </div>

        {/* Remaining podium places — row below */}
        {rest.length > 0 && (
          <div className="flex items-start justify-center gap-16 flex-wrap">
            {rest.map((p, i) => {
              const idx = i + 1; // place index (1 = 2nd)
              const accent = PLACE_ACCENTS[idx] ?? PLACE_ACCENTS[PLACE_ACCENTS.length - 1];
              return (
                <div key={p.id} className="flex flex-col items-center gap-2">
                  <span
                    className={`text-6xl font-black bg-clip-text text-transparent bg-gradient-to-b ${accent} leading-none`}
                  >
                    {idx + 1}
                  </span>
                  <div className="text-[7rem] leading-none">{getEmoji(p.emoji)}</div>
                  <p className="text-4xl font-bold text-slate-100 text-center max-w-[16rem] truncate">
                    {p.name}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <RunnersUp players={runnersUp} startPlace={podiumSize + 1} />
    </Shell>
  );
}

function Shell({ children, theme }: { children: React.ReactNode; theme: Theme }) {
  return (
    <div
      className="w-full h-full flex items-center justify-center relative overflow-hidden"
      style={{
        background: theme.pageImage
          ? `linear-gradient(rgba(8,2,14,0.6), rgba(8,2,14,0.6)), url(${assetUrl(theme.pageImage)}) center / cover`
          : theme.winnerBg,
      }}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${theme.winnerGlow}, transparent 70%)`,
        }}
      />
      <div
        className="absolute w-[1000px] h-[1000px] rounded-full border-2 opacity-10 animate-spin"
        style={{ animationDuration: "20s", borderColor: theme.winnerGlow }}
      />
      <SpookyOverlay scale={3} />
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
}
