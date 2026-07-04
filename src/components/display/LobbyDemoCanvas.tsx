"use client";

import { useEffect, useRef } from "react";
import Matter from "matter-js";
import { Player } from "@/types";
import { BALL_EMOJIS, getEmoji, getEmojiBgColor } from "@/lib/emojis";
import { getEmojiImage } from "@/lib/emojiImages";
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

// --- Cached neon assets: bake once, then just drawImage per frame (no
// per-ball shadowBlur/gradients, which tanked FPS with lots of players) ---
let miniBg: HTMLCanvasElement | null = null;
let miniBgKey = "";
const miniBallCache = new Map<string, HTMLCanvasElement>();

/** Background (gradient + grid + glowing pegs) — everything static, baked once. */
function getMiniBg(
  board: MiniBoard,
  width: number,
  height: number
): HTMLCanvasElement {
  const key = `${width}x${height}-${board.pegs.length}`;
  if (miniBg && miniBgKey === key) return miniBg;

  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#05060f");
  bg.addColorStop(1, "#0a0a1c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const cell = Math.max(22, Math.round(width / 10));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(46,128,224,0.14)";
  ctx.beginPath();
  for (let x = 0; x <= width; x += cell) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += cell) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.restore();

  for (const peg of board.pegs) {
    const r = (peg as Matter.Body & { circleRadius?: number }).circleRadius ?? 4;
    ctx.save();
    ctx.shadowColor = "rgba(56,196,255,0.9)";
    ctx.shadowBlur = r * 2.2;
    ctx.fillStyle = "rgba(56,196,255,0.9)";
    ctx.beginPath();
    ctx.arc(peg.position.x, peg.position.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#cdf3ff";
    ctx.beginPath();
    ctx.arc(peg.position.x, peg.position.y, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  miniBg = c;
  miniBgKey = key;
  return c;
}

/** Neon ball sprite (halo + core + ring + emoji) baked once per look. */
function getMiniBallSprite(
  emojiId: string,
  color: string,
  r: number
): HTMLCanvasElement {
  const img = getEmojiImage(emojiId);
  const key = `${emojiId}-${color}-${r}-${img ? "img" : "txt"}`;
  const cached = miniBallCache.get(key);
  if (cached) return cached;

  const pad = Math.round(r * 1.9);
  const size = pad * 2;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const halo = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 1.9);
  halo.addColorStop(0, hexToRgba(color, 0.5));
  halo.addColorStop(0.55, hexToRgba(color, 0.18));
  halo.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const core = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  core.addColorStop(0, "rgba(20,24,40,0.92)");
  core.addColorStop(1, "rgba(6,8,18,0.96)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = r * 0.7;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.beginPath();
  ctx.arc(cx, cy, r - ctx.lineWidth * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (img) {
    const s = Math.round(r * 1.55);
    ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s);
  } else {
    const emoji = getEmoji(emojiId);
    const emojiSize = Math.round(r * 1.25);
    ctx.font = `${emojiSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, cx, cy + 1);
  }

  miniBallCache.set(key, c);
  return c;
}

function drawMiniBoard(
  ctx: CanvasRenderingContext2D,
  board: MiniBoard,
  width: number,
  height: number,
  balls: { body: Matter.Body; player: Player }[]
) {
  ctx.drawImage(getMiniBg(board, width, height), 0, 0);

  const r = board.ballR;
  const pad = Math.round(r * 1.9);
  for (const { body, player } of balls) {
    const color = getEmojiBgColor(player.emoji);
    const cx = body.position.x;
    const cy = body.position.y;

    ctx.drawImage(getMiniBallSprite(player.emoji, color, r), cx - pad, cy - pad);

    if (player.name) {
      ctx.font = `bold ${Math.max(11, Math.round(r * 0.9))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.lineWidth = Math.max(2, r * 0.18);
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.strokeText(player.name, cx, cy + r + 4);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(player.name, cx, cy + r + 4);
    }
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
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
      style={{ background: "#05060f" }}
    />
  );
}
