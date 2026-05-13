import Matter from "matter-js";

export type LevelId = "classic" | "cannon" | "tray";

export interface LevelHandle {
  /** All bodies added to the world by this level. */
  bodies: Matter.Body[];
  /** Called every physics step. dt is in ms. */
  update?: (dt: number) => void;
  /** Remove all bodies + listeners. */
  destroy: () => void;
  /** Optional: bodies the renderer should draw as bouncy (high-restitution) pegs. */
  bouncyPegs?: Matter.Body[];
  /** Optional: kinematic bodies the renderer should draw as moving platforms. */
  platforms?: Matter.Body[];
  /** Optional: short-lived projectiles to draw. */
  projectiles?: Matter.Body[];
}

export interface LevelDef {
  id: LevelId;
  name: string;
  description: string;
  install: (
    engine: Matter.Engine,
    width: number,
    height: number
  ) => LevelHandle;
}
