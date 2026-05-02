import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import path from "node:path";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRateLimit } from "./middleware/rateLimit.js";
import { requireAuth } from "./middleware/auth.js";
import { channelsRouter } from "./routes/channels.js";
import { notificationsRouter } from "./routes/notifications.js";
import { uploadsRouter } from "./routes/uploads.js";
import { usersRouter } from "./routes/users.js";

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "2mb" }));
  app.use(pinoHttp({ logger }));
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "team-chat-api" });
  });

  app.use("/api", apiRateLimit, requireAuth, usersRouter, channelsRouter, uploadsRouter, notificationsRouter);
  app.use(errorHandler);

  return app;
}
