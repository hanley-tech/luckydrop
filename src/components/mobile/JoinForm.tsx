"use client";

import { useState, useEffect, useRef } from "react";
import EmojiPicker from "./ColorPicker";
import { getSocket } from "@/lib/socket";
import { C2S, S2C } from "@/lib/socketEvents";
import type { EmojiId, Player } from "@/types";

interface JoinFormProps {
  onJoined: (player: Player) => void;
  nameCheckEnabled: boolean;
}

export default function JoinForm({ onJoined, nameCheckEnabled }: JoinFormProps) {
  const [name, setName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<EmojiId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const handleAccepted = (data: { player: Player }) => {
      setIsSubmitting(false);
      onJoined(data.player);
    };

    const handleRejected = (data: { reason: string }) => {
      setIsSubmitting(false);
      setError(data.reason || "Join request rejected.");
    };

    socket.on(S2C.JOIN_ACCEPTED, handleAccepted);
    socket.on(S2C.JOIN_REJECTED, handleRejected);

    return () => {
      socket.off(S2C.JOIN_ACCEPTED, handleAccepted);
      socket.off(S2C.JOIN_REJECTED, handleRejected);
    };
  }, [onJoined]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }
    if (!selectedEmoji) {
      setError("Please pick an emoji.");
      return;
    }

    setIsSubmitting(true);

    // Check name via API if enabled
    if (nameCheckEnabled) {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const res = await fetch(`${basePath}/api/check-name`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName }),
        });
        const data = await res.json();
        if (!res.ok || !data.allowed) {
          setIsSubmitting(false);
          setError(data.reason || "Name not allowed.");
          return;
        }
      } catch {
        setIsSubmitting(false);
        setError("Could not verify name. Please try again.");
        return;
      }
    }

    // Emit join request via socket
    const socket = getSocket();
    socket.emit(C2S.JOIN_REQUEST, { name: trimmedName, emoji: selectedEmoji });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-sm mx-auto">
      <div>
        <label htmlFor="player-name" className="block text-sm font-medium text-slate-300 mb-2">
          Your Name
        </label>
        <input
          ref={inputRef}
          id="player-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          maxLength={8}
          placeholder="Your Name"
          autoComplete="off"
          className="w-full px-4 py-3 text-lg rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <p className="text-sm font-medium text-slate-300 mb-3">Pick Your Emoji</p>
        <EmojiPicker selected={selectedEmoji} onSelect={(e) => { setSelectedEmoji(e); setError(null); }} />
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center font-medium" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 rounded-xl text-lg font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Joining...
          </>
        ) : (
          "Join!"
        )}
      </button>
    </form>
  );
}
