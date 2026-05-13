"use client";

import { useEffect, useRef, useCallback } from "react";
import { Player, LevelId } from "@/types";
import * as PhysicsEngine from "./PhysicsEngine";
import { createBoard, setCenterWidth, BoardGeometry, CenterWidth } from "./PlinkoBoard";
import { BallManager } from "./BallManager";
import { render, clearRenderCache } from "./Renderer";
import { getLevel, LevelHandle } from "./levels";

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
  const SETTLE_FRAMES_REQUIRED = 30; // ~0.5s of stillness
  const reportedLandingsRef = useRef<Set<string>>(new Set());

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
      const advanced: string[] = [];
      const eliminated: string[] = [];

      for (const ball of ballMgr.getAllBalls()) {
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

    // Don't run physics while recycling overlay is showing or after results reported
    if (!resultReportedRef.current && !recycling) {
      // Update active level (cannons firing, tray sliding, etc.) BEFORE the physics step
      levelRef.current?.update?.(FRAME_MS);
      PhysicsEngine.step(engine);
    }

    const { width, height } = getBoardSize();
    const slotTop = height * 0.85;

    // Nudge balls that are stuck on pegs
    if (!resultReportedRef.current && !recycling) {
      ballMgr.nudgeStuckBalls(slotTop);
    }

    const level = levelRef.current;
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
        bouncyPegs: level?.bouncyPegs,
        platforms: level?.platforms,
        projectiles: level?.projectiles,
      }
    );

    // Real-time individual ball landing detection
    if (!resultReportedRef.current && !recycling && onBallLandedRef.current) {
      for (const ball of ballMgr.getAllBalls()) {
        const player = ballMgr.getBallPlayer(ball);
        if (!player) continue;
        if (reportedLandingsRef.current.has(player.id)) continue;

        const speed = Math.sqrt(
          ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y
        );
        if (ball.position.y > slotTop && speed < 1.0) {
          const slotIdx = ballMgr.getBallSlot(ball, board.slotSensors);
          const inCenter = board.centerSlotIndices.has(slotIdx);
          reportedLandingsRef.current.add(player.id);
          onBallLandedRef.current(player.id, inCenter);
        }
      }
    }

    // Check if ALL balls settled — report final round result
    if (!resultReportedRef.current && !recycling && ballMgr.count > 0) {
      if (ballMgr.checkAllSettled()) {
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

    resultReportedRef.current = false;
    settleFramesRef.current = 0;
    reportedLandingsRef.current = new Set();

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
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
      const activePlayerIds = new Set(players.map((p) => p.id));
      const ballPlayerIds = ballMgr.getPlayerIds();
      const toRemove = ballPlayerIds.filter((id) => !activePlayerIds.has(id));
      if (toRemove.length > 0) {
        ballMgr.removeBalls(toRemove);
      }
      ballMgr.resetBallPositions(width);
      resultReportedRef.current = false;
      settleFramesRef.current = 0;
      reportedLandingsRef.current = new Set();
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
      reportedLandingsRef.current = new Set();
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
