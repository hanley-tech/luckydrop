/**
 * Additive neon particle field — sparks, bursts, expanding shockwave rings and
 * motion-trail puffs. Drawn with "lighter" compositing for that Geometry-Wars
 * bloom. All cheap (filled arcs), capped, and updated in scaled game time so
 * effects slow down with slow-mo.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // remaining, seconds
  max: number; // total lifetime, seconds
  size: number;
  color: RGB;
  drag: number;
  grav: number;
  star?: boolean;
  spin?: number; // current rotation (rad)
  spinV?: number; // rotation speed (rad/s)
}

interface Ring {
  x: number;
  y: number;
  r: number;
  vr: number; // expansion speed px/s
  life: number;
  max: number;
  width: number;
  color: RGB;
}

const MAX_PARTICLES = 1100;

/** Draw a filled 5-point star centered at (x,y). */
function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rot: number
): void {
  const inner = r * 0.45;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : inner;
    const ang = rot + (i * Math.PI) / 5 - Math.PI / 2;
    const px = x + Math.cos(ang) * rad;
    const py = y + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

export class ParticleField {
  private particles: Particle[] = [];
  private rings: Ring[] = [];

  get count(): number {
    return this.particles.length + this.rings.length;
  }

  clear(): void {
    this.particles.length = 0;
    this.rings.length = 0;
  }

  private push(p: Particle): void {
    if (this.particles.length >= MAX_PARTICLES) {
      this.particles.shift();
    }
    this.particles.push(p);
  }

  /** Tiny spark shower (peg hits). */
  spark(x: number, y: number, color: RGB, count = 4, speed = 90): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      const life = 0.18 + Math.random() * 0.22;
      this.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 20,
        life,
        max: life,
        size: 1.5 + Math.random() * 2,
        color,
        drag: 2.5,
        grav: 120,
      });
    }
  }

  /** Big radial explosion (ball into WIN, eliminations, finale). */
  burst(x: number, y: number, color: RGB, count = 28, power = 1): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (120 + Math.random() * 260) * power;
      const life = 0.4 + Math.random() * 0.6;
      this.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life,
        max: life,
        size: 2 + Math.random() * 3.5,
        color,
        drag: 1.8,
        grav: 60,
      });
    }
  }

  /** Star-shaped celebratory burst (used for WIN-zone landings). */
  starBurst(x: number, y: number, color: RGB, count = 24, power = 1): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (100 + Math.random() * 220) * power;
      const life = 0.6 + Math.random() * 0.7;
      this.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        life,
        max: life,
        size: 5 + Math.random() * 5,
        color,
        drag: 1.4,
        grav: 110,
        star: true,
        spin: Math.random() * Math.PI * 2,
        spinV: (Math.random() - 0.5) * 10,
      });
    }
  }

  /** Soft trailing puff behind a moving ball. */
  trail(x: number, y: number, color: RGB, size = 3): void {
    if (this.particles.length >= MAX_PARTICLES) return;
    const life = 0.28 + Math.random() * 0.12;
    this.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12,
      life,
      max: life,
      size,
      color,
      drag: 3,
      grav: 0,
    });
  }

  /** Expanding shockwave ring. */
  ring(x: number, y: number, color: RGB, maxR = 120, width = 4): void {
    this.rings.push({
      x,
      y,
      r: 6,
      vr: maxR * 2.4,
      life: 0.5,
      max: 0.5,
      width,
      color,
    });
  }

  /** Advance simulation. dt in seconds (already scaled by slow-mo). */
  update(dt: number): void {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) {
        ps.splice(i, 1);
        continue;
      }
      const dragF = Math.max(0, 1 - p.drag * dt);
      p.vx *= dragF;
      p.vy = p.vy * dragF + p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.spinV) p.spin = (p.spin ?? 0) + p.spinV * dt;
    }

    const rs = this.rings;
    for (let i = rs.length - 1; i >= 0; i--) {
      const r = rs[i];
      r.life -= dt;
      if (r.life <= 0) {
        rs.splice(i, 1);
        continue;
      }
      r.r += r.vr * dt;
      r.vr *= Math.max(0, 1 - 2 * dt);
    }
  }

  /** Draw with additive blending. Caller manages save/restore of transform. */
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.particles.length === 0 && this.rings.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = `rgb(${p.color.r},${p.color.g},${p.color.b})`;
      if (p.star) {
        drawStar(ctx, p.x, p.y, p.size * (0.6 + a * 0.6), p.spin ?? 0);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const r of this.rings) {
      const a = Math.max(0, r.life / r.max);
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = `rgb(${r.color.r},${r.color.g},${r.color.b})`;
      ctx.lineWidth = r.width * a;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
