/**
 * Audio manager for LuckyDrop — TTS voice announcements + synthesized sound effects
 * + background music tracks that crossfade between game phases.
 */

// Use a getter so Next.js inlines the env var at each call site
function basePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

let audioCtx: AudioContext | null = null;
let ttsEnabled = true;
let sfxEnabled = true;
let musicEnabled = true;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browsers require user interaction first)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
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
  // Prefer a clear English voice
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

let soundConfig: SoundConfig | null = null;
let configLoaded = false;

async function loadSoundConfig(): Promise<SoundConfig> {
  if (soundConfig) return soundConfig;
  try {
    const res = await fetch(`${basePath()}/sounds/sounds.json`);
    if (res.ok) {
      soundConfig = await res.json();
      configLoaded = true;
      return soundConfig!;
    }
  } catch {}
  // Fallback to default filenames if config is missing
  soundConfig = {
    sfx: {
      playerJoined: "player-joined.mp3",
      gameStart: "game-start.mp3",
      ballCenter: "ball-center.mp3",
      roundComplete: "round-complete.mp3",
      retry: "retry.mp3",
      winnerCheers: "winner-cheers.mp3",
      powerUp: "power-up.mp3",
    },
    music: {
      lobby: "lobby.mp3",
      game: "game.mp3",
      transition: "transition.mp3",
      winner: "winner.mp3",
    },
  };
  configLoaded = true;
  return soundConfig;
}

function sfxPaths() {
  const bp = basePath();
  const cfg = soundConfig?.sfx ?? {};
  return {
    playerJoined: cfg.playerJoined ? `${bp}/sounds/${cfg.playerJoined}` : null,
    gameStart: cfg.gameStart ? `${bp}/sounds/${cfg.gameStart}` : null,
    ballCenter: cfg.ballCenter ? `${bp}/sounds/${cfg.ballCenter}` : null,
    roundComplete: cfg.roundComplete ? `${bp}/sounds/${cfg.roundComplete}` : null,
    retry: cfg.retry ? `${bp}/sounds/${cfg.retry}` : null,
    winnerCheers: cfg.winnerCheers ? `${bp}/sounds/${cfg.winnerCheers}` : null,
    powerUp: cfg.powerUp ? `${bp}/sounds/${cfg.powerUp}` : null,
  };
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
    speak(`${name} has joined!`);
  } else if (totalCount % 10 === 0) {
    speak(`${totalCount} players in the game!`);
  }
}

export function announceGameStart(playerCount: number): void {
  playSFX("gameStart", 0.5);
  playMusic("game");
  speak(`Let's go! ${playerCount} players, Round 1. Drop!`, true);
}

export function announceRoundStart(roundNumber: number, playerCount: number): void {
  playSFX("roundComplete", 0.4);
  if (playerCount <= 5) {
    speak(`Round ${roundNumber}. ${playerCount} players remain. Drop!`, true);
  } else {
    speak(`Round ${roundNumber}. ${playerCount} remaining. Drop!`, true);
  }
}

export function announceRetry(): void {
  playSFX("retry", 0.5);
  speak("Nobody made it! Dropping again!", true);
}

export function announceAllAdvanced(count: number): void {
  playSFX("retry", 0.5);
  speak(`All ${count} players made it! Dropping again!`, true);
}

export function announceRoundComplete(
  advancedCount: number,
  eliminatedCount: number,
  roundNumber: number
): void {
  if (eliminatedCount > 0) {
    playSFX("roundComplete", 0.4);
    speak(
      `Round ${roundNumber} complete! ${eliminatedCount} eliminated. ${advancedCount} advance!`,
      true
    );
  }
}

export function announceWinner(name: string): void {
  playSFX("winnerCheers", 0.6);
  playMusic("winner");
  setTimeout(() => {
    speak(`We have a winner! Congratulations, ${name}!`, true);
  }, 600);
}

export function announceBallInCenter(name: string): void {
  playSFX("ballCenter", 0.3);
  // Don't TTS every single ball — too spammy. Just the sound effect.
}

export function announceBulkJoin(addedCount: number, totalCount: number): void {
  playSFX("playerJoined", 0.4);
  speak(`${addedCount} players added! ${totalCount} total.`, true);
}

export function announceGameReset(): void {
  playMusic("lobby");
  speak("Game reset. Scan the QR code to join!", true);
}

export function announceRestartMatch(): void {
  playSFX("roundComplete", 0.3);
  playMusic("lobby");
  speak("Match restarted! All players back to lobby.", true);
}

// ---------------------------------------------------------------------------
// Background Music
// ---------------------------------------------------------------------------

type MusicTrack = "lobby" | "game" | "transition" | "winner";

function musicPaths(): Record<MusicTrack, string | null> {
  const bp = basePath();
  const cfg = soundConfig?.music ?? {};
  return {
    lobby: cfg.lobby ? `${bp}/sounds/${cfg.lobby}` : null,
    game: cfg.game ? `${bp}/sounds/${cfg.game}` : null,
    transition: cfg.transition ? `${bp}/sounds/${cfg.transition}` : null,
    winner: cfg.winner ? `${bp}/sounds/${cfg.winner}` : null,
  };
}

const MUSIC_VOLUMES: Record<MusicTrack, number> = {
  lobby: 0.3,
  game: 0.35,
  transition: 0.3,
  winner: 0.4,
};

const musicElements = new Map<MusicTrack, HTMLAudioElement>();
let currentTrack: MusicTrack | null = null;
const activeIntervals = new Set<ReturnType<typeof setInterval>>();

function getMusicElement(track: MusicTrack): HTMLAudioElement | null {
  const path = musicPaths()[track];
  if (!path) return null;
  let el = musicElements.get(track);
  if (!el) {
    el = new Audio(path);
    el.loop = true;
    el.volume = 0;
    el.preload = "auto";
    musicElements.set(track, el);
  }
  return el;
}

/** Preload all music tracks so there's no delay on first play */
function preloadMusic(): void {
  for (const track of Object.keys(musicPaths()) as MusicTrack[]) {
    const el = getMusicElement(track);
    if (el) el.load();
  }
}

function startPlay(el: HTMLAudioElement): void {
  const promise = el.play();
  if (promise) {
    promise.catch((err) => {
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

/** Switch to a new background music track with crossfade */
export function playMusic(track: MusicTrack): void {
  if (!musicEnabled) return;
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

  const targetVol = MUSIC_VOLUMES[track];

  // Fade out old track (if any)
  if (currentTrack) {
    const oldEl = getMusicElement(currentTrack);
    if (oldEl) {
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
  }

  // Start new track immediately (don't wait for fade-out)
  newEl.volume = 0;
  startPlay(newEl);
  fadeVolume(newEl, 0, targetVol, 800);

  currentTrack = track;
}

/** Stop all music */
export function stopMusic(): void {
  for (const interval of activeIntervals) {
    clearInterval(interval);
  }
  activeIntervals.clear();

  if (currentTrack) {
    const el = getMusicElement(currentTrack);
    if (el) {
      fadeVolume(el, el.volume, 0, 400, () => {
        el.pause();
        el.currentTime = 0;
      });
    }
    currentTrack = null;
  }
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
