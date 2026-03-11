import Matter from "matter-js";
import { Player } from "@/types";
import { BALL_FILTER } from "./PhysicsEngine";

const SETTLED_VELOCITY_THRESHOLD = 0.5;
const STUCK_SPEED_THRESHOLD = 1.2;
const STUCK_FRAMES_THRESHOLD = 20; // ~0.33s at 60fps

/** Derive ball radius from board width (matches slot width proportion) */
function ballRadius(boardWidth: number): number {
  return Math.round(boardWidth / 9 * 0.08);
}

export class BallManager {
  private engine: Matter.Engine;
  private ballMap: Map<number, { body: Matter.Body; player: Player }> =
    new Map();
  private stuckFrames: Map<number, number> = new Map();
  private _ballRadius = 24;

  constructor(engine: Matter.Engine) {
    this.engine = engine;
  }

  /** Current ball radius (set when createBalls is called) */
  get radius(): number {
    return this._ballRadius;
  }

  /**
   * Create ball bodies for the given players. All balls drop from the center
   * of the board with slight random jitter so everyone has the same chance.
   */
  createBalls(players: Player[], boardWidth: number): void {
    const centerX = boardWidth / 2;
    this._ballRadius = ballRadius(boardWidth);
    const r = this._ballRadius;

    // Scale spawn area with player count so balls don't pile up
    const count = players.length;
    const xSpread = Math.min(boardWidth * 0.6, Math.max(60, count * 2));
    const yWaves = Math.ceil(count / 20); // ~20 balls per wave
    const ySpacing = Math.max(30, r * 3);

    for (let i = 0; i < count; i++) {
      const player = players[i];
      const wave = Math.floor(i / 20);
      const posJitter = (Math.random() - 0.5) * xSpread;
      const x = centerX + posJitter;
      const y = 20 + wave * ySpacing + Math.random() * ySpacing * 0.8;

      const body = Matter.Bodies.circle(x, y, r, {
        restitution: 0.6,
        friction: 0.02,
        frictionAir: 0.008,
        density: 0.002,
        collisionFilter: BALL_FILTER,
        label: `ball-${player.id}`,
      });

      // Slight random initial velocity — looks fair but creates divergence
      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 1.5,
        y: Math.random() * 0.5,
      });

      Matter.World.add(this.engine.world, body);
      this.ballMap.set(body.id, { body, player });
    }
  }

  /** Return all ball bodies currently in the simulation. */
  getAllBalls(): Matter.Body[] {
    return Array.from(this.ballMap.values()).map((entry) => entry.body);
  }

  /** Look up the Player associated with a given ball body. */
  getBallPlayer(body: Matter.Body): Player | undefined {
    return this.ballMap.get(body.id)?.player;
  }

  /**
   * Remove balls belonging to the given player ids from the world.
   */
  removeBalls(playerIds: string[]): void {
    const idsToRemove = new Set(playerIds);
    const toDelete: number[] = [];
    this.ballMap.forEach((entry, bodyId) => {
      if (idsToRemove.has(entry.player.id)) {
        Matter.World.remove(this.engine.world, entry.body);
        toDelete.push(bodyId);
      }
    });
    toDelete.forEach((id) => this.ballMap.delete(id));
  }

  /**
   * Move all remaining balls back to center of the board for the next round.
   */
  resetBallPositions(boardWidth: number): void {
    const centerX = boardWidth / 2;
    const entries = Array.from(this.ballMap.values());

    const count = entries.length;
    const xSpread = Math.min(boardWidth * 0.6, Math.max(60, count * 2));
    const ySpacing = Math.max(30, this._ballRadius * 3);

    for (let i = 0; i < count; i++) {
      const { body } = entries[i];
      const wave = Math.floor(i / 20);
      const posJitter = (Math.random() - 0.5) * xSpread;
      const x = centerX + posJitter;
      const y = 20 + wave * ySpacing + Math.random() * ySpacing * 0.8;

      Matter.Body.setPosition(body, { x, y });
      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 1.5,
        y: Math.random() * 0.5,
      });
      Matter.Body.setAngularVelocity(body, 0);
    }
    this.stuckFrames.clear();
  }

  /**
   * Returns true when every ball has velocity magnitude below the threshold.
   */
  checkAllSettled(): boolean {
    for (const { body } of this.ballMap.values()) {
      const speed = Math.sqrt(
        body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y
      );
      if (speed > SETTLED_VELOCITY_THRESHOLD) {
        return false;
      }
    }
    return true;
  }

  /**
   * Nudge balls that appear stuck on pegs. Call this each frame.
   * If a ball is nearly stationary above the slot zone for too long, give it a push.
   */
  nudgeStuckBalls(slotTopY: number): void {
    for (const { body } of this.ballMap.values()) {
      const speed = Math.sqrt(
        body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y
      );

      // Only check balls above the slot zone (not settled in a slot)
      if (body.position.y < slotTopY && speed < STUCK_SPEED_THRESHOLD) {
        const frames = (this.stuckFrames.get(body.id) || 0) + 1;
        this.stuckFrames.set(body.id, frames);

        if (frames >= STUCK_FRAMES_THRESHOLD) {
          // Directly set velocity to guarantee movement — escalates each attempt
          const attempt = Math.floor(frames / STUCK_FRAMES_THRESHOLD);
          const strength = 2 + attempt * 2; // 2, 4, 6, 8... px/frame
          const kickX = (Math.random() - 0.5) * strength * 2;
          const kickY = strength;
          Matter.Body.setVelocity(body, { x: kickX, y: kickY });
          // Also physically nudge off the peg by shifting position slightly
          Matter.Body.setPosition(body, {
            x: body.position.x + (Math.random() - 0.5) * 6,
            y: body.position.y + 3,
          });
        }
      } else {
        this.stuckFrames.delete(body.id);
      }
    }
  }

  /**
   * Determine which slot a ball is closest to based on its x position.
   * Returns the 0-based slot index.
   */
  getBallSlot(body: Matter.Body, slotSensors: Matter.Body[]): number {
    let closestIndex = 0;
    let closestDist = Infinity;

    for (let i = 0; i < slotSensors.length; i++) {
      const dist = Math.abs(body.position.x - slotSensors[i].position.x);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  /** Get all player IDs that have balls in the simulation. */
  getPlayerIds(): string[] {
    return Array.from(this.ballMap.values()).map((entry) => entry.player.id);
  }

  /** Total number of balls still in play. */
  get count(): number {
    return this.ballMap.size;
  }

  /** Remove all balls and clear internal state. */
  clear(): void {
    for (const { body } of this.ballMap.values()) {
      Matter.World.remove(this.engine.world, body);
    }
    this.ballMap.clear();
  }
}
