import Matter from "matter-js";
import { LevelDef, LevelHandle } from "./types";
import { PEG_FILTER, PROJECTILE_FILTER } from "../PhysicsEngine";

/** Big center super-bouncy peg + side returners + corner kickers + cannons. */
export const cannonLevel: LevelDef = {
  id: "cannon",
  name: "Cannon Crossfire",
  description: "Side cannons rain mayhem; bouncy pegs slingshot you back into play.",
  install: (
    engine: Matter.Engine,
    width: number,
    height: number
  ): LevelHandle => {
    const bodies: Matter.Body[] = [];
    const bouncyPegs: Matter.Body[] = [];
    const projectiles: Matter.Body[] = [];

    // ----- Bouncy pegs -----
    const slotWidth = width / 9;
    const baseBallR = Math.round(slotWidth * 0.08);
    const bigR = baseBallR * 2.2;
    const sideR = baseBallR * 1.4;
    const cornerR = baseBallR * 1.1;

    const fieldTop = height * 0.15;
    const fieldBottom = height * 0.85;
    const fieldHeight = fieldBottom - fieldTop;

    // Big center bouncy peg (a little above the mid-field)
    const centerBouncy = Matter.Bodies.circle(
      width / 2,
      fieldTop + fieldHeight * 0.55,
      bigR,
      {
        isStatic: true,
        restitution: 1.1,
        friction: 0.0,
        collisionFilter: PEG_FILTER,
        label: "bouncy-peg",
      }
    );
    bodies.push(centerBouncy);
    bouncyPegs.push(centerBouncy);

    // Side returner pegs — two per side at different heights
    const sideInset = width * 0.12;
    const sideYs = [
      fieldTop + fieldHeight * 0.3,
      fieldTop + fieldHeight * 0.7,
    ];
    for (const y of sideYs) {
      const left = Matter.Bodies.circle(sideInset, y, sideR, {
        isStatic: true,
        restitution: 1.0,
        friction: 0.0,
        collisionFilter: PEG_FILTER,
        label: "bouncy-peg",
      });
      const right = Matter.Bodies.circle(width - sideInset, y, sideR, {
        isStatic: true,
        restitution: 1.0,
        friction: 0.0,
        collisionFilter: PEG_FILTER,
        label: "bouncy-peg",
      });
      bodies.push(left, right);
      bouncyPegs.push(left, right);
    }

    // Corner kickers — keep balls out of bottom dead zones
    const cornerY = fieldTop + fieldHeight * 0.92;
    const cornerInset = width * 0.06;
    const leftCorner = Matter.Bodies.circle(cornerInset, cornerY, cornerR, {
      isStatic: true,
      restitution: 0.95,
      friction: 0.0,
      collisionFilter: PEG_FILTER,
      label: "bouncy-peg",
    });
    const rightCorner = Matter.Bodies.circle(
      width - cornerInset,
      cornerY,
      cornerR,
      {
        isStatic: true,
        restitution: 0.95,
        friction: 0.0,
        collisionFilter: PEG_FILTER,
        label: "bouncy-peg",
      }
    );
    bodies.push(leftCorner, rightCorner);
    bouncyPegs.push(leftCorner, rightCorner);

    Matter.World.add(engine.world, bodies);

    // ----- Cannons -----
    // 6 cannons (3 per side, staggered heights). Each cannon fires a burst
    // of multiple cannonballs in quick succession every cycle, so the field
    // is constantly being raked with fire rather than dribbling out one shot.
    interface Cannon {
      x: number;
      y: number;
      vx: number; // horizontal cannonball velocity
      // Schedule state
      nextBurstAtMs: number; // when the next burst starts
      shotsLeftInBurst: number; // remaining shots in the current burst
      nextShotAtMs: number; // when the next shot in the active burst fires
    }
    const cannonYs = [
      fieldTop + fieldHeight * 0.28,
      fieldTop + fieldHeight * 0.52,
      fieldTop + fieldHeight * 0.78,
    ];
    const fireSpeed = Math.max(20, width * 0.028);

    const FIRE_INTERVAL_MS = 1400; // cadence per cannon
    const BURST_COUNT = 3; // shots per burst
    const BURST_GAP_MS = 110; // gap between burst shots

    const cannons: Cannon[] = [];
    // Stagger initial burst times so cannons don't all fire on the same beat
    const initialOffsets = [0, 350, 700, 1050, 175, 525];
    let offsetIdx = 0;
    for (let i = 0; i < cannonYs.length; i++) {
      cannons.push({
        x: 4,
        y: cannonYs[i],
        vx: fireSpeed,
        nextBurstAtMs: initialOffsets[offsetIdx++ % initialOffsets.length],
        shotsLeftInBurst: 0,
        nextShotAtMs: 0,
      });
      cannons.push({
        x: width - 4,
        y: cannonYs[i],
        vx: -fireSpeed,
        nextBurstAtMs: initialOffsets[offsetIdx++ % initialOffsets.length],
        shotsLeftInBurst: 0,
        nextShotAtMs: 0,
      });
    }

    // Lifetime tracking for cannonballs
    const projectileLife = new Map<number, number>(); // bodyId -> ms remaining
    const PROJECTILE_LIFETIME_MS = 2200;

    let elapsedMs = 0;
    // Big visible cannonballs — clearly larger than player balls
    const projectileR = Math.max(14, baseBallR * 1.6);

    const fireShot = (c: Cannon) => {
      const yJitter = (Math.random() - 0.5) * baseBallR * 1.5;
      const ball = Matter.Bodies.circle(c.x, c.y + yJitter, projectileR, {
        restitution: 0.4,
        friction: 0.0,
        frictionAir: 0.0,
        density: 0.05,
        collisionFilter: PROJECTILE_FILTER,
        label: "cannonball",
      });
      const speedJitter = c.vx * (0.92 + Math.random() * 0.16);
      Matter.Body.setVelocity(ball, { x: speedJitter, y: 0 });
      (ball as Matter.Body & { gravityScale?: { x: number; y: number } }).gravityScale = { x: 0, y: 0 };
      Matter.World.add(engine.world, ball);
      projectiles.push(ball);
      projectileLife.set(ball.id, PROJECTILE_LIFETIME_MS);
    };

    const update = (dt: number) => {
      elapsedMs += dt;

      for (const c of cannons) {
        // Start a new burst when the cycle comes due
        if (c.shotsLeftInBurst === 0 && elapsedMs >= c.nextBurstAtMs) {
          c.shotsLeftInBurst = BURST_COUNT;
          c.nextShotAtMs = elapsedMs;
          c.nextBurstAtMs = elapsedMs + FIRE_INTERVAL_MS;
        }
        // Fire any due shots in the current burst
        while (c.shotsLeftInBurst > 0 && elapsedMs >= c.nextShotAtMs) {
          fireShot(c);
          c.shotsLeftInBurst -= 1;
          c.nextShotAtMs = elapsedMs + BURST_GAP_MS;
        }
      }

      // Age projectiles, despawn expired or out-of-bounds
      const toRemove: Matter.Body[] = [];
      for (const p of projectiles) {
        const remaining = (projectileLife.get(p.id) ?? 0) - dt;
        const outOfBounds =
          p.position.x < -50 ||
          p.position.x > width + 50 ||
          p.position.y > height + 50;
        if (remaining <= 0 || outOfBounds) {
          toRemove.push(p);
        } else {
          projectileLife.set(p.id, remaining);
        }
      }
      for (const p of toRemove) {
        Matter.World.remove(engine.world, p);
        projectileLife.delete(p.id);
        const idx = projectiles.indexOf(p);
        if (idx >= 0) projectiles.splice(idx, 1);
      }
    };

    return {
      bodies,
      bouncyPegs,
      projectiles,
      update,
      destroy: () => {
        for (const b of bodies) {
          Matter.World.remove(engine.world, b);
        }
        for (const p of projectiles) {
          Matter.World.remove(engine.world, p);
        }
        projectileLife.clear();
        projectiles.length = 0;
      },
    };
  },
};
