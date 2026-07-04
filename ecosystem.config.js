const path = require("path");
const os = require("os");
const fs = require("fs");

// Load .env.local into process.env. Prefer dotenv if present, but fall back to
// a tiny built-in parser so we DON'T depend on dotenv being installed — a
// missing base path here makes Next serve at "/" and every proxied route 404s.
(function loadEnvLocal() {
  const envPath = path.join(__dirname, ".env.local");
  try {
    require("dotenv").config({ path: envPath });
    return;
  } catch {
    // dotenv not installed — parse manually below
  }
  try {
    const txt = fs.readFileSync(envPath, "utf8");
    for (const raw of txt.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
  } catch {
    // no .env.local — rely on process.env
  }
})();

const remotePath = process.env.DEPLOY_REMOTE_PATH || __dirname;
const port = process.env.PORT || "3003";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const logDir = process.env.PM2_LOG_DIR || path.join(os.homedir(), ".pm2/logs");

module.exports = {
  apps: [
    {
      name: "luckydrop",
      script: "npx",
      args: "tsx server.ts",
      cwd: remotePath,
      env: {
        NODE_ENV: "production",
        PORT: port,
        NEXT_PUBLIC_BASE_PATH: basePath,
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: path.join(logDir, "luckydrop-error.log"),
      out_file: path.join(logDir, "luckydrop-out.log"),
    },
  ],
};
