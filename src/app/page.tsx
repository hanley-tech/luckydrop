"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { S2C, C2S } from "@/lib/socketEvents";
import { GamePhase, GameState, Player } from "@/types";
import QRCodePhase from "@/components/display/QRCodePhase";
import GamePhaseComponent from "@/components/display/GamePhase";
import WinnerPhase from "@/components/display/WinnerPhase";
import DisplayFrame from "@/components/display/DisplayFrame";
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
  isTTSEnabled,
} from "@/lib/audio";

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
  const audioUnlocked = useRef(false);

  // Unlock audio on first user interaction (browser requirement)
  useEffect(() => {
    const handleInteraction = () => {
      if (!audioUnlocked.current) {
        unlockAudio();
        audioUnlocked.current = true;
      }
      // Always try to start music for current phase on interaction
      playMusic("lobby");
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
      if (state.phase === "recycling") {
        setDropPhase("recycling");
      } else if (state.phase === "dropping") {
        setDropPhase("dropping");
      }
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
        const eliminatedIds = data.eliminated.map((p) => p.id);

        setPlayers((prev) =>
          prev.map((p) =>
            eliminatedIds.includes(p.id)
              ? { ...p, eliminated: true, eliminatedRound: data.roundNumber }
              : p
          )
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
    content = <WinnerPhase winner={winner} />;
  } else if (phase === "dropping" || phase === "recycling") {
    content = (
      <GamePhaseComponent
        players={players}
        round={round}
        phase={dropPhase}
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
    </>
  );
}
