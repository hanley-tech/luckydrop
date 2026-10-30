"use client";

import { GameState, LevelId, Lang, ThemeId } from "@/types";
import { useLang } from "@/lib/i18n";
import { THEMES, THEME_ORDER } from "@/lib/theme";
import { LEVELS, LEVEL_ORDER } from "@/components/game/levels";

interface ControlPanelProps {
  gameState: GameState;
  onStart: () => void;
  onReset: () => void;
  onRestartMatch: () => void;
  onSetLevel: (levelId: LevelId) => void;
  onSetWinnerCount: (count: number) => void;
  onSetLang: (lang: Lang) => void;
  onSetTheme: (theme: ThemeId) => void;
  onSetSuddenDeath: (enabled: boolean) => void;
}

const WINNER_COUNT_OPTIONS = [1, 2, 3, 4, 5];
const LANG_OPTIONS: { id: Lang; label: string }[] = [
  { id: "zh", label: "中文" },
  { id: "en", label: "English" },
];

export default function ControlPanel({
  gameState,
  onStart,
  onReset,
  onRestartMatch,
  onSetLevel,
  onSetWinnerCount,
  onSetLang,
  onSetTheme,
  onSetSuddenDeath,
}: ControlPanelProps) {
  const { t } = useLang();
  const { phase, players, activePlayers, round, levelId, winnerCount, lang, theme, suddenDeathEnabled, suddenDeath } = gameState;
  const canStart = phase === "lobby" && players.length > 0;
  const canRestart = phase !== "lobby";
  const canChangeLevel = phase === "lobby";
  const activeLevel = LEVELS[levelId] ?? LEVELS.classic;

  return (
    <div className="bg-slate-800 rounded-xl p-6 space-y-6 border border-slate-700">
      <h2 className="text-2xl font-bold text-white">{t("op.gameControl")}</h2>

      {/* Status display */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-400 uppercase tracking-wide">
            {t("op.phase")}
          </p>
          <p className="text-xl font-bold text-white capitalize mt-1">
            {t(`phase.${phase}`)}
          </p>
        </div>
        <div className="bg-slate-900 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-400 uppercase tracking-wide">
            {t("op.round")}
          </p>
          <p className="text-xl font-bold text-white mt-1">{round}</p>
        </div>
        <div className="bg-slate-900 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-400 uppercase tracking-wide">
            {t("op.players")}
          </p>
          <p className="text-xl font-bold text-white mt-1">
            {activePlayers.length} / {players.length}
          </p>
        </div>
      </div>

      {/* Level picker */}
      <div className="bg-slate-900 rounded-lg p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="text-sm text-slate-400 uppercase tracking-wide">
            {t("op.levelNext")}
          </label>
          <select
            value={levelId}
            onChange={(e) => onSetLevel(e.target.value as LevelId)}
            disabled={!canChangeLevel}
            className={`flex-1 max-w-sm bg-slate-800 text-white rounded-lg px-3 py-2 font-semibold border border-slate-600 ${
              canChangeLevel ? "cursor-pointer hover:border-slate-500" : "opacity-60 cursor-not-allowed"
            }`}
          >
            {LEVEL_ORDER.map((id) => (
              <option key={id} value={id}>
                {t(`level.${id}.name`)}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500">{t(`level.${levelId}.desc`)}</p>
        {!canChangeLevel && (
          <p className="text-xs text-yellow-400">
            Locked while a match is in progress. Restart match to switch levels.
          </p>
        )}
      </div>

      {/* Language — applies to the display and every attendee's phone.
          Unlike level and podium size this stays enabled mid-match: it is
          presentation only, and a room that needs English needs it now. */}
      <div className="bg-slate-900 rounded-lg p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="text-sm text-slate-400 uppercase tracking-wide">
            {t("op.language")}
          </label>
          <div className="flex flex-wrap gap-2">
            {LANG_OPTIONS.map((o) => (
              <button
                key={o.id}
                onClick={() => onSetLang(o.id)}
                className={`px-4 py-2 rounded-lg font-bold border transition-all cursor-pointer ${
                  lang === o.id
                    ? "bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30"
                    : "bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">{t("op.languageHint")}</p>
      </div>

      {/* Theme — like language, presentation only, so it stays enabled mid-match */}
      <div className="bg-slate-900 rounded-lg p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="text-sm text-slate-400 uppercase tracking-wide">
            {t("op.theme")}
          </label>
          <div className="flex flex-wrap gap-2">
            {THEME_ORDER.map((id) => (
              <button
                key={id}
                onClick={() => onSetTheme(id)}
                className={`px-4 py-2 rounded-lg font-bold border transition-all cursor-pointer ${
                  theme === id
                    ? "bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30"
                    : "bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500"
                }`}
              >
                {THEMES[id].label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">{t("op.themeHint")}</p>
      </div>

      {/* Winner count (prizes) picker */}
      <div className="bg-slate-900 rounded-lg p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="text-sm text-slate-400 uppercase tracking-wide">
            {t("op.prizeWinners")}
          </label>
          <div className="flex flex-wrap gap-2">
            {WINNER_COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => onSetWinnerCount(n)}
                disabled={!canChangeLevel}
                className={`w-12 py-2 rounded-lg font-bold border transition-all ${
                  winnerCount === n
                    ? "bg-pink-600 border-pink-400 text-white shadow-lg shadow-pink-600/30"
                    : "bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500"
                } ${canChangeLevel ? "cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">
          {winnerCount === 1
            ? t("op.winnerHint.one")
            : t("op.winnerHint.many", { n: winnerCount })}
        </p>
      </div>

      {/* Sudden death — stays enabled mid-match so a stuck final round can be
          rescued; turning it off doesn't end a sudden death already running */}
      <div className="bg-slate-900 rounded-lg p-4 space-y-2">
        <label className="flex items-center gap-3 cursor-pointer min-h-11">
          <input
            type="checkbox"
            checked={suddenDeathEnabled}
            onChange={(e) => onSetSuddenDeath(e.target.checked)}
            className="w-6 h-6 accent-red-500 cursor-pointer shrink-0"
          />
          <span className="text-sm text-slate-400 uppercase tracking-wide">
            {t("op.suddenDeath")}
          </span>
          {suddenDeath && (phase === "dropping" || phase === "recycling") && (
            <span className="ml-auto text-xs font-bold text-red-400 animate-pulse">
              {t("op.suddenDeathActive")}
            </span>
          )}
        </label>
        <p className="text-xs text-slate-500">{t("op.suddenDeathHint")}</p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 sm:gap-4">
        <button
          onClick={onStart}
          disabled={!canStart}
          className={`flex-1 min-w-0 py-4 px-2 sm:px-6 rounded-xl text-lg sm:text-xl font-bold transition-all ${
            canStart
              ? "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30 active:scale-95"
              : "bg-slate-700 text-slate-500 cursor-not-allowed"
          }`}
        >
          {t("op.startGame")}
        </button>
        <button
          onClick={onRestartMatch}
          disabled={!canRestart}
          className={`flex-1 min-w-0 py-4 px-2 sm:px-6 rounded-xl text-lg sm:text-xl font-bold transition-all ${
            canRestart
              ? "bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg shadow-yellow-600/30 active:scale-95"
              : "bg-slate-700 text-slate-500 cursor-not-allowed"
          }`}
        >
          {t("op.restartMatch")}
        </button>
        <button
          onClick={onReset}
          className="flex-1 min-w-0 py-4 px-2 sm:px-6 rounded-xl text-lg sm:text-xl font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 active:scale-95 transition-all"
        >
          {t("op.resetAll")}
        </button>
      </div>
      <p className="text-sm text-slate-400">
        <span className="text-yellow-400 font-semibold">{t("op.footnote.restart")}</span>{t("op.footnote.restartDesc")}
        <span className="text-red-400 font-semibold">{t("op.footnote.reset")}</span>{t("op.footnote.resetDesc")}
      </p>
    </div>
  );
}
