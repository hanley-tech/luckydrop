// Record demo footage of LuckyDrop — picture AND the game's own sound — as
// mp4 takes for editing (e.g. in HTCUT).
//
//   node scripts/demo-capture.mjs http://localhost:3418/htai/luckydrop <out dir> [take…]
//
// Takes: lobby, sudden-death, operator, join (default: all).
// Point it at a SCRATCH server (it resets the game and adds test players).
//
// Picture: Chrome DevTools screencast (~60 fps JPEG frames at 1920x1080),
// rebuilt into a constant-60 fps mp4 from each frame's real timestamp.
// Sound: an init script records what the page plays as two stems — music
// (<take>-music.m4a) and effects (the mp4's own audio: sample SFX + the Web
// Audio synth) — via MediaRecorder, so nothing goes
// through this Mac's speakers or needs a loopback device. Spoken (TTS)
// announcements are not captured.
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { chromium } from "playwright-core";
import { io } from "socket.io-client";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const outDir = path.resolve(process.argv[3] ?? "demo-takes");
const only = process.argv.slice(4);
const { origin, pathname } = new URL(base);
const here = path.dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(outDir, { recursive: true });

const socket = io(origin, { path: `${pathname}/socket.io/` });
await new Promise((resolve, reject) => {
  socket.once("connect", resolve);
  socket.once("connect_error", (e) => reject(new Error(`socket: ${e.message} — is the server up at ${base}?`)));
});
const emit = (ev, data) => socket.emit(ev, data);
const once = (ev, ms) =>
  new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    socket.once(ev, (d) => {
      clearTimeout(t);
      resolve(d ?? true);
    });
  });

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});

/** Open a page and record it until `stop()`; writes <name>.mp4 into outDir. */
async function recorder(name, { viewport = { width: 1920, height: 1080 }, url = "/", scale = 1, mobile = false } = {}) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: scale,
    isMobile: mobile,
    hasTouch: mobile,
  });
  await ctx.addInitScript({ path: path.join(here, "demo-capture-audio.js") });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error(`  [${name}] page error:`, e.message));
  await page.goto(`${base}${url}`);
  // "Tap to enable sound" gate on the display
  await page.locator("button.fixed.inset-0").click({ timeout: 3000 }).catch(() => {});

  const dir = fs.mkdtempSync(path.join(outDir, `.${name}-`));
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", (f) => {
    const file = path.join(dir, `${String(frames.length).padStart(6, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, "base64"));
    frames.push({ file, ts: f.metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  const audioStartEpoch = await page.evaluate(() => window.__recStart());
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 92,
    maxWidth: viewport.width * scale,
    maxHeight: viewport.height * scale,
  });

  async function stop() {
    // Frames only arrive when the page changes, so a still page needs its
    // last frame held until the take really ends
    const endTs = Date.now() / 1000;
    await cdp.send("Page.stopScreencast");
    const stems = await page.evaluate(() => window.__recStop());
    await ctx.close();
    const audio = path.join(dir, "sfx.webm");
    const music = path.join(dir, "music.webm");
    fs.writeFileSync(audio, Buffer.from(stems.sfx, "base64"));
    fs.writeFileSync(music, Buffer.from(stems.music, "base64"));
    if (frames.length < 2) throw new Error(`${name}: no frames captured`);

    // Frame list with real durations → constant 60 fps
    const lines = [];
    for (let i = 0; i < frames.length; i++) {
      const next = frames[i + 1]?.ts ?? Math.max(endTs, frames[i].ts + 1 / 60);
      lines.push(`file '${frames[i].file}'`, `duration ${(next - frames[i].ts).toFixed(5)}`);
    }
    lines.push(`file '${frames[frames.length - 1].file}'`);
    const list = path.join(dir, "frames.txt");
    fs.writeFileSync(list, lines.join("\n"));

    // Audio started before the first frame by this much (seconds)
    const lead = frames[0].ts - audioStartEpoch / 1000;
    const out = path.join(outDir, `${name}.mp4`);
    // The mp4 carries the SFX stem; the music stem goes beside it as
    // <name>-music.m4a, starting at the same instant as the picture.
    // Pages that play nothing (operator, join) leave an empty recording:
    // give those takes a silent track so every take has the same layout
    const silent = fs.statSync(audio).size < 1024;
    const audioIn = silent
      ? ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]
      : ["-ss", Math.max(0, lead).toFixed(3), "-i", audio];
    execFileSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "concat", "-safe", "0", "-i", list,
      ...audioIn,
      "-map", "0:v", "-map", "1:a",
      "-vf", "fps=60,format=yuv420p",
      "-c:v", "libx264", "-crf", "16", "-preset", "medium",
      "-c:a", "aac", "-b:a", "256k", "-shortest",
      out,
    ]);
    if (fs.statSync(music).size >= 1024) {
      execFileSync("ffmpeg", [
        "-hide_banner", "-loglevel", "error", "-y",
        "-ss", Math.max(0, lead).toFixed(3), "-i", music,
        "-t", (endTs - frames[0].ts).toFixed(3),
        "-c:a", "aac", "-b:a", "256k",
        path.join(outDir, `${name}-music.m4a`),
      ]);
    }
    fs.rmSync(dir, { recursive: true, force: true });
    const secs = endTs - frames[0].ts;
    console.log(`  saved ${out} (${secs.toFixed(1)} s, ${frames.length} frames)`);
    return out;
  }
  return { page, stop };
}

function setup({ theme, suddenDeath = true, winnerCount = 3 }) {
  emit("operator-reset");
  emit("operator-set-lang", { lang: "en" });
  emit("operator-set-theme", { theme });
  emit("operator-set-level", { levelId: "classic" });
  emit("operator-set-winner-count", { winnerCount });
  emit("operator-set-sudden-death", { enabled: suddenDeath });
}

const TAKES = {
  // Halloween lobby filling up, then the opening rounds of a big field
  async lobby() {
    setup({ theme: "halloween" });
    await sleep(600);
    const rec = await recorder("lobby");
    await sleep(2500);
    for (let i = 0; i < 18; i++) {
      emit("debug-add-users", { count: 1 });
      await sleep(i < 4 ? 900 : 350);
    }
    await sleep(2500);
    emit("operator-start");
    // Round 1 and into round 2 (lightning strikes every 9–17 s on its own)
    await once("round-start", 90_000);
    await sleep(12000);
    await rec.stop();
  },

  // Halloween matches on a small field until one goes to sudden death
  async "sudden-death"() {
    for (let attempt = 1; attempt <= 10; attempt++) {
      setup({ theme: "halloween" });
      await sleep(600);
      emit("debug-add-users", { count: 8 });
      await sleep(600);
      const rec = await recorder(`sudden-death-${attempt}`);
      await sleep(2000);
      let sd = false;
      const onComplete = (d) => d?.suddenDeath && (sd = true);
      socket.on("round-complete", onComplete);
      const winner = once("winner", 300_000);
      emit("operator-start");
      await winner;
      socket.off("round-complete", onComplete);
      await sleep(7000);
      const file = await rec.stop();
      console.log(`  attempt ${attempt}: ${sd ? "SUDDEN DEATH" : "no sudden death"}`);
      if (sd) return;
      fs.rmSync(file);
      fs.rmSync(file.replace(/\.mp4$/, "-music.m4a"), { force: true });
    }
    console.error("  no sudden death in 10 attempts");
  },

  // The operator ticks Sudden death on a phone
  async operator() {
    setup({ theme: "halloween", suddenDeath: false });
    emit("debug-add-users", { count: 12 });
    await sleep(600);
    const rec = await recorder("operator", {
      viewport: { width: 390, height: 844 },
      scale: 2,
      mobile: true,
      url: "/operator",
    });
    const box = rec.page.locator('input[type="checkbox"]').first();
    await box.scrollIntoViewIfNeeded();
    await rec.page.evaluate(() => window.scrollBy(0, 220));
    await sleep(1800);
    await box.tap();
    await sleep(2500);
    await rec.stop();
  },

  // Halloween join page on a phone, typing a name and picking an emoji
  async join() {
    setup({ theme: "halloween" });
    await sleep(600);
    const rec = await recorder("join", {
      viewport: { width: 390, height: 844 },
      scale: 2,
      mobile: true,
      url: "/join",
    });
    await sleep(1500);
    await rec.page.locator("#player-name").pressSequentially("Hanley", { delay: 140 });
    await sleep(500);
    await rec.page.locator('button[aria-label^="Select"]').nth(2).tap();
    await sleep(2500);
    await rec.stop();
  },
};

try {
  for (const [name, take] of Object.entries(TAKES)) {
    if (only.length && !only.includes(name)) continue;
    console.log(name);
    await take();
  }
} catch (err) {
  console.error("demo-capture failed:", err.message);
  process.exitCode = 1;
} finally {
  emit("operator-reset");
  await sleep(300);
  await browser.close();
  socket.close();
}
