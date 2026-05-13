import Matter from "matter-js";
import { Player } from "@/types";
import { getEmoji, getEmojiBgColor } from "@/lib/emojis";

const BG_COLOR = "#0F172A";
const PEG_COLOR = "#94A3B8";
const DIVIDER_COLOR = "#334155";
const CENTER_GLOW_COLOR = "rgba(251, 191, 36, 0.35)";
const CENTER_BORDER_COLOR = "#F59E0B";
const TEXT_COLOR = "#FFFFFF";
const BOUNCY_PEG_COLOR = "#EC4899";
const BOUNCY_PEG_GLOW = "rgba(236, 72, 153, 0.45)";
const PLATFORM_COLOR = "#FBBF24";
const PLATFORM_EDGE = "#92400E";
const PROJECTILE_COLOR = "#F97316";

interface RenderOptions {
  roundNumber: number;
  isRecycling: boolean;
  bouncyPegs?: Matter.Body[];
  platforms?: Matter.Body[];
  projectiles?: Matter.Body[];
}

// ---------------------------------------------------------------------------
// Pre-rendered sprite caches
// ---------------------------------------------------------------------------

const ballSpriteCache = new Map<string, HTMLCanvasElement>();
let boardCache: HTMLCanvasElement | null = null;
let boardCacheKey = "";

function getBallSprite(emojiId: string, visualR: number): HTMLCanvasElement {
  const key = `${emojiId}-${visualR}`;
  const cached = ballSpriteCache.get(key);
  if (cached) return cached;

  const size = (visualR + 2) * 2;
  const offscreen = document.createElement("canvas");
  offscreen.width = size;
  offscreen.height = size;
  const ctx = offscreen.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;

  const bgColor = getEmojiBgColor(emojiId);
  const emoji = getEmoji(emojiId);

  const grad = ctx.createRadialGradient(
    cx - visualR * 0.3, cy - visualR * 0.3, visualR * 0.15,
    cx, cy, visualR
  );
  grad.addColorStop(0, lightenColor(bgColor, 60));
  grad.addColorStop(0.7, bgColor);
  grad.addColorStop(1, darkenColor(bgColor, 40));

  ctx.beginPath();
  ctx.arc(cx, cy, visualR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const emojiSize = Math.round(visualR * 1.4);
  ctx.font = `${emojiSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000000";
  ctx.fillText(emoji, cx, cy + 1);

  ballSpriteCache.set(key, offscreen);
  return offscreen;
}

function getStaticBoard(
  pegs: Matter.Body[],
  slotDividers: Matter.Body[],
  slotSensors: Matter.Body[],
  centerSlotIndices: Set<number>,
  isWideCenter: boolean,
  hiddenDividerIndices: number[],
  boardWidth: number,
  boardHeight: number
): HTMLCanvasElement {
  const key = `${boardWidth}-${boardHeight}-${pegs.length}-wide${isWideCenter}`;
  if (boardCache && boardCacheKey === key) return boardCache;

  const offscreen = document.createElement("canvas");
  offscreen.width = boardWidth;
  offscreen.height = boardHeight;
  const ctx = offscreen.getContext("2d")!;

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, boardWidth, boardHeight);

  // Center slot highlight — spans all center indices
  if (slotSensors.length > 0) {
    const slotWidth = boardWidth / slotSensors.length;
    const slotTop = boardHeight * 0.85;

    const indices = Array.from(centerSlotIndices).sort((a, b) => a - b);
    const leftIdx = indices[0];
    const rightIdx = indices[indices.length - 1];
    const highlightLeft = slotSensors[leftIdx].position.x - slotWidth / 2;
    const highlightRight = slotSensors[rightIdx].position.x + slotWidth / 2;
    const highlightWidth = highlightRight - highlightLeft;

    ctx.fillStyle = CENTER_GLOW_COLOR;
    ctx.fillRect(highlightLeft, slotTop, highlightWidth, boardHeight - slotTop);

    ctx.strokeStyle = CENTER_BORDER_COLOR;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(highlightLeft, slotTop);
    ctx.lineTo(highlightLeft, boardHeight);
    ctx.moveTo(highlightRight, slotTop);
    ctx.lineTo(highlightRight, boardHeight);
    ctx.stroke();

    // "WIN" label centered in the highlight
    ctx.fillStyle = CENTER_BORDER_COLOR;
    ctx.font = `bold ${Math.round(boardWidth * 0.028)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("WIN", highlightLeft + highlightWidth / 2, slotTop + 8);
  }

  // Slot dividers — skip hidden ones (removed for wide center)
  const hiddenSet = new Set(hiddenDividerIndices);
  ctx.fillStyle = DIVIDER_COLOR;
  for (let i = 0; i < slotDividers.length; i++) {
    if (isWideCenter && hiddenSet.has(i)) continue;
    const div = slotDividers[i];
    const w = Math.max(6, Math.round((boardWidth / 9) * 0.025));
    const h = boardHeight - boardHeight * 0.85;
    ctx.fillRect(div.position.x - w / 2, boardHeight * 0.85, w, h);
  }

  // Pegs — derive radius from board width to match physics (ballR * 0.5)
  const ballR = Math.round((boardWidth / 9) * 0.08);
  const pegDrawRadius = Math.round(ballR * 0.5);
  ctx.fillStyle = PEG_COLOR;
  for (const peg of pegs) {
    ctx.beginPath();
    ctx.arc(peg.position.x, peg.position.y, pegDrawRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  boardCache = offscreen;
  boardCacheKey = key;
  return offscreen;
}

/** Call this when the board layout changes (wide/narrow toggle, resize) */
export function clearRenderCache(): void {
  ballSpriteCache.clear();
  boardCache = null;
  boardCacheKey = "";
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

export function render(
  ctx: CanvasRenderingContext2D,
  pegs: Matter.Body[],
  balls: Matter.Body[],
  slotDividers: Matter.Body[],
  slotSensors: Matter.Body[],
  centerSlotIndices: Set<number>,
  isWideCenter: boolean,
  hiddenDividerIndices: number[],
  boardWidth: number,
  boardHeight: number,
  getBallPlayer: (body: Matter.Body) => Player | undefined,
  options: RenderOptions
): void {
  // Static board from cache
  const board = getStaticBoard(
    pegs, slotDividers, slotSensors,
    centerSlotIndices, isWideCenter, hiddenDividerIndices,
    boardWidth, boardHeight
  );
  ctx.drawImage(board, 0, 0);

  // Balls — derive radius from board width (same formula as BallManager)
  const ballCount = balls.length;
  const r = Math.round((boardWidth / 9) * 0.08);
  const visualR = r + Math.round(r * 0.25);
  const spriteSize = (visualR + 2) * 2;
  // Scale name font size down as ball count increases
  const baseFontSize = Math.max(18, Math.round(boardWidth * 0.018));
  const nameFontSize = ballCount > 80
    ? Math.max(10, Math.round(baseFontSize * (80 / ballCount)))
    : baseFontSize;

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `bold ${nameFontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // ----- Level extras: bouncy pegs (drawn behind balls) -----
  if (options.bouncyPegs && options.bouncyPegs.length > 0) {
    for (const p of options.bouncyPegs) {
      const radius =
        (p as Matter.Body & { circleRadius?: number }).circleRadius ?? 10;
      ctx.fillStyle = BOUNCY_PEG_GLOW;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, radius * 1.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = BOUNCY_PEG_COLOR;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // ----- Level extras: platforms (sliding tray segments) -----
  if (options.platforms && options.platforms.length > 0) {
    for (const seg of options.platforms) {
      const bounds = seg.bounds;
      const w = bounds.max.x - bounds.min.x;
      const h = bounds.max.y - bounds.min.y;
      ctx.fillStyle = PLATFORM_COLOR;
      ctx.fillRect(bounds.min.x, bounds.min.y, w, h);
      ctx.strokeStyle = PLATFORM_EDGE;
      ctx.lineWidth = 2;
      ctx.strokeRect(bounds.min.x, bounds.min.y, w, h);
    }
  }

  // ----- Level extras: projectiles (cannonballs) — drawn under player balls -----
  if (options.projectiles && options.projectiles.length > 0) {
    for (const p of options.projectiles) {
      const radius =
        (p as Matter.Body & { circleRadius?: number }).circleRadius ?? 10;
      // Motion trail
      const speed = Math.sqrt(
        p.velocity.x * p.velocity.x + p.velocity.y * p.velocity.y
      );
      if (speed > 1) {
        const trailLen = Math.min(radius * 4, speed * 6);
        const angle = Math.atan2(p.velocity.y, p.velocity.x);
        const tx = p.position.x - Math.cos(angle) * trailLen;
        const ty = p.position.y - Math.sin(angle) * trailLen;
        const grad = ctx.createLinearGradient(
          p.position.x,
          p.position.y,
          tx,
          ty
        );
        grad.addColorStop(0, "rgba(249, 115, 22, 0.9)");
        grad.addColorStop(1, "rgba(249, 115, 22, 0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = radius * 1.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.position.x, p.position.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
      ctx.fillStyle = PROJECTILE_COLOR;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#7C2D12";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  for (const ball of balls) {
    const player = getBallPlayer(ball);
    if (!player) continue;

    const sprite = getBallSprite(player.emoji, visualR);
    ctx.drawImage(
      sprite,
      ball.position.x - spriteSize / 2,
      ball.position.y - spriteSize / 2
    );

    ctx.fillStyle = TEXT_COLOR;
    ctx.fillText(player.name, ball.position.x, ball.position.y + visualR + 4);
  }

  // Dim the board during recycling (the message overlay is in GamePhase.tsx)
  if (options.isRecycling) {
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
    ctx.fillRect(0, 0, boardWidth, boardHeight);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function lightenColor(hex: string, amount: number): string {
  return adjustColor(hex, amount);
}

function darkenColor(hex: string, amount: number): string {
  return adjustColor(hex, -amount);
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
