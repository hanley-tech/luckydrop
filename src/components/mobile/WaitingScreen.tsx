"use client";

import { getEmoji } from "@/lib/emojis";
import { useLang } from "@/lib/i18n";
import type { Player } from "@/types";

interface WaitingScreenProps {
  player: Player;
  gamePhase: string;
  roundNumber: number;
  isEliminated: boolean;
  isWinner: boolean;
  alreadyJoined?: boolean;
}

export default function WaitingScreen({
  player,
  gamePhase,
  roundNumber,
  isEliminated,
  isWinner,
  alreadyJoined,
}: WaitingScreenProps) {
  const { t } = useLang();
  const emoji = getEmoji(player.emoji);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto text-center">
      {/* Emoji display */}
      <div className="text-8xl">{emoji}</div>

      {/* Player name */}
      <h2 className="text-2xl font-bold text-white">{player.name}</h2>

      {/* Already joined notice */}
      {alreadyJoined && gamePhase === "lobby" && (
        <p className="text-slate-400 text-sm">{t("wait.alreadyJoined")}</p>
      )}

      {/* Status messages based on game state */}
      {isWinner ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-4xl font-extrabold text-yellow-400 animate-pulse">
            {t("wait.youWon")}
          </p>
          <p className="text-yellow-300 text-lg">{t("wait.congrats")}</p>
        </div>
      ) : isEliminated ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xl font-semibold text-red-400">
            Eliminated in Round {player.eliminatedRound ?? roundNumber}
          </p>
          <p className="text-slate-400">{t("wait.betterLuck")}</p>
        </div>
      ) : gamePhase === "lobby" ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-semibold text-green-400">{t("wait.youreIn")}</p>
          <p className="text-slate-300">{t("wait.watchScreen")}</p>
          <div className="mt-2 flex gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-semibold text-blue-400">
            Round {roundNumber}
          </p>
          <p className="text-green-400 font-medium">{t("wait.advanced")}</p>
          <p className="text-slate-400 text-sm">{t("wait.keepWatching")}</p>
        </div>
      )}
    </div>
  );
}
