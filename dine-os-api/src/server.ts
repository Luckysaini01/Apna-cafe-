import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { initializeRealtime } from "./realtime/socket.js";

const app = createApp();
const server = createServer(app);

initializeRealtime(server);

// Vercel uses this exported HTTP server as the Express function entrypoint.
// Keep the listener for the existing local/long-running Node server workflow.
if (!process.env.VERCEL) {
  server.listen(env.PORT, () => {
    console.log(`Dine OS API listening on http://localhost:${env.PORT}`);
  });
}

export default server;
