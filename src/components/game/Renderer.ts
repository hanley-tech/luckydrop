import Matter from "matter-js";
import { Player } from "@/types";
import { getEmoji, getEmojiBgColor } from "@/lib/emojis";
import { getEmojiImage } from "@/lib/emojiImages";
import { ParticleField } from "./fx/particles";

// ---------------------------------------------------------------------------
// Neon "Geometry Wars" palette
// ---------------------------------------------------------------------------

const BG_TOP = "#05060f";
const BG_BOTTOM = "#0a0a1c";
const GRID_COLOR = "rgba(46,128,224,0.16)";
const GRID_ACCENT = "rgba(56,196,255,0.28)";
const PEG_CORE = "#cdf3ff";
const PEG_GLOW = "rgba(56,196,255,0.9)";
const DIVIDER_COLOR = "#1e8bff";
const DIVIDER_GLOW = "rgba(30,139,255,0.7)";
const WIN_GLOW = "rgba(255,64,160,0.85)";
const WIN_BORDER = "#ff3ea5";
const WIN_FILL = "rgba(255,62,165,0.12)";
const TEXT_COLOR = "#FFFFFF";
const BOUNCY_PEG_COLOR = "#ff2bd6";
const BOUNCY_PEG_GLOW = "rgba(255,43,214,0.6)";
const PLATFORM_COLOR = "#ffd54a";
const PLATFORM_EDGE = "#7a5a00";
const PROJECTILE_COLOR = "#ff7a18";

interface RenderOptions {
  roundNumber: number;
  isRecycling: boolean;
  /** Monotonic time in ms — drives grid scroll + WIN-zone pulse */
  timeMs: number;
  particles?: ParticleField;
  /** Player ids whose ball has "died" — skip drawing (they blew up) */
  deadPlayers?: Set<string>;
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

/** Neon-outlined emoji ball: edge glow + glowing ring in the player's color. */
function getBallSprite(
  emojiId: string,
  color: string,
  visualR: number
): HTMLCanvasElement {
  const img = getEmojiImage(emojiId);
  // Key includes whether the emoji image is loaded yet, so the temporary
  // no-image sprite is reused cheaply until the PNG arrives, then re-baked.
  const key = `${emojiId}-${color}-${visualR}-${img ? "img" : "txt"}`;
  const cached = ballSpriteCache.get(key);
  if (cached) return cached;

  const glowPad = Math.round(visualR * 1.1);
  const size = (visualR + glowPad) * 2;
  const offscreen = document.createElement("canvas");
  offscreen.width = size;
  offscreen.height = size;
  const ctx = offscreen.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;

  // Outer color halo (additive radial bloom)
  const halo = ctx.createRadialGradient(cx, cy, visualR * 0.4, cx, cy, visualR + glowPad);
  halo.addColorStop(0, hexToRgba(color, 0.55));
  halo.addColorStop(0.55, hexToRgba(color, 0.22));
  halo.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, visualR + glowPad, 0, Math.PI * 2);
  ctx.fill();

  // Dark glassy core so the emoji reads against the bright board
  const core = ctx.createRadialGradient(
    cx - visualR * 0.3,
    cy - visualR * 0.3,
    visualR * 0.1,
    cx,
    cy,
    visualR
  );
  core.addColorStop(0, "rgba(20,24,40,0.92)");
  core.addColorStop(1, "rgba(6,8,18,0.96)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, visualR, 0, Math.PI * 2);
  ctx.fill();

  // Glowing neon ring in the player's color
  ctx.shadowColor = color;
  ctx.shadowBlur = visualR * 0.8;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, visualR * 0.16);
  ctx.beginPath();
  ctx.arc(cx, cy, visualR - ctx.lineWidth * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Emoji on top — draw the bundled Twemoji PNG (renders on any device). Fall
  // back to OS emoji text only if the image failed to load.
  if (img) {
    const s = Math.round(visualR * 1.6);
    ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s);
  } else {
    const emoji = getEmoji(emojiId);
    const emojiSize = Math.round(visualR * 1.3);
    ctx.font = `${emojiSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, cx, cy + 1);
  }

  ballSpriteCache.set(key, offscreen);
  return offscreen;
}

/**
 * Static board overlay — pegs, dividers and the WIN zone with baked neon glow.
 * Transparent background so the live animated grid shows through underneath.
 */
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
  // NOTE: intentionally transparent — the grid is drawn live behind this.

  const slotTop = boardHeight * 0.85;

  // --- WIN zone ---
  if (slotSensors.length > 0) {
    const slotWidth = boardWidth / slotSensors.length;
    const indices = Array.from(centerSlotIndices).sort((a, b) => a - b);
    const leftIdx = indices[0];
    const rightIdx = indices[indices.length - 1];
    const highlightLeft = slotSensors[leftIdx].position.x - slotWidth / 2;
    const highlightRight = slotSensors[rightIdx].position.x + slotWidth / 2;
    const highlightWidth = highlightRight - highlightLeft;

    // Vertical glow gradient filling the win column
    const grad = ctx.createLinearGradient(0, slotTop, 0, boardHeight);
    grad.addColorStop(0, WIN_FILL);
    grad.addColorStop(1, hexToRgba(WIN_BORDER, 0.32));
    ctx.fillStyle = grad;
    ctx.fillRect(highlightLeft, slotTop, highlightWidth, boardHeight - slotTop);

    ctx.shadowColor = WIN_GLOW;
    ctx.shadowBlur = 24;
    ctx.strokeStyle = WIN_BORDER;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(highlightLeft, slotTop);
    ctx.lineTo(highlightLeft, boardHeight);
    ctx.moveTo(highlightRight, slotTop);
    ctx.lineTo(highlightRight, boardHeight);
    ctx.stroke();

    ctx.fillStyle = WIN_BORDER;
    ctx.font = `bold ${Math.round(boardWidth * 0.03)}px "Geist", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("WIN", highlightLeft + highlightWidth / 2, slotTop + 8);
    ctx.shadowBlur = 0;
  }

  // --- Slot dividers (electric blue, glowing) ---
  const hiddenSet = new Set(hiddenDividerIndices);
  ctx.shadowColor = DIVIDER_GLOW;
  ctx.shadowBlur = 10;
  ctx.fillStyle = DIVIDER_COLOR;
  for (let i = 0; i < slotDividers.length; i++) {
    if (isWideCenter && hiddenSet.has(i)) continue;
    const div = slotDividers[i];
    const w = Math.max(5, Math.round((boardWidth / 9) * 0.022));
    const h = boardHeight - slotTop;
    ctx.fillRect(div.position.x - w / 2, slotTop, w, h);
  }
  ctx.shadowBlur = 0;

  // --- Pegs (glowing neon dots) ---
  const ballR = Math.round((boardWidth / 9) * 0.08);
  const pegDrawRadius = Math.max(2, Math.round(ballR * 0.5));
  for (const peg of pegs) {
    // glow
    ctx.shadowColor = PEG_GLOW;
    ctx.shadowBlur = pegDrawRadius * 3;
    ctx.fillStyle = PEG_GLOW;
    ctx.beginPath();
    ctx.arc(peg.position.x, peg.position.y, pegDrawRadius, 0, Math.PI * 2);
    ctx.fill();
    // bright core
    ctx.shadowBlur = 0;
    ctx.fillStyle = PEG_CORE;
    ctx.beginPath();
    ctx.arc(peg.position.x, peg.position.y, pegDrawRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  boardCache = offscreen;
  boardCacheKey = key;
  return offscreen;
}

/** Call this when the board layout changes (wide/narrow toggle, resize). */
export function clearRenderCache(): void {
  ballSpriteCache.clear();
  boardCache = null;
  boardCacheKey = "";
}

// ---------------------------------------------------------------------------
// Live background: gradient + animated neon grid
// ---------------------------------------------------------------------------

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeMs: number
): void {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, BG_TOP);
  bg.addColorStop(1, BG_BOTTOM);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const cell = Math.max(26, Math.round(w / 30));
  const scroll = ((timeMs * 0.02) % cell + cell) % cell;
  const pulse = 0.5 + 0.5 * Math.sin(timeMs * 0.0016);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineWidth = 1;

  // Vertical lines
  ctx.strokeStyle = GRID_COLOR;
  ctx.beginPath();
  for (let x = 0; x <= w; x += cell) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  ctx.stroke();

  // Horizontal lines (scrolling downward)
  ctx.beginPath();
  for (let y = -cell + scroll; y <= h; y += cell) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  // A couple of brighter accent rows that breathe
  ctx.strokeStyle = GRID_ACCENT;
  ctx.globalAlpha = 0.4 + pulse * 0.5;
  ctx.beginPath();
  const accentGap = cell * 5;
  for (let y = -accentGap + ((timeMs * 0.04) % accentGap); y <= h; y += accentGap) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** Additive breathing glow over the WIN column, drawn live on top of cache. */
function drawWinPulse(
  ctx: CanvasRenderingContext2D,
  slotSensors: Matter.Body[],
  centerSlotIndices: Set<number>,
  w: number,
  h: number,
  timeMs: number
): void {
  if (slotSensors.length === 0) return;
  const slotWidth = w / slotSensors.length;
  const indices = Array.from(centerSlotIndices).sort((a, b) => a - b);
  const left = slotSensors[indices[0]].position.x - slotWidth / 2;
  const right =
    slotSensors[indices[indices.length - 1]].position.x + slotWidth / 2;
  const slotTop = h * 0.85;
  const pulse = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(timeMs * 0.005));

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const grad = ctx.createLinearGradient(0, slotTop - 40, 0, h);
  grad.addColorStop(0, hexToRgba(WIN_BORDER, 0));
  grad.addColorStop(1, hexToRgba(WIN_BORDER, pulse));
  ctx.fillStyle = grad;
  ctx.fillRect(left, slotTop - 40, right - left, h - slotTop + 40);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Main render function (called inside the camera transform)
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
  // Live animated background + grid
  drawBackground(ctx, boardWidth, boardHeight, options.timeMs);

  // Static neon board overlay
  const board = getStaticBoard(
    pegs,
    slotDividers,
    slotSensors,
    centerSlotIndices,
    isWideCenter,
    hiddenDividerIndices,
    boardWidth,
    boardHeight
  );
  ctx.drawImage(board, 0, 0);
  drawWinPulse(ctx, slotSensors, centerSlotIndices, boardWidth, boardHeight, options.timeMs);

  // Ball geometry
  const ballCount = balls.length;
  const r = Math.round((boardWidth / 9) * 0.08);
  const visualR = r + Math.round(r * 0.25);
  const glowPad = Math.round(visualR * 1.1);
  const spriteSize = (visualR + glowPad) * 2;
  const baseFontSize = Math.max(18, Math.round(boardWidth * 0.018));
  const nameFontSize =
    ballCount > 80
      ? Math.max(10, Math.round(baseFontSize * (80 / ballCount)))
      : baseFontSize;

  // ----- Level extras: bouncy pegs -----
  if (options.bouncyPegs && options.bouncyPegs.length > 0) {
    for (const p of options.bouncyPegs) {
      const radius =
        (p as Matter.Body & { circleRadius?: number }).circleRadius ?? 10;
      ctx.save();
      ctx.shadowColor = BOUNCY_PEG_GLOW;
      ctx.shadowBlur = radius * 1.4;
      ctx.fillStyle = BOUNCY_PEG_COLOR;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  // ----- Level extras: platforms (sliding tray) -----
  if (options.platforms && options.platforms.length > 0) {
    for (const seg of options.platforms) {
      const bounds = seg.bounds;
      const w = bounds.max.x - bounds.min.x;
      const h = bounds.max.y - bounds.min.y;
      ctx.save();
      ctx.shadowColor = "rgba(255,213,74,0.6)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = PLATFORM_COLOR;
      ctx.fillRect(bounds.min.x, bounds.min.y, w, h);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = PLATFORM_EDGE;
      ctx.lineWidth = 2;
      ctx.strokeRect(bounds.min.x, bounds.min.y, w, h);
      ctx.restore();
    }
  }

  // ----- Level extras: projectiles (cannonballs) -----
  if (options.projectiles && options.projectiles.length > 0) {
    for (const p of options.projectiles) {
      const radius =
        (p as Matter.Body & { circleRadius?: number }).circleRadius ?? 10;
      const speed = Math.sqrt(
        p.velocity.x * p.velocity.x + p.velocity.y * p.velocity.y
      );
      if (speed > 1) {
        const trailLen = Math.min(radius * 4, speed * 6);
        const angle = Math.atan2(p.velocity.y, p.velocity.x);
        const tx = p.position.x - Math.cos(angle) * trailLen;
        const ty = p.position.y - Math.sin(angle) * trailLen;
        const grad = ctx.createLinearGradient(p.position.x, p.position.y, tx, ty);
        grad.addColorStop(0, "rgba(255,122,24,0.9)");
        grad.addColorStop(1, "rgba(255,122,24,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = radius * 1.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.position.x, p.position.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
      ctx.save();
      ctx.shadowColor = "rgba(255,122,24,0.8)";
      ctx.shadowBlur = radius;
      ctx.fillStyle = PROJECTILE_COLOR;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ----- Velocity trails behind balls (additive streaks) -----
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (const ball of balls) {
    const player = getBallPlayer(ball);
    if (!player) continue;
    if (options.deadPlayers?.has(player.id)) continue;
    const speed = Math.sqrt(
      ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y
    );
    if (speed < 2) continue;
    const color = getEmojiBgColor(player.emoji);
    const trailLen = Math.min(visualR * 3.2, speed * 3.5);
    const angle = Math.atan2(ball.velocity.y, ball.velocity.x);
    const tx = ball.position.x - Math.cos(angle) * trailLen;
    const ty = ball.position.y - Math.sin(angle) * trailLen;
    const grad = ctx.createLinearGradient(ball.position.x, ball.position.y, tx, ty);
    grad.addColorStop(0, hexToRgba(color, 0.6));
    grad.addColorStop(1, hexToRgba(color, 0));
    ctx.strokeStyle = grad;
    ctx.lineWidth = visualR * 0.9;
    ctx.beginPath();
    ctx.moveTo(ball.position.x, ball.position.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  }
  ctx.restore();

  // ----- Balls (neon sprites) + name labels -----
  ctx.font = `bold ${nameFontSize}px "Geist", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const ball of balls) {
    const player = getBallPlayer(ball);
    if (!player) continue;
    if (options.deadPlayers?.has(player.id)) continue;
    const color = getEmojiBgColor(player.emoji);
    const sprite = getBallSprite(player.emoji, color, visualR);
    ctx.drawImage(
      sprite,
      ball.position.x - spriteSize / 2,
      ball.position.y - spriteSize / 2
    );

    // Readable label: dark stroke + white fill (cheap, no per-letter glow)
    ctx.lineWidth = Math.max(2, nameFontSize * 0.18);
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(player.name, ball.position.x, ball.position.y + visualR + 4);
    ctx.fillStyle = TEXT_COLOR;
    ctx.fillText(player.name, ball.position.x, ball.position.y + visualR + 4);
  }

  // ----- Particle field (sparks, bursts, shockwaves) on top -----
  options.particles?.draw(ctx);

  // Dim the board during recycling (overlay message is in GamePhase.tsx)
  if (options.isRecycling) {
    ctx.save();
    ctx.fillStyle = "rgba(5, 6, 15, 0.55)";
    ctx.fillRect(0, 0, boardWidth, boardHeight);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function hexToRgba(hex: string, alpha: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}
