import Matter from "matter-js";
import { Player } from "@/types";
import { getEmoji, getEmojiBgColor } from "@/lib/emojis";
import { getEmojiImage } from "@/lib/emojiImages";
import { ParticleField } from "./fx/particles";
import { getTheme, getThemeImage, Theme } from "@/lib/theme";
import {
  drawLightning,
  drawPegFlicker,
  drawRisingGhosts,
  drawSpookyCritters,
} from "./fx/spooky";

// Palette comes from the active theme (src/lib/theme.ts), read each frame.
const TEXT_COLOR = "#FFFFFF";

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
  const theme = getTheme();
  const key = `${theme.id}-${emojiId}-${color}-${visualR}-${img ? "img" : "txt"}`;
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
  core.addColorStop(0, theme.ballCoreInner);
  core.addColorStop(1, theme.ballCoreOuter);
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
  const theme = getTheme();
  const pegImg = theme.pegEmoji ? getEmojiImage(theme.pegEmoji) : null;
  const winFont = `bold ${Math.round(boardWidth * 0.03)}px ${theme.displayFont ?? '"Geist", sans-serif'}`;
  // Re-bake once the peg sprite and display font have arrived
  const fontReady = typeof document === "undefined" || document.fonts.check(winFont);
  const key = `${theme.id}-${boardWidth}-${boardHeight}-${pegs.length}-wide${isWideCenter}-${pegImg ? "peg" : "dot"}-${fontReady ? "f" : "nf"}`;
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
    grad.addColorStop(0, theme.winFill);
    grad.addColorStop(1, hexToRgba(theme.winBorder, 0.32));
    ctx.fillStyle = grad;
    ctx.fillRect(highlightLeft, slotTop, highlightWidth, boardHeight - slotTop);

    ctx.shadowColor = theme.winGlow;
    ctx.shadowBlur = 24;
    ctx.strokeStyle = theme.winBorder;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(highlightLeft, slotTop);
    ctx.lineTo(highlightLeft, boardHeight);
    ctx.moveTo(highlightRight, slotTop);
    ctx.lineTo(highlightRight, boardHeight);
    ctx.stroke();

    // The WIN label is drawn live in drawWinPulse, on top of the pulse
    ctx.shadowBlur = 0;
  }

  // --- Slot dividers (glowing) ---
  const hiddenSet = new Set(hiddenDividerIndices);
  ctx.shadowColor = theme.dividerGlow;
  ctx.shadowBlur = 10;
  ctx.fillStyle = theme.divider;
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
  if (pegImg) {
    // Emoji pegs (e.g. jack-o'-lanterns): soft glow disc, then the sprite
    const s = Math.round(pegDrawRadius * 2.8);
    for (const peg of pegs) {
      ctx.shadowColor = theme.pegGlow;
      ctx.shadowBlur = pegDrawRadius * 3;
      ctx.fillStyle = theme.pegGlow;
      ctx.beginPath();
      ctx.arc(peg.position.x, peg.position.y, pegDrawRadius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.drawImage(pegImg, peg.position.x - s / 2, peg.position.y - s / 2, s, s);
    }
    boardCache = offscreen;
    boardCacheKey = key;
    return offscreen;
  }
  for (const peg of pegs) {
    // glow
    ctx.shadowColor = theme.pegGlow;
    ctx.shadowBlur = pegDrawRadius * 3;
    ctx.fillStyle = theme.pegGlow;
    ctx.beginPath();
    ctx.arc(peg.position.x, peg.position.y, pegDrawRadius, 0, Math.PI * 2);
    ctx.fill();
    // bright core
    ctx.shadowBlur = 0;
    ctx.fillStyle = theme.pegCore;
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
  timeMs: number,
  theme: Theme
): void {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, theme.bgTop);
  bg.addColorStop(1, theme.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  if (theme.backdrop === "spooky") {
    drawSpookyBackdrop(ctx, w, h, timeMs, theme);
    return;
  }

  const cell = Math.max(26, Math.round(w / 30));
  const scroll = ((timeMs * 0.02) % cell + cell) % cell;
  const pulse = 0.5 + 0.5 * Math.sin(timeMs * 0.0016);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineWidth = 1;

  // Vertical lines
  ctx.strokeStyle = theme.grid;
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
  ctx.strokeStyle = theme.gridAccent;
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

// Bat flight paths: fractions of board size, so they scale with the canvas.
// dir: 1 = left-to-right. swoop = dive/climb amplitude (fraction of height).
const BATS = [
  { y: 0.12, speed: 0.09, phase: 0.0, size: 0.04, dir: -1, swoop: 0.05 },
  { y: 0.22, speed: 0.065, phase: 0.35, size: 0.03, dir: 1, swoop: 0.04 },
  { y: 0.08, speed: 0.11, phase: 0.7, size: 0.024, dir: -1, swoop: 0.03 },
  { y: 0.3, speed: 0.055, phase: 0.55, size: 0.034, dir: 1, swoop: 0.06 },
  { y: 0.16, speed: 0.08, phase: 0.15, size: 0.02, dir: 1, swoop: 0.035 },
  { y: 0.42, speed: 0.05, phase: 0.85, size: 0.028, dir: -1, swoop: 0.05 },
];

/** Silhouette bat centred at (x,y), wings flapping with `flap` in [-1,1]. */
function drawBat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  flap: number
): void {
  const lift = flap * s * 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.15);
  // left wing
  ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.4 - lift, x - s, y - lift);
  ctx.quadraticCurveTo(x - s * 0.7, y - lift * 0.3, x - s * 0.55, y + s * 0.15);
  ctx.quadraticCurveTo(x - s * 0.35, y, x - s * 0.2, y + s * 0.25);
  ctx.lineTo(x, y + s * 0.2);
  // right wing (mirror)
  ctx.lineTo(x + s * 0.2, y + s * 0.25);
  ctx.quadraticCurveTo(x + s * 0.35, y, x + s * 0.55, y + s * 0.15);
  ctx.quadraticCurveTo(x + s * 0.7, y - lift * 0.3, x + s, y - lift);
  ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.4 - lift, x, y - s * 0.15);
  ctx.closePath();
  ctx.fill();
}

/** Halloween backdrop: harvest moon, flapping bats, drifting ground fog. */
function drawSpookyBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeMs: number,
  theme: Theme
): void {
  const t = timeMs / 1000;

  const plate = theme.boardImage ? getThemeImage(theme.boardImage) : null;
  if (plate) {
    // Painted plate (has its own moon), cover-fit, dimmed so pegs/balls pop
    const scale = Math.max(w / plate.naturalWidth, h / plate.naturalHeight);
    const pw = plate.naturalWidth * scale;
    const ph = plate.naturalHeight * scale;
    ctx.drawImage(plate, (w - pw) / 2, (h - ph) / 2, pw, ph);
    ctx.fillStyle = "rgba(8,2,14,0.35)";
    ctx.fillRect(0, 0, w, h);
  } else {
    drawMoon(ctx, w, h);
  }

  drawLightning(ctx, w, h, timeMs);
  drawBatsAndFog(ctx, w, h, t);
}

function drawMoon(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Moon with a soft orange halo
  const mx = w * 0.82;
  const my = h * 0.13;
  const mr = Math.min(w, h) * 0.07;
  ctx.save();
  const halo = ctx.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 3.2);
  halo.addColorStop(0, "rgba(255,170,60,0.28)");
  halo.addColorStop(1, "rgba(255,170,60,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(mx - mr * 3.2, my - mr * 3.2, mr * 6.4, mr * 6.4);
  const disc = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
  disc.addColorStop(0, "#fff1c9");
  disc.addColorStop(1, "#f2a640");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBatsAndFog(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number
): void {
  // Bats: cross the sky with a swooping climb/dive, banking into each turn,
  // wings beating fast. Purple rim + orange eyes so they read on dark sky.
  ctx.save();
  for (const b of BATS) {
    const span = w * 1.3;
    const p = (t * b.speed + b.phase) % 1;
    const x = b.dir > 0 ? -w * 0.15 + p * span : w * 1.15 - p * span;
    const swoopT = t * 1.6 + b.phase * 10;
    const y = h * b.y + Math.sin(swoopT) * h * b.swoop + Math.sin(swoopT * 2.3) * h * 0.01;
    const bank = Math.cos(swoopT) * 0.35 * b.dir;
    const s = w * b.size;
    const flap = Math.sin(t * 22 + b.phase * 20);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(bank);
    ctx.fillStyle = "#14061c";
    ctx.strokeStyle = "rgba(183,125,255,0.75)";
    ctx.lineWidth = Math.max(1, s * 0.06);
    drawBat(ctx, 0, 0, s, flap);
    ctx.stroke();
    ctx.fillStyle = "#ff8a1f";
    const eye = Math.max(1, s * 0.05);
    ctx.fillRect(-s * 0.08 - eye / 2, -s * 0.05, eye, eye);
    ctx.fillRect(s * 0.08 - eye / 2, -s * 0.05, eye, eye);
    ctx.restore();
  }
  ctx.restore();

  // Fog banks drifting along the bottom, layered at different speeds
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const fy = h * (0.74 + i * 0.07);
    const drift = Math.sin(t * (0.15 + i * 0.07) + i * 2) * w * 0.08;
    for (let j = -1; j <= 4; j++) {
      const fx = j * w * 0.3 + drift + i * w * 0.12;
      const fr = w * 0.22;
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
      g.addColorStop(0, `rgba(190,160,230,${0.07 - i * 0.015})`);
      g.addColorStop(1, "rgba(190,160,230,0)");
      ctx.fillStyle = g;
      ctx.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
    }
  }
  ctx.restore();
}

/** Hang the theme's corner image in both top corners (right one mirrored). */
function drawCornerWebs(
  ctx: CanvasRenderingContext2D,
  path: string,
  w: number
): void {
  const img = getThemeImage(path);
  if (!img) return;
  const s = w * 0.13;
  ctx.save();
  ctx.globalAlpha = 0.4;
  // Twemoji's web hangs from its top-left; nudge it off-canvas a little
  ctx.drawImage(img, -s * 0.12, -s * 0.12, s, s);
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(img, -s * 0.12, -s * 0.12, s, s);
  ctx.restore();
}

/** Additive breathing glow over the WIN column, drawn live on top of cache. */
function drawWinPulse(
  ctx: CanvasRenderingContext2D,
  slotSensors: Matter.Body[],
  centerSlotIndices: Set<number>,
  w: number,
  h: number,
  timeMs: number,
  theme: Theme
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
  grad.addColorStop(0, hexToRgba(theme.winBorder, 0));
  grad.addColorStop(1, hexToRgba(theme.winBorder, pulse));
  ctx.fillStyle = grad;
  ctx.fillRect(left, slotTop - 40, right - left, h - slotTop + 40);
  ctx.restore();

  // WIN label in the theme font with a neon glow, drawn after the additive
  // pulse so it can't be washed out. White core + heavy dark outline keep it
  // legible against the same-coloured column (theme-coloured text with a
  // heavy glow, as before, melted into it).
  const fontPx = Math.round(w * 0.04);
  ctx.save();
  // No "bold" on a theme display face: Creepster ships Regular only, and
  // Chrome's synthetic bold smears its strokes so the label looks blurred
  ctx.font = theme.displayFont
    ? `${fontPx}px ${theme.displayFont}`
    : `bold ${fontPx}px "Geist", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const cx = (left + right) / 2;
  const ty = slotTop + 10;
  // Glow hangs off the dark outline, not the letters, so the white core
  // stays crisp
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(4, fontPx * (theme.displayFont ? 0.14 : 0.22));
  ctx.strokeStyle = "rgba(0,0,0,0.9)";
  ctx.shadowColor = theme.winGlow;
  ctx.shadowBlur = 18;
  ctx.strokeText("WIN", cx, ty);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.fillText("WIN", cx, ty);
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
  const theme = getTheme();

  // Live animated background (grid or themed backdrop)
  drawBackground(ctx, boardWidth, boardHeight, options.timeMs, theme);

  // Static board overlay
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
  const spooky = theme.backdrop === "spooky";
  if (spooky) {
    const pegR = Math.max(2, Math.round(Math.round((boardWidth / 9) * 0.08) * 0.5));
    drawPegFlicker(ctx, pegs, pegR, options.timeMs, theme);
  }
  if (theme.cornerImage) drawCornerWebs(ctx, theme.cornerImage, boardWidth);
  if (spooky) drawSpookyCritters(ctx, boardWidth, boardHeight, options.timeMs);
  drawWinPulse(ctx, slotSensors, centerSlotIndices, boardWidth, boardHeight, options.timeMs, theme);

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
      ctx.shadowColor = theme.bouncyPegGlow;
      ctx.shadowBlur = radius * 1.4;
      ctx.fillStyle = theme.bouncyPeg;
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
      ctx.shadowColor = theme.platformGlow;
      ctx.shadowBlur = 12;
      ctx.fillStyle = theme.platform;
      ctx.fillRect(bounds.min.x, bounds.min.y, w, h);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = theme.platformEdge;
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
        grad.addColorStop(0, `rgba(${theme.projectileRgb},0.9)`);
        grad.addColorStop(1, `rgba(${theme.projectileRgb},0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = radius * 1.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.position.x, p.position.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
      ctx.save();
      ctx.shadowColor = `rgba(${theme.projectileRgb},0.8)`;
      ctx.shadowBlur = radius;
      ctx.fillStyle = `rgb(${theme.projectileRgb})`;
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
  if (spooky) drawRisingGhosts(ctx, boardWidth, options.timeMs);

  // Dim the board during recycling (overlay message is in GamePhase.tsx)
  if (options.isRecycling) {
    ctx.save();
    ctx.fillStyle = theme.dim;
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
