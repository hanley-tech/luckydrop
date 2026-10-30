/**
 * Audio manager for LuckyDrop — TTS voice announcements + synthesized sound effects
 * + background music tracks that crossfade between game phases.
 */

import {
  unlockSynth,
  setSynthEnabled,
  setTensionPulse,
  sfxDrop,
  sfxWinnerFanfare,
  sfxEliminate,
} from "./sfx";
import { tr, getLang } from "@/lib/i18n";
import { getTheme, THEME_EVENT } from "@/lib/theme";

// Use a getter so Next.js inlines the env var at each call site
function basePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

let audioCtx: AudioContext | null = null;
let ttsEnabled = true;
let sfxEnabled = true;
let musicEnabled = true;

function getAudioCtx(): AudioContext | null {
  // Throw-safe: the browser caps live AudioContexts (~6) and new AudioContext()
  // can throw once that's hit. Music uses HTMLAudio, not this context, so a
  // failure here must never abort unlockAudio()/playMusic().
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  } catch {
    return null;
  }
  return audioCtx;
}

// ---------------------------------------------------------------------------
// TTS Voice
// ---------------------------------------------------------------------------

/** Queue of utterances — we don't overlap speech */
const speechQueue: string[] = [];
let isSpeaking = false;

function getVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  // Follow the chosen language. Announcements are translated, so an English
  // voice reading Chinese (or the reverse) is the one thing to avoid; falling
  // back to any voice is better than silence.
  if (getLang() === "zh") {
    const zh =
      voices.find((v) => v.lang.replace("_", "-").startsWith("zh-CN")) ||
      voices.find((v) => v.lang.startsWith("zh"));
    if (zh) return zh;
  }
  const preferred = voices.find(
    (v) => v.lang.startsWith("en") && v.name.includes("Samantha")
  );
  const english = voices.find((v) => v.lang.startsWith("en"));
  return preferred || english || voices[0] || null;
}

function processQueue(): void {
  if (isSpeaking || speechQueue.length === 0) return;
  if (!ttsEnabled) {
    speechQueue.length = 0;
    return;
  }

  const text = speechQueue.shift()!;
  isSpeaking = true;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = getLang() === "zh" ? "zh-CN" : "en-US";
  utterance.rate = 1.15;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const voice = getVoice();
  if (voice) utterance.voice = voice;

  utterance.onend = () => {
    isSpeaking = false;
    processQueue();
  };
  utterance.onerror = () => {
    isSpeaking = false;
    processQueue();
  };

  speechSynthesis.speak(utterance);
}

function speak(text: string, priority: boolean = false): void {
  if (!ttsEnabled) return;
  if (typeof speechSynthesis === "undefined") return;

  if (priority) {
    // Cancel current speech and jump to front
    speechSynthesis.cancel();
    isSpeaking = false;
    speechQueue.unshift(text);
  } else {
    speechQueue.push(text);
  }
  processQueue();
}

// ---------------------------------------------------------------------------
// Sound Effects (file-based, configurable via public/sounds/sounds.json)
// ---------------------------------------------------------------------------

interface SoundConfig {
  sfx: Record<string, string>;
  music: Record<string, string>;
}

// Default filenames — the bundled CC0 set in public/sounds/default/, which is
// the only part of public/sounds/ that's committed. Used synchronously from
// page load so music can start on the very first click without waiting for
// sounds.json to fetch. A custom sounds.json overrides these once it loads.
const DEFAULT_SOUND_CONFIG: SoundConfig = {
  sfx: {
    playerJoined: "default/player-joined.mp3",
    gameStart: "default/game-start.mp3",
    ballCenter: "default/ball-center.mp3",
    roundComplete: "default/round-complete.mp3",
    retry: "default/retry.mp3",
    winnerCheers: "default/winner-cheers.mp3",
    powerUp: "default/power-up.mp3",
  },
  music: {
    lobby: "default/lobby.mp3",
    game: "default/game.mp3",
    transition: "default/transition.mp3",
    winner: "default/winner.mp3",
  },
};

// Start with the defaults so paths always resolve immediately; an optional
// fetched sounds.json refines this.
let soundConfig: SoundConfig = DEFAULT_SOUND_CONFIG;

async function loadSoundConfig(): Promise<SoundConfig> {
  try {
    const res = await fetch(`${basePath()}/sounds/sounds.json`);
    if (res.ok) {
      const fetched = await res.json();
      soundConfig = {
        sfx: { ...DEFAULT_SOUND_CONFIG.sfx, ...(fetched.sfx ?? {}) },
        music: { ...DEFAULT_SOUND_CONFIG.music, ...(fetched.music ?? {}) },
      };
    }
  } catch {
    // keep defaults
  }
  return soundConfig;
}

/** Sound folder + filenames for the active theme. The default pack resolves
 *  under /sounds via sounds.json (which points into default/); a theme pack
 *  (e.g. Halloween) lives in /sounds/<soundDir>/ under the same bare names. A theme pack must
 *  ship every file — a missing one logs an error (see trackAudioErrors). */
function soundSource(): { dir: string; cfg: SoundConfig } {
  const { soundDir } = getTheme();
  return soundDir
    ? { dir: `${basePath()}/sounds/${soundDir}`, cfg: THEME_PACK_CONFIG }
    : { dir: `${basePath()}/sounds`, cfg: soundConfig };
}

/** A theme pack's filenames: the default set's names without its default/
 *  folder (e.g. "default/lobby.mp3" -> "lobby.mp3"). */
const baseName = (f: string) => f.slice(f.lastIndexOf("/") + 1);
const THEME_PACK_CONFIG: SoundConfig = {
  sfx: Object.fromEntries(
    Object.entries(DEFAULT_SOUND_CONFIG.sfx).map(([k, f]) => [k, baseName(f)])
  ),
  music: Object.fromEntries(
    Object.entries(DEFAULT_SOUND_CONFIG.music).map(([k, f]) => [k, baseName(f)])
  ),
};

function sfxPaths() {
  const { dir, cfg: full } = soundSource();
  const cfg = full.sfx;
  return {
    playerJoined: cfg.playerJoined ? `${dir}/${cfg.playerJoined}` : null,
    gameStart: cfg.gameStart ? `${dir}/${cfg.gameStart}` : null,
    ballCenter: cfg.ballCenter ? `${dir}/${cfg.ballCenter}` : null,
    roundComplete: cfg.roundComplete ? `${dir}/${cfg.roundComplete}` : null,
    retry: cfg.retry ? `${dir}/${cfg.retry}` : null,
    winnerCheers: cfg.winnerCheers ? `${dir}/${cfg.winnerCheers}` : null,
    powerUp: cfg.powerUp ? `${dir}/${cfg.powerUp}` : null,
  };
}

/** Surface missing/undecodable files loudly instead of failing silently. */
function trackAudioErrors(el: HTMLAudioElement, path: string): void {
  el.addEventListener("error", () => {
    console.error(`[audio] failed to load ${path} (code ${el.error?.code ?? "?"})`);
  });
}

type SfxName = keyof ReturnType<typeof sfxPaths>;

const sfxCache = new Map<string, HTMLAudioElement>();

function playSFX(key: SfxName, volume: number = 0.5): void {
  if (!sfxEnabled) return;
  const path = sfxPaths()[key];
  if (!path) return;
  let el = sfxCache.get(path);
  if (!el) {
    el = new Audio(path);
    trackAudioErrors(el, path);
    sfxCache.set(path, el);
  }
  el.volume = volume;
  el.currentTime = 0;
  el.play().catch(() => {});
}

function preloadSFX(): void {
  for (const path of Object.values(sfxPaths())) {
    if (!path) continue;
    if (!sfxCache.has(path)) {
      const el = new Audio(path);
      trackAudioErrors(el, path);
      el.preload = "auto";
      el.load();
      sfxCache.set(path, el);
    }
  }
}

// ---------------------------------------------------------------------------
// Public announcement API — call these from the display page
// ---------------------------------------------------------------------------

export function announcePlayerJoined(name: string, totalCount: number): void {
  playSFX("playerJoined", 0.4);
  // Start lobby music on first player join
  if (totalCount === 1) playMusic("lobby");
  // Only announce by name for early joiners or milestone counts
  if (totalCount <= 5) {
    speak(tr("tts.joined", { name }));
  } else if (totalCount % 10 === 0) {
    speak(tr("tts.playersIn", { count: totalCount }));
  }
}

export function announceGameStart(playerCount: number): void {
  playSFX("gameStart", 0.5);
  sfxDrop();
  playMusic("game");
  updateMatchIntensity(playerCount);
  speak(tr("tts.gameStart", { count: playerCount }), true);
}

export function announceRoundStart(roundNumber: number, playerCount: number): void {
  playSFX("roundComplete", 0.4);
  sfxDrop();
  updateMatchIntensity(playerCount);
  if (playerCount <= 5) {
    speak(tr("tts.roundStart", { round: roundNumber, count: playerCount }), true);
  } else {
    speak(tr("tts.roundStart", { round: roundNumber, count: playerCount }), true);
  }
}

export function announceRetry(): void {
  playSFX("retry", 0.5);
  speak(tr("tts.retry"), true);
}

export function announceAllAdvanced(count: number): void {
  playSFX("retry", 0.5);
  speak(tr("tts.allAdvanced", { count }), true);
}

export function announceRoundComplete(
  advancedCount: number,
  eliminatedCount: number,
  roundNumber: number
): void {
  if (eliminatedCount > 0) {
    playSFX("roundComplete", 0.4);
    // Elimination zap is tasteful only when the field is already small —
    // skip it for big mass-elimination rounds to avoid noise.
    if (eliminatedCount <= 4) sfxEliminate();
    // Tighten the music as the field shrinks.
    updateMatchIntensity(advancedCount);
    speak(
      tr("tts.roundComplete", {
        round: roundNumber,
        eliminated: eliminatedCount,
        advanced: advancedCount,
      }),
      true
    );
  }
}

export function announceWinner(name: string): void {
  playSFX("winnerCheers", 0.6);
  // Stop the finale escalation; the reveal gets its own fanfare.
  setMusicIntensity(0);
  setTensionPulse(0);
  setMusicTimeStretch(1);
  sfxWinnerFanfare();
  playMusic("winner");
  setTimeout(() => {
    speak(tr("tts.winner", { name }), true);
  }, 600);
}

export function announceBallInCenter(name: string): void {
  playSFX("ballCenter", 0.3);
  // Don't TTS every single ball — too spammy. Just the sound effect.
}

export function announceBulkJoin(addedCount: number, totalCount: number): void {
  playSFX("playerJoined", 0.4);
  speak(tr("tts.bulkJoin", { added: addedCount, total: totalCount }), true);
}

export function announceGameReset(): void {
  resetMatchIntensity();
  playMusic("lobby");
  speak(tr("tts.gameReset"), true);
}

export function announceRestartMatch(): void {
  playSFX("roundComplete", 0.3);
  resetMatchIntensity();
  playMusic("lobby");
  speak(tr("tts.restartMatch"), true);
}

// ---------------------------------------------------------------------------
// Background Music
// ---------------------------------------------------------------------------

type MusicTrack = "lobby" | "game" | "transition" | "winner";

function musicPaths(): Record<MusicTrack, string | null> {
  const { dir, cfg: full } = soundSource();
  const cfg = full.music;
  return {
    lobby: cfg.lobby ? `${dir}/${cfg.lobby}` : null,
    game: cfg.game ? `${dir}/${cfg.game}` : null,
    transition: cfg.transition ? `${dir}/${cfg.transition}` : null,
    winner: cfg.winner ? `${dir}/${cfg.winner}` : null,
  };
}

const MUSIC_VOLUMES: Record<MusicTrack, number> = {
  lobby: 0.3,
  game: 0.35,
  transition: 0.3,
  winner: 0.4,
};

// Keyed by file path, so each theme's version of a track is its own element
const musicElements = new Map<string, HTMLAudioElement>();
let currentTrack: MusicTrack | null = null;
/** The element actually playing — may belong to the previous theme. */
let currentEl: HTMLAudioElement | null = null;
const activeIntervals = new Set<ReturnType<typeof setInterval>>();

// Music tempo is the product of two factors: a base rate driven by how far
// the match has escalated (fewer players -> faster, more urgent), and a
// slow-mo factor pulled down momentarily during cinematic key moments.
let musicBaseRate = 1;
let musicSlowFactor = 1;

function applyMusicRate(): void {
  const rate = Math.max(0.5, Math.min(1.6, musicBaseRate * musicSlowFactor));
  if (currentEl) currentEl.playbackRate = rate;
}

/** Momentarily warp music speed for slow-mo (1 = normal). */
export function setMusicTimeStretch(scale: number): void {
  musicSlowFactor = scale;
  applyMusicRate();
}

/** Escalate the soundtrack: level 0 (calm) .. 1 (frantic finale). */
export function setMusicIntensity(level: number): void {
  const l = Math.max(0, Math.min(1, level));
  musicBaseRate = 1 + l * 0.35; // up to +35% tempo in the finale
  applyMusicRate();
}

/**
 * Map the number of players still in play to soundtrack intensity + a synth
 * tension pulse. Called whenever the active count changes.
 */
export function updateMatchIntensity(remaining: number): void {
  let level = 0;
  if (remaining <= 2) level = 1;
  else if (remaining <= 3) level = 0.8;
  else if (remaining <= 5) level = 0.55;
  else if (remaining <= 8) level = 0.32;
  else if (remaining <= 14) level = 0.15;
  setMusicIntensity(level);
  // Audible heartbeat only once it's a genuine showdown.
  setTensionPulse(level >= 0.55 ? level : 0);
}

/** Reset escalation back to calm (new match / lobby). */
export function resetMatchIntensity(): void {
  musicBaseRate = 1;
  musicSlowFactor = 1;
  setTensionPulse(0);
  applyMusicRate();
}

function getMusicElement(track: MusicTrack): HTMLAudioElement | null {
  const path = musicPaths()[track];
  if (!path) return null;
  let el = musicElements.get(path);
  if (!el) {
    el = new Audio(path);
    trackAudioErrors(el, path);
    el.loop = true;
    el.volume = 0;
    el.preload = "auto";
    musicElements.set(path, el);
  }
  return el;
}

/** Preload all music tracks so there's no delay on first play. NEVER call
 *  load() on a track that's currently playing — load() aborts + resets it,
 *  which would cut the music off mid-playback. */
function preloadMusic(): void {
  for (const track of Object.keys(musicPaths()) as MusicTrack[]) {
    const el = getMusicElement(track);
    if (el && el !== currentEl && el.paused) el.load();
  }
}

function startPlay(el: HTMLAudioElement): void {
  const promise = el.play();
  if (promise) {
    promise
      .then(() => console.log("[music] playing:", el.src))
      .catch((err) => {
        console.warn("[music] play() blocked:", err.message);
        // Reset currentTrack so the next attempt doesn't bail out early
        currentTrack = null;
      });
  }
}

function fadeVolume(
  el: HTMLAudioElement,
  from: number,
  to: number,
  duration: number,
  onDone?: () => void
): void {
  el.volume = Math.max(0, Math.min(1, from));
  const steps = Math.max(1, Math.floor(duration / 30));
  const delta = (to - from) / steps;
  let step = 0;

  const interval = setInterval(() => {
    step++;
    const vol = from + delta * step;
    el.volume = Math.max(0, Math.min(1, vol));
    if (step >= steps) {
      clearInterval(interval);
      activeIntervals.delete(interval);
      el.volume = Math.max(0, Math.min(1, to));
      onDone?.();
    }
  }, 30);
  activeIntervals.add(interval);
}

/** Preload the sounds config + assets up front (no user gesture required).
 *  Call this on mount so playMusic() can resolve file paths synchronously
 *  inside the first click handler — otherwise the gesture window is lost. */
export function preloadAudioAssets(): void {
  loadSoundConfig().then(() => {
    preloadMusic();
    preloadSFX();
  });
}

/** Switch to a new background music track with crossfade */
export function playMusic(track: MusicTrack): void {
  if (!musicEnabled) return;
  // Paths always resolve synchronously (defaults are baked in), so play() runs
  // inside the click's gesture window — no async gap that the browser blocks.
  if (currentTrack === track) return;

  const newEl = getMusicElement(track);
  if (!newEl) {
    currentTrack = track;
    return;
  }

  // Stop all active fades
  for (const interval of activeIntervals) {
    clearInterval(interval);
  }
  activeIntervals.clear();

  const targetVol = Math.min(1, MUSIC_VOLUMES[track] * (getTheme().musicGain ?? 1));

  // Fade out old track (if any)
  if (currentEl && currentEl !== newEl) {
    const oldEl = currentEl;
    const oldVol = oldEl.volume;
    if (oldVol > 0) {
      fadeVolume(oldEl, oldVol, 0, 600, () => {
        oldEl.pause();
        oldEl.currentTime = 0;
      });
    } else {
      oldEl.pause();
      oldEl.currentTime = 0;
    }
  }

  // Start new track immediately (don't wait for fade-out)
  newEl.volume = 0;
  newEl.playbackRate = Math.max(0.5, Math.min(1.6, musicBaseRate * musicSlowFactor));
  startPlay(newEl);
  fadeVolume(newEl, 0, targetVol, 800);

  currentTrack = track;
  currentEl = newEl;
}

/** Stop all music */
export function stopMusic(): void {
  for (const interval of activeIntervals) {
    clearInterval(interval);
  }
  activeIntervals.clear();

  if (currentEl) {
    const el = currentEl;
    fadeVolume(el, el.volume, 0, 400, () => {
      el.pause();
      el.currentTime = 0;
    });
  }
  currentTrack = null;
  currentEl = null;
}

export function setMusicEnabled(enabled: boolean): void {
  musicEnabled = enabled;
  if (!enabled) {
    stopMusic();
  }
}

export function isMusicEnabled(): boolean {
  return musicEnabled;
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

export function setTTSEnabled(enabled: boolean): void {
  ttsEnabled = enabled;
  if (!enabled) {
    speechSynthesis.cancel();
    speechQueue.length = 0;
    isSpeaking = false;
  }
}

export function setSFXEnabled(enabled: boolean): void {
  sfxEnabled = enabled;
  setSynthEnabled(enabled);
  if (!enabled) setTensionPulse(0);
}

export function isTTSEnabled(): boolean {
  return ttsEnabled;
}

export function isSFXEnabled(): boolean {
  return sfxEnabled;
}

/**
 * Must be called from a user interaction (click/tap) to unlock audio.
 * Browsers block AudioContext + SpeechSynthesis until user gesture.
 */
export function unlockAudio(): void {
  getAudioCtx();
  unlockSynth();
  // Trigger a silent utterance to prime TTS
  if (typeof speechSynthesis !== "undefined") {
    const silent = new SpeechSynthesisUtterance("");
    silent.volume = 0;
    speechSynthesis.speak(silent);
  }
  // Load sound config then preload assets
  loadSoundConfig().then(() => {
    preloadMusic();
    preloadSFX();
  });
}

// When the operator switches theme mid-session, crossfade the current track to
// the new theme's version and warm up the new pack's files.
if (typeof window !== "undefined") {
  window.addEventListener(THEME_EVENT, () => {
    const track = currentTrack;
    preloadSFX();
    preloadMusic();
    if (track) {
      currentTrack = null; // force playMusic past its same-track early return
      playMusic(track);
    }
  });
}
