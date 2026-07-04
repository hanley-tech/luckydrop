/**
 * Synthesized techno SFX for LuckyDrop — Geometry-Wars-style neon audio.
 *
 * Everything here is generated at runtime with the Web Audio API: no files,
 * no network. Sounds are short, bright and synthetic to match the neon visuals.
 * Lives separately from audio.ts (which owns TTS, file-SFX and music) so the
 * two concerns stay decoupled.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
// Don't touch an AudioContext until a user gesture unlocks it — otherwise every
// pre-gesture sfx call spams "AudioContext was not allowed to start" warnings
// and churns through the browser's hard cap of ~6 contexts.
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!unlocked && !ctx) return null; // stay silent until unlockSynth()
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.85;
      // Soft limiter so a flurry of peg pings never clips harshly
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.knee.value = 24;
      comp.ratio.value = 12;
      comp.attack.value = 0.003;
      comp.release.value = 0.18;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
  } catch {
    return null;
  }
  return ctx;
}

/** Prime the synth — call from a user gesture (alongside unlockAudio). */
export function unlockSynth(): void {
  unlocked = true;
  getCtx();
}

export function setSynthEnabled(on: boolean): void {
  enabled = on;
}

export function isSynthEnabled(): boolean {
  return enabled;
}

// ---------------------------------------------------------------------------
// Low-level voice helpers
// ---------------------------------------------------------------------------

interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  /** Optional target freq for a linear sweep over the note's duration */
  freqTo?: number;
  /** Exponential sweep target (nicer for pitch dives); overrides freqTo */
  freqExpTo?: number;
  dur: number;
  gain?: number;
  attack?: number;
  release?: number;
  /** Optional lowpass cutoff */
  lp?: number;
  /** Optional start delay in seconds */
  delay?: number;
  detune?: number;
}

function tone(o: ToneOpts): void {
  const ac = getCtx();
  if (!ac || !master) return;
  const t0 = ac.currentTime + (o.delay ?? 0);
  const dur = o.dur;
  const peak = o.gain ?? 0.15;
  const attack = o.attack ?? 0.005;
  const release = o.release ?? Math.min(0.25, dur * 0.6);

  const osc = ac.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.detune) osc.detune.setValueAtTime(o.detune, t0);
  if (o.freqExpTo) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, o.freqExpTo),
      t0 + dur
    );
  } else if (o.freqTo) {
    osc.frequency.linearRampToValueAtTime(o.freqTo, t0 + dur);
  }

  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  let node: AudioNode = osc;
  if (o.lp) {
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = o.lp;
    osc.connect(filter);
    node = filter;
  }
  node.connect(g);
  g.connect(master);

  osc.start(t0);
  osc.stop(t0 + dur + release);
}

/** White-noise burst through a band/high-pass — used for whooshes & impacts. */
function noise(opts: {
  dur: number;
  gain?: number;
  type?: BiquadFilterType;
  freq?: number;
  q?: number;
  freqTo?: number;
  delay?: number;
}): void {
  const ac = getCtx();
  if (!ac || !master) return;
  const t0 = ac.currentTime + (opts.delay ?? 0);
  const dur = opts.dur;
  const frames = Math.floor(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buffer;

  const filter = ac.createBiquadFilter();
  filter.type = opts.type ?? "bandpass";
  filter.frequency.setValueAtTime(opts.freq ?? 1200, t0);
  if (opts.freqTo) {
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(1, opts.freqTo),
      t0 + dur
    );
  }
  filter.Q.value = opts.q ?? 1;

  const g = ac.createGain();
  const peak = opts.gain ?? 0.12;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

// ---------------------------------------------------------------------------
// Public SFX
// ---------------------------------------------------------------------------

let lastPeg = 0;
let pegVoices = 0;

/**
 * Soft woodblock-ish "tock" when a ball clips a peg. Mellow sine pluck rather
 * than a harsh ping. Heavily debounced — with 80 balls there can be hundreds
 * of collisions/sec, so we space them out and cap concurrent voices hard.
 */
export function sfxPeg(intensity = 0.5): void {
  if (!enabled) return;
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  if (now - lastPeg < 90) return; // generous debounce — gentle patter, not a wall
  if (pegVoices > 2) return; // very few simultaneous
  lastPeg = now;
  pegVoices++;
  const i = Math.max(0, Math.min(1, intensity));
  const base = 360 + i * 340 + Math.random() * 50; // 360–750, warm range
  tone({
    type: "sine",
    freq: base,
    freqExpTo: base * 0.8,
    dur: 0.045,
    gain: 0.02 + i * 0.025,
    attack: 0.001,
    release: 0.04,
    lp: 2800,
  });
  setTimeout(() => {
    pegVoices = Math.max(0, pegVoices - 1);
  }, 90);
}

/** Airy whoosh — fast-moving ball / cannon shot. */
export function sfxWhoosh(power = 0.5): void {
  if (!enabled) return;
  const p = Math.max(0, Math.min(1, power));
  noise({
    dur: 0.18 + p * 0.12,
    gain: 0.05 + p * 0.06,
    type: "bandpass",
    freq: 500 + p * 600,
    freqTo: 2200 + p * 1500,
    q: 0.7,
  });
}

/** Time-bend "wooomp" as slow-mo engages. */
export function sfxSlowmoEnter(): void {
  if (!enabled) return;
  tone({
    type: "sawtooth",
    freq: 620,
    freqExpTo: 150,
    dur: 0.55,
    gain: 0.14,
    attack: 0.01,
    lp: 1400,
  });
  tone({
    type: "sine",
    freq: 310,
    freqExpTo: 80,
    dur: 0.55,
    gain: 0.1,
  });
}

/** Rising sweep as normal speed returns. */
export function sfxSlowmoExit(): void {
  if (!enabled) return;
  tone({
    type: "sawtooth",
    freq: 180,
    freqExpTo: 700,
    dur: 0.35,
    gain: 0.1,
    lp: 2600,
  });
}

/** A ball drops into the WIN slot: synth zap + sub boom. */
export function sfxWin(big = false): void {
  if (!enabled) return;
  // Zap
  tone({
    type: "square",
    freq: 300,
    freqExpTo: big ? 1900 : 1400,
    dur: 0.16,
    gain: 0.12,
    lp: 7000,
  });
  // Sub boom
  tone({
    type: "sine",
    freq: big ? 150 : 120,
    freqExpTo: 45,
    dur: big ? 0.5 : 0.32,
    gain: big ? 0.22 : 0.16,
    attack: 0.004,
  });
  noise({
    dur: 0.18,
    gain: 0.06,
    type: "highpass",
    freq: 3000,
  });
}

/** A near-miss — quick tense up-then-down blip. */
export function sfxNearMiss(): void {
  if (!enabled) return;
  tone({
    type: "triangle",
    freq: 900,
    freqExpTo: 1500,
    dur: 0.08,
    gain: 0.08,
  });
  tone({
    type: "triangle",
    freq: 1400,
    freqExpTo: 500,
    dur: 0.16,
    gain: 0.07,
    delay: 0.08,
  });
}

let lastElim = 0;

/** A player is eliminated — gritty descending "death" thud. Throttled so a
 *  mass die-off reads as a rapid string of pops rather than one wall of noise. */
export function sfxEliminate(): void {
  if (!enabled) return;
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  if (now - lastElim < 32) return;
  lastElim = now;
  // Detuned descending square — clearly "down/out"
  tone({ type: "sawtooth", freq: 320, freqExpTo: 90, dur: 0.22, gain: 0.1, lp: 1800 });
  tone({ type: "square", freq: 220, freqExpTo: 70, dur: 0.18, gain: 0.06, lp: 1400 });
  noise({ dur: 0.12, gain: 0.05, type: "lowpass", freq: 1200, freqTo: 200 });
}

let lastExpl = 0;

/** A player falls into a lose pit and blows up — punchy explosion: a sharp
 *  crack, a downward-swept noise rumble, and a sub-bass boom. Throttled so a
 *  mass die-off is a satisfying string of booms rather than mud. */
export function sfxExplosion(): void {
  if (!enabled) return;
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  if (now - lastExpl < 55) return;
  lastExpl = now;
  const p = 0.88 + Math.random() * 0.24; // slight pitch variance per blast
  // Initial crack
  noise({ dur: 0.05, gain: 0.1, type: "highpass", freq: 3500 });
  // Body: noise rumble sweeping down
  noise({ dur: 0.36, gain: 0.16, type: "lowpass", freq: 1500 * p, freqTo: 110 });
  // Sub-bass boom
  tone({ type: "sine", freq: 95 * p, freqExpTo: 36, dur: 0.4, gain: 0.2, attack: 0.004 });
}

let lastStar = 0;

/** A ball reaches the WIN column — bright ascending sparkle (distinct from the
 *  big winner zap and from the death thud). */
export function sfxStar(): void {
  if (!enabled) return;
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  if (now - lastStar < 28) return;
  lastStar = now;
  tone({ type: "triangle", freq: 1200, freqExpTo: 1900, dur: 0.1, gain: 0.07, lp: 8000 });
  tone({ type: "sine", freq: 1800, freqExpTo: 2600, dur: 0.16, gain: 0.05, delay: 0.05 });
}

/** Bright arpeggiated synth fanfare for the winner. */
export function sfxWinnerFanfare(): void {
  if (!enabled) return;
  // C major triad climbing two octaves
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
  notes.forEach((f, i) => {
    tone({
      type: "sawtooth",
      freq: f,
      dur: 0.22,
      gain: 0.1,
      attack: 0.006,
      delay: i * 0.085,
      lp: 6000,
    });
    tone({
      type: "square",
      freq: f / 2,
      dur: 0.22,
      gain: 0.04,
      delay: i * 0.085,
      lp: 3000,
    });
  });
  // Sparkle tail
  tone({
    type: "sine",
    freq: 2093,
    dur: 0.6,
    gain: 0.05,
    delay: notes.length * 0.085,
  });
}

/** Game-start drop cue — descending noise sweep + sub hit. */
export function sfxDrop(): void {
  if (!enabled) return;
  noise({
    dur: 0.5,
    gain: 0.1,
    type: "lowpass",
    freq: 3000,
    freqTo: 300,
  });
  tone({ type: "sine", freq: 160, freqExpTo: 50, dur: 0.4, gain: 0.18 });
}

// ---------------------------------------------------------------------------
// Tension pulse — a heartbeat that escalates as the field shrinks.
// ---------------------------------------------------------------------------

let pulseTimer: ReturnType<typeof setTimeout> | null = null;
let pulseIntensity = 0; // 0 = off, rises toward 1 in the finale

/**
 * Drive the looping tension pulse. intensity 0 stops it; higher = faster,
 * harder thumps. Call when the remaining-player count changes.
 */
export function setTensionPulse(intensity: number): void {
  pulseIntensity = Math.max(0, Math.min(1, intensity));
  if (pulseIntensity <= 0) {
    if (pulseTimer) {
      clearTimeout(pulseTimer);
      pulseTimer = null;
    }
    return;
  }
  if (!pulseTimer) schedulePulse();
}

function schedulePulse(): void {
  if (pulseIntensity <= 0) {
    pulseTimer = null;
    return;
  }
  if (enabled) {
    const i = pulseIntensity;
    // Deep kick that gets punchier with intensity
    tone({
      type: "sine",
      freq: 110 + i * 30,
      freqExpTo: 42,
      dur: 0.18 + i * 0.05,
      gain: 0.12 + i * 0.14,
      attack: 0.004,
    });
    if (i > 0.6) {
      // A tight click on top once things get urgent
      tone({ type: "square", freq: 1800, dur: 0.03, gain: 0.04, lp: 6000 });
    }
  }
  // Faster as intensity rises: ~900ms calm -> ~360ms frantic
  const interval = 900 - pulseIntensity * 540;
  pulseTimer = setTimeout(schedulePulse, interval);
}

export function stopTensionPulse(): void {
  setTensionPulse(0);
}
