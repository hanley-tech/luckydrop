/**
 * Slow-mo "director". Watches for key moments and orchestrates a short
 * cinematic beat: ramp time down, push the camera in on a focal point, spawn
 * particles and fire synth cues, then ease everything back.
 *
 * The game loop asks the director for the current `timeScale` each frame and
 * steps physics by `FRAME_MS * timeScale`.
 */

import { Camera } from "./camera";
import { ParticleField, RGB } from "./particles";
import {
  sfxSlowmoEnter,
  sfxSlowmoExit,
  sfxWin,
  sfxNearMiss,
} from "@/lib/sfx";
import { setMusicTimeStretch } from "@/lib/audio";

export type Cue = "nearMiss" | "firstCenter" | "winner";

interface CueConfig {
  priority: number;
  timeScale: number;
  zoom: number;
  duration: number; // total slow-mo window (s)
  enterTau: number; // camera/time ease-in
  shake: number;
}

const CUES: Record<Cue, CueConfig> = {
  nearMiss: {
    priority: 1,
    timeScale: 0.38,
    zoom: 1.55,
    duration: 0.5,
    enterTau: 0.06,
    shake: 4,
  },
  firstCenter: {
    priority: 2,
    timeScale: 0.32,
    zoom: 1.7,
    duration: 0.95,
    enterTau: 0.07,
    shake: 8,
  },
  winner: {
    priority: 3,
    timeScale: 0.24,
    zoom: 2.0,
    duration: 1.7,
    enterTau: 0.09,
    shake: 14,
  },
};

const NEAR_MISS_COOLDOWN = 1.3; // s

export class Director {
  private camera: Camera;
  private particles: ParticleField;

  private timeScale = 1;
  private targetTimeScale = 1;
  private activeCue: Cue | null = null;
  private activePriority = 0;
  private remaining = 0; // slow-mo time left (real seconds)
  private nearMissCd = 0;

  constructor(camera: Camera, particles: ParticleField) {
    this.camera = camera;
    this.particles = particles;
  }

  get scale(): number {
    return this.timeScale;
  }

  get isActive(): boolean {
    return this.activeCue !== null;
  }

  /** True if a higher-or-equal priority cue would be swallowed right now. */
  private canTrigger(cue: Cue): boolean {
    if (cue === "nearMiss" && this.nearMissCd > 0) return false;
    if (this.activeCue && CUES[cue].priority < this.activePriority) return false;
    return true;
  }

  trigger(cue: Cue, x: number, y: number, color: RGB): void {
    if (!this.canTrigger(cue)) return;
    const cfg = CUES[cue];

    const startingFresh = this.activeCue === null;
    this.activeCue = cue;
    this.activePriority = cfg.priority;
    this.targetTimeScale = cfg.timeScale;
    this.remaining = cfg.duration;

    this.camera.focus(x, y, cfg.zoom, cfg.enterTau);
    this.camera.shake(cfg.shake);

    if (startingFresh) {
      sfxSlowmoEnter();
      setMusicTimeStretch(0.7);
    }

    // Visual + audio punch per cue
    if (cue === "nearMiss") {
      this.nearMissCd = NEAR_MISS_COOLDOWN;
      this.particles.spark(x, y, color, 10, 160);
      sfxNearMiss();
    } else if (cue === "firstCenter") {
      this.particles.starBurst(x, y, color, 26, 1);
      this.particles.ring(x, y, color, 140, 5);
      sfxWin(false);
    } else if (cue === "winner") {
      this.particles.starBurst(x, y, color, 50, 1.6);
      this.particles.starBurst(x, y, { r: 255, g: 240, b: 150 }, 24, 1.2);
      this.particles.ring(x, y, color, 220, 7);
      this.particles.ring(x, y, { r: 255, g: 255, b: 255 }, 160, 4);
      sfxWin(true);
      // The winner *fanfare* fires on the reveal screen (authoritative WINNER
      // event) so it always plays even if this deciding-ball beat is missed.
    }
  }

  /** dt = real seconds. Returns the time scale to step physics with. */
  update(dt: number): number {
    if (this.nearMissCd > 0) this.nearMissCd = Math.max(0, this.nearMissCd - dt);

    if (this.activeCue) {
      this.remaining -= dt;
      if (this.remaining <= 0) {
        this.activeCue = null;
        this.activePriority = 0;
        this.targetTimeScale = 1;
        this.camera.reset(0.35);
        sfxSlowmoExit();
        setMusicTimeStretch(1);
      }
    }

    // Ease the time scale toward target (snappier going down, smoother up)
    const goingDown = this.targetTimeScale < this.timeScale;
    const tau = goingDown ? 0.05 : 0.25;
    const k = 1 - Math.exp(-dt / tau);
    this.timeScale += (this.targetTimeScale - this.timeScale) * k;
    if (Math.abs(this.timeScale - this.targetTimeScale) < 0.005) {
      this.timeScale = this.targetTimeScale;
    }
    return this.timeScale;
  }

  /** Cancel any active beat immediately (round reset / unmount). */
  reset(): void {
    this.activeCue = null;
    this.activePriority = 0;
    this.targetTimeScale = 1;
    this.timeScale = 1;
    this.remaining = 0;
    this.nearMissCd = 0;
    this.camera.reset(0.2);
    setMusicTimeStretch(1);
  }
}
