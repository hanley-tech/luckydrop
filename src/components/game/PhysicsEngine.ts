import Matter from "matter-js";

// Collision categories
export const CATEGORY_PEG = 0x0001;
export const CATEGORY_BALL = 0x0002;
export const CATEGORY_PROJECTILE = 0x0004;

/** Collision filter for pegs, walls, and slot dividers — only collide with balls */
export const PEG_FILTER: Matter.ICollisionFilter = {
  category: CATEGORY_PEG,
  mask: CATEGORY_BALL,
  group: 0,
};

/** Collision filter for balls – balls pass through each other, hit pegs/walls/projectiles */
export const BALL_FILTER: Matter.ICollisionFilter = {
  category: CATEGORY_BALL,
  mask: CATEGORY_PEG | CATEGORY_PROJECTILE,
  group: 0,
};

/** Projectiles (e.g. cannonballs) – hit balls and walls, pass through pegs so they fly straight */
export const PROJECTILE_FILTER: Matter.ICollisionFilter = {
  category: CATEGORY_PROJECTILE,
  mask: CATEGORY_BALL,
  group: 0,
};

export interface PhysicsEngineHandle {
  engine: Matter.Engine;
  runner: null; // we drive the loop manually via step()
}

/**
 * Initialise a Matter.js engine configured for plinko.
 */
export function init(): PhysicsEngineHandle {
  const engine = Matter.Engine.create({
    gravity: { x: 0, y: 1.5, scale: 0.001 },
    // Reduce solver iterations for performance with many bodies
    constraintIterations: 2,
    positionIterations: 4,
    velocityIterations: 3,
  });

  return { engine, runner: null };
}

/**
 * Advance the physics simulation by one frame.
 * @param engine  The Matter.js engine
 * @param delta   Time step in ms (default 1000/60 ≈ 16.67ms)
 */
export function step(engine: Matter.Engine, delta: number = 1000 / 60): void {
  Matter.Engine.update(engine, delta);
}

/**
 * Tear down the engine and remove all bodies / composites.
 */
export function cleanup(engine: Matter.Engine): void {
  Matter.World.clear(engine.world, false);
  Matter.Engine.clear(engine);
}
