const path = require("path");
const os = require("os");

// Load .env.local if dotenv is available, otherwise fall back to process.env
try {
  require("dotenv").config({ path: path.join(__dirname, ".env.local") });
} catch {
  // dotenv not installed — use process.env directly
}

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
