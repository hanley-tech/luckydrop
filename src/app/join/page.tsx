"use client";

import { useState, useEffect, useCallback } from "react";
import JoinForm from "@/components/mobile/JoinForm";
import WaitingScreen from "@/components/mobile/WaitingScreen";
import { getSocket } from "@/lib/socket";
import { S2C } from "@/lib/socketEvents";
import type { Player, GameState } from "@/types";

// Clear any legacy cookie from older code versions
function clearLegacyCookie() {
  if (typeof document !== "undefined") {
    document.cookie = "luckydrop-joined=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
  }
}

export default function JoinPage() {
  clearLegacyCookie();

  const [player, setPlayer] = useState<Player | null>(null);
  const [gamePhase, setGamePhase] = useState("lobby");
  const [roundNumber, setRoundNumber] = useState(0);
  const [isEliminated, setIsEliminated] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [nameCheckEnabled, setNameCheckEnabled] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const handleGameStart = () => {
      setGamePhase("dropping");
      setRoundNumber(1);
    };

    const handleRoundComplete = (data: { advanced: Player[]; eliminated: Player[]; roundNumber: number }) => {
      setRoundNumber(data.roundNumber);
      setPlayer((prev) => {
        if (!prev) return prev;
        const eliminatedIds = data.eliminated.map((p) => p.id);
        if (eliminatedIds.includes(prev.id)) {
          setIsEliminated(true);
          return { ...prev, eliminated: true, eliminatedRound: data.roundNumber };
        }
        return prev;
      });
    };

    const handleWinner = (data: { player: Player; roundNumber: number }) => {
      setGamePhase("winner");
      setPlayer((prev) => {
        if (prev && data.player.id === prev.id) {
          setIsWinner(true);
        }
        return prev;
      });
    };

    const handleGameReset = () => {
      setPlayer(null);
      setGamePhase("lobby");
      setRoundNumber(0);
      setIsEliminated(false);
      setIsWinner(false);
    };

    const handleStateSync = (state: GameState) => {
      setGamePhase(state.phase);
      setRoundNumber(state.round);
      setNameCheckEnabled(state.nameCheckEnabled);

      // Server tells us if we're a player by checking our socket.id
      const myId = socket.id;
      const me = state.players.find((p) => p.id === myId || p.socketId === myId);
      if (me) {
        setPlayer(me);
        setIsEliminated(me.eliminated);
        if (state.winner && state.winner.id === me.id) {
          setIsWinner(true);
        }
      } else {
        // Not in the game — show join form
        setPlayer(null);
        setIsEliminated(false);
        setIsWinner(false);
      }
    };

    const handleNameCheckStatus = (data: { enabled: boolean }) => {
      setNameCheckEnabled(data.enabled);
    };

    socket.on(S2C.GAME_START, handleGameStart);
    socket.on(S2C.ROUND_COMPLETE, handleRoundComplete);
    socket.on(S2C.WINNER, handleWinner);
    socket.on(S2C.GAME_RESET, handleGameReset);
    socket.on(S2C.GAME_STATE_SYNC, handleStateSync);
    socket.on(S2C.NAME_CHECK_STATUS, handleNameCheckStatus);

    return () => {
      socket.off(S2C.GAME_START, handleGameStart);
      socket.off(S2C.ROUND_COMPLETE, handleRoundComplete);
      socket.off(S2C.WINNER, handleWinner);
      socket.off(S2C.GAME_RESET, handleGameReset);
      socket.off(S2C.GAME_STATE_SYNC, handleStateSync);
      socket.off(S2C.NAME_CHECK_STATUS, handleNameCheckStatus);
    };
  }, []);

  const handleJoined = useCallback((joinedPlayer: Player) => {
    setPlayer(joinedPlayer);
  }, []);

  return (
    <main className="min-h-dvh bg-[#0F172A] flex flex-col items-center justify-center px-6 py-10">
      <h1 className="text-3xl font-extrabold text-white mb-8 tracking-tight">
        Lucky Drop
      </h1>

      {player ? (
        <WaitingScreen
          player={player}
          gamePhase={gamePhase}
          roundNumber={roundNumber}
          isEliminated={isEliminated}
          isWinner={isWinner}
          alreadyJoined={false}
        />
      ) : (
        <JoinForm onJoined={handleJoined} nameCheckEnabled={nameCheckEnabled} />
      )}
    </main>
  );
}
