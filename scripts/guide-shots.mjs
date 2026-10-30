// Regenerate the operator-guide screenshots in public/guide/<lang>/.
//
//   node scripts/guide-shots.mjs http://localhost:3418/htai/luckydrop
//
// Point it at a SCRATCH server (it resets the game, adds test players and runs
// a whole match) — never at one an event is using. Drives the game over
// socket.io like the operator panel does, and screenshots with the installed
// Google Chrome via playwright-core (no browser download needed).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright-core";
import { io } from "socket.io-client";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const { origin, pathname } = new URL(base);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const LANGS = ["zh", "en"];
const THEMES = ["neon", "halloween"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Hard stop: a stuck match must not leave a hidden Chrome running for hours
const WATCHDOG_MS = 20 * 60 * 1000;
const watchdog = setTimeout(() => {
  console.error(`guide-shots: gave up after ${WATCHDOG_MS / 60000} min`);
  process.exit(1);
}, WATCHDOG_MS);
watchdog.unref();

/** Bound any step so a hung page fails loudly instead of waiting forever. */
function withTimeout(promise, ms, what) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out: ${what}`)), ms)),
  ]);
}

const socket = io(origin, { path: `${pathname}/socket.io/` });
await new Promise((resolve, reject) => {
  socket.once("connect", resolve);
  socket.once("connect_error", (e) => reject(new Error(`socket: ${e.message} — is the server up at ${base}?`)));
});
const emit = (ev, data) => socket.emit(ev, data);

function waitForEvent(ev, timeoutMs) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out waiting for "${ev}"`)), timeoutMs);
    t.unref(); // don't hold the process open once the run is done
    socket.once(ev, (d) => {
      clearTimeout(t);
      resolve(d);
    });
  });
}

// Muted: the display plays music + spoken announcements, which would
// otherwise come out of this machine's speakers mid-run.
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--mute-audio"],
});
const desktop = { viewport: { width: 1920, height: 1080 } };
const phone = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

async function shot(page, lang, name, opts = {}) {
  const dir = path.join(root, "public", "guide", lang);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.jpg`);
  await withTimeout(page.screenshot({ path: file, type: "jpeg", quality: 82, ...opts }), 30_000, `screenshot ${name}`);
  console.log("  saved", path.relative(root, file));
}

async function openDisplay() {
  const ctx = await browser.newContext(desktop);
  const page = await ctx.newPage();
  await page.goto(`${base}/`);
  // One-time "tap to enable sound" gate covers the screen until clicked
  await page.locator("button.fixed.inset-0").click({ timeout: 8000 }).catch(() => {});
  return { ctx, page };
}

try {
  for (const lang of LANGS) {
    for (const theme of THEMES) {
      console.log(`${lang} / ${theme}`);
      emit("operator-reset");
      emit("operator-set-lang", { lang });
      emit("operator-set-theme", { theme });
      emit("operator-set-winner-count", { winnerCount: 3 });
      emit("operator-set-sudden-death", { enabled: true }); // shows ticked in the panel shot
      await sleep(500);

      // Phone: join form, then the waiting screen after joining
      const phoneCtx = await browser.newContext(phone);
      const ph = await phoneCtx.newPage();
      await ph.goto(`${base}/join`);
      await sleep(1500);
      await ph.fill("#player-name", lang === "zh" ? "小明" : "Sam");
      await ph.locator('button[aria-label^="Select"]').first().click();
      await shot(ph, lang, `${theme}-phone-join`);
      if (theme === "neon") {
        await ph.click('button[type="submit"]');
        await sleep(1500);
        await shot(ph, lang, `${theme}-phone-waiting`);
      }

      emit("debug-add-users", { count: 23 });
      await sleep(800);

      const { ctx: dispCtx, page: disp } = await openDisplay();
      await sleep(3000);
      await shot(disp, lang, `${theme}-display-lobby`);

      if (theme === "neon") {
        const opCtx = await browser.newContext(phone);
        const op = await opCtx.newPage();
        await op.goto(`${base}/operator`);
        await sleep(1500);
        // The whole Game Control card (every setting down to the action
        // buttons), not just the first screenful
        const card = await op.locator("div.bg-slate-800.rounded-xl").first().boundingBox();
        await shot(op, lang, "operator-panel", {
          fullPage: true,
          clip: { x: 0, y: 0, width: phone.viewport.width, height: Math.ceil(card.y + card.height + 24) },
        });
        await opCtx.close();
      }

      const winner = waitForEvent("winner", 240_000);
      emit("operator-start");
      await sleep(3800);
      await shot(disp, lang, `${theme}-display-game`);

      if (theme === "neon") {
        console.log("  waiting for the match to finish…");
        await winner;
        await sleep(3000);
        await shot(disp, lang, `${theme}-display-winner`);
      }
      winner.catch(() => {}); // halloween run doesn't wait for the finish

      await dispCtx.close();
      await phoneCtx.close();
    }
  }
  emit("operator-reset");
  await sleep(300);
} catch (err) {
  console.error("guide-shots failed:", err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  socket.close();
}
