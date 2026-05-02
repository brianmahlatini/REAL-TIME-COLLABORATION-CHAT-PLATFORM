import http from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectMongo } from "./database/mongo.js";
import { redis, redisPub, redisSub } from "./database/redis.js";
import { startNotificationWorker } from "./queues/notifications.js";
import { attachChatSockets } from "./sockets/chat.js";

async function main() {
  await connectMongo();
  const app = createApp();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true
    }
  });

  attachChatSockets(io);
  const notificationWorker = startNotificationWorker();

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "chat API listening");
  });

  const shutdown = async () => {
    logger.info("shutting down");
    await notificationWorker.close();
    await io.close();
    await Promise.all([redis.quit(), redisPub.quit(), redisSub.quit()]);
    server.close(() => process.exit(0));
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((error) => {
  logger.error({ error }, "failed to start server");
  process.exit(1);
});
