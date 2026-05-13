import Matter from "matter-js";
import { LevelDef, LevelHandle } from "./types";
import { PEG_FILTER } from "../PhysicsEngine";

/**
 * Lunch Tray: a wide horizontal platform with 3 holes that slides left-right.
 * Balls have to thread one of the holes (which keeps moving) to get through.
 */
export const trayLevel: LevelDef = {
  id: "tray",
  name: "Lunch Tray",
  description: "A sliding tray with holes. Time your drop or get slapped sideways.",
  install: (
    engine: Matter.Engine,
    width: number,
    height: number
  ): LevelHandle => {
    const bodies: Matter.Body[] = [];
    const platforms: Matter.Body[] = [];

    // ----- Geometry -----
    const fieldTop = height * 0.15;
    const fieldBottom = height * 0.85;
    const fieldHeight = fieldBottom - fieldTop;

    // Place the tray a bit past the middle, leaving room above for pegs to deflect first
    const trayY = fieldTop + fieldHeight * 0.55;
    const trayWidth = width * 0.78;
    const trayHeight = Math.max(14, Math.round(width * 0.018));

    const slotW = width / 9;
    const ballR = Math.round(slotW * 0.08);
    const holeWidth = ballR * 8; // big enough that multiple balls can drop through together
    const numHoles = 3;
    const numSegments = numHoles + 1;

    // Total solid width = trayWidth - numHoles * holeWidth
    const totalSolid = trayWidth - numHoles * holeWidth;
    const segmentWidth = totalSolid / numSegments;

    // Build segments left-to-right, alternating solid / hole
    const trayLeftX = (width - trayWidth) / 2;
    const segmentBaseX: number[] = []; // each segment's resting center X
    let cursor = trayLeftX;
    for (let i = 0; i < numSegments; i++) {
      const segCenterX = cursor + segmentWidth / 2;
      segmentBaseX.push(segCenterX);
      cursor += segmentWidth;
      if (i < numHoles) cursor += holeWidth;
    }

    for (const baseX of segmentBaseX) {
      const seg = Matter.Bodies.rectangle(
        baseX,
        trayY,
        segmentWidth,
        trayHeight,
        {
          isStatic: true,
          restitution: 0.4,
          friction: 0.05,
          collisionFilter: PEG_FILTER,
          label: "tray-segment",
        }
      );
      bodies.push(seg);
      platforms.push(seg);
    }

    Matter.World.add(engine.world, bodies);

    // ----- Slide animation -----
    // Slide left-right by ±amplitude pixels, completing one full cycle per `periodMs`.
    const amplitude = (holeWidth + segmentWidth) * 0.9; // bigger sweep — really translates across the field
    const periodMs = 1600; // ~2.6x faster than before
    let elapsedMs = 0;
    let prevOffset = 0;
    let slideVelocity = 0; // px/ms — for slap impulses

    // Apply a small horizontal velocity kick to any ball overlapping the tray
    // (matter's static body collision doesn't transfer velocity by itself)
    const SLAP_STRENGTH = 0.18; // px/frame of impulse magnitude per frame of contact

    const update = (dt: number) => {
      elapsedMs += dt;
      const t = (elapsedMs % periodMs) / periodMs;
      const offset = Math.sin(t * Math.PI * 2) * amplitude;
      slideVelocity = (offset - prevOffset) / Math.max(1, dt); // px/ms
      prevOffset = offset;

      // Move every segment to its base + offset
      for (let i = 0; i < platforms.length; i++) {
        Matter.Body.setPosition(platforms[i], {
          x: segmentBaseX[i] + offset,
          y: trayY,
        });
      }

      // Slap nearby balls in slide direction (manual velocity transfer)
      if (Math.abs(slideVelocity) > 0.05) {
        const allBodies = engine.world.bodies;
        const slapDir = Math.sign(slideVelocity);
        const slapMag = Math.min(6, Math.abs(slideVelocity) * 40) * SLAP_STRENGTH * 60; // amplified per second
        const slapPerStep = (slapMag * dt) / 1000;
        for (const b of allBodies) {
          if (!b.label?.startsWith("ball-")) continue;
          // Quick AABB check vs. each tray segment
          for (let i = 0; i < platforms.length; i++) {
            const p = platforms[i];
            const px = p.position.x;
            const halfW = segmentWidth / 2 + ballR;
            const halfH = trayHeight / 2 + ballR;
            if (
              Math.abs(b.position.x - px) <= halfW &&
              Math.abs(b.position.y - trayY) <= halfH
            ) {
              Matter.Body.setVelocity(b, {
                x: b.velocity.x + slapDir * slapPerStep,
                y: b.velocity.y,
              });
              break;
            }
          }
        }
      }
    };

    return {
      bodies,
      platforms,
      update,
      destroy: () => {
        for (const b of bodies) {
          Matter.World.remove(engine.world, b);
        }
      },
    };
  },
};
