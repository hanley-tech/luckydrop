"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { S2C, C2S } from "@/lib/socketEvents";
import { GamePhase, GameState, Player, LevelId } from "@/types";
import QRCodePhase from "@/components/display/QRCodePhase";
import GamePhaseComponent from "@/components/display/GamePhase";
import WinnerPhase from "@/components/display/WinnerPhase";
import DisplayFrame from "@/components/display/DisplayFrame";
import ConnectionIndicator from "@/components/ConnectionIndicator";
import {
  announcePlayerJoined,
  announceGameStart,
  announceRoundStart,
  announceRetry,
  announceAllAdvanced,
  announceRoundComplete,
  announceWinner,
  announceGameReset,
  announceBulkJoin,
  unlockAudio,
  setTTSEnabled,
  setSFXEnabled,
  setMusicEnabled,
  playMusic,
  preloadAudioAssets,
  resetMatchIntensity,
  isTTSEnabled,
} from "@/lib/audio";
import { preloadEmojiImages } from "@/lib/emojiImages";

function AudioToggle() {
  const [muted, setMuted] = useState(false);
  return (
    <button
      onClick={() => {
        const next = !muted;
        setMuted(next);
        setTTSEnabled(!next);
        setSFXEnabled(!next);
        setMusicEnabled(!next);
        if (!next) unlockAudio();
      }}
      className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl hover:bg-black/70 transition-colors"
      title={muted ? "Unmute audio" : "Mute audio"}
    >
      {muted ? "\u{1F507}" : "\u{1F50A}"}
    </button>
  );
}

export default function DisplayPage() {
  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [players, setPlayers] = useState<Player[]>([]);
  const [round, setRound] = useState(0);
  const [winner, setWinner] = useState<Player | null>(null);
  const [dropPhase, setDropPhase] = useState<"dropping" | "recycling">(
    "dropping"
  );
  const [levelId, setLevelId] = useState<LevelId>("classic");
  const [winnerCount, setWinnerCount] = useState(1);
  const [audioReady, setAudioReady] = useState(false);
  const audioUnlocked = useRef(false);

  // Keep latest phase in a ref so the (mount-only) interaction listener can
  // start the correct track instead of always forcing lobby music.
  const phaseRef = useRef<GamePhase>(phase);
  phaseRef.current = phase;

  // When the game returns to the lobby (e.g. operator "Restart Match", which
  // arrives as a state-sync rather than a dedicated event), reset the
  // soundtrack: back to lobby music, normal tempo, no tension pulse.
  const prevPhaseRef = useRef<GamePhase>(phase);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (phase === "lobby" && prev !== "lobby") {
      resetMatchIntensity();
      playMusic("lobby");
    }
  }, [phase]);

  // Reflect game phase in the browser tab title
  useEffect(() => {
    document.title =
      phase === "winner" && winner
        ? `🏆 ${winner.name} wins! · LuckyDrop`
        : phase === "dropping" || phase === "recycling"
        ? `Round ${round} · LuckyDrop`
        : "LuckyDrop";
  }, [phase, round, winner]);

  // Preload sound config + assets up front so the first click can start music
  // synchronously (within the gesture window). Also warm the emoji images so
  // the canvas can draw them immediately.
  useEffect(() => {
    preloadAudioAssets();
    preloadEmojiImages();
  }, []);

  // Unlock audio on first user interaction (browser requirement)
  useEffect(() => {
    const handleInteraction = () => {
      if (!audioUnlocked.current) {
        unlockAudio();
        audioUnlocked.current = true;
      }
      setAudioReady(true);
      // Start (or resume) the track that matches the current phase
      const p = phaseRef.current;
      playMusic(
        p === "winner" ? "winner" : p === "lobby" ? "lobby" : "game"
      );
    };
    window.addEventListener("click", handleInteraction);
    window.addEventListener("keydown", handleInteraction);
    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();

    // Full state sync (reconnection or initial load)
    socket.on(S2C.GAME_STATE_SYNC, (state: GameState) => {
      setPhase(state.phase);
      setPlayers(state.players);
      setRound(state.round);
      setWinner(state.winner);
      setLevelId(state.levelId ?? "classic");
      setWinnerCount(state.winnerCount ?? 1);
      if (state.phase === "recycling") {
        setDropPhase("recycling");
      } else if (state.phase === "dropping") {
        setDropPhase("dropping");
      }
    });

    socket.on(S2C.LEVEL_CHANGED, (data: { levelId: LevelId }) => {
      setLevelId(data.levelId);
    });

    socket.on(S2C.WINNER_COUNT_CHANGED, (data: { winnerCount: number }) => {
      setWinnerCount(data.winnerCount);
    });

    // Player events
    socket.on(S2C.PLAYER_JOINED, (data: { player: Player }) => {
      setPlayers((prev) => {
        const updated = [...prev, data.player];
        announcePlayerJoined(data.player.name, updated.length);
        return updated;
      });
    });

    socket.on(S2C.PLAYER_LIST, (data: { players: Player[] }) => {
      setPlayers((prev) => {
        const added = data.players.length - prev.length;
        if (added > 1) {
          announceBulkJoin(added, data.players.length);
        }
        return data.players;
      });
    });

    // Game flow events
    socket.on(S2C.GAME_START, (data: { players: Player[] }) => {
      setPlayers(data.players);
      setPhase("dropping");
      setRound(1);
      setDropPhase("dropping");
      announceGameStart(data.players.length);
    });

    socket.on(S2C.ROUND_START, (data: { players: Player[]; roundNumber: number }) => {
      setPhase("dropping");
      setRound(data.roundNumber);
      setDropPhase("dropping");
      // Count non-eliminated for the announcement
      const activeCount = data.players?.length ?? 0;
      if (data.roundNumber > 1) {
        announceRoundStart(data.roundNumber, activeCount);
      }
    });

    socket.on(
      S2C.ROUND_COMPLETE,
      (data: {
        advanced: Player[];
        eliminated: Player[];
        roundNumber: number;
      }) => {
        // Mirror server-assigned eliminatedOrder onto local player state so
        // the in-game eliminated sidebar and the winner page can tiebreak
        // same-round losers in settle order instead of alphabetically.
        const elimMap = new Map(data.eliminated.map((p) => [p.id, p]));

        setPlayers((prev) =>
          prev.map((p) => {
            const elim = elimMap.get(p.id);
            return elim
              ? {
                  ...p,
                  eliminated: true,
                  eliminatedRound: data.roundNumber,
                  eliminatedOrder: elim.eliminatedOrder,
                }
              : p;
          })
        );

        if (data.eliminated.length === 0 && data.advanced.length === 0) {
          // Retry — nobody hit center
          setDropPhase("recycling");
          setPhase("recycling");
          announceRetry();
        } else if (data.eliminated.length === 0 && data.advanced.length > 1) {
          // Everyone hit center — redrop with same group
          setDropPhase("recycling");
          setPhase("recycling");
          announceAllAdvanced(data.advanced.length);
        } else {
          announceRoundComplete(
            data.advanced.length,
            data.eliminated.length,
            data.roundNumber
          );
        }
      }
    );

    socket.on(S2C.WINNER, (data: { player: Player; roundNumber: number }) => {
      setPhase("winner");
      setWinner(data.player);
      announceWinner(data.player.name);
    });

    socket.on(S2C.GAME_RESET, () => {
      setPhase("lobby");
      setPlayers([]);
      setRound(0);
      setWinner(null);
      setDropPhase("dropping");
      announceGameReset();
    });

    return () => {
      socket.off(S2C.GAME_STATE_SYNC);
      socket.off(S2C.PLAYER_JOINED);
      socket.off(S2C.PLAYER_LIST);
      socket.off(S2C.GAME_START);
      socket.off(S2C.ROUND_START);
      socket.off(S2C.ROUND_COMPLETE);
      socket.off(S2C.WINNER);
      socket.off(S2C.GAME_RESET);
      socket.off(S2C.LEVEL_CHANGED);
      socket.off(S2C.WINNER_COUNT_CHANGED);
    };
  }, []);

  const handleRoundResult = useCallback(
    (advancedIds: string[], eliminatedIds: string[]) => {
      const socket = getSocket();
      socket.emit(C2S.ROUND_RESULT, {
        advancedIds,
        eliminatedIds,
        roundNumber: round,
      });
    },
    [round]
  );

  // Render based on current phase
  let content;
  if (phase === "winner" && winner) {
    content = <WinnerPhase winner={winner} players={players} winnerCount={winnerCount} />;
  } else if (phase === "dropping" || phase === "recycling") {
    content = (
      <GamePhaseComponent
        players={players}
        round={round}
        phase={dropPhase}
        levelId={levelId}
        onRoundResult={handleRoundResult}
      />
    );
  } else {
    content = <QRCodePhase players={players} />;
  }

  return (
    <>
      <DisplayFrame>{content}</DisplayFrame>
      {/* Floating mute button — outside the frame so it stays at real viewport size */}
      <AudioToggle />
      <ConnectionIndicator corner="bottom-left" />
      {/* One-time gesture to unlock audio (browsers block autoplay until a
          click). Crucial for kiosk displays driven from another device. */}
      {!audioReady && (
        <button
          onClick={() => {
            if (!audioUnlocked.current) {
              unlockAudio();
              audioUnlocked.current = true;
            }
            setAudioReady(true);
            const p = phaseRef.current;
            playMusic(p === "winner" ? "winner" : p === "lobby" ? "lobby" : "game");
          }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-black/80 backdrop-blur-sm text-white cursor-pointer"
        >
          <span className="text-8xl animate-pulse">{"\u{1F50A}"}</span>
          <span className="text-4xl font-black tracking-wide">Tap to enable sound</span>
          <span className="text-xl text-slate-400">Click anywhere on this screen to start the music & effects</span>
        </button>
      )}
    </>
  );
}
