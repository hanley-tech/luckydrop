"use client";

import { useEffect, useRef } from "react";
import Matter from "matter-js";
import { Player } from "@/types";
import { BALL_EMOJIS, getEmoji, getEmojiBgColor } from "@/lib/emojis";
import * as PhysicsEngine from "@/components/game/PhysicsEngine";
import { BALL_FILTER, PEG_FILTER } from "@/components/game/PhysicsEngine";

interface LobbyDemoCanvasProps {
  players: Player[];
}

// Simplified plinko demo for the lobby. A few named "dummy" characters drop
// continuously so the field always feels populated; real players' balls join
// the loop when they sign up. When any ball reaches the bottom it is
// immediately recycled back to the top.
const DUMMY_CHARACTERS: { name: string; emoji: string }[] = [
  { name: "Demo", emoji: "rocket" },
];

const MINI_PEG_ROWS = 7;
const MINI_PEG_COLS = 6;

interface MiniBoard {
  pegs: Matter.Body[];
  ballR: number;
  finishY: number;
}

function buildMiniBoard(
  engine: Matter.Engine,
  width: number,
  height: number
): MiniBoard {
  const pegs: Matter.Body[] = [];

  const topMargin = height * 0.12;
  const bottomMargin = height * 0.92;
  const fieldHeight = bottomMargin - topMargin;
  const rowGap = fieldHeight / (MINI_PEG_ROWS + 1);

  const ballR = Math.max(10, Math.round(width * 0.04));
  const pegRadius = Math.max(4, Math.round(ballR * 0.45));
  const centerX = width / 2;
  const colSpacing = (width * 0.78) / (MINI_PEG_COLS - 1);

  for (let row = 0; row < MINI_PEG_ROWS; row++) {
    const y = topMargin + rowGap * (row + 1);
    const isEven = row % 2 === 0;
    const cols = isEven ? MINI_PEG_COLS : MINI_PEG_COLS - 1;
    const rowWidth = (cols - 1) * colSpacing;
    const startX = centerX - rowWidth / 2;
    for (let col = 0; col < cols; col++) {
      const x = startX + col * colSpacing;
      const peg = Matter.Bodies.circle(x, y, pegRadius, {
        isStatic: true,
        restitution: 0.7,
        friction: 0.01,
        collisionFilter: PEG_FILTER,
        label: "mini-peg",
      });
      pegs.push(peg);
    }
  }

  // Side walls so balls can't escape sideways
  const wallT = 20;
  const leftWall = Matter.Bodies.rectangle(
    -wallT / 2,
    height / 2,
    wallT,
    height,
    { isStatic: true, collisionFilter: PEG_FILTER, label: "mini-wall" }
  );
  const rightWall = Matter.Bodies.rectangle(
    width + wallT / 2,
    height / 2,
    wallT,
    height,
    { isStatic: true, collisionFilter: PEG_FILTER, label: "mini-wall" }
  );

  Matter.World.add(engine.world, [...pegs, leftWall, rightWall]);

  return { pegs, ballR, finishY: bottomMargin + ballR };
}

function drawMiniBoard(
  ctx: CanvasRenderingContext2D,
  board: MiniBoard,
  width: number,
  height: number,
  balls: { body: Matter.Body; player: Player }[]
) {
  // Background
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(0, 0, width, height);

  // Pegs
  ctx.fillStyle = "#94A3B8";
  for (const peg of board.pegs) {
    const r = (peg as Matter.Body & { circleRadius?: number }).circleRadius ?? 4;
    ctx.beginPath();
    ctx.arc(peg.position.x, peg.position.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Balls + names
  const r = board.ballR;
  for (const { body, player } of balls) {
    const bg = getEmojiBgColor(player.emoji);
    const grad = ctx.createRadialGradient(
      body.position.x - r * 0.3,
      body.position.y - r * 0.3,
      r * 0.15,
      body.position.x,
      body.position.y,
      r
    );
    grad.addColorStop(0, lighten(bg, 60));
    grad.addColorStop(0.7, bg);
    grad.addColorStop(1, darken(bg, 40));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(body.position.x, body.position.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const emoji = getEmoji(player.emoji);
    const emojiSize = Math.round(r * 1.3);
    ctx.font = `${emojiSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.fillText(emoji, body.position.x, body.position.y + 1);

    if (player.name) {
      ctx.font = `bold ${Math.max(11, Math.round(r * 0.9))}px sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(player.name, body.position.x, body.position.y + r + 4);
    }
  }
}

function lighten(hex: string, amount: number): string {
  return adjust(hex, amount);
}
function darken(hex: string, amount: number): string {
  return adjust(hex, -amount);
}
function adjust(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export default function LobbyDemoCanvas({ players }: LobbyDemoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PhysicsEngine.PhysicsEngineHandle | null>(null);
  const boardRef = useRef<MiniBoard | null>(null);
  const rafRef = useRef<number>(0);

  const dummyBallsRef = useRef<{ body: Matter.Body; player: Player }[]>([]);
  const playerBallsRef = useRef<
    Map<string, { body: Matter.Body; player: Player }>
  >(new Map());
  const playersRef = useRef<Player[]>(players);
  playersRef.current = players;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    // Compute canvas size based on parent's actual layout box
    const parentWidth = parent.clientWidth;
    const parentHeight = parent.clientHeight;
    const width = Math.max(220, Math.round(parentWidth * 0.55));
    const height = parentHeight;

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const handle = PhysicsEngine.init();
    engineRef.current = handle;
    const board = buildMiniBoard(handle.engine, width, height);
    boardRef.current = board;

    const spawnBall = (label: string): Matter.Body => {
      const x = width * 0.3 + Math.random() * width * 0.4;
      const y = 8 + Math.random() * 20;
      const body = Matter.Bodies.circle(x, y, board.ballR, {
        restitution: 0.6,
        friction: 0.02,
        frictionAir: 0.008,
        density: 0.002,
        collisionFilter: BALL_FILTER,
        label,
      });
      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 1.5,
        y: Math.random() * 0.5,
      });
      Matter.World.add(handle.engine.world, body);
      return body;
    };

    const recycleBall = (body: Matter.Body) => {
      const x = width * 0.3 + Math.random() * width * 0.4;
      const y = 8 + Math.random() * 20;
      Matter.Body.setPosition(body, { x, y });
      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 1.5,
        y: Math.random() * 0.5,
      });
      Matter.Body.setAngularVelocity(body, 0);
    };

    // Seed dummy character balls
    for (let i = 0; i < DUMMY_CHARACTERS.length; i++) {
      const dummy = DUMMY_CHARACTERS[i];
      const emojiOk = BALL_EMOJIS.some((e) => e.id === dummy.emoji);
      const emojiId = emojiOk
        ? dummy.emoji
        : BALL_EMOJIS[i % BALL_EMOJIS.length].id;
      const body = spawnBall(`dummy-${i}`);
      const player: Player = {
        id: `dummy-${i}`,
        name: dummy.name,
        emoji: emojiId,
        socketId: "",
        isDebugUser: false,
        eliminated: false,
        eliminatedRound: null,
        eliminatedOrder: null,
      };
      dummyBallsRef.current.push({ body, player });
    }

    const loop = () => {
      const engine = engineRef.current?.engine;
      const b = boardRef.current;
      if (!engine || !b || !canvas) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // Sync player balls with current props
      const current = playersRef.current;
      const currentIds = new Set(current.map((p) => p.id));

      for (const player of current) {
        if (!playerBallsRef.current.has(player.id)) {
          const body = spawnBall(`lobby-${player.id}`);
          playerBallsRef.current.set(player.id, { body, player });
        } else {
          const entry = playerBallsRef.current.get(player.id);
          if (entry) entry.player = player;
        }
      }
      for (const [id, entry] of playerBallsRef.current) {
        if (!currentIds.has(id)) {
          Matter.World.remove(engine.world, entry.body);
          playerBallsRef.current.delete(id);
        }
      }

      PhysicsEngine.step(engine);

      // Immediate recycle when any ball reaches the bottom
      for (const { body } of dummyBallsRef.current) {
        if (body.position.y > b.finishY) recycleBall(body);
      }
      for (const { body } of playerBallsRef.current.values()) {
        if (body.position.y > b.finishY) recycleBall(body);
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const allBalls = [
        ...dummyBallsRef.current,
        ...Array.from(playerBallsRef.current.values()),
      ];
      drawMiniBoard(ctx, b, width, height, allBalls);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (engineRef.current) {
        PhysicsEngine.cleanup(engineRef.current.engine);
      }
      dummyBallsRef.current = [];
      playerBallsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block"
      style={{ background: "#0F172A" }}
    />
  );
}
