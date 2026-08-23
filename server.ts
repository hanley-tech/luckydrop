import { createServer } from "http";
import { readFileSync } from "fs";
import { join as joinPath } from "path";
import { hostname as osHostname } from "os";

// Load .env.local before anything reads process.env.
//
// This used to live only in luckydrop.sh and ecosystem.config.js, which meant
// starting the server any other way (`npx tsx server.ts`, a stray nohup) came
// up half-configured: NEXT_PUBLIC_BASE_PATH was missing, so socket.io mounted
// at /socket.io/ while the client — whose basePath is baked in at BUILD time —
// asked for <basePath>/socket.io/. Every page loaded perfectly and only the
// WebSocket failed, with a 502 that looks like a proxy fault. Doing it here
// means every start path gets the same config. No dotenv dependency.
(function loadEnvLocal() {
  try {
    const txt = readFileSync(joinPath(__dirname, ".env.local"), "utf8");
    for (const raw of txt.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
  } catch {
    // no .env.local — rely on the ambient environment
  }
})();
import next from "next";
import { Server } from "socket.io";
import { setupSocketHandlers } from "./server/socketHandlers";

const dev = process.env.NODE_ENV !== "production";
const listenHost = "0.0.0.0";
const lanHost = process.env.HOST || osHostname();
const port = parseInt(process.env.PORT || "3000", 10);
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const app = next({ dev, hostname: listenHost, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: `${basePath}/socket.io/`,
    maxHttpBufferSize: 1e6,
  });

  setupSocketHandlers(io);

  httpServer.listen(port, listenHost, () => {
    console.log(`> LuckyDrop server ready on http://${lanHost}:${port}`);
    console.log(`> socket.io path: ${basePath}/socket.io/`);
    console.log(`> Display:  http://${lanHost}:${port}${basePath}/`);
    console.log(`> Join:     http://${lanHost}:${port}${basePath}/join`);
    console.log(`> Operator: http://${lanHost}:${port}${basePath}/operator`);
  });
});
