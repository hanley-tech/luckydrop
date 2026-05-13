import { LevelDef, LevelId } from "./types";
import { classicLevel } from "./classic";
import { cannonLevel } from "./cannon";
import { trayLevel } from "./tray";

export type { LevelId, LevelHandle, LevelDef } from "./types";

export const LEVELS: Record<LevelId, LevelDef> = {
  classic: classicLevel,
  cannon: cannonLevel,
  tray: trayLevel,
};

export const LEVEL_ORDER: LevelId[] = ["classic", "cannon", "tray"];

export const DEFAULT_LEVEL: LevelId = "classic";

export function getLevel(id: LevelId | undefined): LevelDef {
  if (!id || !LEVELS[id]) return LEVELS[DEFAULT_LEVEL];
  return LEVELS[id];
}
