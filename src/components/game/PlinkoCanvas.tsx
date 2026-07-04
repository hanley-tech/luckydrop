"use client";

import { useEffect, useRef, useCallback } from "react";
import Matter from "matter-js";
import { Player, LevelId } from "@/types";
import * as PhysicsEngine from "./PhysicsEngine";
import { createBoard, setCenterWidth, BoardGeometry, CenterWidth } from "./PlinkoBoard";
import { BallManager } from "./BallManager";
import { render, clearRenderCache } from "./Renderer";
import { getLevel, LevelHandle } from "./levels";
import { Camera } from "./fx/camera";
import { ParticleField, hexToRgb, RGB } from "./fx/particles";
import { Director } from "./fx/director";
import { sfxPeg, sfxExplosion, sfxStar } from "@/lib/sfx";
import { getEmojiBgColor } from "@/lib/emojis";

const NEUTRAL: RGB = { r: 120, g: 200, b: 255 };

/** Screen-space vignette for extra neon depth. */
function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = ctx.createRadialGradient(
    w / 2,
    h * 0.45,
    Math.min(w, h) * 0.25,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.75
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

interface PlinkoCanvasProps {
  players: Player[];
  onRoundResult: (advancedIds: string[], eliminatedIds: string[]) => void;
  onBallLanded?: (playerId: string, inCenter: boolean) => void;
  roundNumber: number;
  isRecycling: boolean;
  levelId: LevelId;
}

/** Round 1 = widest (5 slots), Round 2 = medium (3 slots), Round 3+ = narrow (1 slot) */
function getCenterWidth(round: number): CenterWidth {
  if (round <= 1) return "wide";
  if (round === 2) return "medium";
  return "narrow";
}

export default function PlinkoCanvas({
  players,
  onRoundResult,
  onBallLanded,
  roundNumber,
  isRecycling,
  levelId,
}: PlinkoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PhysicsEngine.PhysicsEngineHandle | null>(null);
  const boardRef = useRef<BoardGeometry | null>(null);
  const ballMgrRef = useRef<BallManager | null>(null);
  const levelRef = useRef<LevelHandle | null>(null);
  const prevLevelIdRef = useRef<LevelId>(levelId);
  const rafRef = useRef<number>(0);
  const resultReportedRef = useRef(false);
  const prevRoundRef = useRef(roundNumber);
  const settleFramesRef = useRef(0);

  // ----- Cinematic FX -----
  const cameraRef = useRef<Camera | null>(null);
  const particlesRef = useRef<ParticleField | null>(null);
  const directorRef = useRef<Director | null>(null);
  const lastTimeRef = useRef<number>(0);
  const firstCenterDoneRef = useRef(false);
  // Players whose ball has hit a losing slot and "died" (exploded + hidden).
  // The body stays in the sim (so a retry round can redrop it); we just stop
  // drawing it. Cleared at the start of each round.
  const deadVisualRef = useRef<Set<string>>(new Set());
  // Number of balls in play at the start of the round — decides whether the
  // first center landing is "the winner" (small field) vs a routine advance,
  // and gates near-miss drama to late-game small fields.
  const roundBallCountRef = useRef(0);
  const SETTLE_FRAMES_REQUIRED = 30; // ~0.5s of stillness
  // playerId -> settle index (0 = first ball to come to rest). reportResults
  // sorts the round's balls by this index, so eliminatedIds reaches the server
  // in settle order and same-round losers display in a deterministic order.
  const reportedLandingsRef = useRef<Map<string, number>>(new Map());

  // Keep props in refs so the animation loop always sees the latest values
  // without needing to be re-created (avoids RAF restart gaps)
  const isRecyclingRef = useRef(isRecycling);
  const roundNumberRef = useRef(roundNumber);
  const onBallLandedRef = useRef(onBallLanded);
  const onRoundResultRef = useRef(onRoundResult);

  isRecyclingRef.current = isRecycling;
  roundNumberRef.current = roundNumber;
  onBallLandedRef.current = onBallLanded;
  onRoundResultRef.current = onRoundResult;

  const getBoardSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { width: 800, height: 600 };
    const parent = canvas.parentElement;
    const width = parent?.clientWidth ?? 800;
    const height = parent?.clientHeight ?? 600;
    return { width, height };
  }, []);

  const reportResults = useCallback(
    (ballMgr: BallManager, board: BoardGeometry) => {
      const landings = reportedLandingsRef.current;
      const balls = ballMgr.getAllBalls().slice().sort((a, b) => {
        const pa = ballMgr.getBallPlayer(a);
        const pb = ballMgr.getBallPlayer(b);
        const orderA = pa ? landings.get(pa.id) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
        const orderB = pb ? landings.get(pb.id) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });

      const advanced: string[] = [];
      const eliminated: string[] = [];

      for (const ball of balls) {
        const player = ballMgr.getBallPlayer(ball);
        if (!player) continue;

        const slotIdx = ballMgr.getBallSlot(ball, board.slotSensors);
        if (board.centerSlotIndices.has(slotIdx)) {
          advanced.push(player.id);
        } else {
          eliminated.push(player.id);
        }
      }

      onRoundResultRef.current(advanced, eliminated);
    },
    []
  );

  // ----- main animation loop (stable — reads refs, never re-created) -----
  const loop = useCallback(() => {
    const engine = engineRef.current?.engine;
    const board = boardRef.current;
    const ballMgr = ballMgrRef.current;
    const canvas = canvasRef.current;
    if (!engine || !board || !ballMgr || !canvas) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const recycling = isRecyclingRef.current;
    const FRAME_MS = 1000 / 60;

    // Real elapsed time (for camera/particles); clamp after tab-switch stalls
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    let dt = (now - (lastTimeRef.current || now)) / 1000;
    lastTimeRef.current = now;
    if (dt > 0.05) dt = 0.05;

    const director = directorRef.current;
    const camera = cameraRef.current;
    const particles = particlesRef.current;

    // Slow-mo time scale drives the physics timestep
    const timeScale = director ? director.update(dt) : 1;
    camera?.update(dt);

    // Don't run physics while recycling overlay is showing or after results reported
    if (!resultReportedRef.current && !recycling) {
      const scaledMs = FRAME_MS * timeScale;
      // Update active level (cannons firing, tray sliding, etc.) BEFORE the physics step
      levelRef.current?.update?.(scaledMs);
      PhysicsEngine.step(engine, scaledMs);
    }

    // Particles advance in scaled time so explosions slow down with slow-mo
    particles?.update(dt * timeScale);

    const { width, height } = getBoardSize();
    const slotTop = height * 0.85;

    // Nudge balls that are stuck on pegs
    if (!resultReportedRef.current && !recycling) {
      ballMgr.nudgeStuckBalls(slotTop);
    }

    const level = levelRef.current;

    // Clear full canvas in screen space (covers letterboxing when zoomed)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#05060f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    camera?.begin(ctx);
    render(
      ctx,
      board.pegs,
      ballMgr.getAllBalls(),
      board.slotDividers,
      board.slotSensors,
      board.centerSlotIndices,
      board.isWideCenter,
      board.wideModeDividerIndices,
      width,
      height,
      (body) => ballMgr.getBallPlayer(body),
      {
        roundNumber: roundNumberRef.current,
        isRecycling: recycling,
        timeMs: now,
        particles: particles ?? undefined,
        deadPlayers: deadVisualRef.current,
        bouncyPegs: level?.bouncyPegs,
        platforms: level?.platforms,
        projectiles: level?.projectiles,
      }
    );
    camera?.end(ctx);

    // Screen-space vignette
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawVignette(ctx, canvas.width, canvas.height);

    // Real-time individual ball landing detection
    if (!resultReportedRef.current && !recycling) {
      const ballR = Math.round((width / 9) * 0.08);
      // Center-zone boundaries (for near-miss detection)
      const sensors = board.slotSensors;
      const centerIdx = Array.from(board.centerSlotIndices).sort((a, b) => a - b);
      const slotW = width / Math.max(1, sensors.length);
      const leftBound = sensors[centerIdx[0]].position.x - slotW / 2;
      const rightBound =
        sensors[centerIdx[centerIdx.length - 1]].position.x + slotW / 2;
      const nearBand = ballR * 2.2;
      const fewBalls = roundBallCountRef.current <= 8;

      for (const ball of ballMgr.getAllBalls()) {
        const player = ballMgr.getBallPlayer(ball);
        if (!player) continue;

        // Near-miss: in late game, a ball dropping just outside the win column
        if (
          fewBalls &&
          !reportedLandingsRef.current.has(player.id) &&
          ball.velocity.y > 2 &&
          ball.position.y > slotTop - ballR * 3 &&
          ball.position.y < slotTop + ballR
        ) {
          const x = ball.position.x;
          const justLeft = x < leftBound && x > leftBound - nearBand;
          const justRight = x > rightBound && x < rightBound + nearBand;
          if (justLeft || justRight) {
            const color = hexToRgb(getEmojiBgColor(player.emoji));
            directorRef.current?.trigger("nearMiss", x, ball.position.y, color);
          }
        }

        if (reportedLandingsRef.current.has(player.id)) continue;

        // Fire the instant the ball reaches the bottom of the play area (the
        // floor). Its slot is already locked in by then, so we don't wait for
        // it to come to a full stop — but we don't fire early up in the column.
        const reachedBottom = ball.position.y > height - ballR * 2;
        if (!reachedBottom) continue;

        const slotIdx = ballMgr.getBallSlot(ball, board.slotSensors);
        const inCenter = board.centerSlotIndices.has(slotIdx);
        const color = hexToRgb(getEmojiBgColor(player.emoji));
        const px = ball.position.x;
        const py = ball.position.y;

        if (inCenter) {
          // The moment a ball drops into the win column it's locked in — call it
          // a win immediately, no need to wait for it to stop bouncing.
          reportedLandingsRef.current.set(player.id, reportedLandingsRef.current.size);
          onBallLandedRef.current?.(player.id, true);

          if (!firstCenterDoneRef.current) {
            firstCenterDoneRef.current = true;
            // Small field + narrow win zone ⇒ this is the decisive winner ball
            const decisive =
              roundBallCountRef.current <= 6 && board.centerWidth === "narrow";
            directorRef.current?.trigger(
              decisive ? "winner" : "firstCenter",
              px,
              py,
              color
            );
          } else {
            // Subsequent center landings still pop with stars + a sparkle
            particles?.starBurst(px, py, color, 14, 0.8);
            particles?.ring(px, py, color, 90, 3);
            sfxStar();
          }
        } else {
          // DEATH: the instant a ball hits the bottom in a losing slot it blows
          // up and vanishes. The body stays in the sim for round-result
          // accounting and for a possible retry redrop; we hide + explode once.
          reportedLandingsRef.current.set(player.id, reportedLandingsRef.current.size);
          onBallLandedRef.current?.(player.id, false);
          deadVisualRef.current.add(player.id);
          particles?.burst(px, py, color, 30, 1.2);
          particles?.ring(px, py, color, 95, 4);
          particles?.ring(px, py, { r: 255, g: 255, b: 255 }, 55, 3);
          sfxExplosion(); // explosion when a player falls in the pit (throttled)
        }
      }
    }

    // Report the round the instant every ball has reached the bottom and been
    // classified — no need to wait for them to stop bouncing. (Settle check
    // kept as a fallback in case a ball never reaches the floor threshold.)
    if (!resultReportedRef.current && !recycling && ballMgr.count > 0) {
      if (reportedLandingsRef.current.size >= ballMgr.count) {
        resultReportedRef.current = true;
        reportResults(ballMgr, board);
      } else if (ballMgr.checkAllSettled()) {
        settleFramesRef.current += 1;
        if (settleFramesRef.current >= SETTLE_FRAMES_REQUIRED) {
          resultReportedRef.current = true;
          reportResults(ballMgr, board);
        }
      } else {
        settleFramesRef.current = 0;
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [getBoardSize, reportResults]);

  // ----- Initialise on mount -----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height } = getBoardSize();

    // Render at 1:1 — the DisplayFrame handles scaling to viewport
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const handle = PhysicsEngine.init();
    engineRef.current = handle;

    const centerWidth = getCenterWidth(roundNumberRef.current);
    const board = createBoard(handle.engine, width, height, centerWidth);
    boardRef.current = board;

    // Install the active level (adds bouncy pegs, cannons, tray, etc.)
    const levelDef = getLevel(levelId);
    levelRef.current = levelDef.install(handle.engine, width, height);
    prevLevelIdRef.current = levelId;

    const activePlayers = players.filter((p) => !p.eliminated);
    const mgr = new BallManager(handle.engine);
    mgr.createBalls(activePlayers, width);
    ballMgrRef.current = mgr;

    // Cinematic FX
    const camera = new Camera(width, height);
    const particles = new ParticleField();
    cameraRef.current = camera;
    particlesRef.current = particles;
    directorRef.current = new Director(camera, particles);
    firstCenterDoneRef.current = false;
    roundBallCountRef.current = activePlayers.length;
    deadVisualRef.current.clear();
    lastTimeRef.current = 0;

    // Spawn sparks + peg pings on ball↔peg collisions
    const onCollision = (evt: Matter.IEventCollision<Matter.Engine>) => {
      const pf = particlesRef.current;
      if (!pf) return;
      for (const pair of evt.pairs) {
        const a = pair.bodyA;
        const b = pair.bodyB;
        let ball: Matter.Body | null = null;
        let other: Matter.Body | null = null;
        if (a.label?.startsWith("ball-")) {
          ball = a;
          other = b;
        } else if (b.label?.startsWith("ball-")) {
          ball = b;
          other = a;
        }
        if (!ball || !other || other.label !== "peg") continue;

        const speed = Math.sqrt(
          ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y
        );
        if (speed < 1.8) continue;
        if (pf.count > 850) continue; // keep particle budget in check

        const player = ballMgrRef.current?.getBallPlayer(ball);
        const color = player ? hexToRgb(getEmojiBgColor(player.emoji)) : NEUTRAL;
        const sup = pair.collision?.supports?.[0];
        const cx = sup ? sup.x : (ball.position.x + other.position.x) / 2;
        const cy = sup ? sup.y : (ball.position.y + other.position.y) / 2;
        pf.spark(cx, cy, color, speed > 6 ? 4 : 2, 60 + speed * 8);
        sfxPeg(Math.min(1, speed / 12));
      }
    };
    Matter.Events.on(handle.engine, "collisionStart", onCollision);

    resultReportedRef.current = false;
    settleFramesRef.current = 0;
    reportedLandingsRef.current = new Map();

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (engineRef.current) {
        Matter.Events.off(engineRef.current.engine, "collisionStart", onCollision);
      }
      directorRef.current?.reset();
      particlesRef.current?.clear();
      if (levelRef.current) {
        levelRef.current.destroy();
        levelRef.current = null;
      }
      if (engineRef.current) {
        PhysicsEngine.cleanup(engineRef.current.engine);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- React to level changes (rebuild obstacles in-place) -----
  useEffect(() => {
    if (levelId === prevLevelIdRef.current) return;
    const engine = engineRef.current?.engine;
    if (!engine) return;

    if (levelRef.current) {
      levelRef.current.destroy();
      levelRef.current = null;
    }
    const { width, height } = getBoardSize();
    const def = getLevel(levelId);
    levelRef.current = def.install(engine, width, height);
    prevLevelIdRef.current = levelId;
    clearRenderCache();
  }, [levelId, getBoardSize]);

  // ----- React to round changes -----
  useEffect(() => {
    if (roundNumber === prevRoundRef.current) return;
    prevRoundRef.current = roundNumber;

    const board = boardRef.current;
    const ballMgr = ballMgrRef.current;
    if (!ballMgr || !board) return;

    const { width } = getBoardSize();

    // Adjust center width based on round
    const wantWidth = getCenterWidth(roundNumber);
    if (board.centerWidth !== wantWidth) {
      setCenterWidth(board, wantWidth);
      clearRenderCache();
    }

    if (!isRecycling) {
      // Eliminated players already blew up live as they hit the bottom; just
      // remove their (hidden) bodies before the next round.
      const activePlayerIds = new Set(players.map((p) => p.id));
      const ballPlayerIds = ballMgr.getPlayerIds();
      const toRemove = ballPlayerIds.filter((id) => !activePlayerIds.has(id));
      if (toRemove.length > 0) {
        ballMgr.removeBalls(toRemove);
      }

      ballMgr.resetBallPositions(width);
      resultReportedRef.current = false;
      settleFramesRef.current = 0;
      reportedLandingsRef.current = new Map();
      firstCenterDoneRef.current = false;
      roundBallCountRef.current = ballMgr.count;
      deadVisualRef.current.clear();
      directorRef.current?.reset();
      particlesRef.current?.clear();
    }
  }, [roundNumber, isRecycling, players, getBoardSize]);

  // ----- Handle recycling transitions -----
  const wasRecyclingRef = useRef(isRecycling);
  useEffect(() => {
    const wasRecycling = wasRecyclingRef.current;
    wasRecyclingRef.current = isRecycling;

    if (wasRecycling && !isRecycling) {
      // Recycling just ended (ROUND_START arrived) — NOW reset balls and arm detection
      const ballMgr = ballMgrRef.current;
      if (!ballMgr) return;

      const { width } = getBoardSize();
      ballMgr.resetBallPositions(width);
      resultReportedRef.current = false;
      settleFramesRef.current = 0;
      reportedLandingsRef.current = new Map();
      firstCenterDoneRef.current = false;
      roundBallCountRef.current = ballMgr.count;
      deadVisualRef.current.clear();
      directorRef.current?.reset();
      particlesRef.current?.clear();
    }
    // When recycling starts: do nothing — keep balls where they are
    // so the overlay shows over the settled board
  }, [isRecycling, getBoardSize]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ background: "#0F172A" }}
    />
  );
}
