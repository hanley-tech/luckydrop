import Matter from "matter-js";
import { LevelDef } from "./types";

/** Classic level: just the base plinko field with no extra obstacles. */
export const classicLevel: LevelDef = {
  id: "classic",
  name: "Classic",
  description: "The original plinko field — pure luck of the bounce.",
  install: (_engine: Matter.Engine, _width: number, _height: number) => {
    return {
      bodies: [],
      destroy: () => {
        /* nothing to clean up */
      },
    };
  },
};
