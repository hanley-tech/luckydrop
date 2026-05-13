"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Player } from "@/types";
import PlayerList from "./PlayerList";
import LobbyDemoCanvas from "./LobbyDemoCanvas";

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
    <div className="w-full h-full bg-[#0F172A] flex p-10 gap-8">
      {/* Left column: live physics demo (double-width) */}
      <div className="flex-1 flex flex-col min-h-0">
        <h2 className="text-5xl font-bold text-slate-300 mb-4 text-center">
          Live Demo
        </h2>
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <LobbyDemoCanvas players={players} />
        </div>
      </div>

      {/* Center column: title + QR + count — only as wide as it needs to be */}
      <div className="shrink-0 flex flex-col items-center justify-center gap-6 px-40">
        <h1 className="text-[5rem] font-black text-white tracking-tight leading-none text-center">
          Lucky
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            Drop
          </span>
        </h1>

        <div className="bg-white p-6 rounded-3xl shadow-2xl shadow-blue-500/20">
          {joinUrl && (
            <QRCodeSVG
              value={joinUrl}
              size={420}
              bgColor="#FFFFFF"
              fgColor="#0F172A"
              level="H"
            />
          )}
        </div>

        <p className="text-5xl font-bold text-white animate-pulse">
          Scan to Join!
        </p>

        <p className="text-xl text-slate-400 font-mono">
          {joinUrl || "Loading..."}
        </p>

        <div className="flex items-center gap-4 bg-white/10 rounded-full px-8 py-4 backdrop-blur-sm">
          <div className="w-4 h-4 rounded-full bg-green-400 animate-pulse" />
          <span className="text-3xl font-bold text-white whitespace-nowrap">
            {players.length} player{players.length !== 1 ? "s" : ""} joined
          </span>
        </div>
      </div>

      {/* Right column: 3-column player list (auto-scrolls when overflowing) */}
      <div className="flex-1 flex flex-col min-h-0 px-12">
        <h2 className="text-5xl font-bold text-slate-300 mb-4 text-center">
          Players
        </h2>
        <div className="flex-1 min-h-0 flex items-center justify-center">
          {players.length === 0 ? (
            <p className="text-3xl text-slate-500 text-center">
              Waiting for the first player...
            </p>
          ) : (
            <div className="h-full w-full flex items-center">
              <div className="w-full h-full max-h-full">
                <PlayerList players={players} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
