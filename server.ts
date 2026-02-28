import { createServer } from "http";
import { hostname as osHostname } from "os";
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
    console.log(`> Display:  http://${lanHost}:${port}${basePath}/`);
    console.log(`> Join:     http://${lanHost}:${port}${basePath}/join`);
    console.log(`> Operator: http://${lanHost}:${port}${basePath}/operator`);
  });
});
