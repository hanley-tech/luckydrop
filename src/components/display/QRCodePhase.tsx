"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Player } from "@/types";
import PlayerList from "./PlayerList";

interface QRCodePhaseProps {
  players: Player[];
}

export default function QRCodePhase({ players }: QRCodePhaseProps) {
  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    setJoinUrl(`${window.location.origin}${basePath}/join`);
  }, []);

  return (
    <div className="w-full h-full bg-[#0F172A] flex flex-col items-center justify-center p-16">
      {/* Main content area */}
      <div className="flex flex-row items-center justify-center gap-24 w-full max-w-[3400px]">
        {/* QR Code Section */}
        <div className="flex flex-col items-center gap-14 shrink-0">
          {/* Title */}
          <h1 className="text-[10rem] font-black text-white tracking-tight">
            Lucky
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              Drop
            </span>
          </h1>

          {/* QR Code */}
          <div className="bg-white p-12 rounded-3xl shadow-2xl shadow-blue-500/20">
            {joinUrl && (
              <QRCodeSVG
                value={joinUrl}
                size={700}
                bgColor="#FFFFFF"
                fgColor="#0F172A"
                level="H"
              />
            )}
          </div>

          {/* Scan to Join text */}
          <p className="text-8xl font-bold text-white animate-pulse">
            Scan to Join!
          </p>

          {/* URL fallback */}
          <p className="text-4xl text-slate-400 font-mono">
            {joinUrl || "Loading..."}
          </p>

          {/* Player count */}
          <div className="flex items-center gap-6 bg-white/10 rounded-full px-14 py-7 backdrop-blur-sm">
            <div className="w-6 h-6 rounded-full bg-green-400 animate-pulse" />
            <span className="text-6xl font-bold text-white">
              {players.length} player{players.length !== 1 ? "s" : ""} joined
            </span>
          </div>
        </div>

        {/* Player List Section */}
        {players.length > 0 && (
          <div className="flex-1 min-w-0 max-w-[1600px]">
            <h2 className="text-6xl font-bold text-slate-300 mb-8">
              Players
            </h2>
            <PlayerList players={players} />
          </div>
        )}
      </div>
    </div>
  );
}
