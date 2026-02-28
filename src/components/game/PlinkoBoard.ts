import Matter from "matter-js";
import { PEG_FILTER } from "./PhysicsEngine";

/** Center width level: "wide" (5 slots), "medium" (3 slots), "narrow" (1 slot) */
export type CenterWidth = "wide" | "medium" | "narrow";

export interface BoardGeometry {
  pegs: Matter.Body[];
  walls: Matter.Body[];
  slotSensors: Matter.Body[];
  slotDividers: Matter.Body[];
  /** Which slot indices count as "center" (win zone) */
  centerSlotIndices: Set<number>;
  /** Reference to the engine so we can add/remove dividers */
  engine: Matter.Engine;
  /** Current center width */
  centerWidth: CenterWidth;
  /** Kept for renderer backward compat */
  isWideCenter: boolean;
  /** Divider indices hidden in current mode (for renderer) */
  wideModeDividerIndices: number[];
}

const PEG_ROWS = 14;
const SLOT_COUNT = 9;
const CENTER_SLOT = 4; // 0-based, middle of 9 slots

/**
 * Build the full plinko board geometry and add everything to the engine world.
 */
export function createBoard(
  engine: Matter.Engine,
  width: number,
  height: number,
  centerWidth: CenterWidth = "wide"
): BoardGeometry {
  const pegs: Matter.Body[] = [];
  const walls: Matter.Body[] = [];
  const slotDividers: Matter.Body[] = [];
  const slotSensors: Matter.Body[] = [];

  // --- Derive all spacing from board dimensions ---
  const slotWidth = width / SLOT_COUNT;
  // Peg grid is denser than slot grid — ball diameter * ~4.5 gives good bounce density
  const ballR = Math.round(slotWidth * 0.08);
  const colSpacing = ballR * 4.5;
  const pegRadius = Math.round(ballR * 0.5);
  // How many peg columns fit across the board (must cover full width)
  const pegCols = Math.round(width / colSpacing);

  const topMargin = height * 0.15;
  const bottomMargin = height * 0.85;
  const fieldHeight = bottomMargin - topMargin;
  const rowGap = fieldHeight / (PEG_ROWS + 1);

  const pegFieldTop = topMargin + rowGap;
  const centerX = width / 2;

  // --- Pegs (triangular / offset pattern) ---
  for (let row = 0; row < PEG_ROWS; row++) {
    const y = pegFieldTop + row * rowGap;
    const isEvenRow = row % 2 === 0;
    const cols = isEvenRow ? pegCols : pegCols - 1;
    const rowWidth = (cols - 1) * colSpacing;
    const startX = centerX - rowWidth / 2;

    for (let col = 0; col < cols; col++) {
      const x = startX + col * colSpacing;
      const peg = Matter.Bodies.circle(x, y, pegRadius, {
        isStatic: true,
        restitution: 0.7,
        friction: 0.01,
        collisionFilter: PEG_FILTER,
        label: "peg",
      });
      pegs.push(peg);
    }
  }

  // --- Side walls ---
  const wallThickness = 30;
  const leftWall = Matter.Bodies.rectangle(
    -wallThickness / 2,
    height / 2,
    wallThickness,
    height,
    { isStatic: true, collisionFilter: PEG_FILTER, label: "wall-left" }
  );
  const rightWall = Matter.Bodies.rectangle(
    width + wallThickness / 2,
    height / 2,
    wallThickness,
    height,
    { isStatic: true, collisionFilter: PEG_FILTER, label: "wall-right" }
  );
  const floor = Matter.Bodies.rectangle(
    width / 2,
    height + wallThickness / 2,
    width + wallThickness * 2,
    wallThickness,
    { isStatic: true, collisionFilter: PEG_FILTER, label: "floor" }
  );
  walls.push(leftWall, rightWall, floor);

  // --- Slot dividers & sensors ---
  const slotRegionTop = bottomMargin;
  const slotRegionHeight = height - bottomMargin;
  const dividerWidth = Math.max(6, Math.round(slotWidth * 0.025));

  // Dividers between slots (SLOT_COUNT + 1 dividers including edges)
  for (let i = 0; i <= SLOT_COUNT; i++) {
    const x = i * slotWidth;
    const divider = Matter.Bodies.rectangle(
      x,
      slotRegionTop + slotRegionHeight / 2,
      dividerWidth,
      slotRegionHeight,
      {
        isStatic: true,
        collisionFilter: PEG_FILTER,
        label: `divider-${i}`,
      }
    );
    slotDividers.push(divider);
  }

  // Sensors at bottom of each slot
  for (let i = 0; i < SLOT_COUNT; i++) {
    const x = slotWidth / 2 + i * slotWidth;
    const sensor = Matter.Bodies.rectangle(
      x,
      height - 20,
      slotWidth - dividerWidth * 2,
      30,
      {
        isStatic: true,
        isSensor: true,
        collisionFilter: PEG_FILTER,
        label: `slot-sensor-${i}`,
      }
    );
    slotSensors.push(sensor);
  }

  // Add everything to the world
  Matter.World.add(engine.world, [
    ...pegs,
    ...walls,
    ...slotDividers,
    ...slotSensors,
  ]);

  const board: BoardGeometry = {
    pegs,
    walls,
    slotSensors,
    slotDividers,
    centerSlotIndices: new Set([CENTER_SLOT]),
    engine,
    centerWidth: "narrow",
    isWideCenter: false,
    wideModeDividerIndices: [],
  };

  // Apply initial center width
  if (centerWidth !== "narrow") {
    setCenterWidth(board, centerWidth);
  }

  return board;
}

// Divider indices to remove for each width level:
// - "wide" (5 slots: 2,3,4,5,6): remove dividers 3,4,5,6
// - "medium" (3 slots: 3,4,5): remove dividers 4,5
// - "narrow" (1 slot: 4): remove nothing
const CENTER_DIVIDERS: Record<CenterWidth, number[]> = {
  wide: [CENTER_SLOT - 1, CENTER_SLOT, CENTER_SLOT + 1, CENTER_SLOT + 2], // dividers 3,4,5,6
  medium: [CENTER_SLOT, CENTER_SLOT + 1], // dividers 4,5
  narrow: [],
};

const CENTER_SLOTS: Record<CenterWidth, number[]> = {
  wide: [CENTER_SLOT - 2, CENTER_SLOT - 1, CENTER_SLOT, CENTER_SLOT + 1, CENTER_SLOT + 2],
  medium: [CENTER_SLOT - 1, CENTER_SLOT, CENTER_SLOT + 1],
  narrow: [CENTER_SLOT],
};

/**
 * Set the center win zone width. Physically removes/restores dividers.
 * wide = 5 slots (Round 1), medium = 3 slots (Round 2), narrow = 1 slot (Round 3+).
 */
export function setCenterWidth(board: BoardGeometry, width: CenterWidth): void {
  if (board.centerWidth === width) return;

  // Restore all previously hidden dividers
  for (const idx of board.wideModeDividerIndices) {
    try {
      Matter.World.add(board.engine.world, board.slotDividers[idx]);
    } catch {
      // Already in world — ignore
    }
  }

  // Remove dividers for the new width
  const toRemove = CENTER_DIVIDERS[width];
  for (const idx of toRemove) {
    Matter.World.remove(board.engine.world, board.slotDividers[idx]);
  }

  board.centerWidth = width;
  board.isWideCenter = width !== "narrow";
  board.wideModeDividerIndices = toRemove;
  board.centerSlotIndices = new Set(CENTER_SLOTS[width]);
}

/** @deprecated Use setCenterWidth instead */
export function setWideCenter(board: BoardGeometry, wide: boolean): void {
  setCenterWidth(board, wide ? "medium" : "narrow");
}
