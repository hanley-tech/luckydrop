// Download Twemoji PNGs for every emoji in BALL_EMOJIS into public/emoji/<id>.png
// so the canvas can draw them as images (works even when the OS has no emoji font).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "emoji");
fs.mkdirSync(outDir, { recursive: true });

// Parse BALL_EMOJIS entries { id: "...", emoji: "..." } out of emojis.ts
const src = fs.readFileSync(path.join(root, "src/lib/emojis.ts"), "utf8");
const re = /\{\s*id:\s*"([^"]+)",\s*emoji:\s*("(?:[^"\\]|\\.)*"),/g;
const entries = [];
let m;
while ((m = re.exec(src))) {
  // eslint-disable-next-line no-eval
  const emoji = eval(m[2]); // resolves the \u{...} escapes
  entries.push({ id: m[1], emoji });
}
console.log(`Found ${entries.length} emojis`);

// twemoji filename algorithm
function toCodePoint(str, sep = "-") {
  const r = [];
  let c = 0, p = 0, i = 0;
  while (i < str.length) {
    c = str.charCodeAt(i++);
    if (p) {
      r.push((0x10000 + ((p - 0xd800) << 10) + (c - 0xdc00)).toString(16));
      p = 0;
    } else if (c >= 0xd800 && c <= 0xdbff) {
      p = c;
    } else {
      r.push(c.toString(16));
    }
  }
  return r.join(sep);
}
function filenameFor(emoji) {
  const raw = emoji.indexOf("‍") < 0 ? emoji.replace(/️/g, "") : emoji;
  return toCodePoint(raw);
}

const bases = [
  "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72",
  "https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72",
];

async function download(entry) {
  const fn = filenameFor(entry.emoji);
  const dest = path.join(outDir, `${entry.id}.png`);
  for (const base of bases) {
    const url = `${base}/${fn}.png`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 200) {
          fs.writeFileSync(dest, buf);
          return { id: entry.id, ok: true, fn };
        }
      }
    } catch {
      /* try next base */
    }
  }
  return { id: entry.id, ok: false, fn };
}

const results = [];
for (const e of entries) {
  results.push(await download(e));
}
const failed = results.filter((r) => !r.ok);
console.log(`Downloaded ${results.length - failed.length}/${results.length}`);
if (failed.length) {
  console.log("FAILED:", failed.map((f) => `${f.id}(${f.fn})`).join(", "));
}
