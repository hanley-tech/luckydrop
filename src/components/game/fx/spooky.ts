/**
 * Halloween ambience for the board — only drawn when the active theme's
 * backdrop is "spooky". Everything is time-driven (no per-frame allocation
 * beyond the short-lived rising-ghost list) and avoids shadowBlur, which is
 * what tanks FPS with many balls on screen.
 *
 *  - candle flicker on every peg, plus a bright flare when a ball strikes one
 *  - ghosts drifting across the sky
 *  - spiders bobbing on threads below the corner webs
 *  - an occasional double-flash of lightning
 *  - a ghost rising from the spot where a ball was eliminated
 */
import Matter from "matter-js";
import { getEmojiImage } from "@/lib/emojiImages";
import type { Theme } from "@/lib/theme";

const HIT_FLARE_MS = 450;
const RISE_MS = 2200;
const MAX_RISERS = 40;

const pegHits = new Map<number, number>(); // peg body id -> hit time (ms)
const risers: { x: number; y: number; born: number }[] = [];

/** Record a ball striking a peg (call from the collision handler). */
export function notePegHit(pegId: number, timeMs: number): void {
  pegHits.set(pegId, timeMs);
}

/** Queue a ghost to rise from where a ball was eliminated. */
export function spawnRisingGhost(x: number, y: number, timeMs: number): void {
  if (risers.length >= MAX_RISERS) risers.shift();
  risers.push({ x, y, born: timeMs });
}

export function resetSpooky(): void {
  pegHits.clear();
  risers.length = 0;
}

/** Lightning brightness in [0,1] for this instant. Strikes roughly every
 *  9–17 s at a pseudo-random offset per cycle, as a quick double flash. */
function lightningLevel(timeMs: number): number {
  const cycleMs = 13000;
  const cycle = Math.floor(timeMs / cycleMs);
  const jitter = (Math.sin(cycle * 12.9898) * 43758.5453) % 1;
  const strikeAt = (0.2 + Math.abs(jitter) * 0.6) * cycleMs;
  const dt = (timeMs % cycleMs) - strikeAt;
  if (dt < 0 || dt > 700) return 0;
  const flash = (start: number, len: number) =>
    dt >= start && dt < start + len ? 1 - (dt - start) / len : 0;
  return Math.max(flash(0, 120), flash(190, 480) * 0.85);
}

/** Sky flash — draw right after the backdrop, before the board. */
export function drawLightning(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeMs: number
): void {
  const level = lightningLevel(timeMs);
  if (level <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, `rgba(200,180,255,${0.38 * level})`);
  g.addColorStop(0.7, `rgba(120,90,200,${0.12 * level})`);
  g.addColorStop(1, "rgba(120,90,200,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Flicker + strike flares over the baked pegs. */
export function drawPegFlicker(
  ctx: CanvasRenderingContext2D,
  pegs: Matter.Body[],
  pegR: number,
  timeMs: number,
  theme: Theme
): void {
  const t = timeMs / 1000;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = theme.pegGlow;
  for (let i = 0; i < pegs.length; i++) {
    const peg = pegs[i];
    // Two out-of-step sines per peg read as an irregular candle flicker
    const flicker =
      0.1 + 0.07 * Math.sin(t * 7.3 + i * 1.7) + 0.05 * Math.sin(t * 13.1 + i * 0.9);
    const hit = pegHits.get(peg.id);
    let flare = 0;
    if (hit !== undefined) {
      const age = timeMs - hit;
      if (age < HIT_FLARE_MS) flare = 1 - age / HIT_FLARE_MS;
      else pegHits.delete(peg.id);
    }
    const { x, y } = peg.position;
    ctx.globalAlpha = Math.max(0, flicker + flare * 0.5);
    ctx.beginPath();
    ctx.arc(x, y, pegR * (1.5 + flare * 1.6), 0, Math.PI * 2);
    ctx.fill();
    if (flare > 0) {
      ctx.globalAlpha = flare * 0.6;
      ctx.beginPath();
      ctx.arc(x, y, pegR * (2.6 + flare * 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Drifting ghosts + dangling spiders — draw after the board, before balls. */
export function drawSpookyCritters(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeMs: number
): void {
  const t = timeMs / 1000;
  const ghost = getEmojiImage("ghost");
  const spider = getEmojiImage("spider");

  if (ghost) {
    const lanes = [
      { y: 0.34, speed: 0.022, phase: 0.1, dir: 1, size: 0.05 },
      { y: 0.58, speed: 0.017, phase: 0.6, dir: -1, size: 0.04 },
    ];
    ctx.save();
    for (const g of lanes) {
      const p = (t * g.speed + g.phase) % 1;
      const span = w * 1.3;
      const x = g.dir > 0 ? -w * 0.15 + p * span : w * 1.15 - p * span;
      const y = h * g.y + Math.sin(t * 1.3 + g.phase * 9) * h * 0.025;
      const s = w * g.size;
      ctx.globalAlpha = 0.28 + 0.12 * Math.sin(t * 2 + g.phase * 5);
      ctx.save();
      ctx.translate(x, y);
      if (g.dir < 0) ctx.scale(-1, 1);
      ctx.rotate(Math.sin(t * 1.7 + g.phase) * 0.15);
      ctx.drawImage(ghost, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
    ctx.restore();
  }

  if (spider) {
    const s = w * 0.028;
    ctx.save();
    ctx.strokeStyle = "rgba(220,210,240,0.45)";
    ctx.lineWidth = 1;
    for (const sp of [
      { x: 0.075, phase: 0 },
      { x: 0.925, phase: 2.1 },
    ]) {
      const x = w * sp.x;
      const drop = h * (0.1 + 0.08 * (0.5 + 0.5 * Math.sin(t * 0.7 + sp.phase)));
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, drop - s * 0.3);
      ctx.stroke();
      ctx.save();
      ctx.translate(x, drop);
      ctx.rotate(Math.sin(t * 2.4 + sp.phase) * 0.12);
      ctx.drawImage(spider, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
    ctx.restore();
  }
}

/** Ghosts rising from eliminated balls — draw on top of everything. */
export function drawRisingGhosts(
  ctx: CanvasRenderingContext2D,
  w: number,
  timeMs: number
): void {
  if (risers.length === 0) return;
  const ghost = getEmojiImage("ghost");
  // Drop expired ones (oldest first)
  while (risers.length && timeMs - risers[0].born > RISE_MS) risers.shift();
  if (!ghost) return;
  const base = w * 0.035;
  ctx.save();
  for (const r of risers) {
    const p = (timeMs - r.born) / RISE_MS;
    if (p < 0) continue;
    const ease = 1 - (1 - p) * (1 - p);
    const x = r.x + Math.sin(p * Math.PI * 3) * base * 0.6;
    const y = r.y - ease * w * 0.12;
    const s = base * (0.6 + ease * 0.6);
    ctx.globalAlpha = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
    ctx.drawImage(ghost, x - s / 2, y - s / 2, s, s);
  }
  ctx.restore();
}
